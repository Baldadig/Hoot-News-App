// Melding 15 november (middag): na de deploy van 12:54Z (merges weekshow en podlink) stond er in /api/feed geen enkel
// veld `luister` meer. Gemeten in de functielogs: de ronde van 12:50 (oude deploy, opslag v6) "uit opslag 21, koppelingen
// 3"; de rondes van 13:00 (nieuwe deploy, opslag v7) "uit opslag 0 ... in de wachtrij 12, koppelingen 0"; de eigen functie
// van 12:55 vond een lege wachtrij, die van 13:05 beoordeelde de 12 vragen, pas de ronde van 13:10 koppelde weer. De
// oorzaak: de nieuwe sleutel OORDEEL_KEY v7 begon leeg, en in de wachtrij-modus koppelt de ronde alleen wat al een oordeel
// heeft. Nu gelden de oordelen van de vorige versie (OORDEEL_VORIGE) waar de vraag niet veranderd is.
// Deze toets draait de echte samengevoegde luisterRonde zoals build.mjs haar aanroept: wachtrij aan, ids aan, v7 leeg.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { luisterRonde, koppelMetOordeel, oordeelRonde, schrijfOpslag, paren, vangnet, paarKey, OORDEEL_KEY, OORDEEL_VORIGE, WACHTRIJ_KEY, PROEF_KEY, SHOW } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { nepClient, JA } from './helpers/nep-oordeel.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const NOW = Date.parse(FIX.now)
const OPTS = { stories: FIX.stories, byId, episodes: FIX.episodes, now: NOW, mainIds: MAIN_IDS }
const memKv = () => {
  const kv = new Map()
  return { kv, get: (k) => kv.get(k), update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) }
}
const kopie = (stories) => stories.map((st) => ({ ...st }))
const kandidaten = () => paren(OPTS).paren.filter((c) => !vangnet(c, NOW))
// De opslag van de vorige versie zoals de oude deploy hem schreef: een ja op elk paar.
const vorigeVol = (kosten = 0) => schrijfOpslag(null, { nieuw: new Map(kandidaten().map((c) => [paarKey(c), JA])), now: NOW - 6e5, kosten })

test('de sleutels horen bij elkaar: OORDEEL_VORIGE is de versie direct voor OORDEEL_KEY', () => {
  const v = (k) => Number(/^luister-oordeel-v(\d+)$/.exec(k)?.[1])
  assert.ok(v(OORDEEL_KEY) > 1)
  assert.equal(v(OORDEEL_VORIGE.key), v(OORDEEL_KEY) - 1, 'wie OORDEEL_KEY ophoogt, zet ook OORDEEL_VORIGE (en zegt welke oordelen nog gelden)')
  assert.equal(typeof OORDEEL_VORIGE.geldt, 'function')
})

