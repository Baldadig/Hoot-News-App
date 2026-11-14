// De trekstrook hoort bij de inhoud (iOS: RefreshStrip.zicht, ios/HootTests/PullZonTests.swift): trek je om te
// verversen en lees je meteen verder, dan schuift de horizon met de Editie mee omhoog en uit beeld, zoals de
// verversknop van iOS. Sinds 1.4 (build 58) is er geen meelopende kop meer: bovenaan staan alleen de
// bedieningselementen, en niets daarvan hoeft voor de strook te wijken.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { STRIP, stripZicht } from '../src/lib/pull-horizon.js'

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

test('rare waarden tekenen niets vreemds', () => {
  assert.equal(stripZicht({ top: 20, h: 0, scrollTop: 0 }), 0)
  assert.equal(stripZicht({ top: 20, h: NaN, scrollTop: 0 }), 0)
  assert.equal(stripZicht({ top: 20, h: STRIP, scrollTop: -40 }), STRIP, 'overtrekken is geen scroll')
  assert.equal(stripZicht({ top: 20, h: STRIP, scrollTop: Infinity }), STRIP)
})

test('geen meelopende kop en geen zon als voortgang meer (besluit Alex, 14 november)', () => {
  assert.ok(!existsSync(new URL('../src/styles/zon-voortgang.css', import.meta.url)), 'de stijl van de meelopende kop is weg')
  assert.ok(!existsSync(new URL('../src/lib/leesstand.js', import.meta.url)), 'de leesstand voor de zon is weg')
  const edition = read('src/views/Edition.jsx')
  assert.doesNotMatch(edition, /edbar|KopSun|leesstand|leesWaarde/)
  assert.doesNotMatch(read('src/main.jsx'), /zon-voortgang/)
  assert.doesNotMatch(read('src/styles/dagdeel-wissel.css'), /edbar/)
  const jsx = read('src/components/PullHorizon.jsx')
  assert.doesNotMatch(jsx, /--pull-kop|edbar/)
  assert.match(jsx, /stripZicht\(/)
  // De rest van het merk blijft: de zon onderaan de Editie en de horizon in de trekstrook.
  assert.match(edition, /EindeSun/)
})
