import { useCallback, useEffect, useRef, useState } from 'react'
import { readJSON, writeJSON } from '../lib/store.js'

const KEY = 'hoot:vak'

// De Selectie (GET /api/vak). Pas ophalen als je de tab hebt aangezet; de laatste versie blijft op
// het toestel, zodat de tab ook offline iets laat zien. Opnieuw ophalen bij openen als de
// volgende week al begonnen is, of als het een voorproefje was (dat groeit elk uur).
export function useVak(enabled) {
  const [digest, setDigest] = useState(() => readJSON(KEY, null))
  const [status, setStatus] = useState(digest ? 'ready' : 'idle')
  const busy = useRef(false)

  const load = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setStatus((s) => (s === 'ready' ? 'refreshing' : 'loading'))
    try {
      const res = await fetch('/api/vak', { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const d = await res.json()
      setDigest(d)
      writeJSON(KEY, d)
      setStatus('ready')
    } catch {
      setStatus((s) => (s === 'refreshing' || readJSON(KEY, null) ? 'ready' : 'error'))
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const stale = !digest || digest.preview || Date.now() >= Date.parse(digest.next) || Date.now() - Date.parse(digest.builtAt) > 6 * 36e5
    if (stale) load()
  }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return { digest, status, reload: load }
}
