import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { EVENTS, ONCE, PLATFORMS, N_MAX, VERSIONS_MAX, parseTel, majorMinor, counterKey, docKey } from '../shared/tel.mjs'
import { record, shapeDay, readDay, readRange } from '../netlify/lib/tel.mjs'
import { kvUpdate, kvGet } from '../netlify/lib/kv.mjs'
import { handle, allowed } from '../netlify/functions/tel.mjs'
import { overzicht } from '../scripts/tel.mjs'
import { allowed as webAllowed, plan, tel, KEY } from '../src/lib/tel.js'

const NOW = new Date('2026-11-11T10:00:00Z') // 11 november, ochtend/middag in Amsterdam
const D = '2026-11-11-ochtend'
const ok = (o = {}) => ({ e: 'editie-open', d: D, p: 'web', ...o })

// ---- validatie ----
test('parseTel: geldig vocabulaire, strikt de rest', () => {
  assert.deepEqual(parseTel(ok({ v: '1.2', n: 1 }), NOW), { e: 'editie-open', p: 'web', date: '2026-11-11', slot: 'ochtend', v: '1.2', n: 1 })
  for (const e of EVENTS) for (const p of PLATFORMS) assert.ok(parseTel({ e, d: D, p }, NOW), e + p)
  const slecht = [null, [], 'x', 1, {}, ok({ e: 'klik' }), ok({ e: undefined }), ok({ p: 'android' }), ok({ d: '2026-11-11' }), ok({ d: '2026-11-11-nacht' }), ok({ d: '2026-13-40-ochtend' }),
    ok({ d: '2026-11-08-ochtend' }), ok({ d: '2026-11-13-ochtend' }), ok({ v: '1.2.1' }), ok({ v: 'x' }), ok({ v: 12 }), ok({ n: 0 }), ok({ n: N_MAX + 1 }), ok({ n: 1.5 }), ok({ n: '2' }),
    ok({ id: 'abc' }), ok({ userId: 1 }), ok({ ts: 1 }), ok({ ua: 'x' }), ok({ __proto__x: 1 })]
  for (const b of slecht) assert.equal(parseTel(b, NOW), null, JSON.stringify(b))
})
test('parseTel: n begrensd; ONCE-gebeurtenissen tellen altijd één', () => {
  assert.equal(parseTel(ok({ e: 'artikel-open', n: N_MAX }), NOW).n, N_MAX)
  assert.equal(parseTel(ok({ e: 'editie-open', n: 7 }), NOW).n, 1)
  assert.equal(parseTel(ok({ e: 'editie-einde', n: 7 }), NOW).n, 1)
  assert.deepEqual(ONCE, ['editie-open', 'editie-einde'])
})
test('majorMinor', () => {
  assert.equal(majorMinor('1.2.1'), '1.2')
  assert.equal(majorMinor('1.2'), '1.2')
  assert.equal(majorMinor('12'), null)
  assert.equal(majorMinor('1.2.x'), null)
  assert.equal(majorMinor(null), null)
})

