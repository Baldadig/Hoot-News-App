import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveEditionEntry, uncovered, heroFirst, upNext, UP_NEXT, numberRows, countOf, two } from '../src/lib/edition.js'
import { fitsHero } from '../src/lib/img.js'
import { relinkEdition } from '../netlify/lib/stories.mjs'

// De situatie van de ochtendeditie van 22-10: het hoofdbericht (Witkoff/Poetin, qskuc4) zat bij
// het samenstellen in verhaal srm059c; na een verversing zit het in s1d777vr, en srm059c gaat
// over een Trump-rally in Frankrijk.
const witkoff = { id: 'qskuc4', source: 'volkskrant', title: 'Trump-gezant Witkoff boekt met vredesvoorstellen weinig succes bij Poetin', summary: 'Rusland ziet weinig in de nieuwe voorstellen.', storyId: 's1d777vr' }
const kyiv = { id: 'k2', source: 'nyt', title: 'Putin rebuffs Witkoff peace plan for Ukraine', storyId: 's1d777vr' }
const rally = { id: 'r1', source: 'guardian', title: 'Macron accuses Trump over rally violence', storyId: 'srm059c' }
const rally2 = { id: 'r2', source: 'nos', title: 'Rellen bij politieke rally in Frankrijk', storyId: 'srm059c' }
const items = [witkoff, kyiv, rally, rally2]
const itemsById = new Map(items.map((i) => [i.id, i]))
const stories = [
  { id: 's1d777vr', leadId: 'qskuc4', itemIds: ['qskuc4', 'k2'], sourceCount: 14 },
  { id: 'srm059c', leadId: 'r1', itemIds: ['r1', 'r2'], sourceCount: 8 },
]
const storiesById = new Map(stories.map((s) => [s.id, s]))
const entry = { kind: 'story', id: 'srm059c', leadId: 'qskuc4', desk: 'vs' }

test('app: kop en bundel horen bij elkaar, ook als het verhaal-id is verschoven', () => {
  const r = resolveEditionEntry({ ...entry, leadDesk: 'oekraine' }, { storiesById, itemsById })
  assert.equal(r.item.id, 'qskuc4')
  assert.equal(r.story.id, 's1d777vr')
  assert.ok(r.story.itemIds.includes(r.item.id))
  assert.equal(r.desk, 'oekraine') // niet meer "VS" van het oude verhaal
})

test('app: zit het hoofdbericht in geen enkel verhaal meer, dan los en zonder "+N"', () => {
  const lonely = { ...witkoff, storyId: null }
  const r = resolveEditionEntry(entry, { storiesById, itemsById: new Map([...itemsById, ['qskuc4', lonely]]) })
  assert.equal(r.item.id, 'qskuc4')
  assert.equal(r.story, null)
})

test('app: een kloppend onderdeel blijft zoals het is', () => {
  const r = resolveEditionEntry({ kind: 'story', id: 's1d777vr', leadId: 'qskuc4', desk: 'oekraine' }, { storiesById, itemsById })
  assert.equal(r.story.id, 's1d777vr')
  assert.equal(r.desk, 'oekraine')
})

test('server: relinkEdition wijst naar het verhaal waar het hoofdbericht nu in zit', () => {
  const snapshot = [{ id: 'srm059c', leadId: 'qskuc4', itemIds: ['qskuc4', 'k2'], sourceCount: 9 }]
  const [e] = relinkEdition([entry], { stories, snapshot, byId: itemsById })
  assert.equal(e.id, 's1d777vr')
  assert.equal(e.formerId, 'srm059c')
  assert.deepEqual(e.itemIds, ['qskuc4', 'k2']) // momentopname van het samenstellen
  assert.equal(e.sourceCount, 9)
  assert.equal(e.desk, 'oekraine')
  assert.ok(stories.find((s) => s.id === e.id).itemIds.includes(e.leadId))
})

test('server: twee onderdelen wijzen nooit naar hetzelfde verhaal', () => {
  const both = [entry, { kind: 'story', id: 's1d777vr', leadId: 'k2', desk: 'oekraine' }]
  const out = relinkEdition(both, { stories, byId: itemsById })
  assert.equal(out[0].kind, 'item')
  assert.equal(out[0].id, 'qskuc4')
  assert.equal(out[1].id, 's1d777vr')
})

// Feedback 31 oktober: het NOS-stuk over de dood van Patrick Stewart stond als Binnenland in de algemene
// Editie, omdat het zijn verhaal (vooral NYT, Variety en de Guardian) kwijtraakte en de rubriek van het
// losse bericht kreeg.
test('server: raakt het hoofdbericht zijn verhaal kwijt, dan telt de rubriek van het verhaal, niet Binnenland', () => {
  const its = [
    { id: 'n1', source: 'nos', title: 'Bedroefde reacties om dood Patrick Stewart' },
    { id: 'y1', source: 'nyt', title: 'Patrick Stewart, Star Trek captain, dies at 86' },
    { id: 'b1', source: 'bbc', title: 'Sir Patrick Stewart dies aged 86' },
    { id: 'g1', source: 'guardian', title: 'Patrick Stewart obituary' },
  ]
  const byId = new Map(its.map((i) => [i.id, i]))
  const snapshot = [{ id: 'sStew', leadId: 'n1', itemIds: its.map((i) => i.id), sourceCount: 4 }]
  const [loose] = relinkEdition([{ kind: 'story', id: 'sStew', leadId: 'n1', desk: null }], { stories: [], snapshot, byId })
  assert.equal(loose.kind, 'item')
  assert.notEqual(loose.desk, 'binnenland')
  const [kept] = relinkEdition([{ kind: 'story', id: 'sStew', leadId: 'n1', desk: 'buitenland' }], { stories: [], snapshot, byId })
  assert.equal(kept.desk, 'buitenland') // de rubriek van de selectie gaat voor
})

