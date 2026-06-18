import { useCallback, useEffect, useState } from 'react'

const KEY = 'hoot:read'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export function useReadState() {
  const [read, setRead] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...read].slice(-1000)))
    } catch {
      /* opslag kan vol/geblokkeerd zijn — niet erg */
    }
  }, [read])

  const markRead = useCallback((id) => {
    setRead((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  return { read, markRead }
}
