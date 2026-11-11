// Waar media verschillen: citeerplicht in code, weigeren bij vals contrast of te weinig, cache, vlag uit,
// time-out, en wat web en app tonen. Zonder netwerk: de modellen zijn een nep (scripts/verschillen-nep.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  toetsZin, maakVerschillen, verschillenRows, verschillenVoorEditie, metVerschillen, verschillenAan, verschillenKey, stelSamen, kandidaten, namenIn,
  VERSCHILLEN_SCHRIJVER, VERSCHILLEN_CONTROLE, MAX_WOORDEN,
} from '../netlify/lib/verschillen.mjs'
import { verschillenDelen, zetTekst, VERSCHILLEN_LABEL, VERSCHILLEN_VOET } from '../shared/verschillen.mjs'
import { nepClient, metBronIds } from '../scripts/verschillen-nep.mjs'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const feed = JSON.parse(src('tests/fixtures/verschillen/feed-fragment-2026-11-11.json'))
const nagebootst = JSON.parse(src('tests/fixtures/verschillen/nagebootst.json')).verhalen
const verhaal = (id) => {
  const s = feed.verhalen.find((v) => v.id === id)
  const itemsById = new Map(metBronIds(s.items).map((i) => [i.id, i]))
  const story = { id: s.id, itemIds: s.items.map((i) => i.id), sourceNames: s.sourceNames }
  return { story, itemsById, ...verschillenRows(story, itemsById), storyNames: s.sourceNames }
}
const BEL = verhaal('sts2z5a') // Belastingplan, 9 bronnen
const BOM = verhaal('s11wahg9') // bommeldingen, 11 bronnen
const HEG = verhaal('s1rwx2k0') // Hegseth, Engels en Nederlands
const ctx = (v) => ({ rows: v.rows, alle: v.alle, storyNames: v.storyNames })
const zin = (o) => ({ soort: 'verschil', uniek: [], afwezig: [], fragmenten: [], bronnen: [], ...o })
const memKv = () => {
  const m = new Map()
  const log = []
  return { m, log, get: async (k) => (log.push(['get', k]), structuredClone(m.get(k) ?? null)), set: async (k, v) => (log.push(['set', k]), m.set(k, structuredClone(v))) }
}

// ---------- Citeerplicht: de codecontrole ----------
test('codecontrole: een goede zin met letterlijke fragmenten per bron komt erdoor', () => {
  const z = zin({ tekst: 'De cijfers verschillen: Het Nieuwsblad noemt 6.000 scholen, VRT NWS 6.300.', bronnen: [1, 3], fragmenten: [{ bron: 1, tekst: 'zowat 6.000 scholen' }, { bron: 3, tekst: 'ongeveer 6.300 scholen' }] })
  assert.deepEqual(toetsZin(z, ctx(BOM)), [])
})

test('codecontrole: fragment niet letterlijk, bron zonder fragment, of geen bronnen valt weg', () => {
  const nietLetterlijk = toetsZin(zin({ tekst: 'Het Nieuwsblad noemt 6.000, VRT NWS 6.300.', bronnen: [1, 3], fragmenten: [{ bron: 1, tekst: 'ruim 6.000 scholen' }, { bron: 3, tekst: 'ongeveer 6.300 scholen' }] }), ctx(BOM))
  assert.ok(nietLetterlijk.some((r) => /niet letterlijk in \[1\] Het Nieuwsblad/.test(r)))
  const zonderFragment = toetsZin(zin({ tekst: 'Het Nieuwsblad noemt 6.000, VRT NWS 6.300.', bronnen: [1, 3], fragmenten: [{ bron: 3, tekst: 'ongeveer 6.300 scholen' }] }), ctx(BOM))
  assert.ok(zonderFragment.includes('geen fragment voor [1] Het Nieuwsblad'))
  assert.ok(toetsZin(zin({ tekst: 'Er is iets.' }), ctx(BOM)).includes('geen bronnen'))
  assert.ok(toetsZin(zin({ tekst: 'Er is iets.', bronnen: [99], fragmenten: [{ bron: 99, tekst: 'iets anders' }] }), ctx(BOM)).some((r) => /onbekende bron 99/.test(r)))
})

