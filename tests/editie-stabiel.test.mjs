// Editie stabiel (15 november 2026, melding Alex: "Mijn ochtend editie is al 3x gewijzigd. Zomaar."). Oorzaak: de
// server schreef binnen hetzelfde dagdeel over de Editie in je account heen zodra een vraag een andere afdruk had
// (web en iPhone, een toestel dat nog niet had opgehaald, een net andere rekensom). Elke nieuwe berekening viel echt
// anders uit (wat je las, het leesprofiel van dat toestel, de delen na een feedronde, een nieuwe Redacteur na een
// deploy). Nu: één Editie per dagdeel. Opnieuw samenstellen alleen als je keuze in je account veranderde. En bij een
// serverfout of zonder rij in user_state dezelfde Editie uit een kopie, nooit een Editie naast je account.
// Met de vaste momentopname, een nep-PostgREST en nep-opslag: geen netwerk, geen echte accountgegevens.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handle, anonKey, accountBasesOf, basesOf, profileOf, memberCopyKey, prefsMarkOf } from '../netlify/functions/edition.mjs'
import { warmAfterDeploy } from '../netlify/functions/deploy-succeeded.mjs'
import { EDITOR_REVISION } from '../shared/editor-version.mjs'
import { currentChoice, RUBRIEKEN, ONDERWERPEN } from '../src/lib/topics.js'
import { fakePostgrest } from './helpers/pgrest.mjs'
import { loadSnapshot, PERSONAS, setupFor } from './helpers/snapshot.mjs'

const snap = loadSnapshot()
const start = { edition: snap.edition, stories: snap.stories, sources: snap.sources, meta: {} }
const setup = setupFor(PERSONAS.find((p) => p.id === 'klimaat'), snap.sources)
const UID = '00000000-0000-4000-8000-000000000002'
const base = { followed: [...setup.followed], favorites: setup.favorites, taste: setup.taste }
const news = snap.sources.filter((s) => s.kind !== 'sociaal')

// Dezelfde lezer in de oude indeling (app 1.2.1, zonder `rubrieken`) en in die van nu (het web).
const OLD = { interests: ['wetenschap', 'cultuur', 'tech'], topics: [...setup.topics, 'muziek', 'film', 'boeken', 'kunst', 'media', 'ai'] }
const NEW = currentChoice(OLD.interests, OLD.topics)
const web = (extra = {}) => ({ v: 2, ...base, ...NEW, rubrieken: RUBRIEKEN, onderwerpen: ONDERWERPEN, readIds: [], ...extra })
const app = (extra = {}) => ({ v: 2, ...base, ...OLD, readIds: [], ...extra })

