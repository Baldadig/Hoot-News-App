// Nachttest 14 november (A7): het merkbeeld van een bron valt niet meer terug op unavatar.io (429), maar op het
// eigen logo van Hoot, dat er voor elke bron in de catalogus is.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { SOURCES, ownLogo, OWN_LOGO_BASE } from '../netlify/lib/sources.mjs'

test('bronlogo: elke bron in de catalogus heeft een eigen logo; vakbronnen niet', () => {
  for (const s of SOURCES) {
    assert.ok(existsSync(new URL(`../landing/bronnen/${s.id}.webp`, import.meta.url)), s.id)
    assert.equal(ownLogo(s.id), `${OWN_LOGO_BASE}${s.id}.webp`)
  }
  assert.equal(ownLogo('vak:tpo'), null)
})

test('bronlogo: geen unavatar meer in de terugval; NOS heeft geen Bluesky-handle die niet bestaat', () => {
  for (const f of ['../netlify/lib/rss.mjs', '../netlify/lib/build.mjs']) assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /unavatar/)
  for (const id of ['nos', 'nos-economie', 'nos-sport', 'nos-cultuur']) {
    const s = SOURCES.find((x) => x.id === id)
    assert.equal(s.logo, ownLogo(id))
    assert.notEqual(s.bsky, 'nos.nl')
  }
})

test('bronlogo: De Groene toont het eigen logo met het hele woordmerk, niet het afgesneden profielbeeld', () => {
  assert.equal(SOURCES.find((x) => x.id === 'groene').logo, ownLogo('groene'))
})
