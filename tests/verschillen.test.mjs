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
  toetsZin, maakVerschillen, verschillenRows, schrijfVerschillen, verschillenUitKV, verschillenRonde, metVerschillen, verschillenAan, verschillenKey, stelSamen, kandidaten, namenIn,
  VERSCHILLEN_SCHRIJVER, VERSCHILLEN_CONTROLE, MAX_WOORDEN,
} from '../netlify/lib/verschillen.mjs'
import { verschillenDelen, zetTekst, VERSCHILLEN_LABEL, VERSCHILLEN_VOET } from '../shared/verschillen.mjs'
import { nepClient, metBronIds } from '../scripts/verschillen-nep.mjs'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const feed = JSON.parse(src('tests/fixtures/verschillen/feed-fragment-2026-11-11.json'))
const nagebootst = JSON.parse(src('tests/fixtures/verschillen/nagebootst.json')).verhalen
const live = JSON.parse(src('tests/fixtures/verschillen/live-belastingplan-2026-11-11.json')).verhaal
const nagebootstLive = JSON.parse(src('tests/fixtures/verschillen/nagebootst-live.json')).verhalen
const verhaal = (id, opts, s = feed.verhalen.find((v) => v.id === id)) => {
  const itemsById = new Map(metBronIds(s.items).map((i) => [i.id, i]))
  const story = { id: s.id, itemIds: s.items.map((i) => i.id), sourceNames: s.sourceNames }
  return { story, itemsById, ...verschillenRows(story, itemsById, opts), storyNames: s.sourceNames }
}
const BEL = verhaal('sts2z5a') // Belastingplan, 9 bronnen
const BOM = verhaal('s11wahg9') // bommeldingen, 11 bronnen
const HEG = verhaal('s1rwx2k0', { taal: null }) // Hegseth, Engels en Nederlands: alle regels, voor de toetsen van de codecontrole
const HEG_NL = verhaal('s1rwx2k0') // Hegseth zoals de schrijver hem krijgt: alleen de drie Nederlandstalige bronnen
const LIVE = verhaal('sts2z5a', undefined, live) // Belastingplan in de live Editie van de avond, 11 bronnen
const ctx = (v) => ({ rows: v.rows, alle: v.alle, storyNames: v.storyNames })
const zin = (o) => ({ soort: 'verschil', uniek: [], afwezig: [], fragmenten: [], bronnen: [], kanten: [], ...o })
const kant = (bronnen, kenmerk) => ({ bronnen, kenmerk })
const memKv = () => {
  const m = new Map()
  const log = []
  return { m, log, get: async (k) => (log.push(['get', k]), structuredClone(m.get(k) ?? null)), set: async (k, v) => (log.push(['set', k]), m.set(k, structuredClone(v))) }
}

