// Jouw Editie en je account: de regels waarmee een toestel de Editie van dit dagdeel vastlegt
// (Hoot-design/algoritme/aanvulling-pariteit-herhaling.md P8-2, P8-3, P8-5), los van React, zodat
// usePersonalEdition.js (web) en de app dezelfde volgorde van waarheid volgen en de wedloop tussen twee
// toestellen te toetsen is (tests/pariteit.test.mjs, met een nep-PostgREST).
//
//   1. al vastgelegd op dit toestel, voor dit dagdeel, deze lezer en deze afdruk (basis);
//   2. als lid: al vastgelegd in je account (een ander toestel was eerder) — dan die;
//   3. anders nu samenstellen en vastleggen: op het toestel en, als lid, in je account — waar de eerste
//      schrijver wint (claimEdition). Verliest dit toestel die wedloop, dan neemt het de Editie van het
//      andere toestel over, en legt die hier vast met de Edities van toen van beide toestellen als
//      `history` (adoptEdition), zodat beide hetzelfde `previous` hebben voor het volgende dagdeel.
// Zonder account stelt het toestel anoniem samen (owner 'anon') en raakt het `user_state` nooit aan.
import { withoutDebug, earlierEditions } from './personal.js'
import { previousOf, historyOf } from '../../netlify/lib/stories.mjs'
import { RUBRIEKEN } from './topics.js'

export const TABLE = 'user_state'

// P8-2: pas samenstellen als de feed er is en, als lid, je account één keer met succes is opgehaald.
// Anders rekent een vers toestel met de standaardinstellingen, overschrijft het de Editie van het eerste
// toestel en rekent het na het ophalen nog een keer. Lukt het ophalen niet (offline, `sync` 'error'),
// dan toch samenstellen: lokaal, zonder naar je account te schrijven (settleEdition, `pulled`).
// En pas als de berichten bij déze Editie en je bronnen van nu horen (`itemsFor`, useFeed): bij het
// openen staat de feed van je vorige bezoek klaar, en een nieuwe kern komt binnen vóór de berichten
// van dit dagdeel. Wie dan samenstelt, rekent met de berichten van gisteren en legt die Editie voor het
// hele dagdeel vast (P0, 9 november). Zonder `followed` toetsen we alleen het dagdeel.
// En pas als de kern in déze sessie van het netwerk kwam (`coreFresh`, useFeed): de cache van je vorige bezoek
// heeft een kern van een vorig dagdeel mét de berichten die erbij horen. Is je account eerder opgehaald dan de
// feed, dan stelde het web de Editie van gisteren samen en schreef die over de Editie van vandaag van je
// iPhone heen (keuring P0 ronde 2, §4). Komt er geen verse kern (offline), dan `stuck` en de terugval.
export function itemsCurrent(itemsFor, global, followed = null) {
  if (!itemsFor || !global || itemsFor.edition !== global.id) return false
  if (!followed) return true
  const asked = new Set(itemsFor.sources || [])
  return [...followed].every((id) => asked.has(id))
}
export function editionReady({ status, global, items = 0, uid = null, pulled = false, sync = 'idle', itemsFor = null, followed = null, coreFresh = false }) {
  return status === 'ready' && !!global && items > 0 && coreFresh === true && itemsCurrent(itemsFor, global, followed) && (!uid || pulled || sync === 'error')
}

// Staat er in je account al een Editie van een later dagdeel dan `global`? Dan loopt dit toestel achter (een
// kern van gisteren) en schrijft het niets in je account: anders verdwijnt de Editie van vandaag van je
// andere toestel (keuring P0 ronde 2, §4). Zonder tijd aan een van beide kunnen we het niet toetsen: dan nee.
export function accountAhead(theirs, global) {
  if (!theirs || typeof theirs !== 'object' || !global || theirs.id === global.id) return false
  const a = Date.parse(theirs.builtAt)
  const b = Date.parse(global.builtAt)
  return Number.isFinite(a) && Number.isFinite(b) && a > b
}

// Past een vastgelegde Editie bij dit dagdeel en deze afdruk (P8-1b)? Zonder afdruk (de bronnenlijst
// laadt nog) kunnen we die niet toetsen: dan niet weigeren.
export const fitsEdition = (e, { id, basis = null }) => !!e && typeof e === 'object' && e.id === id && (!basis || e.basis === basis)