// ---- aggregatie, ook gelijktijdig ----
// Een nep-Blobs met echte ETag-semantiek en een await tussen lezen en schrijven, zodat gelijktijdige
// updates echt botsen en de nieuwe poging moet slagen.
function nepBlobs() {
  const m = new Map()
  let etag = 0
  const tick = () => new Promise((r) => setImmediate(r))
  return {
    m,
    async getWithMetadata(k) { await tick(); const c = m.get(k); return c ? { data: structuredClone(c.v), etag: c.etag } : null },
    async setJSON(k, v, o = {}) {
      await tick()
      const c = m.get(k)
      if (o.onlyIfNew && c) return { modified: false }
      if (o.onlyIfMatch && c?.etag !== o.onlyIfMatch) return { modified: false }
      m.set(k, { v: structuredClone(v), etag: String(++etag) })
      return { modified: true }
    },
  }
}
test('kvUpdate: 40 gelijktijdige updates verliezen er geen (voorwaardelijk schrijven)', async () => {
  const store = nepBlobs()
  await Promise.all(Array.from({ length: 40 }, () => kvUpdate('k', (v) => ({ n: (v?.n || 0) + 1 }), { store, tries: 100 })))
  assert.equal(store.m.get('k').v.n, 40)
})
test('record: gelijktijdige tellingen via Blobs-semantiek tellen exact op', async () => {
  const store = nepBlobs()
  const up = (key, fn, o) => kvUpdate(key, fn, { ...o, store, tries: 200 })
  const p = parseTel(ok({ v: '1.2' }), NOW)
  const q = parseTel(ok({ e: 'artikel-open', p: 'ios', n: 3 }), NOW)
  await Promise.all([...Array.from({ length: 25 }, () => record(p, up)), ...Array.from({ length: 15 }, () => record(q, up))])
  const doc = store.m.get(docKey('2026-11-11')).v
  assert.equal(doc.c[counterKey('editie-open', 'web', 'ochtend')], 25)
  assert.equal(doc.c[counterKey('artikel-open', 'ios', 'ochtend')], 45)
  assert.deepEqual(doc.v, { 'web|1.2': 25 })
})
// Met de productie-instellingen (record zelf: 14 pogingen met wachttijd) en een winkel met echte vertraging
// (5 tot 20 ms per lezen en schrijven) gaat een golf gelijktijdige tellingen niet verloren.
function trageBlobs() {
  const m = new Map()
  let etag = 0
  const tick = () => new Promise((r) => setTimeout(r, 5 + Math.random() * 15))
  return {
    m,
    async getWithMetadata(k) { await tick(); const c = m.get(k); return c ? { data: structuredClone(c.v), etag: c.etag } : null },
    async setJSON(k, v, o = {}) {
      await tick()
      const c = m.get(k)
      if (o.onlyIfNew && c) return { modified: false }
      if (o.onlyIfMatch && c?.etag !== o.onlyIfMatch) return { modified: false }
      m.set(k, { v: structuredClone(v), etag: String(++etag) })
      return { modified: true }
    },
  }
}
for (const aantal of [20, 40]) {
  test(`record met de productie-instelling: ${aantal} gelijktijdige tellingen gaan niet verloren`, async () => {
    const store = trageBlobs()
    const up = (key, fn, o) => kvUpdate(key, fn, { ...o, store })
    const p = parseTel(ok(), NOW)
    await Promise.all(Array.from({ length: aantal }, () => record(p, up)))
    assert.equal(store.m.get(docKey('2026-11-11')).v.c[counterKey('editie-open', 'web', 'ochtend')], aantal)
  })
}
test('readRange begrenst het aantal dagen (elke dag is een lezing)', async () => {
  const r = await readRange('2026-11-11', 400, async () => null)
  assert.equal(r.dagen.length, 60)
})
test('record in het geheugen (zonder Blobs): gelijktijdig en atomair', async () => {
  const p = parseTel(ok({ d: '2026-11-10-avond', e: 'delen', p: 'ios' }), NOW)
  await Promise.all(Array.from({ length: 60 }, () => record(p)))
  const doc = await kvGet(docKey('2026-11-10'))
  assert.equal(doc.c[counterKey('delen', 'ios', 'avond')], 60)
})
test('record: versies zijn begrensd, een bekende versie blijft tellen', async () => {
  const mem = new Map()
  const up = async (k, fn) => { const n = fn(mem.get(k) ?? null); mem.set(k, n); return n }
  for (let i = 0; i < VERSIONS_MAX + 5; i++) await record({ e: 'editie-open', p: 'ios', date: '2026-11-11', slot: 'ochtend', v: `9.${i}`, n: 1 }, up)
  await record({ e: 'editie-open', p: 'ios', date: '2026-11-11', slot: 'ochtend', v: '9.0', n: 1 }, up)
  const doc = mem.get(docKey('2026-11-11'))
  assert.equal(Object.keys(doc.v).length, VERSIONS_MAX)
  assert.equal(doc.v['ios|9.0'], 2)
  assert.equal(doc.c[counterKey('editie-open', 'ios', 'ochtend')], VERSIONS_MAX + 6)
})

