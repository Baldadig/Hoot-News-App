// Opruimen: wat het privacybeleid belooft, de server bewaart je persoonlijke Editie (zonder account) hooguit een dag.
// Drie voorvoegsels, en niets anders (geen feed, geen archief, geen docs):
//   pe:<revisie>:<dagdeel-id>:<sha256>        de persoonlijke Editie zonder account (netlify/functions/edition.mjs, anonKey)
//   pe-quota:<sha256 user-id>:<dagdeel-id>    de teller per lid en dagdeel (edition.mjs)
//   brief-quota-<uid>|all-<dag>               de tellers van /api/brief (netlify/functions/brief.mjs), dag = UTC-datum
// Een dagdeel-id is `<jjjj-mm-dd>-<ochtend|middag|avond>` (editionSlot in netlify/lib/stories.mjs).
// We houden het lopende dagdeel en het vorige (marge voor de overgang), en bij de briefteller vandaag en gisteren
// (UTC, i.v.m. tijdzones). Een sleutel die we niet kunnen lezen laten we staan en tellen we als 'overgeslagen'.
// Logt nooit sleutelinhoud: van `pe…`-sleutels hooguit het voorvoegsel, verder alleen aantallen.
import { kvListKeys, kvDelete } from './kv.mjs'
import { editionSlot } from './stories.mjs'

const SLOT_INDEX = { ochtend: 0, middag: 1, avond: 2 }
const DAY_MS = 864e5
const SLOT_ID = '(\\d{4}-\\d{2}-\\d{2})-(ochtend|middag|avond)'
const PE = new RegExp(`^pe:[A-Za-z0-9._-]+:${SLOT_ID}:[0-9a-f]{64}$`)
const PE_QUOTA = new RegExp(`^pe-quota:[0-9a-f]{64}:${SLOT_ID}$`)
const BRIEF_DAY = /^brief-quota-.+-(\d{4}-\d{2}-\d{2})$/

// Het volgnummer van een dagdeel: oplopend in de tijd (3 per dag). null als de datum niet bestaat.
export function slotNumber(date, slot) {
  const t = Date.parse(date + 'T00:00:00Z')
  if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== date || !(slot in SLOT_INDEX)) return null
  return Math.round(t / DAY_MS) * 3 + SLOT_INDEX[slot]
}
const dayNumber = (date) => {
  const t = Date.parse(date + 'T00:00:00Z')
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === date ? Math.round(t / DAY_MS) : null
}

// Mag deze sleutel weg? true / false (bewaren) / null (onleesbaar: overslaan).
export function expired(prefix, key, { slotNow, dayNow }) {
  if (prefix === 'pe:' || prefix === 'pe-quota:') {
    const m = (prefix === 'pe:' ? PE : PE_QUOTA).exec(key)
    const n = m ? slotNumber(m[1], m[2]) : null
    return n == null ? null : n < slotNow - 1 // lopend en vorig dagdeel blijven; ook een dagdeel in de toekomst blijft
  }
  const d = BRIEF_DAY.exec(key)
  const n = d ? dayNumber(d[1]) : null
  return n == null ? null : n < dayNow - 1 // vandaag en gisteren blijven
}

const PREFIXES = ['pe:', 'pe-quota:', 'brief-quota-']

export async function opruimen({ now = Date.now(), list = kvListKeys, remove = kvDelete, log = console } = {}) {
  const cur = editionSlot(new Date(now))
  const slotNow = slotNumber(cur.date, cur.slot)
  const dayNow = dayNumber(new Date(now).toISOString().slice(0, 10))
  const out = { verwijderd: 0, bewaard: 0, overgeslagen: 0, fouten: 0, perVoorvoegsel: {} }
  if (slotNow == null || dayNow == null) return out // de klok is onleesbaar: liever niets doen
  for (const prefix of PREFIXES) {
    const r = (out.perVoorvoegsel[prefix] = { verwijderd: 0, bewaard: 0, overgeslagen: 0, fouten: 0 })
    let keys
    try {
      keys = await list(prefix)
    } catch (e) {
      r.fouten++
      out.fouten++
      log.error(`[opruimen] opsommen van "${prefix}…" mislukte: ${e?.message || e}`)
      continue
    }
    for (const key of keys) {
      if (typeof key !== 'string' || !key.startsWith(prefix)) { r.overgeslagen++; continue }
      // `pe:` mag nooit een `pe-quota:`-sleutel raken en omgekeerd: de strikte patronen hierboven beslissen.
      const gone = expired(prefix, key, { slotNow, dayNow })
      if (gone === null) r.overgeslagen++
      else if (!gone) r.bewaard++
      else {
        try {
          await remove(key)
          r.verwijderd++
        } catch (e) {
          r.fouten++
          log.error(`[opruimen] verwijderen onder "${prefix}…" mislukte: ${e?.message || e}`)
        }
      }
    }
    for (const k of ['verwijderd', 'bewaard', 'overgeslagen', 'fouten']) out[k] += r[k]
  }
  log.log(`[opruimen] verwijderd ${out.verwijderd}, bewaard ${out.bewaard}, overgeslagen ${out.overgeslagen}, fouten ${out.fouten}`)
  return out
}
