// Nieuwe berichten tijdens het lezen — pure functies (getest in tests/fresh.test.mjs).

// Hoeveel berichten in `next` had je nog niet? Dubbelen tellen één keer; berichten van
// bronnen die je hebt uitgezet tellen niet mee.
export function freshCount(prevItems = [], nextItems = [], muted = new Set()) {
  const seen = new Set(prevItems.map((i) => i.id))
  const fresh = new Set()
  for (const i of nextItems) if (!seen.has(i.id) && !muted.has(i.source)) fresh.add(i.id)
  return fresh.size
}

// Hoe een ververs-ronde binnenkomt (useFeed):
// - 'alles': meteen, ook de berichten. De eerste keer, de verversknop, of een nieuw dagdeel: Jouw
//   Editie wordt dan samengesteld uit de berichten van nu, niet uit die van uren terug (en ligt
//   daarna het hele dagdeel vast).
// - 'wachten': de nieuwe berichten van de Stroom wachten achter de knop; de rest gaat door.
// - 'rest': niets nieuws in de Stroom; de rest gaat door, de berichten blijven staan.
export function refreshPlan({ defer = false, prev = null, next = null, fresh = 0 } = {}) {
  if (!defer || !prev) return 'alles'
  if (next?.edition && next.edition.id !== prev.edition?.id) return 'alles'
  return fresh > 0 ? 'wachten' : 'rest'
}