// ---- uitlezen ----
test('shapeDay: tellers, totalen, lezers en het aandeel dat het einde haalde', () => {
  const c = { [counterKey('editie-open', 'web', 'ochtend')]: 6, [counterKey('editie-open', 'ios', 'ochtend')]: 2, [counterKey('editie-einde', 'web', 'ochtend')]: 3, [counterKey('editie-einde', 'ios', 'ochtend')]: 1, [counterKey('editie-open', 'web', 'middag')]: 4 }
  const d = shapeDay('2026-11-11', { c, v: { 'web|1.2': 6 } })
  assert.deepEqual(d.lezers.ochtend, { open: 8, einde: 4, einde_procent: 50 })
  assert.deepEqual(d.lezers.middag, { open: 4, einde: 0, einde_procent: 0 })
  assert.deepEqual(d.lezers.avond, { open: 0, einde: 0, einde_procent: null })
  assert.deepEqual(d.lezers.dag, { open: 12, einde: 4, einde_procent: 33 })
  assert.equal(d.totaal['editie-open'], 12)
  assert.equal(d.tellers['editie-open'].ios.ochtend, 2)
  assert.deepEqual(d.versies, { 'web|1.2': 6 })
  assert.equal(shapeDay('2026-11-12', null).lezers.dag.open, 0)
})
test('readRange: een reeks van 14 dagen, oudste eerst, tot en met de gevraagde dag', async () => {
  const get = async (k) => (k === 'tel:2026-11-11' ? { c: { [counterKey('editie-open', 'web', 'ochtend')]: 5 } } : null)
  const r = await readRange('2026-11-11', 14, get)
  assert.equal(r.dagen.length, 14)
  assert.equal(r.van, '2026-10-29')
  assert.equal(r.dagen.at(-1).dag, '2026-11-11')
  assert.equal(r.dagen.at(-1).lezers.dag.open, 5)
  assert.equal((await readDay('2026-11-11', get)).totaal['editie-open'], 5)
})

// ---- de functie ----
const post = (body, headers = {}) => new Request('https://gethoot.app/api/tel', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers })
test('POST: altijd 204; geldig wordt geteld, ongeldig genegeerd', async () => {
  const seen = []
  const write = async (p) => seen.push(p)
  for (const b of [ok(), { e: 'x' }, 'kapot{', '', ok({ id: 'x' })]) {
    const r = await handle(post(b), { now: NOW, write })
    assert.equal(r.status, 204)
    assert.equal(await r.text(), '')
  }
  assert.equal(seen.length, 1)
  assert.equal((await handle(post('x'.repeat(2000)), { now: NOW, write })).status, 204)
  assert.equal(seen.length, 1)
  // een storing in de opslag blijft stil
  assert.equal((await handle(post(ok()), { now: NOW, write: async () => { throw new Error('boem') } })).status, 204)
})
test('GET: sleutel via header als TEL_SLEUTEL gezet is; zonder sleutel open; geen sleutel in de URL', async () => {
  const day = async (d) => ({ dag: d })
  const range = async (d, n) => ({ tot: d, n })
  const get = (url, headers = {}) => new Request('https://gethoot.app' + url, { headers })
  const env = { TEL_SLEUTEL: 'geheim' }
  assert.equal((await handle(get('/api/tel?dag=2026-11-11'), { env: {}, now: NOW, day, range })).status, 200)
  assert.equal((await handle(get('/api/tel?dag=2026-11-11'), { env, now: NOW, day, range })).status, 401)
  assert.equal((await handle(get('/api/tel?dag=2026-11-11&sleutel=geheim'), { env, now: NOW, day, range })).status, 401)
  assert.equal((await handle(get('/api/tel', { 'x-tel-sleutel': 'fout' }), { env, now: NOW, day, range })).status, 401)
  const r = await handle(get('/api/tel?dagen=14&dag=2026-11-11', { 'x-tel-sleutel': 'geheim' }), { env, now: NOW, day, range })
  assert.deepEqual(await r.json(), { tot: '2026-11-11', n: 14 })
  assert.deepEqual(await (await handle(get('/api/tel?dag=2026-13-99'), { env: {}, now: NOW, day, range })).json(), { dag: '2026-11-11' }) // ongeldige dag: vandaag
  assert.equal((await handle(new Request('https://gethoot.app/api/tel', { method: 'DELETE' }), { env: {}, now: NOW })).status, 405)
  assert.equal(allowed(get('/api/tel'), {}), true)
})
test('de route heeft een rate limit per IP (Netlify), zonder dat wij iets opslaan', () => {
  const src = readFileSync(new URL('../netlify/functions/tel.mjs', import.meta.url), 'utf8')
  assert.match(src, /path: '\/api\/tel'/)
  assert.match(src, /rateLimit: \{ windowLimit: \d+, windowSize: 60, aggregateBy: \['ip', 'domain'\] \}/)
})

