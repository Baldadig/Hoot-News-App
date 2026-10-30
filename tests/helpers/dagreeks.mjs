// De dagreeks: Ochtend → Middag → Avond op de echte sloten van 30 oktober 2026 (06:00/12:00/17:00
// Amsterdam = 05/11/16Z) voor vijf persona's, uit de momentopname. Meet herhaling over Edities heen
// (Hoot-design/algoritme/aanvulling-pariteit-herhaling.md §3, scenario "dag"). Overgenomen uit de
// diagnose (scratchpad/diagnose/herhaling/meet.mjs); meting/acceptatie.mjs laadt dit bestand uit
// HOOT_DIR, zodat tests en meetlat dezelfde maten gebruiken.
//
// Per dagdeel is de pool alles wat vóór dat moment is gepubliceerd. Verhalen worden per dagdeel
// opnieuw gebouwd (buildStories met het registry van het vorige dagdeel, zoals de server), de
// algemene Editie met selectEdition + previous (zoals build.mjs), de persoonlijke met composePersonal.
// Varianten voor `previous` van de persoonlijke Editie:
//   code    : previousOf(vorige persoonlijke Editie), wat usePersonalEdition.js nu meegeeft;
//   drie    : alle eerdere Edities van de dag samen (H3: at per verhaal, koppen en itemIds verenigd);
//   account : een ander toestel zonder lokale Edities, met de `history`-samenvattingen uit het account (H5).
import { buildStories, selectEdition, relinkEdition, widelyCovered, previousOf, signatures, sameSubject } from '../../netlify/lib/stories.mjs'
import { MAIN_IDS, MUSIC_IDS } from '../../netlify/lib/sources.mjs'
import { composePersonal, withoutDebug } from '../../src/lib/personal.js'
import { PERSONAS, setupFor } from '../fixtures/personas.mjs'

export const SLOTS = [
  { id: '2026-10-30-ochtend', slot: 'ochtend', date: '2026-10-30', next: '12:00', now: Date.parse('2026-10-30T05:00:00Z') },
  { id: '2026-10-30-middag', slot: 'middag', date: '2026-10-30', next: '17:00', now: Date.parse('2026-10-30T11:00:00Z') },
  { id: '2026-10-30-avond', slot: 'avond', date: '2026-10-30', next: '06:00', now: Date.parse('2026-10-30T16:00:00Z') },
]
export const DAG_PERSONAS = ['haags', 'klimaat', 'wereld', 'vs', 'nieuw']
export const VARIANTS = ['code', 'drie', 'account']
const SPORT_TOPICS = new Set(['voetbal', 'f1', 'wielrennen', 'tennis', 'wintersport', 'olympisch'])
const leadOf = (e) => e.leadId || e.id

// Alle artikelen met een leesbare datum, ontdubbeld op id; `extra` (bv. een latere momentopname) vult aan.
export function articlesOf(snap, extra = []) {
  const byId = new Map()
  for (const s of [snap, ...extra]) for (const i of [...(s.items || []), ...(s.edition?.items || [])]) if (i?.id && !byId.has(i.id)) byId.set(i.id, i)
  return [...byId.values()].filter((i) => i.kind === 'article' && Number.isFinite(Date.parse(i.publishedAt)))
}

