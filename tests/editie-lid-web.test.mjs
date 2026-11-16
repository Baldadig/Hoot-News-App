// Editiefix W1 (16 november 2026): een lid krijgt op het web nooit een eigen samengestelde Editie. Toen de server elke
// vraag als lid met een 502 beantwoordde, rekenden web en iPhone elk hun eigen vangnet, met eigen invoer: twee Edities
// in hetzelfde dagdeel. Nu, zonder antwoord van de server: de Editie van dit dagdeel uit je account (PostgREST), anders je
// vorige Editie uit je account met "De ...editie komt eraan", en opnieuw vragen met een oplopende pauze (O4). Zolang je
// account nog laadt: niet als anon vragen en niets overschrijven (O8).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { serverFirst, retryDelay, mayAskServer, readAccountEdition, RETRY_DELAYS_MS, RETRY_MAX } from '../src/lib/editionSync.js'
import { holdFor, comingLine } from '../shared/dagdeel-wissel.mjs'
import { fakePostgrest } from './helpers/pgrest.mjs'

const UID = '00000000-0000-4000-8000-0000000000bb'
const global = { id: '2026-11-16-ochtend', slot: 'ochtend', builtAt: '2026-11-16T05:31:00.000Z' }
const row = (id, builtAt, extra = {}) => ({ id, builtAt, owner: UID, basis: 'acct', server: true, entries: [{ kind: 'item', id: `x-${id}` }], ...extra })
const now = row(global.id, global.builtAt)
const before = row('2026-11-15-avond', '2026-11-15T16:00:00.000Z')
const later = row('2026-11-16-middag', '2026-11-16T11:00:00.000Z')
const never = () => assert.fail('een lid stelt niet zelf samen')
const base = { global, owner: UID, basis: 'eigen', request: {}, ready: true, compose: never }

test('W1: de server faalt (502, 503, te traag) en je account heeft de Editie van dit dagdeel: die, bewaard, niets samengesteld', async () => {
  for (const status of [0, 429, 500, 502, 503, 504]) {
    const r = await serverFirst({ ...base, ask: async () => ({ status, edition: null }), readAccount: async () => now })
    assert.equal(r.source, 'account', `status ${status}`)
    assert.equal(r.keep, true)
    assert.equal(r.edition.id, global.id)
    assert.equal(r.edition.owner, UID)
    assert.deepEqual(r.edition.entries, now.entries)
  }
  // Een rij zonder owner (een oudere schrijver) krijgt die van deze lezer.
  const bare = await serverFirst({ ...base, ask: async () => ({ status: 502 }), readAccount: async () => ({ ...now, owner: undefined }) })
  assert.equal(bare.edition.owner, UID)
})

test('W1: de rij van een ander lid of zonder plekken telt niet', async () => {
  for (const theirs of [{ ...now, owner: 'iemand-anders' }, { ...now, entries: null }, null]) {
    const r = await serverFirst({ ...base, ask: async () => ({ status: 502 }), readAccount: async () => theirs })
    assert.deepEqual([r.source, r.edition, r.previous], ['wait', null, null])
  }
})

test('W1: alleen de Editie van het vorige dagdeel in je account: die blijft staan met "komt eraan", niets samengesteld', async () => {
  const r = await serverFirst({ ...base, ask: async () => ({ status: 0 }), readAccount: async () => before })
  assert.equal(r.source, 'wait')
  assert.equal(r.edition, null)
  assert.equal(r.keep, false)
  assert.equal(r.previous.id, before.id)
  // Zo toont de hook haar (usePersonalEdition: `last` is de vorige uit je account als er niets in beeld was).
  const held = holdFor({ held: null, shown: null, last: r.previous, global, owner: UID })
  assert.equal(held.id, before.id)
  assert.equal(comingLine(global.slot), 'De Ochtendeditie komt eraan')
})

test('W1: een antwoord van een eerder dagdeel (de server loopt achter) wordt niet getoond; je account wel', async () => {
  const r = await serverFirst({ ...base, ask: async () => ({ status: 200, edition: before }), readAccount: async () => now })
  assert.equal(r.source, 'account')
  assert.equal(r.edition.id, global.id)
})

test('W1: je account heeft al een later dagdeel (de kern hier loopt achter): bewaren als ahead, niets samenstellen', async () => {
  const r = await serverFirst({ ...base, ask: async () => ({ status: 503 }), readAccount: async () => later })
  assert.equal(r.source, 'ahead')
  assert.equal(r.ahead.id, later.id)
  assert.equal(r.edition, null)
})

