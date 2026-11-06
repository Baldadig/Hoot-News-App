// Toets 01 boven de vouw op het web in headless Chrome, op 375 × 812 (mini), 402 × 874 (Pro) en 375 × 667 (SE),
// voor kort, mediaan en lang. Exacte maten via het DevTools-protocol (Emulation: venster én scherm), zonder extra pakket.
// Start zelf een vite-server. Met --stills <map> ook schermbeelden (Licht en Nacht, 3×).
// Gebruik: node tests/visual/vouw-check.mjs [--stills ../Hoot-design/vouw-1.1.1]
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 5199, DEBUG = 9333
const stillsAt = process.argv.indexOf('--stills')
const stills = stillsAt > 0 ? resolve(process.argv[stillsAt + 1]) : null
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const vite = spawn('node_modules/.bin/vite', ['--config', 'tests/visual/vouw.vite.config.mjs', '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'pipe', 'inherit'] })
await new Promise((ok) => vite.stdout.on('data', (d) => { if (/Local:/.test(String(d))) ok() }))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'vouw-'))}`, 'about:blank'], { stdio: 'ignore' })

let ws, id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((ok, fail) => { const n = ++id; pending.set(n, { ok, fail }); ws.send(JSON.stringify({ id: n, method, params })) })
let fout = 0
try {
  let page
  for (let i = 0; i < 50 && !page; i++) { await sleep(200); page = await fetch(`http://127.0.0.1:${DEBUG}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === 'page')).catch(() => null) }
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((ok) => ws.addEventListener('open', ok))
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result) } })
  await send('Page.enable'); await send('Runtime.enable')
  const SCHERMEN = [['mini', 375, 812], ['pro', 402, 874], ['se', 375, 667]]
  for (const [naam, w, h] of SCHERMEN) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 3, mobile: true, screenWidth: w, screenHeight: h })
    for (const kop of ['kort', 'mediaan', 'lang']) {
      for (const theme of stills && naam !== 'se' ? ['light', 'night'] : ['light']) {
        await send('Page.navigate', { url: `http://localhost:${PORT}/lees/tests/visual/vouw.html?kop=${kop}&theme=${theme}` })
        let m = null
        for (let i = 0; i < 60 && !m; i++) { await sleep(150); const r = await send('Runtime.evaluate', { expression: 'document.documentElement.dataset.vouwMeting || ""', returnByValue: true }); m = r.result.value ? JSON.parse(r.result.value) : null }
        if (theme === 'light') {
          const ok = !!m && (naam === 'se' ? m.profiel === null : m.profiel === naam && m.bron <= m.vouw)
          if (!ok) fout++
          console.log(ok ? 'ok  ' : 'FOUT', naam.padEnd(4), kop.padEnd(7), JSON.stringify(m))
        }
        if (stills && naam !== 'se') {
          const shot = await send('Page.captureScreenshot', { format: 'png' })
          writeFileSync(join(stills, `web-${naam}-${kop}-${theme === 'light' ? 'licht' : 'nacht'}.png`), Buffer.from(shot.data, 'base64'))
        }
      }
    }
  }
} finally { ws?.close(); chrome.kill(); vite.kill() }
console.log(fout ? `${fout} fout` : 'fail 0')
process.exit(fout ? 1 : 0)
