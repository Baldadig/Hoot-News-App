// Nieuwe berichten tijdens het lezen — pure functies (getest in tests/fresh.test.mjs).
import { inStroom } from '../../shared/stroom.mjs'

// Hoeveel berichten in `next` had je nog niet? Dubbelen tellen één keer (en een stuk dat je al had, met een nieuwe kop, telt niet); berichten van
// bronnen die je hebt uitgezet tellen niet mee, en ook niet wat niet in de Stroom komt (editionOnly).
export function freshCount(prevItems = [], nextItems = [], muted = new Set()) {
  const seen = new Set(prevItems.map((i) => i.id))
  const fresh = new Set()
  for (const i of nextItems) if (!seen.has(i.id) && !(i.formerIds || []).some((id) => seen.has(id)) && !muted.has(i.source) && inStroom(i)) fresh.add(i.id)
  return fresh.size
}

// Hoe een ververs-ronde binnenkomt (useFeed):
// - 'alles': meteen, ook de berichten. De eerste keer, de verversknop, of een nieuw dagdeel: Jouw
//   Editie wordt dan samengesteld uit de berichten van nu, niet uit die van uren terug (en ligt
//   daarna het hele dagdeel vast).
// - 'wachten': de nieuwe berichten van de Stroom wachten achter de knop; de rest gaat door.
// - 'rest': niets nieuws in de Stroom; de rest gaat door, de berichten blijven staan.
// Dekken de berichten die er staan je bronnen van nu niet (`covered` false: je account gaf net een bron,
// of een deel kwam de vorige keer niet binnen), dan ook 'alles': anders bleef Jouw Editie wachten op
// berichten die geen ronde meer haalt (keuring P0, 9 november).
export function refreshPlan({ defer = false, prev = null, next = null, fresh = 0, covered = true } = {}) {
  if (!defer || !prev || !covered) return 'alles'
  if (next?.edition && next.edition.id !== prev.edition?.id) return 'alles'
  return fresh > 0 ? 'wachten' : 'rest'
}
