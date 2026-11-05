import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tooWide, longWords, segments } from '../src/lib/kop-afbreken.js'

// Een kop wordt alleen afgebroken als een woord niet op een regel past (keuring tekstfont, AX5).
test('alleen een woord breder dan de kolom zet afbreken aan', () => {
  assert.equal(tooWide([120, 200], 358), false)
  assert.equal(tooWide([358.4], 358), true) // halve pixel speling
  assert.equal(tooWide([357.4], 358), false)
  assert.equal(tooWide([400], 0), false) // nog geen breedte: niets doen
})
test('korte woorden worden niet gemeten', () => {
  assert.deepEqual(longWords('De Amerikaanse verkiezingsnacht van de NOS'), ['Amerikaanse', 'verkiezingsnacht'])
  assert.deepEqual(longWords(''), [])
})
test('alleen het te brede woord wordt een eigen stuk, de rest van de kop blijft heel', () => {
  const wide = w => w.length > 20
  assert.deepEqual(segments('De Rijksvoorlichtingsdienst zegt verkiezingsnacht af', wide), [
    { text: 'De ', wide: false }, { text: 'Rijksvoorlichtingsdienst', wide: true }, { text: ' zegt verkiezingsnacht af', wide: false },
  ])
  assert.deepEqual(segments('Rijksvoorlichtingsdienst: nee', wide).map(s => s.text), ['Rijksvoorlichtingsdienst', ': nee'])
  assert.equal(segments('Rijksvoorlichtingsdienst: nee', wide)[0].wide, true)
  assert.deepEqual(segments('“coalitieonderhandelingen”', w => true).map(s => [s.text, s.wide]), [['“', false], ['coalitieonderhandelingen', true], ['”', false]])
  assert.deepEqual(segments('Korte kop', () => false), [{ text: 'Korte kop', wide: false }])
  assert.deepEqual(segments('', () => true), [])
})
