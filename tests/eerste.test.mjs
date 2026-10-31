// Feedback 31 oktober, punten 3 en 4: Binnenland is Nederland, en de eerste Editie van een nieuwe lezer
// leunt niet op buitenland. Op twee vaste momentopnames: de avond van 30 oktober en de live feed van
// 31 oktober (ochtend, de feed waarop het keurpunt de vorige ronde zag falen). Dezelfde maten draait
// meting/acceptatie.mjs (tests/helpers/eerste.mjs) ook op de latere momentopnames.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { loadSnapshot } from './helpers/snapshot.mjs'
import { FRONT_SOURCES, chosenReason, visibleReason } from '../shared/editor.mjs'
import { FIRST, measureFirst, verdictFirst, DREMPELS_EERSTE, measureBinnenland, firstSetup, notDutch } from './helpers/eerste.mjs'
import { composePersonal } from '../src/lib/personal.js'
import { desksOf, isNonEuropean } from '../netlify/lib/desks.mjs'
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
// De live feed van 31 oktober 10:50Z (derde ronde): Maher en Kid Rock, Carney, de witte dwergen en de
// rubberboot bij Zeeland, ruw en hertagd. Hierop keurde de lezerstoets af.
const live1050 = gz('snapshot-2026-10-31-1050.json.gz')
const live1050Retag = retag(live1050)
// De live feed van 31 oktober 12:00Z (vierde ronde): Haley Stevens, de Texaanse Republikeinen en Talarico.
const live1200 = gz('snapshot-2026-10-31-1200.json.gz')
const live1200Retag = retag(live1200)
const SNAPS = [['30 oktober avond', loadSnapshot()], ['31 oktober ochtend (live)', ochtend], ['31 oktober 09:30 (live)', live], ['31 oktober 09:30 (hertagd)', liveRetag], ['31 oktober 10:50 (live)', live1050], ['31 oktober 10:50 (hertagd)', live1050Retag]]

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

// ---- Derde ronde (feedback 31 oktober, live feed 10:50Z): vier keurpunten, als regels getest ----
const ZONDER_WERELD = [...FIRST, ...MORE].filter((p) => !p.interests.includes('wereld'))
const CANADA = /Canad|Carney|Kanada/i
for (const [tag, data] of [['live', live1050], ['hertagd', live1050Retag]]) {
  const editionOf = (p) => editionOfData(p, data)

  test(`31 oktober 10:50 (${tag}) · 1. een buitenlands verhaal zonder reden staat niet in de Editie van wie Wereld niet koos, met "Het nieuws van nu" al helemaal niet`, () => {
    for (const p of ZONDER_WERELD) {
      const es = editionOf(p)
      assert.equal(es.length, 10, p.id)
      assert.ok(!find(es, 'Bill Maher Fact-Checks Kid Rock'), `${p.id}: Maher en Kid Rock`)
      // Een buitenlandse rubriek zonder gekozen reden mag alleen als groot nieuws, breed verhaal of bubbel met een eigen label.
      for (const e of es) if (e.desk == null && /^Het nieuws van nu$/.test(e.why?.text || '')) assert.ok(!['vs', 'buitenland', 'middenoosten', 'oekraine'].some((d) => desksOf(live1050.items.find((i) => i.id === (e.leadId || e.id)) || {}).has(d)), `${p.id}: ${e.title}`)
    }
  })

  test(`31 oktober 10:50 (${tag}) · 1. de maat: een reden die het waarom niet noemt, is geen reden`, () => {
    assert.equal(chosenReason({ interest: { pts: 11, t: 'film', f: 'cultuur', cov: 1, shown: false } }), false)
    assert.equal(chosenReason({ interest: { pts: 11, t: 'film', f: 'cultuur', cov: 1 } }), true)
    assert.equal(visibleReason({ interest: { pts: 11, shown: false } }), false)
    assert.equal(visibleReason({ interest: { pts: 11, shown: false }, mine: { pts: 9, n: 4 } }), true)
    for (const r of measureFirst(data, ZONDER_WERELD)) for (const e of r.entries) assert.ok(!(e.real && e.whyText === 'Het nieuws van nu'), `${r.id}: ${e.title}`)
  })

  test(`31 oktober 10:50 (${tag}) · 2. Politiek zonder Wereld is Nederlandse en Europese politiek: de Canadese premier is dat niet`, () => {
    assert.ok(isNonEuropean({ title: 'Special episode: An exclusive interview with Canadian PM Mark Carney' }))
    assert.ok(isNonEuropean({ title: 'EU und Kanada erzielen Einigung' }))
    assert.ok(!isNonEuropean({ title: 'Mark Carney puts deadline on EU ‘associate membership’ push' }))
    for (const p of ZONDER_WERELD.filter((x) => x.interests.includes('politiek'))) {
      for (const e of editionOf(p)) assert.ok(!(/Politiek/.test(e.why?.text || '') && CANADA.test(e.title)), `${p.id}: ${e.title} (${e.why.text})`)
    }
  })

  test(`31 oktober 10:50 (${tag}) · 3. de rubriek van het verhaal gaat voor de vakreden van de bron: wetenschap is geen Tech`, () => {
    for (const p of ZONDER_WERELD.filter((x) => !x.interests.includes('wetenschap'))) {
      assert.ok(!find(editionOf(p), 'White Dwarfs') || !/Tech/.test(find(editionOf(p), 'White Dwarfs').why.text), p.id)
    }
    const r = editionOf(persona('bi-te-ec'))
    for (const e of r) if (e.desk === 'wetenschap') assert.ok(!/Omdat je Tech volgt/.test(e.why.text), `${e.title}: ${e.why.text}`)
  })

  test(`31 oktober 10:50 (${tag}) · 4. de maat: Hulpdiensten bij Zeeland is Nederlands, ook als Belgische kranten erover schrijven`, () => {
    for (const r of measureFirst(data, FIRST)) {
      const e = r.entries.find((x) => x.title.startsWith('Video | Hulpdiensten halen tientallen mensen van rubberboot'))
      if (e) assert.equal(e.geo, 'NL', r.id)
      assert.equal(r.valsBinnenland, 0, r.id)
    }
  })
}