test('W1: je account is ook niet te lezen, of je bent offline: wachten, niets samenstellen', async () => {
  const fail = await serverFirst({ ...base, ask: async () => ({ status: 502 }), readAccount: async () => { throw new Error('netwerk') } })
  assert.deepEqual([fail.source, fail.edition], ['wait', null])
  const off = await serverFirst({ ...base, online: false, ask: async () => assert.fail('offline'), readAccount: async () => assert.fail('offline') })
  assert.deepEqual([off.source, off.edition], ['wait', null])
})

test('W1: de server antwoordt wel: zijn Editie, en je account wordt niet gelezen', async () => {
  const mine = { ...now, basis: 'eigen' }
  const r = await serverFirst({ ...base, ask: async () => ({ status: 200, edition: mine }), readAccount: async () => assert.fail('niet nodig') })
  assert.deepEqual([r.source, r.keep], ['server', true])
})

test('W1: zonder account blijft het vangnet zoals het was', async () => {
  const r = await serverFirst({ ...base, owner: 'anon', ask: async () => ({ status: 502 }), compose: async () => ({ id: global.id, entries: [] }), readAccount: async () => assert.fail('anon leest geen account') })
  assert.equal(r.source, 'provisional')
  assert.equal(r.edition.provisional, true)
})

test('W1: readAccountEdition leest je rij via PostgREST (de nep-Supabase)', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: now }])
  assert.deepEqual(await readAccountEdition(pg.client, UID), now)
  assert.equal(pg.log[0].method, 'GET')
  assert.equal(pg.writes().length, 0, 'alleen lezen')
})

test('O4: opnieuw vragen met een oplopende pauze bij 0, 429, 5xx en een onbruikbare 200; niet bij 4xx', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 9].map((n) => retryDelay(502, n)), [3000, 10000, 30000, 60000, 60000, 60000])
  assert.deepEqual(RETRY_DELAYS_MS, [3000, 10000, 30000, 60000])
  for (const s of [0, 200, 500, 502, 503, 504]) assert.equal(retryDelay(s, 0), 3000, `status ${s}`)
  assert.equal(retryDelay(429, 0), 60000, '429: niet eerder dan de server vraagt')
  for (const s of [400, 401, 403, 404, 413]) assert.equal(retryDelay(s, 0), null, `status ${s}`)
  assert.equal(retryDelay(502, RETRY_MAX), null, 'begrensd')
})

test('O8: zolang je account laadt niet vragen; als lid na het ophalen, of als het ophalen mislukte', () => {
  assert.equal(mayAskServer({ uid: null, loading: true }), false, 'het account laadt: niet als anon vragen')
  assert.equal(mayAskServer({ uid: null }), true, 'zonder account')
  assert.equal(mayAskServer({ uid: UID, pulled: false, sync: 'syncing' }), false, 'lid, nog aan het ophalen')
  assert.equal(mayAskServer({ uid: UID, pulled: true }), true)
  assert.equal(mayAskServer({ uid: UID, pulled: false, sync: 'error' }), true, 'het ophalen mislukte: de server leest je account zelf')
})

test('de hook: geen vangnet voor leden, je account als terugval, opnieuw vragen, en niets terwijl je account laadt', () => {
  const hook = readFileSync(new URL('../src/hooks/usePersonalEdition.js', import.meta.url), 'utf8')
  assert.match(hook, /const loading = account\?\.status === 'loading'/)
  assert.match(hook, /if \(!global \|\| !followed\.length \|\| loading\) return/, 'O8: niets vragen of bewaren zolang het account laadt')
  assert.match(hook, /const mayAsk = mayAskServer\(\{ uid, pulled, sync: sync\?\.status \|\| null, loading \}\)/)
  assert.match(hook, /readAccount: uid && account\.client \? \(\) => readAccountEdition\(account\.client, uid\) : null/)
  assert.match(hook, /compose: uid \? null : async/, 'alleen zonder account zelf samenstellen')
  assert.match(hook, /retryDelay\(answered\?\.status \?\? 0, n\)/)
  assert.match(hook, /setTimeout\(\(\) => setNonce\(\(x\) => x \+ 1\), wait\)/)
  assert.match(hook, /!uid \|\| !provisional\.provisional/, 'een zelf samengestelde Editie nooit voor een lid')
  assert.match(hook, /return uid \? \[readJSON\(KEY, null\)\] : \[readJSON\(KEY, null\), readJSON\(PROVISIONAL_KEY, null\)\]/)
  assert.match(hook, /last: lastShown\.current \|\| \(accountPrev\?\.owner === owner \? accountPrev : null\)/)
})
