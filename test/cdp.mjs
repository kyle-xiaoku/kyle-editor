/** 与本机 headless Chrome 通信的最小 CDP 客户端（供 run-headless / check-page 复用） */
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { existsSync } from 'node:fs'

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]

export async function withPage({ port = 9333, profile = '/tmp/keditor-chrome-profile', url }, run) {
  const chrome = CHROME_CANDIDATES.find(existsSync)
  if (!chrome) throw new Error('未找到 Chrome/Chromium')
  const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
  const cleanup = () => {
    try {
      proc.kill('SIGKILL')
    } catch {}
  }
  try {
    const page = await waitForTarget(port)
    const client = await connect(page.webSocketDebuggerUrl)
    await client.send('Runtime.enable')
    await client.send('Page.enable')
    if (url) await client.send('Page.navigate', { url })
    const result = await run(client)
    client.ws.close()
    return { ...result, consoleErrors: client.consoleErrors }
  } finally {
    cleanup()
  }
}

async function waitForTarget(port) {
  const start = Date.now()
  while (Date.now() - start < 25000) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      const list = await res.json()
      const page = list.find((t) => t.type === 'page')
      if (page?.webSocketDebuggerUrl) return page
    } catch {
      /* 未就绪 */
    }
    await delay(250)
  }
  throw new Error('无法连接 Chrome DevTools Protocol')
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve)
    ws.addEventListener('error', reject)
  })
  let seq = 0
  const pending = new Map()
  const consoleErrors = []
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result)
    }
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
      consoleErrors.push(`${msg.params.type}: ${(msg.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ')}`)
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push('exception: ' + (msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text))
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id)
          reject(new Error(`${method} 超时`))
        }
      }, 30000)
    })
  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || 'evaluate 异常')
    return res.result.value
  }
  return { ws, send, evaluate, consoleErrors, delay }
}
