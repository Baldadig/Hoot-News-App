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
  // Status- en browserbalk in de kleur van het papier, ook als je zelf een thema kiest.
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    m.setAttribute('content', dark ? '#0f0f11' : '#fbfaf7')
    m.removeAttribute('media')
  }
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
