import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchFeed } from '../lib/api.js'
import { readJSON, writeJSON } from '../lib/store.js'
import { carryOver } from '../lib/sourceStatus.js'
import { freshCount } from '../lib/fresh.js'

const CACHE_KEY = 'hoot:feed-v2'

// Eén vaste vorm, ook als de server (of een oude cache) een veld mist.
function normalize(d) {
  if (!d || !Array.isArray(d.items)) return null
  return {
    sources: Array.isArray(d.sources) ? d.sources : [],
    items: d.items,
    related: Array.isArray(d.related) ? d.related : [],
    stories: Array.isArray(d.stories) ? d.stories : [],
    edition: d.edition && Array.isArray(d.edition.entries) ? d.edition : null,
    meta: d.meta || null,
  }
}

export function useFeed(muted) {
  const [data, setData] = useState(() => normalize(readJSON(CACHE_KEY, null)))
  const [status, setStatus] = useState(() => (data ? 'ready' : 'loading')) // loading | ready | error
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const ctrl = useRef(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const pending = useRef(null)
  const mutedRef = useRef(muted)
  mutedRef.current = muted

  const apply = useCallback((next) => {
    setData(next)
    writeJSON(CACHE_KEY, next)
  }, [])

  // defer=true (automatisch verversen): nieuwe berichten wachten achter een knop,
  // zodat de inhoud niet verspringt terwijl je leest.
  const load = useCallback(
    async ({ defer } = {}) => {
      ctrl.current?.abort()
      const controller = new AbortController()
      ctrl.current = controller
      const had = !!dataRef.current
      if (had) setRefreshing(true)
      else setStatus('loading')
      try {
        const fetched = normalize(await fetchFeed({ signal: controller.signal }))
        if (!fetched) throw new Error('Onverwacht antwoord')
        // Valt een bron uit, dan blijven de berichten staan die we er al van hadden.
        const next = carryOver(dataRef.current, fetched)
        setRefreshError(false)
        if (defer && had) {
          const fresh = freshCount(dataRef.current.items, next.items, mutedRef.current)
          if (fresh) {
            pending.current = next
            setPendingCount(fresh)
            writeJSON(CACHE_KEY, next)
          } else {
            // Niets nieuws in de Stroom: alleen de status (ophaaltijd, bronnen) bijwerken.
            apply({ ...dataRef.current, meta: next.meta, sources: next.sources })
          }
        } else {
          pending.current = null
          setPendingCount(0)
          apply(next)
        }
        setStatus('ready')
      } catch (e) {
        if (e.name === 'AbortError') return
        if (!dataRef.current) setStatus('error')
        else setRefreshError(true)
      } finally {
        setRefreshing(false)
      }
    },
    [apply]
  )

  const applyPending = useCallback(() => {
    if (pending.current) {
      apply(pending.current)
      pending.current = null
    }
    setPendingCount(0)
  }, [apply])

  const reload = useCallback(() => load({ defer: false }), [load])

  useEffect(() => {
    load({ defer: false })
    const onVisible = () => {
      if (document.visibilityState === 'visible') load({ defer: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load({ defer: true })
    }, 15 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
      ctrl.current?.abort()
    }
  }, [load])

  return { data, status, refreshing, refreshError, reload, pendingCount, applyPending }
}
