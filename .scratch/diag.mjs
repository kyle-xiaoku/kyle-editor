import { withPage } from '../test/cdp.mjs'
const page = process.argv[2] || 'index'
const w = Number(process.argv[3] || 390)
await withPage({ url: `http://127.0.0.1:5178/website/${page}.html`, port: 9382 }, async (c) => {
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 })
  await c.send('Page.reload'); await c.delay(2000)
  console.log(await c.evaluate(`(function(){
    var d = document.documentElement, out = [];
    out.push('viewport clientWidth=' + d.clientWidth + ' scrollWidth=' + d.scrollWidth);
    out.push('body scrollWidth=' + document.body.scrollWidth + ' offsetWidth=' + document.body.offsetWidth);
    var dr = document.querySelector('.drawer');
    var cs = getComputedStyle(dr);
    out.push('.drawer offsetWidth=' + dr.offsetWidth + ' rect=' + JSON.stringify(dr.getBoundingClientRect().toJSON()) +
             ' pos=' + cs.position + ' left=' + cs.left + ' right=' + cs.right + ' width=' + cs.width);
    // 找出「自身宽度超出视口」的元素（排除 fixed 定位的抽屉）
    var els = document.querySelectorAll('body *:not(.drawer):not(.drawer *)');
    var worst = [];
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (e.closest('.ke') || e.closest('.code-block pre') || e.closest('.table-wrap') || e.closest('.doc-aside__mobile')) continue;
      var r = e.getBoundingClientRect();
      if (r.right > d.clientWidth + 1 && r.width > 0) {
        worst.push({ t: e.tagName, c: String(e.className).slice(0, 44), right: Math.round(r.right), width: Math.round(r.width), left: Math.round(r.left) });
      }
    }
    worst.sort(function(a,b){ return b.right - a.right });
    out.push('最深越界元素（前 8）：');
    worst.slice(0, 8).forEach(function(x){ out.push('  ' + JSON.stringify(x)) });
    return out.join('\\n');
  })()`))
})
