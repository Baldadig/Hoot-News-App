// De Redacteur op de server (besluit Alex, 9 november 2026; Hoot-design/redacteur-server/PLAN.md): POST
// /api/edition v2 stelt jouw Editie samen en legt haar als lid zelf vast in je account (de eerste schrijver wint).
// Web en iPhone slaan het antwoord letterlijk op; zelf samenstellen alleen als voorlopig vangnet.
// Met de vaste momentopname (tests/fixtures/snapshot-2026-10-30-avond.json.gz), een nep-PostgREST
// (tests/helpers/pgrest.mjs) en nep-opslag: geen netwerk, geen Supabase.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { handle, editionFor, MEMBER_PER_SLOT } from '../netlify/functions/edition.mjs'
import { serverFirst, askServer, serverRequest, earlierForServer, fitsEdition } from '../src/lib/editionSync.js'
import { composePersonal, editionBasis } from '../src/lib/personal.js'
import { EDITOR_REVISION, BASIS_REVISION, EARLIER_REVISIONS } from '../shared/editor-version.mjs'
import { fakePostgrest } from './helpers/pgrest.mjs'
import { loadSnapshot, PERSONAS, setupFor } from './helpers/snapshot.mjs'

const snap = loadSnapshot()
const start = { edition: snap.edition, stories: snap.stories, sources: snap.sources, meta: {} }
const persona = PERSONAS.find((p) => p.id === 'klimaat')
const setup = setupFor(persona, snap.sources)
const UID = '00000000-0000-4000-8000-000000000001'
const profile = { followed: [...setup.followed], interests: setup.interests, topics: setup.topics, favorites: setup.favorites, taste: setup.taste }
const basis = editionBasis(profile.followed, profile.interests, profile.topics, profile.favorites)
const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((key) => [key, v[key]])) : v))

// Een opslag in het geheugen met dezelfde vorm als kvGet/kvSet/kvTake, en tellers.
function memKv({ limit = Infinity } = {}) {
  const m = new Map()
  const kv = {
    gets: 0,
    sets: 0,
    get: async (k) => (kv.gets++, m.get(k) ?? null),
    set: async (k, v) => (kv.sets++, m.set(k, JSON.parse(JSON.stringify(v)))),
    take: async (k, max) => {
      const n = m.get(k) || 0
      if (n >= Math.min(max, limit)) return null
      m.set(k, n + 1)
      return n + 1
    },
  }
  return kv
}
// De afhankelijkheden van de handler: de kern, de berichten per bron (geteld: zoveel keer werd er samengesteld),
// een token-controle en een client per token (de nep-PostgREST).
function deps({ pg = null, kv = memKv(), tokens = { goed: UID } } = {}) {
  const d = {
    composes: 0,
    kv,
    start: async () => start,
    items: async (_s, followed) => {
      d.composes++
      const on = new Set(followed)
      return snap.items.filter((i) => on.has(i.source))
    },
    verify: async (t) => tokens[t] ?? null,
    clientFor: () => pg.client,
  }
  return d
}
const post = (body, token = null) => new Request('http://hoot.test/api/edition', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
const ask = async (d, body, token) => {
  const res = await handle(post(body, token), d)
  return { status: res.status, headers: res.headers, json: await res.json() }
}
const v2 = (extra = {}) => ({ v: 2, ...profile, readIds: [], ...extra })

test('v1 (app 1.1.1, en 1.2 als terugval) blijft gelijk: terugval, van geen toestel, zonder claim', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const d = deps({ pg })
  const body = { ...profile, readIds: [] }
  const r = await ask(d, body, 'goed')
  assert.equal(r.status, 200)
  assert.equal(r.headers.get('cache-control'), 'no-store')
  assert.deepEqual(Object.keys(r.json), ['edition'])
  const items = snap.items.filter((i) => setup.followed.has(i.source))
  assert.equal(canon(r.json.edition), canon(JSON.parse(JSON.stringify(editionFor(start, items, body)))))
  assert.equal(r.json.edition.fallback, true)
  assert.equal(r.json.edition.owner, null)
  assert.equal(pg.log.length, 0, 'v1 raakt je account niet')
})

