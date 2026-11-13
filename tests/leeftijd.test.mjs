// Leeftijd (13 november 2026, besluit van Alex: "Mijn persoonlijke editie. Ga door."): de zes regels die oude stukken uit
// de Editie houden, vooral uit de persoonlijke. 1. kopgrens en verhaalvenster 12 uur; 2. een lopend verhaal (eerste stuk
// ouder dan 24 uur) alleen met een nieuw feit binnen het venster, hooguit twee per Editie; 3. een blijver alleen als het
// verhaal nog geen 24 uur loopt; 4. een leeftijdsstraf in het gewicht; 5. ook in de persoonlijke Editie een kop van ná de
// vorige Editie; 6. losse stukken minstens 10 uur (was 14). Plus de vloer: onder EDITION_FLOOR gelden de oude grenzen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectForReader, isStale, holdable, isRunning, runningFact, signatures, previousOf, HEAD_MAX_H, RUNNING_H, RUNNING_MAX, HOLD_PUBS, FLOOR_STORY_H, FLOOR_ITEM_H } from '../netlify/lib/stories.mjs'
import { weight, agePenalty, freshBonus, AGE_FREE_H, AGE_MAX } from '../netlify/lib/desks.mjs'
import * as G from '../shared/editor.mjs'

const NOW = Date.parse('2026-11-13T11:00:00Z')
const at = (h) => new Date(NOW - h * 36e5).toISOString()
const SOURCES = [{ id: 'nos', cat: 'nl' }, { id: 'nrc', cat: 'nl' }, { id: 'vk', cat: 'nl' }, { id: 'trouw', cat: 'nl' }, { id: 'bbc', cat: 'int' }, { id: 'nyt', cat: 'int' }, { id: 'guardian', cat: 'int' }]
const FOLLOWED = new Set(SOURCES.map((s) => s.id))
const prof = G.profileOf({ sources: SOURCES, followed: FOLLOWED })
let n = 0
// Alle stukken die in deze toetsen gemaakt zijn, op id (allItems: de pool van een toets met alleen zijn eigen verhalen).
const items = new Map()
const art = (source, title, h, o = {}) => {
  const i = { id: `a${++n}`, kind: 'article', source, title, summary: `${title}.`, image: 'https://x/y.jpg', publishedAt: at(h), topics: [], ...o }
  items.set(i.id, i)
  return i
}
const of = (...sts) => sts.flatMap((st) => st.itemIds.map((id) => items.get(id)))
const story = (id, items, o = {}) => {
  for (const i of items) i.storyId = id // zoals de server: een stuk van een verhaal is geen los stuk
  const ts = items.map((i) => i.publishedAt).sort()
  const pubs = new Set(items.map((i) => i.source)).size
  return { id, itemIds: items.map((i) => i.id), sourceCount: pubs, publisherCount: pubs, ownCount: pubs, latestAt: ts.at(-1), firstAt: ts[0], desk: 'binnenland', ...o }
}
const run = (stories, pool, opts = {}) => {
  const audit = []
  const sel = selectForReader(stories, pool, { mainIds: FOLLOWED, now: NOW, prof, seed: 'leeftijd', audit, ...opts })
  return { sel, audit, ids: sel.map((e) => e.id), why: (id) => audit.filter((a) => a.id === id).map((a) => a.reason) }
}

test('leeftijd · 1: de kopgrens en het verhaalvenster zijn 12 uur (was 24)', () => {
  assert.equal(HEAD_MAX_H, 12)
  assert.equal(isStale({ publishedAt: at(11.9) }, NOW), false)
  assert.equal(isStale({ publishedAt: at(12.1) }, NOW), true, 'een stuk van ruim 12 uur oud is achtergrond')
  const oud = story('s-oud', [art('nos', 'Gemeente Utrecht sluit zwembad De Krommerijn', 13), art('nrc', 'Utrecht sluit zwembad Krommerijn na lekkage', 13.5)])
  const vers = story('s-vers', [art('nos', 'Gemeente Breda sluit zwembad Het Wedloop', 11), art('nrc', 'Breda sluit zwembad Wedloop na lekkage', 11.5)])
  const r = run([oud, vers], of(oud, vers))
  assert.ok(!r.ids.includes('s-oud'))
  assert.deepEqual(r.why('s-oud'), ['ouder-dan-verhaalvenster'])
  assert.ok(r.ids.includes('s-vers'), r.ids.join())
  // De kop: een stuk van ouder dan 12 uur wordt geen kop zolang er een recenter stuk in het verhaal is.
  const late = art('trouw', 'Zwembad in Breda dicht, bezoekers teleurgesteld', 2)
  const mix = story('s-mix', [late, ...vers.itemIds.map((id) => items.get(id))])
  const r2 = run([mix], of(mix))
  assert.equal(r2.sel[0].leadId, late.id)
})

