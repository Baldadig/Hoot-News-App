import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { applyWelcome, sourcesOn } from '../src/lib/welcome.js'
import { mutedSet } from '../src/lib/sourcesel.js'

const all = [{ id: 'nos' }, { id: 'nrc' }, { id: 'vk' }, { id: 'tweakers', optional: true }, { id: 'wired', optional: true }]

test('opnieuw kiezen begint met de bronnen die nu aan staan', () => {
  const prefs = { muted: ['vk'], enabled: ['tweakers'] }
  assert.deepEqual(sourcesOn(all, mutedSet(prefs, all)), ['nos', 'nrc', 'tweakers'])
})

test('niets veranderd in het welkom = niets veranderd aan je bronnen', () => {
  const prefs = { onboarded: true, muted: ['vk', 'elders'], enabled: ['tweakers', 'ergens'], pinned: ['ai'], interests: ['tech'], topics: ['ai', 'games'] }
  const sources = sourcesOn(all, mutedSet(prefs, all))
  const next = applyWelcome(prefs, { interests: ['tech'], topics: ['ai', 'games'], sources, all })
  assert.deepEqual(new Set(mutedSet(next, all)), new Set(mutedSet(prefs, all)))
  assert.deepEqual(next.muted.sort(), ['elders', 'vk'])
  assert.deepEqual(next.enabled.sort(), ['ergens', 'tweakers'])
  assert.deepEqual(next.interests, ['tech'])
  assert.deepEqual(next.topics, ['ai', 'games'])
})

test('opnieuw kiezen houdt je vaste onderwerpen, voor zover je ze nog volgt', () => {
  const prefs = { onboarded: true, pinned: ['games', 'oekraine'] }
  const next = applyWelcome(prefs, { interests: ['tech'], topics: ['ai', 'games'], sources: [], all })
  assert.deepEqual(next.pinned, ['games'])
  const gone = applyWelcome(prefs, { interests: ['tech'], topics: ['ai', 'chips'], sources: [], all })
  assert.deepEqual(gone.pinned, ['ai', 'chips'])
})

test('eerste start: de eerste drie onderwerpen worden vast, en de keuze wordt je bronnen', () => {
  const prefs = { onboarded: false, pinned: ['nederland', 'vs-politiek', 'ai'], muted: [], enabled: [] }
  const next = applyWelcome(prefs, { interests: ['tech'], topics: ['chips', 'ai', 'games', 'apps'], sources: ['nos', 'wired'], all, vak: ['zorg'] })
  assert.equal(next.onboarded, true)
  assert.deepEqual(next.pinned, ['chips', 'ai', 'games'])
  assert.deepEqual(next.muted, ['nrc', 'vk'])
  assert.deepEqual(next.enabled, ['wired'])
  assert.deepEqual(next.vak, ['zorg'])
})

test('de uitleg bij "Jouw Editie" komt één keer, alleen na het eerste welkom', () => {
  const first = applyWelcome({ onboarded: false }, { interests: [], topics: [], sources: [], all })
  assert.equal(first.editieHint, true)
  const again = applyWelcome({ ...first, editieHint: false }, { interests: [], topics: [], sources: [], all })
  assert.equal(again.editieHint, false, 'opnieuw kiezen zet hem niet terug')
  assert.equal(applyWelcome({ onboarded: true }, { interests: [], topics: [], sources: [], all }).editieHint, undefined)
})

// Onboarding 14 november, blok 1: op het web lees je eerst de Editie (meteen lezen) en kies je daarna.
test('meteen lezen geeft geen uitleg bij "Jouw Editie"; de eerste echte keuze daarna wel', () => {
  const quick = applyWelcome({ onboarded: false }, { interests: [], topics: [], sources: ['nos'], all, quick: true })
  assert.equal(quick.onboarded, true)
  assert.equal(quick.browsing, true)
  assert.equal(quick.editieHint, undefined, 'na meteen lezen koos je nog niets')
  const chosen = applyWelcome(quick, { interests: ['tech'], topics: ['ai'], sources: ['nos', 'nrc'], all })
  assert.equal(chosen.browsing, false)
  assert.equal(chosen.editieHint, true, 'de eerste keuze na meteen lezen')
  const again = applyWelcome({ ...chosen, editieHint: false }, { interests: ['tech'], topics: ['ai'], sources: ['nos'], all })
  assert.equal(again.editieHint, false, 'daarna niet meer')
})

