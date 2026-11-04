import { test } from 'node:test'
import assert from 'node:assert/strict'
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
  assert.deepEqual(pickedFrom(['nederland', 'trump'], ['politiek'], INTERESTS), ['nederland', 'trump'])
  assert.deepEqual(pickedFrom(['nederland', 'ai'], ['politiek'], INTERESTS), ['nederland'], 'alleen interesses die je koos')
  assert.deepEqual(pickedFrom([], [], INTERESTS), [])
})
