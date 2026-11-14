import { excludedFromEdition } from '../../shared/editie-filter.mjs'
import { opinieBron } from '../../shared/opinie.mjs'
// "Buiten je bubbel" — pure functies (getest in tests/bubble.test.mjs).
// Drie gratis signalen voor waar anderen over praten (Google Trends NL, trending op Bluesky,
// meestgelezen Wikipedia-pagina's) worden vergeleken met álle beschikbare berichten, ook van
// bronnen die je niet volgt. Wat matcht en níét in je editie zit, is je blik naar buiten.
//
// De persoonlijke Editie (De Redacteur, src/lib/personal.js) kiest daaruit wat buiten jóúw profiel
// valt; daarom levert de server meer kandidaten, gespreid over de gebieden (bubbleCandidates), en
// een twaalftal brede verhalen voor de terugval "Naast je bubbel" (nearStories).
import { FAMILY_OF, isSport as sportVanStuk } from '../../shared/editor.mjs'
import { INTERESTS } from '../../src/lib/topics.js'
import { keywordTopics } from './topics.mjs'

// Sport hoort niet op de bubbelplek. Eén regel voor de server (pickBubble) en de scorekaart: de broncategorie, een
// sportonderwerp of -trefwoord, een sportrubriek in de link of sport zonder eigen onderwerp (isSport in
// shared/editor.mjs), of een verhaal dat sport is (`story.sport`, stories.mjs). Nachttest 14 november (R1): een
// RTL-stuk onder /nieuws/sport/ zonder onderwerpen stond als Buiten je bubbel in de algemene Avondeditie.
const SPORT_TOPICS = new Set(['voetbal', 'f1', 'wielrennen', 'tennis', 'wintersport', 'olympisch'])
export function sportOpBubbel(i, { catOf = null, story = null } = {}) {
  if (!i) return false
  if (story?.sport) return true
  if (catOf?.get(i.source) === 'sport') return true
  if ((i.topics || []).some((t) => SPORT_TOPICS.has(t))) return true
  if (keywordTopics(`${i.title || ''} ${i.summary || ''}`).some((t) => SPORT_TOPICS.has(t))) return true
  return sportVanStuk(i, catOf)
}

const STOP = new Set(['the', 'and', 'van', 'het', 'een', 'de', 'in', 'of', 'on', 'to', 'for', 'vs', 'with', 'met', 'voor', 'naar', 'over', 'bij', 'uit', 'aan', 'als', 'dat', 'die', 'is', 'zijn', 'wordt', 'week', 'day', 'dag', 'news', 'nieuws', 'live', 'results', 'poll', 'results', 'film', 'miniserie', 'miniseries', 'novel', 'popgroep', 'uit', 'list', 'deaths', 'page', 'main', 'special', 'speciaal', 'hoofdpagina', 'wikipedia', 'search', 'zoeken'])
// Pagina's en termen die nooit nieuws zijn.
const SKIP = /^(main_page|hoofdpagina|speciaal:|special:|wikipedia:|portal:|help:|deaths_in_|list_of_|lijst_van_|mathematics|nettiquette|daily search trends)/i

export function termWords(term) {
  return String(term || '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, ' ') // "(film)", "(2026 miniseries)"
    .replace(/_/g, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w))
}

// Signaal → bruikbare termen, met gewicht per bron en rang.
export function cleanTerms(raw) {
  const out = []
  const seen = new Set()
  for (const { term, via, rank = 0 } of (raw || []).filter(Boolean)) {
    if (!term || typeof term === 'object' || SKIP.test(term)) continue // een object werd anders "[object Object]"
    const words = termWords(term)
    if (!words.length) continue
    const key = words.join(' ')
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ term: String(term).replace(/_/g, ' '), via, rank, words })
  }
  return out
}

const WEIGHT = { google: 3, bluesky: 2, wikipedia: 2 }

function textWords(a) {
  return new Set(`${a.title || ''} ${a.summary || ''}`.toLowerCase().split(/[^\p{L}\p{N}]+/u))
}

// Een term past bij een bericht als (vrijwel) alle woorden erin voorkomen: 1–2 woorden
// allemaal, langere termen minstens twee. Zo matcht "Navanethem Pillay" wel en "poll" niet.
export function termMatches(words, textSet) {
  const hit = words.filter((w) => textSet.has(w)).length
  if (words.length <= 2) return hit === words.length
  return hit >= 2
}

