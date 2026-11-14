// Luister verder: herstel na keuring 2 van branch shows (14 november, late avond). In vier van de vijf rondes kwam een
// aflevering van vóór het nieuws bij een verhaal in de algemene Editie. Besluit Alex: een vooruitblik op iets dat inmiddels
// gebeurd is, of een aflevering die zegt dat het nieuws pas na de opname kwam, koppelt niet aan dat nieuws.
// Twee lagen: het vangnet (TIJD en weekdagVooruit, voor een aflevering die ouder is dan de kop) en een eigen veld voor de
// tijd in het oordeel van De Redacteur (voorHetNieuws; alleen "nee" koppelt). Geen echte AI: de nep-client.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { paren, vangnet, koppelMetOordeel, describe, weekdagVooruit, oordeelPrompt, leesOordelen, codesVoor, leesOpslag, ja, OORDEEL_SCHEMA, OORDEEL_SYSTEM, OORDEEL_KEY, SHOW } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { nepClient, JA } from './helpers/nep-oordeel.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const NOW = Date.parse(FIX.now)
const H = 36e5
// Het crisisverhaal van de fixture: kop "Crisisoverleg op landgoed begonnen: komen de partijen nader tot elkaar?", in de
// algemene Editie. De kop past bij alle afleveringen hieronder.
const CRISIS = 'sts2z5a'
const EDITIE = { algemeen: new Set(['s1s3jyv9', CRISIS, 'srfd4fh']), pool: new Set(['sq11b7y']) }
const LEAD_AT = Date.parse(byId.get(FIX.stories.find((s) => s.id === CRISIS).leadId).publishedAt)
let n = 0
const ep = (show, titel, tekst, uur) => ({ id: 'tijd' + ++n, show, titel, samenvatting: tekst, tekst, t: NOW - uur * H, links: [], pagina: 'https://example.org/' + n })
// De drie afleveringen uit de keuring (rand2.mjs), letterlijk.
const VOORUIT = ep('nrc-vandaag', 'Crisisoverleg op landgoed: komen de partijen nader tot elkaar?', 'Vrijdag begint het crisisoverleg van D66, VVD en CDA op een landgoed. Komen de partijen nader tot elkaar, of valt het kabinet-Jetten? We bespreken de scenario’s voor het overleg.', 40)
const SINDS = ep('nos-de-dag', 'Het crisisoverleg op het landgoed', 'Waarom zitten D66, VVD en CDA op een landgoed? Sinds de opname van deze aflevering is het crisisoverleg op het landgoed begonnen. We leggen uit waar de partijen ruzie over hebben.', 20)
const INMIDDELS = ep('nos-de-dag', 'Crisisoverleg op landgoed: de inzet', 'Let op: deze aflevering maakten we woensdagavond. Inmiddels is het crisisoverleg op het landgoed begonnen. Wat willen D66, VVD en CDA bereiken?', 30)
// Een gewone verdieping van vóór de kop, zonder iets over haar tijd: die mag het model beoordelen.
const GEWOON = ep('nos-de-dag', 'Crisisoverleg op landgoed: waar gaat de ruzie over?', 'Waarom zitten D66, VVD en CDA op een landgoed bij elkaar? We leggen uit waar de partijen ruzie over hebben en wat er op het spel staat voor het kabinet-Jetten.', 6)
const opts = (episodes) => ({ stories: FIX.stories, byId, episodes, now: NOW, mainIds: MAIN_IDS, editie: EDITIE })
const memKv = () => {
  const kv = new Map()
  return { kv, get: (k) => kv.get(k), update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) }
}
const paar = (e) => paren(opts([e])).paren.find((c) => c.x.st.id === CRISIS && c.e.id === e.id)

