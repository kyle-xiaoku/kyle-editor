import { withPage } from '../test/cdp.mjs'
const BASE = 'http://127.0.0.1:5178/website'
const pages = ['index', 'guide', 'api', 'playground']
const widths = [320, 360, 390, 480, 640, 768, 900, 1024, 1280, 1440, 1920]
let bad = 0, total = 0
for (const p of pages) {
  for (const w of widths) {
    await withPage({ url: `${BASE}/${p}.html`, port: 9381 }, async (c) => {
      await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 })
      await c.send('Page.reload'); await c.delay(1800)
      const r = JSON.parse(await c.evaluate(`(function(){
        var d = document.documentElement;
        var over = [];
        if (d.scrollWidth > d.clientWidth + 1) {
          var els = document.querySelectorAll('*');
          for (var i = 0; i < els.length; i++) {
            var e = els[i];
            var rect = e.getBoundingClientRect();
            if (rect.width > 0 && rect.right > d.clientWidth + 1 && !e.closest('.code-block') && !e.closest('.table-wrap') && !e.closest('.doc-aside__mobile') && !e.closest('.ke')) {
              over.push(e.tagName + '.' + (e.className || '').toString().slice(0, 40) + ' right=' + Math.round(rect.right));
              if (over.length > 4) break;
            }
          }
        }
        return JSON.stringify({ sw: d.scrollWidth, cw: d.clientWidth, over: over })
      })()`))
      total++
      if (r.sw > r.cw + 1) { bad++; console.log(`FAIL ${p}@${w}: scrollWidth=${r.sw} > ${r.cw}`); r.over.forEach(x => console.log('       ', x)) }
    })
  }
}
console.log(`\n横向溢出检查：${total - bad}/${total} 通过`)
if (bad) process.exitCode = 1
