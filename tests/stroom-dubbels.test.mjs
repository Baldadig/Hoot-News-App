import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { withoutRepeats, articleId, isReadItem } from '../shared/stroom.mjs'
import { freshCount } from '../src/lib/fresh.js'

// Echte dubbelen uit de live feed van 4 november: het Volkskrant-stuk over De Miguel stond vijf keer
// met een andere kop (zelfde artikel-id, andere slug), en twee Atlantic-stukken delen een intro maar
// zijn twee stukken. tests/fixtures/stroom-dubbels.json wordt ook door iOS gelezen (StroomDubbelsTests).
const fx = JSON.parse(readFileSync(new URL('./fixtures/stroom-dubbels.json', import.meta.url), 'utf8'))

test('elk stuk staat één keer, met de nieuwste kop', () => {
  const out = withoutRepeats(fx.items)
  assert.deepEqual(out.map((i) => ({ id: i.id, formerIds: [...(i.formerIds || [])].sort() })), fx.verwacht)
  assert.ok(out.length < fx.items.length)
})

test('het De Miguel-stuk: de laatst geleverde kop blijft', () => {
  const out = withoutRepeats(fx.items)
  const miguel = out.find((i) => /Miguel/.test(i.title))
  assert.equal(miguel.id, 'kuy74j')
  assert.equal(miguel.formerIds.length, 4)
})

test('twee Atlantic-stukken met dezelfde intro, uren uit elkaar, blijven twee stukken', () => {
  const ids = withoutRepeats(fx.items).map((i) => i.id)
  assert.ok(ids.includes('cv071w') && ids.includes('13nggrq'))
})

test('de volgorde blijft nieuwste eerst en de invoer wordt niet aangepast', () => {
  const before = JSON.stringify(fx.items)
  const out = withoutRepeats(fx.items)
  assert.equal(JSON.stringify(fx.items), before)
  const times = out.map((i) => i.publishedAt)
  assert.deepEqual(times, [...times].sort().reverse())
})

test('zelfde bron met een identieke intro binnen enkele uren is één stuk; zonder tijd of kort niet', () => {
  const intro = 'Een lange, identieke inleiding die ruim boven de zestig tekens uitkomt en dus telt.'
  const a = { id: 'a', source: 'nrc', kind: 'article', title: 'Eerste kop', summary: intro, url: 'https://nrc.nl/a', publishedAt: '2026-11-04T10:00:00Z' }
  const b = { ...a, id: 'b', title: 'Andere kop', url: 'https://nrc.nl/b', publishedAt: '2026-11-04T09:00:00Z' }
  assert.equal(withoutRepeats([a, b]).length, 1)
  assert.equal(withoutRepeats([a, { ...b, source: 'vk' }]).length, 2)
  assert.equal(withoutRepeats([a, { ...b, publishedAt: '2026-11-03T20:00:00Z' }]).length, 2)
  assert.equal(withoutRepeats([{ ...a, summary: 'Kort.' }, { ...b, summary: 'Kort.' }]).length, 2)
  assert.equal(withoutRepeats([{ ...a, kind: 'post' }, { ...b, kind: 'post' }]).length, 2)
})

test('Volkskrant-id uit de link; zonder id geen koppeling', () => {
  assert.equal(articleId('https://www.volkskrant.nl/sport/slug~bf2ff83e/?utm=x'), 'bf2ff83e')
  assert.equal(articleId('https://www.volkskrant.nl/sport/slug~bf2ff83e'), 'bf2ff83e')
  assert.equal(articleId('https://nos.nl/l/2637948'), null)
})

test('gelezen en Bewaard volgen het blijvende bericht', () => {
  const win = withoutRepeats(fx.items).find((i) => i.id === 'kuy74j')
  assert.equal(isReadItem(new Set(), win), false)
  assert.equal(isReadItem(new Set(['p2eoju']), win), true) // de eerste kop was al gelezen
  assert.equal(isReadItem(new Set(['kuy74j']), win), true)
  assert.equal(isReadItem(new Set(['cv071w']), win), false)
})

test('een stuk dat je al had, met een nieuwe kop, telt niet als nieuw', () => {
  const had = fx.items.filter((i) => i.id === 'p2eoju')
  assert.equal(freshCount(had, withoutRepeats(fx.items.filter((i) => /bf2ff83e/.test(i.url)))), 0)
  assert.equal(freshCount([], withoutRepeats(fx.items.filter((i) => /bf2ff83e/.test(i.url)))), 1)
})
