// De berichten per gevolgde bron bij één kern — pure functie, los van React (tests/editie-p0.test.mjs).
//
// Elke ronde rekent met de versies van háár kern. Twee rondes tegelijk (een nieuwe kern en een bron die
// je net aanzette, of je account dat je bronnen pas na het openen geeft) delen wel de voorraad `parts`
// (bron → { version, items }), maar de ene geeft de andere zo nooit de delen van een ander dagdeel.
// Een deel dat niet veranderde halen we niet opnieuw; lukt een deel niet, dan blijft wat we van die bron
// nog hadden in de Stroom staan (zoals altijd: een enkele bron houdt de rest niet op).
//
// Geeft { items, itemsFor, missing }: `itemsFor` zegt bij welke Editie (dagdeel) en welke bronnen deze
// berichten horen. Een bron waarvan het deel van déze kern niet binnenkwam (`missing`) staat er níet in:
// wat we er nog van hadden is van een vorige kern, en daarmee stelt Jouw Editie niet samen (editionReady in
// src/lib/editionSync.js; P0 9 november). useFeed (src/lib/feedRounds.js) probeert zo'n bron één keer
// opnieuw; lukt dat niet, dan valt Jouw Editie terug op wat vastligt of op de server.
import { eachLimited } from './pool.js'
import { mutedSet } from './sourcesel.js'

const byRecency = (a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')

// Welke bronnen deze lezer volgt: wat aan staat; Bluesky alleen als die bestemming aan staat.
export function wantedSources(sources, prefs) {
  const off = mutedSet(prefs, sources)
  return sources.filter((s) => !off.has(s.id) && (s.kind !== 'sociaal' || prefs.bluesky)).map((s) => s.id)
}

export const itemsForOf = (core, sources) => ({ edition: core?.edition?.id || null, sources: [...sources] })

// Horen de berichten (`itemsFor`) bij deze kern en dekken ze de bronnen die je nu volgt? Dezelfde toets als
// itemsCurrent in editionSync.js (die editionReady gebruikt), hier ook voor een kern zonder Editie.
export function covers(itemsFor, core, wanted) {
  if (!itemsFor || itemsFor.edition !== (core?.edition?.id || null)) return false
  const asked = new Set(itemsFor.sources || [])
  return wanted.every((id) => asked.has(id))
}

export async function gatherParts({ core, wanted, parts, fetchPart, signal, limit = 6 }) {
  const versions = core?.meta?.parts || {}
  const want = wanted.filter((id) => versions[id])
  const got = new Map()
  for (const id of want) if (parts.get(id)?.version === versions[id]) got.set(id, parts.get(id).items)
  await eachLimited(want.filter((id) => !got.has(id)), limit, async (id) => {
    try {
      const items = await fetchPart(id, versions[id], { signal })
      got.set(id, items)
      parts.set(id, { version: versions[id], items })
    } catch (e) {
      if (e?.name === 'AbortError') throw e
    }
  })
  const missing = want.filter((id) => !got.has(id))
  const items = want.flatMap((id) => got.get(id) || parts.get(id)?.items || []).sort(byRecency)
  const gone = new Set(missing)
  return { items, itemsFor: itemsForOf(core, wanted.filter((id) => !gone.has(id))), missing }
}

// Een ronde op de kern die er al staat (de extra ronde, of een bron die je aanzette) waarin delen niet
// binnenkwamen (offline): voor die bronnen houden we de berichten die er al stonden, en de dekking die er al
// was voor déze kern. Zo maakt een mislukte ronde de Stroom niet leeg, en telt een bron alleen als gedekt
// als zijn berichten echt bij deze kern horen.
export function keepMissing(d, got) {
  if (!got.missing?.length) return got
  const gone = new Set(got.missing)
  const same = d?.itemsFor && d.itemsFor.edition === got.itemsFor.edition
  const had = new Set(same ? d.itemsFor.sources || [] : [])
  const items = [...got.items.filter((i) => !gone.has(i.source)), ...(d?.items || []).filter((i) => gone.has(i.source))].sort(byRecency)
  const sources = [...got.itemsFor.sources, ...got.missing.filter((id) => had.has(id))]
  return { ...got, items, itemsFor: { ...got.itemsFor, sources } }
}
