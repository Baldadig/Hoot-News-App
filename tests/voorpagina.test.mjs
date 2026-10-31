import { test } from 'node:test'
import assert from 'node:assert/strict'
import voorpagina, { extract, isDutch, config } from '../netlify/functions/voorpagina.mjs'
import { writeDoc, KEYS } from '../netlify/lib/kv.mjs'

const it = (id, source, sourceName, title, extra = {}) => ({ id, source, sourceName, title, url: 'https://x/' + id, image: 'https://x/i.jpg', publishedAt: '2026-10-31T08:00:00Z', ...extra })
const feed = () => ({
  sources: [{ id: 'nos', lang: 'nl' }, { id: 'nyt', lang: 'en' }, { id: 'nrc', lang: 'nl' }],
  stories: [
    { id: 's1', leadId: 'a', sourceCount: 12 },
    { id: 's2', leadId: 'b', sourceCount: 5 },
    { id: 's3', leadId: 'c', sourceCount: 3 },
    { id: 's4', leadId: 'd', sourceCount: 2 },
  ],
  edition: {
    slot: 'ochtend',
    date: '2026-10-31',
    builtAt: '2026-10-31T05:00:00Z',
    entries: [
      { kind: 'story', id: 's2', leadId: 'b', desk: 'buitenland', sourceCount: 5 }, // Engels: overslaan
      { kind: 'story', id: 's1', leadId: 'a', desk: 'binnenland', sourceCount: 12 },
      { kind: 'item', id: 'e', desk: 'wetenschap' },
      { kind: 'item', id: 'f', desk: 'vs' }, // offLang: overslaan
      { kind: 'story', id: 's3', leadId: 'c', desk: 'middenoosten', sourceCount: 3 },
      { kind: 'story', id: 's4', leadId: 'd', desk: 'oekraine', sourceCount: 2 },
    ],
    items: [
      it('a', 'nos', 'NOS', 'Kabinet bereikt akkoord'),
      it('b', 'nyt', 'The New York Times', 'English headline'),
      it('c', 'nrc', 'NRC', 'Derde plek'),
      it('d', 'nos', 'NOS', 'Vierde plek'),
      it('e', 'nos', 'NOS', 'Los bericht', { lang: 'nl' }),
      it('f', 'nos', 'NOS', 'Foreign', { offLang: true }),
    ],
  },
})
const get = (headers = {}, method = 'GET') => voorpagina(new Request('http://x/api/voorpagina', { method, headers }))

test('vorm: slot, datum en drie plekken met alleen de kleine velden', () => {
  const r = extract(feed())
  assert.equal(r.slot, 'ochtend')
  assert.equal(r.date, '2026-10-31')
  assert.equal(r.entries.length, 3)
  assert.deepEqual(r.entries[0], { desk: 'binnenland', deskLabel: 'Binnenland', title: 'Kabinet bereikt akkoord', source: 'NOS', sourceCount: 12 })
  assert.deepEqual(Object.keys(r.entries[1]).sort(), ['desk', 'deskLabel', 'source', 'sourceCount', 'title'])
  assert.equal(r.entries[1].sourceCount, 1) // los bericht
  assert.ok(!JSON.stringify(r).includes('http')) // geen URL's of beeld
})

test('taalfilter: anderstalige plekken worden overgeslagen, de volgende komt erbij', () => {
  const r = extract(feed())
  assert.deepEqual(r.entries.map((e) => e.title), ['Kabinet bereikt akkoord', 'Los bericht', 'Derde plek'])
  assert.ok(isDutch({ lang: 'nl' }, 'en'))
  assert.ok(!isDutch({ offLang: true }, 'nl'))
  assert.ok(isDutch({}, 'nl'))
  assert.ok(!isDutch({}, 'en'))
  assert.ok(!isDutch({}, undefined))
})

test('foutpad: geen of kapotte editie geeft null', () => {
  assert.equal(extract(null), null)
  assert.equal(extract({}), null)
  const f = feed()
  f.edition.entries = f.edition.entries.slice(0, 1) // alleen een Engelse plek
  assert.equal(extract(f), null)
})

test('endpoint: 503 met { edition: null } als er niets is opgeslagen', async () => {
  const r = await get({ origin: 'https://gethoot.app' })
  assert.equal(r.status, 503)
  assert.deepEqual(await r.json(), { edition: null })
  assert.equal(r.headers.get('cache-control'), 'no-store')
})

test('endpoint: 200 met headers en CORS alleen voor gethoot.app', async () => {
  await writeDoc(KEYS.start, { body: JSON.stringify(feed()), etag: 'x', builtAt: '2026-10-31T05:00:00Z' })
  const r = await get({ origin: 'https://gethoot.app' })
  assert.equal(r.status, 200)
  assert.equal(r.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.equal(r.headers.get('cache-control'), 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600')
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://gethoot.app')
  assert.match(r.headers.get('vary'), /Origin/)
  const body = await r.json()
  assert.deepEqual(Object.keys(body), ['edition'])
  assert.equal(body.edition.entries.length, 3)
  assert.equal((await get({ origin: 'https://www.gethoot.app' })).headers.get('access-control-allow-origin'), 'https://www.gethoot.app')
  assert.equal((await get({ origin: 'https://evil.example' })).headers.get('access-control-allow-origin'), null)
  assert.equal((await get({}, 'POST')).status, 405)
  assert.equal(config.path, '/api/voorpagina')
})

test('endpoint: kapotte opgeslagen feed geeft 503, geen crash', async () => {
  await writeDoc(KEYS.start, { body: '{kapot', etag: 'y' })
  const r = await get()
  assert.equal(r.status, 503)
  assert.deepEqual(await r.json(), { edition: null })
})
