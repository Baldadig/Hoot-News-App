// Luister verder: herstel na keuring 4 van branch shows (15 november). Zie Hoot-design/podcast-concept-2026-11-14/PROEF-4.md,
// "Keuring 4 van branch shows". Besluit Alex (14 november): een aflevering tot drie dagen oud mag als verdieping bij een
// verhaal van vandaag; het oordeel ligt bij De Redacteur, de woordregels zijn voorselectie en vangnet.
//   1. te streng: kopDeelt beslist alleen nog hard bij een mengverhaal; een verdieping van dezelfde lopende zaak gaat naar het
//      oordeel (De Dag "(mis)managet", een NRC-reconstructie, een Engelse verdieping met één naam bij een beschouwende kop);
//   2. te los: vooruitblikOpVoorbij is eenduidig in de vraag (elk moment dat bij de kop voorbij is; zie luister-tijd);
//   3. kosten: een dagplafond voor het oordeel, met de kosten van de dag in de opslag;
//   4. een "zelfde" van ruim vóór het eerste stuk wordt als verdieping getoetst (zie luister-tijd);
//   5. kopDeelt laat een kop niet meer door op één toevallig gedeeld gewoon woord ("terug").
// Geen echte AI: de nep-client.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { paren, vangnet, koppelMetOordeel, gewoneWoorden, vastVan, episodeOf, leesOpslag, schrijfOpslag, dagKostenVan, SHOW, OORDEEL_KEY, OORDEEL_DAG_USD, AANROEP_USD, MAX_AANROEPEN } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { nepClient, leesVraag, JA, NEE, VERDIEPING } from './helpers/nep-oordeel.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const NOW = Date.parse(FIX.now)
const H = 36e5
const CRISIS = FIX.stories.find((s) => s.id === 'sts2z5a') // kop "Crisisoverleg op landgoed begonnen: komen de partijen nader tot elkaar?"
const HUANG = FIX.stories.find((s) => s.id === 's1s3jyv9') // kop "Jensen Huang and the decline of the visionary showman founder CEO"
const memKv = () => {
  const kv = new Map()
  return { kv, get: (k) => kv.get(k), update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) }
}
let n = 0
const ep = (show, titel, tekst, uur) => ({ id: 'k4-' + ++n, show, titel, samenvatting: tekst.slice(0, 420), tekst, t: NOW - uur * H, links: [], pagina: 'https://example.org/k4/' + n })
const echt = (id) => FIX.episodes.find((e) => e.id === id)
const draai = async (story, e, beslis) => {
  const { get, update } = memKv()
  const client = nepClient(beslis)
  const r = await koppelMetOordeel({ stories: [story], byId, episodes: [e], now: NOW, mainIds: MAIN_IDS, client, get, update })
  return { r, client, c: paren({ stories: [story], byId, episodes: [e], now: NOW }).paren[0] }
}

// De goede verdiepingen uit keuring 4 (J1, J3 en J5 van rand.mjs): die vielen af op de kop voordat het model ze zag.
const MISMANAGET = echt('e1j97hpl') // De Dag: "Hoe premier Jetten zijn kabinetscrisis (mis)managet" (Alex' eigen voorbeeld)
const WANTROUWEN = ep('nrc-vandaag', 'Het diepe wantrouwen tussen VVD en D66', 'Het kabinet-Jetten wankelt. Achter de ruzie over het Belastingplan zit jarenlang wantrouwen tussen VVD en D66. Een reconstructie met parlementair verslaggever Mark Kranenburg.', 40)
const AFFAIRE = ep('today-in-focus', 'The affair that brought down Jensen Huang', 'Nvidia’s chief executive Jensen Huang resigned after revelations about his relationship with an alleged Chinese spy. Our technology reporter explains how it unfolded and what it means for Nvidia.', 30)

test('1. een verdieping van de lopende zaak gaat naar De Redacteur, en koppelt bij een ja (De Dag "(mis)managet", NRC, Today in Focus)', async () => {
  assert.match(MISMANAGET.titel, /\(mis\)managet/)
  for (const [story, e] of [[CRISIS, MISMANAGET], [CRISIS, WANTROUWEN], [HUANG, AFFAIRE]]) {
    const { r, client, c } = await draai(story, e, () => VERDIEPING)
    assert.ok(c, `${e.titel}: een kandidaat`)
    assert.ok(e.t < Date.parse(byId.get(story.leadId).publishedAt), 'ouder dan de kop')
    assert.equal(c.kop, true, `${e.titel}: geen mengverhaal`)
    assert.equal(vangnet(c, NOW), null, e.titel)
    assert.ok(client.calls.some((q) => leesVraag(q.messages[0].content).some((v) => v.titel === e.titel)), `${e.titel}: gevraagd`)
    const k = r.rows.koppelingen.find((k) => k.verhaal === story.id)
    assert.ok(k && k.aflevering === e.titel && k.soort === 'verdiepend', e.titel)
  }
  // En bij een nee van het model niet: het oordeel beslist, niet de kop.
  for (const [story, e] of [[CRISIS, MISMANAGET], [HUANG, AFFAIRE]]) assert.equal((await draai(story, e, () => NEE)).r.rows.koppelingen.length, 0)
})

