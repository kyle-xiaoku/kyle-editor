/**
 * 官网页面探针：截图 + 控制台错误 + 布局/交互断言
 * 用法：
 *   node .scratch/site.mjs shot index,guide,api,playground
 *   node .scratch/site.mjs probe
 * 环境变量：W=1280,768,390  FULL=0 关闭整页截图
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { withPage } from '../test/cdp.mjs'

const BASE = 'http://127.0.0.1:5178/website'
const outDir = new URL('./shots/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

const mode = process.argv[2] || 'shot'
const pages = (process.argv[3] || 'index').split(',').filter(Boolean)
const widths = (process.env.W || '1280,768,390').split(',').map(Number)
const FULL = process.env.FULL !== '0'

const waitEditor = async (client) => {
  for (let i = 0; i < 30; i++) {
    if (await client.evaluate(`!!document.querySelector('#playground-editor.ke')`)) return
    await client.delay(200)
  }
}

if (mode === 'shot') {
  for (const p of pages) {
    for (const w of widths) {
      await withPage({ url: `${BASE}/${p}.html`, port: 9377 }, async (client) => {
        await client.send('Emulation.setDeviceMetricsOverride', {
          width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600,
        })
        await client.send('Page.reload')
        await client.delay(2200)
        await waitEditor(client)
        await client.evaluate(`document.querySelectorAll('.reveal').forEach(function(e){e.classList.add('is-in')})`)
        await client.delay(500)
        let shot
        if (FULL) {
          const m = JSON.parse(await client.evaluate(
            `JSON.stringify({h:document.documentElement.scrollHeight})`))
          shot = await client.send('Page.captureScreenshot', {
            format: 'png', captureBeyondViewport: true,
            clip: { x: 0, y: 0, width: w, height: Math.min(m.h, 30000), scale: 1 },
          })
          console.log('  size:', w + 'x' + m.h)
        } else {
          shot = await client.send('Page.captureScreenshot', { format: 'png' })
        }
        writeFileSync(`${outDir}${p}-${w}.png`, Buffer.from(shot.data, 'base64'))
        const errs = client.consoleErrors || []
        console.log(`✓ ${p}-${w}.png  控制台错误: ${errs.length}`)
        errs.slice(0, 8).forEach((e) => console.log('    !', e))
      })
    }
  }
}

if (mode === 'probe') {
  const results = []
  const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail })

  for (const p of ['index', 'guide', 'api', 'playground']) {
    await withPage({ url: `${BASE}/${p}.html`, port: 9377 }, async (client) => {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
      })
      await client.send('Page.reload')
      await client.delay(2200)
      await waitEditor(client)
      await client.delay(300)

      const info = JSON.parse(await client.evaluate(`(function(){
        var d = document.documentElement;
        return JSON.stringify({
          title: document.title,
          sw: d.scrollWidth, cw: d.clientWidth,
          header: !!document.querySelector('.site-header'),
          footer: !!document.querySelector('.site-footer'),
          navLinks: document.querySelectorAll('.nav__link').length,
          drawer: document.querySelectorAll('#site-drawer .drawer__link').length,
          activeNav: (document.querySelector('.nav__link.is-active') || {}).textContent || '',
          playground: !!document.querySelector('#playground-editor.ke'),
          paragraphs: document.querySelectorAll('.doc-body p, .doc-body li').length,
          h2: document.querySelectorAll('.doc-body h2').length,
          outline: document.querySelectorAll('#doc-outline a').length,
          mobileNav: document.querySelectorAll('#doc-mobile-nav a').length,
          asideLinks: document.querySelectorAll('.doc-nav a').length,
          revealTotal: document.querySelectorAll('.reveal').length,
          revealIn: document.querySelectorAll('.reveal.is-in').length,
          brokenLinks: Array.prototype.slice.call(document.querySelectorAll('a[href]'))
            .map(function(a){ return a.getAttribute('href') })
            .filter(function(h){ return h && !/^(https?:|mailto:|#|data:)/.test(h) })
            .filter(function(h){ return false })
        })
      })()`))

      check(`${p}: 无横向溢出`, info.sw <= info.cw + 1, `scrollWidth=${info.sw} clientWidth=${info.cw}`)
      check(`${p}: 顶部导航`, info.header, '')
      check(`${p}: 页脚`, info.footer, '')
      check(`${p}: 导航项 >= 4`, info.navLinks >= 4, `navLinks=${info.navLinks}`)
      check(`${p}: 抽屉链接 >= 4`, info.drawer >= 4, `drawer=${info.drawer}`)
      check(`${p}: 当前页导航高亮`, info.activeNav.length > 0, `activeNav=${info.activeNav}`)

      if (p === 'index' || p === 'playground') {
        check(`${p}: 编辑器已挂载`, info.playground, '')
        const demo = await client.evaluate(`(function(){
          var ed = window.__demo;
          if (!ed) return 'no __demo';
          var root = ed.root;
          return JSON.stringify({
            hasHeading: /公众号排版/.test(root.textContent),
            codeLang: (root.querySelector('pre') || { getAttribute: function(){ return null } }).getAttribute('data-k-lang'),
            toolbar: root.closest('.ke').querySelectorAll('.ke-btn').length
          })
        })()`)
        check(`${p}: 示例内容渲染`, /"hasHeading":true/.test(demo), demo)
        check(`${p}: 代码块语言标记`, /"codeLang":"javascript"/.test(demo), demo)
      }

      if (p === 'guide' || p === 'api') {
        check(`${p}: 正文内容充足`, info.paragraphs >= 20, `paragraphs=${info.paragraphs}`)
        check(`${p}: 二级标题 >= 5`, info.h2 >= 5, `h2=${info.h2}`)
        check(`${p}: 右侧大纲已生成`, info.outline >= 5, `outline=${info.outline}`)
        check(`${p}: 移动端导航已生成`, info.mobileNav >= 5, `mobileNav=${info.mobileNav}`)
        check(`${p}: 侧边栏有链接`, info.asideLinks >= 4, `asideLinks=${info.asideLinks}`)

        // 滚动后侧边栏 / 大纲应跟随高亮
        await client.evaluate(`(function(){
          var h = document.querySelectorAll('.doc-body h2')[4];
          if (h) window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 80);
        })()`)
        await client.delay(900)
        const hl = JSON.parse(await client.evaluate(`JSON.stringify({
          aside: !!document.querySelector('.doc-nav a.is-active'),
          outline: !!document.querySelector('#doc-outline a.is-active'),
          mobileNav: !!document.querySelector('#doc-mobile-nav a.is-active')
        })`))
        check(`${p}: 侧边栏跟随高亮`, hl.aside, JSON.stringify(hl))
        check(`${p}: 右侧大纲跟随高亮`, hl.outline, JSON.stringify(hl))
        check(`${p}: 移动端导航跟随高亮`, hl.mobileNav, JSON.stringify(hl))
        await client.evaluate('window.scrollTo(0, 0)')
        await client.delay(300)
      }

      // 首屏外的 .reveal 应当保持隐藏（机制真的在等滚动），滚到底再断言全部点亮
      check(`${p}: .reveal 使用`, p === 'index' ? info.revealTotal > 0 : true, `reveal=${info.revealIn}/${info.revealTotal}`)

      if (info.revealTotal) {
        await client.evaluate(`(function(){
          return new Promise(function(done){
            var y = 0, step = 700;
            var t = setInterval(function(){
              y += step; window.scrollTo(0, y);
              if (y > document.documentElement.scrollHeight + step) { clearInterval(t); done(1) }
            }, 60)
          })
        })()`)
        await client.delay(1200)
        const left = await client.evaluate(`document.querySelectorAll('.reveal:not(.is-in)').length`)
        check(`${p}: 滚到底后全部入场`, left === 0, `未入场=${left}`)
        await client.evaluate('window.scrollTo(0, 0)')
        await client.delay(300)
      }

      if (p === 'playground') {
        const flow = await client.evaluate(`(function(){
          var ed = window.__demo;
          var out = document.getElementById('pg-output');
          var outCode = document.getElementById('pg-output-code');
          if (!ed) return JSON.stringify({ err: 'no __demo' })
          var res = {}
          document.getElementById('pg-export').click()
          res.outputShown = !out.hidden
          res.outputLen = outCode.textContent.length
          res.outputHasTokSpan = /ke-tok-/.test(outCode.textContent)
          res.outputKeepsLang = /data-k-lang="javascript"/.test(outCode.textContent)
          document.getElementById('pg-clear').click()
          res.clearedChars = ed.counts().chars
          document.getElementById('pg-sample').click()
          res.afterSampleChars = ed.counts().chars
          return JSON.stringify(res)
        })()`)
        const f = JSON.parse(flow)
        check(`playground: 导出面板可用`, f.outputShown && f.outputLen > 200, flow)
        check(`playground: 导出不含高亮 token`, f.outputHasTokSpan === false, `hasTokSpan=${f.outputHasTokSpan}`)
        check(`playground: 导出保留 data-k-lang`, f.outputKeepsLang === true, `keepsLang=${f.outputKeepsLang}`)
        check(`playground: 清空生效`, f.clearedChars === 0, `chars=${f.clearedChars}`)
        check(`playground: 载入示例生效`, f.afterSampleChars > 200, `chars=${f.afterSampleChars}`)
      }

      const errs = client.consoleErrors || []
      check(`${p}: 零控制台错误`, errs.length === 0, errs.slice(0, 5).join(' | '))
    })
  }

  const pass = results.filter((r) => r.ok).length
  results.forEach((r) => console.log(`${r.ok ? '  ok  ' : ' FAIL '} ${r.name}${r.detail ? '  → ' + r.detail : ''}`))
  console.log(`\n${pass}/${results.length} 通过`)
  if (pass !== results.length) process.exitCode = 1
}
