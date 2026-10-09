import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sourceStatus, statusLabel, carryOver } from '../src/lib/sourceStatus.js'

const src = (id, ok = true, followed = true) => ({ id, name: id.toUpperCase(), ok, followed })

test('status verschijnt bij een uitgevallen bron die je volgt', () => {
  const st = sourceStatus([src('nrc'), src('leftlaser', false), src('ft', false, false)])
  assert.deepEqual(st.failed, [{ id: 'leftlaser', name: 'LEFTLASER' }])
  assert.equal(st.allDown, false)
  assert.equal(statusLabel(st.failed.length), 'één bron tijdelijk niet bereikbaar')
})

test('herhaalde fouten stapelen niet op: één status per bron', () => {
  const again = [src('nrc'), src('leftlaser', false)]
  const a = sourceStatus(again)
  const b = sourceStatus([...again, src('leftlaser', false)])
  assert.equal(a.failed.length, 1)
  assert.equal(b.failed.length, 1)
})

test('status verdwijnt na herstel en als de bron wordt uitgezet', () => {
  assert.equal(sourceStatus([src('nrc'), src('leftlaser', true)]).failed.length, 0)
  assert.equal(sourceStatus([src('nrc'), src('leftlaser', false)], new Set(['leftlaser'])).failed.length, 0)
  assert.equal(statusLabel(0), '')
})

test('alle bronnen uit de lucht is iets anders dan één bron', () => {
  assert.equal(sourceStatus([src('nrc', false), src('nos', false)]).allDown, true)
  assert.equal(sourceStatus([src('nrc', false), src('nos')]).allDown, false)
  assert.equal(sourceStatus([]).allDown, false)
})

test('eerder geladen berichten van een uitgevallen bron blijven staan', () => {
  const prev = { sources: [src('nrc'), src('nos')], items: [{ id: 'n1', source: 'nrc', publishedAt: '2026-10-09T05:00:00Z' }, { id: 'o1', source: 'nos', publishedAt: '2026-10-09T04:00:00Z' }] }
  const next = { sources: [src('nrc', false), src('nos')], items: [{ id: 'o2', source: 'nos', publishedAt: '2026-10-09T06:00:00Z' }, { id: 'o1', source: 'nos', publishedAt: '2026-10-09T04:00:00Z' }] }
  const merged = carryOver(prev, next)
  assert.deepEqual(merged.items.map((i) => i.id), ['o2', 'n1', 'o1'])
  // Na herstel niets meer overnemen.
  const healed = { sources: [src('nrc'), src('nos')], items: [{ id: 'o2', source: 'nos', publishedAt: '2026-10-09T06:00:00Z' }] }
  assert.equal(carryOver(merged, healed), healed)
})
