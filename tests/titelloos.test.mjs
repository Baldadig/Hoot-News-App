import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSource } from '../netlify/lib/rss.mjs'

// Een feed-item zonder kop (NRC-cartoon) hoort niet in de Stroom: de rij zou alleen beeld en
// bronregel tonen en de stijlgids struikelt over de ontbrekende titel.
const FEED = `<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title>
<item><title>Een gewone kop</title><link>https://example.org/a</link><description>Tekst</description></item>
<item><link>https://example.org/cartoon</link><description>Alleen een plaatje</description></item>
<item><title>   </title><link>https://example.org/leeg</link></item>
<item><title>Zonder link</title><description>Geen url</description></item>
</channel></rss>`

test('loadSource laat items zonder kop of zonder link weg', async () => {
  const origFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(FEED, { status: 200, headers: { 'content-type': 'application/rss+xml' } })
  try {
    const res = await loadSource({ id: 'test', name: 'Test', cat: 'nieuws', urls: ['https://example.org/feed'] }, Promise.resolve({}))
    assert.equal(res.ok, true)
    assert.deepEqual(res.items.map((i) => i.title), ['Een gewone kop'])
    assert.ok(res.items.every((i) => i.url && i.title))
  } finally {
    globalThis.fetch = origFetch
  }
})
