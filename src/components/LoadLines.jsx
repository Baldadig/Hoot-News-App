import { useEffect, useRef, useState } from 'react'
import { LABEL, frame, nextLoad, rowsFromRects, snap } from '../lib/load-lines.js'

// De laadstrepen (src/lib/load-lines.js, iOS LoadLines.swift): het wachtteken bij het eerste laden.
// `useLoadLines` volgt het laden; <LoadLinesBox> houdt de plek vrij zolang er geladen wordt (de
// schermlezer hoort "Even kijken bij je bronnen", in beeld staat geen tekst); <LoadLinesLayer> tekent
// de strepen boven de kolom, ook nog als de inhoud er al staat: dan landen of vervagen ze.
// `land`: een selector voor de kop om op te landen (de Editie); zonder: vervagen naar de inhoud.
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export function useLoadLines(loading, ok = true) {
  const [state, setState] = useState(() => nextLoad({ phase: 'idle' }, { loading, ok }, clock()))
  const next = nextLoad(state, { loading, ok }, clock())
  if (next !== state) setState(next)
  return {
    state: next,
    loading: next.phase === 'loading',
    ending: next.phase === 'ending',
    hostClass: next.phase === 'ending' ? ' ll-host ll-ending' : ' ll-host',
    finish: () => setState((s) => (s.phase === 'ending' ? { phase: 'idle' } : s)),
  }
}

export function LoadLinesBox({ label = LABEL }) {
  return <div className="ll-box" role="status" aria-label={label} />
}

// Rechthoek van `el` in het vlak van `host` (de laag ligt met inset 0 over de host).
function rel(el, host) {
  const a = el.getBoundingClientRect(), b = host.getBoundingClientRect()
  return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height }
}

export function LoadLinesLayer({ lines, host, land = null, rule = null, onLand }) {
  const layer = useRef(null)
  const pool = useRef([])
  const st = lines.state
  const box = useRef(null)
  const reduce = useRef(reduced())
  useEffect(() => {
    if (st.phase === 'loading') reduce.current = reduced()
  }, [st.phase, st.t0])
  useEffect(() => {
    if (st.phase === 'idle' || typeof requestAnimationFrame === 'undefined') return
    let raf = 0
    let landed = false
    // Een nieuwe ronde: de inhoud begint verborgen (de vorige ronde liet hem op 1 staan).
    if (st.phase === 'loading' && host.current) {
      host.current.style.setProperty('--ll-text', '0')
      host.current.style.setProperty('--ll-rise', '8')
      host.current.style.setProperty('--ll-rule', '0')
    }
    const draw = () => {
      const root = host.current
      const el = layer.current
      if (!root || !el) { raf = requestAnimationFrame(draw); return }
      const b = root.querySelector('.ll-box')
      if (b) { const r = rel(b, root); box.current = { x: r.x, y: r.y, w: r.w } }
      let targets = null
      if (st.doneAt != null && land) {
        const head = root.querySelector(land)
        const kop = rule ? root.querySelector(rule) : null
        if (head?.firstChild) {
          const range = document.createRange()
          range.selectNodeContents(head)
          const o = root.getBoundingClientRect()
          const rects = [...range.getClientRects()].map((r) => ({ top: r.top - o.top, bottom: r.bottom - o.top, left: r.left - o.left, right: r.right - o.left, width: r.width }))
          const size = parseFloat(getComputedStyle(head).fontSize) || 30
          const k = kop ? rel(kop, root) : null
          targets = { rule: k ? { x: k.x, y: k.y, w: k.w } : null, rows: rowsFromRects(rects, size) }
          if (!landed) { landed = true; onLand?.() }
        }
      }
      const f = frame({ ...st, reduce: reduce.current, box: box.current || { x: 0, y: 0, w: root.clientWidth }, targets }, clock())
      const dpr = window.devicePixelRatio || 1
      while (pool.current.length < f.lines.length) {
        const d = document.createElement('div')
        d.className = 'll-line'
        el.appendChild(d)
        pool.current.push(d)
      }
      pool.current.forEach((d, i) => {
        const s = f.lines[i]
        if (!s) { d.style.opacity = '0'; return }
        d.style.transform = `translate(${snap(s.x, dpr)}px,${snap(s.y, dpr)}px)`
        d.style.width = `${snap(s.w, dpr)}px`
        d.style.height = `${s.h}px`
        d.style.opacity = String(Math.round(s.o * 1000) / 1000)
        d.style.background = s.ink > 0
          ? `color-mix(in srgb, var(--ink) ${Math.round(s.ink * 100)}%, var(--accent))`
          : s.accent > 0 ? `color-mix(in srgb, var(--accent) ${Math.round(s.accent * 100)}%, var(--ink-3))` : ''
      })
      root.style.setProperty('--ll-text', String(Math.max(f.text, f.err)))
      root.style.setProperty('--ll-rise', String(f.rise))
      root.style.setProperty('--ll-rule', String(f.rule))
      if (st.phase === 'ending' && f.done) {
        // De waarden blijven staan (1, 0, 1): ze gelden alleen onder .ll-ending, en zo knippert er niets.
        lines.finish()
        return
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [st]) // eslint-disable-line react-hooks/exhaustive-deps
  if (st.phase === 'idle') return null
  return <div className="ll-layer" ref={layer} aria-hidden="true" />
}
