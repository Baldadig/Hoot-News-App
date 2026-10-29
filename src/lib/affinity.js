// Wat je leest en bewaart, als smaak voor je editie — pure functies (tests/affinity.test.mjs).
// Per onderwerp en per bron een gewicht: openen telt 1, bewaren 3. Bij elke handeling wordt
// alles een beetje ouder (×0,98), zodat wat je deze week las zwaarder weegt dan wat je in de
// zomer las. Het blijft op je toestel; het gaat niet mee met je account.
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

// Voor "Wat Hoot van je leerde": de onderwerpen waar je meer of minder van wilt.
export function tasteSummary(taste) {
  const e = Object.entries(taste?.topics || {})
  return { more: e.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k]) => k), less: e.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]).map(([k]) => k) }
}
