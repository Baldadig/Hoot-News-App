// Nieuwe berichten tijdens het lezen — pure functies (getest in tests/fresh.test.mjs).

// Hoeveel berichten in `next` had je nog niet? Dubbelen tellen één keer; berichten van
// bronnen die je hebt uitgezet tellen niet mee.
export function freshCount(prevItems = [], nextItems = [], muted = new Set()) {
  const seen = new Set(prevItems.map((i) => i.id))
  const fresh = new Set()
  for (const i of nextItems) if (!seen.has(i.id) && !muted.has(i.source)) fresh.add(i.id)
  return fresh.size
}
