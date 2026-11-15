// Kleine CDP-helper: Chrome headless starten, pagina's openen, JS draaien, schermafdrukken.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function launch(port = 9333) {
  const dir = mkdtempSync(join(tmpdir(), 'cdp-'))
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' })
  let list
  for (let i = 0; i < 50; i++) {
    try {
      list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      if (list.length) break
    } catch {}
    await sleep(200)
  }
  const page = list.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0
  const waiting = new Map()
  const listeners = []
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && waiting.has(m.id)) {
      const { ok, no } = waiting.get(m.id)
      waiting.delete(m.id)
      m.error ? no(new Error(m.error.message)) : ok(m.result)
    } else if (m.method) for (const l of listeners) l(m)
  })
  const send = (method, params = {}) => new Promise((ok, no) => { const i = ++id; waiting.set(i, { ok, no }); ws.send(JSON.stringify({ id: i, method, params })) })
  await send('Page.enable')
  await send('Runtime.enable')
  const logs = []
  listeners.push((m) => {
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) logs.push(m.params.args.map((a) => a.value ?? a.description).join(' '))
    if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text))
  })
  const api = {
    send,
    logs,
    async size(width, height, scale = 2, mobile = false) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile })
      await send('Emulation.setTouchEmulationEnabled', { enabled: mobile })
    },
    async theme(dark) {
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] })
    },
    async go(url, wait = 1500) {
      await send('Page.navigate', { url })
      await sleep(wait)
    },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
      return r.result.value
    },
    async shot(file, { full = false, clip = null } = {}) {
      const params = { format: 'png' }
      if (full) {
        const m = await send('Page.getLayoutMetrics')
        params.captureBeyondViewport = true
        params.clip = { x: 0, y: 0, width: m.cssContentSize.width, height: m.cssContentSize.height, scale: 1 }
      }
      if (clip) { params.clip = { ...clip, scale: 1 }; params.captureBeyondViewport = true }
      const r = await send('Page.captureScreenshot', params)
      writeFileSync(file, Buffer.from(r.data, 'base64'))
    },
    sleep,
    _listen(fn) { listeners.push(fn) },
    close() { try { ws.close() } catch {} proc.kill() },
  }
  return api
}
