// P0, 9 november 2026: een lezer opende de website na ruim een dag. De nieuwe kern (de algemene Editie van de
// middag) was er vóór de berichten van zijn eigen bronnen; Jouw Editie werd samengesteld met de berichten uit de
// cache van zijn vorige bezoek en lag daarna het hele dagdeel vast, ook op zijn iPhone: acht plekken, Follow the
// Money van gisteren op 01, aangevuld met bronnen die hij niet volgt. Zie Hoot-design/editie-p0-2026-11-09.
//
// Fixture: tests/fixtures/live-feed-2026-11-09-middag.json.gz, de live feed van die middag (kern plus de delen
// van veertien bronnen, zonder persoonsgegevens). Profiel: een lezer zoals Alex (veertien Nederlandse en
// Engelse bronnen, Binnenland, Wereld, Politiek, Tech en Economie).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { composePersonal, staleInput, STALE_INPUT_MS } from '../src/lib/personal.js'
import { resolveTopics } from '../src/lib/topics.js'
import { editionReady, itemsCurrent } from '../src/lib/editionSync.js'
import { gatherParts, itemsForOf } from '../src/lib/feedParts.js'
import { compose as coreCompose } from '../src/lib/editionCore.js'
import { EDITION_FLOOR } from '../shared/edition-policy.mjs'

const feed = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live-feed-2026-11-09-middag.json.gz', import.meta.url))).toString('utf8'))
const FOLLOWED = ['nos', 'nrc', 'volkskrant', 'parool', 'ftm', 'nyt', 'newyorker', 'atlantic', 'economist', 'theverge', 'wired', 'tweakers', '3voor12', 'fd']
const INTERESTS = ['binnenland', 'wereld', 'politiek', 'tech', 'economie']
const NOW = Date.parse(feed.edition.builtAt)
// Wat in de cache van Safari stond: de berichten van het vorige bezoek (8 november, ochtend).
const CACHE_AT = Date.parse('2026-11-08T07:51:00Z')

const compose = (items, extra = {}) =>
  composePersonal({ global: feed.edition, stories: feed.stories, items, sources: feed.sources, followed: new Set(FOLLOWED), interests: INTERESTS, topics: resolveTopics(INTERESTS, []), now: NOW, previous: null, readIds: new Set(), ...extra })
const known = (ed) => new Map([...(ed?.items || []), ...feed.items, ...(feed.edition.items || [])].map((i) => [i.id, i]))
const plekken = (ed) => ed.entries.filter((e) => e.desk !== 'bubbel')

test('P0: met de berichten van dit dagdeel dragen je eigen bronnen de Editie, tien plekken', () => {
  const ed = compose(feed.items)
  const byId = known(ed)
  const mine = new Set(FOLLOWED)
  const rows = plekken(ed)
  assert.equal(rows.length, 10, 'tien plekken')
  assert.ok(!ed._supply, 'geen "er was niet meer passend nieuws"')
  const own = rows.filter((e) => mine.has(byId.get(e.leadId || e.id)?.source))
  assert.ok(own.length >= 8, `${own.length} van de 10 plekken uit je eigen bronnen`)
  assert.ok(!rows.some((e) => e.supplement), 'geen aanvulling nodig')
})

test('P0: 01 is een echt nieuwsverhaal uit je eigen bronnen, van dit dagdeel, met beeld en intro (geen byline)', () => {
  const ed = compose(feed.items)
  const first = ed.entries[0]
  const it = known(ed).get(first.leadId || first.id)
  assert.ok(FOLLOWED.includes(it.source), `01 komt uit ${it.source}`)
  assert.equal(it.kind, 'article')
  assert.ok(!first.supplement && first.desk !== 'extern', '01 is geen aanvulling')
  assert.ok(NOW - Date.parse(it.publishedAt) < 24 * 3600e3, '01 is van het afgelopen etmaal')
  assert.ok(it.image, '01 heeft beeld')
  const intro = (it.summary || '').trim()
  assert.ok(intro.length >= 60, `01 heeft een intro (${intro.length} tekens)`)
  assert.ok(!/^(door|by)\s/i.test(intro) && (!it.author || !intro.includes(it.author)), 'de intro is geen byline')
})

test('P0: met de berichten uit de cache van een vorig bezoek geen Editie (vangnet, web en app gelijk)', () => {
  const stale = feed.items.filter((i) => Date.parse(i.publishedAt) <= CACHE_AT)
  assert.ok(stale.length > 50, 'de cache had genoeg berichten')
  assert.equal(staleInput({ global: feed.edition, items: stale, followed: new Set(FOLLOWED) }), true)
  assert.equal(compose(stale), null, 'samenstellen weigert: anders acht plekken met wat je al zag en bronnen die je niet volgt')
  // De rekenkern van de app (editionCore → edition-core.js) weigert net zo; de app valt dan terug op de server.
  assert.equal(coreCompose({ global: feed.edition, stories: feed.stories, items: stale, sources: feed.sources, followed: FOLLOWED, interests: INTERESTS, topics: resolveTopics(INTERESTS, []), now: NOW }), null)
  // Vers: wel.
  assert.equal(staleInput({ global: feed.edition, items: feed.items, followed: new Set(FOLLOWED) }), false)
})

