// Wat je leest en bewaart, als smaak voor je editie — pure functies (tests/affinity.test.mjs).
// Per onderwerp en per bron een gewicht: openen telt 1, bewaren 3. Bij elke handeling wordt
// alles een beetje ouder (×0,98), zodat wat je deze week las zwaarder weegt dan wat je in de
// zomer las. Het blijft op je toestel en gaat niet mee met je account; alleen een samenvatting gaat mee
// naar de server om je Editie samen te stellen (readingSummary), en die bewaart de server niet.
import { currentTopic } from './topics.js'
export const READ = 1
export const SAVE = 3
const DECAY = 0.98
const KEEP_TOPICS = 40
const KEEP_SOURCES = 30
export const MIN_EVENTS = 8 // pas na een paar keer lezen telt het mee

export const emptyAffinity = () => ({ n: 0, topics: {}, sources: {} })

const top = (obj, keep) =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v >= 0.05)
      .sort((a, b) => b[1] - a[1])
      .slice(0, keep)
      .map(([k, v]) => [k, Math.round(v * 100) / 100])
  )

export function learn(affinity, item, weight = READ) {
  const a = affinity && typeof affinity === 'object' ? affinity : emptyAffinity()
  if (!item || item.kind === 'post') return a
  const age = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, v * DECAY]))
  const topics = age(a.topics)
  const sources = age(a.sources)
  for (const t of item.topics || []) topics[t] = (topics[t] || 0) + weight
  if (item.source) sources[item.source] = (sources[item.source] || 0) + weight
  return { n: (a.n || 0) + 1, topics: top(topics, KEEP_TOPICS), sources: top(sources, KEEP_SOURCES) }
}

// "Vergeet dit" (Instellingen, Wat Hoot van je leerde): het onderwerp valt uit je leesprofiel, de
// rest blijft staan, ook de teller — anders zou het profiel even niets meer leren (MIN_EVENTS).
export function forgetTopic(affinity, topic) {
  const a = affinity && typeof affinity === 'object' ? affinity : emptyAffinity()
  const gone = (k) => k === topic || currentTopic(k) === currentTopic(topic) // ook de oude sleutel (Trump → Verenigde Staten)
  if (!topic || !Object.keys(a.topics || {}).some(gone)) return a
  const topics = Object.fromEntries(Object.entries(a.topics).filter(([k]) => !gone(k)))
  return { ...a, topics }
}

// ---- Je leesprofiel, samengevat voor de server ----
// Besluit Alex (11 november 2026): "Leesprofiel meesturen". De server stelt je Editie samen (POST /api/edition
// v2) en kijkt dan ook naar wat je vaak leest. Er gaat alleen mee wat De Redacteur daarvan gebruikt (profileOf
// in shared/editor.mjs): per onderwerp en per bron een gewicht, afgerond op twee decimalen, en de teller tot
// READING_N_MAX (meer verandert niets: zo telt de server niet hoeveel je las). Geen artikelen, geen tijden.
// Onder MIN_EVENTS telt lezen nog niet mee: dan gaat er niets mee (null). Altijd dezelfde volgorde (zwaarste
// eerst, dan op naam), zodat web en iPhone voor hetzelfde profiel hetzelfde sturen. De server maakt de body
// er ook mee schoon; een samenvatting gaat er ongewijzigd doorheen.
export const READING_N_MAX = 30 // = READ_RAMP in shared/editor.mjs (tests/leesprofiel.test.mjs)
const READING_KEY = /^[a-z0-9][a-z0-9:._-]{0,79}$/i
const READING_W_MAX = 1000
const weights = (o, keep) =>
  Object.fromEntries(
    Object.entries(o && typeof o === 'object' && !Array.isArray(o) ? o : {})
      .filter(([k, v]) => READING_KEY.test(k) && typeof v === 'number' && Number.isFinite(v) && v > 0)
      .map(([k, v]) => [k, Math.round(Math.min(v, READING_W_MAX) * 100) / 100])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, keep)
  )
export function readingSummary(affinity) {
  if (!affinity || typeof affinity !== 'object' || Array.isArray(affinity)) return null
  const n = Number.isFinite(affinity.n) ? Math.floor(affinity.n) : 0
  if (n < MIN_EVENTS) return null
  return { n: Math.min(n, READING_N_MAX), topics: weights(affinity.topics, KEEP_TOPICS), sources: weights(affinity.sources, KEEP_SOURCES) }
}

// Hoeveel een verhaal (zijn berichten) bij je smaak past: 0 tot AFFINITY_MAX. Onderwerp telt
// zwaarder dan bron: je wilt meer over AI, niet per se meer van één krant.
export const AFFINITY_MAX = 5
export function affinityScore(items, affinity) {
  if (!affinity || (affinity.n || 0) < MIN_EVENTS) return 0
  const t = affinity.topics || {}
  const s = affinity.sources || {}
  const tMax = Math.max(1, ...Object.values(t))
  const sMax = Math.max(1, ...Object.values(s))
  const topic = Math.max(0, ...items.flatMap((i) => (i.topics || []).map((x) => (t[x] || 0) / tMax)))
  const source = Math.max(0, ...items.map((i) => (s[i.source] || 0) / sMax))
  return Math.round((topic * 3 + source * 2) * 10) / 10
}

// ---- Meer of minder hiervan ----
// Wat je zelf aangeeft bij een verhaal in de Editie. Anders dan lezen en bewaren is dit een keuze:
// het vervaagt niet, gaat mee met je account (prefs.taste) en kan ook omlaag. Het telt vooral op
// het onderwerp (minder voetbal) en een beetje op de bron (niet per se minder NOS).
export const VOTE = 4 // per onderwerp
export const VOTE_SOURCE = 1
export const TASTE_CAP = 12 // drie keer dezelfde kant op is genoeg
export const TASTE_MAX = 6 // hooguit zoveel erbij of eraf; groot nieuws (veel bronnen) blijft staan
const KEEP_TASTE = 40
// Dezelfde vorm als DEFAULT_PREFS.taste; ook het beginpunt van de persona's (tests/fixtures, meetlat).
export const emptyTaste = () => ({ topics: {}, sources: {} })

const clampTaste = (v) => Math.max(-TASTE_CAP, Math.min(TASTE_CAP, v))
const trim = (obj) =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => Math.abs(v) >= 0.5)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, KEEP_TASTE)
  )

// `dir`: 1 = meer hiervan, -1 = minder. `items`: de berichten van het verhaal.
export function vote(taste, items, dir) {
  const t = taste && typeof taste === 'object' ? taste : emptyTaste()
  const topics = { ...(t.topics || {}) }
  const sources = { ...(t.sources || {}) }
  const its = (items || []).filter((i) => i && i.kind !== 'post')
  for (const x of new Set(its.flatMap((i) => i.topics || []))) topics[x] = clampTaste((topics[x] || 0) + dir * VOTE)
  const lead = its[0]?.source
  if (lead) sources[lead] = clampTaste((sources[lead] || 0) + dir * VOTE_SOURCE)
  return { topics: trim(topics), sources: trim(sources) }
}

// Hoeveel een verhaal erbij krijgt of eraf: -TASTE_MAX tot TASTE_MAX.
export function tasteScore(items, taste) {
  if (!taste) return 0
  const t = taste.topics || {}
  const s = taste.sources || {}
  const topics = [...new Set(items.flatMap((i) => i.topics || []))]
  const topic = topics.reduce((sum, x) => sum + (t[x] || 0), 0)
  const source = s[items[0]?.source] || 0
  return Math.max(-TASTE_MAX, Math.min(TASTE_MAX, topic / 2 + source))
}
