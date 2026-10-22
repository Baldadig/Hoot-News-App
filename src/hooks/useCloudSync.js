import { useEffect, useRef, useState } from 'react'
import { mergePrefs, mergeRead, mergeSeen, mergeSaved, savedDiff, pickSynced } from '../lib/sync.js'

const MARK = 'hoot:synced-user' // dit toestel is al eens met dit account samengevoegd

// Houdt instellingen, gelezen, geziene verhalen en Bewaard gelijk met je account.
// - Eerste keer inloggen op een toestel: alles van beide kanten samenvoegen (niets gaat verloren).
// - Daarna: wijzigingen gaan na een paar tellen naar de server; terug in de app (ander toestel
//   gebruikt?) halen we de stand van de server op. Voor Bewaard is de server dan de waarheid,
//   zodat iets wat je elders verwijderde ook hier verdwijnt.
export function useCloudSync(account, { prefs, setPrefs, saved, setSaved, readIds, setReadIds, seen, setSeen }) {
  const [status, setStatus] = useState('idle') // idle | syncing | ok | error
  const uid = account.status === 'in' ? account.user.id : null
  const client = account.client
  const base = useRef(null) // laatst bekende stand op de server: { saved, state }
  const latest = useRef({})
  latest.current = { prefs, saved, readIds, seen }

  // Ophalen en samenvoegen.
  useEffect(() => {
    if (!uid) {
      base.current = null
      return
    }
    let alive = true
    const pull = async (first) => {
      setStatus('syncing')
      const [st, sv] = await Promise.all([client.from('user_state').select('prefs, read_ids, stories_seen').eq('user_id', uid).maybeSingle(), client.from('saved_items').select('key, entry')])
      if (!alive) return
      if (st.error || sv.error) return setStatus('error')
      const remote = st.data || { prefs: {}, read_ids: [], stories_seen: {} }
      const remoteSaved = Object.fromEntries((sv.data || []).map((r) => [r.key, r.entry]))
      const cur = latest.current
      const nextSaved = first ? mergeSaved(cur.saved, remoteSaved) : remoteSaved
      const hasRemotePrefs = Object.keys(remote.prefs || {}).length > 0
      setPrefs((p) => (hasRemotePrefs ? mergePrefs(p, remote.prefs) : p))
      setReadIds((r) => mergeRead(remote.read_ids, r))
      setSeen((s) => mergeSeen(remote.stories_seen, s))
      setSaved(nextSaved)
      base.current = { saved: remoteSaved, state: null }
      try {
        localStorage.setItem(MARK, uid)
      } catch {
        /* niet erg */
      }
      setStatus('ok')
    }
    let first = true
    try {
      first = localStorage.getItem(MARK) !== uid
    } catch {
      /* eerste keer */
    }
    pull(first)
    const onVisible = () => document.visibilityState === 'visible' && pull(false)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [uid]) // eslint-disable-line react-hooks/exhaustive-deps

  // Instellingen, gelezen en geziene verhalen: na 2 seconden rust één keer opslaan.
  const stateJson = JSON.stringify([pickSynced(prefs), readIds, seen])
  useEffect(() => {
    if (!uid || !base.current || base.current.state === stateJson) return
    const t = setTimeout(async () => {
      const { error } = await client.from('user_state').upsert({ user_id: uid, prefs: pickSynced(prefs), read_ids: readIds, stories_seen: seen, updated_at: new Date().toISOString() })
      if (base.current) base.current.state = stateJson
      setStatus(error ? 'error' : 'ok')
    }, 2000)
    return () => clearTimeout(t)
  }, [uid, stateJson]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bewaard: alleen wat veranderde, meteen.
  useEffect(() => {
    if (!uid || !base.current) return
    const { upserts, deletes } = savedDiff(base.current.saved, saved)
    if (!upserts.length && !deletes.length) return
    base.current.saved = saved
    ;(async () => {
      const ops = []
      if (upserts.length) ops.push(client.from('saved_items').upsert(upserts.map((key) => ({ user_id: uid, key, entry: saved[key], saved_at: new Date(saved[key].savedAt || Date.now()).toISOString() }))))
      if (deletes.length) ops.push(client.from('saved_items').delete().in('key', deletes))
      const res = await Promise.all(ops)
      setStatus(res.some((r) => r.error) ? 'error' : 'ok')
    })()
  }, [uid, saved]) // eslint-disable-line react-hooks/exhaustive-deps

  return status
}
