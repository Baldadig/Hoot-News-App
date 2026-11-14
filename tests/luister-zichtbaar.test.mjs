// Luister verder, stap 3 (besluit Alex 14 november 2026, "Build de podcasts ook maar gelijk in de TestFlight build"):
// zichtbaar in de app, op het web achter een schakelaar die standaard uit staat.
//   1. de server: de cover van de show (van de uitgever), de Apple-link per aflevering (één lookup per ronde), Spotify
//      (de show), de tijd; de persoonlijke Editie geeft het veld mee;
//   2. de weergave (shared/luister-weergave.mjs, gelijk aan ios/Hoot/Luister.swift): welke aflevering, de regel zonder
//      kloktijd, wat een tik doet, de link per app;
//   3. het web: standaard uit, aan met HOOT_LUISTER_WEB=aan of lokaal; de keuze onthouden; Niet tonen toont niets.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SHOWS, SHOW, koppel, loadEpisodes, coverOf, appleUrl, appleLookup, STORE_KEY, EVERY } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { luisterWebAan as serverFlag } from '../netlify/lib/build.mjs'
import { composePersonal } from '../src/lib/personal.js'
import { afleveringen, dagVan, duurVan, regelVan, labelVan, linkVoor, bijTik, KEUZES, APPS, VRAAG, MAX_VERGELIJKEN } from '../shared/luister-weergave.mjs'
import { luisterWebAan, leesKeuze, bewaarKeuze, luisterLijst, LOCAL_FLAG } from '../src/lib/luister.js'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const NOW = Date.parse(FIX.now)
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const fakeStorage = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}

// ---------- 1. De server ----------
test('de cover van de show: itunes:image, anders <image>; alleen https van de uitgever', () => {
  assert.equal(coverOf({ itunes: { image: 'https://img.example.org/de-dag.jpg' }, image: { url: 'https://x.org/b.jpg' } }), 'https://img.example.org/de-dag.jpg')
  assert.equal(coverOf({ image: { url: 'https://x.org/b.jpg' } }), 'https://x.org/b.jpg')
  assert.equal(coverOf({ itunes: { image: 'http://x.org/a.jpg' } }), null, 'geen http')
  assert.equal(coverOf({ itunes: { image: 'javascript:alert(1)' } }), null)
  assert.equal(coverOf({}), null)
})

test('Apple Podcasts: één lookup voor alle shows, gekoppeld op de guid, zonder verwijsparameter', async () => {
  assert.equal(appleUrl('https://podcasts.apple.com/nl/podcast/x/id1339219119?i=1000801527057&uo=4'), 'https://podcasts.apple.com/nl/podcast/x/id1339219119?i=1000801527057')
  assert.equal(appleUrl('https://evil.example/podcast?i=1'), null)
  const calls = []
  const fetcher = async (url) => {
    calls.push(url)
    return {
      ok: true,
      json: async () => ({
        results: [
          { wrapperType: 'track', kind: 'podcast', collectionId: 1339219119, trackViewUrl: 'https://podcasts.apple.com/nl/podcast/de-dag/id1339219119?uo=4' },
          { wrapperType: 'podcastEpisode', collectionId: 1339219119, episodeGuid: 'WO_NOS_1', trackViewUrl: 'https://podcasts.apple.com/nl/podcast/a/id1339219119?i=1000801527057&uo=4' },
          { wrapperType: 'podcastEpisode', collectionId: 999, episodeGuid: 'x', trackViewUrl: 'https://podcasts.apple.com/nl/podcast/b/id999?i=1' },
        ],
      }),
    }
  }
  const out = await appleLookup([SHOW.get('nos-de-dag'), SHOW.get('the-daily')], { fetcher })
  assert.equal(calls.length, 1, 'één verzoek voor alle shows samen')
  assert.match(calls[0], /lookup\?id=1339219119,1200361736&entity=podcastEpisode/)
  assert.deepEqual(out, { 'nos-de-dag': { WO_NOS_1: 'https://podcasts.apple.com/nl/podcast/a/id1339219119?i=1000801527057' } })
})

