import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')

test('Weergave: het label is "Automatisch" (niet "Systeem"), op web en iOS', () => {
  const display = read('src/components/Display.jsx')
  const nacht = read('ios/Hoot/Theme/NachtThema.swift')
  assert.match(display, /value: 'system', label: 'Automatisch'/)
  assert.match(nacht, /case \.system: "Automatisch"/)
  assert.doesNotMatch(display + nacht, /'Systeem'|"Systeem"/)
})
