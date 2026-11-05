// Client-side Bluesky: profielen oplossen en posts ophalen via de publieke API
// (public.api.bsky.app is CORS-vriendelijk). Zo kun je zelf accounts toevoegen
// zonder serverwijziging. De post-vorm is gelijk aan die van de aggregator.

import { BSKY_API as API, canonHandle, fetchAuthorPosts } from '../../shared/bluesky.mjs'
import { safeHttpUrl } from '../../shared/util.mjs'

// Accepteert "https://bsky.app/profile/xxx", "@xxx" of "xxx" -> handle
export function parseHandle(input) {
  let s = (input || '').trim()
  if (!s) return ''
  const m = s.match(/bsky\.app\/profile\/([^/?#]+)/i)
  if (m) return decodeURIComponent(m[1]).replace(/^@/, '')
  return s.replace(/^@/, '').replace(/\/+$/, '')
}

export async function resolveProfile(input) {
  const handle = canonHandle(parseHandle(input))
  if (!handle) throw new Error('Vul een Bluesky-handle of -link in')
  const res = await fetch(`${API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`)
  if (!res.ok) throw new Error(res.status === 400 ? 'Account niet gevonden' : `Bluesky-fout (${res.status})`)
  const d = await res.json()
  if (!d?.handle) throw new Error('Account niet gevonden')
  return { handle: d.handle, name: (d.displayName || '').trim() || d.handle, avatar: safeHttpUrl(d.avatar) } // komt in een <img src>: alleen http(s)
}

// De afgelopen 36 uur van één account (zelfde vorm en id's als de server: shared/bluesky.mjs).
export async function fetchAuthorItems(handle, name) {
  const posts = await fetchAuthorPosts(handle, { name })
  return posts.map((p) => ({ ...p, topics: [] }))
}

// Oude server-id's (`bsky:<handle>`) omzetten naar eigen accounts met hun huidige handle. Een account dat niet
// meer bestaat (400) valt weg; een tijdelijke fout laat het staan voor de volgende keer.
export async function resolveLegacy(ids, resolve = resolveProfile) {
  const found = {}, gone = []
  await Promise.all(ids.map(async (id) => {
    try {
      found[id] = await resolve(id.slice(5))
    } catch (e) {
      if (/niet gevonden/i.test(e?.message || '')) gone.push(id)
    }
  }))
  return { found, gone }
}
