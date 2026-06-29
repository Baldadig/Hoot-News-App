import { useEffect, useRef } from 'react'

// Power-user navigatie: j/k = volgende/vorige kaart, o/Enter = openen,
// s = bewaren, r = verversen, g = naar boven. Negeert invoervelden en modifiers.
export default function useKeyboardNav(containerRef, { onRefresh } = {}) {
  const cursor = useRef(-1)

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return
      const root = containerRef.current
      if (!root) return
      const cards = [...root.querySelectorAll('.card:not(.card--skel)')]

      const focus = (idx) => {
        cursor.current = idx
        cards.forEach((c, i) => c.classList.toggle('card--cursor', i === idx))
        const card = cards[idx]
        card?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        card?.querySelector('.card__body')?.focus({ preventScroll: true })
      }

      switch (e.key) {
        case 'j':
          if (!cards.length) return
          e.preventDefault()
          focus(Math.min((cursor.current < 0 ? -1 : cursor.current) + 1, cards.length - 1))
          break
        case 'k':
          if (!cards.length) return
          e.preventDefault()
          focus(Math.max(cursor.current - 1, 0))
          break
        case 'o':
        case 'Enter':
          cards[cursor.current]?.querySelector('.card__body')?.click()
          break
        case 's':
          cards[cursor.current]?.querySelector('.save')?.click()
          break
        case 'r':
          e.preventDefault()
          onRefresh?.()
          break
        case 'g':
          e.preventDefault()
          cursor.current = -1
          cards.forEach((c) => c.classList.remove('card--cursor'))
          root.scrollTo({ top: 0, behavior: 'smooth' })
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [containerRef, onRefresh])
}