test('ophalen: elke aflevering krijgt de cover van haar show en haar Apple-link; de lookup hooguit eens per half uur', async () => {
  const now = Date.parse('2026-11-14T12:00:00.000Z')
  const kv = new Map()
  const read = async () => ({ link: 'https://example.org/show', itunes: { image: 'https://img.example.org/de-dag.jpg' }, items: [{ title: 'Nieuw', isoDate: '2026-11-14T06:00:00.000Z', guid: 'WO_NOS_1' }, { title: 'Ander', isoDate: '2026-11-14T05:00:00.000Z', guid: 'WO_NOS_2' }] })
  let looked = 0
  const lookup = async () => (looked++, { 'nos-de-dag': { WO_NOS_1: 'https://podcasts.apple.com/nl/podcast/a/id1339219119?i=1' } })
  const opts = { get: (k) => kv.get(k), set: (k, v) => kv.set(k, v), read, shows: [SHOW.get('nos-de-dag')], lookup }
  const a = await loadEpisodes({ now, ...opts })
  const nieuw = a.episodes.find((e) => e.titel === 'Nieuw')
  assert.equal(nieuw.cover, 'https://img.example.org/de-dag.jpg')
  assert.equal(nieuw.appleUrl, 'https://podcasts.apple.com/nl/podcast/a/id1339219119?i=1')
  assert.equal(a.episodes.find((e) => e.titel === 'Ander').appleUrl, undefined, 'onbekend bij Apple: geen link per aflevering')
  assert.equal(a.status.apple, 'opgehaald')
  await loadEpisodes({ now: now + EVERY - 6e4, ...opts })
  assert.equal(looked, 1, 'binnen het half uur geen nieuwe lookup')
  // Een mislukte lookup houdt niets op: de afleveringen komen er gewoon.
  const kv2 = new Map()
  const b = await loadEpisodes({ now, ...opts, get: (k) => kv2.get(k), set: (k, v) => kv2.set(k, v), lookup: async () => { throw new Error('503') } })
  assert.equal(b.episodes.length, 2)
  assert.match(b.status.apple, /^mislukt/)
  assert.ok(kv2.has(STORE_KEY))
})

