// POST /api/edition — jouw editie van dit dagdeel, alleen nog als terugval voor oudere versies van
// de iOS-app. De Editie wordt voortaan op het toestel zelf samengesteld, met dezelfde code als het web
// (src/lib/personal.js, De Redacteur). Je leesprofiel (`affinity`) blijft op je toestel: wat een
// oudere app nog meestuurt, negeren we (bouwspec §0.5, §7). We bewaren niets.
// Pariteit met het web (aanvulling-pariteit-herhaling.md P8-7): we rekenen op de start van het dagdeel
// (`now = builtAt`, niet de klok), nemen `readIds` aan (wat je las komt niet terug) en geven de afdruk
// (`basis`) mee, zodat het toestel kan toetsen of het antwoord bij zijn bronnen en interesses hoort.
// Het antwoord draagt `fallback: true` en `owner: null`: het is van geen toestel en hoort nooit in
// `user_state.edition` (P8-6); het eerste toestel dat zelf samenstelt, bepaalt de Editie.
//
// Body: { followed: [bron-id], interests: [], topics: [], favorites: [], readIds: [bericht-id],
//         taste: { topics, sources } (meer of minder hiervan, ook negatief),
//         previous: { storyIds: [], itemIds: [], leadIds: [], leadStoryId, leadStoryIds: [], at, atOf: { [verhaal-id]: ms },
//                     titles: [], shown: [{ title, summary, publishedAt }], keysOf: { [verhaal-id]: [kenmerk] } } }
// `previous` mag drie Edities omvatten (bouwspec-aanvulling H3/H4, previousOf over een lijst): vandaar
// de ruime grenzen (90 verhalen, 4500 stukken) en `atOf` (per verhaal de builtAt van de laatste Editie
// waarin het stond) naast `at`. `keysOf` zijn de kenmerken van toen per verhaal (de `keys` van de
// plekken), zodat "ontwikkeld" niet afhangt van welke stukken het toestel kende.
import { readDoc, KEYS } from '../lib/kv.mjs'
import { refresh } from '../lib/refresh.mjs'
import { composePersonal, withoutDebug, editionBasis } from '../../src/lib/personal.js'

const fail = (status, error) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
const ID = /^[a-z0-9][a-z0-9:._-]{0,79}$/i
const ids = (v, max = 300) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && ID.test(x)).slice(0, max) : [])
// Koppen van de vorige Editie: platte tekst, begrensd. `shown`: de getoonde berichten (kop, intro, tijd).
const texts = (v, max = 90) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.length <= 300).slice(0, max) : [])
const str = (v, max) => (typeof v === 'string' && v.length <= max ? v : '')
const shown = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object' && str(x.title, 300)).slice(0, 90).map((x) => ({ title: x.title, summary: str(x.summary, 1000), publishedAt: str(x.publishedAt, 40) })) : [])
// Kenmerken van toen per verhaal: korte platte woorden, begrensd (90 verhalen, 80 kenmerken elk).
const KEY = /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,39}$/u
const keysOf = (o) =>
  Object.entries(o && typeof o === 'object' ? o : {})
    .filter(([k, v]) => ID.test(k) && Array.isArray(v))
    .slice(0, 90)
    .map(([k, v]) => [k, new Set(v.filter((x) => typeof x === 'string' && KEY.test(x)).slice(0, 80))])
    .filter(([, v]) => v.size)
// Per verhaal het moment van de laatste Editie waarin het stond (ms), begrensd (90 verhalen).
const atOf = (o) =>
  Object.entries(o && typeof o === 'object' ? o : {})
    .filter(([k, v]) => ID.test(k) && Number.isFinite(v) && v > 0)
    .slice(0, 90)
// Meer of minder hiervan: ook negatief, begrensd.
const signed = (o, max = 40) =>
  Object.fromEntries(
    Object.entries(o && typeof o === 'object' ? o : {})
      .filter(([k, v]) => ID.test(k) && Number.isFinite(v))
      .slice(0, max)
      .map(([k, v]) => [k, Math.max(-12, Math.min(12, v))])
  )

export const READ_MAX = 1500 // zoveel gelezen berichten gaan ook mee in de sync (bouwspec §8)

// Alleen nieuwsbronnen die bestaan, in de volgorde van de aanvraag.
export function followedOf(start, body) {
  const known = new Set((start.sources || []).filter((s) => s.kind !== 'sociaal').map((s) => s.id))
  return ids(body.followed).filter((id) => known.has(id))
}

// De Editie voor deze aanvraag, zuiver: `start` is de kern (bronnen, verhalen, algemene Editie), `items`
// de berichten van de gevolgde bronnen. Zelfde rekenpad als usePersonalEdition.js, zodat de web-route en
// de server-route voor dezelfde lezer dezelfde Editie geven (meetlat: tests/helpers/pariteit.mjs).
export function editionFor(start, items, body) {
  const sources = start.sources || []
  const followed = followedOf(start, body)
  const p = body.previous && typeof body.previous === 'object' ? body.previous : null
  const previous = p
    ? {
        storyIds: new Set(ids(p.storyIds, 90)),
        itemIds: new Set(ids(p.itemIds, 4500)),
        leadIds: new Set(ids(p.leadIds, 90)),
        leadStoryId: ID.test(p.leadStoryId || '') ? p.leadStoryId : null,
        leadStoryIds: new Set(ids(p.leadStoryIds, 90)),
        at: Number(p.at) || 0,
        atOf: new Map(atOf(p.atOf)),
        titles: new Set(texts(p.titles)),
        shown: shown(p.shown),
        keysOf: new Map(keysOf(p.keysOf)),
      }
    : null
  const t = body.taste && typeof body.taste === 'object' ? body.taste : null
  const taste = t ? { topics: signed(t.topics), sources: signed(t.sources) } : null
  const interests = ids(body.interests, 20)
  const topics = ids(body.topics, 60)
  const favorites = ids(body.favorites, 50)
  // Op de start van het dagdeel, zoals het web: zo geeft elk toestel met dezelfde invoer dezelfde Editie.
  const now = Date.parse(start.edition?.builtAt) || Date.now()

  const edition = composePersonal({
    global: start.edition,
    stories: start.stories || [],
    items,
    sources,
    followed: new Set(followed),
    interests,
    topics,
    favorites,
    now,
    affinity: null, // body.affinity van een oudere app: bewust genegeerd
    taste,
    previous,
    readIds: new Set(ids(body.readIds, READ_MAX)),
  })
  if (!edition) return null
  // Zonder de velden ter inzage (`_parts`, `_plan`): geen punten naar het toestel. Met de afdruk, en
  // als terugval gemerkt: van geen toestel, en nooit voor je account.
  return { ...withoutDebug(edition), basis: editionBasis(followed, interests, topics, favorites), owner: null, fallback: true }
}

export default async (req) => {
  if (req.method !== 'POST') return fail(405, 'Alleen POST.')
  let body
  try {
    const text = await req.text()
    if (text.length > 320_000) return fail(413, 'Te groot.') // previous over drie Edities plus 1500 gelezen berichten past erin
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

  // De berichten per bron komen uit dezelfde delen als de app laadt.
  const followed = followedOf(start, body)
  const lists = await Promise.all(followed.filter((id) => parts[id]).map((id) => readDoc(KEYS.part(id)).then((d) => (d ? JSON.parse(d.body).items || [] : []), () => [])))
  const edition = editionFor(start, lists.flat(), body)
  if (!edition) return fail(503, 'Er is nog geen editie.')
  return Response.json({ edition }, { headers: { 'Cache-Control': 'no-store' } })
}

export const config = { path: '/api/edition' }
