// De lijn bovenaan de Stroom: rubrieken links, je bronnen als stapel rechts — pure gegevens en
// functies (tests/streamline.test.mjs). Het tekenen en bewegen staat in components/StreamLine.jsx.
import { TOPICS, INTERESTS, orderedTopics } from './topics.js'

// Maten van de stapel, gelijk aan de tokens in styles.css (--tap, --s1, --s2, --s4).
export const TAP = 44 // aanraakvlak van elk bolletje
export const GAP = 4 // tussen de open bolletjes
export const STEP_OPEN = TAP + GAP // 48
export const LOGO = 36 // logo in de open rij
export const SMALL = 28 // dicht: 36 − 8
export const STEP = 16 // dicht: half over elkaar
export const PEEK = 20 // dicht, met de muis erover: een stukje open
export const EDGE = (TAP - SMALL) / 2 // 8: kolomrand tot het voorste logo, dat zo op de as van de accountknop ligt
export const PAD = 8 // binnenrand van de stapelknop, en tussen naam en logo's
export const DECK_MAX = 3
export const STRIP_FADE = 24 // vervaagde rand van de open rij

export const joinNL = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' en ' + a[a.length - 1])

// ---- Rubrieken ----
// Eén rubriek: `key` is de parameter in de URL (onderwerp of rubriek; Alles heeft er geen),
// `sig` maakt hem uniek (het onderwerp 'tech' en de rubriek 'tech' zijn twee verschillende).
const R = (key, id, label) => ({ key, id, label, sig: key ? `${key}=${id}` : '' })
const topicLabel = (id) => (id === 'bubbel' ? 'Buiten je bubbel' : TOPICS.find((t) => t.id === id)?.label || id)
const interestLabel = (id) => INTERESTS.find((i) => i.id === id)?.label || id

// Welke rubriek aan staat, in de vorm van `sig`.
export function actieveRubriek(filters = {}) {
  return filters.onderwerp ? `onderwerp=${filters.onderwerp}` : filters.rubriek ? `rubriek=${filters.rubriek}` : ''
}

// De rij: links wat je leest (Alles, Buiten je bubbel), na de kolomlijn je onderwerpen
// (gepinde eerst) of anders de acht rubrieken. Staat er een filter aan dat niet in de rij
// staat (een link naar #/stroom?onderwerp=ai), dan komt dat direct na de kolomlijn: een filter
// is nooit onzichtbaar, en de rode streep heeft altijd een doel. `sep` = waar de kolomlijn staat.
export function rubriekRij({ mine = [], pinned = [], hasBubble = false, filters = {} } = {}) {
  const lees = [R(null, 'alles', 'Alles')]
  if (hasBubble || filters.onderwerp === 'bubbel') lees.push(R('onderwerp', 'bubbel', 'Buiten je bubbel'))
  const vast = mine.length ? orderedTopics(pinned, mine).map((t) => R('onderwerp', t.id, t.label)) : INTERESTS.map((i) => R('rubriek', i.id, i.label))
  const binnen = new Set([...lees, ...vast].map((r) => r.sig))
  const los = []
  if (filters.onderwerp && !binnen.has(`onderwerp=${filters.onderwerp}`)) los.push(R('onderwerp', filters.onderwerp, topicLabel(filters.onderwerp)))
  if (filters.rubriek && !binnen.has(`rubriek=${filters.rubriek}`)) los.push(R('rubriek', filters.rubriek, interestLabel(filters.rubriek)))
  return { items: [...lees, ...los, ...vast], sep: lees.length }
}

// De filters na een tik op een rubriek: onderwerp en rubriek sluiten elkaar uit; de rest blijft.
export function kiesRubriek(filters, r) {
  return { ...filters, onderwerp: r.key === 'onderwerp' ? r.id : '', rubriek: r.key === 'rubriek' ? r.id : '' }
}

// ---- Bronnen ----
// De open rij: je eigen rij, dan gekozen bronnen die daar niet in staan (een uitgezette bron,
// een bron die je niet volgt, een Bluesky-account via 'Alles van …'). Zo is een bronfilter nooit
// onzichtbaar. Onbekend (nog niet geladen): de id als naam.
export function rijBronnen(strip = [], pickList = [], byId = new Map()) {
  const ids = new Set(strip.map((s) => s.id))
  const los = [...new Set(pickList)].filter((id) => !ids.has(id)).map((id) => byId.get(id) || { id, name: id })
  return [...strip, ...los]
}

