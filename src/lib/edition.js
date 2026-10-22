// Editie-onderdelen koppelen aan wat de app nu heeft — pure functie (tests/edition.test.mjs).
// Het hoofdbericht en de bundel achter "+N bronnen" moeten altijd bij elkaar horen. De server
// koppelt al opnieuw (relinkEdition); dit vangt een kern op die nog van vóór die stap is, of een
// verhaal dat tussen twee verversingen is verschoven.
export function resolveEditionEntry(e, { storiesById, itemsById, muted = new Set() }) {
  const ok = (i) => i && !muted.has(i.source)
  if (e.kind !== 'story') {
    const item = itemsById.get(e.id)
    return ok(item) ? { item, story: null, desk: e.desk } : null
  }
  let story = storiesById.get(e.id)
  let desk = e.desk
  if (story && e.leadId && !story.itemIds.includes(e.leadId)) {
    // Het verhaal met deze id gaat intussen over iets anders: neem het verhaal waar het
    // hoofdbericht nu in zit, of toon het bericht los. De rubriek komt dan van het bericht.
    const lead = itemsById.get(e.leadId)
    const now = lead?.storyId ? storiesById.get(lead.storyId) : null
    story = now?.itemIds.includes(e.leadId) ? now : null
    desk = e.leadDesk || null
    return ok(lead) ? { item: lead, story, desk } : null
  }
  if (!story) {
    const lead = itemsById.get(e.leadId)
    return ok(lead) ? { item: lead, story: null, desk: e.leadDesk || e.desk } : null
  }
  // Staat de bron van het hoofdbericht uit, dan het eerstvolgende uit hetzelfde verhaal.
  const item = [e.leadId, story.leadId, ...story.itemIds].map((id) => itemsById.get(id)).find(ok)
  return item ? { item, story, desk } : null
}
