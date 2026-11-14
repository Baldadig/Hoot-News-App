// "Tien en de bubbel · je eerste Editie" (goedgekeurd door Alex op woensdag 4 november: "Akkoord, zo
// bouwen"; Hoot-design, woensdag-2026-11-04/tien-concept/index.html, spec-rij en tijdlijn). Eén keer,
// na de laatste stap van het welkom: Hoot stelt je eerste Editie samen. Gelijk aan
// ios/Hoot/Views/FirstEditionMark.swift (Tien): tests/tien.test.mjs schrijft tests/fixtures/tien.json,
// en ios/HootTests/TienTests.swift rekent dezelfde invoer na (web = app, tot op 0,01 pt).
//
// Vlak 240 × 128, het hart op (120, 72). Tien punten van Ø 8 komen een voor een op de kring (r 48),
// punt k op 36° × k met de klok mee vanaf boven: in 140 ms van 0 naar vol, 4 pt van buiten naar zijn
// plek, en achter elke punt groeit de haarlijn (1 pt) naar hem toe (200 ms). Alles in inkt 3.
// Snel: om de 120 ms; zolang de Editie er nog niet is volgen punt 1–9 de bronnen (om de 600 ms) en
// wacht punt 10; zijn lege plek ademt (2750 ms). Dan sluit de kring (260 ms), alles wordt inkt
// (140 ms), één zachte tik. Negen punten lossen op in de lijn; punt 10 stapt 24 pt naar buiten (r 72)
// en wordt rood (280 ms). 400 ms stil. Dan gaat de bubbel open als een iris (r 48 → 200 in 560 ms,
// weg na 400) en komt de Editie: datumregel, sterke lijn en verhalen, 200 ms elk, 80 ms na elkaar,
// 8 pt omhoog, vanaf iris + 280. Fout: de punten gaan terug in omgekeerde volgorde (140, om de 80),
// de lijn terug (400), dan "Geen verbinding" (200). Geen rood. Verminder beweging: een stilstaande
// gesloten kring in inkt 3; klaar: één vervaging (350) naar het eindbeeld, 800 stil, vervaging naar
// de Editie. Tijden in ms na de tik; R = wanneer de Editie er is, F = wanneer het laden mislukte.

export const TIEN = {
  w: 240, h: 128, cx: 120, cy: 72, // het vlak en het hart
  r: 48, out: 72, dot: 8, hair: 1, iris: 200, nudge: 4,
  first: 240, // de eerste punt: na het wegvagen van het welkom (--dur-gewoon)
  fast: 120, slow: 600, // stap tussen de punten: snel, of de bronnen volgen
  dotIn: 140, lineIn: 200, close: 260, shut: 140, merge: 280, still: 400,
  irisMs: 560, irisGone: 400, redAfter: 200, redOut: 140,
  edAfter: 280, block: 200, blockStep: 80, rise: 8, // de Editie komt in
  sentenceAt: 120, sentence: 200, slowNote: 6000, breath: 2750,
  failDot: 140, failStep: 80, failLine: 400, errAfter: 480, errIn: 200,
  reduceFade: 200, reduceHold: 800, reduceMin: 600,
  welcomeFade: 240, gap: 16, line: 24, // het welkom vervaagt in 240 (gewoon); de zin 16 onder het vlak (24 onder de kring)
  area: 400, // het lege vlak onder de titel waarin het teken gecentreerd staat
}
export const TEXT = {
  line1: 'Je eerste Editie',
  line2: 'Even kijken bij je bronnen',
  busy: 'Hoot stelt je eerste Editie samen',
  ready: 'Je eerste Editie staat klaar. Dan ben je zo bij.',
  fail: 'Je eerste Editie kon nog niet laden. Geen verbinding.',
}

// Curves (Newton, 8 stappen; dezelfde oplossing als load-lines.js en op iOS).
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
// Twee curves: bediening (glide en ease zijn dezelfde) en iris, gelijk aan --ease-bediening en --ease-iris.
export const CURVE = { glide: [0.2, 0.8, 0.2, 1], iris: [0.6, 0, 0.2, 1], ease: [0.2, 0.8, 0.2, 1] }
export const E = { glide: bezier(...CURVE.glide), iris: bezier(...CURVE.iris), ease: bezier(...CURVE.ease) }

