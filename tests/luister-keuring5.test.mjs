// Luister verder: herstel na keuring 5 van branch shows (15 november). Zie Hoot-design/podcast-concept-2026-11-14/PROEF-4.md,
// "Keuring 5 van branch shows". Het vangnet op de kop (kopDeelt) nam de eerste eigen naam van de kop als "waar de kop over
// gaat": vaak een plaats (Hilversum, De Zwaluwenberg) of de eerste uit een rijtje namen. Dan viel een verdieping af die De
// Redacteur in beide rondes "verdieping, zeker ja" gaf. Nu sluit het vangnet alleen hard uit als de aflevering geen enkele
// centrale naam van het verhaal noemt, of als de kop over iets buiten het verhaal gaat en de aflevering niets uit de kop
// noemt; een plaats telt niet als waar de kop over gaat. Besluit Alex (14 november): het oordeel ligt bij De Redacteur.
// Geen echte AI: de nep-client.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { paren, vangnet, koppelMetOordeel, kopPlaatsen, vastVan, episodeOf, SHOW } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { opinieBron } from '../shared/opinie.mjs'
import { nepClient, leesVraag, JA, NEE, VERDIEPING } from './helpers/nep-oordeel.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const NOW = Date.parse(FIX.now)
const H = 36e5
const CRISIS = FIX.stories.find((s) => s.id === 'sts2z5a')
const memKv = () => {
  const kv = new Map()
  return { kv, get: (k) => kv.get(k), update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) }
}
const echt = (id) => FIX.episodes.find((e) => e.id === id)
const NRC = echt('e7pcgqj') // NRC Vandaag: "Waar gaat deze politieke crisis nou echt over?"
const DAG = echt('e1j97hpl') // De Dag: "Hoe premier Jetten zijn kabinetscrisis (mis)managet"
// Het crisisverhaal met een ander echt stuk van die dag als kop (de kop-probe van keuring 5). P3 en P4 komen van een
// opiniebron (TPO, GeenStijl) die nooit de kop is (en in de probe van keuring 5 dus stil het eerste stuk als kop gaf): hier dezelfde kop
// van een gewone bron, zodat echt deze kop getoetst wordt. De kop van het verhaal is altijd de kop die de vraag noemt.
const KOPBY = new Map(byId)
const metKop = (titel) => {
  const lid = CRISIS.itemIds.find((id) => byId.get(id)?.title?.startsWith(titel))
  assert.ok(lid, `een echt stuk met de kop "${titel}"`)
  if (opinieBron(byId.get(lid).source)) KOPBY.set(lid, { ...byId.get(lid), source: 'nos', sourceName: 'NOS' })
  return { ...CRISIS, leadId: lid }
}
const paar = (story, e) => paren({ stories: [story], byId: KOPBY, episodes: [e], now: NOW }).paren[0]
const draai = async (story, e, beslis) => {
  const { get, update } = memKv()
  const client = nepClient(beslis)
  const r = await koppelMetOordeel({ stories: [story], byId: KOPBY, episodes: [e], now: NOW, mainIds: MAIN_IDS, client, get, update })
  return { r, client }
}
let n = 0
const ep = (show, titel, tekst, uur) => ({ id: 'k5-' + ++n, show, titel, samenvatting: tekst.slice(0, 420), tekst, t: NOW - uur * H, links: [], pagina: 'https://example.org/k5/' + n })

// P1 tot en met P4 uit keuring 5: bij alle vier zei De Redacteur buiten het vangnet om in beide rondes "verdieping, zeker ja".
const PROBE = [
  ['P1', 'Crisisoverleg D66, VVD en CDA in Hilversum, radiostilte afgesproken', DAG],
  ['P2', 'Jetten, Yeşilgöz en Van den Brink gearriveerd op De Zwaluwenberg', NRC],
  ['P3', 'Crisisoverleg Jetten sleept voort, ministerraad ligt stil', NRC],
  ['P4', 'VVD, D66 en CDA gaan puinruimen op De Zwaluwenberg', NRC],
]