test('lid: de eerste aanvraag stelt samen en legt vast; een tweede (ander toestel, andere gelezen berichten) krijgt dezelfde Editie', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const d = deps({ pg })
  const a = await ask(d, v2({ readIds: [] }), 'goed')
  assert.equal(a.status, 200)
  assert.equal(a.headers.get('cache-control'), 'private, no-store')
  assert.equal(a.json.source, 'claimed')
  assert.equal(a.json.revision, EDITOR_REVISION)
  const e = a.json.edition
  assert.equal(e.id, snap.edition.id)
  assert.equal(e.owner, UID)
  assert.equal(e.basis, basis)
  assert.equal(e.server, true)
  assert.equal(e.revision, EDITOR_REVISION)
  assert.ok(Array.isArray(e.history))
  assert.ok(e.entries.length >= 8)
  assert.ok(e.entries.every((x) => Object.keys(x).every((k) => !k.startsWith('_'))), 'geen punten ter inzage')
  assert.equal(pg.writes().length, 1)
  assert.equal(canon(pg.table[0].edition), canon(e), 'wat in je account staat, is wat terugkomt')

  const read = snap.items.filter((i) => setup.followed.has(i.source)).slice(0, 40).map((i) => i.id)
  const b = await ask(d, v2({ readIds: read, earlier: [{ id: 'x', builtAt: '2026-10-30T06:00:00Z', storyIds: [] }] }), 'goed')
  assert.equal(b.json.source, 'account')
  assert.equal(JSON.stringify(b.json.edition), JSON.stringify(a.json.edition), 'byte voor byte')
  assert.equal(d.composes, 1, 'de tweede rekent niet')
  assert.equal(pg.patches().length, 1)
})

test('twee gelijktijdige aanvragen (web en iPhone): één claim raak, twee gelijke antwoorden', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const d = deps({ pg })
  const [a, b] = await Promise.all([ask(d, v2(), 'goed'), ask(d, v2({ readIds: [snap.items[0].id] }), 'goed')])
  assert.equal(pg.writes().length, 1, 'één PATCH raak')
  assert.deepEqual([a.json.source, b.json.source].sort(), ['account', 'claimed'])
  assert.equal(canon(a.json.edition), canon(b.json.edition))
  assert.equal(canon(pg.table[0].edition), canon(a.json.edition))
})

test('een rij van app 1.2 die past (zelfde dagdeel en afdruk) komt ongewijzigd terug, zonder rekenen en zonder schrijven', async () => {
  // Zoals 1.2 hem schrijft: zelf samengesteld (met affinity), owner = uid, de afdruk uit de rekenkern, geen `server`.
  const mine = composePersonal({ global: snap.edition, stories: snap.stories, items: snap.items, sources: snap.sources, ...setup, now: Date.parse(snap.edition.builtAt), previous: null })
  const row = JSON.parse(JSON.stringify({ ...mine, owner: UID, basis, history: [] }))
  const pg = fakePostgrest([{ user_id: UID, edition: row }])
  const d = deps({ pg })
  const r = await ask(d, v2(), 'goed')
  assert.equal(r.json.source, 'account')
  assert.equal(JSON.stringify(r.json.edition), JSON.stringify(row))
  assert.equal(d.composes, 0)
  assert.equal(pg.patches().length, 0)
})

test('de afdruk rekent met een vaste waarde: een nieuwe revisie verandert hem niet (app 1.2 en de server houden dezelfde)', () => {
  assert.equal(BASIS_REVISION, 'redacteur-2026-11-07-taalregel')
  assert.ok(EARLIER_REVISIONS.includes(BASIS_REVISION) || EDITOR_REVISION === BASIS_REVISION)
  // djb2 zoals editionBasis, met de revisie van app 1.2 (edition-core.js van 1.2 rekent zo).
  const djb2 = (text) => {
    let h = 5381
    for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0
    return h.toString(36)
  }
  const parts = [[...profile.followed].sort().join(','), [...profile.interests].sort().join(','), [...profile.topics].sort().join(','), [...profile.favorites].sort().join(',')]
  assert.equal(basis, djb2(['redacteur-2026-11-07-taalregel', ...parts].join('|')))
})

