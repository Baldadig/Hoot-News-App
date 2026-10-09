// Bronstatus — pure functies (getest in tests/sourceStatus.test.mjs).

// Eén actuele status per bron: alleen bronnen die je volgt, die aan staan en nu niet
// bereikbaar zijn. Herstelt een bron of zet je hem uit, dan verdwijnt hij vanzelf.
export function sourceStatus(sources = [], muted = new Set()) {
  const mine = sources.filter((s) => s.followed && !muted.has(s.id))
  const seen = new Set()
  const failed = []
  for (const s of mine) {
    if (s.ok || seen.has(s.id)) continue
    seen.add(s.id)
    failed.push({ id: s.id, name: s.name })
  }
  return { failed, total: mine.length, allDown: mine.length > 0 && failed.length === mine.length }
}

// Tekst voor schermlezers bij het puntje in de navigatie (betekenis hangt niet aan kleur).
export function statusLabel(count) {
  if (!count) return ''
  return count === 1 ? 'één bron tijdelijk niet bereikbaar' : `${count} bronnen tijdelijk niet bereikbaar`
}

// Valt een bron uit, dan houden we de berichten die we al van die bron hadden.
export function carryOver(prev, next) {
  if (!prev || !next) return next
  const down = new Set(next.sources.filter((s) => s.followed && !s.ok).map((s) => s.id))
  if (!down.size) return next
  const have = new Set(next.items.map((i) => i.id))
  const kept = prev.items.filter((i) => down.has(i.source) && !have.has(i.id))
  if (!kept.length) return next
  const items = [...next.items, ...kept].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
  return { ...next, items }
}