// Gekozen bronnen in de volgorde van de rij: dezelfde keuze is dan altijd dezelfde URL (en dus
// dezelfde leespositie). Wat niet in de rij staat, gaat achteraan.
export function inRijVolgorde(ids, rij) {
  const at = (id) => {
    const i = rij.findIndex((s) => s.id === id)
    return i < 0 ? rij.length : i
  }
  return [...ids].sort((a, b) => at(a) - at(b))
}

// De dichte stapel: de gekozen bronnen (in de volgorde van de rij), anders de eerste van de rij.
export function stapel(pickList = [], rij = [], max = DECK_MAX) {
  const kies = new Set(pickList)
  return (kies.size ? rij.filter((s) => kies.has(s.id)) : rij).slice(0, max).map((s) => s.id)
}

// De naam vóór de dichte stapel: "NOS", of "3 bronnen".
export const keuzeLabel = (namen = []) => (namen.length === 1 ? namen[0] : namen.length ? `${namen.length} bronnen` : '')

// Waar een bolletje in de dichte stapel staat (open staat elk op zijn eigen plek in de rij, stap
// 48 van rechts, zonder verschuiving). `i` = plek in de open rij (0 = Alle bronnen, rechts), `k` =
// plek in de stapel (−1 = niet in de stapel), `n` = grootte van de stapel. Dicht schuift het naar
// zijn plek in de stapel (stap 16, 28 groot), of verdwijnt erachter. Alle bronnen ligt dicht
// onzichtbaar op de plek van het voorste logo: daar verschijnt het bij openen.
export function plek({ i, k, n, peek = false, all = false }) {
  const step = peek ? PEEK : STEP
  const sc = SMALL / LOGO
  if (all) return { x: 0, s: sc, o: 0 }
  if (k >= 0) return { x: i * STEP_OPEN - k * step, s: sc, o: 1 }
  return { x: i * STEP_OPEN - (n - 1) * step, s: sc * 0.8, o: 0 }
}

// ---- Een lege lijst ----
// Eén stille regel waar het eerste bericht zou staan: "Nog niets van NOS in Wereld.", "Nog geen
// opinie van NOS en NRC vandaag.", "Nog niets buiten je bubbel." `rubriek` is het label van wat aan
// staat ('' = Alles), `soort` het soortfilter.
export function legeRegel({ namen = [], rubriek = '', soort = '' } = {}) {
  const wat = soort === 'opinie' ? 'Nog geen opinie' : soort === 'artikelen' ? 'Nog geen artikelen' : 'Nog niets'
  const van = namen.length ? ` van ${joinNL(namen)}` : ''
  const waar = rubriek === 'Buiten je bubbel' ? ' buiten je bubbel' : rubriek ? ` in ${rubriek}` : ' vandaag'
  return `${wat}${van}${waar}.`
}

// ---- Wat de stapel zegt (knop, uitleg, en de live-regio voor de schermlezer) ----
export function stapelTeksten(namen = []) {
  const has = namen.length > 0
  return {
    label: `Bronnen kiezen, nu: ${has ? joinNL(namen) : 'alle bronnen'}`,
    title: has ? `Bronnen: ${joinNL(namen)}` : 'Filter op bron',
    // Alle bronnen zegt wat de volgende tik doet
    hint: has ? 'Zet de keuze terug op alle bronnen.' : 'Klapt de rij dicht.',
    allTitle: has ? 'Alle bronnen: zet de keuze terug' : 'Alle bronnen: klap de rij dicht',
  }
}
export const zeg = {
  bron: (naam, aan, namen) => `${naam} ${aan ? 'aan' : 'uit'}. ${namen.length ? `Nu: ${joinNL(namen)}.` : 'Alle bronnen.'}`,
  alles: 'Alle bronnen. Nog een tik klapt de rij dicht.',
  dicht: (namen) => (namen.length ? `Rij dicht. Bronnen: ${joinNL(namen)}.` : 'Rij dicht. Alle bronnen.'),
  rubriek: (label) => `Rubriek ${label}.`,
}

// ---- Beweging ----
// Een cubic-bezier als functie van de tijd (0–1), voor het schuiven van de rijen in JS met
// dezelfde curve als de CSS (--ease-glide), in plaats van de ingebouwde 'smooth' die per browser
// anders loopt.
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sx = (t) => ((ax * t + bx) * t + cx) * t
  const sy = (t) => ((ay * t + by) * t + cy) * t
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx
  return (x) => {
    let t = x
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x
      const d = dx(t)
      if (Math.abs(e) < 1e-5 || !d) break
      t -= e / d
    }
    return sy(Math.min(1, Math.max(0, t)))
  }
}
