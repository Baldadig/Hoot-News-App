import { test } from 'node:test'
import assert from 'node:assert/strict'
import legacy from '../netlify/edge-functions/legacy-domain.js'
import { movePayload, encodeMove, decodeMove, applyMove, receiveMove, dropMoveFragment, MOVE_KEYS } from '../src/lib/domain-migration.js'
import { migrate } from '../src/lib/migrate.js'
import { readFileSync } from 'node:fs'
const storage = (initial = {}) => { const data = new Map(Object.entries(initial)); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) } }
test('verhuizen: voorkeuren en Bewaard mee, inlogtokens en uitnodigingen blijven achter', async () => {
  const old = storage({ 'hoot:prefs': '{"layout":"krant"}', 'hoot:saved-v2': '{"a":{"title":"Kop"}}', 'hoot:google-token': 'geheim', 'hoot:invite': 'geheim', 'sb-auth-token': 'geheim' })
  const payload = await decodeMove(await encodeMove(movePayload(old, '#/stroom?rubriek=cultuur')))
  assert.deepEqual(Object.keys(payload.values), ['hoot:prefs', 'hoot:saved-v2'])
  const target = storage(); applyMove(target, payload, 'https://hootnews.nl')
  assert.equal(target.getItem('hoot:prefs'), '{"layout":"krant"}')
  assert.equal(old.getItem('hoot:saved-v2'), target.getItem('hoot:saved-v2'))
  assert.equal(payload.route, '#/stroom?rubriek=cultuur')
})
test('verhuizen: bestaande nieuwe instellingen winnen; onbekende herkomst en velden worden geweigerd', () => {
  const target = storage({ 'hoot:prefs': '{"layout":"tijdlijn"}' })
  const payload = { version: 1, values: { 'hoot:prefs': '{"layout":"krant"}' } }
  applyMove(target, payload, 'https://hootnews.nl')
  assert.equal(target.getItem('hoot:prefs'), '{"layout":"tijdlijn"}')
  assert.throws(() => applyMove(target, payload, 'https://anders.nl'))
  assert.throws(() => applyMove(target, { version: 1, values: { 'hoot:google-token': '"token"' } }, 'https://hootnews.nl'))
})
test('verhuizen: accountgegevens gaan via synchronisatie; volle opslag rolt een gedeeltelijke verhuizing terug', () => {
  assert.deepEqual(Object.keys(movePayload(storage({ 'hoot:synced-user': 'x', 'hoot:prefs': '{}', 'hoot:read': '["a"]' })).values), ['hoot:prefs'])
  const target = storage(); const set = target.setItem
  target.setItem = (k,v) => { if(k === 'hoot:read') throw new Error('vol'); set(k,v) }
  assert.throws(() => applyMove(target, { version: 1, values: { 'hoot:prefs': '{}', 'hoot:read': '[]' } }, 'https://hootnews.nl'))
  assert.equal(target.getItem('hoot:prefs'), null)
})
test('domein: oude API en nieuwe origin passeren; oude HTML verhuist en oude deel-URL verwijst door', async () => {
  assert.equal(legacy(new Request('https://hootnews.nl/api/edition', { method: 'POST' })), undefined)
  assert.equal(legacy(new Request('https://gethoot.app/lees/')), undefined)
  const html = legacy(new Request('https://hootnews.nl/'))
  assert.equal(html.status, 200); assert.equal(html.headers.get('referrer-policy'), 'origin')
  assert.ok((await html.text()).includes('/lees/move-out.js'))
  const card = legacy(new Request('https://hootnews.nl/deel/a'))
  assert.equal(card.status, 301); assert.equal(card.headers.get('location'), 'https://gethoot.app/deel/a')
  assert.equal(legacy(new Request('https://hootnews.nl/deel/a?bron=https%3A%2F%2Fnos.nl%2Fx')).headers.get('location'), 'https://gethoot.app/deel/a?bron=https%3A%2F%2Fnos.nl%2Fx')
})

