import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describe } from '../src/lib/weather.js'

test('weercodes worden een soort en een Nederlandse omschrijving', () => {
  assert.deepEqual(describe(0), { kind: 'zon', label: 'zonnig' })
  assert.equal(describe(2).kind, 'halfbewolkt')
  assert.equal(describe(3).label, 'bewolkt')
  assert.equal(describe(53).label, 'motregen')
  assert.equal(describe(63).label, 'regen')
  assert.equal(describe(81).kind, 'regen')
  assert.equal(describe(73).kind, 'sneeuw')
  assert.equal(describe(95).kind, 'onweer')
  assert.equal(describe(45).kind, 'mist')
  assert.equal(describe(undefined).kind, 'bewolkt')
})
