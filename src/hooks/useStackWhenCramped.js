import { useLayoutEffect, useRef } from 'react'

// Actieregel (.meta): past de bronnaam of de tijd niet naast de knoppen, dan breekt hij in de kolom en
// groeit de rij ongelijk. Liever de vaste tweeregelige vorm van de smalle kolom (.meta[data-stack]): de
// bron krijgt een eigen regel, de knoppen staan eronder op hun plek. Een naam wordt nooit afgekapt.
// Meet bij elke breedte- of lettermaatwijziging opnieuw, met de stapeling eerst even uit.
const wrapped = (meta) => {
  for (const el of meta.querySelectorAll('.srcmeta__name, .srcmeta__time')) {
    const lh = parseFloat(getComputedStyle(el).lineHeight) || el.getBoundingClientRect().height
    if (el.getBoundingClientRect().height > lh * 1.5) return true
  }
  return false
}

export function useStackWhenCramped(dep) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const meta = ref.current
    if (!meta) return undefined
    let last = ''
    const measure = () => {
      const key = `${Math.round(meta.getBoundingClientRect().width)}|${getComputedStyle(meta).fontSize}`
      if (key === last) return
      last = key
      meta.removeAttribute('data-stack')
      if (wrapped(meta)) meta.setAttribute('data-stack', '')
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(meta)
    let gone = false
    document.fonts?.ready?.then(() => {
      if (gone) return
      last = ''
      measure()
    })
    return () => {
      gone = true
      ro.disconnect()
    }
  }, [dep])
  return ref
}
