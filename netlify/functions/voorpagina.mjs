// GET /api/voorpagina — drie uitnodigende plekken uit de algemene Editie voor de landingspagina op
// gethoot.app (besluit Alex: rustig en uitnodigend, Nederlands, actueel, met beeld waar dat mag).
// Klein, openbaar en zuinig: kop, bron, rubriek, aantal bronnen en soms een beeld (geen uitgever-URL's,
// geen kloktijden). We lezen de opgeslagen Editie uit dezelfde opslag als /api/feed (KEYS.start) en
// de eigen kandidatenpool die refresh.mjs ernaast schrijft (KEYS.voorpagina, zie
// lib/voorpagina-pool.mjs; KEYS.start zelf heeft geen berichten). We stellen hier nooit zelf een
// Editie samen; is er niets, dan 503 met { edition: null }.
import { readDoc, KEYS } from '../lib/kv.mjs'
import { isDutch } from '../lib/voorpagina-pool.mjs'
import { DESK_LABEL, desksOf, primaryDesk } from '../lib/desks.mjs'
import { INTERESTS } from '../../src/lib/topics.js'

export const PLACES = 3
const ORIGINS = new Set(['https://gethoot.app', 'https://www.gethoot.app'])
const CACHE = 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600'

// Bronnen waarvan we het beeld op de landingspagina mogen tonen: open licentie of eigen toestemming.
// Persfoto's van uitgevers (ANP enz.) zijn auteursrechtelijk beschermd, dus de lijst begint leeg
// (rijksoverheid.nl staat niet in onze bronnen). Alex kan hier bronnen-id's (uit sources.mjs)
// toevoegen waarvoor toestemming is; alleen dan krijgt een plek een imageUrl.
export const OPEN_IMAGE_SOURCES = new Set([])

// Rustige, uitnodigende rubrieken, in volgorde van gewicht (hoger = eerder gekozen).
export const CALM_WEIGHT = { binnenland: 5, cultuur: 4, wetenschap: 3, tech: 2 }
// Zwaardere rubrieken: alleen als er anders minder dan drie plekken zijn.
export const HEAVY_DESKS = new Set(['buitenland', 'oekraine', 'middenoosten', 'vs'])
const LABEL = { ...DESK_LABEL, cultuur: 'Cultuur', tech: 'Tech', sport: 'Sport' }

// Zware koppen: begin van woorden (dus ook samenstellingen als "oorlogsmisdaden"). Bewust ruim.
export const HEAVY_WORDS = [
  'dood', 'dode', 'doden', 'dodelijk', 'gedood', 'overleden', 'overlijd', 'overleed', 'omgekomen', 'sterft', 'stierf',
  'moord', 'vermoord', 'aanslag', 'oorlog', 'ramp', 'crash', 'ongeluk', 'ongeval', 'explosie', 'ontploff', 'geweld',
  'rellen', 'verkracht', 'misbruik', 'executie', 'geëxecuteerd', 'gijzel', 'terreur', 'terroris', 'zelfmoord', 'suïcide',
  'kanker', 'ziek', 'slachtoffer', 'schietpartij', 'neergeschoten', 'doodgeschoten', 'steekpartij', 'neergestoken',
  'bombardement', 'gewond', 'opgepakt', 'aangehouden', 'ontvoer', 'mishandel', 'mensensmokkel', 'migrant', 'vluchteling', 'brand', 'kinderporno', 'zedenzaak', 'zedendelict',
]
const HEAVY_RE = new RegExp(`(?<![\\p{L}])(?:${HEAVY_WORDS.map(w => w === 'brand' ? 'brand(?!weer)' : w).join('|')})`, 'iu')
export const isHeavy = (item) => HEAVY_RE.test(`${item?.title || ''} ${item?.summary || ''}`)

export { isDutch }

const INTEREST_RUBRIEK = { cultuur: 'cultuur', tech: 'tech', wetenschap: 'wetenschap', sport: 'sport' }
const TOPIC_RUBRIEK = Object.fromEntries(INTERESTS.flatMap((i) => (INTEREST_RUBRIEK[i.id] ? i.topics.map((t) => [t, INTEREST_RUBRIEK[i.id]]) : [])))
TOPIC_RUBRIEK.nederland = 'binnenland'

