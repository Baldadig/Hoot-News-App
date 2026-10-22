// RSS/Atom-feeds ophalen en omzetten naar Hoot-berichten.
import Parser from 'rss-parser'
import { hash, safeHttpUrl } from '../../shared/util.mjs'
import { BRAND, PER_SOURCE_LIMIT, LIMIT_BY_CAT, UA } from './sources.mjs'
import { favicon, toText, clip, preview, cleanUrl, hostname, safeIso } from './text.mjs'

const parser = new Parser({
  timeout: 9000,
  headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml; q=0.9, */*; q=0.8' },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
      ['yt:videoId', 'ytVideoId'],
    ],
  },
})

function categoriesOf(it) {
  return (it.categories || []).map((c) => (typeof c === 'string' ? c : c?._ || c?.$?.term || '')).filter(Boolean)
}
// Geen nieuws: koopjesgidsen/affiliate-lijstjes en puzzels horen niet in een
// nieuws-tijdlijn (bij Wired is dat rond acties tot 70% van de feed).
const NOISE_TITLE = /\b(prime day|black friday|cyber monday|promo codes?|coupon codes?|gift guides?|best gifts?|gifts? for (him|her|men|women|kids|dads?|moms?))\b|\bbest\b.*\bdeals\b|\bdeals\b.*(\bsave\b|\$\d|\bunder \$)|\d+ ?(%|percent) off\b/i
function isNoise(it, cats) {
  if (cats.some((c) => /\bdeals\b|\bcoupons?\b|\bshopping\b/i.test(c))) return true
  if (NOISE_TITLE.test(it.title || '')) return true
  return /\/puzzels?\//.test(it.link || '')
}
// Auteur zoals de feed die levert (string of Atom-object); niets = niets tonen.
function authorOf(it) {
  let a = it.creator || it['dc:creator'] || it.author
  if (a && typeof a === 'object') a = Array.isArray(a.name) ? a.name[0] : a.name
  a = toText(String(a || '')).replace(/^by\s+/i, '').trim()
  return a && a.length <= 70 ? a : null
}
// Soort alleen als de bron het zelf aangeeft (URL-pad of RSS-categorie). Geen signaal = geen label.
function typeOf(link, cats) {
  if (/\/(opinie|opinion|opinions|columns?[a-z-]*|commentaar|commentisfree)\//i.test(link)) return 'opinie'
  if (cats.some((c) => /^(opinie|opinion|column|columns|commentaar)$/i.test(c.trim()))) return 'opinie'
  return null
}
// Rubriek uit de URL, alleen waar die betrouwbaar is (de Volkskrant).
const VK_SECTIONS = { 'cultuur-media': 'Cultuur & media', 'nieuws-achtergrond': 'Achtergrond', 'wk-voetbal': 'WK voetbal' }
function sectionOf(sourceId, link) {
  if (sourceId !== 'volkskrant') return null
  const seg = (() => {
    try {
      return new URL(link).pathname.split('/')[1] || ''
    } catch {
      return ''
    }
  })()
  if (!seg || /^columns|^opinie/.test(seg)) return null
  if (VK_SECTIONS[seg]) return VK_SECTIONS[seg]
  const t = seg.replace(/-/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}
// Alleen echte beelden: een http(s)-adres, geen telpixel ("npr-rss-pixel.png") of lege waarde.
export function usableImage(u) {
  return typeof u === 'string' && /^https?:\/\//.test(u) && !/[-_/](pixel|spacer|tracking|1x1)[-_.]/i.test(u) ? u : null
}
function pickImage(item) {
  const mc = item.mediaContent
  if (Array.isArray(mc)) {
    const img = mc.find((m) => m?.$?.medium === 'image' || /^image\//.test(m?.$?.type || '') || /\.(jpe?g|png|webp|gif)/i.test(m?.$?.url || ''))
    if (img?.$?.url) return img.$.url
  } else if (mc?.$?.url) return mc.$.url
  const mt = item.mediaThumbnail
  if (Array.isArray(mt)) {
    if (mt[0]?.$?.url) return mt[0].$.url
  } else if (mt?.$?.url) return mt.$.url
  if (item.enclosure?.url && /^image\//.test(item.enclosure.type || '')) return item.enclosure.url
  const html = item.contentEncoded || item.content || item.description || ''
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html)
  return m ? m[1] : null
}

// Zelf ophalen en dan pas lezen: sommige feeds beginnen met een onzichtbaar teken of witregels
// (The Independent), waar de parser anders over struikelt.
async function readFeed(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml; q=0.9, */*; q=0.8' }, signal: AbortSignal.timeout(9000) })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return parser.parseString((await res.text()).replace(/^[\s\uFEFF]+/, ''))
}

export async function loadSource(src, avatarsP) {
  let lastErr
  for (const url of src.urls) {
    try {
      // Feed en avatars tegelijk ophalen (avatars houden de feed niet meer op).
      const [feed, avatars] = await Promise.all([readFeed(url), avatarsP])
      // Mooie merk-avatar: 1) Bluesky-profiel, 2) X-profiel via unavatar.io, 3) favicon.
      const brandAvatar = avatars[src.id] || (src.x ? `https://unavatar.io/x/${src.x}` : null)
      const fresh = (feed.items || []).map((it) => [it, categoriesOf(it)]).filter(([it, cats]) => !isNoise(it, cats))
      // Muziek: minder per bron, zodat het nieuws niet wordt weggedrukt.
      const items = fresh.slice(0, src.music ? 12 : LIMIT_BY_CAT[src.cat] || PER_SOURCE_LIMIT).map(([it, cats]) => {
        const link = safeHttpUrl(cleanUrl(it.link || it.guid || ''))
        const domain = hostname(link)
        const title = toText(it.title || '').trim()
        const fullText = toText(it.contentSnippet || it.summary || it.description || '')
        const teaser = clip(fullText, 280)
        const summary = preview(fullText)
        // Leestijd alleen tonen als de feed de echte artikeltekst meelevert (NOS, The Verge);
        // bij een losse teaser valt er niets te meten.
        const bodyWords = toText(it.contentEncoded || it.content || it.description || '').split(/\s+/).filter(Boolean).length
        const readMin = bodyWords >= 150 ? Math.max(1, Math.round(bodyWords / 220)) : null
        // YouTube-RSS levert geen <img>; thumbnail afleiden uit de video-id.
        const ytId = it.ytVideoId || null
        const image = safeHttpUrl(usableImage(pickImage(it))) || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null)
        return {
          id: hash(src.id + '|' + link),
          kind: 'article',
          source: src.id,
          sourceName: src.name,
          handle: domain,
          domain,
          avatar: safeHttpUrl(brandAvatar) || favicon(domain),
          avatarContain: !brandAvatar,
          brandColor: BRAND[src.id] || '#21468b',
          author: authorOf(it),
          type: typeOf(link, cats),
          section: sectionOf(src.id, link),
          title,
          summary,
          text: teaser,
          cats: cats.join(' '),
          url: link,
          image,
          video: null,
          videoPoster: null,
          readMin,
          publishedAt: it.isoDate || (it.pubDate ? safeIso(it.pubDate) : null),
        }
      }).filter((i) => i.url) // zonder geldige (http/https) link niet tonen
      return { id: src.id, name: src.name, ok: true, used: url, count: items.length, items }
    } catch (e) {
      lastErr = e
    }
  }
  return { id: src.id, name: src.name, ok: false, used: null, count: 0, items: [], error: String((lastErr && lastErr.message) || lastErr) }
}
// Eén herhaalpoging bij een mislukte bron (korte hapering), daarna opgeven zonder de rest te blokkeren.
export async function loadSourceWithRetry(src, avatarsP) {
  const first = await loadSource(src, avatarsP)
  if (first.ok) return first
  await new Promise((r) => setTimeout(r, 350))
  const second = await loadSource(src, avatarsP)
  return second.ok ? second : first
}
