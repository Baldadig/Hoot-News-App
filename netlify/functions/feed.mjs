import Parser from 'rss-parser'
import Anthropic from '@anthropic-ai/sdk'
import { getStore, connectLambda } from '@netlify/blobs'
import { hash, byRecency, sigWords, sharedCount, buildStories, editionSlot, selectEdition, NL_SOURCES } from '../lib/stories.mjs'

// ---------- Bronnen ----------
// bsky = Bluesky-handle van het officiële account, voor een mooie merk-avatar.
const SOURCES = [
  { id: 'nrc', name: 'NRC', bsky: 'nrc.nl', x: 'nrc', urls: ['https://www.nrc.nl/rss/', 'https://www.nrc.nl/index.rss', 'https://www.nrc.nl/rss.php'] },
  { id: 'volkskrant', name: 'de Volkskrant', bsky: 'volkskrant.nl', x: 'volkskrant', urls: ['https://www.volkskrant.nl/voorpagina/rss.xml', 'https://www.volkskrant.nl/nieuws-achtergrond/rss.xml'] },
  { id: 'nyt', name: 'NYT', bsky: 'nytimes.com', x: 'nytimes', urls: ['https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml'] },
  { id: 'theverge', name: 'The Verge', bsky: 'theverge.com', x: 'verge', urls: ['https://www.theverge.com/rss/index.xml'] },
  { id: 'wired', name: 'Wired', bsky: 'wired.com', x: 'wired', urls: ['https://www.wired.com/feed/rss'] },
  { id: 'nos', name: 'NOS', bsky: 'nos.nl', x: 'nos', urls: ['https://feeds.nos.nl/nosnieuwsalgemeen', 'http://feeds.nos.nl/nosnieuwsalgemeen'] },
  // Left Laser via YouTube-RSS (native, gratis, betrouwbaar). Avatar via hun Bluesky-profiel.
  { id: 'leftlaser', name: 'Left Laser', bsky: 'leftlaser.bsky.social', urls: ['https://www.youtube.com/feeds/videos.xml?channel_id=UCZU-vIoeB1e3by8mVaVLwIg'] },
]

// Merk-kleuren per bron (voor de avatar-cirkel)
const BRAND = {
  nrc: '#C20E1A',
  volkskrant: '#1481C4',
  nyt: '#1A1A1A',
  theverge: '#5200FF',
  wired: '#222222',
  nos: '#B5121B',
  leftlaser: '#E40421',
  guardian: '#052962',
  bbc: '#BB1919',
  aljazeera: '#FA9000',
  npr: '#1a1a1a',
  politico: '#E5202E',
  atlantic: '#1a1a1a',
  economist: '#E3120B',
  ft: '#990F3D',
  tweakers: '#E5202C',
}
const BSKY_BRAND = '#0085FF'

// Bluesky-accounts (openbare API). Alleen eigen posts van deze auteurs.
const BLUESKY_AUTHORS = [{ handle: 'atrupar.com', name: 'Aaron Rupar' }]

// Extra gerenommeerde bronnen — alleen voor de Trending-tab, niet in je hoofd-feed.
const EXTRA_SOURCES = [
  { id: 'guardian', name: 'The Guardian', x: 'guardian', urls: ['https://www.theguardian.com/world/rss'] },
  { id: 'bbc', name: 'BBC', x: 'bbcworld', urls: ['https://feeds.bbci.co.uk/news/world/rss.xml'] },
  { id: 'aljazeera', name: 'Al Jazeera', x: 'AJEnglish', urls: ['https://www.aljazeera.com/xml/rss/all.xml'] },
  { id: 'npr', name: 'NPR', x: 'NPR', urls: ['https://feeds.npr.org/1001/rss.xml'] },
  { id: 'politico', name: 'Politico', x: 'politico', urls: ['https://rss.politico.com/politics-news.xml', 'https://www.politico.com/rss/politicopicks.xml'] },
  { id: 'atlantic', name: 'The Atlantic', x: 'TheAtlantic', urls: ['https://www.theatlantic.com/feed/all/'] },
  { id: 'economist', name: 'The Economist', x: 'TheEconomist', urls: ['https://www.economist.com/latest/rss.xml'] },
  { id: 'ft', name: 'Financial Times', x: 'FT', urls: ['https://www.ft.com/rss/home'] },
  { id: 'tweakers', name: 'Tweakers', x: 'tweakers', urls: ['https://feeds.feedburner.com/tweakers/mixed', 'https://tweakers.net/feeds/mixed.xml'] },
]
const MAIN_IDS = new Set(SOURCES.map((s) => s.id))

