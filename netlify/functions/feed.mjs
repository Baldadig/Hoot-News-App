import Parser from 'rss-parser'
import Anthropic from '@anthropic-ai/sdk'
import { getStore } from '@netlify/blobs'

// ---------- Bronnen ----------
// bsky = Bluesky-handle van het officiële account, voor een mooie merk-avatar.
const SOURCES = [
  { id: 'nrc', name: 'NRC', bsky: 'nrc.nl', urls: ['https://www.nrc.nl/rss/', 'https://www.nrc.nl/index.rss', 'https://www.nrc.nl/rss.php'] },
  { id: 'volkskrant', name: 'de Volkskrant', bsky: 'volkskrant.nl', urls: ['https://www.volkskrant.nl/voorpagina/rss.xml', 'https://www.volkskrant.nl/nieuws-achtergrond/rss.xml'] },
  { id: 'nyt', name: 'NYT', bsky: 'nytimes.com', urls: ['https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml'] },
  { id: 'theverge', name: 'The Verge', bsky: 'theverge.com', urls: ['https://www.theverge.com/rss/index.xml'] },
  { id: 'wired', name: 'Wired', bsky: 'wired.com', urls: ['https://www.wired.com/feed/rss'] },
  { id: 'nos', name: 'NOS', bsky: 'nos.nl', urls: ['https://feeds.nos.nl/nosnieuwsalgemeen', 'http://feeds.nos.nl/nosnieuwsalgemeen'] },
]

// Merk-kleuren per bron (voor de avatar-cirkel)
const BRAND = {
  nrc: '#C20E1A',
  volkskrant: '#1481C4',
  nyt: '#1A1A1A',
  theverge: '#5200FF',
  wired: '#222222',
  nos: '#B5121B',
}
const BSKY_BRAND = '#0085FF'

// Bluesky-accounts (openbare API). Alleen eigen posts van deze auteurs.
const BLUESKY_AUTHORS = [{ handle: 'atrupar.com', name: 'Aaron Rupar' }]

const TOPICS = ['vs-politiek', 'oekraine', 'geopolitiek', 'ai', 'trump']
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
function cleanUrl(u) {
  try {
    const url = new URL(u)
    url.hash = ''
    for (const k of [...url.searchParams.keys()]) if (/^utm_|^cmp$|^ref$|^icid$|^cid$/i.test(k)) url.searchParams.delete(k)
    return url.toString()
  } catch {
    return u
  }
}
function hash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0
  return h.toString(36)
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
async function resolveSourceAvatars() {
  const entries = await Promise.all(SOURCES.map(async (s) => [s.id, s.bsky ? await bskyAvatar(s.bsky) : null]))
  return Object.fromEntries(entries)
}

// ---------- Trefwoord-onderwerpen (terugval als AI uitstaat) ----------
const KW = [
  ['trump', /\btrump\b/i],
  ['vs-politiek', /\b(verkiezing|election|senate|senaat|congress|congres|white house|witte huis|republikein|republican|democraat|democrat|\bgop\b|biden|kamala|harris|supreme court|hooggerechtshof|pentagon|capitol|vance)\b/i],
  ['oekraine', /\b(oekra|ukrain|zelensk|poetin|putin|kyiv|kiev|kremlin|donetsk|donbas|moskou|moscow)\b/i],
  ['geopolitiek', /\b(geopolit|china|taiwan|\beu\b|navo|nato|midden-oosten|israel|israël|gaza|iran|noord-korea|north korea|xi jinping|sancties|sanctions|handelsoorlog|tariff|tarieven|brussel|brussels|zuid-china)\b/i],
  ['ai', /\b(kunstmatige intelligentie|artificial intelligence|\ba\.?i\.?\b|openai|chatgpt|anthropic|\bclaude\b|gemini|\bllm\b|machine learning|deepmind|nvidia|copilot)\b/i],
]
function keywordTopics(text) {
  const out = []
  for (const [id, re] of KW) if (re.test(text)) out.push(id)
  if (out.includes('trump') && !out.includes('vs-politiek')) out.push('vs-politiek')
  return out
}
const isTopic = (t) => TOPICS.includes(t)