test('leeftijd · 2: een lopend verhaal zonder nieuw feit krijgt geen plek, ook niet met een nieuw stuk', () => {
  assert.equal(RUNNING_H, 24)
  // Het kabinet viel gisteren; vandaag één nieuw stuk zonder nieuwe namen of gebeurtenis.
  const old = ['nos', 'nrc', 'vk'].map((s) => art(s, 'Kabinet-Jetten valt over asielplan, VVD stapt op', 30))
  const zonder = art('trouw', 'Kabinet-Jetten gevallen: wat betekent de val van het kabinet over asielplan', 1)
  const st = story('s-kab', [zonder, ...old])
  assert.equal(isRunning(st, [], NOW), true)
  assert.equal(runningFact(st, [zonder, ...old], signatures([zonder, ...old]), NOW), null)
  const r = run([st], [zonder, ...old])
  assert.ok(!r.ids.includes('s-kab'), r.ids.join())
  assert.deepEqual(r.why('s-kab'), ['lopend-zonder-nieuw-feit'])
  // Met een nieuw feit binnen het venster (een formateur, met naam, bij twee uitgevers): wel, met dat stuk als kop.
  const feit = [art('nos', 'Koning benoemt Dilan Yesilgoz tot informateur na val kabinet-Jetten', 1), art('nrc', 'Dilan Yesilgoz wordt informateur, koning neemt advies over', 1.5)]
  const st2 = story('s-kab', [...feit, zonder, ...old])
  assert.ok(runningFact(st2, [...feit, zonder, ...old], signatures([...feit, zonder, ...old]), NOW))
  const r2 = run([st2], [...feit, zonder, ...old])
  const e = r2.sel.find((x) => x.id === 's-kab')
  assert.ok(e, r2.why('s-kab').join())
  assert.ok(feit.some((i) => i.id === e.leadId), 'de kop noemt het nieuwe feit')
  // Een verhaal dat nog geen 24 uur loopt, heeft geen nieuw feit nodig.
  const jong = story('s-jong', [art('nos', 'Brand in Zwolle verwoest pakhuis aan de haven', 20), art('nrc', 'Grote brand in Zwolse haven, pakhuis verwoest', 2)])
  assert.ok(run([jong], of(jong)).ids.includes('s-jong'))
})

// Drie lopende verhalen, elk met een nieuw feit: hooguit RUNNING_MAX een plek.
function threeRunning() {
  const mk = (id, oldTitle, newTitles) => {
    const old = ['nos', 'nrc', 'vk'].map((s) => art(s, oldTitle, 30))
    const fresh = newTitles.map(([s, t]) => art(s, t, 1))
    return { st: story(id, [...fresh, ...old]), its: [...fresh, ...old] }
  }
  const a = mk('s-run-a', 'Overstroming in Limburg, Maas buiten haar oevers', [['nos', 'Minister Dirk Beljaarts bezoekt Valkenburg na overstroming'], ['nrc', 'Dirk Beljaarts in Valkenburg: noodfonds na overstroming']])
  const b = mk('s-run-b', 'Staking bij Tata Steel in IJmuiden houdt aan', [['nos', 'Vakbond FNV en directeur Hans van den Berg sluiten akkoord bij Tata'], ['nrc', 'Hans van den Berg en FNV bereiken akkoord, staking Tata voorbij']])
  const c = mk('s-run-c', 'Storing bij NS legt treinverkeer rond Utrecht stil', [['nos', 'ProRail-topman Wouter Koolmees biedt excuses aan voor storing'], ['nrc', 'Wouter Koolmees: storing kwam door fout in software ProRail']])
  return [a, b, c]
}

test('leeftijd · 2: hooguit RUNNING_MAX lopende verhalen per Editie (persoonlijk en algemeen)', () => {
  assert.equal(RUNNING_MAX, 2)
  const three = threeRunning()
  const stories = three.map((x) => x.st)
  const pool = three.flatMap((x) => x.its)
  for (const general of [false, true]) {
    const r = run(stories, pool, { general })
    const placed = r.ids.filter((id) => id.startsWith('s-run-'))
    assert.equal(placed.length, RUNNING_MAX, `${general ? 'algemeen' : 'persoonlijk'}: ${r.ids.join()}`)
    const left = stories.map((s) => s.id).find((id) => !placed.includes(id))
    assert.ok(r.why(left).includes('te-veel-lopende-verhalen'), `${left}: ${r.why(left).join()}`)
  }
})

