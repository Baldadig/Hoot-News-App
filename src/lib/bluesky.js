// Client-side Bluesky: profielen oplossen en posts ophalen via de publieke API
// (public.api.bsky.app is CORS-vriendelijk). Zo kun je zelf accounts toevoegen
// zonder serverwijziging. De post-vorm is gelijk aan die van de aggregator.

const API = 'https://public.api.bsky.app/xrpc'
const BSKY_BRAND = '#0085FF'

// djb2-variant — identiek aan de server, zodat id's matchen (dedup tegen serverposts).
function hash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0
  return h.toString(36)
}

function hostname(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function safeIso(d) {
  if (!d) return null
  const t = new Date(d).getTime()
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

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

function mapPost(post, fallbackName) {
  if (!post?.record) return null
  const text = post.record.text || ''
  const handle = post.author?.handle
  if (!handle) return null
  const rkey = (post.uri || '').split('/').pop()
  const permalink = `https://bsky.app/profile/${handle}/post/${rkey}`
  let image = null
  let video = null
  let videoPoster = null
  let linkUrl = permalink
  let domain = 'bsky.app'
  const ext = (e) => {
    if (e?.external) {
      image = e.external.thumb || image
      if (e.external.uri) {
        linkUrl = e.external.uri
        domain = hostname(linkUrl)
      }
    }
  }
  const vid = (e) => {
    if (e?.playlist) {
      video = e.playlist
      videoPoster = e.thumbnail || null
      image = e.thumbnail || image
    }
  }
  const embed = post.embed
  if (embed) {
    const t = embed.$type || ''
    if (t.includes('embed.video')) vid(embed)
    else if (t.includes('embed.external')) ext(embed)
    else if (t.includes('embed.images') && embed.images?.length) image = embed.images[0].thumb || embed.images[0].fullsize
    else if (t.includes('recordWithMedia') && embed.media) {
      const m = embed.media
      if ((m.$type || '').includes('embed.video')) vid(m)
      else if ((m.$type || '').includes('embed.images') && m.images?.length) image = m.images[0].thumb
      else if ((m.$type || '').includes('embed.external')) ext(m)
    }
  }
  return {
    id: hash('bsky|' + post.uri),
    kind: 'post',
    source: 'bsky:' + handle,
    sourceName: post.author?.displayName || fallbackName || handle,
    handle: '@' + handle,
    domain,
    avatar: post.author?.avatar || null,
    avatarContain: false,
    brandColor: BSKY_BRAND,
    verified: true,
    title: '',
    summary: text.replace(/\s+/g, ' ').trim(),
    text,
    topics: [],
    url: linkUrl,
    image,
    video,
    videoPoster,
    readMin: null,
    publishedAt: safeIso(post.record.createdAt || post.indexedAt),
  }
}

export async function fetchAuthorItems(handle, name, limit = 30) {
  const url = `${API}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=${limit}&filter=posts_no_replies`
  const res = await fetch(url)
  if (!res.ok) throw new Error('bsky ' + res.status)
  const data = await res.json()
  // Alleen eigen, originele posts: geen reposts (reason), geen posts van anderen
  const own = (data.feed || []).filter((fi) => !fi.reason && fi.post?.author?.handle === handle)
  return own.map((fi) => mapPost(fi.post, name)).filter(Boolean)
}