test('codecontrole: elke genoemde bron (ook kort of afgekort) hoort bij de aangehaalde regels', () => {
  const r = toetsZin(zin({ tekst: 'Het Nieuwsblad noemt 6.000 scholen, het AD 6.300.', bronnen: [1, 3], fragmenten: [{ bron: 1, tekst: 'zowat 6.000 scholen' }, { bron: 3, tekst: 'ongeveer 6.300 scholen' }] }), ctx(BOM))
  assert.ok(r.includes('noemt AD zonder bron'))
  assert.deepEqual(namenIn('het FD en Telegraaf, maar trouw is geen bron'), ['De Telegraaf', 'Het Financieele Dagblad'].filter((n) => namenIn('het FD en Telegraaf').includes(n)))
  assert.ok(!namenIn('ze blijven trouw aan het plan').includes('Trouw'))
  assert.deepEqual(namenIn('NOS Economie meldt'), ['NOS Economie'])
})

test('codecontrole: getallen, citaten (letterlijk, kort, Nederlands) en telwoorden', () => {
  const getal = toetsZin(zin({ tekst: 'Het Nieuwsblad noemt 7.000 scholen, VRT NWS 6.300.', bronnen: [1, 3], fragmenten: [{ bron: 1, tekst: 'zowat 6.000 scholen' }, { bron: 3, tekst: 'ongeveer 6.300 scholen' }] }), ctx(BOM))
  assert.ok(getal.includes('getal 7000 niet in de bronnen'))
  // 6.000 en 6000 zijn hetzelfde getal.
  assert.deepEqual(toetsZin(zin({ soort: 'onbekend', tekst: 'Het Nieuwsblad noemt 6000 scholen.', bronnen: [1], fragmenten: [{ bron: 1, tekst: 'zowat 6.000 scholen' }] }), ctx(BOM)), [])
  const lang = toetsZin(zin({ soort: 'onbekend', tekst: 'NRC schrijft ‘volgens de politie zijn de berichten nep’.', bronnen: [7], fragmenten: [{ bron: 7, tekst: 'Volgens de politie zijn de berichten nep' }] }), ctx(BOM))
  assert.ok(lang.some((r) => /citaat te lang/.test(r)))
  const verzonnen = toetsZin(zin({ soort: 'onbekend', tekst: 'NRC noemt het ‘een ramp’.', bronnen: [7], fragmenten: [{ bron: 7, tekst: 'ontwrichtend is het wel' }] }), ctx(BOM))
  assert.ok(verzonnen.some((r) => /citaat niet letterlijk/.test(r)))
  const engels = toetsZin(zin({ soort: 'onbekend', tekst: 'De BBC schrijft ‘Great American Patriot’.', bronnen: [4], fragmenten: [{ bron: 4, tekst: 'Great American Patriot' }] }), ctx(HEG))
  assert.ok(engels.some((r) => /anderstalige bron/.test(r)))
  // Telwoorden: precies zoveel bronnen als aangehaald; "alle" alleen als het het hele verhaal is; één per zin.
  const acht = toetsZin(zin({ soort: 'gedeeld', tekst: 'Acht bronnen melden een deal.', bronnen: [1, 3, 6, 7, 8, 9, 10, 11, 2], fragmenten: [] }), ctx(BEL))
  assert.ok(acht.some((r) => /telwoord "Acht bronnen" maar 9 bron/.test(r)))
  const twee = toetsZin(zin({ soort: 'gedeeld', tekst: 'Alle negen bronnen melden een deal; acht van hen noemen vermogen.', bronnen: [1, 2, 3, 6, 7, 8, 9, 10, 11], fragmenten: [] }), ctx(BEL))
  assert.ok(twee.includes('meer dan één telwoord in een zin'))
  const meeste = toetsZin(zin({ soort: 'onbekend', tekst: 'De meeste bronnen melden een deal.', bronnen: [10, 11], fragmenten: [{ bron: 10, tekst: 'nog geen reactie VVD' }, { bron: 11, tekst: 'geen reactie VVD' }] }), ctx(BEL))
  assert.ok(meeste.some((r) => /"de meeste" maar 2 van 9/.test(r)))
})