// Je instellingen in je account zoals de sync ze wegschrijft: uit wat je niet volgt, aan wat optioneel is.
const prefsFor = ({ followed = base.followed, interests = OLD.interests, topics = OLD.topics, favorites = base.favorites, rubrieken } = {}) => {
  const on = new Set(followed)
  return {
    muted: news.filter((s) => !s.optional && !on.has(s.id)).map((s) => s.id),
    enabled: news.filter((s) => s.optional && on.has(s.id)).map((s) => s.id),
    interests,
    topics,
    favorites,
    ...(rubrieken ? { rubrieken } : {}),
  }
}
const memKv = () => {
  const m = new Map()
  return { m, get: async (k) => m.get(k) ?? null, set: async (k, v) => void m.set(k, v), take: async () => 1 }
}
function deps(pg, extra = {}) {
  const d = {
    composes: 0,
    kv: memKv(),
    start: async () => start,
    items: async (s, followed) => {
      d.composes++
      const on = new Set(followed)
      return snap.items.filter((i) => on.has(i.source))
    },
    verify: async (t) => (t === 'goed' ? UID : null),
    clientFor: () => pg.client,
    ...extra,
  }
  return d
}
const post = (body, token = 'goed') => new Request('http://hoot.test/api/edition', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
const ask = async (d, body, token) => {
  const res = await handle(post(body, token), d)
  return { status: res.status, ...(await res.json()) }
}
const content = (e) => JSON.stringify({ id: e.id, version: e.version, builtAt: e.builtAt, entries: e.entries, items: (e.items || []).map((i) => i.id) })

test('de keuze in je account geeft dezelfde afdrukken als een toestel dat haar heeft opgehaald', () => {
  const acct = accountBasesOf(start, prefsFor())
  assert.ok(acct.includes(basesOf(profileOf(start, web()))[0]), 'het web')
  assert.ok(basesOf(profileOf(start, app())).some((b) => acct.includes(b)), 'app 1.2.1 (oude indeling)')
  assert.equal(accountBasesOf(start, null), null, 'geen instellingen: onbekend')
  assert.equal(accountBasesOf(start, {}), null)
})

test('(i) web, app, web met een net andere afdruk en dezelfde instellingen: drie keer dezelfde Editie, één keer gerekend', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }])
  const d = deps(pg)
  const seen = []
  for (const body of [web(), app({ readIds: [snap.items[0].id] }), web({ readIds: [snap.items[1].id] }), app(), web()]) seen.push(await ask(d, body))
  assert.deepEqual(seen.map((r) => r.source), ['claimed', 'account', 'account', 'account', 'account'])
  for (const r of seen) assert.equal(content(r.edition), content(seen[0].edition))
  assert.equal(d.composes, 1)
  assert.equal(pg.writes().length, 1)
})

test('(i) een toestel dat net anders rekent dan je account (een bron minder): de rij zoals ze is, niet opnieuw gerekend', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }])
  const d = deps(pg)
  const a = await ask(d, web())
  const odd = await ask(d, app({ followed: base.followed.slice(1) }))
  assert.equal(odd.source, 'account')
  assert.equal(JSON.stringify(odd.edition), JSON.stringify(pg.table[0].edition), 'byte voor byte de rij, zonder de afdruk van de vraag')
  assert.equal(content(odd.edition), content(a.edition))
  // Ook daarna, om en om: steeds dezelfde.
  for (const body of [web(), app({ followed: base.followed.slice(1) }), web()]) assert.equal(content((await ask(d, body)).edition), content(a.edition))
  assert.equal(d.composes, 1)
  assert.equal(pg.writes().length, 1)
})

test('(ii) je koos echt andere interesses en dat staat in je account: een nieuwe Editie (claimed)', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }])
  const d = deps(pg)
  const a = await ask(d, web())
  const less = { interests: NEW.interests.filter((i) => i !== 'cultuur'), topics: NEW.topics.filter((t) => !['muziek', 'film', 'boeken', 'kunst', 'media', 'games'].includes(t)) }
  pg.table[0].prefs = prefsFor({ ...less, rubrieken: RUBRIEKEN })
  const b = await ask(d, web(less))
  assert.equal(b.source, 'claimed')
  assert.notEqual(b.edition.basis, a.edition.basis)
  // Een toestel dat de nieuwe keuze nog niet ophaalde, schrijft er niet overheen: de nieuwe Editie, zoals ze is.
  const c = await ask(d, app())
  assert.equal(c.source, 'account')
  assert.equal(content(c.edition), content(b.edition))
  assert.equal(d.composes, 2)
  assert.equal(pg.writes().length, 2)
})

test('(iii) het web vraagt vóór zijn instellingen in je account staan: de rij zonder nieuwe stempel, daarna een nieuwe Editie', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }])
  const d = deps(pg)
  const a = await ask(d, web())
  const less = { interests: NEW.interests.filter((i) => i !== 'cultuur'), topics: NEW.topics.filter((t) => !['muziek', 'film', 'boeken', 'kunst', 'media', 'games'].includes(t)) }
  const early = await ask(d, web(less))
  assert.equal(early.source, 'account')
  assert.equal(early.edition.basis, a.edition.basis, 'niet gestempeld met de nieuwe afdruk: het web vraagt een volgende ronde opnieuw')
  assert.equal(d.composes, 1)
  // Twee seconden later staan je instellingen in je account; de volgende ronde geeft je keuze.
  pg.table[0].prefs = prefsFor({ ...less, rubrieken: RUBRIEKEN })
  const later = await ask(d, web(less))
  assert.equal(later.source, 'claimed')
  assert.notEqual(content(later.edition), content(a.edition))
})

