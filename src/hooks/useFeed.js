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

export function useFeed() {
  const cached = loadCache()
  const [items, setItems] = useState(cached?.items ?? [])
  const [meta, setMeta] = useState(cached?.meta ?? null)
  const [status, setStatus] = useState(cached?.items?.length ? 'ready' : 'loading') // loading | ready | error
  const [refreshing, setRefreshing] = useState(false)

  const ctrl = useRef(null)
  const hasItems = useRef((cached?.items?.length ?? 0) > 0)

  const load = useCallback(async ({ silent } = {}) => {
    ctrl.current?.abort()
    const controller = new AbortController()
    ctrl.current = controller
    if (silent) setRefreshing(true)
    else if (!hasItems.current) setStatus('loading')
    try {
      const data = await fetchFeed({ signal: controller.signal })
      const next = data.items || []
      setItems(next)
      setMeta(data.meta || null)
      hasItems.current = next.length > 0
      setStatus('ready')
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data))
      } catch {
        /* opslag vol — geen ramp */
      }
    } catch (e) {
      if (e.name === 'AbortError') return
      if (!hasItems.current) setStatus('error')
    } finally {
      setRefreshing(false)
    }
  }, [])

  const reload = useCallback(() => load({ silent: true }), [load])

  useEffect(() => {
    load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') load({ silent: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      ctrl.current?.abort()
    }
  }, [load])

  return { items, meta, status, refreshing, reload }
}