// ---------- Citeerplicht: de codecontrole ----------
test('codecontrole: een goede zin met letterlijke fragmenten per bron komt erdoor', () => {
  const z = zin({ tekst: 'De cijfers verschillen: Het Nieuwsblad en HLN noemen 6.000 scholen, VRT NWS 6.300.', bronnen: [1, 2, 3], fragmenten: [{ bron: 1, tekst: 'zowat 6.000 scholen' }, { bron: 2, tekst: 'zowat 6.000 scholen' }, { bron: 3, tekst: 'ongeveer 6.300 scholen' }], kanten: [kant([1, 2], '6.000'), kant([3], '6.300')] })
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
  assert.ok(getal.includes('getal 7000 niet bij Het Nieuwsblad'), getal.join('; '))
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

// De aanvallen uit keuring 1: elk van deze zinnen moet de codecontrole tegenhouden.
test('codecontrole: getallen in woorden, alle aanhalingstekens, per bron, en geen bronnen buiten het verhaal', () => {
  // (Een Engelse regel komt sinds "taal volgt bronkeuze" nooit meer bij de schrijver en valt dan ook zelf weg; hier
  // gaat het alleen om het natellen van getallen in woorden, dus die ene reden laten we buiten beschouwing.)
  const heg = (tekst, extra = {}) => toetsZin(zin({ soort: 'onbekend', tekst, bronnen: [5], fragmenten: [{ bron: 5, tekst: 'Eleven Democrats are absent' }], ...extra }), ctx(HEG)).filter((r) => !/anderstalige bron in het blok/.test(r))
  // Getallen in woorden, ook tegenover een Engelse bron ("Eleven" is elf).
  assert.deepEqual(heg('Volgens Al Jazeera waren elf Democraten afwezig.'), [])
  assert.ok(heg('Volgens Al Jazeera waren twaalf Democraten afwezig.').includes('getal 12 niet bij Al Jazeera'))
  const trouw = (tekst) => toetsZin(zin({ soort: 'onbekend', tekst, bronnen: [10], fragmenten: [{ bron: 10, tekst: 'Driehonderd Italiaanse scholen' }] }), ctx(BOM))
  assert.deepEqual(trouw('Trouw meldt driehonderd geëvacueerde scholen.'), [])
  assert.ok(trouw('Trouw meldt vierhonderd geëvacueerde scholen.').includes('getal 400 niet bij Trouw'))
  assert.ok(trouw('Trouw meldt tienduizend geëvacueerde scholen.').includes('getal 10000 niet bij Trouw'))
  assert.deepEqual(trouw('Trouw meldt ten minste 300 scholen.').filter((r) => /getal 10\b/.test(r)), []) // "ten minste" is geen tien
  // Parafrase tussen elke soort aanhalingstekens.
  const ad = (tekst) => toetsZin(zin({ soort: 'onbekend', tekst, bronnen: [3], fragmenten: [{ bron: 3, tekst: 'dreigt er een kabinetscrisis?' }] }), ctx(BEL))
  for (const q of ['„dreigt een kabinetscrisis”', '«dreigt een kabinetscrisis»', "'dreigt een kabinetscrisis'", '‚dreigt een kabinetscrisis‘']) assert.ok(ad(`Het AD vraagt ${q}.`).some((r) => /citaat niet letterlijk/.test(r)), q)
  assert.deepEqual(ad('Het AD vraagt „dreigt er een kabinetscrisis?”'), [])
  assert.deepEqual(ad("Het AD kopt over de VVD, zo'n partij."), []) // een apostrof in zo'n is geen citaat
  // Verwisseld: getal of citaat bij de verkeerde bron, ook al staat het bij een andere aangehaalde bron.
  const bom = (tekst) => toetsZin(zin({ tekst, bronnen: [1, 2, 3], fragmenten: [{ bron: 1, tekst: 'zowat 6.000 scholen' }, { bron: 2, tekst: 'zowat 6.000 scholen' }, { bron: 3, tekst: 'ongeveer 6.300 scholen' }], kanten: [kant([1, 2], '6.000'), kant([3], '6.300')] }), ctx(BOM))
  assert.deepEqual(bom('Het Nieuwsblad en HLN noemen 6.000 scholen, VRT NWS 6.300.'), [])
  const om = bom('Het Nieuwsblad en HLN noemen 6.300 scholen, VRT NWS 6.000.')
  assert.ok(om.includes('getal 6300 niet bij Het Nieuwsblad') && om.includes('getal 6000 niet bij VRT NWS'), om.join('; '))
  const toon = (tekst) => toetsZin(zin({ tekst, bronnen: [12, 7], fragmenten: [{ bron: 12, tekst: 'Bom in coalitie' }, { bron: 7, tekst: 'Spanning in coalitie' }], kanten: [kant([12], 'Bom in coalitie'), kant([7], 'Spanning in coalitie')] }), ctx(BEL))
  assert.deepEqual(toon('De Telegraaf kopt ‘Bom in coalitie’, het FD ‘Spanning in coalitie’.'), [])
  const toonOm = toon('De Telegraaf kopt ‘Spanning in coalitie’, het FD ‘Bom in coalitie’.')
  assert.ok(toonOm.includes('citaat ‘Spanning in coalitie’ niet bij De Telegraaf') && toonOm.includes('citaat ‘Bom in coalitie’ niet bij Het Financieele Dagblad'), toonOm.join('; '))
  // Een groep: wat volgt geldt voor elk lid.
  const groep = toetsZin(zin({ soort: 'onbekend', tekst: 'Het Nieuwsblad, HLN en VRT NWS noemen 6.000 scholen.', bronnen: [1, 2, 3], fragmenten: [{ bron: 1, tekst: 'zowat 6.000 scholen' }, { bron: 2, tekst: 'zowat 6.000 scholen' }, { bron: 3, tekst: 'ongeveer 6.300 scholen' }] }), ctx(BOM))
  assert.ok(groep.includes('getal 6000 niet bij VRT NWS'), groep.join('; '))
  // Bronnen buiten het verhaal, en "Volkskrant" zonder "de".
  for (const t of ['Volgens het ANP gaat het om 6.000 scholen.', 'Volgens Reuters gaat het om 6.000 scholen.', 'Reuters meldt 6.000 scholen.']) {
    const r = toetsZin(zin({ soort: 'onbekend', tekst: t, bronnen: [1], fragmenten: [{ bron: 1, tekst: 'zowat 6.000 scholen' }] }), ctx(BOM))
    assert.ok(r.some((x) => /geen bron van dit verhaal/.test(x)), t)
  }
  const persoon = toetsZin(zin({ soort: 'onbekend', tekst: 'Volgens Trump is het een overwinning.', bronnen: [4], fragmenten: [{ bron: 4, tekst: 'Trump welcomes the outcome' }] }), ctx(HEG))
  assert.ok(!persoon.some((x) => /volgens Trump/.test(x)), persoon.join('; ')) // een naam uit de aangehaalde regels mag
  assert.ok(toetsZin(zin({ soort: 'onbekend', tekst: 'Volgens Massiefski is het nep.', bronnen: [7], fragmenten: [{ bron: 7, tekst: 'Volgens de politie zijn de berichten nep' }] }), ctx(BOM)).some((x) => /"volgens Massiefski"/.test(x)))
  assert.ok(namenIn('Volkskrant en Telegraaf melden het').includes('de Volkskrant'))
  assert.ok(toetsZin(zin({ soort: 'onbekend', tekst: 'Volkskrant meldt 6.000 scholen.', bronnen: [1], fragmenten: [{ bron: 1, tekst: 'zowat 6.000 scholen' }] }), ctx(BOM)).includes('noemt de Volkskrant zonder bron'))
})

test('geen vals contrast in code: een bron aan beide kanten, of een citaat dat ook buiten de groep staat', () => {
  // De zin uit de eerste proef: Het Parool zegt zelf ook "miljonairsbelasting".
  const parool = toetsZin(zin({
    tekst: 'Het woord verschilt: NRC, RTL Nieuws, AD en ND schrijven ‘miljonairsbelasting’, Het Parool ‘miljonairstaks’.',
    bronnen: [6, 8, 3, 4, 9],
    fragmenten: [{ bron: 6, tekst: '‘miljonairsbelasting’' }, { bron: 8, tekst: 'over miljonairsbelasting' }, { bron: 3, tekst: 'over een miljonairsbelasting' }, { bron: 4, tekst: 'over een ‘miljonairsbelasting’' }, { bron: 9, tekst: 'VVD miljonairstaks gaat pruimen' }],
  }), ctx(BEL))
  assert.ok(parool.includes('Het Parool zegt ook ‘miljonairsbelasting’ (vals contrast)'), parool.join('; '))
  // Een getal van de ene kant dat ook bij de andere kant staat.
  const beide = toetsZin(zin({ tekst: 'Het Nieuwsblad noemt 6.000 scholen, HLN ook 6.000 en VRT NWS 6.300.', bronnen: [1, 2, 3], fragmenten: [{ bron: 1, tekst: 'zowat 6.000 scholen' }, { bron: 2, tekst: 'zowat 6.000 scholen' }, { bron: 3, tekst: 'ongeveer 6.300 scholen' }] }), ctx(BOM))
  assert.ok(beide.some((r) => /zegt ook 6000 \(vals contrast\)/.test(r)), beide.join('; '))
  // Een citaat van één kant dat ook bij een niet-genoemde bron staat.
  const elders = toetsZin(zin({ tekst: 'NRC schrijft ‘miljonairsbelasting’, De Telegraaf ‘vermogenstaks’.', bronnen: [6, 12], fragmenten: [{ bron: 6, tekst: 'miljonairsbelasting' }, { bron: 12, tekst: 'vermogenstaks' }] }), ctx(BEL))
  assert.ok(elders.some((r) => /‘miljonairsbelasting’ staat ook bij .*Het Parool/.test(r)), elders.join('; '))
})

// ---------- Geen vals contrast ----------
test('geen vals contrast: noemen tegenover zwijgen, of een "verschil" met één kant, valt weg', () => {
  const zwijgen = toetsZin(zin({ tekst: 'NOS en VRT NWS noemen e-mail, de andere bronnen niet.', bronnen: [9, 3], fragmenten: [{ bron: 9, tekst: 'per e-mail bedreigd' }, { bron: 3, tekst: 'anonieme e-mail' }] }), ctx(BOM))
  assert.ok(zwijgen.some((r) => /vals contrast/.test(r)))
  const eenKant = toetsZin(zin({ tekst: 'VRT NWS noemt de e-mail anoniem.', bronnen: [3], fragmenten: [{ bron: 3, tekst: 'anonieme e-mail' }] }), ctx(BOM))
  assert.ok(eenKant.includes('verschil zonder twee kanten (vals contrast)'))
  assert.ok(eenKant.some((r) => /met één kant/.test(r)))
  const gedeeldTeSmal = toetsZin(zin({ soort: 'gedeeld', tekst: 'NOS en NU.nl melden een deal.', bronnen: [10, 11], fragmenten: [{ bron: 10, tekst: 'deal met Pro en Volt' }, { bron: 11, tekst: 'akkoord met links' }] }), ctx(BEL))
  assert.ok(gedeeldTeSmal.some((r) => /gedeeld maar 2 van 9/.test(r)))
})

test('de controle (Haiku) haalt een vals contrast eruit dat de code niet ziet; blijft er geen verschil, dan geen blok', async () => {
  const r = await maakVerschillen(nepClient(nagebootst.s1rwx2k0), ctx(HEG_NL), { now: 0 })
  const weg = r.verslag.weg.find((w) => w.tekst.startsWith('Wie het tegenhield'))
  assert.equal(weg.stap, 'controle')
  assert.match(weg.reden[0], /^vals contrast/)
  // De Haiku-controle krijgt álle bronregels, niet alleen de aangehaalde: alleen zo ziet hij een bron die ontbreekt.
  // Bij een verschil ziet hij ook welke regels aan welke kant staan.
  const client = nepClient(nagebootst.s1rwx2k0)
  await maakVerschillen(client, ctx(HEG_NL), { now: 0 })
  assert.equal(client.calls[1].messages[0].content.split('\nZinnen:\n')[0].split('\n').filter((l) => /^\[\d+\] /.test(l)).length, HEG_NL.rows.length)
  assert.match(client.calls[1].messages[0].content, /\(verschil; regels 3, 1; kant A: regels 3; kant B: regels 1\) Wie het tegenhield/)
  assert.match(client.calls[1].system, /bron aan de ene kant staat, terwijl zijn kop of intro ook zegt wat de andere kant zegt/)
  assert.equal(r.resultaat, null)
  assert.equal(r.verslag.waarom, 'geen verschil over')
})

// ---------- De drie verhalen van 11 november ----------
test('drie verhalen: een kort blok met wat iedereen zegt, één verschil en wat open is; zwakke zinnen weg', async () => {
  for (const [v, id, nep] of [[BOM, 's11wahg9', nagebootst.s11wahg9], [LIVE, 'sts2z5a', nagebootstLive.sts2z5a]]) {
    const client = nepClient(nep)
    const { resultaat, verslag } = await maakVerschillen(client, ctx(v), { now: Date.parse('2026-11-11T16:00:00Z') })
    assert.ok(resultaat, id)
    assert.deepEqual(resultaat.delen.map((d) => d.soort), ['gedeeld', 'verschil', 'onbekend'], id)
    assert.equal(verslag.zinnen.filter((z) => z.soort === 'verschil').length, 1, id)
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
  assert.deepEqual(bom.verslag.weg.map((w) => [w.stap, w.tekst.slice(0, 20)]), [['code', 'Zes van hen noemen e'], ['code', 'Trouw, AD en RTL Nie']])
  // Belastingplan (fragment): "Het woord verschilt" (Het Parool aan beide kanten) en "De toon ook:" (verwijst naar een
  // andere zin, en heeft maar één kant) vallen in code, "Alleen NOS en NU.nl" in de controle: geen verschil, geen blok.
  const bel = await maakVerschillen(nepClient(nagebootst.sts2z5a), ctx(BEL), { now: 0 })
  assert.deepEqual(bel.verslag.weg.map((w) => [w.stap, w.tekst.slice(0, 20)]), [['code', 'Het woord verschilt:'], ['code', 'De toon ook: De Tele'], ['controle', 'Alleen NOS en NU.nl ']])
  assert.equal(bel.resultaat, null)
  // Belastingplan (live): het randgeval uit keuring 2 valt in de controle (eenzijdig), het reserveverschil blijft.
  const lv = await maakVerschillen(nepClient(nagebootstLive.sts2z5a), ctx(LIVE), { now: 0 })
  assert.deepEqual(lv.verslag.weg.map((w) => [w.stap, w.tekst.slice(0, 20)]), [['controle', 'De koppen verschille']])
  assert.match(lv.resultaat.delen.find((d) => d.soort === 'verschil').tekst, /^Wie aan het woord is, verschilt: het ND en RTL Nieuws citeren Paternotte/)
  // Hegseth: alleen de drie Nederlandstalige bronnen; het enige verschil sluit niet uit: geen blok.
  const heg = await maakVerschillen(nepClient(nagebootst.s1rwx2k0), ctx(HEG_NL), { now: 0 })
  assert.deepEqual(HEG_NL.rows.map((r) => r.sourceName), ['De Morgen', 'NRC', 'De Standaard'])
  assert.equal(heg.resultaat, null)
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

test('samenstellen: hooguit één gedeeld, één verschil en één open; te lang wordt korter', () => {
  const z = (soort, n) => ({ soort, tekst: Array.from({ length: n }, () => 'woord').join(' ') + '.', bronnen: [1], fragmenten: [] })
  const s = stelSamen([z('gedeeld', 30), z('gedeeld', 10), z('verschil', 40), z('verschil', 5), z('onbekend', 15)])
  assert.ok(s.woorden <= MAX_WOORDEN)
  assert.deepEqual(s.delen.map((d) => d.soort), ['gedeeld', 'verschil']) // wat open is, gaat er bij te lang als eerste af
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
  const blokken = await schrijfVerschillen({ aan: false, client, ...editie(BEL), get: kv.get, set: kv.set })
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
  const client = nepClient(nagebootstLive.sts2z5a)
  const now = Date.parse('2026-11-11T16:00:00Z')
  const een = await schrijfVerschillen({ aan: true, client, ...editie(LIVE), get: kv.get, set: kv.set, now })
  assert.ok(een.get(LIVE.story.id)?.delen)
  assert.equal(client.calls.length, 2)
  const twee = await schrijfVerschillen({ aan: true, client, ...editie(LIVE), get: kv.get, set: kv.set, now: now + 6e5 })
  assert.deepEqual(twee.get(LIVE.story.id), een.get(LIVE.story.id))
  assert.equal(client.calls.length, 2) // uit de cache
  const key = verschillenKey(LIVE.story, LIVE.rows)
  assert.match(key, /^verschillen-v3:[a-z0-9]+$/)
  const entry = kv.m.get(key)
  assert.equal(entry.status, 'klaar')
  assert.doesNotMatch(JSON.stringify(entry), /owner|user|email|account|device/i)
  // Een nieuwe uitgever: een andere sleutel; tot die klaar is, is er géén blok (de telwoorden van de oude versie,
  // "Alle negen bronnen", zouden niet meer kloppen).
  const extra = { id: 'x1', sourceName: 'Trouw', publishedAt: '2026-11-11T15:30:00Z', title: 'D66 en CDA sluiten deal met links', summary: 'Pro en Volt steunen het belastingplan.' }
  const story2 = { ...LIVE.story, itemIds: [...LIVE.story.itemIds, 'x1'], sourceNames: [...LIVE.story.sourceNames, 'Trouw'] }
  const items2 = new Map([...LIVE.itemsById, ['x1', extra]])
  assert.notEqual(verschillenKey(story2, verschillenRows(story2, items2).rows), key)
  const traag = nepClient(nagebootstLive.sts2z5a, { vertraging: 200 })
  const t0 = Date.now()
  const drie = await schrijfVerschillen({ aan: true, client: traag, entries: [{ kind: 'story', id: story2.id }], storyById: new Map([[story2.id, story2]]), itemsById: items2, get: kv.get, set: kv.set, now, budget: 30 })
  assert.ok(Date.now() - t0 < 150)
  assert.equal(drie.has(LIVE.story.id), false)
  assert.ok(!src('netlify/lib/verschillen.mjs').includes('-laatst:'))
})

test('time-out: wat de schrijver al gaf, wordt bewaard; de volgende ronde doet alleen de controle', async () => {
  const kv = memKv()
  const now = Date.parse('2026-11-11T16:00:00Z')
  // De schrijver is snel, de controle traag: na het budget is alleen de schrijver af.
  const half = nepClient(nagebootstLive.sts2z5a, { vertraging: 0 })
  const create = half.messages.create
  half.messages.create = async (req, opts) => (req.model === VERSCHILLEN_CONTROLE ? new Promise((_, rej) => opts.signal.addEventListener('abort', () => rej(new Error('afgebroken')))) : create(req, opts))
  assert.equal((await schrijfVerschillen({ aan: true, client: half, ...editie(LIVE), get: kv.get, set: kv.set, now, budget: 30 })).size, 0)
  await new Promise((r) => setTimeout(r, 20))
  const entry = kv.m.get(verschillenKey(LIVE.story, LIVE.rows))
  assert.equal(entry.status, 'fout')
  assert.equal(entry.schrijver.oordeel, 'verschil')
  const dag = [...kv.m.entries()].find(([k]) => k.includes('-dag:'))[1]
  const daarna = nepClient(nagebootstLive.sts2z5a)
  const r = await schrijfVerschillen({ aan: true, client: daarna, ...editie(LIVE), get: kv.get, set: kv.set, now: now + 6e5 })
  assert.ok(r.get(LIVE.story.id)?.delen)
  assert.deepEqual(daarna.calls.map((c) => c.model), [VERSCHILLEN_CONTROLE]) // geen tweede schrijfronde
  assert.equal([...kv.m.entries()].find(([k]) => k.includes('-dag:'))[1].n, dag.n) // telt niet opnieuw voor het plafond
})

test('time-out: de Editie wacht nooit langer dan het budget; afgebroken telt als poging, hooguit drie per dag', async () => {
  const kv = memKv()
  const now = Date.parse('2026-11-11T16:00:00Z')
  for (let i = 1; i <= 4; i++) {
    const traag = nepClient(nagebootst.s11wahg9, { vertraging: 300 })
    const t0 = Date.now()
    const blokken = await schrijfVerschillen({ aan: true, client: traag, ...editie(BOM), get: kv.get, set: kv.set, now, budget: 25 })
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
  const morgen = await schrijfVerschillen({ aan: true, client: snel, ...editie(BOM), get: kv.get, set: kv.set, now: now + 864e5 })
  assert.ok(morgen.get(BOM.story.id))
  // Een model dat een fout gooit: geen blok, geen fout naar buiten.
  const kapot = { messages: { create: async () => { throw new Error('529 overloaded') } } }
  const kv2 = memKv()
  assert.equal((await schrijfVerschillen({ aan: true, client: kapot, ...editie(HEG), get: kv2.get, set: kv2.set, now })).size, 0)
})

test('"geen" wordt onthouden: niet opnieuw schrijven; dagplafond en hooguit N nieuwe per ronde', async () => {
  const kv = memKv()
  const geen = nepClient({ schrijver: { oordeel: 'geen', zinnen: [] } })
  await schrijfVerschillen({ aan: true, client: geen, ...editie(BEL), get: kv.get, set: kv.set })
  await schrijfVerschillen({ aan: true, client: geen, ...editie(BEL), get: kv.get, set: kv.set })
  assert.equal(geen.calls.length, 1)
  // Plafond: drie verhalen, maar maar één nieuwe per ronde en een dag die al vol zit.
  const all = new Map([...BEL.itemsById, ...BOM.itemsById, ...HEG.itemsById])
  const sb = new Map([BEL, BOM, HEG].map((v) => [v.story.id, v.story]))
  const entries = [BEL, BOM, HEG].map((v) => ({ kind: 'story', id: v.story.id }))
  const kv2 = memKv()
  const c = nepClient(nagebootst.s11wahg9)
  await schrijfVerschillen({ aan: true, client: c, entries, storyById: sb, itemsById: all, get: kv2.get, set: kv2.set, maxNieuw: 1 })
  assert.equal(c.calls.filter((x) => x.model === VERSCHILLEN_SCHRIJVER).length, 1)
  const kv3 = memKv()
  const c3 = nepClient(nagebootst.s11wahg9)
  await schrijfVerschillen({ aan: true, client: c3, entries, storyById: sb, itemsById: all, get: kv3.get, set: kv3.set, dagPlafond: 0 })
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
  assert.equal(zetTekst('noemt de e-mail anoniem'), 'noemt de e\u2011mail anoniem') // "e-" breekt niet af
  assert.equal(zetTekst('Noord-Ierland'), 'Noord-Ierland')
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
  const { resultaat } = await maakVerschillen(nepClient(nagebootstLive.sts2z5a), ctx(LIVE), { now: 0 })
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

// ---------- Keuring 2: voorwaarden vóór het aanzetten ----------
const bel12 = (tekst, extra = {}) => toetsZin(zin({ soort: 'onbekend', tekst, bronnen: [12], fragmenten: [{ bron: 12, tekst: 'Bom in coalitie' }], ...extra }), ctx(BEL))

test('beschrijft, oordeelt niet: ook oordelen buiten de oude lijst ("alarmistisch", "overtrokken", "kiest voor drama")', () => {
  for (const tekst of [
    'De Telegraaf kopt alarmistisch.', 'De Telegraaf brengt een alarmistische kop.', 'De Telegraaf noemt het alarmerend.',
    'De Telegraaf kopt overtrokken.', 'De kop van De Telegraaf is overtrokken.', 'De Telegraaf kiest voor drama.', 'De Telegraaf koos voor drama.',
    'De Telegraaf dramatiseert de deal.', 'De Telegraaf brengt het dramatischer.', 'De Telegraaf kiest voor sensatie.', 'De Telegraaf zoekt de sensatie.',
    'De Telegraaf blaast het op tot een opgeklopte crisis.', 'De Telegraaf kopt ongenuanceerd.', 'De Telegraaf is minder genuanceerd.',
    'De Telegraaf brengt het eenzijdig.', 'De Telegraaf speelt in op angst.', 'De Telegraaf kopt bewust scherp.', 'De Telegraaf is alarmist.',
    'The Telegraaf headline is overblown.', 'De Telegraaf kopt hysterisch.', 'De Telegraaf brengt het objectief.',
  ]) assert.ok(bel12(tekst).some((x) => /verboden woord/.test(x)), tekst)
  // Wat letterlijk (en nagezocht) uit de bron komt, is de bron en geen oordeel van ons.
  assert.deepEqual(bel12('De Telegraaf kopt ‘Bom in coalitie’.'), [])
  // De opdracht aan de schrijver en aan de controle noemt het, en de controle oordeelt er per zin over.
  const client = nepClient(nagebootstLive.sts2z5a)
  return maakVerschillen(client, ctx(LIVE), { now: 0 }).then(() => {
    assert.match(client.calls[0].system, /alarmistisch, overtrokken, dramatisch, kiest voor drama/)
    assert.match(client.calls[1].system, /"beschrijft": zegt de zin alleen wat de bronnen schrijven\?/)
    const schema = client.calls[1].output_config.format.schema.properties.zinnen.items
    assert.ok(schema.required.includes('beschrijft') && schema.required.includes('los'))
  })
})

test('de controle (Haiku) toetst "beschrijft" en "los": een oordeel of een verwijzing valt weg', async () => {
  const oordeel = { ...nagebootstLive.sts2z5a, controle: [...nagebootstLive.sts2z5a.controle, { zin: 'Wie aan het woord', beschrijft: false, reden: 'noemt de keuze van De Telegraaf scherp' }] }
  const r = await maakVerschillen(nepClient(oordeel), ctx(LIVE), { now: 0 })
  assert.equal(r.resultaat, null)
  assert.ok(r.verslag.weg.some((w) => w.stap === 'controle' && /^oordeelt:/.test(w.reden[0])))
  const los = { ...nagebootstLive.sts2z5a, controle: [...nagebootstLive.sts2z5a.controle, { zin: 'Nog open is', los: false, reden: 'verwijst naar de zin ervoor' }] }
  const r2 = await maakVerschillen(nepClient(los), ctx(LIVE), { now: 0 })
  assert.ok(r2.verslag.weg.some((w) => w.stap === 'controle' && /^staat niet los:/.test(w.reden[0])))
  assert.deepEqual(r2.resultaat.delen.map((d) => d.soort), ['gedeeld', 'verschil'])
})

test('elke zin staat los: geen "ook", "eveneens", "daarnaast" of "die …" naar een zin die kan wegvallen', () => {
  for (const tekst of [
    'De toon ook: De Telegraaf kopt ‘Bom in coalitie’.', 'Ook De Telegraaf kopt ‘Bom in coalitie’.', 'De Telegraaf kopt eveneens ‘Bom in coalitie’.',
    'Daarnaast kopt De Telegraaf ‘Bom in coalitie’.', 'Bovendien kopt De Telegraaf ‘Bom in coalitie’.', 'De Telegraaf kopt, net als de rest, ‘Bom in coalitie’.',
    'Die krant, De Telegraaf, kopt ‘Bom in coalitie’.', 'Maar De Telegraaf kopt ‘Bom in coalitie’.', 'Ze koppen in De Telegraaf ‘Bom in coalitie’.',
    'Een ander verschil: De Telegraaf kopt ‘Bom in coalitie’.', 'De Telegraaf kopt tevens ‘Bom in coalitie’.',
  ]) assert.ok(bel12(tekst).some((x) => /elke zin staat los/.test(x)), tekst)
  // "ook" in een letterlijk citaat van de bron mag (Het Parool: "Dat betekent ook dat er een miljonairsbelasting komt").
  assert.deepEqual(toetsZin(zin({ soort: 'onbekend', tekst: 'Het Parool schrijft ‘Dat betekent ook’.', bronnen: [9], fragmenten: [{ bron: 9, tekst: 'Dat betekent ook dat er een' }] }), ctx(BEL)), [])
  assert.match(nepClient(nagebootst.s11wahg9).calls.length === 0 ? src('netlify/lib/verschillen.mjs') : '', /Elke zin staat los: hij moet kloppen als de andere zinnen wegvallen/)
})

test('eenzijdig contrast: beide kanten genoemd, niemand aan beide kanten, wie hetzelfde zegt staat erbij (randgevallen keuring 2)', () => {
  // 1. Belastingplan, "De toon ook:": drie koppen die hetzelfde zeggen, maar één kant.
  const toon = toetsZin(zin({
    tekst: 'De toon: De Telegraaf kopt ‘Bom in coalitie’, het FD ‘Spanning in coalitie’ en het AD vraagt of een kabinetscrisis dreigt.',
    bronnen: [12, 7, 3], fragmenten: [{ bron: 12, tekst: 'Bom in coalitie' }, { bron: 7, tekst: 'Spanning in coalitie' }, { bron: 3, tekst: 'dreigt er een kabinetscrisis?' }],
    kanten: [kant([12, 7, 3], 'coalitie')],
  }), ctx(BEL))
  assert.ok(toon.some((r) => /met één kant/.test(r)), toon.join('; '))
  // …ook als de schrijver er een tweede kant bij verzint die de zin niet noemt.
  const verzonnen = toetsZin(zin({
    tekst: 'De toon verschilt: De Telegraaf kopt ‘Bom in coalitie’ en het FD ‘Spanning in coalitie’.',
    bronnen: [12, 7, 10], fragmenten: [{ bron: 12, tekst: 'Bom in coalitie' }, { bron: 7, tekst: 'Spanning in coalitie' }, { bron: 10, tekst: 'sluiten deal met Pro en Volt' }],
    kanten: [kant([12, 7], 'coalitie'), kant([10], 'sluiten deal')],
  }), ctx(BEL))
  assert.ok(verzonnen.includes('kant noemt NOS niet (eenzijdig)'), verzonnen.join('; '))
  // 2. Het live blok: NU.nl ‘kabinetscrisis dreigt’ tegenover ND en RTL Nieuws ‘geen crisis’.
  const z = (kanten, tekst = 'De koppen verschillen: NU.nl schrijft ‘kabinetscrisis dreigt’, het ND en RTL Nieuws koppen dat Paternotte ‘geen crisis’ ziet.', bronnen = [1, 2, 5]) =>
    toetsZin(zin({ tekst, bronnen, fragmenten: bronnen.map((n) => ({ bron: n, tekst: { 1: 'kabinetscrisis dreigt', 2: 'Paternotte: geen crisis', 5: 'Paternotte ziet geen crisis', 4: 'Hoogspanning in coalitie', 8: 'Hoogspanning in de coalitie' }[n] })), kanten }), ctx(LIVE))
  // Eerlijk opgegeven: RTL Nieuws kopt ook ‘Hoogspanning in de coalitie’ en staat dan aan beide kanten.
  const rtl = z([kant([1, 4, 8], 'spanning'), kant([2, 5], 'geen crisis')], 'De koppen verschillen: NU.nl, NOS en RTL Nieuws koppen over crisis en ‘Hoogspanning in coalitie’, het ND en RTL Nieuws dat Paternotte ‘geen crisis’ ziet.', [1, 4, 8, 2, 5])
  assert.ok(rtl.includes('RTL Nieuws staat aan beide kanten (vals contrast)'), rtl.join('; '))
  // Ook als de schrijver RTL Nieuws maar aan één kant zet: in een ander stuk zegt RTL Nieuws ‘geen crisis’.
  const nos = z([kant([8], 'hoogspanning in de coalitie'), kant([2], 'geen crisis')], 'De koppen verschillen: RTL Nieuws kopt ‘Hoogspanning in de coalitie’, het ND dat Paternotte ‘geen crisis’ ziet.', [8, 2])
  assert.ok(nos.includes('RTL Nieuws zegt ook ‘geen crisis’ (vals contrast)'), nos.join('; '))
  // De NOS kopt over hoogspanning, maar staat niet bij die kant: het beeld is eenzijdig.
  const nosWeg = z([kant([8], 'hoogspanning'), kant([2], 'geen crisis')], 'De koppen verschillen: RTL Nieuws kopt over ‘Hoogspanning in de coalitie’, het ND dat Paternotte ‘geen crisis’ ziet.', [8, 2])
  assert.ok(nosWeg.some((r) => /‘hoogspanning’ staat ook bij NOS.*\(eenzijdig\)/.test(r)), nosWeg.join('; '))
  // Zoals de nagebootste schrijver het gaf (kenmerken die verder nergens staan), komt het door de code: dan is het
  // werk voor de Haiku-controle, die het in de proef afkeurt (zie "drie verhalen").
  assert.deepEqual(z([kant([1], 'kabinetscrisis dreigt'), kant([2, 5], 'geen crisis')]), [])
  // Het reserveverschil van de live proef: twee kanten, elk genoemd, niemand aan beide kanten.
  const reserve = nagebootstLive.sts2z5a.schrijver.zinnen.find((x) => x.tekst.startsWith('Wie aan het woord'))
  assert.deepEqual(toetsZin(reserve, ctx(LIVE)), [])
})

test('taal volgt bronkeuze: alleen Nederlandstalige regels en bronnen in het blok, voor iedereen gelijk', () => {
  assert.ok(HEG_NL.rows.every((r) => r.lang === 'nl'))
  assert.ok(HEG.rows.some((r) => r.lang === 'en')) // het verhaal zelf heeft wél Engelse bronnen
  assert.ok(LIVE.rows.every((r) => r.lang === 'nl') && BOM.rows.every((r) => r.lang === 'nl'))
  // De invoer voor de schrijver bevat geen Engelse bron, ook niet als die het nieuwste stuk heeft.
  const client = nepClient({ schrijver: { oordeel: 'geen', zinnen: [] } })
  return maakVerschillen(client, ctx(HEG_NL), { now: 0 }).then(() => {
    assert.doesNotMatch(client.calls[0].messages[0].content, /Al Jazeera|NPR|BBC|The Independent|Deutsche Welle|Le Monde/)
    // Een Engelse bron noemen kan dus niet: die hoort niet bij de aangehaalde regels.
    const r = toetsZin(zin({ soort: 'onbekend', tekst: 'Volgens NRC overleeft Hegseth; de BBC meldt hetzelfde.', bronnen: [2], fragmenten: [{ bron: 2, tekst: 'Hegseth overleeft voorlopig' }] }), ctx(HEG_NL))
    assert.ok(r.includes('noemt BBC zonder bron'), r.join('; '))
    // Kandidaten: drie of meer Nederlandstalige uitgevers; Engelse tellen niet mee.
    const items = new Map([
      ['a', { id: 'a', source: 'nos', sourceName: 'NOS', title: 'A' }], ['b', { id: 'b', source: 'nrc', sourceName: 'NRC', title: 'B' }],
      ['c', { id: 'c', source: 'bbc', sourceName: 'BBC', title: 'C' }], ['d', { id: 'd', source: 'npr', sourceName: 'NPR', title: 'D' }],
    ])
    assert.deepEqual(kandidaten([{ kind: 'story', id: 's' }], new Map([['s', { id: 's', itemIds: ['a', 'b', 'c', 'd'] }]]), items), [])
    // Web en app tonen hetzelfde blok (geen eigen taalfilter op het toestel).
    assert.doesNotMatch(src('shared/verschillen.mjs'), /lang/)
  })
})

// ---------- Uit de kritieke route ----------
test('feed-build: leest alleen wat gekeurd in KV staat, zonder model; traag KV wacht hooguit het leesbudget', async () => {
  const kv = memKv()
  const now = Date.parse('2026-11-11T18:00:00Z')
  // Nog niets in KV: geen blok, en er wordt niets geschreven.
  assert.equal((await verschillenUitKV({ aan: true, ...editie(LIVE), get: kv.get })).size, 0)
  assert.ok(kv.log.every(([op]) => op === 'get'))
  // De geplande functie schrijft (los van de feed); daarna leest de build het gekeurde blok.
  await schrijfVerschillen({ aan: true, client: nepClient(nagebootstLive.sts2z5a), ...editie(LIVE), get: kv.get, set: kv.set, now })
  const blok = (await verschillenUitKV({ aan: true, ...editie(LIVE), get: kv.get })).get(LIVE.story.id)
  assert.match(blok.delen[1].tekst, /^Wie aan het woord is/)
  // KV dat niet antwoordt: na het leesbudget gewoon zonder blok, nooit een fout.
  const t0 = Date.now()
  const traag = await verschillenUitKV({ aan: true, ...editie(LIVE), get: () => new Promise(() => {}), budget: 30 })
  assert.ok(Date.now() - t0 < 200)
  assert.equal(traag.size, 0)
  assert.equal((await verschillenUitKV({ aan: true, ...editie(LIVE), get: async () => { throw new Error('kv') } })).size, 0)
  // Vlag uit: niets gelezen.
  const kv2 = memKv()
  assert.equal((await verschillenUitKV({ aan: false, ...editie(LIVE), get: kv2.get })).size, 0)
  assert.equal(kv2.log.length, 0)
  // In build.mjs: geen model, geen schrijven; de geplande functie doet dat.
  const b = src('netlify/lib/build.mjs')
  const blokCode = b.slice(b.indexOf('const verschillen = verschillenAan()'), b.indexOf(': Promise.resolve(new Map())'))
  assert.match(blokCode, /verschillenUitKV\(/)
  assert.doesNotMatch(blokCode, /client|anthropic|schrijfVerschillen/)
  const f = src('netlify/functions/verschillen-refresh.mjs')
  assert.match(f, /verschillenRonde\(/)
  assert.match(f, /schedule: '3,13,23,33,43,53 \* \* \* \*'/)
  assert.match(f, /if \(!verschillenAan\(\) \|\| !apiKey\) return new Response\('uit'\)/)
})

test('geplande functie: leest de Editie uit de weggeschreven feed en schrijft wat ontbreekt; vlag uit of fout: niets', async () => {
  const kv = memKv()
  const now = Date.parse('2026-11-11T18:00:00Z')
  const kern = { edition: { entries: [{ kind: 'story', id: LIVE.story.id }] }, stories: [LIVE.story], related: [...LIVE.itemsById.values()] }
  const readCore = async () => ({ body: JSON.stringify(kern) })
  const client = nepClient(nagebootstLive.sts2z5a)
  const r = await verschillenRonde({ aan: true, client, readCore, now, get: kv.get, set: kv.set })
  assert.ok(r.get(LIVE.story.id)?.delen)
  assert.equal(kv.m.get(verschillenKey(LIVE.story, LIVE.rows)).status, 'klaar')
  const leeg = nepClient(nagebootstLive.sts2z5a)
  assert.equal((await verschillenRonde({ aan: false, client: leeg, readCore, now, get: kv.get, set: kv.set })).size, 0)
  assert.equal((await verschillenRonde({ aan: true, client: leeg, readCore: async () => { throw new Error('kv') }, now })).size, 0)
  assert.equal((await verschillenRonde({ aan: true, client: leeg, readCore: async () => ({ body: 'kapot' }), now })).size, 0)
  assert.equal(leeg.calls.length, 0)
})

test('feed met de vlag aan duurt niet langer dan zonder, ook met een traag nepmodel (2 s per aanroep)', async () => {
  const { buildFeed } = await import('../netlify/lib/build.mjs')
  const { kvSet } = await import('../netlify/lib/kv.mjs')
  const { STORE_KEY } = await import('../netlify/lib/stream.mjs')
  const t0 = Date.now()
  // Vier Nederlandstalige uitgevers met hetzelfde nieuws: een verhaal dat een blok zou kunnen krijgen.
  const kop = 'Kabinet en oppositie sluiten akkoord over belastingplan na lange onderhandelingen'
  const rss = (host, n) => `<?xml version="1.0"?><rss version="2.0"><channel><title>${host}</title><item><title>${kop}${n ? ` ${n}` : ''}</title><link>https://${host}/a/${n}</link><description>Het kabinet en de oppositie hebben een akkoord gesloten over het belastingplan.</description><pubDate>${new Date(t0 - 36e5).toUTCString()}</pubDate></item></channel></rss>`
  const feeds = { 'feeds.nos.nl': rss('nos.nl', ''), 'nu.nl/rss': rss('www.nu.nl', 'vandaag'), 'rtlnieuws.nl/rss': rss('www.rtlnieuws.nl', 'in Den Haag'), 'nrc.nl/rss': rss('www.nrc.nl', 'na lang overleg') }
  const real = globalThis.fetch
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.url
    const hit = Object.keys(feeds).find((k) => url.includes(k))
    return hit ? new Response(feeds[hit]) : new Response('', { status: 404 })
  }
  const calls = []
  // Andere onderdelen van de feed (De Redacteur) gebruiken ook een model; de verschillen herken je aan hun opdracht.
  const isVerschillen = (req) => /^Je (vergelijkt hoe verschillende media|controleert een korte vergelijking van media)/.test(String(req.system || ''))
  const traag = { calls, messages: { create: async (req) => (calls.push(req), await new Promise((r) => setTimeout(r, isVerschillen(req) ? 2000 : 0)), Promise.reject(new Error('nep'))) } }
  const vlag = process.env.HOOT_VERSCHILLEN
  try {
    const meet = async (aan) => {
      if (aan) process.env.HOOT_VERSCHILLEN = 'aan'
      else delete process.env.HOOT_VERSCHILLEN
      await kvSet(STORE_KEY, null)
      const t = Date.now()
      const out = await buildFeed({ now: t0, anthropic: traag })
      return { ms: Date.now() - t, out }
    }
    await meet(false) // opwarmen (imports, caches)
    const uit = await meet(false)
    const aan = await meet(true)
    assert.ok(aan.ms <= uit.ms + 500, `vlag aan ${aan.ms} ms, uit ${uit.ms} ms`)
    assert.ok(!calls.some(isVerschillen), 'de feed roept het model voor de verschillen nooit aan')
    // Er was wel een kandidaat: het verhaal stond in de Editie met vier uitgevers.
    const items = new Map(aan.out.related.map((i) => [i.id, i]))
    const st = new Map(aan.out.stories.map((s) => [s.id, s]))
    assert.ok(kandidaten(aan.out.edition.entries, st, items).length >= 1, 'geen kandidaat in de nep-Editie')
  } finally {
    globalThis.fetch = real
    if (vlag === undefined) delete process.env.HOOT_VERSCHILLEN
    else process.env.HOOT_VERSCHILLEN = vlag
  }
})
