import { test } from 'node:test'
import assert from 'node:assert/strict'
import { indexStories, resolveStory, toggleSaved, savedKey, withLead, savedLeadId } from '../src/lib/saved.js'

const items = new Map([['a', { id: 'a', source: 'nos' }], ['b', { id: 'b', source: 'nyt' }], ['c', { id: 'c', source: 'bbc' }]])
const story = (id, itemIds, formerIds = []) => ({ id, itemIds, formerIds, leadId: itemIds[0] })

test('bewaren overleeft opslaan en teruglezen (bericht en verhaal)', () => {
  let saved = toggleSaved({}, 'item', 'a', items.get('a'), items, 1)
  saved = toggleSaved(saved, 'story', 's1', story('s1', ['a', 'b']), items, 2)
  const restored = JSON.parse(JSON.stringify(saved))
  assert.equal(restored.a.item.id, 'a')
  assert.deepEqual(restored.s1.items.map((i) => i.id), ['a', 'b'])
  assert.equal(Object.keys(toggleSaved(restored, 'item', 'a')).length, 1) // nogmaals = verwijderen
})

test('een bewaard verhaal blijft vindbaar als twee bundels zijn samengegaan', () => {
  const saved = toggleSaved({}, 'story', 'sNL', story('sNL', ['a']), items, 1)
  const merged = story('sEN', ['a', 'b', 'c'], ['sNL'])
  const byId = indexStories([merged])
  const r = resolveStory('sNL', byId, saved, items)
  assert.equal(r.story.id, 'sEN')
  assert.equal(r.items.length, 3)
  assert.equal(savedKey(saved, 'sEN', merged), 'sNL') // het bladwijzertje blijft gevuld
})

test('een bewaard verhaal dat uit de feeds is verdwenen toont de momentopname', () => {
  const saved = toggleSaved({}, 'story', 's9', story('s9', ['a', 'b']), items, 1)
  const r = resolveStory('s9', indexStories([]), saved, new Map())
  assert.deepEqual(r.items.map((i) => i.id), ['a', 'b'])
})

test('onbekend verhaal geeft niets terug (verlopen link)', () => {
  assert.equal(resolveStory('sX', indexStories([]), {}, items), null)
})

test('het verhaalpaneel toont alle bronnen, ook die je hebt uitgezet', () => {
  const st = story('sAll', ['a', 'b', 'c'])
  const r = resolveStory('sAll', indexStories([st]), {}, items)
  assert.equal(r.items.length, 3)
})

// Review H7: je tikte op het ene stuk en Bewaard toonde een ander uit de bundel.
test('Bewaard toont het stuk waarop je tikte, zolang het in het verhaal zit', () => {
  const st = story('sB', ['a', 'b', 'c']) // de server koos 'a'
  assert.equal(withLead(st, 'b').leadId, 'b')
  assert.equal(withLead(st, 'x'), st) // niet in de bundel: de keuze van de server
  assert.equal(withLead(st, null), st)
  const saved = toggleSaved({}, 'story', 'sB', withLead(st, 'b'), items, 1)
  const restored = JSON.parse(JSON.stringify(saved))
  assert.equal(savedLeadId(restored.sB, st), 'b') // ook met de actuele versie van het verhaal
  assert.equal(savedLeadId(restored.sB, story('sB', ['a', 'c'])), 'a') // 'b' is eruit: terug naar de server
  assert.equal(savedLeadId({ kind: 'story', story: null }, st), 'a') // oude of kapotte rij
})