test('de drie crisisafleveringen van vóór het nieuws: het vangnet sluit ze uit, ook als het model altijd ja zegt', async () => {
  assert.ok(VOORUIT.t < LEAD_AT && SINDS.t < LEAD_AT && INMIDDELS.t < LEAD_AT, 'alle drie ouder dan de kop')
  for (const [e, reden] of [[VOORUIT, /vooruitblik op vrijdag/], [SINDS, /na de opname|ouder dan de kop/], [INMIDDELS, /ouder dan de kop/]]) {
    const c = paar(e)
    assert.ok(c, `${e.titel}: een kandidaat bij het crisisverhaal (de kop past)`)
    assert.match(vangnet(c, NOW) || '', reden, e.titel)
  }
  const { get, update } = memKv()
  const client = nepClient(() => JA)
  const r = await koppelMetOordeel({ ...opts([VOORUIT, SINDS, INMIDDELS]), client, get, update })
  assert.equal(r.rows.koppelingen.length, 0, 'geen koppeling, ook niet als andere')
  assert.equal(r.byStory.size, 0)
  assert.equal(client.calls.length, 0, 'niet eens gevraagd')
})

test('het model beoordeelt de tijd apart: voorHetNieuws ja koppelt nooit, alleen nee', async () => {
  const c = paar(GEWOON)
  assert.ok(c && GEWOON.t < LEAD_AT)
  assert.equal(vangnet(c, NOW), null, 'een gewone verdieping van vóór de kop gaat door naar het model')
  const geval = async (o) => {
    const { get, update } = memKv()
    return (await koppelMetOordeel({ ...opts([GEWOON]), client: nepClient(() => o), get, update })).rows.koppelingen.length
  }
  assert.equal(await geval({ ...JA, zaak: 'verdieping' }), 1)
  assert.equal(await geval({ ...JA, zaak: 'verdieping', voorHetNieuws: 'ja' }), 0)
  assert.equal(await geval({ zaak: 'verdieping', eenOnderwerp: 'ja', zeker: 'ja' }), 0, 'zonder het veld: geen geldig oordeel')
  assert.equal(ja({ zaak: 'zelfde', eenOnderwerp: 'ja', zeker: 'ja' }), false)
  assert.equal(ja({ ...JA, voorHetNieuws: 'ja' }), false)
  assert.equal(ja(JA), true)
})

test('het schema en de vraag: een verplicht veld voor de tijd, met de tijd van de aflevering, de kop en het eerste stuk', () => {
  const p = OORDEEL_SCHEMA.properties.oordelen.items
  assert.deepEqual(p.properties.voorHetNieuws, { type: 'string', enum: ['ja', 'nee'] })
  assert.ok(p.required.includes('voorHetNieuws'))
  for (const s of ['voorHetNieuws', 'Vrijdag begint', 'sinds de opname', 'inmiddels', 'maakten we', 'since we recorded', 'ahead of', 'Bij twijfel: "ja"']) assert.ok(OORDEEL_SYSTEM.includes(s), s)
  const c = paar(GEWOON)
  const vraag = oordeelPrompt([c])
  assert.match(vraag, /^Kop verschenen: \d{4}-\d\d-\d\d \d\d:\d\d UTC$/m)
  assert.match(vraag, /verschenen: [^\n]*, \d+ uur (vóór|na) het eerste stuk$/m)
  // Een antwoord zonder of met een ongeldig voorHetNieuws telt niet.
  const codes = codesVoor([c])
  const een = (o) => leesOordelen(JSON.stringify({ oordelen: [{ nr: 1, code: codes[0], reden: 'x', ...o }] }), 1, codes)
  assert.equal(een({ zaak: 'zelfde', eenOnderwerp: 'ja', zeker: 'ja' }).size, 0)
  assert.equal(een({ ...JA, voorHetNieuws: 'misschien' }).size, 0)
  assert.equal(een(JA).get(1).voorHetNieuws, 'nee')
})

