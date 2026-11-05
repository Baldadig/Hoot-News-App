// Hoot 1.1.1: Bluesky-kaart A+ (web en app gelijk).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// 4. Bluesky-kaart A+: rubriek "Bluesky" en de tekst schreefloos; iOS gelijk (PostRow).
test('Bluesky-kaart A+: stille rubriek, tekst in --sans 17/24, beeld 16 eronder', () => {
  const items = read('src/components/Items.jsx')
  assert.match(items, /className="label label--kicker social__kicker" aria-hidden="true">\s*Bluesky/)
  const css = read('src/styles/bluesky.css')
  assert.match(css, /\.social__text \{[^}]*font-family: var\(--sans\)/)
  assert.match(css, /\.social__text \{[^}]*font-size: var\(--t3\);[^}]*line-height: var\(--lh-3\)/)
  assert.match(css, /:is\(\.media, \.linkcard\) \{\s*margin-top: var\(--s4\)/)
  assert.match(read('src/main.jsx'), /import '\.\/styles\/bluesky\.css'/)
  const ios = read('ios/Hoot/Views/BlueskyView.swift')
  assert.match(ios, /Kicker\(text: "Bluesky"\)/)
  assert.match(ios, /Text\(text\)\.zin\(\)/)
})
