// Feedback 31 oktober, punten 3 en 4: Binnenland is Nederland, en de eerste Editie van een nieuwe lezer
// leunt niet op buitenland. Op twee vaste momentopnames: de avond van 30 oktober en de live feed van
// 31 oktober (ochtend, de feed waarop het keurpunt de vorige ronde zag falen). Dezelfde maten draait
// meting/acceptatie.mjs (tests/helpers/eerste.mjs) ook op de latere momentopnames.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { loadSnapshot } from './helpers/snapshot.mjs'
import { FIRST, measureFirst, verdictFirst, DREMPELS_EERSTE, measureBinnenland, firstSetup, notDutch } from './helpers/eerste.mjs'
import { composePersonal } from '../src/lib/personal.js'
import { desksOf } from '../netlify/lib/desks.mjs'

const gz = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}`, import.meta.url))).toString('utf8'))
const ochtend = gz('snapshot-2026-10-31-ochtend.json.gz')
// De live feed van 31 oktober 09:30Z (Ochtendeditie van 05:00Z), zoals de productieserver hem levert: met
// de onderwerpen en zonder rubriek per verhaal van de oude server. Hierop keurde de lezerstoets af.
const live = gz('snapshot-2026-10-31-0930.json.gz')
const SNAPS = [['30 oktober avond', loadSnapshot()], ['31 oktober ochtend (live)', ochtend], ['31 oktober 09:30 (live)', live]]

for (const [label, snap] of SNAPS) {
  const rows = measureFirst(snap)
  const v = verdictFirst(rows)

  test(`${label} · eerste Editie: zeven nieuwe lezers, elk een volle Editie`, (t) => {
    t.diagnostic(rows.map((r) => `${r.id}: NL ${r.nl}, buitenland ${r.int}, passend ${r.passend}`).join(' · '))
    assert.equal(rows.length, FIRST.length)
    for (const r of rows) assert.equal(r.plekken, 10, r.id)
  })

  for (const d of DREMPELS_EERSTE.filter((x) => x.hard)) {
    test(`${label} · ${d.label} ${d.min !== undefined ? '≥ ' + d.min : '≤ ' + d.max}`, () => {
      if (d.min !== undefined) assert.ok(v[d.key] >= d.min, `${v[d.key]}`)
      else assert.ok(v[d.key] <= d.max, `${v[d.key]}`)
    })
  }

  test(`${label} · eerste Editie: de vriendin krijgt een Nederlandse voorpagina en meer Nederland dan buitenland`, () => {
    const r = rows.find((x) => x.id === 'vriendin')
    assert.ok(r.entries.some((e) => e.front && e.geo === 'NL'))
    assert.ok(r.nl > r.int, `NL ${r.nl}, buitenland ${r.int}`)
  })

  test(`${label} · Binnenland: geen bericht en geen plek in de algemene Editie die aantoonbaar niet Nederlands is`, (t) => {
    const b = measureBinnenland(snap)
    t.diagnostic(`${b.berichten} Binnenland-berichten, ${b.algemeen} Binnenland-plekken in de algemene Editie`)
    assert.equal(b.zonderNl, 0, b.fout.map((i) => `${i.source} (${i.reden}): ${i.title}`).join(' | '))
    assert.equal(b.algemeenZonderNl, 0)
    assert.ok(b.berichten > 146, 'het aanbod Binnenland is breder dan alleen NOS, NRC en de Volkskrant')
  })
}

// Het keurpunt van de vorige ronde, op de live feed: deze stukken stonden onder Binnenland.
test('31 oktober ochtend (live) · Binnenland: Apple, Google, Pangram en Anthropic staan er niet meer onder', () => {
  const b = measureBinnenland(ochtend, { sample: 1e4 })
  const titles = b.steekproef.map((i) => i.title)
  for (const kop of ['Apple haalt Nvidia in', 'Met AI snijdt Google', 'Pangram als oldschool actieheld', 'Beursgang Anthropic']) assert.ok(!titles.some((x) => x.startsWith(kop)), kop)
  assert.ok(titles.some((x) => x.startsWith('Zeehondencentrum')), 'het zeehondencentrum blijft Binnenland')
})

// De vriendin op de live feed: geen Wetenschap-rubriek of -reden bij buitenlands nieuws.
test('31 oktober ochtend (live) · eerste Editie: de vriendin krijgt geen buitenland met een reden van haar interesses', () => {
  const r = measureFirst(ochtend, FIRST.filter((p) => p.id === 'vriendin'))[0]
  for (const e of r.entries.filter((x) => x.geo === 'INT' && !x.fixed && !x.front)) assert.ok(!/Wetenschap|Binnenland/.test(e.whyText), `${e.title}: ${e.whyText}`)
})

// ---- Lezerstoets op de live feed van 31 oktober 09:30Z (feedback punten 3, 4 en 5) ----
const ALEX = { id: 'alex', interests: ['politiek', 'tech', 'cultuur', 'wereld'] }
const editionOf = (p, data = live) => {
  const ed = composePersonal({ global: data.edition, stories: data.stories, items: data.items, sources: data.sources, now: Date.parse(data.edition.builtAt), builtAt: data.edition.builtAt, previous: null, ...firstSetup(p, data.sources) })
  return ed.entries.map((e) => ({ ...e, title: e.title || ed.items.find((i) => i.id === (e.leadId || e.id))?.title || '' }))
}
const persona = (id) => FIRST.find((p) => p.id === id)
const find = (es, kop) => es.find((e) => e.title.startsWith(kop))

test('31 oktober 09:30 · de vriendin: geen G20, geen Oekraïne, hooguit één buitenlands verhaal zonder reden', () => {
  const es = editionOf(persona('vriendin'))
  assert.equal(es.length, 10)
  for (const kop of ['Groepsfoto G20', 'Hundreds evacuated from Russian-occupied Oleshky', 'Clarence Seedorf']) assert.ok(!find(es, kop), kop)
  const r = measureFirst(live, [persona('vriendin')])[0]
  assert.ok(r.intTotaal <= 1, r.entries.filter((e) => e.geo === 'INT' && !e.real).map((e) => e.title).join(' | '))
  assert.ok(r.nl >= 5, `NL ${r.nl}`)
})

test('31 oktober 09:30 · wie Binnenland koos, opent met Nederland: geen twee buitenlandse verhalen bovenaan', () => {
  for (const id of ['vriendin', 'bi-cu', 'bi']) {
    const r = measureFirst(live, [persona(id)])[0]
    assert.equal(r.entries[0].geo, 'NL', `${id}: ${r.entries[0].title}`)
    assert.ok(r.entries.slice(0, 2).filter((e) => e.geo === 'INT').length <= 1, id)
    assert.ok(!find(editionOf(persona(id)), 'Groepsfoto G20'), `${id}: G20`)
  }
})

test('31 oktober 09:30 · het waarom past bij de interesse (ook met de onderwerpen van de oude server)', () => {
  const v = editionOf(persona('vriendin'))
  const why = (es, kop) => find(es, kop)?.why?.text || ''
  assert.equal(why(v, 'Rubberboot met tientallen migranten'), 'Omdat je Binnenland volgt') // niet "Raakt Binnenland én Cultuur" (Omroep Zeeland)
  assert.ok(!/Wetenschap/.test(why(v, 'Den Haag zet zich schrap')), why(v, 'Den Haag zet zich schrap')) // "uit angst voor rellen"
  assert.ok(!/vakbronnen/.test(why(v, 'Bedroefde reacties om dood Patrick Stewart')))
  assert.ok(!find(v, 'Littler redt het niet'), 'darts is geen Film & series')
  assert.ok(!/Cultuur/.test(why(editionOf(persona('bi-cu')), 'Rubberboot met tientallen migranten')))
  assert.ok(!/Media/.test(why(editionOf(ALEX), 'Rubberboot met tientallen migranten')))
  for (const p of [persona('we-te'), ALEX]) {
    for (const e of editionOf(p)) {
      if (/screwworms/.test(e.title)) assert.ok(!/Latijns-Amerika/.test(e.why.text), e.why.text)
      if (/Littler|Sherrock|darts/i.test(e.title)) assert.ok(!/Film/.test(e.why.text), `${e.title}: ${e.why.text}`)
    }
  }
})

test('31 oktober 09:30 · Binnenland: KLM in India, de boulevard en een Vlaamse slagerij zijn geen Binnenland, en de maat ziet ze', () => {
  for (const kop of ['KLM-crew vol ongeloof', 'Ex-man Halle Berry', 'Nachtelijke inbrekers roven uit wagen']) {
    const its = live.items.filter((i) => i.title?.startsWith(kop))
    assert.ok(its.length, kop)
    for (const i of its) {
      assert.ok(!desksOf(i).has('binnenland'), `${i.source}: ${kop}`)
      assert.ok(notDutch(i), `de maat mist ${i.source}: ${kop}`)
    }
  }
})

test('31 oktober 09:30 · Buiten je bubbel: geen Braziliaans voetbal voor wie alleen Binnenland koos', () => {
  const b = editionOf(persona('bi')).find((e) => e.desk === 'bubbel')
  assert.ok(b && !/Corinthians/.test(b.title), b?.title)
})
