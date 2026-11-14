// Stroom: gezien is echt gezien (melding Alex, 14 november). De echte app (vite met de lokale feed) in headless
// Chrome, met verse opslag. Het scenario uit de melding:
//   1. eerste bezoek: de Stroom laden en niets doen (niet scrollen);
//   2. tweede bezoek (nieuw tabblad): Alles, dan de tab Wetenschap, dan één bron. Overal moeten berichten staan,
//      want je hebt nog niets gezien. Vroeger stond daar alleen "Je bent bij." en "Ouder nieuws tonen";
//   3. in Wetenschap echt naar beneden scrollen tot het einde en even blijven kijken;
//   4. derde bezoek: Wetenschap is nu "Je bent bij." zonder ongeziene berichten (je staat weer op je plek),
//      Alles toont nog wat je niet zag.
// Gebruik: node tests/visual/stroom-gezien-check.mjs [--stills <map>] [--fase voor|na]
// Met --fase voor legt hij alleen vast (schermbeelden en meting), zonder te falen.
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 5211, DEBUG = 9351
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null }
const stills = arg('--stills') ? resolve(arg('--stills')) : null
const fase = arg('--fase') || 'na'
if (stills) mkdirSync(stills, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const BASE = `http://localhost:${PORT}/lees/`

const vite = spawn('node_modules/.bin/vite', ['--config', 'tests/visual/stroom-gezien.vite.config.mjs', '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'pipe', 'inherit'] })
await new Promise((ok) => vite.stdout.on('data', (d) => { if (/Local:/.test(String(d))) ok() }))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'stroom-gezien-'))}`, 'about:blank'], { stdio: 'ignore' })

// Eén verbinding per tabblad (CDP via de websocket van dat tabblad).
async function tabblad(url) {
  const t = await fetch(`http://127.0.0.1:${DEBUG}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }).then((r) => r.json())
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((ok) => ws.addEventListener('open', ok))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') fouten.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') fouten.push(m.params.args.map((a) => a.value ?? a.description).join(' ')); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result) } })
  const send = (method, params = {}) => new Promise((ok, fail) => { const n = ++id; pending.set(n, { ok, fail }); ws.send(JSON.stringify({ id: n, method, params })) })
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value
  const maat = (width, height) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: width < 600, screenWidth: width, screenHeight: height })
  await send('Page.enable'); await send('Runtime.enable')
  await maat(390, 844)
  const sluit = async () => { ws.close(); await fetch(`http://127.0.0.1:${DEBUG}/json/close/${t.id}`).catch(() => {}) }
  return { send, evaluate, maat, sluit }
}

// Wat de Stroom nu laat zien: hoeveel berichten, en of het einde ("Je bent bij.", "Ouder nieuws tonen") er staat.
const STAND = `(() => {
  const v = document.querySelector('section[aria-label="Stroom"]')
  if (!v || v.hidden) return null
  const klaar = v.querySelector('.list, .listempty, .empty')
  if (!klaar || v.querySelector('.loadlines-box, .loadlinesbox')) return null
  const box = v.getBoundingClientRect()
  const inBeeld = (el) => { const r = el.getBoundingClientRect(); return r.bottom > box.top && r.top < box.bottom }
  const bij = [...v.querySelectorAll('.listend')].find((el) => /Je bent bij/.test(el.textContent))
  const ouder = [...v.querySelectorAll('button')].find((b) => /Ouder nieuws tonen/.test(b.textContent))
  return { endTop: bij ? Math.round(bij.getBoundingClientRect().top - box.top) : null, berichten: v.querySelectorAll('.list [data-id]').length, bij: !!bij, bijInBeeld: !!bij && inBeeld(bij), ouder: !!ouder, ouderInBeeld: !!ouder && inBeeld(ouder) }
})()`

