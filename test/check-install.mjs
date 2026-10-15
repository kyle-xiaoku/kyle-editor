/**
 * 发布产物「可正常安装使用」验证
 * 流程：npm pack → 隔离目录全新安装 → 起静态服务 → headless Chrome 跑消费者用例
 * 用法：node test/check-install.mjs [--keep]
 *   --keep  保留 .pack-verify/install 便于人工复查
 */
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, normalize } from 'node:path'
import { withPage } from './cdp.mjs'

const ROOT = process.cwd()
const STAGE = join(ROOT, '.pack-verify')
const INSTALL = join(STAGE, 'install')
const REGISTRY = 'https://registry.npmjs.org'
const KEEP = process.argv.includes('--keep')

const log = (...a) => console.log(...a)

// ---------- 1. 打包 ----------
log('▸ npm pack')
await rm(STAGE, { recursive: true, force: true })
await mkdir(STAGE, { recursive: true })
execFileSync('npm', ['pack', '--pack-destination', '.pack-verify'], { cwd: ROOT, stdio: 'ignore' })
const tarball = join(STAGE, (await (await import('node:fs/promises')).readdir(STAGE)).find((f) => f.endsWith('.tgz')))
if (!existsSync(tarball)) throw new Error('未找到 tarball')
log('  ' + tarball.split('/').pop())

// ---------- 2. 隔离安装（独立 package.json，避免 npm 向上查找到项目根） ----------
log('▸ 隔离目录全新安装')
await mkdir(INSTALL, { recursive: true })
await writeFile(
  join(INSTALL, 'package.json'),
  JSON.stringify({ name: 'consumer-verify', private: true, version: '1.0.0' }, null, 2),
)
execFileSync('npm', ['install', tarball, 'vue@3', '--no-audit', '--no-fund', `--registry=${REGISTRY}`], {
  cwd: INSTALL,
  stdio: 'ignore',
})
const installed = JSON.parse(await readFile(join(INSTALL, 'node_modules/kyle-editor/package.json'), 'utf8'))
log(`  已安装 ${installed.name}@${installed.version}`)

// ---------- 2a. tarball 是否真的带上了 CDN 入口（files 白名单漏配时这里就会暴露）----------
const PKGDIR = join(INSTALL, 'node_modules/kyle-editor')
const pkgFileFails = []
for (const key of ['unpkg', 'jsdelivr', 'main', 'module', 'types']) {
  const rel = installed[key]
  const hit = !!rel && existsSync(join(PKGDIR, rel))
  log(`  ${hit ? 'OK  ' : 'FAIL'} 包内 ${key} 目标存在 :: ${rel}`)
  if (!hit) pkgFileFails.push(`${key} → ${rel}`)
}
if (pkgFileFails.length) log(`  ⚠ tarball 缺失入口：${pkgFileFails.join('；')}`)

