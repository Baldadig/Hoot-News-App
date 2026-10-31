// De Redacteur: het profiel van één lezer, wat dat over een verhaal zegt en hoe zijn krant is
// ingedeeld — pure functies (tests/editor.test.mjs). Ontwerp en reden: Hoot-design/algoritme/bouwspec.md.
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
import { DESKS, DESK_LABEL, desksOf, storyForeignOf, VL_HOME } from '../netlify/lib/desks.mjs'

// De buitenlandse kernrubrieken (Binnenland is Nederland, zie netlify/lib/desks.mjs).
export const FOREIGN_DESKS = new Set(['buitenland', 'vs', 'middenoosten', 'oekraine'])

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const sum = (xs) => xs.reduce((s, v) => s + v, 0)
// Vaste volgorde voor tekst-id's: met < en >, niet localeCompare (dat hangt af van ICU).
const byId = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

export const FAMILY_OF = Object.fromEntries(INTERESTS.flatMap((f) => f.topics.map((t) => [t, f.id])))
export const FAMILY_LABEL = Object.fromEntries(INTERESTS.map((f) => [f.id, f.label]))
// Het gebied van een vakbron (de rubriek in de catalogus): een cultuursite is Cultuur.
const FAMILY_OF_CAT = Object.fromEntries(INTERESTS.flatMap((f) => f.cats.filter((c) => c !== 'regio').map((c) => [c, f.id])))

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
//
// Binnenland is geografie, geen lijst thema's (feedback 31 oktober: het Poolse hof kreeg "Omdat je
// Misdaad & recht volgt"). Een onderwerp van Binnenland (wonen, zorg, misdaad...) telt niet bij een
// buitenlands bericht; wel bij een Vlaamse bron, die je zelf koos. En wie Binnenland koos, wil het
// Nederlandse nieuws, ook zonder trefwoord (het zeehondencentrum, het kabinet): elk Nederlands bericht
// is een treffer GEO_NL ("Omdat je Binnenland volgt"), hooguit zo sterk als een geërfde interesse.
// `geo`: 'nl', 'int' of null (geoOf).
export const GEO_NL = 'geo:nl'
function topicHits(item, prof, geo = null) {
  const ts = item.topics || []
  const abroad = geo === 'int' && !VL_HOME.has(item.source)
  // VS-politiek is ook geografie: het trefwoord "verkiezing" maakte van Lula's zege in Brazilië VS-politiek.
  const notUs = ts.includes('vs-politiek') && !desksOf(item).has('vs')
  const out = ts.filter((t) => prof.topicP[t] !== undefined && !(abroad && FAMILY_OF[t] === 'binnenland' && prof.topicP[t] > 0) && !(notUs && t === 'vs-politiek' && prof.topicP[t] > 0)).map((t) => ({ t, f: FAMILY_OF[t], v: prof.topicP[t], s: item.source }))
  const fb = prof.family.binnenland || 0
  if (fb > 0 && geo === 'nl') out.push({ t: GEO_NL, f: 'binnenland', v: Math.min(fb, W_INHERITED), s: item.source })
  if (!ts.length) {
    const cat = prof.catOf.get(item.source)
    const fam = cat && INTERESTS.find((f) => f.cats.includes(cat))
    if (fam && prof.family[fam.id]) out.push({ t: `bron:${cat}`, f: fam.id, v: SOURCE_CAT_P * prof.family[fam.id], s: item.source })
  }
  return out
}
const strongestFirst = (a, b) => b.v - a.v || byId(a.t, b.t)

// Waar een bericht over gaat: 'nl' (Binnenland), 'int' (buitenland) of null. De rubriek van het
// verhaal (`desk`, voor iedereen gelijk) gaat voor; anders het bericht zelf, in de context van zijn
// verhaal: een verhaal met vooral buitenlandse bronnen (`foreign`) is buitenland, ook als het
// NOS-stuk erover geen land noemt (Christa Pike, de mislukte executie in de VS).
export function geoOf(item, desk = null, foreign = false) {
  if (desk === 'binnenland') return 'nl'
  if (FOREIGN_DESKS.has(desk)) return 'int'
  const ds = desksOf(item, { storyForeign: foreign })
  for (const d of ds) if (FOREIGN_DESKS.has(d)) return 'int' // zoals primaryDesk: het land gaat voor
  if (ds.has('binnenland')) return 'nl'
  return foreign ? 'int' : null
}