async function wachtStand(tab, ms = Number(process.env.WACHT || 240000)) {
  const t0 = Date.now()
  let s = null
  while (Date.now() - t0 < ms) {
    s = await tab.evaluate(STAND)
    if (s && (s.berichten > 0 || s.bij)) { await sleep(800); return tab.evaluate(STAND) }
    await sleep(400)
  }
  const tekst = await tab.evaluate(`location.href + ' | ' + [...document.querySelectorAll('section')].map((v) => (v.getAttribute('aria-label') || v.className) + (v.hidden ? '(verborgen)' : '')).join(',') + ' | ' + [...document.querySelectorAll('section[aria-label="Stroom"] .col > *, section[aria-label="Stroom"] .col > * > *')].map((e) => e.className).join(' ; ')`)
  throw new Error('de Stroom kwam niet: ' + JSON.stringify(s) + ' ' + tekst + ' ' + fouten.slice(0, 5).join(' || '))
}

async function naar(tab, hash) {
  await tab.evaluate(`(location.hash = ${JSON.stringify(hash)}, true)`)
  await sleep(1200)
  return wachtStand(tab)
}

async function shot(tab, naam) {
  if (!stills) return
  const s = await tab.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(stills, `${naam}.png`), Buffer.from(s.data, 'base64'))
}

// Echt scrollen: met het muiswiel tot het einde in beeld staat, en daar even blijven kijken.
async function scrolNaarEinde(tab) {
  let i = 0
  for (; i < 400; i++) {
    const s = await tab.evaluate(STAND)
    if (s?.bijInBeeld || s?.ouderInBeeld) break
    // Het blad "Hoot op al je toestellen" komt op na een stuk scrollen: wegdoen zoals een lezer dat doet (Esc).
    if (await tab.evaluate(`!!document.querySelector('.sheet--join')`)) {
      await tab.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
      await tab.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
      await sleep(500)
    }
    // Steeds op een andere plek in de kantlijn: een video of beeld onder de muis vangt het wiel soms zelf.
    const voor = await tab.evaluate(`document.querySelector('section[aria-label="Stroom"]').scrollTop`)
    await tab.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 8 + (i % 3) * 4, y: 300 + (i % 5) * 60, deltaX: 0, deltaY: 420 })
    await sleep(60)
    if (voor === (await tab.evaluate(`document.querySelector('section[aria-label="Stroom"]').scrollTop`))) {
      await tab.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34 })
      await tab.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34 })
    }
    await sleep(260)
  }
  uit.scrolStappen = i
  await sleep(2600)
}

