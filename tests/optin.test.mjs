// Achterklap & showbizz (OPT_IN): dezelfde tikken geven op web en app byte-gelijk dezelfde prefs.topics.
// De gevallen staan in tests/fixtures/optin-cases.json, die de app ook leest (ios/HootTests/OptInTests.swift).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { INTERESTS, OPT_IN, resolveTopics } from '../src/lib/topics.js'
import { withOptIn, pickedFrom } from '../src/lib/welcome.js'

const { cases } = JSON.parse(readFileSync(new URL('./fixtures/optin-cases.json', import.meta.url), 'utf8'))

// Zoals het welkom (Welcome.jsx): de gewone keuze zonder OPT_IN, de opt-in erbovenop.
const topicsFor = (interests, taps) =>
  withOptIn(resolveTopics(interests, taps.filter((t) => !OPT_IN.has(t))), interests, taps.filter((t) => OPT_IN.has(t)))

for (const c of cases) {
  test(`opt-in: ${c.name}`, () => {
    const topics = topicsFor(c.interests, c.taps)
    assert.equal(JSON.stringify(topics), JSON.stringify(c.topics))
    // Opnieuw openen (pickedFrom zonder OPT_IN, opt-in apart) en niets veranderen: dezelfde lijst.
    const picked = pickedFrom(topics.filter((t) => !OPT_IN.has(t)), c.interests, INTERESTS)
    assert.deepEqual(topicsFor(c.interests, [...picked, ...topics.filter((t) => OPT_IN.has(t))]), c.topics)
  })
}

test('opt-in: de gevallen uit de opdracht staan erin', () => {
  for (const n of ['alleen showbizz', 'showbizz plus Film', 'Film zonder showbizz', 'alles aangetikt plus showbizz', 'showbizz zonder Cultuur gekozen'])
    assert.ok(cases.some((c) => c.name === n), n)
})
