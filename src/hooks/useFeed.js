import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchFeed } from '../lib/api.js'

const CACHE_KEY = 'hoot:feed-cache'

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function cache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    /* opslag vol — geen ramp */
  }
}

export function useFeed() {
  const cached = loadCache()
  const [items, setItems] = useState(cached?.items ?? [])
  const [trending, setTrending] = useState(cached?.trending ?? [])
  const [meta, setMeta] = useState(cached?.meta ?? null)
  const [status, setStatus] = useState(cached?.items?.length ? 'ready' : 'loading') // loading | ready | error
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const ctrl = useRef(null)
  const hasItems = useRef((cached?.items?.length ?? 0) > 0)
  const itemsRef = useRef(items)
  itemsRef.current = items
  const pendingData = useRef(null)

  const apply = useCallback((data) => {
    setItems(data.items || [])
    setTrending(data.trending || [])
    setMeta(data.meta || null)
    hasItems.current = (data.items || []).length > 0
    cache(data)
  }, [])

  // defer=true (auto-refresh): nieuwe items wachten op een pill i.p.v. de feed te verschuiven.
  const load = useCallback(
    async ({ defer } = {}) => {
      ctrl.current?.abort()
      const controller = new AbortController()
      ctrl.current = controller
      const isRefresh = hasItems.current
      if (isRefresh) setRefreshing(true)
      else setStatus('loading')
      try {
        const data = await fetchFeed({ signal: controller.signal })
        const next = data.items || []
        setRefreshError(false)
        if (defer && isRefresh) {
          const curIds = new Set(itemsRef.current.map((i) => i.id))
          const fresh = next.filter((i) => !curIds.has(i.id))
          if (fresh.length) {
            // Houd nieuwe items vast; toon ze via de pill. Cache wél bijwerken.
            pendingData.current = data
            setPendingCount(fresh.length)
            cache(data)
          } else {
            // Niets nieuws: versheid + trending stil bijwerken (geen verschuiving).
            setTrending(data.trending || [])
            setMeta(data.meta || null)
            cache(data)
          }
        } else {
          pendingData.current = null
          setPendingCount(0)
          apply(data)
        }
        setStatus('ready')
      } catch (e) {
        if (e.name === 'AbortError') return
        if (!hasItems.current) setStatus('error')
        else setRefreshError(true)
      } finally {
        setRefreshing(false)
      }
    },
    [apply]
  )

  // Wachtende nieuwe items tonen.
  const applyPending = useCallback(() => {
    if (pendingData.current) {
      apply(pendingData.current)
      pendingData.current = null
    }
    setPendingCount(0)
  }, [apply])

  // Handmatig verversen (knop/pull): direct toepassen, geen pill.
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

  return { items, trending, meta, status, refreshing, refreshError, reload, pendingCount, applyPending }
}
