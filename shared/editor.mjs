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
import { DESKS, DESK_LABEL, desksOf, storyForeignOf, isNonEuropean, VL_HOME, NL_HOME } from '../netlify/lib/desks.mjs'
import { shownTopics, keywordTopics, OTHER_SPORT } from '../netlify/lib/topics.mjs'

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
  const inherited = new Set()
  for (const f of INTERESTS) {
    if (!interests.includes(f.id)) continue
    const picked = f.topics.filter((t) => topics.includes(t))
    const sharp = picked.length > 0 && picked.length < f.topics.length
    for (const t of f.topics) {
      expl[t] = sharp ? (picked.includes(t) ? 1 : 0) : W_INHERITED
      if (!sharp) inherited.add(t)
    }
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
    // Geërfd: de hele interesse gekozen, niet dit onderwerp (en geen "meer hiervan"). Het waarom noemt dan
    // de interesse, niet het onderwerp (feedback 31 oktober: "Omdat je Den Haag volgt" voor wie Politiek
    // koos, bij rellen in de stad Den Haag).
    origin[t] = r > e ? 'geleerd' : inherited.has(t) && !((tt[t] || 0) > 0) ? 'geërfd' : 'gekozen'
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
  return { topicP, origin, family, sourceP, shareOf, favorites: new Set(favorites), followed, catOf, interests: new Set(interests) }
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
// Sport is sport (feedback 31 oktober: Aston Villa die naar de rechter stapt tegen Carragher was "Misdaad
// & recht", en telde als Nederlands): een sportbericht krijgt geen onderwerp of treffer van Binnenland.
// Sport: een sportonderwerp, een sportbron, een sport-URL of sport zonder eigen onderwerp (darts).
const SPORT_URL = /\/(sport|voetbal|premier-league|eredivisie|formule-1|wielrennen|tennis)\//i
export function isSport(item, catOf = null) {
  if ((item.topics || []).some((t) => FAMILY_OF[t] === 'sport')) return true
  if (catOf?.get(item.source) === 'sport') return true
  return SPORT_URL.test(item.url || '') || /\b(eredivisie\w*|voetbalwedstrijd\w*)\b/i.test(`${item.title || ''} ${item.summary || ''}`) || OTHER_SPORT.test(`${item.title || ''} ${item.summary || ''}`)
}
// Politiek zonder Wereld is Nederlandse en Europese politiek (feedback 31 oktober: wie Binnenland,
// Politiek en Economie koos, opende met de paus die in Amerika stemt, Lula en Wall Street "omdat je
// Trump volgt"): VS-politiek en Trump tellen dan alleen als je dat onderwerp zelf koos, en bij een
// buitenlands bericht telt een geërfd onderwerp van Politiek alleen als het Europa is.
const US_TOPICS = new Set(['vs-politiek', 'trump'])
// Een Europese bron maakt niet-Europese politiek geen Europese (feedback 31 oktober: een interview met de
// Canadese premier Carney van Politico Europe was "Omdat je Politiek volgt" voor wie Binnenland en Politiek
// koos): `europa` telt bij een buitenlands bericht alleen als de kop geen niet-Europees land of werelddeel
// noemt (isNonEuropean). `area`: het onderwerpsgebied van de rubriek van het verhaal (areaOfDesk).
// Een verhaal over politiek in het buitenland (VS, Midden-Oosten, Oekraïne, of een bericht met VS-politiek
// of Trump als onderwerp) krijgt geen label uit een ander vakgebied (feedback 31 oktober: Texaanse
// Republikeinen was "Omdat je Wetenschap volgt" via een geërfd onderwerp gezondheid, Talarico "Tech"):
// zo'n onderwerp mag punten geven, maar kan het waarom niet zijn, tenzij de bron zelf een vakbron van dat
// gebied is (The Verge over Trump en chips blijft Tech) en het verhaal niet in een politiekrubriek staat.
const POLITICS_DESKS = new Set(['vs', 'middenoosten', 'oekraine'])
const POLITICS_FAMILIES = new Set(['politiek', 'wereld', 'economie', 'binnenland'])
const politicsItem = (i, deskOfStory = null) => POLITICS_DESKS.has(deskOfStory) || [...desksOf(i)].some((d) => POLITICS_DESKS.has(d) || (FOREIGN_DESKS.has(d) && /\b(vn-top|summit|regering|government|minister|verkiezingen|elections|onderhandelingen)\b/i.test(i.title || ''))) || (i.topics || []).some((t) => US_TOPICS.has(t))
function topicHits(item, prof, geo = null, area = null, politics = false) {
  const sport = isSport(item, prof.catOf)
  const ts = (item.topics || []).filter((t) => !(sport && FAMILY_OF[t] === 'binnenland' && prof.topicP[t] > 0))
  const abroad = geo === 'int' && !VL_HOME.has(item.source)
  const world = (prof.family.wereld || 0) >= OUTSIDE_FAMILY
  const notChosenPol = (t) => !world && FAMILY_OF[t] === 'politiek' && prof.topicP[t] > 0 && prof.origin?.[t] === 'geërfd' && (US_TOPICS.has(t) || (abroad && (t !== 'europa' || isNonEuropean(item))))
  // Amerikaanse politiek zonder Wereld: alleen Politiek of Wereld kan het waarom zijn. Economie telt hier
  // alleen met een zakenbron of een zakenkop (feedback 31 oktober: "Trump and GOP Close Midterms With Ugly
  // Personal Attacks" was "Omdat je Economie volgt" via 'inflation' in de intro).
  const headTopics = politics ? keywordTopics(item.title || '') : []
  const politicsWhy = (t) => FAMILY_OF[t] === 'politiek' || FAMILY_OF[t] === 'wereld' || (FAMILY_OF[t] === 'economie' && (FAMILY_OF_CAT[prof.catOf?.get(item.source)] === 'economie' || headTopics.includes(t)))
  // VS-politiek is ook geografie: het trefwoord "verkiezing" maakte van Lula's zege in Brazilië VS-politiek.
  const notUs = ts.includes('vs-politiek') && !desksOf(item).has('vs')
  // `seen`: kop of intro noemt het onderwerp zelf (shownTopics); alleen zo'n treffer mag het waarom zijn.
  const vis = shownTopics(item)
  const out = ts.filter((t) => prof.topicP[t] !== undefined && !(abroad && FAMILY_OF[t] === 'binnenland' && prof.topicP[t] > 0) && !(notUs && t === 'vs-politiek' && prof.topicP[t] > 0) && !notChosenPol(t)).map((t) => ({ t, f: FAMILY_OF[t], v: prof.topicP[t], s: item.source, seen: (!vis || vis.includes(t)) && !(politics && !POLITICS_FAMILIES.has(FAMILY_OF[t]) && (politics === 'desk' || FAMILY_OF_CAT[prof.catOf?.get(item.source)] !== FAMILY_OF[t])) && !(politics && !world && !politicsWhy(t)) }))
  // Een aantoonbare wetenschappelijke hoofdzaak telt ook voor de gekozen familie wanneer een
  // secundaire AI-tag aanwezig is; algemene wetenschap past niet altijd in één van de vijf subtopics.
  if (area && !politics && prof.family[area] > 0 && !out.some(h => h.f === area && h.v > 0)) out.push({ t: `gebied:${area}`, f: area, v: Math.min(prof.family[area], W_INHERITED), s: item.source, seen: true })
  const fb = prof.family.binnenland || 0
  if (fb > 0 && geo === 'nl' && !sport) out.push({ t: GEO_NL, f: 'binnenland', v: Math.min(fb, W_INHERITED), s: item.source, seen: true })
  if (!ts.length) {
    const cat = prof.catOf.get(item.source)
    const fam = cat && INTERESTS.find((f) => f.cats.includes(cat))
    // De rubriek van het verhaal gaat voor de rubriek van de hele bron (feedback 31 oktober: Wired over
    // witte dwergen, een wetenschapsverhaal, was "Omdat je Tech volgt"): is het verhaal Wetenschap, dan telt
    // het voor Wetenschap, en wie dat niet koos krijgt geen vakreden.
    const famId = area && fam && area !== fam.id ? area : fam?.id
    if (famId && prof.family[famId]) out.push({ t: `bron:${famId === fam.id ? cat : famId}`, f: famId, v: SOURCE_CAT_P * prof.family[famId], s: item.source, seen: true })
  }
  return out
}
const strongestFirst = (a, b) => b.v - a.v || byId(a.t, b.t)

// Waar een bericht over gaat: 'nl' (Binnenland), 'int' (buitenland) of null. De rubriek van het
// verhaal (`desk`, voor iedereen gelijk) gaat voor; anders het bericht zelf, in de context van zijn
// verhaal: een verhaal met vooral buitenlandse bronnen (`foreign`) is buitenland, ook als het
// NOS-stuk erover geen land noemt (Christa Pike, de mislukte executie in de VS).
// De rubriek van een verhaal als onderwerp (niet als plaats): Wetenschap. Binnenland en de buitenlandse
// rubrieken zeggen waar het speelt, niet waar het over gaat; een techbron over een ontdekking in de
// sterrenkunde is Wetenschap.
export const areaOfDesk = (desk) => (desk === 'wetenschap' ? 'wetenschap' : null)

export function geoOf(item, desk = null, foreign = false) {
  if (desk === 'binnenland') return 'nl'
  if (FOREIGN_DESKS.has(desk)) return 'int'
  const ds = desksOf(item, { storyForeign: foreign })
  for (const d of ds) if (FOREIGN_DESKS.has(d)) return 'int' // zoals primaryDesk: het land gaat voor
  if (ds.has('binnenland')) return 'nl'
  // VS-politiek of Trump uit een bron van buiten Nederland is buitenland, ook zonder rubriek (feedback
  // 31 oktober: een NYT-stuk over een senaatsverkiezing zonder VS-rubriek kwam als "Het nieuws van nu" binnen).
  if (!NL_HOME.has(item.source) && (item.topics || []).some((t) => US_TOPICS.has(t))) return 'int'
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
  // 'desk': de rubriek van het verhaal zelf is VS, Midden-Oosten of Oekraïne (ook een techbron verandert dat niet).
  const politicsOf = (i) => (POLITICS_DESKS.has(story.desk) ? 'desk' : politicsItem(i))
  const hits = items.map((i) => topicHits(i, prof, geoOf(i, story.desk ?? null, foreign), areaOfDesk(story.desk ?? (items.length === 1 && desksOf(i).has('wetenschap') ? 'wetenschap' : null)), politicsOf(i)))
  const flat = hits.flat()
  const pos = flat.filter((h) => h.v > 0).sort(strongestFirst)
  if (pos.length) {
    const best = pos[0]
    const cover = hits.filter((hs) => hs.some((h) => h.v > 0)).length / items.length
    // Het label komt van de treffer die het verhaal het best dekt (dekking × waarde), niet van
    // het ene bericht met het sterkste onderwerp: een gemengd verhaal is geen VS-politiek omdat
    // één stuk dat is.
    // Een stuk van een vakbron zonder onderwerp (NOS Cultuur over de dood van Patrick Stewart) telt mee
    // voor het onderwerp van hetzelfde gebied dat de andere stukken noemen: "Film & series", niet "Uit je
    // vakbronnen". Alleen een onderwerp dat kop of intro noemt (`seen`) kan het label zijn; is er geen,
    // dan geeft de interesse wel punten maar geen waarom (`shown: false`).
    const vak = (h) => h.t.startsWith('bron:')
    const coverOf = (l) => hits.filter((hs) => hs.some((h) => h.t === l.t || (vak(h) && !vak(l) && h.f === l.f))).length / items.length
    const seenPos = pos.filter((h) => h.seen)
    const label = [...new Map((seenPos.length ? seenPos : pos).map((h) => [h.t, h])).values()]
      .map((h) => ({ ...h, c: coverOf(h) * h.v }))
      .sort((a, b) => b.c - a.c || (a.t === GEO_NL) - (b.t === GEO_NL) || strongestFirst(a, b))[0] // het onderwerp zelf gaat voor "Binnenland"
    // `cov`: welk deel van de berichten het label draagt (voor chosenReason: één stuk met "Trump" in een
    // verhaal van dertien is geen reden van het verhaal).
    parts.interest = { pts: Math.round(P.INTEREST * best.v * (0.5 + 0.5 * cover)), t: label.t, f: label.f, origin: prof.origin?.[label.t] || 'gekozen', cov: coverOf(label), ...(seenPos.length ? {} : { shown: false }) }
    // Een snijvlak alleen als beide gebieden het verhaal echt raken (feedback 31 oktober: "Raakt
    // Wetenschap én Binnenland" bij de rellen in Den Haag, door het trefwoord "angst"; "Raakt Cultuur
    // én Wetenschap" bij een animeprijs van Variety): elk gebied in meer dan de helft van de berichten,
    // en een vakbron telt alleen voor zijn eigen gebied (Variety is Cultuur, geen Gezondheid).
    const famCat = (h) => FAMILY_OF_CAT[prof.catOf?.get(h.s)]
    const crossHits = hits.map((hs) => hs.filter((h) => h.v >= CROSS_MIN && h.seen && (!famCat(h) || famCat(h) === h.f)))
    const famCover = (f) => crossHits.filter((hs) => hs.some((h) => h.f === f)).length * 2 > items.length
    const cross = pos.filter((h) => h.v >= CROSS_MIN && h.seen && famCover(h.f))
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
// Een gekozen reden voor een verhaal: een interessepunt van minstens MIN_WHY_PTS dat minstens de helft
// van de berichten draagt (het verhaal als geheel, niet één los bericht; feedback
// 31 oktober: de G20 met "Trump" in één van dertien stukken was geen gekozen reden).
export const chosenReason = (parts = {}) => {
  const it = parts.interest
  // Een reden die het waarom niet kan noemen (kop of intro noemen het onderwerp niet, `shown: false`) is geen reden.
  if (!it || (it.pts || 0) < MIN_WHY_PTS || it.shown === false) return false
  // Alleen de rubriek van een vakbron (geen onderwerp) is een reden als al je stukken ervan zijn.
  return String(it.t).startsWith('bron:') ? (it.cov ?? 1) >= 1 : (it.cov ?? 1) * 2 >= 1
}
// Zegt de plek iets bij zichzelf? Een punt van minstens MIN_WHY_PTS dat het waarom ook kan noemen (whyOf).
export const visibleReason = (parts = {}) => Object.entries(parts).some(([k, x]) => (x.pts || 0) >= MIN_WHY_PTS && !(k === 'interest' && x.shown === false))
export const FRONT_SOURCES = 8 // vijf uitgevers uit twee landen wordt via entry.big bewezen
export const DESK_NAMES = { ...DESK_LABEL, tech: 'Tech', economie: 'Economie', regio: 'Regio' }
const WHY_ORDER = ['followUp', 'cross', 'interest', 'favorite', 'mine', 'sourceRead']
const topicLabel = (t) => topicById(t)?.label || t

// `entry`: de plek ({ desk, front, near, vervolg }). `parts`: de persoonlijke punten van de kandidaat.
// `plannedDesk`: de plek kwam uit jouw indeling én die rubriek hoort bij wat je koos (chosenDesks);
// alleen dan "Jouw rubriek", anders gewoon de rubriek. Uitvoer: { code, text }.
export function whyOf(entry = {}, { parts = {}, sourceCount = 0, desk = entry.desk ?? null, plannedDesk = false, labelOf = topicLabel, sourceName = (s) => s, deskLabel = (d) => DESK_NAMES[d] || d } = {}) {
  // Stond in je vorige Editie en ontwikkelde zich: dat gaat vóór elke andere reden, ook op de voorpagina.
  if (entry.vervolg) return { code: 'vervolg', text: `Vervolg · ${entry.vervolg} nieuwe stukken` }
  if (entry.desk === 'extern') return { code: 'extern', text: 'Buiten je bronnen' }
  if (entry.desk === 'bubbel') {
    if (entry.near) return { code: 'buur', text: `Naast je bubbel · grenst aan ${FAMILY_LABEL[entry.near] || entry.near}` }
    return { code: 'bubbel', text: 'Buiten je bubbel · via Google Trends' }
  }
  // Een buitenlands breed verhaal zonder reden (alleen groot nieuws, voor wie Wereld niet koos): groot nieuws.
  if (entry.desk === 'breed') return entry.big ? { code: 'groot', text: `Groot nieuws · ${sourceCount} bronnen` } : { code: 'breed', text: `Waar iedereen over schrijft · ${sourceCount} bronnen` }
  // Groot nieuws is groot: vanaf FRONT_SOURCES bronnen. Een kleiner Nederlands verhaal op de voorpagina
  // (FRONT_NL_HOME) krijgt zijn eigen reden, of zijn rubriek (feedback 31 oktober: "Groot nieuws · 3
  // bronnen" bij het zeehondencentrum).
  if (entry.front && (entry.big ?? sourceCount >= FRONT_SOURCES)) return { code: 'groot', text: `Groot nieuws · ${sourceCount} bronnen` }
  // Het zwaarste part telt; bij gelijke stand de volgorde van de tabel in de bouwspec (§6).
  const rank = (k) => (WHY_ORDER.includes(k) ? WHY_ORDER.indexOf(k) : WHY_ORDER.length)
  const [code, p] = Object.entries(parts).filter(([k, x]) => (x.pts || 0) >= MIN_WHY_PTS && !(k === 'interest' && x.shown === false)).sort((a, b) => b[1].pts - a[1].pts || rank(a[0]) - rank(b[0]) || byId(a[0], b[0]))[0] || []
  if (code === 'followUp') return { code, text: `Vervolg op wat je las · ${p.n} nieuwe stukken` }
  if (parts.cross && (code === 'interest' || code === 'cross')) return { code: 'cross', text: `Raakt ${FAMILY_LABEL[parts.cross.f[0]]} én ${FAMILY_LABEL[parts.cross.f[1]]}` }
  if (code === 'interest') {
    // Een vakbron zonder onderwerp: het gebied dat je koos (feedback 31 oktober: "Uit je vakbronnen" bij
    // NOS Cultuur over de dood van Patrick Stewart zei de vriendin niets; zij koos Cultuur).
    if (p.t.startsWith('bron:')) return { code: 'vak', text: `Omdat je ${FAMILY_LABEL[p.f] || 'dit gebied'} volgt` }
    if (p.t.startsWith('gebied:')) return { code, text: `Omdat je ${FAMILY_LABEL[p.f] || 'dit gebied'} volgt` }
    if (p.t === GEO_NL) return { code, text: `Omdat je ${FAMILY_LABEL.binnenland} volgt` }
    if (p.origin === 'geërfd') return { code, text: `Omdat je ${FAMILY_LABEL[p.f] || labelOf(p.t)} volgt` }
    if (p.origin === 'geleerd') return { code: 'learned', text: `Omdat je vaak over ${labelOf(p.t)} leest` }
    return { code, text: `Omdat je ${labelOf(p.t)} volgt` }
  }
  if (code === 'favorite') return { code, text: `Uit je voorkeursbron ${sourceName(p.source)}` }
  if (code === 'mine') return { code, text: `${p.n} van je bronnen schrijven erover` }
  if (code === 'sourceRead') return { code, text: 'Uit een bron die je veel leest' }
  if (entry.big ?? sourceCount >= FRONT_SOURCES) return { code: 'groot', text: `Groot nieuws · ${sourceCount} bronnen` }
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
// Het gewicht van een rubriek is 1 (kern; KERN_INT_W voor de buitenlandse kernrubrieken en KERN_SCI_W
// voor Wetenschap als je interesses koos maar Wereld niet) of 0 (eigen pagina; Regio ook 0 zonder regiobron), plus DESK_GAIN ×
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
// De rubrieken die bij je keuzes horen: een gekozen of geërfd onderwerp (niet geleerd, niet "minder")
// dat bij die rubriek hoort. Een kernrubriek die elke krant heeft, is niet "jouw" rubriek (feedback 31
// oktober: "Jouw rubriek Binnenland" voor wie Cultuur en Wetenschap koos).
// Politiek zonder Wereld (zie topicHits): een geërfd onderwerp van Politiek geeft geen buitenlandse
// rubriek (geen VS-zetels voor wie Politiek koos als Den Haag en Brussel).
function topicDesks(t, prof) {
  const ds = TOPIC_DESK[t] || []
  if (FAMILY_OF[t] !== 'politiek' || prof?.origin?.[t] !== 'geërfd' || (prof?.family?.wereld || 0) >= OUTSIDE_FAMILY) return ds
  return ds.filter((d) => !FOREIGN_DESKS.has(d))
}
export function chosenDesks(prof) {
  const out = new Set()
  for (const [t, v] of Object.entries(prof?.topicP || {})) if (v > 0 && prof.origin?.[t] !== 'geleerd') for (const d of topicDesks(t, prof)) out.add(d)
  if (prof?.family?.binnenland > 0) out.add('binnenland')
  else out.delete('binnenland') // Politiek of een los onderwerp is niet de gekozen rubriek Binnenland
  return out
}
export const DESK_CAP = 3
export const KERN_MIN = 3
// Wie interesses koos maar Wereld niet, mag volgens de normen van 1 november alleen groot buitenlands
// nieuws (hooguit twee plekken), en dat staat al op de voorpagina. De buitenlandse kernrubrieken krijgen
// dan geen eigen zetel (KERN_INT_W), en Wetenschap, waarvan het aanbod grotendeels buitenlands is, een
// kleine (KERN_SCI_W): anders vult dezelfde ene Nederlandse plek die zetel bij iedereen. Een gekozen
// onderwerp in zo'n rubriek telt wel (DESK_GAIN), en de kernregel (KERN_MIN) blijft.
export const KERN_INT_W = 0
export const KERN_SCI_W = 0.2
// De voorpagina: de FRONT zwaarste verhalen met ≥ FRONT_MIN bronnen, voor iedereen gelijk, plus
// elk verhaal vanaf FRONT_BIG bronnen, tot hooguit FRONT_MAX.
export const FRONT = 2
export const FRONT_MIN = 6
export const FRONT_BIG = 8
export const FRONT_MAX = 3
// Dekking telt gelijk, ongeacht de taal/vestigingsplaats van een uitgever. Nederlandse actualiteit
// houdt een plek voor wie Binnenland koos; voor wie Wereld koos geldt geen Nederlandse toegangsdrempel.
export const NL_OTHER_W = 1
export const FRONT_NL_MIN = 2
export const FRONT_NL_HOME = 3
export const INT_MAX = 2
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
  for (const d of PLAN_DESKS) w[d] = !KERN.includes(d) ? 0 : !chose || world ? 1 : FOREIGN_DESKS.has(d) ? KERN_INT_W : d === 'wetenschap' ? KERN_SCI_W : 1
  const best = {}
  for (const [t, v] of Object.entries(prof?.topicP || {})) {
    if (v <= 0) continue
    for (const d of topicDesks(t, prof)) best[d] = Math.max(best[d] || 0, v)
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
    // Een verhaal over politiek in het buitenland (politicsItem) is geen Tech- of Economie-verhaal omdat de
    // tagger er "tech" bij zette (Talarico, Trump en de midterms): alleen een vakbron van dat gebied telt.
    const byTopic = d !== 'regio' && items.some((i) => !politicsItem(i) && (i.topics || []).some((t) => OWN_DESK_TOPICS[d].has(t)))
    if (byTopic || items.some((i) => OWN_DESK_CAT[d].includes(prof.catOf.get(i.source)))) out.add(d)
  }
  return out
}

// De rubriek die erboven komt te staan. Een eigen pagina gaat voor als het verhaal echt over dat
// gebied gaat (sterkte > 0: een stuk over de beursgang van Anthropic is Tech, geen Binnenland);
// anders de hoofdrubriek. Zonder hoofdrubriek de eigen pagina die het verhaal kan vullen.
export function homeDesk(items = [], primary = null, prof) {
  // Het VS-, Midden-Oosten- of Oekraïneverhaal blijft daar staan, ook als één stuk uit een techbron komt
  // (Talarico met een Wired-stuk over Musk was "Omdat je Tech volgt").
  if (POLITICS_DESKS.has(primary)) return primary
  const s = servesDesks(items, null, prof)
  const strength = (d) => Math.max(0, ...items.flatMap((i) => (i.topics || []).filter((t) => (TOPIC_DESK[t] || []).includes(d)).map((t) => prof.topicP[t] || 0)))
  const ranked = OWN_DESKS.filter((d) => s.has(d))
    .map((d) => ({ d, v: strength(d) }))
    .sort((a, b) => b.v - a.v || OWN_DESKS.indexOf(a.d) - OWN_DESKS.indexOf(b.d))
  if (ranked.length && (ranked[0].v > 0 || !primary)) return ranked[0].d
  return primary || null
}
