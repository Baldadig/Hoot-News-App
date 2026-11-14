// Luister verder, stap 3: de lijst om na te lopen. /api/luister-proef leest wat de ronde per dagdeel bewaarde
// (netlify/lib/luister.mjs, luisterRonde) en toont het als JSON of Markdown, zonder persoonsgegevens of beschrijvingen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { luisterRonde, PROEF_KEY } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { zoalsWoordregels } from './helpers/nep-oordeel.mjs'
import handler, { proef, asText, config } from '../netlify/functions/luister-proef.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))

test('de proef per dagdeel: koppelingen met soort en reden, afvallers met reden; als JSON en als Markdown', async () => {
  const kv = new Map()
  const stories = FIX.stories.map((st) => ({ ...st }))
  const client = zoalsWoordregels({ stories: FIX.stories, byId, episodes: FIX.episodes, now: Date.parse(FIX.now), mainIds: MAIN_IDS })
  await luisterRonde({ stories, byId, now: Date.parse(FIX.now), episodesP: Promise.resolve({ episodes: FIX.episodes, status: {} }), slot: '2026-11-14-middag', mainIds: MAIN_IDS, update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)), get: (k) => kv.get(k), client })
  const get = (k) => kv.get(k)
  const doc = await proef(null, get)
  const d = doc.dagdelen[0]
  assert.equal(d.dagdeel, '2026-11-14-middag')
  assert.ok(d.koppelingen.length >= 3 && d.koppelingen.every((k) => ['hetzelfde', 'verdiepend'].includes(k.soort) && k.reden && k.kop && k.aflevering))
  assert.ok(d.afgevallen.length > 0 && d.afgevallen.every((a) => a.reden))
  const md = asText(doc)
  assert.match(md, /## 2026-11-14-middag/)
  assert.match(md, /Afgevallen:/)
  assert.deepEqual((await proef('2026-11-14-ochtend', get)).dagdelen, [])
  assert.deepEqual((await proef(null, async () => { throw new Error('kv weg') })).dagdelen, [])
  assert.ok(kv.has(PROEF_KEY))
})

test('het endpoint: alleen GET, op /api/luister-proef, nooit in de cache', async () => {
  assert.equal(config.path, '/api/luister-proef')
  const post = await handler(new Request('https://gethoot.app/api/luister-proef', { method: 'POST' }))
  assert.equal(post.status, 405)
})
