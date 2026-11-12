// Editie sneller (Hoot-design/editie-sneller/METING.md, BOUW-VERSLAG.md): de server leest de kern en de delen uit
// het geheugen van zijn instantie (B1), houdt het antwoord niet op voor de cache (B2), doet wat kan tegelijk (B3),
// zegt per stap hoe lang hij deed (B7) en kan na een nieuw dagdeel warm gemaakt worden. De inhoud van de Editie
// verandert niet: gedeelde, bevroren invoer geeft byte voor byte dezelfde Editie als vers geparste invoer.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { handle, composeFor, profileOf, stopwatch } from '../netlify/functions/edition.mjs'
import { feedMemory } from '../netlify/lib/feed-geheugen.mjs'
import { shouldWarm, warmEdition } from '../netlify/functions/feed-refresh.mjs'
import { SNAPSHOT_FILE, PERSONAS, setupFor } from './helpers/snapshot.mjs'
import { fakePostgrest } from './helpers/pgrest.mjs'

const raw = gunzipSync(readFileSync(SNAPSHOT_FILE)).toString('utf8')
const fresh = () => JSON.parse(raw)
const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((key) => [key, v[key]])) : v))
const freeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const v of Object.values(o)) freeze(v)
  }
  return o
}
const bodyOf = (persona, snap) => {
  const s = setupFor(persona, snap.sources)
  return { v: 2, rubrieken: 2, followed: [...s.followed], interests: s.interests, topics: s.topics, favorites: s.favorites, taste: s.taste, readIds: [] }
}

test('B1: gedeelde, bevroren kern en berichten geven dezelfde Editie als vers geparst, in elke volgorde', () => {
  const shared = fresh()
  const start = freeze({ edition: shared.edition, stories: shared.stories, sources: shared.sources, meta: {} })
  const items = freeze(shared.items)
  const people = PERSONAS.slice(0, 6)
  // Twee keer rond, de tweede keer omgekeerd: de geheugens per bericht (desksOf, withTrustedTopics) zijn dan warm.
  for (const order of [people, [...people].reverse()]) {
    for (const persona of order) {
      const own = fresh()
      const ownStart = { edition: own.edition, stories: own.stories, sources: own.sources, meta: {} }
      const p = profileOf(ownStart, bodyOf(persona, own))
      const on = new Set(p.followed)
      const want = composeFor(ownStart, own.items.filter((i) => on.has(i.source)), p, { owner: 'anon', earlier: [] })
      const got = composeFor(start, items.filter((i) => on.has(i.source)), profileOf(start, bodyOf(persona, shared)), { owner: 'anon', earlier: [] })
      assert.equal(canon(got), canon(want), persona.id)
    }
  }
})

// Een nep-Blobs voor de kern en de delen, met tellers.
function fakeBlobs(snap) {
  const tags = Object.fromEntries(snap.sources.map((s) => [s.id, 'v1-' + s.id]))
  const blobs = {
    startTag: 'k1',
    startBody: JSON.stringify({ edition: snap.edition, stories: snap.stories, sources: snap.sources, meta: { parts: tags } }),
    tags,
    reads: { start: 0, startBytes: 0, part: 0 },
    stale: new Set(), // delen waarvan Blobs nog de vorige versie geeft
    fail: new Set(),
    readStart: async (tag) => {
      blobs.reads.start++
      if (tag === blobs.startTag) return { same: true }
      blobs.reads.startBytes++
      return { body: blobs.startBody, tag: blobs.startTag }
    },
    readPart: async (id) => {
      blobs.reads.part++
      await new Promise((r) => setTimeout(r, 1))
      if (blobs.fail.has(id)) throw new Error('storing')
      const etag = blobs.stale.has(id) ? 'v0-' + id : blobs.tags[id]
      return { body: JSON.stringify({ items: snap.items.filter((i) => i.source === id) }), etag }
    },
  }
  return blobs
}

