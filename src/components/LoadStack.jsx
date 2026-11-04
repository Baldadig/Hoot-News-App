import { useEffect, useRef, useState } from 'react'
import { LOAD_STACK, LOAD_STACK_DONE, stackCards, nextStackState } from '../lib/loadStack.js'

// De laadstapel (zie src/lib/loadStack.js): het wachtbeeld bij het eerste laden van Editie, Stroom
// en Selectie. Geen zin in beeld; de schermlezer hoort wel "Even kijken bij je bronnen".
// `done`: klaar, de stapel staat, krijgt zijn rode kopregel en vervaagt; daarna `onDone`.
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Een haarlijn van 1 pt binnen het vel: een halve punt naar binnen, zodat hij op hele pixels valt.
const attrs = (c) => ({ x: c.x + 0.5, y: c.y + 0.5, width: c.width - 1, height: c.height - 1, opacity: c.opacity })

export function LoadStack({ done = false, onDone, label = 'Even kijken bij je bronnen' }) {
  const cards = useRef([])
  useEffect(() => {
    const draw = (list) => list.forEach((c, i) => {
      const el = cards.current[i]
      if (!el) return
      for (const [k, v] of Object.entries(attrs(c))) el.setAttribute(k, String(Math.round(v * 1000) / 1000))
    })
    if (done || reduced() || typeof requestAnimationFrame === 'undefined') { draw(stackCards(0, true)); return }
    let frame = 0
    let start = null
    const tick = (now) => {
      if (start === null) start = now
      draw(stackCards(now - start))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [done])
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => onDone?.(), LOAD_STACK_DONE)
    return () => clearTimeout(t)
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps
  const { width, box, kop } = LOAD_STACK
  return (
    <div className={`lstack${done ? ' lstack--done' : ''}`} role="status" aria-label={label}>
      <svg className="lstack__art" viewBox={`0 0 ${width} ${box}`} width={width} height={box} aria-hidden="true" focusable="false">
        {stackCards(0, true).map((c, i) => (
          <rect key={i} ref={(el) => { cards.current[i] = el }} className="lstack__sheet" {...attrs(c)} />
        ))}
        <rect className="lstack__kop" x={kop.x} y={kop.y} width={kop.width} height={kop.height} />
      </svg>
    </div>
  )
}

// Houdt de stapel na het laden nog even in beeld (klaar), maar alleen als het lukte.
// `show`: de stapel staat er; `done`: klaar; `finish`: weg, de inhoud mag.
export function useLoadStack(loading, ok = true) {
  const [state, setState] = useState(() => ({ prev: loading, hold: false }))
  const next = nextStackState(state, loading, ok)
  if (next !== state) setState(next)
  return { show: loading || next.hold, done: !loading && next.hold, finish: () => setState((s) => ({ ...s, hold: false })) }
}
