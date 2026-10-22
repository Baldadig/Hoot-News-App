// Synchroniseren tussen toestellen — pure functies (tests/sync.test.mjs).

// Instellingen die met je account meegaan. Wat bij het toestel hoort (indeling, tekstgrootte,
// het paneel, de installatietip) blijft per toestel.
export const SYNCED_PREFS = ['muted', 'pinned', 'enabled', 'interests', 'topics', 'preview', 'images', 'bubble', 'brief', 'bluesky', 'bskyInStream', 'onboarded', 'weatherPlace']

export const pickSynced = (prefs = {}) => Object.fromEntries(SYNCED_PREFS.filter((k) => k in prefs).map((k) => [k, prefs[k]]))

// Gelezen: alles wat op een van beide als gelezen staat, de nieuwste `cap`.
export function mergeRead(a = [], b = [], cap = 1500) {
  return [...new Set([...a, ...b])].slice(-cap)
}

export const mergeSeen = (a = {}, b = {}) => ({ ...a, ...b })

// Bewaard bij het samenvoegen van anonieme gegevens: alles van beide kanten (bij hetzelfde
// bericht wint de jongste). Daarna is de server de waarheid (zie syncEngine.js).
export function mergeSaved(local = {}, remote = {}) {
  const out = { ...remote }
  for (const [k, v] of Object.entries(local)) if (!out[k] || (v.savedAt || 0) > (out[k].savedAt || 0)) out[k] = v
  return out
}
