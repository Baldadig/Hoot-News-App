// Luister verder: herstel na keuring 6 en 7 van branch shows (15 november). Zie Hoot-design/podcast-concept-2026-11-14/PROEF-4.md,
// "Keuring 6" en "Keuring 7". (1) De voorselectie in judge (de snelle uitgang en `kandidaat`) keek alleen naar de clusternamen,
// het vangnet op de kop (kopDeelt) ook naar de namen in minstens een kwart van de stukken. Nu één definitie (centraleNamen):
// De Dag "Hoe premier Jetten zijn kabinetscrisis (mis)managet" bij het crisisverhaal van de echte avondkern komt bij De
// Redacteur. (2) NA_OPNAME: één of twee korte woorden tussen "op" en "voordat/voor" ("We namen dit gesprek op vlak voordat …",
// "… vrijdagochtend op, nog voor de aankomst"). Besluit Alex: bij twijfel niets; het oordeel ligt bij De Redacteur.
// Geen echte AI: de nep-client.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { paren, vangnet, koppelMetOordeel, describe, vastVan, episodeOf, SHOW } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { nepClient, JA, NEE, VERDIEPING } from './helpers/nep-oordeel.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-avondkern-2026-11-14.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const NOW = Date.parse(FIX.now)
const H = 36e5
const CRISIS = FIX.stories.find((s) => s.id === 'sts2z5a') // kop "‘Heel erg veel ellende’, zegt de lokale VVD’er …"
const DAG = FIX.episodes.find((e) => e.id === 'e1j97hpl') // De Dag: "Hoe premier Jetten zijn kabinetscrisis (mis)managet"
const memKv = () => {
  const kv = new Map()
  return { get: (k) => kv.get(k), update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) }
}
const draai = async (stories, episodes, beslis, by = byId, now = NOW) => {
  const { get, update } = memKv()
  const client = nepClient(beslis)
  const r = await koppelMetOordeel({ stories, byId: by, episodes, now, mainIds: MAIN_IDS, client, get, update })
  return { r, client }
}
let n = 0
const ep = (show, titel, tekst, uur) => ({ id: 'k7-' + ++n, show, titel, samenvatting: tekst.slice(0, 420), tekst, t: NOW - uur * H, links: [], pagina: 'https://example.org/k7/' + n })

test('de echte avondkern: De Dag "(mis)managet" is een kandidaat bij het crisisverhaal en koppelt bij een ja, niet bij een nee', async () => {
  const c = paren({ stories: [CRISIS], byId, episodes: [DAG], now: NOW }).paren[0]
  assert.ok(c, 'een kandidaat (Jetten staat in een kwart van de stukken: een centrale naam, ook voor de voorselectie)')
  assert.equal(c.kop, true, 'geen mengverhaal')
  assert.equal(vangnet(c, NOW), null, 'het vangnet laat haar door')
  const ja = await draai([CRISIS], [DAG], () => VERDIEPING)
  assert.equal(ja.client.calls.length, 1, 'De Redacteur wordt gevraagd')
  const k = ja.r.rows.koppelingen.find((k) => k.verhaal === CRISIS.id)
  assert.ok(k && k.aflevering === DAG.titel && k.soort === 'verdiepend')
  assert.equal((await draai([CRISIS], [DAG], () => NEE)).r.rows.koppelingen.length, 0, 'een nee houdt haar tegen')
})

test('de echte avondkern: asiel en stikstof met dezelfde partijen koppelen niet bij een nee van het oordeel', async () => {
  const asiel = ep('nos-de-dag', 'D66 en VVD botsen over de asielwet van Jetten', 'D66 en VVD liggen overhoop over de nieuwe asielwet. Minister Van Hijum wil de wet versoberen, D66 dwarsligt. Wat betekent dat voor asielzoekers?', 30)
  const stikstof = ep('nos-de-dag', 'De stikstofwet splijt VVD, D66 en CDA', 'VVD, D66 en CDA liggen overhoop over de stikstofwet van minister Wiersma. Boeren protesteren, natuurorganisaties stappen naar de rechter. Wat staat er op het spel voor de natuur?', 30)
  for (const e of [asiel, stikstof]) {
    const { r } = await draai([CRISIS], [e], (v) => (/asiel|stikstof/i.test(v.titel) ? NEE : VERDIEPING))
    assert.equal(r.rows.koppelingen.length, 0, e.titel)
  }
})

