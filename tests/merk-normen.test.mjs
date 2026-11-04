// Pakket Merk en normen (1.1.0): de herstelde ds-toetspunten en de vastgelegde maten.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const swift = path => readFileSync(new URL(`../ios/Hoot/${path}`, import.meta.url), 'utf8')

test('ds-toets 6: het segment heeft in elk thema dezelfde opmaak, geen Nacht-regel', () => {
  assert.doesNotMatch(css, /data-theme='night'\]\s*\.seg\b/)
})
test('ds-toets 11 en 12: de bronkaart en zijn vinkje staan op de afstandsschaal', () => {
  const card = css.match(/\.ob__sourcecard \{[^}]*\}/)[0]
  assert.match(card, /padding:var\(--s1\)/)
  assert.match(card, /gap:var\(--s1\)/)
  assert.match(css, /\.ob__sourcecard \.ob__check \{[^}]*top:var\(--s1\); right:var\(--s1\)/)
  assert.doesNotMatch(css, /padding:6px 3px|top:3px; right:3px/)
})
