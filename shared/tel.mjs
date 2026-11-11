// Meten zonder volgen: het vaste vocabulaire van /api/tel, gedeeld door de server, het web en (als spiegel,
// getoetst in tests/tel.test.mjs en ios/HootTests/TellingTests.swift) de app. Alleen totalen per dag.
// Een gebeurtenis draagt nooit een id, een tijdstip of een toestel: alleen WAT er gebeurde, in welk dagdeel
// van de Editie, op welk platform, in welke appversie (major.minor) en hoe vaak (n, begrensd).
import { amsterdamClock } from './slot-times.mjs'

export const EVENTS = ['editie-open', 'editie-einde', 'artikel-open', 'stroom-open', 'selectie-open', 'vergelijk-open', 'delen']
// Eerste keer per dagdeel op dit toestel (de client onthoudt alleen "al geteld voor dagdeel X"): zo geeft
// editie-open het aantal lezers per dagdeel en editie-einde het aantal dat het einde haalde, zonder id.
export const ONCE = ['editie-open', 'editie-einde']
export const PLATFORMS = ['web', 'ios']
export const SLOT_NAMES = ['ochtend', 'middag', 'avond']
export const N_MAX = 20
export const VERSIONS_MAX = 12 // verschillende appversies per dag (tegen een stortvloed aan verzonnen versies)
export const BODY_MAX = 400 // bytes
export const KEEP_DAYS = 400
export const READ_MAX = 60 // zoveel dagen leest één verzoek hooguit (elke dag is een Blobs-lezing)
export const KEYS = ['e', 'd', 'p', 'v', 'n']

const SLOT_ID = /^(\d{4}-\d{2}-\d{2})-(ochtend|middag|avond)$/
const VERSION = /^\d{1,3}\.\d{1,3}$/

export const dayNumber = (date) => {
  const t = Date.parse(date + 'T00:00:00Z')
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === date ? Math.round(t / 864e5) : null
}
export const dayOf = (n) => new Date(n * 864e5).toISOString().slice(0, 10)
export const today = (now = new Date()) => {
  const c = amsterdamClock(now)
  return `${c.year}-${c.month}-${c.day}`
}

// "6.2.1" -> "6.2": alleen major.minor. Alles anders: null.
export function majorMinor(v) {
  if (typeof v !== 'string') return null
  const m = /^(\d{1,3})\.(\d{1,3})(?:\.\d{1,5})?$/.exec(v.trim())
  return m ? `${m[1]}.${m[2]}` : null
}

// Strikt: een object met alleen e, d, p (v, n mogen), een bekend vocabulaire, een dagdeel van eergisteren tot morgen. Alles anders is null en wordt genegeerd (de server antwoordt toch 204). Geeft de gewone vorm terug.
export function parseTel(body, now = new Date()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  if (Object.keys(body).some((k) => !KEYS.includes(k))) return null
  const { e, d, p, v, n } = body
  if (!EVENTS.includes(e) || !PLATFORMS.includes(p) || typeof d !== 'string') return null
  const m = SLOT_ID.exec(d)
  const num = m ? dayNumber(m[1]) : null
  if (num == null) return null
  const t = dayNumber(today(now))
  if (num < t - 2 || num > t + 1) return null
  let version = null
  if (v !== undefined && v !== null) {
    if (typeof v !== 'string' || !VERSION.test(v)) return null
    version = v
  }
  let count = 1
  if (n !== undefined && n !== null) {
    if (!Number.isInteger(n) || n < 1 || n > N_MAX) return null
    count = n
  }
  if (ONCE.includes(e)) count = 1
  return { e, p, date: m[1], slot: m[2], v: version, n: count }
}

export const counterKey = (e, p, slot) => `${e}|${p}|${slot}`
export const versionKey = (p, v) => `${p}|${v}`
export const docKey = (date) => `tel:${date}`
