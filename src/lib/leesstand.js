// De zon als voortgang (zon-voortgang, variant B): hoe ver je in de Editie bent, uit de scrollpositie.
// De zon beweegt alleen als jij scrolt, nooit uit zichzelf. Hij volgt de stand niet per pixel maar zweeft
// er rustig naartoe (ZON_VOLG_MS), zodat snel scrollen geen sprongen geeft. Gelijk aan LeesStand en
// EditionSun in EditionView.swift.
//
// De leeslijn: bovenaan ligt hij net onder de kop, helemaal onderaan op de onderkant van het scherm.
// Daartussen schuift hij gelijkmatig mee, zodat ook de laatste verhalen (die nooit bovenaan kunnen
// komen) en het einde hun eigen stuk krijgen. Elk verhaal dat de lijn passeert telt; tussen twee
// verhalen loopt de stand vloeiend door. Bij Minder beweging telt alleen de hele stap.
import { kopSun, KOP } from './sun.js'
import { STILL_MS } from './motion.js'

const clamp = (x, a, b) => Math.max(a, Math.min(b, x))

// top: scrollpositie; max: hoe ver je kunt scrollen; kop: hoogte van de kop boven de lijn; hoogte: het
// zichtbare deel; starts: de bovenkant van elk verhaal (in de scrollinhoud), einde: de bovenkant van het einde.
export function leesStand({ top = 0, max = 0, kop = 0, hoogte = 0, starts = [], einde = null }) {
  const n = starts.length
  if (!n) return 0
  const f = max > 0 ? clamp(top / max, 0, 1) : 1
  const lijn = top + kop + Math.max(0, hoogte - kop) * f
  const S = [...starts, einde ?? starts[n - 1]]
  if (lijn < S[0]) return 0
  for (let i = 0; i < n; i++) {
    if (lijn < S[i + 1]) return i + clamp((lijn - S[i]) / Math.max(1, S[i + 1] - S[i]), 0, 1)
  }
  return n
}

// Het verhaal dat bovenaan staat: de hele stap (een tikje speling, zodat een verhaal dat net onder de
// lijn staat al meetelt).
export const stapVan = (p, n) => clamp(Math.floor(p + 0.05), 0, n)

// Wat VoiceOver hoort bij de naam van de Editie: "4 van 10 gelezen", aan het einde de eindzin.
export const leesWaarde = (stap, n, eind) => (stap >= n && eind ? eind : `${stap} van ${n} gelezen`)

const f2 = (x) => x.toFixed(2)

// Eén zon tekenen (KopSun in components/SunArt.jsx): de schijf, de knip op de horizon en de gloed.
export function tekenZon(svg, p, n) {
  const v = kopSun(p, n)
  const disc = svg.querySelector('.sun__disc')
  const glow = svg.querySelector('.sun__gloed')
  disc?.setAttribute('cy', f2(v.cy))
  glow?.setAttribute('opacity', v.gloed.toFixed(3))
  svg.dataset.stand = f2(p)
}

// Minder beweging: de zon verschuift niet mee maar verspringt per verhaal met een korte fade (uit,
// verzetten, weer aan), samen één fade van STILL_MS (200 ms): de helft uit, de helft aan (de CSS-overgang
// in styles/zon-voortgang.css is calc(var(--dur-minder) / 2)).
const shown = new WeakMap()

// Rustig nazweven (keuze Alex, 13 nov: de zon bewoog te hard): de getekende stand loopt elk frame een stukje
// naar de echte stand, met een tijdconstante van ZON_VOLG_MS. Na ongeveer drie keer die tijd staat hij stil.
export const ZON_VOLG_MS = 260
export const volgStap = (van, naar, dt) => naar + (van - naar) * Math.exp(-Math.max(0, dt) / ZON_VOLG_MS)
const getekend = new WeakMap()
function zweefZon(svg, p, n) {
  const z = getekend.get(svg)
  if (!z) {
    getekend.set(svg, { nu: p, doel: p, n, t: 0, frame: 0 })
    tekenZon(svg, p, n)
    return
  }
  z.doel = p
  z.n = n
  if (z.frame) return
  z.t = performance.now()
  const stap = (now) => {
    z.nu = volgStap(z.nu, z.doel, now - z.t)
    z.t = now
    if (Math.abs(z.nu - z.doel) < 0.002) z.nu = z.doel
    tekenZon(svg, z.nu, z.n)
    z.frame = z.nu === z.doel ? 0 : requestAnimationFrame(stap)
  }
  z.frame = requestAnimationFrame(stap)
}

