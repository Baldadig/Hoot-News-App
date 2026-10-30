// De meetlat op de vaste momentopname (tests/helpers/snapshot.mjs): de twaalf persona's, de
// nulmeting en de algemene Editie als vaste referentie. Zie Hoot-design/algoritme/bouwspec.md (P0).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSnapshot, loadNulmeting, generalEdition, storiesPrint, editionsNu, contextOf, keysOf, pairwise, PERSONAS } from './helpers/snapshot.mjs'

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

test('meetlat: de huidige persoonlijke Editie reproduceert de nulmeting', (t) => {
  const eds = editionsNu(snap)
  const jac = pairwise(eds.map(({ edition }) => keysOf(edition, ctx)))
  t.diagnostic(`gem. Jaccard nu: ${jac.toFixed(4)} (nulmeting ${nul.jaccard})`)
  for (const { persona, edition } of eds) {
    assert.equal(edition.entries.length, 10, persona.id)
    assert.deepEqual([...keysOf(edition, ctx)], nul.keys[persona.id], persona.id)
  }
  assert.equal(round2(jac), 0.46)
})

test('meetlat: de algemene Editie (bundelen + selectEdition) is byte-identiek aan de nulmeting', () => {
  const g = generalEdition(snap)
  assert.equal(storiesPrint(g.stories), nul.general.stories)
  assert.equal(JSON.stringify(g.entries), JSON.stringify(nul.general.entries))
})
