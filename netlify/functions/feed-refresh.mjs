// Elke 10 minuten de feed opnieuw samenstellen; 's nachts (tot de Ochtendeditie) elk half uur.
// De nachtrust stopt precies op de start van de ochtend (shared/slot-times.mjs), zodat de eerste
// ronde daarna de Ochtendeditie vastlegt en niet een half uur wacht.
// Legt deze ronde een nieuw dagdeel vast, dan maken we /api/edition meteen warm (Editie sneller,
// Hoot-design/editie-sneller/METING.md §4A): de eerste lezers van het nieuwe dagdeel betalen dan niet de koude
// start en het lezen van alle delen. Eén aanroep per dagdeel, zonder profiel.
import { refresh } from '../lib/refresh.mjs'
import { readDoc, KEYS } from '../lib/kv.mjs'
import { beforeOchtend } from '../../shared/slot-times.mjs'
import { warmEdition } from '../lib/warm.mjs'

const editionId = (doc) => {
  try {
    return JSON.parse(doc?.body || 'null')?.edition?.id || null
  } catch {
    return null
  }
}

// Alleen bij een nieuw dagdeel (een ander Editie-id dan voor deze ronde), en alleen met een adres van de site.
export const shouldWarm = (before, after, base) => !!after && after !== before && !!base

export { warmEdition } // voor de tests (tests/editie-sneller.test.mjs)

export default async () => {
  const prior = await readDoc(KEYS.core)
  if (beforeOchtend()) {
    if (prior && Date.now() - Date.parse(prior.builtAt) < 29 * 6e4) return new Response('nachtrust')
  }
  const snap = await refresh()
  const base = process.env.URL || ''
  if (shouldWarm(editionId(prior), editionId(snap), base)) await warmEdition(base)
  return new Response(`ok ${snap.builtAt}`)
}

export const config = { schedule: '*/10 * * * *' }
