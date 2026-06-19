import { useCallback, useEffect, useState } from 'react'

const KEY = 'hoot:saved'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export function useSavedState() {
  const [saved, setSaved] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...saved].slice(-1000)))
    } catch {
      /* opslag vol/geblokkeerd — niet erg */
    }
  }, [saved])

  const markSaved = useCallback((id) => {
    setSaved((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  return { saved, markSaved }
}
