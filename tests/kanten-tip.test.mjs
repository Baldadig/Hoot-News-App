import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { kantenTip } from '../src/lib/kanten-tip.js'

// Keuze r5-kanten-welkom (5 november): één keer een rustige tip bij het eerste verhaal met meer bronnen.
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('het eerste verhaal met meer dan één bron; daarna nooit meer', () => {
  const rows = [{ item: { id: 'a' }, story: { id: 's1', sourceCount: 1 } }, { item: { id: 'b' }, story: null }, { item: { id: 'c' }, story: { id: 's3', sourceCount: 6 } }]
  assert.deepEqual(kantenTip({ rows }), { story: rows[2].story, item: rows[2].item, n: 6 })
  assert.equal(kantenTip({ rows, done: true }), null)
  assert.equal(kantenTip({ rows: rows.slice(0, 2) }), null)
})

test('rustig: een hint onder de kop, te sluiten, weg zodra je vergelijkt; niet naast de welkom-uitleg', () => {
  const e = src('src/views/Edition.jsx')
  assert.match(e, /ready && hasMinimum && !showHint && kanten \?/)
  assert.match(e, /className="edhint kantentip"/)
  assert.match(e, /aria-label="Tip sluiten"/)
  assert.match(e, /Meer kanten van één verhaal: bij ‘\{bronnenLabel\(kanten\.n\)\}’ zie je hoe elke bron het brengt\./)
  assert.match(src('src/App.jsx'), /setPrefs\(\(p\) => \(p\.kantenTip \? p : \{ \.\.\.p, kantenTip: true \}\)\)/)
  assert.doesNotMatch(src('src/styles/kanten-tip.css'), /position:\s*(fixed|absolute)/)
})
