// Luister verder per aflevering (melding Alex, 15 november, build 58): de server zoekt bij elke koppeling het id van de
// aflevering op in Apple Podcasts (iTunes Lookup) en Spotify (de openbare showpagina), één keer per aflevering, binnen een
// korte tijd. Fixtures: echte antwoorden van 15 november, ingekort (geen beschrijvingen); geen netwerk in deze toets.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normTitel, zelfdeTitel, leesApple, matchApple, leesSpotify, matchSpotify, spotifyDatum, zoekIds, appleIdUit, IDS_KEY, RETRY_MS } from '../netlify/lib/luister-ids.mjs'
import { metIds, afleveringenVan, luisterRonde } from '../netlify/lib/luister.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-ids-2026-11-15.json', import.meta.url)))
const NOW = Date.parse('2026-11-15T09:00:00Z')
const NVIDIA = { id: 'e1', show: 'today-in-focus', titel: 'Why the Nvidia scandal is far from over – The Latest', t: Date.parse('2026-11-13T19:01:38Z'), guid: '6af71a618f084818e80d7231', apple: '1440133626', spotify: null }
const MISSISSIPPI = { id: 'e2', show: 'today-in-focus', titel: 'Mississippi makes history with Democrat Senate win - The Latest', t: Date.parse('2026-11-12T17:42:03Z'), guid: '6af5da8c8f080e830a3ef900', apple: '1440133626', spotify: null }
const JETTEN = { id: 'e3', show: 'nos-de-dag', titel: 'Hoe premier Jetten zijn kabinetscrisis (mis)managet', t: Date.parse('2026-11-13T13:56:00Z'), guid: null, apple: '1339219119', spotify: '2Oeh3L5u0y9R54jEz8Mgty' }

const nep = (calls = []) => async (url) => {
  calls.push(url)
  const a = /lookup\?id=(\d+)/.exec(url)
  if (a) return { ok: true, json: async () => FIX.apple[a[1]] }
  const s = /open\.spotify\.com\/show\/([A-Za-z0-9]+)/.exec(url)
  if (s && FIX.spotify[s[1]]) return { ok: true, text: async () => FIX.spotify[s[1]] }
  return { ok: false, status: 404 }
}

test('titels: normaliseren zonder accenten, leestekens, volgnummer of "The Latest"; bij twijfel niet gelijk', () => {
  assert.equal(normTitel("#583 - Avondje Hollandse school: 'Grote galavoorstelling van Oranje'"), 'avondje hollandse school grote galavoorstelling van oranje')
  assert.equal(normTitel('Why the Nvidia scandal is far from over – The Latest'), 'why the nvidia scandal is far from over')
  assert.ok(zelfdeTitel('Café-crisis in Den Haag', 'Cafe crisis in den Haag'))
  assert.ok(!zelfdeTitel('De VVD in crisis', 'De VVD in (kabinets)crisis'))
  assert.ok(!zelfdeTitel('Trump', 'Trump en de midterms: de grote overwinning'), 'een korte titel is nooit een staartje')
})

test('Apple: op guid, anders op titel + datum; precies de afleveringen van de koppelingen van 15 november', () => {
  const tif = leesApple(FIX.apple['1440133626'])
  assert.equal(matchApple(NVIDIA, tif), '1000801772144')
  assert.equal(matchApple(MISSISSIPPI, tif), '1000801559720')
  assert.equal(matchApple({ ...NVIDIA, guid: 'onbekend' }, tif), '1000801772144', 'zonder guid op titel + datum')
  assert.equal(matchApple({ ...NVIDIA, guid: null, t: NVIDIA.t + 5 * 864e5 }, tif), null, 'te ver uit elkaar: geen id')
  assert.equal(matchApple(JETTEN, leesApple(FIX.apple['1339219119'])), '1000801742880')
})

test('Spotify: de openbare showpagina geeft id, titel en datum; koppelen op titel + datum', () => {
  const lijst = leesSpotify(FIX.spotify['2Oeh3L5u0y9R54jEz8Mgty'], NOW)
  assert.ok(lijst.length >= 10)
  assert.ok(lijst.every((r) => /^[A-Za-z0-9]{22}$/.test(r.id)))
  assert.equal(matchSpotify(JETTEN, lijst), '2TfC4jQTneU8xeRoEB6V5o')
  assert.equal(matchSpotify({ ...JETTEN, titel: 'Een aflevering die er niet is' }, lijst), null)
  assert.equal(spotifyDatum('Nov 13', NOW), Date.UTC(2026, 10, 13, 12))
  assert.equal(spotifyDatum('Dec 30', NOW), Date.UTC(2025, 11, 30, 12), 'zonder jaar en in de toekomst: vorig jaar')
  assert.equal(spotifyDatum('Today', NOW), NOW)
  assert.ok(Number.isNaN(spotifyDatum('29 min', NOW)))
})

