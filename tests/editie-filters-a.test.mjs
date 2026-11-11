// Redacteur · filters-ai, deel A (shared/editie-filter.mjs): streng en zeker. Alleen een harde aanwijzing weert; geen
// woorden- of vormregel. Eis van Alex (11 november 2026): er valt nooit nieuws onterecht weg.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { hardMark, excludedFromEdition, rubricSegments, ownIntro } from '../shared/editie-filter.mjs'
import { mediaFields } from '../netlify/lib/rss.mjs'
import { generalEdition, streamItems, toClient } from '../netlify/lib/build.mjs'
import { composePersonal } from '../src/lib/personal.js'
import { composeFor, wegOf } from '../netlify/functions/edition.mjs'
import { MAIN_IDS, MUSIC_IDS, EDITION_CATS, SOURCES } from '../netlify/lib/sources.mjs'
import { keywordTopics } from '../netlify/lib/topics.mjs'
import { forEdition } from '../shared/stroom.mjs'

const sets = JSON.parse(readFileSync(new URL('./fixtures/editie-filters-sets.json', import.meta.url), 'utf8')).items
const art = (o) => ({ kind: 'article', ...o })

test('A: geen enkele nieuwskop uit de vier keuringen en de corpora gaat weg', () => {
  const nieuws = sets.filter((x) => x.label === 'N')
  assert.ok(nieuws.length >= 900, `${nieuws.length} nieuwskoppen`)
  assert.deepEqual(nieuws.filter((x) => hardMark(art(x))).map((x) => `${x.set}: ${x.title}`), [])
})

test('A: per set vangt A een deel van de echte deals en aankondigingen (de rest is voor de AI)', () => {
  const per = {}
  for (const x of sets.filter((x) => x.label === 'W')) {
    const p = (per[x.set] ||= { n: 0, weg: 0 })
    p.n++
    if (hardMark(art(x))) p.weg++
  }
  // Vastgelegd op 11 november 2026; meer vangen mag, minder niet zonder reden.
  assert.ok(per['corpus-aanbiedingen'].weg >= 30, JSON.stringify(per))
  assert.ok(per['k1-stress'].weg >= 3, JSON.stringify(per))
  const total = Object.values(per).reduce((a, p) => a + p.weg, 0)
  assert.ok(total >= 39, JSON.stringify(per))
})

test('A: een dealrubriek telt alleen als eerste padsegment, nooit een slug of een beursrubriek', () => {
  assert.equal(hardMark(art({ title: 'Sonos Era 100 nu goedkoper', url: 'https://www.example.test/deals/sonos-era-100' }))?.soort, 'aanbieding')
  assert.equal(hardMark(art({ title: 'Laptop in de aanbieding', url: 'https://www.example.test/nl/aanbiedingen/laptop' }))?.soort, 'aanbieding')
  for (const url of [
    'https://www.reuters.com/markets/deals/top-10-ma-deals-2026-12-30/',
    'https://www.example.test/business/deals/unilever-sells-ice-cream',
    'https://nos.nl/artikel/2641030-acm-controleert-nepkortingen-black-friday-sale',
    'https://tweakers.net/nieuws/240000/acm-onderzoekt-prijsverhogingen-black-friday-deals-2026.html',
    'https://www.example.test/deals',
  ]) assert.equal(hardMark(art({ title: 'Nieuws', url, summary: 'Een gewoon nieuwsbericht over iets dat gebeurde.' })), null, url)
  assert.deepEqual(rubricSegments('https://x.test/a/b/c?d=/deals/'), ['a', 'b'])
  assert.deepEqual(rubricSegments('geen link'), [])
})

test('A: de feed zelf markeert een aflevering (enclosure, iTunes, hoofdcategorie), en "Podcast:" vooraan', () => {
  assert.equal(hardMark(art({ title: 'Energie uitgelegd', mediaType: 'audio/mpeg' }))?.grond, 'enclosure')
  assert.equal(hardMark(art({ title: 'Energie uitgelegd', podcastEpisode: '4' }))?.grond, 'itunes')
  assert.equal(hardMark(art({ title: 'Energie uitgelegd', podcastEpisode: '' })), null)
  assert.equal(hardMark(art({ title: 'TASTE #16', feedMark: 'podcast' }))?.grond, 'feedcategorie')
  assert.equal(hardMark(art({ title: 'Podcast: de week in Den Haag', summary: 'In deze aflevering bespreken we de formatie.' }))?.grond, 'label')
  assert.equal(hardMark(art({ title: 'podcast | De Dag', summary: 'Een gesprek.' }))?.grond, 'label')
  // Alleen helemaal vooraan: een kop die een podcast noemt is nieuws.
  for (const title of ['Joe Rogan podcast: Vance calls for end to Ukraine aid', 'Podcast Groot Nieuws: makers stappen naar de rechter', 'Dutch Podcast Awards: NOS wint in drie categorieën', 'Trump op podcast: "ik win"']) assert.equal(hardMark(art({ title, url: 'https://example.test/nieuws/1' })), null, title)
})

