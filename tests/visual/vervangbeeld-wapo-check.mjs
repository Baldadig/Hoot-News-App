// Vervangbeeld (14 november): de Stroom met beeldloze stukken van The Washington Post in headless Chrome op
// 390 breed (Licht, Donker, Nacht; tijdlijn en krant). Faalt als ergens nog beeld 14 (Eclips) of 15 (Walsen) staat.
// Gebruik: node tests/visual/vervangbeeld-wapo-check.mjs [--stills <map>] [--naam <voorvoegsel>]
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 5197, DEBUG = 9335
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null }
const stills = arg('--stills') ? resolve(arg('--stills')) : null
const naam = arg('--naam') || 'web'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const vite = spawn('node_modules/.bin/vite', ['--config', 'tests/visual/vouw.vite.config.mjs', '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'pipe', 'inherit'] })
await new Promise((ok) => vite.stdout.on('data', (d) => { if (/Local:/.test(String(d))) ok() }))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'vervangbeeld-'))}`, 'about:blank'], { stdio: 'ignore' })
let ws, id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((ok, fail) => { const n = ++id; pending.set(n, { ok, fail }); ws.send(JSON.stringify({ id: n, method, params })) })
let fout = 0
const uitslag = []
try {
  let page
  for (let i = 0; i < 50 && !page; i++) { await sleep(200); page = await fetch(`http://127.0.0.1:${DEBUG}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === 'page')).catch(() => null) }
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((ok) => ws.addEventListener('open', ok))
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result) } })
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 1400, deviceScaleFactor: 2, mobile: true, screenWidth: 390, screenHeight: 844 })
  for (const layout of ['tijdlijn', 'krant']) {
    for (const theme of ['light', 'dark', 'night']) {
      await send('Page.navigate', { url: `http://localhost:${PORT}/lees/tests/visual/vervangbeeld-wapo.html?theme=${theme}&layout=${layout}` })
      let ph = null
      for (let i = 0; i < 80 && ph == null; i++) { await sleep(150); const r = await send('Runtime.evaluate', { expression: 'document.documentElement.dataset.ready ? document.documentElement.dataset.ph : null', returnByValue: true }); ph = r.result.value }
      const beelden = (ph || '').split(',').filter(Boolean).map(Number)
      const ok = beelden.length === 5 && !beelden.includes(14) && !beelden.includes(15)
      if (!ok) fout++
      uitslag.push({ layout, theme, beelden, ok })
      if (stills) {
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
        writeFileSync(join(stills, `${naam}-${layout}-${theme}.png`), Buffer.from(shot.data, 'base64'))
      }
    }
  }
} finally {
  chrome.kill(); vite.kill()
}
console.log(JSON.stringify(uitslag))
process.exit(fout ? 1 : 0)
