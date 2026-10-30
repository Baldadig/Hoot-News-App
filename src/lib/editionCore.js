// De rekenkern van De Redacteur voor de iPhone — de ingang van de bundel (bouwspec §9).
//
// scripts/build-edition-core.mjs bundelt dit bestand met esbuild tot ios/Hoot/Resources/edition-core.js
// (IIFE, `globalThis.HootCore`); ios/Hoot/EditionEngine.swift laadt die bundel in één JSContext.
// Zo rekenen web en app met dezelfde code en komen ze uit dezelfde invoer op dezelfde Editie uit,
// byte voor byte (tests/editionGolden.test.mjs, ios/HootTests/EditionParityTests.swift).
//
// Alles gaat als JSON heen en terug: Swift kent geen Set of Map. `composeEdition` zet arrays om naar
// Sets (`followed`, `readIds`), bouwt `previous` op uit wat het toestel en het account bewaarden, roept
// composePersonal aan en geeft de Editie terug met het waarom per plek, `basis` (editionBasis, djb2)
// en `owner`. Zonder toeval en zonder klok: `now` komt uit de invoer of uit global.builtAt.
import { composePersonal, withoutDebug, editionBasis } from './personal.js'
import { previousOf as previousOfStored } from '../../netlify/lib/stories.mjs'
import { profileOf, supplyOf, profileSummary } from '../../shared/editor.mjs'

export const CORE_VERSION = 1
export const HISTORY_SIZE = 3 // zoveel Edities diep kijkt `previous` (aanvulling H3)

const asSet = (v) => (v instanceof Set ? v : new Set(Array.isArray(v) ? v : []))

// De kenmerken van toen per verhaal (aanvulling H2): uit de `keys` van de plekken (ook via `formerId`),
// als previousOf in stories.mjs ze nog niet zelf geeft (een oudere versie). Verhaal-id → Set.
function keysOfEntries(edition) {
  const out = new Map()
  for (const e of [...(edition.entries || []), ...(edition.stories || [])]) {
    if (!Array.isArray(e.keys) || !e.keys.length) continue
    for (const id of [e.id, e.formerId, ...(e.formerIds || [])].filter(Boolean)) out.set(id, new Set([...(out.get(id) || []), ...e.keys]))
  }
  return out
}

// Wat uit een vastgelegde Editie telt als "stond er al", zoals previousOf in stories.mjs, aangevuld
// met de getoonde koppen (`titles`), de getoonde berichten zelf (`shown`: kop, intro, tijd), zodat
// een tweede verhaal over dezelfde gebeurtenis onder een ander id ook herkend wordt (aanvulling H4),
// en de kenmerken van toen per verhaal (`keysOf`, H2).
export function previousOf(edition) {
  const p = previousOfStored(edition)
  if (!p) return null
  const byId = new Map((edition.items || []).map((i) => [i.id, i]))
  const shown = edition.entries.map((e) => byId.get(e.leadId || e.id)).filter((i) => i?.title)
  return {
    ...p,
    keysOf: p.keysOf instanceof Map ? p.keysOf : keysOfEntries(edition),
    titles: p.titles || new Set(edition.entries.map((e) => e.title || byId.get(e.leadId || e.id)?.title).filter(Boolean)),
    shown: p.shown || shown.map((i) => ({ id: i.id, title: i.title, summary: i.summary || '', publishedAt: i.publishedAt || edition.builtAt })),
  }
}

// De samenvatting van een vastgelegde Editie zoals die in `user_state.edition.history` komt (H5):
// alleen arrays en gewone objecten, zodat web en app hem zonder vertaling delen. `keys` zijn de
// kenmerken van toen per verhaal ({ [verhaal-id]: [kenmerk] }); leeg bij een Editie zonder `keys`.
export function historyOf(edition) {
  const p = previousOf(edition)
  if (!p) return null
  const keys = {}
  for (const [id, set] of p.keysOf || []) keys[id] = [...set]
  return { id: edition.id, builtAt: edition.builtAt, storyIds: [...p.storyIds], itemIds: [...p.itemIds], leadIds: [...p.leadIds], titles: [...p.titles], keys }
}

// De geschiedenis na het vastleggen van `edition`: deze Editie voorop, de laatste drie in totaal,
// elk dagdeel één keer.
export function nextHistory(prior = [], edition) {
  const row = historyOf(edition)
  const rest = (Array.isArray(prior) ? prior : []).filter((h) => h && Array.isArray(h.storyIds) && h.id !== edition?.id)
  return [...(row ? [row] : []), ...rest].slice(0, HISTORY_SIZE)
}

// Eén history-regel (arrays) of een vastgelegde Editie → de vorm die selectForReader leest (Sets).
function previousOne(x) {
  if (!x || typeof x !== 'object') return null
  if (Array.isArray(x.storyIds)) {
    const keysOf = new Map()
    if (x.keysOf instanceof Map) for (const [id, ks] of x.keysOf) keysOf.set(id, new Set(ks))
    else for (const [id, ks] of Object.entries(x.keys && typeof x.keys === 'object' ? x.keys : {})) if (Array.isArray(ks) && ks.length) keysOf.set(id, new Set(ks))
    return { storyIds: new Set(x.storyIds), itemIds: new Set(x.itemIds), leadIds: new Set(x.leadIds), titles: new Set(x.titles || []), shown: Array.isArray(x.shown) ? x.shown : [], keysOf, at: Date.parse(x.builtAt) || Number(x.at) || 0, leadStoryId: null }
  }
  return previousOf(x)
}

