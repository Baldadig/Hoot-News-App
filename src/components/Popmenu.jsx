import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { placeMenu } from '../lib/popmenu-plek.js'

// Een zwevend menu bij een knop (de ⋯ van de bronregel), zoals het contextmenu van de app: de bronregel
// zelf verandert nooit, het menu ligt erover. Rechts op de kolomlijn (waar de inkt van het laatste
// icoon in de regel eindigt), --s2 onder het icoon en --s1 onder de regel; past het daar niet, dan
// boven de regel. Altijd binnen het venster, met --gutter rand. Het hangt aan <body> (of aan de open
// <dialog> waarin de knop staat), zodat geen kolom het afknipt of samenperst.
// Toetsenbord: pijltjes, Home en End lopen door de keuzes, Esc sluit en zet de focus terug op de
// knop, Tab sluit en gaat verder vanaf de knop. Een klik of tik buiten het menu sluit het.
const itemsIn = (menu) => [...menu.querySelectorAll('[role="menuitem"]:not([disabled])')]

export function Popmenu({ anchor, id, label, onClose, view, children }) {
  const ref = useRef(null)
  const host = anchor.current?.closest('dialog[open]') || document.body

  useLayoutEffect(() => {
    const menu = ref.current
    if (!menu || !anchor.current) return undefined
    const place = () => anchor.current && placeMenu(menu, anchor.current)
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchor, view])

  // Bij openen en bij elke wissel (hoofdmenu, redenen): de focus op de eerste keuze.
  useEffect(() => {
    const first = ref.current && itemsIn(ref.current)[0]
    first?.focus({ preventScroll: true })
  }, [view])

  useEffect(() => {
    const down = (e) => {
      if (ref.current?.contains(e.target) || anchor.current?.contains(e.target)) return
      onClose(false)
    }
    document.addEventListener('pointerdown', down, true)
    return () => document.removeEventListener('pointerdown', down, true)
  }, [anchor, onClose])

  const key = (e) => {
    const list = itemsIn(ref.current)
    const at = list.indexOf(document.activeElement)
    const go = (i) => { e.preventDefault(); list[(i + list.length) % list.length]?.focus() }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(true) }
    else if (e.key === 'Tab') { anchor.current?.focus(); onClose(false) } // de browser gaat verder vanaf de knop
    else if (e.key === 'ArrowDown') go(at + 1)
    else if (e.key === 'ArrowUp') go(at < 0 ? -1 : at - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(-1)
  }

  return createPortal(
    <div ref={ref} id={id} className="popmenu" role="menu" aria-label={label} onKeyDown={key}>
      {children}
    </div>,
    host,
  )
}
