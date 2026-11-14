// Nachttest 14 november (A4, W-02): Mijn bronnen en Alle bronnen geven op het web verschillende resultaten, zoals de app.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { searchHits } from '../src/lib/zoek.js'
import { mutedSet } from '../src/lib/sourcesel.js'

const sources = [{ id: 'nos' }, { id: 'nrc' }, { id: 'extra', optional: true }, { id: 'vergelijk', optional: true }, { id: 'weg' }]
const prefs = { muted: ['weg'], enabled: [] }
const it = (id, source, publishedAt) => ({ id, source, sourceName: source, title: `Kabinet ${id}`, publishedAt })
const itemsById = new Map([it('a', 'nos', '2026-11-14T08:00:00Z'), it('b', 'extra', '2026-11-14T07:00:00Z'), it('c', 'weg', '2026-11-14T06:00:00Z'), it('d', 'vergelijk', '2026-11-14T05:00:00Z')].map((i) => [i.id, i]))
const opts = { itemsById, saved: { x: { item: it('e', 'extra', '2026-11-13T05:00:00Z') } }, muted: mutedSet(prefs, sources), ownMuted: new Set(prefs.muted) }

test('zoek: Mijn bronnen, alleen wat aan staat plus bewaard', () => {
  assert.deepEqual(searchHits('kabinet', { ...opts, scope: 'mijn' }).map((i) => i.id), ['a', 'e'])
})

test('zoek: Alle bronnen, ook optionele en vergelijkbronnen; nooit wat je zelf uitzette', () => {
  const ids = searchHits('kabinet', { ...opts, scope: 'alle' }).map((i) => i.id)
  assert.deepEqual(ids, ['a', 'b', 'd', 'e'])
  assert.ok(!ids.includes('c'))
})

test('zoek: zonder woord van twee letters niets', () => {
  assert.deepEqual(searchHits('k', { ...opts, scope: 'alle' }), [])
})