const INF = Infinity
const clamp = (v) => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)))

// Wanneer elke punt aankomt, en de momenten daarna. R en F: null zolang onbekend.
// Oorzakelijk: wat al op het scherm staat, verandert niet als R of F later bekend wordt.
export function plan(R = null, F = null) {
  const ready = R == null ? INF : Math.max(0, R)
  const fail = F == null ? INF : Math.max(0, F)
  const a = []
  let prev = TIEN.first
  a.push(prev < fail ? prev : INF)
  for (let k = 1; k < 9; k++) {
    if (a[k - 1] === INF) { a.push(INF); continue }
    const v = Math.min(prev + TIEN.slow, Math.max(prev + TIEN.fast, ready))
    prev = v
    a.push(v < fail ? v : INF)
  }
  a.push(fail < INF || a[8] === INF ? INF : Math.max(a[8] + TIEN.fast, ready))
  const close = a[9] + TIEN.dotIn
  const merge = close + TIEN.close
  const open = merge + TIEN.merge + TIEN.still
  const ed = open + TIEN.edAfter
  let last = -1
  a.forEach((v, k) => { if (v < INF) last = k })
  return { a, ready, fail, close, merge, open, ed, last }
}

// Verminder beweging: de vaste momenten.
export function stillPlan(R = null, F = null) {
  const ready = R == null ? INF : Math.max(TIEN.reduceMin, R)
  const fail = F == null ? INF : Math.max(0, F)
  const end = fail < INF ? INF : ready // het eindbeeld vervaagt in
  const out = end + TIEN.reduceFade + TIEN.reduceHold // de Editie vervaagt in
  return { ready, fail, end, out }
}

const ang = (k) => (k * Math.PI) / 5
const at = (k, r) => ({ x: TIEN.cx + r * Math.sin(ang(k)), y: TIEN.cy - r * Math.cos(ang(k)) })

// Hoe ver de haarlijn is, in graden vanaf boven met de klok mee.
function arc(p, t) {
  let L = 0
  for (let k = 1; k < 10; k++) L += 36 * E.glide(clamp((t - p.a[k]) / TIEN.lineIn))
  L += 36 * E.glide(clamp((t - p.close) / TIEN.close))
  if (p.fail < INF) L *= 1 - E.glide(clamp((t - p.fail) / TIEN.failLine))
  return L
}

