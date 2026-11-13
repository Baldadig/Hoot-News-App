// De dagdeelwissel (Editie sneller C3, besluit Alex 13 november 2026: "Ja, met iets van een indicatie dat er een
// nieuwe Editie aankomt"; Hoot-design/editie-sneller/METING.md §4C). Web en app volgen dezelfde regels; de app heeft
// ze in ios/Hoot/DagdeelWissel.swift (tests/dagdeel-wissel.test.mjs houdt de twee gelijk).
//
//   1. Er is een nieuw dagdeel (een nieuwe kern) en jouw nieuwe Editie is er nog niet: de vorige Editie blijft staan,
//      met in de kop een rustige regel "De Avondeditie komt eraan". Geen laadstrepen voor wie al een Editie had.
//   2. De nieuwe komt binnen. Sta je bovenaan en lees je niet: wisselen met het drukken. Lees je wel: niets verspringt;
//      bovenin staat "De Avondeditie staat klaar" (tik = wisselen, bovenaan).
//   3. Een vers toestel zonder vorige Editie houdt de laadstrepen.
// De vorige Editie wordt alleen getoond: ze wordt niet opnieuw vastgelegd, telt niet als de Editie van het nieuwe
// dagdeel en gaat niet naar je account. Editie vast (één Editie per dagdeel) blijft dus zoals het was.
import { SLOTS } from './slots.mjs'

// Hoe oud de vorige Editie hooguit mag zijn om te blijven staan: een dag en een beetje (de Avondeditie van gisteren
// tot de Ochtendeditie, ook als je een dagdeel oversloeg). Ouder: dan liever de laadstrepen dan nieuws van dagen terug.
export const HOLD_MAX_MS = 26 * 60 * 60 * 1000
// Bovenaan: hooguit zoveel pixels (punten) gescrold.
export const AT_TOP_PX = 8

const time = (e) => Date.parse(e?.builtAt)

// Mag deze Editie blijven staan terwijl de Editie van de kern `global` komt? Alleen een Editie van deze lezer, van
// een eerder dagdeel, met plekken, en niet ouder dan HOLD_MAX_MS. Zonder tijd aan een van beide: nee.
export function mayHold(prev, global, owner) {
  if (!prev || typeof prev !== 'object' || !global || !Array.isArray(prev.entries) || !prev.entries.length) return false
  if (prev.owner !== owner || prev.id === global.id) return false
  const a = time(prev)
  const b = time(global)
  return Number.isFinite(a) && Number.isFinite(b) && a < b && b - a <= HOLD_MAX_MS
}

// Welke Editie blijft er staan (of null)? `held`: wat er al bleef staan; `shown`: jouw Editie van dit dagdeel (of null);
// `last`: wat er net in beeld was; `stored()`: na herladen de laatst bewaarde Edities (alleen gevraagd als het nodig is).
// Een vorige Editie blijft alleen zolang de nieuwe er niet is, of tot de lezer wisselt (de weergave zet `held` dan op null
// en `last` op de nieuwe).
export function holdFor({ held = null, shown = null, last = null, global = null, owner, stored = () => [] }) {
  if (held && !mayHold(held, global, owner)) held = null
  if (held || shown || !global) return held
  if (mayHold(last, global, owner)) return last
  return stored().find((e) => mayHold(e, global, owner)) || null
}

// Wisselen zonder te vragen: alleen als je bovenaan staat en niet aan het lezen bent (geen verhaal of samenvatting open).
export const swapsNow = ({ atTop, reading }) => !!atTop && !reading

const naam = (slot) => (SLOTS[slot]?.naam ? `De ${SLOTS[slot].naam}` : 'De nieuwe Editie')
export const comingLine = (slot) => `${naam(slot)} komt eraan`
export const readyLine = (slot) => `${naam(slot)} staat klaar`
