import { useCallback, useEffect, useRef, useState } from 'react'
import { pickSynced } from '../lib/sync.js'
import { SyncEngine, forgetAccount, ownerOf } from '../lib/syncEngine.js'

// Houdt instellingen, gelezen, geziene verhalen en Bewaard gelijk met je account (zie
// src/lib/syncEngine.js voor de regels: van wie de gegevens zijn, wat nog openstaat, opnieuw
// proberen). Geeft de status terug, en `forget` voor bij uitloggen.
// status: idle | pending (wacht op verbinding of bundelt) | syncing | ok | error (probeert opnieuw)
export function useCloudSync(account, { prefs, setPrefs, saved, setSaved, readIds, setReadIds, seen, setSeen }) {
  const [status, setStatus] = useState('idle')
  const uid = account.status === 'in' ? account.user.id : null
  const client = account.client
  const engine = useRef(null)
  const latest = useRef({})
  latest.current = { prefs, saved, read: readIds, seen }

  const getLocal = useCallback(() => latest.current, [])
  const setLocal = useCallback(
    (next) => {
      latest.current = next
      setPrefs(next.prefs)
      setReadIds(next.read)
      setSeen(next.seen)
      setSaved(next.saved)
    },
    [setPrefs, setReadIds, setSeen, setSaved]
  )

  useEffect(() => {
    if (!uid || !client) return
    // Elke query noemt de gebruiker zelf; de database (row level security) dwingt dat ook af.
    const api = {
      async pull() {
        const [st, sv] = await Promise.all([client.from('user_state').select('prefs, read_ids, stories_seen').eq('user_id', uid).maybeSingle(), client.from('saved_items').select('key, entry').eq('user_id', uid)])
        if (st.error || sv.error) throw st.error || sv.error
        const s = st.data || {}
        return { prefs: s.prefs || {}, read: s.read_ids || [], seen: s.stories_seen || {}, saved: Object.fromEntries((sv.data || []).map((r) => [r.key, r.entry])) }
      },
      async pushState(local) {
        const { error } = await client.from('user_state').upsert({ user_id: uid, prefs: pickSynced(local.prefs), read_ids: local.read, stories_seen: local.seen, updated_at: new Date().toISOString() })
        if (error) throw error
      },
      async upsertSaved(rows) {
        const { error } = await client.from('saved_items').upsert(rows.map(([key, entry]) => ({ user_id: uid, key, entry, saved_at: new Date(entry.savedAt || Date.now()).toISOString() })))
        if (error) throw error
      },
      async deleteSaved(keys) {
        const { error } = await client.from('saved_items').delete().eq('user_id', uid).in('key', keys)
        if (error) throw error
      },
    }
    const e = new SyncEngine({ uid, api, storage: localStorage, getLocal, setLocal, onStatus: setStatus, isOnline: () => navigator.onLine !== false })
    engine.current = e
    e.start()
    const onOnline = () => e.online()
    const onVisible = () => document.visibilityState === 'visible' && e.pull()
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      e.stop()
      engine.current = null
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [uid, client, getLocal, setLocal])

  // Ingelogd met een account dat (nog) geen lid is, terwijl hier gegevens van een ánder account
  // staan: die horen niet bij deze gebruiker.
  const otherUser = account.status === 'noInvite' ? account.user?.id : null
  useEffect(() => {
    if (!otherUser) return
    const owner = ownerOf(localStorage)
    if (owner !== 'anon' && owner !== otherUser) forgetAccount(localStorage, setLocal, latest.current.prefs)
  }, [otherUser, setLocal])

  // Elke lokale wijziging: de motor bepaalt wat er openstaat (ten opzichte van de bevestigde basis).
  const stateKey = JSON.stringify([pickSynced(prefs), readIds.length, Object.keys(seen).length])
  useEffect(() => {
    engine.current?.changed()
  }, [stateKey, saved, readIds, seen])

  // Uitloggen: de gegevens van dit account van het toestel halen.
  const forget = useCallback(() => {
    engine.current?.stop()
    engine.current = null
    forgetAccount(localStorage, setLocal, latest.current.prefs)
    setStatus('idle')
  }, [setLocal])

  return { status, forget }
}
