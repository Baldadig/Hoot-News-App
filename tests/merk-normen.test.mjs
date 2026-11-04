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
test('ds-toets 7, 8 en 15: iOS gebruikt Theme.markBg achter een logo en het commentaar noemt 96', () => {
  for (const file of ['Views/Components.swift', 'Views/SourceFeedView.swift']) {
    assert.doesNotMatch(swift(file), /background\(Color\.white\)/, file)
    assert.match(swift(file), /background\(Theme\.markBg\)/, file)
  }
  const color = JSON.parse(readFileSync(new URL('../ios/Hoot/Assets.xcassets/MarkBg.colorset/Contents.json', import.meta.url), 'utf8'))
  const rgb = c => '#' + ['red', 'green', 'blue'].map(k => c.color.components[k].slice(2).toLowerCase()).join('')
  assert.equal(rgb(color.colors[0]), '#ffffff')
  assert.equal(rgb(color.colors[1]), (css.match(/--mark-bg: (#[0-9a-f]{6}); \/\* gedempt/) || [])[1])
  assert.match(swift('Views/Layout.swift'), /lijntekening 96 \(--art\)/)
  assert.doesNotMatch(swift('Views/Layout.swift'), /lijnicoon 64/)
})
