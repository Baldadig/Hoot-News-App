// The Washington Post (14 november 2026), akkoord van Alex met de twee oplossingen uit
// Hoot-design/bronnen-internationaal-2026-11-14/AMERIKA-VERSLAG.md. Hier:
//   1. de wachttijd per bron (`timeoutMs`, rss.mjs feedTimeout), met een bovengrens, en een ronde die op een trage bron
//      niet wacht (build.mjs fetchSources): binnen de tijd van de geplande functie;
//   2. beeld via de eigen Bluesky-kaarten (`bskyImages`): alleen eigen posts, eerst op de link, onthouden per artikel;
//   3. WaPo als twee bronnen van één uitgever: Internationaal, Engels, Amerikaans, betaald, zonder inlog, en onder de
//      landenregel.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SOURCES, MAIN_IDS } from '../netlify/lib/sources.mjs'
import { feedTimeout, slowSource, loadSource, FEED_TIMEOUT, FEED_TIMEOUT_MAX } from '../netlify/lib/rss.mjs'
import { fetchSources, LATE_KEY, LATE_MS, FETCH_MS, matchCard, imagesFromBluesky, BSKY_IMAGES_KEY, wantsArticleImage } from '../netlify/lib/build.mjs'
import { cardsOf, loadBskyCards } from '../netlify/lib/lookups.mjs'
import { publisherOf, publisherCountry, coverageOf, internationalNews, COUNTRY_MAX } from '../shared/edition-policy.mjs'
import { opinieBron } from '../shared/opinie.mjs'
import { STARTER } from '../src/lib/topics.js'
import { followGroups } from '../src/lib/follow-welcome.js'

const byId = new Map(SOURCES.map((s) => [s.id, s]))
const WAPO = ['wapo', 'wapo-politics']
const wait = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms))
const ok = (s, n = 1) => ({ id: s.id, name: s.name, ok: true, used: s.urls?.[0] || null, count: n, items: Array.from({ length: n }, (_, k) => ({ id: s.id + k, source: s.id, title: 't' + k })) })

// ---------- 1. De wachttijd ----------
test('feedTimeout: standaard 9 s, een eigen wachttijd per bron, nooit boven de bovengrens', () => {
  assert.equal(FEED_TIMEOUT, 9000)
  assert.equal(feedTimeout({}), FEED_TIMEOUT)
  assert.equal(feedTimeout({ timeoutMs: 12000 }), 12000)
  assert.equal(feedTimeout({ timeoutMs: 60000 }), FEED_TIMEOUT_MAX, 'de bovengrens')
  assert.ok(FEED_TIMEOUT_MAX < 15000, 'onder de 15 s van de planner')
  assert.equal(feedTimeout({ timeoutMs: 10 }), 1000, 'niet absurd kort')
  for (const v of [0, -5, 'snel', null, NaN]) assert.equal(feedTimeout({ timeoutMs: v }), FEED_TIMEOUT, String(v))
  assert.equal(slowSource({ timeoutMs: 14000 }), true)
  assert.equal(slowSource({}), false)
  assert.equal(slowSource({ timeoutMs: 5000 }), false, 'korter dan de standaard is geen trage bron')
  for (const s of SOURCES) if (s.timeoutMs != null) assert.ok(s.timeoutMs <= FEED_TIMEOUT_MAX, s.id)
})

test('loadSource leest elke feed met de wachttijd van de bron', async () => {
  const seen = []
  const read = async (url, timeout) => (seen.push([url, timeout]), { items: [{ title: 'Een kop', link: 'https://example.com/a', isoDate: new Date().toISOString() }] })
  const r = await loadSource({ id: 'x', name: 'X', lang: 'en', urls: ['https://example.com/feed'], timeoutMs: 13000 }, Promise.resolve({}), { read })
  assert.equal(r.ok, true)
  assert.deepEqual(seen, [['https://example.com/feed', 13000]])
  await loadSource({ id: 'y', name: 'Y', lang: 'en', urls: ['https://example.com/feed'] }, Promise.resolve({}), { read })
  assert.equal(seen[1][1], FEED_TIMEOUT)
})

