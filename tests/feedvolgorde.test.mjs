// Nachttest 14 november (A11): een feed met de oudste bovenaan levert toch de nieuwste stukken.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSource, newestFirst } from '../netlify/lib/rss.mjs'

const item = (n, d) => `<item><title>Stuk ${n}</title><link>https://example.org/${n}</link><description>Tekst ${n}</description>${d ? `<pubDate>${new Date(d).toUTCString()}</pubDate>` : ''}</item>`
const feed = (items) => `<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title>${items.join('')}</channel></rss>`

async function laad(xml, limit) {
  const origFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(xml, { status: 200, headers: { 'content-type': 'application/rss+xml' } })
  try {
    return await loadSource({ id: 'test', name: 'Test', cat: 'nieuws', lang: 'nl', urls: ['https://example.org/feed'] }, Promise.resolve({}), { limit })
  } finally {
    globalThis.fetch = origFetch
  }
}

test('feedvolgorde: oplopende feed, de grens neemt de nieuwste', async () => {
  const now = Date.now()
  const xml = feed([1, 2, 3, 4, 5].map((n) => item(n, now - (6 - n) * 3600e3)))
  const res = await laad(xml, 2)
  assert.deepEqual(res.items.map((i) => i.title), ['Stuk 5', 'Stuk 4'])
})

test('feedvolgorde: een gewone feed (nieuwste eerst) houdt zijn eigen volgorde, ook met een uitschieter', async () => {
  const now = Date.now()
  const xml = feed([item(1, now - 3600e3), item(2, now - 2 * 3600e3), item(3, now - 30 * 60e3), item(4, now - 4 * 3600e3), item(5, now - 5 * 3600e3)])
  const res = await laad(xml, Infinity)
  assert.deepEqual(res.items.map((i) => i.title), ['Stuk 1', 'Stuk 2', 'Stuk 3', 'Stuk 4', 'Stuk 5'])
})

test('feedvolgorde: stukken zonder tijd achteraan, stabiel', () => {
  const r = newestFirst([{ id: 'a', publishedAt: '2026-11-01T10:00:00Z' }, { id: 'x' }, { id: 'b', publishedAt: '2026-11-02T10:00:00Z' }, { id: 'c', publishedAt: '2026-11-03T10:00:00Z' }, { id: 'y' }])
  assert.deepEqual(r.map((i) => i.id), ['c', 'b', 'a', 'x', 'y'])
})
