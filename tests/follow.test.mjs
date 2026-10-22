import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toggleFollow, isFollowing, followedNow, FOLLOW_MAX, FOLLOW_DAYS } from '../src/lib/follow.js'

const NOW = Date.parse('2026-10-22T12:00:00Z')
const story = (id, formerIds = []) => ({ id, formerIds, itemIds: [] })

test('volgen en ontvolgen, ook als het verhaal intussen een andere id kreeg', () => {
  let list = toggleFollow([], story('s1'), 'Kop van toen', NOW)
  assert.deepEqual(list, [{ id: 's1', title: 'Kop van toen', at: new Date(NOW).toISOString() }])
  const renamed = story('s9', ['s1'])
  assert.equal(isFollowing(list, renamed), true)
  list = toggleFollow(list, renamed, 'x', NOW)
  assert.deepEqual(list, [])
})

test('hooguit vijf; de nieuwste eerst', () => {
  let list = []
  for (let i = 0; i < 7; i++) list = toggleFollow(list, story('s' + i), 'Kop ' + i, NOW)
  assert.equal(list.length, FOLLOW_MAX)
  assert.equal(list[0].id, 's6')
})

test('tonen: nieuws eerst, verdwenen en verlopen verhalen vallen weg', () => {
  const list = [
    { id: 'a', title: 'A', at: new Date(NOW).toISOString() },
    { id: 'b', title: 'B', at: new Date(NOW).toISOString() },
    { id: 'weg', title: 'Weg', at: new Date(NOW).toISOString() },
    { id: 'oud', title: 'Oud', at: new Date(NOW - (FOLLOW_DAYS + 1) * 864e5).toISOString() },
  ]
  const byId = new Map([['a', story('a')], ['b', story('b')], ['oud', story('oud')]])
  const shown = followedNow(list, byId, (s) => (s.id === 'b' ? 3 : 0), NOW)
  assert.deepEqual(shown.map((f) => [f.id, f.fresh]), [['b', 3], ['a', 0]])
})