// ---- Vierde ronde (feedback 31 oktober, live feed 12:00Z) ----
import { geoOfMembers } from './helpers/eerste.mjs'
for (const [tag, data] of [['live', live1200], ['hertagd', live1200Retag]]) {
  const editionOf = (p) => editionOfData(p, data)
  const srcMap = new Map(data.sources.map((s) => [s.id, s]))

  test(`31 oktober 12:00 (${tag}) · 1. VS-politiek uit een buitenlandse bron zonder rubriek is buitenland, ook voor de maat`, () => {
    const hs = data.items.filter((i) => /^Why Haley Stevens/.test(i.title || ''))
    assert.ok(hs.length)
    assert.equal(geoOfMembers(hs, srcMap), 'INT')
    for (const p of ZONDER_WERELD) {
      const es = editionOf(p)
      assert.ok(!find(es, 'Why Haley Stevens'), `${p.id}: Haley Stevens zonder gekozen reden`)
      const r = measureFirst(data, [p])[0]
      assert.ok(r.intOngekozen <= 2, `${p.id}: ${r.intOngekozen}`)
    }
  })

  test(`31 oktober 12:00 (${tag}) · 3. een vakgebied-label past bij het verhaal: Texaanse Republikeinen zijn geen Wetenschap, Talarico geen Tech`, () => {
    for (const p of ZONDER_WERELD) {
      for (const e of editionOf(p)) {
        if (/^The Texas Republicans Who Have Had Enough/.test(e.title)) assert.ok(!/Wetenschap/.test(e.why.text), `${p.id}: ${e.why.text}`)
        if (/^Talarico Makes Final Election Pitch/.test(e.title)) assert.ok(!/Tech/.test(e.why.text), `${p.id}: ${e.why.text}`)
      }
    }
  })

  test(`31 oktober 12:00 (${tag}) · 3. Amerikaanse politiek zonder Wereld is nooit "Economie" zonder zakenbron of zakenkop (Midterms en persoonlijke aanvallen)`, () => {
    for (const p of ZONDER_WERELD.filter((x) => x.interests.includes('economie'))) {
      for (const e of editionOf(p)) {
        if (/^Trump and GOP Close Midterms/.test(e.title)) assert.ok(!/Economie/.test(e.why.text), `${p.id}: ${e.why.text}`)
      }
    }
  })

  test(`31 oktober 12:00 / 10:50 (${tag}) · 1. een buitenlands verhaal in een niet-gekozen rubriek (Pompeï, Wetenschap) blijft weg zonder gekozen reden`, () => {
    const d = tag === 'live' ? live1050 : live1050Retag
    for (const p of ZONDER_WERELD.filter((x) => !x.interests.includes('wetenschap'))) {
      assert.ok(!find(editionOfData(p, d), 'Zeldzame vondst in Pompe'), `${p.id}: Pompeï zonder gekozen reden`)
    }
  })
}

