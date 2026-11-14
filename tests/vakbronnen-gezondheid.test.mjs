// B13 (nachttest 14 november): vakbronnen op de server bleven op kapot staan. Een mislukking liet geen reden achter,
// een weigering door de uitgever zag eruit als elke andere fout, en een bron op pauze kwam alleen terug in een
// maandagronde met alle bronnen tegelijk, die de tijdgrens van de functie niet haalde en niets wegschreef.
// Deze toetsen leggen het algemene patroon vast: reden bewaren, weigering apart, elk uur een paar opnieuw, en een
// ronde die op tijd klaar is (wat niet aan de beurt kwam, telt niet als mislukt).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { updateHealth, healthOf, healthReport, sourcesToLoad, loadVakItems, addOgImages, RETRY_PER_HOUR } from '../netlify/lib/vak.mjs'
import { feedError, loadSourceWithRetry } from '../netlify/lib/rss.mjs'
import { failureLine } from '../netlify/lib/vakRefresh.mjs'

const day = 864e5
const t0 = Date.parse('2026-11-01T10:00:00Z')
const iso = (t) => new Date(t).toISOString()

test('feedError: 401, 403, 429 en een botcontrole heten geweigerd, de rest gewoon HTTP n', () => {
  assert.equal(feedError(403, new Headers()), 'geweigerd: HTTP 403')
  assert.equal(feedError(401, new Headers()), 'geweigerd: HTTP 401')
  assert.equal(feedError(429, new Headers()), 'geweigerd: HTTP 429')
  assert.equal(feedError(503, new Headers({ 'cf-mitigated': 'challenge' })), 'geweigerd: HTTP 503 (cf-mitigated: challenge)')
  assert.equal(feedError(404, new Headers()), 'HTTP 404')
  assert.equal(feedError(500, {}), 'HTTP 500')
})

test('updateHealth bewaart de reden van de laatste mislukking, en een gelukte ronde wist de weigering', () => {
  let h = updateHealth({}, [{ id: 'a', ok: false, error: 'geweigerd: HTTP 403', refused: true }, { id: 'b', ok: false, error: 'The operation was aborted due to timeout', refused: false }], t0)
  assert.equal(h.a.lastError, 'geweigerd: HTTP 403')
  assert.equal(h.a.lastErrorAt, iso(t0))
  assert.equal(h.a.refused, true)
  assert.equal(h.b.refused, false)
  // Een week later nog steeds niets: de een is geweigerd, de ander kapot.
  const later = t0 + 8 * day
  h = updateHealth(h, [{ id: 'a', ok: false, error: 'geweigerd: HTTP 403', refused: true }, { id: 'b', ok: false, error: 'HTTP 500', refused: false }], later)
  assert.equal(healthOf(h.a, later), 'geweigerd')
  assert.equal(healthOf(h.b, later), 'kapot')
  assert.equal(h.b.lastError, 'HTTP 500')
  // Een melding over meer regels (de parser) wordt één korte regel.
  assert.equal(updateHealth({}, [{ id: 'c', ok: false, error: 'Attribute without value\nLine: 28\nColumn: 72' }], later).c.lastError, 'Attribute without value Line: 28 Column: 72')
  // Werkt hij weer, dan is hij gewoon gezond; de laatste fout blijft als geschiedenis staan.
  h = updateHealth(h, [{ id: 'a', ok: true, newest: iso(later) }], later + 3600e3)
  assert.equal(healthOf(h.a, later + 3600e3), 'ok')
  assert.equal(h.a.refused, undefined)
  assert.equal(h.a.lastError, 'geweigerd: HTTP 403')
})

test('updateHealth: een bron die niet aan de beurt kwam, krijgt geen oordeel', () => {
  const before = { a: { since: iso(t0), lastOk: iso(t0) } }
  const h = updateHealth(before, [{ id: 'a', skipped: true }, { id: 'nieuw', skipped: true }], t0 + day)
  assert.deepEqual(h.a, before.a)
  assert.equal(h.nieuw, undefined)
})

