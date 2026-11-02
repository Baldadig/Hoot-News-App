import { EDITION_TARGET } from '../../shared/edition-limits.mjs'
import { SLOTS } from '../../shared/slots.mjs'

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

// De volgorde van De Redacteur is ook de leesvolgorde. Een ontbrekend of klein beeld mag
// een Nederlandse opening niet vervangen door een ander verhaal. De historische helpernaam
// blijft beschikbaar voor de nummeringsroute; de kop past zich aan de inhoud aan.
export function heroFirst(rows) { return rows }

// Hoeveel verhalen een volle editie heeft (de server streeft naar tien).
export const EDITION_SIZE = EDITION_TARGET

// Wanneer de volgende editie er is, in dagdelen: geen kloktijden in de teksten (iOS EditionView
// `upNext`). De woorden staan in shared/slots.mjs; de server stuurt wel `next: '12:00'` mee, maar
// dat gebruiken we niet voor de tekst.
export const UP_NEXT = Object.fromEntries(Object.entries(SLOTS).map(([slot, s]) => [slot, s.volgende]))
export function upNext(slot) {
  const when = SLOTS[slot]?.volgende
  return when ? ` De volgende staat ${when} klaar.` : ''
}

// Welke onderdelen het overzicht niet noemt (op volgorde): die tonen we eronder, zodat er
// niets stilletjes wegvalt.
export function uncovered(brief, count) {
  const refs = new Set((brief?.sections || []).flatMap((s) => s.refs || []))
  if (!refs.size) return []
  return [...Array(count).keys()].filter((i) => !refs.has(i))
}

// De telling: de Editie nummert wat je ziet, in de getoonde volgorde (dus na heroFirst). Het
// hoofdverhaal is 01. "Buiten je bubbel" telt niet mee (dat staat er naast je Editie, niet in);
// "Waar iedereen over schrijft" (breed) wel. Een ingeklapte plek (minder hiervan) houdt zijn
// nummer, zodat de telling niet verspringt. Elke rij krijgt `n` (1-based, of null); het totaal
// is het hoogste nummer ("10 van 10" op de rode kaart). Native spiegelt dit in EditionNumbering.
export function numberRows(rows) {
  let n = 0
  return rows.map((r) => ({ ...r, n: r.desk === 'bubbel' ? null : ++n }))
}
export const countOf = (rows) => rows.reduce((m, r) => (r.n ? Math.max(m, r.n) : m), 0)

// Een nummer van de telling in twee cijfers: 01 tot 10 (zoals de Selectie).
export const two = (n) => String(n).padStart(2, '0')
