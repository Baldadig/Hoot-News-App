// De intro op een kaart (kaartkwaliteit, 7 november): de eigen intro van het stuk in hele zinnen die op
// de plek passen (wholeSentences). Levert die niets op (de eerste zin is te lang voor deze kolom), dan de
// reserve-intro die de server meegaf (`introAlt`, netlify/lib/build.mjs: introAlternatives): van een
// ander stuk over hetzelfde feit, in de taal van de kop, met "— via X" (`introAltFrom`). Zo staat er
// geen leeg vlak onder de kop. De app spiegelt dit in Item.cardIntro (ios/Hoot/Models.swift).
// De aanhef van een (live)blog telt nooit als intro (shared/aanhef.mjs): "Welkom in het blog …" valt weg, en was
// dat de hele intro, dan is er geen. Liever geen intro dan een verkeerde.
import { cleanIntro } from './edition-display.mjs'
import { wholeSentences } from './zinnen.mjs'
import { withoutAanhef } from './aanhef.mjs'

// Zoveel tekens kost " — via X" (Item.viaLength in de app).
export const viaCost = (name) => (name ? name.length + 8 : 0)

// `fit`: { max, rek } van de plek. Geeft { text, via }: via is de bron van een geleende intro, of null.
export function cardIntro(item, fit = { max: Infinity, rek: Infinity }) {
  const own = wholeSentences(withoutAanhef(cleanIntro(item?.summary, item?.author)), fit.max - viaCost(item?.borrowedFrom), fit.rek - viaCost(item?.borrowedFrom))
  if (own) return { text: own, via: item.borrowedFrom || null }
  if (item?.introAlt && item.introAltFrom) {
    const alt = wholeSentences(withoutAanhef(cleanIntro(item.introAlt)), fit.max - viaCost(item.introAltFrom), fit.rek - viaCost(item.introAltFrom))
    if (alt) return { text: alt, via: item.introAltFrom }
  }
  return { text: '', via: null }
}
