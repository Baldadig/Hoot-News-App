// De lijn bovenaan de Stroom: rubrieken links, je bronnen als stapel rechts — pure gegevens en
// functies (tests/streamline.test.mjs). Het tekenen en bewegen staat in components/StreamLine.jsx.
import { INTERESTS } from './topics.js'

// Maten van de stapel, gelijk aan de tokens in styles.css (--tap, --s2, --s3, --s4).
export const TAP = 44 // aanraakvlak van elk bolletje
export const STEP_OPEN = TAP // 44: open naast elkaar, 8 tussen de logo's van 36
export const LOGO = 36 // logo in de open rij
export const SMALL = 28 // dicht: 36 − 8
export const STEP = 16 // dicht: half over elkaar
export const PEEK = 20 // dicht, met de muis erover: een stukje open
export const EDGE = (TAP - SMALL) / 2 // 8: kolomrand tot het voorste logo, dat zo op de as van de accountknop ligt
export const PAD = 8 // binnenrand van de stapelknop, en tussen naam en logo's
export const DECK_MAX = 3
export const STRIP_FADE = 24 // vervaagde rand van de open rij
// Uitloop (--uit, 12): zoveel mag de rij buiten de lijn tekenen, zodat de rode ring en het vinkje
// van Alle bronnen niet door de rand worden afgesneden. Een vervaging begint op de lijn zelf.
export const UITLOOP = 12

export const joinNL = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' en ' + a[a.length - 1])

// ---- Rubrieken ----
// Eén rubriek: `key` is de parameter in de URL (onderwerp of rubriek; Alles heeft er geen),
// `sig` maakt hem uniek (het onderwerp 'tech' en de rubriek 'tech' zijn twee verschillende).
const R = (key, id, label) => ({ key, id, label, sig: key ? `${key}=${id}` : '' })

// Welke rubriek aan staat, in de vorm van `sig`.
export function actieveRubriek(filters = {}) {
  return filters.onderwerp ? `onderwerp=${filters.onderwerp}` : filters.rubriek ? `rubriek=${filters.rubriek}` : ''
}

// De rij: alleen hoofdrubrieken, in een vaste volgorde (gelijk aan de app): Alles, dan de rubrieken
// die je koos (Politiek, Binnenland, Wereld, Economie, Tech, Wetenschap, Cultuur, Sport; koos je er
// geen, dan alle acht), en Buiten je bubbel als laatste. Geen subonderwerpen. Staat er een rubriek
// aan die je niet koos (een oude link), dan staat die op zijn vaste plek: een filter is nooit
// onzichtbaar. `sep` wordt niet meer getekend.
export function rubriekRij({ interests = [], hasBubble = false, filters = {} } = {}) {
  const chosen = INTERESTS.filter((i) => interests.includes(i.id))
  const shown = (chosen.length ? chosen : INTERESTS).map((i) => i.id)
  const items = [R(null, 'alles', 'Alles')]
  for (const i of INTERESTS) if (shown.includes(i.id) || filters.rubriek === i.id) items.push(R('rubriek', i.id, i.label))
  if (hasBubble || filters.onderwerp === 'bubbel') items.push(R('onderwerp', 'bubbel', 'Buiten je bubbel'))
  return { items, sep: 1 }
}

// Een oude link met een onderwerp (#/stroom?onderwerp=ai) wordt de rubriek waar het onder valt:
// de rij kent alleen hoofdrubrieken. Buiten je bubbel blijft zichzelf.
export function alsRubriek(filters = {}) {
  const t = filters.onderwerp
  if (!t || t === 'bubbel') return filters
  const i = INTERESTS.find((x) => x.topics.includes(t))
  return { ...filters, onderwerp: '', rubriek: i ? i.id : filters.rubriek || '' }
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
    // KISS: de knop heet gewoon Alle bronnen
    hint: 'Alle bronnen',
    allTitle: 'Alle bronnen',
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
