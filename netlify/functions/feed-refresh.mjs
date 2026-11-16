// Elke 10 minuten de feed opnieuw samenstellen; 's nachts (tot de Ochtendeditie) elk half uur.
// Vlak vóór de ochtend (OCHTEND_VOORAF in shared/slot-times.mjs, besluit Alex 16 november 2026) geen nachtrust: dan legt
// elke ronde de Ochtendeditie al vast en schrijft ze de kern met die Editie onder de sleutel `volgend` (refresh.mjs).
// Vanaf de start van de ochtend geven /api/feed en /api/edition die kern (netlify/lib/dagdeel-kern.mjs), dus ligt de
// Ochtendeditie er op de start, ook terwijl de eerste ronde van de ochtend nog loopt. Die ronde vindt de Ochtendeditie
// al vastgelegd en schrijft de gewone kern.
// Legt deze ronde een nieuw dagdeel vast, dan maken we /api/edition meteen warm (Editie sneller,
// Hoot-design/editie-sneller/METING.md §4A): de eerste lezers van het nieuwe dagdeel betalen dan niet de koude
// start en het lezen van alle delen. Eén aanroep per dagdeel, zonder profiel.
import { refresh } from '../lib/refresh.mjs'
import { readDoc, KEYS } from '../lib/kv.mjs'
import { beforeOchtend, ochtendVooraf } from '../../shared/slot-times.mjs'
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

// Wat deze ronde doet: 'vooraf' (de Ochtendeditie al vastleggen), 'nachtrust' (overslaan) of 'gewoon'.
// `priorBuiltAt`: wanneer de gewone kern het laatst geschreven is.
export function rondeVan(now = new Date(), priorBuiltAt = null) {
  if (ochtendVooraf(now)) return 'vooraf'
  if (beforeOchtend(now) && priorBuiltAt && now.getTime() - Date.parse(priorBuiltAt) < 29 * 6e4) return 'nachtrust'
  return 'gewoon'
}

export default async () => {
  const now = new Date()
  const prior = await readDoc(KEYS.core)
  const ronde = rondeVan(now, prior?.builtAt)
  if (ronde === 'nachtrust') return new Response('nachtrust')
  if (ronde === 'vooraf') {
    const snap = await refresh({ slot: ochtendVooraf(now) })
    return new Response(`vooraf ${snap.slot} ${snap.builtAt}`)
  }
  const snap = await refresh()
  const base = process.env.URL || ''
  if (shouldWarm(editionId(prior), editionId(snap), base)) await warmEdition(base)
  return new Response(`ok ${snap.builtAt}`)
}

export const config = { schedule: '*/10 * * * *' }
