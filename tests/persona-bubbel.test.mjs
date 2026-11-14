// Persona's 14 november, punt 5: Buiten je bubbel per lezer. In vier van de zes dagdelen kregen alle zes lezers hetzelfde
// stuk, en soms lag het midden in hun bubbel (box 3 voor wie politiek en NOS volgt, Rijnmond voor wie Rijnmond volgt, de
// Visserbrug in Groningen voor wie het Dagblad van het Noorden leest, VRT voor wie VRT volgt). Nu: buiten je eigen
// bronnen, gekozen rubrieken, interesses en regio, in je leestaal, gratis, en per lezer gekozen met zijn vaste zaad.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { composePersonal } from '../src/lib/personal.js'
import { regionWordsOf, readerRegions, inRegion } from '../shared/lezer.mjs'

const P = JSON.parse(readFileSync(new URL('../../Hoot-design/personas-2026-11-14/personas.json', import.meta.url), 'utf8')).personas
const FEEDS = ['feed-2026-11-05-ochtend', 'live-feed-2026-11-07', 'live-feed-2026-11-09-middag', 'live-feed-2026-11-11-ochtend']
const load = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}.json.gz`, import.meta.url))).toString('utf8'))
const compose = (feed, p) => composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(p.followed), interests: p.welkom.interests, topics: p.prefs.topics || [], now: Date.parse(feed.edition.builtAt), builtAt: feed.edition.builtAt })

test('je regio komt uit de omschrijving van je regionale bronnen', () => {
  assert.deepEqual(regionWordsOf({ cat: 'regio', about: 'Groningen en Drenthe.' }), ['groningen', 'drenthe'])
  assert.deepEqual(regionWordsOf({ cat: 'regio', about: 'Den Haag, Leiden en omgeving, de regionale omroep.' }), ['den haag', 'leiden'])
  assert.deepEqual(regionWordsOf({ cat: 'regio', about: 'Rotterdam en omgeving, de regionale omroep.' }), ['rotterdam'])
  assert.deepEqual(regionWordsOf({ cat: 'nl', about: 'Het publieke nieuws.' }), [])
  const sources = [{ id: 'dvhn', cat: 'regio', about: 'Groningen en Drenthe.' }, { id: 'rtvnoord', cat: 'regio', about: 'Groningen, de regionale omroep.' }, { id: 'rijnmond', cat: 'regio', about: 'Rotterdam en omgeving, de regionale omroep.' }]
  const regions = readerRegions({ followed: new Set(['dvhn']), sources })
  const of = (id) => sources.find((s) => s.id === id)
  assert.ok(inRegion({ source: 'rtvnoord', title: 'Visserbrug in Stad aangevaren' }, regions, of), 'een regionale bron uit dezelfde plaats')
  assert.ok(inRegion({ source: 'nos', title: 'Brand in centrum van Groningen' }, regions, of), 'je plaats in de kop')
  assert.ok(!inRegion({ source: 'rijnmond', title: 'Achtervolging door Zuid-Holland' }, regions, of), 'een andere regio')
  assert.ok(!inRegion({ source: 'nos', title: 'Kabinet valt' }, new Set(), of), 'zonder regionale bron geen regio')
})

for (const f of FEEDS) {
  test(`${f}: Buiten je bubbel komt niet uit je eigen bronnen of je regio en is gratis`, () => {
    const feed = load(f)
    const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
    const src = new Map(feed.sources.map((s) => [s.id, s]))
    for (const p of P) {
      const ed = compose(feed, p)
      const b = ed?.entries.find((e) => e.desk === 'bubbel')
      if (!b) continue
      const head = byId.get(b.leadId || b.id)
      assert.ok(!p.followed.includes(head?.source), `${p.id}: "${head?.title}" komt van een bron die je volgt`)
      assert.ok(!src.get(head?.source)?.paid, `${p.id}: "${head?.title}" is betaald`)
      assert.ok(!inRegion(head, readerRegions({ followed: new Set(p.followed), sources: feed.sources }), (s) => src.get(s)), `${p.id}: "${head?.title}" ligt in je regio`)
    }
  })
}

test('niet voor iedereen hetzelfde stuk, wel elke keer hetzelfde voor dezelfde lezer', () => {
  // De bewaarde feeds hebben nog de zes kandidaten van vroeger, waarvan veel betaald, en bevatten bijna alleen bronnen die
  // een van de zes volgt. Daarom een proefbron die niemand volgt (gratis, Nederlands nieuws) met acht verse stukken als
  // kandidaten: dezelfde stukken voor iedereen, en toch kiest niet iedereen hetzelfde.
  const feed = load('live-feed-2026-11-11-ochtend')
  const now = Date.parse(feed.edition.builtAt)
  const placed = new Set(feed.edition.entries.flatMap((e) => [e.id, e.leadId, ...(e.itemIds || [])]))
  const copies = feed.items
    .filter((i) => i.kind === 'article' && i.source === 'nos' && !placed.has(i.id) && now - Date.parse(i.publishedAt) < 12 * 36e5 && now >= Date.parse(i.publishedAt) && !/sport/.test(i.url || ''))
    .slice(0, 8)
    .map((i) => ({ ...i, id: `proef-${i.id}`, source: 'proefbron', sourceName: 'Proefbron', storyId: null, topics: [], mainTopics: [] }))
  assert.ok(copies.length >= 4, `kandidaten: ${copies.length}`)
  const sources = [...feed.sources, { id: 'proefbron', name: 'Proefbron', cat: 'nl', lang: 'nl', paid: false, about: 'Proef.' }]
  const wide = { ...feed, sources, items: [...feed.items, ...copies], edition: { ...feed.edition, bubble: [...(feed.edition.bubble || []), ...copies.map((i) => ({ id: i.id, storyId: null, terms: [{ term: 'proef', via: 'google' }] }))] } }
  const picks = P.map((p) => compose(wide, p)?.entries.find((e) => e.desk === 'bubbel')).filter(Boolean).map((b) => b.leadId || b.id)
  assert.ok(picks.length >= 4, `lezers met een bubbel: ${picks.length}`)
  assert.ok(new Set(picks).size >= 3, `te vaak hetzelfde stuk: ${picks.join(', ')}`)
  for (const p of P) {
    const a = compose(wide, p)?.entries.find((e) => e.desk === 'bubbel')
    const b = compose(wide, p)?.entries.find((e) => e.desk === 'bubbel')
    assert.equal(a?.leadId || a?.id, b?.leadId || b?.id, `${p.id}: zelfde invoer, zelfde stuk`)
  }
})

test('wie VRT volgt, krijgt geen VRT-stuk als Buiten je bubbel (11 november ochtend)', () => {
  const feed = load('live-feed-2026-11-11-ochtend')
  const lotte = P.find((p) => p.id === 'lotte')
  const b = compose(feed, lotte).entries.find((e) => e.desk === 'bubbel')
  const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
  assert.notEqual(byId.get(b?.leadId || b?.id)?.source, 'vrt')
})
