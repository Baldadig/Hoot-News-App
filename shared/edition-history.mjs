// De Edities van toen (previousOf, historyOf, recentEditions): los van de rekenkern in netlify/lib/stories.mjs,
// zodat de eerste lading van het web ze kan meenemen zonder de hele rekenkern (Snel · 2). stories.mjs exporteert ze nog.

// Wat uit een vastgelegde editie telt als "stond er al" (zie selectEdition en selectForReader).
// `itemIds` zijn alle stukken van de verhalen van toen (de entries van een persoonlijke Editie dragen
// ze zelf, de algemene Editie via `edition.stories`); `titles` de getoonde koppen en `shown` de
// getoonde berichten zelf (kop, intro, tijd), zodat een tweede verhaal over dezelfde gebeurtenis
// (ander id) ook herkend wordt (sameSubject in selectForReader). `keysOf` (verhaal-id → Set) zijn de
// kenmerken van toen per verhaal (`keys`, van de server: alle stukken uit alle bronnen), zodat
// "ontwikkeld" niet afhangt van welke stukken dit toestel kent (developedSince).
// Eén Editie, of een samenvatting ervan zoals die in `user_state.edition.history` staat (historyOf:
// de id-lijsten als arrays, `keys` per verhaal als object). Ook de platte vorm die POST /api/edition
// aanneemt telt (`at` in ms zonder builtAt, `keysOf` al als Map): de rekenkern van de app
// (src/lib/editionCore.js) leest hiermee en mag niets anders rekenen dan het web.
const isHistoryRow = (x) => Array.isArray(x?.storyIds)
function previousOfOne(x) {
  if (!x) return null
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
      heldIds: new Set(Array.isArray(x.heldIds) ? x.heldIds : []),
    }
  }
  const edition = x
  if (!edition.entries?.length) return null
  const stories = edition.entries.filter((e) => e.kind === 'story')
  const lead = edition.entries[0]
  const byId = new Map((edition.items || []).map((i) => [i.id, i]))
  const shown = edition.entries.map((e) => byId.get(e.leadId || e.id)).filter((i) => i?.title)
  const keysOf = new Map()
  for (const e of [...stories, ...(edition.stories || [])]) if (Array.isArray(e.keys) && e.keys.length) for (const id of [e.id, e.formerId, ...(e.formerIds || [])].filter(Boolean)) keysOf.set(id, new Set([...(keysOf.get(id) || []), ...e.keys]))
  return {
    id: typeof edition.id === 'string' ? edition.id : '',
    keysOf,
    storyIds: new Set(stories.flatMap((e) => [e.id, e.formerId].filter(Boolean))),
    itemIds: new Set([...edition.entries.map((e) => e.leadId || e.id), ...stories.flatMap((e) => e.itemIds || []), ...(edition.stories || []).flatMap((st) => st.itemIds || [])]),
    leadIds: new Set([lead.leadId || lead.id]),
    leadStoryId: lead.kind === 'story' ? lead.id : null,
    at: Date.parse(edition.builtAt) || 0,
    titles: new Set(edition.entries.map((e) => e.title || byId.get(e.leadId || e.id)?.title).filter(Boolean)),
    shown: shown.map((i) => ({ id: i.id, title: i.title, summary: i.summary || '', publishedAt: i.publishedAt || edition.builtAt })),
    // Verhalen die zonder nieuwe ontwikkeling één Editie langer bleven (ronde 7 · 3, `held`): niet nog een keer.
    heldIds: new Set(stories.filter((e) => e.held).map((e) => e.id)),
  }
}

// `previous` over één of meer Edities (aanvulling-pariteit-herhaling.md H3): de laatste drie vastgelegde
// Edities van deze lezer (vandaag plus gisteravond), als Edities of als history-regels (H5), door elkaar.
// Vereniging van verhalen, stukken, hoofdberichten, koppen en getoonde berichten; `keysOf` per verhaal
// verenigd; `atOf` per verhaal is de builtAt van de laatste Editie waarin het stond (developedSince
// rekent "nieuw" vanaf dat moment); `leadStoryIds` alle hoofdverhalen, `leadStoryId` en `at` die van de
// laatste Editie. Met één Editie is de uitkomst gelijk aan vroeger (selectEdition blijft byte-gelijk).
export function previousOf(editions) {
  const ps = (Array.isArray(editions) ? editions : [editions]).map(previousOfOne).filter(Boolean)
  if (!ps.length) return null
  // Oudste eerst, nieuwste laatst; totale volgorde (tijd, dan id) zodat elk toestel hetzelfde rekent.
  ps.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const u = (k) => new Set(ps.flatMap((p) => [...p[k]]))
  const atOf = new Map()
  const keysOf = new Map()
  for (const p of ps) {
    for (const id of p.storyIds) atOf.set(id, Math.max(atOf.get(id) || 0, p.at))
    for (const [id, ks] of p.keysOf) keysOf.set(id, new Set([...(keysOf.get(id) || []), ...ks]))
  }
  const last = ps[ps.length - 1]
  return {
    keysOf,
    storyIds: u('storyIds'),
    itemIds: u('itemIds'),
    leadIds: u('leadIds'),
    leadStoryId: last.leadStoryId,
    leadStoryIds: new Set(ps.map((p) => p.leadStoryId).filter(Boolean)),
    at: last.at,
    atOf,
    titles: u('titles'),
    shown: ps.flatMap((p) => p.shown),
    heldIds: u('heldIds'),
  }
}

// De samenvatting van een vastgelegde Editie voor `user_state.edition.history` (H5): wat previousOf
// ervan nodig heeft, als platte JSON (arrays en een object per verhaal voor `keys`). Een regel die al
// een samenvatting is, blijft zoals hij is.
export const HISTORY_MAX = 3
export function historyOf(edition) {
  if (!edition) return null
  if (isHistoryRow(edition)) return edition
  const p = previousOfOne(edition)
  if (!p) return null
  return {
    id: edition.id,
    builtAt: edition.builtAt,
    storyIds: [...p.storyIds],
    itemIds: [...p.itemIds],
    leadIds: [...p.leadIds],
    leadStoryId: p.leadStoryId,
    titles: [...p.titles],
    shown: p.shown,
    ...(p.heldIds.size ? { heldIds: [...p.heldIds] } : {}),
    keys: Object.fromEntries([...p.keysOf].map(([id, ks]) => [id, [...ks]])),
  }
}

// De laatste `n` vastgelegde Edities uit een lijst van Edities en/of history-regels: ontdubbeld op id
// (de eerste wint), nieuwste eerst (builtAt, dan id: totale volgorde). Voor `previous` en `history`.
export function recentEditions(list = [], n = HISTORY_MAX) {
  const seen = new Set()
  const out = []
  for (const e of list) {
    if (!e || typeof e.id !== 'string' || !e.id || seen.has(e.id) || !(Date.parse(e.builtAt) > 0)) continue
    seen.add(e.id)
    out.push(e)
  }
  out.sort((a, b) => Date.parse(b.builtAt) - Date.parse(a.builtAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return out.slice(0, n)
}
