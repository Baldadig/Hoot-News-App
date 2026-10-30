// Merkbeweging die buiten de CSS valt: de iris in Welkom (en straks het opstartscherm en de
// overvloeier naar de Editie). De regel voor Minder beweging onderaan styles.css zet élke
// CSS-animatie en -transition uit met !important, dus daar kan geen fade mee. Daarom loopt
// alles hier via de Web Animations API (el.animate), die niet onder die regel valt, en kiest
// `reduced()` zelf de stille variant: één fade van 0,35 s, zoals iOS bij Verminder beweging.
// De getallen staan hier (en niet in de component), zodat tests/motion.test.mjs ze kan nalopen.
// Maten en curves uit het brandboard §03 en HootApp.swift/WelcomeView.swift.

export const IRIS = 'cubic-bezier(0.6, 0, 0.2, 1)' // het rood sluit tot de punt
export const IRIS_BACK = 'cubic-bezier(0.8, 0, 0.4, 1)' // en opent weer bij Terug
export const LAND = 'cubic-bezier(0.3, 0, 0.1, 1)' // het woordmerk glijdt naar zijn plek (opstart)
export const IRIS_MS = 700
export const FADE_MS = 350
export const STEP_OUT_MS = 80 // tussen papieren stappen: even uit (WelcomeView.go)
export const STEP_IN_MS = 120 // en weer in

// Verminder beweging aan? Buiten de browser (tests) nooit.
export const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

// De twee standen van de iris als clip-path: schermvullend (straal = de diagonaal, dekt het hele
// scherm vanuit elk middelpunt, zoals iOS hypot × 1,1) en gesloten tot de punt. Beide in px, met
// hetzelfde middelpunt: alleen dan interpoleert clip-path ertussen.
export function irisKeyframes({ x, y, r, w, h }) {
  const R = Math.hypot(w, h)
  const at = `at ${px(x)} ${px(y)}`
  return [`circle(${px(R)} ${at})`, `circle(${px(r)} ${at})`]
}
const px = (n) => `${Math.round(n * 100) / 100}px`

// Het sluiten (WelcomeView.leaveIntro): de papieren punt op het rood is weg op 35 %, het laatste
// stuk (vanaf 60 %) kleurt het rood mee naar de punt (in donker koraal), en het geheel staat
// een tiende langer dan de curve, anders springt de punt op het eind.
export const tintTimes = (d = IRIS_MS) => ({ dotEnd: Math.round(d * 0.35), tintStart: Math.round(d * 0.6), tintDur: Math.round(d * 0.4), end: d + 100 })

// Het openen (WelcomeView.backToIntro): eerst één beeld gesloten (32 ms), de kleur meteen terug
// over 40 %, de punt weer tevoorschijn in de laatste 35 %, en 50 ms rust voordat de intro telt.
export const openTimes = (d = IRIS_MS) => ({ delay: 32, tintDur: Math.round(d * 0.4), dotStart: Math.round(d * 0.65), dotDur: Math.round(d * 0.35), end: d + 50 })

// Minder beweging: alleen dekking, 0,35 s.
export const reducedPlan = () => ({ fade: FADE_MS })

// Middelpunt en straal van een getekende punt (de <circle class="brand__dot"> in het woordmerk),
// in viewport-coördinaten. Welkom ligt fixed over het hele scherm, dus die zijn direct bruikbaar.
export function dotAt(circle) {
  if (!circle) return null
  const b = circle.getBoundingClientRect()
  if (!b.width) return null
  return { x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width / 2 }
}

// ---- De animaties zelf (alleen in de browser) ----

// Vervagen; bestaande dekkingsanimaties op het element gaan eerst weg, zodat ze niet stapelen.
// Geeft de Animation terug (wacht op `.finished`; die verwerpt als hij geannuleerd wordt).
export function fade(el, ms, from, to, easing = 'ease-out') {
  el.getAnimations?.().forEach((a) => a.id === 'fade' && a.cancel())
  const a = el.animate([{ opacity: from }, { opacity: to }], { duration: ms, easing, fill: 'forwards' })
  a.id = 'fade'
  return a
}

// De iris sluit: van schermvullend tot de punt.
export function irisClose(el, { x, y, r, w, h, duration = IRIS_MS, easing = IRIS }) {
  const [open, closed] = irisKeyframes({ x, y, r, w, h })
  return el.animate([{ clipPath: open }, { clipPath: closed }], { duration, easing, fill: 'forwards' })
}

// De iris opent: van de punt tot schermvullend.
export function irisOpen(el, { x, y, r, w, h, duration = IRIS_MS, easing = IRIS_BACK }) {
  const [open, closed] = irisKeyframes({ x, y, r, w, h })
  return el.animate([{ clipPath: closed }, { clipPath: open }], { duration, easing, fill: 'forwards' })
}

// Het vlak kleurt mee: van de ene kleur naar de andere (merkrood ↔ de kleur van de punt).
export function tint(el, from, to, { duration, delay = 0, easing = 'ease-in-out' }) {
  return el.animate([{ backgroundColor: from }, { backgroundColor: to }], { duration, delay, easing, fill: 'both' })
}

// Klaar met een reeks: alle animaties op het element weg, zodat de CSS weer geldt.
export function clear(el) {
  el?.getAnimations?.().forEach((a) => a.cancel())
}

// Wacht op een voorwaarde (bijvoorbeeld: het papieren woordmerk heeft zijn plek), beeld voor
// beeld, hooguit `max` ms. Geeft de uitkomst of null.
export function waitFor(get, max = 300) {
  return new Promise((resolve) => {
    const t0 = performance.now()
    const tick = () => {
      const v = get()
      if (v) return resolve(v)
      if (performance.now() - t0 >= max) return resolve(null)
      requestAnimationFrame(tick)
    }
    tick()
  })
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
