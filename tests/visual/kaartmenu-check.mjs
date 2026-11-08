// Kaartmenu: opent ⋯ bij een bronregel in de Editie (tweekoloms rij en smalle zijkolom) en bij kaart A+,
// op 1440, 1280, 1024 en 390, en meet: breekt de bronnaam of de tijd (aantal regels dicht en open), groeit
// de bronregel, en waar staat het menu (binnen het venster, rechts op de kolomlijn). Headless Chrome via het
// DevTools-protocol, zoals vouw-check.mjs. Met --stills <map> ook schermbeelden (2×).
// Gebruik: node tests/visual/kaartmenu-check.mjs [--stills ../Hoot-design/kaartmenu] [--naam na]
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 5207, DEBUG = 9347
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null }
const stills = arg('--stills') ? resolve(arg('--stills')) : null
const naam = arg('--naam') || 'na'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const vite = spawn('node_modules/.bin/vite', ['--config', 'tests/visual/vouw.vite.config.mjs', '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'pipe', 'inherit'] })
await new Promise((ok) => vite.stdout.on('data', (d) => { if (/Local:/.test(String(d))) ok() }))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'kaartmenu-'))}`, 'about:blank'], { stdio: 'ignore' })

let ws, id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((ok, fail) => { const n = ++id; pending.set(n, { ok, fail }); ws.send(JSON.stringify({ id: n, method, params })) })
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value

// Meet de bronregel van één plek: naam en tijd (breedte, hoogte, regels), de regel zelf, en het menu.
const MEET = (sel) => `(() => {
  const e = document.querySelector('${sel}'); if (!e) return null
  const row = e.querySelector('.meta, .kmeta')
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) } }
  const regels = (el) => { if (!el) return 0; const lh = parseFloat(getComputedStyle(el).lineHeight); return Math.round(el.getBoundingClientRect().height / lh) }
  const name = row.querySelector('.srcmeta__name'), time = row.querySelector('.srcmeta__time')
  const menu = document.querySelector('.popmenu') || row.querySelector('.taste, .taste__said')
  const ink = [...row.querySelectorAll(':scope > .iconbtn svg')].map((s) => s.getBoundingClientRect()).filter((b) => b.width).reduce((m, b) => Math.max(m, b.right), 0)
  return { regel: r(row), naam: { ...r(name), regels: regels(name), tekst: name?.textContent }, tijd: { ...r(time), regels: regels(time) }, muis: matchMedia('(hover: hover) and (pointer: fine)').matches, menu: r(menu), kolomlijn: Math.round(ink), venster: innerWidth }
})()`

let fout = 0
const log = []
try {
  let page
  for (let i = 0; i < 50 && !page; i++) { await sleep(200); page = await fetch(`http://127.0.0.1:${DEBUG}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === 'page')).catch(() => null) }
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((ok) => ws.addEventListener('open', ok))
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result) } })
  await send('Page.enable'); await send('Runtime.enable')
  const SCHERMEN = [[1440, 900, false], [1280, 800, false], [1024, 768, false], [390, 844, true]]
  const PLEKKEN = [['editie', 'a5', 'tweekoloms'], ['editie', 'a2', 'zijkolom'], ['kaart', 'a5', 'kaart-aplus']]
  for (const [w, h, mobile] of SCHERMEN.filter(([w]) => !process.env.ALLEEN || process.env.ALLEEN == w)) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile, screenWidth: w, screenHeight: h })
    // Desktop met een muis (hover, fijne aanwijzer), telefoon met een vinger: zoals op het echte toestel.
    await send('Emulation.setEmulatedMedia', { features: mobile ? [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }, { name: 'any-hover', value: 'none' }, { name: 'any-pointer', value: 'coarse' }] : [{ name: 'hover', value: 'hover' }, { name: 'pointer', value: 'fine' }, { name: 'any-hover', value: 'hover' }, { name: 'any-pointer', value: 'fine' }] })
    await send('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
    for (const [view, idx, plek] of PLEKKEN) {
      if (mobile && plek === 'zijkolom') continue // de telefoon heeft geen zijkolom: alles is kaart A+
      await send('Page.navigate', { url: `http://localhost:${PORT}/lees/tests/visual/kaartmenu.html?view=${view}` })
      const sel = `[data-id="${idx}"]`
      for (let i = 0; i < 80 && !(await ev(`!!document.querySelector('${sel}')`)); i++) await sleep(150)
      await sleep(1200)
      await ev(`document.fonts.ready.then(() => 1)`)
      await ev(`(() => { const e = document.querySelector('${sel}'); e.scrollIntoView({ block: 'center' }); return 1 })()`)
      await sleep(500)
      const dicht = await ev(MEET(sel))
      if (!dicht) { console.log('FOUT', w, plek, 'plek niet gevonden'); fout++; continue }
      // Wijs naar het verhaal (hover) en klik op ⋯, zoals een mens.
      // Wacht tot de knop stilstaat (de Editie zet zich bij het laden nog even neer).
      const waar = () => ev(`(() => { const b = document.querySelector('${sel} :is(.meta, .kmeta) > button[aria-haspopup]').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })()`)
      let knop = await waar()
      for (let i = 0; i < 20; i++) { await sleep(150); const nu = await waar(); if (Math.abs(nu.x - knop.x) < 0.5 && Math.abs(nu.y - knop.y) < 0.5) break; knop = nu }
      if (mobile) {
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: knop.x, y: knop.y }] })
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      } else {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: knop.x, y: knop.y })
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: knop.x, y: knop.y, button: 'left', clickCount: 1 })
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: knop.x, y: knop.y, button: 'left', clickCount: 1 })
      }
      await sleep(400)
      const open = await ev(MEET(sel))
      const naamHeel = open.naam.regels <= dicht.naam.regels && open.naam.w >= dicht.naam.w - 1
      const tijdHeel = open.tijd.regels <= dicht.tijd.regels
      const regelGelijk = Math.abs(open.regel.h - dicht.regel.h) <= 1
      const m = open.menu
      const binnen = !!m && m.x >= 0 && m.r <= w && m.b <= h && m.y >= 0
      const ok = naamHeel && tijdHeel && regelGelijk && binnen
      if (!ok) fout++
      const regel = { scherm: w, plek, ok, naamHeel, tijdHeel, regelGelijk, menuBinnenVenster: binnen, dicht, open }
      log.push(regel)
      console.log(ok ? 'ok  ' : 'FOUT', String(w).padEnd(5), plek.padEnd(12), `naam ${dicht.naam.w}×${dicht.naam.h} (${dicht.naam.regels}) → ${open.naam.w}×${open.naam.h} (${open.naam.regels})`, `tijd ${dicht.tijd.regels}→${open.tijd.regels} regels`, `regel ${dicht.regel.h}→${open.regel.h}`, `muis ${open.muis}`, m ? `menu x${m.x} y${m.y} ${m.w}×${m.h} r${m.r} (kolomlijn ${open.kolomlijn})` : 'geen menu')
      if (stills) {
        const e = open.regel
        const top = Math.max(0, Math.min(e.y, m ? m.y : e.y) - 140), bottom = Math.min(h, Math.max(e.b, m ? m.b : e.b) + 24)
        const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: top, width: w, height: bottom - top, scale: 1 } })
        writeFileSync(join(stills, `${naam}-${w}-${plek}.png`), Buffer.from(shot.data, 'base64'))
      }
    }
  }
  // Toetsenbord en klik buiten (1280, Editie, de tweekoloms rij).
  if (!process.env.ALLEEN || process.env.ALLEEN === 'toets') {
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'hover', value: 'hover' }, { name: 'pointer', value: 'fine' }] })
    await send('Page.navigate', { url: `http://localhost:${PORT}/lees/tests/visual/kaartmenu.html` })
    for (let i = 0; i < 60 && !(await ev(`!!document.querySelector('[data-id="a5"] [aria-haspopup="menu"]')`)); i++) await sleep(150)
    await sleep(600)
    const key = async (k, code = k) => { const vk = { Enter: 13, Escape: 27, ArrowDown: 40, ArrowUp: 38, Tab: 9, End: 35 }[k]; await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, ...(k === 'Enter' ? { text: '\r' } : {}) }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }) }
    const stand = () => ev(`JSON.stringify({ menu: !!document.querySelector('.popmenu'), rol: document.activeElement?.getAttribute('role'), tekst: document.activeElement?.textContent, knop: document.activeElement?.matches('[aria-haspopup="menu"]'), expanded: document.querySelector('[data-id="a5"] [aria-haspopup="menu"]')?.getAttribute('aria-expanded') })`).then(JSON.parse)
    await ev(`(() => { const b = document.querySelector('[data-id="a5"] [aria-haspopup="menu"]'); b.scrollIntoView({ block: 'center' }); b.focus(); return 1 })()`)
    const stappen = []
    await key('Enter'); await sleep(200); stappen.push(['Enter opent, focus op de eerste keuze', await stand(), (s) => s.menu && s.rol === 'menuitem' && s.tekst === 'Meer hiervan' && s.expanded === 'true'])
    await key('ArrowDown'); stappen.push(['↓ naar Minder hiervan', await stand(), (s) => s.tekst === 'Minder hiervan'])
    await key('End'); await key('Enter'); await sleep(150); stappen.push(['End + Enter: de redenen, focus op terug', await stand(), (s) => s.menu && /Klopt dit niet\?/.test(s.tekst)])
    if (stills) {
      const m = await ev(`(() => { const e = document.querySelector('.popmenu'); if (!e) return null; const b = e.getBoundingClientRect(); return { y: b.top, b: b.bottom } })()`)
      if (m) {
        const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: Math.max(0, m.y - 200), width: 1280, height: m.b - m.y + 224, scale: 2 } })
      writeFileSync(join(stills, `${naam}-1280-redenen-toetsenbord.png`), Buffer.from(shot.data, 'base64'))
      }
    }
    await key('Escape'); await sleep(150); stappen.push(['Esc sluit, focus terug op ⋯', await stand(), (s) => !s.menu && s.knop && s.expanded === 'false'])
    await key('Enter'); await sleep(150); await key('Tab'); await sleep(150); stappen.push(['Tab sluit en gaat verder', await stand(), (s) => !s.menu && !s.knop])
    await ev(`document.querySelector('[data-id="a5"] [aria-haspopup="menu"]').click()`); await sleep(150)
    stappen.push(['klik opent', await stand(), (s) => s.menu])
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 5, y: 5, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 5, y: 5, button: 'left', clickCount: 1 }); await sleep(150)
    stappen.push(['klik buiten sluit', await stand(), (s) => !s.menu])
    for (const [wat, st, ok] of stappen) { const goed = ok(st); if (!goed) fout++; console.log(goed ? 'ok  ' : 'FOUT', 'toets', wat, JSON.stringify(st)); log.push({ toets: wat, ok: goed, stand: st }) }
  }
} finally { ws?.close(); chrome.kill(); vite.kill() }
if (stills) writeFileSync(join(stills, `meting-${naam}.json`), JSON.stringify(log, null, 1))
console.log(fout ? `${fout} fout` : 'fail 0')
process.exit(fout ? 1 : 0)
