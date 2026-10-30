import { test } from 'node:test'
import assert from 'node:assert/strict'
import { irisKeyframes, tintTimes, openTimes, reducedPlan, reduced, IRIS, IRIS_BACK, IRIS_MS, FADE_MS } from '../src/lib/motion.js'

// De iris (Welkom, W3): de getallen staan in de lib, niet in de component.

test('iris: van schermvullend tot de punt, zelfde middelpunt, straal = de diagonaal', () => {
  const [open, closed] = irisKeyframes({ x: 72.5, y: 50, r: 2.1, w: 375, h: 812 })
  const R = Math.hypot(375, 812)
  assert.equal(open, `circle(${Math.round(R * 100) / 100}px at 72.5px 50px)`)
  assert.equal(closed, 'circle(2.1px at 72.5px 50px)')
  // Alleen px en dezelfde vorm: anders interpoleert clip-path niet.
  assert.ok(!/%|vw|vh/.test(open + closed))
})

test('iris: de diagonaal dekt het scherm vanuit elk middelpunt', () => {
  const [open] = irisKeyframes({ x: 0, y: 0, r: 1, w: 1280, h: 900 })
  const R = parseFloat(open.match(/circle\(([\d.]+)px/)[1])
  assert.ok(R >= Math.hypot(1280, 900) - 0.01, 'tot in de verste hoek')
})

test('sluiten: punt weg op 35 %, tint vanaf 60 % over 40 %, een tiende langer dan de curve', () => {
  assert.deepEqual(tintTimes(700), { dotEnd: 245, tintStart: 420, tintDur: 280, end: 800 })
  assert.deepEqual(tintTimes(), tintTimes(IRIS_MS))
  assert.equal(IRIS_MS, 700)
})

test('openen: één beeld gesloten, kleur terug over 40 %, punt terug in de laatste 35 %', () => {
  const o = openTimes(700)
  assert.deepEqual(o, { delay: 32, tintDur: 280, dotStart: 455, dotDur: 245, end: 750 })
  assert.equal(o.dotStart + o.dotDur, 700, 'de punt is terug precies als de iris open is')
})

test('curves uit het brandboard en Minder beweging als fade van 0,35 s', () => {
  assert.equal(IRIS, 'cubic-bezier(0.6, 0, 0.2, 1)')
  assert.equal(IRIS_BACK, 'cubic-bezier(0.8, 0, 0.4, 1)')
  assert.deepEqual(reducedPlan(), { fade: 350 })
  assert.equal(FADE_MS, 350)
  assert.equal(reduced(), false, 'buiten de browser nooit')
})
