import { useCallback, useEffect, useState } from 'react'
import { fetchAuthorItems } from '../lib/bluesky.js'

const LEGACY = 'hoot:social-sources' // tot 1.49: los in de opslag, niet in je instellingen

function legacy() {
  try {
    const arr = JSON.parse(localStorage.getItem(LEGACY) || '[]')
    return Array.isArray(arr) ? arr.filter((a) => a && typeof a.handle === 'string') : []
  } catch {
    return []
  }
}

// Beheert de zelf-toegevoegde Bluesky-bronnen en haalt hun posts op. Ze staan in je instellingen
// (`social`), zodat ze met je account meegaan naar je andere toestellen en de app.
export function useSocialSources(refreshKey = 0, sources = [], setSources = () => {}) {
  const [items, setItems] = useState([])

  // Eenmalig overzetten uit de oude, losse opslag.
  useEffect(() => {
    const old = legacy()
    if (old.length && !sources.length) setSources(old)
    if (old.length) {
      try {
        localStorage.removeItem(LEGACY)
      } catch {
        /* geen opslag: dan de volgende keer opnieuw */
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addSource = useCallback(
    (profile) => {
      if (sources.some((p) => p.handle === profile.handle)) return
      setSources([...sources, { handle: profile.handle, name: profile.name, avatar: profile.avatar }])
    },
    [sources, setSources]
  )

  const removeSource = useCallback((handle) => setSources(sources.filter((p) => p.handle !== handle)), [sources, setSources])

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
