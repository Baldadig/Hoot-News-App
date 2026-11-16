// POST /api/edition — jouw Editie van dit dagdeel, samengesteld op de server (De Redacteur op de server,
// besluit Alex 9 november 2026: "Redacteur draait op server. Altijd gelijk, onafhankelijk van app of web te
// updaten"). Ontwerp: Hoot-design/redacteur-server/PLAN.md.
//
// Versie 2 (body `v: 2`; het web en app 1.2.1):
//  - Als lid (header `Authorization: Bearer <token>`): de Editie in je account (`user_state.edition`) is de
//    enige waarheid, en per dagdeel wint de eerste schrijver (Editie stabiel, 15 november 2026: "Mijn ochtend
//    editie is al 3x gewijzigd. Zomaar."). Staat er een Editie van dit dagdeel, dan gaat die terug (`account`),
//    ook als app 1.2 haar schreef, ook na een deploy met een nieuwe Redacteur of een nieuwe feedronde. Een nieuwe
//    keuze (andere bronnen of interesses) geeft alleen een nieuwe Editie als die keuze al in je account staat
//    (`prefs`) en de vraag erbij past: elke Editie van de server draagt het merk van je account (`prefsMark`), en
//    alleen een ander merk telt. Een toestel met een andere afdruk dan je account krijgt de rij zoals ze is; vraagt
//    het als eerste, dan stelt de server samen met de keuze uit je account. Een rij zonder merk blijft staan.
//    Alleen zonder Editie van dit dagdeel stelt de server samen, met wat er in je vorige Edities stond (de Editie
//    en haar `history` uit je account), en legt haar vast met jouw token: de eerste schrijver wint (claimFilter),
//    en alleen over de rij die hij las (claimOver): nooit over een Editie van een later dagdeel heen
//    (accountAhead). Wint de server: `claimed`; was een ander toestel net eerder: die Editie (`account`). Een
//    kopie per lid en dagdeel (`pe-member`) vangt een serverfout en een account zonder rij in user_state op
//    (`kopie`): nooit een Editie naast je account. Web en iPhone krijgen zo dezelfde Editie.
//  - Zonder account: samengesteld uit de body (met `earlier`: de history-regels van je vorige Edities op
//    dit toestel) en bewaard per profiel-afdruk en dagdeel (`cache`), zodat dezelfde vraag één keer rekent.
//    Niet per revisie: een deploy midden in het dagdeel laat de Editie staan.
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
import { readDoc, readDocIf, KEYS, kvGet, kvSet, kvTake } from '../lib/kv.mjs'
import { feedMemory } from '../lib/feed-geheugen.mjs'
import { refresh } from '../lib/refresh.mjs'
import { previousOf, historyOf, recentEditions, HISTORY_MAX } from '../lib/stories.mjs'
import { composePersonal, withoutDebug, editionBasis, earlierEditions } from '../../src/lib/personal.js'
import { accountAhead, claimFilter, readAccountEdition, TABLE } from '../../src/lib/editionSync.js'
import { EDITOR_REVISION } from '../../shared/editor-version.mjs'
import { readingSummary } from '../../src/lib/affinity.js'
import { currentChoice, RUBRIEKEN, withCrypto, ONDERWERPEN } from '../../src/lib/topics.js'
import { normalizePrefs } from '../../src/lib/prefs.js'
import { mutedSet } from '../../src/lib/sourcesel.js'
import { SUPABASE_URL, SUPABASE_KEY } from '../../src/lib/config.js'
import { slotIdNow } from '../../shared/tel.mjs'
import { logFault } from '../lib/edition-fout.mjs'
import { slotRank, laterSlot, volgendKey, volgendGeldt } from '../lib/dagdeel-kern.mjs'

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
  const now = body.rubrieken === RUBRIEKEN ? asked : currentChoice(asked.interests, asked.topics)
  // Zonder `onderwerpen` (app 1.3 en ouder): wie Economie helemaal volgde, krijgt Crypto erbij (topics.js withCrypto).
  if (body.onderwerpen === ONDERWERPEN) return { asked, ...now }
  const topics = withCrypto(now.interests, now.topics)
  return { asked, ...now, topics }
}

