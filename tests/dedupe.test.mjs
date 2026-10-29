import { test } from 'node:test'
import assert from 'node:assert/strict'
import { withoutCopies, titleKey } from '../shared/dedupe.mjs'
import { streamItems, storyPool, editionPool } from '../netlify/lib/build.mjs'

// Twee zusterkranten (AD en Tubantia) brengen drie dezelfde stukken, elk met een eigen link;
// daarnaast heeft elke krant iets van zichzelf.
const at = (min) => new Date(Date.UTC(2026, 9, 29, 18, min)).toISOString()
const art = (source, slug, title, min, extra = {}) => ({ id: `${source}-${slug}`, kind: 'article', source, title, url: `https://www.${source}.nl/${slug}`, publishedAt: at(min), ...extra })
const SHARED = ['Kabinet valt over stikstof', 'Storm legt treinverkeer plat', 'Ajax wint van PSV']
const sisters = () => [
  ...SHARED.map((t, i) => art('ad', 'gedeeld' + i, t, 10 + i)),
  // Tubantia zet het een minuut later online: vroeger won dan Tubantia, of juist het AD.
  ...SHARED.map((t, i) => art('tubantia', 'gedeeld' + i, t, 11 + i)),
  art('ad', 'eigen', 'Rotterdamse haven breidt uit', 5),
  art('tubantia', 'eigen', 'Enschede krijgt nieuw station', 6),
]

test('de server ontdubbelt alleen binnen één bron: elke zusterkrant houdt al zijn berichten', () => {
  const items = streamItems(sisters())
  const of = (src) => items.filter((i) => i.source === src)
  assert.equal(of('ad').length, 4)
  assert.equal(of('tubantia').length, 4)
  // Nieuwste eerst.
  assert.deepEqual(items.map((i) => i.publishedAt), [...items.map((i) => i.publishedAt)].sort().reverse())
})

test('binnen één bron blijft een dubbel stuk weg, en een bericht zonder link ook', () => {
  const items = streamItems([
    art('ad', 'a', 'Kabinet valt over stikstof', 10),
    art('ad', 'b', 'Kabinet valt over stikstof!', 9), // zelfde kop, andere link
    art('ad', 'a', 'Andere kop, zelfde link', 8),
    { ...art('ad', 'c', 'Zonder link', 7), url: '' },
  ])
  assert.deepEqual(items.map((i) => i.id), ['ad-a'])
})

test('de app ontdubbelt over de bronnen die je volgt; één bron apart toont alles', () => {
  const items = streamItems(sisters())
  // Je volgt beide: elk stuk één keer (het nieuwste exemplaar), plus wat elk van zichzelf heeft.
  const both = withoutCopies(items)
  assert.equal(both.length, 5)
  assert.equal(new Set(both.map((i) => titleKey(i.title))).size, 5)
  // Je volgt alleen Tubantia (of kijkt naar Tubantia alleen): alle vier.
  assert.equal(withoutCopies(items.filter((i) => i.source === 'tubantia')).length, 4)
  assert.equal(withoutCopies(items.filter((i) => i.source === 'ad')).length, 4)
})

test('verhalen tellen een gedeeld stuk één keer, en het exemplaar uit het verhaal blijft in de editie', () => {
  // Het AD en het Nederlands Dagblad (beide landelijk) brengen hetzelfde stuk; Tubantia (regio)
  // doet niet mee aan verhalen.
  const items = streamItems([
    art('nd', 'x', 'Kabinet valt over stikstof', 12),
    art('ad', 'x', 'Kabinet valt over stikstof', 10),
    art('tubantia', 'x', 'Kabinet valt over stikstof', 13),
    art('ad', 'y', 'Storm legt treinverkeer plat', 9),
  ])
  const pool = storyPool(items)
  assert.deepEqual(pool.map((i) => i.id), ['nd-x', 'ad-y'])
  // De editie krijgt elk stuk één keer; het exemplaar van Tubantia (nieuwer, maar regio) wijkt
  // voor het exemplaar dat in het verhaal zit.
  const ids = editionPool(items, pool).map((i) => i.id)
  assert.ok(ids.includes('nd-x'))
  assert.ok(!ids.includes('tubantia-x'))
  assert.ok(!ids.includes('ad-x'))
  assert.ok(ids.includes('ad-y'))
})

test('kop-sleutel: zonder hoofdletters en leestekens', () => {
  assert.equal(titleKey('Ajax wint van PSV!'), titleKey('ajax  wint van psv'))
  assert.equal(titleKey('Café’s sluiten'), 'café s sluiten')
  assert.equal(titleKey(''), '')
})
