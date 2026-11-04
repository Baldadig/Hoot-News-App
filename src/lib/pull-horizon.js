// Trekken om te verversen: Horizon v2 (Hoot-design, woensdag 4 november, pull-concepten-2/1-horizon.html).
// Trekken is zonsopgang, laden is de dag, klaar is de ondergang. Een haarlijn groeit met je trek tot de
// kantlijnen, de rode zon komt erachter op, loopt bij laden over de boog van ochtend naar middag (en
// ademt daar als het lang duurt), en gaat bij klaar door naar de vroege avond en daar onder.
//
// Dit bestand is de hele rekensom, zonder DOM: dezelfde functies tekenen het teken op het web
// (components/PullHorizon.jsx) en staan regel voor regel in ios/Hoot/Views/PullHorizon.swift.
// tests/pull-horizon.test.mjs legt de standen en tijden vast en schrijft tests/fixtures/pull-horizon.json,
// die de iOS-test met dezelfde invoer naloopt (gelijk tot op 0,01 pt).
//
// Alle maten in pt (= css-px), op het ritme van 8. Tijden in ms. y telt omhoog vanaf de bovenkant van
// de horizon, x vanaf het midden van de kolom.

export const T = 72 // drempel (pull-threshold): 1 : 1 tot hier
export const MAX = 120 // de zachte rem komt nooit verder
export const STRIP = 56 // strook bij laden (pull-strip): 48 lucht, 8 onder de horizon
export const BELOW = 8 // horizon ↔ onderrand van de strook
export const R = 8 // zon ⌀ 16
export const GUT = 16 // kantlijn
export const HALF = 68 // dagdelen op −68 · 0 · +68
export const END = 8 // einden van de boog
export const CTRL = 56 // controlepunt van de boog (top = 32)
export const LINE_FROM = 16 // de lijn verschijnt vanaf 16 pt trek
export const SUN_FROM = 40 // de zon komt op vanaf 40 pt trek
export const RINGS = [[1.3, 0.45], [1.6, 0.28], [1.9, 0.15]] // straal × r, dekking (landing .rg1–.rg3)
export const MARK_R = 4 // merkteken ⌀ 8
export const MSG = 'Niet ververst. Trek opnieuw.'

export const MS = {
  close: 400, // strook open en dicht, ease-glide (dur-pull-close)
  ringOut: 200, // ringen wijken bij loslaten
  arcIn: 200, // daarna komt de boog
  leg: 800, // per dagdeel
  breath: 2750, // elke stap van de adem (dur-breathe)
  set: 600, // ondergang, ease-iris
  out: 140, // lijn en boog vervagen (dur-pull-out) …
  outAt: 440, // … vanaf hier in de ondergang
  back: 600, // fout: terug over de boog naar de ochtend
  sink: 400, // fout: daar terug onder de horizon
  hold: 2000, // fout: zo lang staat de zin
  reduced: 350, // Verminder beweging: één vervaging (dur-reduced)
}
export const NOON = 400 + MS.leg // de zon staat op de middag, gemeten vanaf loslaten (1,2 s)

// --- curves ---
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const sx = (t) => ((ax * t + bx) * t + cx) * t
  const sy = (t) => ((ay * t + by) * t + cy) * t
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x, d = dx(t)
      if (Math.abs(e) < 1e-6 || !d) break
      t -= e / d
    }
    return sy(Math.min(1, Math.max(0, t)))
  }
}
export const E = {
  glide: bezier(0.2, 0.8, 0.2, 1), // --ease-glide
  iris: bezier(0.6, 0, 0.2, 1), // --ease-iris
  ease: bezier(0.2, 0.7, 0.2, 1), // --ease
  io: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2), // landing: hoot.js ease()
  sine: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
}
export const c01 = (v) => Math.min(1, Math.max(0, v))

// Vinger → afstand: 1 : 1 tot de drempel, daarna een zachte rem die nooit voorbij 120 komt.
export function resist(d) {
  if (!(d > 0)) return 0
  if (d <= T) return d
  return T + (MAX - T) * (1 - Math.exp(-(d - T) / 120))
}

// Punt op de boog (kwadratisch, als de landing): t 0 = ochtend, ½ = middag, 1 = vroege avond.
export function arcPt(t) {
  const u = 1 - t
  return { x: HALF * (2 * t - 1), y: END * u * u + CTRL * 2 * u * t + END * t * t }
}

