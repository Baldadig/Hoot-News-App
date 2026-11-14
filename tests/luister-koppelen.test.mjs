// Luister verder, stap 2 (besluit Alex 14 november 2026): stil koppelen. "Het onderwerp moet echt matchen. Of hetzelfde,
// of verdiepend. Liefst van dezelfde bron." De toetsen houden de algemene regels vast, met echte verhalen en echte
// afleveringen van 14 november (tests/fixtures/luister-2026-11-14.json):
//   1. goede koppelingen: een artikellink van dezelfde uitgever (The Intelligence bij The Economist), en hetzelfde op tekst
//      (VI ZSM bij Oranje-Griekenland, 7-0);
//   2. verdiepend: The Daily over het vertrek van Jensen Huang, twee dagen oud, bij het grote Nvidia-verhaal;
//   3. valse kandidaten vallen af: één gedeelde naam (Netflix, Mississippi, Oranje, Jetten), een overzicht, een weekshow
//      of een show met meer onderwerpen zonder artikellink, een artikellink zonder gedeelde naam in de titel;
//   4. één aflevering bij twee verhalen: geen van beide; versheid; taal volgt de bronkeuze;
//   5. ophalen: alleen het begin van de feed, hooguit eens per half uur, drie dagen bewaren, nooit de audio;
//   6. zichtbaar sinds stap 3: zie tests/luister-zichtbaar.test.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SHOWS, SHOW, FETCHED, koppel, episodeOf, readHead, loadEpisodes, luisterRonde, urlKey, cleanTitle, withProef, proefEntry, EVERY, KEEP, PROEF_KEY, STORE_KEY } from '../netlify/lib/luister.mjs'
import { SOURCES, MAIN_IDS } from '../netlify/lib/sources.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const NOW = Date.parse(FIX.now)
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const leadTitle = (st) => byId.get(st.leadId)?.title || ''
const story = (re) => FIX.stories.find((st) => re.test(leadTitle(st)))
const ep = (re) => FIX.episodes.find((e) => re.test(e.titel))
const run = (opts = {}) => koppel({ stories: FIX.stories, byId, episodes: FIX.episodes, now: NOW, mainIds: MAIN_IDS, ...opts })