test('een rij van een ander dagdeel of met een andere afdruk wordt vervangen; de vorige Editie gaat mee als history', async () => {
  const old = { id: '2026-10-30-middag', builtAt: '2026-10-30T11:00:00.000Z', owner: UID, basis, entries: snap.edition.entries.slice(0, 3), items: snap.edition.items, history: [] }
  const pg = fakePostgrest([{ user_id: UID, edition: old }])
  const d = deps({ pg })
  const r = await ask(d, v2(), 'goed')
  assert.equal(r.json.source, 'claimed')
  assert.deepEqual(r.json.edition.history.map((h) => h.id), ['2026-10-30-middag'])
})

// Keuring server 1, §5: het startbestand uit Blobs loopt tot een minuut achter. Rond de overgang naar een nieuw
// dagdeel rekent de server dan met het vorige, terwijl app 1.2 de Editie van het nieuwe dagdeel al vastlegde.
const later = () => {
  const t = Date.parse(snap.edition.builtAt) + 6 * 3600e3
  return { id: 'later-dagdeel', builtAt: new Date(t).toISOString(), owner: UID, basis, entries: snap.edition.entries.slice(0, 2), items: snap.edition.items, history: [] }
}

test('keuring 1 §5: een Editie van een later dagdeel in je account wordt nooit overschreven (oude kern op de server)', async () => {
  const ahead = later()
  const pg = fakePostgrest([{ user_id: UID, edition: ahead }])
  const d = deps({ pg })
  const r = await ask(d, v2(), 'goed')
  assert.equal(r.status, 200)
  assert.equal(r.json.source, 'account')
  assert.equal(JSON.stringify(r.json.edition), JSON.stringify(ahead), 'die Editie terug, ongewijzigd')
  assert.equal(pg.patches().length, 0, 'geen schrijfaanvraag')
  assert.equal(d.composes, 0, 'niet gerekend')
  assert.equal(JSON.stringify(pg.table[0].edition), JSON.stringify(ahead), 'de rij staat er nog')
  // Het web bewaart haar als 'ahead' en toont haar zodra de kern bij is (serverFirst, hieronder getoetst).
})

test('keuring 1 §5: schrijft een ander toestel tussen lezen en vastleggen een later dagdeel, dan blijft dat staan', async () => {
  const old = { id: '2026-10-30-middag', builtAt: '2026-10-30T11:00:00.000Z', owner: UID, basis, entries: snap.edition.entries.slice(0, 3), items: snap.edition.items, history: [] }
  const ahead = later()
  const pg = fakePostgrest([{ user_id: UID, edition: old }])
  const d = deps({ pg })
  const items = d.items
  d.items = async (...a) => {
    pg.table[0].edition = ahead // app 1.2 legt net de Editie van het nieuwe dagdeel vast
    return items(...a)
  }
  const r = await ask(d, v2(), 'goed')
  assert.equal(r.json.source, 'account')
  assert.equal(JSON.stringify(r.json.edition), JSON.stringify(ahead))
  assert.equal(pg.writes().length, 0, 'de PATCH was niet raak')
  assert.equal(JSON.stringify(pg.table[0].edition), JSON.stringify(ahead))
})

test('tussen lezen en vastleggen schrijft een ander toestel dit dagdeel: dat wint, voor iedereen dezelfde', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const first = deps({ pg })
  const theirs = (await ask(first, v2(), 'goed')).json.edition
  pg.table[0].edition = null
  const d = deps({ pg })
  const items = d.items
  d.items = async (...a) => {
    pg.table[0].edition = theirs
    return items(...a)
  }
  const r = await ask(d, v2({ readIds: [snap.items[0].id] }), 'goed')
  assert.equal(r.json.source, 'account')
  assert.equal(canon(r.json.edition), canon(theirs))
})

test('zonder account: dezelfde vraag rekent één keer (bewaard per profiel-afdruk en dagdeel), nooit in een account', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const d = deps({ pg })
  const a = await ask(d, v2())
  const b = await ask(d, v2())
  assert.equal(a.json.source, 'composed')
  assert.equal(b.json.source, 'cache')
  assert.equal(d.composes, 1)
  assert.equal(JSON.stringify(a.json.edition), JSON.stringify(b.json.edition))
  assert.equal(a.json.edition.owner, 'anon')
  assert.equal(pg.log.length, 0)
  // Een andere vraag (wat je las) is een andere sleutel.
  const c = await ask(d, v2({ readIds: [snap.items[0].id] }))
  assert.equal(c.json.source, 'composed')
  assert.equal(d.composes, 2)
})

