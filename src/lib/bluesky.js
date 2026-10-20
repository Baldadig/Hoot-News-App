// Client-side Bluesky: profielen oplossen en posts ophalen via de publieke API
// (public.api.bsky.app is CORS-vriendelijk). Zo kun je zelf accounts toevoegen
// zonder serverwijziging. De post-vorm is gelijk aan die van de aggregator.

import { BSKY_API as API, fetchAuthorPosts } from '../../shared/bluesky.mjs'

// Accepteert "https://bsky.app/profile/xxx", "@xxx" of "xxx" -> handle
export function parseHandle(input) {
  let s = (input || '').trim()
  if (!s) return ''
  const m = s.match(/bsky\.app\/profile\/([^/?#]+)/i)
  if (m) return decodeURIComponent(m[1]).replace(/^@/, '')
  return s.replace(/^@/, '').replace(/\/+$/, '')
}

export async function resolveProfile(input) {
  const handle = parseHandle(input)
  if (!handle) throw new Error('Vul een Bluesky-handle of -link in')
  const res = await fetch(`${API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`)
  if (!res.ok) throw new Error(res.status === 400 ? 'Account niet gevonden' : `Bluesky-fout (${res.status})`)
  const d = await res.json()
  if (!d?.handle) throw new Error('Account niet gevonden')
  return { handle: d.handle, name: (d.displayName || '').trim() || d.handle, avatar: d.avatar || null }
}

// De afgelopen 48 uur van één account (zelfde vorm en id's als de server: shared/bluesky.mjs).
export async function fetchAuthorItems(handle, name) {
  const posts = await fetchAuthorPosts(handle, { name })
  return posts.map((p) => ({ ...p, topics: [] }))
}
