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
// Instellingen D: zie tests/instellingen-d.test.mjs. Het app-icoon staat nu onder Op dit toestel.
test('Instellingen D: het app-icoon blijft te kiezen (rood standaard), onder Op dit toestel', () => {
  const ios = read('ios/Hoot/Views/SettingsView.swift')
  assert.match(ios, /NavigationLink\(value: "appicoon"\) \{ AppIconRow\(selected: icon\.selected\) \}/)
  assert.match(ios, /let choice = selected \?\? \.red/)
})


test('Instellingen A: menu\'s in plaats van rode segmenten; "Als het donker is" alleen bij Zoals je toestel', () => {
  const display = read('src/components/Display.jsx')
  assert.doesNotMatch(display, /className="seg"|seg__btn/)
  assert.match(display, /<select className="setrow__select"/)
  assert.match(display, /theme === 'system' \? <MenuRow label="Als het donker is"/)
  const nacht = read('ios/Hoot/Theme/NachtThema.swift')
  assert.match(nacht, /if Weergave\(stored: value\) == \.system \{\s*Picker\(selection:[\s\S]*?"Als het donker is"/)
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

