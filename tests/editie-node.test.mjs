// Editiefix (16 november 2026). Van 11 tot 16 november gaf elke vraag als lid aan POST /api/edition een 502: Netlify
// draaide Node 20 (netlify.toml), en supabase-js 2.118 gooit in createClient 'native WebSocket not found'. De fout zat
// buiten een try, dus Netlify gaf een 502, en iOS 1.3.1 en 1.4 proberen een 502 niet opnieuw. Geen toets zag het: elke
// toets gaf edition.mjs een eigen `clientFor`. Hier draait de ECHTE verifyToken en clientForToken, met alleen een nep
// achter `fetch`, ook in een proces zonder WebSocket. Daarnaast: S2 (nooit een oudere Editie als er al een later
// dagdeel is) en S3 (ruis in je instellingen geeft geen tweede Editie in een dagdeel).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { handle, clientForToken, prefsMarkOf, MARK_V, laterSlot, RETRY_S } from '../netlify/functions/edition.mjs'
import { logFault } from '../netlify/lib/edition-fout.mjs'
import { RUBRIEKEN, ONDERWERPEN } from '../src/lib/topics.js'
import { fakePostgrest } from './helpers/pgrest.mjs'
import { lidDeps, lidPost, start, body, LID } from './helpers/lid-nep.mjs'

const major = (v) => Number(String(v).match(/\d+/)?.[0])

test('Netlify draait Node 22 of nieuwer, en dat is genoeg voor supabase-js', () => {
  const toml = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8')
  const m = /NODE_VERSION\s*=\s*"(\d+)/.exec(toml)
  assert.ok(m, 'NODE_VERSION staat in netlify.toml')
  assert.ok(Number(m[1]) >= 22, `NODE_VERSION is ${m[1]}; supabase-js heeft een ingebouwde WebSocket nodig (Node 22 of nieuwer)`)
  const need = JSON.parse(readFileSync(new URL('../node_modules/@supabase/supabase-js/package.json', import.meta.url), 'utf8')).engines?.node
  if (need) assert.ok(Number(m[1]) >= major(need), `supabase-js vraagt ${need}`)
})

test('de echte clientForToken bouwt ook zonder WebSocket (realtime staat uit op de server)', () => {
  const ws = globalThis.WebSocket
  try {
    delete globalThis.WebSocket
    assert.equal(typeof globalThis.WebSocket, 'undefined')
    const c = clientForToken('t', async () => Response.json([]))
    assert.equal(typeof c.from, 'function')
  } finally {
    if (ws) globalThis.WebSocket = ws
  }
})

test('een lid door de echte verifyToken en clientForToken: 200, vastgelegd in je account', async () => {
  const d = lidDeps()
  const res = await handle(lidPost(), d.deps)
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.source, 'claimed')
  assert.equal(json.edition.owner, LID)
  assert.equal(d.pg.writes().length, 1)
  assert.ok(d.calls.includes('GET /auth/v1/user'), 'het token ging langs Supabase Auth')
  assert.ok(d.calls.some((c) => c.startsWith('PATCH ') && c.endsWith('/user_state')), 'en de Editie naar je account')
})

test('hetzelfde in een proces zonder WebSocket (node --no-experimental-websocket, zoals Node 20)', () => {
  const script = fileURLToPath(new URL('./helpers/lid-zonder-websocket.mjs', import.meta.url))
  const r = spawnSync(process.execPath, ['--no-experimental-websocket', script], { encoding: 'utf8', timeout: 60_000 })
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  assert.equal(out.websocket, 'undefined', 'echt zonder WebSocket')
  assert.deepEqual({ status: out.status, source: out.source, owner: out.owner, writes: out.writes }, { status: 200, source: 'claimed', owner: LID, writes: 1 })
})

test('een clientFor die gooit geeft een 503 met Retry-After, geen throw (iOS vraagt dan opnieuw)', async () => {
  const said = []
  const d = lidDeps()
  const res = await handle(lidPost(), { ...d.deps, verify: async () => LID, clientFor: () => { throw new Error('Node.js detected but native WebSocket not found.') }, log: (s) => said.push(s) })
  assert.equal(res.status, 503)
  assert.equal(res.headers.get('retry-after'), String(RETRY_S))
  assert.equal(res.headers.get('cache-control'), 'private, no-store')
  assert.deepEqual(said, ['[edition] 5xx client Error'])
})

