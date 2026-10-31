import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { wholeSentences, introMax } from '../shared/zinnen.mjs'

// Intro's in hele zinnen (T2, D2). De gevallen staan in een fixture die iOS ook leest (I4), zodat
// web en app precies hetzelfde knippen. max null = Infinity ('alles').
const fx = JSON.parse(readFileSync(new URL('./fixtures/zinnen.json', import.meta.url), 'utf8'))
const inf = (v) => (v == null ? Infinity : v)

for (const c of fx.zinnen) {
  test(`wholeSentences: ${c.naam}`, () => {
    const out = wholeSentences(c.invoer, inf(c.max))
    assert.equal(out, c.verwacht)
    assert.ok(!/(…|\.\.\.)$/.test(out), 'Hoot eindigt nooit met een beletselteken')
    if (c.max != null) assert.ok(out.length <= c.max || out === c.invoer.replace(/\s+/g, ' ').trim(), 'binnen max')
  })
}

test('introMax: 60, 130, 200 en alles, met miniatuur × 0,8', () => {
  for (const c of fx.introMax) assert.equal(introMax(c.lines, c.thumb), inf(c.verwacht), `${c.lines} ${c.thumb}`)
})

test('wholeSentences: null en undefined zijn leeg', () => {
  assert.equal(wholeSentences(null, 130), '')
  assert.equal(wholeSentences(undefined), '')
})
