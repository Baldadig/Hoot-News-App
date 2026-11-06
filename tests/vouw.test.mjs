// 01 boven de vouw (variant e): de keuzes van src/lib/vouw.js. De opmaak zelf toetst tests/visual/vouw-check.mjs
// in headless Chrome op 375 × 812 en 402 × 874; de app spiegelt dit in ios/HootTests/VouwTests.swift.
import test from 'node:test'
import assert from 'node:assert/strict'
import { vouwProfiel, beeldHoogte, introKandidaten, varianten, past, VOUW } from '../src/lib/vouw.js'

test('profiel: mini op 812, Pro vanaf 852, niets op de SE of bij grotere tekst', () => {
  assert.equal(vouwProfiel({ schermHoogte: 812 }), 'mini')
  assert.equal(vouwProfiel({ schermHoogte: 852 }), 'pro')
  assert.equal(vouwProfiel({ schermHoogte: 874 }), 'pro')
  assert.equal(vouwProfiel({ schermHoogte: 956 }), 'pro')
  assert.equal(vouwProfiel({ schermHoogte: 667 }), null)
  assert.equal(vouwProfiel({ schermHoogte: 874, schaal: 1.125 }), null)
  assert.equal(vouwProfiel({ schermHoogte: 874, groot: true }), null)
})

test('beeld tussen 2:1 en 3:2', () => {
  assert.equal(beeldHoogte(600, 200, 402), 268)
  assert.equal(beeldHoogte(600, 380, 402), 220)
  assert.equal(beeldHoogte(600, 500, 402), 201)
})

test('intro: hele zinnen, steeds één minder (zoals IntroText.candidates)', () => {
  const t = 'De Britse komiek Russell Brand is schuldig bevonden. Dat heeft de rechtbank in Londen zojuist geoordeeld.'
  assert.deepEqual(introKandidaten(t), [t, 'De Britse komiek Russell Brand is schuldig bevonden.'])
  assert.deepEqual(introKandidaten(''), [])
  assert.deepEqual(introKandidaten('Dr. Jansen zegt het. Klaar.'), ['Dr. Jansen zegt het. Klaar.', 'Dr. Jansen zegt het.'])
})

test('varianten in de volgorde van variant e: eerst de kop kleiner, dan een zin minder, dan zonder intro', () => {
  assert.deepEqual(varianten(['a b.', 'a.']), [{ k26: false, intro: 0 }, { k26: true, intro: 0 }, { k26: true, intro: 1 }, { k26: true, intro: null }])
})

test('past: de bronregel boven de vouw, op de mini strakker', () => {
  const basis = { ruimte: 590, tekst: 380, minBeeld: 201, introRegels: 3, kopRegels: 3, profiel: 'pro', stap: 0 }
  assert.equal(past(basis), true)
  assert.equal(past({ ...basis, tekst: 400 }), false)
  assert.equal(past({ ...basis, introRegels: 6 }), false)
  assert.equal(past({ ...basis, profiel: 'mini', kopRegels: 4 }), false, 'mini: kop 26 vanaf 4 regels op 30')
  assert.equal(past({ ...basis, profiel: 'mini', kopRegels: 4, stap: 1, introRegels: 2 }), true)
  assert.equal(past({ ...basis, profiel: 'mini', stap: 1, introRegels: 3 }), false, 'mini: intro hooguit 2 regels')
  assert.equal(VOUW.pro.introRegels, 5)
})
