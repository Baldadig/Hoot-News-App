import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { labelFor } from '../src/lib/label.js'

// De testgevallen staan in een gedeelde fixture: de app (HootTests/LabelTests.swift) leest dezelfde.
const { cases } = JSON.parse(readFileSync(new URL('./fixtures/label-cases.json', import.meta.url), 'utf8'))

test('de gedeelde fixture heeft de gevallen die ertoe doen', () => {
  assert.ok(cases.length >= 25)
  assert.ok(cases.some((c) => c.name.startsWith('Breskens')))
})

for (const c of cases) {
  test(`label: ${c.name}`, () => {
    assert.deepEqual(labelFor(c.input), c.expect)
  })
}
