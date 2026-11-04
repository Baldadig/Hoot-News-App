// Bluesky-posts ophalen en omzetten naar Hoot-berichten. Gedeeld: de server haalt de vaste
// accounts op, de app de accounts die je zelf toevoegt — met precies dezelfde vorm en id's.
import { hash, hostname, safeHttpUrl, safeIso } from './util.mjs'

export const BSKY_API = 'https://public.api.bsky.app/xrpc'
export const BSKY_BRAND = '#0085FF'

// Handles zijn hoofdletterloos; en een paar accounts die Hoot vroeger zelf volgde zijn van naam
// veranderd (het oude adres bestaat niet meer en geeft AccountTakedown). Gelijk aan Bluesky.canonical in
// ios/Hoot/Bluesky.swift.
export const BSKY_RENAMED = { 'aaronrupar.bsky.social': 'atrupar.com' }
export function canonHandle(handle) {
  const h = String(handle || '').trim().replace(/^@/, '').toLowerCase()
  return BSKY_RENAMED[h] || h
}

// Video's: rechtstreeks van Bluesky's video-CDN. Het gewone adres (video.bsky.app/watch/…) stuurt
// daar alleen naartoe en reageerde op 21 okt 2026 urenlang niet; de CDN zelf wel.
export function directVideo(url) {
  const m = /^https:\/\/video\.bsky\.app\/watch\/([^/]+)\/([^/]+)\/(.+)$/.exec(url || '')
  return m ? `https://video.cdn.bsky.app/hls/${decodeURIComponent(m[1])}/${m[2]}/${m[3]}` : url
}

// Eén post → één bericht. Drie soorten beeld: een gedeelde link (met titel), een eigen foto
// (met de echte verhouding, zodat screenshots heel blijven) of een video.
export function mapPost(post, fallbackName) {
  const handle = post?.author?.handle
  if (!post?.record || !handle) return null
  const text = typeof post.record.text === 'string' ? post.record.text : '' // één rare post mag het account niet laten mislukken
  const permalink = `https://bsky.app/profile/${handle}/post/${(post.uri || '').split('/').pop()}`
  let image = null
  let imageRatio = null // breedte/hoogte van een geplaatste foto
  let video = null
  let videoPoster = null
  let url = permalink
  let linkTitle = null
  let domain = 'bsky.app'
  const photo = (im) => {
    image = safeHttpUrl(im.thumb) || safeHttpUrl(im.fullsize) || image
    const r = im.aspectRatio
    imageRatio = r?.width && r?.height ? Math.round((r.width / r.height) * 1000) / 1000 : 4 / 3
  }
  const link = (e) => {
    if (!e?.external) return
    image = safeHttpUrl(e.external.thumb) || image
    linkTitle = (e.external.title || '').trim() || null
    const uri = safeHttpUrl(e.external.uri) // anders blijft de link naar de post zelf staan
    if (uri) {
      url = uri
      domain = hostname(url)
    }
  }
  const clip = (e) => {
    const playlist = safeHttpUrl(e?.playlist)
    if (!playlist) return
    video = directVideo(playlist)
    videoPoster = directVideo(safeHttpUrl(e.thumbnail)) || null // video's tonen alleen dit beeld, niet `image`
  }
  const media = (e) => {
    const t = e?.$type || ''
    if (t.includes('embed.video')) clip(e)
    else if (t.includes('embed.external')) link(e)
    else if (t.includes('embed.images') && e.images?.length) photo(e.images[0])
    else if (t.includes('recordWithMedia')) media(e.media)
  }
  media(post.embed)
  return {
    id: hash('bsky|' + post.uri),
    kind: 'post',
    source: 'bsky:' + handle,
    sourceName: post.author.displayName || fallbackName || handle,
    handle: '@' + handle,
    domain,
    avatar: safeHttpUrl(post.author.avatar),
    avatarContain: false,
    brandColor: BSKY_BRAND,
    type: 'sociaal',
    title: '',
    summary: text.replace(/\s+/g, ' ').trim(),
    url,
    linkTitle,
    image,
    imageRatio,
    video,
    videoPoster,
    publishedAt: safeIso(post.record.createdAt || post.indexedAt),
  }
}

// Eigen posts (geen reposts, geen antwoorden) van de afgelopen `hours` uur, bladzijde voor
// bladzijde: 100 per keer, hooguit 8 bladzijden (36 uur: net als de Stroom, STREAM_HOURS in
// netlify/lib/sources.mjs; iOS: Bluesky.swift). Lukt een latere bladzijde niet, dan houden
// we wat we hebben.
export async function fetchAuthorPosts(handle, { name, hours = 36, headers, now = Date.now() } = {}) {
  const since = now - hours * 36e5
  const own = []
  let cursor = ''
  for (let page = 0; page < 8; page++) {
    const url = `${BSKY_API}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=100&filter=posts_no_replies${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
    if (!res.ok) {
      if (page === 0) throw new Error('bsky ' + res.status)
      break
    }
    const data = await res.json()
    const feed = data.feed || []
    own.push(...feed.filter((fi) => !fi.reason && String(fi.post?.author?.handle).toLowerCase() === String(handle).toLowerCase()))
    cursor = data.cursor
    // Tot waar de bladzijde reikt: het moment van de laatste regel in de volgorde van de feed. Bij een
    // repost is dat het moment van de repost, niet de leeftijd van het oorspronkelijke bericht (een
    // repost van een oude post stopte het bladeren te vroeg: de eigen posts erachter bleven weg).
    // Een vastgezette post (reasonPin) staat bovenaan en zegt niets over de volgorde.
    const last = [...feed].reverse().find((fi) => !String(fi.reason?.$type || '').includes('reasonPin'))
    const lastTime = last && Date.parse(last.reason?.indexedAt || last.post?.indexedAt || last.post?.record?.createdAt)
    if (!cursor || !last || lastTime < since) break
  }
  return own.map((fi) => mapPost(fi.post, name)).filter((it) => it && (!it.publishedAt || Date.parse(it.publishedAt) >= since))
}

// De tekst van een post zonder kale links (Stroom-kaart B, keuze 1.1.0): de link staat al in de
// linkkaart eronder, dus "theverge.com/2026/11/…" of "https://…" in de tekst zelf valt weg. Een
// los woord met een punt ("3.7", "e.g.") blijft staan: alleen een adres met http(s), een pad of
// de host van de linkkaart telt als link. Gelijk aan Post.withoutBareLinks in ios/Hoot/Views/BlueskyView.swift.
export function withoutBareLinks(text = '', domain = '') {
  const host = String(domain || '').replace(/^www\./, '').toLowerCase()
  return String(text || '')
    .split(/(\s+)/)
    .filter((t) => {
      if (!t.trim()) return true
      const w = t.replace(/[)\].,;:!?]+$/, '').toLowerCase()
      if (/^https?:\/\//.test(w)) return false
      if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/\S*$/.test(w)) return false
      if (host && (w === host || w === 'www.' + host || (w.startsWith(host) && w.endsWith('…')))) return false
      return true
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

