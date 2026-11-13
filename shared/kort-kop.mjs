// De korte kop van een plek in de Editie (`kortKop`), voor waar weinig ruimte is: de bladerwidget op het beginscherm
// (Klein altijd, Middel en Groot als de hele kop niet past).
//
// De regel (besluit Alex 13 november 2026, "bijschrijven mag"; vervangt "korte kop dicht" van keuring 9):
//   Een kop wordt nooit ingekort of afgekapt. Past hij in KORT_MAX tekens, dan is de korte kop de kop zelf.
//   Past hij niet, dan mag de server hem laten HERSCHRIJVEN tot hooguit KORT_MAX tekens (netlify/lib/kort-kop-ai.mjs,
//   achter de schakelaar HOOT_KORTE_KOP_AI), in de taal van de kop en met de volledige betekenis. Elk herschreven
//   resultaat gaat langs `controle` (hieronder); faalt het, of is er geen herschreven kop, dan is er geen korte vorm
//   (null) en staat in de widget de hele kop.
// Waarom de controle streng is: inkorten laat het eind weg, en daar zit vaak de betekenis (een tweede bewering, een
// voorwaarde, een ontkenning, een bron die het ontkracht, de afloop). Een herschreven kop mag daarom geen nieuwe
// getallen of namen bevatten, geen ontkenning kwijtraken of erbij krijgen, en niet het begin van de kop zelf zijn.
// Onzichtbare tekens (U+200B–U+200D, U+FEFF) vallen vooraf weg; witruimte (ook U+0085) wordt één spatie.
// iOS spiegelt dit in KortKop (ios/HootWidgetShared/KortKop.swift) en draait dezelfde gevallen uit
// tests/fixtures/kort-kop.json; verander je hier iets, dan daar ook. Alles telt in UTF-16-eenheden, zoals JavaScript.

export const KORT_MAX = 45

// Onzichtbare tekens (zero-width space, joiner, BOM) eruit; witruimte wordt één spatie.
// U+0085 (NEL) telt mee als witruimte, zoals in ICU (iOS): JavaScript rekent hem niet tot `\s`.
export const schoon = (s) => String(s ?? '').replace(/[​-‍﻿]/gu, '').replace(/[\s\u0085]+/gu, ' ').trim()

// Ontkenningen in het Nederlands en het Engels. Een herschreven kop heeft er een als de kop er een heeft, en andersom.
const ONTKENNING = /(?<![\p{L}\p{N}])(niet|geen|nooit|zonder|noch|niemand|niets|nergens|not|no|never|without|nor|none|nobody|nothing|nowhere)(?![\p{L}\p{N}])|n['’]t(?![\p{L}\p{N}])/iu
export const ontkent = (s) => ONTKENNING.test(s)
const getallen = (s) => s.match(/[0-9]+/g) || []
// De woorden met een hoofdletter (namen, afkortingen) behalve het eerste van de kop of van een zinsdeel na ": ".
function namen(s) {
  const out = []
  const delen = s.split(/[:.!?]\s+/u)
  for (const deel of delen) {
    const woorden = deel.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
    for (let i = 1; i < woorden.length; i++) if (/\p{Lu}/u.test(woorden[i])) out.push(woorden[i])
  }
  return out
}

// De controle op een herschreven korte kop (server en iOS gelijk). Alleen wat zonder taalmodel te toetsen is:
// lengte, geen beletselteken, niet het begin van de kop, geen nieuwe getallen of namen, ontkenning gelijk.
// De server toetst daarnaast de taal (kort-kop-ai.mjs).
export function controle(kop, kort) {
  if (kort === null || kort === undefined) return false
  const t = schoon(kop), k = schoon(kort)
  if (!k || k.length > KORT_MAX) return false
  if (k === t) return true
  if (t.length <= KORT_MAX) return false // past de kop al, dan de kop zelf
  if (/…|\.\.\./u.test(k) && !/…|\.\.\./u.test(t)) return false
  const stam = k.replace(/[\s\p{P}]+$/u, '').toLowerCase()
  if (stam && t.toLowerCase().startsWith(stam)) return false // afgekapt, niet herschreven
  const tGetallen = new Set(getallen(t))
  if (getallen(k).some((g) => !tGetallen.has(g))) return false
  const tLaag = t.toLowerCase()
  if (namen(k).some((n) => !tLaag.includes(n.toLowerCase()))) return false
  if (ontkent(t) !== ontkent(k)) return false
  return true
}

// De bewaking: mag `kort` als korte kop van `kop` in de widget? De kop zelf (als hij past), of een herschreven kop die
// door de controle komt. Een ingekorte kop van een oudere server ("…") telt niet.
export function veilig(kop, kort) {
  if (kort === null || kort === undefined) return false
  if (kort === schoon(kop) && kort.length <= KORT_MAX) return true
  return controle(kop, kort)
}

// De kop op hooguit `max` tekens, of null: dan past hij niet. Een kop die past, blijft precies zo. (Zonder taalmodel.)
export function kortKop(title, max = KORT_MAX) {
  const t = schoon(title)
  return t.length <= max ? t : null
}

// De kop van een plek: de getoonde kop van De Redacteur, anders die van het hoofdstuk.
const kopVan = (e, byId) => byId.get(e.kind === 'story' ? e.leadId || e.id : e.id)?.title || e.title

// De herschreven korte koppen die een Editie al draagt (schoon(kop) → korte kop), zodat een persoonlijke Editie ze
// overneemt zonder het taalmodel opnieuw te vragen.
export function herschrevenVan(edition) {
  const out = {}
  if (!edition || !Array.isArray(edition.entries)) return out
  const byId = new Map((edition.items || []).map((i) => [i.id, i]))
  for (const e of edition.entries) {
    const kop = kopVan(e, byId)
    if (kop && e.kortKop && e.kortKop !== schoon(kop) && controle(kop, e.kortKop)) out[schoon(kop)] = e.kortKop
  }
  return out
}

// De Editie met `kortKop` per plek: de kop als hij past, anders een herschreven kop uit `herschreven`
// (schoon(kop) → korte kop, van kort-kop-ai.mjs) als die door de controle komt. Raakt niets anders aan; zonder kop,
// of zonder veilige korte vorm, geen `kortKop` (dan toont de widget de hele kop).
export function metKorteKoppen(edition, { herschreven = null } = {}) {
  if (!edition || !Array.isArray(edition.entries)) return edition
  const byId = new Map((edition.items || []).map((i) => [i.id, i]))
  return {
    ...edition,
    entries: edition.entries.map((e) => {
      const kop = kopVan(e, byId)
      if (!kop) return e
      let kort = kortKop(kop)
      if (!kort && herschreven) {
        const h = herschreven[schoon(kop)]
        if (typeof h === 'string' && controle(kop, h)) kort = schoon(h)
      }
      return kort ? { ...e, kortKop: kort } : e
    }),
  }
}