test('healthReport toont de stand geweigerd en de reden bij de bronnen op pauze', () => {
  const at = t0 + 8 * day
  const health = updateHealth(updateHealth({}, [{ id: 'a', ok: false, error: 'geweigerd: HTTP 403', refused: true }, { id: 'b', ok: true, newest: iso(t0) }], t0), [{ id: 'a', ok: false, error: 'geweigerd: HTTP 403', refused: true }, { id: 'b', ok: true, newest: iso(at) }], at)
  const r = healthReport(health, at, [{ id: 'a', name: 'A', fields: ['film'], urls: ['u'] }, { id: 'b', name: 'B', fields: ['film'], urls: ['v'] }])
  assert.equal(r.paused.length, 1)
  assert.equal(r.paused[0].state, 'geweigerd')
  assert.equal(r.paused[0].lastError, 'geweigerd: HTTP 403')
  assert.equal(r.paused[0].lastErrorAt, iso(at))
  assert.deepEqual(r.fields, [{ id: 'film', label: 'Film & series', sources: 2, healthy: 1 }])
})

test('sourcesToLoad: elk uur hooguit RETRY_PER_HOUR bronnen op pauze, de langst niet geprobeerde eerst, en zo komen ze allemaal aan de beurt', () => {
  const since = iso(t0 - 30 * day)
  const n = RETRY_PER_HOUR + 5
  const sources = Array.from({ length: n }, (_, k) => ({ id: 'p' + k })).concat([{ id: 'gezond' }])
  // Elke bron op pauze faalde het laatst op een andere dag: p0 het langst geleden.
  let health = Object.fromEntries(sources.filter((s) => s.id !== 'gezond').map((s, k) => [s.id, { since, lastFail: iso(t0 - (20 - k) * day) }]))
  health.gezond = { since, lastOk: iso(t0), newest: iso(t0) }
  // Een dinsdag, en ook op maandagochtend niet meer alles tegelijk.
  for (const now of [Date.parse('2026-11-03T10:30:00Z'), Date.parse('2026-11-02T05:30:00Z')]) {
    const ids = sourcesToLoad(health, now, sources).map((s) => s.id)
    assert.equal(ids.length, RETRY_PER_HOUR + 1)
    assert.deepEqual(ids.slice(0, RETRY_PER_HOUR), sources.slice(0, RETRY_PER_HOUR).map((s) => s.id), 'de langst niet geprobeerde eerst, vooraan')
    assert.equal(ids.at(-1), 'gezond')
  }
  // Na een ronde waarin de eerste tien weer faalden, zijn de volgende aan de beurt.
  let now = Date.parse('2026-11-03T10:30:00Z')
  const seen = new Set()
  for (let round = 0; round < 3; round++) {
    const batch = sourcesToLoad(health, now, sources).filter((s) => s.id !== 'gezond')
    batch.forEach((s) => seen.add(s.id))
    health = updateHealth(health, batch.map((s) => ({ id: s.id, ok: false, error: 'HTTP 500' })), now)
    now += 3600e3
  }
  assert.equal(seen.size, n, 'binnen een paar uur is elke bron op pauze opnieuw geprobeerd')
})

test('sourcesToLoad: een bron op pauze die weer werkt, doet weer mee', () => {
  const since = iso(t0 - 30 * day)
  const sources = [{ id: 'a' }]
  let health = { a: { since, lastOk: iso(t0 - 20 * day), lastFail: iso(t0 - day), refused: true } }
  assert.equal(healthOf(health.a, t0), 'geweigerd')
  assert.deepEqual(sourcesToLoad(health, t0, sources).map((s) => s.id), ['a'])
  health = updateHealth(health, [{ id: 'a', ok: true, newest: iso(t0) }], t0)
  assert.equal(healthOf(health.a, t0), 'ok')
})