test('het veld luister: cover, Apple (aflevering of show), Spotify (show, of zoeken op de naam), tijd; nooit de audio', () => {
  const eps = FIX.episodes.map((e) => ({ ...e, cover: `https://img.example.org/${e.show}.jpg`, ...(e.show === 'the-economist' || e.show === 'the-intelligence' ? { appleUrl: 'https://podcasts.apple.com/nl/podcast/x/id1449631195?i=7' } : {}) }))
  const { byStory } = koppel({ stories: FIX.stories, byId, episodes: eps, now: NOW, mainIds: MAIN_IDS })
  assert.ok(byStory.size >= 3)
  for (const l of byStory.values()) {
    const show = SHOWS.find((s) => s.id === l.showId)
    assert.match(l.cover, /^https:\/\/img\.example\.org\//)
    assert.match(l.apple, /^https:\/\/podcasts\.apple\.com\//)
    assert.match(l.spotify, show.spotify ? new RegExp(`^https://open\\.spotify\\.com/show/${show.spotify}$`) : /^https:\/\/open\.spotify\.com\/search\//)
    assert.ok(Number.isFinite(Date.parse(l.tijd)))
    assert.ok(!/\.(mp3|m4a)/.test(JSON.stringify(l)), 'geen audio')
  }
  const intel = [...byStory.values()].find((l) => l.showId === 'the-intelligence')
  assert.equal(intel.apple, 'https://podcasts.apple.com/nl/podcast/x/id1449631195?i=7', 'de aflevering zelf als Apple haar kent')
})

test('de persoonlijke Editie geeft het veld luister mee (server en rekenkern op het toestel)', () => {
  const now = Date.parse('2026-11-02T05:00:00Z')
  const publishedAt = new Date(now).toISOString()
  const sources = [{ id: 'nos', name: 'NOS', cat: 'nl', lang: 'nl' }, { id: 'nyt', name: 'NYT', cat: 'int', lang: 'en' }, { id: 'guardian', name: 'Guardian', cat: 'int', lang: 'en' }]
  const chip = { id: 'chip', source: 'guardian', sourceName: 'Guardian', kind: 'article', title: 'TSMC expands semiconductor production in Taiwan', summary: 'The chipmaker is building a new factory.', topics: ['tech'], mainTopics: ['tech'], publishedAt, url: 'https://example.com/chips' }
  const luister = { show: 'The Daily', showId: 'the-daily', bron: 'nyt', aflevering: 'Chips', link: 'https://www.nytimes.com/x', tijd: publishedAt }
  const st = { id: 'chips', sourceCount: 3, publisherCount: 3, itemIds: ['chip'], desk: 'buitenland', latestAt: publishedAt, luister }
  const home = { id: 'home', kind: 'article', source: 'nos', title: 'Den Haag bouwt extra sociale huurwoningen', summary: 'De bouw gaat beginnen.', publishedAt }
  const global = { id: 'slot', builtAt: publishedAt, entries: [{ kind: 'item', id: 'home', desk: 'binnenland' }], items: [home], near: [{ storyId: 'chips', sourceCount: 3, item: chip }], wide: [] }
  const ed = composePersonal({ global, stories: [st], items: [home], sources, followed: new Set(['nos', 'nyt']), interests: ['tech'], now })
  const chosen = ed.entries.find((e) => e.kind === 'story' && e.id === 'chips')
  assert.ok(chosen)
  assert.deepEqual(chosen.luister, luister)
  assert.equal(ed.entries.find((e) => e.id === 'home').luister, undefined, 'een los bericht heeft geen aflevering')
  const core = readFileSync(new URL('../ios/Hoot/Resources/edition-core.js', import.meta.url), 'utf8')
  assert.ok(core.includes('?.luister'), 'de rekenkern op het toestel (build:core) geeft het ook mee')
})

// ---------- 2. De weergave ----------
const L = {
  show: 'De Dag', showId: 'nos-de-dag', bron: 'nos', aflevering: 'De VVD in (kabinets)crisis', duur: 1740, tijd: '2026-11-13T04:10:00.000Z', link: 'https://www.nporadio1.nl/podcasts/de-dag/1', apple: 'https://podcasts.apple.com/nl/podcast/x/id1339219119?i=1', spotify: 'https://open.spotify.com/show/2Oeh3L5u0y9R54jEz8Mgty', cover: 'https://img.example.org/de-dag.jpg',
  andere: [
    { show: 'Today in Focus', showId: 'today-in-focus', bron: 'guardian', alleenVolgers: true, aflevering: 'The crisis', tijd: '2026-11-12T04:10:00.000Z', link: 'https://www.theguardian.com/x' },
    { show: 'de Volkskrant Elke Dag', showId: 'vk-elke-dag', bron: 'volkskrant', aflevering: 'De kamer van Klok', duur: 1500, tijd: '2026-11-10T04:10:00.000Z', link: 'https://omny.fm/x' },
    { show: 'NRC Vandaag', showId: 'nrc-vandaag', bron: 'nrc', aflevering: 'Crisis', tijd: '2026-11-13T04:10:00.000Z', link: 'https://www.nrc.nl/x' },
  ],
}
test('welke aflevering: de volgorde van de server, een Engelse show alleen voor wie die bron volgt', () => {
  assert.deepEqual(afleveringen(L, () => false).map((a) => a.showId), ['nos-de-dag', 'vk-elke-dag', 'nrc-vandaag'])
  assert.deepEqual(afleveringen(L, (b) => b === 'guardian').map((a) => a.showId).slice(0, 2), ['nos-de-dag', 'today-in-focus'])
  assert.deepEqual(afleveringen({ ...L, alleenVolgers: true, bron: 'nyt' }, () => false).map((a) => a.showId), ['vk-elke-dag', 'nrc-vandaag'], 'ook de eerste valt weg als je de bron niet volgt')
  assert.deepEqual(afleveringen(null), [])
  assert.deepEqual(afleveringen({ show: 'x', aflevering: 'y', link: 'javascript:1' }), [], 'een kapot veld toont niets')
  assert.equal(MAX_VERGELIJKEN, 3)
})

test('de regel: "{show} · {dag} · {duur}", de dag in woorden, nooit een kloktijd', () => {
  const now = Date.parse('2026-11-14T15:00:00.000Z') // zaterdag
  assert.equal(regelVan(L, now), 'De Dag · gisteren · 29 min')
  assert.equal(dagVan({ tijd: '2026-11-14T06:00:00.000Z' }, now), 'vandaag')
  assert.equal(dagVan({ tijd: '2026-11-13T23:30:00.000Z' }, now), 'vandaag', 'na middernacht in Nederland is het vandaag')
  assert.equal(dagVan({ tijd: '2026-11-12T08:00:00.000Z' }, now), 'donderdag')
  assert.equal(dagVan({ verschenen: '2026-11-10' }, now), 'dinsdag')
  assert.equal(dagVan({ tijd: '2026-11-01T08:00:00.000Z' }, now), null)
  assert.equal(duurVan(1740), '29 min')
  assert.equal(duurVan(20), '1 min')
  assert.equal(duurVan(null), null)
  assert.equal(regelVan({ show: 'X', tijd: '2026-11-14T06:00:00.000Z' }, now), 'X · vandaag')
  assert.ok(!/\d{1,2}[:.]\d{2}/.test(regelVan(L, now)), 'geen kloktijd')
  assert.equal(labelVan(L, 'spotify', now), 'Luister verder, De Dag, gisteren, 29 minuten. Opent in Spotify.')
  assert.equal(labelVan(L, '', now), 'Luister verder, De Dag, gisteren, 29 minuten.')
})

test('wat een tik doet en welke link opent', () => {
  assert.deepEqual(bijTik('uit'), { niets: true })
  assert.deepEqual(bijTik('spotify'), { open: 'spotify' })
  assert.deepEqual(bijTik('vragen', ['apple', 'spotify']), { vraag: ['apple', 'spotify'] })
  assert.deepEqual(bijTik('', ['apple', 'spotify']), { vraag: ['apple', 'spotify'] }, 'eerste tik: de vraag')
  assert.deepEqual(bijTik('', ['spotify']), { open: 'spotify', onthoud: 'spotify' }, 'één app: niets vragen, die wordt je keuze')
  assert.deepEqual(bijTik('', []), { open: null }, 'geen app: de pagina van de uitgever')
  assert.equal(linkVoor(L, 'apple'), L.apple)
  assert.equal(linkVoor(L, 'spotify'), L.spotify)
  assert.equal(linkVoor(L, null), L.link)
  assert.equal(linkVoor({ ...L, apple: undefined }, 'apple'), L.link)
  assert.deepEqual(APPS.map((a) => a.naam), ['Apple Podcasts', 'Spotify'], 'Podimo nog niet (eerst een toesteltest)')
  assert.deepEqual(KEUZES.map((k) => k.naam), ['Apple Podcasts', 'Spotify', 'Altijd vragen', 'Niet tonen'])
  assert.deepEqual(VRAAG, { titel: 'Waar luister je podcasts?', tekst: 'Hoot onthoudt je keuze.' })
})

// ---------- 3. Het web ----------
test('het web: standaard uit; aan met HOOT_LUISTER_WEB=aan (meta.luisterWeb) of lokaal om eerst te bekijken', () => {
  assert.equal(serverFlag({}), false)
  assert.equal(serverFlag({ HOOT_LUISTER_WEB: 'uit' }), false)
  assert.equal(serverFlag({ HOOT_LUISTER_WEB: 'aan' }), true)
  const s = fakeStorage()
  assert.equal(luisterWebAan(undefined, s), false)
  assert.equal(luisterWebAan({ updatedAt: 'x' }, s), false)
  assert.equal(luisterWebAan({ luisterWeb: true }, s), true)
  s.setItem(LOCAL_FLAG, 'aan')
  assert.equal(luisterWebAan({}, s), true)
  const story = { id: 's', luister: L }
  assert.deepEqual(luisterLijst({ aan: false, keuze: 'spotify', story, volgt: () => true }), [], 'schakelaar uit: niets')
  assert.equal(luisterLijst({ aan: true, keuze: '', story, volgt: () => false }).length, 3)
  assert.deepEqual(luisterLijst({ aan: true, keuze: 'uit', story, volgt: () => true }), [], 'Niet tonen: niets')
  assert.deepEqual(luisterLijst({ aan: true, keuze: '', story: { id: 'x' }, volgt: () => true }), [], 'alleen met het veld luister')
})

test('het web: de keuze van de podcastapp blijft in deze browser', () => {
  const s = fakeStorage()
  assert.equal(leesKeuze(s), '')
  bewaarKeuze('spotify', s)
  assert.equal(leesKeuze(s), 'spotify')
  s.setItem('hoot.podcastApp', 'podimo')
  assert.equal(leesKeuze(s), '', 'een onbekende waarde telt als niet gekozen')
  bewaarKeuze('', s)
  assert.equal(s.getItem('hoot.podcastApp'), null)
})

test('het web toont luister alleen via de schakelaar: elke plek gaat langs luisterVoor (App.jsx, luisterLijst)', () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const files = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]))
  for (const f of files(join(root, 'src')).filter((f) => /\.(jsx?|mjs)$/.test(f))) {
    const src = readFileSync(f, 'utf8')
    if (/lib\/(personal|luister)\.js$/.test(f)) continue // de rekenkern geeft het veld door; luister.js is de schakelaar
    assert.ok(!/\.luister\b(?!\w)/.test(src.replace(/story\?\.luister/g, '')) || /App\.jsx$/.test(f), `${f} leest story.luister niet zelf`)
  }
  const app = readFileSync(join(root, 'src/App.jsx'), 'utf8')
  assert.match(app, /luisterLijst\(\{ aan: luisterAan/)
  assert.match(app, /luisterWebAan\(data\?\.meta\)/)
})
