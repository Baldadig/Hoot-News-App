// Merkbeweging die buiten de CSS valt: de iris in Welkom, het opstartscherm en de overvloeier
// van Welkom naar de Editie. De regel voor Minder beweging onderaan styles.css zet élke
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

// Het opstartscherm (index.html + components/Splash.jsx, naar SplashView/HootApp.swift): de punt
// stuitert in sprongen van 1,6 s (CSS @keyframes in index.html; bij Minder beweging staat hij stil);
// het scherm staat minstens één sprong en hooguit 5 s, tot de Editie er is. Dan vervaagt het grote
// woord op zijn plek en reist alleen de iris in 0,7 s naar de punt van het kleine "hoot." (Editie of
// zijbalk), of landt het woordmerk in 0,7 s op de rode intro van Welkom (het rood blijft).
export const BOUNCE_MS = 1600
export const SPLASH_MAX_MS = 5000
export const SPLASH_IRIS_MS = 700
export const SPLASH_LAND_MS = 700
// Het woordmerk op het opstartscherm: de tekening (viewBox 239,45 × 73,5, punt op (231,75; 65,8)
// r 7,7, zie components/Brand.jsx) passend in 160 × 49, zoals LaunchMark in de app.
export const SPLASH_MARK = { w: 160, h: 49 }
const WORD_BOX = { w: 239.45, h: 73.5, cx: 231.75, cy: 65.8, r: 7.7 }

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

// ---- Van Welkom naar de Editie ----

// De overvloeier (HootApp.swift: `.animation(.easeInOut(duration: 0.45), value: store.onboarded)`):
// Welkom vervaagt in 0,45 s over de Editie die eronder al staat (App.jsx tekent hem tijdens Welkom),
// alleen dekking, geen harde knip en geen skelet. Ook bij Minder beweging: er verplaatst niets, en
// de app houdt hem dan ook.
export const CROSS_MS = 450
export const CROSS = 'ease-in-out'
export const crossPlan = () => ({ fade: CROSS_MS, easing: CROSS })

// ---- Opstartscherm ----

// Wanneer het opstartscherm er is: bij een koude lading (nog geen vlag in sessionStorage) en op het
// beginscherm (standalone) bij elke start, zoals de app.
export const splashWanted = ({ flagged = false, standalone = false }) => standalone || !flagged

// Vertrekken in de rust van de sprong (HootApp.endSplash): een sprong beweegt 1,06 s en ligt dan
// 0,54 s stil. Buiten het venster 1,08–1,5 s: wachten tot het begin van de volgende rust.
export function restDelay(phase, d = BOUNCE_MS) {
  const p = ((phase % d) + d) % d
  const lo = d * 0.675 // 1080 ms
  const hi = d * 0.9375 // 1500 ms
  if (p >= lo && p <= hi) return 0
  return Math.round(((lo - p + d) % d) * 100) / 100
}

// De iris naar de Editie (keuze 1.1.0: eerst vervagen, dan reizen; BRAND-UPDATE §10). Het grote
// woord vervaagt op zijn plek in 40 % van de reis (0,28 s) en beweegt niet; de iris vertrekt als het
// half weg is (20 %, 0,14 s) en reist in 0,7 s naar de gemeten punt. Daar kleurt het rood in 30 %
// (0,21 s) naar de kleur van de punt en neemt de echte punt het over. Zonder "hoot." in beeld sluit
// het rood tot de eigen punt en vervaagt dan kort. Gelijk aan IrisTimes in SplashView.swift.
export const splashTimes = (d = SPLASH_IRIS_MS) => ({ fade: Math.round(d * 0.4), delay: Math.round(d * 0.2), travel: d, tintStart: Math.round(d * 1.2), tintDur: Math.round(d * 0.3), end: Math.round(d * 1.5) + 50, fadeOwn: 150 })

