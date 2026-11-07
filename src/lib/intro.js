// De maat van een intro (T2): hoeveel tekens er in de gekozen regels passen, in de smalste kolom
// waarin hij staat. Dat is een telefoon van 375 breed met de marge (--gutter 16) aan twee kanten;
// past een intro daar, dan ook op elke bredere kolom. De tekens per regel rekent shared/zinnen.mjs
// (lineFit); hier staan alleen de kolommen van web, gemeten in de echte opmaak.
import { useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { introMax } from '../../shared/zinnen.mjs'

// Kolombreedte in px op 375 (normale tekst). Met een miniatuur gaat het beeld (--thumb-w, onder
// 360 breed 96, zoals de app; bij grote tekst 108) en de tussenruimte (--s3, 12) af.
const VIEW = 375 - 2 * 16
const GAP = 12
const KOLOM = {
  rij: VIEW, // tijdlijn, en krant met beelden uit (geen miniatuur en geen tussenruimte): 343
  rijBeeld: (thumb) => VIEW - thumb - GAP, // krant met miniatuur: 235, bij grote tekst 223
  voorpagina: VIEW - 64 - GAP, // klein verhaal op de voorpagina, vierkant beeld (--thumb-sm 64): 267
  kaart: VIEW - 2 * 16 - 2, // Selectie: kaart met binnenruimte (--s4) en rand: 309
  kaartA: VIEW, // kaart A+ op een telefoon: de kolom is de hele breedte (343)
  paneel: 325, // vergelijkpaneel op een breed scherm: smaller dan een rij op 375 (gemeten op 1280)
}
// Rekenmaat van de intro: 15 in een lijst, 17 in de eerste kaart van een vak. De intro staat sinds
// de letterwissel overal in Newsreader op 17, maar de lijst rekent bewust door op 15: zo houdt een
// intro hetzelfde aantal tekens als met Source Sans 15. Gemeten (4 november, 1200 intro's uit de
// snapshot van 31 oktober, kolommen 331 en 247): Newsreader 17 is per em even breed als Source
// Sans, en met deze maat past 100 % van de intro's in de gekozen regels (lineFit is 0,58 × 15 =
// 0,51 × 17; pas onder 0,44 × 17 gaat het mis). Op 17 rekenen liet intro's wegvallen die passen.
const T2 = 15
const T3 = 17

// Tekstgrootte: de lettermaat van <html> (de instelling klein/normaal/groot én die van de browser)
// ten opzichte van 16. Bij grote tekst passen er minder tekens op een regel. Eén waarneming voor
// de hele app, bijgewerkt als data-text of de stijl van <html> verandert.
let snap = null
const listeners = new Set()
let observer = null
const read = () => {
  const el = document.documentElement
  const big = el.dataset.text === 'groot' || el.dataset.systeem === 'groot' || el.dataset.systeem === 'ax'
  return `${parseFloat(getComputedStyle(el).fontSize) / 16 || 1}|${big ? 'groot' : 'normaal'}`
}
const subscribe = (cb) => {
  listeners.add(cb)
  if (!observer) {
    observer = new MutationObserver(() => {
      const next = read()
      if (next === snap) return
      snap = next
      for (const l of listeners) l()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-text', 'data-systeem', 'style'] })
  }
  return () => {
    listeners.delete(cb)
    if (!listeners.size) {
      observer.disconnect()
      observer = null
      snap = null // zonder waarnemer kan het veranderen: straks opnieuw lezen
    }
  }
}
const getSnapshot = () => (snap ??= read())
const getServerSnapshot = () => '1|normaal'

// introMax voor een plek: `kind` is 'rij', 'voorpagina', 'paneel', 'kaart' of 'kaartEerste';
// `image` of er een miniatuur naast staat (alleen bij 'rij'). Geeft { max, rek } voor
// wholeSentences.
export function useIntroMax() {
  const [scale, text] = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).split('|')
  const s = Number(scale) || 1
  // `column`: de gemeten breedte van de tekstkolom (useColumnWidth). Op een breed scherm is de kolom
  // van een plek in de Editie veel breder dan de telefoon waarop de vaste maten rekenen; daar
  // viel een intro van één zin van 150 tekens weg die er ruim in paste (kaartkwaliteit, 7 november).
  return (lines, kind = 'rij', image = false, column = 0) => {
    // Nooit breder dan de regellengte van een intro (--measure-prose: 28.8em van de intro, 17 px).
    if (column > 0) return introMax(lines, { width: Math.min(column, 28.8 * T3 * s), font: T2 * s })
    // Kaart A+: de intro is 18 (hoofdverhaal 20) in Newsreader. Gerekend op 16 en 18: een tik ruimer
    // dan de gemeten 15,9 en 17,6 (0,51 em per teken), zodat de clamp (+1 regel) nooit knipt.
    if (kind === 'kaartA') return introMax(lines, { width: KOLOM.kaartA, font: 16 * s })
    if (kind === 'kaartALead') return introMax(lines, { width: KOLOM.kaartA, font: 18 * s })
    if (kind === 'kaartEerste') return introMax(lines, { width: KOLOM.kaart, font: T3 * s })
    const width = kind === 'rij' && image ? KOLOM.rijBeeld(text === 'groot' ? 108 : 96) : KOLOM[kind] ?? KOLOM.rij
    return introMax(lines, { width, font: T2 * s })
  }
}

// De breedte van een tekstkolom, gemeten (ResizeObserver), vóór het tekenen (useLayoutEffect): zo
// rekent de intro op de kolom waarin hij echt staat. 0 zolang er niets gemeten is (dan de vaste maat).
// Elke 8 px één stap, zodat een paar pixels schuiven niet steeds opnieuw rekent.
// `measure(el)`: wat er van het waargenomen element telt (standaard zijn eigen breedte).
export function useColumnWidth(ref, measure = (el) => el.getBoundingClientRect().width) {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const take = () => {
      const w = Math.floor(measure(el) / 8) * 8
      setWidth((old) => (old === w ? old : w))
    }
    take()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(take)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

// Vangnet: past de gekozen intro toch niet binnen de clamp (in een smalle kolom verliest elke regel een half
// woord aan het afbreken, meer dan lineFit rekent), dan een halve regel kleiner, tot hij past of er geen hele
// zin meer overblijft. Zo knipt de clamp nooit midden in een zin ("… via De…"). Zoals IntroText in de app
// meet wat er echt past. `ref`: het element met de clamp; `key`: opnieuw beginnen (ander stuk, andere breedte).
export function useShrinkToFit(ref, key) {
  const [step, setStep] = useState(0)
  useLayoutEffect(() => setStep(0), [key])
  useLayoutEffect(() => {
    const el = ref.current
    if (el && step < 8 && el.scrollHeight > el.clientHeight + 1) setStep((n) => n + 1)
  })
  return step
}
// De maat `fit` ({ max, rek }) `step` halve regels kleiner (rek − max is precies één regel).
export const shrunk = (fit, step) => {
  if (!step) return fit
  const half = Math.ceil(Math.max(1, fit.rek - fit.max) / 2) * step
  return { max: Math.max(0, fit.max - half), rek: Math.max(0, fit.rek - half) }
}