test('A: een podcastrubriek of "Luister:" weert alleen zonder eigen intro', () => {
  const hazes = art({ title: 'Roxeanne en André Hazes winnen publieksprijs Dutch Podcast Awards', url: 'https://www.ad.nl/podcast/roxeanne-en-andre-hazes-winnen~a7d4158d/', summary: 'De podcast van moeder en zoon won woensdagavond de publieksprijs bij de Dutch Podcast Awards.' })
  assert.equal(hardMark(hazes), null)
  assert.equal(hardMark({ ...hazes, summary: '' })?.grond, 'rubriek')
  assert.equal(hardMark({ ...hazes, borrowedFrom: 'NOS' })?.grond, 'rubriek')
  assert.equal(hardMark(art({ title: 'Listen: Court rules recordings may be used as evidence', summary: 'The judges rejected the appeal and admitted the evidence.' })), null)
  assert.equal(hardMark(art({ title: 'Luister: de week', summary: '' }))?.grond, 'label')
})

test('A: een kijkfragment weert A nooit (daarover oordeelt de AI)', () => {
  for (const it of [
    { title: 'Video | Joe Biden wordt bekogeld door demonstranten in Dublin', url: 'https://www.nu.nl/332157/video/joe-biden', summary: 'De Amerikaanse oud-president is aangevallen.', borrowedFrom: 'De Telegraaf' },
    { title: 'Video | Legerhelikopter schiet raketten op huis', url: 'https://www.nu.nl/1/video/x.html', summary: '' },
    { title: 'Watch: the moment the bridge collapsed in Baltimore', url: 'https://example.test/nieuws/1' },
    { title: 'Kijk: hoogtepunten', mediaType: 'video/mp4', feedMark: 'video' },
  ]) assert.equal(hardMark(art(it)), null, it.title)
})

test('A: een eigen intro is niet geleend, niet leeg en niet de kop herhaald', () => {
  assert.equal(ownIntro({ title: 'Spain faces protests', summary: 'Spain faces protests' }), false)
  assert.equal(ownIntro({ title: 'X', summary: 'Een echte intro met genoeg woorden.' }), true)
  assert.equal(ownIntro({ title: 'X', summary: 'Een echte intro met genoeg woorden.', borrowedFrom: 'NOS' }), false)
  assert.equal(ownIntro({ title: 'X', summary: 'The post X appeared first on Y.' }), false)
})

test('A: geen woorden- of vormregels meer (koppen uit keuring 4 die eerder wegvielen)', () => {
  for (const title of ['Top 10 M&A deals of 2026', 'Save 10% of income for pension, Dutch funds tell young workers', 'Solar panels drop to lowest price ever in Europe', 'Black Friday sale: 40% off claims misleading, CMA rules', 'Livestream van rechtszaak verboden', 'Aflevering 3 Wie is de Mol uitgelekt: Avrotros doet aangifte', 'How to watch TV abroad changes under new EU rules'])
    assert.equal(excludedFromEdition(art({ title, url: 'https://example.test/nieuws/1' })), false, title)
})

test('A: posts en lege invoer', () => {
  assert.equal(hardMark({ kind: 'post', title: 'Podcast: x', mediaType: 'audio/mpeg' }), null)
  assert.equal(hardMark(null), null)
  assert.equal(excludedFromEdition(null), false)
})

test('B-ids: excludedFromEdition weert een id uit `weg` alleen als het wordt meegegeven', () => {
  const it = art({ id: 'x1', title: 'Gewoon nieuws', url: 'https://example.test/nieuws/1' })
  assert.equal(excludedFromEdition(it), false)
  assert.equal(excludedFromEdition(it, new Set()), false)
  assert.equal(excludedFromEdition(it, new Set(['x1'])), true)
})

test('rss: media-aanwijzingen uit enclosure, iTunes en alleen de eerste categorie', () => {
  assert.deepEqual(mediaFields({ enclosure: { type: 'audio/mpeg' }, itunes: { episode: 12 } }, []), { mediaType: 'audio/mpeg', podcastEpisode: '12' })
  assert.deepEqual(mediaFields({ enclosure: { type: 'image/jpeg' } }, ['Video']), { feedMark: 'video' })
  assert.deepEqual(mediaFields({}, ['Podcast']), { feedMark: 'podcast' })
  // Guardian: "Podcasts" als onderwerp, niet als soort.
  assert.deepEqual(mediaFields({}, ['Culture', 'Podcasting', 'Podcasts']), {})
  assert.deepEqual(mediaFields({ itunes: { duration: '31:02' } }, []), { podcastEpisode: '31:02' })
  const c = toClient({ id: 'm', kind: 'article', source: 'nos', title: 'T', url: 'https://nos.nl/l/1', mediaType: 'audio/mpeg', podcastEpisode: '3', feedMark: 'podcast' })
  assert.equal(c.mediaType, 'audio/mpeg')
  assert.equal(c.podcastEpisode, '3')
  assert.equal(c.feedMark, 'podcast')
})

