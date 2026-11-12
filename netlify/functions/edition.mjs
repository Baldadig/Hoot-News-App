// POST /api/edition — jouw Editie van dit dagdeel, samengesteld op de server (De Redacteur op de server,
// besluit Alex 9 november 2026: "Redacteur draait op server. Altijd gelijk, onafhankelijk van app of web te
// updaten"). Ontwerp: Hoot-design/redacteur-server/PLAN.md.
//
// Versie 2 (body `v: 2`; het web en app 1.2.1):
//  - Als lid (header `Authorization: Bearer <token>`): de Editie in je account (`user_state.edition`) is de
//    enige waarheid. Past die bij dit dagdeel en je bronnen en interesses (fitsEdition), dan gaat zij
//    ongewijzigd terug (`account`), ook als app 1.2 haar schreef. Anders stelt de server samen, met wat er
//    in je vorige Edities stond (de Editie en haar `history` uit je account), en legt haar vast met jouw
//    token: de eerste schrijver wint (claimFilter, zoals het web en app 1.2), en alleen over de rij die hij las
//    (claimOver): nooit over een Editie van een later dagdeel heen (accountAhead). Wint de server: `claimed`;
//    was een ander toestel net eerder: die Editie (`account`). Web en iPhone krijgen zo dezelfde Editie.
//  - Zonder account: samengesteld uit de body (met `earlier`: de history-regels van je vorige Edities op
//    dit toestel) en bewaard per profiel-afdruk en dagdeel (`cache`), zodat dezelfde vraag één keer rekent.
//  - Het toestel slaat het antwoord letterlijk op en rekent zelf alleen nog als offline-vangnet.
// Je leesprofiel gaat mee als samenvatting (`reading`, besluit Alex 11 november 2026: "Leesprofiel meesturen"):
// alleen de gewichten per onderwerp en bron die De Redacteur gebruikt (readingSummary in src/lib/affinity.js).
// Zo is de Editie van de server weer die van de lokale samenstelling met hetzelfde profiel. Het ruwe
// `affinity` wordt nog steeds niet aangenomen. Web en iPhone hebben elk een eigen leesprofiel; als lid wint de
// eerste schrijver, dus beide tonen dezelfde Editie. De samenvatting telt mee in de afdruk van de cache zonder
// account (als hash), niet in `basis`: anders zou je Editie bij elk gelezen stuk wisselen, en zou een rij van
// app 1.2 nooit meer passen. We loggen niets van body, account, IP of token, en bewaren de samenvatting niet.
// Rate limiting: per IP via Netlify (config.rateLimit) en per lid een plafond per dagdeel (kvTake).
//
// Versie 1 (geen `v`; app 1.1.1 en 1.2 als terugval) blijft zoals het was:
// Pariteit met het web (aanvulling-pariteit-herhaling.md P8-7): we rekenen op de start van het dagdeel
// (`now = builtAt`, niet de klok), nemen `readIds` aan (wat je las komt niet terug) en geven de afdruk
// (`basis`) mee, zodat het toestel kan toetsen of het antwoord bij zijn bronnen en interesses hoort.
// Het antwoord draagt `fallback: true` en `owner: null`: het is van geen toestel en hoort nooit in
// `user_state.edition` (P8-6); het eerste toestel dat zelf samenstelt, bepaalt de Editie.
//
// Body v1: { followed: [bron-id], interests: [], topics: [], favorites: [], readIds: [bericht-id],
//         taste: { topics, sources } (meer of minder hiervan, ook negatief),
//         previous: { storyIds: [], itemIds: [], leadIds: [], leadStoryId, leadStoryIds: [], at, atOf: { [verhaal-id]: ms },
//                     titles: [], shown: [{ title, summary, publishedAt }], keysOf: { [verhaal-id]: [kenmerk] } } }
// Body v2: { v: 2, followed, interests, topics, favorites, taste, readIds, reading: { n, topics, sources } | weg,
//          earlier: [history-regel] (alleen zonder account), rubrieken: 2 (web en app 1.3: de indeling van nu; zie choiceOf) }
// `previous` mag drie Edities omvatten (bouwspec-aanvulling H3/H4, previousOf over een lijst): vandaar
// de ruime grenzen (90 verhalen, 4500 stukken) en `atOf` (per verhaal de builtAt van de laatste Editie
// waarin het stond) naast `at`. `keysOf` zijn de kenmerken van toen per verhaal (de `keys` van de
// plekken), zodat "ontwikkeld" niet afhangt van welke stukken het toestel kende.
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { readDoc, KEYS, kvGet, kvSet, kvTake } from '../lib/kv.mjs'
import { refresh } from '../lib/refresh.mjs'
import { previousOf, historyOf, recentEditions, HISTORY_MAX } from '../lib/stories.mjs'
import { composePersonal, withoutDebug, editionBasis, earlierEditions } from '../../src/lib/personal.js'
import { fitsEdition, accountAhead, claimFilter, readAccountEdition, TABLE } from '../../src/lib/editionSync.js'
import { EDITOR_REVISION } from '../../shared/editor-version.mjs'
import { readingSummary } from '../../src/lib/affinity.js'
import { currentChoice, RUBRIEKEN } from '../../src/lib/topics.js'
import { SUPABASE_URL, SUPABASE_KEY } from '../../src/lib/config.js'