export function zetZon(svg, p, n, still) {
  if (!still) {
    shown.set(svg, null)
    zweefZon(svg, p, n)
    return
  }
  const z = getekend.get(svg)
  if (z?.frame) cancelAnimationFrame(z.frame)
  getekend.delete(svg)
  const stap = stapVan(p, n)
  const vorige = shown.get(svg)
  if (vorige === stap) return
  shown.set(svg, stap)
  if (vorige == null) {
    tekenZon(svg, stap, n)
    return
  }
  svg.classList.add('is-uit')
  clearTimeout(svg._zonT)
  svg._zonT = setTimeout(() => {
    tekenZon(svg, shown.get(svg) ?? stap, n)
    svg.classList.remove('is-uit')
  }, STILL_MS / 2)
}

export { KOP }

// ---- In de browser: de Editie volgen ----

// De verhalen in hun volgorde: elk genummerd verhaal (ook een ingeklapt verhaal draagt zijn nummer),
// niet Buiten je bubbel (die telt niet mee) en niet de verhalen die je volgt boven de lijn.
function verhalen(scroller) {
  const seen = new Set()
  const out = []
  for (const n of scroller.querySelectorAll('.kaarten .kicker__n, .front .kicker__n, .pairs .kicker__n')) {
    if (n.closest('.bubble')) continue
    const el = n.closest('article, .lessnote')
    if (el && !seen.has(el)) (seen.add(el), out.push(el))
  }
  return out
}

// Volgt de scrollpositie met één luisteraar en requestAnimationFrame. Zet de stand op elke kleine zon
// (.sun--kop), de waarde voor VoiceOver op [data-leesstand], en zet de meelopende kop (.edbar) aan
// zodra de naam van de Editie uit beeld is. Geeft een opruimfunctie terug.
export function volgLeesStand(scroller, { n, eind, still = () => false }) {
  if (!scroller || !n) return () => {}
  let frame = 0
  let stapNu = -1
  const meet = () => {
    frame = 0
    const box = scroller.getBoundingClientRect()
    if (!box.height) return
    const bar = scroller.querySelector('.edbar')
    const kop = bar?.firstElementChild?.offsetHeight || 0
    const titel = scroller.querySelector('.edtop .vh__title')
    if (bar && titel) bar.classList.toggle('is-aan', titel.getBoundingClientRect().bottom <= box.top + kop)
    const top = scroller.scrollTop
    const inhoud = (el) => el.getBoundingClientRect().top - box.top + top
    const starts = verhalen(scroller).map(inhoud)
    const endcap = scroller.querySelector('.endcap')
    const p = leesStand({ top, max: scroller.scrollHeight - scroller.clientHeight, kop, hoogte: scroller.clientHeight, starts, einde: endcap ? inhoud(endcap) : null })
    const totaal = starts.length || n
    const stil = still()
    for (const svg of scroller.querySelectorAll('.sun--kop')) zetZon(svg, p, totaal, stil)
    const stap = stapVan(p, totaal)
    if (stap !== stapNu) {
      stapNu = stap
      for (const el of scroller.querySelectorAll('[data-leesstand]')) el.textContent = `, ${leesWaarde(stap, totaal, eind)}`
    }
  }
  const plan = () => {
    if (!frame) frame = requestAnimationFrame(meet)
  }
  scroller.addEventListener('scroll', plan, { passive: true })
  window.addEventListener('resize', plan)
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(plan) : null
  ro?.observe(scroller.querySelector(".col") || scroller)
  plan()
  return () => {
    for (const svg of scroller.querySelectorAll('.sun--kop')) {
      const z = getekend.get(svg)
      if (z?.frame) cancelAnimationFrame(z.frame)
      getekend.delete(svg)
    }
    scroller.removeEventListener('scroll', plan)
    window.removeEventListener('resize', plan)
    ro?.disconnect()
    if (frame) cancelAnimationFrame(frame)
  }
}
