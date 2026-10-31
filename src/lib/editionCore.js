// De rekenkern van De Redacteur voor de iPhone — de ingang van de bundel (bouwspec §9).
//
// scripts/build-edition-core.mjs bundelt dit bestand met esbuild tot ios/Hoot/Resources/edition-core.js
// (IIFE, `globalThis.HootCore`); ios/Hoot/EditionEngine.swift laadt die bundel in één JSContext.
// Zo rekenen web en app met dezelfde code en komen ze uit dezelfde invoer op dezelfde Editie uit,
// byte voor byte (tests/editionGolden.test.mjs, ios/HootTests/EditionParityTests.swift).
//
// Dit bestand rekent zelf niets uit over de geschiedenis: previousOf, historyOf en recentEditions komen
// uit netlify/lib/stories.mjs en earlierEditions uit src/lib/personal.js — precies wat het web gebruikt
// (src/lib/editionSync.js). Eén kopie, zodat web en app nooit uit elkaar kunnen lopen.
//
// Alles gaat als JSON heen en terug: Swift kent geen Set of Map. `composeEdition` zet arrays om naar
// Sets (`followed`, `readIds`), bouwt `previous` op uit wat het toestel en het account bewaarden, roept
// composePersonal aan en geeft de Editie terug met het waarom en de `keys` per plek, `basis`
// (editionBasis, djb2) en `owner`. Zonder toeval en zonder klok: `now` komt uit de invoer of uit global.builtAt.
import { composePersonal, withoutDebug, editionBasis, earlierEditions } from './personal.js'
import { previousOf, historyOf, recentEditions, HISTORY_MAX } from '../../netlify/lib/stories.mjs'
import { profileOf, supplyOf, profileSummary } from '../../shared/editor.mjs'
import { forEdition } from '../../shared/stroom.mjs'

export const CORE_VERSION = 1
export const HISTORY_SIZE = HISTORY_MAX // zoveel Edities diep kijkt `previous` (aanvulling H3)

const asSet = (v) => (v instanceof Set ? v : new Set(Array.isArray(v) ? v : []))

// De geschiedenis-functies van het web, onder dezelfde namen voor de app en de tests. `mergePrevious`
// is previousOf over een lijst (Edities en/of history-regels, door elkaar): vereniging van verhalen,
// stukken, hoofdberichten, koppen, getoonde berichten en kenmerken (`keysOf`), `atOf` per verhaal.
export { previousOf, historyOf, recentEditions, earlierEditions }
export const mergePrevious = previousOf

// De `history` die bij het vastleggen van `edition` meegaat: de samenvattingen van de Edities ervóór,
// nieuwste eerst, de laatste drie — nooit de Editie zelf, precies zoals het web haar schrijft
// (`earlier.map(historyOf)` in editionSync.js). `prior` mag history-regels én hele vastgelegde Edities
// bevatten: een Editie wordt hier samengevat, niet weggegooid (H3/H5). Is `prior` al de uitkomst van
// earlierEditions, dan is dit alleen de samenvatting; een andere lijst wordt eerst ontdubbeld en
// gesorteerd. Een regel die het web schreef komt zo ongewijzigd terug: web en app lezen elkaars
// geschiedenis zonder haar te herschrijven.
export function nextHistory(prior = [], edition) {
  const rows = (Array.isArray(prior) ? prior : []).filter((x) => x && x.id !== edition?.id)
  return recentEditions(rows).map(historyOf).filter(Boolean)
}

// De `previous` uit de invoer: niets, een lijst van Edities en/of history-regels, of één samenvatting
// met arrays (zoals POST /api/edition hem krijgt).
export function previousFrom(v) {
  if (!v) return null
  if (Array.isArray(v)) return previousOf(v)
  if (Array.isArray(v.storyIds) || v.entries) return previousOf([v])
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

// Jouw Editie uit JSON-vormige invoer. Elke plek draagt alle stukken van zijn verhaal (`itemIds`), de
// getoonde kop (`title`) en de kenmerken van het verhaal (`keys`, van de server), zodat de volgende
// Editie weet wat er stond en wat er toen van bekend was (H2); levert composePersonal die zelf al
// (selectForReader), dan blijven ze staan.
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
    const keys = e.kind === 'story' ? e.keys || storyById.get(e.id)?.keys : null
    return { ...e, itemIds, ...(keys ? { keys } : {}), title }
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
// De Edities van vóór dit dagdeel uit wat het toestel (`local`) en het account (`account`) vastlegden,
// als JSON-lijst van Edities en/of history-regels: het `previous` voor de rekenkern en de `prior` voor
// nextHistory. `localJSON` en `accountJSON` mogen "null" zijn.
export function earlierEditionsJSON(localJSON, accountJSON, id, owner) {
  const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v)
  return JSON.stringify(earlierEditions({ local: parse(localJSON) ?? null, account: parse(accountJSON) ?? null, id: id ?? null, owner: owner ?? null }))
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
    supply: supplyOf((input.items || []).filter(forEdition), followed),
  })
  return profileSummary(prof)
}
export function profileSummaryJSON(jsonIn) {
  return JSON.stringify(profileSummaryOf(typeof jsonIn === 'string' ? JSON.parse(jsonIn) : jsonIn))
}

export { editionBasis, profileSummary }
