import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeSnapshot } from '../netlify/lib/kv.mjs'
import serve from '../netlify/functions/feed.mjs'

// Zonder Netlify Blobs valt de opslag terug op geheugen: zo is de functie los te testen.
test('/api/feed serveert de kant-en-klare feed, en "niets veranderd" als je die al hebt', async () => {
  await writeSnapshot({ body: '{"items":[]}', builtAt: new Date().toISOString(), etag: 'abc' })
  const first = await serve(new Request('http://x/api/feed'), {})
  assert.equal(first.status, 200)
  assert.equal(await first.text(), '{"items":[]}')
  assert.equal(first.headers.get('etag'), '"abc"')
  assert.match(first.headers.get('netlify-cdn-cache-control'), /durable.*stale-while-revalidate/)
  const again = await serve(new Request('http://x/api/feed', { headers: { 'If-None-Match': '"abc"' } }), {})
  assert.equal(again.status, 304)
})