// Vijfde ronde (feedback 31 oktober): de rubberboot bij Breskens stond twee keer in één Editie, als NOS-verhaal
// en als Volkskrant-stuk ("Hulpdiensten rukken uit voor boot voor Zeeuwse kust"), zonder gedeeld bericht
// in de verhalen van het toestel en zonder gedeeld gebeurtenis-woord. Eén plek per gebeurtenis (sameSubject).
import { signatures, sameSubject } from '../netlify/lib/stories.mjs'
for (const [tag, data] of [['12:00 live', live1200], ['12:00 hertagd', live1200Retag], ['10:50 live', live1050], ['10:50 hertagd', live1050Retag]]) {
  test(`31 oktober ${tag} · één gebeurtenis staat maar één keer in de Editie (Breskens)`, () => {
    const all = new Map([...data.items, ...(data.edition.items || [])].map((i) => [i.id, i]))
    const sig = signatures([...all.values()].filter((i) => i.kind !== 'post'))
    const storyById = new Map(data.stories.map((s) => [s.id, s]))
    for (const p of [...FIRST, ...MORE]) {
      const es = editionOfData(p, data)
      const boat = es.filter((e) => /Breskens|Zeeuwse kust|rubberboot/i.test(e.title))
      assert.ok(boat.length <= 1, `${p.id}: ${boat.map((e) => e.title).join(' | ')}`)
      const mem = es.map((e) => new Set([e.leadId || e.id, ...(e.kind === 'story' ? storyById.get(e.id)?.itemIds || [] : [])]))
      for (let a = 0; a < es.length; a++) for (let b = a + 1; b < es.length; b++) {
        assert.ok(![...mem[a]].some((x) => mem[b].has(x)), `${p.id}: ${es[a].title} | ${es[b].title}`)
        const la = sig.get(es[a].leadId || es[a].id)
        const lb = sig.get(es[b].leadId || es[b].id)
        if (la && lb) assert.ok(!sameSubject(la, lb), `${p.id}: ${es[a].title} | ${es[b].title}`)
      }
    }
  })
}

test('31 oktober · sameSubject: één plaatsnaam in de kop, drie kernwoorden en hetzelfde getal is hetzelfde onderwerp', () => {
  const t = '2026-10-31T09:00:00Z'
  const arts = [
    { id: 'nos', title: 'Rubberboot met tientallen migranten van zee gehaald bij Breskens', summary: 'Hulpdiensten hebben vanochtend een rubberboot met 38 mensen van zee gehaald bij Breskens. De boot is naar een jachthaven in Cadzand gesleept.', publishedAt: t },
    { id: 'vk', title: 'Hulpdiensten rukken uit voor boot voor Zeeuwse kust, twee opvarenden aangehouden wegens mensensmokkel', summary: 'De hulpdiensten zijn in Zeeuws-Vlaanderen in groten getale uitgerukt voor een rubberboot voor de kust van Breskens met 38 opvarenden.', publishedAt: t },
    { id: 'ander', title: 'Brand in loods bij Breskens, hulpdiensten met groot materieel ter plaatse', summary: 'In een loods aan de haven van Breskens woedt een grote brand. Er zijn geen gewonden.', publishedAt: t },
    { id: 'naam', title: 'Wethouder Breskens opent nieuwe haven', summary: 'De wethouder van Sluis opende zaterdag de vernieuwde haven in Breskens.', publishedAt: t },
  ]
  const sig = signatures(arts)
  assert.equal(sameSubject(sig.get('nos'), sig.get('vk')), true)
  assert.equal(sameSubject(sig.get('nos'), sig.get('ander')), false)
  assert.equal(sameSubject(sig.get('vk'), sig.get('naam')), false)
})

test('31 oktober 12:00 · "indien" en "chili" in een Nederlandse kop maken het geen niet-Europees stuk', () => {
  assert.ok(!isNonEuropean({ title: 'Kabinet legt maatregel op, indien nodig ook in Brussel' }))
  assert.ok(!isNonEuropean({ title: 'Chili con carne in de kantine van de Tweede Kamer' }))
  assert.ok(isNonEuropean({ title: 'India en Chileense president spreken af' }))
})
