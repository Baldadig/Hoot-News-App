// De intro op een kaart (kaartkwaliteit, 7 november): de eigen intro van het stuk in hele zinnen die op
// de plek passen (wholeSentences). Levert die niets op (de eerste zin is te lang voor deze kolom), dan de
// reserve-intro die de server meegaf (`introAlt`, netlify/lib/build.mjs: introAlternatives): van een
// ander stuk over hetzelfde feit, in de taal van de kop, met "— via X" (`introAltFrom`). Zo staat er
// geen leeg vlak onder de kop. De app spiegelt dit in Item.cardIntro en Item.shownSummary (ios/Hoot/Models.swift).
// Liever geen intro dan een verkeerde:
// - de tekst van een blog over de hele dag is geen intro ("Welkom in het blog …", "Volg alle ontwikkelingen … in
//   onze liveblog."), en een losse verwijzing ("Read more") gaat eruit (shared/aanhef.mjs: introShown);
// - een geleende intro die niet aantoonbaar over het feit van de kop gaat (`introLoose`, de server:
//   netlify/lib/build.mjs, looseBorrow), staat er niet.
// Dit gebeurt pas bij het tonen: de samenvatting waarmee de redacteur rekent, blijft zoals hij was.
import { cleanIntro } from './edition-display.mjs'
import { wholeSentences } from './zinnen.mjs'
import { introShown } from './aanhef.mjs'

// Zoveel tekens kost " — via X" (Item.viaLength in de app).
export const viaCost = (name) => (name ? name.length + 8 : 0)

// De eigen intro zoals hij getoond mag worden ('' als er geen is). Voor elke plek die de intro van een stuk
// toont (kaart, hoofdverhaal, verhaal, Selectie).
export const ownIntro = (item) => (item?.introLoose ? '' : introShown(cleanIntro(item?.summary, item?.author)))

// Een reserve-intro staat er alleen als hele zin: een stuk tot een komma van een ander ("Ahold Delhaize, eigenaar van
// onder meer Albert Heijn, Etos, Gall & Gall en bol — via AD") zegt te weinig. Item.reserveIntro in de app.
export const endsSentence = (t) => /[.!?]["'’”)]?$/.test(t)

// `fit`: { max, rek } van de plek. Geeft { text, via }: via is de bron van een geleende intro, of null.
export function cardIntro(item, fit = { max: Infinity, rek: Infinity }) {
  const own = wholeSentences(ownIntro(item), fit.max - viaCost(item?.borrowedFrom), fit.rek - viaCost(item?.borrowedFrom))
  if (own) return { text: own, via: item.borrowedFrom || null }
  if (item?.introAlt && item.introAltFrom) {
    const alt = wholeSentences(introShown(cleanIntro(item.introAlt)), fit.max - viaCost(item.introAltFrom), fit.rek - viaCost(item.introAltFrom))
    if (alt && endsSentence(alt)) return { text: alt, via: item.introAltFrom }
  }
  return { text: '', via: null }
}
