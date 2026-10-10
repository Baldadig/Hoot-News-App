// "Buiten je bubbel" — pure functies (getest in tests/bubble.test.mjs).
// Drie gratis signalen voor waar anderen over praten (Google Trends NL, trending op Bluesky,
// meestgelezen Wikipedia-pagina's) worden vergeleken met álle beschikbare berichten, ook van
// bronnen die je niet volgt. Wat matcht en níét in je editie zit, is je blik naar buiten.

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
  for (const { term, via, rank = 0 } of raw) {
    if (!term || SKIP.test(term)) continue
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
    const age = a.publishedAt ? Math.max(0, now - Date.parse(a.publishedAt)) : 1e12
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

// Tekst voor het AI-overzicht van de editie: wat het model mag gebruiken, en niets anders.
export function briefInput(rows) {
  return rows
    .map((r, i) => `${i + 1}. [${r.sourceName}] ${r.title}${r.summary ? ` — ${r.summary}` : ''}`)
    .join('\n')
}