test('zonder account: `earlier` (je vorige Edities van de server) telt mee, schoon en begrensd', async () => {
  const d = deps()
  const first = (await ask(d, v2())).json.edition
  const prior = { ...first, id: '2026-10-30-middag', builtAt: '2026-10-30T11:00:00.000Z' }
  const earlier = earlierForServer(prior, { id: snap.edition.id, owner: 'anon' })
  assert.equal(earlier.length, 1)
  const r = await ask(d, v2({ earlier: [...earlier, { id: 'kapot' }, 'tekst', null] }))
  assert.deepEqual(r.json.edition.history.map((h) => h.id), ['2026-10-30-middag'])
})

test('429: een lid boven het plafond per dagdeel; een treffer in je account telt niet mee', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const d = deps({ pg, kv: memKv({ limit: 0 }) })
  const r = await ask(d, v2(), 'goed')
  assert.equal(r.status, 429)
  assert.ok(Number(r.headers.get('retry-after')) > 0)
  assert.equal(pg.patches().length, 0)
  assert.ok(MEMBER_PER_SLOT >= 6)
  // Met een passende rij: gewoon de rij, ook boven het plafond.
  const pg2 = fakePostgrest([{ user_id: UID, edition: null }])
  const d2 = deps({ pg: pg2 })
  await ask(d2, v2(), 'goed')
  const r2 = await ask({ ...d2, kv: memKv({ limit: 0 }) }, v2(), 'goed')
  assert.equal(r2.status, 200)
  assert.equal(r2.json.source, 'account')
})

test('401 bij een ongeldig token; 400 en 413 zoals in v1', async () => {
  const d = deps({ pg: fakePostgrest([]) })
  assert.equal((await ask(d, v2(), 'fout')).status, 401)
  assert.equal((await handle(new Request('http://hoot.test/api/edition', { method: 'POST', body: 'null' }), d)).status, 400)
  assert.equal((await handle(new Request('http://hoot.test/api/edition', { method: 'POST', body: JSON.stringify({ v: 2, x: 'a'.repeat(330_000) }) }), d)).status, 413)
})

test('privacy: geen console-uitvoer met profiel of account, en `affinity` doet niet mee', async () => {
  const said = []
  const keep = {}
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) {
    keep[k] = console[k]
    console[k] = (...a) => said.push(a.join(' '))
  }
  try {
    const d = deps()
    const a = await ask(d, v2())
    const d2 = deps()
    const b = await ask(d2, v2({ affinity: { n: 40, topics: { klimaat: 9 }, sources: { nos: 5 } } }))
    const pg = fakePostgrest([{ user_id: UID, edition: null }])
    await ask(deps({ pg }), v2(), 'goed')
    assert.equal(JSON.stringify(a.json.edition), JSON.stringify(b.json.edition))
  } finally {
    Object.assign(console, keep)
  }
  assert.deepEqual(said, [])
  const src = readFileSync(new URL('../netlify/functions/edition.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(src, /console\.(log|info|warn|error|debug)/)
})

test('serverFirst: het vangnet schrijft nooit naar je account en wordt vervangen door de Editie van de server', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const compose = ({ previous, now }) => composePersonal({ global: snap.edition, stories: snap.stories, items: snap.items, sources: snap.sources, ...setup, affinity: null, now, previous })
  const base = { global: snap.edition, owner: UID, basis, request: serverRequest(profile), compose, ready: true }
  // Offline: voorlopig, gemerkt, niet te bewaren als Editie van de server.
  const off = await serverFirst({ ...base, online: false, ask: async () => assert.fail('offline vraagt niet') })
  assert.equal(off.source, 'provisional')
  assert.equal(off.edition.provisional, true)
  assert.equal(off.keep, false)
  // Een fout of 429: ook voorlopig.
  for (const status of [0, 429, 500, 503]) assert.equal((await serverFirst({ ...base, ask: async () => ({ status, edition: null }) })).source, 'provisional')
  // De berichten komen niet en de server antwoordt niet: de algemene Editie.
  const g = await serverFirst({ ...base, ready: false, stuck: true, ask: async () => ({ status: 0 }) })
  assert.equal(g.source, 'global')
  assert.equal(await serverFirst({ ...base, ready: false, ask: async () => ({ status: 0 }) }), null, 'nog even wachten')
  assert.equal(pg.log.length, 0, 'het vangnet raakt je account niet')
  // Weer online: de server antwoordt, en zijn Editie vervangt het vangnet.
  const d = deps({ pg })
  const on = await serverFirst({ ...base, ask: async (body) => (await ask(d, body, 'goed')).json })
  assert.equal(on.source, 'server')
  assert.equal(on.keep, true)
  assert.equal(on.edition.provisional, undefined)
  assert.equal(pg.writes().length, 1, 'alleen de server schrijft')
  // Daarna: wat hier ligt, zonder nieuwe vraag.
  const again = await serverFirst({ ...base, local: on.edition, localFromServer: true, ask: async () => assert.fail('niet opnieuw vragen') })
  assert.equal(again.source, 'local')
  // Een lid vraagt pas na het ophalen van zijn account (`mayAsk`): anders het vangnet.
  assert.equal((await serverFirst({ ...base, mayAsk: false, ask: async () => assert.fail('nog niet') })).source, 'provisional')
})

