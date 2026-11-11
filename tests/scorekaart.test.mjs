// Frisse ogen · 2: het archief per dagdeel en de dagelijkse scorekaart met de vijf KPI's uit het rapport van 11 november.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { scoreEdition, crossLanguageSame, weakTop, shownItems, editionItemIds, summarize, scoreLine, SCORECARD_KEY, ARCHIVE_KEY, ARCHIVE_FEED_KEY } from '../netlify/lib/scorekaart.mjs'
import { auditRows, earlierSlotIds, shownSlotIds, generalEdition } from '../netlify/lib/build.mjs'
import { scorecard, asText } from '../netlify/functions/scorekaart.mjs'
import { writeArchive, readArchive } from '../netlify/lib/kv.mjs'

const load = (name) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${name}`, import.meta.url))).toString('utf8'))
const rowOf = (feed) => {
  const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
  return scoreEdition({ edition: feed.edition, byId, storyById: new Map(feed.stories.map((st) => [st.id, st])), stories: feed.stories, sources: feed.sources })
}

test('dezelfde gebeurtenis in twee talen: de spion in het VK wel, de aanklacht om Fairford niet', () => {
  const nl = { title: 'Hooggeplaatste Amerikaanse militair in VK opgepakt op verdenking van spionage voor Rusland' }
  assert.equal(crossLanguageSame(nl, { title: 'UK arrests US soldier suspected of spying for Russia' }), true)
  assert.equal(crossLanguageSame(nl, { title: 'US charges 3 men over alleged Iranian-backed plot at UK Fairford air base' }), false)
  assert.equal(crossLanguageSame({ title: 'Zes doden bij schietpartij in Krakau' }, { title: 'Briton among six killed in Krakow shooting' }), true)
})

test('bovenaan: opinie, beschouwing, portret, bekend persoon en curiosum tellen als zwak', () => {
  assert.equal(weakTop({ title: 'Nvidia-topman Jensen Huang zat midden in de American dream, totdat hij viel voor een vermeende Chinese spion', source: 'volkskrant' }), 'portret')
  assert.equal(weakTop({ title: 'Trump Tried to Undermine the Nation’s Elections. It Didn’t Work.', source: 'nyt' }), 'beschouwing')
  assert.equal(weakTop({ title: 'Kabinet valt over Belastingplan', source: 'nos' }), null)
})

test('de scorekaart van 11 november ochtend (live): de vijf KPI’s zoals het rapport ze telde', () => {
  const r = rowOf(load('live-feed-2026-11-11-ochtend.json.gz'))
  assert.equal(r.id, '2026-11-11-ochtend')
  assert.deepEqual(r.dubbel.paren, ['06+08']) // de spion, NRC en Le Monde
  assert.deepEqual(r.bovenaan.zwak.map((z) => `${z.plek} ${z.reden}`), ['01 portret', '03 bekend persoon']) // Huang, Markle
  assert.equal(r.gratis.betaald, 4)
  assert.ok(r.gratis.alternatief.some((g) => g.plek === '06' && g.gratis === 'RTL Nieuws'))
  assert.equal(r.einde.ok, false)
  assert.equal(r.einde.reden, 'ouder-dan-24-uur') // het VRT-liveblog van 23 oktober
  assert.equal(r.nl.top5.length, 5)
  assert.match(scoreLine(r), /^\| 2026-11-11-ochtend \| redacteur-2026-11-07-taalregel \| ✗ 06\+08 \| ✗ 01 portret, 03 bekend persoon/)
})

test('een lege bubbelplek is een rustig einde', () => {
  const feed = load('live-feed-2026-11-11-ochtend.json.gz')
  const r = rowOf({ ...feed, edition: { ...feed.edition, entries: feed.edition.entries.filter((e) => e.desk !== 'bubbel') } })
  assert.deepEqual([r.einde.ok, r.einde.keuze], [true, 'leeg'])
})

test('Naast je bubbel in de algemene Editie is geen rustig einde: die plek had leeg moeten blijven (besluit 11 november)', () => {
  const feed = load('live-feed-2026-11-11-ochtend.json.gz')
  const regular = feed.edition.entries.filter((e) => e.desk !== 'bubbel')
  const lead = feed.items.find((i) => i.source === 'nos' && i.kind === 'article')
  const edition = { ...feed.edition, entries: [...regular, { kind: 'item', id: lead.id, desk: 'bubbel', near: 'wereld' }], items: [...feed.edition.items, { ...lead, publishedAt: feed.edition.builtAt }] }
  const r = rowOf({ ...feed, edition })
  assert.equal(r.einde.keuze, 'naast')
  assert.equal(r.einde.ok, false)
  assert.match(r.einde.reden, /^naast-in-plaats-van-leeg/)
  assert.equal(summarize([r]).naast, 1)
})

test('samenvatting in de vorm van het rapport', () => {
  const r = rowOf(load('live-feed-2026-11-11-ochtend.json.gz'))
  const s = summarize([r, r])
  assert.deepEqual([s.dagdelen, s.dubbel, s.bovenaan, s.einde, s.betaald, s.plekken], [2, 2, 0, 0, 8, 20])
})

test('getoond vandaag: de plekken van een Editie met hun verhaal; de dagdelen van vandaag die al waren', () => {
  const ed = { entries: [{ kind: 'story', id: 's1', leadId: 'a' }, { kind: 'item', id: 'b', desk: 'bubbel' }], items: [{ id: 'a', title: 'A', publishedAt: 'x' }, { id: 'b', title: 'B', publishedAt: 'y', storyId: 's9' }] }
  assert.deepEqual(shownItems(ed).map((i) => [i.id, i.storyId]), [['a', 's1'], ['b', 's9']])
  assert.deepEqual([...editionItemIds(ed, new Map([['s1', { itemIds: ['a', 'c'] }]]))].sort(), ['a', 'b', 'c'])
  assert.deepEqual(earlierSlotIds({ slot: 'ochtend', date: '2026-11-11' }), [])
  assert.deepEqual(earlierSlotIds({ slot: 'avond', date: '2026-11-11' }), ['2026-11-11-ochtend', '2026-11-11-middag'])
  // Al eerder getoond (Buiten je bubbel): ook de vorige Editie, voor de ochtend die van gisteravond.
  assert.deepEqual(shownSlotIds({ slot: 'ochtend', date: '2026-11-11' }), ['2026-11-10-avond'])
  assert.deepEqual(shownSlotIds({ slot: 'middag', date: '2026-11-11' }), ['2026-11-11-ochtend'])
  assert.deepEqual(shownSlotIds({ slot: 'avond', date: '2026-11-11' }), ['2026-11-11-ochtend', '2026-11-11-middag'])
})

test('archief: de kandidaten met hun afvalreden, zonder ruis, zwaarste eerst', () => {
  const feed = load('live-feed-2026-11-11-ochtend.json.gz')
  const now = Date.parse(feed.edition.builtAt)
  const pool = [...new Map([...feed.related, ...feed.items].map((i) => [i.id, i])).values()].filter((i) => i.kind === 'article' && Date.parse(i.publishedAt) <= now)
  const audit = []
  const entries = generalEdition({ stories: feed.stories.filter((st) => st.itemIds.length > 1), pool, now, audit })
  assert.ok(entries.length > 0 && audit.length > 0)
  const rows = auditRows(audit, { stories: feed.stories, byId: new Map(pool.map((i) => [i.id, i])) })
  assert.ok(rows.length > 0 && rows.length <= 120)
  assert.ok(rows.every((r) => r.reden && !['via-verhaal', 'vorm-of-bron-niet-toegelaten'].includes(r.reden)))
  assert.ok(rows.some((r) => r.reden === 'gekozen-in-route'))
  assert.ok(rows.every((r, k) => k === 0 || (rows[k - 1].uitgevers || 0) >= (r.uitgevers || 0)))
})

test('de sleutels van het archief en de scorekaart', () => {
  assert.equal(ARCHIVE_KEY('2026-11-11-ochtend'), 'archief-2026-11-11-ochtend')
  assert.equal(ARCHIVE_FEED_KEY('2026-11-11-ochtend'), 'archief-feed-2026-11-11-ochtend')
  assert.equal(SCORECARD_KEY('2026-11-11'), 'scorekaart-2026-11-11')
})

test('de feed in het archief: gecomprimeerd bewaard en terug te lezen', async () => {
  const value = { edition: { id: 'x', entries: [] }, items: [{ id: 'a', title: 'Één kop' }] }
  await writeArchive('archief-feed-test', value, { builtAt: '2026-11-11T05:00:00Z' })
  assert.deepEqual(await readArchive('archief-feed-test'), value)
  assert.equal(await readArchive('archief-feed-bestaat-niet'), null)
})

test('/api/scorekaart: de dag en de dag ervoor naast elkaar; tekst als tabel', async () => {
  const r = rowOf(load('live-feed-2026-11-11-ochtend.json.gz'))
  const store = new Map([[SCORECARD_KEY('2026-11-11'), { dag: '2026-11-11', rijen: { ochtend: r } }], [SCORECARD_KEY('2026-11-10'), { dag: '2026-11-10', rijen: { middag: { ...r, id: '2026-11-10-middag' }, ochtend: { ...r, id: '2026-11-10-ochtend' } } }]])
  const card = await scorecard('2026-11-11', async (k) => store.get(k) || null)
  assert.equal(card.rijen.length, 1)
  assert.deepEqual(card.vorige.rijen.map((x) => x.id), ['2026-11-10-ochtend', '2026-11-10-middag']) // in de volgorde van de dag
  assert.equal(card.samenvatting.dagdelen, 1)
  const text = asText(card)
  assert.match(text, /## Scorekaart 2026-11-11/)
  assert.match(text, /## De dag ervoor, 2026-11-10/)
  const empty = await scorecard('2026-01-01', async () => null)
  assert.deepEqual([empty.rijen, empty.vorige.rijen], [[], []])
})

test('refresh bewaart de feed in het archief en stuurt `archive` nooit mee naar de app', () => {
  const src = readFileSync(new URL('../netlify/lib/refresh.mjs', import.meta.url), 'utf8')
  assert.match(src, /const \{ parts, items, archive, \.\.\.rest \} = await buildFeed/)
  assert.match(src, /if \(archive\) await writeArchive\(ARCHIVE_FEED_KEY\(rest\.edition\.id\)/)
})