test('leeftijd · 3: een blijver (HOLD_PUBS uitgevers, geen nieuw feit) alleen als het verhaal nog geen 24 uur loopt', () => {
  const pubs = Array.from({ length: HOLD_PUBS }, (_, k) => `p${k}`)
  const items = pubs.map((p, k) => art(p, 'Groot verhaal', 10 + k * 0.1))
  const jong = { id: 's-groot', itemIds: items.map((i) => i.id), publisherCount: HOLD_PUBS, firstAt: at(20) }
  const previous = { heldIds: new Set() }
  assert.equal(holdable(jong, items, previous, NOW), true)
  assert.equal(holdable({ ...jong, firstAt: at(30) }, items, previous, NOW), false, 'loopt al langer dan 24 uur')
  // Zonder firstAt telt het oudste stuk dat de selectie kent.
  assert.equal(holdable({ ...jong, firstAt: undefined }, [...items, art('p0', 'Groot verhaal', 26)], previous, NOW), false)
  // Zonder `now` (oude aanroep) blijft de oude regel.
  assert.equal(holdable({ ...jong, firstAt: at(30) }, items, previous), true)
})

test('leeftijd · 4: één punt eraf per vol uur boven 6 uur sinds het laatste stuk, hooguit 12', () => {
  assert.equal(AGE_FREE_H, 6)
  assert.equal(AGE_MAX, 12)
  assert.equal(agePenalty(at(5.9), NOW), 0)
  assert.equal(agePenalty(at(6.5), NOW), 0)
  assert.equal(agePenalty(at(7), NOW), 1)
  assert.equal(agePenalty(at(11.5), NOW), 5)
  assert.equal(agePenalty(at(40), NOW), 12)
  assert.equal(agePenalty(null, NOW), 12, 'zonder tijd: de volle straf')
  // De bestaande duw voor vers nieuws blijft.
  assert.equal(freshBonus(at(2), NOW), 4)
  assert.equal(weight({ sourceCount: 3, ownCount: 0, latestAt: at(2) }, NOW), 12 + 4)
  assert.equal(weight({ sourceCount: 3, ownCount: 0, latestAt: at(10) }, NOW), 12 + 1 - 4)
  // Even groot, maar van gisteravond: zakt onder nieuws van vanochtend; twee uitgevers meer wegen nog altijd zwaarder dan
  // een paar uur leeftijd.
  assert.ok(weight({ sourceCount: 4, latestAt: at(11) }, NOW) < weight({ sourceCount: 4, latestAt: at(2) }, NOW))
  assert.ok(weight({ sourceCount: 6, latestAt: at(8) }, NOW) > weight({ sourceCount: 4, latestAt: at(1) }, NOW))
})

test('leeftijd · 5: ook in de persoonlijke Editie een kop van ná de vorige Editie', () => {
  const before = story('s-voor', [art('nos', 'Rechter verbiedt demonstratie op de Dam in Amsterdam', 5), art('nrc', 'Demonstratie op de Dam verboden door rechter', 5.5)])
  const after = story('s-na', [art('nos', 'Gemeente Leiden schrapt nieuwe busbaan door de binnenstad', 1), art('nrc', 'Leiden ziet af van busbaan binnenstad', 4)])
  const loose = art('vk', 'Interview: de nieuwe directeur van het Rijksmuseum over haar plannen', 4)
  const looseNew = art('vk', 'Rijksmuseum krijgt nieuwe directeur uit Rotterdam', 1)
  const pool = [...of(before, after), loose, looseNew]
  const vorige = previousOf({ id: 'vorige', builtAt: at(3), entries: [{ kind: 'story', id: 's-elders', leadId: 'x', itemIds: ['x'], title: 'Iets anders over voetbal in Spanje' }] })
  const r = run([before, after], pool, { previous: vorige })
  assert.ok(!r.ids.includes('s-voor'), r.ids.join())
  assert.deepEqual(r.why('s-voor'), ['geen-nieuw-stuk-sinds-vorige-Editie'])
  const e = r.sel.find((x) => x.id === 's-na')
  assert.equal(e?.leadId, after.itemIds[0], 'de kop is het stuk van ná de vorige Editie')
  assert.ok(!r.ids.includes(loose.id))
  assert.ok(r.why(loose.id).includes('geen-nieuw-stuk-sinds-vorige-Editie'))
  assert.ok(r.ids.includes(looseNew.id), r.why(looseNew.id).join())
  // Zonder vorige Editie: geen grens, zoals vroeger.
  assert.ok(run([before, after], pool).ids.includes('s-voor'))
})

