// Selectie-review 14 november, punt 12: de teksten beloven niet meer dan de regel doet. "Drie stukken" in plaats van
// "het beste", op web en in de app gelijk, en in de bron van het App Store-beeld (de beelden zelf gaan mee met een
// volgende inzending). REVIEW-NOTES.md en promotie/TEKSTEN.md noemen de oude regel niet meer.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CHOOSE, VOORPROEF } from '../src/lib/selection-index.js'

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('lege Selectie, blad Onderwerpen en welkom: drie stukken, web en app gelijk', () => {
  // De lege Selectie vraagt het zelf (onboarding 14 november, blok 5), met "drie stukken" (Selectie-review, punt 12).
  assert.equal(CHOOSE, 'Elke maandag drie stukken over je werk of hobby. Kies waarover.')
  assert.match(read('ios/Hoot/Views/DigestView.swift'), /static let choose = "Elke maandag drie stukken over je werk of hobby\. Kies waarover\."/)
  for (const p of ['src/views/Vak.jsx', 'src/views/Settings.jsx', 'ios/Hoot/Views/SettingsView.swift']) assert.ok(read(p).includes('Elke maandag drie stukken per onderwerp.'), p)
  // Het uitlegscherm "Zo werkt Hoot" is weg (onboarding blok 3); de uitklapper bij opnieuw kiezen belooft drie stukken.
  for (const p of ['src/views/Welcome.jsx', 'ios/Hoot/Views/WelcomeView.swift']) {
    assert.ok(read(p).includes('Elke maandag drie stukken over je werk of hobby.'), p)
    assert.ok(!read(p).includes('het beste over'), p)
  }
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
