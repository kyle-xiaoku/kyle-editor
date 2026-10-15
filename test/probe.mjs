import { withPage } from './cdp.mjs'
const url = process.argv[2]
const { payload } = await withPage({ url, port: 9377 }, async (client) => {
  await client.delay(1000)
  for (let i = 0; i < 60; i++) { if (await client.evaluate('!!window.__ready')) break; await client.delay(250) }
  await client.delay(1200)
  const info = await client.evaluate(`(function(){
    const ed = window.__editor
    const chip = document.querySelector('.ke-chip')
    return JSON.stringify({
      ready: !!window.__ready,
      tasks: ed ? ed.media.tasks.size : 'no __editor',
      chipHidden: chip ? chip.hidden : 'no chip',
      chipText: chip ? chip.textContent : '',
      state: document.querySelector('[data-k-state]')?.dataset.kState || 'none',
      holders: document.querySelectorAll('.ke-media-holder').length,
      imgs: document.querySelectorAll('.ke-content img').length,
      statusText: document.querySelector('.ke-status')?.innerText.replace(/\\s+/g,' ')
    })})()`)
  return { payload: info }
})
console.log(payload)
