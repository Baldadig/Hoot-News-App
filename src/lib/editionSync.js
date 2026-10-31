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

export const TABLE = 'user_state'

// P8-2: pas samenstellen als de feed er is en, als lid, je account één keer met succes is opgehaald.
// Anders rekent een vers toestel met de standaardinstellingen, overschrijft het de Editie van het eerste
// toestel en rekent het na het ophalen nog een keer. Lukt het ophalen niet (offline, `sync` 'error'),
// dan toch samenstellen: lokaal, zonder naar je account te schrijven (settleEdition, `pulled`).
export function editionReady({ status, global, items = 0, uid = null, pulled = false, sync = 'idle' }) {
  return status === 'ready' && !!global && items > 0 && (!uid || pulled || sync === 'error')
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
// een andere heen (P8-3, brief-schrijfactie).
export async function writeBrief(client, uid, next) {
  await client.from(TABLE).update({ edition: next }).eq('user_id', uid).eq('edition->>id', next.id).eq('edition->>basis', next.basis).then(() => {}, () => {})
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
//              is geen rij, of het schrijven mislukte — lokaal houden, een volgende keer opnieuw.
export async function settleEdition({ client = null, uid = null, owner = 'anon', global, basis, local = null, pulled = false, compose }) {
  const id = global.id
  const fits = (e) => fitsEdition(e, { id, basis })
  const member = !!(uid && client)
  let theirs = null
  if (member && pulled) {
    theirs = await readAccountEdition(client, uid)
    if (fits(theirs)) return { edition: adoptEdition(theirs, { local, owner, id }), source: 'account' }
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