// De afdrukken waaronder deze vraag een Editie in je account herkent (Editie vast, 12 november 2026: "Mijn
// avondeditie is nu al 3x gewijzigd"). Eerst die van de vraag zelf (`basis`, wat het toestel zelf rekent), dan,
// als de keuze werd omgezet (choiceOf: app 1.2.1 zonder `rubrieken`), die van de keuze zoals de Redacteur hem
// leest. Het web (indeling van nu) en app 1.2.1 (oude indeling) vragen met dezelfde bronnen en interesses, maar
// in een andere indeling: de afdruk van de vraag verschilt, die van de omgezette keuze niet. Zonder deze tweede
// afdruk stelde de server bij elke wissel van toestel opnieuw samen en schreef hij over de Editie heen.
export function basesOf(p) {
  const asked = p.asked || p
  const own = editionBasis(p.followed, asked.interests, asked.topics, p.favorites)
  const read = editionBasis(p.followed, p.interests, p.topics, p.favorites)
  return own === read ? [own] : [own, read]
}
// Alle afdrukken van een vastgelegde Editie: haar `basis` en, als de server haar voor een omgezette keuze
// samenstelde, haar `bases` (zie composeFor).
const marksOf = (e) => [e.basis, ...(Array.isArray(e.bases) ? e.bases : [])].filter((b) => typeof b === 'string' && b)
// Past de Editie in je account bij dit dagdeel en bij één van de afdrukken van deze vraag?
export const fitsAny = (e, id, bases) => !!e && typeof e === 'object' && e.id === id && marksOf(e).some((b) => bases.includes(b))
// Dezelfde Editie, met de afdruk die het vragende toestel zelf rekent: zo herkent het haar de volgende keer
// zonder te vragen (app 1.2.1 en het web toetsen hun bewaarde Editie op hun eigen afdruk). Alleen het antwoord;
// de rij in je account blijft staan. `bases` draagt de afdruk van de rij mee (het web legt zijn samenvatting
// daarop vast, writeBrief). Met dezelfde afdruk: ongewijzigd, byte voor byte.
export function forAsker(e, bases) {
  if (e.basis === bases[0]) return e
  return { ...e, basis: bases[0], bases: [...new Set([...marksOf(e), ...bases])] }
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
  // Zonder de revisie van De Redacteur (Editie stabiel, 15 november 2026): het dagdeel-id staat er al in, en een deploy
  // midden in het dagdeel mag de Editie van een lezer zonder account niet laten wisselen. De Editie zelf draagt haar
  // `revision` nog wel. Wat je las (`readIds`) blijft in de sleutel: dat komt bewust niet terug.
  return `pe:${globalId}:${sha(norm)}`
}

