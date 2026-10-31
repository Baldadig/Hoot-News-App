// Feedback 31 oktober, punten 3 en 4: Binnenland is Nederland, en de eerste Editie van een nieuwe lezer
// leunt niet op buitenland. Op twee vaste momentopnames: de avond van 30 oktober en de live feed van
// 31 oktober (ochtend, de feed waarop het keurpunt de vorige ronde zag falen). Dezelfde maten draait
// meting/acceptatie.mjs (tests/helpers/eerste.mjs) ook op de latere momentopnames.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { loadSnapshot } from './helpers/snapshot.mjs'
import { FRONT_SOURCES } from '../shared/editor.mjs'
import { FIRST, measureFirst, verdictFirst, DREMPELS_EERSTE, measureBinnenland, firstSetup, notDutch } from './helpers/eerste.mjs'
import { composePersonal } from '../src/lib/personal.js'
import { desksOf } from '../netlify/lib/desks.mjs'
import { retag, retagDiff } from './helpers/retag.mjs'

const gz = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}`, import.meta.url))).toString('utf8'))
const ochtend = gz('snapshot-2026-10-31-ochtend.json.gz')
// De live feed van 31 oktober 09:30Z (Ochtendeditie van 05:00Z), zoals de productieserver hem levert: met
// de onderwerpen en zonder rubriek per verhaal van de oude server. Hierop keurde de lezerstoets af.
const live = gz('snapshot-2026-10-31-0930.json.gz')
// Dezelfde feed, hertagd zoals de server van deze checkout hem levert (tests/helpers/retag.mjs): raw is
// niet gelijk aan hertagd (andere onderwerpen bij honderden berichten, een rubriek per verhaal), dus de
// lezerstoets draait op allebei.
const liveRetag = retag(live)
const SNAPS = [['30 oktober avond', loadSnapshot()], ['31 oktober ochtend (live)', ochtend], ['31 oktober 09:30 (live)', live], ['31 oktober 09:30 (hertagd)', liveRetag]]

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
const editionOfData = (p, data) => {
  const ed = composePersonal({ global: data.edition, stories: data.stories, items: data.items, sources: data.sources, now: Date.parse(data.edition.builtAt), builtAt: data.edition.builtAt, previous: null, ...firstSetup(p, data.sources) })
  return ed.entries.map((e) => ({ ...e, title: e.title || ed.items.find((i) => i.id === (e.leadId || e.id))?.title || '' }))
}
// Feedback 31 oktober, tweede ronde: wie Binnenland koos en Wereld niet, met nog twee combinaties.
const MORE = [{ id: 'bi-po', interests: ['binnenland', 'politiek'] }, { id: 'bi-te-ec', interests: ['binnenland', 'tech', 'economie'] }]
const persona = (id) => FIRST.find((p) => p.id === id) || MORE.find((p) => p.id === id)
const find = (es, kop) => es.find((e) => e.title.startsWith(kop))

test('31 oktober 09:30 · de hertagde momentopname verschilt echt van de ruwe', (t) => {
  const d = retagDiff(live, liveRetag)
  t.diagnostic(`${d.topics} van ${d.items} berichten andere onderwerpen, ${d.desks} van ${d.stories} verhalen een rubriek`)
  assert.ok(d.topics > 20 && d.desks > 30)
  assert.ok(live.stories.every((s) => s.desk === undefined), 'de ruwe feed heeft geen rubriek per verhaal')
})

// De lezerstoets op de ruwe feed (de oude server, met trustedTopics) en op de hertagde.
for (const [tag, data] of [['live', live], ['hertagd', liveRetag]]) {
const live = data
const editionOf = (p) => editionOfData(p, live)

test(`31 oktober 09:30 (${tag}) · de vriendin: geen G20, geen Oekraïne, hooguit één buitenlands verhaal zonder reden`, () => {
  const es = editionOf(persona('vriendin'))
  assert.equal(es.length, 10)
  for (const kop of ['Groepsfoto G20', 'Hundreds evacuated from Russian-occupied Oleshky', 'Clarence Seedorf']) assert.ok(!find(es, kop), kop)
  const r = measureFirst(live, [persona('vriendin')])[0]
  assert.ok(r.intTotaal <= 1, r.entries.filter((e) => e.geo === 'INT' && !e.real).map((e) => e.title).join(' | '))
  assert.ok(r.nl >= 5, `NL ${r.nl}`)
})

test(`31 oktober 09:30 (${tag}) · wie Binnenland koos, opent met Nederland: geen twee buitenlandse verhalen bovenaan`, () => {
  for (const id of ['vriendin', 'bi-cu', 'bi']) {
    const r = measureFirst(live, [persona(id)])[0]
    assert.equal(r.entries[0].geo, 'NL', `${id}: ${r.entries[0].title}`)
    assert.ok(r.entries.slice(0, 2).filter((e) => e.geo === 'INT').length <= 1, id)
    assert.ok(!find(editionOf(persona(id)), 'Groepsfoto G20'), `${id}: G20`)
  }
})

test(`31 oktober 09:30 (${tag}) · het waarom past bij de interesse (ook met de onderwerpen van de oude server)`, () => {
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

test(`31 oktober 09:30 (${tag}) · Binnenland: KLM in India, de boulevard en een Vlaamse slagerij zijn geen Binnenland, en de maat ziet ze`, () => {
  for (const kop of ['KLM-crew vol ongeloof', 'Ex-man Halle Berry', 'Nachtelijke inbrekers roven uit wagen']) {
    const its = live.items.filter((i) => i.title?.startsWith(kop))
    assert.ok(its.length, kop)
    for (const i of its) {
      assert.ok(!desksOf(i).has('binnenland'), `${i.source}: ${kop}`)
      assert.ok(notDutch(i), `de maat mist ${i.source}: ${kop}`)
    }
  }
})

test(`31 oktober 09:30 (${tag}) · Buiten je bubbel: geen Braziliaans voetbal voor wie alleen Binnenland koos`, () => {
  const b = editionOf(persona('bi')).find((e) => e.desk === 'bubbel')
  assert.ok(b && !/Corinthians/.test(b.title), b?.title)
})
}

// ---- Tweede ronde (feedback 31 oktober): Binnenland zonder Wereld, het brede verhaal, eerlijke labels ----
// Op alle momentopnames, ook de hertagde: wie Binnenland koos en Wereld niet, opent met een Nederlands
// verhaal; buitenland op de voorpagina alleen als groot nieuws en hooguit één; Politiek is dan Den Haag en
// Brussel (geen VS-politiek, Trump of verkiezingen elders als reden); en "Waar iedereen over schrijft" is
// geen buitenland zonder reden.
for (const [label, snap] of SNAPS) {
  test(`${label} · Binnenland zonder Wereld (bi-po-ec, bi-po, bi-te-ec): Nederland eerst, Politiek is Den Haag en Brussel`, () => {
    for (const r of measureFirst(snap, [persona('bi-po-ec'), ...MORE])) {
      const es = r.entries
      assert.equal(es.length, 10, r.id)
      assert.equal(es[0].geo, 'NL', `${r.id}: ${es[0].title}`)
      assert.ok(es.slice(0, 2).filter((e) => e.geo === 'INT').length <= 1, r.id)
      assert.ok(r.voorpaginaInt <= 1, `${r.id}: ${r.voorpaginaInt} buitenlandse verhalen op de voorpagina`)
      for (const e of es.filter((x) => x.geo === 'INT')) {
        assert.ok(!/VS-politiek|Trump|Verkiezingen/.test(e.whyText), `${r.id}: ${e.title} (${e.whyText})`)
        assert.ok(!(e.why === 'breed' && !e.real), `${r.id}: breed buitenland zonder reden: ${e.title}`)
      }
    }
  })

  test(`${label} · het brede verhaal is geen buitenland zonder reden voor wie Wereld niet koos`, () => {
    for (const r of measureFirst(snap, [...FIRST, ...MORE].filter((p) => !p.interests.includes('wereld')))) {
      for (const e of r.entries.filter((x) => x.why === 'breed')) assert.ok(e.geo !== 'INT' || e.real, `${r.id}: ${e.title}`)
    }
  })

  test(`${label} · "Jouw rubriek" alleen voor een rubriek die je koos`, () => {
    for (const r of measureFirst(snap, [...FIRST, ...MORE, ALEX])) {
      const p = persona(r.id) || ALEX
      for (const e of r.entries) {
        if (/^Jouw rubriek Binnenland/.test(e.whyText)) assert.ok(p.interests.includes('binnenland'), `${r.id}: ${e.title}`)
        if (/^Jouw rubriek (Buitenland|VS|Midden-Oosten|Oekraïne)/.test(e.whyText)) assert.ok(p.interests.includes('wereld'), `${r.id}: ${e.whyText}`)
        if (/^Jouw rubriek Wetenschap/.test(e.whyText)) assert.ok(p.interests.includes('wetenschap'), `${r.id}: ${e.title}`)
      }
    }
  })

  test(`${label} · het waarom noemt een onderwerp alleen als je dat zelf koos (geen "Den Haag" voor wie Politiek koos)`, () => {
    for (const r of measureFirst(snap, [...FIRST, ...MORE, ALEX])) {
      for (const e of r.entries) assert.ok(!/Omdat je Den Haag volgt|Omdat je Misdaad & recht volgt/.test(e.whyText), `${r.id}: ${e.title} (${e.whyText})`)
      for (const e of r.entries.filter((x) => x.front && x.geo === 'INT')) assert.ok(/Groot nieuws/.test(e.whyText) || e.real, `${r.id}: ${e.title}`)
    }
  })
}

test('31 oktober 09:30 · bi-po-ec opent niet meer met de paus, Lula en Wall Street', () => {
  for (const data of [live, liveRetag]) {
    const r = measureFirst(data, [persona('bi-po-ec')])[0]
    assert.equal(r.entries[0].geo, 'NL', r.entries[0].title)
    for (const kop of ['Leo XIV eerste paus', 'Lula’s surprise election victory', 'Groepsfoto G20']) assert.ok(!r.entries.slice(0, 3).some((e) => e.title.startsWith(kop)), kop)
    assert.ok(!r.entries.some((e) => e.title.startsWith('Groepsfoto G20') && e.why === 'breed'), 'G20 als breed verhaal')
  }
})

test('31 oktober 09:30 · Alex (Politiek, Tech, Cultuur, Wereld): de rellen in Den Haag zijn niet "Omdat je Den Haag volgt"', () => {
  for (const data of [live, liveRetag, ochtend]) {
    for (const e of editionOfData(ALEX, data)) if (/^Den Haag zet zich schrap/.test(e.title)) assert.ok(!/Den Haag volgt|Politiek/.test(e.why.text), e.why.text)
  }
})

test('31 oktober 09:30 · Engels voetbal: Aston Villa tegen Carragher is Sport, geen Misdaad & recht, en geen Nederlandse plek', () => {
  for (const data of [live, liveRetag]) {
    for (const id of ['bi', 'bi-sp', 'vriendin']) {
      for (const e of measureFirst(data, [persona(id)])[0].entries.filter((x) => /Carragher/.test(x.title))) {
        assert.notEqual(e.geo, 'NL', `${id}: ${e.title}`)
        assert.ok(!/Misdaad|Binnenland/.test(e.whyText), `${id}: ${e.whyText}`)
      }
    }
  }
})
