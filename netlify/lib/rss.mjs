import { cleanIntro } from '../../shared/edition-display.mjs'
// RSS/Atom-feeds ophalen en omzetten naar Hoot-berichten.
import Parser from 'rss-parser'
import { hash, safeHttpUrl } from '../../shared/util.mjs'
import { typeset } from '../../shared/typeset.mjs'
import { BRAND, UA, editionWindowOf } from './sources.mjs'
import { firstOf } from './stream.mjs'
import { favicon, toText, clip, preview, cleanUrl, hostname, safeIso, plausibleTime, withoutPromo, PROMO_OWN } from './text.mjs'
import { langOf } from '../../shared/lang.mjs'

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

// Een audio- of video-enclosure, iTunes-afleveringsvelden (aflevering of duur) en de hoofdcategorie (de eerste) als die
// Podcast of Video is. Een latere categorie is een onderwerp ("Podcasts" bij een stuk óver podcasts), geen soort.
export function mediaFields(it = {}, cats = []) {
  const out = {}
  const type = String(it.enclosure?.type || '')
  if (/^(audio|video)\//i.test(type)) out.mediaType = type.toLowerCase()
  const ep = it.itunes?.episode ?? it.itunes?.duration
  if (ep != null && String(ep).trim()) out.podcastEpisode = String(ep).trim().slice(0, 20)
  const first = String(cats[0] || '').trim().toLowerCase()
  if (/^podcasts?$/.test(first)) out.feedMark = 'podcast'
  else if (/^(videos?|video's)$/.test(first)) out.feedMark = 'video'
  return out
}

function categoriesOf(it) {
  return (it.categories || []).map((c) => (typeof c === 'string' ? c : c?._ || c?.$?.term || '')).filter(Boolean)
}
// Geen nieuws: koopjesgidsen/affiliate-lijstjes, aanbiedingen, kleine software-updates en
// puzzels horen niet in een nieuws-tijdlijn (bij Wired is dat rond acties tot 70% van de feed;
// bij Tweakers is een kwart "Software-update - Camtasia 2026.2.3").
const NOISE_TITLE = /\b(prime day|black friday|cyber monday|singles day|promo codes?|coupon codes?|gift guides?|best gifts?|gifts? for (him|her|men|women|kids|dads?|moms?))\b|\bbest\b.*\bdeals\b|\bdeals\b.*(\bsave\b|\$\d|\bunder \$)|\d+ ?(%|percent) off\b/i
// Nederlands: aanbiedingen en kortingen ("deal" los niet: een handelsdeal is nieuws).
const NOISE_TITLE_NL = /\b(aanbiedingen?|in de aanbieding|kortingscodes?|dagdeals?|prijsfouten?|uitverkoop|koopjes|tijdelijk (goedkoper|in prijs verlaagd)|nu \d+ ?% korting)\b|\b\w+-deals\b/i
// Kleine updates: een nieuwe versie van een programma, driver of firmware (Tweakers zet ze
// onder /downloads/, en zijn eigen acties en evenementen onder /plan/).
const UPDATE_TITLE = /^(software|driver|firmware|bios|game)-update\s*[-–:]/i
// Reclame voor een eigen nieuwsbrief ("Middle East Dispatch newsletter: …", "Meld je aan voor …").
const NEWSLETTER_TITLE = /^[^:]{0,60}\bnewsletter:|\bsign up (for|to) (our|the)\b.*\bnewsletter\b|^meld je aan voor\b/i
// Ook geen persberichten van de uitgever zelf ("Election Night at The Atlantic", onder
// /press-releases/) en geen betaalde of partnerinhoud.
const NOISE_LINK = /\/puzzels?\/|\/press-releases?\/|\/persberichten?\/|\/sponsored\/|\/partner(-content)?\/|^https:\/\/tweakers\.net\/(downloads|plan|aanbiedingen|pricewatch)\//
export function isNoise(it, cats = []) {
  if (cats.some((c) => /\bdeals\b|\bcoupons?\b|\bshopping\b|\baanbieding|^(software|driver|firmware)$|^\.(plan|actie)$/i.test(c.trim()))) return true
  const title = it.title || ''
  if (NOISE_TITLE.test(title) || NOISE_TITLE_NL.test(title) || UPDATE_TITLE.test(title) || NEWSLETTER_TITLE.test(title)) return true
  return NOISE_LINK.test(it.link || '')
}
// De intro uit de feed: de samenvatting, of anders de artikeltekst (content:encoded), zonder
// een vaste aanhef als "Nature, Published online: …; doi:…". Herhaalt hij alleen de kop, dan
// is er geen intro.
// Een Atom-feed (The Atlantic, The Verge) levert naast de artikeltekst (<content>, bij rss-parser
// contentSnippet) een eigen korte dek (<summary>). Die dek is de intro die de redactie schreef en past
// vaker op een plek in de Editie dan de eerste alinea (kaartkwaliteit, 7 november): hij gaat voor,
// als hij iets zegt (minstens 40 tekens, niet de kop) en korter is dan de artikeltekst.
const DEK_MIN = 40
const same = (a) => a.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
export function introOf(it, title = '') {
  const dek = typeof it.summary === 'string' ? toText(it.summary).trim() : ''
  const body = it.contentSnippet ? toText(it.contentSnippet).trim() : ''
  const useDek = dek.length >= DEK_MIN && body && dek.length < body.length && same(dek) !== same(title)
  const raw = useDek ? dek : it.contentSnippet || it.summary || it.description || it.contentEncoded || ''
  const text = toText(raw)
    .replace(/^[^.;]{0,60}Published online:[^;]*;\s*doi:\s*\S+\s*/i, '')
    .trim()
  return text && same(text) !== same(title) ? text : ''
}

// Auteur zoals de feed die levert (string of Atom-object); niets = niets tonen.
function authorOf(it) {
  let a = it.creator || it['dc:creator'] || it.author
  if (a && typeof a === 'object') a = Array.isArray(a.name) ? a.name[0] : a.name
  a = toText(String(a || '')).replace(/^by\s+/i, '').trim()
  if (/@|https?:/.test(a)) return null // een e-mailadres of link is geen naam
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
    // Meerdere formaten (The Guardian: 140 en 460 px breed): het breedste.
    const imgs = mc.filter((m) => m?.$?.url && (m.$.medium === 'image' || /^image\//.test(m.$.type || '') || /\.(jpe?g|png|webp|gif)/i.test(m.$.url)))
    const img = imgs.reduce((best, m) => (Number(m.$.width) || 0) > (Number(best?.$?.width) || 0) ? m : best, imgs[0])
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

// `limit`: hoeveel berichten in de taal van de bron (feedvolgorde). Standaard het oude venster
// (editionWindowOf: 30, per rubriek minder). De feed-opbouw vraagt alles (Infinity): de Stroom kapt
// zelf af op tijd en aantal (stream.mjs), de verhalen en de Editie nemen het oude venster (firstOf, stream.mjs).
export async function loadSource(src, avatarsP, { limit = editionWindowOf(src) } = {}) {
  let lastErr
  for (const url of src.urls) {
    try {
      // Feed en avatars tegelijk ophalen (avatars houden de feed niet meer op).
      const [feed, avatars] = await Promise.all([readFeed(url), avatarsP])
      const fetchedAt = Date.now()
      // Mooie merk-avatar: 1) Bluesky-profiel, 2) X-profiel via unavatar.io, 3) favicon.
      const brandAvatar = avatars[src.id] || (src.x ? `https://unavatar.io/x/${src.x}` : null)
      const fresh = (feed.items || []).map((it) => [it, categoriesOf(it)]).filter(([it, cats]) => !isNoise(it, cats) && (!src.keep || String(it.link || '').includes(src.keep)))
      const mapped = fresh.map(([it, cats]) => {
        const link = safeHttpUrl(cleanUrl(it.link || it.guid || ''))
        const domain = hostname(link)
        // Eén typografische hand (D3): kop en intro worden hier, vóór opslag, één keer gezet in de
        // taal van de bron. Al opgeslagen koppen blijven zoals ze zijn; normTitle en de ontdubbeling
        // zien geen verschil (leestekens tellen daar niet).
        const title = typeset(toText(it.title || '').trim(), src.lang)
        // Reclame en nieuwsbrief-aanhef ("Sign up for …", "This is an edition of …") gaan eruit vóór het
        // inkorten: anders bleef van een intro die met reclame begon niets over (kaartkwaliteit).
        const intro = typeset(cleanIntro(introOf(it, title), authorOf(it)), src.lang)
        const fullText = PROMO_OWN.test(intro) ? withoutPromo(intro) : intro
        const teaser = clip(fullText, 280)
        const summary = preview(fullText)
        // Leestijd alleen tonen als de feed de echte artikeltekst meelevert (NOS, The Verge);
        // bij een losse teaser valt er niets te meten.
        const bodyWords = toText(it.contentEncoded || it.content || it.description || '').split(/\s+/).filter(Boolean).length
        const readMin = bodyWords >= 150 ? Math.max(1, Math.round(bodyWords / 220)) : null
        // YouTube-RSS levert geen <img>; thumbnail afleiden uit de video-id.
        const ytId = it.ytVideoId || null
        const image = safeHttpUrl(usableImage(pickImage(it))) || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null)
        // Taal van dit bericht (shared/lang.mjs); `offLang`: anders dan de hoofdtaal van de bron
        // (een Engelstalig Parool-stuk). Die laat de build weg voor lezers van de brontaal.
        const { lang, offLang } = langOf({ title, summary: fullText, url: link }, src.lang)
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
          // Harde media-aanwijzingen uit de feed zelf, voor de Editietoets (shared/editie-filter.mjs); de Stroom kijkt er niet naar.
          ...mediaFields(it, cats),
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
          lang,
          offLang,
          publishedAt: plausibleTime(it.isoDate || (it.pubDate ? safeIso(it.pubDate) : null), fetchedAt),
        }
      }).filter((i) => i.url && i.title) // zonder geldige (http/https) link of zonder kop niet tonen
      const items = firstOf(mapped, limit) // de grens telt alleen berichten in de brontaal
      return { id: src.id, name: src.name, ok: true, used: url, count: items.length, items }
    } catch (e) {
      lastErr = e
    }
  }
  return { id: src.id, name: src.name, ok: false, used: null, count: 0, items: [], error: String((lastErr && lastErr.message) || lastErr) }
}
// Eén herhaalpoging bij een mislukte bron (korte hapering), daarna opgeven zonder de rest te blokkeren.
export async function loadSourceWithRetry(src, avatarsP, opts) {
  const first = await loadSource(src, avatarsP, opts)
  if (first.ok) return first
  await new Promise((r) => setTimeout(r, 350))
  const second = await loadSource(src, avatarsP, opts)
  return second.ok ? second : first
}