test('de mengkoppen blijven dicht: Heinen bij het crisisverhaal, Lukaku en Van Dijk in Zeist bij Oranje, ook bij een ja', async () => {
  // Heinen: een kop over iemand buiten het verhaal, en De Dag noemt Heinen niet.
  const heinen = CRISIS.itemIds.find((id) => /^Hoe Eelco Heinen/.test(byId.get(id)?.title || ''))
  assert.ok(heinen, 'de Heinen-kop staat in het verhaal')
  const st = { ...CRISIS, leadId: heinen }
  const h = paren({ stories: [st], byId, episodes: [DAG], now: NOW }).paren[0]
  assert.ok(h, 'De Dag is nu ook bij de Heinen-kop een kandidaat')
  assert.equal(h.kop, false, 'Heinen-kop: mengverhaal')
  assert.match(vangnet(h, NOW), /^een mengverhaal/)
  assert.equal((await draai([st], [DAG], () => VERDIEPING)).r.rows.koppelingen.length, 0)
  const F = JSON.parse(readFileSync(new URL('./fixtures/luister-shows-2026-11-14.json', import.meta.url), 'utf8'))
  const EPS = Object.entries(F.rauw).flatMap(([id, f]) => {
    const vast = vastVan(f.items)
    return f.items.map((it) => episodeOf(SHOW.get(id), it, f.link, vast)).filter(Boolean).map((e) => ({ ...e, ...(vast.namen.length ? { vast: vast.namen } : {}) }))
  })
  const M = F.mengverhaal
  const M_NOW = Date.parse(M.now)
  const lead = M.items.find((i) => i.id === M.stories[0].leadId)
  const eps = EPS.filter((e) => e.t <= M_NOW)
  for (const title of [lead.title, 'Van Dijk traint apart in Zeist, Koeman wacht nog met besluit']) {
    const by = new Map(M.items.map((i) => [i.id, i])).set(lead.id, { ...lead, title })
    const c = paren({ stories: M.stories, byId: by, episodes: eps, now: M_NOW }).paren.find((c) => /^#583/.test(c.e.titel))
    assert.ok(c, `${title}: de nabespreking van de 7-0 is een kandidaat`)
    assert.equal(c.kop, false, title)
    assert.match(vangnet(c, M_NOW), /^een mengverhaal/, title)
    assert.equal((await draai(M.stories, eps, () => JA, by, M_NOW)).r.byStory.size, 0, title)
  }
})

test('NA_OPNAME: één of twee korte woorden tussen "op" en "voordat/voor" zijn ook opgenomen vóór het nieuws', () => {
  const na = (z) => !!describe({ titel: 'x', samenvatting: z }).naOpname
  for (const z of [
    'We namen dit gesprek op vlak voordat Jetten, Yeşilgöz en Van den Brink op De Zwaluwenberg aankwamen.',
    'We namen deze aflevering vrijdagochtend op, nog voor de aankomst van de partijleiders.',
    'Deze aflevering namen we op, net voor het crisisoverleg begon.',
    'Ik nam dit gesprek op kort voordat Huang opstapte.',
    'Wij namen dit op, even voordat het nieuws kwam.',
  ]) assert.ok(na(z), z)
  // Gewone zinnen zonder opname-betekenis niet.
  for (const z of [
    'Hij nam contact op, kort voordat het overleg begon.',
    'Jetten nam het op tegen Yeşilgöz, vlak voor de stemming.',
    'We namen even de tijd, vlak voor de stemming.',
    'We nemen je mee, vlak voordat het overleg begint.',
    'We namen de trein op tijd, net voor de storm.',
    'De partijleiders namen hun intrek op het landgoed, kort voordat het overleg begon.',
    'We namen afscheid op het station, vlak voor de stemming.',
  ]) assert.ok(!na(z), z)
})

test('NA_OPNAME op de echte avondkern: "op vlak voordat" en "op, nog voor" sluiten hard uit, ook bij een ja', async () => {
  for (const tekst of [
    'We namen dit gesprek op vlak voordat Jetten, Yeşilgöz en Van den Brink op De Zwaluwenberg aankwamen. Hoe kwam het kabinet van Jetten in deze crisis, en wat willen VVD, D66 en CDA?',
    'We namen deze aflevering vrijdagochtend op, nog voor de aankomst van Jetten, Yeşilgöz en Van den Brink. Hoe kwam het kabinet van Jetten in deze crisis, en wat willen VVD, D66 en CDA?',
  ]) {
    const e = ep('nos-de-dag', 'Hoe Jetten zijn kabinet door de crisis loodst', tekst, 20)
    const c = paren({ stories: [CRISIS], byId, episodes: [e], now: NOW }).paren[0]
    assert.ok(c, 'een kandidaat')
    assert.match(vangnet(c, NOW), /na de opname/, tekst)
    assert.equal((await draai([CRISIS], [e], () => VERDIEPING)).r.rows.koppelingen.length, 0, tekst)
  }
})
