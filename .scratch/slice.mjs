/**
 * 分屏截图：按视口高度逐屏滚动，输出可读的切片图
 * 用法：node .scratch/slice.mjs index 1280
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { withPage } from '../test/cdp.mjs'

const page = process.argv[2] || 'index'
const w = Number(process.argv[3] || 1280)
const h = Number(process.env.H || 900)
const outDir = new URL('./slices/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

await withPage({ url: `http://127.0.0.1:5178/website/${page}.html`, port: 9378 }, async (client) => {
  await client.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 })
  await client.send('Page.reload')
  await client.delay(2200)
  for (let i = 0; i < 30; i++) {
    if (await client.evaluate(`!!document.querySelector('#playground-editor .ke')`)) break
    await client.delay(200)
  }
  // 全部入场，避免 reveal 元素因滚动时机不同而缺图
  await client.evaluate(`document.querySelectorAll('.reveal').forEach(function(e){e.classList.add('is-in')})`)
  await client.delay(700)

  const total = JSON.parse(await client.evaluate(`JSON.stringify({h:document.documentElement.scrollHeight})`)).h
  const slices = Math.ceil(total / h)
  for (let i = 0; i < slices; i++) {
    await client.evaluate(`window.scrollTo(0, ${i * h})`)
    await client.delay(450)
    const shot = await client.send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`${outDir}${page}-${w}-${String(i).padStart(2, '0')}.png`, Buffer.from(shot.data, 'base64'))
  }
  console.log(`✓ ${page} @${w}: ${slices} 屏 (总高 ${total})`)
  const errs = client.consoleErrors || []
  if (errs.length) errs.slice(0, 10).forEach((e) => console.log('  !', e))
})
