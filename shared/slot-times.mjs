// Wanneer elk dagdeel begint: minuten na middernacht, Amsterdamse tijd (het hele jaar, zomer- en
// wintertijd). Alleen om te rekenen en te plannen: in teksten staan geen kloktijden, alleen dagdelen
// (shared/slots.json). Spiegel in de app: EditionAlerts.slots en WidgetDagdeel.start (getoetst in SlotTimesTests),
// en in de landing: OCHTEND in landing/hoot.js (getoetst in tests/landing.test.mjs).
// Besluit Alex, 16 november 2026: de Ochtendeditie om 06:00 (was 06:30 sinds 11 november, daarvoor 05:30). Zodat
// ze er om 06:00 echt ligt, legt de feedronde vlak ervoor haar al vast (OCHTEND_VOORAF hieronder).
export const SLOT_START = { ochtend: 6 * 60, middag: 12 * 60, avond: 17 * 60 }

// Zoveel minuten vóór de ochtend legt de feedronde de Ochtendeditie al vast, onder het ochtend-id, zonder haar te tonen
// (netlify/functions/feed-refresh.mjs, netlify/lib/refresh.mjs: de "volgende" kern). Vanaf de start van de ochtend
// geven /api/feed en /api/edition die kern (netlify/lib/dagdeel-kern.mjs), ook als de ronde van de start nog loopt.
// Twintig minuten: twee rondes van */10, zodat één mislukte ronde de ochtend niet laat wachten.
export const OCHTEND_VOORAF = 20

// "06:00": voor het veld `next` van de Editie (geen tekst op het scherm).
export const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const FMT = /* @__PURE__ */ new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

// De kalenderdag en de minuut van de dag in Amsterdam.
export function amsterdamClock(now = new Date()) {
  const p = Object.fromEntries(FMT.formatToParts(now).map((x) => [x.type, x.value]))
  return { year: p.year, month: p.month, day: p.day, minutes: Number(p.hour) * 60 + Number(p.minute) }
}

// Nog nacht: vóór de start van de Ochtendeditie (de nachtrust van feed-refresh).
export const beforeOchtend = (now = new Date()) => amsterdamClock(now).minutes < SLOT_START.ochtend

// De laatste minuten vóór de ochtend (OCHTEND_VOORAF): dan legt de feedronde de Ochtendeditie al vast. Geeft het
// dagdeel van de komende ochtend ({ id, slot, date, next }, zoals editionSlot), of null.
export function ochtendVooraf(now = new Date()) {
  const { year, month, day, minutes } = amsterdamClock(now)
  if (minutes < SLOT_START.ochtend - OCHTEND_VOORAF || minutes >= SLOT_START.ochtend) return null
  const date = `${year}-${month}-${day}`
  return { id: `${date}-ochtend`, slot: 'ochtend', date, next: hhmm(SLOT_START.middag) }
}

// Hoeveel seconden tot het volgende dagdeel begint (voor de cache van de kern: nooit over een wissel heen). Op de
// minuut van de klok in Amsterdam; de seconden van de minuut tellen mee (Amsterdam wijkt een heel aantal uren af van
// UTC). In de nacht van een zomer- of wintertijdwissel kan het een uur schelen, maar nooit in het laatste uur voor
// de ochtend (de klok verspringt om 02:00 of 03:00), en de cache is hooguit elf minuten.
export function secondsToNextSlot(now = new Date()) {
  const { minutes } = amsterdamClock(now)
  const starts = [SLOT_START.ochtend, SLOT_START.middag, SLOT_START.avond]
  const next = starts.find((s) => s > minutes) ?? SLOT_START.ochtend + 24 * 60
  const intoMinute = (now.getTime() % 60000) / 1000
  return Math.max(0, (next - minutes) * 60 - intoMinute)
}
