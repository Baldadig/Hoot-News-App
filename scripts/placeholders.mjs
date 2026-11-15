// Maakt de placeholderbeelden uit shared/placeholder.mjs: de SVG's voor het web (src/assets/placeholder/),
// de CSS die ze per beeld en weergave kiest (src/placeholder.css) en de tabel voor SwiftUI
// (ios/Hoot/Views/PlaceholderBeelden.swift). Met --check: alleen nagaan of alles bij is.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { PLACEHOLDERS, PALETTES, THEMES, PLACEHOLDER_UIT, placeholderSvg, placeholderFile } from '../shared/placeholder.mjs'

const root = new URL('../', import.meta.url)
const SELECTOR = { licht: '', donker: ":root[data-theme='dark'] ", nacht: ":root[data-theme='night'] " }

export function outputs() {
  const files = new Map()
  for (let n = 1; n <= PLACEHOLDERS.length; n++) {
    for (const theme of THEMES) {
      files.set(`src/assets/placeholder/${placeholderFile(n, theme)}`, placeholderSvg(n, theme))
      if (PLACEHOLDERS[n - 1].klein) files.set(`src/assets/placeholder/${placeholderFile(n, theme, true)}`, placeholderSvg(n, theme, true))
    }
  }
  // CSS: het beeld vult het vak als een foto (cover). De miniatuur (.ph--klein) neemt de kleine
  // tekening waar die er is.
  let css = '/* Gegenereerd door scripts/placeholders.mjs uit shared/placeholder.mjs. Niet met de hand aanpassen. */\n'
  css += '/* Placeholderbeeld: vult het beeldvak van een stuk zonder (passend) beeld (Beeld.jsx, Beeldloos). */\n'
  css += '.ph {\n  background-color: var(--paper);\n  background-position: center;\n  background-size: cover;\n  background-repeat: no-repeat;\n}\n'
  for (const theme of THEMES) {
    for (let n = 1; n <= PLACEHOLDERS.length; n++) {
      css += `${SELECTOR[theme]}.ph--${n} { background-image: url('./assets/placeholder/${placeholderFile(n, theme)}'); }\n`
      if (PLACEHOLDERS[n - 1].klein) css += `${SELECTOR[theme]}.ph--${n}.ph--klein { background-image: url('./assets/placeholder/${placeholderFile(n, theme, true)}'); }\n`
    }
  }
  files.set('src/placeholder.css', css)
  files.set('ios/Hoot/Views/PlaceholderBeelden.swift', swift())
  return files
}

const num = (v) => (Number.isInteger(v) ? `${v}` : `${v}`)
const hex = (c) => `0x${c.slice(1).toUpperCase()}`
function swiftVorm(s) {
  const opt = (v) => (v ? `"${v}"` : 'nil')
  if (s.t === 'rect') return `.init(soort: .rect, a: ${num(s.x)}, b: ${num(s.y)}, c: ${num(s.w)}, d: ${num(s.h)}, fill: ${opt(s.fill)})`
  if (s.t === 'line') return `.init(soort: .line, a: ${num(s.x1)}, b: ${num(s.y1)}, c: ${num(s.x2)}, d: ${num(s.y2)}, stroke: ${opt(s.stroke)}, sw: ${num(s.sw || 1)}, fixed: ${!!s.fixed})`
  return `.init(soort: .circle, a: ${num(s.cx)}, b: ${num(s.cy)}, c: ${num(s.r)}, d: 0, fill: ${opt(s.fill)}, stroke: ${opt(s.stroke)}, sw: ${num(s.sw || 0)}, clip: ${!!s.clip})`
}
const swiftTekening = (L, pad) => `PHTekening(w: ${L.w}, h: ${L.h}, clipY: ${L.clipY ?? 'nil'}, vormen: [\n${L.shapes.map((s) => `${pad}    ${swiftVorm(s)},`).join('\n')}\n${pad}])`
function swift() {
  let s = '// Gegenereerd door scripts/placeholders.mjs uit shared/placeholder.mjs. Niet met de hand aanpassen.\n'
  s += '// De tekening van de achttien placeholderbeelden; BeeldloosView (Beeldloos.swift) tekent ze, zoals de SVG\'s op het web.\n'
  s += 'import CoreGraphics\n\nenum PlaceholderBeelden {\n'
  s += '    static let palettes: [String: [String: [String: UInt32]]] = [\n'
  for (const [fam, themes] of Object.entries(PALETTES)) {
    s += `        "${fam}": [\n`
    for (const [theme, c] of Object.entries(themes)) s += `            "${theme}": [${Object.entries(c).map(([k, v]) => `"${k}": ${hex(v)}`).join(', ')}],\n`
    s += '        ],\n'
  }
  s += '    ]\n    static let beelden: [PHBeeld] = [\n'
  for (const p of PLACEHOLDERS) {
    s += `        PHBeeld(familie: "${p.family}",\n                groot: ${swiftTekening(p.groot, '                ')},\n                klein: ${p.klein ? swiftTekening(p.klein, '                ') : 'nil'}),\n`
  }
  s += '    ]\n'
  // Beelden die niet meer gekozen worden (index 0 tot 17); Placeholder.base en WidgetBeeldloos slaan ze over.
  s += '    // Uit de reeks (index): de tekening staat er nog, maar geen stuk krijgt hem (shared/placeholder.mjs, PLACEHOLDER_UIT).\n'
  s += `    static let uit: Set<Int> = [${PLACEHOLDER_UIT.join(', ')}]\n`
  s += '    // De beelden die wel gekozen worden, op volgorde.\n'
  s += '    static let keuze: [Int] = beelden.indices.filter { !uit.contains($0) }\n'
  s += '    // Het beeld bij een hash: hash mod 18, en valt dat op een beeld uit de reeks, dan (hash / 18) mod het aantal dat overblijft (zestien) uit de rest.\n'
  s += '    static func index(hash h: UInt32) -> Int {\n'
  s += '        let k = Int(h % UInt32(beelden.count))\n'
  s += '        return uit.contains(k) ? keuze[Int((h / UInt32(beelden.count)) % UInt32(keuze.count))] : k\n'
  s += '    }\n}\n'
  return s
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check')
  const stale = []
  for (const [path, text] of outputs()) {
    const url = new URL(path, root)
    const now = existsSync(url) ? readFileSync(url, 'utf8') : null
    if (now === text) continue
    if (check) stale.push(path)
    else {
      mkdirSync(new URL('.', url), { recursive: true })
      writeFileSync(url, text)
      console.log('geschreven:', path)
    }
  }
  if (check && stale.length) {
    console.error('Niet bij (draai node scripts/placeholders.mjs):\n' + stale.join('\n'))
    process.exit(1)
  }
}
