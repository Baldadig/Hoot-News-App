import { useCallback, useEffect, useState } from 'react'
import { fetchAuthorItems } from '../lib/bluesky.js'

const KEY = 'hoot:social-sources' // [{ handle, name, avatar }]

function load() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function persist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* opslag vol — niet erg */
  }
}

// Beheert de zelf-toegevoegde Bluesky-bronnen (localStorage) en haalt hun posts op.
export function useSocialSources(refreshKey = 0) {
  const [sources, setSources] = useState(load)
  const [items, setItems] = useState([])

  const addSource = useCallback((profile) => {
    setSources((prev) => {
      if (prev.some((p) => p.handle === profile.handle)) return prev
      const next = [...prev, { handle: profile.handle, name: profile.name, avatar: profile.avatar }]
      persist(next)
      return next
    })
  }, [])

  const removeSource = useCallback((handle) => {
    setSources((prev) => {
      const next = prev.filter((p) => p.handle !== handle)
      persist(next)
      return next
    })
  }, [])

  useEffect(() => {
    let alive = true
    if (!sources.length) {
      setItems([])
      return
    }
    Promise.all(sources.map((s) => fetchAuthorItems(s.handle, s.name).catch(() => [])))
      .then((lists) => {
        if (alive) setItems(lists.flat())
      })
    return () => {
      alive = false
    }
  }, [sources, refreshKey])

  return { sources, items, addSource, removeSource }
}
