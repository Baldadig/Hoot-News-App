// Instellingen, indeling van 17 november (Hoot-design/ontwerp/instellingen-2026-11-17/concept.html): elke rij een
// gekleurd tegeltje met een wit symbool, op web en in de app hetzelfde; Weergave als vier tegels; Tekst en beeld
// als één blad; Abonnementen en Podcasts onder Bronnen; het app-icoon onder Weergave.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TEGEL_KLEUREN, SETTINGS_ICONEN, WEB_ICONEN, SYMBOLEN, WEERGAVE_TEGELS } from '../src/lib/settings-tegels.js'

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')
const swift = read('ios/Hoot/Views/SettingsTegels.swift')
const css = read('src/styles/account.css')
const web = read('src/views/Settings.jsx')
const ios = read('ios/Hoot/Views/SettingsView.swift')
const pages = read('ios/Hoot/Views/SettingsPages.swift')

// Uit de Swift-bron: case → waarde in een switch.
const swiftSwitch = (name) => {
  const body = swift.slice(swift.indexOf(`var ${name}:`))
  const out = {}
  for (const m of body.slice(0, body.indexOf('\n    }\n')).matchAll(/case ([^:]+): (?:"([^"]+)"|\.(\w+)|(0x[0-9a-f]+))/g)) {
    for (const c of m[1].split(',').map((x) => x.trim().replace(/^\./, ''))) out[c] = m[2] ?? m[3] ?? m[4]
  }
  return out
}

test('tegels: dezelfde kleuren in de app, in JS en in CSS (concept 17 november)', () => {
  assert.deepEqual(TEGEL_KLEUREN, { rood: '#9a3324', amber: '#b0802f', groen: '#4f6b3a', teal: '#2f6b68', blauw: '#36577a', paars: '#6a4a6c', inkt: '#4b453b', zand: '#8a7a5c' })
  const hex = swiftSwitch('hex')
  for (const [k, v] of Object.entries(TEGEL_KLEUREN)) {
    assert.equal(hex[k], '0x' + v.slice(1), 'Swift ' + k)
    assert.match(css, new RegExp(`--t-${k}: ${v};`), 'CSS ' + k)
    assert.match(css, new RegExp(`\\.tegel--${k} \\{ --tc: var\\(--t-${k}\\); \\}`))
  }
  assert.match(swift, /static let nachtDemping: CGFloat = 0\.8/)
  assert.match(css, /--t-nacht: 80%;/)
})

test('tegels: elke rij het symbool en de kleur uit het concept, op web en in de app gelijk', () => {
  const symbol = swiftSwitch('symbol')
  const kleur = swiftSwitch('kleur')
  assert.deepEqual(Object.keys(symbol).sort(), Object.keys(SETTINGS_ICONEN).sort())
  for (const [rij, [k, s]] of Object.entries(SETTINGS_ICONEN)) {
    assert.equal(symbol[rij], s, 'symbool ' + rij)
    assert.equal(kleur[rij], k, 'kleur ' + rij)
    assert.ok(SYMBOLEN[s], 'web-SVG voor ' + s)
  }
  for (const [, s] of Object.values(WEB_ICONEN)) assert.ok(SYMBOLEN[s])
  // De afspraken uit de opdracht.
  assert.deepEqual(SETTINGS_ICONEN.interesses, ['rood', 'sparkles'])
  assert.deepEqual(SETTINGS_ICONEN.editie, ['inkt', 'newspaper'])
  assert.deepEqual(SETTINGS_ICONEN.stroom, ['teal', 'water.waves'])
  assert.deepEqual(SETTINGS_ICONEN.selectie, ['amber', 'star'])
  assert.deepEqual(SETTINGS_ICONEN.abonnementen, ['groen', 'key'])
  assert.deepEqual(SETTINGS_ICONEN.podcasts, ['paars', 'headphones'])
  assert.deepEqual(SETTINGS_ICONEN.appicoon, ['teal', 'square.grid.2x2'])
  assert.deepEqual(SETTINGS_ICONEN.tekstEnBeeld, ['zand', 'photo'])
  assert.deepEqual(SETTINGS_ICONEN.artikelen, ['blauw', 'doc.text'])
  assert.deepEqual(SETTINGS_ICONEN.toestel, ['zand', 'iphone'])
  // Het tegeltje: 29 met hoek 7, symbool wit.
  assert.match(swift, /private var size: CGFloat = 29/)
  assert.match(swift, /cornerRadius: size \* 7 \/ 29/)
  assert.match(css, /--tegel: 29px;/)
  assert.match(css, /\.tegel \{[^}]*border-radius: 7px;[^}]*color: #fff;/)
})

