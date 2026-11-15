// Luister verder, stap 3: de lijst om na te lopen. /api/luister-proef leest wat de ronde per dagdeel bewaarde
// (netlify/lib/luister.mjs, luisterRonde) en toont het als JSON of Markdown, zonder persoonsgegevens of beschrijvingen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { luisterRonde, PROEF_KEY } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { zoalsWoordregels } from './helpers/nep-oordeel.mjs'
import handler, { proef, asText, config } from '../netlify/functions/luister-proef.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))

test('de proef per dagdeel: koppelingen met soort en reden, afvallers met reden; als JSON en als Markdown', async () => {
  const kv = new Map()
  const stories = FIX.stories.map((st) => ({ ...st }))
  const client = zoalsWoordregels({ stories: FIX.stories, byId, episodes: FIX.episodes, now: Date.parse(FIX.now), mainIds: MAIN_IDS })
  await luisterRonde({ stories, byId, now: Date.parse(FIX.now), episodesP: Promise.resolve({ episodes: FIX.episodes, status: {} }), slot: '2026-11-14-middag', mainIds: MAIN_IDS, update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)), get: (k) => kv.get(k), client })
  const get = (k) => kv.get(k)
  const doc = await proef(null, get)
  const d = doc.dagdelen[0]
  assert.equal(d.dagdeel, '2026-11-14-middag')
  assert.ok(d.koppelingen.length >= 3 && d.koppelingen.every((k) => ['hetzelfde', 'verdiepend'].includes(k.soort) && k.reden && k.kop && k.aflevering))
  assert.ok(d.afgevallen.length > 0 && d.afgevallen.every((a) => a.reden))
  const md = asText(doc)
  assert.match(md, /## 2026-11-14-middag/)
  assert.match(md, /Afgevallen:/)
  assert.deepEqual((await proef('2026-11-14-ochtend', get)).dagdelen, [])
  assert.deepEqual((await proef(null, async () => { throw new Error('kv weg') })).dagdelen, [])
  assert.ok(kv.has(PROEF_KEY))
})

test('het endpoint: alleen GET, op /api/luister-proef, nooit in de cache', async () => {
  assert.equal(config.path, '/api/luister-proef')
  const post = await handler(new Request('https://gethoot.app/api/luister-proef', { method: 'POST' }))
  assert.equal(post.status, 405)
})

// Onderzoek live proef 2026-11-15-ochtend: de kolom Oordeel toonde "undefined, één onderwerp ja, zeker ja". De tekst las
// nog het veld `zaak` van een oude vorm van het oordeel; het oordeel heet nu soort, vooruitblikOpVoorbij,
// opgenomenVoorDitNieuws, eenOnderwerp en zeker.
test('de kolom Oordeel: soort en alle velden, nooit "undefined"', async () => {
  const { oordeelTekst } = await import('../netlify/functions/luister-proef.mjs')
  const o = { soort: 'verdieping', vooruitblikOpVoorbij: 'nee', opgenomenVoorDitNieuws: 'nee', eenOnderwerp: 'ja', zeker: 'ja' }
  assert.equal(oordeelTekst(o), 'soort verdieping, vooruitblik op voorbij nee, opgenomen vóór dit nieuws nee, één onderwerp ja, zeker ja')
  assert.equal(oordeelTekst(null), 'geen')
  assert.doesNotMatch(oordeelTekst({ zaak: 'zelfde', eenOnderwerp: 'ja', zeker: 'ja' }), /undefined/)
  assert.match(oordeelTekst({ eenOnderwerp: 'ja' }), /soort onbekend/)
  const doc = { dagdelen: [{ dagdeel: '2026-11-15-ochtend', at: '2026-11-15T07:00:53.473Z', afleveringen: 1, koppelingen: [{ kop: 'K', show: 'S', aflevering: 'A', soort: 'verdiepend', oordeel: o, reden: 'r' }], afgevallen: [{ kop: 'K', show: 'S', aflevering: 'B', oordeel: { ...o, soort: 'anders' }, reden: 'r' }] }] }
  const md = asText(doc)
  assert.doesNotMatch(md, /undefined/)
  assert.match(md, /\| soort verdieping, vooruitblik op voorbij nee/)
  assert.match(md, /\| soort anders, /)
})

// Derde keuring van branch weekshow: de ronde vraagt het model niet meer zelf (wachtrij, eigen functie luister-oordeel). De
// proef toont wanneer het koppelen begon, hoeveel vragen in de wachtrij staan en de laatste ronde van De Redacteur met de
// begintijd en de tijd per aanroep.
test('de proef met de wachtrij: begintijd van het koppelen en de laatste ronde van De Redacteur, nooit "undefined"', () => {
  const oordeel = { model: 'claude-sonnet-5-5', kandidaten: 20, uitOpslag: 16, wachtrij: 4, koppelNaMs: 10400, redacteur: { inWachtrij: 11, gevraagd: 11, aanroepen: 11, beoordeeld: 10, invoerTokens: 44000, uitvoerTokens: 2200, begonNaMs: 900, timeoutMs: 16000, timeouts: 1 } }
  const md = asText({ dagdelen: [{ dagdeel: '2026-11-15-middag', at: '2026-11-15T12:00:00.000Z', afleveringen: 30, koppelingen: [], afgevallen: [], oordeel }] })
  assert.match(md, /4 vragen in de wachtrij voor De Redacteur, koppelen begon 10400 ms na de start van de ronde\./)
  assert.match(md, /Laatste ronde van De Redacteur: 11 vragen open, 11 gevraagd in 11 aanroepen, 10 beoordeeld, 44000 en 2200 tokens, begonnen 900 ms na de start, hooguit 16000 ms per aanroep, 1 niet op tijd\./)
  assert.doesNotMatch(md, /undefined/)
  // Zonder laatste ronde: alleen de wachtrij.
  const kaal = asText({ dagdelen: [{ dagdeel: 'x', at: '2026-11-15T12:00:00.000Z', afleveringen: 1, koppelingen: [], afgevallen: [], oordeel: { model: 'm', wachtrij: 0 } }] })
  assert.doesNotMatch(kaal, /undefined|Laatste ronde van De Redacteur/)
})