test('1. een ander onderwerp met dezelfde partijen gaat ook naar het oordeel; alleen een nee van het model houdt het tegen', async () => {
  // Keuring 4, N4: de kop van het crisisverhaal noemt geen naam, dus de kop zegt niets over een mengverhaal. De Redacteur ziet
  // de kop en de aflevering en zegt "anders" (live in keuring 4 en Proef 2 bij stikstof en asiel).
  const asiel = ep('nos-de-dag', 'D66 en VVD botsen over de asielwet van Jetten', 'D66 en VVD liggen overhoop over de nieuwe asielwet. Minister Van Hijum wil de wet versoberen, D66 dwarsligt. Wat betekent dat voor asielzoekers?', 30)
  const { r, c } = await draai(CRISIS, asiel, (v) => (/asiel/i.test(v.titel) ? NEE : VERDIEPING))
  assert.ok(c)
  assert.equal(vangnet(c, NOW), null)
  assert.equal(r.rows.koppelingen.length, 0)
  assert.ok(r.rows.afgevallen.some((a) => a.aflevering === asiel.titel && /^oordeel: soort anders/.test(a.reden)))
})

// Het Lukaku-mengverhaal (luister-shows: de kop "Van Bommel heeft Lukaku terug voor duel met Italië, Frankrijk beschikt weer
// over Mbappé" bij de interlands van Oranje) met de echte afleveringen van de NOS Voetbalpodcast.
const F = JSON.parse(readFileSync(new URL('./fixtures/luister-shows-2026-11-14.json', import.meta.url), 'utf8'))
const EPS = Object.entries(F.rauw).flatMap(([id, f]) => {
  const vast = vastVan(f.items)
  return f.items.map((it) => episodeOf(SHOW.get(id), it, f.link, vast)).filter(Boolean).map((e) => ({ ...e, ...(vast.namen.length ? { vast: vast.namen } : {}) }))
})
const M = F.mengverhaal
const M_NOW = Date.parse(M.now)
const M_BY = new Map(M.items.map((i) => [i.id, i]))