test('P1 tot en met P4: de echte koppen van het crisisverhaal laten de verdieping door naar De Redacteur, en die koppelt bij een ja', async () => {
  for (const [p, kop, e] of PROBE) {
    const story = metKop(kop)
    const c = paar(story, e)
    assert.ok(c, `${p}: een kandidaat`)
    assert.equal(c.kop, true, `${p}: geen mengverhaal`)
    assert.equal(vangnet(c, NOW), null, `${p}: het vangnet laat hem door`)
    const { r, client } = await draai(story, e, () => VERDIEPING)
    assert.ok(client.calls.some((q) => leesVraag(q.messages[0].content).some((v) => v.titel === e.titel && v.kop === KOPBY.get(story.leadId).title)), `${p}: gevraagd met deze kop`)
    assert.ok(r.rows.koppelingen.every((k) => k.kop === KOPBY.get(story.leadId).title), `${p}: de kop is deze kop`)
    const k = r.rows.koppelingen.find((k) => k.verhaal === story.id)
    assert.ok(k && k.aflevering === e.titel && k.soort === 'verdiepend', `${p}: koppelt als verdieping`)
    // En bij een nee niet: het oordeel beslist.
    assert.equal((await draai(story, e, () => NEE)).r.rows.koppelingen.length, 0, `${p}: een nee houdt hem tegen`)
  }
})

test('over alle koppen van het crisisverhaal: NRC en De Dag zijn alleen een mengverhaal bij een kop over iemand buiten het verhaal', () => {
  // Keuring 5: NRC "Waar gaat ..." viel bij 8 van de 18 koppen af, De Dag "(mis)managet" bij 6. Nu alleen nog bij de kop over
  // Eelco Heinen: geen van zijn namen is een centrale naam van het verhaal en de afleveringen noemen Heinen niet (en daar
  // twijfelde het model zelf ook, P6).
  for (const e of [NRC, DAG]) {
    const meng = []
    for (const lid of CRISIS.itemIds) {
      const c = paar({ ...CRISIS, leadId: lid }, e)
      if (c && c.kop === false) meng.push(byId.get(lid).title)
    }
    assert.deepEqual(meng.map((t) => t.slice(0, 15)), ['Hoe Eelco Heine'], e.titel)
  }
})

test('een plaats in de kop telt niet als waar de kop over gaat (kopPlaatsen)', () => {
  assert.deepEqual([...kopPlaatsen('Crisisoverleg D66, VVD en CDA in Hilversum, radiostilte afgesproken')], ['hilversum'])
  assert.ok(kopPlaatsen('VVD, D66 en CDA gaan puinruimen op De Zwaluwenberg').has('zwaluwenberg'))
  assert.ok(kopPlaatsen('Kabinet vergadert in Den Haag over de begroting').has('haag'))
  assert.ok(kopPlaatsen('Trump ontvangt Xi at Mar-a-Lago').has('maralago'))
  assert.deepEqual([...kopPlaatsen('Van Bommel heeft Lukaku terug voor duel met Italië, Frankrijk beschikt weer over Mbappé')], [])
  assert.deepEqual([...kopPlaatsen('Jetten, Yeşilgöz en Van den Brink gearriveerd')], [])
  // Een kop met alleen een plaats buiten het verhaal: geen mengverhaal, het oordeel beslist.
  const story = metKop('Crisisoverleg op landgoed begonnen')
  const lead = byId.get(story.leadId)
  const plaatsKop = { ...lead, id: 'k5-plaats', title: 'Crisisoverleg op landgoed bij Wassenaar begonnen, nu ook in Hilversum' }
  const byId2 = new Map(byId).set(plaatsKop.id, plaatsKop)
  const st2 = { ...story, leadId: plaatsKop.id, itemIds: [plaatsKop.id, ...story.itemIds] }
  const c = paren({ stories: [st2], byId: byId2, episodes: [DAG], now: NOW }).paren[0]
  assert.ok(c)
  assert.equal(c.kop, true)
})

