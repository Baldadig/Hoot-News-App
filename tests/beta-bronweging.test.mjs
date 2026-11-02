import { test } from 'node:test'
import assert from 'node:assert/strict'
import { weight } from '../netlify/lib/desks.mjs'
import { selectEdition } from '../netlify/lib/stories.mjs'

const NOW = Date.parse('2026-11-02T05:00:00Z')
const latestAt = new Date(NOW).toISOString()
test('gekozen uitgevers dragen evenredig bij, met een maximum van twee uitgevers dekking', () => {
  const score = n => weight({ sourceCount: 6, ownCount: n, latestAt }, NOW)
  assert.equal(score(1) - score(0), 2)
  assert.equal(score(2) - score(0), 4)
  assert.equal(score(4) - score(0), 8)
  assert.equal(score(100), score(4))
  assert.equal(score(-1), score(0))
  assert.equal(score(NaN), score(0))
  assert.ok(weight({ sourceCount: 6, latestAt }, NOW) > weight({ sourceCount: 2, ownCount: 4, latestAt }, NOW))
})

const items = [
  { id: 'a', kind: 'article', source: 'nos', title: 'Rotterdam bouwt extra huurwoningen voor studenten', summary: 'De gemeente bouwt woningen.', publishedAt: latestAt },
  { id: 'b', kind: 'article', source: 'nrc', title: 'Nieuwe plannen voor rechtbank in Groningen', summary: 'De rechtbank krijgt een nieuw gebouw.', publishedAt: latestAt },
]
const story = (id, count, ownCount) => ({ id: 's' + id, leadId: id, itemIds: [id], sourceCount: count, publisherCount: count, ownCount, latestAt })
const select = stories => selectEdition(stories, items, { mainIds: new Set(['nos', 'nrc']), now: NOW, size: 1 })
test('de algemene Editie kent geen bonus voor de oude vaste merkentelling', () => {
  const before = [story('a', 2, 100), story('b', 8, 0)]
  assert.equal(select(before)[0].id, 'sb')
  assert.deepEqual(select(before), select([story('a', 2, 0), story('b', 8, 100)]))
})
test('sectiefeeds wegen niet zwaarder dan onafhankelijke uitgevers', () => {
  const feeds = { ...story('a', 2, 100), sourceCount: 20 }
  assert.equal(select([feeds, story('b', 6, 0)])[0].id, 'sb')
})
