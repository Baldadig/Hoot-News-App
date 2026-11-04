// Elke 10 minuten de feed opnieuw samenstellen; 's nachts (tot de Ochtendeditie) elk half uur.
// De nachtrust stopt precies op de start van de ochtend (shared/slot-times.mjs), zodat de eerste
// ronde daarna de Ochtendeditie vastlegt en niet een half uur wacht.
import { refresh } from '../lib/refresh.mjs'
import { readDoc, KEYS } from '../lib/kv.mjs'
import { beforeOchtend } from '../../shared/slot-times.mjs'

export default async () => {
  if (beforeOchtend()) {
    const snap = await readDoc(KEYS.core)
    if (snap && Date.now() - Date.parse(snap.builtAt) < 29 * 6e4) return new Response('nachtrust')
  }
  const snap = await refresh()
  return new Response(`ok ${snap.builtAt}`)
}

export const config = { schedule: '*/10 * * * *' }
