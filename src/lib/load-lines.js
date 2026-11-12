// De laadstrepen ("A · De stapel", goedgekeurd door Alex op woensdag 4 november; Hoot-design,
// woensdag-2026-11-04/laadscherm-concept/index.html, spec-rij). Het wachtteken bij het eerste laden
// van Editie, Stroom en Selectie, en in de lezer terwijl een artikel laadt. Gelijk aan
// ios/Hoot/Views/LoadLines.swift (LoadLines): tests/load-lines.test.mjs schrijft
// tests/fixtures/load-lines.json, en ios/HootTests/LoadLinesTests.swift rekent dezelfde invoer na.
//
// Vier vellen van 56 pt als haarlijnen van 1 pt in inkt 3, 8 pt uit elkaar, opzij −4 · 0 · +4 · −2
// (de rij loopt door met elk nieuw vel). Lus van 2000 ms: het bovenste vel gaat er schuin omhoog af
// (−8 y, +8 x, naar 0) in 640 ms easeInOut (0.4, 0, 0.2, 1), de rest schuift 8 pt op en onderin komt
// een nieuw vel bij (+8 → 0, 0 → 1); daarna 1360 ms stil. Eerst vloeien de vier vellen in
// (240 ms, 40 ms na elkaar); het eerste vel gaat eraf na 1000 ms.
//
// Klaar: de lopende beweging maakt eerst af (≤ 800 ms), dan landen in 480 ms glide (0.2, 0.8, 0.2, 1):
// het bovenste vel wordt de rode kopstreep (2 pt, over de kolom), de andere drie glijden naar de
// onderlijn van de kopregels van het eerste verhaal. Daarna de tekst 320 ms in, de strepen 320 ms uit,
// de rest stijgt 8 pt; de kopstreep wordt inkt (240) en na 360 ms neemt de echte lijn het over.
// Klaar binnen 400 ms: geen strepen, meteen de inhoud. Zonder kop om op te landen (Stroom, Selectie,
// de lezer): afmaken en de stapel vervaagt in 320 ms naar de inhoud. Fout: afmaken, strepen 320 ms
// uit, het foutblok 240 ms in (160 later). Verminder beweging: vier stilstaande strepen; klaar en
// fout vloeien in 240 ms over. VoiceOver: één element, "Even kijken bij je bronnen". Geen tekst in beeld.

export const LL = {
  len: 56, // lengte van een vel
  step: 8, // steek
  offs: [-4, 0, 4, -2], // opzij, per vel; loopt door met elk nieuw vel
  top: 180, // bovenste vel, vanaf de bovenkant van het laadvak: 152 onder de plek van de kopstreep (28)
  box: 240, // hoogte van het laadvak
  period: 2000,
  firstBeat: 1000,
  move: 640,
  fadeIn: 240,
  stagger: 40,
  land: 480,
  text: 320,
  out: 320,
  ruleInk: 240,
  handoff: 360,
  early: 400,
  settleMax: 800,
  errIn: 240,
  errDelay: 160,
  reduceFade: 200,
  rise: 8,
  ruleH: 2,
}
export const LABEL = 'Even kijken bij je bronnen'

// Curves: dezelfde oplossing (Newton, 8 stappen) als op iOS.
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  return (x) => {
    const v = Math.min(1, Math.max(0, x))
    let t = v
    for (let i = 0; i < 8; i++) {
      const e = ((ax * t + bx) * t + cx) * t - v
      const d = (3 * ax * t + 2 * bx) * t + cx
      if (Math.abs(e) < 1e-6 || !d) break
      t -= e / d
    }
    t = Math.min(1, Math.max(0, t))
    return ((ay * t + by) * t + cy) * t
  }
}
export const CURVE = { inOut: [0.4, 0, 0.2, 1], glide: [0.2, 0.8, 0.2, 1], ease: [0.2, 0.8, 0.2, 1] }
export const E = { inOut: bezier(...CURVE.inOut), glide: bezier(...CURVE.glide), ease: bezier(...CURVE.ease) }