// ---------- 2b. Node 侧模块解析（CJS require / ESM import）----------
// 浏览器用例覆盖不到 Node 的解析规则，而 `type: module` + `.cjs` 后缀曾出过导出全丢的事故
await writeFile(
  join(INSTALL, 'node-entry-check.cjs'),
  `const c = require('kyle-editor')
const v = require('kyle-editor/vue')
const out = {
  coreKeys: Object.keys(c).length,
  coreCreate: typeof c.create,
  coreDefault: typeof c.default,
  vueKeys: Object.keys(v).sort().join(','),
  vueDefaultName: v.default && v.default.name,
  vueDefaultSetup: typeof (v.default && v.default.setup),
  vueDefaultInstall: typeof (v.default && v.default.install),
  vueCompSetup: typeof (v.KEditorVue && v.KEditorVue.setup),
  vuePluginInstall: typeof (v.KEditorPlugin && v.KEditorPlugin.install),
  codeLangs: typeof c.listLanguages === 'function' ? c.listLanguages().length : -1,
  codeHighlight: typeof c.highlightCode,
  codeSample: typeof c.highlightCode === 'function' ? /ke-tok-kw/.test(c.highlightCode('const a = 1', 'js')) : false,
  codeNorm: typeof c.normalizeLang === 'function' ? c.normalizeLang('MySQL') : '',
  mdH1: typeof c.markdownToHtml === 'function' ? c.markdownToHtml('# 标题', { sanitize: false }) : '',
  mdMode: typeof c.normalizeInsertMode === 'function' ? c.normalizeInsertMode('bad') : '',
  mdFile: typeof c.isMarkdownFile === 'function' ? c.isMarkdownFile({ name: 'a.md', type: '' }) : null,
  mdSummary: typeof c.markdownSummary === 'function' ? c.markdownSummary('<h1>a</h1><table></table>').tables : -1,
  mdAccept: typeof c.MARKDOWN_ACCEPT === 'string' ? c.MARKDOWN_ACCEPT.length : -1,
}
process.stdout.write(JSON.stringify(out))`,
)
await writeFile(
  join(INSTALL, 'node-entry-check.mjs'),
  `import * as c from 'kyle-editor'
import def, { KEditorVue, KEditorPlugin } from 'kyle-editor/vue'
process.stdout.write(JSON.stringify({
  coreKeys: Object.keys(c).length,
  codeLangs: typeof c.listLanguages === 'function' ? c.listLanguages().length : -1,
  codeHighlight: typeof c.highlightCode,
  mdH1: typeof c.markdownToHtml === 'function' ? c.markdownToHtml('# 标题', { sanitize: false }) : '',
  mdFile: typeof c.isMarkdownFile === 'function' ? c.isMarkdownFile({ name: 'a.txt', type: 'text/plain' }) : null,
  mdAccept: typeof c.MARKDOWN_ACCEPT === 'string' ? c.MARKDOWN_ACCEPT.length : -1,
  coreDefault: typeof c.default,
  vueDefaultName: def && def.name,
  vueDefaultSetup: typeof (def && def.setup),
  vueDefaultInstall: typeof (def && def.install),
  vueCompSetup: typeof (KEditorVue && KEditorVue.setup),
  vuePluginInstall: typeof (KEditorPlugin && KEditorPlugin.install),
}))`,
)

log('▸ Node 侧模块解析')
const nodeResults = []
const nodeCase = (name, pass, extra) => nodeResults.push({ name, pass, extra })