// ---- privacy: nergens een id, IP of log ----
test('de server leest en bewaart geen IP, user-agent, cookie, id of tijdstempel; en logt niets', () => {
  for (const f of ['netlify/functions/tel.mjs', 'netlify/lib/tel.mjs', 'shared/tel.mjs']) {
    const src = readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')
    assert.doesNotMatch(src, /console\./, f + ': geen log')
    assert.doesNotMatch(src, /x-forwarded-for|x-nf-client-connection-ip|client-ip|user-agent|cookie|authorization|context\.ip|geo/i, f + ': geen IP, user-agent of cookie')
    assert.doesNotMatch(src, /Date\.now\(|new Date\(\)\.toISOString|getTime\(/, f + ': geen tijdstempel per gebeurtenis')
  }
})
test('in de opslag staat na een telling alleen het aggregaat: tellers en versies, geen id of tijd', async () => {
  const mem = new Map()
  const up = async (k, fn) => { const n = fn(mem.get(k) ?? null); mem.set(k, n); return n }
  await handle(post(ok({ v: '1.2' }), { 'x-forwarded-for': '203.0.113.9', 'user-agent': 'Zeer Uniek/1', cookie: 'id=42', authorization: 'Bearer abc' }), { now: NOW, write: (p) => record(p, up) })
  assert.deepEqual([...mem.keys()], ['tel:2026-11-11'])
  const json = JSON.stringify([...mem.values()])
  assert.deepEqual(Object.keys(mem.get('tel:2026-11-11')).sort(), ['c', 'v'])
  assert.doesNotMatch(json, /203\.0\.113|Uniek|id=42|Bearer|abc/)
  assert.match(json, /^\[\{"c":\{"editie-open\|web\|ochtend":1\},"v":\{"web\|1\.2":1\}\}\]$/)
})

// ---- web: DNT/GPC, productie, eerste keer per dagdeel ----
const fakeStore = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m } }
const beacon = () => { const sent = []; return { sent, sendBeacon: (u, b) => (sent.push([u, b]), true) } }
test('web: niets bij Do Not Track, Global Privacy Control of buiten productie', () => {
  const nav = (o = {}) => ({ sendBeacon: () => true, ...o })
  assert.equal(webAllowed({ nav: nav(), prod: true, win: {} }), true)
  assert.equal(webAllowed({ nav: nav(), prod: false, win: {} }), false)
  assert.equal(webAllowed({ nav: nav({ doNotTrack: '1' }), prod: true, win: {} }), false)
  assert.equal(webAllowed({ nav: nav({ doNotTrack: 'yes' }), prod: true, win: {} }), false)
  assert.equal(webAllowed({ nav: nav(), prod: true, win: { doNotTrack: '1' } }), false)
  assert.equal(webAllowed({ nav: nav({ msDoNotTrack: '1' }), prod: true, win: {} }), false)
  assert.equal(webAllowed({ nav: nav({ globalPrivacyControl: true }), prod: true, win: {} }), false)
  assert.equal(webAllowed({ nav: nav({ doNotTrack: '0', globalPrivacyControl: false }), prod: true, win: {} }), true)
  assert.equal(webAllowed({ nav: {}, prod: true, win: {} }), false) // geen sendBeacon
  assert.equal(webAllowed({ nav: null, prod: true, win: {} }), false)
})
test('web: tel() stuurt niets bij DNT of GPC, en wel via sendBeacon in productie', () => {
  const storage = fakeStore()
  const a = beacon()
  assert.equal(tel('stroom-open', D, { nav: { ...a, doNotTrack: '1' }, prod: true, storage }), false)
  assert.equal(tel('stroom-open', D, { nav: { ...a, globalPrivacyControl: true }, prod: true, storage }), false)
  assert.equal(tel('stroom-open', D, { nav: a, prod: false, storage }), false)
  assert.equal(a.sent.length, 0)
  assert.equal(storage.m.size, 0) // ook geen "geteld" onthouden als er niets gestuurd mag worden
  assert.equal(tel('stroom-open', D, { nav: a, prod: true, storage, version: '1.2.0' }), true)
  assert.equal(a.sent.length, 1)
  assert.equal(a.sent[0][0], '/api/tel')
  return a.sent[0][1].text().then((t) => assert.deepEqual(JSON.parse(t), { e: 'stroom-open', d: D, p: 'web', v: '1.2' }))
})
test('web: editie-open en editie-einde tellen één keer per dagdeel; de rest elke keer', () => {
  const storage = fakeStore()
  const a = beacon()
  const go = (e, d) => tel(e, d, { nav: a, prod: true, storage })
  assert.equal(go('editie-open', D), true)
  assert.equal(go('editie-open', D), false) // zelfde dagdeel: al geteld
  assert.equal(go('editie-einde', D), true)
  assert.equal(go('editie-einde', D), false)
  assert.equal(go('editie-open', '2026-11-11-middag'), true) // nieuw dagdeel
  assert.equal(go('editie-open', D), true) // terug naar een eerder dagdeel telt weer: we onthouden alleen het laatste
  assert.equal(go('artikel-open', D), true)
  assert.equal(go('artikel-open', D), true)
  assert.equal(a.sent.length, 6)
  // wat het toestel onthoudt: alleen dagdeel-id's per gebeurtenis, niets anders
  assert.deepEqual(JSON.parse(storage.m.get(KEY)), { 'editie-open': D, 'editie-einde': D })
})
test('web: kapotte of ontbrekende opslag breekt niets; onbekende gebeurtenis of dagdeel wordt genegeerd', () => {
  const a = beacon()
  const kapot = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') } }
  assert.equal(tel('editie-open', D, { nav: a, prod: true, storage: kapot }), true)
  assert.equal(plan('klik', D), null)
  assert.equal(plan('editie-open', null), null)
  assert.equal(plan('editie-open', ''), null)
  const slecht = { getItem: () => '[1,2', setItem() {} }
  assert.ok(plan('editie-open', D, { storage: slecht }))
  assert.equal(tel('delen', D, { nav: { sendBeacon: () => { throw new Error('boem') } }, prod: true, storage: fakeStore() }), false) // nooit een uitzondering
})