test('(iv) een deploy met een nieuwe revisie en een nieuwe feedronde binnen het dagdeel: de Editie blijft staan', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }])
  const d = deps(pg)
  const a = await ask(d, web())
  // De rij werd vastgelegd door een vorige revisie van De Redacteur.
  pg.table[0].edition = { ...pg.table[0].edition, revision: 'redacteur-oud' }
  // Een feedronde later: de kern heeft een andere stand en de delen zijn anders.
  const later = { ...start, meta: { updatedAt: '2026-11-15T07:10:52Z' } }
  const d2 = deps(pg, { start: async () => later, items: async () => ((d2.composes += 1), snap.items.slice(0, 20)) })
  for (const body of [web(), app(), web({ readIds: snap.items.slice(0, 5).map((i) => i.id) })]) {
    const r = await ask(d2, body)
    assert.equal(r.source, 'account')
    assert.equal(content(r.edition), content(a.edition))
    assert.equal(r.edition.revision, 'redacteur-oud')
  }
  assert.equal(d2.composes, 0, 'bij een treffer worden de delen niet eens gelezen')
  assert.equal(pg.writes().length, 1)
})

test('(v) je account is even niet te lezen of te schrijven: de kopie van dit dagdeel, geen 503', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }])
  const d = deps(pg)
  const a = await ask(d, web())
  assert.ok(d.kv.m.has(memberCopyKey(UID, start.edition.id)), 'na de claim staat er een kopie')
  const broken = { from() { throw new Error('weg') } }
  const d2 = { ...d, clientFor: () => broken }
  for (const body of [web(), app()]) {
    const r = await ask(d2, body)
    assert.equal(r.status, 200)
    assert.equal(r.source, 'account')
    assert.equal(content(r.edition), content(a.edition))
  }
  // Zonder kopie: nog steeds een 503 (en het vangnet op het toestel).
  assert.equal((await ask({ ...d2, kv: memKv() }, web())).status, 503)
  // Het vastleggen mislukt (de rij is een vorig dagdeel, de PATCH faalt): ook dan de kopie.
  const pg3 = fakePostgrest([{ user_id: UID, edition: { ...a.edition, id: 'ouder-dagdeel', builtAt: '2026-01-01T00:00:00Z' }, prefs: prefsFor() }])
  const failing = { from: (t) => { const q = pg3.client.from(t); return { select: (...x) => q.select(...x), update: () => { throw new Error('schrijven mislukt') } } } }
  const r3 = await ask({ ...deps(pg3), kv: d.kv, clientFor: () => failing }, web())
  assert.equal(r3.status, 200)
  assert.equal(content(r3.edition), content(a.edition))
})

test('(vi) de claim verloren aan een Editie van dit dagdeel: die Editie, nooit een Editie naast je account', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }])
  const d = deps(pg)
  // Web en iPhone tegelijk: beide lezen een lege rij en rekenen; één wint.
  const [x, y] = await Promise.all([ask(d, web()), ask(d, app())])
  assert.deepEqual([x.source, y.source].sort(), ['account', 'claimed'])
  assert.equal(content(x.edition), content(y.edition))
  assert.equal(pg.writes().length, 1)
  // Ook als de verliezer net anders rekent dan je account.
  const pg2 = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }])
  const d2 = deps(pg2)
  const [p, q] = await Promise.all([ask(d2, web()), ask(d2, app({ followed: base.followed.slice(1) }))])
  assert.ok(![p.source, q.source].includes('composed'))
  assert.equal(content(p.edition), content(q.edition))
  assert.equal(content(p.edition), content(pg2.table[0].edition))
})

