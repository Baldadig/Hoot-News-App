// Aanvullende bronnen naast de feeds: de zoekindex van Bing Nieuws (inleidingen en beeld),
// open trend-signalen (Buiten je bubbel) en merk-avatars van Bluesky.
import { parseSnippets } from './snippets.mjs'
import { SOURCES, UA } from './sources.mjs'
import { BSKY_API } from '../../shared/bluesky.mjs'

// ---------- Voorvertoning voor de Volkskrant (feed levert alleen koppen) ----------
// De eigen inleiding van het artikel uit de zoekindex van Bing Nieuws: een algemene vraag
// plus één per rubriek die nu in de feed staat. Mislukt het, dan blijft het zoals het was.
export async function loadSnippets(queries, domain) {
  const one = async (q, first) => {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 5000)
    try {
      const u = `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&cc=NL&setlang=nl&count=50&qft=${encodeURIComponent('sortbydate="1"')}${first ? `&first=${first}` : ''}`
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HootNews/1)' }, signal: c.signal })
      return r.ok ? parseSnippets(await r.text(), domain) : []
    } finally {
      clearTimeout(t)
    }
  }
  // De algemene vraag (eerste in de lijst) ook de tweede pagina; rubrieken alleen de eerste.
  const res = await Promise.allSettled([one(queries[0]), one(queries[0], 15), ...queries.slice(1, 12).map((q) => one(q))])
  return res.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
}

// ---------- Buiten je bubbel: waar anderen over praten ----------
// Drie open signalen, elk met een korte timeout; valt er een uit, dan doen de andere mee.
export async function loadTrends() {
  const get = async (url, headers = {}) => {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 6000)
    try {
      const r = await fetch(url, { headers, signal: c.signal })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r
    } finally {
      clearTimeout(t)
    }
  }
  const y = new Date(Date.now() - 864e5)
  const day = `${y.getUTCFullYear()}/${String(y.getUTCMonth() + 1).padStart(2, '0')}/${String(y.getUTCDate()).padStart(2, '0')}`
  const ua = { 'User-Agent': 'HootNews/1 (https://hootnewsapp.netlify.app)' }
  const jobs = [
    get('https://trends.google.com/trending/rss?geo=NL', { 'User-Agent': 'Mozilla/5.0' })
      .then((r) => r.text())
      .then((x) => [...x.matchAll(/<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([^<\]]+)/g)].slice(0, 20).map((m, i) => ({ term: m[1].trim(), via: 'google', rank: i }))),
    get('https://public.api.bsky.app/xrpc/app.bsky.unspecced.getTrendingTopics?limit=15', ua)
      .then((r) => r.json())
      .then((j) => (j.topics || []).map((t, i) => ({ term: t.topic, via: 'bluesky', rank: i }))),
    ...['nl', 'en'].map((lang) =>
      get(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${lang}.wikipedia/all-access/${day}`, ua)
        .then((r) => r.json())
        .then((j) => (j.items?.[0]?.articles || []).slice(0, 30).map((a, i) => ({ term: a.article, via: 'wikipedia', rank: i })))
    ),
  ]
  const res = await Promise.allSettled(jobs)
  return res.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
}

// ---------- Mooie merk-avatars via Bluesky ----------
async function bskyAvatar(handle) {
  try {
    const res = await fetch(`${BSKY_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const d = await res.json()
    return d.avatar || null
  } catch {
    return null
  }
}
// Profielfoto en naam van de gevolgde Bluesky-accounts (ook als ze 48 uur niets posten).
export async function loadBlueskyProfiles(handles) {
  const out = {}
  for (let i = 0; i < handles.length; i += 25) {
    const q = handles.slice(i, i + 25).map((h) => 'actors=' + encodeURIComponent(h)).join('&')
    const res = await fetch(`${BSKY_API}/app.bsky.actor.getProfiles?${q}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) })
    if (!res.ok) continue
    for (const p of (await res.json()).profiles || []) out[p.handle] = { avatar: p.avatar || null, name: (p.displayName || '').trim() || null }
  }
  return out
}

// Merk-avatars van alle bronnen (zelden anders; de bouwer bewaart ze een dag, zie build.mjs).
export async function loadSourceAvatars() {
  const entries = await Promise.all(SOURCES.map(async (s) => [s.id, s.bsky ? await bskyAvatar(s.bsky) : null]))
  return Object.fromEntries(entries)
}
