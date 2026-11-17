// De Telegraaf in de Selectie Politiek (keuring 17 november 2026): alleen de rubriek Politiek, alleen gratis stukken, geen
// liveblog en geen teken Abonnement. Vaste feed: tests/fixtures/telegraaf-feed.xml (zes stukken naar het voorbeeld van de
// echte feed van 17 november: links met de rubriek vooraan, <premium> per stuk).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loadSource, parseFeed, premiumOf } from '../netlify/lib/rss.mjs'
import { VAK_SOURCES, isReading, fieldOf, composeVak } from '../netlify/lib/vak.mjs'

const xml = readFileSync(new URL('./fixtures/telegraaf-feed.xml', import.meta.url), 'utf8')
const tg = VAK_SOURCES.find((s) => s.id === 'vak:telegraaf')
const load = (src) => loadSource(src, Promise.resolve({}), { limit: Infinity, read: () => parseFeed(xml) })
const doorgelaten = async () => (await load(tg)).items.filter((i) => isReading(i, tg) && fieldOf(i, tg))

test('de feedlezer geeft <premium>true</premium> per stuk door, en alleen dat', async () => {
  const { items } = await load({ ...tg, keep: null })
  assert.equal(items.length, 6)
  assert.deepEqual(items.filter((i) => i.premium).map((i) => i.url.split('/').at(-1)), ['100000002.html'])
  // false en geen veld: geen kenmerk op het stuk (andere feeds veranderen niet)
  assert.ok(items.filter((i) => !i.premium).every((i) => !('premium' in i)))
  assert.equal(premiumOf({ premium: ' TRUE ' }), true)
  assert.equal(premiumOf({ premium: 'false' }), false)
  assert.equal(premiumOf({}), false)
})

test('alleen de rubriek Politiek, gratis en geen liveblog komt door', async () => {
  const { items } = await load(tg)
  // keep: de link begint met de rubriek; binnenland, video en podcast vallen af
  assert.deepEqual(items.map((i) => i.url.split('/')[3]), ['politiek', 'politiek', 'politiek'])
  const door = await doorgelaten()
  assert.deepEqual(door.map((i) => i.title), ['Kabinet wil asielwet nog voor de zomer door de Tweede Kamer'])
})

test('een premium stuk van De Telegraaf valt in composeVak weg, het gratis stuk heeft geen teken Abonnement', () => {
  const now = Date.parse('2026-11-24T10:00:00Z') // de bundel van de week ervoor
  const at = '2026-11-17T09:00:00.000Z'
  const it = (id, title, premium) => ({ id, source: 'vak:telegraaf', sourceName: 'De Telegraaf', title, summary: 'Een intro over het kabinet en de Tweede Kamer.', url: 'https://www.telegraaf.nl/politiek/' + id + '/1.html', publishedAt: at, ...(premium ? { premium: true } : {}) })
  const pool = [it('gratis', 'Kabinet wil asielwet nog voor de zomer door de Tweede Kamer'), it('betaald', 'Wouter de Winther over de persconferentie van het kabinet', true)]
  const pol = composeVak(pool, { now, sources: [tg] }).fields.find((f) => f.id === 'politiek')
  const all = [...pol.top, ...pol.more]
  assert.deepEqual(all.map((e) => e.id), ['gratis'])
  assert.equal(all[0].paid, false)
  // Een andere bron zonder alleenGratis houdt zijn premium stukken (de regel is per bron)
  const ander = { ...tg, id: 'vak:ander', alleenGratis: false }
  assert.ok(isReading({ title: 'Kabinet valt', premium: true }, ander))
  assert.ok(!isReading({ title: 'Kabinet valt', premium: true }, tg))
})

test('de bron: rubriek Politiek, alleen gratis, niet betaald', () => {
  assert.equal(tg.keep, 'telegraaf.nl/politiek/')
  assert.equal(tg.alleenGratis, true)
  assert.ok(!tg.paid, 'geen teken Abonnement')
  assert.ok(!tg.filter, 'de rubriek is het filter')
  assert.deepEqual(tg.fields, ['politiek'])
})

test('LIVE in hoofdletters ergens in de kop is een liveblog', () => {
  assert.ok(!isReading({ title: 'Kabinetscrisis LIVE: de laatste stand' }))
  assert.ok(!isReading({ title: 'LIVE | Bontenbal praat verder' }))
  assert.ok(isReading({ title: 'Waarom Live Nation de kaartverkoop beheerst' }))
})