const fail = (status, error, headers = {}) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
// v2: nooit in een gedeelde cache (een antwoord kan van je account zijn).
const fail2 = (status, error, headers = {}) => fail(status, error, { 'Cache-Control': 'private, no-store', ...headers })
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

// Interesses en onderwerpen zoals gevraagd, en zoals de Redacteur ze leest. Zonder `rubrieken` (app 1.2.1 en
// ouder, en v1) zijn ze van de oude indeling (Games onder Tech) en zetten we ze om (src/lib/topics.js
// currentChoice). De afdruk (`basis`) blijft die van de vraag zelf: zo herkent het toestel zijn Editie.
export function choiceOf(body) {
  const asked = { interests: ids(body.interests, 20), topics: ids(body.topics, 60) }
  return { asked, ...(body.rubrieken === RUBRIEKEN ? asked : currentChoice(asked.interests, asked.topics)) }
}

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
  const { asked, interests, topics } = choiceOf(body)
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
    weg: wegOf(start),
  })
  if (!edition) return null
  // Zonder de velden ter inzage (`_parts`, `_plan`): geen punten naar het toestel. Met de afdruk, en
  // als terugval gemerkt: van geen toestel, en nooit voor je account.
  return { ...withoutDebug(edition), basis: editionBasis(followed, asked.interests, asked.topics, favorites), owner: null, fallback: true }
}

// De id's die de AI op de server zeker als aanbieding of aankondiging zag (netlify/lib/editie-ai.mjs, `editionFilter` in de
// kern): dezelfde oordelen als de algemene Editie. Ontbreekt het (een oudere kern), dan alleen A.
export const wegOf = (start) => new Set(Array.isArray(start?.editionFilter?.weg) ? start.editionFilter.weg.filter((x) => typeof x === 'string' && ID.test(x)).slice(0, 2000) : [])

// ---- Versie 2 ----
export const MEMBER_PER_SLOT = 20 // samenstellingen per lid per dagdeel; een treffer in je account telt niet mee
export const TIMEOUT_HINT_S = 60 // Retry-After bij 429: het toestel toont zolang het vangnet
const sha = (s) => createHash('sha256').update(s).digest('hex')

// Het profiel uit de body, schoon en begrensd. `reading`: de samenvatting van je leesprofiel, opnieuw door
// readingSummary (een geldige samenvatting komt er ongewijzigd uit). `affinity` en `previous` doen in v2 niet mee.
export function profileOf(start, body) {
  const followed = followedOf(start, body)
  const t = body.taste && typeof body.taste === 'object' ? body.taste : null
  const { asked, interests, topics } = choiceOf(body)
  return {
    followed,
    interests,
    topics,
    asked,
    favorites: ids(body.favorites, 50),
    taste: t ? { topics: signed(t.topics), sources: signed(t.sources) } : null,
    readIds: ids(body.readIds, READ_MAX),
    reading: readingSummary(body.reading),
  }
}

// De history-regels die een toestel zonder account meestuurt (`earlier`): alleen de velden die previousOf
// leest, begrensd zoals `previous` in v1. Een regel zonder id of tijd valt weg (recentEditions).
const keysObj = (o) => Object.fromEntries(keysOf(o).map(([k, v]) => [k, [...v]]))
export function cleanEarlier(list) {
  if (!Array.isArray(list)) return []
  const rows = list.slice(0, 6).filter((x) => x && typeof x === 'object' && ID.test(x.id || '') && Date.parse(str(x.builtAt, 40)) > 0).map((x) => ({
    id: x.id,
    builtAt: x.builtAt,
    storyIds: ids(x.storyIds, 90),
    itemIds: ids(x.itemIds, 1500),
    leadIds: ids(x.leadIds, 30),
    leadStoryId: ID.test(x.leadStoryId || '') ? x.leadStoryId : null,
    titles: texts(x.titles, 30),
    shown: shown(x.shown).slice(0, 30),
    ...(Array.isArray(x.heldIds) ? { heldIds: ids(x.heldIds, 30) } : {}),
    keys: keysObj(x.keys),
  }))
  return recentEditions(rows, HISTORY_MAX)
}