test('leeftijd · 5: de persoonlijke regels blijven (gelezen zonder nieuw feit verdwijnt, gezien zakt één keer)', () => {
  const pubs = Array.from({ length: HOLD_PUBS }, (_, k) => SOURCES[k % SOURCES.length].id)
  const old = pubs.slice(0, 7).map((s, k) => art(s, 'Hevige storm raast over Nederland, code rood in Zeeland', 6 + k * 0.1))
  const extra = art('trouw', 'Storm in Zeeland: hoe het eruitzag', 1)
  const st = story('s-storm', [extra, ...old], { publisherCount: 12 })
  const vorige = previousOf({ id: 'vorige', builtAt: at(4), entries: [{ kind: 'story', id: 's-storm', leadId: old[0].id, itemIds: old.map((i) => i.id), title: old[0].title }] })
  const seen = run([st], [extra, ...old], { previous: vorige })
  const e = seen.sel.find((x) => x.id === 's-storm')
  assert.ok(e?.held, `gezien en niet gelezen: zakt één keer (${seen.why('s-storm').join()})`)
  const read = run([st], [extra, ...old], { previous: vorige, ctx: { readIds: new Set([old[0].id]) } })
  assert.ok(!read.ids.includes('s-storm'), 'gelezen zonder nieuw feit: weg')
})

test('leeftijd · 6: een los stuk minstens 10 uur (was 14); op de vloer de oude grenzen', () => {
  assert.equal(G.TEMPO_MIN_H, 10)
  const tien = art('nos', 'Provincie Gelderland opent nieuw natuurgebied bij Arnhem', 11)
  const negen = art('nrc', 'Waterschap verhoogt dijk bij Kampen na hoogwater', 9)
  const r = run([], [tien, negen])
  assert.ok(!r.ids.includes(tien.id))
  assert.deepEqual(r.why(tien.id), ['te-oud-of-geen-intro-en-beeld'])
  assert.ok(r.ids.includes(negen.id))
  // De vloer (composePersonal, onder EDITION_FLOOR): de grenzen van vóór 13 november.
  assert.equal(FLOOR_ITEM_H, 14)
  assert.equal(FLOOR_STORY_H, 24)
  const oud = story('s-oud', [art('nos', 'Gemeente Utrecht sluit zwembad De Krommerijn', 20), art('nrc', 'Utrecht sluit zwembad Krommerijn na lekkage', 20.5)])
  const vloer = run([oud], [tien, negen, ...of(oud)], { floor: true })
  assert.ok(vloer.ids.includes(tien.id) && vloer.ids.includes('s-oud'), vloer.ids.join())
})

test('leeftijd · 2: in je hele persoonlijke Editie hooguit RUNNING_MAX lopende verhalen, ook langs de aanvulling', async () => {
  const { composePersonal } = await import('../src/lib/personal.js')
  const three = threeRunning()
  // Een vierde lopend verhaal zonder nieuw feit, alleen via de algemene Editie (je volgt geen van zijn bronnen).
  const oldQ = ['bbc', 'nyt', 'guardian'].map((s) => art(s, 'Earthquake hits Chile, thousands evacuated from Santiago', 30))
  const newQ = art('bbc', 'Chile earthquake: what we know about the aftermath in Santiago', 1)
  const quake = story('s-run-q', [newQ, ...oldQ], { desk: 'buitenland' })
  const stories = [...three.map((x) => x.st), quake]
  const all = [...three.flatMap((x) => x.its), newQ, ...oldQ]
  const global = { id: '2026-11-13-middag', builtAt: new Date(NOW).toISOString(), entries: stories.map((st) => ({ kind: 'story', id: st.id, leadId: st.itemIds[0], desk: st.desk })), items: all, bubble: [] }
  const ed = composePersonal({ global, stories, items: all, sources: SOURCES.map((s) => ({ ...s, lang: s.cat === 'nl' ? 'nl' : 'en' })), followed: new Set(['nos', 'nrc', 'vk']), now: NOW, builtAt: global.builtAt })
  const running = ed.entries.filter((e) => e.id.startsWith('s-run-'))
  assert.ok(running.length <= RUNNING_MAX, running.map((e) => e.id).join())
  assert.ok(running.length >= 1, 'lopende verhalen met een nieuw feit mogen wel')
  assert.ok(!ed.entries.some((e) => e.id === 's-run-q'), 'een lopend verhaal zonder nieuw feit komt ook niet via de aanvulling')
})