test('codecontrole: "alleen X" en "geen van" worden nageteld in alle stukken', () => {
  const alleen = toetsZin(zin({ tekst: 'Alleen het ND noemt een miljard, De Telegraaf niet.', bronnen: [5, 12], uniek: ['1 miljard'], fragmenten: [{ bron: 5, tekst: 'voor 1 miljard euro te vertimmeren' }, { bron: 12, tekst: 'zwaarder te belasten' }] }), ctx(BEL))
  assert.ok(alleen.some((r) => /vals contrast/.test(r)), alleen.join('; '))
  const goed = toetsZin(zin({ tekst: 'Alleen het ND noemt het voorstel afgezwakt; De Telegraaf spreekt van een bom.', bronnen: [5, 12], uniek: ['afgezwakt'], fragmenten: [{ bron: 5, tekst: 'akkoord met afgezwakt belastingvoorstel' }, { bron: 12, tekst: 'Bom in coalitie' }] }), ctx(BEL))
  assert.deepEqual(goed, [])
  const zonderWoorden = toetsZin(zin({ tekst: 'Alleen het ND noemt het afgezwakt; De Telegraaf een bom.', bronnen: [5, 12], fragmenten: [{ bron: 5, tekst: 'afgezwakt belastingvoorstel' }, { bron: 12, tekst: 'Bom in coalitie' }] }), ctx(BEL))
  assert.ok(zonderWoorden.includes('"alleen" zonder woorden om na te tellen'))
  const nergens = toetsZin(zin({ soort: 'onbekend', tekst: 'Geen van de bronnen noemt de e-mail.', bronnen: [3], afwezig: ['e-mail'], fragmenten: [{ bron: 3, tekst: 'anonieme e-mail' }] }), ctx(BOM))
  assert.ok(nergens.some((r) => /"e-mail" staat wel bij/.test(r)))
})

test('codecontrole: geen oordelen over media, motieven of kloktijden', () => {
  for (const tekst of ['De Telegraaf brengt het sensationeel.', 'De Telegraaf wil de VVD raken.', 'De Telegraaf meldde het om 14.30 uur.', 'NRC framet het anders.']) {
    const r = toetsZin(zin({ soort: 'onbekend', tekst, bronnen: [12], fragmenten: [{ bron: 12, tekst: 'Bom in coalitie' }] }), ctx(BEL))
    assert.ok(r.some((x) => /verboden woord/.test(x)), tekst)
  }
})

// ---------- Geen vals contrast ----------
test('geen vals contrast: noemen tegenover zwijgen, of een "verschil" met één kant, valt weg', () => {
  const zwijgen = toetsZin(zin({ tekst: 'NOS en VRT NWS noemen e-mail, de andere bronnen niet.', bronnen: [9, 3], fragmenten: [{ bron: 9, tekst: 'per e-mail bedreigd' }, { bron: 3, tekst: 'anonieme e-mail' }] }), ctx(BOM))
  assert.ok(zwijgen.some((r) => /vals contrast/.test(r)))
  const eenKant = toetsZin(zin({ tekst: 'VRT NWS noemt de e-mail anoniem.', bronnen: [3], fragmenten: [{ bron: 3, tekst: 'anonieme e-mail' }] }), ctx(BOM))
  assert.ok(eenKant.includes('verschil zonder twee kanten (vals contrast)'))
  const gedeeldTeSmal = toetsZin(zin({ soort: 'gedeeld', tekst: 'NOS en NU.nl melden een deal.', bronnen: [10, 11], fragmenten: [{ bron: 10, tekst: 'deal met Pro en Volt' }, { bron: 11, tekst: 'akkoord met links' }] }), ctx(BEL))
  assert.ok(gedeeldTeSmal.some((r) => /gedeeld maar 2 van 9/.test(r)))
})

test('de controle (Haiku) haalt een vals contrast eruit dat de code niet ziet', async () => {
  const r = await maakVerschillen(nepClient(nagebootst.s1rwx2k0), ctx(HEG), { now: 0 })
  assert.ok(r.resultaat)
  const weg = r.verslag.weg.find((w) => w.tekst.startsWith('Wie hem redde'))
  assert.equal(weg.stap, 'controle')
  assert.match(weg.reden[0], /^vals contrast/)
  assert.ok(!r.resultaat.delen.some((d) => d.tekst.includes('Wie hem redde')))
})

