import { useEffect, useCallback } from 'react'
import { brandBarHeld } from '../components/Brand.jsx'
import { themePref, darkPref, resolvedTheme } from '../lib/theme.js'

export function applyTheme(theme, themeDark, systemDark) {
  const actual = resolvedTheme(theme, themeDark, systemDark)
  const root = document.documentElement
  root.dataset.theme = actual
  root.style.colorScheme = actual === 'light' ? 'light' : 'dark'
  if (brandBarHeld()) return
  const top = actual === 'night' ? '#000000' : getComputedStyle(root).getPropertyValue('--top').trim() || (actual === 'dark' ? '#151310' : '#f5f1e8')
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.content = top; meta.removeAttribute('media')
  }
}

export function useTheme(palette, prefs, setPref) {
  const theme = themePref(prefs.theme)
  const themeDark = darkPref(prefs.themeDark)
  useEffect(() => {
    const root = document.documentElement
    if (palette === 'blad' || palette === 'inkt') root.dataset.palette = palette
    else delete root.dataset.palette
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const apply = () => applyTheme(theme, themeDark, !!mq?.matches)
    apply()
    try { localStorage.setItem('hoot:theme', theme); localStorage.setItem('hoot:theme-dark', themeDark) } catch {}
    if (theme !== 'system') return
    mq?.addEventListener?.('change', apply)
    return () => mq?.removeEventListener?.('change', apply)
  }, [theme, themeDark, palette])
  return { theme, themeDark, setTheme: useCallback(t => setPref('theme', themePref(t)), [setPref]), setThemeDark: useCallback(t => setPref('themeDark', darkPref(t)), [setPref]) }
}
