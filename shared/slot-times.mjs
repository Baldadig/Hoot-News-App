// Wanneer elk dagdeel begint: minuten na middernacht, Amsterdamse tijd (het hele jaar, zomer- en
// wintertijd). Alleen om te rekenen en te plannen: in teksten staan geen kloktijden, alleen dagdelen
// (shared/slots.json). Spiegel in de app: EditionAlerts.slots (getoetst in SlotTimesTests).
export const SLOT_START = { ochtend: 5 * 60 + 30, middag: 12 * 60, avond: 17 * 60 }

// "05:30": voor het veld `next` van de Editie (geen tekst op het scherm).
export const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const FMT = /* @__PURE__ */ new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

// De kalenderdag en de minuut van de dag in Amsterdam.
export function amsterdamClock(now = new Date()) {
  const p = Object.fromEntries(FMT.formatToParts(now).map((x) => [x.type, x.value]))
  return { year: p.year, month: p.month, day: p.day, minutes: Number(p.hour) * 60 + Number(p.minute) }
}

// Nog nacht: vóór de start van de Ochtendeditie (de nachtrust van feed-refresh).
export const beforeOchtend = (now = new Date()) => amsterdamClock(now).minutes < SLOT_START.ochtend
