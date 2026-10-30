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
import { INTERESTS, topicById } from '../src/lib/topics.js'
import { MIN_EVENTS } from '../src/lib/affinity.js'
import { DESK_LABEL } from '../netlify/lib/desks.mjs'

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

// ---------- 2. De punten: bovenop het gewone gewicht van een verhaal ----------
export const P = {
  INTEREST: 18, // × sterkte van het beste onderwerp × (0,5 + 0,5 × dekking)
  CROSS: 8, // snijvlak: raakt ook een tweede gebied van je (≥ CROSS_MIN)
  LESS: 16, // × de sterkste "minder" (tot −16)
  FAVORITE: 8, // voorkeursbron; gelijk aan FAVORITE_BONUS in netlify/lib/stories.mjs
  SOURCE_READ: 4, // × hoe vaak je de bron leest, als dat meer is dan SOURCE_READ_MIN
  MINE: 3, // per extra eigen bron die erover schrijft, tot MINE_MAX
  FOLLOW_UP: 10, // vervolg: je las het en er kwamen ≥ FOLLOW_UP_MIN nieuwe stukken bij
}
export const CROSS_MIN = 0.35
export const SOURCE_READ_MIN = 0.2
export const MINE_MAX = 3
export const FOLLOW_UP_MIN = 2
export const FOLLOW_UP_GAP = 36e5 // "nieuw" is minstens een uur na het laatste stuk dat je las
export const SOURCE_CAT_P = 0.6 // een vakbron zonder onderwerp telt voor 0,6 × je gebied
export const SUM_MIN = -30
export const SUM_MAX = 40

// Wat het profiel over één bericht zegt: zijn onderwerpen, en voor een bericht zonder enig
// onderwerp de rubriek van een vakbron (een stuk van Carbon Brief zonder trefwoord is toch
// wetenschap). Een treffer is { t, f, v }: onderwerp, gebied, waarde.
function topicHits(item, prof) {
  const ts = item.topics || []
  const out = ts.filter((t) => prof.topicP[t] !== undefined).map((t) => ({ t, f: FAMILY_OF[t], v: prof.topicP[t] }))
  if (!ts.length) {
    const cat = prof.catOf.get(item.source)
    const fam = cat && INTERESTS.find((f) => f.cats.includes(cat))
    if (fam && prof.family[fam.id]) out.push({ t: `bron:${cat}`, f: fam.id, v: SOURCE_CAT_P * prof.family[fam.id] })
  }
  return out
}
const strongestFirst = (a, b) => b.v - a.v || byId(a.t, b.t)

// De persoonlijke punten van een kandidaat. `items`: zijn berichten uit je eigen bronnen.
// `ctx.readIds`: wat je al las (een Set). Elk part is { pts, ... } met wat het waarom nodig heeft.
// Al gelezen zonder nieuws is geen punt maar een filter: dan staat er `seen` (0 punten), en de
// selectie slaat de kandidaat over.
export function personalParts(items = [], prof, ctx = {}) {
  const parts = {}
  if (!items.length) return parts
  const hits = items.map((i) => topicHits(i, prof))
  const flat = hits.flat()
  const pos = flat.filter((h) => h.v > 0).sort(strongestFirst)
  if (pos.length) {
    const best = pos[0]
    const cover = hits.filter((hs) => hs.some((h) => h.v > 0)).length / items.length
    // Het label komt van de treffer die het verhaal het best dekt (dekking × waarde), niet van
    // het ene bericht met het sterkste onderwerp: een gemengd verhaal is geen VS-politiek omdat
    // één stuk dat is.
    const coverOf = (t) => hits.filter((hs) => hs.some((h) => h.t === t)).length / items.length
    const label = [...new Map(pos.map((h) => [h.t, h])).values()]
      .map((h) => ({ ...h, c: coverOf(h.t) * h.v }))
      .sort((a, b) => b.c - a.c || strongestFirst(a, b))[0]
    parts.interest = { pts: Math.round(P.INTEREST * best.v * (0.5 + 0.5 * cover)), t: label.t, f: label.f, origin: prof.origin?.[label.t] || 'gekozen' }
    const second = pos.find((h) => h.f !== best.f && h.v >= CROSS_MIN)
    if (second && best.v >= CROSS_MIN) parts.cross = { pts: P.CROSS, f: [best.f, second.f] }
  }
  const neg = flat.filter((h) => h.v < 0).sort((a, b) => a.v - b.v || byId(a.t, b.t))
  if (neg.length) parts.less = { pts: Math.round(P.LESS * neg[0].v), t: neg[0].t }
  const fav = items.find((i) => prof.favorites.has(i.source))
  if (fav) parts.favorite = { pts: P.FAVORITE, source: fav.source }
  const rs = Math.max(0, ...items.map((i) => prof.sourceP[i.source] || 0))
  if (rs > SOURCE_READ_MIN) parts.sourceRead = { pts: Math.round(P.SOURCE_READ * rs) }
  const mine = new Set(items.map((i) => i.source)).size
  if (mine >= 2) parts.mine = { pts: P.MINE * Math.min(MINE_MAX, mine - 1), n: mine }
  // Wat je al las. Er is geen leestijdstip: "nieuw" is gepubliceerd ruim na het laatste stuk dat je las.
  const read = ctx.readIds ? items.filter((i) => ctx.readIds.has(i.id)) : []
  if (read.length) {
    const last = Math.max(...read.map((i) => Date.parse(i.publishedAt) || 0))
    const fresh = items.filter((i) => !ctx.readIds.has(i.id) && Date.parse(i.publishedAt) > last + FOLLOW_UP_GAP).length
    if (fresh >= FOLLOW_UP_MIN) parts.followUp = { pts: P.FOLLOW_UP, n: fresh }
    else parts.seen = { pts: 0 }
  }
  return parts
}

