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
test('iOS-monogram en -logo krijgen de dunne ring van het web (--hairline: inkt 14 %)', () => {
  assert.match(css, /--hairline: color-mix\(in srgb, var\(--ink\) 14%, transparent\)/)
  assert.match(css, /\.mark::after \{[^}]*inset 0 0 0 1px var\(--hairline\)/)
  assert.match(swift('Views/Components.swift'), /static var hairline: Color \{ ink\.opacity\(0\.14\) \}/)
  for (const file of ['Views/Components.swift', 'Views/SourceFeedView.swift']) {
    assert.match(swift(file), /\.overlay\(Circle\(\)\.strokeBorder\(Theme\.hairline, lineWidth: 1\)\)/, file)
    assert.doesNotMatch(swift(file), /Circle\(\)\.strokeBorder\(Theme\.rule/, file)
  }
})
test('pull-strook sluit in 400 ms met ease-glide, de h. vervaagt in 140 ms (bewegingsschaal)', () => {
  const motion = swift('Views/QuietMotion.swift')
  assert.match(motion, /static let fadeOut: Double = 0\.14/)
  assert.match(motion, /static let close: Double = 0\.4/)
  assert.match(motion, /timingCurve\(0\.2, 0\.8, 0\.2, 1, duration: close\)/) // = --ease-glide
  assert.match(css, /--ease-glide: cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)/)
  assert.doesNotMatch(motion, /easeOut\(duration: 0\.3\)|milliseconds\(150\)/)
})
test('leesbreedte vastgelegd: web 720 (--measure) voor elk leesblok, iOS 680', () => {
  assert.match(css, /--measure: 720px;/)
  assert.match(swift('Views/Layout.swift'), /static let readable: CGFloat = 680/)
  assert.match(css, /\.story__body \{\s*max-width: var\(--measure\);/)
  assert.match(css, /--story-edge: calc\(\(100% - var\(--measure\)\)/)
  // --readable blijft alleen voor Welkom (.col), geen leesblok.
  const uses = [...css.matchAll(/var\(--readable\)/g)].length
  assert.equal(uses, 1)
  assert.match(css, /\.col \{\s*max-width: var\(--readable\);/)
})
test('lege schermen: lijntekening uit de beeldtaal (01 horizon, 04 raster), één rode punt, web en iOS gelijk', async () => {
  const icons = readFileSync(new URL('../src/components/icons.jsx', import.meta.url), 'utf8')
  assert.match(icons, /M24 64a24 24 0 0 1 48 0M8 64h72/)
  assert.match(icons, /M20 76\.5h44M20 84\.5h24/)
  assert.match(icons, /className="empty__lint" cx="86" cy="63" r="4"/)
  assert.match(icons, /export const SearchArt = art\('search', raster\)/)
  for (const name of ['SavedArt', 'BlueskyArt', 'StreamArt', 'EditionArt']) assert.match(icons, new RegExp(`export const ${name} = art\\('\\w+', horizon\\)`))
  assert.equal([...icons.matchAll(/className="empty__lint"/g)].length, 2, 'één rode punt per compositie')
  const motion = swift('Views/QuietMotion.swift')
  assert.match(motion, /addArc\(center: \.init\(x: 48, y: 64\), radius: 24/)
  assert.match(motion, /CGRect\(x: 82, y: 59, width: 8, height: 8\)/) // punt cx 86, cy 63, r 4
  assert.match(motion, /self == \.search \? \.raster : \.horizon/)
  assert.match(css, /\.empty__line \{\s*stroke: var\(--ink\);\s*stroke-width: 2;/)
  assert.match(css, /\.empty__lint \{\s*fill: var\(--accent\);/)
  assert.match(css, /:root\[data-theme='night'\] \{[^}]*--art-thin: var\(--ink-3\);/)
})