// ---------- 1b. De ronde wacht niet op een trage bron ----------
const memory = (init = {}) => {
  const m = new Map(Object.entries(init))
  return { get: async (k) => m.get(k) ?? null, set: async (k, v) => void m.set(k, v), m }
}

test('fetchSources: een trage bron houdt de gewone bronnen niet op; zonder lading van eerder telt hij deze ronde niet', async () => {
  const a = { id: 'a', name: 'A', urls: ['https://a/feed'] }
  const b = { id: 'b', name: 'B', urls: ['https://b/feed'] }
  const traag = { id: 'traag', name: 'Traag', urls: ['https://t/feed'], timeoutMs: 14000 }
  const load = async (s) => (s.id === 'traag' ? wait(400, ok(s, 3)) : wait(20, ok(s)))
  const kv = memory()
  const t = Date.now()
  const { fetched, late } = await fetchSources([a, traag, b], null, { load, get: kv.get, set: kv.set, fetchMs: 1000, lateMs: 1500 })
  assert.ok(Date.now() - t < 300, 'de ronde gaat door zodra de gewone bronnen er zijn')
  assert.deepEqual(fetched.map((r) => r.id), ['a', 'traag', 'b'], 'de volgorde van de catalogus')
  assert.equal(fetched[0].ok, true)
  assert.equal(fetched[1].ok, false)
  assert.equal(fetched[1].pending, true)
  // Aan het eind van de ronde: de lading van de trage bron bewaren, voor de volgende ronde.
  assert.equal(await late(), 1)
  assert.equal(kv.m.get(LATE_KEY).traag.items.length, 3)
})

test('fetchSources: de volgende ronde neemt de bewaarde lading; is de bron wel op tijd, dan de verse', async () => {
  const traag = { id: 'traag', name: 'Traag', urls: ['https://t/feed'], timeoutMs: 14000 }
  const now = Date.now()
  const kv = memory({ [LATE_KEY]: { traag: { at: now - 10 * 6e4, used: 'https://t/feed', items: [{ id: 'oud', source: 'traag', title: 'oud' }] } } })
  const r1 = await fetchSources([traag], null, { now, load: async (s) => wait(300, ok(s, 2)), get: kv.get, set: kv.set, fetchMs: 50, lateMs: 1000 })
  assert.equal(r1.fetched[0].ok, true)
  assert.ok(r1.fetched[0].cached, 'uit de bewaarde lading')
  assert.deepEqual(r1.fetched[0].items.map((i) => i.id), ['oud'])
  await r1.late()
  assert.deepEqual(kv.m.get(LATE_KEY).traag.items.map((i) => i.id), ['traag0', 'traag1'])
  // Op tijd (de gewone bronnen duren langer): meteen de verse lading.
  const gewoon = { id: 'g', name: 'G', urls: ['https://g/feed'] }
  const load = async (s) => (s.id === 'traag' ? wait(10, ok(s, 4)) : wait(100, ok(s)))
  const r2 = await fetchSources([gewoon, traag], null, { now, load, get: kv.get, set: kv.set, fetchMs: 1000, lateMs: 1000 })
  assert.equal(r2.fetched[1].items.length, 4)
  assert.equal(r2.fetched[1].cached, undefined)
})

test('fetchSources: een te oude lading telt niet, en een mislukte trage bron overschrijft de goede niet', async () => {
  const traag = { id: 'traag', name: 'Traag', urls: ['https://t/feed'], timeoutMs: 14000 }
  const now = Date.now()
  const kv = memory({ [LATE_KEY]: { traag: { at: now - 4 * 36e5, items: [{ id: 'oud' }] } } })
  const r = await fetchSources([traag], null, { now, load: async (s) => ({ id: s.id, name: s.name, ok: false, count: 0, items: [], error: 'HTTP 503' }), get: kv.get, set: kv.set, fetchMs: 50, lateMs: 200 })
  assert.equal(r.fetched[0].ok, false)
  assert.equal(await r.late(), 0)
  assert.equal(kv.m.get(LATE_KEY).traag.at, now - 4 * 36e5, 'niets weggeschreven')
})