test('zoekIds: één keer per aflevering (opslag), een misser pas na RETRY_MS opnieuw, en nooit langer dan de tijdgrens', async () => {
  const kv = new Map()
  const get = (k) => kv.get(k)
  const update = (k, fn) => kv.set(k, fn(kv.get(k) ?? null))
  const calls = []
  const r = await zoekIds([NVIDIA, JETTEN], { get, update, now: NOW, fetcher: nep(calls) })
  assert.deepEqual(r.get('e1'), { apple: '1000801772144' })
  assert.deepEqual(r.get('e3'), { apple: '1000801742880', spotify: '2TfC4jQTneU8xeRoEB6V5o' })
  assert.equal(calls.length, 3, 'twee Apple-shows en één Spotify-show')
  assert.ok(kv.get(IDS_KEY).e.e1)
  const nogeens = []
  const r2 = await zoekIds([NVIDIA, JETTEN], { get, update, now: NOW + 6e5, fetcher: nep(nogeens) })
  assert.equal(nogeens.length, 0, 'uit de opslag')
  assert.deepEqual(r2.get('e3'), r.get('e3'))
  // Een misser (geen Spotify-id) wacht RETRY_MS.
  const mis = { ...JETTEN, id: 'e9', titel: 'Bestaat niet' }
  await zoekIds([mis], { get, update, now: NOW, fetcher: nep() })
  const binnen = []
  await zoekIds([mis], { get, update, now: NOW + 6e5, fetcher: nep(binnen) })
  assert.equal(binnen.length, 0)
  const later = []
  await zoekIds([mis], { get, update, now: NOW + RETRY_MS, fetcher: nep(later) })
  assert.equal(later.length, 2)
  // Een hangend antwoord: na de tijdgrens zonder id, de aflevering houdt de link naar de show.
  const t0 = Date.now()
  const hang = await zoekIds([{ ...NVIDIA, id: 'h1' }], { ms: 100, fetcher: () => new Promise(() => {}) })
  assert.ok(Date.now() - t0 < 1000)
  assert.deepEqual(hang.get('h1'), {})
  // Een bekende Apple-link met ?i= uit de grote lookup: niet nog eens opzoeken.
  const al = []
  const r3 = await zoekIds([{ ...NVIDIA, id: 'a1', appleUrl: 'https://podcasts.apple.com/nl/podcast/x/id1440133626?i=1000801772144' }], { fetcher: nep(al) })
  assert.equal(al.length, 0)
  assert.equal(r3.get('a1').apple, '1000801772144')
})

test('het veld luister: apple en spotify wijzen naar de aflevering (ook voor oude builds), met appleEpisode en spotifyEpisode', () => {
  const episodes = [{ ...JETTEN, id: 'e3' }]
  const l = { show: 'De Dag', showId: 'nos-de-dag', aflevering: JETTEN.titel, tijd: new Date(JETTEN.t).toISOString(), link: 'https://www.nporadio1.nl/podcasts/de-dag', apple: 'https://podcasts.apple.com/nl/podcast/id1339219119', spotify: 'https://open.spotify.com/show/2Oeh3L5u0y9R54jEz8Mgty' }
  const byStory = new Map([['s1', l]])
  assert.deepEqual(afleveringenVan(byStory, episodes).map((e) => e.id), ['e3'])
  metIds(byStory, episodes, new Map([['e3', { apple: '1000801742880', spotify: '2TfC4jQTneU8xeRoEB6V5o' }]]))
  assert.equal(l.apple, 'https://podcasts.apple.com/nl/podcast/id1339219119?i=1000801742880')
  assert.equal(appleIdUit(l.apple), '1000801742880')
  assert.equal(l.appleEpisode, '1000801742880')
  assert.equal(l.spotify, 'https://open.spotify.com/episode/2TfC4jQTneU8xeRoEB6V5o')
  assert.equal(l.spotifyEpisode, '2TfC4jQTneU8xeRoEB6V5o')
  // Zonder id: de show, zoals voorheen.
  const m = { ...l, apple: 'https://podcasts.apple.com/nl/podcast/id1339219119', spotify: 'https://open.spotify.com/show/2Oeh3L5u0y9R54jEz8Mgty', appleEpisode: undefined, spotifyEpisode: undefined }
  metIds(new Map([['s', m]]), episodes, new Map([['e3', {}]]))
  assert.equal(m.spotify, 'https://open.spotify.com/show/2Oeh3L5u0y9R54jEz8Mgty')
  assert.equal(m.appleEpisode, undefined)
})

test('luisterRonde: zonder koppelingen geen opzoeking; zonder `ids` (toetsen) nooit netwerk', async () => {
  let gevraagd = 0
  const n = await luisterRonde({ stories: [{ id: 's1' }], byId: new Map(), now: NOW, episodesP: Promise.resolve({ episodes: [] }), slot: null, mainIds: new Set(), ids: () => { gevraagd++; throw new Error('stuk') } })
  assert.equal(n, 0)
  assert.equal(gevraagd, 0)
})