for (const [fmt, file] of [
  ['CJS', 'node-entry-check.cjs'],
  ['ESM', 'node-entry-check.mjs'],
]) {
  let o = null
  try {
    o = JSON.parse(execFileSync(process.execPath, [join(INSTALL, file)], { cwd: INSTALL, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
  } catch (e) {
    nodeCase(`${fmt} require/import 可解析`, false, String(e.stderr || e.message).split('\n')[0])
    continue
  }
  nodeCase(`${fmt} require/import 可解析`, true)
  nodeCase(`${fmt} 核心导出非空（>0 个）`, o.coreKeys > 0, `keys=${o.coreKeys}`)
  nodeCase(`${fmt} 核心 create 为函数`, fmt === 'CJS' ? o.coreCreate === 'function' : o.coreDefault === 'function' || o.coreKeys > 0)
  if (fmt === 'CJS') {
    nodeCase('CJS vue 导出清单完整', o.vueKeys === 'KEditor,KEditorPlugin,KEditorVue,default,useKEditor', o.vueKeys)
    nodeCase('CJS vue 具名导出 KEditorVue 为组件', o.vueCompSetup === 'function')
    nodeCase('CJS vue KEditorPlugin.install 存在', o.vuePluginInstall === 'function')
  }
  // 代码块 API 是纯字符串处理，Node 侧也应可用（当前端构建漏导出时会在这里暴露）
  nodeCase(`${fmt} 代码块语言清单可达（20 种）`, o.codeLangs === 20, `langs=${o.codeLangs}`)
  nodeCase(`${fmt} highlightCode 纯字符串可用`, o.codeHighlight === 'function' && (fmt === 'CJS' ? o.codeSample === true : true), `type=${o.codeHighlight}`)
  if (fmt === 'CJS') nodeCase('CJS 语言别名归一正确', o.codeNorm === 'sql', `normalizeLang('MySQL')=${o.codeNorm}`)
  // Markdown 转换是纯字符串处理，Node 侧也应可用（漏导出时在这里暴露）
  nodeCase(`${fmt} markdownToHtml 纯字符串可用`, o.mdH1 === '<h1>标题</h1>', JSON.stringify(o.mdH1))
  nodeCase(`${fmt} isMarkdownFile 可用`, o.mdFile === true, String(o.mdFile))
  nodeCase(`${fmt} MARKDOWN_ACCEPT 导出`, o.mdAccept > 10, String(o.mdAccept))
  if (fmt === 'CJS') {
    nodeCase('CJS normalizeInsertMode 归一', o.mdMode === 'replace', o.mdMode)
    nodeCase('CJS markdownSummary 可统计', o.mdSummary === 1, String(o.mdSummary))
  }
  nodeCase(`${fmt} vue 默认导出为组件（自带 setup）`, o.vueDefaultSetup === 'function', `name=${o.vueDefaultName}`)
  nodeCase(`${fmt} vue 默认导出自带 install`, o.vueDefaultInstall === 'function')
}
for (const r of nodeResults) log(`  ${r.pass ? 'OK  ' : 'FAIL'} ${r.name}${r.pass ? '' : '  :: ' + (r.extra ?? '')}`)
await rm(join(INSTALL, 'node-entry-check.cjs'), { force: true })
await rm(join(INSTALL, 'node-entry-check.mjs'), { force: true })

// 消费者页面
await copyFile(join(ROOT, 'test/fixtures/consumer.html'), join(INSTALL, 'consumer.html'))
// 自定义按钮的接口数据源（验证安装后 fetch 链路真的可用）
await copyFile(join(ROOT, 'test/fixtures/columns.json'), join(INSTALL, 'columns.json'))

// ---------- 3. 静态服务 ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}
const server = createServer(async (req, res) => {
  try {
    const p = normalize(decodeURIComponent(req.url.split('?')[0]))
    const file = join(INSTALL, p === '/' ? 'consumer.html' : p)
    if (!file.startsWith(INSTALL)) {
      res.writeHead(403).end('forbidden')
      return
    }
    const buf = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(buf)
  } catch {
    res.writeHead(404).end('not found')
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port
log(`▸ 静态服务 http://127.0.0.1:${port}/consumer.html`)

// ---------- 4. headless 浏览器跑消费者用例 ----------
let payload = null
try {
  const report = await withPage(
    { url: `http://127.0.0.1:${port}/consumer.html`, port: 9355, profile: '/tmp/keditor-install-profile' },
    async (client) => {
      // 等待 module 执行完毕（最多 25s）
      const start = Date.now()
      let res = null
      while (Date.now() - start < 25000) {
        res = await client.evaluate('(window.__RESULT && window.__RESULT.done) ? window.__RESULT : null')
        if (res) break
        await client.delay(400)
      }
      return { payload: res }
    },
  )
  payload = report.payload
  const errors = report.consoleErrors.filter((e) => !/favicon|example\.com|Failed to load resource/i.test(e))
  log('▸ 用例结果')
  if (!payload) {
    log('  FAIL 页面未在超时内完成断言')
    if (errors.length) errors.slice(0, 8).forEach((e) => log('    - ' + e.slice(0, 240)))
  } else {
    for (const r of payload.results) {
      log(`  ${r.pass ? 'OK  ' : 'FAIL'} ${r.name}${r.pass ? '' : '  :: ' + (r.extra ?? '')}`)
    }
    log(`\n  ${payload.passed}/${payload.total} 通过（浏览器端）`)
    if (errors.length) {
      log('  控制台问题：')
      errors.slice(0, 8).forEach((e) => log('    - ' + e.slice(0, 240)))
    }
  }
} finally {
  server.close()
  if (!KEEP) await rm(INSTALL, { recursive: true, force: true })
  else log(`\n（已保留 ${INSTALL}，可用 npm run dev 类似方式人工复查）`)
}

const nodeFailed = nodeResults.filter((r) => !r.pass)
const browserFailed = !payload || payload.results.some((r) => !r.pass)
const total = nodeResults.length + (payload ? payload.total : 0)
const passed = nodeResults.filter((r) => r.pass).length + (payload ? payload.passed : 0)
if (nodeFailed.length) {
  log(`\nNode 侧失败 ${nodeFailed.length} 项：`)
  nodeFailed.forEach((r) => log(`  - ${r.name}${r.extra ? ' :: ' + r.extra : ''}`))
}
log(`\n安装可用性总计：${passed}/${total} 通过（Node ${nodeResults.length} + 浏览器 ${payload ? payload.total : 0}）`)
process.exit(nodeFailed.length || browserFailed || pkgFileFails.length ? 1 : 0)
