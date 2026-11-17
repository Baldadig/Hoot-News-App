import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')


test('Account: de melding bij mislukt afmelden bij Apple heet "Hoot uit je Apple ID halen lukte niet"', () => {
  const account = read('ios/Hoot/Views/AccountView.swift')
  assert.match(account, /\.alert\("Hoot uit je Apple ID halen lukte niet", isPresented:/)
  assert.doesNotMatch(account, /Apple reageerde niet/)
})

import { hootSummary } from '../src/lib/settings-summary.js'

// De indeling (één blad), het label Automatisch en de rij Interesses met namen zijn vervangen door
// Instellingen D: zie tests/instellingen-d.test.mjs. Het app-icoon staat sinds 17 november onder Weergave.
test('Instellingen: het app-icoon blijft te kiezen (rood standaard), onder Weergave', () => {
  const ios = read('ios/Hoot/Views/SettingsView.swift')
  assert.match(ios, /NavigationLink\(value: "appicoon"\) \{ SettingsRow\("App-icoon", value: \(icon\.selected \?\? \.red\)\.name, icon: \.appicoon\) \}/)
  const weergave = ios.slice(ios.indexOf('WeergaveKeuze()'), ios.indexOf('FormHeader("Weergave")'))
  assert.match(weergave, /"appicoon"/)
  assert.doesNotMatch(ios.slice(ios.indexOf('struct DeviceDataView')), /appicoon/)
})


test('Instellingen A: menu\'s in plaats van rode segmenten; "Als het donker is" alleen bij Systeem', () => {
  const display = read('src/components/Display.jsx')
  assert.doesNotMatch(display, /className="seg"|seg__btn/)
  assert.match(display, /<select className="setrow__select"/)
  // Sinds 17 november: de tegels van Weergave (SettingsTegels.swift); "Als het donker is" alleen bij Systeem, als
  // segment, en bij heel grote tekst een menu dat meegroeit.
  const tegels = read('ios/Hoot/Views/SettingsTegels.swift')
  assert.match(tegels, /if gekozen == \.system \{[\s\S]*?if typeSize\.isAccessibilitySize \{\s*[^\n]*\n\s*Picker\(selection: donker\)[^\n]*"Als het donker is"/)
  assert.match(read('src/views/Settings.jsx'), /theme === 'system' \? <DonkerKeuze/)
  // Lees de Stroom als is op iOS altijd een menu (geen segment dat niet meegroeit).
  assert.doesNotMatch(read('ios/Hoot/Views/SettingsView.swift'), /pickerStyle\(\.segmented\)/)
})

test('Instellingen A: de samenvatting in de accountkaart is op web en iOS dezelfde regel', () => {
  assert.equal(hootSummary({ interests: 4, sources: 8 }), '4 interesses · 8 bronnen')
  assert.equal(hootSummary({ interests: 1, sources: 1 }), '1 interesse · 1 bron')
  assert.equal(hootSummary({ interests: 0, sources: 12 }), 'Alle interesses · 12 bronnen')
  const ios = read('ios/Hoot/Views/SettingsView.swift')
  assert.match(ios, /interests == 0 \? "Alle interesses" : interests == 1 \? "1 interesse" : "\\\(interests\) interesses"/)
  assert.match(ios, /sources == 1 \? "1 bron" : "\\\(sources\) bronnen"/)
})

