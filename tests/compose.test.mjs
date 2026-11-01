// De Redacteur op de vaste momentopname (P5, Hoot-design/algoritme/bouwspec.md §11.4): de twaalf
// persona's in scenario "nu", met hun leesgeschiedenis als read_ids (zoals meting/acceptatie.mjs).
// De harde regels van de Editie gelden voor iedereen; per persona een paar herkenbare uitkomsten.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSnapshot, editionsNu, composeFor, readIdsOf, contextOf, keyOf, keysOf, membersOf, bigStories, pairwise } from './helpers/snapshot.mjs'
import { composePersonal, withoutDebug } from '../src/lib/personal.js'
import { profileOf, supplyOf, outsideProfile, isSport, KERN, FAMILY_OF, INT_MAX } from '../shared/editor.mjs'
import { internationalNews, majorNews } from '../shared/edition-policy.mjs'
import { PERSONAS, setupFor } from './helpers/snapshot.mjs'

const snap = loadSnapshot()
const ctx = contextOf(snap)
const big = bigStories(snap)
const eds = editionsNu(snap)
const byPersona = Object.fromEntries(eds.map((x) => [x.persona.id, x]))
const NOT_PERSONAL = new Set(['rubriek', 'groot', 'extern', 'bubbel', 'breed', 'buur'])
const profOf = ({ setup }) => profileOf({ ...setup, sources: snap.sources, supply: supplyOf(snap.items.filter((i) => i.kind === 'article' && setup.followed.has(i.source))) })
const topicsOf = (e) => membersOf(e, ctx).flatMap((i) => i.topics || [])
const deskOf = (e) => (e.desk === 'extern' ? e.fromDesk : e.desk)
// Normen 1 november 2026: zonder Wereld hooguit INT_MAX internationale plekken, alleen groot nieuws.
const storyOf = (e) => ctx.storyById.get(keyOf(e, ctx)) || {}
const abroadOf = (e) => internationalNews(membersOf(e, ctx), storyOf(e).desk ?? deskOf(e))
const intCount = (edition) => edition.entries.filter(abroadOf).length

test('De Redacteur: tien plekken, deterministisch, groot nieuws, Buiten je bubbel en een waarom', () => {
  for (const { persona, setup, edition } of eds) {
    const id = persona.id
    // Normen 1 november: liever korter dan ongeoorloofd aanvullen. Op deze momentopname is er genoeg
    // toegelaten aanbod voor tien plekken.
    assert.equal(edition.entries.length, 10, id)
    const readIds = persona.interests.length + persona.topics.length ? readIdsOf(snap, persona, setup.followed) : new Set()
    const again = composePersonal({ global: snap.edition, stories: snap.stories, items: snap.items, sources: snap.sources, now: Date.parse(snap.meta.updatedAt), builtAt: snap.meta.updatedAt, previous: null, ...setup, readIds })
    assert.equal(JSON.stringify(again), JSON.stringify(edition), id)
    const keys = keysOf(edition, ctx)
    // Groot nieuws staat erin, tenzij het internationaal is en het plafond zonder Wereld al vol zit.
    const world = persona.interests.includes('wereld')
    for (const st of big) {
      if (keys.has(st.id)) continue
      const items = st.itemIds.map((x) => ctx.itemById.get(x)).filter(Boolean)
      assert.ok(!world && internationalNews(items, st.desk) && intCount(edition) >= INT_MAX, `${id}: groot nieuws ${st.id}`)
    }
    // Buiten je bubbel hooguit één keer; geen plek als elk kandidaatstuk de normen breekt (sport zonder keuze).
    assert.ok(edition.entries.filter((e) => e.desk === 'bubbel').length <= 1, id)
    if (!world) assert.ok(intCount(edition) <= INT_MAX, `${id}: ${intCount(edition)} internationaal`)
    if (!world) for (const e of edition.entries.filter(abroadOf)) assert.ok(majorNews(storyOf(e), membersOf(e, ctx)), `${id}: ${e.id} internationaal zonder groot nieuws`)
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
      if (!read.has(keyOf(e, ctx))) continue
      assert.ok(e._parts?.followUp || e.why.code === 'followUp', `${persona.id}: ${e.id} (${e.why.code})`)
    }
  }
})

