// Feedback 31 oktober, punten 3 en 4: Binnenland is Nederland, en de eerste Editie van een nieuwe lezer
// leunt niet op buitenland. Op de vaste momentopname (tests/helpers/eerste.mjs; dezelfde maten draait
// meting/acceptatie.mjs ook op de latere momentopnames).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSnapshot } from './helpers/snapshot.mjs'
import { FIRST, measureFirst, verdictFirst, DREMPELS_EERSTE, measureBinnenland } from './helpers/eerste.mjs'

const snap = loadSnapshot()
const rows = measureFirst(snap)
const v = verdictFirst(rows)

test('eerste Editie: zeven nieuwe lezers, elk een volle Editie', (t) => {
  t.diagnostic(rows.map((r) => `${r.id}: NL ${r.nl}, buitenland ${r.int}, passend ${r.passend}`).join(' · '))
  assert.equal(rows.length, FIRST.length)
  for (const r of rows) assert.equal(r.plekken, 10, r.id)
})

for (const d of DREMPELS_EERSTE.filter((x) => x.hard)) {
  test(`${d.label} ${d.min !== undefined ? '≥ ' + d.min : '≤ ' + d.max}`, () => {
    if (d.min !== undefined) assert.ok(v[d.key] >= d.min, `${v[d.key]}`)
    else assert.ok(v[d.key] <= d.max, `${v[d.key]}`)
  })
}

test('eerste Editie: de vriendin krijgt een Nederlandse voorpagina en meer Nederland dan buitenland', () => {
  const r = rows.find((x) => x.id === 'vriendin')
  assert.ok(r.entries.some((e) => e.front && e.geo === 'NL'))
  assert.ok(r.nl > r.int, `NL ${r.nl}, buitenland ${r.int}`)
})

test('Binnenland: geen bericht en geen plek in de algemene Editie zonder Nederlands bezit', (t) => {
  const b = measureBinnenland(snap)
  t.diagnostic(`${b.berichten} Binnenland-berichten, ${b.algemeen} Binnenland-plekken in de algemene Editie`)
  assert.equal(b.zonderNl, 0, b.fout.map((i) => `${i.source}: ${i.title}`).join(' | '))
  assert.equal(b.algemeenZonderNl, 0)
  assert.ok(b.berichten > 146, 'het aanbod Binnenland is breder dan alleen NOS, NRC en de Volkskrant')
})