// Eén beeld op t ms na de tik. st: { R, F, reduce }.
// Uit: ring { r, deg, shut, o }, tien punten { x, y, o, shut, red }, de lege plek of het eindbeeld
// (ghost { x, y, o, red }), de twee zinnen, het foutblok (err), de Editie (show: vanaf wanneer de blokken
// komen, in ms na de tik; null = nog niet), wat VoiceOver hoort (say), de tik (tick) en done.
export function frame(st, t) {
  const reduce = !!st.reduce
  const shown = { ring: { r: TIEN.r, deg: 0, shut: 0, o: 0 }, dots: [], ghost: { x: 0, y: 0, o: 0, red: 0 }, line1: 0, line2: 0, err: 0, show: null, say: TEXT.busy, tick: null, done: false }
  if (reduce) {
    const p = stillPlan(st.R, st.F)
    const toEnd = clamp((t - p.end) / TIEN.reduceFade)
    const out = clamp((t - p.out) / TIEN.reduceFade)
    const errOut = p.fail < INF ? clamp((t - p.fail) / TIEN.reduceFade) : 0
    shown.ring = { r: TIEN.r, deg: 360, shut: toEnd, o: (1 - out) * (1 - errOut) }
    for (let k = 0; k < 10; k++) shown.dots.push({ ...at(k, TIEN.r), o: (1 - toEnd) * (1 - errOut), shut: 0, red: 0 })
    shown.ghost = { ...at(9, TIEN.out), o: toEnd * (1 - out), red: 1 }
    shown.line1 = clamp(t / TIEN.reduceFade) * (1 - out) * (1 - errOut)
    shown.line2 = clamp((t - TIEN.slowNote) / TIEN.reduceFade) * (1 - clamp((t - p.ready) / TIEN.reduceFade)) * (1 - errOut)
    shown.err = p.fail < INF ? clamp((t - p.fail - TIEN.reduceFade) / TIEN.reduceFade) : 0
    shown.show = p.out < INF ? p.out : null
    if (p.fail < INF && t >= p.fail) shown.say = TEXT.fail
    else if (t >= p.ready) shown.say = TEXT.ready
    shown.done = p.fail < INF ? t >= p.fail + 2 * TIEN.reduceFade : t >= p.out + TIEN.reduceFade
    return shown
  }
  const p = plan(st.R, st.F)
  const shut = E.ease(clamp((t - p.close) / TIEN.shut))
  const mg = E.iris(clamp((t - p.merge) / TIEN.merge))
  const o = E.iris(clamp((t - p.open) / TIEN.irisMs))
  shown.ring = { r: TIEN.r + (TIEN.iris - TIEN.r) * o, deg: arc(p, t), shut, o: 1 - clamp((t - p.open) / TIEN.irisGone) }
  for (let k = 0; k < 10; k++) {
    const pr = E.glide(clamp((t - p.a[k]) / TIEN.dotIn))
    let r = TIEN.r + TIEN.nudge * (1 - pr), al = pr, red = 0
    if (p.fail < INF && p.a[k] < INF) al *= 1 - E.ease(clamp((t - (p.fail + TIEN.failStep * (p.last - k))) / TIEN.failDot))
    if (k < 9) al *= 1 - mg
    else { r += (TIEN.out - TIEN.r) * mg; red = mg; al *= 1 - clamp((t - p.open - TIEN.redAfter) / TIEN.redOut) }
    shown.dots.push({ ...at(k, r), o: al, shut, red })
  }
  // De lege plek van punt 10 ademt, rustig, zolang de Editie er nog niet is.
  const from = p.a[8] + TIEN.dotIn
  if (p.a[8] < INF && p.a[9] > from && t > from) {
    const breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * (t - from)) / TIEN.breath)
    const fadeIn = clamp((t - from) / TIEN.still)
    const hand = 1 - clamp((t - Math.min(p.a[9], p.fail)) / TIEN.dotIn)
    shown.ghost = { ...at(9, TIEN.r), o: (0.12 + 0.28 * breath) * fadeIn * hand, red: 0 }
  }
  const failOut = p.fail < INF ? 1 - clamp((t - p.fail) / TIEN.sentence) : 1
  shown.line1 = clamp((t - TIEN.sentenceAt) / TIEN.sentence) * (1 - clamp((t - p.open) / TIEN.sentence)) * failOut
  shown.line2 = clamp((t - TIEN.slowNote) / TIEN.sentence) * (1 - clamp((t - Math.min(p.a[9], p.fail)) / TIEN.sentence))
  shown.err = p.fail < INF ? clamp((t - p.fail - TIEN.errAfter) / TIEN.errIn) : 0
  shown.show = p.ed < INF ? p.ed : null
  shown.tick = p.close < INF ? p.close : null
  if (p.fail < INF && t >= p.fail) shown.say = TEXT.fail
  else if (t >= p.merge + TIEN.merge) shown.say = TEXT.ready
  shown.done = p.fail < INF ? t >= p.fail + TIEN.errAfter + TIEN.errIn : t >= p.open + TIEN.irisMs
  return shown
}

// Hoe een blok van de Editie erbij staat: opacity en hoeveel pt lager, op t ms na de tik.
export function block(i, show, t, reduce = false) {
  if (show == null) return { o: 0, y: reduce ? 0 : TIEN.rise }
  if (reduce) return { o: clamp((t - show) / TIEN.reduceFade), y: 0 }
  const v = E.ease(clamp((t - show - TIEN.blockStep * i) / TIEN.block))
  return { o: v, y: TIEN.rise * (1 - v) }
}

// De toestand naast het laden: pure stap voor de hook en het model op iOS.
// { t0, R, F } met R en F in ms na t0. Laden na een fout (Opnieuw), of de Editie die toch nog komt,
// begint een nieuwe ronde.
export function nextTien(state, { loading, failed }, now) {
  if (!state) return null
  if (state.F != null && (loading || !failed)) return { t0: now, R: null, F: null }
  if (loading || state.R != null || state.F != null) return state
  return failed ? { ...state, F: now - state.t0 } : { ...state, R: now - state.t0 }
}