test('1. een mengverhaal blijft hard: de kop over Lukaku en Mbappé krijgt de nabespreking van de 7-0 niet, ook niet bij een ja', async () => {
  const eps = EPS.filter((e) => e.t <= M_NOW)
  const p = paren({ stories: M.stories, byId: M_BY, episodes: eps, now: M_NOW })
  const c = p.paren.find((c) => /^#583/.test(c.e.titel))
  assert.ok(c, 'de nabespreking van de 7-0 is een kandidaat')
  assert.equal(c.kop, false)
  assert.match(vangnet(c, M_NOW), /^een mengverhaal/)
  const { get, update } = memKv()
  const client = nepClient(() => JA)
  const r = await koppelMetOordeel({ stories: M.stories, byId: M_BY, episodes: eps, now: M_NOW, mainIds: MAIN_IDS, client, get, update })
  assert.equal(r.byStory.size, 0)
  assert.ok(!client.calls.some((q) => leesVraag(q.messages[0].content).some((v) => /^#583/.test(v.titel))), 'niet eens gevraagd')
})

test('5. één toevallig gedeeld gewoon woord ("terug") maakt van een mengverhaal geen gedeelde gebeurtenis', () => {
  // #577 "FC Twente kampioenskandidaat, Weghorst terug in Oranje" deelt met de kop "Van Bommel heeft Lukaku terug …" alleen
  // het woord "terug". Hier vers gemaakt (anders valt hij al af op zijn leeftijd).
  const oud = EPS.find((e) => /^#577/.test(e.titel))
  assert.match(oud.titel, /terug/)
  assert.match(M_BY.get(M.stories[0].leadId).title, /terug/)
  const e = { ...oud, id: 'k4-577', t: M_NOW - 2 * H }
  const eps = [...EPS.filter((x) => x.t <= M_NOW && x.id !== oud.id), e]
  const c = paren({ stories: M.stories, byId: M_BY, episodes: eps, now: M_NOW }).paren.find((c) => c.e.id === e.id)
  assert.ok(c, 'een kandidaat')
  assert.equal(c.kop, false, 'een mengverhaal (het vangnet noemt hier eerst dat de aflevering meer onderwerpen heeft)')
  // De gewone woorden van de ronde: alleen tellen, geen woordenlijst.
  const gewoon = gewoneWoorden([...M.items.map((i) => i.title), ...eps.map((x) => `${x.titel}. ${x.tekst || ''}`)])
  assert.ok(gewoon.has('terug'))
  assert.ok(!gewoon.has('crisisoverleg'))
  assert.deepEqual([...gewoneWoorden(['Een woord', 'Een woord'])], [], 'minstens vijf teksten')
  assert.deepEqual([...gewoneWoorden(Array.from({ length: 6 }, () => 'Het crisisoverleg'))], ['crisisoverleg'])
})

test('5. een gedeeld kernwoord van zes letters of meer telt nog wel (crisisoverleg)', () => {
  const e = ep('nos-de-dag', 'Het crisisoverleg op het landgoed', 'D66, VVD en CDA praten op een landgoed over de toekomst van het kabinet. Een verslaggever duidt het crisisoverleg.', 2)
  const c = paren({ stories: [CRISIS], byId, episodes: [e], now: NOW }).paren[0]
  assert.ok(c)
  assert.equal(c.kop, true)
  assert.equal(vangnet(c, NOW), null)
})

// ---------- 3. het dagplafond ----------
const kandidatenVan = (stories) => paren({ stories, byId, episodes: FIX.episodes, now: NOW }).paren.filter((c) => !vangnet(c, NOW))
const dag = new Date(NOW).toLocaleDateString('en-CA', { timeZone: 'Europe/Amsterdam' })

test('3. het dagplafond: niet meer vragen dan er vandaag in het budget past; vol is vol, morgen opnieuw', async () => {
  assert.ok(OORDEEL_DAG_USD > 0 && OORDEEL_DAG_USD <= 5, 'een plafond in dollars per dag')
  assert.ok(AANROEP_USD >= 0.012, 'per vraag minstens wat keuring 4 mat ($0,012 tot $0,014)')
  assert.ok(kandidatenVan(FIX.stories).length > 3, 'genoeg kandidaten in de fixture')
  const ronde = async (k) => {
    const { kv, get, update } = memKv()
    if (k) kv.set(OORDEEL_KEY, { v: 1, o: {}, k })
    const client = nepClient(() => NEE)
    const r = await koppelMetOordeel({ stories: FIX.stories, byId, episodes: FIX.episodes, now: NOW, mainIds: MAIN_IDS, client, get, update })
    return { r, client, doc: kv.get(OORDEEL_KEY) }
  }
  // Vol: niets gevraagd, en de afvallers zeggen waarom.
  const vol = await ronde([dag, OORDEEL_DAG_USD])
  assert.equal(vol.client.calls.length, 0)
  assert.equal(vol.r.ai.plafond, true)
  assert.equal(vol.r.byStory.size, 0, 'een nieuw paar koppelt niet (nooit losser)')
  assert.ok(vol.r.rows.afgevallen.some((a) => /dagplafond/.test(a.reden)))
  // Bijna vol: precies zoveel vragen als er nog in passen.
  const bijna = await ronde([dag, OORDEEL_DAG_USD - 3 * AANROEP_USD])
  assert.equal(bijna.client.calls.length, 3)
  assert.equal(bijna.r.ai.plafond, true)
  // Een andere dag telt niet: de gewone grens per ronde.
  const gisteren = await ronde(['2026-11-13', OORDEEL_DAG_USD])
  assert.equal(gisteren.client.calls.length, Math.min(MAX_AANROEPEN, kandidatenVan(FIX.stories).length))
  assert.ok(!gisteren.r.ai.plafond)
  // De kosten van de ronde komen bij de dag in de opslag (en de oude dag valt weg).
  assert.equal(gisteren.doc.k[0], dag)
  assert.ok(gisteren.doc.k[1] > 0 && Math.abs(gisteren.doc.k[1] - gisteren.r.ai.kostenUsd) < 1e-3)
  assert.equal(gisteren.r.ai.dagKostenUsd, gisteren.doc.k[1])
  assert.equal(dagKostenVan(gisteren.doc, NOW), gisteren.doc.k[1])
})

test('3. het dagplafond: een vraag die niet op tijd was, telt als AANROEP_USD; de kosten lopen op over de rondes', async () => {
  const { kv, get, update } = memKv()
  const hangt = nepClient(() => JA, { hangt: true })
  const r = await koppelMetOordeel({ stories: FIX.stories, byId, episodes: FIX.episodes, now: NOW, mainIds: MAIN_IDS, client: hangt, get, update, timeoutMs: 30 })
  assert.ok(r.ai.timeouts >= 1)
  assert.ok(Math.abs(kv.get(OORDEEL_KEY).k[1] - r.ai.timeouts * AANROEP_USD) < 1e-6)
  // Optellen bij wat er staat; een rij van een andere dag begint opnieuw.
  assert.deepEqual(schrijfOpslag({ v: 1, o: {}, k: [dag, 1.5] }, { now: NOW, kosten: 0.25 }).k, [dag, 1.75])
  assert.deepEqual(schrijfOpslag({ v: 1, o: {}, k: ['2026-11-13', 2.9] }, { now: NOW, kosten: 0.25 }).k, [dag, 0.25])
  assert.equal(leesOpslag({ v: 1, o: {}, k: ['2026-11-13', 2.9] }, NOW).dagKosten, 0)
})
