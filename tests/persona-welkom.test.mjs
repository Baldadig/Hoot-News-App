// Persona's 14 november, punt 9 (keuze van Alex): Achterklap & showbizz is in het welkom aan te tikken als subonderwerp
// onder Cultuur. Fatima wilde showbizz, en het welkom sloot het voor haar uit: wie Cultuur koos, kreeg "Cultuur-alles"
// zonder showbizz (OPT_IN), en aantikken kon alleen later in Instellingen. Dezelfde gevallen toetst de app
// (RubriekVersieTests.testShowbizzAantikkenInHetWelkom).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { withOptIn, pickedFrom, applyWelcome } from '../src/lib/welcome.js'
import { INTERESTS, OPT_IN, resolveTopics } from '../src/lib/topics.js'

const alles = resolveTopics(['cultuur'], [])

test('showbizz aantikken onder Cultuur: Cultuur blijft alles, met showbizz erbij', () => {
  assert.deepEqual(withOptIn(alles, ['cultuur'], ['showbizz']), [...alles, 'showbizz'])
  assert.deepEqual(withOptIn(alles, ['cultuur'], []), alles)
  assert.deepEqual(withOptIn(resolveTopics(['sport'], []), ['sport'], ['showbizz']), resolveTopics(['sport'], []), 'zonder Cultuur geen showbizz')
  assert.deepEqual(withOptIn([...alles, 'showbizz'], ['cultuur'], []), alles, 'uitzetten haalt het weg')
  assert.deepEqual(withOptIn(['muziek'], ['cultuur'], ['showbizz', 'showbizz', 'voetbal']), ['muziek', 'showbizz'])
  // Opnieuw kiezen: wie Cultuur-alles plus showbizz volgt, ziet Cultuur als alles en showbizz aangetikt.
  assert.deepEqual(pickedFrom([...alles, 'showbizz'], ['cultuur'], INTERESTS).filter((t) => !OPT_IN.has(t)), alles)
})

test('het welkom slaat showbizz op als onderwerp, en De Redacteur laat het dan toe', () => {
  const p = applyWelcome({}, { interests: ['cultuur', 'sport'], topics: withOptIn(resolveTopics(['cultuur', 'sport'], []), ['cultuur', 'sport'], ['showbizz']), sources: ['nos'], all: [{ id: 'nos' }] })
  assert.ok(p.topics.includes('showbizz'))
  assert.ok(p.topics.includes('muziek') && p.topics.includes('voetbal'), 'de rest van Cultuur en Sport blijft')
})

test('web en app tonen de keuze onder de gekozen interesse', () => {
  const web = readFileSync(new URL('../src/views/Welcome.jsx', import.meta.url), 'utf8')
  const app = readFileSync(new URL('../ios/Hoot/Views/WelcomeView.swift', import.meta.url), 'utf8')
  assert.match(web, /withOptIn\(resolveTopics\(interests, picked\.filter/)
  assert.match(web, /ob__optin/)
  assert.match(app, /Rubriek\.withOptIn\(Rubriek\.resolve\(ids, picked: picked\.filter/)
  assert.match(app, /GroupTitle\(text: "Onder \\\(r\.label\)"\)/)
})