// Samenstellen voor dit profiel, op de start van het dagdeel (`now = builtAt`), met `earlier` (Edities of
// history-regels) als wat er al stond. Gestempeld zoals het web vastlegt: owner, afdruk, history.
export function composeFor(start, items, p, { owner, earlier = [], prefsMark = null }) {
  const global = start.edition
  const bases = basesOf(p)
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
    basis: bases[0],
    ...(bases.length > 1 ? { bases } : {}), // omgezette keuze: ook de afdruk zoals de Redacteur hem leest (basesOf)
    history: earlier.map(historyOf).filter(Boolean),
    revision: EDITOR_REVISION,
    server: true,
    ...(prefsMark ? { prefsMark } : {}), // bij welke keuze in je account deze Editie hoort (prefsMarkOf)
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
// Zonder realtime (editiefix, 16 november 2026): supabase-js bouwt in createClient altijd een realtime-client, en die
// gooit op Node zonder ingebouwde WebSocket (Node 20) meteen een fout. Zo gaf elke vraag als lid van 11 tot 16 november
// een 502. De server gebruikt geen realtime: deze transport verbindt nooit, en zo maakt de Node-versie niet meer uit.
// `fetchImpl` alleen voor de tests (tests/editie-node.test.mjs: de echte client met een nep-PostgREST).
export class NoSocket {
  constructor() {
    throw new Error('Geen realtime op de server.')
  }
}
export const clientForToken = (token, fetchImpl = null) =>
  createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` }, ...(fetchImpl ? { fetch: fetchImpl } : {}) },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { transport: NoSocket },
  })

// De Editie en je instellingen uit je account, in één keer (je eigen rij, met jouw token). `exists`: er is een rij in
// user_state (zonder rij kan de server niets vastleggen, zie de kopie hieronder). Bij een fout gooien.
async function accountEdition(client, uid) {
  const { data, error } = await client.from(TABLE).select('edition, prefs').eq('user_id', uid).maybeSingle()
  if (error) throw new Error('account')
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null)
  return { exists: !!data, edition: obj(data?.edition), prefs: obj(data?.prefs) }
}

// De keuze in je account (Editie stabiel, 15 november 2026) als profiel: je bronnen, interesses, onderwerpen en
// voorkeursbronnen zoals een toestel ze na het ophalen van je account rekent (normalizePrefs, mutedSet, zoals
// usePersonalEdition.js), in de indeling van nu. Smaak, wat je las en je leesprofiel komen van de vraag (`p`), want die
// staan niet in je account. null als je account geen instellingen heeft: dan weten we het niet.
export function accountProfileOf(start, prefs, p = null) {
  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs) || !Object.keys(prefs).length) return null
  const n = normalizePrefs(prefs)
  const sources = start.sources || []
  const off = mutedSet(n, sources)
  const followed = sources.filter((s) => s.kind !== 'sociaal' && !off.has(s.id)).map((s) => s.id)
  const own = profileOf(start, { followed, interests: n.interests, topics: n.topics, favorites: n.favorites, rubrieken: RUBRIEKEN, onderwerpen: ONDERWERPEN })
  return p ? { ...p, followed: own.followed, interests: own.interests, topics: own.topics, asked: own.asked, favorites: own.favorites } : own
}
// De afdrukken van de keuze in je account (basesOf), of null.
export function accountBasesOf(start, prefs) {
  const own = accountProfileOf(start, prefs)
  return own ? basesOf(own) : null
}
// Het merk van de keuze in je account (`prefsMark`): de server zet het op elke Editie die hij als lid samenstelt, ook
// als de vrager zelf afwijkt. Zo weet hij later of je keuze in je account sindsdien echt veranderde, los van welk
// toestel de rij schreef en met welke afdruk. Alleen uit de keuzevelden zoals ze in `prefs` staan (gesorteerd), zonder
// bronnenlijst en zonder omzetting die van de code afhangt (normalizePrefs, currentTopics, RUBRIEKEN): haalt een deploy
// of feedronde een gevolgde bron uit de lijst, of verandert de indeling van onderwerpen, dan blijft het merk gelijk en je
// Editie staan (Editie stabiel, 15 november 2026, punt 1). null zonder instellingen.
//
// Versie 2 (editiefix S3, 16 november 2026): alleen wat de afdruk raakt. Van `muted` en `enabled` telt alleen welke
// nieuwsbronnen daardoor uit staan (mutedSet, zonder 'sociaal'): een gedempte Bluesky-bron of een `enabled` zonder
// gevolg veranderde het merk wel, en gaf zo binnen een dagdeel een tweede Editie. Een id dat niet (meer) in de
// bronnenlijst staat telt zoals het in `muted` staat, zodat een bron die uit de lijst verdwijnt het merk niet
// verandert (punt 1 hierboven). Een merk van versie 1 (zonder voorvoegsel) telt als onbekend: die rij blijft staan.
const MARK_FIELDS = ['interests', 'topics', 'favorites', 'rubrieken', 'onderwerpen']
export const MARK_V = 'm2:'
export function prefsMarkOf(prefs, sources = []) {
  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs) || !Object.keys(prefs).length) return null
  const field = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string'))].sort() : v ?? null)
  const known = new Map((Array.isArray(sources) ? sources : []).map((s) => [s.id, s]))
  const muted = field(prefs.muted) || []
  const enabled = field(prefs.enabled) || []
  const offKnown = [...mutedSet({ muted, enabled }, [...known.values()])].filter((id) => known.has(id) && known.get(id).kind !== 'sociaal')
  const off = [...new Set([...offKnown, ...muted.filter((id) => !known.has(id))])].sort()
  return MARK_V + sha(JSON.stringify([['off', off], ...MARK_FIELDS.map((k) => [k, field(prefs[k])])]))
}

// Een kopie van je Editie van dit dagdeel op de server (`pe-member:<sha256 user-id>:<dagdeel-id>`), voor als je account
// even niet te lezen of te schrijven is, of als er (nog) geen rij in user_state staat: dan krijg je toch dezelfde
// Editie, en geen vangnet. Opgeruimd na twee dagdelen (netlify/lib/opruimen.mjs). Per instantie onthouden we wat er al
// staat, zodat een treffer niet bij elke vraag opnieuw schrijft.
export const memberCopyKey = (uid, id) => `pe-member:${sha(uid)}:${id}`
const copied = new WeakMap() // kv -> Map(sleutel -> merk)
const COPY_MEMO_MAX = 5000
function keepCopy(kv, waitUntil, key, e) {
  if (!e || typeof e !== 'object') return
  let memo = copied.get(kv)
  if (!memo) copied.set(kv, (memo = new Map()))
  const mark = JSON.stringify([e.basis, e.bases || null, e.builtAt, e.version, !!e.brief])
  if (memo.get(key) === mark) return
  memo.set(key, mark)
  if (memo.size > COPY_MEMO_MAX) memo.delete(memo.keys().next().value)
  const saving = Promise.resolve()
    .then(() => kv.set(key, e))
    .catch(() => memo.delete(key))
  if (waitUntil) waitUntil(saving)
}
// Wat deze instantie nu per lid en dagdeel samenstelt (sleutel als de kopie): een belofte van de Editie van dit dagdeel.
const flights = new Map()
const readCopy = (kv, key, id) =>
  Promise.resolve()
    .then(() => kv.get(key))
    .then((e) => (e && typeof e === 'object' && e.id === id && Array.isArray(e.entries) ? e : null), () => null)

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

// De kern en de delen uit het geheugen van deze instantie, of uit Blobs als ze nieuw zijn (netlify/lib/feed-geheugen.mjs).
const memory = feedMemory({ readStart: (tag, strong = false) => readDocIf(KEYS.start, tag, { strong }), readPart: (id) => readDoc(KEYS.part(id)) })
// Ook koud (na een deploy) eerst het startbestand uit Blobs; refresh() binnen de aanvraag alleen als dat er echt
// niet is (een lege opslag). Nagekeken voor Editie stabiel: memory.loadStart geeft alleen null zonder body in Blobs.
async function loadStart() {
  const s = await memory.loadStart()
  if (s) return s
  await refresh()
  return memory.loadStart()
}
const loadItems = (start, followed) => memory.loadItems(start, followed)
// De kern opnieuw, met sterke consistentie (editiefix S2): zie freshStartFor hieronder.
const loadStartStrong = () => memory.loadStart({ strong: true })
// De vooraf vastgelegde kern (de Ochtendeditie, netlify/lib/dagdeel-kern.mjs), met een eigen geheugen; de delen per
// bron zijn dezelfde als die van de gewone kern.
const nextMemory = feedMemory({ readStart: (tag) => readDocIf(volgendKey(KEYS.start), tag), readPart: (id) => readDoc(KEYS.part(id)) })
const loadNextStart = () => nextMemory.loadStart()

// De plaats van een dagdeel-id in de tijd en de vergelijking: netlify/lib/dagdeel-kern.mjs (hier ook te importeren).
export { slotRank, laterSlot }

// Hoe lang elke stap duurde, als `Server-Timing`-kop (B7): alleen namen en milliseconden, nooit profiel, account of
// afdruk. Zo zien we in de browser en in een meting precies waar de tijd van een vraag zit.
export function stopwatch(clock = () => performance.now()) {
  const steps = []
  const time = (name, work) => {
    const t = clock()
    const done = () => steps.push([name, clock() - t])
    return Promise.resolve()
      .then(work)
      .then(
        (v) => (done(), v),
        (e) => {
          done()
          throw e
        }
      )
  }
  const header = () => steps.map(([n, ms]) => `${n};dur=${ms.toFixed(1)}`).join(', ')
  return { time, header }
}

const ok = (edition, source, watch = null) => Response.json({ edition, source, revision: EDITOR_REVISION }, { headers: { 'Cache-Control': 'private, no-store', ...(watch ? { 'Server-Timing': watch.header() } : {}) } })

// De Editie van v2 (zie boven). `deps` alleen voor de tests: nep-kern, nep-database, nep-opslag.
// Sneller (Hoot-design/editie-sneller/METING.md): wat niet op elkaar hoeft te wachten, loopt tegelijk (B3): je token
// en de kern, daarna je account en de kern (Editie stabiel); het quotum en het lezen van de delen. Het bewaren in de
// cache zonder account en van de kopie als lid houdt het antwoord niet op (B2, `waitUntil`). Wat er gekozen wordt,
// verandert niet: dezelfde stappen, dezelfde invoer.
const KV = { get: kvGet, set: kvSet, take: kvTake }
// Nooit een kale throw (editiefix, 16 november 2026): een onverwachte fout gaf een 502 van Netlify, en iOS 1.3.1 en 1.4
// proberen een 502 niet opnieuw (alleen 0, 429 en 503). Nu een 503 met Retry-After: het toestel vraagt zo opnieuw.
export const RETRY_S = 3
export async function editionV2(req, body, deps = {}) {
  try {
    return await editionV2Route(req, body, deps)
  } catch (e) {
    logFault('onverwacht', e, deps.log)
    return fail2(503, 'Je Editie is even niet bereikbaar.', { 'Retry-After': String(RETRY_S) })
  }
}
async function editionV2Route(req, body, deps) {
  // `fetch`: alleen voor de tests (de echte verifyToken en clientForToken met een nep-Supabase). `freshStart` en `now`:
  // de kern opnieuw lezen en de klok (S2). Met een eigen `start` (de tests) leest de server de kern alleen opnieuw als
  // de test ook `freshStart` meegeeft.
  const { start: startOf = loadStart, items: itemsOf = loadItems, kv = KV, waitUntil = null, fetch: fetchImpl = null, now = Date.now } = deps
  const { verify = (t) => verifyToken(t, fetchImpl || fetch), clientFor = (t) => clientForToken(t, fetchImpl), freshStart = deps.start ? null : loadStartStrong, nextStart = deps.start ? null : loadNextStart } = deps
  const watch = stopwatch()
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  const starting = watch.time('kern', startOf)
  starting.catch(() => {}) // een fout komt hieronder alsnog boven; nooit een onafgehandelde belofte
  let uid = null
  let client = null
  let reading = null // je account (Editie en instellingen), tegelijk met de kern
  if (token) {
    try {
      uid = await watch.time('token', () => verify(token))
    } catch {
      return fail2(503, 'Je account is nu niet bereikbaar.')
    }
    if (!uid) return fail2(401, 'Je sessie is verlopen.')
    try {
      client = clientFor(token)
    } catch (e) {
      // Zo crashte de server van 11 tot 16 november (supabase-js op Node 20): nu een 503, en het toestel vraagt opnieuw.
      logFault('client', e, deps.log)
      return fail2(503, 'Je account is nu niet bereikbaar.', { 'Retry-After': String(RETRY_S) })
    }
    reading = watch.time('account', () => accountEdition(client, uid))
    reading.catch(() => {})
  }
  let start = await starting
  if (!start?.edition?.id) return fail2(503, 'De feed is er nog niet.')
  // De wissel (besluit Alex 16 november 2026): is de ochtend op de klok begonnen en staat de kern nog op de avond, dan
  // rekenen we met de vooraf vastgelegde kern met de Ochtendeditie (netlify/lib/dagdeel-kern.mjs), voor elk toestel, met
  // of zonder account. Zo is er vanaf de start geen avond meer, ook niet terwijl de ronde van de start nog loopt.
  if (nextStart && laterSlot(slotIdNow(new Date(now())), start.edition.id)) {
    const next = await watch.time('volgend', nextStart).catch(() => null)
    if (volgendGeldt(start.edition.id, next?.edition?.id, new Date(now()))) start = next
  }
  // S2 (editiefix): als lid nooit de Editie van een eerder dagdeel terwijl er al een later dagdeel is. Zegt de klok dat er
  // een later dagdeel begonnen is dan dat van onze kern, dan lezen we de kern opnieuw met sterke consistentie (Blobs loopt
  // tot een minuut achter, en een iPhone met de kern van nu gooit een antwoord met een ander dagdeel weg, zonder opnieuw te
  // vragen). Is er een nieuwere kern, dan rekenen we daarmee. Is die er nog niet (de eerste feedronde van het dagdeel
  // loopt nog), dan is de Editie van nu nog die van het vorige dagdeel, voor elk toestel, en gaat die gewoon terug.
  // Lukt het opnieuw lezen niet, dan een 503 met Retry-After: liever zo opnieuw vragen dan een oude Editie.
  if (uid && freshStart && laterSlot(slotIdNow(new Date(now())), start.edition.id)) {
    let fresh = null
    try {
      fresh = await watch.time('kern', freshStart)
    } catch (e) {
      logFault('kern', e, deps.log)
      return fail2(503, 'De nieuwe Editie komt eraan.', { 'Retry-After': String(RETRY_S) })
    }
    if (fresh?.edition?.id && laterSlot(fresh.edition.id, start.edition.id)) start = fresh
  }
  const global = start.edition
  const id = global.id
  const p = profileOf(start, body)
  // Alle afdrukken van deze vraag (basesOf): dezelfde bronnen en interesses in de oude of de nieuwe indeling
  // herkennen dezelfde Editie. Echt andere bronnen of interesses: geen enkele afdruk past.
  const bases = basesOf(p)
  const fits = (e) => fitsAny(e, id, bases)
  const compose = (items, opts) => watch.time('rekenen', () => composeFor(start, items, p, opts))

  if (uid) {
    const copyKey = memberCopyKey(uid, id)
    const keep = (e) => keepCopy(kv, waitUntil, copyKey, e)
    // De kopie van dit dagdeel (zie keepCopy), met de afdruk van de vraag als die past; anders zoals ze is.
    const fromCopy = async () => {
      const c = await readCopy(kv, copyKey, id)
      return c ? ok(fits(c) ? forAsker(c, bases) : c, 'account', watch) : null
    }
    let acct
    try {
      acct = await reading
    } catch {
      // Je account is even niet te lezen: de kopie van dit dagdeel, anders pas een 503 (en het vangnet op het toestel).
      return (await fromCopy()) || fail2(503, 'Je account is nu niet bereikbaar.')
    }
    const row = acct.edition
    // Eén Editie per dagdeel (Editie stabiel, 15 november 2026: "Mijn ochtend editie is al 3x gewijzigd. Zomaar."):
    // staat er al een Editie van dit dagdeel in je account, dan is dat de Editie van dit dagdeel, wie haar ook schreef
    // en met welke afdruk. Opnieuw samenstellen doet de server alleen als je je keuze echt veranderde, en dat leest hij
    // uit je account, niet uit de vraag: de rij draagt het merk van de keuze in je account toen de server haar
    // samenstelde (`prefsMark`), en alleen als je account nu een ander merk geeft en de vraag bij je account past,
    // rekent hij opnieuw (je koos andere bronnen of interesses, en dat staat al in je account). In alle andere gevallen
    // gaat de rij terug: met de afdruk van de vraag als die bij de rij of (bij dezelfde keuze) bij je account past
    // (forAsker), anders zoals ze is. Het toestel toont haar (het web en iOS op dagdeel en lezer) en vraagt een volgende
    // ronde opnieuw, goedkoop en zonder quotum. Een rij zonder merk (door een toestel zelf vastgelegd, of van voor dit
    // herstel) blijft het hele dagdeel staan. Zo geeft een toestel dat afwijkt (een oudere bronnenlijst, een keuze die
    // nog niet is weggeschreven, iOS zonder `onderwerpen`) nooit een nieuwe Editie, ook niet als het als eerste vraagt.
    const acctProfile = accountProfileOf(start, acct.prefs, p)
    const acctBases = acctProfile ? basesOf(acctProfile) : null
    const acctMark = acctBases ? prefsMarkOf(acct.prefs, start.sources) : null
    const askIsAccount = !!acctBases && bases.some((b) => acctBases.includes(b))
    const sameChoice = (e) => fits(e) || (askIsAccount && fitsAny(e, id, acctBases))
    // Alleen een merk van dezelfde versie telt (MARK_V): een rij met een merk van versie 1 blijft het dagdeel staan.
    const choiceChanged = (e) => askIsAccount && !!acctMark && typeof e?.prefsMark === 'string' && e.prefsMark.startsWith(MARK_V) && e.prefsMark !== acctMark
    const answer = (e) => {
      keep(e)
      return ok(sameChoice(e) ? forAsker(e, bases) : e, 'account', watch)
    }
    if (row?.id === id) {
      if (sameChoice(row) || !choiceChanged(row)) return answer(row)
      // Anders: je keuze in je account is veranderd. Hieronder opnieuw samenstellen, alleen over deze rij heen.
    } else if (accountAhead(row, global)) {
      // Staat er al een Editie van een later dagdeel (ons startbestand uit Blobs loopt tot een minuut achter, en een
      // ander toestel had de kern van nu al): nooit daaroverheen schrijven (accountAhead, keuring P0 ronde 2 §4;
      // keuring server 1). Die Editie gaat terug; het web bewaart haar als 'ahead', iOS toont tot de kern bij is het vangnet.
      return ok(row, 'account', watch)
    } else {
      // Geen Editie van dit dagdeel in je account. Gaf de server er in dit dagdeel toch al een (de kopie: er was nog
      // geen rij in user_state, of de rij is net aangemaakt), dan blijft dat de Editie: zonder rij gaat zij zo terug,
      // met een rij leggen we haar vast in plaats van opnieuw te rekenen. Behalve als je keuze in je account veranderde.
      const prior = await readCopy(kv, copyKey, id)
      if (prior && (sameChoice(prior) || !choiceChanged(prior))) {
        if (!acct.exists) return answer(prior)
        const r = await watch.time('vastleggen', () => claimOver(client, uid, prior, row)).catch((e) => ({ won: false, theirs: null, error: e || true }))
        if (r.theirs?.id === id) return answer(r.theirs)
        if (accountAhead(r.theirs, global)) return ok(r.theirs, 'account', watch)
        return answer(prior)
      }
    }
    // Rekent deze instantie voor jou al een Editie van dit dagdeel (web en iPhone tegelijk), dan wachten we daarop in
    // plaats van zelf te rekenen: één keer gerekend, één Editie. Over instanties heen beslist claimOver.
    const flying = flights.get(copyKey)
    if (flying) {
      const e = await flying.catch(() => null)
      if (e?.id === id) return answer(e)
    }
    let settle = () => {}
    const flight = new Promise((resolve) => (settle = resolve))
    flights.set(copyKey, flight)
    try {
      const res = await composeAndClaim()
      return res.edition ? (settle(res.edition), res.response) : res.response
    } finally {
      settle(null)
      if (flights.get(copyKey) === flight) flights.delete(copyKey)
    }

    // Samenstellen en vastleggen. Past de vraag niet bij je account, dan met de keuze uit je account (je bronnen,
    // interesses, onderwerpen en voorkeursbronnen uit `prefs`) in plaats van die uit de vraag: de eerste schrijver wint,
    // ook als dat een toestel is dat afwijkt, en dan staat er toch de Editie van jouw keuze. Altijd met het merk van je
    // account. Uitkomst: { edition (de Editie van dit dagdeel, of null), response }.
    async function composeAndClaim() {
      const prof = acctProfile && !askIsAccount ? acctProfile : p
      // Het quotum en de delen tegelijk; rekenen pas als het quotum ja zegt. Alleen echte samenstellingen tellen.
      const parts = watch.time('delen', () => itemsOf(start, prof.followed))
      parts.catch(() => {})
      if ((await watch.time('quotum', () => kv.take(`pe-quota:${sha(uid)}:${id}`, MEMBER_PER_SLOT))) == null) return { edition: null, response: fail2(429, 'Even te veel tegelijk.', { 'Retry-After': String(TIMEOUT_HINT_S) }) }
      const earlier = earlierEditions({ local: null, account: row, id, owner: uid })
      const items = await parts
      const mine = await watch.time('rekenen', () => composeFor(start, items, prof, { owner: uid, earlier, prefsMark: acctMark }))
      if (!mine) return { edition: null, response: fail2(503, 'Er is nog geen editie.') }
      if (!acct.exists) {
        // Nog steeds geen rij: deze Editie geldt voor het hele dagdeel (de kopie), tot er een rij is.
        keep(mine)
        return { edition: mine, response: ok(mine, 'kopie', watch) }
      }
      const r = await watch.time('vastleggen', () => claimOver(client, uid, mine, row)).catch((e) => ({ won: false, theirs: null, error: e || true }))
      if (r.error) {
        const c = await readCopy(kv, copyKey, id)
        return c ? { edition: c, response: answer(c) } : { edition: null, response: fail2(503, 'Je account is nu niet bereikbaar.') }
      }
      if (r.won) {
        keep(mine)
        return { edition: mine, response: ok(mine, 'claimed', watch) }
      }
      // Een ander toestel (of een gelijktijdige aanvraag op een andere instantie) was net eerder: die Editie, voor
      // iedereen dezelfde. Nooit een Editie naast je account ('composed' bestaat voor leden niet meer).
      const theirs = r.theirs
      if (theirs?.id === id) return { edition: theirs, response: answer(theirs) }
      if (accountAhead(theirs, global)) return { edition: null, response: ok(theirs, 'account', watch) }
      // De rij verdween tussen lezen en schrijven (of staat er zonder Editie van nu): de kopie, of deze Editie als kopie.
      const c = await readCopy(kv, copyKey, id)
      if (c) return { edition: c, response: answer(c) }
      keep(mine)
      return { edition: mine, response: ok(mine, 'kopie', watch) }
    }
  }

  const earlier = cleanEarlier(body.earlier)
  const key = anonKey(id, p, earlier)
  const hit = await watch.time('cache', () => kv.get(key)).catch(() => null)
  if (hit && hit.id === id) return ok(hit, 'cache', watch)
  const mine = await compose(await watch.time('delen', () => itemsOf(start, p.followed)), { owner: 'anon', earlier })
  if (!mine) return fail2(503, 'Er is nog geen editie.')
  // Bewaren zonder het antwoord op te houden (B2): Netlify laat de functie dit afmaken na het antwoord.
  const saving = Promise.resolve()
    .then(() => kv.set(key, mine))
    .catch(() => {})
  if (waitUntil) waitUntil(saving)
  return ok(mine, 'composed', watch)
}

// Warmhouden (na een feedronde met een nieuw dagdeel, feed-refresh.mjs): de kern en alle delen in het geheugen van
// deze instantie, en één keer rekenen zodat de code warm is. Geen profiel, niets bewaard, niets terug; dezelfde
// kosten als een gewone vraag met alle bronnen (en dus onder dezelfde rate limit).
export async function warmUp(deps = {}) {
  const { start: startOf = loadStart, items: itemsOf = loadItems } = deps
  const watch = stopwatch()
  const start = await watch.time('kern', startOf)
  if (!start?.edition?.id) return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  const p = profileOf(start, { followed: (start.sources || []).map((s) => s.id), rubrieken: RUBRIEKEN })
  const items = await watch.time('delen', () => itemsOf(start, p.followed))
  await watch.time('rekenen', () => composeFor(start, items, p, { owner: 'anon', earlier: [] }))
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'Server-Timing': watch.header() } })
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
  if (body.v === 2 && body.warm === true) return warmUp(deps)
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

export default (req, context) => handle(req, { waitUntil: context?.waitUntil ? (p) => context.waitUntil(p) : null })

// 30 aanvragen per minuut per IP (Netlify); daarboven 429 en toont het toestel zijn vangnet.
export const config = { path: '/api/edition', rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] } }
