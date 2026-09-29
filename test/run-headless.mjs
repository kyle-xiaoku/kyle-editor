/**
 * 冒烟测试执行器：在 headless Chrome 中运行 test/smoke.html，输出用例结果
 * 用法：node test/run-headless.mjs [url]
 */
import { withPage } from './cdp.mjs'

const target = process.argv[2] || 'http://127.0.0.1:5178/test/smoke.html'

const { payload, consoleErrors } = await withPage({ url: target, port: 9333 }, async (client) => {
  const deadline = Date.now() + 90000
  let result = null
  while (Date.now() < deadline) {
    const value = await client.evaluate(
      'JSON.stringify({done: !!window.__TEST_DONE__, failed: window.__TEST_FAILED__ || [], errors: window.__TEST_ERRORS__ || [], summary: document.getElementById("summary")?.textContent, count: document.querySelectorAll(".case").length})',
    )
    result = JSON.parse(value)
    if (result.done) break
    await client.delay(400)
  }
  return { payload: result }
})

if (!payload?.done) console.log('!! 测试未在超时内完成')
console.log('SUMMARY:', payload?.summary)
console.log('CASES:', payload?.count)
;(payload?.failed || []).forEach((f) => console.log('  FAIL ' + String(f).slice(0, 260)))
;(payload?.errors || []).forEach((e) => console.log('  JSERR ' + String(e).slice(0, 260)))
if (consoleErrors.length) {
  console.log('CONSOLE:')
  consoleErrors.slice(0, 20).forEach((e) => console.log('  ' + e.slice(0, 260)))
}
const clean = payload?.done && !payload.failed.length && !payload.errors.length && !consoleErrors.length
console.log(clean ? '\n全部用例通过，无运行时错误' : '\n存在问题')
process.exit(clean ? 0 : 1)
