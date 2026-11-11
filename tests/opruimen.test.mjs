import { test } from 'node:test'
import assert from 'node:assert/strict'
import { opruimen, expired, slotNumber } from '../netlify/lib/opruimen.mjs'
import { kvSet, kvGet, kvListKeys, kvDelete } from '../netlify/lib/kv.mjs'

const H = (c) => c.repeat(64)
// 11 november 2026, 14:00 Amsterdam = middag. Lopend: 2026-11-11-middag; vorig: 2026-11-11-ochtend.
const NOW = Date.parse('2026-11-11T13:00:00Z')
const rev = 'redacteur-2026-11-11-frisse-ogen-5'

function nepStore(keys, { failDelete = [] } = {}) {
  const s = new Set(keys)
  const log = { error: () => {}, log: () => {} }
  return {
    s, log,
    list: async (prefix) => { assert.ok(prefix && prefix.length >= 2); return [...s].filter((k) => k.startsWith(prefix)) },
    remove: async (k) => { if (failDelete.includes(k)) throw new Error('boem'); s.delete(k) },
  }
}

test('oude pe-, pe-quota- en brief-quota-sleutels gaan weg; lopend en vorig blijven', async () => {
  const oud = [`pe:${rev}:2026-11-10-avond:${H('a')}`, `pe:${rev}:2026-11-09-ochtend:${H('b')}`, `pe-quota:${H('c')}:2026-11-10-middag`, 'brief-quota-user-1-2026-11-09', 'brief-quota-all-2026-11-01']
  const houd = [`pe:${rev}:2026-11-11-middag:${H('a')}`, `pe:${rev}:2026-11-11-ochtend:${H('a')}`, `pe-quota:${H('c')}:2026-11-11-middag`, `pe-quota:${H('c')}:2026-11-11-ochtend`, 'brief-quota-user-1-2026-11-11', 'brief-quota-all-2026-11-10']
  const n = nepStore([...oud, ...houd])
  const r = await opruimen({ now: NOW, list: n.list, remove: n.remove, log: n.log })
  for (const k of oud) assert.ok(!n.s.has(k), k)
  for (const k of houd) assert.ok(n.s.has(k), k)
  assert.equal(r.verwijderd, 5)
  assert.equal(r.bewaard, 6)
  assert.equal(r.fouten, 0)
})

test('het vorige dagdeel over de dagwisseling heen blijft (avond van gisteren om 7 uur vanochtend)', async () => {
  const now = Date.parse('2026-11-11T05:00:00Z') // ochtend (06:00 Amsterdam, voor 06:30: nog avond van gisteren)
  const n = nepStore([`pe:${rev}:2026-11-10-avond:${H('a')}`, `pe:${rev}:2026-11-10-middag:${H('a')}`, `pe:${rev}:2026-11-09-avond:${H('a')}`])
  await opruimen({ now, list: n.list, remove: n.remove, log: n.log })
  assert.deepEqual([...n.s].sort(), [`pe:${rev}:2026-11-10-avond:${H('a')}`, `pe:${rev}:2026-11-10-middag:${H('a')}`].sort())
})

test('andere voorvoegsels blijven staan en worden niet eens opgevraagd', async () => {
  const andere = ['feed-start-v1', 'feed-part-nos', 'vak-pool-v1', 'archief-2026-11-01-ochtend', 'edition-2026-11-01-ochtend', 'pensioen:x', 'pe', 'brief-mine-abc']
  const n = nepStore([...andere, `pe:${rev}:2026-11-01-ochtend:${H('a')}`])
  const gevraagd = []
  const list = async (p) => { gevraagd.push(p); return n.list(p) }
  await opruimen({ now: NOW, list, remove: n.remove, log: n.log })
  assert.deepEqual(gevraagd, ['pe:', 'pe-quota:', 'brief-quota-'])
  for (const k of andere) assert.ok(n.s.has(k), k)
  assert.equal(n.s.size, andere.length)
})

test('onleesbare sleutels blijven staan en tellen als overgeslagen', async () => {
  const raar = ['pe:kapot', `pe:${rev}:2026-13-45-middag:${H('a')}`, `pe:${rev}:2026-11-01-nacht:${H('a')}`, `pe:${rev}:2026-11-01-ochtend:kort`, 'pe-quota:xyz:2026-11-01-ochtend', 'brief-quota-user', 'brief-quota-user-2026-99-99']
  const n = nepStore(raar)
  const r = await opruimen({ now: NOW, list: n.list, remove: n.remove, log: n.log })
  assert.equal(r.overgeslagen, raar.length)
  assert.equal(r.verwijderd, 0)
  assert.equal(n.s.size, raar.length)
})

test('een fout bij verwijderen laat de rest doorgaan; een fout bij opsommen slaat alleen dat voorvoegsel over', async () => {
  const a = `pe:${rev}:2026-11-01-ochtend:${H('a')}`, b = `pe:${rev}:2026-11-01-middag:${H('a')}`, c = 'brief-quota-all-2026-11-01'
  const n = nepStore([a, b, c], { failDelete: [a] })
  const r = await opruimen({ now: NOW, list: n.list, remove: n.remove, log: n.log })
  assert.ok(n.s.has(a) && !n.s.has(b) && !n.s.has(c))
  assert.equal(r.fouten, 1)
  assert.equal(r.verwijderd, 2)
  const n2 = nepStore([a, c])
  const list = async (p) => { if (p === 'pe:') throw new Error('weg'); return n2.list(p) }
  const r2 = await opruimen({ now: NOW, list, remove: n2.remove, log: n2.log })
  assert.ok(n2.s.has(a) && !n2.s.has(c))
  assert.equal(r2.fouten, 1)
})

test('de log bevat geen sleutelinhoud', async () => {
  const regels = []
  const log = { error: (m) => regels.push(m), log: (m) => regels.push(m) }
  const k = `pe:${rev}:2026-11-01-ochtend:${H('a')}`
  const n = nepStore([k], { failDelete: [k] })
  await opruimen({ now: NOW, list: n.list, remove: n.remove, log })
  assert.ok(regels.length > 0)
  for (const m of regels) assert.ok(!m.includes(H('a')) && !m.includes('2026-11-01') && !m.includes(rev), m)
})

test('geheugenmodus: kvListKeys en kvDelete werken, een lege prefix is verboden', async () => {
  await kvSet('pe-quota:' + H('d') + ':2026-11-01-ochtend', 3)
  await kvSet('brief-quota-all-2026-11-01', 3)
  await kvSet('feed-start-v1', { x: 1 })
  await assert.rejects(() => kvListKeys(''))
  const r = await opruimen({ now: NOW, log: { error: () => {}, log: () => {} } })
  assert.ok(r.verwijderd >= 2)
  assert.equal(await kvGet('brief-quota-all-2026-11-01'), null)
  assert.deepEqual(await kvGet('feed-start-v1'), { x: 1 })
  await kvDelete('feed-start-v1')
})

test('slotNumber en expired: ongeldige data en dagdelen geven null', () => {
  assert.equal(slotNumber('2026-02-30', 'ochtend'), null)
  assert.equal(slotNumber('2026-11-01', 'nacht'), null)
  assert.equal(slotNumber('2026-11-02', 'ochtend') - slotNumber('2026-11-01', 'avond'), 1)
  assert.equal(expired('pe:', 'pe:x', { slotNow: 1, dayNow: 1 }), null)
})
