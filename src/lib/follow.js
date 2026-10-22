// Verhalen volgen — pure functies (tests/follow.test.mjs).
// Je volgt een verhaal (een bundel); bovenaan de Editie zie je wat er sinds je laatst keek bij is
// gekomen. De kop bewaren we bij het volgen: het verhaal kan later een andere hoofdkop krijgen.
// Hooguit vijf tegelijk, en na twee weken stopt het vanzelf (nieuws loopt af).
export const FOLLOW_MAX = 5
export const FOLLOW_DAYS = 14

export const isFollowing = (list = [], story) => !!story && list.some((f) => f.id === story.id || (story.formerIds || []).includes(f.id))

export function toggleFollow(list = [], story, title, now = Date.now()) {
  if (!story) return list
  if (isFollowing(list, story)) return list.filter((f) => f.id !== story.id && !(story.formerIds || []).includes(f.id))
  return [{ id: story.id, title, at: new Date(now).toISOString() }, ...list].slice(0, FOLLOW_MAX)
}

// Wat er nu te tonen is: per gevolgd verhaal dat nog bestaat (ook onder een nieuwe id) het
// aantal nieuwe berichten; met nieuws eerst. Verlopen volgen valt weg.
export function followedNow(list = [], storiesById = new Map(), newIn = () => 0, now = Date.now()) {
  const fresh = list.filter((f) => now - Date.parse(f.at) < FOLLOW_DAYS * 864e5)
  return fresh
    .map((f) => {
      const story = storiesById.get(f.id)
      return story ? { ...f, story, fresh: newIn(story) } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.fresh - a.fresh)
}
