/**
 * 视觉快照：用 headless Chrome 截取各状态页面，输出到 test/screenshots/
 * 用法：node test/shoot.mjs [state1 state2 ...]
 */
import { mkdirSync } from 'node:fs'
import { withPage } from './cdp.mjs'

const base = process.argv[2] || 'rich,uploading,bubble,source,preview'
const states = base.split(',').filter(Boolean)
const outDir = new URL('./screenshots/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

for (const state of states) {
  const file = `${outDir}${state.split(/[/?=&]/).filter(Boolean).pop()}.png`
  const url = state.startsWith('http') ? state : `http://127.0.0.1:5178/test/visual.html?state=${state}`
  await withPage({ url, port: 9366 }, async (client) => {
    await client.delay(1200)
    if (!(url.includes('visual.html'))) {
      await client.delay(1500)
    } else {
      for (let i = 0; i < 40; i++) {
        if (await client.evaluate('!!window.__ready')) break
        await client.delay(250)
      }
    }
    const width = Number(process.env.KE_SHOT_W) || 1280
    await client.send('Emulation.setDeviceMetricsOverride', { width, height: 880, deviceScaleFactor: 1, mobile: false })
    await client.delay(600)
    const shot = await client.send('Page.captureScreenshot', { format: 'png' })
    const { writeFileSync } = await import('node:fs')
    writeFileSync(file, Buffer.from(shot.data, 'base64'))
    return {}
  })
  console.log('✓', file)
}
