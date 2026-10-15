import { withPage } from '../test/cdp.mjs'
const BASE = 'http://127.0.0.1:5178/website'
for (const p of ['guide', 'api']) {
  for (const w of [390, 768, 1280]) {
    await withPage({ url: `${BASE}/${p}.html`, port: 9387 }, async (c) => {
      await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 })
      await c.send('Page.reload'); await c.delay(1800)
      const r = JSON.parse(await c.evaluate(`(function(){
        var wraps = document.querySelectorAll('.table-wrap');
        var rows = []; var need = 0;
        for (var i = 0; i < wraps.length; i++) {
          var w = wraps[i], t = w.querySelector('table');
          var over = w.scrollWidth - w.clientWidth;
          if (over > 1) need++;
          rows.push({ i: i, cols: t ? t.querySelectorAll('thead th').length : 0,
                      cw: w.clientWidth, sw: w.scrollWidth, over: over });
        }
        var d = document.documentElement;
        return JSON.stringify({ n: wraps.length, need: need, pageOverflow: d.scrollWidth - d.clientWidth, rows: rows })
      })()`))
      const worst = r.rows.filter(x => x.over > 1).sort((a, b) => b.over - a.over).slice(0, 5)
      console.log(`${p}@${w}: 表格 ${r.n} 个，需横向滚动 ${r.need} 个，页面溢出 ${r.pageOverflow}px` +
        (worst.length ? `\n     最大溢出: ${worst.map(x => `${x.cols}列+${x.over}px`).join(', ')}` : ''))
    })
  }
}
