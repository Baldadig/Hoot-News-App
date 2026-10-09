// Bewaard en verhalen — pure functies (getest in tests/saved.test.mjs).

// Verhalen opzoekbaar op hun huidige id én op de id's die ze eerder hadden
// (als twee bundels zijn samengegaan).
export function indexStories(stories = []) {
  const map = new Map()
  for (const s of stories) for (const old of s.formerIds || []) map.set(old, s)
  for (const s of stories) map.set(s.id, s)
  return map
}

// Een verhaal met zijn publicaties: de actuele versie als die bestaat, anders de
// momentopname van toen het bewaard werd.
export function resolveStory(id, storiesById, saved = {}, itemsById = new Map(), muted = new Set()) {
  if (!id) return null
  const snap = saved[id]?.kind === 'story' ? saved[id] : null
  const story = storiesById.get(id) || snap?.story
  if (!story) return null
  const snapItems = new Map((snap?.items || []).map((i) => [i.id, i]))
  const items = story.itemIds.map((x) => itemsById.get(x) || snapItems.get(x)).filter(Boolean).filter((i) => !muted.has(i.source))
  return items.length ? { story, items } : null
}

export function toggleSaved(saved, kind, id, payload, itemsById = new Map(), now = Date.now()) {
  const next = { ...saved }
  if (next[id]) delete next[id]
  else if (kind === 'story') next[id] = { kind, savedAt: now, story: payload, items: payload.itemIds.map((i) => itemsById.get(i)).filter(Boolean) }
  else next[id] = { kind: 'item', savedAt: now, item: payload }
  return next
}

// Is dit (verhaal of bericht) bewaard — ook als het verhaal intussen een andere id heeft?
export function savedKey(saved, id, story) {
  if (saved[id]) return id
  for (const old of story?.formerIds || []) if (saved[old]) return old
  return null
}

// "Ongedaan maken" na verwijderen: zet precies terug wat er stond.
export function restoreSaved(saved, id, entry) {
  if (!entry || saved[id]) return saved
  return { ...saved, [id]: entry }
}
