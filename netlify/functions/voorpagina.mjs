// GET /api/voorpagina — de bovenste drie plekken van de algemene Editie, voor de landingspagina op
// gethoot.app. Klein, openbaar en zuinig: alleen kop, bron, rubriek en aantal bronnen (geen beeld,
// geen uitgever-URL's, geen kloktijden). We lezen de opgeslagen feed uit dezelfde opslag als /api/feed
// (KEYS.start) en stellen hier nooit zelf iets samen; is er niets, dan 503 met { edition: null }.
// Alleen Nederlandstalige koppen: een anderstalige plek slaan we over en we nemen de volgende.
import { readDoc, KEYS } from '../lib/kv.mjs'
import { DESK_LABEL } from '../lib/desks.mjs'

export const PLACES = 3
const ORIGINS = new Set(['https://gethoot.app', 'https://www.gethoot.app'])
const CACHE = 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600'

// Nederlandstalig? Het bericht zelf weet het (offLang = bewust anderstalig, lang = taal), anders de bron.
export function isDutch(item, sourceLang) {
  if (!item || item.offLang) return false
  return (item.lang || sourceLang) === 'nl'
}

// Zuivere extractie: `start` is de feed (bronnen, verhalen, editie). Geeft { slot, date, entries } of null.
export function extract(start, places = PLACES) {
  const ed = start?.edition
  if (!ed || !Array.isArray(ed.entries) || !ed.slot || !ed.date) return null
  const lang = new Map((start.sources || []).map((s) => [s.id, s.lang]))
  const byId = new Map((ed.items || []).map((i) => [i.id, i]))
  const stories = new Map((start.stories || []).map((s) => [s.id, s]))
  const entries = []
  for (const e of ed.entries) {
    if (entries.length >= places) break
    const story = e.kind === 'story' ? stories.get(e.id) : null
    const item = byId.get(e.kind === 'story' ? e.leadId || story?.leadId : e.id)
    if (!item?.title || !isDutch(item, lang.get(item.source))) continue
    const sourceCount = e.kind === 'story' ? e.sourceCount || story?.sourceCount || 1 : 1
    const desk = e.desk || null
    entries.push({ desk, deskLabel: desk ? DESK_LABEL[desk] || null : null, title: item.title, source: item.sourceName || item.source, sourceCount })
  }
  return entries.length ? { slot: ed.slot, date: ed.date, entries } : null
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
    const doc = await readDoc(KEYS.start)
    edition = doc ? extract(JSON.parse(doc.body)) : null
  } catch {
    edition = null
  }
  if (!edition) return new Response(JSON.stringify({ edition: null }), { status: 503, headers: { ...base(origin), 'Cache-Control': 'no-store' } })
  return new Response(req.method === 'HEAD' ? null : JSON.stringify({ edition }), { headers: { ...base(origin), 'Cache-Control': CACHE } })
}

export const config = { path: '/api/voorpagina' }