test('B1: de kern voorwaardelijk (304 = niet opnieuw parsen), een deel alleen als zijn versie nieuw is', async () => {
  const snap = fresh()
  const blobs = fakeBlobs(snap)
  const mem = feedMemory(blobs)
  const a = await mem.loadStart()
  const b = await mem.loadStart()
  assert.equal(a, b, 'zelfde object: niet opnieuw geparst')
  assert.deepEqual([blobs.reads.start, blobs.reads.startBytes], [2, 1], 'wel elke keer gevraagd (een nieuw dagdeel is er meteen)')
  const ids = snap.sources.slice(0, 5).map((s) => s.id)
  // Twee gelijktijdige vragen lezen elk deel één keer.
  const [x, y] = await Promise.all([mem.loadItems(a, ids), mem.loadItems(a, ids)])
  assert.equal(blobs.reads.part, 5)
  assert.equal(x.length, y.length)
  assert.equal(x[0], y[0], 'dezelfde berichten, gedeeld')
  await mem.loadItems(a, ids)
  assert.equal(blobs.reads.part, 5, 'warm: geen Blobs')
  // Een nieuwe feedronde: één deel nieuw. Alleen dat deel opnieuw; de kern komt met een nieuwe tag.
  blobs.tags[ids[0]] = 'v2-' + ids[0]
  blobs.startTag = 'k2'
  blobs.startBody = JSON.stringify({ ...JSON.parse(blobs.startBody), meta: { parts: { ...blobs.tags } } })
  const c = await mem.loadStart()
  assert.notEqual(c, a)
  await mem.loadItems(c, ids)
  assert.equal(blobs.reads.part, 6)
})

test('B1: een oudere versie uit Blobs (eventual consistency) en een fout gelden niet als de nieuwe', async () => {
  const snap = fresh()
  const blobs = fakeBlobs(snap)
  const mem = feedMemory(blobs)
  const s = await mem.loadStart()
  const [one, two] = snap.sources.map((x) => x.id)
  blobs.stale.add(one)
  blobs.fail.add(two)
  const first = await mem.loadItems(s, [one, two])
  assert.equal(first.length, snap.items.filter((i) => i.source === one).length, 'de oude versie wordt gebruikt, zoals vroeger; de fout is leeg')
  await mem.loadItems(s, [one, two])
  assert.equal(blobs.reads.part, 4, 'beide opnieuw gevraagd')
  blobs.stale.clear()
  blobs.fail.clear()
  await mem.loadItems(s, [one, two])
  await mem.loadItems(s, [one, two])
  assert.equal(blobs.reads.part, 6)
})

const snap = fresh()
const start = { edition: snap.edition, stories: snap.stories, sources: snap.sources, meta: {} }
const UID = '00000000-0000-4000-8000-000000000001'
const persona = PERSONAS.find((p) => p.id === 'klimaat')
const v2 = (extra = {}) => ({ ...bodyOf(persona, snap), ...extra })
const post = (body, token = null) => new Request('http://hoot.test/api/edition', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
const items = async (_s, followed) => {
  const on = new Set(followed)
  return snap.items.filter((i) => on.has(i.source))
}
const memKv = () => {
  const m = new Map()
  return { m, get: async (k) => m.get(k) ?? null, set: async (k, v) => m.set(k, v), take: async () => 1 }
}

test('B7: Server-Timing met alleen stapnamen en tijden, zonder profiel of account', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const deps = { start: async () => start, items, kv: memKv(), verify: async () => UID, clientFor: () => pg.client }
  for (const token of [null, 'goed']) {
    const res = await handle(post(v2(), token), deps)
    assert.equal(res.status, 200)
    const h = res.headers.get('server-timing')
    assert.ok(h, 'kop aanwezig')
    for (const part of h.split(', ')) assert.match(part, /^(kern|token|account|quotum|delen|rekenen|vastleggen|cache);dur=\d+\.\d$/)
    assert.doesNotMatch(h, new RegExp([UID, ...v2().followed].join('|')))
  }
})