// ---------- RSS ----------
async function loadSource(src, avatars) {
  let lastErr
  const brandAvatar = avatars[src.id] || null
  for (const url of src.urls) {
    try {
      const feed = await parser.parseURL(url)
      const items = (feed.items || []).slice(0, PER_SOURCE_LIMIT).map((it) => {
        const link = cleanUrl(it.link || it.guid || '')
        const domain = hostname(link)
        const title = toText(it.title || '').trim()
        const teaser = clip(toText(it.contentSnippet || it.summary || it.description || ''), 280)
        const summary = clip(teaser, SUMMARY_LEN)
        const bodyWords = toText(it.contentEncoded || it.content || it.description || '').split(/\s+/).filter(Boolean).length
        const readMin = Math.max(2, Math.round(bodyWords / 220))
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
          verified: true,
          title,
          summary,
          text: teaser,
          url: link,
          image: pickImage(it),
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

// ---------- Bluesky ----------
function mapPost(post, author) {
  if (!post?.record) return null
  const text = post.record.text || ''
  const handle = post.author?.handle || author.handle
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
    sourceName: post.author?.displayName || author.name,
    handle: '@' + handle,
    domain,
    avatar: post.author?.avatar || null,
    avatarContain: false,
    brandColor: BSKY_BRAND,
    verified: true,
    title: '',
    summary: clip(text, SUMMARY_LEN),
    text,
    url: linkUrl,
    image,
    video,
    videoPoster,
    readMin: null,
    publishedAt: safeIso(post.record.createdAt || post.indexedAt),
  }
}
async function loadBluesky(author) {
  try {
    const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(author.handle)}&limit=40&filter=posts_no_replies`
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
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
    const data = await store.get('enrichments-v3', { type: 'json' })
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
    await store.setJSON('enrichments-v3', trimmed)
  } catch {
    memCache = trimmed
  }
}

// ---------- AI-verrijking (Claude Sonnet) ----------
const SYSTEM = `Je bent een Nederlandse nieuwsredacteur voor de app Hoot. Je krijgt een JSON-array met nieuwsitems (artikelen of social posts). Voor ELK item lever je een object met:
- "id": exact overgenomen uit de invoer
- "nl_summary": ALTIJD één heldere Nederlandse samenvatting van rond de 140 tekens (streef naar 130–140), één of twee complete zinnen, vlot en neutraal. Maak er ook één als de brontekst kort of leeg is — vat dan samen op basis van de titel en het onderwerp. Nooit afkappen met "…".
- "nl_title": een korte, pakkende Nederlandse kop (maximaal ~70 tekens), zonder punt aan het eind
- "leesminuten": geschatte leestijd van het artikel in hele minuten (geheel getal, meestal 2–8; voor een korte social post 1)
- "topics": array met 0 of meer van precies deze waarden, op basis van waar het item echt over gaat:
  • "trump" — Donald Trump is de hoofdpersoon
  • "vs-politiek" — Amerikaanse binnenlandse politiek, verkiezingen, Congres, regering (niet specifiek Trump)
  • "oekraine" — de oorlog in Oekraïne en de directe gevolgen
  • "geopolitiek" — internationale spanningen en machtsverhoudingen: EU, VS, China, Taiwan, Midden-Oosten, NAVO, sancties, handelsconflicten
  • "ai" — kunstmatige intelligentie: ontwikkeling, bedrijven én maatschappelijke/politieke impact
  Kies alleen wat echt centraal staat; laat de array leeg als niets past.
Alles in vlot Nederlands. Antwoord UITSLUITEND met een geldige JSON-array van die objecten. Geen uitleg, geen markdown, geen codeblok.`

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
      nl_title: r.nl_title ? clip(String(r.nl_title), 90) : null,
      nl_summary: r.nl_summary ? clip(String(r.nl_summary), SUMMARY_LEN) : null,
      readMin: Number.isFinite(r.leesminuten) ? Math.max(1, Math.min(60, Math.round(r.leesminuten))) : null,
      topics: Array.isArray(r.topics) ? r.topics.filter(isTopic) : [],
    }))
}

// ---------- Handler ----------
export const handler = async () => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const anthropic = apiKey ? new Anthropic({ apiKey }) : null

  const avatars = await resolveSourceAvatars()
  const tasks = [...SOURCES.map((s) => loadSource(s, avatars)), ...BLUESKY_AUTHORS.map(loadBluesky)]
  const results = await Promise.allSettled(tasks)
  const groups = results.map((r) => (r.status === 'fulfilled' ? r.value : { ok: false, count: 0, items: [], error: String(r.reason) }))

  // Samenvoegen, sorteren (nieuwste eerst), dedupliceren
  const merged = groups.flatMap((g) => g.items)
  merged.sort((a, b) => (b.publishedAt ? Date.parse(b.publishedAt) : 0) - (a.publishedAt ? Date.parse(a.publishedAt) : 0))
  const seenUrl = new Set()
  const seenTitle = new Set()
  const items = []
  for (const it of merged) {
    if (!it.url) continue
    if (seenUrl.has(it.url)) continue
    const nt = normTitle(it.title)
    if (nt && seenTitle.has(nt)) continue
    seenUrl.add(it.url)
    if (nt) seenTitle.add(nt)
    items.push(it)
    if (items.length >= TOTAL_LIMIT) break
  }

  // Verrijking ophalen / aanvullen
  const cache = await loadCache()
  let enrichedNew = 0
  if (anthropic) {
    const missing = items.filter((it) => !cache[it.id]).slice(0, ENRICH_PER_REQUEST)
    if (missing.length) {
      const settled = await Promise.allSettled(chunk(missing, ENRICH_BATCH).map((b) => enrichBatch(anthropic, b)))
      for (const s of settled) {
        if (s.status === 'fulfilled') {
          for (const r of s.value) {
            cache[r.id] = { nl_title: r.nl_title, nl_summary: r.nl_summary, readMin: r.readMin, topics: r.topics }
            enrichedNew++
          }
        }
      }
      if (enrichedNew) await saveCache(cache)
    }
  }

  // Verrijking op items leggen (+ terugval)
  const out = items.map((it) => {
    const e = cache[it.id]
    const topics = e && Array.isArray(e.topics) && e.topics.length ? e.topics : keywordTopics(`${it.title} ${it.text || it.summary || ''}`)
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
      verified: it.verified,
      title: it.title,
      summary: it.summary,
      nl_title: e?.nl_title || null,
      nl_summary: e?.nl_summary || null,
      readMin: it.kind === 'article' ? (e?.readMin || it.readMin || null) : null,
      topics,
      url: it.url,
      image: it.image,
      video: it.video,
      videoPoster: it.videoPoster,
      publishedAt: it.publishedAt,
    }
  })

  const meta = {
    updatedAt: new Date().toISOString(),
    aiEnabled: !!anthropic,
    enrichedNew,
    sources: groups.map(({ id, name, ok, count, used, error }) => ({ id, name, ok, count, used, error })),
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
    body: JSON.stringify({ items: out, meta }),
  }
}
