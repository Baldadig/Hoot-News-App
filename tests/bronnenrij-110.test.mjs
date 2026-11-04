// Bronnenrij in de Stroom (b11-bronnenrij): een gekozen bolletje wordt nergens afgesneden, en de
// open rij staat een fractie dichter op elkaar. Web en iOS gelijk.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TAP, LOGO, SMALL, STEP_OPEN, STRIP_FADE, UITLOOP, EDGE, plek } from '../src/lib/streamline.js'

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('open rij: stap 44 (vak 44 naast elkaar), 8 tussen de logo’s', () => {
  assert.equal(STEP_OPEN, TAP)
  assert.equal(STEP_OPEN - LOGO, 8)
  assert.deepEqual(plek({ i: 2, k: 0, n: 3 }), { x: 2 * 44, s: SMALL / LOGO, o: 1 })
})

test('uitloop dekt ring en vinkje: vak tot 8 voorbij de lijn (iOS, knop-as) + 2 vinkje', () => {
  const vinkje = 2 // het vinkje steekt 2 buiten het vak van 44
  assert.ok(UITLOOP >= EDGE + vinkje)
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
  assert.doesNotMatch(blok, /gap:/)
  assert.match(blok, /transparent var\(--ul\)/)
})

test('iOS: zelfde stap, geen knip op de rand, masker met uitloop 12', () => {
  const swift = read('ios/Hoot/Views/StreamLine.swift')
  assert.match(swift, /static let stepOpen = Space\.tap /)
  assert.match(swift, /static let uitloop = Space\.s3/)
  assert.match(swift, /HStack\(spacing: 0\) \{\n\s+ForEach\(Array\(bollen/)
  assert.match(swift, /\.scrollClipDisabled\(\)\n\s+\.mask\(rand\(links: open && rij\.links/)
})