const TOPICS = ['vs-politiek', 'trump', 'nederland', 'oekraine', 'geopolitiek', 'tech', 'ai', 'wetenschap', 'economie']
const PER_SOURCE_LIMIT = 30
const TOTAL_LIMIT = 160
const ENRICH_PER_REQUEST = 24
const ENRICH_BATCH = 8
const CACHE_MAX = 700
const SUMMARY_LEN = 140
const UA = 'HootReader/0.4 (+https://hoot.app) news aggregator'

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

// ---------- Helpers ----------
function hostname(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}
function favicon(domain) {
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : null
}
function toText(html) {
  if (!html) return ''
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(parseInt(n, 10))
      } catch {
        return ''
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16))
      } catch {
        return ''
      }
    })
    .replace(/\s+/g, ' ')
    .trim()
}
function clip(s, n) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}
// Past tekst netjes binnen n tekens: afronden op zin- of woordgrens, geen "…".
function fit(s, n = 140) {
  if (!s) return ''
  s = s.replace(/\s+/g, ' ').trim()
  if (s.length <= n) return s
  const cut = s.slice(0, n)
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  if (sentence >= n * 0.55) return cut.slice(0, sentence + 1).trim()
  const space = cut.lastIndexOf(' ')
  return (space > 0 ? cut.slice(0, space) : cut).trim()
}
// Preview uit de RSS-teaser, altijd in hele zinnen: zoveel volledige zinnen als er
// binnen `soft` tekens passen; is de eerste zin langer, dan die ene zin (tot `hard`).
// Alleen als er geen zinseinde te vinden is kappen we af op een woordgrens, mét "…".
const SENTENCE_END = /(?<![A-Z])(?<!\b(?:Mr|Mrs|Ms|Dr|St|vs|dr|mr|drs|prof|bijv|ca|nr|o\.a|d\.w\.z))[.!?]["'’”)]?(?=\s|$)/g
function preview(s, soft = 170, hard = 260) {
  if (!s) return ''
  s = s.replace(/\s+/g, ' ').trim()
  if (s.length <= soft) return s
  const ends = []
  for (const m of s.matchAll(SENTENCE_END)) {
    const end = m.index + m[0].length
    if (end > hard) break
    ends.push(end)
  }
  const within = ends.filter((e) => e <= soft).pop()
  if (within >= 60) return s.slice(0, within)
  if (ends[0] >= 40) return s.slice(0, ends[0])
  const cut = s.slice(0, soft)
  const space = cut.lastIndexOf(' ')
  return (space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/, '') + '…'
}
function categoriesOf(it) {
  return (it.categories || []).map((c) => (typeof c === 'string' ? c : c?._ || c?.$?.term || '')).filter(Boolean)
}
// Geen nieuws: koopjesgidsen/affiliate-lijstjes en puzzels horen niet in een
// nieuws-tijdlijn (bij Wired is dat rond acties tot 70% van de feed).
const NOISE_TITLE = /\b(prime day|black friday|cyber monday|promo codes?|coupon codes?|gift guides?)\b|\bbest\b.*\bdeals\b|\bdeals\b.*(\bsave\b|\$\d|\bunder \$)|\d+ ?(%|percent) off\b/i
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
function cleanUrl(u) {
  try {
    const url = new URL(u)
    // Alleen http(s) toestaan — weert javascript:/data: links uit vijandige feeds.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    url.hash = ''
    for (const k of [...url.searchParams.keys()]) if (/^utm_|^cmp$|^ref$|^icid$|^cid$/i.test(k)) url.searchParams.delete(k)
    return url.toString()
  } catch {
    return ''
  }
}
function normTitle(t) {
  return (t || '').toLowerCase().replace(/[^a-z0-9à-ÿ]+/gi, ' ').trim()
}
function safeIso(d) {
  if (!d) return null
  const t = new Date(d).getTime()
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}
function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
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

// ---------- Mooie merk-avatars via Bluesky ----------
async function bskyAvatar(handle) {
  try {
    const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`, {
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
// Avatars veranderen zelden: per warme functie-instantie 6 uur onthouden.
let avatarCache = { at: 0, map: null }
async function resolveSourceAvatars() {
  if (avatarCache.map && Date.now() - avatarCache.at < 6 * 60 * 60 * 1000) return avatarCache.map
  const entries = await Promise.all(SOURCES.map(async (s) => [s.id, s.bsky ? await bskyAvatar(s.bsky) : null]))
  const map = Object.fromEntries(entries)
  if (Object.values(map).some(Boolean)) avatarCache = { at: Date.now(), map }
  return map
}

// ---------- Trefwoord-onderwerpen (terugval als AI uitstaat) ----------
const KW = [
  ['trump', /\btrump\b/i],
  ['vs-politiek', /\b(verkiezing|election|senate|senaat|congress|congres|white house|witte huis|republikein|republican|democraat|democrat|\bgop\b|biden|kamala|harris|supreme court|hooggerechtshof|pentagon|capitol|vance|united states politics|house of representatives|justice department)\b/i],
  ['oekraine', /\b(oekra|ukrain|zelensk|poetin|putin|kyiv|kiev|kremlin|donetsk|donbas|moskou|moscow)\b/i],
  ['geopolitiek', /\b(geopolit|china|taiwan|\beu\b|navo|nato|midden-oosten|israel|israël|gaza|iran|noord-korea|north korea|xi jinping|sancties|sanctions|handelsoorlog|tariff|tarieven|brussel|brussels|zuid-china)\b/i],
  ['ai', /\b(kunstmatige intelligentie|artificial intelligence|\ba\.?i\.?\b|openai|chatgpt|anthropic|\bclaude\b|gemini|\bllm\b|machine learning|deepmind|nvidia|copilot)\b/i],
  ['tech', /\b(apple|iphone|ipad|macbook|google|alphabet|android|chrome|\bmeta\b|facebook|instagram|whatsapp|microsoft|windows|\bamazon\b|tesla|spacex|twitter|tiktok|bytedance|intel|\bamd\b|tsmc|samsung|huawei|chips?|halfgeleider|semiconductor|big tech|techbedrijf|techgigant|technolog|smartphone|gadget|app store|netflix|spotify)\b/i],
  ['wetenschap', /\b(wetenschap|wetenschapp|onderzoekers|scientist|researchers|science|nobelprijs|nobel prize|klimaatverandering|climate change|\bnasa\b|\besa\b|astronom|ruimtevaart|natuurkunde|fysica|biolog|geneeskund|gezondheid|vaccin|\bdna\b|genetica|kanker|quantum|kwantum|telescoop|deeltjes|archeolog|evolutie|neurolog)\b/i],
  ['economie', /\b(econom|beurs|aandel|inflatie|\brente\b|\becb\b|\bfed\b|federal reserve|recessie|begroting|\bbbp\b|werkloosheid|dow jones|nasdaq|wall street|kwartaalcijfers|bedrijfswinst|fusie|overname|faillis|olieprijs|gasprijs|energieprijs|valuta|wisselkoers|belasting|subsidie|koopkracht|\bbtw\b|lonen|omzet|woningmarkt|hypotheek|handelsverdrag|handelsregels|megafusie|werkgevers|vakbond|inflation|interest rates|stock market|stocks and bonds|unemployment|layoffs|merger|acquisition|bankrupt)\b/i],
  ['nederland', /\b(kabinet|tweede kamer|eerste kamer|den haag|binnenhof|catshuis|prinsjesdag|miljoenennota|rijksoverheid|gemeenteraad|provinciale staten|waterschap|coalitie|formatie|stikstof|toeslag|asielzoeker|asielbeleid|minister van|staatssecretaris|\bpvv\b|\bvvd\b|\bd66\b|groenlinks|\bpvda\b|\bcda\b|\bsgp\b|\bbbb\b|wilders|schoof|timmermans|yesilgoz|omtzigt)\b/i],
]
function keywordTopics(text) {
  const out = []
  for (const [id, re] of KW) if (re.test(text)) out.push(id)
  if (out.includes('trump') && !out.includes('vs-politiek')) out.push('vs-politiek')
  return out
}
const isTopic = (t) => TOPICS.includes(t)

// ---------- Opslag: Netlify Blobs, met geheugen-terugval (lokaal / als Blobs ontbreekt) ----------
const memStore = {}
let storageMode = 'memory'
async function kvGet(key) {
  try {
    const v = await getStore('hoot').get(key, { type: 'json' })
    storageMode = 'blobs'
    return v
  } catch {
    return memStore[key] ?? null
  }
}
async function kvSet(key, value) {
  try {
    await getStore('hoot').setJSON(key, value)
    storageMode = 'blobs'
  } catch {
    memStore[key] = value
  }
}

// ---------- RSS ----------
async function loadSource(src, avatarsP) {
  let lastErr
  for (const url of src.urls) {
    try {
      // Feed en avatars tegelijk ophalen (avatars houden de feed niet meer op).
      const [feed, avatars] = await Promise.all([parser.parseURL(url), avatarsP])
      // Mooie merk-avatar: 1) Bluesky-profiel, 2) X-profiel via unavatar.io, 3) favicon.
      const brandAvatar = avatars[src.id] || (src.x ? `https://unavatar.io/x/${src.x}` : null)
      const fresh = (feed.items || []).map((it) => [it, categoriesOf(it)]).filter(([it, cats]) => !isNoise(it, cats))
      const items = fresh.slice(0, PER_SOURCE_LIMIT).map(([it, cats]) => {
        const link = cleanUrl(it.link || it.guid || '')
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
        const image = pickImage(it) || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null)
        return {
          id: hash(src.id + '|' + link),
          kind: 'article',
          source: src.id,
          sourceName: src.name,
          handle: domain,
          domain,
          avatar: brandAvatar || favicon(domain),
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
      })
      return { id: src.id, name: src.name, ok: true, used: url, count: items.length, items }
    } catch (e) {
      lastErr = e
    }
  }
  return { id: src.id, name: src.name, ok: false, used: null, count: 0, items: [], error: String((lastErr && lastErr.message) || lastErr) }
}
// Eén herhaalpoging bij een mislukte bron (korte hapering), daarna opgeven zonder de rest te blokkeren.
async function loadSourceWithRetry(src, avatarsP) {
  const first = await loadSource(src, avatarsP)
  if (first.ok) return first
  await new Promise((r) => setTimeout(r, 350))
  const second = await loadSource(src, avatarsP)
  return second.ok ? second : first
}