// Begrensd: persoonlijk weegt nooit zwaarder dan dit (een verhaal met 6 bronnen blijft staan).
export const sumParts = (parts = {}) => clamp(sum(Object.values(parts).map((p) => p.pts || 0)), SUM_MIN, SUM_MAX)

// Een vast zaad per lezer en Editie, alleen om gelijke stand te breken (minder dan 1 punt).
// djb2 zoals shared/util.mjs, met ×33 in plaats van een shift: op elke motor hetzelfde.
export function jitter(seed, id) {
  const s = `${seed}|${id}`
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return (h % 1000) / 1000
}

// ---------- 3. Tempo: hoe lang een los bericht van een bron meedoet ----------
// Een bron die elk uur publiceert, heeft na 14 uur genoeg nieuws; een die eens per dag of twee
// publiceert (Carbon Brief, Quanta, The Atlantic) krijgt tot drie dagen. Venster = 3 × de
// mediane tussentijd van de elf nieuwste stukken, tussen 14 en 72 uur.
export const TEMPO_LATEST = 11
export const TEMPO_FACTOR = 3
export const TEMPO_MIN_H = 14
export const TEMPO_MAX_H = 72
export const TEMPO_NO_GAP_H = 24 // één stuk: geen tussentijd, reken met een dag
export function tempoWindows(items = []) {
  const by = new Map()
  for (const i of items) {
    if (i?.kind !== 'article' || !i.publishedAt) continue
    const t = Date.parse(i.publishedAt)
    if (Number.isNaN(t)) continue
    if (!by.has(i.source)) by.set(i.source, [])
    by.get(i.source).push(t)
  }
  const out = new Map()
  for (const [s, ts] of by) {
    const t = ts.sort((a, b) => b - a).slice(0, TEMPO_LATEST)
    const gaps = t.slice(1).map((x, k) => (t[k] - x) / 36e5).sort((a, b) => a - b)
    const med = gaps.length ? gaps[Math.floor(gaps.length / 2)] : TEMPO_NO_GAP_H
    out.set(s, clamp(TEMPO_FACTOR * med, TEMPO_MIN_H, TEMPO_MAX_H))
  }
  return out
}

// ---------- 4. Buiten en naast je bubbel ----------
// Buiten je profiel: geen onderwerp dat je volgt (≥ 0,3) en geen onderwerp uit een gebied dat je
// volgt (≥ 0,5). Een wielerfan krijgt dus geen voetbal als bubbelstuk.
export const OUTSIDE_TOPIC = 0.3
export const OUTSIDE_FAMILY = 0.5
export const outsideProfile = (topics = [], prof) =>
  !topics.some((t) => (prof.topicP[t] || 0) >= OUTSIDE_TOPIC || (prof.family[FAMILY_OF[t]] || 0) >= OUTSIDE_FAMILY)

