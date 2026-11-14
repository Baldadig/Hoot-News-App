// De trekstrook en de zon als voortgang vallen nooit over elkaar heen (1.3.1, build 56). Alex: trekken om te
// verversen en meteen verder lezen tekende de horizon over de meelopende kop met de zon. Web = app: de strook
// schuift met de inhoud mee omhoog (iOS: RefreshStrip.zicht, ios/HootTests/PullZonTests.swift) en wijkt voor
// de meelopende kop; die blijft tegen de bovenrand, ook als de kolom tijdens verversen omlaag staat.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { STRIP, stripZicht, kopTop } from '../src/lib/pull-horizon.js'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('de strook staat heel in rust en schuift met de inhoud mee uit beeld', () => {
  const top = 20
  assert.equal(stripZicht({ top, h: STRIP, scrollTop: 0 }), STRIP)
  for (let s = 0; s <= 400; s += 4) {
    const zicht = stripZicht({ top, h: STRIP, scrollTop: s })
    assert.equal(zicht, Math.max(0, Math.min(STRIP, top + STRIP - s)), `scroll ${s}`)
  }
  assert.equal(stripZicht({ top, h: STRIP, scrollTop: top + STRIP }), 0)
})

test('staat de meelopende kop er, dan is er van de strook niets te zien', () => {
  for (const s of [0, 10, 40, 300]) assert.equal(stripZicht({ top: 20, h: STRIP + 30, scrollTop: s, kop: true }), 0)
})

test('rare waarden tekenen niets vreemds', () => {
  assert.equal(stripZicht({ top: 20, h: 0, scrollTop: 0 }), 0)
  assert.equal(stripZicht({ top: 20, h: NaN, scrollTop: 0 }), 0)
  assert.equal(stripZicht({ top: 20, h: STRIP, scrollTop: -40 }), STRIP, 'overtrekken is geen scroll')
  assert.equal(stripZicht({ top: 20, h: STRIP, scrollTop: Infinity }), STRIP)
})

test('de meelopende kop blijft tegen de bovenrand terwijl de kolom omlaag staat', () => {
  assert.equal(kopTop(0), 0)
  assert.equal(kopTop(STRIP), -STRIP)
  assert.equal(kopTop(STRIP + 30), -(STRIP + 30))
  // sticky top + de verschuiving van de kolom = 0: de kop staat precies bovenaan
  for (const h of [0, 12, STRIP, 90]) assert.equal(kopTop(h) + h, h > 0.01 ? 0 : h)
})

test('de stijl en de strook gebruiken de regel', () => {
  const css = read('src/styles/zon-voortgang.css')
  assert.match(css, /\.edbar\s*\{[^}]*top:\s*var\(--pull-kop,\s*0px\)/)
  assert.match(css, /\.view:has\(\.edbar\.is-aan\)\s*>\s*\.pull\s*\{\s*visibility:\s*hidden/)
  const jsx = read('src/components/PullHorizon.jsx')
  assert.match(jsx, /--pull-kop/)
  assert.match(jsx, /stripZicht\(/)
})
