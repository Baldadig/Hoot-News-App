// Opslag van oudere versies omzetten of opruimen — één keer per toestel, vóór de eerste
// weergave (main.jsx). Het schemanummer staat in de instellingen; staat dat al op SCHEMA, dan
// gebeurt er niets. Pure functie over een opslag met getItem/setItem/removeItem
// (tests/migrate.test.mjs).
import { themePref, darkPref } from './theme.js'
import { currentTopics, currentTopicMap } from './topics.js'
export const SCHEMA = 5

const read = (ls, key) => {
  try {
    return JSON.parse(ls.getItem(key))
  } catch {
    return null
  }
}

export function migrate(ls) {
  const prefs = read(ls, 'hoot:prefs')
  if (prefs && prefs.schema >= SCHEMA) return false
  const next = prefs && typeof prefs === 'object' ? { ...prefs } : {}

  // Nog geen instellingen: een bestaande lezer (cache of leeslijst van vroeger) slaat het welkom
  // over, een nieuw toestel niet. Expliciet, want de standaard in prefs.js is `true`.
  if (!prefs) next.onboarded = ['hoot:feed-cache', 'hoot:saved-items', 'hoot:read', 'hoot:theme'].some((k) => ls.getItem(k) !== null)

  // Bewaard in de oude vorm (losse berichten) → de huidige vorm, als die er nog niet is.
  const old = read(ls, 'hoot:saved-items')
  if (old && typeof old === 'object' && ls.getItem('hoot:saved-v2') === null) {
    const now = Date.now()
    ls.setItem('hoot:saved-v2', JSON.stringify(Object.fromEntries(Object.entries(old).map(([id, item]) => [id, { kind: 'item', savedAt: item?.savedAt || now, item }]))))
  }
  // Caches van vroeger (de feed van nu staat in IndexedDB, zie feedCache.js).
  for (const k of ['hoot:saved-items', 'hoot:feed-cache', 'hoot:feed-v2']) ls.removeItem(k)

  next.theme = themePref(next.theme ?? ls.getItem('hoot:theme'))
  next.themeDark = darkPref(next.themeDark ?? ls.getItem('hoot:theme-dark'))
  // 1.1.0: Trump is geen eigen onderwerp meer maar Verenigde Staten (vs-politiek). Wat je volgde, vastzette,
  // meer/minder koos en las, gaat mee naar de nieuwe sleutel (zie topics.js RETIRED_TOPICS).
  if (Array.isArray(next.topics)) next.topics = currentTopics(next.topics)
  if (Array.isArray(next.pinned)) next.pinned = currentTopics(next.pinned)
  if (next.taste?.topics) next.taste = { ...next.taste, topics: currentTopicMap(next.taste.topics, 12) }
  const aff = read(ls, 'hoot:affinity')
  if (aff?.topics) ls.setItem('hoot:affinity', JSON.stringify({ ...aff, topics: currentTopicMap(aff.topics) }))
  next.schema = SCHEMA
  ls.setItem('hoot:prefs', JSON.stringify(next))
  return true
}