// Rubriek van een plek: de rubriek van de Editie zelf, anders afgeleid uit de bron en de onderwerpen.
// null = geen duidelijke rubriek (nog altijd welkom, na de rustige rubrieken).
export function rubriek(item, desk, srcCat) {
  if (desk && (CALM_WEIGHT[desk] || HEAVY_DESKS.has(desk))) return desk
  if (['sport', 'tech', 'cultuur'].includes(srcCat)) return srcCat
  for (const t of item.topics || []) if (TOPIC_RUBRIEK[t]) return TOPIC_RUBRIEK[t]
  if (srcCat === 'nl' && (item.topics || []).some((t) => ['wonen', 'zorg', 'onderwijs', 'migratie', 'verkeer'].includes(t))) return 'binnenland'
  return null
}

// Zuivere extractie: `start` is de feed (bronnen, verhalen, editie). Geeft { slot, date, entries } of null.
// Deterministisch: dezelfde feed geeft altijd dezelfde drie plekken.
export function extract(start, places = PLACES, openImageSources = OPEN_IMAGE_SOURCES) {
  const ed = start?.edition
  if (!ed || !Array.isArray(ed.entries) || !ed.slot || !ed.date) return null
  const srcs = new Map((start.sources || []).map((s) => [s.id, s]))
  const byId = new Map([...(start.items || []), ...(ed.items || [])].map((i) => [i.id, i]))
  const stories = new Map((start.stories || []).map((s) => [s.id, s]))

  const make = (item, desk, sourceCount, order) => {
    if (!item?.title) return null
    const src = srcs.get(item.source)
    const sport = src?.cat === 'sport' || desk === 'sport' || [...(item.mainTopics || []), ...(item.topics || [])].some(t => ['voetbal','f1','wielrennen','wielersport','tennis','darts','sport','olympisch','wintersport','basketbal'].includes(t))
    if (!isDutch(item, src?.lang) || isHeavy(item) || sport) return null
    // Een bericht uit de voorpagina-pool draagt zijn rubriek al (uitgerekend met URL en rubriek van de bron).
    const resolvedDesk = CALM_WEIGHT[desk] || HEAVY_DESKS.has(desk) ? desk : 'desk' in item ? item.desk : primaryDesk([desksOf(item)])
    const r = rubriek(item, resolvedDesk, src?.cat)
    const heavy = HEAVY_DESKS.has(r)
    if (heavy && (sourceCount || 1) < 5) return null
    return { item, rubriek: r, sourceCount: sourceCount || 1, order, heavy }
  }

  const cands = []
  const used = new Set()
  ed.entries.forEach((e, idx) => {
    const story = e.kind === 'story' ? stories.get(e.id) : null
    const item = byId.get(e.kind === 'story' ? e.leadId || story?.leadId : e.id)
    const c = make(item, e.desk || null, e.kind === 'story' ? e.sourceCount || story?.sourceCount || 1 : 1, idx)
    if (e.kind === 'story') used.add(e.id)
    if (c) cands.push(c)
  })

  // Te weinig rustige plekken? Vul aan met de overige verhalen van dezelfde dagdeel-pool (laatste 24 uur),
  // voor zover de feed hun bericht meelevert.
  if (cands.filter((c) => !c.heavy).length < places) {
    const ref = Date.parse(ed.builtAt) || Math.max(0, ...(start.stories || []).map((s) => Date.parse(s.latestAt) || 0))
    const rest = (start.stories || []).filter((s) => !used.has(s.id) && ref - (Date.parse(s.latestAt) || 0) <= 864e5)
    rest.forEach((s, i) => {
      const item = byId.get(s.leadId) || (s.itemIds || []).map((id) => byId.get(id)).find(Boolean)
      const c = make(item, item ? primaryDesk([desksOf(item)]) : null, s.sourceCount, 1000 + i)
      if (c) cands.push(c)
    })
  }

  // Ook losse publicaties uit dezelfde opgeslagen feedpool mogen aanvullen. Ze hebben nog
  // niet altijd een verhaal; alleen de Editie-items lezen zou juist rustige cultuur/tech missen.
  if (cands.filter(c => !c.heavy).length < places) {
    const ref = Date.parse(ed.builtAt) || 0
    for (const [i, item] of (start.items || []).entries()) {
      if (item.kind === 'post' || !Number.isFinite(Date.parse(item.publishedAt)) || ref - Date.parse(item.publishedAt) > 864e5) continue
      const key = item.storyId || item.id
      if (cands.some(c => (c.item.storyId || c.item.id) === key || c.item.title === item.title)) continue
      const story = item.storyId ? stories.get(item.storyId) : null
      const c = make(item, null, story?.sourceCount || 1, 10000 + i)
      if (c) cands.push(c)
    }
  }

  // Kiezen: eerst de rustige rubrieken (op gewicht, één per rubriek), dan aanvullen binnen de rustige
  // plekken, en alleen als het dan nog geen drie zijn de zwaardere rubrieken.
  const rank = (a, b) => (CALM_WEIGHT[b.rubriek] || 0) - (CALM_WEIGHT[a.rubriek] || 0) || a.order - b.order || b.sourceCount - a.sourceCount
  const picked = []
  const pickFrom = (list) => {
    const sorted = [...list].sort(rank)
    for (const c of sorted) if (picked.length < places && !picked.some((p) => p.rubriek === c.rubriek)) picked.push(c)
    for (const c of sorted) if (picked.length < places && !picked.includes(c)) picked.push(c)
  }
  pickFrom(cands.filter((c) => !c.heavy))
  if (picked.length < places) {
    const world = cands.filter(c => c.heavy).sort(rank)[0]
    if (world) picked.push(world)
  }

  // Volgorde: eerst de hoogste in de Editie, dan op aantal bronnen.
  picked.sort((a, b) => a.order - b.order || b.sourceCount - a.sourceCount)
  const entries = picked.map(({ item, rubriek: r, sourceCount }) => {
    const out = { desk: r, deskLabel: r ? LABEL[r] || null : null, title: item.title, source: item.sourceName || item.source, sourceCount }
    if (openImageSources.has(item.source) && /^https:\/\//.test(item.image || '')) out.imageUrl = item.image
    return out
  })
  return entries.length === places ? { slot: ed.slot, date: ed.date, entries } : null
}

// KEYS.start heeft `items: []`; de berichten voor het aanvullen komen uit de voorpagina-pool.
export function withPool(start, pool) {
  if (!start || typeof start !== 'object') return start
  const own = Array.isArray(start.items) ? start.items : []
  const extra = Array.isArray(pool?.items) ? pool.items : []
  const seen = new Set(own.map((i) => i.id))
  return { ...start, items: [...own, ...extra.filter((i) => i && !seen.has(i.id))] }
}

const base = (origin) => ({
  'Content-Type': 'application/json; charset=utf-8',
  Vary: 'Origin',
  ...(ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
})

export default async (req) => {
  const origin = req.headers.get('origin') || ''
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...base(origin), 'Access-Control-Allow-Methods': 'GET, HEAD', 'Cache-Control': CACHE } })
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response(JSON.stringify({ error: 'Alleen GET.' }), { status: 405, headers: { ...base(origin), Allow: 'GET, HEAD, OPTIONS', 'Cache-Control': 'no-store' } })
  let edition = null
  try {
    const [doc, pool] = await Promise.all([readDoc(KEYS.start), readDoc(KEYS.voorpagina).catch(() => null)])
    let extra = null
    try { extra = pool ? JSON.parse(pool.body) : null } catch { extra = null } // kapotte pool: alleen de Editie
    edition = doc ? extract(withPool(JSON.parse(doc.body), extra)) : null
  } catch {
    edition = null
  }
  if (!edition) return new Response(JSON.stringify({ edition: null }), { status: 503, headers: { ...base(origin), 'Cache-Control': 'no-store' } })
  return new Response(req.method === 'HEAD' ? null : JSON.stringify({ edition }), { headers: { ...base(origin), 'Cache-Control': CACHE } })
}

export const config = { path: '/api/voorpagina' }
