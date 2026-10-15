import { withPage } from './cdp.mjs'
const { payload } = await withPage({ url: process.argv[2] || 'http://127.0.0.1:5178/test/visual.html?state=rich', port: 9355 }, async (client) => {
  for (let i = 0; i < 40; i++) {
    const ready = await client.evaluate('!!window.__ready')
    if (ready) break
    await client.delay(300)
  }
  const html = await client.evaluate('(function(){return document.querySelector(".ke-content").innerHTML})()')
  const sel = await client.evaluate('JSON.stringify({selText: String(getSelection()), anchor: getSelection().anchorNode?.nodeName, h2: document.querySelector(".ke-content h2")?.outerHTML?.slice(0,240), first: document.querySelector(".ke-content").firstElementChild?.tagName})')
  return { payload: { html: html.slice(0, 700), sel } }
})
console.log('HTML:', payload.html)
console.log('SEL:', payload.sel)
