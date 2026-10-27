// POST /api/edition — jouw editie van dit dagdeel, voor de iOS-app (die nog geen account heeft).
// Precies hetzelfde selectiewerk als de website in je browser doet (src/lib/personal.js): uit jouw
// bronnen, met je interesses, voorkeursbronnen en smaak, en zonder te herhalen wat in je vorige
// editie stond. De app stuurt die keuzes mee; we bewaren niets.
//
// Body: { followed: [bron-id], interests: [], topics: [], favorites: [], affinity: { n, topics, sources },
//         previous: { storyIds: [], itemIds: [], leadIds: [], leadStoryId, at } }
import { readDoc, KEYS } from '../lib/kv.mjs'
import { refresh } from '../lib/refresh.mjs'
import { composePersonal } from '../../src/lib/personal.js'

const fail = (status, error) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
const ID = /^[a-z0-9][a-z0-9:._-]{0,79}$/i
const ids = (v, max = 300) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && ID.test(x)).slice(0, max) : [])
const counts = (o, max = 60) =>
  Object.fromEntries(
    Object.entries(o && typeof o === 'object' ? o : {})
      .filter(([k, v]) => ID.test(k) && Number.isFinite(v) && v >= 0)
      .slice(0, max)
  )

export default async (req) => {
  if (req.method !== 'POST') return fail(405, 'Alleen POST.')
  let body
  try {
    const text = await req.text()
    if (text.length > 64_000) return fail(413, 'Te groot.')
    body = JSON.parse(text)
  } catch {
    return fail(400, 'Geen geldige JSON.')
  }

  let doc = await readDoc(KEYS.start)
  if (!doc) {
    await refresh()
    doc = await readDoc(KEYS.start)
  }
  if (!doc) return fail(503, 'De feed is er nog niet.')
  const start = JSON.parse(doc.body)
  const parts = start.meta?.parts || {}

  // Alleen nieuwsbronnen die bestaan; de berichten per bron komen uit dezelfde delen als de app laadt.
  const sources = start.sources || []
  const known = new Set(sources.filter((s) => s.kind !== 'sociaal').map((s) => s.id))
  const followed = ids(body.followed).filter((id) => known.has(id))
  const lists = await Promise.all(followed.filter((id) => parts[id]).map((id) => readDoc(KEYS.part(id)).then((d) => (d ? JSON.parse(d.body).items || [] : []), () => [])))
  const items = lists.flat()

  const p = body.previous && typeof body.previous === 'object' ? body.previous : null
  const previous = p
    ? { storyIds: new Set(ids(p.storyIds)), itemIds: new Set(ids(p.itemIds, 2000)), leadIds: new Set(ids(p.leadIds)), leadStoryId: ID.test(p.leadStoryId || '') ? p.leadStoryId : null, at: Number(p.at) || 0 }
    : null
  const a = body.affinity && typeof body.affinity === 'object' ? body.affinity : null
  const affinity = a ? { n: Number(a.n) || 0, topics: counts(a.topics), sources: counts(a.sources) } : null

  const edition = composePersonal({
    global: start.edition,
    stories: start.stories || [],
    items,
    sources,
    followed: new Set(followed),
    interests: ids(body.interests, 20),
    topics: ids(body.topics, 60),
    favorites: ids(body.favorites, 50),
    affinity,
    previous,
  })
  if (!edition) return fail(503, 'Er is nog geen editie.')
  return Response.json({ edition }, { headers: { 'Cache-Control': 'no-store' } })
}

export const config = { path: '/api/edition' }
