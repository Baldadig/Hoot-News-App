import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')

test('Weergave: het label is "Automatisch" (niet "Systeem"), op web en iOS', () => {
  const display = read('src/components/Display.jsx')
  const nacht = read('ios/Hoot/Theme/NachtThema.swift')
  assert.match(display, /value: 'system', label: 'Automatisch'/)
  assert.match(nacht, /case \.system: "Automatisch"/)
  assert.doesNotMatch(display + nacht, /'Systeem'|"Systeem"/)
})

test('Account: de melding bij mislukt afmelden bij Apple heet "Hoot uit je Apple ID halen lukte niet"', () => {
  const account = read('ios/Hoot/Views/AccountView.swift')
  assert.match(account, /\.alert\("Hoot uit je Apple ID halen lukte niet", isPresented:/)
  assert.doesNotMatch(account, /Apple reageerde niet/)
})

import { hootSummary } from '../src/lib/settings-summary.js'

test('Instellingen A: één blad met account bovenaan, dan Jouw Hoot, Lezen, Stroom en Over Hoot (web en iOS)', () => {
  const web = read('src/views/Settings.jsx')
  const ios = read('ios/Hoot/Views/SettingsView.swift')
  const order = (src, re) => [...src.matchAll(re)].map((m) => m[1]).filter((t) => ['Jouw Hoot', 'Lezen', 'Stroom', 'Over Hoot'].includes(t))
  assert.deepEqual(order(web, /className="sect sect--plain">([^<]+)</g), ['Jouw Hoot', 'Lezen', 'Stroom', 'Over Hoot'])
  assert.deepEqual(order(ios, /FormHeader\("([^"]+)"\)/g), ['Jouw Hoot', 'Lezen', 'Stroom', 'Over Hoot'])
  assert.ok(web.indexOf('<AccountSettings') < web.indexOf('>Jouw Hoot<'), 'web: account bovenaan')
  assert.ok(ios.indexOf('SettingsAccountCard()') < ios.indexOf('FormHeader("Jouw Hoot")'), 'iOS: account bovenaan')
  // Koppen in gewone zinsvorm (I7): geen kapitalenlabel als sectiekop meer.
  assert.doesNotMatch(web, /label label--section sect/)
  assert.doesNotMatch(read('ios/Hoot/Views/Components.swift'), /struct FormHeader[\s\S]{0,200}uppercased/)
})

test('Instellingen A: menu\'s in plaats van rode segmenten; "Als het donker is" alleen bij Automatisch', () => {
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

test('Instellingen A: de rij Interesses kapt niet af en het app-icoon blijft te kiezen (rood standaard)', () => {
  const ios = read('ios/Hoot/Views/SettingsView.swift')
  assert.match(ios, /SettingsValueRow\(title: "Interesses", value: InterestsList\.summary\(store\.interests\)/)
  assert.doesNotMatch(ios, /summary\(store\.interests\)\)\.lineLimit\(1\)/)
  assert.match(ios, /NavigationLink\(value: "appicoon"\) \{ AppIconRow\(selected: icon\.selected\) \}/)
  assert.match(ios, /let choice = selected \?\? \.red/)
  assert.match(read('src/views/Settings.jsx'), /<LinkRow href="#\/welkom" label="Interesses" hint=\{interestNames \|\| 'Alle interesses'\} \/>/)
})