test('de opslag: v3 bewaart het veld voor de tijd; een oordeel zonder dat veld is nooit een ja', async () => {
  assert.equal(OORDEEL_KEY, 'luister-oordeel-v3')
  const { kv, get, update } = memKv()
  await koppelMetOordeel({ ...opts([GEWOON]), client: nepClient(() => ({ ...JA, zaak: 'verdieping' })), get, update })
  const rij = Object.values(kv.get(OORDEEL_KEY).o)[0]
  assert.equal(rij[5], 'nee')
  const { oordelen } = leesOpslag({ v: 1, o: { 'a|b': ['zelfde', 'ja', 'ja', 'oud', NOW] } }, NOW)
  assert.equal(ja(oordelen.get('a|b')), false)
  // Een opgeslagen oordeel zonder het veld (uit een oudere opslag): het paar koppelt niet.
  const oud = memKv()
  const key = `${CRISIS}|${GEWOON.id}`
  oud.kv.set(OORDEEL_KEY, { v: 1, o: { [key]: ['verdieping', 'ja', 'ja', 'oud', NOW] } })
  const r = await koppelMetOordeel({ ...opts([GEWOON]), client: nepClient(() => JA), get: oud.get, update: oud.update })
  assert.equal(r.rows.koppelingen.length, 0)
})

test('het vangnet: elk teken van tijd in een aflevering van vóór de kop', () => {
  const show = SHOW.get('nos-de-dag')
  const tijd = (tekst) => describe({ titel: 'Crisisoverleg', samenvatting: tekst, tekst }, show).tijd
  for (const z of [
    'Sinds de opname van deze aflevering is het overleg begonnen.',
    'Sinds we dit opnamen, is er veel gebeurd.',
    'Inmiddels is het crisisoverleg begonnen.',
    'Intussen is bekend dat het overleg begonnen is.',
    'Deze aflevering maakten we dinsdagmiddag.',
    'We namen deze aflevering woensdag op.',
    'Deze aflevering is opgenomen op woensdag.',
    'Note: this episode was recorded on Wednesday, ahead of the announcement.',
    'Since we recorded this episode, Huang has resigned.',
    'Huang has since resigned.',
    'In the meantime, the board met.',
  ]) assert.ok(tijd(z), z)
  // Geen teken van tijd: een gewone zin, en "opgenomen in" (het ziekenhuis, een lijst).
  for (const z of ['We leggen uit waar de partijen ruzie over hebben.', 'De minister werd opgenomen in het ziekenhuis.']) assert.equal(tijd(z), null, z)
})

test('een vooruitblik met een weekdag: alleen als die dag bij de kop al geweest is', () => {
  // De dag van de aflevering in Nederland en de dag van de kop (zaterdag 14 november).
  const op = (t, tekst) => weekdagVooruit({ t, titel: '', tekst }, LEAD_AT)
  const donderdag = Date.parse('2026-11-12T19:00:00Z')
  assert.match(op(donderdag, 'Vrijdag begint het crisisoverleg.'), /vrijdag/i)
  assert.match(op(donderdag, 'Zaterdag stemt de partijraad.'), /zaterdag/i)
  assert.match(op(donderdag, 'On Friday the board decides.'), /friday/i)
  assert.equal(op(donderdag, 'Maandag stemt de Kamer.'), null, 'maandag komt pas na de kop')
  assert.equal(op(donderdag, 'Vorige vrijdag zei Jetten nog van niet.'), null, 'kijkt terug')
  assert.equal(op(donderdag, 'Woensdagavond liep het overleg vast.'), null, 'woensdag was vóór de aflevering')
  assert.equal(op(donderdag, 'Donderdag werd bekend dat er overleg komt.'), null, 'de dag van de aflevering zelf')
  assert.equal(op(LEAD_AT + H, 'Vrijdag begint het crisisoverleg.'), null, 'een aflevering van na de kop')
})

test('een aflevering van ná de kop met "inmiddels" valt niet op het tijdteken af (zij kent het nieuws)', () => {
  const na = ep('nos-de-dag', 'Crisisoverleg op landgoed: waar gaat de ruzie over?', 'Inmiddels zitten D66, VVD en CDA op een landgoed bij elkaar. We leggen uit waar de partijen ruzie over hebben en wat er op het spel staat voor het kabinet-Jetten.', 0.5)
  assert.ok(na.t > LEAD_AT)
  const c = paar(na)
  assert.ok(c)
  assert.doesNotMatch(vangnet(c, NOW) || '', /ouder dan de kop/)
})