test('serverFirst: een Editie van een later dagdeel (de kern hier loopt achter) wordt bewaard, niet getoond', async () => {
  const later = { id: '2026-10-31-ochtend', builtAt: '2026-10-31T05:00:00.000Z', owner: UID, basis, entries: [{ kind: 'item', id: 'x' }] }
  const r = await serverFirst({ global: snap.edition, owner: UID, basis, request: {}, ready: false, ask: async () => ({ status: 200, edition: later }) })
  assert.equal(r.source, 'ahead')
  assert.equal(r.ahead, later)
  assert.equal(r.edition, null)
})

test('askServer: het token mee; bij 401 één keer vernieuwen en opnieuw; geen verbinding is status 0', async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push(init.headers.Authorization || '')
    if (init.headers.Authorization === 'Bearer oud') return new Response('{}', { status: 401 })
    return Response.json({ edition: { id: 'e' }, source: 'account' })
  }
  const r = await askServer({ v: 2 }, { fetchImpl, token: 'oud', refresh: async () => 'nieuw' })
  assert.deepEqual(calls, ['Bearer oud', 'Bearer nieuw'])
  assert.equal(r.status, 200)
  assert.equal(r.edition.id, 'e')
  assert.equal((await askServer({ v: 2 }, { fetchImpl: async () => { throw new Error('offline') } })).status, 0)
  assert.equal((await askServer({ v: 2 }, { fetchImpl: async () => new Response('{}', { status: 429 }) })).status, 429)
})

test('het web vraagt server-first: geen settleEdition, claimEdition of affinity meer in de hook', () => {
  const hook = readFileSync(new URL('../src/hooks/usePersonalEdition.js', import.meta.url), 'utf8')
  assert.match(hook, /serverFirst\(/)
  assert.doesNotMatch(hook, /settleEdition|claimEdition|adoptEdition|fallbackEdition/)
  assert.match(hook, /affinity: null/)
  assert.ok(fitsEdition({ id: 'a', basis: 'b' }, { id: 'a', basis: 'b' }))
})

test('privacy: bij een storing van Blobs komt de quota-sleutel (afdruk van je account) niet in de log', async () => {
  const { fellBack } = await import('../netlify/lib/kv.mjs')
  const lines = []
  const orig = console.error
  console.error = (...a) => lines.push(a.join(' '))
  try {
    fellBack('take', `pe-quota:${'a'.repeat(64)}:dagdeel`, new Error('storing'))
  } finally {
    console.error = orig
  }
  assert.equal(lines.length, 1)
  assert.doesNotMatch(lines[0], /a{16}/)
  assert.match(lines[0], /pe-quota:…/)
})
