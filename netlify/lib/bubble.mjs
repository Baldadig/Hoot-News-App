// "Buiten je bubbel" — pure functies (getest in tests/bubble.test.mjs).
// Drie gratis signalen voor waar anderen over praten (Google Trends NL, trending op Bluesky,
// meestgelezen Wikipedia-pagina's) worden vergeleken met álle beschikbare berichten, ook van
// bronnen die je niet volgt. Wat matcht en níét in je editie zit, is je blik naar buiten.
//
// De persoonlijke Editie (De Redacteur, src/lib/personal.js) kiest daaruit wat buiten jóúw profiel
// valt; daarom levert de server meer kandidaten, gespreid over de gebieden (bubbleCandidates), en
// een twaalftal brede verhalen voor de terugval "Naast je bubbel" (nearStories).
import { FAMILY_OF } from '../../shared/editor.mjs'
import { INTERESTS } from '../../src/lib/topics.js'

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
  // Signalen die de editie zelf al dekt (de naam staat in een kop van de editie) tellen niet:
  // "buiten je bubbel" moet iets anders zijn dan wat je al krijgt.
  const covered = textWords({ title: coveredTitles.join(' ') })
  const terms = cleanTerms(rawTerms).filter((t) => !termMatches(t.words, covered))
  if (!terms.length) return []
  const scored = []
  for (const a of articles) {
    if (!a || !a.id || excludeItemIds.has(a.id) || (a.storyId && excludeStoryIds.has(a.storyId))) continue
    if (a.kind && a.kind !== 'article') continue
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
    const free = items.filter((i) => isFree(i.source) && !isLive(i) && i.type !== 'opinie')
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

// Eén verhaal van buiten je bubbel krijgt een plek in de editie (op plek 6: onder het
// hoofdverhaal op de voorpagina); het minst belangrijke aanvullende verhaal maakt plaats.
export function insertBubble(entries, pick, { at = 5, size = 10 } = {}) {
  if (!pick) return entries
  const out = [...entries]
  if (out.length >= size) {
    let k = -1
    for (let i = out.length - 1; i >= 0; i--) if (!out[i].desk) { k = i; break }
    out.splice(k === -1 ? out.length - 1 : k, 1)
  }
  out.splice(Math.min(at, out.length), 0, { kind: 'item', id: pick.id, desk: 'bubbel', terms: pick.terms })
  return out
}
