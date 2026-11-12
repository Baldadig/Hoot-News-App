// Pakket Merk en normen (1.1.0): de herstelde ds-toetspunten en de vastgelegde maten.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const swift = path => readFileSync(new URL(`../ios/Hoot/${path}`, import.meta.url), 'utf8')

test('ds-toets 6: het segment heeft in elk thema dezelfde opmaak, geen Nacht-regel', () => {
  assert.doesNotMatch(css, /data-theme='night'\]\s*\.seg\b/)
})
test('ds-toets 11 en 12: de bronrij in Welkom staat op de afstandsschaal', () => {
  // Sinds de nieuwe onboarding (1.1.0) is de bronkaart een rij; de oude kaart met vinkje is weg.
  const row = css.match(/\.ob__src \{[^}]*\}/)[0]
  assert.match(row, /gap: var\(--s3\) var\(--s4\)/)
  assert.match(row, /padding: var\(--s3\) 0/)
  assert.doesNotMatch(css, /\.ob__sourcecard\b/)
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
test('design system v2.3: register, gids en beeldtaal bestaan en kloppen met de code', async () => {
  const { readdirSync } = await import('node:fs')
  const tokens = JSON.parse(readFileSync(new URL('../docs/design-system/tokens.json', import.meta.url), 'utf8'))
  assert.equal(tokens.version, 3)
  assert.deepEqual(tokens.color.themes.map(t => t.name), ['Licht', 'Donker', 'Nacht'])
  assert.deepEqual(tokens.color.choice.labels, ['Zoals je toestel', 'Licht', 'Donker', 'Nacht'])
  // Build 48: leesstijl variant 4 met terugval variant 3, tekstgrootte, baseline-nudge en accountkaart.
  assert.deepEqual(tokens.type.lees.value, { opsz: 12, wght: 450, night: { wght: 480 } })
  assert.deepEqual([tokens.type.lees.fallback.opsz, tokens.type.lees.fallback.wght], [11, 400])
  assert.deepEqual(tokens.type.textScale.steps.map(s => s.factor), [0.9, 1, 1.15, 1.3, 1.45])
  const { TEXT_SIZES } = await import('../src/lib/tekstgrootte.js')
  assert.deepEqual(tokens.type.textScale.steps.map(s => [s.label, s.factor]), TEXT_SIZES.map(s => [s.label, s.factor]), 'register = code')
  assert.ok(tokens.color.tokens.find(t => t.name === 'hint').nightOnly)
  for (const t of tokens.color.tokens) assert.ok(t.value.night, `${t.name} heeft een night-waarde`)
  const color = name => tokens.color.tokens.find(t => t.name === name).value
  assert.equal(color('on-brand-red').light, '#f5f1e8')
  assert.equal(color('ink').night, '#d8d0c2'); assert.equal(color('paper').night, '#000000')
  assert.deepEqual(color('mark-bg'), { light: '#ffffff', dark: '#f1ece2', night: '#d8d0c2' })
  const all = Object.values(tokens).flatMap(g => g?.tokens || [])
  const v = name => all.find(t => t.name === name)?.value
  assert.equal(v('measure'), '720px'); assert.equal(v('readable'), '680px'); assert.equal(v('measure-prose'), '28.8em')
  assert.equal(v('dur-pull-close'), '400ms'); assert.equal(v('dur-2'), '200ms'); assert.equal(v('dur-iris'), '700ms')
  assert.equal(v('mark-share'), '28px')
  assert.equal(v('baseline-nudge-sans'), '1px'); assert.equal(v('account-mark'), '48px')
  assert.equal(v('shadow-float').light, '0 6px 18px rgba(26, 24, 20, 0.20)')
  assert.equal(tokens.brand.colorRatio.value, '60 · 30 · 10')
  assert.deepEqual(tokens.brand.appIcons.map(i => [i.name, !!i.default]), [['Papier op rood', true], ['Ruim rood', false], ['Origineel', false], ['Papier op inkt', false]])
  const chosen = ['01', '02', '04', '05', '06', '07', '09', '10', '11']
  assert.deepEqual(tokens.brand.imagery.compositions, chosen)
  const files = readdirSync(new URL('../docs/design-system/beeldtaal/', import.meta.url))
  for (const n of chosen) assert.ok(files.some(f => f.startsWith(n + '-') && f.endsWith('.svg')), n)
  assert.ok(!files.some(f => /^(03|08|12)-/.test(f)), 'alleen gekozen composities')
  const guide = readFileSync(new URL('../docs/design-system/brand-guide-v2.4.md', import.meta.url), 'utf8')
  assert.ok(tokens.type.families.sans.startsWith('"Schibsted Grotesk"'))
  for (const needle of ['Schibsted Grotesk', 'Kaart A+', 'De stapel', 'Tien en de bubbel', 'Zoals je toestel', '×0,9 tot ×1,45', '60 · 30 · 10', 'Papier op rood', 'vervangt het oude verbod', 'Web 720, iOS 680', '200 ms crossfade', '400 met `ease-glide`', 'Zacht papier', 'Stem en toon', 'Je weet genoeg.', 'Rubrica', '#9A3324', 'Voor jou', 'Bluesky-kaart A+', 'Vergelijken']) assert.ok(guide.includes(needle), needle)
  // "houdt op" staat er alleen als verbod of als voorbeeld van hoe het niet moet.
  for (const line of guide.split('\n').filter(l => l.includes('houdt op'))) assert.match(line, /[Nn]ooit|geen|Voor:|zeg niet|einde, houdt op/, line)
})
