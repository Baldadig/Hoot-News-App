// Zoeken (Search.jsx), gelijk aan de app (SearchHits.hits in SearchHits.swift). Pure functie (tests/zoek.test.mjs).
// "Mijn bronnen": de stukken van bronnen die aan staan (`muted` is wat je uitzette plus de optionele bronnen die je
// niet aanzette, lib/sourcesel.js), plus alles wat je bewaarde. "Alle bronnen": ook de bronnen die je niet volgt en
// die alleen binnen een verhaal staan. In beide standen valt alleen weg wat je zelf uitzette (`ownMuted`).
// Nachttest 14 november (W-02): elke serverbron heeft `followed: true`, dus de oude regel gaf twee keer hetzelfde.
import { withoutRepeats } from '../../shared/stroom.mjs'

export function searchHits(q, { itemsById = new Map(), saved = {}, scope = 'mijn', muted = new Set(), ownMuted = new Set(), limit = 60 } = {}) {
  const words = String(q || '').toLowerCase().split(/\s+/).filter((w) => w.length > 1)
  if (!words.length) return []
  const pool = new Map()
  for (const [id, i] of itemsById) if (scope === 'alle' || !muted.has(i.source)) pool.set(id, i)
  for (const e of Object.values(saved || {})) {
    if (e?.item) pool.set(e.item.id, e.item)
    for (const i of e?.items || []) pool.set(i.id, i)
  }
  const hits = [...pool.values()]
    .filter((i) => !ownMuted.has(i.source))
    .filter((i) => {
      const hay = `${i.title} ${i.summary || ''} ${i.sourceName} ${i.author || ''}`.toLowerCase()
      return words.every((w) => hay.includes(w))
    })
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
  // Hetzelfde stuk (ook met een aangepaste kop) één keer, zoals in de Stroom.
  return withoutRepeats(hits).slice(0, limit)
}
