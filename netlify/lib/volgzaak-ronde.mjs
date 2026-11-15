// De geplande ronde van volgzaken (volgen 1.5, bouwplanstappen 1.1 en 1.4), in een eigen functie
// (functions/volgzaak-ronde.mjs), los van de feed-ronde van 15 s. Stap voor stap:
// 1. De voorraad bijwerken (volgzaak-voorraad.mjs), altijd, behalve met de noodrem. Geen model.
// 2. Met de vlag uit stopt het hier: geen matching, geen wachtrij, geen kosten.
// 3. Matching: de actieve volgzaken uit de index (bij 'aan' alleen met volgers, bij 'proef' alle), hooguit RONDE_MAX per
//    keer, wie het langst niet aan de beurt was eerst. Een nieuwe volgzaak (nog zonder treffers) krijgt de hele voorraad.
// 4. De wachtrij voor het oordeel: de twijfel zonder oordeel, gesorteerd zoals het plafond wil (meeste volgers eerst),
//    zonder volgzaken die vandaag vol zitten en zonder verhalen waarvan de pogingen op zijn (kiesWachtrij).
// 5. Het feeddocument (alleen bij 'aan'): zeker of ja, uit de laatste FEED_UREN, per verhaal de volgzaak met de meeste
//    volgers.
// 6. Een momentopname per dagdeel per volgzaak, zodat web en app het hele dagdeel hetzelfde zien.
// 7. Stil: drie weken geen nieuw zeker verhaal. Een stille volgzaak kost geen oordelen.
// 8. Tellingen voor de proef; het log krijgt alleen aantallen.
import { SOURCES } from './sources.mjs'
import { editionSlot } from './stories.mjs'
import { VK, volgzakenStand, geldigeSlug, dagNL, binnen, KV_MS, TREFFERS_KEEP, STIL_NA, FEED_UREN, MAX_OORDELEN_PER_DAG } from './volgzaak-basis.mjs'
import { MAX_POGINGEN } from './luister.mjs'
import { voorraadRonde, stukkenUit, voorraadDagen } from './volgzaak-voorraad.mjs'
import { matchVerhalen, haagseBundels, koppenVan } from './volgzaak-match.mjs'
import { oordeelVraag } from './volgzaak-oordeel.mjs'

export const RONDE_MS = 22000
export const RONDE_MAX = 150
export const MAX_VRAGEN = 24 // de wachtrij: de volgende ronde, tien minuten later, de volgende
export const STAND_MAX = 40 // verhalen in een momentopname
export const PROEF_SLOTS = 9
const SOURCE = new Map(SOURCES.map((s) => [s.id, s]))
const H = 36e5
const RANG = { z: 3, j: 2, t: 1, n: 0 }

// Treffers samenvoegen (zuiver). `cur`: het document { v, cursor, s: { sleutel: [oordeel, pubs, laatst, eerst, kop, bron,
// url, desk] } }; `matches`: matchVerhalen. Zeker wint altijd; een bewaard oordeel (j/n) blijft bij twijfel staan, ook als
// het verhaal van id wisselde (formerIds). Wat ouder is dan TREFFERS_KEEP valt weg.
export function voegTreffersSamen(cur, matches, { now, cursor = null } = {}) {
  const s = {}
  for (const [k, v] of Object.entries(cur?.s && typeof cur.s === 'object' ? cur.s : {})) if (Array.isArray(v) && now - (Number(v[2]) || 0) <= TREFFERS_KEEP) s[k] = v
  let nieuwZeker = 0
  for (const [k, m] of matches) {
    const e = s[k] || m.f.map((f) => s[f]).find((x) => x && (x[0] === 'j' || x[0] === 'n'))
    const was = s[k]?.[0]
    let oordeel = m.oordeel
    if (oordeel !== 'z' && e && e[0] !== 't') oordeel = e[0]
    if ((oordeel === 'z' || oordeel === 'j') && was !== 'z' && was !== 'j') nieuwZeker++
    s[k] = [oordeel, Math.max(m.pubs, Number(e?.[1]) || 0), Math.max(m.laatst, Number(e?.[2]) || 0), Math.min(m.eerst, Number(e?.[3]) || Infinity), m.kop, m.bron, m.url, m.desk]
  }
  return { doc: { v: 1, cursor, s }, nieuwZeker }
}

