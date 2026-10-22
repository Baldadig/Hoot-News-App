// De laatst geladen feed op het toestel, in IndexedDB (via idb-keyval) in plaats van
// localStorage: ruim een halve megabyte hoort niet in synchrone opslag die bij elke start
// helemaal wordt ingelezen. We lezen hem één keer vóór de eerste weergave (main.jsx), zodat een
// warme start meteen inhoud toont; schrijven gebeurt op de achtergrond.
import { get, set } from 'idb-keyval'

const KEY = 'hoot:feed'
const OLD = 'hoot:feed-v3' // tot en met 1.24 in localStorage

let cached = null

const withTimeout = (p, ms) => Promise.race([p, new Promise((resolve) => setTimeout(() => resolve(undefined), ms))])

export async function loadFeedCache() {
  try {
    cached = (await withTimeout(get(KEY), 400)) ?? null
  } catch {
    cached = null // privévenster of geblokkeerde opslag: dan zonder cache
  }
  // Eenmalig overzetten uit localStorage.
  try {
    const old = localStorage.getItem(OLD)
    if (old !== null) {
      if (!cached) {
        cached = JSON.parse(old)
        set(KEY, cached).catch(() => {})
      }
      localStorage.removeItem(OLD)
    }
  } catch {
    /* kapotte oude cache: weg ermee */
  }
  return cached
}

// Wat loadFeedCache vond; één keer op te halen (daarna houdt useFeed het bij).
export function takeFeedCache() {
  const c = cached
  cached = null
  return c
}

export function saveFeedCache(data) {
  set(KEY, data).catch(() => {})
}