// Buren: gebieden die op elkaar aansluiten. Serendipiteit met een idee: niet willekeurig, maar
// één stap van wat je al leest.
export const NEIGHBOURS = {
  politiek: ['wereld', 'binnenland', 'economie'],
  binnenland: ['politiek', 'wetenschap', 'sport'],
  wereld: ['politiek', 'economie'],
  economie: ['tech', 'wereld', 'politiek'],
  tech: ['wetenschap', 'economie', 'cultuur'],
  wetenschap: ['tech', 'binnenland'],
  cultuur: ['tech', 'binnenland'],
  sport: ['binnenland', 'cultuur'],
}
export function strongestFamily(prof) {
  return Object.entries(prof.family).sort((a, b) => b[1] - a[1] || byId(a[0], b[0]))[0]?.[0] || null
}

// ---------- 5. Het waarom ----------
// Eén korte zin per plek. Alleen een reden die echt de doorslag gaf (≥ MIN_WHY_PTS); anders
// blijft de rubriek staan. Geen getallen behalve het aantal bronnen of stukken.
export const MIN_WHY_PTS = 5
export const FRONT_SOURCES = 6 // vanaf zoveel bronnen is een verhaal zonder persoonlijke reden groot nieuws
export const DESK_NAMES = { ...DESK_LABEL, tech: 'Tech', economie: 'Economie', regio: 'Regio' }
const WHY_ORDER = ['followUp', 'cross', 'interest', 'favorite', 'mine', 'sourceRead']
const topicLabel = (t) => topicById(t)?.label || t

// `entry`: de plek ({ desk, front, near }). `parts`: de persoonlijke punten van de kandidaat.
// `plannedDesk`: de plek kwam uit jouw indeling. Uitvoer: { code, text }.
export function whyOf(entry = {}, { parts = {}, sourceCount = 0, desk = entry.desk ?? null, plannedDesk = false, labelOf = topicLabel, sourceName = (s) => s, deskLabel = (d) => DESK_NAMES[d] || d } = {}) {
  if (entry.desk === 'extern') return { code: 'extern', text: 'Buiten je bronnen' }
  if (entry.desk === 'bubbel') {
    if (entry.near) return { code: 'buur', text: `Naast je bubbel · grenst aan ${FAMILY_LABEL[entry.near] || entry.near}` }
    return { code: 'bubbel', text: 'Buiten je bubbel · via Google Trends' }
  }
  if (entry.desk === 'breed') return { code: 'breed', text: `Waar iedereen over schrijft · ${sourceCount} bronnen` }
  if (entry.front) return { code: 'groot', text: `Groot nieuws · ${sourceCount} bronnen` }
  // Het zwaarste part telt; bij gelijke stand de volgorde van de tabel in de bouwspec (§6).
  const rank = (k) => (WHY_ORDER.includes(k) ? WHY_ORDER.indexOf(k) : WHY_ORDER.length)
  const [code, p] = Object.entries(parts).filter(([, x]) => (x.pts || 0) >= MIN_WHY_PTS).sort((a, b) => b[1].pts - a[1].pts || rank(a[0]) - rank(b[0]) || byId(a[0], b[0]))[0] || []
  if (code === 'followUp') return { code, text: `Vervolg op wat je las · ${p.n} nieuwe stukken` }
  if (parts.cross && (code === 'interest' || code === 'cross')) return { code: 'cross', text: `Raakt ${FAMILY_LABEL[parts.cross.f[0]]} én ${FAMILY_LABEL[parts.cross.f[1]]}` }
  if (code === 'interest') {
    if (p.t.startsWith('bron:')) return { code: 'vak', text: 'Uit je vakbronnen' }
    if (p.origin === 'geleerd') return { code: 'learned', text: `Omdat je vaak over ${labelOf(p.t)} leest` }
    return { code, text: `Omdat je ${labelOf(p.t)} volgt` }
  }
  if (code === 'favorite') return { code, text: `Uit je voorkeursbron ${sourceName(p.source)}` }
  if (code === 'mine') return { code, text: `${p.n} van je bronnen schrijven erover` }
  if (code === 'sourceRead') return { code, text: 'Uit een bron die je veel leest' }
  if (sourceCount >= FRONT_SOURCES) return { code: 'groot', text: `Groot nieuws · ${sourceCount} bronnen` }
  if (desk && plannedDesk) return { code: 'rubriek', text: `Jouw rubriek ${deskLabel(desk)}` }
  return { code: 'rubriek', text: desk ? `Rubriek ${deskLabel(desk)}` : 'Het nieuws van nu' }
}