// ---------- Bluesky ----------
function mapPost(post, author) {
  if (!post?.record) return null
  const text = post.record.text || ''
  const handle = post.author?.handle || author.handle
  const rkey = (post.uri || '').split('/').pop()
  const permalink = `https://bsky.app/profile/${handle}/post/${rkey}`
  let image = null
  let imageRatio = null // breedte/hoogte van een geplaatste foto (screenshots niet bijsnijden)
  let video = null
  let videoPoster = null
  let linkUrl = permalink
  let domain = 'bsky.app'
  const photo = (im) => {
    image = im.thumb || im.fullsize || image
    const r = im.aspectRatio
    imageRatio = r?.width && r?.height ? Math.round((r.width / r.height) * 1000) / 1000 : 4 / 3
  }
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
    else if (t.includes('embed.images') && embed.images?.length) photo(embed.images[0])
    else if (t.includes('recordWithMedia') && embed.media) {
      const m = embed.media
      if ((m.$type || '').includes('embed.video')) vid(m)
      else if ((m.$type || '').includes('embed.images') && m.images?.length) photo(m.images[0])
      else if ((m.$type || '').includes('embed.external')) ext(m)
    }
  }
  return {
    id: hash('bsky|' + post.uri),
    kind: 'post',
    source: 'bsky:' + handle,
    sourceName: post.author?.displayName || author.name,
    handle: '@' + handle,
    domain,
    avatar: post.author?.avatar || null,
    avatarContain: false,
    brandColor: BSKY_BRAND,
    author: null,
    type: 'sociaal',
    section: null,
    title: '',
    summary: text.replace(/\s+/g, ' ').trim(),
    text,
    url: linkUrl,
    image,
    imageRatio,
    video,
    videoPoster,
    readMin: null,
    publishedAt: safeIso(post.record.createdAt || post.indexedAt),
  }
}
async function loadBluesky(author) {
  try {
    const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(author.handle)}&limit=40&filter=posts_no_replies`
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error('bsky ' + res.status)
    const data = await res.json()
    // Alleen eigen, originele posts: geen reposts (reason), geen quotes/anderen
    const own = (data.feed || []).filter((fi) => !fi.reason && fi.post?.author?.handle === author.handle)
    const items = own.map((fi) => mapPost(fi.post, author)).filter(Boolean)
    return { id: 'bsky:' + author.handle, name: author.name, ok: true, used: author.handle, count: items.length, items }
  } catch (e) {
    return { id: 'bsky:' + author.handle, name: author.name, ok: false, used: null, count: 0, items: [], error: String((e && e.message) || e) }
  }
}

// ---------- Verrijking-cache (Netlify Blobs, met geheugen-terugval) ----------
let memCache = {}
async function loadCache() {
  try {
    const store = getStore('hoot')
    const data = await store.get('enrichments-v7', { type: 'json' })
    return data || {}
  } catch {
    return memCache
  }
}
async function saveCache(map) {
  let trimmed = map
  const keys = Object.keys(map)
  if (keys.length > CACHE_MAX) {
    trimmed = {}
    for (const k of keys.slice(-CACHE_MAX)) trimmed[k] = map[k]
  }
  try {
    const store = getStore('hoot')
    await store.setJSON('enrichments-v7', trimmed)
  } catch {
    memCache = trimmed
  }
}

// ---------- AI-verrijking (Claude Sonnet) ----------
const SYSTEM = `Je bent een Nederlandse nieuwsredacteur voor de app Hoot. Je krijgt een JSON-array met nieuwsitems (artikelen of social posts). Voor ELK item lever je een object met:
- "id": exact overgenomen uit de invoer
- "nl_summary": ALLEEN voor type "article": een korte Nederlandse samenvatting van STRIKT MAXIMAAL 140 tekens — één complete, afgeronde zin die NIET wordt afgekapt (liever korter dan over de 140). Vertaal Engelstalige bronnen naar vlot Nederlands. LET OP: sommige bronnen (zoals de Volkskrant en NRC) leveren GEEN "tekst" mee — alleen een titel. Als "tekst" leeg of vrijwel leeg is, baseer je de zin UITSLUITEND op de titel: herformuleer of kader de kop tot één neutrale, vloeiende Nederlandse zin. Verzin dan ABSOLUUT GEEN feiten, cijfers, namen, citaten of uitkomsten die niet in de titel staan — beweer niets dat je niet uit de kop weet. Voor type "post": geef een lege string "".
- "kop_kort": ALLEEN voor type "article" én ALLEEN als de originele kop langer is dan ~65 tekens: een licht ingekorte versie van de kop in DEZELFDE taal als het origineel (maximaal ~65 tekens, behoud de kern, geen punt aan het eind). Anders een lege string "".
- "leesminuten": alleen voor type "article": geschatte leestijd in hele minuten (geheel getal, meestal 2–8). Voor type "post": 0.
- "topics": array met 0 of meer van precies deze waarden, op basis van waar het item echt over gaat:
  • "trump" — Donald Trump is de hoofdpersoon
  • "vs-politiek" — Amerikaanse binnenlandse politiek, verkiezingen, Congres, regering (niet specifiek Trump)
  • "oekraine" — de oorlog in Oekraïne en de directe gevolgen
  • "geopolitiek" — internationale spanningen en machtsverhoudingen: EU, VS, China, Taiwan, Midden-Oosten, NAVO, sancties, handelsconflicten
  • "ai" — kunstmatige intelligentie: ontwikkeling, bedrijven én maatschappelijke/politieke impact
  • "tech" — technologie en techbedrijven (niet specifiek AI): Apple, Google, Meta, Microsoft, Amazon, Musk/X, Tesla, chips/halfgeleiders, platforms, gadgets, techregulering
  • "wetenschap" — wetenschappelijk onderzoek en ontdekkingen: ruimtevaart, natuurkunde, biologie, geneeskunde en gezondheid, klimaatwetenschap
  • "economie" — economie en financiële markten: beurs, inflatie, rente, centrale banken (ECB/Fed), bedrijfscijfers, fusies en overnames, werkgelegenheid
  • "nederland" — Nederlands binnenlands nieuws: landelijke politiek (kabinet, Tweede Kamer, partijen), beleid en samenleving in Nederland (niet sport)
  Kies alleen wat echt centraal staat; laat de array leeg als niets past. Eén item mag meerdere onderwerpen hebben (bijv. een Nederlands AI-bedrijf: "nederland", "tech" én "ai").
Antwoord UITSLUITEND met een geldige JSON-array van die objecten. Geen uitleg, geen markdown, geen codeblok.`

function parseJsonArray(s) {
  if (!s) return null
  const a = s.indexOf('[')
  const b = s.lastIndexOf(']')
  if (a === -1 || b === -1 || b < a) return null
  try {
    const arr = JSON.parse(s.slice(a, b + 1))
    return Array.isArray(arr) ? arr : null
  } catch {
    return null
  }
}
async function enrichBatch(anthropic, items) {
  const payload = items.map((it) => ({ id: it.id, bron: it.sourceName, type: it.kind, titel: it.kind === 'post' ? '' : it.title, tekst: it.text }))
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    thinking: { type: 'disabled' },
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(payload) }],
  })
  const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
  const arr = parseJsonArray(text)
  if (!arr) return []
  return arr
    .filter((r) => r && r.id)
    .map((r) => ({
      id: r.id,
      nl_summary: r.nl_summary ? fit(String(r.nl_summary), SUMMARY_LEN) : null,
      short_title: r.kop_kort ? fit(String(r.kop_kort), 72) : null,
      readMin: Number.isFinite(r.leesminuten) ? Math.max(1, Math.min(60, Math.round(r.leesminuten))) : null,
      topics: Array.isArray(r.topics) ? r.topics.filter(isTopic) : [],
    }))
}

// ---------- Output-mapping (verrijking op een item leggen) ----------
function toClient(it, cache) {
  const e = cache[it.id]
  const topics = e && Array.isArray(e.topics) && e.topics.length ? e.topics : keywordTopics(`${it.title} ${it.text || it.summary || ''} ${it.cats || ''}`)
  return {
    id: it.id,
    kind: it.kind,
    source: it.source,
    sourceName: it.sourceName,
    handle: it.handle,
    domain: it.domain,
    avatar: it.avatar,
    avatarContain: it.avatarContain,
    brandColor: it.brandColor,
    author: it.author || null,
    type: it.type || null,
    section: it.section || null,
    storyId: it.storyId || null,
    firstSeenAt: it.firstSeenAt || null,
    title: it.title,
    short_title: it.kind === 'article' ? e?.short_title || null : null,
    summary: it.summary,
    borrowedFrom: it.borrowedFrom || null,
    nl_summary: it.kind === 'article' ? e?.nl_summary || null : null,
    readMin: it.kind === 'article' ? e?.readMin || it.readMin || null : null,
    topics,
    url: it.url,
    image: it.image,
    imageRatio: it.imageRatio || null,
    video: it.video,
    videoPoster: it.videoPoster,
    publishedAt: it.publishedAt,
  }
}

// ---------- Handler ----------
export const handler = async (event) => {
  try {
    connectLambda(event) // geeft de functie toegang tot Netlify Blobs (ontbreekt lokaal — dan geheugen)
  } catch {
    /* geen Blobs-context */
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  const anthropic = apiKey ? new Anthropic({ apiKey }) : null
  const now = Date.now()

  const avatarsP = resolveSourceAvatars()
  const noAvatars = Promise.resolve({})
  const [mainR, extraR, bskyR, registryRaw] = await Promise.all([
    Promise.allSettled(SOURCES.map((s) => loadSourceWithRetry(s, avatarsP))),
    Promise.allSettled(EXTRA_SOURCES.map((s) => loadSource(s, noAvatars))),
    Promise.allSettled(BLUESKY_AUTHORS.map(loadBluesky)),
    kvGet('registry-v1'),
  ])
  const val = (r) => (r.status === 'fulfilled' ? r.value : { id: '?', name: '?', ok: false, count: 0, items: [], error: String(r.reason) })
  const mainGroups = mainR.map(val)
  const extraGroups = extraR.map(val)
  const bskyGroups = bskyR.map(val)
  const registry = registryRaw && typeof registryRaw === 'object' ? registryRaw : {}

  // Stroom: alleen jouw bronnen + Bluesky. Sorteren (nieuwste eerst), dedupliceren.
  const merged = [...mainGroups, ...bskyGroups].flatMap((g) => g.items)
  merged.sort(byRecency)
  const seenUrl = new Set()
  const seenTitle = new Set()
  const deduped = []
  for (const it of merged) {
    if (!it.url) continue
    if (seenUrl.has(it.url)) continue
    const nt = normTitle(it.title)
    if (nt && seenTitle.has(nt)) continue
    seenUrl.add(it.url)
    if (nt) seenTitle.add(nt)
    deduped.push(it)
  }
  // Basis = de nieuwste TOTAL_LIMIT. Daarna garanderen we per bron z'n recentste
  // items, zodat laag-frequente kanalen niet volledig uit de Stroom vallen.
  const items = deduped.slice(0, TOTAL_LIMIT)
  const GUARANTEE_PER_SOURCE = 6
  const have = new Set(items.map((i) => i.id))
  const perSource = {}
  for (const it of items) perSource[it.source] = (perSource[it.source] || 0) + 1
  for (const it of deduped) {
    if (have.has(it.id) || (perSource[it.source] || 0) >= GUARANTEE_PER_SOURCE) continue
    items.push(it)
    have.add(it.id)
    perSource[it.source] = (perSource[it.source] || 0) + 1
  }
  items.sort(byRecency)

  // Preview lenen: artikelen zonder eigen samenvatting (bv. de Volkskrant) krijgen
  // de teaser van een NL-bron die hetzelfde verhaal dekt. Streng: alleen bij sterke
  // titel-overlap, alleen NL→NL (taal klopt), en met bron-vermelding ("via NOS").
  const donors = [...mainGroups]
    .flatMap((g) => g.items)
    .filter((it) => it.kind === 'article' && it.summary && NL_SOURCES.has(it.source))
    .map((d) => ({ d, w: sigWords(d.title) }))
  for (const it of items) {
    if (it.kind !== 'article' || it.summary || !NL_SOURCES.has(it.source)) continue
    const w = sigWords(it.title)
    if (w.size < 3) continue
    let best = null
    let bestN = 0
    let bestSize = 0
    for (const { d, w: dw } of donors) {
      if (d.source === it.source) continue
      const n = sharedCount(w, dw)
      if (n > bestN) {
        bestN = n
        best = d
        bestSize = dw.size
      }
    }
    const ratio = bestN / Math.max(1, Math.min(w.size, bestSize))
    if (best && (bestN >= 4 || (bestN >= 3 && ratio >= 0.6))) {
      it.summary = best.summary
      it.text = best.summary
      it.borrowedFrom = best.sourceName
    }
  }

  // Verhalen: bundelen over jouw bronnen + de extra bronnen (die alleen als "ook bij" meedoen).
  const streamIds = new Set(items.map((i) => i.id))
  const extraItems = extraGroups.flatMap((g) => g.items).filter((it) => it.url)
  const articlePool = [...items.filter((i) => i.kind === 'article'), ...extraItems]
  const stories = buildStories(articlePool, registry, { mainIds: MAIN_IDS })
  const poolById = new Map(articlePool.map((i) => [i.id, i]))
  for (const st of stories) for (const id of st.itemIds) poolById.get(id).storyId = st.id
  // Extra-bron-artikelen sturen we alleen mee als ze bij een verhaal horen.
  const related = extraItems.filter((it) => it.storyId)

  // Register bijwerken: eerst-gezien-tijd per bericht + bij welk verhaal het hoort.
  let registryChanged = false
  for (const it of [...items, ...related]) {
    const r = registry[it.id]
    if (!r) {
      registry[it.id] = { f: now, ...(it.storyId ? { s: it.storyId } : {}) }
      registryChanged = true
    } else if ((r.s || null) !== (it.storyId || null)) {
      if (it.storyId) r.s = it.storyId
      else delete r.s
      registryChanged = true
    }
    it.firstSeenAt = new Date(registry[it.id].f).toISOString()
  }
  const current = new Set([...items, ...related].map((i) => i.id))
  for (const id of Object.keys(registry)) {
    if (!current.has(id) && now - registry[id].f > 8 * 24 * 60 * 60 * 1000) {
      delete registry[id]
      registryChanged = true
    }
  }
  if (registryChanged) await kvSet('registry-v1', registry)

  // Verrijking (AI) — staat uit zonder sleutel.
  const cache = await loadCache()
  let enrichedNew = 0
  if (anthropic) {
    const missing = [...items, ...related].filter((it) => !cache[it.id]).slice(0, ENRICH_PER_REQUEST)
    if (missing.length) {
      const settled = await Promise.allSettled(chunk(missing, ENRICH_BATCH).map((b) => enrichBatch(anthropic, b)))
      for (const s of settled) {
        if (s.status === 'fulfilled') {
          for (const r of s.value) {
            cache[r.id] = { nl_summary: r.nl_summary, short_title: r.short_title, readMin: r.readMin, topics: r.topics }
            enrichedNew++
          }
        }
      }
      if (enrichedNew) await saveCache(cache)
    }
  }

  const out = items.map((it) => toClient(it, cache))
  let relatedOut = related.map((it) => toClient(it, cache))
  let storiesOut = stories

  // Editie: per dagdeel één keer samengesteld en daarna vast. De selectie en volgorde
  // veranderen niet meer; een verhaal dat nog loopt toont wel zijn nieuwe publicaties.
  const slot = editionSlot(new Date(now))
  // 'edition2-': sleutel verhoogd bij de nieuwe bundeling, zodat een eerder samengestelde
  // editie met dubbele gebeurtenissen niet blijft staan.
  let stored = await kvGet('edition2-' + slot.id)
  if (!stored || !Array.isArray(stored.entries) || !stored.entries.length) {
    const entries = selectEdition(stories, articlePool, { mainIds: MAIN_IDS, now })
    const outById = new Map([...out, ...relatedOut].map((i) => [i.id, i]))
    const snapStories = entries.filter((e) => e.kind === 'story').map((e) => stories.find((st) => st.id === e.id))
    const snapIds = new Set([...snapStories.flatMap((st) => st.itemIds), ...entries.filter((e) => e.kind === 'item').map((e) => e.id)])
    stored = { id: slot.id, builtAt: new Date(now).toISOString(), entries, stories: snapStories, items: [...snapIds].map((id) => outById.get(id)).filter(Boolean) }
    if (entries.length) await kvSet('edition2-' + slot.id, stored)
  }
  // Wat intussen uit de feeds is verdwenen halen we uit de momentopname van de editie.
  const liveStoryIds = new Set(stories.map((st) => st.id))
  const haveOut = new Set([...out, ...relatedOut].map((i) => i.id))
  storiesOut = [...stories, ...stored.stories.filter((st) => !liveStoryIds.has(st.id))]
  relatedOut = [...relatedOut, ...stored.items.filter((i) => !haveOut.has(i.id))]
  const edition = { id: slot.id, slot: slot.slot, date: slot.date, next: slot.next, builtAt: stored.builtAt, entries: stored.entries }

  // Bronnenlijst (los van de berichten).
  const avatars = await avatarsP
  const firstOf = (g) => g.items[0]
  const sources = [
    ...mainGroups.map((g, i) => ({ id: g.id, name: g.name, kind: 'nieuws', followed: true, ok: g.ok, count: g.count, error: g.error || null, brandColor: BRAND[g.id] || '#21468b', avatar: firstOf(g)?.avatar || avatars[g.id] || (SOURCES[i]?.x ? `https://unavatar.io/x/${SOURCES[i].x}` : null), avatarContain: firstOf(g)?.avatarContain || false, handle: firstOf(g)?.domain || null })),
    ...bskyGroups.map((g) => ({ id: g.id, name: firstOf(g)?.sourceName || g.name, kind: 'sociaal', followed: true, ok: g.ok, count: g.count, error: g.error || null, brandColor: BSKY_BRAND, avatar: firstOf(g)?.avatar || null, avatarContain: false, handle: firstOf(g)?.handle || null })),
    ...extraGroups.map((g) => ({ id: g.id, name: g.name, kind: 'extra', followed: false, ok: g.ok, count: g.count, error: g.error || null, brandColor: BRAND[g.id] || '#21468b', avatar: firstOf(g)?.avatar || null, avatarContain: firstOf(g)?.avatarContain || false, handle: firstOf(g)?.domain || null })),
  ]

  const meta = {
    updatedAt: new Date(now).toISOString(),
    storage: storageMode, // 'blobs' = edities en verhaal-id's blijven vast; 'memory' = alleen binnen één functie-instantie
    aiEnabled: !!anthropic,
    instapaper: !!(process.env.INSTAPAPER_USERNAME && process.env.INSTAPAPER_PASSWORD),
    enrichedNew,
    // (oude vorm, voor een nog niet bijgewerkte app)
    sources: sources.map(({ id, name, ok, count, error, followed }) => ({ id, name, ok, count, error, main: followed })),
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
    body: JSON.stringify({ sources, items: out, related: relatedOut, stories: storiesOut, edition, trending: [], meta }),
  }
}