// Per dagdeel: pool, verhalen, algemene Editie (zoals de server die bouwt en uitlevert).
export function dayOf(articles, sources) {
  const SRC = new Map(sources.map((s) => [s.id, s]))
  const inStories = (it) => SRC.get(it.source)?.cat !== 'regio' && !MUSIC_IDS.has(it.source)
  let registry = {}
  let stored = null
  const day = []
  for (const sl of SLOTS) {
    const pool = articles.filter((i) => Date.parse(i.publishedAt) <= sl.now)
    const articlePool = pool.filter(inStories)
    const stories = buildStories(articlePool, registry, { mainIds: MAIN_IDS })
    registry = Object.fromEntries(stories.flatMap((st) => st.itemIds.map((id) => [id, { s: st.id }])))
    const byId = new Map(pool.map((i) => [i.id, i]))
    const entries = selectEdition(stories, articlePool, { mainIds: MAIN_IDS, now: sl.now, previous: previousOf(stored) })
    const snapStories = entries.filter((e) => e.kind === 'story').map((e) => stories.find((st) => st.id === e.id))
    const snapIds = new Set([...snapStories.flatMap((st) => st.itemIds), ...entries.filter((e) => e.kind === 'item').map((e) => e.id)])
    stored = { id: sl.id, builtAt: new Date(sl.now).toISOString(), entries, stories: snapStories, items: [...snapIds].map((id) => byId.get(id)).filter(Boolean) }
    const global = {
      id: sl.id, slot: sl.slot, date: sl.date, next: sl.next, builtAt: stored.builtAt, version: `${sl.id}@${stored.builtAt}`,
      entries: relinkEdition(entries, { stories, snapshot: snapStories, byId }),
      items: [...new Set(entries.map(leadOf))].map((id) => byId.get(id)).filter(Boolean),
      bubble: [], brief: null,
      wide: widelyCovered(stories, byId, { isFree: (id) => SRC.has(id) && !SRC.get(id).paid, isDutch: (id) => SRC.get(id)?.lang === 'nl', isSport: (i) => SRC.get(i.source)?.cat === 'sport' || (i.topics || []).some((t) => SPORT_TOPICS.has(t)) }),
    }
    day.push({ sl, pool, stories, byId, global, storyOf: new Map(stories.flatMap((st) => st.itemIds.map((id) => [id, st]))) })
  }
  return day
}

// De samenvatting van een vastgelegde Editie zoals die in `user_state.edition.history` komt (H5),
// met de getoonde berichten (`shown`: kop, intro, tijd) erbij: op de kop alleen is "zelfde
// onderwerp" niet te zien.
export function historyOf(ed) {
  const p = previousOf(ed)
  return { id: ed.id, builtAt: ed.builtAt, storyIds: [...p.storyIds], itemIds: [...p.itemIds], leadIds: [...p.leadIds], titles: [...(p.titles || [])], shown: p.shown || [] }
}

// `previous` over meer Edities (H3): vereniging van verhalen, stukken, koppen en hoofdverhalen; `at`
// per verhaal is de builtAt van de laatste Editie waarin het stond. Neemt Edities of history-regels.
export function mergePrevious(list) {
  const ps = list.map((x) => (Array.isArray(x.storyIds) ? { ...x, storyIds: new Set(x.storyIds), itemIds: new Set(x.itemIds), leadIds: new Set(x.leadIds), titles: new Set(x.titles), at: Date.parse(x.builtAt) || 0, leadStoryId: null } : previousOf(x))).filter(Boolean)
  if (!ps.length) return null
  const u = (k) => new Set(ps.flatMap((p) => [...(p[k] || [])]))
  const atOf = new Map()
  for (const p of ps) for (const id of p.storyIds) atOf.set(id, Math.max(atOf.get(id) || 0, p.at))
  return { storyIds: u('storyIds'), itemIds: u('itemIds'), leadIds: u('leadIds'), titles: u('titles'), shown: ps.flatMap((p) => p.shown || []), leadStoryIds: new Set(ps.map((p) => p.leadStoryId).filter(Boolean)), leadStoryId: ps[ps.length - 1].leadStoryId, at: Math.max(...ps.map((p) => p.at)), atOf }
}

