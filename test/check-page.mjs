/**
 * 页面健康检查：打开若干 demo 页面，确认编辑器挂载成功且无控制台错误
 * 用法：node test/check-page.mjs [base]
 */
import { withPage } from './cdp.mjs'

const base = process.argv[2] || 'http://127.0.0.1:5178'

/** 打开自定义下拉面板并统计选项数（验证 demo 里的接口数据真的能加载） */
const openCustom = (name) => `(async function(){
  const btn=document.querySelector('.ke-tb [data-k-item="${name}"]');
  if(!btn) return JSON.stringify({btn:false});
  btn.click();
  await new Promise(function(r){setTimeout(r,900)});
  const pops=[].slice.call(document.querySelectorAll('.ke-pop')).filter(function(p){return !p.hidden});
  const pop=pops[0];
  const out={btn:true, rows:pop?pop.querySelectorAll('.ke-sel-row').length:0, err:pop?(pop.querySelector('.ke-sel-tip-text')||{}).textContent||'':'no-panel', link:pop?(pop.querySelector('.ke-sel-link i')||{}).textContent||'':''};
  const ed=document.querySelector('.ke');
  if(ed&&ed.__keditor__) ed.__keditor__.popover.close();
  return JSON.stringify(out);
})()`

const pages = [
  { url: `${base}/index.html`, need: '.tile h3', label: '首页' },
  {
    url: `${base}/demo/script.html`,
    need: '.ke .ke-tb [data-k-item="video"]',
    label: 'Script(UMD) Demo',
    probe: openCustom('column'),
    expect: (r) => r.btn && r.rows === 5 && /weixin/.test(r.link) && !r.err,
  },
  { url: `${base}/demo/esm.html`, need: '.ke-content', label: 'ESM Demo' },
  {
    url: `${base}/demo/vue.html`,
    need: '.ke-content',
    label: 'Vue3 Demo',
    probe: openCustom('column'),
    expect: (r) => r.btn && r.rows === 5 && !r.err,
  },
]

let failed = 0
for (const page of pages) {
  const report = await withPage({ url: page.url, port: 9344 }, async (client) => {
    await client.delay(2200)
    const info = await client.evaluate(
      `(function(){const el=document.querySelector(${JSON.stringify(page.need)});return JSON.stringify({mounted:!!el, toolbar:!!document.querySelector('.ke-tb'), content:!!document.querySelector('.ke-content'), bodyText: document.body.innerText.slice(0,80)})})()`,
    )
    const parsed = JSON.parse(info)
    if (!parsed.mounted) failed += 1
    let extra = ''
    if (page.probe) {
      const raw = await client.evaluate(page.probe)
      const result = JSON.parse(raw)
      const ok = page.expect(result)
      if (!ok) failed += 1
      extra = ` probe=${ok ? 'OK' : 'FAIL'} ${JSON.stringify(result).slice(0, 140)}`
    }
    console.log(`${parsed.mounted ? 'OK  ' : 'FAIL'} ${page.label.padEnd(18)} mounted=${parsed.mounted} toolbar=${parsed.toolbar} content=${parsed.content}${extra}`)
    return {}
  })
  if (report.consoleErrors.length) {
    failed += 1
    console.log('     控制台问题:')
    report.consoleErrors.slice(0, 6).forEach((e) => console.log('     - ' + e.slice(0, 220)))
  }
}
console.log(failed ? `\n${failed} 处问题` : '\n全部页面健康')
process.exit(failed ? 1 : 0)
