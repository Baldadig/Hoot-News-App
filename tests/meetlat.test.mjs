import { editionStoryCount } from '../shared/edition-limits.mjs'
// De meetlat op de vaste momentopname (tests/helpers/snapshot.mjs): de twaalf persona's, de
// nulmeting en de algemene Editie als vaste referentie. Zie Hoot-design/algoritme/bouwspec.md (P0).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSnapshot, loadNulmeting, loadGeneralGolden, generalEdition, storiesPrint, editionsNu, contextOf, keysOf, pairwise, PERSONAS, setupFor } from './helpers/snapshot.mjs'
import { storiesForReader } from '../src/lib/personal.js'

const snap = loadSnapshot()
const nul = loadNulmeting()
const ctx = contextOf(snap)
const round2 = (x) => Math.round(x * 100) / 100

test('meetlat: de momentopname laadt, met twaalf persona\'s', () => {
  assert.equal(snap.meta.updatedAt, '2026-10-30T19:00:17.373Z')
  assert.ok(snap.items.length > 1000 && snap.stories.length > 50 && snap.edition.entries.length === 10)
  assert.equal(PERSONAS.length, 12)
  assert.equal(new Set(PERSONAS.map((p) => p.id)).size, 12)
  assert.equal(nul.snapshot, snap.meta.updatedAt)
})

test('meetlat: de nulmeting geeft gemiddeld Jaccard 0,46', () => {
  const sets = PERSONAS.map((p) => new Set(nul.keys[p.id]))
  assert.equal(round2(pairwise(sets)), 0.46)
})

// De nulmeting is vastgelegd in de fixture (composePersonal van v1.54.0). Hier draait de meetlat
// op de huidige samensteller; die mag niet minder uniek worden dan de nulmeting.
test('meetlat: de huidige persoonlijke Editie, gemeten tegen de nulmeting', (t) => {
  const eds = editionsNu(snap)
  const jac = pairwise(eds.map(({ edition }) => keysOf(edition, ctx)))
  const moved = eds.reduce((n, { persona, edition }) => n + [...keysOf(edition, ctx)].filter((k) => !nul.keys[persona.id].includes(k)).length, 0)
  t.diagnostic(`gem. Jaccard nu: ${jac.toFixed(4)} (nulmeting ${nul.jaccard}); ${moved} plekken anders dan de nulmeting`)
  for (const { persona, edition } of eds) assert.equal(editionStoryCount(edition.entries), 10, persona.id)
  assert.ok(jac <= nul.jaccard + 1e-9, `Jaccard ${jac} > nulmeting ${nul.jaccard}`)
})

// Eigen bronnen per lezer (P1): de rubriek van een verhaal blijft voor iedereen gelijk.
test('meetlat: st.desk is voor alle persona\'s gelijk, ownCount niet', () => {
  const all = [...snap.items, ...(snap.edition.items || [])]
  const per = PERSONAS.map((p) => storiesForReader(snap.stories, snap.items, setupFor(p, snap.sources, 'echt').followed, all))
  const desks = per.map((sts) => JSON.stringify(sts.map((st) => [st.id, st.desk])))
  assert.equal(new Set(desks).size, 1)
  assert.ok(per[0].some((st) => st.desk), 'er zijn rubrieken')
  assert.ok(new Set(per.map((sts) => JSON.stringify(sts.map((st) => st.ownCount)))).size > 1)
})

test('meetlat: de algemene Editie is byte-identiek aan de expliciet vastgelegde algoritme-golden', () => {
  const g = generalEdition(snap), expected = loadGeneralGolden()
  assert.equal(storiesPrint(g.stories), expected.stories)
  assert.equal(JSON.stringify(g.entries), JSON.stringify(expected.entries))
})