test('gepubliceerd is vast: dezelfde id met een nieuwe kop in de feed verandert de editie niet', () => {
  // Audit 22-10: id met een opgeslagen Kyiv-kop kreeg live een kop over Duitse sabotage.
  const published = new Map([['qskuc4', { ...witkoff, title: 'Russische aanvallen op Kyiv na gesprek Witkoff' }]])
  const live = new Map([...itemsById, ['qskuc4', { ...witkoff, title: 'Duitsland waarschuwt voor sabotage' }]])
  const r = resolveEditionEntry({ kind: 'story', id: 's1d777vr', leadId: 'qskuc4', desk: 'oekraine' }, { storiesById, itemsById: live, published })
  assert.equal(r.item.title, 'Russische aanvallen op Kyiv na gesprek Witkoff')
  assert.equal(r.story.id, 's1d777vr')
})

test('een bron die je niet volgt valt niet weg: het verhaal blijft, met een label', () => {
  const r = resolveEditionEntry({ kind: 'story', id: 's1d777vr', leadId: 'qskuc4', desk: 'oekraine' }, { storiesById, itemsById, muted: new Set(['volkskrant']) })
  assert.equal(r.item.id, 'qskuc4')
  assert.equal(r.followed, false)
})

test('een los bericht dat inmiddels in een verhaal zit, krijgt die bundel', () => {
  const r = resolveEditionEntry({ kind: 'item', id: 'k2', desk: 'oekraine' }, { storiesById, itemsById })
  assert.equal(r.story.id, 's1d777vr')
})

test('wat het overzicht niet noemt komt eronder, op volgorde', () => {
  const brief = { sections: [{ refs: [0, 2] }, { refs: [3] }] }
  assert.deepEqual(uncovered(brief, 6), [1, 4, 5])
  assert.deepEqual(uncovered({ sections: [{ text: 'oud, zonder refs' }] }, 6), []) // oud overzicht: niets te zeggen
})

test('het hoofdverhaal heeft altijd een scherp beeld: anders schuift de eerste plek met goed beeld naar voren', () => {
  const small = 'https://i.guim.co.uk/img/media/a/master/1.jpg?width=140&quality=85&s=x'
  const sharp = 'https://images.cdn.nos.nl/a-1024x576.webp'
  const row = (key, image, desk = null) => ({ key, index: Number(key.slice(1)), desk, item: { id: key, image } })
  const rows = [row('r0', small), row('r1', null), row('r2', sharp, 'bubbel'), row('r3', sharp)]
  assert.deepEqual(heroFirst(rows, fitsHero).map((r) => r.key), ['r3', 'r0', 'r1', 'r2'])
  // Al goed: niets verandert. Nergens een goed beeld: volgorde blijft.
  assert.equal(heroFirst([row('a0', sharp), row('a1', small)], fitsHero)[0].key, 'a0')
  assert.deepEqual(heroFirst([row('b0', small), row('b1', null)], fitsHero).map((r) => r.key), ['b0', 'b1'])
})

// Het einde van de Editie zegt in dagdelen wanneer de volgende er is, zoals de app (geen kloktijden).
test('upNext: de volgende editie in dagdelen, nooit een kloktijd', () => {
  assert.equal(upNext('ochtend'), ' De volgende staat in de middag klaar.')
  assert.equal(upNext('middag'), ' De volgende staat in de vroege avond klaar.')
  assert.equal(upNext('avond'), ' De volgende staat morgenochtend klaar.')
  assert.equal(upNext(undefined), '')
  assert.equal(upNext('nacht'), '')
  for (const t of Object.values(UP_NEXT)) assert.doesNotMatch(t, /\d/)
})

test('de telling: 01 is het hoofdverhaal, de bubbel telt niet mee, breed wel (T3)', () => {
  const rows = numberRows([{ desk: 'vs' }, { desk: 'bubbel' }, { desk: 'breed' }, { desk: 'tech' }])
  assert.deepEqual(rows.map((r) => r.n), [1, null, 2, 3])
  assert.equal(countOf(rows), 3) // "3 van 3" op de rode kaart
  assert.equal(two(rows[0].n), '01')
  assert.equal(two(10), '10')
  assert.equal(countOf(numberRows([])), 0)
})

test('de telling volgt de getoonde volgorde (na heroFirst)', () => {
  const ok = { image: 'groot.jpg' }
  const rows = numberRows(heroFirst([{ key: 'a', desk: 'vs', item: {} }, { key: 'b', desk: 'tech', item: ok }], () => true))
  assert.deepEqual(rows.map((r) => [r.key, r.n]), [['b', 1], ['a', 2]])
})
