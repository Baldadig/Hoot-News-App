// Frisse ogen · 1 (besluit van Alex, 11 november): Buiten je bubbel krijgt harde eisen. Gratis, jonger dan een etmaal,
// geen liveblog, geen sport, geen naam die al in een kop van de Editie staat (per woord), niet al eerder getoond (vandaag
// of in de vorige Editie); anders blijft de plek leeg. Geen Naast je bubbel als vervanger (keuze A van het rapport).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { matchTrending, namesIn, bubbleRejection, headWords, termCovered, termWords, BUBBLE_HOURS } from '../netlify/lib/bubble.mjs'
import { pickBubble } from '../netlify/lib/build.mjs'
import { buildStories } from '../netlify/lib/stories.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'

const NOW = Date.parse('2026-11-11T05:00:00Z')
const ago = (h) => new Date(NOW - h * 36e5).toISOString()
const art = (id, title, extra = {}) => ({ id, kind: 'article', source: 'nos', sourceName: 'NOS', title, summary: `${title}.`, publishedAt: ago(2), topics: [], ...extra })

test('een signaal is gedekt zodra één van zijn woorden in een kop van de Editie staat ("Pete Hegseth" naast "Hegseth")', () => {
  const heads = headWords(['Voorlopig geen afzettingsprocedure tegen Amerikaanse defensieminister Hegseth'])
  assert.equal(termCovered(termWords('Pete Hegseth'), heads), true)
  assert.equal(termCovered(termWords('Paulien Cornelisse'), heads), false)
  const a = [art('v', 'Republikeinen blokkeren stemming over impeachment van Defensieminister Pete Hegseth')]
  assert.deepEqual(matchTrending([{ term: 'Pete_Hegseth', via: 'wikipedia' }], a, { coveredTitles: ['Voorlopig geen afzettingsprocedure tegen defensieminister Hegseth'] }), [])
})

test('namen in een kop: woorden met een hoofdletter na het eerste woord, zonder functiewoorden', () => {
  assert.deepEqual(namesIn('Motion to refer: Republikeinen blokkeren stemming over impeachment van Defensieminister Pete Hegseth'), ['republikeinen', 'defensieminister', 'pete', 'hegseth'])
  assert.deepEqual(namesIn('Vader Meghan Markle opgesloten'), ['meghan', 'markle'])
  assert.deepEqual(namesIn('UK Arrests US Soldier With Russia Links'), ['arrests', 'soldier', 'russia', 'links'])
})

test('de harde eisen, elk met een eigen afvalreden', () => {
  const opts = { isFree: (s) => s !== 'nrc', isSport: (i) => (i.topics || []).includes('voetbal'), isLive: (i) => /liveblog/i.test(i.url || ''), now: NOW, heads: headWords(['Kabinet valt over Belastingplan']) }
  assert.equal(bubbleRejection(art('a', 'Eerste natuurijsbaan van het najaar open'), opts), null)
  assert.equal(bubbleRejection(art('b', 'Iets', { source: 'nrc' }), opts), 'betaald')
  assert.equal(bubbleRejection(art('c', 'Iets', { publishedAt: ago(BUBBLE_HOURS) }), opts), 'ouder-dan-24-uur')
  assert.equal(bubbleRejection(art('d', 'Iets', { publishedAt: null }), opts), 'ouder-dan-24-uur')
  assert.equal(bubbleRejection(art('e', 'Iets', { url: 'https://x/liveblog/1' }), opts), 'liveblog')
  assert.equal(bubbleRejection(art('f', 'Ajax wint', { topics: ['voetbal'] }), opts), 'sport')
  assert.equal(bubbleRejection(art('g', 'Iets'), { ...opts, shownToday: (a) => a.id === 'g' }), 'eerder-getoond')
  assert.equal(bubbleRejection(art('h', 'Oppositie wil debat over Belastingplan'), opts), 'naam-al-in-kop:belastingplan')
  assert.equal(bubbleRejection(art('i', 'Iets nieuws'), { ...opts, terms: [{ term: 'kabinet crisis' }] }), 'naam-al-in-kop:kabinet')
  assert.equal(bubbleRejection({ ...art('j', 'Post'), kind: 'post' }, opts), 'geen-artikel')
})

// Een kleine Editie met een pool eromheen. Bronnen: nos/nu gratis, nrc betaald (sources.mjs).
function world(extra = []) {
  const pool = [
    art('e1', 'Kabinet valt over Belastingplan', { storyId: 's-e1' }),
    art('t-betaald', 'Paulien Cornelisse neemt afscheid van De slimste mens', { source: 'nrc', sourceName: 'NRC' }),
    art('t-oud', 'Paulien Cornelisse stopt bij De slimste mens', { publishedAt: ago(30) }),
    art('t-ok', 'Zo nam De slimste mens afscheid van Paulien Cornelisse', { source: 'nu', sourceName: 'NU.nl' }),
    ...extra,
  ]
  const entries = [{ kind: 'item', id: 'e1', desk: 'binnenland' }]
  return { pool, entries, heads: ['Kabinet valt over Belastingplan'], trends: [{ term: 'Paulien Cornelisse', via: 'google' }] }
}

