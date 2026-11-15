// Schermafdrukken van Volgen 1.5 op het web: lokale preview van dist (nepserver.mjs), vlag aan, licht en donker, 390 en 1280.
// Supabase wordt in deze headless browser onderschept (Fetch), zodat er niets naar de echte database gaat.
import { launch } from './cdp.mjs'
import { mkdirSync } from 'node:fs'

const OUT = process.argv[2]
const PORT = Number(process.argv[3] || 4810)
const ONLY = process.argv[4] || ''
mkdirSync(OUT, { recursive: true })
const BASE = `http://localhost:${PORT}/lees/`
const NOW = Date.parse('2026-11-11T06:50:20.913Z') + 15 * 60e3
const iso = (t) => new Date(t).toISOString()
const USER = { id: 'proef-0000-0000', aud: 'authenticated', role: 'authenticated', email: 'proef@example.test', user_metadata: { full_name: 'Proef' }, app_metadata: {}, created_at: iso(NOW - 30 * 864e5) }
const SESSION = { access_token: 'nep', token_type: 'bearer', expires_in: 3600 * 24 * 365, expires_at: Math.floor(NOW / 1000) + 3600 * 24 * 365, refresh_token: 'nep', user: USER }

const zaak = (slug, label, extra = {}) => ({ slug, label, opdracht: '', at: iso(NOW - 3 * 864e5), gezien: null, status: 'actief', gestoptAt: null, ...extra })
const DRIE = [
  zaak('spionagezaak-vk', 'Spionagezaak VK', { gezien: iso(NOW - 2 * 864e5) }),
  zaak('jensen-huang', 'Jensen Huang', { gezien: iso(NOW - 1800e3) }),
  zaak('playstation', 'PlayStation'),
  zaak('tata-steel', 'Rechtszaak Tata Steel', { status: 'gestopt', gestoptAt: iso(NOW - 2 * 864e5) }),
]
const TWEE = DRIE.slice(0, 2)
const prefsMet = (volgzaken) => ({ schema: 5, onboarded: true, muted: [], interests: ['politiek', 'wereld', 'economie', 'tech', 'cultuur'], topics: [], layout: 'tijdlijn', theme: 'system', themeDark: 'dark', volgzaken, volgzakenOmgezet: true, kantenTip: true, editieHint: false, installTipDone: true, appKaartDone: true, joinAsked: { n: 9, at: NOW } })

const b = await launch(9335)
await b.send('Page.addScriptToEvaluateOnNewDocument', {
  source: `(() => { const RD = Date; const OFF = ${NOW} - RD.now(); class D extends RD { constructor(...a) { super(...(a.length ? a : [RD.now() + OFF])) } static now() { return RD.now() + OFF } } globalThis.Date = D })()`,
})
// Supabase: niets naar buiten. Een sessie, een profiel, en je prefs als stand van je account.
let accountPrefs = prefsMet(DRIE)
await b.send('Fetch.enable', { patterns: [{ urlPattern: '*supabase.co*' }] })
const ws = b
const onPaused = async (m) => {
  if (m.method !== 'Fetch.requestPaused') return
  const { requestId, request } = m.params
  const u = request.url
  let body = '{}'
  let code = 200
  const single = /vnd\.pgrst\.object/.test(request.headers?.Accept || request.headers?.accept || '')
  if (/\/rest\/v1\/profiles/.test(u)) body = JSON.stringify(single ? { is_admin: false, created_at: iso(NOW - 30 * 864e5) } : [{ is_admin: false, created_at: iso(NOW - 30 * 864e5) }])
  else if (/\/rest\/v1\/user_state/.test(u) && request.method === 'GET') body = JSON.stringify(single ? { prefs: accountPrefs, read_ids: [], stories_seen: {} } : [{ prefs: accountPrefs, read_ids: [], stories_seen: {} }])
  else if (/\/rest\/v1\/saved_items/.test(u) && request.method === 'GET') body = '[]'
  else if (/\/rest\/v1\//.test(u)) { code = 201; body = '[]' }
  else if (/\/auth\/v1\/user/.test(u)) body = JSON.stringify(USER)
  await b.send('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: '*' }], body: Buffer.from(body).toString('base64') }).catch(() => {})
}
// cdp.mjs geeft geen luisteraar terug; even via een eigen WebSocket-haakje: we pollen niet, we vragen de events op.
b._listen?.(onPaused)

async function zet(prefs, { local = {} } = {}) {
  accountPrefs = prefs
  await b.go(`http://localhost:${PORT}/leeg`, 300)
  await b.eval(`(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('hoot:prefs', ${JSON.stringify(JSON.stringify(prefs))}); localStorage.setItem('sb-vlimcejjkeltooplsijx-auth-token', ${JSON.stringify(JSON.stringify(SESSION))}); localStorage.setItem('hoot.volgzaken', 'aan'); ${Object.entries(local).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join('')} return true })()`)
}
const naar = async (hash, wait = 2500) => {
  await b.go(`http://localhost:${PORT}/leeg`, 200)
  await b.go(BASE + hash, wait)
}
const klik = (sel) => b.eval(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true })()`)
const typ = async (sel, tekst) => {
  await b.eval(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(tekst)}); el.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
  await b.sleep(300)
  await b.eval(`document.querySelector(${JSON.stringify(sel)}).form.requestSubmit()`)
}

const MATEN = [
  { naam: '390', w: 390, h: 844, mobile: true },
  { naam: '1280', w: 1280, h: 860, mobile: false },
]
for (const maat of MATEN) {
  for (const thema of ['licht', 'donker']) {
    const tag = `${maat.naam}-${thema}`
    if (ONLY && !tag.includes(ONLY)) continue
    await b.size(maat.w, maat.h, 2, maat.mobile)
    await b.theme(thema === 'donker')
    const f = (n) => `${OUT}/web-${n}-${tag}.png`

    await zet(prefsMet(DRIE))
    await naar('#/stroom', 4000)
    await b.eval(`document.querySelector('.main .view:not([hidden])')?.scrollTo(0,0)`)
    await b.sleep(400)
    await b.shot(f('stroom-voorrang'))
    // Het kaartmenu op het stuk bovenaan: Naar … en Stop met volgen.
    const menu = await b.eval(`(() => { const e = [...document.querySelectorAll('.list .entry')].find((x) => x.querySelector('.volglabel')); const k = e?.querySelector('button[aria-haspopup="menu"]'); if (!k) return false; k.scrollIntoView({ block: 'center' }); k.click(); return true })()`)
    await b.sleep(500)
    if (menu) await b.shot(f('kaartmenu'))

    await naar('#/editie', 4500)
    await b.eval(`(() => { const l = document.querySelector('.main .view:not([hidden]) .volglabel'); if (l) l.closest('.entry')?.scrollIntoView({ block: 'center' }); return !!l })()`)
    await b.sleep(600)
    await b.shot(f('editie-label'))

    await naar('#/zoek', 2500)
    await b.shot(f('zoeken-je-volgt'))
    await klik('.jevolgt__wijzig')
    await b.sleep(600)
    await b.shot(f('beheerblad'))

    await naar('#/volg?naam=spionagezaak-vk', 3000)
    await b.shot(f('pagina'))
    await klik('.vh .volgend')
    await b.sleep(500)
    await b.shot(f('pagina-volgend-menu'))

    await zet(prefsMet(TWEE))
    await naar('#/zoek', 2500)
    await typ('#q', 'vredesoverleg oekraine')
    await b.sleep(1500)
    await b.shot(f('zoeken-kop'))
    console.log(tag, 'klaar', b.logs.splice(0).slice(0, 5))
  }
}
b.close()
