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
  // Status- en browserbalk in de kleur van de bovenkant van het scherm (--top: papier, of het
  // witte blad bij de kleuren Blad en Inkt), ook als je zelf een thema kiest.
  const top = getComputedStyle(document.documentElement).getPropertyValue('--top').trim() || (dark ? '#151310' : '#f5f1e8')
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    m.setAttribute('content', top)
    m.removeAttribute('media')
  }
}

// `palette`: de kleurverdeling (prefs.palette); die verandert de kleur van de bovenkant.
export function useTheme(palette) {
  const [theme, setThemeState] = useState(getPref)

  useEffect(() => {
    if (palette === 'blad' || palette === 'inkt') document.documentElement.dataset.palette = palette
    else delete document.documentElement.dataset.palette
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
  }, [theme, palette])

  const setTheme = useCallback((t) => setThemeState(t), [])

  return { theme, setTheme }
}