// ---- script en spiegels ----
test('scripts/tel.mjs print een overzicht', () => {
  const day = (dag, open, einde) => shapeDay(dag, { c: { [counterKey('editie-open', 'web', 'ochtend')]: open, [counterKey('editie-einde', 'web', 'ochtend')]: einde } })
  const t = overzicht({ van: '2026-11-10', tot: '2026-11-11', dagen: [day('2026-11-10', 4, 2), day('2026-11-11', 0, 0)] })
  assert.match(t, /2026-11-10/)
  assert.match(t, /50 %/)
  assert.match(t, /2026-11-11/)
})
test('iOS-spiegel: dezelfde zeven gebeurtenissen als shared/tel.mjs', () => {
  const f = new URL('../ios/Hoot/Telling.swift', import.meta.url)
  assert.ok(existsSync(f))
  const swift = readFileSync(f, 'utf8')
  for (const e of EVENTS) assert.ok(swift.includes(`"${e}"`), e)
  assert.match(swift, new RegExp(`nMax = ${N_MAX}\\b`))
})

// ---- Meten · 6: herkomst, App Store-tik en welkom (achter NIEUWE_TELLERS, standaard uit) ----
import { NIEUWE_TELLERS, NIEUW, VIA_LABELS, VIA_EVENTS, WELKOM_STAPPEN, APPSTORE_TIK, viaEvent, slotIdNow, eventsFor } from '../shared/tel.mjs'
import { telVia } from '../src/lib/tel.js'
import { startTel } from '../landing/tel.mjs'