export const isZeker = (v) => v?.[0] === 'z' || v?.[0] === 'j'
export const laatstNieuwVan = (doc) => Math.max(0, ...Object.values(doc?.s || {}).filter(isZeker).map((v) => Number(v[2]) || 0)) || null

// De volgorde van de wachtrij als het krap wordt: meeste volgers eerst; bij gelijk aantal wie vandaag het minst
// beoordeeld is; binnen een volgzaak de verhalen met de meeste uitgevers, dan de nieuwste.
export function ordeWachtrij(vragen, { vandaag = {} } = {}) {
  return [...vragen].sort((a, b) => (b.volgers || 0) - (a.volgers || 0) || (vandaag[a.slug] || 0) - (vandaag[b.slug] || 0) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0) || (b.pubs || 0) - (a.pubs || 0) || (b.laatst || 0) - (a.laatst || 0) || (a.key < b.key ? -1 : 1))
}

// De wachtrij van deze keer (zuiver): eerst weg wat toch niet gevraagd wordt, dan ordeWachtrij, dan per volgzaak hooguit
// de oordelen die er vandaag nog over zijn, dan hooguit `max`. Weg valt: een volgzaak die vandaag vol zit
// (vandaag[slug] >= maxPerDag), een verhaal dat al een oordeel heeft (oordelen[slug].o) en een verhaal waarvan de
// pogingen op zijn (oordelen[slug].p >= maxPogingen). Zo houdt een volle of vastgelopen volgzaak de rij niet bezet.
export function kiesWachtrij(vragen, { vandaag = {}, oordelen = {}, maxPerDag = MAX_OORDELEN_PER_DAG, maxPogingen = MAX_POGINGEN, max = MAX_VRAGEN } = {}) {
  const over = (slug) => Math.max(0, maxPerDag - (Number(vandaag[slug]) || 0))
  const kan = vragen.filter((v) => {
    const doc = oordelen[v.slug]
    return over(v.slug) > 0 && !doc?.o?.[v.key] && (Number(doc?.p?.[v.key]?.[0]) || 0) < maxPogingen
  })
  const perSlug = {}
  const rij = []
  for (const v of ordeWachtrij(kan, { vandaag })) {
    if (rij.length >= max) break
    if ((perSlug[v.slug] || 0) >= over(v.slug)) continue
    perSlug[v.slug] = (perSlug[v.slug] || 0) + 1
    rij.push(v)
  }
  return rij
}

// Een bewaard oordeel (volgzaak-oordeel:<slug>.o) over twijfel heen leggen, voor het geval de oordeelronde het in de
// treffers niet kwijt kon (zuiver; geeft het aantal aangepaste regels).
export function legOordelenOver(doc, oordeelDoc) {
  let n = 0
  for (const [k, o] of Object.entries(oordeelDoc?.o || {})) {
    if (doc.s[k]?.[0] === 't' && Array.isArray(o) && (o[0] === 'j' || o[0] === 'n')) {
      doc.s[k] = [o[0], ...doc.s[k].slice(1)]
      n++
    }
  }
  return n
}

// De momentopname van een volgzaak voor dit dagdeel (alleen zeker en ja).
export function momentopname(def, treffers, { slot, now }) {
  const verhalen = Object.entries(treffers?.s || {})
    .filter(([, v]) => isZeker(v))
    .sort((a, b) => b[1][2] - a[1][2] || (a[0] < b[0] ? -1 : 1))
    .slice(0, STAND_MAX)
    .map(([key, v]) => ({ verhaal: key, kop: v[4], bron: v[5], url: v[6], bronnen: v[1], at: new Date(v[2]).toISOString(), betaald: !!SOURCE.get(v[5])?.paid, rubriek: v[7] || null }))
  return { v: 1, slug: def.slug, label: def.label, slot, at: new Date(now).toISOString(), verhalen }
}

// Het feeddocument: zeker of ja uit de laatste FEED_UREN, per verhaal de volgzaak met de meeste volgers. Losse stukken
// krijgen het veld in 1.5 niet.
export function feedVan(perSlug, { now }) {
  const s = {}
  const kies = new Map()
  for (const { slug, label, volgers, treffers } of perSlug) {
    for (const [key, v] of Object.entries(treffers?.s || {})) {
      if (!isZeker(v) || key.startsWith('los:') || now - v[2] > FEED_UREN * H) continue
      const cur = kies.get(key)
      if (!cur || volgers > cur.volgers || (volgers === cur.volgers && slug < cur.slug)) kies.set(key, { slug, label, volgers })
    }
  }
  for (const [key, { slug, label }] of kies) s[key] = { slug, label }
  return { at: new Date(now).toISOString(), s }
}