test('loadVakItems: hooguit `concurrency` tegelijk, en na de eindtijd telt een bron als niet geprobeerd, niet als mislukt', async () => {
  const sources = Array.from({ length: 10 }, (_, k) => ({ id: 's' + k, urls: ['https://example.invalid/' + k] }))
  let busy = 0
  let most = 0
  const load = async (src) => {
    busy++
    most = Math.max(most, busy)
    await new Promise((r) => setTimeout(r, src.id === 's1' ? 400 : 30))
    busy--
    return src.id === 's2' ? { id: src.id, ok: false, count: 0, items: [], error: 'geweigerd: HTTP 403', refused: true } : { id: src.id, ok: true, count: 0, items: [] }
  }
  const { status } = await loadVakItems(sources, { concurrency: 3, deadline: Date.now() + 150, load })
  assert.ok(most <= 3)
  const byId = Object.fromEntries(status.map((r) => [r.id, r]))
  assert.equal(byId.s0.ok, true)
  assert.deepEqual(byId.s2, { id: 's2', ok: false, count: 0, newest: null, error: 'geweigerd: HTTP 403', refused: true })
  assert.deepEqual(byId.s1, { id: 's1', skipped: true }, 'te traag voor de eindtijd: geen oordeel')
  assert.deepEqual(byId.s9, { id: 's9', skipped: true }, 'na de eindtijd niet meer begonnen')
  // Zonder eindtijd komt alles aan de beurt.
  const all = await loadVakItems(sources, { concurrency: 4, load })
  assert.ok(all.status.every((r) => !r.skipped))
})

test('loadSourceWithRetry: geen herhaling bij een weigering, en niet voorbij de eindtijd', async () => {
  let calls = 0
  const refused = async () => (calls++, { id: 'x', ok: false, error: 'geweigerd: HTTP 403', refused: true })
  assert.equal((await loadSourceWithRetry({ id: 'x' }, null, { loadOne: refused })).refused, true)
  assert.equal(calls, 1)
  calls = 0
  const flaky = async () => (calls++, calls === 1 ? { id: 'x', ok: false, error: 'HTTP 502' } : { id: 'x', ok: true })
  assert.equal((await loadSourceWithRetry({ id: 'x' }, null, { loadOne: flaky })).ok, true, 'een korte hapering: de herhaling lukt')
  calls = 0
  assert.equal((await loadSourceWithRetry({ id: 'x' }, null, { loadOne: flaky, deadline: Date.now() + 500 })).ok, false, 'te weinig tijd over: geen herhaling')
  assert.equal(calls, 1)
  // Een herhaling die langer duurt dan de eindtijd: de ronde wacht niet, de eerste poging telt.
  calls = 0
  const slow = async () => (calls++, calls === 1 ? { id: 'x', ok: false, error: 'HTTP 502' } : new Promise((r) => setTimeout(() => r({ id: 'x', ok: true }), 3000)))
  const t = Date.now()
  const r = await loadSourceWithRetry({ id: 'x' }, null, { loadOne: slow, deadline: t + 1600 })
  assert.equal(r.error, 'HTTP 502')
  assert.ok(Date.now() - t < 2500)
})

test('addOgImages: na de eindtijd geen nieuw groepje; wat niet aan de beurt kwam, blijft voor later', async () => {
  const pool = Array.from({ length: 12 }, (_, k) => ({ id: 'i' + k, url: 'https://example.invalid/' + k, publishedAt: iso(t0 - k * 1000) }))
  const tried = await addOgImages(pool, { max: 12, deadline: Date.now() + 1100, load: async () => (await new Promise((r) => setTimeout(r, 200)), null) })
  assert.equal(tried, 6)
  assert.equal(pool.filter((i) => i.ogTried).length, 6)
})

test('failureLine: één logregel met de mislukte bronnen en hun reden', () => {
  assert.equal(failureLine([{ id: 'a', ok: true }]), null)
  assert.equal(
    failureLine([{ id: 'a', ok: true }, { id: 'vak:emerce', ok: false, error: 'geweigerd: HTTP 403' }, { id: 'c', skipped: true }]),
    'vak-refresh: 1 van 2 bronnen mislukt, 1 niet aan de beurt: vak:emerce (geweigerd: HTTP 403)',
  )
})