// Kiest hooguit `max` berichten die bij de signalen passen en niet in de editie zitten.
// Eén per verhaal; meerdere signalen wegen zwaarder, dan recentheid.
export function matchTrending(rawTerms, articles, { excludeItemIds = new Set(), excludeStoryIds = new Set(), coveredTitles = [], max = 3, now = Date.now() } = {}) {
  // Signalen die de editie zelf al dekt tellen niet: "buiten je bubbel" moet iets anders zijn dan wat je al krijgt.
  // Per woord getoetst (frisse ogen · 1): "Pete Hegseth" is gedekt zodra "Hegseth" in een kop van de Editie staat.
  const covered = textWords({ title: coveredTitles.join(' ') })
  const terms = cleanTerms(rawTerms).filter((t) => !termCovered(t.words, covered))
  if (!terms.length) return []
  const scored = []
  for (const a of articles) {
    if (!a || !a.id || excludeItemIds.has(a.id) || (a.storyId && excludeStoryIds.has(a.storyId))) continue
    if ((a.kind && a.kind !== 'article') || excludedFromEdition(a)) continue
    const text = textWords(a)
    const hits = terms.filter((t) => termMatches(t.words, text))
    if (!hits.length) continue
    const vias = new Set(hits.map((h) => h.via))
    const score = hits.reduce((s, h) => s + (WEIGHT[h.via] || 1), 0) + (vias.size > 1 ? 2 : 0)
    const t = Date.parse(a.publishedAt)
    const age = Number.isFinite(t) ? Math.max(0, now - t) : 1e12 // zonder (geldige) tijd: achteraan
    scored.push({ a, score, age, hits })
  }
  scored.sort((x, y) => y.score - x.score || x.age - y.age)
  const out = []
  const usedStories = new Set()
  for (const s of scored) {
    const key = s.a.storyId || s.a.id
    if (usedStories.has(key)) continue
    usedStories.add(key)
    out.push({ id: s.a.id, storyId: s.a.storyId || null, terms: s.hits.map((h) => ({ term: h.term, via: h.via })) })
    if (out.length >= max) break
  }
  return out
}