// De Editie uit je account. Kolom ontbreekt of de rij is er nog niet? Dan stilletjes niets.
export async function readAccountEdition(client, uid) {
  const { data: row } = await client.from(TABLE).select('edition').eq('user_id', uid).maybeSingle().then((r) => r, () => ({}))
  return row?.edition && typeof row.edition === 'object' ? row.edition : null
}

// P8-3: de eerste schrijver wint. Eén PATCH die alleen raak is als er nog geen Editie staat of een andere
// (ander dagdeel, of dezelfde maar uit andere bronnen en interesses — die is niet de jouwe, P8-1b):
//   PATCH /rest/v1/user_state?user_id=eq.<uid>&or=(edition.is.null,edition->>id.neq.<id>,edition->>basis.neq.<basis>)
// `edition->>id.neq.<id>` alleen is onvoldoende: `null ->> id` is null en matcht niet, vandaar `is.null`.
// Met `Prefer: return=representation` zien we hoeveel rijen raak waren: 0 = een ander toestel was eerder;
// dan lezen we de rij en geeft `theirs` zijn Editie terug (null als er geen rij is, of bij een fout).
export const claimFilter = ({ id, basis }) => `edition.is.null,edition->>id.neq.${id},edition->>basis.neq.${basis}`
export async function claimEdition(client, uid, stamped) {
  const { data, error } = await client
    .from(TABLE)
    .update({ edition: stamped })
    .eq('user_id', uid)
    .or(claimFilter(stamped))
    .select('edition')
    .then((r) => r, (e) => ({ data: null, error: e || true }))
  if (error) return { won: false, theirs: null, error }
  if (Array.isArray(data) && data.length) return { won: true, theirs: null }
  return { won: false, theirs: await readAccountEdition(client, uid) }
}

// De samenvatting erbij: alleen bij de Editie die er nog staat (zelfde dagdeel en afdruk), nooit over
// een andere heen (P8-3, brief-schrijfactie). Gaf de server je Editie met jouw afdruk terug terwijl de rij een
// andere heeft (dezelfde keuze in de oude indeling, van app 1.2.1; edition.mjs forAsker), dan staat die van de
// rij in `bases`: ook daarop raak.
const MARK = /^[0-9a-z]{1,16}$/
export async function writeBrief(client, uid, next) {
  const marks = [...new Set([next.basis, ...(Array.isArray(next.bases) ? next.bases : [])])].filter((b) => typeof b === 'string' && MARK.test(b))
  if (!marks.length) return
  const q = client.from(TABLE).update({ edition: next }).eq('user_id', uid).eq('edition->>id', next.id)
  await (marks.length === 1 ? q.eq('edition->>basis', marks[0]) : q.or(marks.map((b) => `edition->>basis.eq.${b}`).join(','))).then(() => {}, () => {})
}

// P8-5: de Editie van het andere toestel, hier vastgelegd met de Edities van toen van beide toestellen als
// history. Een samenvatting die dit toestel al had voor dezelfde Editie gaat niet verloren.
export function adoptEdition(theirs, { local = null, owner, id }) {
  const history = earlierEditions({ local, account: theirs, id, owner }).map(historyOf).filter(Boolean)
  const brief = theirs.brief || (local && local.id === theirs.id && local.basis === theirs.basis && local.brief) || null
  return { ...theirs, owner, history, brief }
}

