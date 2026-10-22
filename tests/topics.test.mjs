import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TOPICS, orderedTopics } from '../src/lib/topics.js'

test('de rij bevat alle onderwerpen, de gekozen vooraan, in de gekozen volgorde', () => {
  const row = orderedTopics(['ai', 'nederland'])
  assert.equal(row.length, TOPICS.length)
  assert.deepEqual(row.slice(0, 2).map((t) => t.id), ['ai', 'nederland'])
  assert.deepEqual(new Set(row.map((t) => t.id)), new Set(TOPICS.map((t) => t.id)))
})

test('onbekende of lege voorkeur breekt de rij niet', () => {
  assert.equal(orderedTopics(['bestaat-niet']).length, TOPICS.length)
  assert.deepEqual(orderedTopics([]), TOPICS)
})

import { INTERESTS, resolveTopics, suggestSources } from '../src/lib/topics.js'

test('elk smal onderwerp hoort bij precies één interesse', () => {
  const all = INTERESTS.flatMap((i) => i.topics)
  assert.equal(new Set(all).size, all.length)
  assert.deepEqual(new Set(all), new Set(TOPICS.map((t) => t.id)))
})

test('niets aangetikt binnen een interesse = alles daarbinnen', () => {
  assert.deepEqual(resolveTopics(['tech', 'wereld'], ['oekraine']), ['oekraine', 'ai', 'tech'])
  assert.deepEqual(resolveTopics(['tech'], []), ['ai', 'tech'])
  assert.deepEqual(resolveTopics([], ['ai']), [])
})

test('bronnen vooraf: algemeen altijd, specifiek bij een passende interesse, muziek alleen bij muziek', () => {
  const src = [{ id: 'nos', kind: 'nieuws' }, { id: 'verge', kind: 'nieuws', for: ['tech'] }, { id: '3voor12', kind: 'muziek', for: ['cultuur'] }, { id: 'quietus', kind: 'muziek' }]
  assert.deepEqual(suggestSources(src, ['politiek'], ['nederland']), ['nos'])
  assert.deepEqual(suggestSources(src, ['tech', 'cultuur'], ['ai', 'muziek']), ['nos', 'verge', '3voor12'])
  assert.deepEqual(suggestSources(src, ['cultuur'], ['film']), ['nos'])
})

test('volg je onderwerpen, dan staan alleen die in de rij', () => {
  assert.deepEqual(orderedTopics(['ai'], ['tech', 'ai']).map((t) => t.id), ['ai', 'tech'])
})
