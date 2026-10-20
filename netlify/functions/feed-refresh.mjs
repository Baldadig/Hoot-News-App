// Elke 10 minuten de feed opnieuw samenstellen; 's nachts (00–06 uur) elk half uur.
import { refresh } from '../lib/refresh.mjs'
import { readSnapshot } from '../lib/kv.mjs'

const hourInAmsterdam = () => Number(new Intl.DateTimeFormat('nl-NL', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Amsterdam' }).format(new Date()))

export default async () => {
  if (hourInAmsterdam() < 6) {
    const snap = await readSnapshot()
    if (snap && Date.now() - Date.parse(snap.builtAt) < 29 * 6e4) return new Response('nachtrust')
  }
  const snap = await refresh()
  return new Response(`ok ${snap.builtAt}`)
}

export const config = { schedule: '*/10 * * * *' }