test('(vii) zonder account: de cache hangt niet aan de revisie, dus een deploy midden in het dagdeel geeft een treffer', async () => {
  const p = profileOf(start, web())
  const key = anonKey(start.edition.id, p, [])
  assert.ok(!key.includes(EDITOR_REVISION))
  assert.match(key, new RegExp(`^pe:${start.edition.id}:[0-9a-f]{64}$`))
  const kv = memKv()
  const d = { start: async () => start, items: async (s, f) => snap.items.filter((i) => f.includes(i.source)), kv }
  const a = await ask(d, web(), null)
  assert.equal(a.source, 'composed')
  const b = await ask(d, web(), null)
  assert.equal(b.source, 'cache')
  assert.equal(content(b.edition), content(a.edition))
  // Wat je las blijft in de sleutel: dat komt bewust niet terug.
  assert.notEqual(anonKey(start.edition.id, profileOf(start, web({ readIds: [snap.items[0].id] })), []), key)
})

test('(viii) geen rij in user_state: twee vragen geven dezelfde Editie (de kopie), één keer gerekend', async () => {
  const pg = fakePostgrest([])
  const d = deps(pg)
  const a = await ask(d, web())
  assert.equal(a.source, 'kopie')
  const b = await ask(d, app())
  const c = await ask(d, web({ readIds: [snap.items[0].id] }))
  assert.deepEqual([b.source, c.source], ['account', 'account'])
  assert.equal(content(b.edition), content(a.edition))
  assert.equal(content(c.edition), content(a.edition))
  assert.equal(d.composes, 1)
  assert.equal(pg.writes().length, 0)
})

test('een treffer schrijft de kopie niet bij elke vraag opnieuw', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }])
  const d = deps(pg)
  let sets = 0
  const set = d.kv.set
  d.kv.set = async (k, v) => (sets++, set(k, v))
  for (const body of [web(), web(), app(), web()]) await ask(d, body)
  assert.equal(sets, 1)
})

test('na elke deploy wordt /api/edition warm gemaakt (alleen met een adres van de site)', async () => {
  const seen = []
  assert.equal(await warmAfterDeploy('https://x.test', async (b) => (seen.push(b), 204)), 204)
  assert.deepEqual(seen, ['https://x.test'])
  assert.equal(await warmAfterDeploy('', async () => 204), 0)
})

test('(viii) eerst geen rij, daarna maakt de sync er een (zonder Editie): de kopie wordt vastgelegd, niet opnieuw gerekend', async () => {
  const pg = fakePostgrest([])
  const d = deps(pg)
  const a = await ask(d, web())
  assert.equal(a.source, 'kopie')
  pg.table.push({ user_id: UID, edition: null, prefs: prefsFor() })
  const b = await ask(d, app())
  assert.equal(b.source, 'account')
  assert.equal(content(b.edition), content(a.edition))
  assert.equal(content(pg.table[0].edition), content(a.edition), 'nu in je account')
  assert.equal(d.composes, 1)
  assert.equal(content((await ask(d, web())).edition), content(a.edition))
  assert.equal(d.composes, 1)
})

// Keuring 1 en 2: de eerste schrijver wint ook als die eerste schrijver afwijkt van je account ('s ochtends eerst de
// iPhone, iOS zonder `onderwerpen`, een oudere bronnenlijst). De server zet het merk van je account op de rij
// (`prefsMark`) en rekent alleen opnieuw als dat merk sindsdien veranderde.
const odd = () => app({ followed: base.followed.slice(1) })