// De persoonlijke punten van een kandidaat. `items`: zijn berichten uit je eigen bronnen.
// `ctx.readIds`: wat je al las (een Set). Elk part is { pts, ... } met wat het waarom nodig heeft.
// Al gelezen zonder nieuws is geen punt maar een filter: dan staat er `seen` (0 punten), en de
// selectie slaat de kandidaat over. `story`: wat voor iedereen gelijk is aan het verhaal, als de
// selectie dat weet: zijn rubriek (`desk`, st.desk) en of het vooral buitenlandse bronnen heeft
// (`foreign`); anders kijken we naar de berichten zelf.
export function personalParts(items = [], prof, ctx = {}, story = {}) {
  const parts = {}
  if (!items.length) return parts
  const foreign = story.foreign ?? (items.length > 1 && storyForeignOf(items))
  const hits = items.map((i) => topicHits(i, prof, geoOf(i, story.desk ?? null, foreign)))
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
      .sort((a, b) => b.c - a.c || (a.t === GEO_NL) - (b.t === GEO_NL) || strongestFirst(a, b))[0] // het onderwerp zelf gaat voor "Binnenland"
    parts.interest = { pts: Math.round(P.INTEREST * best.v * (0.5 + 0.5 * cover)), t: label.t, f: label.f, origin: prof.origin?.[label.t] || 'gekozen' }
    // Een snijvlak alleen als beide gebieden het verhaal echt raken (feedback 31 oktober: "Raakt
    // Wetenschap én Binnenland" bij de rellen in Den Haag, door het trefwoord "angst"; "Raakt Cultuur
    // én Wetenschap" bij een animeprijs van Variety): elk gebied in meer dan de helft van de berichten,
    // en een vakbron telt alleen voor zijn eigen gebied (Variety is Cultuur, geen Gezondheid).
    const famCat = (h) => FAMILY_OF_CAT[prof.catOf?.get(h.s)]
    const crossHits = hits.map((hs) => hs.filter((h) => h.v >= CROSS_MIN && (!famCat(h) || famCat(h) === h.f)))
    const famCover = (f) => crossHits.filter((hs) => hs.some((h) => h.f === f)).length * 2 > items.length
    const cross = pos.filter((h) => h.v >= CROSS_MIN && famCover(h.f))
    const first = cross[0]
    const second = first && cross.find((h) => h.f !== first.f)
    if (second) parts.cross = { pts: P.CROSS, f: [first.f, second.f] }
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

// `entry`: de plek ({ desk, front, near, vervolg }). `parts`: de persoonlijke punten van de kandidaat.
// `plannedDesk`: de plek kwam uit jouw indeling. Uitvoer: { code, text }.
export function whyOf(entry = {}, { parts = {}, sourceCount = 0, desk = entry.desk ?? null, plannedDesk = false, labelOf = topicLabel, sourceName = (s) => s, deskLabel = (d) => DESK_NAMES[d] || d } = {}) {
  // Stond in je vorige Editie en ontwikkelde zich: dat gaat vóór elke andere reden, ook op de voorpagina.
  if (entry.vervolg) return { code: 'vervolg', text: `Vervolg · ${entry.vervolg} nieuwe stukken` }
  if (entry.desk === 'extern') return { code: 'extern', text: 'Buiten je bronnen' }
  if (entry.desk === 'bubbel') {
    if (entry.near) return { code: 'buur', text: `Naast je bubbel · grenst aan ${FAMILY_LABEL[entry.near] || entry.near}` }
    return { code: 'bubbel', text: 'Buiten je bubbel · via Google Trends' }
  }
  if (entry.desk === 'breed') return { code: 'breed', text: `Waar iedereen over schrijft · ${sourceCount} bronnen` }
  // Groot nieuws is groot: vanaf FRONT_SOURCES bronnen. Een kleiner Nederlands verhaal op de voorpagina
  // (FRONT_NL_HOME) krijgt zijn eigen reden, of zijn rubriek (feedback 31 oktober: "Groot nieuws · 3
  // bronnen" bij het zeehondencentrum).
  if (entry.front && sourceCount >= FRONT_SOURCES) return { code: 'groot', text: `Groot nieuws · ${sourceCount} bronnen` }
  // Het zwaarste part telt; bij gelijke stand de volgorde van de tabel in de bouwspec (§6).
  const rank = (k) => (WHY_ORDER.includes(k) ? WHY_ORDER.indexOf(k) : WHY_ORDER.length)
  const [code, p] = Object.entries(parts).filter(([, x]) => (x.pts || 0) >= MIN_WHY_PTS).sort((a, b) => b[1].pts - a[1].pts || rank(a[0]) - rank(b[0]) || byId(a[0], b[0]))[0] || []
  if (code === 'followUp') return { code, text: `Vervolg op wat je las · ${p.n} nieuwe stukken` }
  if (parts.cross && (code === 'interest' || code === 'cross')) return { code: 'cross', text: `Raakt ${FAMILY_LABEL[parts.cross.f[0]]} én ${FAMILY_LABEL[parts.cross.f[1]]}` }
  if (code === 'interest') {
    if (p.t.startsWith('bron:')) return { code: 'vak', text: 'Uit je vakbronnen' }
    if (p.t === GEO_NL) return { code, text: `Omdat je ${FAMILY_LABEL.binnenland} volgt` }
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

// ---------- 5b. "Wat Hoot van je leerde" (Instellingen) ----------
// Drie lijsten onderwerpen uit het profiel (bouwspec §8): gekozen (zelf, of 'meer hiervan'),
// geleerd (uit je lezen, alleen als het duidelijk is: p ≥ LEARNED_SHOWN) en minder ('minder
// hiervan'). Elke lijst in een vaste volgorde: sterkste eerst, bij gelijke stand de catalogus.
export const LEARNED_SHOWN = 0.4
const CATALOGUE = Object.fromEntries(INTERESTS.flatMap((f) => f.topics).map((t, i) => [t, i]))
const byCatalogue = (a, b) => (CATALOGUE[a] ?? 1e3) - (CATALOGUE[b] ?? 1e3) || byId(a, b)
export function profileSummary(prof) {
  const p = prof?.topicP || {}
  const origin = prof?.origin || {}
  const strongest = (a, b) => p[b] - p[a] || byCatalogue(a, b)
  const ids = Object.keys(p)
  return {
    chosen: ids.filter((t) => p[t] > 0 && origin[t] !== 'geleerd').sort(strongest),
    learned: ids.filter((t) => p[t] >= LEARNED_SHOWN && origin[t] === 'geleerd').sort(strongest),
    less: ids.filter((t) => p[t] < 0).sort((a, b) => p[a] - p[b] || byCatalogue(a, b)),
  }
}

// ---------- 6. De indeling van jouw krant ----------
// Elke krant heeft de kernrubrieken; jouw interesses geven je eigen pagina's (Tech, Economie,
// Regio) en maken kernrubrieken zwaarder. Zetels per rubriek met Sainte-Laguë: evenredig, zonder
// dat één rubriek alles krijgt (hooguit DESK_CAP), en minstens KERN_MIN kernrubrieken zodra er
// een dubbele zetel is om voor te ruilen.
export const KERN = [...DESKS] // binnenland, buitenland, vs, middenoosten, oekraine, wetenschap
export const OWN_DESKS = ['tech', 'economie', 'regio']
// Het gewicht van een rubriek is 1 (kern; KERN_INT_W voor de buitenlandse kernrubrieken als je
// interesses koos maar Wereld niet) of 0 (eigen pagina; Regio ook 0 zonder regiobron), plus DESK_GAIN ×
// het sterkste onderwerp dat erbij hoort: wie VS-politiek volgt, krijgt een tweede VS-zetel, geen
// tweede Binnenland. De tabel is letterlijk die van het referentieprototype.
export const DESK_GAIN = 3
export const TOPIC_DESK = {
  nederland: ['binnenland'], verkiezingen: ['binnenland', 'vs'], 'vs-politiek': ['vs'], trump: ['vs'], europa: ['buitenland'],
  wonen: ['binnenland', 'regio'], zorg: ['binnenland'], onderwijs: ['binnenland'], misdaad: ['binnenland', 'regio'], migratie: ['binnenland'], verkeer: ['regio'],
  oekraine: ['oekraine'], middenoosten: ['middenoosten'], azie: ['buitenland'], afrika: ['buitenland'], latam: ['buitenland'], geopolitiek: ['buitenland', 'oekraine'],
  economie: ['economie'], werk: ['economie'], bedrijven: ['economie'], energie: ['economie'], geld: ['economie'],
  ai: ['tech'], tech: ['tech'], gadgets: ['tech'], privacy: ['tech'], ev: ['tech'], games: ['tech'],
  klimaat: ['wetenschap'], gezondheid: ['wetenschap'], ruimte: ['wetenschap'], natuur: ['wetenschap'], brein: ['wetenschap'],
}
export const DESK_CAP = 3
export const KERN_MIN = 3
// Wie interesses koos maar Wereld niet, krijgt de buitenlandse kernrubrieken lichter: een krant met
// buitenland, maar Binnenland krijgt eerder een tweede zetel (feedback 31 oktober: de eerste Editie
// van een nieuwe lezer met Binnenland was half buitenland).
export const KERN_INT_W = 0.7
// De voorpagina: de FRONT zwaarste verhalen met ≥ FRONT_MIN bronnen, voor iedereen gelijk, plus
// elk verhaal vanaf FRONT_BIG bronnen, tot hooguit FRONT_MAX.
export const FRONT = 2
export const FRONT_MIN = 6
export const FRONT_BIG = 10
export const FRONT_MAX = 3
// Een Nederlandse krant (feedback 31 oktober: de eerste Editie had alleen buitenland bovenaan):
// - voor het belang telt een bron van buiten Nederland half (NL_OTHER_W): `eff` = NL-bronnen +
//   0,5 × de rest; het label houdt de echte telling;
// - op de voorpagina alleen verhalen met minstens FRONT_NL_MIN Nederlandse bronnen, en hooguit één
//   buitenlands verhaal (een buitenlandse rubriek, of minder dan de helft Nederlandse bronnen; feedback
//   31 oktober: Polen én Call of Duty in Korea bovenaan was voor de vriendin te veel buitenland);
// - staat er dan nog geen Nederlands verhaal op, dan komt het zwaarste met minstens FRONT_NL_HOME
//   Nederlandse bronnen erbij (een Nederlands verhaal: niet buitenlands);
// - groot nieuws (vanaf FRONT_BIG bronnen) dat niet op de voorpagina past, krijgt toch een plek;
// - wie interesses koos, krijgt buiten de voorpagina hooguit INT_MAX buitenlandse plekken zonder
//   persoonlijke reden (een interessepunt van minstens MIN_WHY_PTS).
export const NL_OTHER_W = 0.5
export const FRONT_NL_MIN = 2
export const FRONT_NL_HOME = 3
export const INT_MAX = 1
const PLAN_DESKS = [...KERN, ...OWN_DESKS] // vaste volgorde: bij gelijke stand wint de eerste

// De zetels voor `seats` plekken, in de volgorde waarin ze worden toegekend. Zonder keuzes is dat
// precies KERN: de gewone krant. `front`: de rubrieken die de voorpagina al heeft (st.desk, voor
// iedereen gelijk); die tellen mee voor de kernregel. `filled`: rubrieken die al een plek hebben (de
// voorpagina en groot nieuws, in selectForReader): die tellen als toegekende zetel, zodat de volgende
// zetel in die rubriek pas later komt. Uitvoer: { order, weights } (weights afgerond, ter inzage).
export function deskPlan(prof, seats, front = [], filled = []) {
  const w = {}
  const chose = Object.keys(prof?.family || {}).length > 0
  const world = (prof?.family?.wereld || 0) >= OUTSIDE_FAMILY
  for (const d of PLAN_DESKS) w[d] = KERN.includes(d) ? (chose && !world && FOREIGN_DESKS.has(d) ? KERN_INT_W : 1) : 0
  const best = {}
  for (const [t, v] of Object.entries(prof?.topicP || {})) {
    if (v <= 0) continue
    for (const d of TOPIC_DESK[t] || []) best[d] = Math.max(best[d] || 0, v)
  }
  for (const d of PLAN_DESKS) if (best[d]) w[d] += DESK_GAIN * best[d]
  // Wie Binnenland koos, wil Nederland, niet alleen zijn thema's (wonen, zorg...): Binnenland krijgt
  // het gewicht van die thema's nog een keer, als land (feedback 31 oktober: de vriendin wilde
  // Binnenland in haar Editie, en kreeg één Binnenland-zetel tegen twee voor Wetenschap).
  if (prof?.family?.binnenland > 0) w.binnenland += DESK_GAIN * prof.family.binnenland
  // Regio alleen als je een regiobron volgt: anders blijft die zetel leeg en gaat de plek naar het
  // zwaarste wat er over is.
  if (prof?.followed?.size && prof?.catOf && ![...prof.followed].some((id) => prof.catOf.get(id) === 'regio')) w.regio = 0
  const got = {}
  for (const d of PLAN_DESKS) got[d] = 0
  for (const d of filled) if (d in got) got[d]++
  const order = []
  while (order.length < seats) {
    let pick = null
    let bq = 0
    for (const d of PLAN_DESKS) {
      if (got[d] >= DESK_CAP || w[d] <= 0) continue
      const q = w[d] / (2 * got[d] + 1)
      if (q > bq + 1e-9) {
        pick = d
        bq = q
      }
    }
    if (!pick) break
    got[pick]++
    order.push(pick)
  }
  // Een krant, geen bubbel: zijn er met de voorpagina nog geen KERN_MIN kernrubrieken, dan ruilt de
  // laatst toegekende dubbele zetel voor de zwaarste kernrubriek die nog ontbreekt. Een zetel in een
  // rubriek die de voorpagina al heeft, is ook dubbel. Gelijk aan het prototype: een eigen pagina die
  // er maar één keer staat, blijft altijd staan.
  const all = () => [...front, ...order]
  const kernIn = () => new Set(all().filter((d) => KERN.includes(d))).size
  const heaviest = [...KERN].sort((a, b) => w[b] - w[a] || KERN.indexOf(a) - KERN.indexOf(b))
  for (const d of heaviest) {
    if (kernIn() >= KERN_MIN) break
    if (all().includes(d)) continue
    for (let i = order.length - 1; i >= 0; i--) {
      if (all().filter((x) => x === order[i]).length > 1) {
        order[i] = d
        break
      }
    }
  }
  const weights = {}
  for (const d of PLAN_DESKS) weights[d] = Math.round(w[d] * 100) / 100
  return { order, weights }
}

// Welke rubrieken een kandidaat kan vullen: zijn hoofdrubriek, plus je eigen pagina's als een
// bericht over dat gebied gaat (Regio niet op onderwerp) of van een vakbron daarvoor komt.
const OWN_DESK_FAMILY = { tech: 'tech', economie: 'economie', regio: 'binnenland' }
const OWN_DESK_CAT = { tech: ['tech'], economie: ['economie'], regio: ['regio'] }
const OWN_DESK_TOPICS = Object.fromEntries(OWN_DESKS.map((d) => [d, new Set(INTERESTS.find((f) => f.id === OWN_DESK_FAMILY[d]).topics)]))
export function servesDesks(items = [], primary = null, prof) {
  const out = new Set(primary ? [primary] : [])
  for (const d of OWN_DESKS) {
    const byTopic = d !== 'regio' && items.some((i) => (i.topics || []).some((t) => OWN_DESK_TOPICS[d].has(t)))
    if (byTopic || items.some((i) => OWN_DESK_CAT[d].includes(prof.catOf.get(i.source)))) out.add(d)
  }
  return out
}

// De rubriek die erboven komt te staan. Een eigen pagina gaat voor als het verhaal echt over dat
// gebied gaat (sterkte > 0: een stuk over de beursgang van Anthropic is Tech, geen Binnenland);
// anders de hoofdrubriek. Zonder hoofdrubriek de eigen pagina die het verhaal kan vullen.
export function homeDesk(items = [], primary = null, prof) {
  const s = servesDesks(items, null, prof)
  const strength = (d) => Math.max(0, ...items.flatMap((i) => (i.topics || []).filter((t) => (TOPIC_DESK[t] || []).includes(d)).map((t) => prof.topicP[t] || 0)))
  const ranked = OWN_DESKS.filter((d) => s.has(d))
    .map((d) => ({ d, v: strength(d) }))
    .sort((a, b) => b.v - a.v || OWN_DESKS.indexOf(a.d) - OWN_DESKS.indexOf(b.d))
  if (ranked.length && (ranked[0].v > 0 || !primary)) return ranked[0].d
  return primary || null
}
