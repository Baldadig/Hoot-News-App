// Buiten je bubbel herhaalt geen onderwerp (dubbelcheck 14 november, A7). Bij een terugkerende lezer stond een Omroep
// Brabant-stuk over Overasselt in zijn vorige Editie; de nieuwe bubbel werd een NU.nl-stuk over hetzelfde. De algemene
// Editie weert dat al (shownToday in pickBubble, met sameEvent); de persoonlijke keek alleen naar ids en verhalen. Het
// voorbeeld is een illustratie: de toets gebruikt de bubbel van de momentopname en een kop van een andere bron over
// dezelfde gebeurtenis in de vorige Editie.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSnapshot, editionsNu, composeFor } from './helpers/snapshot.mjs'
import { previousOf } from '../shared/edition-history.mjs'

const snap = loadSnapshot()
const bubbleOf = (ed) => ed.entries.find((e) => e.desk === 'bubbel') || null
const itemById = new Map([...(snap.edition?.items || []), ...snap.items].map((i) => [i.id, i]))

test('persoonlijke bubbel: niet dezelfde gebeurtenis als een kop uit je vorige Editie, ook niet van een andere bron', () => {
  const runs = editionsNu(snap).filter(({ edition }) => bubbleOf(edition))
  assert.ok(runs.length > 0, 'de momentopname heeft een lezer met een bubbel')
  let getoetst = 0
  for (const { persona, setup, edition } of runs) {
    const b = bubbleOf(edition)
    const head = itemById.get(b.leadId || b.id)
    if (!head?.title) continue
    // De vorige Editie toonde hetzelfde nieuws, met een andere id en een andere bron (geen verhaal-id).
    const elders = { id: 'elders-1', source: head.source === 'nos' ? 'nu' : 'nos', title: head.title, summary: head.summary || '', publishedAt: new Date(Date.parse(snap.meta.updatedAt) - 5 * 36e5).toISOString() }
    const previous = previousOf({ id: 'vorige', builtAt: elders.publishedAt, storyIds: [], itemIds: [elders.id], leadIds: [elders.id], titles: [elders.title], shown: [elders] })
    const again = composeFor(snap, { ...setup, readIds: new Set(), previous })
    const nb = bubbleOf(again)
    const nhead = nb && itemById.get(nb.leadId || nb.id)
    assert.ok(!nb || ((nb.leadId || nb.id) !== (b.leadId || b.id) && nhead?.title !== head.title), `${persona.id}: de bubbel herhaalt "${head.title}"`)
    getoetst++
  }
  assert.ok(getoetst > 0)
})

test('tegenval: zonder dat onderwerp in de vorige Editie blijft de bubbel gewoon staan', () => {
  const [{ setup, edition }] = editionsNu(snap).filter(({ edition }) => bubbleOf(edition))
  const b = bubbleOf(edition)
  const ander = { id: 'ander-1', source: 'nos', title: 'Kabinet presenteert plannen voor de woningmarkt in de Tweede Kamer', summary: 'De reacties zijn verdeeld.', publishedAt: new Date(Date.parse(snap.meta.updatedAt) - 5 * 36e5).toISOString() }
  const previous = previousOf({ id: 'vorige', builtAt: ander.publishedAt, storyIds: [], itemIds: [ander.id], leadIds: [ander.id], titles: [ander.title], shown: [ander] })
  const again = composeFor(snap, { ...setup, readIds: new Set(), previous })
  assert.equal(bubbleOf(again)?.leadId || bubbleOf(again)?.id, b.leadId || b.id)
})
