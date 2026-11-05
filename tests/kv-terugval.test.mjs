import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fellBack, kvTake, kvGive } from '../netlify/lib/kv.mjs'

// Review B3 (5 november): een terugval op geheugen is lokaal normaal, op Netlify een storing die je moet zien.
test('Blobs-fouten worden gelogd (één keer per handeling en sleutel); lokaal zonder Blobs stil', () => {
  const lines = []
  const orig = console.error
  console.error = (...a) => lines.push(a.join(' '))
  try {
    const missing = Object.assign(new Error('geen omgeving'), { name: 'MissingBlobsEnvironmentError' })
    assert.equal(fellBack('lezen', 'k1', missing), false)
    assert.equal(fellBack('schrijven', 'feed-part-nos', new Error('503 Service Unavailable')), true)
    assert.equal(fellBack('schrijven', 'feed-part-nos', new Error('503 Service Unavailable')), true)
    assert.equal(lines.length, 1)
    assert.match(lines[0], /\[kv\] Netlify Blobs schrijven mislukte voor "feed-part-nos"; terugval op het geheugen/)
  } finally {
    console.error = orig
  }
})

test('kvTake en kvGive: atomair in het geheugen, plafond en nooit onder nul', async () => {
  const got = await Promise.all(Array.from({ length: 12 }, () => kvTake('teller-test', 5)))
  assert.deepEqual(got.filter((n) => n != null).sort((a, b) => a - b), [1, 2, 3, 4, 5])
  assert.equal(got.filter((n) => n == null).length, 7)
  assert.equal(await kvGive('teller-test'), 4)
  for (let i = 0; i < 6; i++) await kvGive('teller-test')
  assert.equal(await kvGive('teller-test'), 0)
})
