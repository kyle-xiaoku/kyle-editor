import { withPage } from '../test/cdp.mjs'
const [page, sel, w] = [process.argv[2], process.argv[3], Number(process.argv[4] || 390)]
const H = Number(process.env.H || 780)
await withPage({ url: `http://127.0.0.1:5178/website/${page}.html`, port: 9386 }, async (c) => {
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: H, deviceScaleFactor: 1, mobile: w < 600 })
  await c.send('Page.reload'); await c.delay(2000)
  await c.evaluate(`document.documentElement.style.scrollBehavior='auto'; document.querySelector('${sel}').scrollIntoView()`)
  await c.delay(700)
  const info = await c.evaluate(`(function(){
    var t = document.querySelector('${sel}');
    var wrap = t.closest('.table-wrap') || t;
    return 'wrap clientWidth=' + wrap.clientWidth + ' scrollWidth=' + wrap.scrollWidth + ' 可横向滚动=' + (wrap.scrollWidth > wrap.clientWidth)
  })()`)
  console.log(info)
  const { data } = await c.send('Page.captureScreenshot', { format: 'png' })
  const fs = await import('node:fs')
  fs.mkdirSync('.scratch/at', { recursive: true })
  fs.writeFileSync(`.scratch/at/${page}-${w}.png`, Buffer.from(data, 'base64'))
  console.log(`→ .scratch/at/${page}-${w}.png`)
})
