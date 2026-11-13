// Meten zonder volgen: het vaste vocabulaire van /api/tel, gedeeld door de server, het web en (als spiegel,
// getoetst in tests/tel.test.mjs en ios/HootTests/TellingTests.swift) de app. Alleen totalen per dag.
// Een gebeurtenis draagt nooit een id, een tijdstip of een toestel: alleen WAT er gebeurde, in welk dagdeel
// van de Editie, op welk platform, in welke appversie (major.minor) en hoe vaak (n, begrensd).
import { amsterdamClock, SLOT_START } from './slot-times.mjs'

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

// ---- Meten · 6: herkomst, App Store-tik en het welkom (audit punt 8). Alleen web en server; iOS volgt (1.3.1). ----
// Aan sinds 12 november 2026: Alex keurde de zin in src/views/Privacy.jsx ("Wat Hoot telt") goed. Vlag en zin gaan
// samen (tests/tel.test.mjs); zet je hem uit, haal dan ook de zin weg.
export const NIEUWE_TELLERS = true

// Herkomst: ?via=<label> op de landing en /lees. Alleen deze labels; al het andere telt als 'via:anders'.
// ad: advertenties, deel: de gedeelde kaart (/deel/<id>), as: links vanaf de App Store-pagina (review 13 november).
export const VIA_LABELS = ['ig', 'x', 'bsky', 'mail', 'nb', 'qr', 'ad', 'deel', 'as']
export const VIA_ANDERS = 'anders'
export const VIA_EVENTS = [...VIA_LABELS, VIA_ANDERS].map((l) => `via:${l}`)
// De stappen van het eerste welkom op het web, als totalen (geen trechter per persoon).
export const WELKOM_STAPPEN = ['welkom-open', 'bronnen-gekozen', 'liever-meteen-lezen', 'eerste-editie']
export const APPSTORE_TIK = 'appstore-tik'
// De landing (review 13 november, aanbeveling 3): de noemer en waar op de pagina getikt wordt. Alleen deze plekken.
//   landing-open   de landing geopend, één keer per dagdeel per browser (de noemer)
//   web-tik:<plek> een tik op een link naar /lees/: de knop in de held, het toestel in de held, onder 01 Editie,
//                  onder 04 Hoot kiest, de knop in het slot
//   appstore-tik:<plek> een tik op een App Store-link: de pil in de held, de pil of regel in het slot, de pil onder
//                  04 Hoot kiest, de vraag
//   vraag-open     een vraag opengeklapt, één keer per dagdeel per browser (wie twijfelt en zoekt)
// 'appstore-tik' zonder plek blijft geldig: een oude, gecachete pagina stuurt hem nog.
export const LANDING_OPEN = 'landing-open'
export const VRAAG_OPEN = 'vraag-open'
export const WEB_PLEKKEN = ['held', 'toestel', 'editie', 'kiest', 'slot']
export const APPSTORE_PLEKKEN = ['held', 'slot', 'kiest', 'vraag']
export const WEB_TIK_EVENTS = WEB_PLEKKEN.map((p) => `web-tik:${p}`)
export const APPSTORE_PLEK_EVENTS = APPSTORE_PLEKKEN.map((p) => `${APPSTORE_TIK}:${p}`)
export const LANDING = [LANDING_OPEN, ...WEB_TIK_EVENTS, ...APPSTORE_PLEK_EVENTS, VRAAG_OPEN]
export const NIEUW = [...VIA_EVENTS, APPSTORE_TIK, ...WELKOM_STAPPEN, ...LANDING]
// Ook deze tellen één keer per dagdeel per browser (herkomst, welkom, het openen van de landing en een vraag);
// de tikken elke keer.
export const NIEUW_ONCE = [...VIA_EVENTS, ...WELKOM_STAPPEN, LANDING_OPEN, VRAAG_OPEN]

// data-tel op de landing ('web:held', 'as:slot') naar de gebeurtenis; onbekend: null.
export function tikEvent(code) {
  const m = /^(web|as):([a-z]+)$/.exec(String(code || ''))
  if (!m) return null
  const e = m[1] === 'web' ? `web-tik:${m[2]}` : `${APPSTORE_TIK}:${m[2]}`
  return LANDING.includes(e) ? e : null
}

// Alle gebeurtenissen die nu meetellen: de zeven vaste, plus de nieuwe als de vlag aan staat.
export const eventsFor = (nieuw = NIEUWE_TELLERS) => (nieuw ? [...EVENTS, ...NIEUW] : EVENTS)
export const isOnce = (e) => ONCE.includes(e) || NIEUW_ONCE.includes(e)

// '?via=IG' -> 'via:ig'; een onbekend of leeg label -> 'via:anders'; geen via -> null.
export function viaEvent(raw) {
  if (raw === null || raw === undefined) return null
  const l = String(raw).trim().toLowerCase()
  return `via:${VIA_LABELS.includes(l) ? l : VIA_ANDERS}`
}

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
export function parseTel(body, now = new Date(), { nieuw = NIEUWE_TELLERS } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  if (Object.keys(body).some((k) => !KEYS.includes(k))) return null
  const { e, d, p, v, n } = body
  if (!eventsFor(nieuw).includes(e) || !PLATFORMS.includes(p) || typeof d !== 'string') return null
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
  if (isOnce(e)) count = 1
  return { e, p, date: m[1], slot: m[2], v: version, n: count }
}

export const counterKey = (e, p, slot) => `${e}|${p}|${slot}`
export const versionKey = (p, v) => `${p}|${v}`
export const docKey = (date) => `tel:${date}`

// Het dagdeel-id van nu op de klok (Amsterdam): voor tellingen zonder Editie in beeld (de landing, het welkom).
// Vóór de Ochtendeditie hoort het nog bij de Avondeditie van gisteren, zoals in de app.
export function slotIdNow(now = new Date()) {
  const c = amsterdamClock(now)
  const date = `${c.year}-${c.month}-${c.day}`
  if (c.minutes < SLOT_START.ochtend) return `${dayOf(dayNumber(date) - 1)}-avond`
  return `${date}-${c.minutes < SLOT_START.middag ? 'ochtend' : c.minutes < SLOT_START.avond ? 'middag' : 'avond'}`
}
