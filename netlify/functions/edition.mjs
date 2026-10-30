// POST /api/edition — jouw editie van dit dagdeel, alleen nog als terugval voor oudere versies van
// de iOS-app. De Editie wordt voortaan op het toestel zelf samengesteld, met dezelfde code als het web
// (src/lib/personal.js, De Redacteur). Je leesprofiel (`affinity`) blijft op je toestel: wat een
// oudere app nog meestuurt, negeren we (bouwspec §0.5, §7). We bewaren niets.
//
// Body: { followed: [bron-id], interests: [], topics: [], favorites: [],
//         taste: { topics, sources } (meer of minder hiervan, ook negatief),
//         previous: { storyIds: [], itemIds: [], leadIds: [], leadStoryId, at, titles: [], shown: [{ title, summary, publishedAt }] } }
// `previous` mag drie Edities omvatten (bouwspec-aanvulling H3/H4): vandaar de ruime grenzen.
import { readDoc, KEYS } from '../lib/kv.mjs'
import { refresh } from '../lib/refresh.mjs'
import { composePersonal, withoutDebug } from '../../src/lib/personal.js'

const fail = (status, error) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
const ID = /^[a-z0-9][a-z0-9:._-]{0,79}$/i
const ids = (v, max = 300) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && ID.test(x)).slice(0, max) : [])
// Koppen van de vorige Editie: platte tekst, begrensd. `shown`: de getoonde berichten (kop, intro, tijd).
const texts = (v, max = 90) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.length <= 300).slice(0, max) : [])
const str = (v, max) => (typeof v === 'string' && v.length <= max ? v : '')
const shown = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object' && str(x.title, 300)).slice(0, 90).map((x) => ({ title: x.title, summary: str(x.summary, 1000), publishedAt: str(x.publishedAt, 40) })) : [])
// Meer of minder hiervan: ook negatief, begrensd.
const signed = (o, max = 40) =>
  Object.fromEntries(
    Object.entries(o && typeof o === 'object' ? o : {})
      .filter(([k, v]) => ID.test(k) && Number.isFinite(v))
      .slice(0, max)
      .map(([k, v]) => [k, Math.max(-12, Math.min(12, v))])
  )

export default async (req) => {
  if (req.method !== 'POST') return fail(405, 'Alleen POST.')
  let body
  try {
    const text = await req.text()
    if (text.length > 160_000) return fail(413, 'Te groot.') // previous over drie Edities past erin
    body = JSON.parse(text)
  } catch {
    return fail(400, 'Geen geldige JSON.')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'Verwacht een object.') // "null" gaf anders een 500

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
    ? { storyIds: new Set(ids(p.storyIds, 90)), itemIds: new Set(ids(p.itemIds, 4500)), leadIds: new Set(ids(p.leadIds, 90)), leadStoryId: ID.test(p.leadStoryId || '') ? p.leadStoryId : null, at: Number(p.at) || 0, titles: new Set(texts(p.titles)), shown: shown(p.shown) }
    : null
  const t = body.taste && typeof body.taste === 'object' ? body.taste : null
  const taste = t ? { topics: signed(t.topics), sources: signed(t.sources) } : null

  const edition = composePersonal({
    global: start.edition,
    stories: start.stories || [],
    items,
    sources,
    followed: new Set(followed),
    interests: ids(body.interests, 20),
    topics: ids(body.topics, 60),
    favorites: ids(body.favorites, 50),
    affinity: null, // body.affinity van een oudere app: bewust genegeerd
    taste,
    previous,
  })
  if (!edition) return fail(503, 'Er is nog geen editie.')
  // Zonder de velden ter inzage (`_parts`, `_plan`): geen punten naar het toestel.
  return Response.json({ edition: withoutDebug(edition) }, { headers: { 'Cache-Control': 'no-store' } })
}

export const config = { path: '/api/edition' }