// Adem uit de rode intro: 1 → 1,06 → 0,92 → 1, elke stap 2750 ms.
export function breathe(ms) {
  const k = [1, 1.06, 0.92, 1]
  const cyc = ((ms % (3 * MS.breath)) + 3 * MS.breath) % (3 * MS.breath)
  const i = Math.min(2, Math.floor(cyc / MS.breath))
  return k[i] + (k[i + 1] - k[i]) * E.sine((cyc - i * MS.breath) / MS.breath)
}

// De ringen lichten op de drempel op in 140 ms (ease) en zakken terug als je onder de drempel komt.
// `since` is het moment van de laatste kruising (null: nooit gekruist).
export function glowAt(now, armed, since, reduce = false) {
  if (since == null || reduce) return armed ? 1 : 0
  const f = E.ease(c01((now - since) / MS.out))
  return armed ? f : 1 - f
}

// Zon-t tijdens laden en doorlopen.
export function sunT(st, now) {
  if (st.reduce) return now - st.loadT0 < MS.reduced / 2 ? 0 : 0.5
  if (st.phase === 'go' && now >= st.leg2T0) return 0.5 + 0.5 * E.io(c01((now - st.leg2T0) / MS.leg))
  return 0.5 * E.io(c01((now - st.loadT0 - 400) / MS.leg))
}

// De hele tekening als functie van de toestand.
// st: { phase: 'pull' | 'load' | 'go' | 'set' | 'fail', pull (zichtbare afstand), glow, artOp, reduce,
//       loadT0, leg2T0, s0, setT0, failT0, tf }   ('rest' en 'cancel' tekenen als 'pull')
// cw: breedte van de kolom inclusief de kantlijnen; de lijn is cw − 2 × 16 op volle breedte.
export function geom(st, now, cw) {
  const w = cw - 2 * GUT
  const g = { w: 0, strong: false, lineOp: 0, arcOp: 0, sx: -HALF, sy: -R, sunOp: 1, scale: 1, grow: 0, ringOp: 0, msg: 0 }
  const ph = st.phase
  const artOp = st.artOp ?? 1
  if (ph === 'rest' || ph === 'pull' || ph === 'cancel') {
    const d = st.pull || 0
    const p = st.reduce ? 1 : c01((d - SUN_FROM) / (T - SUN_FROM))
    g.lineOp = c01((d - LINE_FROM) / 16) * artOp
    g.w = st.reduce ? w : 16 + (w - 16) * c01((d - LINE_FROM) / (T - LINE_FROM))
    g.sy = -R + 2 * R * p
    g.sunOp = (st.reduce ? c01((d - 24) / 16) : 1) * artOp
    g.grow = p
    g.ringOp = p * (0.6 + 0.4 * (st.glow || 0))
    g.strong = d >= T
  } else if (ph === 'load' || ph === 'go') {
    const tau = now - st.loadT0
    g.w = w; g.strong = true; g.lineOp = 1; g.grow = 1
    g.ringOp = st.reduce ? 0 : 1 - E.ease(c01(tau / MS.ringOut))
    g.arcOp = st.reduce ? 1 : E.ease(c01((tau - MS.ringOut) / MS.arcIn))
    const t = sunT(st, now), pt = arcPt(t)
    g.sx = pt.x; g.sy = pt.y
    if (st.reduce) g.sunOp = tau < MS.reduced / 2 ? 1 - tau / (MS.reduced / 2) : c01((tau - MS.reduced / 2) / (MS.reduced / 2))
    else if (ph === 'load' && tau > NOON) g.scale = breathe(tau - NOON)
    else if (ph === 'go') g.scale = st.s0 + (1 - st.s0) * E.glide(c01((now - st.leg2T0) / 400))
  } else if (ph === 'set') {
    const tau = now - st.setT0
    g.w = w; g.strong = true; g.grow = 1
    g.sx = HALF
    if (st.reduce) {
      g.sx = 0; g.sy = arcPt(0.5).y
      g.lineOp = g.arcOp = g.sunOp = 1 - c01(tau / MS.reduced)
    } else {
      g.sy = END - 2 * R * E.iris(c01(tau / MS.set))
      g.lineOp = g.arcOp = 1 - c01((tau - MS.outAt) / MS.out)
    }
  } else if (ph === 'fail') {
    const tau = now - st.failT0
    g.w = w; g.strong = true; g.grow = 1
    if (st.reduce) {
      const pt = arcPt(st.tf)
      g.sx = pt.x; g.sy = pt.y
      g.arcOp = g.sunOp = 1 - c01(tau / MS.reduced)
      g.msg = 1 - c01((tau - MS.hold) / MS.reduced)
      g.lineOp = g.msg
    } else {
      const t = st.tf * (1 - E.glide(c01(tau / MS.back))), pt = arcPt(t)
      g.sx = pt.x; g.sy = pt.y
      if (tau > MS.back) g.sy = END - 2 * R * E.glide(c01((tau - MS.back) / MS.sink))
      g.arcOp = 1 - E.ease(c01(tau / 200))
      const inA = E.ease(c01((tau - MS.back) / 200)), outA = 1 - E.ease(c01((tau - MS.back - MS.hold) / 200))
      g.msg = Math.min(inA, outA)
      g.lineOp = 1 - c01((tau - MS.back - MS.hold) / MS.out)
    }
  }
  return g
}