test('web: een eerste bezoeker komt zonder welkom in de Editie, met de startset; het welkom blijft voor opnieuw kiezen', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /const showWelcome = path === 'welkom'\n/)
  assert.match(app, /const startMeteen = !prefs\.onboarded && !\['welkom', 'over', 'privacy'\]\.includes\(path\) && pickable\.length > 0/)
  assert.match(app, /applyWelcome\(p, \{ interests: \[\], topics: \[\], sources: startIds\(pickable\), all: pickable, quick: true \}\)/)
  // Liever meteen lezen telt niet meer op het web; het opstartscherm gaat zonder welkom over in de Editie.
  assert.doesNotMatch(app, /liever-meteen-lezen/)
  assert.match(app, /<Splash ready=\{status !== 'loading'\} toWelcome=\{showWelcome\}/)
})

test('onboarding blok 6: de rode intro zonder kop van nu, "Al een account? Log in", en de stappen geteld', () => {
  const web = readFileSync(new URL('../src/views/Welcome.jsx', import.meta.url), 'utf8')
  const ios = readFileSync(new URL('../ios/Hoot/Views/WelcomeView.swift', import.meta.url), 'utf8')
  for (const src of [web, ios]) {
    assert.doesNotMatch(src, /proofHeadline|Self\.proof\(|ob__proof|rustig op een rij|Nu in de Editie/, 'geen kop van nu, geen ondertitel, geen etiket')
    assert.match(src, /Al een account\? Log in/)
  }
  assert.match(web, /if \(view === 'interesses'\) step\.current\('welkom-interesses'\)\n\s*else if \(view === 'bronnen'\) step\.current\('welkom-bronnen'\)/)
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /onStep=\{telStap\}/)
  // Begin en Liever meteen lezen gecentreerd op de brede rode intro.
  const css = readFileSync(new URL('../src/styles/welkom-intro.css', import.meta.url), 'utf8')
  assert.match(css, /@media \(min-width: 720px\)[\s\S]*\.ob--open \.ob__foot > \.col \{\s*flex-direction: column;\s*align-items: center;/)
})

// ---- Hulpjes ----
import { sourceLine, pickedFrom } from '../src/lib/welcome.js'
import { INTERESTS } from '../src/lib/topics.js'

test('je bronnen in één regel', () => {
  assert.equal(sourceLine([]), 'Geen bronnen')
  assert.equal(sourceLine(['NOS']), 'NOS')
  assert.equal(sourceLine(['NOS', 'NU.nl']), 'NOS en NU.nl')
  assert.equal(sourceLine(['NOS', 'NU.nl', 'RTL Nieuws']), 'NOS, NU.nl en RTL Nieuws')
  assert.equal(sourceLine(['NOS', 'NU.nl', 'RTL Nieuws', 'BBC', 'Tweakers']), 'NOS, NU.nl en 3 meer')
})

test('opnieuw kiezen houdt je fijne onderwerpen: alle onderwerpen volgen is geen keuze maar Alles', () => {
  const pol = INTERESTS.find((i) => i.id === 'politiek')
  assert.deepEqual(pickedFrom(pol.topics, ['politiek'], INTERESTS), [])
  assert.deepEqual(pickedFrom(['nederland', 'verkiezingen'], ['politiek'], INTERESTS), ['nederland', 'verkiezingen'])
  assert.deepEqual(pickedFrom(['nederland', 'ai'], ['politiek'], INTERESTS), ['nederland'], 'alleen interesses die je koos')
  assert.deepEqual(pickedFrom([], [], INTERESTS), [])
})