test('een ander onderwerp met dezelfde partijen (asiel, stikstof) gaat ook bij de koppen van P1 tot en met P4 naar het oordeel, en koppelt niet bij een nee', async () => {
  const asiel = ep('nos-de-dag', 'D66 en VVD botsen over de asielwet van Jetten', 'D66 en VVD liggen overhoop over de nieuwe asielwet. Minister Van Hijum wil de wet versoberen, D66 dwarsligt. Wat betekent dat voor asielzoekers?', 30)
  const stikstof = ep('nos-de-dag', 'De stikstofwet splijt VVD, D66 en CDA', 'VVD, D66 en CDA liggen overhoop over de stikstofwet van minister Wiersma. Boeren protesteren, natuurorganisaties stappen naar de rechter. Wat staat er op het spel voor de natuur?', 30)
  const anders = (v) => (/asiel|stikstof/i.test(v.titel) ? NEE : VERDIEPING)
  for (const kop of ['Crisisoverleg op landgoed begonnen', ...PROBE.map(([, k]) => k)]) {
    for (const e of [asiel, stikstof]) {
      const story = metKop(kop)
      const c = paar(story, e)
      if (!c) continue // geen kandidaat: koppelt dus ook niet
      const { r, client } = await draai(story, e, anders)
      assert.equal(r.rows.koppelingen.length, 0, `${e.titel} bij "${kop}"`)
      if (!vangnet(c, NOW)) assert.ok(client.calls.length >= 1, `${e.titel} bij "${kop}": gevraagd`)
    }
  }
})

// Het Lukaku-mengverhaal blijft hard (zie ook luister-keuring4): de kop gaat over België en Frankrijk, geen van zijn namen
// is een centrale naam van het verhaal over Oranje, en de nabespreking van de 7-0 noemt niets uit de kop.
const F = JSON.parse(readFileSync(new URL('./fixtures/luister-shows-2026-11-14.json', import.meta.url), 'utf8'))
const EPS = Object.entries(F.rauw).flatMap(([id, f]) => {
  const vast = vastVan(f.items)
  return f.items.map((it) => episodeOf(SHOW.get(id), it, f.link, vast)).filter(Boolean).map((e) => ({ ...e, ...(vast.namen.length ? { vast: vast.namen } : {}) }))
})
const M = F.mengverhaal
const M_NOW = Date.parse(M.now)
const M_BY = new Map(M.items.map((i) => [i.id, i]))

test('het Lukaku-mengverhaal blijft hard, ook met een plaats in de kop; een kop van het verhaal zelf gaat naar het oordeel', async () => {
  const eps = EPS.filter((e) => e.t <= M_NOW)
  const lead = M_BY.get(M.stories[0].leadId)
  for (const title of [lead.title, `${lead.title} in Brussel`]) {
    const kop = { ...lead, title }
    const by = new Map(M_BY).set(lead.id, kop)
    const c = paren({ stories: M.stories, byId: by, episodes: eps, now: M_NOW }).paren.find((c) => /^#583/.test(c.e.titel))
    assert.ok(c, 'de nabespreking van de 7-0 is een kandidaat')
    assert.equal(c.kop, false, title)
    assert.match(vangnet(c, M_NOW), /^een mengverhaal/)
    const { get, update } = memKv()
    const client = nepClient(() => JA)
    const r = await koppelMetOordeel({ stories: M.stories, byId: by, episodes: eps, now: M_NOW, mainIds: MAIN_IDS, client, get, update })
    assert.equal(r.byStory.size, 0)
  }
  // Hetzelfde verhaal met een kop over Oranje ("Reijnders glundert na evenaring Van Basten in Oranje": "in Oranje" is hier
  // het verhaal, geen plaats): geen mengverhaal, De Redacteur beslist.
  const oranje = M.stories[0].itemIds.find((id) => /^Reijnders glundert/.test(M_BY.get(id)?.title || ''))
  const c = paren({ stories: [{ ...M.stories[0], leadId: oranje }], byId: M_BY, episodes: eps, now: M_NOW }).paren.find((c) => /^#583/.test(c.e.titel))
  assert.ok(c)
  assert.equal(c.kop, true)
})

test('een aflevering die geen enkele centrale naam van het verhaal noemt, is een mengverhaal (ook met een artikellink)', () => {
  // Een artikellink naar een stuk van het crisisverhaal, maar een aflevering over iets anders, zonder centrale naam.
  const story = metKop('Crisisoverleg D66, VVD en CDA in Hilversum')
  const url = byId.get(story.itemIds[1]).url
  const e = { ...ep('nrc-vandaag', 'Waarom Schiphol krimpt', 'Schiphol moet krimpen. Minister Tieman legt uit waarom en wat dat betekent voor KLM en de omwonenden.', 5), links: [url] }
  const c = paar(story, e)
  if (!c) return // geen kandidaat: koppelt dus ook niet
  assert.equal(c.kop, false)
  assert.match(vangnet(c, NOW), /mengverhaal|artikellink/)
})
