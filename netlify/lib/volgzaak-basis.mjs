// Volgen in Hoot 1.5 (codenaam volgzaak): de vlaggen, de sleutels in KV en het veld in de feed. Klein gehouden, zodat de
// feed-ronde (build.mjs) het kan lezen zonder de rest van De Redacteur mee te laden.
//
// Plan: Hoot-design/ontwerp/volgen-1.5/TECHNISCH-PLAN.md (blok 1: alleen server, vlag HOOT_VOLGZAKEN uit).
// - HOOT_VOLGZAKEN: 'uit' (standaard, ook elke andere waarde), 'proef' (alleen verzoeken met de telsleutel, niets in de
//   feed) of 'aan'. Met 'uit' verandert er voor lezers niets en worden er geen modelkosten gemaakt.
// - HOOT_VOLGZAAK_VOORRAAD=uit: de noodrem voor het schrijven van de voorraad (die loopt ook met de vlag uit).
//
// Privacy: wat iemand volgt is persoonlijk. Alles hier is gedeeld en anoniem. Een sleutel met een account-id
// (quota, tik) bevat nooit een slug; een document met een slug bevat nooit een account-id. Slugs en opdrachten komen nooit
// in een URL of een log.

export const volgzakenStand = (env = process.env) => {
  const v = String(env?.HOOT_VOLGZAKEN || '').trim().toLowerCase()
  return v === 'aan' || v === 'proef' ? v : 'uit'
}
export const voorraadAan = (env = process.env) => String(env?.HOOT_VOLGZAAK_VOORRAAD || '').trim().toLowerCase() !== 'uit'

// De Nederlandse dag (jjjj-mm-dd) van een tijd, zoals dagNL in luister.mjs.
export const dagNL = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Europe/Amsterdam' })
// De UTC-dag, voor de tellers per lid (zoals brief-quota).
export const dagUTC = (t) => new Date(t).toISOString().slice(0, 10)

export const VK = {
  voorraad: (dag) => `volgzaak-voorraad:${dag}`,
  alias: (h) => `volgzaak-alias:${h}`,
  def: (slug) => `volgzaak-def:${slug}`,
  lijst: 'volgzaak-lijst-v1',
  volgers: (slug) => `volgzaak-volgers:${slug}`,
  treffers: (slug) => `volgzaak-treffers:${slug}`,
  oordeel: (slug) => `volgzaak-oordeel:${slug}`,
  wachtrij: 'volgzaak-wachtrij-v1',
  feed: 'volgzaak-feed-v1',
  stand: (slug, slotId) => `volgzaak-stand:${slug}:${slotId}`,
  dagUsd: (dag) => `volgzaak-dag-usd:${dag}`,
  quota: (uid, dag) => `volgzaak-quota-${uid}-${dag}`,
  quotaAll: (dag) => `volgzaak-quota-all-${dag}`,
  tik: (uid, dag) => `volgzaak-tik-${uid}-${dag}`,
  proef: 'volgzaak-proef-v1',
}

export const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/
export const geldigeSlug = (s) => typeof s === 'string' && s.length >= 2 && s.length <= 40 && SLUG.test(s)

export const VOORRAAD_KEEP_DAYS = 14 // de voorraad: veertien dagen plus vandaag (opruimen.mjs)
export const STAND_KEEP = 5 // momentopnamen: het lopende dagdeel en vijf vorige
export const DAG_USD_KEEP_DAYS = 7 // de kosten per dag
export const TREFFERS_KEEP = 21 * 864e5 // een treffer blijft 21 dagen in zijn document
export const STIL_NA = 21 * 864e5 // drie weken zonder nieuw zeker verhaal: stil
export const FEED_UREN = 36 // het veld in de feed: zekere treffers uit de reikwijdte van de Stroom
export const VOLGZAAK_DAG_USD = 5 // het eigen plafond, bovenop OORDEEL_DAG_USD = 3 van luister
export const MAX_OORDELEN_PER_DAG = 12 // per volgzaak per Nederlandse dag
export const KV_MS = 1500

const binnen = (p, ms) => {
  let t
  return Promise.race([Promise.resolve().then(() => p), new Promise((_, no) => (t = setTimeout(() => no(new Error('time-out')), ms)))]).finally(() => clearTimeout(t))
}
export { binnen }

// De feed-ronde (build.mjs): alleen bij 'aan' één kant-en-klaar document uit KV, met een kort leesbudget. Geeft een Map
// (verhaal-id → { slug, label }) of null. Met de vlag uit wordt `get` niet aangeroepen.
export async function volgzaakUitKV({ stand = volgzakenStand(), get, budget = KV_MS } = {}) {
  if (stand !== 'aan' || !get) return null
  try {
    const doc = await binnen(get(VK.feed), budget)
    if (!doc || typeof doc.s !== 'object' || !doc.s) return null
    const m = new Map()
    for (const [id, v] of Object.entries(doc.s)) if (v && geldigeSlug(v.slug) && typeof v.label === 'string' && v.label) m.set(id, { slug: v.slug, label: v.label })
    return m
  } catch {
    return null
  }
}

// Het veld `volgzaak` op de verhalen (ook via een oude id: formerIds). Zonder map: dezelfde lijst, onaangeroerd.
export function metVolgzaak(stories, map) {
  if (!map?.size) return stories
  return stories.map((st) => {
    const v = map.get(st.id) || (st.formerIds || []).map((id) => map.get(id)).find(Boolean)
    return v ? { ...st, volgzaak: { slug: v.slug, label: v.label } } : st
  })
}