// ---------- Harde eisen (frisse ogen · 1, besluit van Alex 11 november) ----------
// Het laatste stuk bepaalt het gevoel bij het loslaten. Buiten je bubbel is daarom: gratis, jonger dan een etmaal, geen
// liveblog, geen sport, geen naam die al in een kop van de Editie staat (per woord) en niet al eerder getoond (vandaag of
// in de vorige Editie). Lukt dat niet, dan blijft de plek in de algemene Editie leeg.
export const BUBBLE_HOURS = 24
// Een term is gedekt als één van zijn woorden in een kop van de Editie staat.
export const termCovered = (words, covered) => words.some((w) => covered.has(w))
// De woorden van koppen, elk woord los ("defensieminister Hegseth" → defensieminister, hegseth).
export const headWords = (titles = []) => textWords({ title: titles.filter(Boolean).join(' ') })
// Lidwoorden, voorzetsels en werkwoorden die in een Engelse kop een hoofdletter krijgen: geen naam.
const NOT_NAME = new Set([...STOP, ...'after amid also back been before being both does down every from have here into just more most much must next only over says said than that their them then there these they this those very what when where which while will with would your about after again against also another because before could first former good great just like little long made make many might never other same should some still such take than then time under well were what years zegt zeggen wil willen moet kunnen gaat komt maakt heeft hebben worden werd waren niet meer veel weer toch maar want omdat zoals tegen tussen onder door nieuwe nieuw grote groot eerste laatste deze hier daar wordt waar wat hoe wie waarom wanneer'.split(' ')])
// De namen in een kop: woorden met een hoofdletter (niet het eerste woord), minstens drie letters, klein geschreven.
export function namesIn(title = '') {
  const words = String(title).replace(/[’'`]s\b/g, '').split(/[^\p{L}\p{N}-]+/u).filter(Boolean)
  const out = []
  for (let k = 1; k < words.length; k++) {
    for (const part of words[k].split('-')) {
      if (part.length >= 3 && /^\p{Lu}/u.test(part) && !NOT_NAME.has(part.toLowerCase())) out.push(part.toLowerCase())
    }
  }
  return [...new Set(out)]
}
// Waarom een stuk niet op de bubbelplek mag, of null. `heads`: de woorden van de koppen van de Editie (headWords);
// `terms`: de signalen waarop het stuk gekozen werd; `shownToday(a)`: stond het (of zijn gebeurtenis) vandaag of in de
// vorige Editie al.
export function bubbleRejection(a, { isFree = () => false, isSport = () => false, isLive = () => false, now = Date.now(), heads = new Set(), terms = [], shownToday = () => false, hours = BUBBLE_HOURS } = {}) {
  if (!a || a.kind && a.kind !== 'article') return 'geen-artikel'
  if (!isFree(a.source)) return 'betaald'
  const t = Date.parse(a.publishedAt)
  if (!Number.isFinite(t) || now - t >= hours * 36e5) return 'ouder-dan-24-uur'
  if (isLive(a)) return 'liveblog'
  if (isSport(a)) return 'sport'
  if (shownToday(a)) return 'eerder-getoond'
  const name = [...namesIn(a.title), ...terms.flatMap((x) => termWords(x.term || x))].find((w) => heads.has(w))
  if (name) return `naam-al-in-kop:${name}`
  return null
}

// ---------- Kandidaten voor de persoonlijke Editie ----------
export const BUBBLE_CANDIDATES = 6 // zoveel kandidaten naast het stuk in de algemene Editie
export const BUBBLE_PER_AREA = 2 // hooguit zoveel per gebied: niet zes keer voetbal
export const NEAR_MAX = 12
export const NEAR_MIN_SOURCES = 3
export const NEAR_HOURS = 24

// Gebied van een bron zonder onderwerp: een sportbron is sport, een vakbron tech of wetenschap.
const FAMILY_OF_CAT = Object.fromEntries(INTERESTS.flatMap((f) => (f.cats || []).map((c) => [c, f.id])))

// De gebieden (Sport, Tech …) van een bericht: uit zijn onderwerpen, anders uit de rubriek van zijn bron.
// Zonder onderwerp en zonder vakbron: geen gebied (gewoon nieuws, dat telt niet mee voor de spreiding).
export function areasOf(item, cat = null) {
  const fams = [...new Set((item?.topics || []).map((t) => FAMILY_OF[t]).filter(Boolean))]
  if (fams.length) return fams
  return FAMILY_OF_CAT[cat] ? [FAMILY_OF_CAT[cat]] : []
}

// Voegt lijsten van matchTrending samen (eerst Nederlandstalig, dan de rest), één per verhaal, met
// hooguit `perArea` per gebied. Het eerste stuk komt altijd mee: dat is het stuk dat de algemene
// Editie al kreeg, zodat die niet verandert.
export function bubbleCandidates(lists, { max = 1 + BUBBLE_CANDIDATES, perArea = BUBBLE_PER_AREA, areaOf = () => [] } = {}) {
  const out = []
  const used = new Set()
  const count = new Map()
  for (const list of lists) {
    for (const p of list || []) {
      if (out.length >= max) return out
      if (!p?.id || used.has(p.id) || (p.storyId && used.has(p.storyId))) continue
      const areas = [...new Set(areaOf(p) || [])]
      if (areas.some((a) => (count.get(a) || 0) >= perArea)) continue
      used.add(p.id)
      if (p.storyId) used.add(p.storyId)
      for (const a of areas) count.set(a, (count.get(a) || 0) + 1)
      out.push(p)
    }
  }
  return out
}

// "Naast je bubbel": breed gedekte verhalen (≥ 3 bronnen) van het afgelopen etmaal, met
// onderwerpen (anders weet de lezer niet waar het naast ligt) en een gratis kop, zonder sport.
// Breedste eerst, bij gelijke stand op id. Zelfde vorm als `wide` (widelyCovered in stories.mjs).
export function nearStories(stories = [], byId = new Map(), { isFree = () => false, isDutch = () => false, isSport = () => false, isLive = () => false, now = Date.now(), min = NEAR_MIN_SOURCES, max = NEAR_MAX, hours = NEAR_HOURS } = {}) {
  const out = []
  const recent = stories.filter((st) => st && st.sourceCount >= min && now - Date.parse(st.latestAt) < hours * 36e5)
  for (const st of recent.sort((a, b) => b.sourceCount - a.sourceCount || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    if (out.length >= max) break
    const items = (st.itemIds || []).map((id) => byId.get(id)).filter(Boolean)
    if (!items.length || items.some(isSport)) continue
    const topics = [...new Set(items.flatMap((i) => i.topics || []))]
    if (!topics.length) continue
    const free = items.filter((i) => isFree(i.source) && !excludedFromEdition(i) && !isLive(i) && i.type !== 'opinie' && !opinieBron(i.source))
    const lead = free.find((i) => isDutch(i.source) && i.summary) || free.find((i) => i.summary) || free[0]
    if (!lead) continue
    out.push({ storyId: st.id, sourceCount: st.sourceCount, topics, item: lead })
  }
  return out
}

// Tekst voor het AI-overzicht van de editie: wat het model mag gebruiken, en niets anders.
// Eén regel per verhaal. Zonder samenvatting staat er "[alleen kop]": daar mag het overzicht
// niets uit afleiden (zie de regels in brief.mjs).
export function briefInput(rows) {
  return rows
    .map((r, i) => `${i + 1}. [${r.sourceName}] ${r.title}${r.summary ? ` — ${r.summary}` : ' [alleen kop]'}`)
    .join('\n')
}

// Eén optioneel bubbelverhaal staat na de genummerde reeks; het verdringt geen Editieplek.
export function insertBubble(entries, pick, { size = 10 } = {}) {
  if (!pick) return entries
  const regular = entries.filter(e=>e.desk !== 'bubbel').slice(0,size)
  if (regular.some(e=>e.id === pick.id || e.leadId === pick.id || e.itemIds?.includes(pick.id) || (pick.storyId && e.kind === 'story' && e.id === pick.storyId))) return regular
  return [...regular,{kind:'item',id:pick.id,desk:'bubbel',terms:pick.terms}]
}
