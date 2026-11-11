// Geen plek zonder rubriek; de rubriek volgt het land van het onderwerp (frisse ogen · ronde 3, punt 10). Alleen voor de
// algemene Editie, op de server, als laatste stap. Op 6 van de 12 bewaarde dagdelen stond een plek zonder rubriek (10 en
// 11 november: 01 Nvidia), en de val van de president van Paraguay stond onder Economie.
// - Een plek zonder rubriek (of met een rubriek die de app niet kent) krijgt er een, in deze volgorde:
//   1. de rubriek die de meeste stukken van het verhaal hebben (desksOf), ook als dat minder dan de helft is;
//   2. het land in de koppen van de stukken (Nederland: Binnenland; de VS, Oekraïne, het Midden-Oosten; anders Buitenland);
//   3. het land van de meeste uitgevers (een Nederlands verhaal is Binnenland, een Amerikaans VS, de rest Buitenland).
// - Een plek onder Economie, Binnenland of Regio met een kop die over het buitenland gaat (foreignHead: een land in de kop
//   en geen Nederlands anker) krijgt de rubriek van dat land. Tech en Wetenschap blijven: die gaan over een vak, niet
//   over een plek.
import { desksOf, storyForeignOf, foreignHead, placeSignals } from './desks.mjs'
import { countriesIn, usPoliticsIn } from '../../shared/article-signals.mjs'
import { publisherCountry, publisherOf } from '../../shared/edition-policy.mjs'
import { DESK_NAMES } from '../../shared/editor.mjs'

const GEO = ['oekraine', 'middenoosten', 'wetenschap', 'vs', 'buitenland', 'binnenland']
const MIDDLE_EAST = new Set(['il', 'ir', 'lb', 'ps', 'sy', 'iq', 'ye', 'jo', 'sa', 'ae', 'qa', 'eg'])
const PLACE_DESKS = new Set(['economie', 'binnenland', 'regio'])

// De rubriek van een land, of null.
function deskOfCountries(cs = []) {
  if (!cs.length) return null
  if (cs.includes('nl')) return 'binnenland'
  if (cs.includes('ua')) return 'oekraine'
  if (cs.some((c) => MIDDLE_EAST.has(c))) return 'middenoosten'
  if (cs.includes('us')) return 'vs'
  return 'buitenland'
}
const mostOf = (xs) => {
  const count = new Map()
  for (const x of xs) if (x) count.set(x, (count.get(x) || 0) + 1)
  let best = null
  for (const d of GEO) if (count.get(d) && (!best || count.get(d) > count.get(best))) best = d
  return best
}

// Het land in een tekst als rubriek, of null.
const deskOfText = (t) => (usPoliticsIn(t) ? 'vs' : deskOfCountries(countriesIn(t)))

// De rubriek van een plek zonder rubriek. `items`: de stukken, `lead`: de kop.
export function deskFor(items = [], lead = null) {
  const its = [lead, ...items.filter((i) => i && i !== lead)].filter(Boolean)
  // 1. Het land in kop en intro van de stukken.
  const fromText = mostOf(its.map((i) => deskOfText(`${i.title || ''} ${i.summary || ''}`)))
  if (fromText) return fromText
  // 2. De rubrieken van de stukken; Binnenland alleen met een Nederlandse plek, instelling of persoon (anders is
  //    Binnenland alleen de standaard van een Nederlandse bron).
  const foreign = its.length > 1 && storyForeignOf(its)
  const fromDesks = mostOf(its.flatMap((i) => [...desksOf(i, { storyForeign: foreign })].filter((d) => d !== 'binnenland' || placeSignals(i).nl)))
  if (fromDesks) return fromDesks
  // 3. Het land van de meeste uitgevers.
  const pubs = new Map(its.map((i) => [publisherOf(i.source), publisherCountry(i.source)]))
  return mostOf([...pubs.values()].map((c) => (c === 'NL' ? 'binnenland' : c === 'US' ? 'vs' : c ? 'buitenland' : null))) || 'buitenland'
}
// De rubriek van een kop die over het buitenland gaat (foreignHead).
export function abroadDesk(title = '') {
  const specific = [...desksOf({ title, source: '' })].find((d) => ['oekraine', 'middenoosten', 'vs'].includes(d))
  return specific || deskOfText(title.replace(/\b(nederland\w*|dutch)\b/gi, '')) || 'buitenland'
}

// Wijzigt `entries` (een plek met een andere rubriek is een kopie). `itemsOf(e)`: de stukken van een plek.
export function placeDesks(entries, { itemsOf }) {
  entries.forEach((e, k) => {
    if (e.desk === 'bubbel') return
    const items = itemsOf(e).filter(Boolean)
    const lead = items.find((i) => i.id === (e.leadId || e.id)) || items[0] || null
    let desk = e.desk && DESK_NAMES[e.desk] ? e.desk : null
    if (!desk) desk = deskFor(items, lead)
    else if (PLACE_DESKS.has(desk) && lead && foreignHead(lead.title)) {
      const abroad = abroadDesk(lead.title)
      if (abroad !== 'binnenland') desk = abroad
    }
    if (desk !== e.desk) entries[k] = { ...e, desk }
  })
  return entries
}
