// Nachttest 14 november (A3, W-01): de Stroom-tab Buiten je bubbel op het web is gelijk aan de app.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { bubbleFromEdition } from '../src/lib/stroom-bubbel.js'

test('stroom-bubbel: alleen de plekken met desk bubbel uit de Editie die je ziet', () => {
  const edition = {
    entries: [
      { kind: 'item', id: 'a', desk: 'binnenland' },
      { kind: 'item', id: 'b', desk: 'bubbel' },
      { kind: 'story', id: 's1', leadId: 'c', desk: 'bubbel' },
      { kind: 'item', id: 'weg', desk: 'bubbel' },
    ],
    items: [{ id: 'a' }, { id: 'b', title: 'B' }],
    bubble: [{ id: 'engels' }],
  }
  const r = bubbleFromEdition(edition, new Map([['c', { id: 'c', title: 'C' }], ['engels', { id: 'engels' }]]))
  assert.deepEqual(r.map((b) => b.item.id), ['b', 'c'])
  assert.deepEqual(bubbleFromEdition(null), [])
})

test('stroom-bubbel: App.jsx gebruikt de kandidatenlijst van de algemene Editie niet meer', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(app, /data\?\.edition\?\.bubble/)
  assert.match(app, /bubbleFromEdition\(myEdition, lookup\)/)
})
