import { useCallback, useEffect, useRef } from 'react'
import { reduced } from '../lib/motion.js'
import { T, MS, MSG, GUT, answer, answered, cancelOp, doneAt, drag, extraAt, geom, glowAt, release, resist, setAt, stripHeight, svg } from '../lib/pull-horizon.js'

// Trekken om te verversen op het web, zoals in de app (HootRefresh in ios/Hoot/Views/QuietMotion.swift):
// Horizon v2. Alleen met een vinger (touch), alleen bovenaan de lijst. De rekensom staat in
// lib/pull-horizon.js; hier zitten het gebaar, de klok en het tekenen.
//
// - Loslaten op of boven 72 pt start één verversing. Loopt er al een (de knop in de kop), dan wacht de
//   strook daarop: nooit een tweede.
// - Tijdens laden opnieuw trekken geeft alleen ruimte; de strook veert terug naar 56.
// - Fout: de zon gaat terug onder, 2 s "Niet ververst. Trek opnieuw.", dan dicht. De bestaande
//   foutregel (StatusLine) blijft gewoon staan.
// - Niets over de inhoud: de kolom schuift mee omlaag (alleen transform, geen layout).
//
// ref: het scrollgebied (section.view). busy: er loopt een verversing. failed: de laatste mislukte.
// label: "Editie", "Stroom" of "Selectie", voor de aankondiging. enabled: er staat iets om te verversen.
export function usePullHorizon(ref, { onRefresh, busy = false, failed = false, label = 'Editie', enabled = true }) {
  const stripRef = useRef(null)
  const artRef = useRef(null)
  const msgRef = useRef(null)
  const liveRef = useRef(null)
  const S = useRef({ phase: 'rest', pull: 0, armed: false, glowSince: null, artOp: 1, reduce: false, dragging: false, sawBusy: false })
  const ext = useRef({ busy, failed, onRefresh, label })
  ext.current = { busy, failed, onRefresh, label }
  if (busy) S.current.sawBusy = true
  const raf = useRef(0)
  const lastSvg = useRef('')

  const col = () => ref.current?.querySelector(':scope > .col')

  const draw = useCallback((now) => {
    const st = S.current, el = ref.current, strip = stripRef.current, c = col()
    if (!el || !strip || !c) return
    const h = Math.max(0, stripHeight(st, now))
    // De kolom: zijn inhoudsbreedte en midden bepalen de lijn (van kantlijn tot kantlijn).
    const cs = getComputedStyle(c)
    const pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0
    const inner = c.clientWidth - pl - pr
    const mid = c.offsetLeft + pl + inner / 2
    const vw = el.clientWidth
    const drawn = st.phase === 'rest' || st.phase === 'cancel' ? { ...st, phase: 'pull', pull: st.phase === 'cancel' ? (st.reduce ? st.cancelFrom : h) : 0, artOp: cancelOp(st, now) } : st
    const g = geom({ ...drawn, glow: glowAt(now, st.armed, st.glowSince, st.reduce) }, now, inner + 2 * GUT)
    strip.style.height = h.toFixed(2) + 'px'
    c.style.transform = h > 0.01 ? `translate3d(0,${h.toFixed(2)}px,0)` : ''
    const out = h > 0.01 ? svg(g, { cw: vw, h: 128, mid, id: label }) : ''
    if (out !== lastSvg.current) { artRef.current.innerHTML = out; lastSvg.current = out }
    msgRef.current.style.opacity = g.msg.toFixed(3)
    msgRef.current.style.left = (mid - inner / 2) + 'px'
    msgRef.current.style.width = inner + 'px'
  }, [ref, label])

  const announce = (t) => {
    const live = liveRef.current
    if (!live) return
    live.textContent = ''
    setTimeout(() => { live.textContent = t }, 30)
  }

  const finish = useCallback(() => {
    Object.assign(S.current, { phase: 'rest', pull: 0, armed: false, glowSince: null, artOp: 1, extra: 0, extraT0: null, sawBusy: false })
  }, [])

  const tick = useCallback(() => {
    raf.current = 0
    const st = S.current, now = performance.now()
    // Overgangen op de klok.
    if (st.phase === 'cancel' && now >= st.cancelT0 + (st.reduce ? MS.reduced : MS.close)) finish()
    if (answered(st, now, ext.current.busy)) {
      Object.assign(st, answer(st, now, !ext.current.failed))
      if (st.phase === 'set') announce(ext.current.label + ' ververst')
      if (st.phase === 'fail') announce('Verversen lukte niet')
    }
    if (st.phase === 'go' && now >= setAt(st)) {
      Object.assign(st, { phase: 'set', setT0: setAt(st) })
      announce(ext.current.label + ' ververst')
    }
    if ((st.phase === 'set' || st.phase === 'fail') && now >= doneAt(st)) finish()
    draw(now)
    if (S.current.phase !== 'rest') raf.current = requestAnimationFrame(tick)
    else draw(now)
  }, [draw, finish])

  const run = useCallback(() => { if (!raf.current) raf.current = requestAnimationFrame(tick) }, [tick])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let startY = 0
    let tracking = false
    const st = S.current
    const locked = () => st.phase === 'go' || st.phase === 'set' || st.phase === 'fail'
    const onStart = (e) => {
      if (!enabled || e.touches.length !== 1 || el.scrollTop > 0 || locked()) return
      tracking = true
      st.reduce = reduced()
      const now = performance.now()
      const loading = st.phase === 'load'
      const have = loading ? extraAt(st, now) : st.phase === 'cancel' ? stripHeight(st, now) : st.pull
      startY = e.touches[0].clientY - Math.min(have, T)
    }
    const onMove = (e) => {
      if (!tracking) return
      const dy = e.touches[0].clientY - startY
      if (!st.dragging) {
        // Pas trekken als de vinger omlaag gaat terwijl de lijst bovenaan staat; omhoog is gewoon scrollen.
        if (dy <= 0 || el.scrollTop > 0) { if (dy < 0) tracking = false; return }
        st.dragging = true
        if (st.phase === 'rest' || st.phase === 'cancel') Object.assign(st, { phase: 'pull', pull: 0, artOp: 1 })
      }
      if (e.cancelable) e.preventDefault()
      const { st: next, tik } = drag(st, resist(dy), performance.now())
      Object.assign(st, next)
      if (tik) try { navigator.vibrate?.(8) } catch { /* niet overal */ }
      run()
    }
    const onEnd = () => {
      if (!tracking) return
      tracking = false
      if (!st.dragging) return
      st.dragging = false
      const wasLoading = st.phase === 'load'
      const { st: next, refresh } = release(st, performance.now(), ext.current.busy)
      Object.assign(st, next)
      if (!wasLoading && st.phase === 'load') announce('Bezig met verversen')
      if (refresh) ext.current.onRefresh?.()
      if (st.phase === 'rest') finish()
      run()
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [ref, enabled, run, finish])

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); const c = col(); if (c) c.style.transform = '' }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Alleen in ontwikkeling: een stand vastzetten om na te meten (zie tests en de beelden in Hoot-design).
  useEffect(() => {
    if (!import.meta.env?.DEV) return
    window.hootPull = window.hootPull || {}
    window.hootPull[label] = { S: S.current, draw, run, finish }
  }, [label, draw, run, finish])

  return (
    <>
      <div className="pull" ref={stripRef} aria-hidden="true">
        <div className="pull__art" ref={artRef} />
        <div className="pull__msg" ref={msgRef}>{MSG}</div>
      </div>
      <p className="visually-hidden" role="status" ref={liveRef} />
    </>
  )
}
