// Bluesky-posts ophalen en omzetten naar Hoot-berichten. Gedeeld: de server haalt de vaste
// accounts op, de app de accounts die je zelf toevoegt — met precies dezelfde vorm en id's.
import { hash, hostname, safeIso } from './util.mjs'

export const BSKY_API = 'https://public.api.bsky.app/xrpc'
export const BSKY_BRAND = '#0085FF'

// Eén post → één bericht. Drie soorten beeld: een gedeelde link (met titel), een eigen foto
// (met de echte verhouding, zodat screenshots heel blijven) of een video.
export function mapPost(post, fallbackName) {
  const handle = post?.author?.handle
  if (!post?.record || !handle) return null
  const text = post.record.text || ''
  const permalink = `https://bsky.app/profile/${handle}/post/${(post.uri || '').split('/').pop()}`
  let image = null
  let imageRatio = null // breedte/hoogte van een geplaatste foto
  let video = null
  let videoPoster = null
  let url = permalink
  let linkTitle = null
  let domain = 'bsky.app'
  const photo = (im) => {
    image = im.thumb || im.fullsize || image
    const r = im.aspectRatio
    imageRatio = r?.width && r?.height ? Math.round((r.width / r.height) * 1000) / 1000 : 4 / 3
  }
  const link = (e) => {
    if (!e?.external) return
    image = e.external.thumb || image
    linkTitle = (e.external.title || '').trim() || null
    if (e.external.uri) {
      url = e.external.uri
      domain = hostname(url)
    }
  }
  const clip = (e) => {
    if (!e?.playlist) return
    video = e.playlist
    videoPoster = e.thumbnail || null
    image = e.thumbnail || image
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
    avatar: post.author.avatar || null,
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
// bladzijde: 100 per keer, hooguit 8 bladzijden. Lukt een latere bladzijde niet, dan houden
// we wat we hebben.
export async function fetchAuthorPosts(handle, { name, hours = 48, headers, now = Date.now() } = {}) {
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
    own.push(...feed.filter((fi) => !fi.reason && fi.post?.author?.handle === handle))
    const last = feed.at(-1)?.post
    cursor = data.cursor
    if (!cursor || !last || Date.parse(last.indexedAt || last.record?.createdAt) < since) break
  }
  return own.map((fi) => mapPost(fi.post, name)).filter((it) => it && (!it.publishedAt || Date.parse(it.publishedAt) >= since))
}
