import { useEffect, useRef } from 'react'
import { readJSON, writeJSON } from '../lib/store.js'
import { prunePositions } from '../lib/context.js'

// Onthoudt de leespositie van een scrollgebied — niet in pixels maar als "dit bericht
// stond bovenaan, zoveel pixels onder de rand", zodat hervatten ook klopt na herladen of
// als er inhoud bij is gekomen.
// - `key` hoort bij één lijst (bestemming + filters): elke lijst heeft zijn eigen positie.
//   Wisselt de sleutel (ander filter, terugknop), dan zetten we de positie van die lijst
//   terug, of beginnen bovenaan als er geen is.
// - `stamp` verandert als de inhoud verandert; zolang je zelf nog niet hebt gescrold zetten
//   we de positie dan opnieuw (de verse feed komt vaak net ná de eerste weergave binnen).
// - `active`: komt het scherm weer in beeld, dan controleren we de positie opnieuw.
// `hoot:totop`: nog eens tikken op de tab waar je al bent (Nav in Shell.jsx) scrolt het scherm naar boven.
// Dat telt als zelf scrollen, zodat de plek bovenaan wordt onthouden en niet de oude, diepere.
export const TOP_EVENT = 'hoot:totop'
const USER_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown', TOP_EVENT]
const MAX_AGE = 12 * 60 * 60 * 1000
const SETTLE = 6000
let pruned = false


export function useScrollMemory(ref, key, ready, stamp, active = true) {
  const st = useRef({ armed: false, user: false, t0: Date.now(), key, active })

  // Eén keer per start: verlopen posities opruimen.
  useEffect(() => {
    if (pruned) return
    pruned = true
    try {
      prunePositions(localStorage, MAX_AGE)
    } catch {
      /* geen opslag */
    }
  }, [])

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
    // Een artikel opent in hetzelfde tabblad (keuze r5-webreader): de plek meteen vastleggen als de
    // pagina weggaat, ook als de vertraagde opslag nog niet liep. Terug brengt je dan precies hier.
    const onLeave = () => {
      if (!st.current.armed) return
      if (timer) clearTimeout(timer)
      save()
    }
    const onUser = () => {
      st.current.user = true
      st.current.armed = true
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', onLeave)
    for (const ev of USER_EVENTS) el.addEventListener(ev, onUser, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onLeave)
      for (const ev of USER_EVENTS) el.removeEventListener(ev, onUser)
      if (timer) clearTimeout(timer)
    }
  }, [ref, key])

  useEffect(() => {
    const s = st.current
    const switched = s.key !== key
    if (switched || (active && !s.active)) {
      // Andere lijst, of terug op dit scherm: opnieuw plaatsen en pas daarna weer opslaan.
      s.user = false
      s.armed = false
      s.t0 = Date.now()
    }
    s.key = key
    s.active = active
    if (!active || !ready) return
    if (s.user || Date.now() - s.t0 > SETTLE) {
      s.armed = true
      return
    }
    const el = ref.current
    const pos = readJSON(key, null)
    const valid = pos && pos.y && Date.now() - pos.at <= MAX_AGE
    const place = () => {
      if (s.user || !el) return
      if (!valid) {
        if (switched) el.scrollTop = 0
        return
      }
      const node = el.querySelector(`[data-id="${CSS.escape(pos.id)}"]`)
      if (node) el.scrollTop += node.getBoundingClientRect().top - el.getBoundingClientRect().top - pos.offset
      else if (switched) el.scrollTop = 0
    }
    place()
    const t = setTimeout(() => {
      place()
      s.armed = true
    }, 350)
    return () => clearTimeout(t)
  }, [ref, key, ready, stamp, active])
}
