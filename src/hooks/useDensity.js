import { useCallback, useEffect, useState } from 'react'

const KEY = 'hoot:density' // 'comfortable' | 'compact'

function getPref() {
  try {
    return localStorage.getItem(KEY) === 'compact' ? 'compact' : 'comfortable'
  } catch {
    return 'comfortable'
  }
}

export function useDensity() {
  const [density, setState] = useState(getPref)

  useEffect(() => {
    document.documentElement.dataset.density = density
    try {
      localStorage.setItem(KEY, density)
    } catch {
      /* opslag geblokkeerd — niet erg */
    }
  }, [density])

  const setDensity = useCallback((d) => setState(d === 'compact' ? 'compact' : 'comfortable'), [])

  return { density, setDensity }
}