test('fetchSources: na de eindtijd wacht de ronde niet meer op een gewone bron (niet aan de beurt), en late() wacht hooguit tot LATE_MS', async () => {
  const snel = { id: 'snel', name: 'Snel', urls: ['https://s/feed'] }
  const hangt = { id: 'hangt', name: 'Hangt', urls: ['https://h/feed'] }
  const traag = { id: 'traag', name: 'Traag', urls: ['https://t/feed'], timeoutMs: 14000 }
  const load = async (s) => (s.id === 'snel' ? ok(s) : wait(5000, ok(s)))
  const kv = memory()
  const t = Date.now()
  const { fetched, late } = await fetchSources([snel, hangt, traag], null, { load, get: kv.get, set: kv.set, fetchMs: 150, lateMs: 400 })
  assert.ok(Date.now() - t < 350, 'hooguit de eindtijd')
  assert.equal(fetched.find((r) => r.id === 'hangt').skipped, true)
  assert.equal(await late(), 0)
  assert.ok(Date.now() - t < 700, 'late() houdt op bij LATE_MS')
  assert.ok(FETCH_MS < LATE_MS && LATE_MS < 15000, 'binnen de 15 s van de planner')
})

test('fetchSources: de trage bron krijgt de eindtijd LATE_MS mee, de gewone FETCH_MS (geen herhaling daarna)', async () => {
  const seen = {}
  const load = async (s, _a, opts) => ((seen[s.id] = opts.deadline), ok(s))
  const start = Date.now()
  const { late } = await fetchSources([{ id: 'g', urls: [] }, { id: 't', urls: [], timeoutMs: 14000 }], null, { start, load, get: async () => null, set: async () => {} })
  await late()
  assert.equal(seen.g, start + FETCH_MS)
  assert.equal(seen.t, start + LATE_MS)
})

// ---------- 2. Beeld via de eigen Bluesky-kaarten ----------
const card = (handle, uri, title, thumb, extra = {}) => ({ post: { author: { handle }, embed: { external: { uri, title, thumb } } }, ...extra })

test('cardsOf: alleen eigen posts van de uitgever, geen repost van een ander', () => {
  const feed = [
    card('washingtonpost.com', 'https://www.washingtonpost.com/world/2026/11/13/a/?utm_source=bluesky', 'A', 'https://cdn.bsky.app/a'),
    card('iemand.bsky.social', 'https://www.washingtonpost.com/world/2026/11/13/b/', 'B', 'https://cdn.bsky.app/b', { reason: { $type: 'app.bsky.feed.defs#reasonRepost' } }),
    card('iemand.bsky.social', 'https://example.com/c', 'C', 'https://cdn.bsky.app/c'),
    { post: { author: { handle: 'washingtonpost.com' }, embed: { external: { uri: 'https://x', title: 'zonder beeld' } } } },
  ]
  assert.deepEqual(cardsOf(feed, 'washingtonpost.com').map((c) => c.title), ['A'])
})