test('de showlijst: officiële shows van bronnen die al in Hoot staan, elk met een soort; overzichten worden niet opgehaald', () => {
  const ids = new Set(SOURCES.map((s) => s.id))
  for (const s of SHOWS) {
    assert.ok(ids.has(s.bron), `${s.naam}: bron ${s.bron} staat in de catalogus`)
    assert.ok(['verdieping', 'meer', 'week', 'overzicht'].includes(s.soort), s.naam)
    assert.ok(['nl', 'en'].includes(s.taal), s.naam)
    assert.match(s.apple, /^\d+$/, s.naam)
    if (s.soort !== 'overzicht') assert.match(s.feed, /^https:\/\//, s.naam)
    assert.ok(!s.opinie, `${s.naam}: geen opiniepodcast in de eerste lijst`)
  }
  assert.ok(FETCHED.every((s) => s.soort !== 'overzicht'))
  for (const id of ['nos-oog-op-morgen', 'bbc-global-news', 'ft-news-briefing', 'tijd-de-7', 'npr-up-first']) assert.equal(SHOW.get(id).soort, 'overzicht', id)
  for (const id of ['nrc-haagse-zaken', 'nrc-wereldzaken', 'trouw-haags-halfuurtje']) assert.equal(SHOW.get(id).soort, 'week', id)
})

test('goed: een artikellink van dezelfde uitgever (The Intelligence bij het Economist-verhaal), hetzelfde', () => {
  const { byStory } = run()
  const st = story(/toughest job in tech/)
  const l = byStory.get(st.id)
  assert.equal(l?.showId, 'the-intelligence')
  assert.equal(l.soort, 'hetzelfde')
  assert.equal(l.grond, 'link')
  assert.equal(l.dezelfdeUitgever, true)
  assert.match(l.aflevering, /Jensen Huang/)
  assert.equal(l.apple, 'https://podcasts.apple.com/nl/podcast/id1449631195')
  assert.match(l.link, /^https:\/\//)
  assert.equal(l.verschenen, '2026-11-13')
  assert.equal(l.alleenVolgers, true, 'Engelstalig: alleen voor wie The Economist volgt (de algemene lezer volgt hem)')
})

test('goed: hetzelfde op tekst, twee centrale namen en dezelfde gebeurtenis (VI ZSM bij Oranje-Griekenland)', () => {
  const { byStory } = run()
  const l = byStory.get(story(/Oranje dreigender/).id)
  assert.equal(l?.showId, 'vi-zsm')
  assert.equal(l.soort, 'hetzelfde')
  assert.equal(l.grond, 'tekst')
  assert.match(l.aflevering, /Galavoorstelling Oranje/)
  assert.ok(!('alleenVolgers' in l))
})

test('verdiepend: The Daily over het vertrek van Huang (twee dagen oud) bij het grote Nvidia-verhaal; ouder dan 36 uur is nooit "hetzelfde"', () => {
  const { byStory } = run()
  const l = byStory.get(story(/decline of the visionary/).id)
  assert.equal(l?.showId, 'the-daily')
  assert.equal(l.soort, 'verdiepend')
  assert.match(l.aflevering, /Jensen Huang’s Resignation/)
  // Today in Focus over hetzelfde schandaal staat erbij als andere geldige koppeling (Engels, alleen voor wie The Guardian volgt).
  assert.ok((l.andere || []).some((a) => a.showId === 'today-in-focus' && a.alleenVolgers))
  // Meer dan drie dagen later koppelt dezelfde aflevering niet meer.
  const later = run({ now: NOW + 2 * 864e5 }).byStory.get(story(/decline of the visionary/).id)
  assert.ok(!later || later.showId !== 'the-daily' || later.aflevering !== l.aflevering)
})

test('vals: één gedeelde naam is nooit genoeg (Netflix, Mississippi, Oranje, Jetten), ook niet met die naam in de titel', () => {
  const { byStory, rows } = run()
  const reason = (stRe, epRe) => rows.afgevallen.find((r) => stRe.test(r.kop || '') && epRe.test(r.aflevering))?.reden
  assert.ok(!byStory.has(story(/Planeswalker/).id), 'Joshua Wong, "Netflix star", hoort niet bij een Netflix-serie')
  // Sinds de keuring valt een kandidaat soms al eerder af, omdat de beschrijving met iets anders begint (Joshua Wong
  // begint met Nathan Law; de nabespreking van Oranje-Griekenland met de wedstrijd, niet met Oufkir).
  const nee = /één centrale naam|het eerste onderwerp van de aflevering is iets anders/
  assert.match(reason(/Planeswalker/, /Joshua Wong/), nee)
  assert.ok(!byStory.has(story(/Oufkir/).id), 'een Oranje-aflevering hoort niet bij elk Oranje-verhaal')
  assert.match(reason(/Oufkir/, /Galavoorstelling/), nee)
  assert.match(reason(/Crisisoverleg/, /Hoe premier Jetten/), /één centrale naam \(jetten\)/)
  assert.ok(!byStory.has(story(/Israel’s economy/).id), 'Nvidia en de Israëlische economie is een ander onderwerp')
  assert.ok(!byStory.has(story(/Trump, Xi and Putin/).id))
})

test('vals: zonder artikellink koppelen een weekshow en een show met meer onderwerpen nooit; een overzicht doet nooit mee', () => {
  const { rows } = run()
  assert.ok(rows.afgevallen.some((r) => /Haags Halfuurtje/.test(r.show) && r.reden === 'weekshow zonder artikellink'))
  assert.ok(rows.afgevallen.some((r) => /Vergecast/.test(r.show) && /meer onderwerpen per aflevering/.test(r.reden)))
  assert.ok(rows.afgevallen.some((r) => /FD Dagkoers/.test(r.show) && /meer onderwerpen per aflevering/.test(r.reden)))
  // Een aflevering van een overzichtsshow wordt niet eens beoordeeld.
  const overzicht = { ...ep(/Galavoorstelling/), id: 'eover', show: 'bbc-global-news' }
  const r = koppel({ stories: FIX.stories, byId, episodes: [overzicht], now: NOW, mainIds: MAIN_IDS })
  assert.equal(r.byStory.size, 0)
  assert.equal(r.rows.afgevallen.length, 0)
})

test('vals: een artikellink zonder gedeelde naam in de titel ("lees ook") koppelt niet', () => {
  // De Volkskrant: "Trump kiest de aanval na verpletterend verlies in midterms" linkt naar een stuk over de Senaatsrace in
  // Mississippi. Hang dat stuk aan het Colom-verhaal: de link klopt, maar de aflevering gaat over iets anders.
  const e = ep(/Trump kiest de aanval/)
  const st = story(/Scott Colom/)
  const extra = { id: 'vk-ms', kind: 'article', source: 'volkskrant', sourceName: 'de Volkskrant', title: 'Alle ogen op Mississippi, dat een ongekend spannende strijd om de Senaatszetel kent', url: 'https://www.volkskrant.nl/' + e.links.find((u) => u.includes('mississippi')).split('/').slice(1).join('/') + '/', publishedAt: '2026-11-11T09:00:00.000Z' }
  assert.ok(e.links.includes(urlKey(extra.url)))
  const items = new Map([...byId, [extra.id, extra]])
  const stories = [{ ...st, itemIds: [...st.itemIds, extra.id] }]
  const r = koppel({ stories, byId: items, episodes: [e], now: Date.parse('2026-11-12T12:00:00.000Z'), mainIds: MAIN_IDS })
  assert.equal(r.byStory.size, 0)
  assert.match(r.rows.afgevallen.find((x) => x.aflevering === e.titel)?.reden || '', /artikellink, maar geen gedeelde naam in de titel/)
})

test('één aflevering bij twee verhalen: geen van beide krijgt haar; een artikellink wijst wel één verhaal aan', () => {
  const st = story(/Oranje dreigender/)
  const twin = { ...st, id: st.id + '-twee' }
  const r = koppel({ stories: [st, twin], byId, episodes: [ep(/Galavoorstelling/)], now: NOW, mainIds: MAIN_IDS })
  assert.equal(r.byStory.size, 0)
  assert.equal(r.rows.afgevallen.filter((x) => /past bij 2 verhalen/.test(x.reden)).length, 2)
  // Met een artikellink alleen het verhaal met het gelinkte stuk, ook als een ander verhaal op tekst ook zou passen.
  const ec = story(/toughest job in tech/)
  const big = story(/decline of the visionary/)
  const r2 = koppel({ stories: [ec, big], byId, episodes: [ep(/Invidious position/)], now: NOW, mainIds: MAIN_IDS })
  assert.deepEqual([...r2.byStory.keys()], [ec.id])
})

test('versheid: hetzelfde hooguit 36 uur oud en niet meer dan 12 uur vóór het eerste stuk; verdiepend hooguit drie dagen', () => {
  const st = story(/Oranje dreigender/)
  const e = ep(/Galavoorstelling/)
  const items = st.itemIds.map((id) => byId.get(id)).filter(Boolean)
  const first = Math.min(...items.map((i) => Date.parse(i.publishedAt)))
  // Dezelfde aflevering, verschenen 13 uur vóór het eerste stuk: geen "hetzelfde".
  const vroeg = { ...e, id: 'evroeg', t: first - 13 * 36e5 }
  const r = koppel({ stories: [st], byId, episodes: [vroeg], now: first + 36e5, mainIds: MAIN_IDS })
  assert.notEqual(r.byStory.get(st.id)?.soort, 'hetzelfde')
  // Vier dagen oud: niets.
  const oud = koppel({ stories: [st], byId, episodes: [e], now: e.t + 4 * 864e5, mainIds: MAIN_IDS })
  assert.equal(oud.byStory.size, 0)
})

test('taal volgt de bronkeuze: een Engelse show van een bron die de algemene lezer niet volgt, alleen voor wie die bron volgt', () => {
  const { byStory, rows } = run()
  const l = byStory.get(story(/Scott Colom/).id)
  assert.equal(l?.showId, 'today-in-focus')
  assert.equal(l.alleenVolgers, true)
  assert.ok(!MAIN_IDS.has('guardian'))
  assert.equal(rows.koppelingen.find((k) => k.verhaal === story(/Scott Colom/).id).algemeen, false)
  // De Daily (NYT, een basisbron) is wel voor de algemene lezer.
  assert.equal(rows.koppelingen.find((k) => k.show === 'The Daily').algemeen, true)
})

test('voorrang: dezelfde uitgever als de kop gaat voor', () => {
  const st = story(/Crisisoverleg/)
  const cands = FIX.episodes.filter((e) => ['vk-elke-dag', 'nos-de-dag'].includes(e.show))
  const lead = byId.get(st.leadId)
  for (const src of ['volkskrant', 'nos']) {
    const items = new Map([...byId, [st.leadId, { ...lead, source: src }]])
    const l = koppel({ stories: [st], byId: items, episodes: cands, now: NOW, mainIds: MAIN_IDS }).byStory.get(st.id)
    if (l) assert.equal(l.bron, src, `kop van ${src}`)
  }
})

test('een aflevering uit de feed: titel zonder nummer of rubriek, geen audio als pagina, alleen de eigen show uit een gedeelde feed', () => {
  assert.equal(cleanTitle('12. Val in slowmotion of doorstart?'), 'Val in slowmotion of doorstart?')
  assert.equal(cleanTitle('Waar gaat deze politieke crisis nou echt over? | In Het Nieuws '), 'Waar gaat deze politieke crisis nou echt over?')
  assert.equal(cleanTitle('Why the Nvidia scandal is far from over – The Latest '), 'Why the Nvidia scandal is far from over')
  const it = { title: 'Hoe premier Jetten zijn kabinetscrisis (mis)managet', isoDate: '2026-11-13T13:56:00.000Z', guid: 'WO_NOS_20373439', link: 'https://podcast.npo.nl/file/de-dag/148149/x.mp3?a=1', content: '<p>Premier Jetten probeert een doorstart te maken. <a href="https://nos.nl/artikel/1-x">Lees</a></p>', enclosure: { url: 'https://podcast.npo.nl/file/x.mp3' }, itunes: { duration: '00:23:10' } }
  const e = episodeOf(SHOW.get('nos-de-dag'), it, 'https://www.nporadio1.nl/podcasts/de-dag')
  assert.equal(e.pagina, 'https://www.nporadio1.nl/podcasts/de-dag', 'nooit het mp3-adres')
  assert.equal(e.duur, 23 * 60 + 10)
  assert.deepEqual(e.links, ['nos.nl/artikel/1-x'])
  assert.ok(!JSON.stringify(e).includes('.mp3'), 'de enclosure wordt niet bewaard')
  // De FD-feed bevat ook andere FD-shows: alleen Dagkoers.
  const fd = SHOW.get('fd-dagkoers')
  assert.equal(episodeOf(fd, { title: 'Toegevoegde Waarde: Was Nvidia te afhankelijk?', isoDate: '2026-11-14T06:15:00.000Z', link: 'https://omny.fm/shows/fd-toegevoegde-waarde/x' }), null)
  assert.ok(episodeOf(fd, { title: 'Huwelijkscrisis bij coalitie & Nvidia', isoDate: '2026-11-13T04:00:00.000Z', link: 'https://omny.fm/shows/fd-dagkoers/huwelijkscrisis' }))
  assert.equal(urlKey('https://www.economist.com/business/2026/11/12/x?utm_campaign=a'), 'economist.com/business/2026/11/12/x')
})

const rss = (n) => `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title><link>https://example.org/show</link>${Array.from({ length: n }, (_, k) => `<item><title>Aflevering ${k}</title><pubDate>Fri, 13 Nov 2026 0${k % 10}:00:00 GMT</pubDate><guid>g${k}</guid><description>${'x'.repeat(400)}</description></item>`).join('')}</channel></rss>`
// Een antwoord in stukjes van 1 kB, zoals een echte verbinding; `sent` telt wat er gelezen is.
const fakeFetch = (body, sent = { n: 0 }) => async () => {
  const bytes = new TextEncoder().encode(body)
  let pos = 0
  return new Response(new ReadableStream({ pull(c) { if (pos >= bytes.length) return c.close(); const chunk = bytes.slice(pos, pos + 1024); pos += chunk.length; sent.n += chunk.length; c.enqueue(chunk) } }), { status: 200 })
}

test('ophalen: alleen het begin van een grote feed, afgekapt na de laatste hele aflevering', async () => {
  const sent = { n: 0 }
  const body = rss(200)
  const feed = await readHead('https://example.org/feed', { fetcher: fakeFetch(body, sent), maxBytes: 5000 })
  assert.ok(feed.items.length >= 5 && feed.items.length < 20, String(feed.items.length))
  assert.ok(sent.n < 8000 && body.length > 80000, `${sent.n} van ${body.length} bytes gelezen`)
  assert.equal(feed.link, 'https://example.org/show')
  const all = await readHead('https://example.org/feed', { fetcher: fakeFetch(rss(3)), maxBytes: 1e6 })
  assert.equal(all.items.length, 3)
})

test('ophalen: hooguit eens per half uur per feed, drie dagen bewaren, uit de opslag als de feed niet aan de beurt is', async () => {
  const now = Date.parse('2026-11-14T12:00:00.000Z')
  const kv = new Map()
  const calls = []
  const read = async (url) => (calls.push(url), { link: 'https://example.org/show', items: [{ title: 'Nieuw', isoDate: '2026-11-14T06:00:00.000Z', guid: 'n' }, { title: 'Oud', isoDate: '2026-11-10T06:00:00.000Z', guid: 'o' }] })
  const shows = [SHOW.get('nos-de-dag')]
  const a = await loadEpisodes({ now, get: (k) => kv.get(k), set: (k, v) => kv.set(k, v), read, shows })
  assert.deepEqual(a.episodes.map((e) => e.titel), ['Nieuw'], 'ouder dan drie dagen valt weg')
  assert.equal(a.status['nos-de-dag'], 'opgehaald')
  const b = await loadEpisodes({ now: now + EVERY - 6e4, get: (k) => kv.get(k), set: (k, v) => kv.set(k, v), read, shows })
  assert.equal(calls.length, 1, 'binnen het half uur niet opnieuw')
  assert.equal(b.status['nos-de-dag'], 'uit de opslag')
  assert.equal(b.episodes.length, 1)
  await loadEpisodes({ now: now + EVERY, get: (k) => kv.get(k), set: (k, v) => kv.set(k, v), read, shows })
  assert.equal(calls.length, 2)
  const c = await loadEpisodes({ now: now + KEEP, get: (k) => kv.get(k), set: (k, v) => kv.set(k, v), read: async () => { throw new Error('weg') }, shows })
  assert.equal(c.episodes.length, 0, 'na drie dagen is ook de opgeslagen aflevering weg')
  assert.match(c.status['nos-de-dag'], /^mislukt/)
  assert.ok(kv.has(STORE_KEY))
})

test('in de ronde: het veld luister op het verhaal en de proef per dagdeel, zonder persoonsgegevens of beschrijvingen', async () => {
  const stories = FIX.stories.map((st) => ({ ...st }))
  const kv = new Map()
  const n = await luisterRonde({ stories, byId, now: NOW, episodesP: Promise.resolve({ episodes: FIX.episodes, status: { 'vi-zsm': 'opgehaald' } }), slot: '2026-11-14-middag', mainIds: MAIN_IDS, update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) })
  assert.ok(n >= 3)
  assert.equal(stories.filter((st) => st.luister).length, n)
  const doc = kv.get(PROEF_KEY)
  assert.equal(doc.dagdelen[0].dagdeel, '2026-11-14-middag')
  assert.equal(doc.dagdelen[0].koppelingen.length, n)
  const text = JSON.stringify(doc)
  for (const e of FIX.episodes) if (e.samenvatting.length > 60) assert.ok(!text.includes(e.samenvatting.slice(0, 60)), 'geen beschrijving in de proef')
  // Een fout in het ophalen houdt de ronde niet op.
  assert.equal(await luisterRonde({ stories: [], byId, now: NOW, episodesP: Promise.reject(new Error('x')), slot: 's', mainIds: MAIN_IDS }), 0)
  // Hooguit negen dagdelen bewaard, nieuwste eerst.
  let d = null
  for (let k = 1; k <= 12; k++) d = withProef(d, proefEntry({ slot: `2026-11-${String(k).padStart(2, '0')}-ochtend`, now: NOW, rows: { koppelingen: [], afgevallen: [] }, status: {}, episodes: [] }))
  assert.equal(d.dagdelen.length, 9)
  assert.equal(d.dagdelen[0].dagdeel, '2026-11-12-ochtend')
})

// Stap 3 (14 november): niet meer onzichtbaar. De app toont het veld; het web alleen met de schakelaar.
// Zie tests/luister-zichtbaar.test.mjs.
