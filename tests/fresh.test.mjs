import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freshCount } from '../src/lib/fresh.js'
import { restoreSaved, toggleSaved } from '../src/lib/saved.js'

const it = (id, source = 'nos') => ({ id, source })

test('telt alleen wat echt nieuw is, zonder dubbelen', () => {
  assert.equal(freshCount([it('a'), it('b')], [it('c'), it('c'), it('a'), it('d')]), 2)
  assert.equal(freshCount([it('a')], [it('a')]), 0)
})

test('berichten van een uitgezette bron tellen niet als nieuw', () => {
  assert.equal(freshCount([it('a')], [it('b', 'nrc'), it('c', 'nos')], new Set(['nrc'])), 1)
})

test('verwijderen uit Bewaard is ongedaan te maken, met dezelfde inhoud en bewaartijd', () => {
  const saved = toggleSaved({}, 'item', 'a', { id: 'a', title: 'Kop' }, new Map(), 111)
  const entry = saved.a
  const removed = toggleSaved(saved, 'item', 'a')
  assert.deepEqual(removed, {})
  assert.deepEqual(restoreSaved(removed, 'a', entry), saved)
  // Intussen opnieuw bewaard? Dan niet overschrijven.
  const again = toggleSaved(removed, 'item', 'a', { id: 'a', title: 'Kop' }, new Map(), 999)
  assert.equal(restoreSaved(again, 'a', entry).a.savedAt, 999)
})