test('elke onverwachte fout op de route wordt een 503 met Retry-After, nooit een 502', async () => {
  for (const broken of [{ items: async () => { throw new TypeError('kapot') } }, { kv: { get: async () => null, set: async () => {}, take: async () => { throw new RangeError('x') } } }]) {
    const said = []
    const d = lidDeps()
    const res = await handle(lidPost(), { ...d.deps, ...broken, log: (s) => said.push(s) })
    assert.equal(res.status, 503)
    assert.equal(res.headers.get('retry-after'), String(RETRY_S))
    assert.equal(said.length, 1)
    assert.match(said[0], /^\[edition\] 5xx onverwacht (TypeError|RangeError)$/)
  }
})

test('S4: de log noemt alleen de stap en de naam van de fout, nooit de melding', () => {
  const said = []
  const e = new Error('Bearer geheim-token van alexvrees@example.com')
  logFault('client', e, (s) => said.push(s))
  logFault('Rare stap!', { name: 'bad name with spaces' }, (s) => said.push(s))
  assert.deepEqual(said, ['[edition] 5xx client Error', '[edition] 5xx onbekend Fout'])
  const src = readFileSync(new URL('../netlify/functions/edition.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(src, /console\.(log|info|warn|error|debug)/, 'edition.mjs logt zelf niets')
})

// ---- S2: de klok zegt dat er een later dagdeel is ----
const OCHTEND = { ...start, edition: { ...start.edition, id: '2026-10-31-ochtend', slot: 'ochtend', builtAt: '2026-10-31T05:31:00.000Z', version: 'test:2026-10-31-ochtend' } }
const AVOND_KLOK = () => Date.parse('2026-10-30T18:00:00.000Z')
const OCHTEND_KLOK = () => Date.parse('2026-10-31T07:30:00.000Z')

test('S2: dagdeel-id\'s op volgorde', () => {
  assert.equal(laterSlot('2026-10-31-ochtend', '2026-10-30-avond'), true)
  assert.equal(laterSlot('2026-10-30-middag', '2026-10-30-ochtend'), true)
  assert.equal(laterSlot('2026-10-30-ochtend', '2026-10-30-ochtend'), false)
  assert.equal(laterSlot('onzin', '2026-10-30-ochtend'), false)
})

test('S2: onze kern loopt achter op de klok en er is een nieuwere: de server rekent met de nieuwe, nooit de oude Editie', async () => {
  const d = lidDeps()
  const first = await handle(lidPost(), { ...d.deps, now: AVOND_KLOK, freshStart: async () => assert.fail('zelfde dagdeel: niet opnieuw lezen') })
  assert.equal((await first.json()).edition.id, '2026-10-30-avond')
  let fresh = 0
  const res = await handle(lidPost(), { ...d.deps, now: OCHTEND_KLOK, freshStart: async () => (fresh++, OCHTEND) })
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(fresh, 1)
  assert.equal(json.edition.id, '2026-10-31-ochtend')
  assert.equal(json.source, 'claimed')
  assert.equal(d.pg.table[0].edition.id, '2026-10-31-ochtend')
})

test('S2: de nieuwe kern is er nog niet (de eerste feedronde loopt nog): de Editie van nu gaat gewoon terug', async () => {
  const d = lidDeps()
  await handle(lidPost(), { ...d.deps, now: AVOND_KLOK })
  const res = await handle(lidPost(), { ...d.deps, now: OCHTEND_KLOK, freshStart: async () => start })
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.edition.id, '2026-10-30-avond')
  assert.equal(json.source, 'account')
})

test('S2: lukt het opnieuw lezen niet, dan een 503 met Retry-After in plaats van de oude Editie', async () => {
  const said = []
  const d = lidDeps()
  await handle(lidPost(), { ...d.deps, now: AVOND_KLOK })
  const res = await handle(lidPost(), { ...d.deps, now: OCHTEND_KLOK, freshStart: async () => { throw new SyntaxError('half bestand') }, log: (s) => said.push(s) })
  assert.equal(res.status, 503)
  assert.equal(res.headers.get('retry-after'), String(RETRY_S))
  assert.deepEqual(said, ['[edition] 5xx kern SyntaxError'])
})

// ---- S3: alleen wat de afdruk raakt telt in het merk ----
const BSKY = { id: 'bsky-test', kind: 'sociaal', name: 'Een Bluesky-account' }
const withBsky = { ...start, sources: [...start.sources, BSKY] }
const news = start.sources.filter((s) => s.kind !== 'sociaal')
const prefsOf = ({ followed = body.followed, interests = body.interests, muted = [] } = {}) => {
  const on = new Set(followed)
  return {
    muted: [...news.filter((s) => !s.optional && !on.has(s.id)).map((s) => s.id), ...muted],
    enabled: news.filter((s) => s.optional && on.has(s.id)).map((s) => s.id),
    interests,
    topics: body.topics,
    favorites: body.favorites,
    rubrieken: RUBRIEKEN,
    onderwerpen: ONDERWERPEN,
  }
}
const web = (extra = {}) => ({ ...body, rubrieken: RUBRIEKEN, onderwerpen: ONDERWERPEN, ...extra })
const content = (e) => JSON.stringify({ id: e.id, version: e.version, entries: e.entries })

test('S3: het merk ziet een gedempte Bluesky-bron of een `enabled` zonder gevolg niet, een echte keuze wel', () => {
  const p = prefsOf()
  const m = prefsMarkOf(p, withBsky.sources)
  assert.ok(m.startsWith(MARK_V))
  assert.equal(prefsMarkOf({ ...p, muted: [...p.muted, BSKY.id] }, withBsky.sources), m, 'gedempte Bluesky-bron')
  assert.equal(prefsMarkOf({ ...p, enabled: [...p.enabled, BSKY.id, news.find((s) => !s.optional).id] }, withBsky.sources), m, 'enabled zonder gevolg')
  assert.equal(prefsMarkOf({ ...p, theme: 'dark' }, withBsky.sources), m)
  assert.notEqual(prefsMarkOf({ ...p, muted: [...p.muted, body.followed[0]] }, withBsky.sources), m, 'een gevolgde bron uit')
  assert.notEqual(prefsMarkOf({ ...p, interests: p.interests.slice(1) }, withBsky.sources), m, 'een interesse minder')
  // Een gedempte bron die uit de bronnenlijst verdwijnt: het merk blijft.
  const mutedNews = p.muted.find((id) => news.some((s) => s.id === id && !s.optional))
  assert.equal(prefsMarkOf(p, withBsky.sources.filter((s) => s.id !== mutedNews)), m)
})

test('S3 A-B-A: ruis in je account (Bluesky dempen en weer aan) geeft binnen het dagdeel geen tweede Editie; een echte keuze wel', async () => {
  const rows = [{ user_id: LID, edition: null, prefs: prefsOf() }]
  const d = lidDeps(rows)
  let cur = withBsky
  let composes = 0
  const deps = { ...d.deps, start: async () => cur, items: async (s, f) => (composes++, d.deps.items(s, f)) }
  const ask = async (b = web()) => (await handle(lidPost(b), deps)).json()
  const a = await ask()
  assert.equal(a.source, 'claimed')
  // Een gevolgde bron verdwijnt uit de lijst (zoals 14 november): de rij past niet meer bij de afdruk van nu, maar je
  // keuze is dezelfde. Daarbij demp je een Bluesky-bron (A), zet je hem weer aan (B), en dempt je hem weer (A).
  const gone = news.find((s) => !s.optional && body.followed.includes(s.id)).id
  cur = { ...withBsky, sources: withBsky.sources.filter((s) => s.id !== gone) }
  for (const muted of [[BSKY.id], [], [BSKY.id]]) {
    d.pg.table[0].prefs = prefsOf({ muted })
    const r = await ask()
    assert.equal(r.source, 'account')
    assert.equal(content(r.edition), content(a.edition))
  }
  assert.equal(composes, 1, 'één keer gerekend')
  assert.equal(d.pg.writes().length, 1)
  // Een echte keuzewijziging in je account (een interesse minder) en een vraag die erbij past: wel opnieuw.
  const fewer = body.interests.slice(1)
  d.pg.table[0].prefs = prefsOf({ interests: fewer })
  const b = await ask(web({ interests: fewer }))
  assert.equal(b.source, 'claimed')
  assert.notEqual(b.edition.basis, a.edition.basis)
  assert.equal(composes, 2)
})

test('S3: een rij met een merk van versie 1 blijft het dagdeel staan, ook na een echte keuzewijziging', async () => {
  const d = lidDeps([{ user_id: LID, edition: null, prefs: prefsOf() }])
  const a = await (await handle(lidPost(web()), d.deps)).json()
  d.pg.table[0].edition = { ...d.pg.table[0].edition, prefsMark: 'a'.repeat(64) }
  const fewer = body.interests.slice(1)
  d.pg.table[0].prefs = prefsOf({ interests: fewer })
  const r = await (await handle(lidPost(web({ interests: fewer })), d.deps)).json()
  assert.equal(r.source, 'account')
  assert.equal(content(r.edition), content(a.edition))
})

test('de nep-PostgREST werkt ook zonder WebSocket (de helpers zelf hebben geen realtime nodig)', () => {
  const ws = globalThis.WebSocket
  try {
    delete globalThis.WebSocket
    assert.equal(typeof fakePostgrest([]).client.from, 'function')
  } finally {
    if (ws) globalThis.WebSocket = ws
  }
})
