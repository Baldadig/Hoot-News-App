import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Statische controles op teksten en structuur die web en app gelijk houden ("Web gelijk aan app").
// Geen DOM: we lezen de bronbestanden.
const root = fileURLToPath(new URL('../src/', import.meta.url))
const read = (p) => readFileSync(join(root, p), 'utf8')
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : join(dir, f)))
const allSrc = () => walk(root).filter((f) => /\.(jsx?|mjs|css)$/.test(f)).map((f) => read(f.slice(root.length)))

test('Stroom-instelling heet "Lees de Stroom als" (W1)', () => {
  assert.match(read('components/Display.jsx'), /Lees de Stroom als/)
  assert.ok(allSrc().every((s) => !s.includes('Indeling van lijsten')))
})

test('Welkom: intro-punten in de volgorde van de app, vijf stappen, geen "In één minuut bij" (W2)', () => {
  const s = read('views/Welcome.jsx')
  const i = ['Je Editie', 'De Stroom', 'Je Selectie'].map((t) => s.indexOf(`title="${t}"`))
  assert.ok(i.every((x) => x >= 0), 'alle drie de titels staan erin')
  assert.ok(i[0] < i[1] && i[1] < i[2], 'Editie, Stroom, Selectie')
  assert.match(s, /const STEPS = 5\b/)
  assert.ok(!s.includes('In één minuut bij'))
  assert.match(s, /Inloggen/)
})

test('Welkom: papier op merkrood en gekozen tegels in --sel-* (W2)', () => {
  const css = read('styles.css')
  assert.match(css, /--paper-brand: #f5f1e8/)
  assert.match(css, /\.ob--open \{\s*--on-brand-red: var\(--paper-brand\)/)
  const tile = css.slice(css.indexOf(".ob__tile[aria-pressed='true'] {"))
  assert.match(tile.slice(0, 140), /--sel-edge[\s\S]*--sel-bg[\s\S]*--sel-fg/)
})
