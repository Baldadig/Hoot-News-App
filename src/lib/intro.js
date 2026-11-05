// De maat van een intro (T2): hoeveel tekens er in de gekozen regels passen, in de smalste kolom
// waarin hij staat. Dat is een telefoon van 375 breed met de marge (--gutter 16) aan twee kanten;
// past een intro daar, dan ook op elke bredere kolom. De tekens per regel rekent shared/zinnen.mjs
// (lineFit); hier staan alleen de kolommen van web, gemeten in de echte opmaak.
import { useSyncExternalStore } from 'react'
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
  return (lines, kind = 'rij', image = false) => {
    // Kaart A+: de intro is 18 (hoofdverhaal 20) in Newsreader. Gerekend op 16 en 18: een tik ruimer
    // dan de gemeten 15,9 en 17,6 (0,51 em per teken), zodat de clamp (+1 regel) nooit knipt.
    if (kind === 'kaartA') return introMax(lines, { width: KOLOM.kaartA, font: 16 * s })
    if (kind === 'kaartALead') return introMax(lines, { width: KOLOM.kaartA, font: 18 * s })
    if (kind === 'kaartEerste') return introMax(lines, { width: KOLOM.kaart, font: T3 * s })
    const width = kind === 'rij' && image ? KOLOM.rijBeeld(text === 'groot' ? 108 : 96) : KOLOM[kind] ?? KOLOM.rij
    return introMax(lines, { width, font: T2 * s })
  }
}
