import { useCallback, useEffect, useState } from 'react'

const KEY = 'hoot:theme' // 'system' | 'light' | 'dark'

function getPref() {
  try {
    return localStorage.getItem(KEY) || 'system'
  } catch {
    return 'system'
  }
}

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function apply(pref) {
  const dark = pref === 'dark' || (pref !== 'light' && systemDark())
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setThemeState] = useState(getPref)

  useEffect(() => {
    apply(theme)
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* opslag geblokkeerd — niet erg */
    }
    if (theme !== 'system' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [theme])

  const setTheme = useCallback((t) => setThemeState(t), [])

  return { theme, setTheme }
}
