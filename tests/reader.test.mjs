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

test('selectie: precies het gevraagde aantal plekken, deterministisch, gesorteerd op gewicht', () => {
  const sel = run()
  assert.equal(sel.length, 6)
  assert.equal(JSON.stringify(sel), JSON.stringify(run()))
  for (let i = 1; i < sel.length; i++) assert.ok(sel[i - 1].w >= sel[i].w)
  for (const e of sel) assert.ok(e.parts && typeof e.w === 'number' && e.desk !== undefined, JSON.stringify(e))
})

test('selectie: de voorpagina is voor iedereen gelijk, met de rubriek van de server', () => {
  const plain = run().filter((e) => e.front)
  const tech = run({ prof: { interests: ['tech'], topics: ['ai'] } }).filter((e) => e.front)
  assert.deepEqual(plain.map((e) => [e.id, e.desk]), [['s-kab', 'binnenland'], ['s-zel', 'oekraine']])
  assert.deepEqual(tech.map((e) => [e.id, e.desk]), plain.map((e) => [e.id, e.desk]))
  // Vanaf FRONT_BIG bronnen óók op de voorpagina, tot FRONT_MAX.
  const w = world()
  w.stories.find((s) => s.id === 's-vance').sourceCount = 11
  w.stories.find((s) => s.id === 's-zel').sourceCount = 10
  assert.deepEqual(run({}, w).filter((e) => e.front).map((e) => e.id).sort(), ['s-kab', 's-vance', 's-zel'])
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
  const sel = run({ ctx: { readIds: new Set([kab.itemIds[0]]) } }, w)
  assert.ok(!sel.some((e) => e.id === 's-kab'))
  assert.equal(sel.length, 6)
  // Een los bericht dat je las, ook niet.
  const loose = w.loose[0].id
  assert.ok(!run({ ctx: { readIds: new Set([loose]) }, opts: { size: 9 } }, w).some((e) => e.id === loose))
  assert.ok(run({ opts: { size: 9 } }, w).some((e) => e.id === loose))
})

test('selectie: een los bericht blijft zo lang staan als het tempo van zijn bron', () => {
  const w = world()
  const slow = w.loose[1] // 40 uur oud
  assert.ok(!run({ opts: { size: 9 } }, w).some((e) => e.id === slow.id)) // standaard 14 uur
  assert.ok(run({ ctx: { tempo: new Map([['carbon', 72]]) }, opts: { size: 9 } }, w).some((e) => e.id === slow.id))
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
  const front = (o) => run(o, w()).filter((e) => e.front).map((e) => e.id)
  assert.ok(front({}).includes('s-kab'))
  const less = run({ prof: { taste: { topics: { nederland: -12 } } } }, w())
  assert.deepEqual(less.filter((e) => e.front).map((e) => e.id), ['s-zel', 's-vance'])
  const kab = less.find((e) => e.id === 's-kab')
  if (kab) assert.equal(kab.parts.less.pts, -12) // zakt, maar mag elders nog staan
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

test('momentopname: de VS-lezer begint met VS en krijgt minstens twee VS-plekken', () => {
  const r = runs.get('vs')
  assert.equal(r.sel.deskOrder[0], 'vs')
  assert.ok(r.sel.deskOrder.filter((d) => d === 'vs').length >= 2, r.sel.deskOrder.join(','))
  assert.ok(r.sel.filter((e) => e.desk === 'vs').length >= 2, r.sel.map((e) => e.desk).join(','))
})

test('momentopname: de klimaatlezer begint met Wetenschap; de nieuwe lezer krijgt KERN', () => {
  assert.equal(runs.get('klimaat').sel.deskOrder[0], 'wetenschap')
  const nieuw = runs.get('nieuw').sel.deskOrder
  assert.deepEqual(nieuw, G.KERN.slice(0, nieuw.length))
})

test('momentopname: elke indeling heeft hooguit drie zetels per rubriek en minstens drie kernrubrieken', () => {
  for (const [id, r] of runs) {
    const order = r.sel.deskOrder
    assert.ok(new Set(order.filter((d) => G.KERN.includes(d))).size >= G.KERN_MIN, `${id}: ${order}`)
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
