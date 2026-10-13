/**
 * 发布前一致性校验：包名、exports 路径、files、裸说明符、元数据
 * 用法：node test/check-package.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')
const pkg = JSON.parse(read('package.json'))

let pass = 0
const fails = []
const ok = (cond, label, detail = '') => {
  if (cond) { pass++; return true }
  fails.push(detail ? `${label} — ${detail}` : label)
  return false
}

// 1. 必备元数据
ok(/^[a-z0-9@][a-z0-9._\-/@]*$/.test(pkg.name), 'name 合法', pkg.name)
ok(!pkg.name.startsWith('@') || pkg.publishConfig?.access === 'public',
  '作用域包必须 publishConfig.access=public')
ok(/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(pkg.version), 'version 语义化', pkg.version)
ok(pkg.license === 'MIT', 'license = MIT', pkg.license)
ok(!!pkg.description && pkg.description.length > 10, 'description 已填写')
ok(Array.isArray(pkg.keywords) && pkg.keywords.length >= 3, 'keywords ≥ 3 个')
ok(pkg.sideEffects === true, 'sideEffects=true（样式运行时注入，禁止被摇掉）')
ok(pkg.peerDependenciesMeta?.vue?.optional === true, 'vue 为可选 peerDependency')

// 2. exports / 入口文件真实存在
const entries = [
  ['main', pkg.main], ['module', pkg.module], ['unpkg', pkg.unpkg],
  ['jsdelivr', pkg.jsdelivr], ['types', pkg.types],
]
for (const [key, rel] of entries) {
  ok(rel && existsSync(join(root, rel)), `${key} 指向的文件存在`, rel)
}
for (const [sub, cond] of Object.entries(pkg.exports || {})) {
  const targets = typeof cond === 'string' ? { '.': cond } : cond
  for (const [k, rel] of Object.entries(targets)) {
    ok(existsSync(join(root, rel)), `exports["${sub}"].${k} 文件存在`, rel)
  }
}

// 3. files 白名单条目都存在（避免 tarball 缺文件）
for (const f of pkg.files || []) {
  ok(existsSync(join(root, f)), `files 条目存在`, f)
}
ok((pkg.files || []).includes('dist'), 'files 含 dist')
ok((pkg.files || []).includes('types'), 'files 含 types')
ok((pkg.files || []).includes('LICENSE'), 'files 含 LICENSE')

// 4. 裸说明符校验：Vue 产物只能 import 'vue' 和当前包名
//    （若 vite.config.vue.js 的 external 与 pkg.name 不一致，用户装完会 Cannot find module）
const allowed = new Set(['vue', pkg.name])
const vueBundles = ['dist/keditor-vue.es.js', 'dist/keditor-vue.cjs', 'dist/keditor-vue.umd.js']
for (const b of vueBundles) {
  if (!existsSync(join(root, b))) { ok(false, `${b} 已构建`); continue }
  const src = read(b)
  const specifiers = [
    ...[...src.matchAll(/from\s*"([^".][^"]*)"/g)].map((m) => m[1]),
    ...[...src.matchAll(/require\("([^".][^"]*)"\)/g)].map((m) => m[1]),
  ].filter((s) => !s.startsWith('.') && !s.startsWith('/'))
  const bad = [...new Set(specifiers)].filter((s) => !allowed.has(s))
  ok(bad.length === 0, `${b} 裸说明符合法`, bad.length ? `发现 ${bad.join(', ')}，应为 ${pkg.name}` : '')
  ok(specifiers.includes(pkg.name), `${b} 正确引用了 ${pkg.name}`)
}

// 4.5 模块格式与后缀必须匹配：type=module 的包里，CJS 产物必须是 .cjs
//     否则 Node 会按最近 package.json 把它当 ESM 解析，require() 得到空对象
if (pkg.type === 'module') {
  const cjsTargets = [pkg.main, ...Object.values(pkg.exports || {})
    .flatMap((c) => (typeof c === 'string' ? [] : Object.entries(c).filter(([k]) => k === 'require').map(([, v]) => v)))]
  for (const rel of cjsTargets) {
    ok(rel.endsWith('.cjs'), `require 入口用 .cjs 后缀（type=module）`, rel)
  }
  const esmTargets = Object.values(pkg.exports || {})
    .flatMap((c) => (typeof c === 'string' ? [] : Object.entries(c).filter(([k]) => k === 'import').map(([, v]) => v)))
  for (const rel of esmTargets) {
    ok(rel.endsWith('.js') || rel.endsWith('.mjs'), `import 入口用 .js/.mjs 后缀`, rel)
  }
}

// 5. 核心产物不得残留源码里的相对导入或包名自引用
for (const b of ['dist/keditor.es.js', 'dist/keditor.cjs']) {
  if (!existsSync(join(root, b))) { ok(false, `${b} 已构建`); continue }
  const src = read(b)
  ok(!/from\s*"\.\//.test(src), `${b} 无残留相对导入`)
  ok(!src.includes(`"${pkg.name}"`), `${b} 无自引用（应完全内联）`)
}

// 6. vite 配置中的 external 与包名一致
const vueCfg = read('vite.config.vue.js')
ok(vueCfg.includes(`'${pkg.name}'`), `vite.config.vue.js external 含 ${pkg.name}`)
ok(!/external:\s*\[[^\]]*'keditor'/.test(vueCfg), 'vite.config.vue.js 无过期的 keditor external')

// 7. 源码里的包名引用一致
const vueSrc = read('src/vue/index.js')
ok(vueSrc.includes(`from '${pkg.name}'`), `src/vue/index.js 从 ${pkg.name} 导入`)
ok(!/from 'keditor'/.test(vueSrc), 'src/vue/index.js 无过期包名')

// 8. 文档中的安装命令与包名一致（避免用户照抄装不上）
for (const doc of ['README.md', 'docs/integration.md', 'docs/api.md']) {
  const text = read(doc)
  ok(!/npm (install|i) keditor(?![-\w])/.test(text), `${doc} 无过期的 npm install keditor`)
  ok(!/from 'keditor(\/vue)?'/.test(text), `${doc} 无过期的 import 'keditor'`)
}
ok(read('README.md').includes(`npm install ${pkg.name}`), 'README 含正确的安装命令')
ok(existsSync(join(root, 'LICENSE')), 'LICENSE 文件存在')

// 9. 发布脚本可用
for (const s of ['build', 'verify', 'pack:check', 'release', 'prerelease']) {
  ok(!!pkg.scripts?.[s], `scripts.${s} 已定义`)
}
// 字段缺失时不能抛 TypeError 崩溃，否则报告会被堆栈信息掩盖
ok((pkg.scripts?.release || '').includes('--access public'), 'release 带 --access public')
ok((pkg.scripts?.prerelease || '').includes('verify'), 'prerelease 会先跑 verify')
ok((pkg.scripts?.release || '').includes('registry.npmjs.org'), 'release 写死 npmjs 官方源（避开只读镜像）')

console.log(`\n发布配置校验：${pass} 项通过${fails.length ? `，${fails.length} 项失败` : ''}`)
if (fails.length) {
  console.log('\n失败项：')
  fails.forEach((f) => console.log(`  ✗ ${f}`))
  process.exit(1)
}
console.log(`包名：${pkg.name}@${pkg.version}\n全部通过，可执行 npm run release\n`)