test('loadBskyCards: meer pagina\'s met de cursor, de eerlijke UA, en wat binnen is telt', async () => {
  const calls = []
  const fetchImpl = async (url, opts) => {
    calls.push([url, opts.headers['User-Agent']])
    const page = calls.length
    if (page === 3) throw new Error('afgebroken')
    return Response.json({ feed: [card('washingtonpost.com', `https://www.washingtonpost.com/p${page}/`, 'Kop ' + page, 'https://cdn.bsky.app/' + page)], cursor: 'c' + page })
  }
  const cards = await loadBskyCards('washingtonpost.com', { pages: 3, fetchImpl })
  assert.deepEqual(cards.map((c) => c.uri), ['https://www.washingtonpost.com/p1/', 'https://www.washingtonpost.com/p2/'])
  assert.match(calls[1][0], /cursor=c1/)
  assert.match(calls[0][1], /^HootReader\//)
  assert.equal((await loadBskyCards('x', { fetchImpl: async () => new Response('', { status: 500 }) })).length, 0)
})

test('matchCard: eerst op de link (zonder utm), dan op de kop; een rubriek als "Column | " telt niet mee', () => {
  const cards = [
    { title: 'Iets heel anders', thumb: 'https://cdn.bsky.app/link', uri: 'https://www.washingtonpost.com/world/2026/11/13/ukraine-critic-injured/?utm_campaign=wp_main&utm_source=bluesky' },
    { title: 'Column | How to protect your brain from AI chatbots', thumb: 'https://cdn.bsky.app/col', uri: 'https://wapo.st/abc' },
  ]
  assert.equal(matchCard('Ukraine critic injured in Moscow car bombing', cards, 'https://www.washingtonpost.com/world/2026/11/13/ukraine-critic-injured/')?.thumb, 'https://cdn.bsky.app/link')
  assert.equal(matchCard('How to protect your brain from AI chatbots', cards, 'https://www.washingtonpost.com/technology/2026/11/10/x/')?.thumb, 'https://cdn.bsky.app/col')
  assert.equal(matchCard('Senate passes the budget after a long night', cards, 'https://www.washingtonpost.com/politics/2026/11/13/budget/'), null)
})

test('imagesFromBluesky: één keer per uitgever, beeld van de eigen kaart, onthouden per artikel', async () => {
  const sources = [
    { id: 'wapo', bsky: 'washingtonpost.com', bskyImages: true },
    { id: 'wapo-politics', bsky: 'washingtonpost.com', bskyImages: true },
    { id: 'nyt', bsky: 'nytimes.com' },
  ]
  const art = (id, source, url, title, image = null) => ({ id, kind: 'article', source, url, title, image })
  const items = [
    art('1', 'wapo', 'https://www.washingtonpost.com/world/2026/11/13/a/', 'A world story'),
    art('2', 'wapo-politics', 'https://www.washingtonpost.com/politics/2026/11/13/b/', 'A politics story'),
    art('3', 'wapo-politics', 'https://www.washingtonpost.com/politics/2026/11/13/c/', 'Not on Bluesky'),
    art('4', 'nyt', 'https://www.nytimes.com/x', 'Geen bskyImages'),
  ]
  const loads = []
  const load = async (h, opts) => (loads.push([h, opts.pages]), [
    { title: 'x', thumb: 'https://cdn.bsky.app/a', uri: 'https://www.washingtonpost.com/world/2026/11/13/a/?utm_source=bluesky' },
    { title: 'y', thumb: 'https://cdn.bsky.app/b', uri: 'https://www.washingtonpost.com/politics/2026/11/13/b/' },
  ])
  const kv = memory()
  const cache = (_k, _ttl, fn) => fn()
  const now = Date.now()
  assert.equal(await imagesFromBluesky(items, now, { sources, load, get: kv.get, set: kv.set, cache }), 2)
  assert.deepEqual(loads, [['washingtonpost.com', 2]], 'één keer voor twee bronnen van één uitgever')
  assert.deepEqual(items.map((i) => i.image), ['https://cdn.bsky.app/a', 'https://cdn.bsky.app/b', null, null])
  assert.equal(Object.keys(kv.m.get(BSKY_IMAGES_KEY)).length, 2)
  // Later is de post uit de laatste pagina's gezakt: het onthouden beeld blijft.
  const again = [art('1', 'wapo', 'https://www.washingtonpost.com/world/2026/11/13/a/', 'A world story')]
  await imagesFromBluesky(again, now + 6e5, { sources, load: async () => [], get: kv.get, set: kv.set, cache })
  assert.equal(again[0].image, 'https://cdn.bsky.app/a')
  // Een stuk mét beeld blijft zoals het is, en een bron zonder bskyImages doet niet mee.
  const eigen = [art('5', 'wapo', 'https://www.washingtonpost.com/world/2026/11/13/a/', 'A', 'https://eigen/beeld.jpg')]
  await imagesFromBluesky(eigen, now, { sources, load, get: kv.get, set: kv.set, cache })
  assert.equal(eigen[0].image, 'https://eigen/beeld.jpg')
})

// ---------- 3. De bronnen ----------
test('The Washington Post: World en Politics, één uitgever, Internationaal, Engels, Amerikaans, betaald zonder inlog', () => {
  for (const id of WAPO) {
    const s = byId.get(id)
    assert.ok(s, id)
    assert.equal(s.cat, 'int', id)
    assert.equal(s.lang, 'en', id)
    assert.equal(s.paid, true, id)
    assert.equal(s.login, undefined, id + ': de inlogpagina antwoordt niet met de eigen UA')
    assert.equal(publisherOf(id), 'wapo', id)
    assert.equal(publisherCountry(id), 'US', id)
    assert.ok(!opinieBron(id), id)
    for (const k of ['pick', 'base', 'for', 'forTopic', 'music']) assert.equal(s[k], undefined, `${id}.${k}`)
    assert.ok(!MAIN_IDS.has(id) && !STARTER.some((g) => g.ids.includes(id)), id + ': voor niemand ongevraagd aan')
    assert.equal(s.urls.length, 1, id + ': een eigen feed, geen terugvaller')
    assert.equal(new URL(s.urls[0]).hostname, 'feeds.washingtonpost.com', id)
    assert.equal(slowSource(s), true, id)
    assert.ok(feedTimeout(s) >= 12000, id + ': ruim boven de gemeten 8 tot 10,5 s')
    assert.equal(s.bskyImages, true, id)
    assert.equal(s.bsky, 'washingtonpost.com', id)
    assert.equal(wantsArticleImage({ kind: 'article', url: 'https://www.washingtonpost.com/x/', title: 'x' }, s), false, id + ': geen og:image, de site weigert de eigen UA')
    readFileSync(new URL(`../landing/bronnen/${id}.webp`, import.meta.url))
  }
  assert.notEqual(byId.get('wapo').urls[0], byId.get('wapo-politics').urls[0])
  const int = followGroups(SOURCES).find((g) => g.cat === 'int')
  for (const id of WAPO) assert.ok(int.sources.some((s) => s.id === id), id)
})

test('WaPo telt als één uitgever en valt onder de landenregel', () => {
  assert.equal(coverageOf([{ source: 'wapo' }, { source: 'wapo-politics' }]).publisherCount, 1)
  assert.equal(coverageOf([{ source: 'wapo' }, { source: 'wapo-politics' }, { source: 'nyt' }]).publisherCount, 2)
  const us = [...new Set(SOURCES.filter((s) => publisherCountry(s.id) === 'US').map((s) => s.id))]
  assert.ok(us.includes('wapo') && us.includes('wapo-politics'))
  assert.equal(coverageOf(us.map((source) => ({ source }))).publisherCount, COUNTRY_MAX, 'alle Amerikaanse bronnen samen: hooguit COUNTRY_MAX')
  for (const source of WAPO) assert.equal(internationalNews([{ id: source, source, title: 'Senate Democrats pick a new leader', summary: 'The vote was close.', topics: [] }]), true, source)
})

test('de logobanner op de landing: WaPo erbij, onder de 40 titels', () => {
  const src = readFileSync(new URL('../landing/build.mjs', import.meta.url), 'utf8')
  const rij = src.match(/const RIJ = \[([^\]]*)\]/)[1].match(/'([^']+)'/g).map((x) => x.slice(1, -1))
  assert.ok(rij.includes('wapo'))
  assert.ok(!rij.includes('wapo-politics'), 'elk merk één keer')
  assert.ok(rij.length < 40, String(rij.length))
})
