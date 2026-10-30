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
    id: typeof edition.id === 'string' ? edition.id : '',
    keysOf: p.keysOf instanceof Map ? p.keysOf : keysOfEntries(edition),
    titles: p.titles || new Set(edition.entries.map((e) => e.title || byId.get(e.leadId || e.id)?.title).filter(Boolean)),
    shown: p.shown || shown.map((i) => ({ id: i.id, title: i.title, summary: i.summary || '', publishedAt: i.publishedAt || edition.builtAt })),
  }
}

// Een history-regel (H5) herken je aan `storyIds` als array; een vastgelegde Editie heeft `entries`.
const isHistoryRow = (x) => Array.isArray(x?.storyIds)
const byTime = (a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

// De samenvatting van een vastgelegde Editie zoals die in `user_state.edition.history` komt (H5):
// alleen arrays en gewone objecten, zodat web en app hem zonder vertaling delen. Precies de sleutels
// van historyOf in netlify/lib/stories.mjs (Hoot-herhaling), in dezelfde volgorde: ook `leadStoryId`
// (het hoofdverhaal, voor wasLead) en `shown` (de getoonde berichten, voor sameSubject), anders rekent
// een toestel dat uit de regel leest anders dan een toestel dat uit de volle Editie rekent. `keys` zijn
// de kenmerken van toen per verhaal ({ [verhaal-id]: [kenmerk] }); leeg bij een Editie zonder `keys`.
// Een regel die al een samenvatting is, blijft zoals hij is.
export function historyOf(edition) {
  if (!edition) return null
  if (isHistoryRow(edition)) return edition
  const p = previousOf(edition)
  if (!p) return null
  return {
    id: edition.id,
    builtAt: edition.builtAt,
    storyIds: [...p.storyIds],
    itemIds: [...p.itemIds],
    leadIds: [...p.leadIds],
    leadStoryId: p.leadStoryId ?? null,
    titles: [...p.titles],
    shown: p.shown,
    keys: Object.fromEntries([...(p.keysOf || [])].map(([id, ks]) => [id, [...ks]])),
  }
}

// De geschiedenis na het vastleggen van `edition`: deze Editie voorop, dan wat ervóór kwam van nieuw
// naar oud (builtAt, dan id: totale volgorde, zoals recentEditions in stories.mjs), de laatste drie in
// totaal, elk dagdeel één keer. `prior` mag history-regels én hele vastgelegde Edities bevatten (het
// toestel legt zijn vorige Editie er voluit bij): een Editie wordt hier samengevat, niet weggegooid —
// anders verloor de geschiedenis bij elk dagdeel het dagdeel ervóór (H3/H5).
export function nextHistory(prior = [], edition) {
  const row = historyOf(edition)
  const seen = new Set(row ? [row.id] : [])
  const rest = []
  for (const h of (Array.isArray(prior) ? prior : []).map(historyOf)) {
    if (!h || typeof h.id !== 'string' || !h.id || seen.has(h.id) || h.id === edition?.id) continue
    seen.add(h.id)
    rest.push(h)
  }
  rest.sort((a, b) => (Date.parse(b.builtAt) || 0) - (Date.parse(a.builtAt) || 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return [...(row ? [row] : []), ...rest].slice(0, HISTORY_SIZE)
}

// Eén history-regel (arrays) of een vastgelegde Editie → de vorm die selectForReader leest (Sets),
// zoals previousOfOne in stories.mjs (Hoot-herhaling): `leadStoryId` komt uit de regel mee, `shown`
// alleen met een kop. Ook de platte vorm van POST /api/edition (`at` in ms, `keysOf` als Map) telt.
function previousOne(x) {
  if (!x || typeof x !== 'object') return null
  if (isHistoryRow(x)) {
    const keysOf = new Map()
    if (x.keysOf instanceof Map) for (const [id, ks] of x.keysOf) keysOf.set(id, new Set(ks))
    else for (const [id, ks] of Object.entries(x.keys && typeof x.keys === 'object' ? x.keys : {})) if (Array.isArray(ks) && ks.length) keysOf.set(id, new Set(ks))
    return {
      id: typeof x.id === 'string' ? x.id : '',
      keysOf,
      storyIds: new Set(x.storyIds),
      itemIds: new Set(Array.isArray(x.itemIds) ? x.itemIds : []),
      leadIds: new Set(Array.isArray(x.leadIds) ? x.leadIds : []),
      leadStoryId: typeof x.leadStoryId === 'string' ? x.leadStoryId : null,
      at: Date.parse(x.builtAt) || Number(x.at) || 0,
      titles: new Set(Array.isArray(x.titles) ? x.titles : []),
      shown: Array.isArray(x.shown) ? x.shown.filter((s) => s && typeof s.title === 'string') : [],
    }
  }
  return previousOf(x)
}

// `previous` over meer Edities (H3), rekenend als previousOf in stories.mjs (Hoot-herhaling): oudste
// eerst (at, dan id: totale volgorde, zodat elk toestel hetzelfde rekent, ook als het toestel ze van
// nieuw naar oud aanlevert); vereniging van verhalen, stukken, hoofdberichten, koppen, getoonde
// berichten en kenmerken; `at` per verhaal is de builtAt van de laatste Editie waarin het stond;
// `leadStoryId` en `at` die van de laatste Editie, `leadStoryIds` alle hoofdverhalen. Neemt Edities of
// history-regels, door elkaar. Dezelfde sleutels als selectForReader leest.
export function mergePrevious(list) {
  const ps = (Array.isArray(list) ? list : [list]).map(previousOne).filter(Boolean)
  if (!ps.length) return null
  ps.sort(byTime)
  const u = (k) => new Set(ps.flatMap((p) => [...(p[k] || [])]))
  const atOf = new Map()
  const keysOf = new Map()
  for (const p of ps) {
    for (const id of p.storyIds) atOf.set(id, Math.max(atOf.get(id) || 0, p.at))
    for (const [id, ks] of p.keysOf || []) keysOf.set(id, new Set([...(keysOf.get(id) || []), ...ks]))
  }
  const last = ps[ps.length - 1]
  return {
    keysOf,
    storyIds: u('storyIds'),
    itemIds: u('itemIds'),
    leadIds: u('leadIds'),
    leadStoryId: last.leadStoryId ?? null,
    leadStoryIds: new Set(ps.map((p) => p.leadStoryId).filter(Boolean)),
    at: last.at,
    atOf,
    titles: u('titles'),
    shown: ps.flatMap((p) => p.shown || []),
  }
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
// Het `previous` over een lijst (Edities en/of history-regels) in platte vorm — Sets als arrays, Maps
// als objecten — om op het toestel na te kijken wat de rekenkern van toen kent (de pariteitstests).
export function previousJSON(listJSON) {
  const p = previousFrom(typeof listJSON === 'string' ? JSON.parse(listJSON) : listJSON)
  if (!p) return 'null'
  const flat = { ...p, storyIds: [...p.storyIds], itemIds: [...p.itemIds], leadIds: [...p.leadIds], titles: [...p.titles], leadStoryIds: [...p.leadStoryIds], atOf: Object.fromEntries(p.atOf), keysOf: Object.fromEntries([...p.keysOf].map(([id, ks]) => [id, [...ks]])) }
  return JSON.stringify(flat)
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