// Vergelijk een Editie met een of meer eerdere: per plek of het verhaal er al stond (op verhaal-id,
// ook via formerId of het verhaal van een los bericht), en zo ja of het zich ontwikkelde volgens de
// regel van de aanvulling: ≥ 2 nieuwe stukken én ≥ 2 nieuwe namen of begrippen in de kop (op
// signaturen, niet op woorden). Los daarvan: een plek over hetzelfde onderwerp als een vorige kop
// zonder gedeeld verhaal-id (sameSubject).
export function compare(cur, curD, prevEds, label) {
  const prevKeys = new Map()
  const prevLeads = new Set()
  const prevItems = new Set()
  for (const { ed, d } of prevEds) {
    for (const e of ed.entries) {
      const k = e.kind === 'story' ? e.id : d.storyOf.get(e.id)?.id || e.id
      if (!prevKeys.has(k) || Date.parse(ed.builtAt) > Date.parse(prevKeys.get(k).ed.builtAt)) prevKeys.set(k, { e, d, ed })
      if (e.formerId && !prevKeys.has(e.formerId)) prevKeys.set(e.formerId, { e, d, ed })
      prevLeads.add(leadOf(e))
      for (const id of e.itemIds || []) prevItems.add(id)
    }
  }
  const sigPool = signatures(curD.pool)
  const prevSigs = prevEds.flatMap(({ ed }) => ed.entries.map((e) => sigPool.get(leadOf(e))).filter(Boolean))
  const sigOf = (i) => {
    const s = sigPool.get(i.id)
    return s ? [...s.strong, ...s.concepts] : []
  }
  const rows = []
  for (const e of cur.entries) {
    const k = e.kind === 'story' ? e.id : curD.storyOf.get(e.id)?.id || e.id
    const lead = curD.byId.get(leadOf(e))
    const hit = prevKeys.get(k) || (e.formerId && prevKeys.get(e.formerId))
    const row = { desk: e.desk, kind: e.kind, key: k, lead: leadOf(e), source: lead?.source, title: lead?.title, why: e.why?.code }
    if (hit) {
      const st = curD.stories.find((s) => s.id === k)
      const items = st ? st.itemIds.map((id) => curD.byId.get(id)).filter(Boolean) : [lead].filter(Boolean)
      const at = Date.parse(hit.ed.builtAt)
      const fresh = items.filter((i) => Date.parse(i.publishedAt) > at && !prevItems.has(i.id))
      const then = new Set(items.filter((i) => !fresh.includes(i)).flatMap(sigOf))
      const newSig = lead ? sigOf(lead).filter((x) => !then.has(x)).length : 0
      const ontwikkeld = fresh.length >= 2 && newSig >= 2
      row.repeat = { sameLead: prevLeads.has(leadOf(e)), fresh: fresh.length, newSig, ontwikkeld, nieuweKop: !!lead && fresh.some((i) => i.id === lead.id), vervolg: e.why?.code === 'vervolg' }
    } else if (lead && sigPool.has(lead.id)) {
      const s = sigPool.get(lead.id)
      if (prevSigs.some((p) => sameSubject(s, p))) row.sameSubjectUnbundled = true
    }
    rows.push(row)
  }
  const rep = rows.filter((r) => r.repeat)
  return {
    label,
    plekken: rows.length,
    herhaald: rep.length,
    zelfdeKop: rep.filter((r) => r.repeat.sameLead).length,
    ontwikkeld: rep.filter((r) => r.repeat.ontwikkeld).length,
    zonderOntwikkeling: rep.filter((r) => !r.repeat.ontwikkeld).length,
    vervolgZonderSig: rep.filter((r) => r.repeat.vervolg && r.repeat.newSig < 2).length, // als "Vervolg" getoond, maar zonder nieuwe namen in de kop
    vervolgFout: rep.filter((r) => r.repeat.ontwikkeld && !(r.repeat.nieuweKop && r.repeat.vervolg)).length,
    zelfdeOnderwerp: rows.filter((r) => r.sameSubjectUnbundled).length,
    rows,
  }
}

// Groot nieuws van dit dagdeel: de drie breedst gedekte verhalen (≥ 6 bronnen) van de laatste 12 uur.
const bigOf = (d) => d.stories.filter((s) => s.sourceCount >= 6 && d.sl.now - Date.parse(s.latestAt) < 12 * 36e5).sort((a, b) => b.sourceCount - a.sourceCount || (a.id < b.id ? -1 : 1)).slice(0, 3).map((s) => s.id)
const keysOf = (ed, d) => new Set(ed.entries.map((e) => (e.kind === 'story' ? e.id : d.storyOf.get(e.id)?.id || e.id)))

