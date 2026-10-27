import { test } from 'node:test'
import assert from 'node:assert/strict'
import { learn, affinityScore, emptyAffinity, MIN_EVENTS, SAVE, AFFINITY_MAX } from '../src/lib/affinity.js'

const ai = { id: 'a', kind: 'article', source: 'verge', topics: ['ai', 'tech'] }
const sport = { id: 's', kind: 'article', source: 'nos-sport', topics: ['voetbal'] }

test('lezen en bewaren tellen per onderwerp en bron, bewaren zwaarder', () => {
  let a = learn(emptyAffinity(), ai)
  a = learn(a, sport, SAVE)
  assert.equal(a.n, 2)
  assert.ok(a.topics.voetbal > a.topics.ai)
  assert.ok(a.sources.verge > 0)
})

test('Bluesky-posts tellen niet mee', () => {
  assert.equal(learn(emptyAffinity(), { kind: 'post', source: 'bsky:x', topics: ['ai'] }).n, 0)
})

test('pas na een paar keer lezen telt de smaak', () => {
  let a = emptyAffinity()
  for (let i = 0; i < MIN_EVENTS - 1; i++) a = learn(a, ai)
  assert.equal(affinityScore([ai], a), 0)
  a = learn(a, ai)
  assert.equal(affinityScore([ai], a), AFFINITY_MAX)
  assert.equal(affinityScore([sport], a), 0)
})

test('oudere smaak vervaagt', () => {
  let a = learn(emptyAffinity(), sport)
  for (let i = 0; i < 60; i++) a = learn(a, ai)
  assert.ok((a.topics.voetbal || 0) < 0.5)
})