const clamp = (v) => Math.min(1, Math.max(0, v))
const mix = (a, b, t) => a + (b - a) * t

// Vel n (0, 1, 2, …) op plek `slot` (0 = bovenaan), in een vak van breedte `width` met oorsprong (bx, by).
function sheet(n, slot, box) {
  return { n, x: box.x + (box.w - LL.len) / 2 + LL.offs[n % 4], y: box.y + LL.top + slot * LL.step, w: LL.len, h: 1, o: 1, accent: 0, ink: 0 }
}

// De stapel op `t` ms na het begin. Gesorteerd van boven naar onder; onzichtbare vellen vallen weg.
export function stackAt(t, box, still = false) {
  if (still) return [0, 1, 2, 3].map((n) => sheet(n, n, box))
  if (t < LL.firstBeat) {
    return [0, 1, 2, 3].map((n) => ({ ...sheet(n, n, box), o: E.ease(clamp((t - n * LL.stagger) / LL.fadeIn)) })).filter((s) => s.o > 0)
  }
  const k = Math.floor((t - LL.firstBeat) / LL.period)
  const p = clamp((t - LL.firstBeat - k * LL.period) / LL.move)
  if (p >= 1) return [0, 1, 2, 3].map((i) => sheet(k + 1 + i, i, box))
  const e = E.inOut(p)
  const out = []
  const top = sheet(k, 0, box)
  if (e < 1) out.push({ ...top, x: top.x + LL.step * e, y: top.y - LL.step * e, o: 1 - e })
  for (let i = 1; i <= 3; i++) { const s = sheet(k + i, i, box); out.push({ ...s, y: s.y - LL.step * e }) }
  const fresh = sheet(k + 4, 4, box)
  if (e > 0) out.push({ ...fresh, y: fresh.y - LL.step * e, o: e })
  return out.filter((s) => s.o > 0)
}

// Wanneer de lopende beweging stil is (klaar of fout wachten daarop). Nooit later dan 800 ms.
export function settleAt(t) {
  const fade = 3 * LL.stagger + LL.fadeIn // 360: de vellen staan
  if (t < LL.firstBeat) return Math.max(t, Math.min(fade, LL.firstBeat))
  const k = Math.floor((t - LL.firstBeat) / LL.period)
  const end = LL.firstBeat + k * LL.period + LL.move
  return t < end ? end : t
}