const defaultIo = async () => {
  const kv = await import('./kv.mjs')
  return { get: kv.kvGet, set: kv.kvSet, update: (k, fn) => kv.kvUpdate(k, fn, { tries: 3 }), lees: kv.readDoc, leesArchief: kv.readArchive, schrijfArchief: kv.writeArchive }
}

export async function volgzaakRonde({ now = Date.now(), start = now, env = process.env, io = null, budget = RONDE_MS, kvMs = KV_MS, rondeMax = RONDE_MAX } = {}) {
  const { get, set, update, lees, leesArchief, schrijfArchief } = io || (await defaultIo())
  const tot = start + budget
  const stats = { voorraad: null, stand: volgzakenStand(env) }
  // 1. De voorraad.
  const vr = await voorraadRonde({ now, env, lees, leesArchief, schrijfArchief, kvMs })
  stats.voorraad = vr.stats
  // 2. Met de vlag uit: verder niets.
  if (stats.stand === 'uit') return { stats }
  try {
    const lijst = (await binnen(get(VK.lijst), kvMs).catch(() => null)) || {}
    const actief = Object.entries(lijst)
      .filter(([slug, e]) => geldigeSlug(slug) && e && e.status !== 'af' && (stats.stand === 'proef' || (Number(e.volgers) || 0) > 0))
      .sort((a, b) => (Number(a[1].beurt) || 0) - (Number(b[1].beurt) || 0) || (a[0] < b[0] ? -1 : 1))
      .slice(0, rondeMax)
    stats.volgzaken = actief.length
    if (!actief.length) {
      if (stats.stand === 'aan') await binnen(set(VK.feed, { at: new Date(now).toISOString(), s: {} }), kvMs).catch(() => {})
      return { stats }
    }
    // De defs, treffers en volgers van deze keer.
    const per = await Promise.all(
      actief.map(async ([slug, e]) => {
        const [def, treffers, volgers, oordeel] = await Promise.all([binnen(get(VK.def(slug)), kvMs).catch(() => null), binnen(get(VK.treffers(slug)), kvMs).catch(() => undefined), binnen(get(VK.volgers(slug)), kvMs).catch(() => null), binnen(get(VK.oordeel(slug)), kvMs).catch(() => null)])
        return { slug, e, def, treffers, oordeel, volgers: Math.max(0, Number(volgers) || 0) }
      }),
    )
    // 3. De stukken: vandaag en gisteren uit de voorraad; een nieuwe volgzaak de hele voorraad.
    let docs = { ...(vr.docs || {}) }
    if (!vr.docs) for (const dag of voorraadDagen(now, 2)) docs[dag] = await binnen(leesArchief(VK.voorraad(dag)), kvMs).catch(() => null)
    if (per.some((p) => p.def && p.treffers === null)) {
      const rest = voorraadDagen(now).filter((d) => !(d in docs))
      const extra = await Promise.all(rest.map((d) => (Date.now() < tot - 8000 ? binnen(leesArchief(VK.voorraad(d)), kvMs).catch(() => null) : null)))
      rest.forEach((d, i) => (docs[d] = extra[i]))
      stats.heleVoorraad = true
    }
    const { stukken, verhalen } = stukkenUit(docs)
    const bundels = haagseBundels(stukken)
    stats.stukken = stukken.length
    const dag = dagNL(now)
    const dagDoc = await binnen(get(VK.dagUsd(dag)), kvMs).catch(() => null)
    const vandaag = dagDoc?.per && typeof dagDoc.per === 'object' ? dagDoc.per : {}
    const oordelen = {}
    const slot = editionSlot(new Date(now)).id
    const vragen = []
    const nieuwIndex = {}
    const voorFeed = []
    const proef = { zeker: 0, twijfel: 0, perVolgzaak: {} }
    for (const p of per) {
      if (!p.def || Date.now() > tot) continue
      const matches = matchVerhalen(p.def, stukken, { verhalen, bundels })
      const { doc, nieuwZeker } = voegTreffersSamen(p.treffers, matches, { now, cursor: vr.docs ? Object.values(vr.docs)[0]?.meta?.builtAt || null : null })
      legOordelenOver(doc, p.oordeel)
      if (p.oordeel) oordelen[p.slug] = p.oordeel
      if (JSON.stringify(doc.s) !== JSON.stringify(p.treffers?.s || {})) await binnen(set(VK.treffers(p.slug), doc), kvMs).catch(() => {})
      const laatstNieuw = laatstNieuwVan(doc)
      const at = Date.parse(p.def.at) || now
      const stil = now - Math.max(at, laatstNieuw || 0) > STIL_NA
      const z = Object.values(doc.s).filter(isZeker).length
      const t = Object.values(doc.s).filter((v) => v[0] === 't').length
      proef.zeker += z
      proef.twijfel += t
      proef.perVolgzaak[p.slug] = { z, t, nieuwZeker }
      // 4. De twijfel zonder oordeel, voor zover de koppen in deze lezing zitten. Een stille volgzaak kost niets.
      if (!stil) {
        for (const [key, m] of matches) {
          if (doc.s[key]?.[0] !== 't') continue
          vragen.push({ slug: p.slug, key, pubs: m.pubs, laatst: m.laatst, volgers: p.volgers, prompt: oordeelVraag(p.def, koppenVan(stukken, m.stukken)) })
        }
      }
      // 6. De momentopname: één keer per dagdeel, en meteen voor een nieuwe volgzaak.
      let standSlot = p.e.stand || null
      if (standSlot !== slot) {
        await binnen(set(VK.stand(p.slug, slot), momentopname(p.def, doc, { slot, now })), kvMs)
          .then(() => (standSlot = slot))
          .catch(() => {})
      }
      nieuwIndex[p.slug] = { volgers: p.volgers, laatstNieuw: laatstNieuw ? new Date(laatstNieuw).toISOString() : null, status: stil ? 'stil' : p.e.status === 'stil' ? 'stil' : 'actief', beurt: now, stand: standSlot }
      voorFeed.push({ slug: p.slug, label: p.def.label, volgers: p.volgers, treffers: doc })
    }
    const rij = kiesWachtrij(vragen, { vandaag, oordelen })
    stats.wachtrij = rij.length
    stats.twijfel = vragen.length
    await binnen(set(VK.wachtrij, { v: 1, at: now, vragen: rij }), kvMs).catch(() => {})
    // 5. Het feeddocument, alleen bij 'aan'. Volgzaken die deze keer niet aan de beurt waren, houden hun regels.
    if (stats.stand === 'aan') {
      const vorig = (await binnen(get(VK.feed), kvMs).catch(() => null))?.s || {}
      const nu = feedVan(voorFeed, { now })
      const gedaan = new Set(voorFeed.map((x) => x.slug))
      for (const [key, v] of Object.entries(vorig)) if (!(key in nu.s) && v && !gedaan.has(v.slug) && lijst[v.slug] && lijst[v.slug].status !== 'af') nu.s[key] = v
      stats.inFeed = Object.keys(nu.s).length
      await binnen(set(VK.feed, nu), kvMs).catch(() => {})
    }
    // De index: alleen de velden van de ronde, over wat er intussen bij kwam heen.
    await binnen(update(VK.lijst, (cur) => {
      const out = { ...(cur && typeof cur === 'object' ? cur : {}) }
      for (const [slug, v] of Object.entries(nieuwIndex)) if (out[slug]) out[slug] = { ...out[slug], ...v, status: out[slug].status === 'af' ? 'af' : v.status }
      return out
    }), kvMs).catch(() => {})
    // 8. De proef: tellingen per dagdeel (aantallen, slugs; nooit wie).
    await binnen(update(VK.proef, (cur) => {
      const slots = { ...(cur?.slots && typeof cur.slots === 'object' ? cur.slots : {}) }
      const o = slots[slot] || { rondes: 0, zeker: 0, twijfel: 0, wachtrij: 0, perVolgzaak: {} }
      slots[slot] = { rondes: o.rondes + 1, zeker: proef.zeker, twijfel: proef.twijfel, wachtrij: rij.length, perVolgzaak: proef.perVolgzaak }
      const keep = Object.keys(slots).sort().slice(-PROEF_SLOTS)
      return { v: 1, slots: Object.fromEntries(keep.map((k) => [k, slots[k]])) }
    }), kvMs).catch(() => {})
    return { stats }
  } catch (e) {
    return { stats: { ...stats, fout: String(e?.message || e).slice(0, 80) } }
  }
}
