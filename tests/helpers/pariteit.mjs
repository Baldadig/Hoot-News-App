// De pariteitsmaten van Hoot-design/algoritme/aanvulling-pariteit-herhaling.md §3 op de momentopname, voor
// npm test (tests/pariteit.test.mjs) en de meetlat (meting/acceptatie.mjs laadt dit bestand uit HOOT_DIR):
//   route     : web-route (composePersonal zoals usePersonalEdition.js, berichten op tijd gesorteerd) tegen
//               de server-route (functions/edition.mjs editionFor, berichten per bron) voor dezelfde lezer,
//               met dezelfde invoer: plekken anders (van 10) en byte-gelijk na de velden die de terugval
//               erbij zet. Daarnaast, ter informatie, hetzelfde met het leesprofiel op het web: dat verschil
//               is de prijs van §8 (affinity gaat niet mee) en de reden dat de terugval nooit in het account
//               komt (P8-6).
//   toestellen: twee toestellen van hetzelfde account, met een ander leesprofiel, een andere gelezen-lijst
//               en een ander `previous` (het ene toestel had de Middag, het andere sloeg haar over), tegen
//               een nep-PostgREST (tests/helpers/pgrest.mjs): na "de eerste schrijver wint" (settleEdition)
//               tonen beide dezelfde Editie, in beide volgordes van aankomst. Gemeten: plekken anders en
//               byte-gelijk (zonder `history`, die is per toestel de vereniging van eigen en overgenomen).
import { composePersonal, withoutDebug, editionBasis } from '../../src/lib/personal.js'
import { editionFor } from '../../netlify/functions/edition.mjs'
import { settleEdition } from '../../src/lib/editionSync.js'
import { fakePostgrest } from './pgrest.mjs'
import { PERSONAS, setupFor, readIdsOf } from './snapshot.mjs'

const UID = 'pariteit'
const byRecency = (a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')
// Hetzelfde account op een ander toestel: daar las hij andere dingen (§8: affinity blijft op het toestel).
export const otherDevice = (a) => {
  if (!a) return { n: 12, topics: { voetbal: 6, economie: 4 }, sources: { nos: 8, nu: 4 } }
  const half = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, Math.round(v * 50) / 100]))
  return { n: Math.max(8, Math.round((a.n || 0) / 2)), topics: half(a.topics), sources: half(a.sources) }
}
export const shownOf = ({ history, ...e }) => JSON.stringify(e)

