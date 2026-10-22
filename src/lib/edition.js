// Editie-onderdelen weergeven — pure functies (tests/edition.test.mjs).
//
// Eén vaste selectie: de tien onderdelen van de server zijn de editie, voor iedereen gelijk, en
// het overzicht in één minuut gaat over precies die tien. We laten er dus niets uit weg (ook niet
// als je de bron van een hoofdbericht niet volgt: dan een label).
//
// Wat er staat is wat er gepubliceerd is: kop, intro en beeld komen uit `edition.items` (de
// momentopname bij het samenstellen), niet uit de live feed. Alleen de bundel achter "+N bronnen"
// volgt de actuele indeling, en die moet het hoofdbericht bevatten.
export function resolveEditionEntry(e, { storiesById, itemsById, published = new Map(), muted = new Set() }) {
  const leadId = e.kind === 'story' ? e.leadId : e.id
  let item = published.get(leadId) || itemsById.get(leadId)
  const named = e.kind === 'story' ? storiesById.get(e.id) : null
  if (!item && named) item = [named.leadId, ...named.itemIds].map((id) => itemsById.get(id)).find(Boolean) // kern van vóór 1.27
  if (!item) return null

  // De bundel: het verhaal met deze id als het hoofdbericht erin zit, anders het verhaal waar
  // het (live) nu in zit, anders geen bundel. De rubriek hoort bij wat we tonen.
  const contains = (s) => s && s.itemIds.includes(item.id)
  let story = contains(named) ? named : null
  let desk = e.desk
  if (!story) {
    const liveId = itemsById.get(item.id)?.storyId
    const now = liveId ? storiesById.get(liveId) : null
    story = contains(now) ? now : null
    if (named) desk = e.leadDesk || null
  }
  return { item, story, desk, followed: !muted.has(item.source) }
}

// Hoeveel verhalen een volle editie heeft (de server streeft naar tien).
export const EDITION_SIZE = 10

// Welke onderdelen het overzicht niet noemt (op volgorde): die tonen we eronder, zodat er
// niets stilletjes wegvalt.
export function uncovered(brief, count) {
  const refs = new Set((brief?.sections || []).flatMap((s) => s.refs || []))
  if (!refs.size) return []
  return [...Array(count).keys()].filter((i) => !refs.has(i))
}