const AAN = { nieuw: true }
test('Meten · 6: één constante (aan na goedkeuring van het beleid); uit betekent dat de server de nieuwe tellers negeert', () => {
  assert.equal(NIEUWE_TELLERS, true)
  const src = readFileSync(new URL('../shared/tel.mjs', import.meta.url), 'utf8')
  assert.equal(src.match(/export const NIEUWE_TELLERS = (true|false)/g).length, 1)
  for (const e of NIEUW) {
    assert.equal(parseTel(ok({ e }), NOW, { nieuw: false }), null, e + ' uit')
    assert.ok(parseTel(ok({ e }), NOW, AAN), e + ' aan')
  }
  assert.deepEqual(eventsFor(false), EVENTS)
  assert.deepEqual(eventsFor(true), [...EVENTS, ...NIEUW])
})
test('Meten · 6: gesloten vocabulaire; geen leeftijd op het web', () => {
  assert.deepEqual(VIA_LABELS, ['ig', 'x', 'bsky', 'mail', 'nb', 'qr'])
  assert.deepEqual(VIA_EVENTS, ['via:ig', 'via:x', 'via:bsky', 'via:mail', 'via:nb', 'via:qr', 'via:anders'])
  assert.deepEqual(WELKOM_STAPPEN, ['welkom-open', 'bronnen-gekozen', 'liever-meteen-lezen', 'eerste-editie'])
  assert.equal(APPSTORE_TIK, 'appstore-tik')
  assert.ok(!NIEUW.some((e) => /leeftijd|age|install|dag-\d/.test(e)))
  for (const e of ['via:fb', 'via:', 'via:IG', 'via:anders2', 'welkom', 'appstore', 'leeftijd']) assert.equal(parseTel(ok({ e }), NOW, AAN), null, e)
  // herkomst en welkom tellen één keer, de App Store-tik mag n dragen
  assert.equal(parseTel(ok({ e: 'via:ig', n: 5 }), NOW, AAN).n, 1)
  assert.equal(parseTel(ok({ e: 'welkom-open', n: 5 }), NOW, AAN).n, 1)
  assert.equal(parseTel(ok({ e: APPSTORE_TIK, n: 2 }), NOW, AAN).n, 2)
  assert.equal(parseTel(ok({ e: 'via:ig', n: N_MAX + 1 }), NOW, AAN), null)
  assert.equal(parseTel(ok({ e: 'via:ig', id: 'x' }), NOW, AAN), null)
})
test('viaEvent: alleen bekende labels, de rest wordt via:anders', () => {
  assert.equal(viaEvent('ig'), 'via:ig')
  assert.equal(viaEvent(' BSKY '), 'via:bsky')
  assert.equal(viaEvent('facebook'), 'via:anders')
  assert.equal(viaEvent(''), 'via:anders')
  assert.equal(viaEvent('<script>'), 'via:anders')
  assert.equal(viaEvent('x'.repeat(500)), 'via:anders')
  assert.equal(viaEvent(null), null)
  assert.equal(viaEvent(undefined), null)
})
test('slotIdNow: het dagdeel op de klok in Amsterdam; vóór de ochtend nog de avond van gisteren', () => {
  assert.equal(slotIdNow(new Date('2026-11-11T05:00:00Z')), '2026-11-10-avond') // 06:00
  assert.equal(slotIdNow(new Date('2026-11-11T06:00:00Z')), '2026-11-11-ochtend') // 07:00
  assert.equal(slotIdNow(new Date('2026-11-11T12:00:00Z')), '2026-11-11-middag') // 13:00
  assert.equal(slotIdNow(new Date('2026-11-11T17:00:00Z')), '2026-11-11-avond') // 18:00
  assert.equal(slotIdNow(new Date('2026-07-01T10:30:00Z')), '2026-07-01-middag') // zomertijd 12:30
  assert.ok(parseTel(ok({ d: slotIdNow(NOW) }), NOW))
})
test('Meten · 6 op de server: uit genegeerd, aan geteld; in de opslag alleen het aggregaat, geen IP, UA of cookie', async () => {
  const mem = new Map()
  const up = async (k, fn) => { const n = fn(mem.get(k) ?? null); mem.set(k, n); return n }
  const write = (p) => record(p, up)
  const kop = { 'x-forwarded-for': '203.0.113.9', 'user-agent': 'Zeer Uniek/1', cookie: 'id=42', 'x-nf-client-connection-ip': '198.51.100.7' }
  assert.equal((await handle(post(ok({ e: 'via:ig' }), kop), { now: NOW, write, nieuw: false })).status, 204)
  assert.equal(mem.size, 0) // vlag uit: niets
  for (const e of ['via:ig', 'via:anders', APPSTORE_TIK, APPSTORE_TIK, ...WELKOM_STAPPEN]) assert.equal((await handle(post(ok({ e }), kop), { now: NOW, write, nieuw: true })).status, 204)
  assert.equal((await handle(post(ok({ e: 'via:onbekend' }), kop), { now: NOW, write, nieuw: true })).status, 204)
  const doc = mem.get('tel:2026-11-11')
  assert.deepEqual(Object.keys(doc).sort(), ['c', 'v'])
  assert.deepEqual(doc.v, {})
  assert.deepEqual(doc.c, { 'via:ig|web|ochtend': 1, 'via:anders|web|ochtend': 1, 'appstore-tik|web|ochtend': 2, 'welkom-open|web|ochtend': 1, 'bronnen-gekozen|web|ochtend': 1, 'liever-meteen-lezen|web|ochtend': 1, 'eerste-editie|web|ochtend': 1 })
  assert.doesNotMatch(JSON.stringify([...mem.entries()]), /203\.0\.113|198\.51\.100|Uniek|id=42/)
  const d = shapeDay('2026-11-11', doc)
  assert.deepEqual(d.herkomst, { ig: 1, x: 0, bsky: 0, mail: 0, nb: 0, qr: 0, anders: 1 })
  assert.equal(d.appstore_tik, 2)
  assert.deepEqual(d.welkom, { 'welkom-open': 1, 'bronnen-gekozen': 1, 'liever-meteen-lezen': 1, 'eerste-editie': 1 })
  assert.equal(d.lezers.dag.open, 0) // de nieuwe tellers lopen niet door de lezers heen
  const t = overzicht({ van: '2026-11-11', tot: '2026-11-11', dagen: [d] })
  assert.match(t, /Herkomst.*ig 1.*anders 1/)
  assert.match(t, /App Store-tik op de landing: 2/)
  assert.match(t, /welkom-open 1, bronnen-gekozen 1, liever-meteen-lezen 1, eerste-editie 1/)
})
test('Meten · 6 op het web: uit stuurt niets en onthoudt niets; aan één keer per dagdeel (herkomst, welkom), App Store-tik elke keer', async () => {
  const storage = fakeStore()
  const a = beacon()
  for (const e of NIEUW) assert.equal(tel(e, D, { nav: a, prod: true, storage, nieuw: false }), false, e)
  assert.equal(a.sent.length, 0)
  assert.equal(storage.m.size, 0)
  const go = (e) => tel(e, D, { nav: a, prod: true, storage, nieuw: true, version: '1.2.0' })
  assert.equal(go('via:ig'), true)
  assert.equal(go('via:ig'), false)
  assert.equal(go('welkom-open'), true)
  assert.equal(go('welkom-open'), false)
  assert.equal(go(APPSTORE_TIK), true)
  assert.equal(go(APPSTORE_TIK), true)
  assert.equal(go('via:fb'), false) // niet in het vocabulaire
  assert.equal(a.sent.length, 4)
  assert.deepEqual(JSON.parse(await a.sent[0][1].text()), { e: 'via:ig', d: D, p: 'web', v: '1.2' })
  assert.deepEqual(JSON.parse(storage.m.get(KEY)), { 'via:ig': D, 'welkom-open': D })
  // DNT en GPC: ook de nieuwe tellers niet
  const b = beacon()
  const s2 = fakeStore()
  assert.equal(tel('via:ig', D, { nav: { ...b, doNotTrack: '1' }, prod: true, storage: s2, nieuw: true }), false)
  assert.equal(tel(APPSTORE_TIK, D, { nav: { ...b, globalPrivacyControl: true }, prod: true, storage: s2, nieuw: true }), false)
  assert.equal(b.sent.length, 0)
  assert.equal(s2.m.size, 0)
})
const nepAdres = (search, hash = '#/editie') => {
  const calls = []
  return { loc: { pathname: '/lees/', search, hash }, hist: { state: { a: 1 }, replaceState: (st, t, url) => calls.push([st, url]) }, calls }
}
test('telVia: uit raakt de adresbalk niet aan; aan telt via:<label> en haalt ?via weg, de rest van het adres blijft', async () => {
  const a = beacon()
  const uit = nepAdres('?via=ig')
  assert.equal(telVia({ ...uit, nav: a, prod: true, storage: fakeStore(), nieuw: false }), null)
  assert.equal(uit.calls.length, 0)
  assert.equal(a.sent.length, 0)
  const storage = fakeStore()
  const aan = nepAdres('?uitnodiging=abc&via=IG')
  assert.equal(telVia({ ...aan, nav: a, prod: true, storage, nieuw: true, dagdeel: D }), 'via:ig')
  assert.deepEqual(aan.calls, [[{ a: 1 }, '/lees/?uitnodiging=abc#/editie']])
  assert.deepEqual(JSON.parse(await a.sent[0][1].text()), { e: 'via:ig', d: D, p: 'web' })
  const nog = nepAdres('?via=ig', '')
  assert.equal(telVia({ ...nog, nav: a, prod: true, storage, nieuw: true, dagdeel: D }), 'via:ig')
  assert.deepEqual(nog.calls[0][1], '/lees/')
  assert.equal(a.sent.length, 1) // zelfde dagdeel: niet opnieuw geteld
  const vreemd = nepAdres('?via=tiktok')
  assert.equal(telVia({ ...vreemd, nav: a, prod: true, storage: fakeStore(), nieuw: true, dagdeel: D }), 'via:anders')
  assert.equal(a.sent.length, 2)
  const geen = nepAdres('?q=1')
  assert.equal(telVia({ ...geen, nav: a, prod: true, storage: fakeStore(), nieuw: true, dagdeel: D }), null)
  assert.equal(geen.calls.length, 0)
  // DNT: opgeschoond, niet geteld, niets onthouden
  const s3 = fakeStore()
  const dnt = nepAdres('?via=mail')
  telVia({ ...dnt, nav: { ...a, doNotTrack: '1' }, prod: true, storage: s3, nieuw: true, dagdeel: D })
  assert.equal(dnt.calls.length, 1)
  assert.equal(a.sent.length, 2)
  assert.equal(s3.m.size, 0)
  // nooit een uitzondering
  assert.equal(telVia({ loc: { get search() { throw new Error('x') } }, nieuw: true }), null)
})
test('landing: uit doet niets; aan telt een tik op een App Store-link als appstore-tik', async () => {
  let listener = null
  const doc = { addEventListener: (t, fn) => { listener = fn } }
  assert.equal(startTel({ doc, nieuw: false }), false)
  assert.equal(listener, null)
  const a = beacon()
  const adres = nepAdres('')
  assert.equal(startTel({ doc, nieuw: true, nav: a, prod: true, storage: fakeStore(), ...adres }), true)
  listener({ target: { closest: (sel) => (sel.includes('apps.apple.com') ? {} : null) } })
  listener({ target: { closest: () => null } })
  assert.equal(a.sent.length, 1)
  assert.equal(JSON.parse(await a.sent[0][1].text()).e, APPSTORE_TIK)
})
test('Meten · 6: geen IP, user-agent, cookie of log in de nieuwe bronnen; de landing bundelt het gedeelde vocabulaire', () => {
  for (const f of ['landing/tel.mjs', 'src/lib/tel.js']) {
    const src = readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')
    assert.doesNotMatch(src, /console\.|document\.cookie|userAgent|Date\.now\(/, f)
  }
  const build = readFileSync(new URL('../landing/build.mjs', import.meta.url), 'utf8')
  assert.match(build, /entryPoints: \[path\.join\(SRC, 'tel\.mjs'\)\], bundle: true/)
})
test('Meten · 6: de tellers gaan pas aan samen met het aangepaste privacybeleid', () => {
  const privacy = readFileSync(new URL('../src/views/Privacy.jsx', import.meta.url), 'utf8')
  const nieuweZin = /via welke link je binnenkwam/
  if (NIEUWE_TELLERS) assert.match(privacy, nieuweZin, 'NIEUWE_TELLERS staat aan, maar het privacybeleid zegt het nog niet')
  else assert.doesNotMatch(privacy, nieuweZin, 'het beleid noemt de herkomst al, terwijl de tellers uit staan')
})
