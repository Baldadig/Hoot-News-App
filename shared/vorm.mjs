// Geen plek in de Editie voor een stuk dat naar zijn vorm geen nieuwsbericht is (persona's 14 november, punt 4): een
// column in de ik-vorm (NU.nl "Schermtijd / Ik gaf een prentenboek uit, koop het alsjeblieft niet"), een dagoverzicht
// ("Wekdienst 14/11: Crisisgesprekken van kabinet gaan verder • Intocht Sint in Grave") en een kop zonder informatie
// (alleen een plaatsnaam in kapitalen, "MEXICO CITY", of één woord, "Quotezakkenexodus"). Stroom en Selectie houden ze;
// in de Editie doen ze langs geen enkele route mee, net als een aanbieding (shared/editie-filter.mjs).
//
// Alleen de vorm van de kop, nooit een onderwerp of een bron:
//  1. ik-vorm: de kop, na een eventueel kort label ("Schermtijd /", "Column |"), begint met "Ik" of "Mijn", of achter zo'n
//     label met het Engelse "I" ("Experience: I live …"), zonder aanhalingsteken ervoor. Een citaat ("‘Ik voelde er niks bij’") is nieuws met een bron, geen
//     column. Het Engelse "My" telt niet: dat begint ook bandnamen ("My Chemical Romance").
//  2. dagoverzicht: meerdere onderwerpen achter elkaar met een opsommingsteken (" • "), of een label met een datum vooraan
//     ("Wekdienst 14/11:", "Nieuws 5/11:"). Een overzicht is geen verhaal; de verhalen erin hebben elk hun eigen stuk.
//  3. lege kop: één woord, of hooguit drie woorden in kapitalen (een dateline of rubriek, geen bericht).
// Overlap bij de merge: recensies (shared/recensie.mjs, de werkkop van muziek- en gamesbronnen), deals (koopkoppen) en
// dubbelcheck (podcast en video nooit kop) hebben eigen regels; dit vangt alleen wat daar niet onder valt.
// Gedeeld door server, web en toestel (edition-core.js): alleen deterministische toetsen, geen URL-object.

const LABEL = /^\s*[\p{L}\p{N}][\p{L}\p{N} &'’.-]{0,30}?\s*(?:\/|\||:)\s+/u
const BULLET = /\s•\s/
const DATED_LABEL = /^\s*\p{L}+(?:\s\p{L}+)?\s+\d{1,2}\/\d{1,2}\s*:/u
const WORDS = /[\p{L}\p{N}]+/gu

export function vormMark(item = {}) {
  if (!item || item.kind === 'post') return null
  const title = String(item.title || '').replace(/\s+/g, ' ').trim()
  if (!title) return null
  const words = title.match(WORDS) || []
  if (words.length <= 1) return 'lege-kop'
  if (words.length <= 3 && /\p{Lu}/u.test(title) && title === title.toUpperCase()) return 'lege-kop'
  if (BULLET.test(title) || DATED_LABEL.test(title)) return 'dagoverzicht'
  // "Ik" en "mijn" in elke schrijfwijze, ook zonder label. Het Engelse "I" alleen achter een rubrieklabel ("Experience: I
  // live …"): zonder label is het vaak een verslag in de eerste persoon ("I asked every TV manufacturer 17 questions").
  const body = title.replace(LABEL, '')
  const labelled = body !== title
  if (/^(ik|mijn)\s/i.test(body) || (labelled && /^I\s/.test(body))) return 'ik-vorm'
  return null
}

export const geenPlekNaarVorm = (item) => vormMark(item) != null
