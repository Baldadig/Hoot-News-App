// Selectie-review 14 november, punt 12: de teksten beloven niet meer dan de regel doet. "Drie stukken" in plaats van
// "het beste", op web en in de app gelijk, en in de bron van het App Store-beeld (de beelden zelf gaan mee met een
// volgende inzending). REVIEW-NOTES.md en promotie/TEKSTEN.md noemen de oude regel niet meer.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CHOOSE, VOORPROEF } from '../src/lib/selection-index.js'

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('lege Selectie, blad Onderwerpen en welkom: drie stukken, web en app gelijk', () => {
  assert.equal(CHOOSE, 'Voor je werk of uit interesse: elke maandag drie stukken per onderwerp.')
  assert.match(read('ios/Hoot/Views/DigestView.swift'), /static let choose = "Voor je werk of uit interesse: elke maandag drie stukken per onderwerp\."/)
  for (const p of ['src/views/Vak.jsx', 'src/views/Settings.jsx', 'ios/Hoot/Views/SettingsView.swift']) assert.ok(read(p).includes('Elke maandag drie stukken per onderwerp.'), p)
  for (const p of ['src/views/Welcome.jsx', 'ios/Hoot/Views/WelcomeView.swift']) assert.ok(read(p).includes('Elke maandag drie stukken over wat jou bezighoudt.'), p)
  assert.ok(!/beste/.test(VOORPROEF))
  assert.ok(read('ios/Hoot/Views/DigestView.swift').includes(`static let voorproef = "${VOORPROEF}"`))
})

test('nergens meer "het beste" of "de drie beste" als belofte van de Selectie', () => {
  for (const p of ['src/lib/selection-index.js', 'src/views/Vak.jsx', 'src/views/Settings.jsx', 'src/views/Welcome.jsx', 'ios/Hoot/Views/DigestView.swift', 'ios/Hoot/Views/SettingsView.swift', 'ios/Hoot/Views/WelcomeView.swift', 'ios/AppStore/tools/store.mjs', 'ios/AppStore/tools/frames.mjs']) {
    assert.ok(!/Elke maandag het beste|drie beste stukken|het beste uit je vak/i.test(read(p)), p)
  }
  assert.match(read('ios/AppStore/tools/store.mjs'), /\['selectie', 'Elke maandag', 'drie stukken uit je vak\.'\]/)
})

test('REVIEW-NOTES en promotieteksten noemen de oude telregel niet meer', () => {
  assert.ok(!/how many trade publications covered/i.test(read('ios/AppStore/REVIEW-NOTES.md')))
  assert.ok(!/hoeveel vakbronnen erover schreven/i.test(read('ios/AppStore/promotie/TEKSTEN.md')))
})
