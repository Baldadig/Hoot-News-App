// De Redacteur: het profiel van één lezer en wat dat over een verhaal zegt — pure functies
// (tests/editor.test.mjs). Ontwerp en reden: Hoot-design/algoritme/bouwspec.md.
//
// Een goede redacteur kent zijn lezer: welke onderwerpen die belangrijk vindt en hoe sterk, wat
// hij al las en wat er net naast zijn wereld ligt. Dat profiel wordt op het toestel afgeleid uit
// je keuzes (interesses, "Wat precies?", meer/minder) en uit wat je opent en bewaart, afgezet
// tegen wat je bronnen brengen. Het geeft persoonlijke punten bovenop het gewone gewicht van een
// verhaal, en een eerlijk waarom per plek.
//
// Rekenregels (web en iOS draaien deze code allebei, en moeten bit-gelijk uitkomen): alleen
// + − × ÷, Math.round/min/max/floor en Date.parse op ISO-tekst. Geen Math.log/pow/exp/abs en geen
// localeCompare; elke sortering heeft een totale vergelijker die eindigt op id.
import { INTERESTS } from '../src/lib/topics.js'
import { MIN_EVENTS } from '../src/lib/affinity.js'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const sum = (xs) => xs.reduce((s, v) => s + v, 0)
// Vaste volgorde voor tekst-id's: met < en >, niet localeCompare (dat hangt af van ICU).
const byId = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

export const FAMILY_OF = Object.fromEntries(INTERESTS.flatMap((f) => f.topics.map((t) => [t, f.id])))
export const FAMILY_LABEL = Object.fromEntries(INTERESTS.map((f) => [f.id, f.label]))

// ---------- 1. Het profiel: per onderwerp een waarde van −1 tot 1 ----------
export { MIN_EVENTS } // pas na zoveel handelingen telt lezen mee (src/lib/affinity.js)
export const W_INHERITED = 0.6 // interesse zonder scherpe keuze: alle onderwerpen, maar minder sterk
export const W_READ = 0.8 // lezen alleen telt nooit zo zwaar als zelf kiezen
export const W_TASTE = 0.75 // meer/minder hiervan: één stem (±4 van 12) is ±0,25
export const TASTE_SCALE = 12 // taste_t ligt tussen −12 en 12 (src/lib/affinity.js, TASTE_CAP)
export const READ_FULL_SHARE = 0.25 // een kwart van je lezen telt vol (alleen voor "buiten je profiel")
export const READ_RAMP = 30 // na 30 handelingen telt lezen volledig mee, daarvoor groeit het in
export const LIFT_SMOOTH = 5 // demping van de lift: een paar keer lezen is nog geen voorkeur
export const SOURCE_FULL = 5 // een bron met een vijfde van je lezen telt vol
export const P_MIN = 0.05 // kleiner dan dit is geen voorkeur: weglaten

// Het aanbod: per onderwerp het aandeel van de artikelen uit je bronnen dat erover gaat. Wordt
// bij het samenstellen uit de pool van de Editie berekend, dus vast per Editie.
export function supplyOf(items = [], followed = null) {
  const pool = items.filter((i) => i && i.kind === 'article' && (!followed || followed.has(i.source)))
  const count = {}
  for (const i of pool) for (const t of new Set(i.topics || [])) count[t] = (count[t] || 0) + 1
  const out = {}
  for (const [t, c] of Object.entries(count)) out[t] = c / pool.length
  return out
}

// Het profiel. `affinity` en `taste` hebben het bestaande formaat (src/lib/affinity.js);
// `supply` komt uit supplyOf. Uitvoer: per onderwerp een waarde (`topicP`) en waar die vandaan
// komt (`origin`), per gebied de sterkste waarde (`family`), per bron hoe vaak je die leest
// (`sourceP`) en het aandeel van je lezen per onderwerp (`shareOf`, alleen voor §5).
export function profileOf({ interests = [], topics = [], affinity = null, taste = null, favorites = [], followed = new Set(), sources = [], supply = null } = {}) {
  // Expliciet. Scherp is een deel van de onderwerpen van een gebied; niets gekozen of de volledige
  // lijst (zoals Welkom die bewaart) telt als geërfd: alles, maar minder sterk. Zo lekt Games niet
  // mee met wie Tech kiest.
  const expl = {}
  for (const f of INTERESTS) {
    if (!interests.includes(f.id)) continue
    const picked = f.topics.filter((t) => topics.includes(t))
    const sharp = picked.length > 0 && picked.length < f.topics.length
    for (const t of f.topics) expl[t] = sharp ? (picked.includes(t) ? 1 : 0) : W_INHERITED
  }
  // Geleerd: lees je een onderwerp vaker dan je bronnen erover schrijven (de lift)? Lineair en
  // zonder log, zodat elke JS-motor hetzelfde uitrekent.
  const n = affinity?.n || 0
  const learned = n >= MIN_EVENTS
  const readOf = {}
  const shareOf = {}
  if (learned) {
    const at = affinity.topics || {}
    const aSum = sum(Object.values(at)) || 1
    // De leesmassa: één keer per handeling. Zonder bronnen (oud formaat) de som van de onderwerpen.
    const A = sum(Object.values(affinity.sources || {})) || aSum
    const ramp = Math.min(1, n / READ_RAMP)
    for (const [t, a] of Object.entries(at)) {
      const lift = (a + LIFT_SMOOTH) / (A * (supply?.[t] || 0) + LIFT_SMOOTH)
      readOf[t] = clamp(lift - 1, 0, 1) * ramp
      shareOf[t] = Math.min(1, a / aSum / READ_FULL_SHARE) * ramp
    }
  }
  // Samen: het sterkste van kiezen en lezen, plus meer/minder. Gedrag kan een onderwerp alleen
  // sterker maken; alleen "minder hiervan" maakt het negatief.
  const tt = taste?.topics || {}
  const topicP = {}
  const origin = {}
  for (const t of new Set([...Object.keys(expl), ...Object.keys(readOf), ...Object.keys(tt)])) {
    const e = expl[t] || 0
    const r = W_READ * (readOf[t] || 0)
    const v = Math.round(clamp(Math.max(e, r) + (W_TASTE * (tt[t] || 0)) / TASTE_SCALE, -1, 1) * 100) / 100
    if (v < P_MIN && v > -P_MIN) continue
    topicP[t] = v
    origin[t] = r > e ? 'geleerd' : 'gekozen'
  }
  // Per gebied het sterkste onderwerp (voor de indeling, het extra blok en de bubbel).
  const family = {}
  for (const [t, v] of Object.entries(topicP)) {
    const f = FAMILY_OF[t]
    if (f && v > 0) family[f] = Math.max(family[f] || 0, v)
  }
  // Bronnen: hoe vaak je ze leest, als aandeel (een vijfde van je lezen telt vol).
  const as = learned ? affinity.sources || {} : {}
  const sSum = sum(Object.values(as)) || 1
  const sourceP = {}
  for (const [s, a] of Object.entries(as)) sourceP[s] = Math.min(1, (SOURCE_FULL * a) / sSum)
  const catOf = new Map(sources.map((s) => [s.id, s.cat]))
  return { topicP, origin, family, sourceP, shareOf, favorites: new Set(favorites), followed, catOf }
}