// De Editie van dit dagdeel voor deze lezer, volgens de volgorde van waarheid hierboven. `compose`
// krijgt `{ previous, now }` en geeft de Editie van composePersonal (of null); `local` is wat op dit
// toestel ligt. Uitkomst: { edition, source } met source
//   'account'  overgenomen uit je account (een ander toestel was eerder, of je bent terug op dit toestel);
//   'claimed'  hier samengesteld en als eerste in je account geschreven;
//   'anon'     zonder account samengesteld, alleen op dit toestel;
//   'unsynced' als lid samengesteld maar (nog) niet in je account: het ophalen is niet gelukt (P8-2), er
//              is geen rij, of het schrijven mislukte — lokaal houden, een volgende keer opnieuw;
//   'behind'   (edition null) je account heeft al een Editie van een later dagdeel (accountAhead): dit toestel
//              loopt achter; niets samenstellen, niets schrijven — de kern van nu komt zo.
export async function settleEdition({ client = null, uid = null, owner = 'anon', global, basis, local = null, pulled = false, compose }) {
  const id = global.id
  const fits = (e) => fitsEdition(e, { id, basis })
  const member = !!(uid && client)
  let theirs = null
  if (member && pulled) {
    theirs = await readAccountEdition(client, uid)
    if (fits(theirs)) return { edition: adoptEdition(theirs, { local, owner, id }), source: 'account' }
    if (accountAhead(theirs, global)) return { edition: null, source: 'behind' }
  }
  // Ligt hier al een Editie van deze lezer voor dit dagdeel, dan is die af (alleen nog vastleggen in het
  // account); anders samenstellen met de Edities van toen (dit toestel plus je account, de laatste drie).
  const earlier = earlierEditions({ local, account: theirs, id, owner })
  let stamped = fits(local) && local.owner === owner ? local : null
  if (!stamped) {
    const mine = compose({ previous: previousOf(earlier), now: Date.parse(global.builtAt) || Date.now() })
    if (!mine) return null
    stamped = { ...withoutDebug(mine), owner, basis, history: earlier.map(historyOf).filter(Boolean) }
  }
  if (!member) return { edition: stamped, source: 'anon' }
  if (!pulled) return { edition: stamped, source: 'unsynced' }
  const r = await claimEdition(client, uid, stamped)
  if (r.won) return { edition: stamped, source: 'claimed' }
  if (fits(r.theirs)) return { edition: adoptEdition(r.theirs, { local, owner, id }), source: 'account' }
  return { edition: stamped, source: 'unsynced' }
}

// `previous` in de platte vorm die POST /api/edition leest (arrays en objecten in plaats van Sets en Maps).
export function previousForServer(previous) {
  if (!previous) return null
  const arr = (v) => [...(v || [])]
  return {
    storyIds: arr(previous.storyIds),
    itemIds: arr(previous.itemIds),
    leadIds: arr(previous.leadIds),
    leadStoryId: previous.leadStoryId || null,
    leadStoryIds: arr(previous.leadStoryIds),
    at: previous.at || 0,
    atOf: Object.fromEntries(previous.atOf || []),
    titles: arr(previous.titles),
    shown: previous.shown || [],
    keysOf: Object.fromEntries([...(previous.keysOf || [])].map(([id, ks]) => [id, [...ks]])),
  }
}

// De terugval als de berichten van dit dagdeel niet binnenkomen, ook niet na één extra ronde (useFeed
// `stuck`: offline, of een bron die niet antwoordt). Dan stelt dit toestel níet samen — met de berichten die
// het nog heeft (van een vorige kern) gaf dat op 9 november een Editie van gisteren voor het hele dagdeel —
// en wacht het ook niet eindeloos. In deze volgorde:
//   1. 'account'  als lid na de pull: de Editie van dit dagdeel uit je account (een ander toestel was eerder);
//                 die is van jou en wordt hier vastgelegd zoals bij settleEdition;
//   2. 'server'   POST /api/edition (`server`): de server stelt samen met de berichten van nu. Gemerkt als
//                 terugval; gaat nooit naar je account en wordt niet vastgelegd, zodat dit toestel alsnog
//                 zelf samenstelt zodra de berichten er zijn;
//   3. 'global'   de algemene Editie van dit dagdeel ("De Editie voor iedereen"), zonder samenvatting.
// Een Editie die al op dit toestel vastligt toont usePersonalEdition zelf al; daar komt dit niet aan.
export async function fallbackEdition({ client = null, uid = null, owner = 'anon', global, basis, local = null, pulled = false, server = null, request = null }) {
  if (!global) return null
  const id = global.id
  if (uid && client && pulled) {
    const theirs = await readAccountEdition(client, uid).catch(() => null)
    if (fitsEdition(theirs, { id, basis })) return { edition: adoptEdition(theirs, { local, owner, id }), source: 'account' }
  }
  if (server) {
    const earlier = earlierEditions({ local, account: null, id, owner })
    const mine = await server({ ...(request || {}), previous: previousForServer(previousOf(earlier)) }).catch(() => null)
    if (mine && typeof mine === 'object' && mine.id === id && Array.isArray(mine.entries)) return { edition: { ...mine, personal: true, fallback: true, owner, basis: mine.basis || basis }, source: 'server' }
  }
  return { edition: { ...global, brief: null, fallback: true, owner }, source: 'global' }
}