// De afdruk van een vraag zonder account: alles wat de Editie bepaalt, in een vaste volgorde.
export function anonKey(globalId, p, earlier) {
  const sorted = (xs) => [...xs].sort()
  const asked = p.asked || p
  // Omgezet uit de oude indeling (choiceOf): de keuze zoals de Redacteur hem leest telt mee, anders kan dezelfde
  // vraag in de oude en de nieuwe indeling dezelfde Editie krijgen. Niet omgezet: de afdruk van altijd.
  const read = sorted(p.interests).join() === sorted(asked.interests).join() && sorted(p.topics).join() === sorted(asked.topics).join() ? [] : [sorted(p.interests), sorted(p.topics)]
  const norm = JSON.stringify([sorted(p.followed), sorted(asked.interests), sorted(asked.topics), sorted(p.favorites), p.taste, sorted(p.readIds), earlier, p.reading ?? null, ...read])
  return `pe:${EDITOR_REVISION}:${globalId}:${sha(norm)}`
}

// Samenstellen voor dit profiel, op de start van het dagdeel (`now = builtAt`), met `earlier` (Edities of
// history-regels) als wat er al stond. Gestempeld zoals het web vastlegt: owner, afdruk, history.
export function composeFor(start, items, p, { owner, earlier = [] }) {
  const global = start.edition
  const edition = composePersonal({
    global,
    stories: start.stories || [],
    items,
    sources: start.sources || [],
    followed: new Set(p.followed),
    interests: p.interests,
    topics: p.topics,
    favorites: p.favorites,
    now: Date.parse(global?.builtAt) || Date.now(),
    affinity: p.reading ?? null, // de samenvatting van je leesprofiel (zie boven)
    taste: p.taste,
    previous: previousOf(earlier),
    readIds: new Set(p.readIds),
    weg: wegOf(start),
  })
  if (!edition) return null
  return {
    ...withoutDebug(edition),
    owner,
    basis: editionBasis(p.followed, (p.asked || p).interests, (p.asked || p).topics, p.favorites),
    history: earlier.map(historyOf).filter(Boolean),
    revision: EDITOR_REVISION,
    server: true,
  }
}

// Wie is dit? Supabase controleert het token; we bewaren en loggen het niet.
export async function verifyToken(token, fetchImpl = fetch) {
  const u = await fetchImpl(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } })
  if (u.status === 401 || u.status === 403) return null
  if (!u.ok) throw new Error('auth')
  const user = await u.json()
  return typeof user?.id === 'string' ? user.id : null
}
// Een client die als het lid zelf leest en schrijft: de regels in de database laten alleen je eigen rij toe.
export const clientForToken = (token) =>
  createClient(SUPABASE_URL, SUPABASE_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })

// De Editie uit je account; bij een fout gooien (dan liever het vangnet dan een Editie naast je account).
async function accountEdition(client, uid) {
  const { data, error } = await client.from(TABLE).select('edition').eq('user_id', uid).maybeSingle()
  if (error) throw new Error('account')
  return data?.edition && typeof data.edition === 'object' ? data.edition : null
}

// Vastleggen zoals het web en app 1.2 (claimFilter: de eerste schrijver wint), maar alleen over de rij die we net
// lazen (`seen`: zelfde id, afdruk en builtAt, of nog geen Editie). Schreef een ander toestel tussen ons lezen en
// schrijven door (bijvoorbeeld de Editie van een later dagdeel), dan is de PATCH niet raak en lezen we die rij:
// zo schrijft de server nooit over een nieuwere Editie heen (keuring server 1). Uitkomst als claimEdition.
const sameAs = (q, col, v) => (v == null ? q.is(col, null) : q.eq(col, String(v)))
export async function claimOver(client, uid, stamped, seen) {
  let q = client.from(TABLE).update({ edition: stamped }).eq('user_id', uid).or(claimFilter(stamped))
  if (!seen) q = q.is('edition', null)
  else for (const k of ['id', 'basis', 'builtAt']) q = sameAs(q, `edition->>${k}`, seen[k])
  const { data, error } = await q.select('edition').then((r) => r, (e) => ({ data: null, error: e || true }))
  if (error) return { won: false, theirs: null, error }
  if (Array.isArray(data) && data.length) return { won: true, theirs: null }
  return { won: false, theirs: await readAccountEdition(client, uid) }
}

