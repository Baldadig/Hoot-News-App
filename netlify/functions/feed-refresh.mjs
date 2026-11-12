// Elke 10 minuten de feed opnieuw samenstellen; 's nachts (tot de Ochtendeditie) elk half uur.
// De nachtrust stopt precies op de start van de ochtend (shared/slot-times.mjs), zodat de eerste
// ronde daarna de Ochtendeditie vastlegt en niet een half uur wacht.
// Legt deze ronde een nieuw dagdeel vast, dan maken we /api/edition meteen warm (Editie sneller,
// Hoot-design/editie-sneller/METING.md §4A): de eerste lezers van het nieuwe dagdeel betalen dan niet de koude
// start en het lezen van alle delen. Eén aanroep per dagdeel, zonder profiel.
import { refresh } from '../lib/refresh.mjs'
import { readDoc, KEYS } from '../lib/kv.mjs'
import { beforeOchtend } from '../../shared/slot-times.mjs'

const editionId = (doc) => {
  try {
    return JSON.parse(doc?.body || 'null')?.edition?.id || null
  } catch {
    return null
  }
}

// Alleen bij een nieuw dagdeel (een ander Editie-id dan voor deze ronde), en alleen met een adres van de site.
export const shouldWarm = (before, after, base) => !!after && after !== before && !!base

// POST /api/edition { v: 2, warm: true }: de kern en alle delen in het geheugen, één keer rekenen. Mislukt het,
// dan niets: het is alleen een voorsprong.
export async function warmEdition(base, { fetchImpl = fetch, timeout = 15000 } = {}) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeout)
  try {
    const r = await fetchImpl(`${base}/api/edition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ v: 2, warm: true }), signal: ctl.signal })
    return r.status
  } catch {
    return 0
  } finally {
    clearTimeout(timer)
  }
}

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
