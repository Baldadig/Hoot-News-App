// Onboarding blok 5 (14 november): de interessestap belooft wat hij doet, en de Selectie vraagt het zelf.
// - Ondertitel "Hoot kiest je Editie hierop. Aanpassen kan altijd." op web en iOS.
// - De uitklapper "Kies onderwerpen voor je Selectie" alleen bij opnieuw kiezen (niet in het eerste welkom,
//   niet na meteen lezen).
// - De lege Selectie: één zin, de onderwerpen per domein en één knop (Bewaar), gelijk op web en iOS.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CHOOSE, bewaarLabel } from '../src/lib/selection-index.js'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('interessestap: de nieuwe ondertitel op web en iOS, de oude is weg', () => {
  const web = read('src/views/Welcome.jsx')
  const app = read('ios/Hoot/Views/WelcomeView.swift')
  for (const [naam, src] of [['web', web], ['app', app]]) {
    assert.ok(src.includes('Hoot kiest je Editie hierop. Aanpassen kan altijd.'), naam)
    assert.ok(!src.includes('Dit worden je tabs in de Stroom'), naam)
  }
})

test('interessestap: de Selectie-uitklapper alleen bij opnieuw kiezen', () => {
  const web = read('src/views/Welcome.jsx')
  assert.match(web, /selectie=\{reopen && !prefs\.browsing\}/)
  assert.match(web, /\{selectie \? \(\s*<button type="button" className="ob__disclose"/)
  assert.match(web, /\{selectie && open \? \(/)
  const app = read('ios/Hoot/Views/WelcomeView.swift')
  assert.match(app, /private var showSelectie: Bool \{ reopen && !store\.browsing \}/)
  assert.match(app, /if showSelectie \{ selectieKeuze \}/)
  // De uitklapper zelf staat er nog (opnieuw kiezen vanuit Instellingen).
  for (const src of [web, app]) assert.ok(src.includes('Kies onderwerpen voor je Selectie'))
})

test('lege Selectie: dezelfde zin en dezelfde knop op web en iOS', () => {
  assert.equal(CHOOSE, 'Elke maandag drie stukken over je werk of hobby. Kies waarover.')
  assert.equal(bewaarLabel(0), 'Kies een onderwerp')
  assert.equal(bewaarLabel(1), 'Bewaar 1 onderwerp')
  assert.equal(bewaarLabel(3), 'Bewaar 3 onderwerpen')
  const app = read('ios/Hoot/Views/DigestView.swift')
  assert.ok(app.includes(`static let choose = "${CHOOSE}"`))
  assert.ok(app.includes('n == 0 ? "Kies een onderwerp" : n == 1 ? "Bewaar 1 onderwerp" : "Bewaar \\(n) onderwerpen"'))
})

test('lege Selectie: de onderwerpen staan er zelf, geen rij naar een ander blad', () => {
  const web = read('src/views/Vak.jsx')
  const app = read('ios/Hoot/Views/DigestView.swift')
  for (const src of [web, app]) assert.ok(!src.includes('Kies je onderwerpen'), 'de oude kop is weg')
  // Web: pillen per domein uit wat de bundel levert, Bewaar schrijft prefs.vak in de vaste volgorde.
  assert.match(web, /className="dempty__text dkies__tekst">\{CHOOSE\}/)
  assert.match(web, /setPref\('vak', order\.filter\(\(f\) => draft\.includes\(f\)\)\)/)
  assert.match(web, /disabled=\{!draft\.length \|\| !selectionReady\}/)
  // iOS: hetzelfde, in de volgorde van DigestFieldsList.
  assert.match(app, /if store\.digestFields\.isEmpty \{\s*kies\s/)
  assert.match(app, /store\.digestFields = Self\.fields\.map\(\\\.id\)\.filter \{ keuze\.contains\(\$0\) \}/)
  assert.match(app, /\.disabled\(draft\.isEmpty \|\| !preferencesReady\)/)
})
