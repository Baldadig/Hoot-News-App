// De persoonlijke selectie (De Redacteur, P4): selectForReader met voorpagina, indeling en
// aanvulling. Eerst op een klein verzonnen aanbod, daarna op de vaste momentopname met de
// twaalf persona's (bouwspec §11.3). selectEdition blijft ongewijzigd (tests/meetlat.test.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectForReader, selectEdition } from '../netlify/lib/stories.mjs'
import * as G from '../shared/editor.mjs'
import { storiesForReader, editionBasis } from '../src/lib/personal.js'
import { loadSnapshot, nowOf, readIdsOf, PERSONAS, setupFor } from './helpers/snapshot.mjs'

// ---------- Een klein aanbod ----------
const NOW = Date.parse('2026-10-30T18:00:00Z')
const at = (h) => new Date(NOW - h * 36e5).toISOString()
const SOURCES = [{ id: 'nos', cat: 'nl' }, { id: 'nrc', cat: 'nl' }, { id: 'verge', cat: 'tech' }, { id: 'carbon', cat: 'wetenschap' }, { id: 'bbc', cat: 'int' }]
const OWN = new Set(['nos', 'nrc', 'verge', 'carbon'])
let n = 0
const art = (source, title, o = {}) => ({ id: `i${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: at(2), topics: [], ...o })
// Een verhaal met `count` bronnen, waarvan de berichten uit eigen bronnen in de pool zitten.
function story(id, items, count, o = {}) {
  return { id, itemIds: items.map((i) => i.id), sourceCount: count, ownCount: 0, latestAt: items[0].publishedAt, desk: null, ...o }
}
function world() {
  n = 0
  const a = [art('nos', 'Kabinet Jetten valt over Groningse gaswinning', { topics: ['nederland'] }), art('nrc', 'Jetten verliest steun Kamer om gaswinning Groningen', { topics: ['nederland'] })]
  const b = [art('nos', 'Zelensky bezoekt Kharkiv na zware nachtelijke aanval'), art('nrc', 'Oekraïense president Zelensky in Kharkiv')]
  const c = [art('nos', 'Vance kondigt kandidatuur aan in Ohio', { topics: ['vs-politiek'] }), art('nrc', 'Vance stelt zich kandidaat, Republikeinen verdeeld', { topics: ['vs-politiek'] })]
  const d = [art('verge', 'Anthropic unveils Claude model for spreadsheets', { topics: ['ai'] })]
  const e = [art('carbon', 'Analysis: Brazilian deforestation fell sharply this year', { topics: ['klimaat'] })]
  const f = [art('nos', 'Brand in Utrechtse binnenstad, bewoners geëvacueerd')]
  const loose = [art('verge', 'Review: the Pixel Fold 3 is finally sturdy', { topics: ['gadgets'], publishedAt: at(5) }), art('carbon', 'Q&A: why Arctic sea ice matters for Europe winters', { topics: ['klimaat'], publishedAt: at(40) })]
  const stories = [story('s-kab', a, 12, { desk: 'binnenland' }), story('s-zel', b, 7, { desk: 'oekraine' }), story('s-vance', c, 6, { desk: 'vs' }), story('s-ai', d, 3, { desk: null }), story('s-bos', e, 2, { desk: 'wetenschap' }), story('s-brand', f, 2, { desk: 'binnenland' })]
  return { stories, pool: [...a, ...b, ...c, ...d, ...e, ...f, ...loose], loose }
}
const profOf = (o = {}) => G.profileOf({ sources: SOURCES, followed: OWN, ...o })
const run = (o = {}, w = world()) => selectForReader(w.stories, w.pool, { mainIds: OWN, now: NOW, size: 6, prof: profOf(o.prof), ctx: o.ctx || {}, seed: 'zaad', ...o.opts })
// Normen 1 november 2026: zonder de interesse Wereld alleen groot buitenlands nieuws (acht uitgevers,
// of vijf uit twee landen), hooguit twee plekken. In deze kleine wereld zijn Zelensky (7 bronnen, één
// land), Vance (6) en de Braziliaanse ontbossing geen groot nieuws. Wie Wereld koos, heeft geen plafond;
// de toetsen op lengte en mechaniek gebruiken die lezer.
const WERELD = { interests: ['wereld'] }

test('selectie: precies het gevraagde aantal plekken, deterministisch, gesorteerd op gewicht', () => {
  const sel = run({ prof: WERELD })
  assert.equal(sel.length, 6)
  assert.equal(JSON.stringify(sel), JSON.stringify(run({ prof: WERELD })))
  // Zonder Wereld liever korter dan ongeoorloofd aanvullen: alleen wat de norm toelaat.
  const plain = run()
  assert.deepEqual(plain.map((e) => e.id), ['s-kab', 's-ai', 's-brand', 'i10'])
  for (let i = 1; i < sel.length; i++) assert.ok(sel[i - 1].w >= sel[i].w)
  for (const e of sel) assert.ok(e.parts && typeof e.w === 'number' && e.desk !== undefined, JSON.stringify(e))
})

test('selectie: de voorpagina is voor iedereen gelijk, met de rubriek van de server', () => {
  // Gelijk voor iedereen met dezelfde keuze voor Wereld; zonder Wereld valt Zelensky (geen groot nieuws) af.
  const plain = run().filter((e) => e.front)
  const tech = run({ prof: { interests: ['tech'], topics: ['ai'] } }).filter((e) => e.front)
  assert.deepEqual(plain.map((e) => [e.id, e.desk]), [['s-kab', 'binnenland']])
  assert.deepEqual(tech.map((e) => [e.id, e.desk]), plain.map((e) => [e.id, e.desk]))
  const wereld = run({ prof: WERELD }).filter((e) => e.front)
  const wereldTech = run({ prof: { interests: ['wereld', 'tech'], topics: ['ai'] } }).filter((e) => e.front)
  assert.deepEqual(wereld.map((e) => [e.id, e.desk]), [['s-kab', 'binnenland'], ['s-zel', 'oekraine']])
  assert.deepEqual(wereldTech.map((e) => [e.id, e.desk]), wereld.map((e) => [e.id, e.desk]))
  // Vanaf FRONT_BIG (acht) bronnen óók op de voorpagina, tot FRONT_MAX. De oude regel "hooguit één
  // buitenlands verhaal op de voorpagina" is vervangen door het plafond van twee in de hele Editie.
  const w = world()
  w.stories.find((s) => s.id === 's-vance').sourceCount = 11
  w.stories.find((s) => s.id === 's-zel').sourceCount = 10
  const big = run({}, w)
  assert.deepEqual(big.filter((e) => e.front).map((e) => e.id).sort(), ['s-kab', 's-vance', 's-zel'])
  // Een lege rubriek van de server blijft leeg (niet de rubriek uit wat deze lezer heeft).
  const x = world()
  x.stories.find((s) => s.id === 's-kab').desk = null
  assert.equal(run({}, x).find((e) => e.id === 's-kab').desk, null)
})

test('selectie: jouw zetels vullen met wat er thuishoort; een eigen pagina gaat voor', () => {
  const sel = run({ prof: { interests: ['tech'], topics: ['ai', 'gadgets'] } })
  assert.equal(sel.deskOrder[0], 'tech')
  const ai = sel.find((e) => e.id === 's-ai')
  assert.equal(ai.desk, 'tech')
  assert.equal(ai.planned, true)
  assert.ok(ai.parts.interest.pts >= 14)
  // Zonder keuzes is de indeling KERN, en een rubriek uit de indeling blijft de kernrubriek.
  const plain = run()
  assert.deepEqual(plain.deskOrder, G.KERN.slice(0, plain.deskOrder.length))
})

test('selectie: al gelezen zonder nieuws doet nergens mee, ook niet op de voorpagina', () => {
  const w = world()
  const kab = w.stories.find((s) => s.id === 's-kab')
  const sel = run({ prof: WERELD, ctx: { readIds: new Set([kab.itemIds[0]]) } }, w)
  assert.ok(!sel.some((e) => e.id === 's-kab'))
  assert.equal(sel.length, 6)
  assert.ok(!run({ ctx: { readIds: new Set([kab.itemIds[0]]) } }, w).some((e) => e.id === 's-kab'))
  // Een los bericht dat je las, ook niet.
  const loose = w.loose[0].id
  assert.ok(!run({ ctx: { readIds: new Set([loose]) }, opts: { size: 9 } }, w).some((e) => e.id === loose))
  assert.ok(run({ opts: { size: 9 } }, w).some((e) => e.id === loose))
})

test('selectie: een los bericht blijft zo lang staan als het tempo van zijn bron', () => {
  const w = world()
  const slow = w.loose[1] // 40 uur oud; over het Noordpoolijs, dus buitenland: een Wereld-lezer
  assert.ok(!run({ prof: WERELD, opts: { size: 9 } }, w).some((e) => e.id === slow.id)) // standaard 14 uur
  assert.ok(run({ prof: WERELD, ctx: { tempo: new Map([['carbon', 72]]) }, opts: { size: 9 } }, w).some((e) => e.id === slow.id))
})

test('selectie: zonder indeling (het extra blok) geen voorpagina en geen rubriek', () => {
  const sel = run({ opts: { plan: false, size: 2 } })
  assert.equal(sel.length, 2)
  assert.ok(sel.every((e) => !e.front && !e.planned && e.desk === null))
  assert.deepEqual(sel.deskOrder, [])
})

test('selectie: minder hiervan laat een verhaal van de voorpagina zakken', () => {
  const w = () => {
    const x = world()
    x.stories.find((s) => s.id === 's-kab').sourceCount = 7 // even zwaar als Zelensky
    return x
  }
  // Een Wereld-lezer: zonder Wereld zijn Zelensky en Vance hier geen groot nieuws en dus geen optie.
  const front = (o) => run(o, w()).filter((e) => e.front).map((e) => e.id)
  assert.ok(front({ prof: WERELD }).includes('s-kab'))
  const less = run({ prof: { ...WERELD, taste: { topics: { nederland: -12 } } } }, w())
  // Zelensky en Vance gaan voor (de regel "hooguit één buitenlands verhaal" geldt niet meer), het
  // kabinet zakt van de voorpagina.
  assert.deepEqual(less.filter((e) => e.front).map((e) => e.id), ['s-zel', 's-vance'])
  const kab = less.find((e) => e.id === 's-kab')
  assert.ok(kab && !kab.front)
  assert.equal(kab.parts.less.pts, -12) // zakt, maar mag elders nog staan
})

// ---------- De momentopname, twaalf persona's ----------
const snap = loadSnapshot()
const now = nowOf(snap)
const all = [...snap.items, ...(snap.edition.items || [])]
function selFor(p) {
  const setup = setupFor(p, snap.sources, 'echt')
  const { followed } = setup
  const own = snap.items.filter((i) => followed.has(i.source))
  const prof = G.profileOf({ ...setup, sources: snap.sources, supply: G.supplyOf(snap.items, followed) })
  const readIds = p.interests.length + p.topics.length ? readIdsOf(snap, p, followed) : new Set()
  const stories = storiesForReader(snap.stories, snap.items, followed, all)
  const pool = own.filter((i) => i.kind === 'article')
  const seed = `${editionBasis([...followed], setup.interests, setup.topics, setup.favorites)}|${snap.edition.id}`
  const preferred = new Set(setup.favorites.filter((id) => followed.has(id)))
  const opts = { mainIds: followed, now, size: 8, preferred, prof, ctx: { readIds, tempo: G.tempoWindows(own) }, seed }
  return { prof, readIds, sel: selectForReader(stories, pool, opts), again: () => selectForReader(stories, pool, opts) }
}
const runs = new Map(PERSONAS.map((p) => [p.id, selFor(p)]))

test('momentopname: acht plekken, deterministisch, geen dubbele plekken', () => {
  for (const [id, r] of runs) {
    assert.equal(r.sel.length, 8, id)
    assert.equal(JSON.stringify(r.sel), JSON.stringify(r.again()), id)
    assert.equal(new Set(r.sel.map((e) => e.id)).size, 8, id)
  }
})

// Normen 1 november: zonder Wereld heft een voorkeursthema (VS-politiek) het plafond niet op. De
// indeling begint met VS; de plekken zelf zijn hooguit twee keer groot buitenlands nieuws. Met Wereld
// erbij krijgt dezelfde lezer minstens twee VS-plekken.
test('momentopname: de VS-lezer begint met VS en krijgt minstens twee VS-plekken als hij Wereld koos', () => {
  const r = runs.get('vs')
  assert.equal(r.sel.deskOrder[0], 'vs')
  assert.ok(r.sel.deskOrder.filter((d) => d === 'vs').length >= 2, r.sel.deskOrder.join(','))
  assert.ok(r.sel.counted.size <= G.INT_MAX, r.sel.map((e) => e.desk).join(','))
  const p = PERSONAS.find((x) => x.id === 'vs')
  const w = selFor({ ...p, interests: [...p.interests, 'wereld'] })
  assert.ok(w.sel.filter((e) => e.desk === 'vs').length >= 2, w.sel.map((e) => e.desk).join(','))
})

test('momentopname: de klimaatlezer begint met Wetenschap; de nieuwe lezer krijgt KERN', () => {
  assert.equal(runs.get('klimaat').sel.deskOrder[0], 'wetenschap')
  const nieuw = runs.get('nieuw').sel.deskOrder
  assert.deepEqual(nieuw, G.KERN.slice(0, nieuw.length))
})

test('momentopname: elke indeling heeft hooguit drie zetels per rubriek en minstens drie kernrubrieken', () => {
  for (const [id, r] of runs) {
    const order = r.sel.deskOrder
    // De kernregel telt de voorpagina en het groot nieuws mee (die vullen al een rubriek).
    const desks = [...r.sel.map((e) => e.desk), ...order]
    assert.ok(new Set(desks.filter((d) => G.KERN.includes(d))).size >= G.KERN_MIN, `${id}: ${order}`)
    for (const d of new Set(order)) assert.ok(order.filter((x) => x === d).length <= G.DESK_CAP, `${id}: ${order}`)
  }
})

test('momentopname: een verhaal op de voorpagina heeft voor iedereen dezelfde rubriek', () => {
  const deskOf = new Map()
  for (const [id, r] of runs) {
    const front = r.sel.filter((e) => e.front)
    assert.ok(front.length >= G.FRONT, id)
    for (const e of front) {
      if (deskOf.has(e.id)) assert.equal(e.desk, deskOf.get(e.id), `${id}: ${e.id}`)
      else deskOf.set(e.id, e.desk)
      const st = storiesForReader([snap.stories.find((s) => s.id === e.id)], [], new Set(), all)[0]
      assert.equal(e.desk, st.desk, `${id}: ${e.id}`) // de rubriek uit álle berichten
    }
  }
})

test('momentopname: wat je las zonder nieuws komt niet terug', () => {
  for (const [id, r] of runs) {
    for (const e of r.sel) {
      assert.ok(!e.parts.seen, `${id}: ${e.id}`)
      if (e.kind === 'item') assert.ok(!r.readIds.has(e.id), `${id}: ${e.id}`)
      if (e.kind === 'story' && snap.stories.find((s) => s.id === e.id).itemIds.some((x) => r.readIds.has(x))) assert.ok(e.parts.followUp, `${id}: ${e.id}`)
    }
  }
})

test('momentopname: selectEdition is ongewijzigd naast selectForReader', () => {
  // Zelfde invoer twee keer: de algemene selectie geeft niets van de nieuwe velden terug.
  const articles = snap.items.filter((i) => i.kind === 'article')
  const sel = selectEdition(snap.stories, articles, { mainIds: new Set(['nos', 'nrc']), now })
  for (const e of sel) assert.deepEqual(Object.keys(e).filter((k) => !['kind', 'id', 'leadId', 'desk'].includes(k)), [], JSON.stringify(e))
})

// ---------- Een Nederlandse krant (feedback 31 oktober) ----------
// `nlCount`: hoeveel bronnen Nederlands zijn (storiesForReader rekent het uit de catalogus).
function nlWorld() {
  const w = world()
  const set = (id, o) => Object.assign(w.stories.find((s) => s.id === id), o)
  set('s-kab', { sourceCount: 4, nlCount: 4 })
  set('s-zel', { sourceCount: 9, nlCount: 3 })
  set('s-vance', { sourceCount: 8, nlCount: 2 })
  set('s-brand', { sourceCount: 3, nlCount: 3 })
  return w
}
const binnenland = { interests: ['binnenland'] }

// Normen 1 november 2026 vervangen de Nederlandse voorpagina van 31 oktober (hooguit één buitenlands
// verhaal, minstens twee Nederlandse bronnen, buitenlandse bronnen tellen half): elke uitgever telt
// gelijk, groot nieuws is acht uitgevers of vijf uit twee landen, zonder Wereld hooguit twee
// internationale plekken in de hele Editie, en wie Binnenland koos opent met Nederlands nieuws.
test('voorpagina: zonder Wereld alleen groot buitenlands nieuws, ook met minder Nederlandse bronnen', () => {
  const front = run({}, nlWorld()).filter((e) => e.front).map((e) => e.id)
  assert.ok(front.includes('s-zel') && front.includes('s-vance'), front.join(',')) // 9 en 8 uitgevers
  const w = nlWorld()
  w.stories.find((s) => s.id === 's-vance').sourceCount = 7 // geen groot nieuws meer
  assert.ok(!run({}, w).some((e) => e.id === 's-vance'))
  assert.ok(run({ prof: WERELD }, w).some((e) => e.id === 's-vance')) // met Wereld wel
})

test('voorpagina: wie Binnenland koos, opent met Nederlands nieuws, ook onder FRONT_MIN', () => {
  const sel = run({ prof: binnenland }, nlWorld())
  assert.equal(sel[0].id, 's-kab') // 4 bronnen, Nederlands
  assert.ok(sel[0].front)
  // Ook met Wereld erbij.
  assert.equal(run({ prof: { interests: ['binnenland', 'wereld'] } }, nlWorld())[0].id, 's-kab')
  // Wie "minder" stemde op het onderwerp, krijgt het niet opgedrongen: dan een ander Nederlands verhaal.
  const less = run({ prof: { ...binnenland, taste: { topics: { nederland: -12 } } } }, nlWorld())
  assert.ok(!less.filter((e) => e.front).some((e) => e.id === 's-kab'))
  assert.equal(less[0].id, 's-brand')
})

test('voorpagina: elke bron telt gelijk voor het belang, ongeacht taal of land van de uitgever', () => {
  const a = run({}, nlWorld()).find((e) => e.id === 's-zel')
  const w = nlWorld()
  w.stories.find((s) => s.id === 's-zel').nlCount = 9
  const b = run({}, w).find((e) => e.id === 's-zel')
  assert.equal(b.w - a.w, 0)
})

test('grens: zonder Wereld hooguit INT_MAX internationale plekken, alleen groot nieuws; liever korter', () => {
  const w = nlWorld()
  // Meer buitenland dan plekken: vier losse buitenlandse berichten zonder onderwerp.
  const extra = [['Parijs', 'havens'], ['Berlijn', 'scholen'], ['Madrid', 'treinen'], ['Warschau', 'mijnen']].map(([stad, wat]) => art('nos', `${stad}: ${wat} dicht na conflict over ${wat}geld`))
  w.pool.push(...extra)
  const ids = new Set(extra.map((i) => i.id))
  for (const prof of [binnenland, {}, { interests: ['tech'], topics: ['ai'] }]) {
    const vol = run({ prof, opts: { size: 10 } }, w)
    assert.ok(vol.counted.size <= G.INT_MAX, [...vol.counted].join(','))
    assert.ok(!vol.some((e) => ids.has(e.id)), vol.map((e) => e.id).join(',')) // geen groot nieuws
    assert.ok(vol.length < 10) // geen ongeoorloofde aanvulling om tien te halen
  }
  // Met Wereld geen plafond: de losse buitenlandse berichten mogen dan wel.
  const wereld = run({ prof: WERELD, opts: { size: 10 } }, w)
  assert.equal(wereld.length, 10)
  assert.ok(wereld.counted.size > G.INT_MAX)
})
