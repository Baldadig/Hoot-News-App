import { test } from 'node:test'
import assert from 'node:assert/strict'
import { migrate, SCHEMA } from '../src/lib/migrate.js'

const storage = (init = {}) => {
  const m = new Map(Object.entries(init))
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}

test('oude opslag: Bewaard omgezet, caches weg, welkom overgeslagen, schema gezet', () => {
  const ls = storage({ 'hoot:saved-items': JSON.stringify({ a: { id: 'a', title: 'A', savedAt: 5 } }), 'hoot:feed-cache': '{}', 'hoot:feed-v2': '{}' })
  assert.equal(migrate(ls), true)
  assert.deepEqual(JSON.parse(ls.getItem('hoot:saved-v2')), { a: { kind: 'item', savedAt: 5, item: { id: 'a', title: 'A', savedAt: 5 } } })
  for (const k of ['hoot:saved-items', 'hoot:feed-cache', 'hoot:feed-v2']) assert.equal(ls.getItem(k), null)
  assert.deepEqual(JSON.parse(ls.getItem('hoot:prefs')), { onboarded: true, schema: SCHEMA })
})

test('bestaande instellingen blijven; een tweede keer gebeurt er niets', () => {
  const ls = storage({ 'hoot:prefs': JSON.stringify({ muted: ['nos'], onboarded: false }), 'hoot:saved-v2': '{"x":1}', 'hoot:saved-items': '{"y":{}}' })
  migrate(ls)
  const p = JSON.parse(ls.getItem('hoot:prefs'))
  assert.deepEqual(p.muted, ['nos'])
  assert.equal(p.onboarded, false) // niet overschrijven
  assert.equal(ls.getItem('hoot:saved-v2'), '{"x":1}') // nieuwe vorm wint
  assert.equal(migrate(ls), false)
})

test('nieuw toestel: het welkom wordt getoond', () => {
  const ls = storage()
  migrate(ls)
  assert.deepEqual(JSON.parse(ls.getItem('hoot:prefs')), { onboarded: false, schema: SCHEMA })
})
