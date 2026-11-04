import { test } from 'node:test'
import assert from 'node:assert/strict'
import { orphanBlueskyIds, adoptLegacySocial, webStream } from '../src/lib/social-stream.js'
import { resolveLegacy } from '../src/lib/bluesky.js'
import { canonHandle, fetchAuthorPosts } from '../shared/bluesky.mjs'

test('oud server-account: het id staat in de Stroom-keuze maar nergens als account', () => {
  const prefs = { bluesky: true, bskyInStream: ['bsky:atrupar.com', 'bsky:nrc.nl'], enabled: ['bsky:meduza.io'], muted: [], social: [{ handle: 'nrc.nl', name: 'NRC' }] }
  assert.deepEqual(orphanBlueskyIds(prefs, []).sort(), ['bsky:atrupar.com', 'bsky:meduza.io'])
  assert.deepEqual(orphanBlueskyIds(prefs, ['bsky:atrupar.com', 'bsky:meduza.io']), []) // de server levert ze (nog) zelf
  assert.deepEqual(orphanBlueskyIds({ ...prefs, muted: ['bsky:atrupar.com'] }, []), ['bsky:meduza.io']) // uitgezet = niet gevolgd
  assert.deepEqual(orphanBlueskyIds({ ...prefs, social: [{ handle: 'NRC.nl', name: 'N' }, { handle: 'ATrupar.com', name: 'A' }] }, []), ['bsky:meduza.io']) // hoofdletters
})

test('oude id\'s worden eigen accounts; een verwijderd account valt uit je keuze', async () => {
  const resolve = async (h) => {
    if (h === 'aaronrupar.bsky.social') return { handle: 'atrupar.com', name: 'Aaron Rupar' }
    if (h === 'weg.example') throw new Error('Account niet gevonden')
    throw new Error('Bluesky-fout (503)')
  }
  const r = await resolveLegacy(['bsky:aaronrupar.bsky.social', 'bsky:weg.example', 'bsky:traag.example'], resolve)
  assert.deepEqual(Object.keys(r.found), ['bsky:aaronrupar.bsky.social'])
  assert.deepEqual(r.gone, ['bsky:weg.example']) // een tijdelijke fout (503) blijft staan voor later
  const prefs = { bluesky: true, social: [], enabled: ['bsky:aaronrupar.bsky.social'], bskyInStream: ['bsky:aaronrupar.bsky.social', 'bsky:weg.example', 'bsky:traag.example'], muted: [] }
  const next = adoptLegacySocial(prefs, r)
  assert.deepEqual(next.social.map((p) => p.handle), ['atrupar.com'])
  assert.deepEqual(next.bskyInStream.sort(), ['bsky:atrupar.com', 'bsky:traag.example'])
  assert.deepEqual(next.enabled, [])
  const post = { id: 'p', source: 'bsky:atrupar.com', kind: 'post', url: 'https://x.test/1', publishedAt: new Date().toISOString() }
  assert.equal(webStream([post], { prefs: next, sources: [{ id: 'bsky:atrupar.com' }] }).length, 1)
})

test('handles zijn hoofdletterloos en de oude naam van Aaron Rupar wijst naar de huidige', () => {
  assert.equal(canonHandle('@ATrupar.com'), 'atrupar.com')
  assert.equal(canonHandle('AaronRupar.bsky.social'), 'atrupar.com')
})

// Eén bladzijde eindigt op een repost van een oud bericht: de eigen posts op de volgende bladzijde tellen nog.
test('bladeren stopt niet bij een repost van een oud bericht', async () => {
  const now = Date.parse('2026-11-04T22:00:00Z')
  const own = (n, min) => ({ post: { uri: `at://d/app.bsky.feed.post/${n}`, indexedAt: new Date(now - min * 60000).toISOString(), author: { handle: 'rupar.example' }, record: { text: 't' + n, createdAt: new Date(now - min * 60000).toISOString() } } })
  const repostOfOld = { post: { uri: 'at://d/app.bsky.feed.post/old', indexedAt: '2026-10-01T00:00:00Z', author: { handle: 'ander.example' }, record: { text: 'oud', createdAt: '2026-10-01T00:00:00Z' } }, reason: { $type: 'app.bsky.feed.defs#reasonRepost', indexedAt: new Date(now - 90 * 60000).toISOString() } }
  const pages = [
    { feed: [own(1, 5), own(2, 30), repostOfOld], cursor: 'c1' },
    { feed: [own(3, 120), own(4, 600)], cursor: undefined },
  ]
  let n = 0
  const real = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => pages[n++] })
  try {
    const posts = await fetchAuthorPosts('rupar.example', { now })
    assert.deepEqual(posts.map((p) => p.summary).sort(), ['t1', 't2', 't3', 't4'])
  } finally {
    globalThis.fetch = real
  }
})
