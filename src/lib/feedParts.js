// De berichten per gevolgde bron bij één kern — pure functie, los van React (tests/editie-p0.test.mjs).
//
// Elke ronde rekent met de versies van háár kern. Twee rondes tegelijk (een nieuwe kern en een bron die
// je net aanzette, of je account dat je bronnen pas na het openen geeft) delen wel de voorraad `parts`
// (bron → { version, items }), maar de ene geeft de andere zo nooit de delen van een ander dagdeel.
// Een deel dat niet veranderde halen we niet opnieuw; lukt een deel niet, dan blijft wat we van die bron
// nog hadden (zoals altijd: een enkele bron houdt de rest niet op).
//
// Geeft { items, itemsFor }: `itemsFor` zegt bij welke Editie (dagdeel) en welke bronnen deze berichten
// horen. Jouw Editie wordt pas samengesteld als dat bij de Editie en je bronnen van nu past
// (editionReady in src/lib/editionSync.js).
import { eachLimited } from './pool.js'

const byRecency = (a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')

export const itemsForOf = (core, sources) => ({ edition: core?.edition?.id || null, sources: [...sources] })

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
  const items = want.flatMap((id) => got.get(id) || parts.get(id)?.items || []).sort(byRecency)
  return { items, itemsFor: itemsForOf(core, wanted) }
}
