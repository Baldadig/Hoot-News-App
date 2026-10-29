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

// ---- Meer of minder hiervan ----
import { vote, tasteScore, tasteSummary, TASTE_MAX, TASTE_CAP, emptyTaste } from '../src/lib/affinity.js'

test('meer of minder: vooral op het onderwerp, een beetje op de bron, begrensd', () => {
  const story = [{ source: 'nos', topics: ['voetbal', 'ajax'] }, { source: 'vi', topics: ['voetbal'] }]
  let t = vote(emptyTaste(), story, -1)
  assert.equal(t.topics.voetbal, -4)
  assert.equal(t.topics.ajax, -4)
  assert.equal(t.sources.nos, -1)
  assert.equal(t.sources.vi, undefined, 'alleen de bron van het hoofdbericht')
  for (let i = 0; i < 5; i++) t = vote(t, story, -1)
  assert.equal(t.topics.voetbal, -TASTE_CAP)
  assert.equal(tasteScore(story, t), -TASTE_MAX, 'hooguit TASTE_MAX eraf: groot nieuws blijft staan')
  t = vote(t, story, 1)
  assert.ok(t.topics.voetbal > -TASTE_CAP)
  assert.equal(tasteScore([{ source: 'nrc', topics: ['klimaat'] }], t), 0, 'ander onderwerp: niets')
  assert.deepEqual(tasteSummary(vote(emptyTaste(), [{ source: 'x', topics: ['ai'] }], 1)), { more: ['ai'], less: [] })
})

test('meer of minder: Bluesky-posts tellen niet, lege smaak is neutraal', () => {
  assert.deepEqual(vote(null, [{ kind: 'post', source: 'bsky', topics: ['ai'] }], 1), { topics: {}, sources: {} })
  assert.equal(tasteScore([{ source: 'nos', topics: ['ai'] }], null), 0)
})
