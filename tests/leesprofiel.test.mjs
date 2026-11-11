// Leesprofiel meesturen (besluit Alex, 11 november 2026): web en iPhone sturen een samenvatting van je leesprofiel
// mee naar POST /api/edition (v2). Alleen de gewichten die De Redacteur gebruikt (readingSummary in src/lib/affinity.js),
// afgerond, de teller begrensd; geen artikelen, geen persoonsgegevens. De server stelt daarmee samen, de afdruk van de
// cache zonder account houdt er (als hash) rekening mee, en de Editie van de server is weer gelijk aan wat de lokale
// samenstelling met hetzelfde profiel gaf. Meetlat: de twaalf persona's van de redacteur-server-meting
// (Hoot-design/redacteur-server/VERSLAG.md: zonder leesprofiel waren 9 van 12 Edities anders).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { handle } from '../netlify/functions/edition.mjs'
import { readingSummary, READING_N_MAX, MIN_EVENTS } from '../src/lib/affinity.js'
import { READ_RAMP } from '../shared/editor.mjs'
import { serverRequest, serverFirst } from '../src/lib/editionSync.js'
import { composePersonal, withoutDebug, editionBasis } from '../src/lib/personal.js'
import { compose as coreCompose } from '../src/lib/editionCore.js'
import { previousOf } from '../netlify/lib/stories.mjs'
import { fakePostgrest } from './helpers/pgrest.mjs'
import { loadSnapshot, PERSONAS, setupFor, readIdsOf } from './helpers/snapshot.mjs'
import { readingGolden } from '../scripts/make-reading-golden.mjs'

const snap = loadSnapshot()
const start = { edition: snap.edition, stories: snap.stories, sources: snap.sources, meta: {} }
const UID = '00000000-0000-4000-8000-0000000000bb'
const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((key) => [key, v[key]])) : v))
const golden = JSON.parse(readFileSync(new URL('./fixtures/leesprofiel-golden.json', import.meta.url), 'utf8'))
const STAMPS = ['owner', 'basis', 'history', 'revision', 'server']
const bare = (e) => Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(e))).filter(([k]) => !STAMPS.includes(k)))

