// Buiten je bubbel in de Stroom: alleen de bubbelplekken van de Editie die je ziet (desk 'bubbel'), zoals de app
// (HootStore.bubbleItems in StreamView.swift). Niet de kandidatenlijst van de algemene Editie: daar zitten ook
// Engelse stukken in, en taal volgt je bronkeuze (nachttest 14 november, W-01).
export function bubbleFromEdition(edition, lookup = new Map()) {
  if (!edition) return []
  const published = new Map((edition.items || []).map((i) => [i.id, i]))
  return (edition.entries || [])
    .filter((e) => e && e.desk === 'bubbel')
    .map((e) => {
      const id = e.kind === 'story' ? e.leadId || e.id : e.id
      return { ...e, item: published.get(id) || lookup.get(id) }
    })
    .filter((b) => b.item)
}