test('P0: het vangnet weigert niet wat het niet kan toetsen of wat gewoon traag is', () => {
  const at = (h) => new Date(NOW - h * 3600e3).toISOString()
  const g = (h, source = 'nos') => ({ items: [{ id: 'g', kind: 'article', source, publishedAt: at(h) }] })
  const own = (h, source = 'nos') => [{ id: 'o', kind: 'article', source, publishedAt: at(h) }]
  const f = new Set(['nos'])
  assert.equal(staleInput({ global: g(1), items: own(1 + STALE_INPUT_MS / 3600e3 - 1), followed: f }), false, 'binnen een halve dag: goed')
  assert.equal(staleInput({ global: g(1), items: own(30), followed: f }), true)
  assert.equal(staleInput({ global: g(1, 'rtl'), items: own(30), followed: f }), false, 'geen eigen bron in de algemene Editie: niet te toetsen')
  assert.equal(staleInput({ global: g(1), items: [{ id: 'q', source: 'nos' }], followed: f }), false, 'geen gedateerde eigen berichten')
  assert.equal(staleInput({ global: g(1), items: [], followed: f }), false)
})

test('P0: Jouw Editie wacht tot de berichten bij de Editie en je bronnen van nu horen', () => {
  const global = feed.edition
  const base = { status: 'ready', global, items: 400, uid: null, followed: FOLLOWED }
  // Bij het openen: de cache van het vorige bezoek (ander dagdeel), of een cache van vóór dit veld.
  assert.equal(editionReady({ ...base, itemsFor: { edition: '2026-11-08-ochtend', sources: FOLLOWED } }), false)
  assert.equal(editionReady({ ...base, itemsFor: null }), false)
  // Je account gaf net een bron die de berichten nog niet hebben.
  assert.equal(editionReady({ ...base, itemsFor: { edition: global.id, sources: FOLLOWED.filter((s) => s !== 'economist') } }), false)
  assert.equal(editionReady({ ...base, itemsFor: { edition: global.id, sources: FOLLOWED } }), true)
  // Een bron uitzetten mag meteen: de berichten van de rest zijn er al.
  assert.equal(itemsCurrent({ edition: global.id, sources: FOLLOWED }, global, FOLLOWED.slice(1)), true)
  // Als lid ook nog na de pull.
  assert.equal(editionReady({ ...base, uid: 'u', pulled: false, itemsFor: { edition: global.id, sources: FOLLOWED } }), false)
})

// De wedloop zelf: een ronde bij de kern van gisteren (je account gaf andere bronnen terwijl de app nog met de
// cache draaide) en een ronde bij de kern van nu delen de voorraad. Elke ronde geeft de berichten van háár
// versies, met haar Editie in `itemsFor`; de oude ronde kan de nieuwe geen oude delen geven.
test('P0: twee rondes tegelijk geven elk de berichten van hun eigen kern', async () => {
  const core = (id, v) => ({ edition: { id }, meta: { parts: { nos: `nos-${v}`, nyt: `nyt-${v}` } }, sources: [{ id: 'nos' }, { id: 'nyt' }] })
  const oud = core('2026-11-08-ochtend', 'oud')
  const nu = core('2026-11-09-middag', 'nu')
  const parts = new Map()
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  // Het oude deel van NYT komt laat binnen (geen cache, traag) en overschrijft de voorraad terwijl de ronde van
  // nu nog op NOS wacht (vóór deze fix gaf die ronde dan het NYT-deel van gisteren).
  const delay = { 'nyt-oud': 30, 'nos-nu': 45 }
  const fetchPart = async (id, version) => {
    await wait(delay[version] ?? 5)
    return [{ id: `${version}-1`, source: id, publishedAt: version.endsWith('nu') ? '2026-11-09T10:00:00Z' : '2026-11-08T06:00:00Z' }]
  }
  const [a, b] = await Promise.all([gatherParts({ core: oud, wanted: ['nos', 'nyt'], parts, fetchPart }), gatherParts({ core: nu, wanted: ['nos', 'nyt'], parts, fetchPart })])
  assert.deepEqual(b.items.map((i) => i.id).sort(), ['nos-nu-1', 'nyt-nu-1'], 'de ronde van nu heeft alleen delen van nu')
  assert.deepEqual(b.itemsFor, itemsForOf(nu, ['nos', 'nyt']))
  assert.deepEqual(a.items.map((i) => i.id).sort(), ['nos-oud-1', 'nyt-oud-1'])
  assert.equal(a.itemsFor.edition, '2026-11-08-ochtend', 'de oude ronde zegt bij welke Editie haar berichten horen')
  // En de volgende ronde van nu haalt het deel dat de oude ronde in de voorraad overschreef gewoon opnieuw.
  const c = await gatherParts({ core: nu, wanted: ['nos', 'nyt'], parts, fetchPart })
  assert.deepEqual(c.items.map((i) => i.id).sort(), ['nos-nu-1', 'nyt-nu-1'])
  // Een deel dat mislukt: wat we van die bron nog hadden (zoals altijd), de rest gaat door.
  const failing = async (id, version) => {
    if (id === 'nyt') throw new Error('time-out')
    return fetchPart(id, version)
  }
  const d = await gatherParts({ core: core('2026-11-09-avond', 'avond'), wanted: ['nos', 'nyt'], parts, fetchPart: failing })
  assert.ok(d.items.some((i) => i.source === 'nyt'))
  assert.ok(d.items.some((i) => i.id === 'nos-avond-1'))
})

test('P0: de vloer blijft gelden; met verse berichten is er geen reden om korter te zijn', () => {
  const ed = compose(feed.items)
  assert.ok(plekken(ed).length >= EDITION_FLOOR)
})