// `previous` over meer Edities (H3): vereniging van verhalen, stukken, koppen, hoofdverhalen en
// kenmerken; `at` per verhaal is de builtAt van de laatste Editie waarin het stond. Neemt Edities of
// history-regels. Dezelfde sleutels als previousOf in stories.mjs leest (selectForReader).
export function mergePrevious(list) {
  const ps = (Array.isArray(list) ? list : [list]).map(previousOne).filter(Boolean)
  if (!ps.length) return null
  const u = (k) => new Set(ps.flatMap((p) => [...(p[k] || [])]))
  const atOf = new Map()
  for (const p of ps) for (const id of p.storyIds) atOf.set(id, Math.max(atOf.get(id) || 0, p.at))
  const shown = new Map()
  for (const p of ps) for (const s of p.shown || []) if (s?.title && !shown.has(s.id || s.title)) shown.set(s.id || s.title, s)
  const keysOf = new Map()
  for (const p of ps) for (const [id, ks] of p.keysOf || []) keysOf.set(id, new Set([...(keysOf.get(id) || []), ...ks]))
  return { storyIds: u('storyIds'), itemIds: u('itemIds'), leadIds: u('leadIds'), titles: u('titles'), keysOf, leadStoryIds: new Set(ps.map((p) => p.leadStoryId).filter(Boolean)), leadStoryId: ps[ps.length - 1].leadStoryId, at: Math.max(...ps.map((p) => p.at)), atOf, shown: [...shown.values()] }
}

// De `previous` uit de invoer: niets, een lijst van Edities en/of history-regels, of één samenvatting
// met arrays (zoals POST /api/edition hem krijgt).
export function previousFrom(v) {
  if (!v) return null
  if (Array.isArray(v)) return mergePrevious(v)
  if (Array.isArray(v.storyIds) || v.entries) return mergePrevious([v])
  return null
}

// Van wat het toestel heeft naar de aanroep van composePersonal.
function inputOf(input) {
  const followed = asSet(input.followed)
  const readIds = asSet(input.readIds)
  const now = Number(input.now) || Date.parse(input.global?.builtAt) || 0
  return {
    global: input.global,
    stories: input.stories || [],
    items: input.items || [],
    sources: input.sources || [],
    followed,
    interests: input.interests || [],
    topics: input.topics || [],
    favorites: input.favorites || [],
    affinity: input.affinity || null,
    taste: input.taste || null,
    readIds,
    previous: previousFrom(input.previous),
    now,
    builtAt: input.builtAt || new Date(now).toISOString(),
  }
}

// Jouw Editie uit JSON-vormige invoer. Elke plek draagt alle stukken van zijn verhaal (`itemIds`) en
// de getoonde kop (`title`), zodat de volgende Editie weet wat er stond; levert composePersonal die
// zelf al, dan blijven ze staan.
export function compose(input) {
  if (!input || typeof input !== 'object') return null
  const args = inputOf(input)
  const mine = composePersonal(args)
  if (!mine) return null
  const storyById = new Map(args.stories.map((s) => [s.id, s]))
  const itemById = new Map((mine.items || []).map((i) => [i.id, i]))
  const entries = (mine.entries || []).map((e) => {
    const lead = e.leadId || e.id
    const itemIds = e.itemIds || (e.kind === 'story' ? storyById.get(e.id)?.itemIds || [lead] : [lead])
    const title = e.title !== undefined ? e.title : itemById.get(lead)?.title || null
    return { ...e, itemIds, title }
  })
  const basis = editionBasis([...args.followed], args.interests, args.topics, args.favorites)
  return { ...withoutDebug({ ...mine, entries }), basis, owner: typeof input.owner === 'string' && input.owner ? input.owner : 'anon' }
}

// Dezelfde stap, maar met tekst heen en terug: zo praat Swift ermee.
export function composeEdition(jsonIn) {
  const input = typeof jsonIn === 'string' ? JSON.parse(jsonIn) : jsonIn
  const out = compose(input)
  return JSON.stringify(out)
}

// Vingerafdruk van bronnen en interesses, voor de toets "is deze Editie nog de mijne" (P8-1).
export function basisOf(followed = [], interests = [], topics = [], favorites = []) {
  return editionBasis(followed || [], interests || [], topics || [], favorites || [])
}

// Geschiedenis-stappen met tekst heen en terug, voor Swift.
export function historyJSON(editionJSON) {
  return JSON.stringify(historyOf(typeof editionJSON === 'string' ? JSON.parse(editionJSON) : editionJSON))
}
export function nextHistoryJSON(priorJSON, editionJSON) {
  const prior = typeof priorJSON === 'string' ? JSON.parse(priorJSON) : priorJSON
  const edition = typeof editionJSON === 'string' ? JSON.parse(editionJSON) : editionJSON
  return JSON.stringify(nextHistory(prior, edition))
}

// Wat Hoot van je leerde (bouwspec §8, Instellingen): hetzelfde profiel als De Redacteur gebruikt,
// in drie lijsten (gekozen, geleerd, minder). Invoer als JSON-vormen: interests, topics, affinity,
// taste, favorites, followed (lijst), sources en items (alleen kind, source en topics zijn nodig).
export function profileSummaryOf(input) {
  if (!input || typeof input !== 'object') return { chosen: [], learned: [], less: [] }
  const followed = asSet(input.followed)
  const prof = profileOf({
    interests: input.interests || [],
    topics: input.topics || [],
    affinity: input.affinity || null,
    taste: input.taste || null,
    favorites: input.favorites || [],
    followed,
    sources: input.sources || [],
    supply: supplyOf(input.items || [], followed),
  })
  return profileSummary(prof)
}
export function profileSummaryJSON(jsonIn) {
  return JSON.stringify(profileSummaryOf(typeof jsonIn === 'string' ? JSON.parse(jsonIn) : jsonIn))
}

export { editionBasis, profileSummary }