test('B2: zonder account wacht het antwoord niet op het bewaren in de cache (waitUntil)', async () => {
  let saved = null
  const kv = { get: async () => null, set: () => new Promise(() => {}), take: async () => 1 }
  const res = await handle(post(v2()), { start: async () => start, items, kv, waitUntil: (p) => (saved = p) })
  assert.equal(res.status, 200)
  assert.equal((await res.json()).source, 'composed')
  assert.ok(saved instanceof Promise, 'het bewaren loopt door na het antwoord')
})

test('B3: de kern wordt al gelezen terwijl je token gecontroleerd wordt; het quotum tegelijk met de delen', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const log = []
  let release
  const verified = new Promise((r) => (release = r))
  const deps = {
    start: async () => (log.push('kern'), start),
    items: async (...a) => (log.push('delen'), items(...a)),
    verify: async () => (log.push('token'), await verified, UID),
    clientFor: () => pg.client,
    kv: { ...memKv(), take: async () => (log.push('quotum'), await new Promise((r) => setTimeout(r, 5)), 1) },
  }
  const asked = handle(post(v2(), 'goed'), deps)
  await new Promise((r) => setTimeout(r, 5))
  assert.deepEqual(log.slice().sort(), ['kern', 'token'], 'kern en token tegelijk')
  release()
  const res = await asked
  assert.equal((await res.json()).source, 'claimed')
  assert.deepEqual(log.slice(2), ['delen', 'quotum'])
  // Boven het plafond: 429, en er wordt niet vastgelegd.
  const pg2 = fakePostgrest([{ user_id: UID, edition: null }])
  const r2 = await handle(post(v2(), 'goed'), { ...deps, verify: async () => UID, clientFor: () => pg2.client, kv: { ...memKv(), take: async () => null } })
  assert.equal(r2.status, 429)
  assert.equal(pg2.patches().length, 0)
  // Een ongeldig token: 401, ook al liep de kern al.
  assert.equal((await handle(post(v2(), 'fout'), { ...deps, verify: async () => null })).status, 401)
})

test('warmhouden: { v: 2, warm: true } leest de kern en alle delen en rekent één keer; niets bewaard, niets terug', async () => {
  const kv = memKv()
  let asked = null
  const res = await handle(post({ v: 2, warm: true }), { start: async () => start, items: async (s, f) => ((asked = f), items(s, f)), kv })
  assert.equal(res.status, 204)
  assert.equal(await res.text(), '')
  assert.deepEqual(asked, snap.sources.filter((s) => s.kind !== 'sociaal').map((s) => s.id))
  assert.equal(kv.m.size, 0)
  assert.match(res.headers.get('server-timing'), /rekenen;dur=/)
})

test('feed-refresh warmt alleen bij een nieuw dagdeel, en een mislukte warme aanroep is geen fout', async () => {
  assert.equal(shouldWarm('2026-11-12-middag', '2026-11-12-avond', 'https://hootnews.nl'), true)
  assert.equal(shouldWarm('2026-11-12-avond', '2026-11-12-avond', 'https://hootnews.nl'), false)
  assert.equal(shouldWarm(null, '2026-11-12-avond', ''), false)
  let seen = null
  assert.equal(await warmEdition('https://x.test', { fetchImpl: async (url, init) => ((seen = [url, JSON.parse(init.body)]), new Response(null, { status: 204 })) }), 204)
  assert.deepEqual(seen, ['https://x.test/api/edition', { v: 2, warm: true }])
  assert.equal(await warmEdition('https://x.test', { fetchImpl: async () => { throw new Error('weg') } }), 0)
})

test('stopwatch: ook een mislukte stap telt, en de fout komt terug', async () => {
  let t = 0
  const w = stopwatch(() => (t += 10))
  await w.time('kern', async () => 1)
  await assert.rejects(w.time('delen', async () => { throw new Error('x') }))
  assert.equal(w.header(), 'kern;dur=10.0, delen;dur=10.0')
})
