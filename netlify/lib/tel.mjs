// Meten zonder volgen: tellen en uitlezen. Eén document per dag (`tel:<jjjj-mm-dd>`) met alleen tellers:
//   { c: { "<gebeurtenis>|<platform>|<dagdeel>": aantal }, v: { "<platform>|<major.minor>": aantal } }
// `v` telt alleen editie-open per appversie. Geen id, geen IP, geen toestel, geen tijdstempel per gebeurtenis;
// de dag is de dag van het dagdeel. Een gelijktijdige telling gaat atomair (kvUpdate: voorwaardelijk schrijven).
import { kvUpdate, kvGet } from './kv.mjs'
import { EVENTS, PLATFORMS, SLOT_NAMES, VERSIONS_MAX, KEEP_DAYS, counterKey, versionKey, docKey, dayNumber, dayOf } from '../../shared/tel.mjs'

const MAX = 1e9

// Telt één gebeurtenis op. Geeft het nieuwe document, of null als het niet lukte (dan liever niets dan een fout).
export async function record(parsed, update = kvUpdate) {
  const { e, p, date, slot, v, n } = parsed
  return update(
    docKey(date),
    (doc) => {
      const next = { c: { ...(doc?.c || {}) }, v: { ...(doc?.v || {}) } }
      const k = counterKey(e, p, slot)
      next.c[k] = Math.min(MAX, (Number(next.c[k]) || 0) + n)
      if (e === 'editie-open' && v) {
        const vk = versionKey(p, v)
        if (vk in next.v || Object.keys(next.v).length < VERSIONS_MAX) next.v[vk] = Math.min(MAX, (Number(next.v[vk]) || 0) + 1)
      }
      return next
    },
    { tries: 12 },
  )
}

const pct = (a, b) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : null)

// Eén dag, leesbaar: de tellers per dagdeel en platform, de totalen en de lezers (editie-open) met het aandeel dat
// het einde haalde. Een dag zonder gegevens geeft nullen.
export function shapeDay(date, doc) {
  const c = doc?.c || {}
  const out = { dag: date, tellers: {}, totaal: {}, lezers: {}, versies: { ...(doc?.v || {}) } }
  for (const e of EVENTS) {
    out.totaal[e] = 0
    out.tellers[e] = {}
    for (const p of PLATFORMS) out.tellers[e][p] = Object.fromEntries(SLOT_NAMES.map((s) => [s, Number(c[counterKey(e, p, s)]) || 0]))
    for (const p of PLATFORMS) for (const s of SLOT_NAMES) out.totaal[e] += out.tellers[e][p][s]
  }
  const sum = (e, s) => PLATFORMS.reduce((t, p) => t + out.tellers[e][p][s], 0)
  let open = 0
  let einde = 0
  for (const s of SLOT_NAMES) {
    const o = sum('editie-open', s)
    const x = sum('editie-einde', s)
    out.lezers[s] = { open: o, einde: x, einde_procent: pct(x, o) }
    open += o
    einde += x
  }
  out.lezers.dag = { open, einde, einde_procent: pct(einde, open) }
  return out
}

export async function readDay(date, get = kvGet) {
  return shapeDay(date, await get(docKey(date)).catch(() => null))
}

// De laatste `dagen` dagen tot en met `tot`, oudste eerst.
export async function readRange(tot, dagen, get = kvGet) {
  const end = dayNumber(tot)
  const n = Math.max(1, Math.min(KEEP_DAYS, Math.floor(dagen) || 1))
  const dates = Array.from({ length: n }, (_, i) => dayOf(end - (n - 1) + i))
  const days = await Promise.all(dates.map((d) => readDay(d, get)))
  return { van: dates[0], tot, dagen: days }
}
