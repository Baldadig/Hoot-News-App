// Bronnenrij in de Stroom (b11-bronnenrij): een gekozen bolletje wordt nergens afgesneden, en de
// open rij staat een fractie dichter op elkaar. Web en iOS gelijk.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TAP, LOGO, SMALL, STEP_OPEN, GAP_OPEN, STRIP_FADE, UITLOOP, EDGE, plek } from '../src/lib/streamline.js'

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('open rij: stap 46 (vak 44 + 2), 10 tussen de logo’s, 2 tussen de ringen', () => {
  assert.equal(STEP_OPEN, TAP + 2)
  assert.equal(GAP_OPEN, 2)
  assert.equal(STEP_OPEN - LOGO, 10)
  assert.equal(STEP_OPEN - TAP, 2)
  assert.deepEqual(plek({ i: 2, k: 0, n: 3 }), { x: 2 * 46, s: SMALL / LOGO, o: 1 })
})

test('uitloop blijft ruim: vangnet voor focusring en grote tekst', () => {
  assert.ok(UITLOOP >= EDGE + 2)
  assert.ok(UITLOOP < 16) // binnen de kleinste paginamarge
  assert.equal(STRIP_FADE, 24)
})

test('web: rij reikt UITLOOP buiten de lijn, masker knipt op de lijn waar hij vervaagt', () => {
  const css = read('src/styles.css')
  const blok = css.slice(css.indexOf('.src__scroll {'), css.indexOf('.src__scroll::-webkit-scrollbar'))
  assert.match(blok, /--uit: var\(--s3\)/)
  assert.match(css, /--s3: 12px/)
  assert.equal(UITLOOP, 12)
  assert.match(blok, /inset: calc\(-1 \* var\(--uit\)\)/)
  assert.match(blok, /padding: var\(--uit\)/)
  assert.match(blok, /gap: 2px/)
  assert.match(blok, /transparent var\(--ul\)/)
})

test('iOS: zelfde stap, geen knip op de rand, masker met uitloop 12', () => {
  const swift = read('ios/Hoot/Views/StreamLine.swift')
  assert.match(swift, /static let stepOpen = Space\.tap \+ Space\.s0/)
  assert.match(swift, /static let uitloop = Space\.s3/)
  assert.match(swift, /HStack\(spacing: Space\.s0\) \{\n\s+ForEach\(Array\(bollen/)
  assert.match(swift, /\.scrollClipDisabled\(\)\n\s+\.mask\(rand\(links: open && rij\.links/)
})

test('iOS en web: open eindigt Alle bronnen binnen de kolomrand, vinkje binnen het vak', () => {
  const swift = read('ios/Hoot/Views/StreamLine.swift')
  assert.match(swift, /openRand: CGFloat \{ max\(0, Self\.edgeBasis - edge\) \}/)
  assert.match(swift, /if open \{\n\s+x = -openRand/)
  assert.doesNotMatch(swift, /\.offset\(x: Space\.s0, y: Space\.s0\)/)
})

test('stap 46b: vinkje 2 binnen het vak op web en iOS, open rij begint links op de lijn', () => {
  const css = read('src/styles.css')
  const blok = css.slice(css.indexOf('.sb__check {'), css.indexOf('.sb__check svg'))
  assert.match(blok, /right: 2px;/)
  assert.match(blok, /bottom: 2px;/)
  const swift = read('ios/Hoot/Views/StreamLine.swift')
  assert.match(swift, /\.padding\(Space\.s0\)\n\s+\.background\(Theme\.paper, in: Circle\(\)\)/)
  assert.match(swift, /\.padding\(\.leading, open \? openRand : 0\)/)
})
