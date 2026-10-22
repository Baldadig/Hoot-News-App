import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergePrefs, mergeRead, mergeSaved, savedDiff, pickSynced } from '../src/lib/sync.js'

test('instellingen: de server gaat voor, maar indeling en tekstgrootte blijven per toestel', () => {
  const local = { layout: 'krant', textSize: 'groot', muted: ['nos'], bubble: true }
  const remote = { layout: 'tijdlijn', muted: ['nyt'], bubble: false }
  assert.deepEqual(mergePrefs(local, remote), { layout: 'krant', textSize: 'groot', muted: ['nyt'], bubble: false })
  assert.deepEqual(pickSynced({ layout: 'krant', pinned: ['ai'] }), { pinned: ['ai'] })
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

test('bewaard: alleen wat veranderde gaat naar de server', () => {
  const a = { savedAt: 1 }
  assert.deepEqual(savedDiff({ x: a, y: a }, { x: a, z: { savedAt: 2 } }), { upserts: ['z'], deletes: ['y'] })
})
