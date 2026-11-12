import { useEffect, useRef, useState } from 'react'
import { TIEN, TEXT, frame, block, nextTien } from '../lib/tien.js'
import { EASE } from '../lib/motion.js'

// "Tien en de bubbel" (src/lib/tien.js, iOS FirstEditionMark.swift): het wachtteken van je eerste
// Editie, één keer, na het welkom. `useTien` volgt het laden vanaf de tik; <TienLayer> tekent de tien
// punten en de kring onder de titel, houdt de Editie verborgen tot de bubbel opengaat en laat dan de
// blokken binnenkomen (200 ms, 80 ms na elkaar, 8 pt omhoog). Bij een fout gaan de punten terug en
// verschijnt het foutblok; Opnieuw begint het opnieuw. VoiceOver: één statusregel die meeleest.
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
const svgNS = 'http://www.w3.org/2000/svg'

export function useTien(start, { loading, failed }) {
  const [state, setState] = useState(() => (start == null ? null : nextTien({ t0: start, R: null, F: null }, { loading, failed }, clock())))
  let cur = state
  if (start != null && (!cur || cur.start !== start)) cur = { t0: start, start, R: null, F: null }
  if (start == null) cur = null
  const next = cur ? { ...nextTien(cur, { loading, failed }, clock()), start } : null
  const same = next === state || (next && state && next.t0 === state.t0 && next.R === state.R && next.F === state.F && next.start === state.start)
  if (!same) setState(next)
  const st = same ? state : next
  return { st, active: !!st, hostClass: st ? ' tien-host tien-hold' : '' }
}

// Het lege vlak zolang er nog niets staat: houdt de plek onder de titel vrij.
export function TienSpace() {
  return <div className="tien-space" aria-hidden="true" />
}

// De blokken van de Editie in volgorde: de metaregel, de sterke lijn, dan alles onder de kop.
function blocksOf(host) {
  const top = host.querySelector('.edtop')
  const list = []
  const meta = [...(top?.querySelectorAll(':scope > .status, :scope > .edmeta') || [])]
  if (meta.length) list.push(meta)
  const rule = top?.querySelector(':scope > .edrule')
  if (rule) list.push([rule])
  for (const el of host.children) {
    if (el === top || el.matches('.tien-layer, .ll-layer, .tien-space')) continue
    list.push([el])
  }
  return list
}

export function TienLayer({ tien, host, onDone }) {
  const st = tien.st
  const layer = useRef(null)
  const svg = useRef(null)
  const parts = useRef(null)
  const live = useRef(null)
  const l1 = useRef(null)
  const l2 = useRef(null)
  const reduce = useRef(reduced())
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (!st || typeof requestAnimationFrame === 'undefined') return
    let raf = 0
    let anims = []
    let shownAt = null
    let said = ''
    const root = host.current
    root?.style.setProperty('--tien-err', '0')
    const draw = () => {
      const el = layer.current, s = svg.current, h = host.current
      if (!el || !s || !h) { raf = requestAnimationFrame(draw); return }
      if (!parts.current) {
        const ring = document.createElementNS(svgNS, 'circle')
        ring.setAttribute('cx', TIEN.cx); ring.setAttribute('cy', TIEN.cy); ring.setAttribute('fill', 'none')
        ring.setAttribute('stroke-width', TIEN.hair); ring.setAttribute('pathLength', '360')
        ring.setAttribute('transform', `rotate(-90 ${TIEN.cx} ${TIEN.cy})`); ring.setAttribute('vector-effect', 'non-scaling-stroke')
        s.appendChild(ring)
        const dots = Array.from({ length: 11 }, () => { const c = document.createElementNS(svgNS, 'circle'); c.setAttribute('r', TIEN.dot / 2); s.appendChild(c); return c })
        parts.current = { ring, dots }
      }
      // Het teken staat onder de titel, gecentreerd in een vlak van 400.
      const title = h.querySelector('.edtop .vh')
      if (title) {
        const a = title.getBoundingClientRect(), b = h.getBoundingClientRect()
        el.style.top = `${Math.round(a.bottom - b.top + 8)}px`
      }
      const t = clock() - st.t0
      const f = frame({ R: st.R, F: st.F, reduce: reduce.current }, t)
      const { ring, dots } = parts.current
      const tint = (shut, red) => {
        const base = shut > 0 ? `color-mix(in srgb, var(--ink) ${Math.round(shut * 100)}%, var(--ink-3))` : 'var(--ink-3)'
        return red > 0 ? `color-mix(in srgb, var(--accent) ${Math.round(red * 100)}%, ${base})` : base
      }
      ring.setAttribute('r', f.ring.r.toFixed(2))
      ring.setAttribute('stroke', tint(f.ring.shut, 0))
      ring.setAttribute('stroke-dasharray', `${f.ring.deg.toFixed(2)} 400`)
      ring.setAttribute('opacity', f.ring.deg > 0.01 ? f.ring.o.toFixed(3) : '0')
      f.dots.forEach((d, k) => {
        const c = dots[k]
        c.setAttribute('cx', d.x.toFixed(2)); c.setAttribute('cy', d.y.toFixed(2))
        c.setAttribute('fill', tint(d.shut, d.red)); c.setAttribute('opacity', d.o.toFixed(3))
      })
      const g = dots[10]
      g.setAttribute('cx', f.ghost.x.toFixed(2)); g.setAttribute('cy', f.ghost.y.toFixed(2))
      g.setAttribute('fill', f.ghost.red ? 'var(--accent)' : 'var(--ink-3)'); g.setAttribute('opacity', f.ghost.o.toFixed(3))
      if (l1.current) l1.current.style.opacity = f.line1.toFixed(3)
      if (l2.current) l2.current.style.opacity = f.line2.toFixed(3)
      h.style.setProperty('--tien-err', f.err.toFixed(3))
      if (live.current && said !== f.say) { said = f.say; live.current.textContent = f.say }
      // De bubbel gaat open: de blokken van de Editie komen binnen.
      if (f.show != null && t >= f.show && shownAt == null) {
        shownAt = f.show
        const late = t - f.show
        anims = blocksOf(h).flatMap((els, i) => els.map((x) => x.animate(
          reduce.current
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 0, transform: `translateY(${TIEN.rise}px)` }, { opacity: 1, transform: 'none' }],
          {
            duration: reduce.current ? TIEN.reduceFade : TIEN.block,
            delay: (reduce.current ? 0 : TIEN.blockStep * Math.min(i, 8)) - late,
            easing: EASE.bediening,
            fill: 'both',
          },
        )))
      }
      if (f.done && (st.F != null || (shownAt != null && t >= shownAt + (reduce.current ? TIEN.reduceFade : TIEN.blockStep * 8 + TIEN.block)))) {
        if (st.F == null) { done.current?.(); return }
        return // fout: het foutblok staat; Opnieuw begint een nieuwe ronde
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      anims.forEach((a) => a.cancel())
    }
  }, [st]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!st) return null
  return (
    <div className="tien-layer" ref={layer}>
      <svg ref={svg} className="tien-mark" width={TIEN.w} height={TIEN.h} viewBox={`0 0 ${TIEN.w} ${TIEN.h}`} aria-hidden="true" />
      <p className="tien-line1" ref={l1} aria-hidden="true">{TEXT.line1}</p>
      <p className="tien-line2" ref={l2} aria-hidden="true">{TEXT.line2}</p>
      <p className="visually-hidden" role="status" ref={live}>{TEXT.busy}</p>
    </div>
  )
}
