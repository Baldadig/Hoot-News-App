import { useEffect, useRef } from 'react'
import { readJSON, writeJSON } from '../lib/store.js'

// Onthoudt de leespositie van een scrollgebied — niet in pixels maar als "dit bericht
// stond bovenaan", zodat hervatten ook klopt na herladen of als er inhoud bij is gekomen.
// `stamp` verandert als de inhoud verandert; zolang je zelf nog niet hebt gescrold zetten
// we de positie dan opnieuw (de verse feed komt vaak net ná de eerste weergave binnen).
const MAX_AGE = 12 * 60 * 60 * 1000
const SETTLE = 6000

export function useScrollMemory(ref, key, ready, stamp) {
  const st = useRef({ armed: false, user: false, t0: Date.now() })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer = null
    const save = () => {
      timer = null
      const top = el.getBoundingClientRect().top
      for (const node of el.querySelectorAll('[data-id]')) {
        const r = node.getBoundingClientRect()
        if (r.bottom > top + 1) {
          writeJSON(key, { id: node.dataset.id, offset: Math.round(r.top - top), at: Date.now(), y: Math.round(el.scrollTop) })
          return
        }
      }
    }
    const onScroll = () => {
      if (st.current.armed && !timer) timer = setTimeout(save, 250)
    }
    const onUser = () => {
      st.current.user = true
      st.current.armed = true
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    for (const ev of ['wheel', 'touchstart', 'pointerdown', 'keydown']) el.addEventListener(ev, onUser, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      for (const ev of ['wheel', 'touchstart', 'pointerdown', 'keydown']) el.removeEventListener(ev, onUser)
      if (timer) clearTimeout(timer)
    }
  }, [ref, key])

  useEffect(() => {
    const s = st.current
    if (!ready || s.user || Date.now() - s.t0 > SETTLE) return
    const el = ref.current
    const pos = readJSON(key, null)
    const place = () => {
      if (s.user || !el || !pos || !pos.y || Date.now() - pos.at > MAX_AGE) return
      const node = el.querySelector(`[data-id="${CSS.escape(pos.id)}"]`)
      if (node) el.scrollTop += node.getBoundingClientRect().top - el.getBoundingClientRect().top - pos.offset
    }
    place()
    const t = setTimeout(() => {
      place()
      s.armed = true
    }, 350)
    return () => clearTimeout(t)
  }, [ref, key, ready, stamp])
}
