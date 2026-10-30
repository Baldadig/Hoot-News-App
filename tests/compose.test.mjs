// De Redacteur op de vaste momentopname (P5, Hoot-design/algoritme/bouwspec.md §11.4): de twaalf
// persona's in scenario "nu", met hun leesgeschiedenis als read_ids (zoals meting/acceptatie.mjs).
// De harde regels van de Editie gelden voor iedereen; per persona een paar herkenbare uitkomsten.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSnapshot, editionsNu, readIdsOf, contextOf, keyOf, keysOf, membersOf, bigStories, pairwise } from './helpers/snapshot.mjs'
import { composePersonal, withoutDebug } from '../src/lib/personal.js'
import { profileOf, supplyOf, outsideProfile, KERN, FAMILY_OF } from '../shared/editor.mjs'

const snap = loadSnapshot()
const ctx = contextOf(snap)
const big = bigStories(snap)
const eds = editionsNu(snap)
const byPersona = Object.fromEntries(eds.map((x) => [x.persona.id, x]))
const NOT_PERSONAL = new Set(['rubriek', 'groot', 'extern', 'bubbel', 'breed', 'buur'])
const profOf = ({ setup }) => profileOf({ ...setup, sources: snap.sources, supply: supplyOf(snap.items.filter((i) => i.kind === 'article' && setup.followed.has(i.source))) })
const topicsOf = (e) => membersOf(e, ctx).flatMap((i) => i.topics || [])
const deskOf = (e) => (e.desk === 'extern' ? e.fromDesk : e.desk)

test('De Redacteur: tien plekken, deterministisch, groot nieuws, Buiten je bubbel en een waarom', () => {
  for (const { persona, setup, edition } of eds) {
    const id = persona.id
    assert.equal(edition.entries.length, 10, id)
    const readIds = persona.interests.length + persona.topics.length ? readIdsOf(snap, persona, setup.followed) : new Set()
    const again = composePersonal({ global: snap.edition, stories: snap.stories, items: snap.items, sources: snap.sources, now: Date.parse(snap.meta.updatedAt), builtAt: snap.meta.updatedAt, previous: null, ...setup, readIds })
    assert.equal(JSON.stringify(again), JSON.stringify(edition), id)
    const keys = keysOf(edition, ctx)
    for (const st of big) assert.ok(keys.has(st.id), `${id}: groot nieuws ${st.id}`)
    assert.equal(edition.entries.filter((e) => e.desk === 'bubbel').length, 1, id)
    for (const e of edition.entries) assert.ok(e.why?.code && e.why?.text, `${id}: ${e.id}`)
  }
})

test('De Redacteur: altijd minstens drie kernrubrieken', () => {
  for (const { persona, edition } of eds) {
    const kern = new Set(edition.entries.map(deskOf).filter((d) => KERN.includes(d)))
    assert.ok(kern.size >= 3, `${persona.id}: ${[...kern]}`)
  }
})

test('De Redacteur: wat je al las, komt alleen terug als vervolg', () => {
  for (const { persona, setup, edition } of eds) {
    if (!persona.interests.length && !persona.topics.length) continue
    const read = new Set([...readIdsOf(snap, persona, setup.followed)].map((id) => ctx.storyOfItem.get(id) || id))
    for (const e of edition.entries) {
      if (e.desk === 'bubbel' || e.desk === 'breed' || !read.has(keyOf(e, ctx))) continue
      assert.ok(e._parts?.followUp || e.why.code === 'followUp', `${persona.id}: ${e.id} (${e.why.code})`)
    }
  }
})

test('De Redacteur: Buiten je bubbel ligt buiten je profiel', () => {
  for (const x of eds) {
    const prof = profOf(x)
    const b = x.edition.entries.find((e) => e.desk === 'bubbel')
    const ts = topicsOf(b)
    assert.ok(outsideProfile(ts, prof), `${x.persona.id}: ${ts}`)
    assert.ok(!ts.some((t) => (prof.topicP[t] || 0) >= 0.3 || (prof.family[FAMILY_OF[t]] || 0) >= 0.5), x.persona.id)
  }
  for (const id of ['koers', 'gamer']) {
    const b = byPersona[id].edition.entries.find((e) => e.desk === 'bubbel')
    assert.ok(!topicsOf(b).some((t) => FAMILY_OF[t] === 'sport'), `${id}: ${topicsOf(b)}`)
  }
})

test('De Redacteur: de klimaatlezer krijgt klimaat, met Wetenschap als eerste rubriek', () => {
  const { edition } = byPersona.klimaat
  const catOf = new Map(snap.sources.map((s) => [s.id, s.cat]))
  const hits = edition.entries.filter((e) => membersOf(e, ctx).some((i) => (i.topics || []).some((t) => ['klimaat', 'natuur', 'energie'].includes(t))) || catOf.get(ctx.itemById.get(e.leadId || e.id)?.source) === 'wetenschap')
  assert.ok(hits.length >= 3, `${hits.length} plekken`)
  assert.equal(edition._plan[0], 'wetenschap')
})

test('De Redacteur: de VS-lezer krijgt twee VS-plekken', () => {
  assert.ok(byPersona.vs.edition.entries.filter((e) => e.desk === 'vs').length >= 2)
})

test('De Redacteur: de nieuwe lezer krijgt de gewone krant, zonder persoonlijk waarom', () => {
  const { edition } = byPersona.nieuw
  assert.deepEqual(edition._plan, KERN.slice(0, edition._plan.length))
  assert.ok(edition._plan.length >= 3)
  assert.deepEqual(edition.entries.filter((e) => !NOT_PERSONAL.has(e.why.code)).map((e) => e.why.code), [])
})

test('De Redacteur: een verhaal op de voorpagina heeft voor iedereen dezelfde rubriek', () => {
  const desks = new Map()
  for (const { persona, edition } of eds) {
    for (const e of edition.entries.filter((x) => x.why.code === 'groot' && x.kind === 'story')) {
      if (!desks.has(e.id)) desks.set(e.id, e.desk)
      assert.equal(e.desk, desks.get(e.id), `${persona.id}: ${e.id}`)
    }
  }
  assert.ok(desks.size >= big.length)
})

test('De Redacteur: unieker dan de nulmeting (gem. Jaccard ≤ 0,38)', (t) => {
  const jac = pairwise(eds.map(({ edition }) => keysOf(edition, ctx)))
  t.diagnostic(`gem. Jaccard: ${jac.toFixed(4)}`)
  assert.ok(jac <= 0.38 + 1e-9, String(jac))
})

test('De Redacteur: naar toestel en account gaat alleen het waarom, geen punten of profiel', () => {
  const { edition } = byPersona.vs
  const clean = withoutDebug(edition)
  assert.ok(!Object.keys(clean).some((k) => k.startsWith('_')))
  for (const e of clean.entries) {
    assert.ok(!Object.keys(e).some((k) => k.startsWith('_') || k === 'w' || k === 'parts'), JSON.stringify(e))
    assert.ok(e.why.text)
  }
  assert.ok(!/\d+(,\d+)?\s*(punten|pts)/.test(JSON.stringify(clean.entries.map((e) => e.why.text))))
})
