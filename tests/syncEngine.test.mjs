import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SyncEngine, ownerAction, ownerOf, forgetAccount, savedOps, OWNER_KEY, BASE_KEY } from '../src/lib/syncEngine.js'

const storage = (init = {}) => {
  const m = new Map(Object.entries(init))
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}
// Een nep-server met dezelfde vorm als Supabase; `fail` laat de volgende schrijfacties mislukken.
function server(init = {}) {
  const db = { prefs: {}, read: [], seen: {}, saved: {}, ...structuredClone(init) }
  const s = { db, fail: 0, calls: [] }
  const guard = (name) => {
    s.calls.push(name)
    if (s.fail > 0) {
      s.fail--
      throw new Error('netwerk')
    }
  }
  s.api = {
    pull: async () => (guard('pull'), structuredClone(db)),
    pushState: async (l) => (guard('pushState'), Object.assign(db, { prefs: structuredClone(l.prefs), read: [...l.read], seen: { ...l.seen } })),
    upsertSaved: async (rows) => (guard('upsert'), rows.forEach(([k, v]) => (db.saved[k] = structuredClone(v)))),
    deleteSaved: async (keys) => (guard('delete'), keys.forEach((k) => delete db.saved[k])),
  }
  return s
}
// Een "app": lokale toestand, plus een klok die we zelf vooruitzetten (geplande pogingen).
function app(local, { online = true } = {}) {
  const a = { local: structuredClone(local), timers: [], online }
  a.opts = {
    getLocal: () => a.local,
    setLocal: (next) => (a.local = next),
    schedule: (fn, ms) => (a.timers.push({ fn, ms }), a.timers.length),
    cancel: (id) => id && (a.timers[id - 1] = null),
    isOnline: () => a.online,
  }
  a.tick = async () => {
    const due = a.timers.filter(Boolean)
    a.timers = []
    for (const t of due) await t.fn()
  }
  return a
}
const empty = { prefs: { layout: 'krant' }, read: [], seen: {}, saved: {} }
const entry = (id, savedAt = 1) => ({ kind: 'item', savedAt, item: { id, title: id } })

test('eigenaar: zelfde account gaat door, anoniem wordt samengevoegd, een ander account vervangen', () => {
  assert.equal(ownerAction('u1', 'u1'), 'continue')
  assert.equal(ownerAction('anon', 'u1'), 'merge')
  assert.equal(ownerAction(null, 'u1'), 'merge')
  assert.equal(ownerAction('u2', 'u1'), 'replace')
  assert.equal(ownerOf(storage({ 'hoot:synced-user': 'u7' })), 'u7') // toestel van vóór 1.27
})

test('A → uitloggen → B in dezelfde browser: niets van A komt bij B', async () => {
  const ls = storage()
  const A = server()
  const a = app({ ...empty, prefs: { ...empty.prefs, muted: ['nos'] }, read: ['r1'], saved: { x: entry('x') } })
  await new SyncEngine({ uid: 'A', api: A.api, storage: ls, ...a.opts }).start()
  assert.ok(A.db.saved.x) // A's eigen gegevens staan bij A
  forgetAccount(ls, a.opts.setLocal, a.local.prefs) // uitloggen
  assert.deepEqual(a.local.saved, {})
  assert.deepEqual(a.local.read, [])
  assert.equal(a.local.prefs.layout, 'krant') // toestelvoorkeur blijft
  assert.equal(a.local.prefs.muted, undefined)
  assert.equal(ls.getItem(OWNER_KEY), 'anon')
  const B = server({ saved: { y: entry('y') } })
  await new SyncEngine({ uid: 'B', api: B.api, storage: ls, ...a.opts }).start()
  assert.deepEqual(Object.keys(B.db.saved), ['y'])
  assert.deepEqual(B.db.read, [])
  assert.deepEqual(Object.keys(a.local.saved), ['y'])
})

test('A verloopt zonder uitloggen (of inloggen wordt onderbroken), daarna B: A wordt vervangen, niet samengevoegd', async () => {
  const ls = storage({ [OWNER_KEY]: 'A' })
  const a = app({ ...empty, read: ['van-A'], saved: { x: entry('x') }, prefs: { ...empty.prefs, muted: ['nos'] } })
  const B = server({ prefs: { muted: ['nrc'] } })
  await new SyncEngine({ uid: 'B', api: B.api, storage: ls, ...a.opts }).start()
  assert.deepEqual(a.local.saved, {})
  assert.deepEqual(a.local.read, [])
  assert.deepEqual(a.local.prefs.muted, ['nrc'])
  assert.deepEqual(B.db.saved, {})
  assert.equal(B.calls.includes('upsert'), false)
})

