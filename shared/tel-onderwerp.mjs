// De teller per Selectie-onderwerp (Selectie-review 14 november, punt 8; fase 5 van de rubrieken-prompt): hoe vaak een
// onderwerp wordt gekozen, als totaal per dag, zoals de rest van /api/tel (shared/tel.mjs). Geen account, id, cookie of
// IP; bij Do Not Track of Global Privacy Control telt de website niets.
//
// UIT tot Alex de zin voor het privacybeleid goedkeurt (besluit 15 november, BESLUITEN-15NOV.md): het beleid zegt nu
// "hoe vaak de Stroom, de Selectie ... is gebruikt", niet welke onderwerpen gekozen worden. Aanzetten: zet de vlag op true
// en zet ONDERWERP_ZIN in src/views/Privacy.jsx (Wat Hoot telt); tests/tel-onderwerp.test.mjs houdt die twee samen.
// De app telt nog niet mee (iOS volgt in dezelfde ronde als het aangaat; tot dan telt niemand).
import { VAK_FIELD_IDS } from './vak.mjs'

export const ONDERWERP_TELLER = false
export const ONDERWERP_EVENTS = VAK_FIELD_IDS.map((id) => `onderwerp:${id}`)
// 'ux' -> 'onderwerp:ux'; een onbekend onderwerp telt niet.
export const onderwerpEvent = (id) => (VAK_FIELD_IDS.includes(id) ? `onderwerp:${id}` : null)
// Wat er nieuw gekozen is tussen twee keuzes (weghalen telt niet), in de volgorde van `next`.
export const nieuwGekozen = (before = [], next = []) => next.filter((id) => !before.includes(id)).map(onderwerpEvent).filter(Boolean)
// De lijst voor parseTel en de client: leeg zolang de vlag uit staat.
export const onderwerpExtra = (aan = ONDERWERP_TELLER) => (aan ? ONDERWERP_EVENTS : [])
// Voorstel voor het privacybeleid (nog niet in Privacy.jsx; eerst akkoord van Alex).
export const ONDERWERP_ZIN = 'Voor de Selectie telt Hoot ook hoe vaak elk onderwerp wordt gekozen, als totaal per dag.'
