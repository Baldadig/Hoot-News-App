import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { eindzin, EINDZINNEN } from '../shared/eindzin.mjs'

// tests/fixtures/eindzin.json wordt ook door iOS gelezen (EditionEndTests): dezelfde zin per Editie.
const fx = JSON.parse(readFileSync(new URL('./fixtures/eindzin.json', import.meta.url), 'utf8'))

test('twee eindzinnen, nooit "Dan ben je bij" op de Editie zelf', () => {
  assert.deepEqual(EINDZINNEN, ['Je weet genoeg.', 'Je bent bij.'])
})

test('per Editie (datum + dagdeel) altijd dezelfde zin, gelijk aan de gedeelde gevallen', () => {
  assert.ok(fx.gevallen.length >= 90)
  for (const c of fx.gevallen) assert.equal(eindzin(c.date, c.slot), c.verwacht, `${c.date} ${c.slot}`)
  assert.equal(eindzin('2026-11-04', 'ochtend'), eindzin('2026-11-04', 'ochtend'))
})

test('beide zinnen komen voor en wisselen ook binnen een dag en over opeenvolgende dagen', () => {
  const lines = fx.gevallen.map((c) => c.verwacht)
  for (const l of EINDZINNEN) assert.ok(lines.filter((x) => x === l).length >= 30, l)
  const perDag = new Map()
  for (const c of fx.gevallen) perDag.set(c.date, new Set([...(perDag.get(c.date) || []), c.verwacht]))
  assert.ok([...perDag.values()].filter((s) => s.size === 2).length >= 10)
  // Nooit meer dan vijf dezelfde achter elkaar.
  let run = 1
  for (let i = 1; i < lines.length; i++) { run = lines[i] === lines[i - 1] ? run + 1 : 1; assert.ok(run <= 5) }
})

test('de landing blijft ongemoeid', () => {
  const landing = readFileSync(new URL('../landing/index.src.html', import.meta.url), 'utf8')
  assert.match(landing, /Dan ben je bij\./)
  assert.doesNotMatch(landing, /Je weet genoeg\./)
})
