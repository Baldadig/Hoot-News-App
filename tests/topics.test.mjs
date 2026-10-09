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