test('na een deploy met een nieuwe opslag: de echte luisterRonde (wachtrij en ids) koppelt meteen met de oordelen van de vorige versie', async () => {
  // Zonder vorige opslag: de breuk van 15 november (geen koppeling, alles in de wachtrij).
  {
    const { kv, get, update } = memKv()
    const stories = kopie(FIX.stories)
    const n = await luisterRonde({ ...OPTS, stories, episodesP: Promise.resolve({ episodes: FIX.episodes, status: {} }), slot: '2026-11-14-middag', client: nepClient(() => JA), get, update, start: Date.now(), wachtrij: true, ids: async () => new Map() })
    assert.equal(n, 0, 'lege opslag zonder vorige versie: nog niets')
    assert.ok(kv.get(WACHTRIJ_KEY).vragen.length > 0)
  }
  // Met de opslag van v6 (de oude deploy) en een lege v7.
  const { kv, get, update } = memKv()
  kv.set(OORDEEL_VORIGE.key, vorigeVol(1.25))
  const client = nepClient(() => JA)
  const stories = kopie(FIX.stories)
  let idsGevraagd = null
  const ids = async (eps, o) => {
    idsGevraagd = eps
    assert.equal(typeof o.get, 'function', 'de opslag gaat mee naar zoekIds')
    return new Map(eps.map((e) => [e.id, { spotify: 'A'.repeat(22) }]))
  }
  const n = await luisterRonde({ ...OPTS, stories, episodesP: Promise.resolve({ episodes: FIX.episodes, status: {} }), slot: '2026-11-14-middag', client, get, update, start: Date.now(), wachtrij: true, ids })
  assert.equal(client.calls.length, 0, 'de ronde vraagt het model nog steeds niets')
  assert.ok(n > 0, 'meteen koppelingen, niet pas na de eigen functie')
  const met = stories.filter((st) => st.luister)
  assert.equal(met.length, n, 'het veld luister staat op de verhalen (wat /api/feed toont)')
  assert.ok(idsGevraagd?.length >= n, 'de ids per aflevering worden opgezocht')
  for (const st of met) {
    assert.equal(st.luister.spotifyEpisode, 'A'.repeat(22), 'de ids komen op de koppeling')
    assert.match(st.luister.spotify, /open\.spotify\.com\/episode\//)
  }
  // v8 (breder, 18 november): van de vorige versie geldt alleen een duidelijk ja (zeker ja); al het andere wacht op een
  // oordeel van de nieuwe versie. (Tot v7: een weekshow wachtte, de rest gold.)
  for (const st of met) for (const a of [st.luister, ...(st.luister.andere || [])]) {
    assert.ok(OORDEEL_VORIGE.geldt(SHOW.get(a.showId), JA), a.show)
    assert.equal(OORDEEL_VORIGE.geldt(SHOW.get(a.showId), { ...JA, zeker: 'nee' }), false, a.show)
    assert.equal(OORDEEL_VORIGE.geldt(SHOW.get(a.showId), { ...JA, soort: 'anders' }), false, a.show)
  }
  const proef = kv.get(PROEF_KEY).dagdelen[0]
  assert.equal(proef.koppelingen.length, n)
  assert.ok(proef.oordeel.uitVorige > 0, 'de proef zegt hoeveel oordelen uit de vorige versie kwamen')
  assert.equal(proef.oordeel.dagKostenUsd, 1.25, 'de kosten van vandaag uit de vorige opslag tellen mee')
  // Alleen paren zonder geldend oordeel gaan naar de wachtrij.
  const wacht = kv.get(WACHTRIJ_KEY).vragen.flatMap((v) => v.keys)
  const geldend = new Set(kandidaten().filter((c) => OORDEEL_VORIGE.geldt(c.show || SHOW.get(c.e.show), JA)).map(paarKey))
  assert.ok(wacht.every((k) => !geldend.has(k)), 'een paar met een geldend oud oordeel wordt niet opnieuw gevraagd')
  assert.equal(kv.get(OORDEEL_KEY), undefined, 'de nieuwe opslag blijft voor de nieuwe oordelen')
})

test('een oordeel van de nieuwe versie gaat voor; de vorige opslag niet te lezen kost niets', async () => {
  const c = kandidaten().find((c) => OORDEEL_VORIGE.geldt(c.show || SHOW.get(c.e.show), JA))
  assert.ok(c)
  const { kv, get, update } = memKv()
  kv.set(OORDEEL_VORIGE.key, vorigeVol())
  kv.set(OORDEEL_KEY, schrijfOpslag(null, { nieuw: new Map([[paarKey(c), { ...JA, soort: 'anders' }]]), now: NOW }))
  const r = await koppelMetOordeel({ ...OPTS, client: nepClient(() => JA), get, update, wachtrij: true })
  assert.ok(!r.rows.koppelingen.some((k) => k.verhaal === c.x.st.id && k.aflevering === c.e.titel), 'het nee van de nieuwe versie telt, niet het ja van de vorige')
  const stuk = (k) => (k === OORDEEL_VORIGE.key ? Promise.reject(new Error('stuk')) : kv.get(k))
  const r2 = await koppelMetOordeel({ ...OPTS, client: nepClient(() => JA), get: stuk, update, wachtrij: true })
  assert.ok(r2.ai.uitOpslag >= 1)
  assert.equal(r2.ai.uitVorige, undefined)
})

test('de eigen functie telt de kosten van vandaag uit de vorige opslag mee voor het dagplafond', async () => {
  const { kv, get, update } = memKv()
  kv.set(OORDEEL_VORIGE.key, vorigeVol(2.99))
  kv.set(WACHTRIJ_KEY, { v: 1, at: NOW, vragen: [{ prompt: 'x'.repeat(200), codes: ['a'], keys: ['s|e|l'] }] })
  const client = nepClient(() => JA)
  const { stats } = await oordeelRonde({ client, get, update, now: NOW })
  assert.equal(stats.dagKostenUsd, 2.99)
  assert.equal(stats.plafond, true)
  assert.equal(client.calls.length, 0)
})
