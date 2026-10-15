import { withPage } from '../test/cdp.mjs'
await withPage({ url: 'http://127.0.0.1:5178/website/playground.html', port: 9379 }, async (c) => {
  await c.delay(2500)
  console.log(await c.evaluate(`(function(){
    var mount = document.getElementById('playground-editor');
    var ke = document.querySelector('.ke');
    return JSON.stringify({
      mountExists: !!mount,
      mountParent: mount ? mount.parentElement.className : null,
      mountChildren: mount ? mount.children.length : null,
      keExists: !!ke,
      keParent: ke ? ke.parentElement.className : null,
      bodyHTML: document.querySelector('.window__body').innerHTML.slice(0, 220)
    }, null, 1)
  })()`))
})