test('verhuizen: echt opgeslagen thema en nieuwe accounteigenaar worden gerespecteerd', async () => {
  const payload = await decodeMove(await encodeMove(movePayload(storage({ 'hoot:theme': 'dark', 'hoot:owner': 'account-a', 'hoot:prefs': '{"topics":["politiek"],"palette":"inkt"}', 'hoot:read': '["a"]' }))))
  assert.equal(payload.values['hoot:theme'], 'dark')
  assert.deepEqual(JSON.parse(payload.values['hoot:prefs']), { palette: 'inkt', onboarded: true })
  assert.equal(payload.values['hoot:read'], undefined)
  const target = storage({ 'hoot:owner': 'account-b' })
  applyMove(target, payload, 'https://hootnews.nl')
  assert.equal(target.getItem('hoot:prefs'), null)
})

// Review 1.0.1, punt 2: één bezoek aan gethoot.app/lees schrijft al { onboarded: false, schema: 4, theme:'system', themeDark:'dark' }.
test('verhuizen: een standaardprofiel van een eerder bezoek verdringt de meegebrachte instellingen niet', () => {
  const target = storage(); migrate(target)
  assert.deepEqual(JSON.parse(target.getItem('hoot:prefs')), { onboarded: false, schema: 4, theme:'system', themeDark:'dark' })
  const old = storage({ 'hoot:prefs': JSON.stringify({ onboarded: true, schema: 3, enabled: ['nrc'], interests: ['cultuur'], layout: 'krant' }), 'hoot:read': '["a"]' })
  applyMove(target, movePayload(old), 'https://hootnews.nl')
  const prefs = JSON.parse(target.getItem('hoot:prefs'))
  assert.deepEqual(prefs, { onboarded: true, schema: 3, theme:'system', themeDark:'dark', enabled: ['nrc'], interests: ['cultuur'], layout: 'krant' })
  assert.equal(target.getItem('hoot:read'), '["a"]')
  assert.equal(migrate(target), true)
  assert.equal(migrate(target), false) // al op schema
  // Zonder vlag en schema (oudere opslag): geen welkom, en migrate.js zet ze daarna nog om.
  const t2 = storage(); migrate(t2)
  applyMove(t2, { version: 1, values: { 'hoot:prefs': '{"layout":"krant"}' } }, 'https://hootnews.nl')
  assert.deepEqual(JSON.parse(t2.getItem('hoot:prefs')), { onboarded: true, theme:'system', themeDark:'dark', layout: 'krant' })
  assert.equal(migrate(t2), true)
  // Een echt gebruikte nieuwe Hoot (welkom afgerond) blijft leidend.
  const t3 = storage({ 'hoot:prefs': '{"onboarded":true,"schema":3,"layout":"tijdlijn"}' })
  applyMove(t3, { version: 1, values: { 'hoot:prefs': '{"onboarded":true,"layout":"krant"}' } }, 'https://hootnews.nl')
  assert.equal(JSON.parse(t3.getItem('hoot:prefs')).layout, 'tijdlijn')
  // Volle opslag halverwege: ook de samengevoegde instellingen gaan terug naar wat er stond.
  const t4 = storage(); migrate(t4); const before = t4.getItem('hoot:prefs'); const set = t4.setItem
  t4.setItem = (k, v) => { if (k === 'hoot:read') throw new Error('vol'); set(k, v) }
  assert.throws(() => applyMove(t4, { version: 1, values: { 'hoot:prefs': '{"layout":"krant"}', 'hoot:read': '[]' } }, 'https://hootnews.nl'))
  assert.equal(t4.getItem('hoot:prefs'), before)
})

