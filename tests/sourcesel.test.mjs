import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mutedSet, toggleSource, inStream } from '../src/lib/sourcesel.js'

const sources = [{ id: 'nos' }, { id: '3voor12' }, { id: 'quietus', optional: true }]

test('optionele bronnen staan uit tot je ze aanzet; gewone tot je ze uitzet', () => {
  const p = { muted: ['nos'], enabled: [] }
  assert.deepEqual([...mutedSet(p, sources)].sort(), ['nos', 'quietus'])
  const on = toggleSource(p, sources[2], true)
  assert.deepEqual(on.enabled, ['quietus'])
  assert.equal(mutedSet(on, sources).has('quietus'), false)
  assert.equal(mutedSet(toggleSource(on, sources[2], false), sources).has('quietus'), true)
  assert.deepEqual(toggleSource(p, sources[0], true).muted, [])
})

test('Bluesky-posts staan niet in de Stroom, tenzij je dat per account kiest', () => {
  const post = { kind: 'post', source: 'bsky:atrupar.com' }
  const art = { kind: 'article', source: 'nos' }
  assert.equal(inStream(post, { bskyInStream: [] }), false)
  assert.equal(inStream(post, { bskyInStream: ['bsky:atrupar.com'] }), true)
  assert.equal(inStream(art, {}), true)
})