// ---------- De drie verhalen van 11 november ----------
test('drie verhalen: een kort blok met wat iedereen zegt, het verschil en wat open is; zwakke zinnen weg', async () => {
  for (const [v, id] of [[BEL, 'sts2z5a'], [BOM, 's11wahg9'], [HEG, 's1rwx2k0']]) {
    const client = nepClient(nagebootst[id])
    const { resultaat, verslag } = await maakVerschillen(client, ctx(v), { now: Date.parse('2026-11-11T16:00:00Z') })
    assert.ok(resultaat, id)
    assert.deepEqual(resultaat.delen.map((d) => d.soort), ['gedeeld', 'verschil', 'onbekend'], id)
    assert.ok(resultaat.woorden <= MAX_WOORDEN, `${id}: ${resultaat.woorden} woorden`)
    assert.ok(resultaat.refs.every((ref) => v.itemsById.has(ref)))
    assert.equal(resultaat.at, '2026-11-11T16:00:00.000Z')
    // Elke getoonde zin heeft bewijs, en elk fragment staat letterlijk in zijn stuk.
    for (const z of verslag.zinnen) {
      assert.ok(z.bewijs.length)
      for (const b of z.bewijs) assert.ok(`${v.itemsById.get(b.id).title} ${v.itemsById.get(b.id).summary}`.toLowerCase().replace(/[‘’]/g, "'").includes(b.fragment.toLowerCase().replace(/[‘’]/g, "'")), b.fragment)
    }
    // Schrijver Sonnet 5.5, controle Haiku 5.5, beide met structured output; alleen koppen en intro's als invoer.
    assert.deepEqual(client.calls.map((c) => c.model), [VERSCHILLEN_SCHRIJVER, VERSCHILLEN_CONTROLE])
    assert.equal(client.calls[0].output_config.format.type, 'json_schema')
    assert.deepEqual(client.calls[0].thinking, { type: 'adaptive' })
    assert.equal(client.calls[1].output_config.format.type, 'json_schema')
    assert.match(client.calls[0].messages[0].content, /^\[1\] .+ · 2026-11-1\d · /)
  }
  const bom = await maakVerschillen(nepClient(nagebootst.s11wahg9), ctx(BOM), { now: 0 })
  assert.deepEqual(bom.verslag.weg.map((w) => [w.stap, w.tekst.slice(0, 20)]), [['code', 'Zes van hen noemen e'], ['controle', 'Trouw, AD en RTL Nie']])
  const heg = await maakVerschillen(nepClient(nagebootst.s1rwx2k0), ctx(HEG), { now: 0 })
  assert.ok(heg.verslag.weg.some((w) => w.stap === 'code' && w.reden.some((r) => /anderstalige bron/.test(r))))
})

// ---------- Weigeren: liever niets ----------
test('weigeren: oordeel "geen", een weigering, minder dan drie bronnen, of alleen nog een verschil', async () => {
  assert.equal((await maakVerschillen(nepClient({ schrijver: { oordeel: 'geen', zinnen: [] } }), ctx(BEL), { now: 0 })).resultaat, null)
  const weigert = { calls: [], messages: { create: async () => ({ stop_reason: 'refusal', content: [] }) } }
  assert.equal((await maakVerschillen(weigert, ctx(BEL))).resultaat, null)
  const twee = { rows: BEL.rows.filter((r) => ['NOS', 'NRC'].includes(r.sourceName)), alle: BEL.alle, storyNames: ['NOS', 'NRC'] }
  const client = nepClient(nagebootst.sts2z5a)
  const r = await maakVerschillen(client, twee)
  assert.equal(r.resultaat, null)
  assert.equal(client.calls.length, 0) // geen model voor minder dan drie bronnen
  // Alleen de verschillen blijven over na de controle: geen blok.
  const alleenVerschil = { ...nagebootst.sts2z5a, controle: [{ zin: 'Alle negen', gedragen: false, echt_verschil: true, reden: 'x' }, { zin: 'Nog open', gedragen: false, echt_verschil: true, reden: 'x' }] }
  const leeg = await maakVerschillen(nepClient(alleenVerschil), ctx(BEL))
  assert.equal(leeg.resultaat, null)
  assert.match(leeg.verslag.waarom, /te weinig over/)
  // Geen enkel verschil gedragen: geen blok, ook al zijn de andere zinnen goed.
  const geenVerschil = { ...nagebootst.sts2z5a, controle: [{ zin: 'Het woord', gedragen: false, echt_verschil: false, reden: 'x' }, { zin: 'De toon', gedragen: true, echt_verschil: false, reden: 'x' }, { zin: 'Alleen NOS', gedragen: false, echt_verschil: false, reden: 'x' }] }
  assert.equal((await maakVerschillen(nepClient(geenVerschil), ctx(BEL))).resultaat, null)
})

