import { test } from 'node:test'
import assert from 'node:assert/strict'
import { labelFor } from '../src/lib/label.js'

const follows = ['nederland', 'film', 'oekraine']

test('verhaal over een onderwerp dat je volgt: interesse · onderwerp', () => {
  assert.equal(labelFor({ topics: ['nederland'], follows, deskLabel: 'Binnenland' }).kicker, 'Politiek · Den Haag')
  assert.equal(labelFor({ topics: ['film', 'muziek'], follows, deskLabel: 'Cultuur' }).kicker, 'Cultuur · Film & series')
  assert.equal(labelFor({ topics: ['oekraine'], follows, deskLabel: 'Oekraïne' }).kicker, 'Wereld · Oekraïne & Rusland')
})

test('raakt het verhaal niets wat je volgt: de rubriek', () => {
  assert.equal(labelFor({ topics: ['wonen'], follows, deskLabel: 'Binnenland' }).kicker, 'Binnenland')
  assert.equal(labelFor({ topics: [], follows: [], section: 'Economie' }).kicker, 'Economie')
  assert.equal(labelFor({}).kicker, null)
})

test('een sportbron is Sport', () => {
  assert.equal(labelFor({ cat: 'sport', follows, deskLabel: 'Binnenland' }).kicker, 'Sport')
  assert.equal(labelFor({ cat: 'sport', topics: ['nederland'], follows }).kicker, 'Politiek · Den Haag') // je interesse gaat voor
})

test('de waarom-regel alleen als die iets toevoegt', () => {
  const omdat = { code: 'interest', text: 'Omdat je Den Haag volgt' }
  assert.equal(labelFor({ topics: ['nederland'], follows, why: omdat }).why, null) // de kicker zegt het al
  assert.deepEqual(labelFor({ topics: ['wonen'], follows, why: omdat }).why, omdat) // de kicker zegt het niet
  for (const w of [
    { code: 'followUp', text: 'Vervolg op wat je las · 2 nieuwe stukken' },
    { code: 'groot', text: 'Groot nieuws · 11 bronnen' },
    { code: 'favorite', text: 'Uit je voorkeursbron NOS' },
    { code: 'buur', text: 'Naast je bubbel · grenst aan Sport' },
  ]) assert.deepEqual(labelFor({ topics: ['nederland'], follows, why: w }).why, w)
  for (const code of ['rubriek', 'extern', 'bubbel', 'breed']) assert.equal(labelFor({ why: { code, text: 'x' } }).why, null)
  assert.equal(labelFor({ why: { code: 'groot', text: '  ' } }).why, null)
})

test('Buiten je bronnen hoort bij de bronregel, niet bij de kicker', () => {
  const a = labelFor({ desk: 'extern', deskLabel: 'Buiten je bronnen', section: 'Wereld', why: { code: 'extern', text: 'Buiten je bronnen' } })
  assert.equal(a.outside, true)
  assert.equal(a.kicker, 'Wereld')
  assert.equal(a.why, null)
  const b = labelFor({ deskLabel: 'Tech', followed: false })
  assert.deepEqual([b.kicker, b.outside], ['Tech', true])
  assert.equal(labelFor({ deskLabel: 'Tech' }).outside, false)
})

test('Buiten je bubbel en Waar iedereen over schrijft blijven hun eigen kicker', () => {
  assert.equal(labelFor({ desk: 'bubbel', deskLabel: 'Buiten je bubbel · via Google Trends', topics: ['nederland'], follows }).kicker, 'Buiten je bubbel · via Google Trends')
  assert.equal(labelFor({ desk: 'breed', deskLabel: 'Waar iedereen over schrijft · 9 bronnen', topics: ['nederland'], follows }).kicker, 'Waar iedereen over schrijft · 9 bronnen')
})