test('pickBubble: de trend die aan alle eisen voldoet; de betaalde en de oude vallen af met hun reden', () => {
  const w = world()
  const b = pickBubble({ ...w, now: NOW })
  assert.equal(b.keuze, 'trend')
  assert.equal(b.item.id, 't-ok')
  assert.deepEqual(b.entries.at(-1), { kind: 'item', id: 't-ok', desk: 'bubbel', terms: [{ term: 'Paulien Cornelisse', via: 'google' }] })
  assert.deepEqual(Object.fromEntries(b.afval.map((x) => [x.id, x.reden])), { 't-betaald': 'betaald', 't-oud': 'ouder-dan-24-uur' })
})

test('pickBubble: al eerder getoond telt (vandaag of in de vorige Editie), ook als hetzelfde stuk of hetzelfde verhaal', () => {
  const w = world()
  const b = pickBubble({ ...w, earlier: [{ id: 't-ok', title: 'Zo nam De slimste mens afscheid van Paulien Cornelisse', publishedAt: ago(3) }], now: NOW })
  assert.notEqual(b.item?.id, 't-ok')
  assert.ok(b.afval.some((x) => x.id === 't-ok' && x.reden === 'eerder-getoond'))
})

test('pickBubble: geen trend die voldoet, dan blijft de plek leeg, ook als er een breed verhaal voor Naast je bubbel is', () => {
  const w = world()
  const trends = [{ term: 'Hegseth', via: 'google' }]
  const leeg = pickBubble({ ...w, trends, now: NOW })
  assert.equal(leeg.keuze, 'leeg')
  assert.deepEqual(leeg.entries, w.entries)
  // Een breed verhaal (≥ 3 bronnen) met een gratis kop: in de algemene Editie toch geen vervanger (besluit 11 november).
  const items = [art('n1', 'Eerste natuurijsbaan van het najaar open', { topics: ['klimaat'], storyId: 'st-ijs' }), art('n2', 'Natuurijs in Drenthe', { source: 'nrc', topics: ['klimaat'], storyId: 'st-ijs' })]
  const stories = [{ id: 'st-ijs', sourceCount: 3, latestAt: ago(1), itemIds: ['n1', 'n2'] }]
  const b = pickBubble({ ...w, pool: [...w.pool, ...items], stories, trends, now: NOW })
  assert.equal(b.keuze, 'leeg')
  assert.equal(b.item, null)
  assert.deepEqual(b.entries, w.entries)
  assert.ok(!b.entries.some((e) => e.desk === 'bubbel'))
  // Een oude bubbelplek in de invoer valt ook weg.
  const stale = pickBubble({ ...w, entries: [...w.entries, { kind: 'item', id: 'x', desk: 'bubbel' }], trends, now: NOW })
  assert.deepEqual(stale.entries, w.entries)
})

test('pickBubble: alleen kandidaten die vallen, dan leeg met hun afvalredenen', () => {
  const w = world()
  const b = pickBubble({ ...w, pool: w.pool.filter((a) => a.id !== 't-ok'), now: NOW })
  assert.equal(b.keuze, 'leeg')
  assert.deepEqual(Object.fromEntries(b.afval.map((x) => [x.id, x.reden])), { 't-betaald': 'betaald', 't-oud': 'ouder-dan-24-uur' })
})

test('regressie 11 november ochtend: niet het VRT-liveblog van 18 dagen over Hegseth (die al op 02 stond)', () => {
  const feed = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live-feed-2026-11-11-ochtend.json.gz', import.meta.url))).toString('utf8'))
  const ed = feed.edition
  const now = Date.parse(ed.builtAt)
  const all = new Map([...feed.related, ...feed.items, ...ed.items].map((i) => [i.id, { ...i }]))
  const pool = [...all.values()].filter((i) => i.kind === 'article' && Date.parse(i.publishedAt) <= now)
  const stories = buildStories(pool, {}, { mainIds: MAIN_IDS, keys: true, extended: true })
  const byId = new Map(pool.map((i) => [i.id, i]))
  for (const st of stories) for (const id of st.itemIds) byId.get(id).storyId = st.id
  const regular = ed.entries.filter((e) => e.desk !== 'bubbel')
  const storyById = new Map([...feed.stories, ...stories].map((st) => [st.id, st]))
  const trends = ed.entries.find((e) => e.desk === 'bubbel').terms
  const b = pickBubble({ entries: regular, heads: regular.map((e) => all.get(e.leadId || e.id)?.title), storyById, pool, byId, stories, trends, now })
  const vrt = ed.entries.find((e) => e.desk === 'bubbel').id
  assert.notEqual(b.item?.id, vrt)
  // Het signaal "Pete Hegseth" is gedekt door "Hegseth" op 02: het liveblog is niet eens meer een kandidaat.
  assert.ok(!b.afval.some((x) => x.id === vrt))
  if (b.item) assert.equal(bubbleRejection(b.item, { isFree: () => true, now, heads: headWords(regular.map((e) => all.get(e.leadId || e.id)?.title)) }), null)
})
