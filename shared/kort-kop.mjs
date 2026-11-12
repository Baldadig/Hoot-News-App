// De korte kop van een plek in de Editie (`kortKop`), voor waar weinig ruimte is: de widgets op het
// beginscherm en het vergrendelscherm.
//
// De regel is dicht (besluit Alex: "korte kop dicht", bij twijfel geen korte vorm; keuring 9):
//   Een kop wordt nooit ingekort. Past de kop in de maat, dan de kop zelf. Anders is er geen korte vorm (null) en
//   staat de hele kop in de widget, met de regels die hij nodig heeft (WidgetZet.pas). Geen woord valt weg.
// Waarom: elke manier van inkorten laat het eind van de kop weg, en daar kan de betekenis zitten. Een tweede
// bewering ("… en premier noemt het nepnieuws"), een voorwaarde ("… met uitzondering van"), een bijna-ontkenning
// ("… ternauwernood"), een bron die zegt dat het niet waar is ("… volgens een nepbericht"), of de afloop zelf
// ("… rescued alive", "… in hoger beroep af"). Een lijst van tekens en woorden lekt altijd (keuring 4 tot en
// met 9). Er is dus altijd twijfel, en bij twijfel geen korte vorm.
// Onzichtbare tekens (U+200B–U+200D, U+FEFF) vallen vooraf weg; witruimte (ook U+0085) wordt één spatie.
// iOS spiegelt dit in KortKop (ios/HootWidgetShared/KortKop.swift) en draait dezelfde gevallen uit
// tests/fixtures/kort-kop.json; verander je hier iets, dan daar ook.

export const KORT_MAX = 60

// Onzichtbare tekens (zero-width space, joiner, BOM) eruit; witruimte wordt één spatie.
// U+0085 (NEL) telt mee als witruimte, zoals in ICU (iOS): JavaScript rekent hem niet tot `\s`.
const schoon = (s) => String(s ?? '').replace(/[​-‍﻿]/gu, '').replace(/[\s\u0085]+/gu, ' ').trim()

// De bewaking: is `kort` een korte kop die `kortKop` voor `kop` zou mogen geven? Alleen de kop zelf. Ook voor een
// korte kop van een oudere server, die nog inkortte (iOS: KortKop.trap).
export function veilig(kop, kort) {
  if (kort === null || kort === undefined) return false
  return kort === schoon(kop)
}

// De kop op hooguit `max` tekens, of null: dan past hij niet en staat de hele kop in de widget. Een kop die past,
// blijft precies zo.
export function kortKop(title, max = KORT_MAX) {
  const t = schoon(title)
  return t.length <= max ? t : null
}

// De Editie met `kortKop` per plek: de kop die er staat (de getoonde kop van De Redacteur, anders die van
// het hoofdstuk), als hij past. Raakt niets anders aan; zonder kop, of als hij niet past, geen `kortKop`.
export function metKorteKoppen(edition) {
  if (!edition || !Array.isArray(edition.entries)) return edition
  const byId = new Map((edition.items || []).map((i) => [i.id, i]))
  return {
    ...edition,
    entries: edition.entries.map((e) => {
      const kop = byId.get(e.kind === 'story' ? e.leadId || e.id : e.id)?.title || e.title
      const kort = kop ? kortKop(kop) : null
      return kort ? { ...e, kortKop: kort } : e
    }),
  }
}
