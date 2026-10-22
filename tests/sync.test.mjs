import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeRead, mergeSaved, pickSynced } from '../src/lib/sync.js'

test('alleen de gedeelde instellingen gaan mee; indeling en tekstgrootte blijven per toestel', () => {
  assert.deepEqual(pickSynced({ layout: 'krant', textSize: 'groot', pinned: ['ai'], muted: ['nos'] }), { pinned: ['ai'], muted: ['nos'] })
})

test('gelezen: samengevoegd zonder dubbelen, de nieuwste blijven', () => {
  assert.deepEqual(mergeRead(['a', 'b'], ['b', 'c']), ['a', 'b', 'c'])
  assert.deepEqual(mergeRead(['a', 'b', 'c'], [], 2), ['b', 'c'])
})

test('bewaard: eerste keer alles van beide kanten, jongste wint', () => {
  const m = mergeSaved({ x: { savedAt: 5, v: 'lokaal' }, y: { savedAt: 1 } }, { x: { savedAt: 3, v: 'server' }, z: { savedAt: 2 } })
  assert.equal(m.x.v, 'lokaal')
  assert.deepEqual(Object.keys(m).sort(), ['x', 'y', 'z'])
})
