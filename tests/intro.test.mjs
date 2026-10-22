import { test } from 'node:test'
import assert from 'node:assert/strict'
import { introOf } from '../netlify/lib/rss.mjs'

test('intro uit content:encoded, zonder de vaste aanhef van Nature', () => {
  const it = { contentEncoded: '<p>Nature, Published online: 21 October 2026; <a href="x">doi:10.1038/d41586-026-03376-6</a></p>Experiment shows how these ecosystems could protect coastlines.' }
  assert.equal(introOf(it, 'Scientists put a salt marsh in a giant wave-machine'), 'Experiment shows how these ecosystems could protect coastlines.')
})

test('een intro die alleen de kop herhaalt is geen intro', () => {
  const it = { contentEncoded: '<p>Nature, Published online: 21 October 2026; doi:10.1038/s41586</p><i>De novo</i> design of photocatalysts' }
  assert.equal(introOf(it, 'De novo design of photocatalysts'), '')
})

test('de gewone samenvatting gaat voor', () => {
  assert.equal(introOf({ contentSnippet: 'Korte samenvatting.', contentEncoded: '<p>Lange tekst</p>' }, 'Kop'), 'Korte samenvatting.')
})
