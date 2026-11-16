import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { rubriekVoorLabel } from '../src/lib/volg-rubriek.js'

// Dezelfde gevallen leest de app (ios/HootTests/VolgzakenTests.swift, StreamView.rubriekLabel).
const doc = JSON.parse(readFileSync(new URL('./fixtures/volg-rubriek-cases.json', import.meta.url), 'utf8'))

for (const c of doc.cases) {
  test(`rubriek voor het label: ${c.name}`, () => {
    const uit = rubriekVoorLabel(c.input.item, { lijn: c.input.lijn, source: c.input.cat ? { cat: c.input.cat } : null })
    assert.equal(uit, c.expect)
  })
}
