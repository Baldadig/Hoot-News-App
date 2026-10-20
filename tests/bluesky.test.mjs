import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapPost } from '../shared/bluesky.mjs'
import { usableImage } from '../netlify/lib/rss.mjs'

const post = (embed) => ({
  uri: 'at://did:plc:x/app.bsky.feed.post/3abc',
  author: { handle: 'atrupar.com', displayName: 'Aaron Rupar', avatar: 'https://cdn.bsky.app/a.jpg' },
  record: { text: 'Kijk  dit\nmaar', createdAt: '2026-10-20T10:00:00Z' },
  embed,
})

test('post: link naar de post zelf, tekst op één regel, vaste id', () => {
  const p = mapPost(post())
  assert.equal(p.url, 'https://bsky.app/profile/atrupar.com/post/3abc')
  assert.equal(p.summary, 'Kijk dit maar')
  assert.equal(p.source, 'bsky:atrupar.com')
  assert.equal(p.id, mapPost(post()).id)
})

test('post met video: afspeellijst en stilstaand beeld', () => {
  const p = mapPost(post({ $type: 'app.bsky.embed.video#view', playlist: 'https://video.bsky.app/x/playlist.m3u8', thumbnail: 'https://video.bsky.app/x/thumbnail.jpg' }))
  assert.equal(p.video, 'https://video.bsky.app/x/playlist.m3u8')
  assert.equal(p.videoPoster, 'https://video.bsky.app/x/thumbnail.jpg')
})

test('post met gedeelde link: gaat naar het artikel, met titel en domein', () => {
  const p = mapPost(post({ $type: 'app.bsky.embed.external#view', external: { uri: 'https://www.nytimes.com/a', title: ' Kop ', thumb: 'https://cdn.bsky.app/t.jpg' } }))
  assert.equal(p.url, 'https://www.nytimes.com/a')
  assert.equal(p.domain, 'nytimes.com')
  assert.equal(p.linkTitle, 'Kop')
})

test('quote met foto: de foto telt, met zijn echte verhouding', () => {
  const p = mapPost(post({ $type: 'app.bsky.embed.recordWithMedia#view', media: { $type: 'app.bsky.embed.images#view', images: [{ thumb: 'https://cdn.bsky.app/f.jpg', aspectRatio: { width: 1200, height: 600 } }] } }))
  assert.equal(p.image, 'https://cdn.bsky.app/f.jpg')
  assert.equal(p.imageRatio, 2)
})

test('feeds: geen "undefined" en geen telpixels als beeld', () => {
  assert.equal(usableImage('undefined'), null)
  assert.equal(usableImage('https://media.npr.org/include/images/tracking/npr-rss-pixel.png?story=1'), null)
  assert.equal(usableImage('https://images.nrc.nl/a.jpg'), 'https://images.nrc.nl/a.jpg')
})