// ---- De Redacteur op de server (besluit Alex, 9 november 2026; Hoot-design/redacteur-server/PLAN.md) ----
// De server stelt jouw Editie samen en legt haar zelf vast in je account (POST /api/edition, v2). Dit toestel
// rekent niet meer en claimt niets: het slaat het antwoord van de server letterlijk op (`hoot:my-edition`) en
// toont het. Zelf samenstellen gebeurt alleen nog als vangnet (offline, een fout, 429): die Editie heet
// voorlopig (`provisional: true`), staat onder een eigen sleutel, gaat nooit naar je account en nooit in
// `earlier`/`history`, en wordt vervangen zodra de server antwoordt.
export const SERVER_KEY = 'hoot:my-edition-server' // de taak (dagdeel|lezer|afdruk) waarvoor `hoot:my-edition` van de server kwam
export const PROVISIONAL_KEY = 'hoot:my-edition-provisional'
export const ASK_TIMEOUT_MS = 8000

// Mag het vangnet samenstellen? De berichten moeten bij de kern op dit toestel en je bronnen horen (itemsCurrent),
// ook offline met een kern uit de cache: wat het vangnet maakt, wordt toch nooit vastgelegd. Lid of niet maakt niet uit.
export function provisionalReady({ status, global, items = 0, itemsFor = null, followed = null }) {
  return status === 'ready' && !!global && items > 0 && itemsCurrent(itemsFor, global, followed)
}

// De vraag aan de server (v2): het profiel, wat je las, de samenvatting van je leesprofiel (`reading`,
// readingSummary in affinity.js; weg zolang lezen nog niet meetelt) en zonder account de history-regels van je
// vorige Edities op dit toestel (`earlier`). Nooit het ruwe `affinity`, nooit `previous`.
// `rubrieken`: je keuzes zijn in de indeling van nu (Games onder Cultuur, topics.js RUBRIEKEN); zonder dat veld
// (app 1.2.1 en ouder) zet de server ze eerst om.
export function serverRequest({ followed = [], interests = [], topics = [], favorites = [], taste = null, readIds = [], reading = null, earlier = [] }) {
  return { v: 2, followed: [...followed], interests: [...interests], topics: [...topics], rubrieken: RUBRIEKEN, favorites: [...favorites], taste: taste || null, readIds: [...readIds].slice(-1500), ...(reading ? { reading } : {}), ...(earlier.length ? { earlier } : {}) }
}

