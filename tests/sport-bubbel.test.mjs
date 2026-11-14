// Nachttest 14 november (A1, R1): sport hoort niet op de bubbelplek. Een RTL-stuk onder /nieuws/sport/ zonder
// onderwerpen ("Pochettino volgt Carrick op…") stond in de algemene Avondeditie als Buiten je bubbel, en bleef ook
// bij de sportlezer staan, want zonder onderwerpen telde het als buiten zijn profiel.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pickBubble } from '../netlify/lib/build.mjs'
import { sportOpBubbel } from '../netlify/lib/bubble.mjs'
import { outsideProfile, profileOf } from '../shared/editor.mjs'
import { SOURCES } from '../netlify/lib/sources.mjs'

const NOW = Date.parse('2026-11-13T17:00:00Z')
const ago = (h) => new Date(NOW - h * 36e5).toISOString()
const art = (id, title, extra = {}) => ({ id, kind: 'article', source: 'nos', sourceName: 'NOS', title, summary: `${title}.`, publishedAt: ago(2), topics: [], ...extra })
const POCH = 'Pochettino volgt Carrick op bij Manchester United'
const RTL = { source: 'rtl', sourceName: 'RTL Nieuws', url: 'https://www.rtlnieuws.nl/nieuws/sport/artikel/1/pochettino' }

function world(item, stories = []) {
  return {
    pool: [art('e1', 'Kabinet valt over Belastingplan', { storyId: 's-e1' }), item],
    entries: [{ kind: 'item', id: 'e1', desk: 'binnenland' }],
    heads: ['Kabinet valt over Belastingplan'],
    trends: [{ term: 'Pochettino', via: 'google' }],
    storyById: new Map(stories.map((s) => [s.id, s])),
    now: NOW,
  }
}

test('pickBubble: een stuk onder /sport/ zonder onderwerpen is sport', () => {
  const b = pickBubble(world(art('poch', POCH, RTL)))
  assert.notEqual(b.item?.id, 'poch')
  assert.equal(b.afval.find((x) => x.id === 'poch')?.reden, 'sport')
})

test('pickBubble: een stuk uit een verhaal met sport: true is sport, ook zonder sportlink', () => {
  const it = art('poch', POCH, { ...RTL, url: 'https://www.rtlnieuws.nl/nieuws/artikel/1/pochettino', storyId: 's-poch' })
  const b = pickBubble(world(it, [{ id: 's-poch', itemIds: ['poch'], sport: true }]))
  assert.notEqual(b.item?.id, 'poch')
  assert.equal(b.afval.find((x) => x.id === 'poch')?.reden, 'sport')
})

test('sportOpBubbel: gewoon nieuws blijft gewoon nieuws', () => {
  const catOf = new Map(SOURCES.map((s) => [s.id, s.cat]))
  assert.equal(sportOpBubbel(art('a', 'Kabinet valt', { url: 'https://nos.nl/artikel/1-kabinet-valt' }), { catOf }), false)
  assert.equal(sportOpBubbel(art('b', 'Iets', { url: 'https://nos.nl/sport/artikel/1' }), { catOf }), true)
  assert.equal(sportOpBubbel(art('c', 'Iets', { source: 'nos-sport' }), { catOf }), true)
})

test('persoonlijke Editie: voor de sportlezer is sport zonder onderwerp niet buiten zijn profiel', () => {
  const sportlezer = profileOf({ interests: ['sport'], topics: [], sources: SOURCES })
  const nieuwslezer = profileOf({ interests: ['binnenland'], topics: [], sources: SOURCES })
  assert.equal(outsideProfile([], sportlezer, ['sport']), false)
  assert.equal(outsideProfile([], nieuwslezer, ['sport']), true)
  assert.equal(outsideProfile([], sportlezer), true, 'zonder gebied blijft de oude regel')
  const personal = readFileSync(new URL('../src/lib/personal.js', import.meta.url), 'utf8')
  assert.match(personal, /outsideProfile\(topicsOfStory\(b\.storyId, b\.id\), prof, familiesOfStory\(b\.storyId, b\.id\)\)/)
})
