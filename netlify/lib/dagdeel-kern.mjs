// De kern rond een dagdeelwissel (besluit Alex 16 november 2026: de Ochtendeditie om 06:00, en om 06:00 ligt ze er).
//
// 1. Vooraf vastgelegd: de feedronde in de laatste minuten vóór de ochtend (OCHTEND_VOORAF, shared/slot-times.mjs) legt
//    de Ochtendeditie al vast en schrijft de kern met die Editie onder een eigen sleutel (`volgend`, refresh.mjs). Niemand
//    ziet haar dan nog. Vanaf de start van de ochtend geven /api/feed, /api/voorpagina en /api/edition die kern
//    (kernVanNu), ook als de ronde van de start nog loopt. Zo is er om 06:00:00 geen avond meer.
// 2. De cache houdt op bij de wissel (cacheTot): de CDN bewaart een kern nooit over de start van het volgende dagdeel
//    heen, en een kern die achterloopt op de klok (de ronde van het nieuwe dagdeel loopt nog) maar heel even.
// Elk weggeschreven kerndocument draagt het id van zijn Editie (`slot`), zodat dit kan zonder de kern te lezen.
import { slotIdNow } from '../../shared/tel.mjs'
import { secondsToNextSlot } from '../../shared/slot-times.mjs'

// De plaats van een dagdeel-id in de tijd ('2026-11-16-middag' -> '2026-11-16-1'), of null: zo zijn twee id's te
// vergelijken als tekst.
const SLOT_ORDER = ['ochtend', 'middag', 'avond']
export const slotRank = (id) => {
  const m = /^(\d{4}-\d{2}-\d{2})-(ochtend|middag|avond)$/.exec(typeof id === 'string' ? id : '')
  return m ? `${m[1]}-${SLOT_ORDER.indexOf(m[2])}` : null
}
export const laterSlot = (a, b) => {
  const x = slotRank(a)
  const y = slotRank(b)
  return !!x && !!y && x > y
}

// De sleutel van de vooraf vastgelegde kern naast een gewone (KEYS.start, KEYS.core, KEYS.legacy).
export const volgendKey = (key) => `${key}-volgend`

// Mag de vooraf vastgelegde kern (met Editie-id `next`) nu de kern van `cur` vervangen? Alleen als de klok al in een later
// dagdeel is dan `cur`, en `next` later is dan `cur` maar niet later dan de klok (nooit een Editie van de toekomst).
export function volgendGeldt(cur, next, now = new Date()) {
  const clock = slotIdNow(now)
  return !!cur && laterSlot(clock, cur) && laterSlot(next, cur) && !laterSlot(next, clock)
}

// Het kerndocument dat nu geldt: `doc`, of na de wissel het vooraf vastgelegde (`readNext()`, alleen gelezen als de klok
// verder is dan `doc`). Zonder `slot` op `doc` (geschreven vóór deze code) blijft het `doc`.
export async function kernVanNu(doc, readNext, now = new Date()) {
  if (!doc?.slot || !laterSlot(slotIdNow(now), doc.slot)) return doc
  const next = await Promise.resolve().then(readNext).catch(() => null)
  return next?.body && volgendGeldt(doc.slot, next.slot, now) ? next : doc
}

// Zo lang (in seconden) mag de CDN een antwoord met dit kerndocument nog bewaren: hooguit tot het volgende dagdeel
// begint. Loopt de kern achter op de klok (het nieuwe dagdeel is begonnen, zijn kern is er nog niet), dan ACHTER_S: zo
// staat de nieuwe kern er binnen een paar seconden nadat de ronde haar wegschreef.
export const ACHTER_S = 10
export function cacheTot(doc, now = new Date()) {
  if (doc?.slot && laterSlot(slotIdNow(now), doc.slot)) return ACHTER_S
  return Math.floor(secondsToNextSlot(now))
}

// De CDN-cache van een kern: `max` vers en `swr` oud-maar-bruikbaar, samen nooit voorbij cacheTot.
export function kernCdn(doc, now = new Date(), { max = 60, swr = 600 } = {}) {
  const left = cacheTot(doc, now)
  const fresh = Math.min(max, left)
  const stale = Math.min(swr, left - fresh)
  return `public, durable, s-maxage=${fresh}${stale > 0 ? `, stale-while-revalidate=${stale}` : ''}`
}