// De hele dagreeks voor de persona's, in alle varianten. Uitvoer: per persona de Edities en
// vergelijkingen, plus de maten van §3 (`summary`).
export function runDay(articles, sources, { personas = DAG_PERSONAS, variants = VARIANTS } = {}) {
  const day = dayOf(articles, sources)
  const out = { personas: {}, summary: {} }
  let grootKans = 0
  let grootRaak = 0
  for (const p of PERSONAS.filter((x) => personas.includes(x.id))) {
    const setup = setupFor(p, sources, 'echt')
    out.personas[p.id] = { name: p.name, variants: {} }
    for (const v of variants) {
      const eds = []
      for (let k = 0; k < day.length; k++) {
        const d = day[k]
        let previous = null
        if (k > 0 && v === 'code') previous = previousOf(eds[k - 1])
        if (k > 0 && v === 'drie') previous = mergePrevious(eds.slice(0, k))
        if (k > 0 && v === 'account') previous = mergePrevious(eds.slice(0, k).map(historyOf))
        const mine = composePersonal({ global: d.global, stories: d.stories, items: d.pool, sources, followed: setup.followed, interests: setup.interests, topics: setup.topics, favorites: setup.favorites, affinity: setup.affinity, taste: setup.taste, now: d.sl.now, previous, readIds: new Set() })
        eds.push({ ...withoutDebug(mine), owner: 'test', basis: 'x' })
        // Groot nieuws aanwezig óf vandaag al getoond (alleen voor de variant die de code zelf gebruikt).
        if (k > 0 && v === 'code') {
          const big = bigOf(d)
          if (big.length) {
            grootKans++
            const shownToday = new Set(eds.flatMap((ed, j) => [...keysOf(ed, day[j])]))
            if (big.some((id) => shownToday.has(id))) grootRaak++
          }
        }
      }
      const cmp = []
      for (let k = 1; k < day.length; k++) cmp.push(compare(eds[k], day[k], [{ ed: eds[k - 1], d: day[k - 1] }], `${day[k - 1].sl.slot}→${day[k].sl.slot}`))
      cmp.push(compare(eds[2], day[2], [{ ed: eds[0], d: day[0] }], 'ochtend→avond'))
      cmp.push(compare(eds[2], day[2], [{ ed: eds[0], d: day[0] }, { ed: eds[1], d: day[1] }], 'avond vs beide eerdere'))
      out.personas[p.id].variants[v] = { editions: eds, cmp }
    }
  }
  // Totalen per variant: opeenvolgend (Ochtend→Middag + Middag→Avond) en Ochtend→Avond.
  const KEYS = ['plekken', 'herhaald', 'zelfdeKop', 'ontwikkeld', 'zonderOntwikkeling', 'vervolgZonderSig', 'vervolgFout', 'zelfdeOnderwerp']
  const total = (v, pick) => {
    const t = Object.fromEntries(KEYS.map((k) => [k, 0]))
    let ontwikkeldMax = 0
    for (const r of Object.values(out.personas)) for (const c of pick(r.variants[v].cmp)) {
      for (const k of KEYS) t[k] += c[k]
      ontwikkeldMax = Math.max(ontwikkeldMax, c.ontwikkeld)
    }
    return { ...t, ontwikkeldMax }
  }
  for (const v of variants) out.summary[v] = { opeenvolgend: total(v, (cmp) => cmp.slice(0, 2)), ochtendAvond: total(v, (cmp) => [cmp[2]]) }
  out.summary.grootNieuwsDag = grootKans ? grootRaak / grootKans : 1
  // Tweetalige verhalen in de Avond-pool (H6): verhalen met zowel een Nederlandse als een Engelse bron.
  const lang = new Map(sources.map((s) => [s.id, s.lang]))
  const avond = day[2]
  const langsOf = (st) => new Set(st.itemIds.map((id) => lang.get(avond.byId.get(id)?.source)).filter(Boolean))
  out.summary.tweetalig = avond.stories.filter((st) => langsOf(st).has('nl') && langsOf(st).has('en')).length
  out.summary.verhalen = avond.stories.length
  out.day = day
  return out
}

// Eén regel per vergelijking, voor de uitslag.
export const line = (c) => `${c.label.padEnd(24)} plekken ${String(c.plekken).padStart(3)}  herhaald ${String(c.herhaald).padStart(2)}  zelfde kop ${String(c.zelfdeKop).padStart(2)}  ontwikkeld ${String(c.ontwikkeld).padStart(2)}  zonder ontwikkeling ${String(c.zonderOntwikkeling).padStart(2)}  vervolg zonder sig ${c.vervolgZonderSig}  vervolg-fout ${c.vervolgFout}  zelfde onderwerp, ander id ${c.zelfdeOnderwerp}`
