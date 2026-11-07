// Aanhef van een (live)blog en reclamezinnen in een intro (kaartkwaliteit, 7 november). Generiek, op patronen;
// nooit op een bepaalde kop of bron. Liever geen intro dan een verkeerde.
//
// Alleen bij het TONEN en bij de RESERVE-intro: de samenvatting waarmee de redacteur rekent (kopscore, onderwerpen,
// desks, verhaalsignatuur) blijft precies zoals hij was, zodat het nieuws niet verschuift (keuring ronde 2).
//
// - BLOG: de tekst is van een blog over de hele dag ("Welkom in het blog over de midtermverkiezingen.", "Volg alle
//   ontwikkelingen … in onze liveblog.", "In de liveblog economie …", "Hier houden we je op de hoogte …", "Of dat
//   lukt, leest u in deze liveblog."). Dan is er GEEN intro, ook niet de rest ("Heb je een vraag? Mail die naar …",
//   "De Formule 1 dendert door in deze periode."), en leent zo'n stuk niets uit.
// - PROMO: een losse verwijzing ("Read more", "Lees hier de daghoroscoop.", "This story was updated on …"). Alleen
//   die zin gaat eruit; de rest is de echte intro.
//
// Zinnen knippen met de afkortingenregel van de intro (SENTENCE_END), en nooit vóór een cijfer of kleine letter:
// "Welcome to Installer No. 150, your guide …" is één zin.
// De app gebruikt dezelfde patronen (enum Aanhef in ios/Hoot/Models.swift); tests/kaart-kwaliteit.test.mjs houdt
// ze gelijk. Alleen syntaxis die JavaScript en NSRegularExpression allebei kennen.
import { SENTENCE_END } from './zinnen.mjs'

// Per zin.
export const BLOG_SOURCE = String.raw`\blive(?:\s|-)?blogs?\b|\bin\s+(?:het|dit|ons|deze|onze|this|our|the)\s+blog\b|^\s*(?:volg|follow)\s+(?:alle|al|alles|hier|live|ons|onze|het\s+laatste|de\s+ontwikkelingen|our|the\s+latest|along)\b|\bop\s+deze\s+pagina\b|\bon\s+this\s+page\b|\b(?:u|je|jou)\s+(?:\w+\s+)?op\s+de\s+hoogte\b|\bkeep\s+you\s+(?:up\s+to\s+date|updated|posted)\b|\blive\s+(?:updates?|coverage)\b`
// De hele tekst opent met een welkom, eventueel na een groet: "Welkom in het blog …", "Hallo en welkom …",
// "Hi, friends! Welcome to Installer …". Een welkom verderop is gewoon tekst ("… Welcome to the future.").
export const GREETING_SOURCE = String.raw`^\s*(?:(?:hallo|hoi|hi|hey|hello|goede(?:morgen|middag|avond)|good\s+(?:morning|afternoon|evening))\b[^.!?]{0,30}[.!?,]?\s*(?:en\s+|and\s+)?)?(?:welkom|welcome)\b`
// Per zin; alleen die zin gaat eruit.
export const PROMO_SOURCE = String.raw`^\s*(?:lees|luister|bekijk|kijk|read|listen|watch)\s+(?:hier|meer|ook|alles|terug|more|here|also)\b|^\s*(?:this|the)\s+(?:story|article)\s+(?:was|has\s+been)\s+updated\b`

const BLOG = new RegExp(BLOG_SOURCE, 'i')
const GREETING = new RegExp(GREETING_SOURCE, 'i')
const PROMO = new RegExp(PROMO_SOURCE, 'i')

// De zinnen van een tekst, met hun witruimte (samen weer de hele tekst).
export function sentencesOf(text) {
  const s = String(text || '')
  const out = []
  let start = 0
  for (const m of s.matchAll(SENTENCE_END)) {
    const end = m.index + m[0].length
    if (m[0][0] === '.' && s[m.index - 1] === '.') continue // "..." is geen zinseinde
    const next = s.slice(end).trimStart()[0]
    if (next && /[\p{Ll}\d]/u.test(next)) continue // "No. 150", "ca. tien": dezelfde zin
    out.push(s.slice(start, end))
    start = end
  }
  if (start < s.length) out.push(s.slice(start))
  return out.filter((z) => z.trim())
}

// Is dit de tekst van een blog over de hele dag?
export const isBlog = (text) => !!text && (GREETING.test(String(text)) || sentencesOf(text).some((z) => BLOG.test(z)))
// Heeft de tekst een aanhef of reclamezin?
export const hasAanhef = (text) => isBlog(text) || sentencesOf(text).some((z) => PROMO.test(z))
// De intro zoals hij op een kaart mag staan: niets bij een blog, anders zonder de reclamezinnen.
export function introShown(text) {
  const s = String(text || '')
  if (!s.trim() || isBlog(s)) return ''
  const z = sentencesOf(s)
  return z.some((x) => PROMO.test(x)) ? z.filter((x) => !PROMO.test(x)).join('').trim() : s
}