// --- tijden ---
// Het antwoord is binnen (`now`). Geeft de volgende toestand: fout, of doorlopen naar de vroege avond
// zodra de zon op de middag staat (bij Verminder beweging meteen de ondergang, als één vervaging).
export function answer(st, now, ok) {
  if (!ok) return { ...st, phase: 'fail', failT0: now, tf: sunT(st, now) }
  if (st.reduce) return { ...st, phase: 'set', setT0: now }
  const leg2T0 = Math.max(now, st.loadT0 + NOON)
  const s0 = now - st.loadT0 > NOON ? breathe(now - st.loadT0 - NOON) : 1
  return { ...st, phase: 'go', leg2T0, s0 }
}
// Wanneer begint de ondergang (alleen in 'go')?
export const setAt = (st) => st.leg2T0 + MS.leg
// Wanneer gaat de strook dicht, en wanneer is hij dicht?
export function closeAt(st) {
  if (st.phase === 'set') return st.setT0 + (st.reduce ? MS.reduced : MS.outAt)
  if (st.phase === 'fail') return st.failT0 + (st.reduce ? MS.hold + MS.reduced : MS.back + MS.hold)
  return Infinity
}
export const doneAt = (st) => closeAt(st) + (st.reduce ? 0 : MS.close)

// De hele reis van één verversing, gemeten vanaf loslaten: handig voor tests en de spec.
// responseMs: na hoeveel ms het antwoord er is. Geeft { set, close, done } in ms vanaf loslaten.
export function journey({ responseMs, ok = true, reduce = false }) {
  let st = { phase: 'load', loadT0: 0, reduce }
  st = answer(st, responseMs, ok)
  if (st.phase === 'go') st = { ...st, phase: 'set', setT0: setAt(st) }
  return { set: st.phase === 'set' ? st.setT0 : null, close: closeAt(st), done: doneAt(st) }
}

// Extra trek tijdens laden: volgt de vinger, en veert na loslaten in 400 ms terug.
export function extraAt(st, now) {
  if (st.extraT0 == null) return st.extra || 0
  return (st.extraFrom || 0) * (1 - (st.reduce ? 1 : E.glide(c01((now - st.extraT0) / MS.close))))
}
// Verminder beweging: annuleren is één vervaging van 350 ms, de strook valt daarna dicht.
export function cancelOp(st, now) {
  return st.phase === 'cancel' && st.reduce ? 1 - c01((now - st.cancelT0) / MS.reduced) : 1
}

// Hoogte van de strook op het web (iOS: de scroll en contentMargins doen dit zelf).
// st.from: hoogte bij loslaten; st.extra: extra trek tijdens laden (met eigen terugveer).
export function stripHeight(st, now) {
  const ph = st.phase
  if (ph === 'rest') return 0
  if (ph === 'pull') return st.pull || 0
  if (ph === 'cancel') {
    if (st.reduce) return now - st.cancelT0 < MS.reduced ? st.cancelFrom : 0
    return st.cancelFrom * (1 - E.glide(c01((now - st.cancelT0) / MS.close)))
  }
  const open = st.reduce ? STRIP : st.from + (STRIP - st.from) * E.glide(c01((now - st.loadT0) / MS.close))
  const h = open + extraAt(st, now)
  const shut = closeAt(st)
  if (now < shut) return h
  if (st.reduce) return 0
  return h * (1 - E.glide(c01((now - shut) / MS.close)))
}

