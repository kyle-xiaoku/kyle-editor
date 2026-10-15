import { withPage } from '../test/cdp.mjs'
const BASE = 'http://127.0.0.1:5178/website'
const res = []
const ck = (n, ok, d) => res.push({ n, ok: !!ok, d: d || '' })

// --- 移动端抽屉 ---
await withPage({ url: `${BASE}/index.html`, port: 9383 }, async (c) => {
  await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await c.send('Page.reload'); await c.delay(2000)
  const closed = await c.evaluate(`getComputedStyle(document.getElementById('site-drawer')).visibility`)
  await c.evaluate(`document.querySelector('.nav-toggle').click()`)
  await c.delay(450)
  const open = JSON.parse(await c.evaluate(`JSON.stringify({
    vis: getComputedStyle(document.getElementById('site-drawer')).visibility,
    opacity: getComputedStyle(document.getElementById('site-drawer')).opacity,
    aria: document.querySelector('.nav-toggle').getAttribute('aria-expanded')
  })`))
  ck('抽屉默认收起', closed === 'hidden', `visibility=${closed}`)
  ck('抽屉点击后展开', open.vis === 'visible' && open.aria === 'true', JSON.stringify(open))

  // Esc 关闭
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await c.delay(450)
  const esc = await c.evaluate(`getComputedStyle(document.getElementById('site-drawer')).visibility`)
  ck('Esc 关闭抽屉', esc === 'hidden', `visibility=${esc}`)

  // 导航链接点击后收起
  await c.evaluate(`document.querySelector('.nav-toggle').click()`); await c.delay(350)
  await c.evaluate(`document.querySelector('#site-drawer .drawer__link').click()`); await c.delay(450)
  const afterLink = await c.evaluate(`getComputedStyle(document.getElementById('site-drawer')).visibility`)
  ck('点链接后抽屉收起', afterLink === 'hidden', `visibility=${afterLink}`)
  ck('零控制台错误', (c.consoleErrors || []).length === 0, (c.consoleErrors || []).slice(0, 3).join(' | '))
})

// --- 首页页签 + 复制按钮 ---
await withPage({ url: `${BASE}/index.html`, port: 9384 }, async (c) => {
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  // headless 默认拒绝剪贴板权限，两种复制路径都会失败 —— 显式授予后再测
  // headless 下文档默认「未聚焦」，writeText 会抛 "Document is not focused"
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true })
  await c.send('Browser.grantPermissions', {
    origin: 'http://127.0.0.1:5178',
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  })
  await c.send('Page.reload'); await c.delay(2200)

  const before = JSON.parse(await c.evaluate(`(function(){
    var b = document.querySelectorAll('[data-tabs] [role=tab]');
    var p = document.querySelectorAll('[data-tabs] [role=tabpanel]');
    return JSON.stringify({
      tabs: b.length, panels: p.length,
      selected: Array.prototype.map.call(b, function(x){ return x.getAttribute('aria-selected') }),
      hidden: Array.prototype.map.call(p, function(x){ return x.hasAttribute('hidden') })
    })
  })()`))
  ck('页签 = 3', before.tabs === 3 && before.panels === 3, JSON.stringify(before))
  ck('初始只显示第一个面板', before.hidden.join(',') === 'false,true,true', JSON.stringify(before.hidden))

  await c.evaluate(`document.querySelectorAll('[data-tabs] [role=tab]')[2].click()`)
  await c.delay(300)
  const after = JSON.parse(await c.evaluate(`(function(){
    var b = document.querySelectorAll('[data-tabs] [role=tab]');
    var p = document.querySelectorAll('[data-tabs] [role=tabpanel]');
    return JSON.stringify({
      selected: Array.prototype.map.call(b, function(x){ return x.getAttribute('aria-selected') }),
      hidden: Array.prototype.map.call(p, function(x){ return x.hasAttribute('hidden') }),
      visibleCode: (p[2].querySelector('code') || {}).textContent ? p[2].querySelector('code').textContent.length : 0
    })
  })()`))
  ck('切到第三个页签', after.hidden.join(',') === 'true,true,false' && after.selected[2] === 'true', JSON.stringify(after))
  ck('第三个面板有内容', after.visibleCode > 100, `codeLen=${after.visibleCode}`)

  // 复制按钮（headless 下 clipboard 可能不可用，只验证有兜底且不报错）
  const copy = await c.evaluate(`(function(){
    var btn = document.querySelector('.code-block .copy-btn');
    btn.click();
    return btn.textContent
  })()`)
  await c.delay(350)
  const copyAfter = await c.evaluate(`document.querySelector('.code-block .copy-btn').textContent`)
  await c.delay(1800)
  const copyRevert = await c.evaluate(`document.querySelector('.code-block .copy-btn').textContent`)
  ck('复制按钮有反馈并自动复原',
    (copyAfter === '已复制' || copyAfter === '复制失败') && copyRevert === '复制',
    `immediate=${copyAfter} revert=${copyRevert}`)
  ck('零控制台错误', (c.consoleErrors || []).length === 0, (c.consoleErrors || []).slice(0, 3).join(' | '))
})

// --- 锚点跳转（guide 侧边栏） ---
await withPage({ url: `${BASE}/guide.html`, port: 9385 }, async (c) => {
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  await c.send('Page.reload'); await c.delay(2000)
  const target = await c.evaluate(`(function(){
    var a = document.querySelector('.doc-nav a[href="#markdown"]');
    a.click();
    return location.hash
  })()`)
  await c.delay(2600)
  const pos = JSON.parse(await c.evaluate(`JSON.stringify({
    hash: location.hash,
    scrolled: window.scrollY > 100,
    headingTop: Math.round(document.getElementById('markdown').getBoundingClientRect().top),
    active: (document.querySelector('.doc-nav a.is-active') || {}).textContent || ''
  })`))
  ck('侧边栏锚点跳转', pos.hash === '#markdown' && pos.scrolled, JSON.stringify(pos))
  ck('跳转后标题在顶栏之下（未被遮挡）', pos.headingTop >= 0 && pos.headingTop < 140, `top=${pos.headingTop}`)
  ck('跳转后侧边栏高亮同步', pos.active.length > 0, `active=${pos.active}`)
  ck('零控制台错误', (c.consoleErrors || []).length === 0, (c.consoleErrors || []).slice(0, 3).join(' | '))
})

const pass = res.filter(r => r.ok).length
res.forEach(r => console.log(`${r.ok ? '  ok  ' : ' FAIL '} ${r.n}${r.d ? '  → ' + r.d : ''}`))
console.log(`\n${pass}/${res.length} 通过`)
if (pass !== res.length) process.exitCode = 1
