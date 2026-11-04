// Trump is geen eigen onderwerp meer maar Verenigde Staten (id vs-politiek). Opgeslagen voorkeuren met de
// oude sleutel gaan mee, op de website (opslag, profielsync) en in de gedeelde redacteur (ook voor iOS).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TOPICS, INTERESTS, topicById, currentTopics, currentTopicMap, RETIRED_TOPICS } from '../src/lib/topics.js'
import { normalizePrefs } from '../src/lib/prefs.js'
import { migrate, SCHEMA } from '../src/lib/migrate.js'
import { forgetTopic } from '../src/lib/affinity.js'
import { profileOf } from '../shared/editor.mjs'
import { keywordTopics } from '../netlify/lib/topics.mjs'

const storage = (init = {}) => {
  const m = new Map(Object.entries(init))
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}

test('keuzelijst: geen Trump meer, wel Verenigde Staten', () => {
  assert.equal(topicById('trump'), undefined)
  assert.equal(topicById('vs-politiek').label, 'Verenigde Staten')
  assert.ok(!TOPICS.some((t) => t.id === 'trump' || /trump/i.test(t.label)))
  assert.ok(!INTERESTS.some((i) => i.topics.includes('trump')))
  assert.deepEqual(INTERESTS.find((i) => i.id === 'politiek').topics, ['nederland', 'europa', 'vs-politiek', 'verkiezingen'])
  assert.deepEqual(RETIRED_TOPICS, { trump: 'vs-politiek' })
})

test('server: een Trump-verhaal is Verenigde Staten, zonder los Trump-label', () => {
  const ts = keywordTopics('Trump kondigt nieuwe importheffingen aan in het Witte Huis')
  assert.ok(ts.includes('vs-politiek'))
  assert.ok(!ts.includes('trump'))
})

test('lijsten en getallen per onderwerp: oud en nieuw samengevoegd', () => {
  assert.deepEqual(currentTopics(['nederland', 'trump', 'vs-politiek']), ['nederland', 'vs-politiek'])
  assert.deepEqual(currentTopics(['trump']), ['vs-politiek'])
  assert.deepEqual(currentTopics(undefined), undefined)
  assert.deepEqual(currentTopicMap({ trump: 4, 'vs-politiek': 8, ai: 4 }, 12), { 'vs-politiek': 12, ai: 4 })
  assert.deepEqual(currentTopicMap({ trump: -4 }, 12), { 'vs-politiek': -4 })
})

test('instellingen met de oude sleutel: niemand raakt iets kwijt (website en profielsync)', () => {
  const p = normalizePrefs({ interests: ['politiek'], topics: ['trump', 'nederland'], pinned: ['trump', 'ai'], taste: { topics: { trump: 4, muziek: -4 }, sources: { nos: 1 } } })
  assert.deepEqual(p.topics, ['vs-politiek', 'nederland'])
  assert.deepEqual(p.pinned, ['vs-politiek', 'ai'])
  assert.deepEqual(p.taste, { topics: { 'vs-politiek': 4, muziek: -4 }, sources: { nos: 1 } })
  // nogmaals normaliseren verandert niets
  assert.deepEqual(normalizePrefs(p), p)
})

test('opslag van een oudere versie: omgezet bij het opstarten, ook het leesprofiel', () => {
  const ls = storage({
    'hoot:prefs': JSON.stringify({ schema: 4, onboarded: true, interests: ['politiek'], topics: ['trump'], pinned: ['trump'], taste: { topics: { trump: -8 }, sources: {} } }),
    'hoot:affinity': JSON.stringify({ n: 20, topics: { trump: 3, 'vs-politiek': 2, ai: 1 }, sources: {} }),
  })
  assert.equal(migrate(ls), true)
  const prefs = JSON.parse(ls.getItem('hoot:prefs'))
  assert.equal(prefs.schema, SCHEMA)
  assert.deepEqual(prefs.topics, ['vs-politiek'])
  assert.deepEqual(prefs.pinned, ['vs-politiek'])
  assert.deepEqual(prefs.taste.topics, { 'vs-politiek': -8 })
  assert.deepEqual(JSON.parse(ls.getItem('hoot:affinity')).topics, { 'vs-politiek': 5, ai: 1 })
  assert.equal(migrate(ls), false, 'één keer')
})

test('redacteur (web en iOS): een profiel met de oude sleutel geeft hetzelfde als met de nieuwe', () => {
  const oud = profileOf({ interests: ['politiek'], topics: ['trump'], taste: { topics: { trump: 4 }, sources: {} }, affinity: { n: 20, topics: { trump: 4 }, sources: { nos: 4 } } })
  const nieuw = profileOf({ interests: ['politiek'], topics: ['vs-politiek'], taste: { topics: { 'vs-politiek': 4 }, sources: {} }, affinity: { n: 20, topics: { 'vs-politiek': 4 }, sources: { nos: 4 } } })
  assert.deepEqual(oud.topicP, nieuw.topicP)
  assert.deepEqual(oud.origin, nieuw.origin)
  assert.equal(oud.topicP.trump, undefined)
  assert.ok(oud.topicP['vs-politiek'] >= 1)
})

test('"Vergeet dit" haalt ook de oude sleutel uit het leesprofiel', () => {
  const a = { n: 12, topics: { trump: 3, 'vs-politiek': 2, ai: 1 }, sources: {} }
  assert.deepEqual(forgetTopic(a, 'vs-politiek').topics, { ai: 1 })
})