test('anoniem lezen en dan inloggen: alleen die anonieme gegevens worden samengevoegd', async () => {
  const ls = storage()
  const a = app({ ...empty, read: ['anon-1'], saved: { z: entry('z', 5) } })
  const S = server({ read: ['srv-1'], saved: { y: entry('y') } })
  await new SyncEngine({ uid: 'C', api: S.api, storage: ls, ...a.opts }).start()
  assert.deepEqual(Object.keys(S.db.saved).sort(), ['y', 'z'])
  assert.deepEqual(S.db.read.sort(), ['anon-1', 'srv-1'])
})

test('mislukt bewaren: blijft openstaan en lukt vanzelf bij de volgende poging', async () => {
  const ls = storage()
  const S = server()
  const a = app(empty)
  const statuses = []
  const e = new SyncEngine({ uid: 'u', api: S.api, storage: ls, ...a.opts, onStatus: (s) => statuses.push(s) })
  await e.start()
  a.local = { ...a.local, saved: { x: entry('x') } }
  S.fail = 1
  e.changed(0)
  await a.tick() // poging 1: mislukt
  assert.equal(e.status, 'error')
  assert.equal(S.db.saved.x, undefined)
  assert.deepEqual(savedOps(JSON.parse(ls.getItem(BASE_KEY)).saved, a.local.saved).upserts, ['x']) // basis niet opgeschoven
  await a.tick() // geplande herhaling, zonder dat de gebruiker iets doet
  assert.ok(S.db.saved.x)
  assert.equal(e.status, 'ok')
  assert.ok(statuses.includes('error') && statuses.at(-1) === 'ok')
})

test('mislukt verwijderen: de verwijdering gaat niet verloren en een ophaalronde zet hem niet terug', async () => {
  const ls = storage()
  const S = server({ saved: { x: entry('x'), y: entry('y') } })
  const a = app(empty)
  const e = new SyncEngine({ uid: 'u', api: S.api, storage: ls, ...a.opts })
  await e.start()
  const { x, ...rest } = a.local.saved
  a.local = { ...a.local, saved: rest }
  S.fail = 1
  e.changed(0)
  await a.tick()
  assert.ok(S.db.saved.x) // nog op de server
  await e.pull() // app komt weer in beeld: ophalen mag x niet terugzetten
  assert.equal(a.local.saved.x, undefined)
  assert.equal(S.db.saved.x, undefined) // en na het ophalen is de verwijdering alsnog gelukt
})

test('mislukte instelling: offline blijft het openstaan, bij "online" gaat het vanzelf', async () => {
  const ls = storage()
  const S = server({ prefs: { muted: [] } })
  const a = app(empty)
  const e = new SyncEngine({ uid: 'u', api: S.api, storage: ls, ...a.opts })
  await e.start()
  a.online = false
  a.local = { ...a.local, prefs: { ...a.local.prefs, muted: ['nos'] } }
  e.changed(0)
  await a.tick()
  assert.equal(e.status, 'pending')
  assert.deepEqual(S.db.prefs.muted, [])
  // Intussen ophalen (ander toestel?) overschrijft de openstaande instelling niet.
  a.online = true
  S.fail = 1 // eerste poging na terugkomst mislukt nog
  await e.online()
  assert.equal(e.status, 'error')
  await a.tick()
  assert.deepEqual(S.db.prefs.muted, ['nos'])
  assert.equal(e.status, 'ok')
})

test('ophalen met openstaande instellingen: lokaal gaat voor, daarna naar de server', async () => {
  const ls = storage()
  const S = server({ prefs: { muted: ['a'] } })
  const a = app(empty)
  const e = new SyncEngine({ uid: 'u', api: S.api, storage: ls, ...a.opts })
  await e.start()
  a.local = { ...a.local, prefs: { ...a.local.prefs, muted: ['lokaal'] } }
  S.db.prefs = { muted: ['ander-toestel'] }
  await e.pull()
  assert.deepEqual(a.local.prefs.muted, ['lokaal'])
  assert.deepEqual(S.db.prefs.muted, ['lokaal'])
})