const uit = { fase }
const fouten = []
let fout = 0
const eis = (ok, wat) => { if (!ok) { fout++; console.error('NIET GOED: ' + wat) } }
try {
  for (let i = 0; i < 150; i++) { await sleep(200); if (await fetch(`http://127.0.0.1:${DEBUG}/json/version`).then(() => true).catch(() => false)) break }

  // 1. Eerste bezoek: laden, niets doen.
  const a = await tabblad(BASE + '#/stroom')
  uit.eersteBezoek = await wachtStand(a)
  await sleep(2500)
  await a.sluit()

  // 2. Tweede bezoek: Alles, Wetenschap, één bron.
  const b = await tabblad(BASE + '#/stroom')
  uit.alles = await wachtStand(b)
  await shot(b, 'web-390-alles')
  uit.wetenschap = await naar(b, '#/stroom?rubriek=wetenschap')
  await shot(b, 'web-390-wetenschap')
  await b.maat(1200, 900)
  await sleep(900)
  await shot(b, 'web-1200-wetenschap')
  await b.maat(390, 844)
  const eersteBron = await b.evaluate(`(() => { const s = [...document.querySelectorAll('section[aria-label="Stroom"] [data-src]')].map((e) => e.dataset.src).filter(Boolean); return s[0] || 'nos' })()`)
  uit.bronId = eersteBron
  uit.bron = await naar(b, `#/stroom?bron=${eersteBron}`)
  await shot(b, 'web-390-bron')
  eis(uit.alles.berichten > 0, 'Alles toont berichten na alleen laden')
  eis(uit.wetenschap.berichten > 0 && !uit.wetenschap.bijInBeeld, 'Wetenschap toont berichten, niet meteen "Je bent bij."')
  eis(uit.bron.berichten > 0 && !uit.bron.bijInBeeld, 'een bron toont berichten, niet meteen "Je bent bij."')

  // 3. In Wetenschap echt lezen: scrollen tot het einde.
  uit.wetenschapVoorScrollen = await naar(b, '#/stroom?rubriek=wetenschap')
  await b.evaluate(`(document.querySelector('section[aria-label="Stroom"]').scrollTop = 0, true)`)
  await sleep(500)
  await scrolNaarEinde(b)
  uit.naScrollen = await b.evaluate(`(() => { const v = document.querySelector('section[aria-label="Stroom"]'); const b = v.getBoundingClientRect(); return { top: v.scrollTop, max: v.scrollHeight - v.clientHeight, rijen: [...v.querySelectorAll('.list [data-id]')].map((e) => { const r = e.getBoundingClientRect(); return e.dataset.id.slice(-10) + ':' + Math.round(r.top - b.top) + '-' + Math.round(r.bottom - b.top) }), h: Math.round(b.height), gezien: Object.keys(JSON.parse(localStorage.getItem('hoot:stroom-gezien') || '{}')).map((k) => k.slice(-10)) } })()`)
  uit.gezienNaScrollen = await b.evaluate(`(() => { try { return Object.keys(JSON.parse(localStorage.getItem('hoot:stroom-gezien') || '{}')).length } catch { return -1 } })()`)
  await b.sluit()

  // 4. Derde bezoek: Wetenschap is bij, Alles nog niet.
  const c = await tabblad(BASE + '#/stroom?rubriek=wetenschap')
  uit.wetenschapDerde = await wachtStand(c)
  uit.derdeRijen = await c.evaluate(`(() => { const v = document.querySelector('section[aria-label="Stroom"]'); const b = v.getBoundingClientRect(); return { top: v.scrollTop, max: v.scrollHeight - v.clientHeight, rijen: [...v.querySelectorAll('.list [data-id]')].map((e) => { const r = e.getBoundingClientRect(); return e.dataset.id.slice(-10) + ':' + Math.round(r.top - b.top) + '-' + Math.round(r.bottom - b.top) }), h: Math.round(b.height), gezien: Object.keys(JSON.parse(localStorage.getItem('hoot:stroom-gezien') || '{}')).map((k) => k.slice(-10)) } })()`)
  await shot(c, 'web-390-wetenschap-na-lezen')
  await c.maat(1200, 900)
  await sleep(900)
  await shot(c, 'web-1200-wetenschap-na-lezen')
  await c.maat(390, 844)
  uit.allesDerde = await naar(c, '#/stroom')
  await shot(c, 'web-390-alles-na-lezen')
  eis(uit.gezienNaScrollen > 0, 'scrollen markeert berichten als gezien')
  // Je komt terug op je plek (de leespositie), met daaronder meteen "Je bent bij.": er staat niets ongeziens.
  const ongezien = uit.derdeRijen.rijen.filter((r) => !uit.derdeRijen.gezien.includes(r.split(':')[0]))
  eis(uit.wetenschapDerde.bijInBeeld && ongezien.length === 0 && !uit.wetenschapDerde.ouder, 'na alles in Wetenschap gezien: "Je bent bij.", niets ongeziens')
  eis(uit.allesDerde.berichten > 0, 'Alles toont nog wat je niet zag')
  await c.sluit()
} finally {
  chrome.kill(); vite.kill()
}
if (fouten.length) uit.fouten = fouten.slice(0, 8)
console.log(JSON.stringify(uit, null, 1))
process.exit(fase === 'voor' ? 0 : fout ? 1 : 0)
