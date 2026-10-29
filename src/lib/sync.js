// Synchroniseren tussen toestellen — pure functies (tests/sync.test.mjs).

// Instellingen die met je account meegaan. Wat bij het toestel hoort (indeling, tekstgrootte,
// het paneel, de installatietip) blijft per toestel.
export const SYNCED_PREFS = ['muted', 'pinned', 'enabled', 'interests', 'topics', 'preview', 'images', 'bubble', 'brief', 'bluesky', 'bskyInStream', 'onboarded', 'weatherPlace', 'followStories', 'vak', 'favorites', 'social', 'taste']

export const pickSynced = (prefs = {}) => Object.fromEntries(SYNCED_PREFS.filter((k) => k in prefs).map((k) => [k, prefs[k]]))

const list = (v) => (Array.isArray(v) ? v : [])
const map = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

// Gelezen: alles wat op een van beide als gelezen staat, de nieuwste `cap`.
// Wat van de server komt kan van een oudere versie zijn: geen lijst telt als leeg.
export function mergeRead(a = [], b = [], cap = 1500) {
  return [...new Set([...list(a), ...list(b)])].slice(-cap)
}

// Geziene verhalen (verhaal-id → gezien bericht-id's): wat je op een van beide toestellen zag,
// telt als gezien. Hooguit `cap` verhalen, de nieuwste (zoals markStorySeen in App.jsx), anders
// groeit dit met elk toestel dat meedoet.
export function mergeSeen(a = {}, b = {}, cap = 300) {
  const out = { ...map(a) }
  for (const [k, ids] of Object.entries(map(b))) out[k] = out[k] ? [...new Set([...list(out[k]), ...list(ids)])] : ids
  const keys = Object.keys(out)
  return keys.length > cap ? Object.fromEntries(keys.slice(-cap).map((k) => [k, out[k]])) : out
}

// Een kapotte rij (null, geen object) laten we liggen in plaats van dat samenvoegen erop
// vastloopt. Onbekende soorten blijven staan: die kan een nieuwere versie van de app gemaakt hebben.
const entries = (saved) => Object.entries(map(saved)).filter(([, e]) => e && typeof e === 'object')

// Bewaard bij het samenvoegen van anonieme gegevens: alles van beide kanten (bij hetzelfde
// bericht wint de jongste). Daarna is de server de waarheid (zie syncEngine.js).
export function mergeSaved(local = {}, remote = {}) {
  const out = Object.fromEntries(entries(remote))
  for (const [k, v] of entries(local)) if (!out[k] || (v.savedAt || 0) > (out[k].savedAt || 0)) out[k] = v
  return out
}
