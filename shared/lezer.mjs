// Wat Hoot uit je bronnen afleidt (persona's 14 november 2026): je regio en je thuisland.
// Alleen uit de bronnen die je volgt en de catalogus (`cat`, `lang`, `about`), zonder iets te vragen. Puur, en in de
// rekenkern: web, server en app rekenen hetzelfde.
import { VL_HOME } from '../netlify/lib/desks.mjs'

// Je thuisland: België als je meer Vlaamse dan Nederlandse nieuwsbronnen volgt (Nederland, Vlaanderen, Regio), anders
// Nederland. Vakbronnen (cultuur, tech, sport) en Engelstalige bronnen zeggen niets over waar je woont.
export function readerHome({ followed = new Set(), sources = [] } = {}) {
  let vl = 0
  let nl = 0
  for (const s of sources) {
    if (!followed.has(s.id) || !['nl', 'vl', 'regio'].includes(s.cat) || s.lang !== 'nl') continue
    if (VL_HOME.has(s.id) || s.cat === 'vl') vl++
    else nl++
  }
  return vl > nl ? 'BE' : 'NL'
}

// De plaatsen in de omschrijving van een regionale bron: "Groningen en Drenthe." geeft groningen en drenthe, "Den Haag,
// Leiden en omgeving, de regionale omroep." geeft den haag en leiden. Geen lijst van provincies: de catalogus zegt het.
export function regionWordsOf(source) {
  if (!source || source.cat !== 'regio' || !source.about) return []
  return String(source.about)
    .replace(/,?\s*de regionale omroep\.?/i, '')
    .replace(/\.$/, '')
    .split(/,|\s+en\s+/i)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 3 && w !== 'omgeving' && !/\s(?:en|van|de)$/.test(w))
}

// Je regio: de plaatsen van de regionale bronnen die je volgt.
export function readerRegions({ followed = new Set(), sources = [] } = {}) {
  return new Set(sources.filter((s) => followed.has(s.id)).flatMap(regionWordsOf))
}

const escape = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Ligt een stuk in je regio? Een regionale bron uit dezelfde plaats, of een van je plaatsen in kop of intro.
export function inRegion(item, regions, sourceOf = () => null) {
  if (!item || !regions?.size) return false
  if (regionWordsOf(sourceOf(item.source)).some((w) => regions.has(w))) return true
  const text = `${item.title || ''} ${item.summary || ''}`
  return [...regions].some((w) => new RegExp(`(^|[^\\p{L}])${escape(w)}([^\\p{L}]|$)`, 'iu').test(text))
}
