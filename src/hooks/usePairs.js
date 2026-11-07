import { useEffect, useLayoutEffect, useState } from 'react'
import { planPairs, leadImageHeight } from '../lib/pairs.js'

// Meet het brede Editie-raster (A · Paren, lib/pairs.js) en geeft per verhaal de hoogte van het grote
// beeld erboven, of niets. Alleen als de paren echt in twee kolommen staan (de container van de
// Editie is breder dan 48rem); smaller is het één leeskolom en meet er niets. Opnieuw bij een andere
// breedte, een andere Editie of als de letters binnen zijn; nooit tijdens het lezen zelf.
// `frontRef`: de voorpagina, waar het beeld van het hoofdverhaal meerekt met de zijkolom.
export function usePairs(pairsRef, frontRef, on, key) {
  const [width, setWidth] = useState(0)
  const [fonts, setFonts] = useState(0)
  const [plan, setPlan] = useState({ at: '', boven: {} })
  const at = `${width}|${key}|${fonts}`

  useEffect(() => {
    const el = pairsRef.current
    if (!on || !el || typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [on, pairsRef])
  useEffect(() => {
    let alive = true
    document.fonts?.ready?.then(() => alive && setFonts(1))
    return () => { alive = false }
  }, [])

  useLayoutEffect(() => {
    if (!on || plan.at === at) return
    // Eerst alles in zijn gewone vorm, dan meten.
    if (Object.keys(plan.boven).length) return setPlan({ at: '', boven: {} })
    const grid = pairsRef.current
    const front = frontRef.current
    fitLead(front)
    if (!grid || columns(grid) < 2) return setPlan({ at, boven: {} })
    grid.classList.add('pairs--measure')
    // Het kopje en het katern Buiten je bubbel zijn geen plekken: die tellen niet mee in de paren.
    const cells = [...grid.children].filter((el) => !el.classList.contains('pairs__label') && !el.classList.contains('bubble')).map((el, i) => ({ key: key.split(',')[i] ?? String(i), el }))
    const width = cells[0]?.el.offsetWidth || 0
    const measured = cells.map(({ key: k, el }) => ({ key: k, h: el.offsetHeight, image: !!el.querySelector('.thumb') }))
    grid.classList.remove('pairs--measure')
    setPlan({ at, boven: planPairs(measured, { width }) })
  }, [on, at, plan, pairsRef, frontRef, key])

  return plan.boven
}

const columns = (el) => getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length

// Het beeld van het hoofdverhaal even hoog als de zijkolom ernaast (alleen breed, alleen een liggend
// beeld). Smaller staat het gewoon in zijn verhouding.
function fitLead(front) {
  const lead = front?.querySelector(':scope > .lead')
  if (!lead) return
  lead.classList.remove('lead--fit')
  lead.style.removeProperty('--lead-h')
  const side = front.querySelector(':scope > .front__side')
  if (!side || columns(front) < 2 || !lead.querySelector('.media--lead') || lead.querySelector('.media--portrait')) return
  lead.classList.add('lead--fit')
  lead.style.setProperty('--lead-h', '0px')
  side.style.alignSelf = 'start'
  const text = lead.offsetHeight
  const h = side.offsetHeight
  side.style.alignSelf = ''
  lead.style.setProperty('--lead-h', `${leadImageHeight({ side: h, text })}px`)
}
