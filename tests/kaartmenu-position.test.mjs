import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bottomPosition } from './visual/kaartmenu-position.mjs'

const plan = extra => bottomPosition({ top: 400, height: 44, scrollTop: 800, scrollMax: 2000, viewportHeight: 900, gutter: 16, ...extra })
test('de onderste proef zet de hele knop bij de onderrand, niet deels buiten beeld', () => {
  const p = plan()
  assert.equal(p.resize, false)
  assert.equal(800 + 400 - p.scrollTop + 44, 884)
})
test('de vier vroege Editie-knoppen krijgen een bereikbare onderrand zonder negatieve scroll', () => {
  for (const width of [1440,1280]) for (const buttonWidth of [32,44]) {
    const p = plan({ top: 765.4, scrollTop: 0 })
    assert.equal(p.resize, true, `${width}/${buttonWidth}`)
    assert.equal(p.scrollTop, 0)
    assert.equal(p.viewportHeight, 825)
    assert.ok(Math.abs(765.4 + 44 - (p.viewportHeight - 16)) < 1)
  }
})
test('ook de vroege Stroom-knop uit de rode proef krijgt een echte onderrand', () => {
  const p = plan({ top: 726, scrollTop: 0 })
  assert.equal(p.resize, true)
  assert.equal(p.viewportHeight, 786)
  assert.equal(p.scrollTop, 0)
})
test('op de telefoon telt de zichtbare scrollruimte boven de tabbalk', () => {
  const p = plan({ viewportHeight: 844, lowerEdge: 791 })
  assert.equal(p.targetBottom, 775)
  assert.equal(800 + 400 - p.scrollTop + 44, 775)
})
test('de opstelling respecteert de echte maximale scrollpositie', () => {
  const p = plan({ scrollMax: 100 })
  assert.equal(p.scrollTop, 100)
  assert.equal(p.resize, false)
})

test('een zwevende knop begrenst alleen de aanklikbare onderrand van de proef', () => {
  const p = plan({ viewportHeight: 844, lowerEdge: 731 })
  assert.equal(p.targetBottom, 715)
  assert.equal(800 + 400 - p.scrollTop + 44, 715)
})