// POST /api/edition met het token van het lid (als dat er is). 401: één keer het token vernieuwen en opnieuw.
// Uitkomst { status, edition, source }; status 0 = geen verbinding of te traag (ASK_TIMEOUT_MS).
export async function askServer(body, { fetchImpl = fetch, token = null, refresh = null, timeout = ASK_TIMEOUT_MS } = {}) {
  const go = async (t) => {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null
    const timer = ctl ? setTimeout(() => ctl.abort(), timeout) : null
    try {
      const headers = { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
      return await fetchImpl('/api/edition', { method: 'POST', headers, body: JSON.stringify(body), ...(ctl ? { signal: ctl.signal } : {}) })
    } catch {
      return null
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
  let res = await go(token)
  if (res?.status === 401 && token && refresh) {
    const fresh = await Promise.resolve(refresh()).catch(() => null)
    if (fresh) res = await go(fresh)
  }
  if (!res) return { status: 0, edition: null, source: null }
  if (!res.ok) return { status: res.status, edition: null, source: null }
  const json = await res.json().catch(() => null)
  return { status: res.status, edition: json?.edition && typeof json.edition === 'object' ? json.edition : null, source: json?.source || null }
}

// De volgorde van het web en (1.2.1) de app:
//   1. 'local'        hier ligt al een Editie van de server voor dit dagdeel, deze lezer en deze afdruk;
//   2. 'server'       de server antwoordt (als lid pas na het ophalen van je account, `mayAsk`): letterlijk bewaren;
//   3. 'provisional'  geen antwoord (offline, fout, 429) en de berichten zijn er: zelf samenstellen, voorlopig;
//   4. 'global'       ook dat niet, maar de berichten komen niet (`stuck`): de algemene Editie;
//      null           nog even wachten (de berichten of je account komen nog).
// `ask(body)` geeft { status, edition } (askServer); `compose({ previous, now })` de Editie van composePersonal.
// Uitkomst { edition, source, keep }: `keep` = bewaren als Editie van de server (alleen bij 1 en 2).
// Een antwoord van een later dagdeel dan de kern op dit toestel (de kern loopt achter) heet 'ahead': bewaren,
// en tonen zodra de kern bij is; tot dan het vangnet.
// `localServed`: `local` kwam van de server voor zijn eigen dagdeel (servedLocal). Na een dagdeelwissel is `localFromServer`
// (voor dít dagdeel) altijd false; de Editie van het vorige dagdeel hoort dan toch in `previous` van het vangnet, anders
// stelt het vangnet samen zonder herhaalregel (nieuw feit, 13 november).
export async function serverFirst({ global, owner, basis, local = null, localFromServer = false, localServed = localFromServer, online = true, mayAsk = true, ask, request, compose = null, ready = false, stuck = false }) {
  if (!global) return null
  const id = global.id
  const fits = (e) => fitsEdition(e, { id, basis }) && e.owner === owner
  if (fits(local) && localFromServer) return { edition: local, source: 'local', keep: false }
  let ahead = null
  if (online && mayAsk && ask) {
    const r = await ask(request).catch(() => null)
    const e = r?.edition
    if (e && e.owner === owner && e.id === id && Array.isArray(e.entries)) return { edition: e, source: 'server', keep: true }
    if (e && e.owner === owner && Array.isArray(e.entries) && Date.parse(e.builtAt) > Date.parse(global.builtAt)) ahead = e
  }
  const out = (x) => (ahead ? { ...x, ahead } : x)
  if (ready && compose) {
    const earlier = earlierEditions({ local: localFromServer || localServed ? local : null, account: null, id, owner })
    const mine = compose({ previous: previousOf(earlier), now: Date.parse(global.builtAt) || Date.now() })
    if (mine) return out({ edition: { ...withoutDebug(mine), owner, basis, provisional: true }, source: 'provisional', keep: false })
  }
  if (stuck) return out({ edition: { ...global, brief: null, fallback: true, owner }, source: 'global', keep: false })
  return ahead ? { edition: null, source: 'ahead', keep: false, ahead } : null
}

// Eén vraag aan de server per ronde (`key`: dagdeel, lezer, afdruk, of je mag vragen, en de `nonce` van weer online of
// terug in de app; Editie sneller C2). Loopt de vraag nog (`busy`), dan wacht een nieuwe stand (de berichten kwamen
// binnen) op haar antwoord in plaats van het weg te gooien en opnieuw te vragen. Is ze beantwoord zonder Editie
// (offline, fout, te traag), dan rekent een volgende stand alleen het vangnet (`start` geeft false).
export function askGate() {
  let asking = ''
  let asked = ''
  return {
    busy: (key) => asking === key,
    start(key, may) {
      const now = !!may && asked !== key
      if (now) asking = key
      return now
    },
    done(key) {
      if (asking === key) asking = ''
      asked = key
    },
    fail(key) {
      if (asking === key) asking = ''
    },
  }
}

// Kwam `local` (de laatst bewaarde Editie op dit toestel) van de server, voor zijn eigen dagdeel, deze lezer en zijn afdruk?
// `serverTask`: wat onder SERVER_KEY staat (dagdeel|lezer|afdruk). Dan telt hij als vorige Editie, ook na een
// dagdeelwissel. Het vangnet staat onder een eigen sleutel en telt nooit.
export const servedLocal = (local, serverTask, owner) => !!local && typeof local === 'object' && local.owner === owner && typeof local.id === 'string' && serverTask === `${local.id}|${owner}|${local.basis}`

// Zonder account: de history-regels van je vorige Edities van de server op dit toestel (nooit het vangnet).
export const earlierForServer = (local, { id, owner }) => earlierEditions({ local, account: null, id, owner }).map(historyOf).filter(Boolean)
