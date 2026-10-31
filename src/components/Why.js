// Het waarom van een plek in jouw Editie (bouwspec §6): één korte zin in de metakleur onder de
// rubriek. Zonder JSX, zodat tests/why.test.mjs het label in node kan renderen (react-dom/server).
import { createElement } from 'react'

// Deze redenen staan al in het rubrieklabel van de plek ("Buiten je bronnen", "Buiten je bubbel ·
// via Google Trends", "Waar iedereen over schrijft · 9 bronnen", de rubriek zelf): dan niets
// dubbel. "Naast je bubbel · grenst aan Sport" (code buur) zegt wél iets nieuws en blijft staan.
export const WHY_IN_LABEL = new Set(['rubriek', 'extern', 'bubbel', 'breed'])

// De tekst die onder de rubriek komt, of null (geen why: de algemene Editie, een oudere Editie van
// vóór het waarom, of een reden die het label al zegt).
export function whyLine(why) {
  if (!why || typeof why.text !== 'string' || !why.text.trim()) return null
  return WHY_IN_LABEL.has(why.code) ? null : why.text
}

// Hiërarchie van een plek: rubriek (kicker) > kop > intro > why/bron. Het waarom hoort bij de plek,
// niet bij het artikel, dus het staat bij de rubriek (direct eronder, zoals in de bouwspec), maar
// stil: inkt-3, label-hoogte (t1/lh-1), gewone zin, geen kapitalen, geen rood. De kop blijft zo het
// zwaarste element; het waarom is het zachtste erboven.
export function Why({ why }) {
  const text = whyLine(why)
  return text ? createElement('p', { className: 'why' }, text) : null
}