test('elke rij op het hoofdblad heeft een tegeltje (web en app)', () => {
  const main = ios.slice(ios.indexOf('Form {'), ios.indexOf('// -HootScroll onder'))
  for (const m of main.matchAll(/SettingsRow\("([^"]+)"[^\n]*/g)) assert.match(m[0], /icon: \.\w+/, 'iOS ' + m[1])
  const webMain = web.slice(web.indexOf('>Jouw Hoot<'), web.indexOf('// De accountkaart bovenaan'))
  for (const m of webMain.matchAll(/<LinkRow [^\n]*/g)) assert.match(m[0], /icon="\w+"/, 'web ' + m[0])
  for (const m of webMain.matchAll(/<MenuRow\s+(?:icon=\{<Tegel name="\w+" \/>\})?/g)) assert.match(m[0], /icon=/, 'web menu')
})

test('Weergave: vier tegels (Licht, Donker, Nacht, Systeem) met de SF Symbols, en de oude voorkeuren blijven', () => {
  assert.deepEqual(WEERGAVE_TEGELS.map((t) => [t.value, t.label, t.symbol]), [
    ['light', 'Licht', 'sun.max'],
    ['dark', 'Donker', 'moon'],
    ['night', 'Nacht', 'moon.stars'],
    ['system', 'Systeem', 'circle.lefthalf.filled'],
  ])
  assert.match(swift, /static let volgorde: \[Weergave\] = \[\.light, \.dark, \.night, \.system\]/)
  assert.match(swift, /case \.system: "circle\.lefthalf\.filled"; case \.light: "sun\.max"; case \.dark: "moon"; case \.night: "moon\.stars"/)
  // Zelfde opslag als voorheen: Systeem met Nacht als het donker is blijft werken.
  assert.match(swift, /@AppStorage\("hoot\.weergave"\) private var value = "system"/)
  assert.match(swift, /@AppStorage\("hoot\.weergave\.donker"\) private var evening = "dark"/)
  assert.match(web, /<WeergaveTegels theme=\{theme\} setTheme=\{setTheme\} \/>/)
  assert.match(web, /theme === 'system' \? <DonkerKeuze value=\{themeDark\} onChange=\{setThemeDark\} \/>/)
  // Web: een echte radiogroep.
  assert.match(web, /className="looks" role="radiogroup" aria-label="Weergave"/)
  assert.match(web, /role="radio" aria-checked=\{on\}/)
})

test('indeling: Bronnen met Abonnementen en Podcasts, App-icoon onder Weergave, Artikelen alleen nog waar het opent', () => {
  const blok = (src, kop) => src.slice(src.lastIndexOf('Section {', src.indexOf(`FormHeader("${kop}")`)), src.indexOf(`FormHeader("${kop}")`))
  assert.match(blok(ios, 'Bronnen'), /"bronnen"[\s\S]*"abonnementen"[\s\S]*"Podcasts"/)
  assert.match(blok(ios, 'Weergave'), /WeergaveKeuze\(\)[\s\S]*"appicoon"/)
  assert.match(blok(ios, 'Lezen'), /"beeld"[\s\S]*"Tekst en beeld"[\s\S]*"artikelen"/)
  const artikelen = pages.slice(pages.indexOf('struct ArtikelenView'), pages.indexOf('struct OverHootView'))
  assert.doesNotMatch(artikelen, /abonnementen|podcastApp|Podcasts/)
  assert.match(artikelen, /"Artikelen openen"/)
  // Web: Podcasts onder Bronnen, Lezen alleen Tekst en beeld.
  const webBronnen = web.slice(web.indexOf('>Bronnen</h2>'), web.indexOf('>Weergave</h2>'))
  assert.match(webBronnen, /label="Bronnen"[\s\S]*label="Podcasts"/)
})

test('Tekst en beeld: één blad met voorbeeld (echt placeholderbeeld), schuif, Beeld en Intro', () => {
  const view = pages.slice(pages.indexOf('struct TekstEnBeeldView'), pages.indexOf('struct TekstgrootteSchuif'))
  const order = ['StroomVoorbeeld(beeld: true)', 'TekstgrootteSchuif()', 'FormHeader("Beeld")', 'FormHeader("Intro")']
  const at = order.map((n) => view.indexOf(n))
  assert.ok(at.every((i, n) => i > 0 && (n === 0 || i > at[n - 1])), 'volgorde ' + at)
  assert.match(pages, /PlaceholderBeeld\(index: Self\.beeldIndex\)/)
  assert.match(pages, /static let beeldIndex = 3 \/\/ beeld 4, Iris/)
  assert.match(pages, /case "tekstgrootte": return \["beeld"\]/)
  assert.match(ios, /case "tekstgrootte", "beeld": TekstEnBeeldView\(\)/)
  assert.doesNotMatch(pages, /struct TekstgrootteView|struct BeeldIntroView/)
  // Web: dezelfde volgorde, het echte placeholderbeeld (ph--4) dat de weergave volgt.
  const blad = web.slice(web.indexOf('function TekstEnBeeldBlad'), web.indexOf('function OverBlad'))
  const wOrder = ['<Voorbeeld />', 'type="range"', 'label="Beeld"', 'label="Intro"'].map((n) => blad.indexOf(n))
  assert.ok(wOrder.every((i, n) => i > 0 && (n === 0 || i > wOrder[n - 1])), 'web-volgorde ' + wOrder)
  assert.match(web, /className=\{`dset__img ph ph--\$\{VOORBEELD\.beeld\}`\}/)
  assert.match(web, /beeld: 4,/)
  for (const l of ['Bij elk verhaal', 'Alleen bij het hoofdverhaal', 'Geen beeld']) {
    assert.ok(web.includes(`'${l}'`), 'web ' + l)
    assert.ok(pages.includes(`"${l}"`), 'iOS ' + l)
  }
})
