// Redacteur 3b · 5 (besluit van Alex, keuring 6 november 2026): curiosa nooit in de top 3, liefst plek 6–10.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { curioStory, curiosaDown } from '../netlify/lib/stories.mjs'

const t = '2026-11-06T04:00:00Z'
const it = (id, title, source = 'nos') => ({ id, kind: 'article', source, title, publishedAt: t })

test('curiosum: een kuriositeit in een derde van de koppen, of een licht verhaal', () => {
  const oval = [it('o1', 'Goud glimmend Oval Office tot nationaal monument verklaard door Trump'), it('o2', 'Trump declares the gilded Oval Office a national monument', 'nyt'), it('o3', 'Trump en het Witte Huis', 'ad')]
  assert.equal(curioStory({ light: false }, oval), true)
  assert.equal(curioStory({ light: 'cultuur' }, [it('b1', 'Dirigent Herbert Blomstedt (99) overleden')]), true)
  // De goudprijs is economie, geen kuriositeit; gewoon nieuws ook niet.
  assert.equal(curioStory({ light: false }, [it('g1', 'Goudprijs stijgt naar record'), it('g2', 'Gold price hits record high', 'ft')]), false)
  assert.equal(curioStory({ light: false }, [it('k1', 'Kabinet valt over belastingplan'), it('k2', 'Dutch cabinet falls', 'bbc')]), false)
})

test('curiosaDown: een curiosum uit de top 3 schuift naar plek 6, de rest houdt zijn volgorde', () => {
  const stories = { c: { light: 'cultuur' }, d: { light: 'games' } }
  const e = (id) => ({ kind: 'story', id })
  const itemsOf = (x) => [it(x.id, x.id === 'c' || x.id === 'd' ? 'Iets lichts' : 'Kabinet neemt besluit')]
  const storyOf = (x) => stories[x.id] || { light: false }
  const ids = (xs) => xs.map((x) => x.id)
  assert.deepEqual(ids(curiosaDown(['c', 'a', 'b', 'x', 'y', 'z', 'w'].map(e), { itemsOf, storyOf })), ['a', 'b', 'x', 'y', 'z', 'c', 'w'])
  // Twee curiosa: allebei omlaag, in hun eigen volgorde, en wat op 4 en verder stond niet.
  assert.deepEqual(ids(curiosaDown(['a', 'c', 'd', 'x', 'y', 'z', 'w'].map(e), { itemsOf, storyOf })), ['a', 'x', 'y', 'z', 'c', 'd', 'w'])
  // Een korte Editie: achteraan. De bubbel doet niet mee.
  assert.deepEqual(ids(curiosaDown(['c', 'a'].map(e), { itemsOf, storyOf })), ['a', 'c'])
  assert.deepEqual(ids(curiosaDown([{ kind: 'item', id: 'c', desk: 'bubbel' }, e('a')], { itemsOf, storyOf })), ['c', 'a'])
})
