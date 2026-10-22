import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeDoc, KEYS } from '../netlify/lib/kv.mjs'
import serve from '../netlify/functions/feed.mjs'

// Zonder Netlify Blobs valt de opslag terug op geheugen: zo is de functie los te testen.
const now = () => new Date().toISOString()

test('/api/feed serveert de kern, en "niets veranderd" als je die al hebt', async () => {
  await writeDoc(KEYS.core, { body: '{"items":[]}', builtAt: now(), etag: 'abc' })
  const first = await serve(new Request('http://x/api/feed?deel=kern'), {})
  assert.equal(first.status, 200)
  assert.equal(await first.text(), '{"items":[]}')
  assert.equal(first.headers.get('etag'), '"abc"')
  assert.match(first.headers.get('netlify-cdn-cache-control'), /durable.*stale-while-revalidate/)
  const again = await serve(new Request('http://x/api/feed?deel=kern', { headers: { 'If-None-Match': '"abc"' } }), {})
  assert.equal(again.status, 304)
})

test('een deel met de juiste versie mag een jaar bewaard blijven; een oude versie niet', async () => {
  await writeDoc(KEYS.core, { body: '{}', builtAt: now(), etag: 'k' })
  await writeDoc(KEYS.part('nos'), { body: '{"items":[1]}', builtAt: now(), etag: 'p1' })
  const fresh = await serve(new Request('http://x/api/feed?bron=nos&v=p1'), {})
  assert.match(fresh.headers.get('cache-control'), /immutable/)
  const old = await serve(new Request('http://x/api/feed?bron=nos&v=p0'), {})
  assert.match(old.headers.get('cache-control'), /must-revalidate/)
  assert.equal(await old.text(), '{"items":[1]}')
  assert.equal((await serve(new Request('http://x/api/feed?bron=bestaat-niet'), {})).status, 404)
})

test('zonder parameters: alles in één, voor apps die nog niet zijn bijgewerkt', async () => {
  await writeDoc(KEYS.legacy, { body: '{"items":[2]}', builtAt: now(), etag: 'l' })
  assert.equal(await (await serve(new Request('http://x/api/feed'), {})).text(), '{"items":[2]}')
})

test('alleen GET: POST geeft 405', async () => {
  const r = await serve(new Request('http://x/api/feed', { method: 'POST', body: 'x' }), {})
  assert.equal(r.status, 405)
  assert.equal(r.headers.get('allow'), 'GET, HEAD')
})

test('een onbekend deel is een fout, geen volledige feed', async () => {
  await writeDoc(KEYS.core, { body: '{}', builtAt: now(), etag: 'k' })
  const r = await serve(new Request('http://x/api/feed?deel=onzin'), {})
  assert.equal(r.status, 400)
  assert.match((await r.json()).error, /kern/)
  assert.equal((await serve(new Request('http://x/api/feed?bron=../../etc'), {})).status, 404)
})

test('HEAD geeft de headers zonder inhoud', async () => {
  await writeDoc(KEYS.core, { body: '{"items":[]}', builtAt: now(), etag: 'h' })
  const r = await serve(new Request('http://x/api/feed?deel=kern', { method: 'HEAD' }), {})
  assert.equal(r.status, 200)
  assert.equal(await r.text(), '')
})

test('start zonder vergelijkingsdata; verhalen apart, met versie een jaar te bewaren', async () => {
  await writeDoc(KEYS.core, { body: '{}', builtAt: now(), etag: 'k' })
  await writeDoc(KEYS.start, { body: '{"meta":{"related":"r1"}}', builtAt: now(), etag: 's' })
  await writeDoc(KEYS.related, { body: '{"related":[1,2]}', builtAt: now(), etag: 'r1' })
  const start = await serve(new Request('http://x/api/feed?deel=start'), {})
  assert.equal(await start.text(), '{"meta":{"related":"r1"}}')
  const rel = await serve(new Request('http://x/api/feed?deel=verhalen&v=r1'), {})
  assert.match(rel.headers.get('cache-control'), /immutable/)
  assert.deepEqual((await rel.json()).related, [1, 2])
  const old = await serve(new Request('http://x/api/feed?deel=verhalen&v=r0'), {})
  assert.match(old.headers.get('cache-control'), /must-revalidate/)
})
