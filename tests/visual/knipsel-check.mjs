// Knipsel (15 november): previewt de gebouwde proefpagina (node_modules/.bin/vite build --config
// tests/visual/knipsel.vite.config.mjs) en maakt schermafdrukken van de Editie en de Stroom met beeldloze
// stukken in Licht, Donker en Nacht. Faalt als een beeld dat weg is (7, 14 tot 17) voorkomt of een
// placeholderbeeld niet laadt. Gebruik: node tests/visual/knipsel-check.mjs <map>
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 5198, DEBUG = 9336
const uitMap = resolve(process.argv[2] || 'bewijs-knipsel')
mkdirSync(uitMap, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const vite = spawn('node_modules/.bin/vite', ['preview', '--config', 'tests/visual/knipsel.vite.config.mjs'], { stdio: ['ignore', 'pipe', 'inherit'] })
await new Promise((ok) => vite.stdout.on('data', (d) => { if (/Local:/.test(String(d))) ok() }))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'knipsel-'))}`, 'about:blank'], { stdio: 'ignore' })
let ws, id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((ok, fail) => { const n = ++id; pending.set(n, { ok, fail }); ws.send(JSON.stringify({ id: n, method, params })) })
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value
let fout = 0
const uitslag = []
try {
  let page
  for (let i = 0; i < 50 && !page; i++) { await sleep(200); page = await fetch(`http://127.0.0.1:${DEBUG}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === 'page')).catch(() => null) }
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((ok) => ws.addEventListener('open', ok))
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result) } })
  await send('Page.enable'); await send('Runtime.enable')
  for (const [scherm, breed, dpr] of [['iphone', 390, 3], ['desktop', 1280, 2]]) {
    for (const view of ['editie', 'stroom']) {
      for (const theme of ['light', 'dark', 'night']) {
        await send('Emulation.setDeviceMetricsOverride', { width: breed, height: 900, deviceScaleFactor: dpr, mobile: breed < 600 })
        await send('Page.navigate', { url: `http://localhost:${PORT}/tests/visual/knipsel.html?theme=${theme}&view=${view}` })
        let ph = null
        for (let i = 0; i < 100 && ph == null; i++) { await sleep(150); ph = await evalJs('document.documentElement.dataset.ready ? document.documentElement.dataset.ph : null') }
        // Wachten tot elke achtergrond van een placeholder geladen is (en meten welke maat de browser koos).
        const geladen = await evalJs(`(async () => {
          const urls = [...new Set([...document.querySelectorAll('.ph')].map((e) => getComputedStyle(e).backgroundImage).map((b) => (b.match(/url\\("([^"]+)"\\)/) || [])[1]).filter(Boolean))]
          const r = await Promise.all(urls.map((u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(u.split('/').pop()); i.onerror = () => ok('FOUT ' + u); i.src = u })))
          return r
        })()`)
        const hoog = await evalJs('Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, document.getElementById("root").scrollHeight))')
        await send('Emulation.setDeviceMetricsOverride', { width: breed, height: Math.min(hoog, 6000), deviceScaleFactor: dpr, mobile: breed < 600 })
        await sleep(700)
        const beelden = (ph || '').split(',').filter(Boolean).map(Number)
        const ok = beelden.length > 0 && !beelden.some((b) => [7, 14, 15, 16, 17].includes(b)) && !geladen.some((g) => g.startsWith('FOUT'))
        if (!ok) fout++
        uitslag.push({ scherm, view, theme, beelden: beelden.join(','), geladen, ok })
        const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
        writeFileSync(join(uitMap, `web-${scherm}-${view}-${theme}.jpg`), Buffer.from(shot.data, 'base64'))
      }
    }
  }
} finally {
  chrome.kill(); vite.kill()
}
for (const u of uitslag) console.log(JSON.stringify(u))
process.exit(fout ? 1 : 0)