test('de Stroom verandert niet: streamItems houdt ook wat de Editie weert', () => {
  const now = Date.parse('2026-11-11T12:00:00Z')
  const xs = [
    { id: 'a', kind: 'article', source: 'nos', title: 'Podcast: De Dag', url: 'https://nos.nl/podcast/1', publishedAt: new Date(now).toISOString() },
    { id: 'b', kind: 'article', source: 'nos', title: 'Deal', url: 'https://example.test/deals/x', publishedAt: new Date(now - 1000).toISOString() },
  ]
  assert.deepEqual(streamItems(xs).map((i) => i.id), ['a', 'b'])
})

// Integratie op een bewaarde feed: een id in `weg` verdwijnt uit de algemene en de server-Editie, het toestel (zonder weg) houdt hem.
const feed = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live-feed-2026-11-11-ochtend.json.gz', import.meta.url))).toString('utf8'))
if (!feed.items?.length) feed.items = [...new Map([...(feed.related || []), ...(feed.edition.items || [])].map((i) => [i.id, i])).values()]
const now = Date.parse(feed.meta.updatedAt)
const SOURCE = new Map(SOURCES.map((s) => [s.id, s]))
const sport = new Set(['voetbal', 'f1', 'wielrennen', 'tennis', 'wintersport', 'olympisch'])
const general = (weg) => {
  const pool = feed.items.filter(forEdition)
  const newsPool = pool.filter((i) => i.kind === 'article' && EDITION_CATS.has(SOURCE.get(i.source)?.cat) && !MUSIC_IDS.has(i.source) && !keywordTopics(`${i.title} ${i.text || i.summary || ''}`).some((t) => sport.has(t)))
  const ids = new Set(newsPool.map((i) => i.id))
  return generalEdition({ stories: feed.stories, newsStories: feed.stories.filter((st) => st.itemIds.some((id) => ids.has(id))), pool, newsPool, now, sources: feed.sources, mainIds: MAIN_IDS, weg })
}
const leadIds = (entries) => entries.map((e) => e.leadId || e.id)

test('algemene Editie: een id in weg komt niet meer voor, zonder weg niets anders', () => {
  const before = general(null)
  assert.deepEqual(general(new Set()), before)
  const lead = before[0].leadId || before[0].id
  const after = general(new Set([lead]))
  assert.ok(!leadIds(after).includes(lead))
  assert.equal(after.length, before.length)
})

test('persoonlijke Editie: de server (composeFor) volgt editionFilter.weg; het toestel zonder weg niet', () => {
  const p = { followed: ['nos', 'nu', 'nrc', 'volkskrant'], interests: [], topics: [], favorites: [], taste: null, readIds: [], reading: null }
  const start = { edition: feed.edition, stories: feed.stories, sources: feed.sources }
  const base = composeFor(start, feed.items, p, { owner: 'anon' })
  const lead = base.entries[0].leadId || base.entries[0].id
  const server = composeFor({ ...start, editionFilter: { weg: [lead] } }, feed.items, p, { owner: 'anon' })
  assert.ok(!leadIds(server.entries).includes(lead))
  const device = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(p.followed), now, builtAt: feed.meta.updatedAt })
  assert.ok(leadIds(device.entries).includes(lead))
  assert.deepEqual([...wegOf({ editionFilter: { weg: ['a', 3, '../x', 'b'] } })], ['a', 'b'])
  assert.equal(wegOf({}).size, 0)
})

test('Buiten je bubbel en Naast je bubbel: een aflevering of dealrubriek komt er niet in', async () => {
  const { matchTrending, nearStories } = await import('../netlify/lib/bubble.mjs')
  const now = Date.parse('2026-11-11T12:00:00Z')
  const a = (id, title, extra = {}) => ({ id, kind: 'article', source: 'nos', title, summary: '', url: `https://nos.nl/l/${id}`, publishedAt: new Date(now - 3600e3).toISOString(), ...extra })
  const xs = [a('p', 'Podcast: Christa Pike en de doodstraf'), a('d', 'Christa Pike-boek in de aanbieding', { url: 'https://x.test/deals/pike' }), a('n', 'Christa Pike: executie mislukt', { summary: 'De terdoodveroordeelde overleefde de injectie.' })]
  assert.deepEqual(matchTrending([{ term: 'Christa Pike', via: 'google', rank: 1 }], xs, { now }).map((o) => o.id), ['n'])
  const byId = new Map(xs.map((i) => [i.id, i]))
  const st = { id: 's', sourceCount: 6, latestAt: new Date(now).toISOString(), itemIds: ['p', 'd'] }
  const out = nearStories([st], new Map([...byId].map(([k, v]) => [k, { ...v, topics: ['misdaad'] }])), { isFree: () => true, isDutch: () => true, now })
  assert.ok(out.every((o) => !['p', 'd'].includes(o.item?.id)))
})
