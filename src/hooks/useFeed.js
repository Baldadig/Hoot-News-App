import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCore, fetchPart, fetchRelated } from '../lib/api.js'
import { takeFeedCache, saveFeedCache } from '../lib/feedCache.js'
import { wantedSources } from '../lib/feedParts.js'
import { createFeedRounds, normalize } from '../lib/feedRounds.js'

export { wantedSources }

// De feed: eerst de kern, dan per gevolgde bron de berichten (alleen wat veranderde). De rondes zelf staan
// los van React in src/lib/feedRounds.js (getest in tests/editie-p0-dekking.test.mjs); dit is de laag
// eromheen: state voor de weergave, verversen bij terugkomen en elk kwartier, en een nieuwe ronde als je
// bronkeuze verandert.
// `stuck`: de berichten dekken je bronnen van nu niet, ook niet na één extra ronde (offline, een bron die
// niet antwoordt). Jouw Editie valt dan terug op wat vastligt of op de server (usePersonalEdition).
export function useFeed(prefs) {
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const [data, setData] = useState(() => normalize(takeFeedCache()))
  const [status, setStatus] = useState(() => (data ? 'ready' : 'loading')) // loading | ready | error
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [stuck, setStuck] = useState(false)

  const rounds = useRef(null)
  if (!rounds.current) {
    rounds.current = createFeedRounds({
      initial: data,
      fetchCore,
      fetchPart,
      fetchRelated,
      getPrefs: () => prefsRef.current,
      save: saveFeedCache,
      on: { data: setData, status: setStatus, refreshing: setRefreshing, refreshError: setRefreshError, pending: setPendingCount, stuck: setStuck },
    })
  }

  // Zet je een bron aan of uit (of geeft je account andere bronnen), dan meteen de berichten erbij halen of weglaten.
  const wantKey = data ? wantedSources(data.sources, prefs).join(',') : ''
  const firstKey = useRef(wantKey)
  useEffect(() => {
    if (!rounds.current.data || wantKey === firstKey.current) return
    firstKey.current = wantKey
    return rounds.current.wantChanged()
  }, [wantKey])

  const applyPending = useCallback(() => rounds.current.applyPending(), [])
  const loadRelated = useCallback(() => rounds.current.loadRelated(), [])
  const reload = useCallback(() => rounds.current.load({ defer: false }), [])

  useEffect(() => {
    const r = rounds.current
    r.load({ defer: false })
    const onVisible = () => {
      if (document.visibilityState === 'visible') r.load({ defer: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') r.load({ defer: true })
    }, 15 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
      r.abort()
    }
  }, [])

  return { data, status, refreshing, refreshError, reload, pendingCount, applyPending, loadRelated, stuck }
}
