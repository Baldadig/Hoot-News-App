// De teller per Selectie-onderwerp (Selectie-review punt 8; besluit 15 november): gebouwd, maar UIT tot Alex de zin voor
// het privacybeleid goedkeurt. Vlag en zin gaan samen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseTel } from '../shared/tel.mjs'
import { ONDERWERP_TELLER, ONDERWERP_EVENTS, ONDERWERP_ZIN, onderwerpEvent, nieuwGekozen, onderwerpExtra } from '../shared/tel-onderwerp.mjs'
import { VAK_FIELD_IDS } from '../shared/vak.mjs'
import { handle } from '../netlify/functions/tel.mjs'
import { shapeDay } from '../netlify/lib/tel.mjs'
import { telGekozen } from '../src/lib/tel.js'

const NOW = new Date('2026-11-15T10:00:00Z')
const D = '2026-11-15-ochtend'
const post = (body) => new Request('https://gethoot.app/api/tel', { method: 'POST', body: JSON.stringify(body) })

test('de teller staat uit, en het privacybeleid noemt hem nog niet', () => {
  assert.equal(ONDERWERP_TELLER, false)
  const privacy = readFileSync(new URL('../src/views/Privacy.jsx', import.meta.url), 'utf8')
  if (ONDERWERP_TELLER) assert.ok(privacy.includes(ONDERWERP_ZIN), 'de teller staat aan, maar het beleid zegt het nog niet')
  else assert.ok(!privacy.includes(ONDERWERP_ZIN) && !/elk onderwerp wordt gekozen/.test(privacy), 'het beleid noemt de teller, terwijl hij uit staat')
  // De voorgestelde zin staat ook in de besluiten, voor Alex.
  assert.ok(readFileSync(new URL('../BESLUITEN-15NOV.md', import.meta.url), 'utf8').includes(ONDERWERP_ZIN))
})

test('een onderwerp-gebeurtenis telt alleen met de vlag aan, en alleen voor bestaande onderwerpen', () => {
  assert.equal(ONDERWERP_EVENTS.length, VAK_FIELD_IDS.length)
  assert.equal(onderwerpEvent('ux'), 'onderwerp:ux')
  assert.equal(onderwerpEvent('onzin'), null)
  assert.equal(parseTel({ e: 'onderwerp:ux', d: D, p: 'web' }, NOW), null, 'vlag uit: genegeerd')
  assert.deepEqual(onderwerpExtra(false), [])
  assert.deepEqual(parseTel({ e: 'onderwerp:ux', d: D, p: 'web' }, NOW, { extra: onderwerpExtra(true) }), { e: 'onderwerp:ux', p: 'web', date: '2026-11-15', slot: 'ochtend', v: null, n: 1 })
  assert.equal(parseTel({ e: 'onderwerp:onzin', d: D, p: 'web' }, NOW, { extra: onderwerpExtra(true) }), null)
  // Geen id, tijdstip of toestel: dezelfde strikte vorm als de rest.
  assert.equal(parseTel({ e: 'onderwerp:ux', d: D, p: 'web', id: 'x' }, NOW, { extra: onderwerpExtra(true) }), null)
})

test('alleen wat nieuw gekozen is telt; weghalen telt niet', () => {
  assert.deepEqual(nieuwGekozen(['ux'], ['ux', 'ai']), ['onderwerp:ai'])
  assert.deepEqual(nieuwGekozen(['ux', 'ai'], ['ux']), [])
  assert.deepEqual(nieuwGekozen([], ['ai', 'onzin']), ['onderwerp:ai'])
})

test('de server: vlag uit negeert, vlag aan telt; het dagoverzicht toont de onderwerpen', async () => {
  const seen = []
  const write = async (p) => seen.push(p)
  await handle(post({ e: 'onderwerp:ux', d: D, p: 'web' }), { now: NOW, write })
  assert.equal(seen.length, 0)
  await handle(post({ e: 'onderwerp:ux', d: D, p: 'web' }), { now: NOW, write, onderwerp: true })
  assert.equal(seen.length, 1)
  const day = shapeDay('2026-11-15', { c: { 'onderwerp:ux|web|ochtend': 3, 'onderwerp:ux|ios|middag': 1 } })
  assert.equal(day.onderwerpen.ux, 4)
  assert.equal(day.onderwerpen.ai, 0)
})

test('de web-client stuurt niets met de vlag uit', () => {
  const nav = { sendBeacon: () => assert.fail('niets sturen') }
  assert.deepEqual(telGekozen([], ['ux'], { nav, prod: true }), [])
  // Met de vlag aan: één beacon per nieuw onderwerp.
  const sent = []
  const navAan = { sendBeacon: (_u, b) => sent.push(b) || true }
  assert.deepEqual(telGekozen(['ai'], ['ai', 'ux', 'dev'], { nav: navAan, prod: true, onderwerp: true, dagdeel: D, storage: null }), ['onderwerp:ux', 'onderwerp:dev'])
  assert.equal(sent.length, 2)
})