// De landing op de rode intro: het woord glijdt in 55 % van de tijd naar linksboven, daarna
// vervaagt het opstartscherm in 0,3 s (woordmerk en rood blijven gelijk; de tekst komt op).
export const landTimes = (d = SPLASH_LAND_MS) => ({ word: Math.round(d * 0.55), fadeAt: Math.round(d * 0.55) + 100, fade: 300 })

// Waar de punt van het opstartscherm in rust staat, uit de rect van het kader van 160 × 49 (de
// tekening staat gecentreerd, een smalle rand links en rechts). In viewport-coördinaten.
export function splashDot({ left, top }, mark = SPLASH_MARK) {
  const k = mark.h / WORD_BOX.h
  const inset = (mark.w - WORD_BOX.w * k) / 2
  return { x: left + inset + WORD_BOX.cx * k, y: top + WORD_BOX.cy * k, r: WORD_BOX.r * k }
}

// Hoe het woordmerk van het opstartscherm op een ander "hoot." komt te liggen: schaal naar diens
// hoogte (dezelfde tekening) en verschuif punt op punt. Voor een transform met de oorsprong op de
// eigen punt: eerst schalen (de punt blijft liggen), dan verschuiven.
export function fitWord(from, to) {
  const k = to.h / from.h
  return { dx: Math.round((to.dot.x - from.dot.x) * 100) / 100, dy: Math.round((to.dot.y - from.dot.y) * 100) / 100, k: Math.round(k * 10000) / 10000 }
}

// Middelpunt en straal van een getekende punt (de <circle class="brand__dot"> in het woordmerk),
// in viewport-coördinaten. Welkom ligt fixed over het hele scherm, dus die zijn direct bruikbaar.
export function dotAt(circle) {
  if (!circle) return null
  const b = circle.getBoundingClientRect()
  if (!b.width) return null
  return { x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width / 2 }
}

// ---- De animaties zelf (alleen in de browser) ----

// Een kleur van :root (binnen .ob--open is --accent papier, daarom op de wortel gelezen).
export const rootColor = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

// Woord en punt van een getekend "hoot." (BrandLogo): de rect van de svg en het middelpunt van de
// punt, of null als het er niet (zichtbaar) staat.
export function wordAt(svg) {
  if (!svg) return null
  const b = svg.getBoundingClientRect()
  const dot = dotAt(svg.querySelector('.brand__dot'))
  if (!b.width || !dot) return null
  return { left: b.left, top: b.top, w: b.width, h: b.height, dot }
}

// Het woordmerk glijdt naar zijn plek: schalen om de eigen punt en verschuiven (zie fitWord).
export function glide(el, from, to, { duration, easing = LAND }) {
  const { dx, dy, k } = fitWord(from, to)
  el.style.transformOrigin = `${Math.round((from.dot.x - from.left) * 100) / 100}px ${Math.round((from.dot.y - from.top) * 100) / 100}px`
  return el.animate([{ transform: 'translate(0px, 0px) scale(1)' }, { transform: `translate(${dx}px, ${dy}px) scale(${k})` }], { duration, easing, fill: 'forwards' })
}

// Vervagen; bestaande dekkingsanimaties op het element gaan eerst weg, zodat ze niet stapelen.
// Geeft de Animation terug (wacht op `.finished`; die verwerpt als hij geannuleerd wordt).
export function fade(el, ms, from, to, easing = 'ease-out') {
  el.getAnimations?.().forEach((a) => a.id === 'fade' && a.cancel())
  const a = el.animate([{ opacity: from }, { opacity: to }], { duration: ms, easing, fill: 'forwards' })
  a.id = 'fade'
  return a
}

// De iris sluit: van schermvullend tot de punt.
export function irisClose(el, { x, y, r, w, h, duration = IRIS_MS, delay = 0, easing = IRIS }) {
  const [open, closed] = irisKeyframes({ x, y, r, w, h })
  return el.animate([{ clipPath: open }, { clipPath: closed }], { duration, delay, easing, fill: 'both' })
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