// --- de tekening als svg ---
// Dezelfde volgorde als de proef en als PullHorizon.swift: 1 boog en merktekens, 2 horizon,
// 3 lucht (zon en ringen, afgeknipt op de bovenkant van de lijn). h: hoogte van het tekenvak, met de
// onderkant op de onderkant van de strook. mid: midden van de kolom.
export function svg(g, { cw, h, mid = cw / 2, id = 'h' }) {
  const hy = h - BELOW
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${h}" viewBox="0 0 ${cw} ${h}" aria-hidden="true" focusable="false">`
  s += `<defs><clipPath id="sky-${id}"><rect x="0" y="-200" width="${cw}" height="${hy + 200}"/></clipPath></defs>`
  if (g.arcOp > 0.001) {
    const a = arcPt(0), m = arcPt(0.5), b = arcPt(1)
    s += `<g opacity="${g.arcOp.toFixed(3)}"><path d="M${mid + a.x} ${hy - a.y}Q${mid} ${hy - CTRL} ${mid + b.x} ${hy - b.y}" fill="none" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="1 4" stroke-linecap="round"/>`
    for (const p of [a, m, b]) s += `<circle cx="${mid + p.x}" cy="${hy - p.y}" r="${MARK_R - 0.5}" fill="var(--paper)" stroke="var(--ink-3)" stroke-width="1"/>`
    s += '</g>'
  }
  if (g.lineOp > 0.001 && g.w > 0)
    s += `<rect x="${(mid - g.w / 2).toFixed(2)}" y="${hy}" width="${g.w.toFixed(2)}" height="1" fill="${g.strong ? 'var(--pull-strong)' : 'var(--ink-3)'}" opacity="${g.lineOp.toFixed(3)}"/>`
  if (g.sunOp > 0.001 && g.sy > -R) {
    const cx = (mid + g.sx).toFixed(2), cy = (hy - g.sy).toFixed(2)
    s += `<g clip-path="url(#sky-${id})" opacity="${g.sunOp.toFixed(3)}">`
    if (g.ringOp > 0.001)
      for (const [k, o] of RINGS) s += `<circle cx="${cx}" cy="${cy}" r="${(R + (k - 1) * R * g.grow - 0.5).toFixed(2)}" fill="none" stroke="var(--accent)" stroke-width="1" opacity="${(o * g.ringOp).toFixed(3)}"/>`
    s += `<circle cx="${cx}" cy="${cy}" r="${(R * g.scale).toFixed(2)}" fill="var(--accent)"/></g>`
  }
  return s + '</svg>'
}

// --- het gebaar (web), als zuivere stappen: getest in tests/pull-horizon.test.mjs ---
// Vinger op afstand v (al geremd). Tijdens laden is het alleen ruimte. Geeft { st, tik }: tik is de
// eenmalige haptiek bij het kruisen van de drempel van onder naar boven.
export function drag(st, v, now) {
  if (st.phase === 'load') return { st: { ...st, extra: v, extraT0: null }, tik: false }
  const armed = v >= T
  const next = { ...st, phase: 'pull', pull: v }
  if (armed === !!st.armed) return { st: next, tik: false }
  return { st: { ...next, armed, glowSince: now }, tik: armed }
}
// Loslaten. busy: er loopt al een verversing (bijvoorbeeld via de knop). Geeft { st, refresh }:
// refresh is waar als er nu één verversing moet starten. Nooit twee: tijdens laden veert de extra
// trek terug, en loopt er al een, dan wacht de strook daarop.
export function release(st, now, busy) {
  if (st.phase === 'load') return { st: { ...st, extraFrom: st.extra || 0, extraT0: now }, refresh: false }
  if (st.armed) return { st: { ...st, phase: 'load', loadT0: now, from: st.pull, pull: 0, armed: false, extra: 0, extraT0: null, sawBusy: !!busy }, refresh: !busy }
  if (st.pull > 0) return { st: { ...st, phase: 'cancel', cancelT0: now, cancelFrom: st.pull, armed: false, glowSince: null, artOp: 1 }, refresh: false }
  return { st: { ...st, phase: 'rest', pull: 0 }, refresh: false }
}
// Is het antwoord er? De verversing liep en is klaar, of hij kwam nooit op gang (niets te doen).
export function answered(st, now, busy) {
  if (st.phase !== 'load' || st.dragging) return false
  return (st.sawBusy && !busy) || (!st.sawBusy && !busy && now - st.loadT0 > MS.close + 200)
}