async function loadStart() {
  let doc = await readDoc(KEYS.start)
  if (!doc) {
    await refresh()
    doc = await readDoc(KEYS.start)
  }
  return doc ? JSON.parse(doc.body) : null
}
async function loadItems(start, followed) {
  const parts = start.meta?.parts || {}
  const lists = await Promise.all(followed.filter((id) => parts[id]).map((id) => readDoc(KEYS.part(id)).then((d) => (d ? JSON.parse(d.body).items || [] : []), () => [])))
  return lists.flat()
}

const ok = (edition, source) => Response.json({ edition, source, revision: EDITOR_REVISION }, { headers: { 'Cache-Control': 'private, no-store' } })

// De Editie van v2 (zie boven). `deps` alleen voor de tests: nep-kern, nep-database, nep-opslag.
export async function editionV2(req, body, deps = {}) {
  const { start: startOf = loadStart, items: itemsOf = loadItems, verify = verifyToken, clientFor = clientForToken, kv = { get: kvGet, set: kvSet, take: kvTake } } = deps
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  let uid = null
  if (token) {
    try {
      uid = await verify(token)
    } catch {
      return fail2(503, 'Je account is nu niet bereikbaar.')
    }
    if (!uid) return fail2(401, 'Je sessie is verlopen.')
  }
  const start = await startOf()
  if (!start?.edition?.id) return fail2(503, 'De feed is er nog niet.')
  const global = start.edition
  const id = global.id
  const p = profileOf(start, body)
  const basis = editionBasis(p.followed, p.asked.interests, p.asked.topics, p.favorites)

  if (uid) {
    const client = clientFor(token)
    let row
    try {
      row = await accountEdition(client, uid)
    } catch {
      return fail2(503, 'Je account is nu niet bereikbaar.')
    }
    // Al vastgelegd voor dit dagdeel en deze afdruk (door de server, het web of app 1.2): ongewijzigd terug.
    if (fitsEdition(row, { id, basis })) return ok(row, 'account')
    // Staat er al een Editie van een later dagdeel (ons startbestand uit Blobs loopt tot een minuut achter, en
    // een ander toestel had de kern van nu al): nooit daaroverheen schrijven (accountAhead, keuring P0 ronde 2
    // §4; keuring server 1). Die Editie gaat terug; het web bewaart haar als 'ahead', iOS toont tot de kern
    // bij is het vangnet.
    if (accountAhead(row, global)) return ok(row, 'account')
    if ((await kv.take(`pe-quota:${sha(uid)}:${id}`, MEMBER_PER_SLOT)) == null) return fail2(429, 'Even te veel tegelijk.', { 'Retry-After': String(TIMEOUT_HINT_S) })
    const earlier = earlierEditions({ local: null, account: row, id, owner: uid })
    const mine = composeFor(start, await itemsOf(start, p.followed), p, { owner: uid, earlier })
    if (!mine) return fail2(503, 'Er is nog geen editie.')
    const r = await claimOver(client, uid, mine, row)
    if (r.error) return fail2(503, 'Je account is nu niet bereikbaar.')
    if (r.won) return ok(mine, 'claimed')
    // Een ander toestel (of een gelijktijdige aanvraag) was net eerder: die Editie, voor iedereen dezelfde.
    if (fitsEdition(r.theirs, { id, basis })) return ok(r.theirs, 'account')
    if (accountAhead(r.theirs, global)) return ok(r.theirs, 'account')
    return ok(mine, 'composed') // geen rij in user_state, of net een andere afdruk: niets om in vast te leggen
  }

  const earlier = cleanEarlier(body.earlier)
  const key = anonKey(id, p, earlier)
  const hit = await kv.get(key).catch(() => null)
  if (hit && hit.id === id) return ok(hit, 'cache')
  const mine = composeFor(start, await itemsOf(start, p.followed), p, { owner: 'anon', earlier })
  if (!mine) return fail2(503, 'Er is nog geen editie.')
  await kv.set(key, mine).catch(() => {})
  return ok(mine, 'composed')
}

export async function handle(req, deps = {}) {
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
  if (body.v === 2) return editionV2(req, body, deps)
  return editionV1(body, deps)
}

// Versie 1, ongewijzigd (app 1.1.1, en 1.2 als terugval).
async function editionV1(body, deps = {}) {
  const start = await (deps.start || loadStart)()
  if (!start) return fail(503, 'De feed is er nog niet.')
  const followed = followedOf(start, body)
  const edition = editionFor(start, await (deps.items || loadItems)(start, followed), body)
  if (!edition) return fail(503, 'Er is nog geen editie.')
  return Response.json({ edition }, { headers: { 'Cache-Control': 'no-store' } })
}

export default (req) => handle(req)

// 30 aanvragen per minuut per IP (Netlify); daarboven 429 en toont het toestel zijn vangnet.
export const config = { path: '/api/edition', rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] } }