// Review 1.0.1, punt 9.
test('verhuizen: losse Bluesky-bronnen gaan mee en diepe routes blijven staan', async () => {
  assert.ok(MOVE_KEYS.includes('hoot:social-sources'))
  const old = storage({ 'hoot:social-sources': '[{"handle":"a.bsky.social"}]' })
  const payload = await decodeMove(await encodeMove(movePayload(old, '#/stroom/sport')))
  assert.equal(payload.values['hoot:social-sources'], '[{"handle":"a.bsky.social"}]')
  assert.equal(payload.route, '#/stroom/sport')
  assert.equal(movePayload(old, '#/stroom/sport?bron=nrc').route, '#/stroom/sport?bron=nrc')
  assert.equal(movePayload(old, '#/onbekend').route, '#/editie')
  assert.equal(movePayload(old, '#/stroom/<script>').route, '#/editie')
  assert.equal(movePayload(old, '#/stroomx').route, '#/editie')
})

// Een nagebootste browser voor receiveMove (punt 3 en 5).
async function inBrowser({ href, referrer = 'https://hootnews.nl/' }, fn) {
  const saved = {}
  for (const k of ['location', 'history', 'document', 'localStorage']) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k)
  const url = new URL(href)
  const loc = { get pathname() { return url.pathname }, get search() { return url.search }, get hash() { return url.hash }, get href() { return url.href } }
  const ls = storage()
  const define = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true })
  define('location', loc)
  define('history', { replaceState: (_s, _t, next) => { const n = new URL(next, url); url.pathname = n.pathname; url.search = n.search; url.hash = n.hash } })
  define('document', { referrer })
  define('localStorage', ls)
  try { return await fn(url, ls) } finally {
    for (const [k, d] of Object.entries(saved)) d ? Object.defineProperty(globalThis, k, d) : delete globalThis[k]
  }
}

test('verhuizen met gegevens: de uitnodigingscode blijft in de adresbalk staan', async () => {
  const hash = await encodeMove(movePayload(storage({ 'hoot:prefs': '{"layout":"krant"}' }), '#/stroom'))
  await inBrowser({ href: 'https://gethoot.app/lees/?uitnodiging=abc123#verhuis=' + hash }, async (url, ls) => {
    await receiveMove()
    assert.equal(url.search, '?uitnodiging=abc123')
    assert.equal(url.hash, '#/stroom')
    assert.equal(ls.getItem('hoot:prefs'), '{"layout":"krant"}')
  })
})

test('mislukte verhuizing: fragment weg, uitnodiging blijft, geen lus naar hootnews.nl', async () => {
  const hash = await encodeMove(movePayload(storage({ 'hoot:prefs': '{}' })))
  // Lege verwijzer (bijv. privacy-instelling): ongeldig, maar de app moet gewoon kunnen starten.
  await inBrowser({ href: 'https://gethoot.app/lees/?uitnodiging=x#verhuis=' + hash, referrer: '' }, async (url) => {
    await assert.rejects(receiveMove())
    dropMoveFragment()
    assert.equal(url.hash, '#/editie')
    assert.equal(url.search, '?uitnodiging=x')
  })
  await inBrowser({ href: 'https://gethoot.app/lees/#verhuis=kapot!' }, async (url) => {
    await assert.rejects(receiveMove())
    dropMoveFragment()
    assert.equal(url.hash, '#/editie')
  })
  // Gewone route blijft onaangeroerd.
  await inBrowser({ href: 'https://gethoot.app/lees/#/stroom' }, async (url) => { dropMoveFragment(); assert.equal(url.hash, '#/stroom') })
  // main.jsx vangt elke fout van receiveMove af en start de app; geen foutlink terug naar de oude origin.
  const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
  assert.match(main, /try \{\s*await receiveMove\(\)\s*\} catch/)
  assert.match(main, /dropMoveFragment\(\)/)
  assert.ok(!main.includes("href = 'https://hootnews.nl/'"))
})

test('oude HTML: foutmelding biedt Hoot zonder overzetten', async () => {
  const body = await legacy(new Request('https://hootnews.nl/')).text()
  assert.match(body, /<a href="https:\/\/gethoot\.app\/lees\/">Open Hoot zonder overzetten<\/a>/)
})