// Eén beeld. st: { t0, reduce, doneAt, failAt, box: {x, y, w}, targets: { rule: {x, y, w}, rows: [{x, y, w}] } | null }
// (alle maten in pt, in het vlak van de laag). Uit: de strepen, en hoe de inhoud erbij staat:
// text (dekking van de nieuwe inhoud), rise (pt die de rest nog lager staat), rule (de echte kopstreep),
// err (het foutblok) en done (de laag mag weg).
export function frame(st, now) {
  const box = st.box || { x: 0, y: 0, w: 390 }
  const t = Math.max(0, now - st.t0)
  const idle = { lines: [], text: 0, rise: 0, rule: 0, err: 0, done: false }
  if (st.failAt != null) {
    const F = st.failAt - st.t0
    if (st.reduce) {
      const q = clamp((t - F) / LL.reduceFade)
      return { ...idle, lines: stackAt(0, box, true).map((s) => ({ ...s, o: 1 - q })).filter((s) => s.o > 0), err: q, done: q >= 1 }
    }
    const S = settleAt(F)
    if (t < S) return { ...idle, lines: stackAt(t, box) }
    const q = E.ease(clamp((t - S) / LL.out))
    const err = E.ease(clamp((t - S - LL.errDelay) / LL.errIn))
    return { ...idle, lines: stackAt(S, box).map((s) => ({ ...s, o: s.o * (1 - q) })).filter((s) => s.o > 0), err, done: t >= S + LL.errDelay + LL.errIn }
  }
  if (st.doneAt != null) {
    const D = st.doneAt - st.t0
    if (st.reduce) {
      const q = clamp((t - D) / LL.reduceFade)
      return { ...idle, lines: stackAt(0, box, true).map((s) => ({ ...s, o: 1 - q })).filter((s) => s.o > 0), text: q, rule: 1, done: q >= 1 }
    }
    if (D < LL.early) return { ...idle, text: 1, rule: 1, done: true }
    const S = settleAt(D)
    if (t < S) return { ...idle, lines: stackAt(t, box), rise: st.targets ? LL.rise : 0 }
    const from = stackAt(S, box)
    if (!st.targets) {
      // Geen kop om op te landen: de stapel vervaagt naar de inhoud.
      const q = E.ease(clamp((t - S) / LL.out))
      return { ...idle, lines: from.map((s) => ({ ...s, o: s.o * (1 - q) })).filter((s) => s.o > 0), text: q, rule: 1, done: t >= S + LL.out }
    }
    const { rule, rows = [] } = st.targets
    const g = E.glide(clamp((t - S) / LL.land))
    const after = t - S - LL.land // na het landen
    const fadeOut = 1 - E.ease(clamp(after / LL.out))
    const lines = []
    const [first, ...rest] = from
    if (first && t < S + LL.land + LL.handoff) {
      const to = rule || { x: first.x, y: first.y, w: first.w }
      const red = after < 0 ? E.ease(clamp((t - S) / LL.ruleInk)) : 1 - E.ease(clamp(after / LL.ruleInk))
      const ink = after < 0 ? 0 : E.ease(clamp(after / LL.ruleInk))
      lines.push({ ...first, x: mix(first.x, to.x, g), y: mix(first.y, to.y, g), w: mix(first.w, to.w, g), h: t - S < LL.land / 2 ? 1 : LL.ruleH, o: rule ? 1 : fadeOut, accent: rule ? red : 0, ink: rule ? ink : 0 })
    }
    rest.forEach((s, i) => {
      const r = rows[i]
      if (r) lines.push({ ...s, x: mix(s.x, r.x, g), y: mix(s.y, r.y, g), w: mix(s.w, r.w, g), o: fadeOut })
      else lines.push({ ...s, o: 1 - E.ease(clamp((t - S) / LL.ruleInk)) })
    })
    return {
      ...idle,
      lines: lines.filter((s) => s.o > 0),
      text: E.ease(clamp(after / LL.text)),
      rise: LL.rise * (1 - E.glide(clamp(after / LL.text))),
      rule: after >= LL.handoff ? 1 : 0,
      done: after >= LL.handoff && after >= LL.text,
    }
  }
  return { ...idle, lines: stackAt(t, box, st.reduce) }
}

// Hele pixels: een streep van 1 pt valt op het raster van het scherm.
export const snap = (v, scale = 1) => Math.round(v * scale) / scale

// De onderlijnen van de kopregels: per tekstregel (rechthoeken van een Range, in het vlak van de laag)
// één streep van de kantlijn tot het eind van de regel, op de basislijn.
export function rowsFromRects(rects, fontSize, max = 3) {
  const rows = []
  for (const r of rects) {
    if (!r.width) continue
    const row = rows.find((x) => Math.abs(x.top - r.top) < 4)
    if (row) { row.left = Math.min(row.left, r.left); row.right = Math.max(row.right, r.right); row.bottom = Math.max(row.bottom, r.bottom) }
    else rows.push({ top: r.top, left: r.left, right: r.right, bottom: r.bottom })
  }
  rows.sort((a, b) => a.top - b.top)
  return rows.slice(0, max).map((x) => ({ x: x.left, y: Math.round(x.bottom - 0.24 * fontSize), w: Math.round(x.right - x.left) }))
}

// De toestand van de laag naast het laden: begin, klaar of fout, en weg. Pure stap voor de hook.
// { phase: 'idle'|'loading'|'ending', t0, doneAt, failAt }
export function nextLoad(state, { loading, ok }, now) {
  if (loading) return state.phase === 'loading' ? state : { phase: 'loading', t0: now, doneAt: null, failAt: null }
  if (state.phase !== 'loading') return state
  return { ...state, phase: 'ending', doneAt: ok ? now : null, failAt: ok ? null : now }
}