export async function measureParity(snap, { personas = PERSONAS.map((p) => p.id) } = {}) {
  const global = snap.edition
  const now = Date.parse(global.builtAt)
  const start = { edition: global, stories: snap.stories, sources: snap.sources, meta: snap.meta }
  const storyOfItem = new Map(snap.stories.flatMap((s) => s.itemIds.map((id) => [id, s.id])))
  const keysOf = (ed) => (ed?.entries || []).map((e) => (e.kind === 'story' ? e.id : storyOfItem.get(e.id) || e.id))
  const anders = (a, b) => {
    const B = new Set(keysOf(b))
    return keysOf(a).filter((k) => !B.has(k)).length
  }
  const webItems = (followed) => snap.items.filter((i) => followed.has(i.source)).sort(byRecency)
  const serverItems = (followed) => [...followed].flatMap((id) => snap.items.filter((i) => i.source === id))
  // Een Middag van vóór deze Editie, voor het toestel dat haar wél had: de algemene Editie zonder wat na
  // 12:00 kwam (we hebben alleen de Avond; benadering zoals de diagnose, previous.mjs).
  const middag = now - 5 * 36e5
  const before = (items, t) => items.filter((i) => !i.publishedAt || Date.parse(i.publishedAt) <= t)
  const midGlobal = { ...global, id: '2026-10-30-middag', builtAt: new Date(middag).toISOString(), version: `${'2026-10-30-middag'}@${new Date(middag).toISOString()}`, items: before(global.items || [], middag), wide: (global.wide || []).filter((w) => Date.parse(w.item?.publishedAt || 0) <= middag) }
  const midStories = snap.stories.map((s) => ({ ...s, latestAt: s.latestAt && Date.parse(s.latestAt) > middag ? new Date(middag).toISOString() : s.latestAt }))

  const rows = []
  for (const p of PERSONAS.filter((x) => personas.includes(x.id))) {
    const setup = setupFor(p, snap.sources, 'echt')
    const readIds = p.interests.length + p.topics.length ? readIdsOf(snap, p, setup.followed) : new Set()
    const basis = editionBasis([...setup.followed], setup.interests, setup.topics, setup.favorites)
    const base = { global, stories: snap.stories, sources: snap.sources, followed: setup.followed, interests: setup.interests, topics: setup.topics, favorites: setup.favorites, taste: setup.taste, now, previous: null }
    // Route: web zonder leesprofiel (dezelfde invoer als de terugval) en mét, tegen de server.
    const webKaal = withoutDebug(composePersonal({ ...base, items: webItems(setup.followed), affinity: null, readIds }))
    const webAff = withoutDebug(composePersonal({ ...base, items: webItems(setup.followed), affinity: setup.affinity, readIds }))
    const { basis: sb, owner, fallback, ...server } = editionFor(start, serverItems(setup.followed), { followed: [...setup.followed], interests: setup.interests, topics: setup.topics, favorites: setup.favorites, taste: setup.taste, readIds: [...readIds] })
    const route = { anders: anders(webKaal, server), byte: JSON.stringify(webKaal) === JSON.stringify(server) && sb === basis, andersAffinity: anders(webAff, server) }
    // Toestellen: A had de Middag (lokaal, met previous), B niet; ander leesprofiel en geen gelezen-lijst.
    const mid = composePersonal({ ...base, global: midGlobal, stories: midStories, items: before(webItems(setup.followed), middag), now: middag, affinity: setup.affinity, readIds: new Set() })
    const localA = mid ? { ...withoutDebug(mid), owner: UID, basis, history: [] } : null
    const A = { local: localA, compose: ({ previous, now }) => composePersonal({ ...base, items: webItems(setup.followed), affinity: setup.affinity, readIds, now, previous }) }
    const B = { local: null, compose: ({ previous, now }) => composePersonal({ ...base, items: webItems(setup.followed), affinity: otherDevice(setup.affinity), readIds: new Set(), now, previous }) }
    const toestellen = { anders: 0, byte: true, alleenAnders: anders(withoutDebug(A.compose({ previous: null, now })), withoutDebug(B.compose({ previous: null, now }))), schrijfacties: 0 }
    for (const order of [[A, B], [B, A]]) {
      const pg = fakePostgrest([{ user_id: UID, edition: null }])
      const common = { client: pg.client, uid: UID, owner: UID, global, basis, pulled: true }
      const [r1, r2] = await Promise.all(order.map((d) => settleEdition({ ...common, ...d })))
      toestellen.anders += anders(r1.edition, r2.edition) + anders(r2.edition, r1.edition)
      toestellen.byte = toestellen.byte && shownOf(r1.edition) === shownOf(r2.edition) && r1.source === 'claimed' && r2.source === 'account'
      toestellen.schrijfacties += pg.writes().length
    }
    rows.push({ lezer: p.id, route, toestellen })
  }
  const n = rows.length || 1
  return {
    rows,
    routeAnders: rows.reduce((s, r) => s + r.route.anders, 0) / n,
    routeByte: rows.filter((r) => r.route.byte).length / n,
    routeAndersAffinity: rows.reduce((s, r) => s + r.route.andersAffinity, 0) / n,
    toestellenAnders: rows.reduce((s, r) => s + r.toestellen.anders, 0) / (2 * n),
    toestellenByte: rows.filter((r) => r.toestellen.byte).length / n,
    toestellenAlleen: rows.reduce((s, r) => s + r.toestellen.alleenAnders, 0) / n, // zonder account zouden ze zo verschillen
    schrijfacties: rows.reduce((s, r) => s + r.toestellen.schrijfacties, 0) / (2 * n), // per wedloop: precies één
  }
}