test('een afwijkend toestel vraagt eerst, daarna het web dat bij je account past: één Editie, één keer gerekend en geschreven', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }])
  const d = deps(pg)
  const seen = []
  for (const body of [odd(), web(), odd(), web()]) seen.push(await ask(d, body))
  assert.deepEqual(seen.map((r) => r.source), ['claimed', 'account', 'account', 'account'])
  for (const r of seen) assert.equal(content(r.edition), content(seen[0].edition))
  assert.equal(d.composes, 1)
  assert.equal(pg.writes().length, 1)
  // Vastgelegd met het merk van je account, en samengesteld met de keuze uit je account: het web herkent haar.
  const acct = accountBasesOf(start, prefsFor())
  assert.equal(pg.table[0].edition.prefsMark, prefsMarkOf(prefsFor()))
  assert.ok(acct.includes(pg.table[0].edition.basis))
  assert.equal(seen[1].edition.basis, basesOf(profileOf(start, web()))[0], 'het web krijgt haar met zijn eigen afdruk')
})

test('een afwijkend toestel en het web tegelijk, daarna het web nog eens: één Editie, één keer gerekend en geschreven', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }])
  const d = deps(pg)
  const [x, y] = await Promise.all([ask(d, odd()), ask(d, web())])
  const z = await ask(d, web())
  assert.ok(![x.source, y.source, z.source].includes('composed'))
  assert.equal(z.source, 'account')
  for (const r of [y, z]) assert.equal(content(r.edition), content(x.edition))
  assert.equal(content(x.edition), content(pg.table[0].edition))
  assert.equal(d.composes, 1)
  assert.equal(pg.writes().length, 1)
})

test('een rij die een toestel zelf vastlegde (het vangnet van iOS, zonder merk): blijft het hele dagdeel staan', async () => {
  // Het afwijkende toestel stelde zelf samen en claimde; de rij draagt zijn eigen afdruk en geen merk.
  const own = await ask(deps(fakePostgrest([])), odd())
  const row = { ...own.edition, owner: UID, prefsMark: undefined, server: undefined }
  const pg = fakePostgrest([{ user_id: UID, edition: JSON.parse(JSON.stringify(row)), prefs: prefsFor() }])
  const d = deps(pg)
  for (const body of [web(), app(), web(), odd()]) {
    const r = await ask(d, body)
    assert.equal(r.source, 'account')
    assert.equal(content(r.edition), content(row))
  }
  assert.equal(d.composes, 0)
  assert.equal(pg.writes().length, 0)
})

// Punt 1 (keuring): het merk hangt alleen aan je keuze in `prefs`, niet aan de bronnenlijst of de code. Haalt een deploy
// plus feedronde een gevolgde basisbron uit de lijst (14 november: Times of Israel, Reason, dode adressen), dan filteren
// server en web die bron allebei weg, maar je keuze is dezelfde: de Editie blijft staan.
test('een gevolgde basisbron verdwijnt binnen het dagdeel uit de bronnenlijst: de Editie blijft staan', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null, prefs: prefsFor() }])
  let cur = start
  const d = deps(pg, { start: async () => cur })
  const a = await ask(d, web())
  const gone = news.find((s) => !s.optional && base.followed.includes(s.id)).id
  cur = { ...start, sources: start.sources.filter((s) => s.id !== gone) }
  const seen = [await ask(d, web()), await ask(d, app())]
  assert.equal(a.source, 'claimed')
  assert.deepEqual(seen.map((r) => r.source), ['account', 'account'])
  for (const r of seen) assert.equal(content(r.edition), content(a.edition))
  assert.equal(d.composes, 1)
  assert.equal(pg.writes().length, 1)
})

test('het merk volgt alleen de keuzevelden in je account, ongeacht volgorde of andere instellingen', () => {
  const p = prefsFor()
  assert.equal(prefsMarkOf(null), null)
  assert.equal(prefsMarkOf({}), null)
  assert.equal(prefsMarkOf({ ...p, theme: 'dark', taste: { topics: { klimaat: 2 } } }), prefsMarkOf(p))
  assert.equal(prefsMarkOf({ ...p, topics: [...p.topics].reverse(), muted: [...p.muted].reverse() }), prefsMarkOf(p))
  assert.notEqual(prefsMarkOf({ ...p, interests: p.interests.slice(1) }), prefsMarkOf(p))
  assert.notEqual(prefsMarkOf({ ...p, muted: [...p.muted, base.followed[0]] }), prefsMarkOf(p))
})
