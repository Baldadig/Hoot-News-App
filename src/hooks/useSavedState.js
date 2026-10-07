import { useCallback, useEffect, useMemo, useState } from 'react'

// Leeslijst in de app zelf: we bewaren het hele item, zodat het ook terug te vinden
// is als het al uit de feed is verdwenen. { [id]: { ...item, savedAt } }
const KEY = 'hoot:saved-items'
const MAX = 300

function load() {
  try {
    const obj = JSON.parse(localStorage.getItem(KEY) || '{}')
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {}
  } catch {
    return {}
  }
}

export function useSavedState() {
  const [saved, setSaved] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved))
    } catch {
      /* opslag vol/geblokkeerd — niet erg */
    }
  }, [saved])

  const toggleSaved = useCallback((item) => {
    setSaved((prev) => {
      const next = { ...prev }
      if (next[item.id]) delete next[item.id]
      else next[item.id] = { ...item, savedAt: Date.now() }
      const ids = Object.keys(next)
      if (ids.length > MAX) {
        ids.sort((a, b) => next[a].savedAt - next[b].savedAt)
        for (const id of ids.slice(0, ids.length - MAX)) delete next[id]
      }
      return next
    })
  }, [])

  // Laatst bewaard bovenaan
  const savedList = useMemo(() => Object.values(saved).sort((a, b) => b.savedAt - a.savedAt), [saved])

  return { saved, savedList, toggleSaved }
}
