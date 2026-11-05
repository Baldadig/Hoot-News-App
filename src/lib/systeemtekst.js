import { useSyncExternalStore } from 'react'
import { effectiveFactor } from './tekstgrootte.js'

// Tekstgrootte op een aanraakscherm volgt het systeem, zoals Dynamic Type in de app. Op een computer
// blijft Tekstgrootte (Klein, Normaal, Groot) een eigen keuze in Weergave, want een browser heeft daar
// geen systeemgrootte.
//   iPhone en iPad (Safari, geïnstalleerde web-app): de maat van `font: -apple-system-body` is de
//     Dynamic Type van de gebruiker (14 tot 53 pt, 17 bij Large). <html> krijgt die maat × 16/17, zodat
//     1 rem bij Large precies 16 px blijft en alles wat op de rem-schaal staat gelijk blijft.
//   Andere aanraakschermen (Android): de browser schaalt de standaardlettermaat al; <html> blijft op 100 %.
// Koppen groeien mee tot een bovengrens (styles.css, --t4 tot --t6), zodat een kop bij 310 % heel blijft.
export const TOUCH = '(hover: none) and (pointer: coarse)'

// De maat van Dynamic Type voor `body` (px, 17 bij Large) naar wat de opmaak nodig heeft. Zuiver, getest.
//   rem    de lettermaat van <html> in px
//   groot  de miniatuur van 108 in plaats van 96 (app: thumb >= thumbLarge, vanaf xxLarge, 21 pt)
//   ax     toegankelijkheidsmaten (vanaf 28 pt): de kop krijgt de hele breedte, zonder miniatuur
export function systeemMaat(bodyPx) {
  const body = Number.isFinite(bodyPx) && bodyPx > 0 ? bodyPx : 17
  return {
    rem: Math.round(((body * 16) / 17) * 100) / 100,
    groot: (body * 96) / 17 >= 108,
    ax: body >= 28,
  }
}

export function isTouch() {
  return typeof matchMedia === 'function' && matchMedia(TOUCH).matches
}

export function useTouch() {
  return useSyncExternalStore(
    (cb) => {
      if (typeof matchMedia !== 'function') return () => {}
      const mq = matchMedia(TOUCH)
      mq.addEventListener?.('change', cb)
      return () => mq.removeEventListener?.('change', cb)
    },
    isTouch,
    () => false
  )
}

// De eigen Tekstgrootte (lib/tekstgrootte.js) als factor op de root: alles op de rem-schaal groeit mee.
let schaal = 1
let remeasure = () => {}
export function setSchaal(factor) {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1
  if (f === schaal) return
  schaal = f
  remeasure()
}

export function startSysteemTekst() {
  if (typeof document === 'undefined' || typeof matchMedia !== 'function') return () => {}
  const root = document.documentElement
  const apple = typeof CSS !== 'undefined' && CSS.supports?.('font', '-apple-system-body')
  const probe = document.createElement('span')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:-9999px;top:0;white-space:nowrap'
  probe.style.font = apple ? '-apple-system-body' : 'medium serif'
  probe.textContent = 'Hoot'
  const clear = () => {
    root.style.removeProperty('font-size')
    delete root.dataset.systeem
  }
  const measure = () => {
    // Op een computer is er geen systeemmaat: de standaardmaat van de browser (17 op de schaal van iOS).
    let body = 17
    if (isTouch()) {
      if (!probe.isConnected) document.body.appendChild(probe)
      // `medium` is de standaardmaat van de browser (16 × de lettermaat die de gebruiker koos): 17 is 16.
      const px = parseFloat(getComputedStyle(probe).fontSize)
      body = apple ? px : (px * 17) / 16
    }
    const f = effectiveFactor(schaal, body)
    const m = systeemMaat(body * f)
    // iPhone: de maat van Dynamic Type × de Tekstgrootte; elders de maat van de browser × de Tekstgrootte.
    if (isTouch() && apple) root.style.fontSize = `${m.rem}px`
    else if (f !== 1) root.style.fontSize = `${Math.round(f * 10000) / 100}%`
    else root.style.removeProperty('font-size')
    const state = m.ax ? 'ax' : m.groot ? 'groot' : 'normaal'
    if (!isTouch() && state === 'normaal') {
      if (root.dataset.systeem !== undefined) delete root.dataset.systeem
    } else if (root.dataset.systeem !== state) root.dataset.systeem = state
  }
  const mq = matchMedia(TOUCH)
  window.addEventListener('resize', measure)
  window.addEventListener('pageshow', measure)
  document.addEventListener('visibilitychange', measure)
  mq.addEventListener?.('change', measure)
  measure()
  remeasure = measure
  return () => {
    remeasure = () => {}
    window.removeEventListener('resize', measure)
    window.removeEventListener('pageshow', measure)
    document.removeEventListener('visibilitychange', measure)
    mq.removeEventListener?.('change', measure)
    probe.remove()
    clear()
  }
}