// Ook wat je in de algemene Editie las, komt niet terug als aanvulling, breed verhaal of bubbel.
test('De Redacteur: een gelezen aanvulling komt niet terug', () => {
  // Met Wereld: zonder Wereld laat de norm van 1 november alleen groot buitenlands nieuws toe, en
  // dan zijn er te weinig aanvullingen om dit mee te toetsen.
  const base = { followed: new Set(), interests: ['wereld'], topics: [], favorites: [] }
  const first = composeFor(snap, base)
  const fill = first.entries.filter((e) => e.desk === 'extern')
  assert.ok(fill.length >= 5, `${fill.length} aanvullingen`)
  const isFill = (e) => e.desk === 'extern' || e.desk === 'breed' || e.desk === 'bubbel'

  // Alles van die aanvullingen gelezen: geen enkele komt terug. Zonder eigen bronnen is er dan
  // niets om mee aan te vullen; de rest van de algemene Editie (bubbel, breed) blijft staan.
  const all = new Set(fill.flatMap((e) => membersOf(e, ctx).map((i) => i.id)))
  const keys = new Set(fill.map((e) => keyOf(e, ctx)))
  const again = composeFor(snap, { ...base, readIds: all })
  assert.deepEqual(again.entries.filter((e) => keys.has(keyOf(e, ctx))).map((e) => e.id), [])
  assert.ok(again.entries.length >= first.entries.length - fill.length, `${again.entries.length} plekken`)
  assert.equal(again.entries.filter((e) => e.desk === 'bubbel').length, 1)

  // Alleen de kop gelezen: terug alleen als vervolg (≥ 2 nieuwe stukken), met dat in de parts.
  const heads = composeFor(snap, { ...base, readIds: new Set(fill.map((e) => e.leadId || e.id)) })
  for (const e of heads.entries.filter((x) => isFill(x) && keys.has(keyOf(x, ctx)))) assert.ok(e._parts?.followUp?.n >= 2, `${e.id}`)
})

test('De Redacteur: Buiten je bubbel ligt buiten je profiel', () => {
  for (const x of eds) {
    const prof = profOf(x)
    const b = x.edition.entries.find((e) => e.desk === 'bubbel')
    if (!b) continue // geen toegelaten kandidaat (normen 1 november), zie hierboven
    const ts = topicsOf(b)
    assert.ok(outsideProfile(ts, prof), `${x.persona.id}: ${ts}`)
    assert.ok(!ts.some((t) => (prof.topicP[t] || 0) >= 0.3 || (prof.family[FAMILY_OF[t]] || 0) >= 0.5), x.persona.id)
  }
  for (const id of ['koers', 'gamer']) {
    const b = byPersona[id].edition.entries.find((e) => e.desk === 'bubbel')
    if (b) assert.ok(!topicsOf(b).some((t) => FAMILY_OF[t] === 'sport'), `${id}: ${topicsOf(b)}`)
  }
})

test('De Redacteur: de klimaatlezer krijgt klimaat, met Wetenschap als eerste rubriek', () => {
  const { edition } = byPersona.klimaat
  const catOf = new Map(snap.sources.map((s) => [s.id, s.cat]))
  const hits = edition.entries.filter((e) => membersOf(e, ctx).some((i) => (i.topics || []).some((t) => ['klimaat', 'natuur', 'energie'].includes(t))) || catOf.get(ctx.itemById.get(e.leadId || e.id)?.source) === 'wetenschap')
  assert.ok(hits.length >= 3, `${hits.length} plekken`)
  assert.equal(edition._plan[0], 'wetenschap')
})

// Normen 1 november: een voorkeursthema heft het plafond zonder Wereld niet op. Zonder Wereld krijgt
// de VS-lezer hooguit twee internationale plekken, allemaal groot nieuws; met Wereld twee VS-plekken.
test('De Redacteur: de VS-lezer krijgt twee VS-plekken als hij Wereld koos, anders hooguit twee keer groot buitenland', () => {
  const { edition } = byPersona.vs
  assert.ok(intCount(edition) <= INT_MAX, `${intCount(edition)}`)
  for (const e of edition.entries.filter(abroadOf)) assert.ok(majorNews(storyOf(e), membersOf(e, ctx)), e.id)
  const p = PERSONAS.find((x) => x.id === 'vs')
  const setup = setupFor({ ...p, interests: [...p.interests, 'wereld'] }, snap.sources, 'echt')
  const world = composeFor(snap, { ...setup, readIds: readIdsOf(snap, p, setup.followed) })
  assert.ok(world.entries.filter((e) => e.desk === 'vs').length >= 2, world.entries.map((e) => e.desk).join(','))
})
// Sport alleen bij een expliciete sportkeuze (normen 1 november).
test('De Redacteur: geen sport zonder sportkeuze', () => {
  const catOf = new Map(snap.sources.map((s) => [s.id, s.cat]))
  for (const { persona, edition } of eds) {
    if (persona.interests.includes('sport')) continue
    for (const e of edition.entries) assert.ok(!membersOf(e, ctx).some((i) => isSport(i, catOf)), `${persona.id}: ${e.id}`)
  }
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
    for (const e of edition.entries.filter((x) => x._front && x.kind === 'story')) {
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
