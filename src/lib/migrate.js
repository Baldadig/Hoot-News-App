// Opslag van oudere versies omzetten of opruimen — één keer per toestel, vóór de eerste
// weergave (main.jsx). Het schemanummer staat in de instellingen; staat dat al op SCHEMA, dan
// gebeurt er niets. Pure functie over een opslag met getItem/setItem/removeItem
// (tests/migrate.test.mjs).
export const SCHEMA = 3

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

  next.schema = SCHEMA
  ls.setItem('hoot:prefs', JSON.stringify(next))
  return true
}