test('samenstellen: hooguit één gedeeld, twee verschillen en één open; te lang wordt korter', () => {
  const z = (soort, n) => ({ soort, tekst: Array.from({ length: n }, () => 'woord').join(' ') + '.', bronnen: [1], fragmenten: [] })
  const s = stelSamen([z('gedeeld', 10), z('gedeeld', 10), z('verschil', 30), z('verschil', 30), z('verschil', 5), z('onbekend', 15)])
  assert.ok(s.woorden <= MAX_WOORDEN)
  assert.deepEqual(s.delen.map((d) => d.soort), ['gedeeld', 'verschil', 'onbekend'])
  assert.equal(s.zinnen.filter((x) => x.soort === 'verschil').length, 1)
  assert.ok(s.weg.some((w) => /te lang/.test(w.reden[0])))
  assert.ok(s.weg.some((w) => /meer dan 1 zin/.test(w.reden[0])))
  assert.equal(stelSamen([z('verschil', 10)]).delen, null)
})

// ---------- Cache, plafond, vlag en time-out ----------
const editie = (v) => ({ entries: [{ kind: 'story', id: v.story.id }], storyById: new Map([[v.story.id, v.story]]), itemsById: v.itemsById })

test('vlag uit: geen KV, geen model, en de verhalen blijven precies dezelfde objecten', async () => {
  assert.equal(verschillenAan({}), false)
  assert.equal(verschillenAan({ HOOT_VERSCHILLEN: 'aan' }), true)
  assert.equal(verschillenAan({ HOOT_VERSCHILLEN: 'true' }), false)
  const kv = memKv()
  const client = nepClient(nagebootst.sts2z5a)
  const blokken = await verschillenVoorEditie({ aan: false, client, ...editie(BEL), get: kv.get, set: kv.set })
  assert.equal(blokken.size, 0)
  assert.equal(kv.log.length, 0)
  assert.equal(client.calls.length, 0)
  const stories = [BEL.story, BOM.story]
  assert.equal(metVerschillen(stories, blokken), stories)
  // In build.mjs: alleen achter de vlag, en de feed krijgt het veld alleen bij een blok.
  const b = src('netlify/lib/build.mjs')
  assert.match(b, /const verschillen = verschillenAan\(\)\s*\?/)
  assert.match(b, /: Promise\.resolve\(new Map\(\)\)/)
  assert.match(b, /stories: metVerschillen\(/)
})

test('cache: per verhaal-versie in KV; tweede ronde zonder model; nieuwe bron = nieuwe versie; geen persoonsgegevens', async () => {
  const kv = memKv()
  const client = nepClient(nagebootst.sts2z5a)
  const now = Date.parse('2026-11-11T16:00:00Z')
  const een = await verschillenVoorEditie({ aan: true, client, ...editie(BEL), get: kv.get, set: kv.set, now })
  assert.ok(een.get(BEL.story.id)?.delen)
  assert.equal(client.calls.length, 2)
  const twee = await verschillenVoorEditie({ aan: true, client, ...editie(BEL), get: kv.get, set: kv.set, now: now + 6e5 })
  assert.deepEqual(twee.get(BEL.story.id), een.get(BEL.story.id))
  assert.equal(client.calls.length, 2) // uit de cache
  const key = verschillenKey(BEL.story, BEL.rows)
  assert.match(key, /^verschillen-v1:[a-z0-9]+$/)
  const entry = kv.m.get(key)
  assert.equal(entry.status, 'klaar')
  assert.doesNotMatch(JSON.stringify(entry), /owner|user|email|account|device/i)
  // Een nieuwe uitgever: een andere sleutel; tot die klaar is blijft de vorige versie staan.
  const extra = { id: 'x1', sourceName: 'Trouw', publishedAt: '2026-11-11T15:30:00Z', title: 'D66 en CDA sluiten deal met links', summary: 'Pro en Volt steunen het belastingplan.' }
  const story2 = { ...BEL.story, itemIds: [...BEL.story.itemIds, 'x1'], sourceNames: [...BEL.story.sourceNames, 'Trouw'] }
  const items2 = new Map([...BEL.itemsById, ['x1', extra]])
  assert.notEqual(verschillenKey(story2, verschillenRows(story2, items2).rows), key)
  const traag = nepClient(nagebootst.sts2z5a, { vertraging: 200 })
  const t0 = Date.now()
  const drie = await verschillenVoorEditie({ aan: true, client: traag, entries: [{ kind: 'story', id: story2.id }], storyById: new Map([[story2.id, story2]]), itemsById: items2, get: kv.get, set: kv.set, now, budget: 30 })
  assert.ok(Date.now() - t0 < 150)
  assert.deepEqual(drie.get(BEL.story.id), een.get(BEL.story.id)) // de oude versie blijft
})

test('time-out: de Editie wacht nooit langer dan het budget; afgebroken telt als poging, hooguit drie per dag', async () => {
  const kv = memKv()
  const now = Date.parse('2026-11-11T16:00:00Z')
  for (let i = 1; i <= 4; i++) {
    const traag = nepClient(nagebootst.s11wahg9, { vertraging: 300 })
    const t0 = Date.now()
    const blokken = await verschillenVoorEditie({ aan: true, client: traag, ...editie(BOM), get: kv.get, set: kv.set, now, budget: 25 })
    assert.ok(Date.now() - t0 < 200, `ronde ${i} wachtte te lang`)
    assert.equal(blokken.size, 0)
    await new Promise((r) => setTimeout(r, 20)) // het afbreken schrijft de poging weg
    assert.equal(traag.calls.length, i <= 3 ? 1 : 0, `ronde ${i}`)
  }
  const entry = kv.m.get(verschillenKey(BOM.story, BOM.rows))
  assert.equal(entry.status, 'fout')
  assert.equal(entry.pogingen, 3)
  // Een nieuwe dag: opnieuw proberen, en dan lukt het.
  const snel = nepClient(nagebootst.s11wahg9)
  const morgen = await verschillenVoorEditie({ aan: true, client: snel, ...editie(BOM), get: kv.get, set: kv.set, now: now + 864e5 })
  assert.ok(morgen.get(BOM.story.id))
  // Een model dat een fout gooit: geen blok, geen fout naar buiten.
  const kapot = { messages: { create: async () => { throw new Error('529 overloaded') } } }
  const kv2 = memKv()
  assert.equal((await verschillenVoorEditie({ aan: true, client: kapot, ...editie(HEG), get: kv2.get, set: kv2.set, now })).size, 0)
})

test('"geen" wordt onthouden: niet opnieuw schrijven; dagplafond en hooguit N nieuwe per ronde', async () => {
  const kv = memKv()
  const geen = nepClient({ schrijver: { oordeel: 'geen', zinnen: [] } })
  await verschillenVoorEditie({ aan: true, client: geen, ...editie(BEL), get: kv.get, set: kv.set })
  await verschillenVoorEditie({ aan: true, client: geen, ...editie(BEL), get: kv.get, set: kv.set })
  assert.equal(geen.calls.length, 1)
  // Plafond: drie verhalen, maar maar één nieuwe per ronde en een dag die al vol zit.
  const all = new Map([...BEL.itemsById, ...BOM.itemsById, ...HEG.itemsById])
  const sb = new Map([BEL, BOM, HEG].map((v) => [v.story.id, v.story]))
  const entries = [BEL, BOM, HEG].map((v) => ({ kind: 'story', id: v.story.id }))
  const kv2 = memKv()
  const c = nepClient(nagebootst.s11wahg9)
  await verschillenVoorEditie({ aan: true, client: c, entries, storyById: sb, itemsById: all, get: kv2.get, set: kv2.set, maxNieuw: 1 })
  assert.equal(c.calls.filter((x) => x.model === VERSCHILLEN_SCHRIJVER).length, 1)
  const kv3 = memKv()
  const c3 = nepClient(nagebootst.s11wahg9)
  await verschillenVoorEditie({ aan: true, client: c3, entries, storyById: sb, itemsById: all, get: kv3.get, set: kv3.set, dagPlafond: 0 })
  assert.equal(c3.calls.length, 0)
})

test('alleen verhalen in de Editie met drie of meer uitgevers, niet vastgehouden', () => {
  const items = new Map([
    ['a', { id: 'a', source: 'nos', sourceName: 'NOS', title: 'A' }],
    ['b', { id: 'b', source: 'nrc', sourceName: 'NRC', title: 'B' }],
    ['c', { id: 'c', source: 'ad', sourceName: 'AD', title: 'C' }],
  ])
  const s3 = { id: 's3', itemIds: ['a', 'b', 'c'] }
  const s2 = { id: 's2', itemIds: ['a', 'b'] }
  const sb = new Map([['s3', s3], ['s2', s2]])
  assert.deepEqual(kandidaten([{ kind: 'story', id: 's3' }, { kind: 'story', id: 's2' }, { kind: 'item', id: 'a' }], sb, items).map((s) => s.id), ['s3'])
  assert.deepEqual(kandidaten([{ kind: 'story', id: 's3', held: true }], sb, items), [])
})

// ---------- Wat web en app tonen ----------
test('tonen: vaste volgorde, typografie, en niets zonder verschil of met een kapot veld', () => {
  const story = { id: 's', verschillen: { delen: [{ soort: 'onbekend', tekst: "Nog open is wat de VVD vindt." }, { soort: 'verschil', tekst: "Het ND noemt 1 miljard euro, zo'n bedrag." }, { soort: 'gedeeld', tekst: 'Alle bronnen melden een deal.' }] } }
  const d = verschillenDelen(story)
  assert.deepEqual(d.map((x) => x.soort), ['gedeeld', 'verschil', 'onbekend'])
  assert.equal(d[1].tekst, 'Het ND noemt 1 miljard euro, zo’n bedrag.')
  assert.equal(zetTekst("intro's"), 'intro’s')
  assert.equal(verschillenDelen({ verschillen: { delen: [{ soort: 'gedeeld', tekst: 'x' }, { soort: 'onbekend', tekst: 'y' }] } }), null)
  assert.equal(verschillenDelen({ verschillen: { delen: [{ soort: 'verschil', tekst: 'x' }] } }), null)
  assert.equal(verschillenDelen({ verschillen: 'kapot' }), null)
  assert.equal(verschillenDelen({}), null)
  assert.equal(VERSCHILLEN_LABEL, 'Waar media verschillen')
  // Gelijk aan de app.
  const swift = src('ios/Hoot/Models.swift')
  assert.ok(swift.includes(`static let label = "${VERSCHILLEN_LABEL}"`))
  assert.ok(swift.includes(`static let voet = "${VERSCHILLEN_VOET}"`))
  // Huisregels in de voetregel: geen kloktijd, kort.
  assert.doesNotMatch(VERSCHILLEN_VOET, /\d|uur/)
})

const bundled = await build({ entryPoints: ['src/components/Verschillen.jsx'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external' })
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports)
const render = (story) => renderToStaticMarkup(React.createElement(mod.exports.Verschillen, { story }))

test('web: het blok met label, drie alinea\'s en de voetregel; zonder blok niets; op de plek onder de bronregel', async () => {
  const { resultaat } = await maakVerschillen(nepClient(nagebootst.sts2z5a), ctx(BEL), { now: 0 })
  const html = render({ id: 'sts2z5a', verschillen: resultaat })
  assert.match(html, /^<section class="mv" aria-labelledby="mv-sts2z5a"><h3 class="label label--kicker mv__label" id="mv-sts2z5a">Waar media verschillen<\/h3>/)
  assert.equal((html.match(/class="mv__p"/g) || []).length, 3)
  assert.match(html, /<p class="mv__voet">Door AI samengevat uit de koppen en intro’s hieronder\.<\/p><\/section>$/)
  assert.equal(render({ id: 'x' }), '')
  const story = src('src/views/Story.jsx')
  assert.ok(story.indexOf('<Verschillen story={story} />') > story.indexOf('<SourceMeta item={lead} />'))
  assert.ok(story.indexOf('<Verschillen story={story} />') < story.indexOf('summary="Hoe zijn deze bronnen gekoppeld?"'))
  // Alleen bestaande tokens in de stijl.
  const css = src('src/styles/vergelijken.css')
  const blok = css.slice(css.indexOf('.mv {'))
  for (const v of blok.match(/var\(--[a-z0-9-]+\)/g)) assert.match(src('src/styles.css'), new RegExp(`${v.slice(4, -1)}:`), v)
  // Alleen de haarlijn (1px solid var(--rule)), zoals overal; verder geen eigen maten of kleuren.
  assert.doesNotMatch(blok.replaceAll('1px solid var(--rule)', ''), /#[0-9a-f]{3,6}\b|\d+px/i)
})