function memKv() {
  const m = new Map()
  const kv = { keys: [], values: m, get: async (k) => m.get(k) ?? null, set: async (k, v) => (kv.keys.push(k), m.set(k, JSON.parse(JSON.stringify(v)))), take: async () => 1 }
  return kv
}
function deps({ pg = null, kv = memKv() } = {}) {
  const d = {
    composes: 0,
    kv,
    start: async () => start,
    items: async (_s, followed) => {
      d.composes++
      const on = new Set(followed)
      return snap.items.filter((i) => on.has(i.source))
    },
    verify: async (t) => (t === 'goed' ? UID : null),
    clientFor: () => pg.client,
  }
  return d
}
const post = (body, token = null) => new Request('http://hoot.test/api/edition', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
const ask = async (d, body, token) => {
  const res = await handle(post(body, token), d)
  return { status: res.status, json: await res.json() }
}

// Per persona: het profiel, wat hij las, en de lokale samenstelling zoals het web en app 1.2 die maakten vóór de
// Redacteur op de server: met het ruwe leesprofiel, op de start van het dagdeel, zonder vorige Editie.
function personaCase(p) {
  const setup = setupFor(p, snap.sources)
  const readIds = readIdsOf(snap, p, setup.followed)
  const followed = [...setup.followed]
  const items = snap.items.filter((i) => setup.followed.has(i.source))
  const local = (affinity) =>
    composePersonal({ global: snap.edition, stories: snap.stories, items, sources: snap.sources, followed: setup.followed, interests: setup.interests, topics: setup.topics, favorites: setup.favorites, taste: setup.taste, affinity, readIds, now: Date.parse(snap.edition.builtAt), previous: previousOf([]) })
  const request = serverRequest({ followed, interests: setup.interests, topics: setup.topics, favorites: setup.favorites, taste: setup.taste, readIds: [...readIds], reading: readingSummary(setup.affinity) })
  return { p, setup, readIds, followed, local, request }
}
const CASES = PERSONAS.map(personaCase)

test('de samenvatting: alleen de gewichten die De Redacteur gebruikt, afgerond, de teller begrensd', () => {
  assert.equal(READING_N_MAX, READ_RAMP, 'boven READ_RAMP verandert de teller niets aan je Editie')
  assert.equal(readingSummary(null), null)
  assert.equal(readingSummary({ n: MIN_EVENTS - 1, topics: { ai: 5 }, sources: {} }), null, 'zolang lezen niet meetelt, gaat er niets mee')
  for (const { p, setup } of CASES) {
    const s = readingSummary(setup.affinity)
    if (!setup.affinity) {
      assert.equal(s, null, p.id)
      continue
    }
    assert.deepEqual(Object.keys(s), ['n', 'topics', 'sources'], `${p.id}: niets anders dan teller, onderwerpen en bronnen`)
    assert.ok(s.n <= READING_N_MAX && Object.keys(s.topics).length <= 40 && Object.keys(s.sources).length <= 30, p.id)
    for (const v of [...Object.values(s.topics), ...Object.values(s.sources)]) assert.equal(Math.round(v * 100) / 100, v, `${p.id}: afgerond op twee decimalen`)
    assert.deepEqual(readingSummary(s), s, `${p.id}: de server maakt een samenvatting ongewijzigd schoon`)
    assert.ok(JSON.stringify(s).length < 1500, `${p.id}: klein (${JSON.stringify(s).length} tekens)`)
  }
})

test('de 12 persona\'s: met de samenvatting geeft de server dezelfde Editie als de lokale samenstelling met hetzelfde profiel', async (t) => {
  let anders = 0
  for (const c of CASES) {
    const want = canon(withoutDebug(c.local(c.setup.affinity)))
    // Zonder account (samengesteld en bewaard in de cache).
    const anon = await ask(deps(), c.request)
    assert.equal(anon.status, 200, c.p.id)
    assert.equal(anon.json.source, 'composed', c.p.id)
    assert.equal(canon(bare(anon.json.edition)), want, `${c.p.id}: zonder account gelijk aan de lokale samenstelling`)
    // Als lid (de server legt vast).
    const pg = fakePostgrest([{ user_id: UID, edition: null }])
    const member = await ask(deps({ pg }), c.request, 'goed')
    assert.equal(member.json.source, 'claimed', c.p.id)
    assert.equal(canon(bare(member.json.edition)), want, `${c.p.id}: als lid gelijk aan de lokale samenstelling`)
    assert.equal(member.json.edition.basis, editionBasis(c.followed, c.setup.interests, c.setup.topics, c.setup.favorites), 'de afdruk zonder leesprofiel')
    // Ter controle: zonder samenvatting (zoals de server tot nu toe) wijkt het af.
    const { reading, ...without } = c.request
    const zonder = await ask(deps(), without)
    if (canon(bare(zonder.json.edition)) !== want) anders++
  }
  // De meting van redacteur-server (zonder gelezen berichten, op het tijdstip van de momentopname): 9 van 12. Hier, met
  // wat elke persona las en op de start van het dagdeel zoals de server rekent: 11 van 12 (alleen 'nieuw' heeft geen
  // leesprofiel). Met de samenvatting: 0 van 12.
  t.diagnostic(`zonder samenvatting ${anders} van 12 anders, met samenvatting 0 van 12`)
  assert.equal(anders, 11)
})

test('web = iPhone: voor elk profiel dezelfde samenvatting (tests/fixtures/leesprofiel-golden.json, ook in EditionServerTests)', () => {
  const now = readingGolden()
  assert.equal(canon(now), canon(golden), 'de golden is bij (anders: node scripts/make-reading-golden.mjs)')
  for (const c of golden.cases) {
    assert.equal(canon(readingSummary(c.affinity)), canon(c.summary), c.name)
    // Dezelfde functie in de rekenkern van de app, en volgorde van de sleutels maakt niet uit.
    const shuffled = c.affinity && { sources: Object.fromEntries(Object.entries(c.affinity.sources || {}).reverse()), topics: Object.fromEntries(Object.entries(c.affinity.topics || {}).reverse()), n: c.affinity.n }
    assert.equal(JSON.stringify(readingSummary(shuffled)), JSON.stringify(c.summary), `${c.name}: altijd dezelfde volgorde`)
  }
  const core = readFileSync(new URL('../ios/Hoot/Resources/edition-core.js', import.meta.url), 'utf8')
  assert.match(core, /readingSummaryJSON/, 'de app stuurt de samenvatting uit dezelfde code (npm run build:core)')
  assert.equal(canon(golden.request.body), canon(serverRequest({ ...golden.request.profile, reading: readingSummary(golden.request.affinity) })))
  assert.ok(golden.request.body.reading && !('affinity' in golden.request.body), 'de samenvatting mee, het ruwe profiel niet')
})

test('het vangnet (web en app) rekent met dezelfde samenvatting en geeft zo de Editie van de server', async () => {
  const c = CASES.find((x) => x.p.id === 'haags')
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const server = (await ask(deps({ pg }), c.request, 'goed')).json.edition
  const items = snap.items.filter((i) => c.setup.followed.has(i.source))
  const compose = ({ previous, now }) => composePersonal({ global: snap.edition, stories: snap.stories, items, sources: snap.sources, ...c.setup, readIds: c.readIds, affinity: readingSummary(c.setup.affinity), now, previous })
  const basis = editionBasis(c.followed, c.setup.interests, c.setup.topics, c.setup.favorites)
  const off = await serverFirst({ global: snap.edition, owner: UID, basis, request: c.request, compose, ready: true, online: false })
  assert.equal(off.source, 'provisional')
  assert.deepEqual(off.edition.entries.map((e) => e.leadId || e.id), server.entries.map((e) => e.leadId || e.id))
  // De rekenkern van de app: `reading` (het ruwe profiel) wordt daar ook eerst samengevat.
  const viaCore = coreCompose({ global: snap.edition, stories: snap.stories, items, sources: snap.sources, followed: c.followed, interests: c.setup.interests, topics: c.setup.topics, favorites: c.setup.favorites, taste: c.setup.taste, readIds: [...c.readIds], reading: c.setup.affinity, previous: [] })
  assert.deepEqual(viaCore.entries.map((e) => e.leadId || e.id), server.entries.map((e) => e.leadId || e.id))
  const hook = readFileSync(new URL('../src/hooks/usePersonalEdition.js', import.meta.url), 'utf8')
  assert.match(hook, /const reading = readingSummary\(affinity\)/)
  assert.match(hook, /affinity: reading/, 'het vangnet van het web met de samenvatting')
  const store = readFileSync(new URL('../ios/Hoot/HootStore.swift', import.meta.url), 'utf8')
  assert.match(store, /composeInput\(global: global, owner: owner, previous: prior, reading: true\)/, 'het vangnet van de app met de samenvatting')
})

test('de afdruk van de cache zonder account houdt rekening met de samenvatting, als hash; niets in de log', async () => {
  const said = []
  const keep = {}
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) {
    keep[k] = console[k]
    console[k] = (...a) => said.push(a.join(' '))
  }
  const c = CASES.find((x) => x.p.id === 'muziek')
  const kv = memKv()
  const d = deps({ kv })
  try {
    const a = await ask(d, c.request)
    const b = await ask(d, c.request)
    assert.equal(b.json.source, 'cache', 'dezelfde vraag rekent één keer')
    assert.equal(canon(a.json.edition), canon(b.json.edition))
    const other = { ...c.request, reading: { ...c.request.reading, topics: { ...c.request.reading.topics, games: 40 } } }
    const o = await ask(d, other)
    assert.equal(o.json.source, 'composed', 'een ander leesprofiel is een andere vraag')
    assert.equal(d.composes, 2)
    const { reading, ...without } = c.request
    assert.equal((await ask(d, without)).json.source, 'composed', 'zonder samenvatting ook')
  } finally {
    Object.assign(console, keep)
  }
  assert.deepEqual(said, [], 'geen console-uitvoer')
  assert.equal(new Set(kv.keys).size, 3)
  for (const k of kv.keys) assert.match(k, /^pe:[^:]+:[^:]+:[0-9a-f]{64}$/, 'de sleutel is een hash, zonder ruwe waarden')
  for (const v of kv.values.values()) {
    const s = JSON.stringify(v)
    assert.doesNotMatch(s, /"reading"|"affinity"/, 'in de cache staat alleen de Editie')
    assert.ok(!s.includes(JSON.stringify(c.request.reading.topics)), 'de gewichten staan er niet in')
  }
  const src = readFileSync(new URL('../netlify/functions/edition.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(src, /console\.(log|info|warn|error|debug)/)
})

test('oude apps en clients zonder samenvatting werken zoals voorheen; het ruwe affinity telt nog steeds niet', async () => {
  const c = CASES.find((x) => x.p.id === 'wereld')
  const { reading, ...without } = c.request
  const plain = await ask(deps(), without)
  assert.equal(plain.status, 200)
  assert.equal(canon(bare(plain.json.edition)), canon(withoutDebug(c.local(null))), 'zonder samenvatting: zonder leesprofiel, zoals de server tot nu toe')
  const raw = await ask(deps(), { ...without, affinity: c.setup.affinity })
  assert.equal(canon(raw.json.edition), canon(plain.json.edition), 'het ruwe profiel (oude vorm) doet niet mee')
  for (const bad of [{ n: 'veel' }, [1, 2], 'tekst', { n: 40, topics: 'x', sources: null }]) {
    const r = await ask(deps(), { ...without, reading: bad })
    assert.equal(r.status, 200, 'rommel geeft geen fout')
  }
  // v1 (app 1.1.1 en de terugval van 1.2): ongewijzigd, ook met een samenvatting erbij.
  const v1 = { followed: c.followed, interests: c.setup.interests, topics: c.setup.topics, favorites: c.setup.favorites, taste: c.setup.taste, readIds: [] }
  const a = await ask(deps(), v1)
  const b = await ask(deps(), { ...v1, reading: c.request.reading, affinity: c.setup.affinity })
  assert.deepEqual(Object.keys(a.json), ['edition'])
  assert.equal(canon(a.json), canon(b.json))
})
