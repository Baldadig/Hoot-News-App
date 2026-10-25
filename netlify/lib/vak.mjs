// Vakweek: elke maandag om 07:00 per vakgebied de drie belangrijkste stukken van de week ervoor.
// Los van het nieuws (Editie, Stroom): eigen bronnen, eigen voorraad, eigen antwoord (/api/vak).
//
// "Belangrijk" meten we niet aan leescijfers (die hebben alleen de uitgevers), maar aan drie
// zichtbare gronden:
//   1. hoeveel vakbronnen over hetzelfde schrijven;
//   2. of mensen het zelf hebben uitgekozen (de redactie van Sidebar kiest elke werkdag vijf links);
//   3. wie het schreef: een vakexpert weegt zwaarder dan een vakblad, en dat zwaarder dan een
//      bedrijfsblog.
// Alleen mensenwerk: redactionele bronnen en vakmensen met naam; geen gesponsorde stukken,
// webinars, podcasts, vacatures of "10 tools"-lijstjes. Geen AI-tekst: bij elk stuk staat de
// eigen intro van de schrijver.
import { loadSourceWithRetry } from './rss.mjs'
import { tzOffsetMs, hostname } from './text.mjs'
import { loadOgImage } from './og.mjs'
export { ogImageFrom, loadOgImage } from './og.mjs'
import { VAK_FIELDS, VAK_FIELD_IDS } from '../../shared/vak.mjs'

const V = (id, name, kind, fields, url, more = {}) => ({ id: 'vak:' + id, name, kind, fields, urls: [url], cat: 'vak', ...more })

// kind: expert (vakmens met naam) · vakblad · curator (mensen kiezen links) · community · officieel
// `filter`: de bron schrijft ook over andere dingen; alleen wat bij het vakgebied past telt mee.
export const VAK_SOURCES = [
  // Paid social
  V('jonloomer', 'Jon Loomer', 'expert', ['paid-social'], 'https://www.jonloomer.com/feed/', { about: 'Specialist in Meta-advertenties' }),
  V('socialmediatoday', 'Social Media Today', 'vakblad', ['paid-social'], 'https://www.socialmediatoday.com/feeds/news/', { filter: true }),
  V('socialmediaexaminer', 'Social Media Examiner', 'vakblad', ['paid-social'], 'https://www.socialmediaexaminer.com/feed/', { filter: true }),
  V('digiday', 'Digiday', 'vakblad', ['paid-social'], 'https://digiday.com/feed/', { filter: true }),
  V('adexchanger', 'AdExchanger', 'vakblad', ['paid-social'], 'https://www.adexchanger.com/feed/', { filter: true }),
  V('adweek', 'Adweek', 'vakblad', ['paid-social'], 'https://www.adweek.com/feed/', { filter: true }),
  V('ppcland', 'PPC Land', 'vakblad', ['paid-social'], 'https://ppc.land/rss/', { filter: true }),
  V('sej-paid', 'Search Engine Journal', 'vakblad', ['paid-social'], 'https://www.searchenginejournal.com/category/paid-media/feed/', { filter: true }),
  V('marketingfacts', 'Marketingfacts', 'vakblad', ['paid-social'], 'https://www.marketingfacts.nl/rss', { filter: true }),
  V('emerce', 'Emerce', 'vakblad', ['paid-social', 'ai'], 'https://www.emerce.nl/rss', { filter: true }),
  V('meta', 'Meta Newsroom', 'officieel', ['paid-social'], 'https://about.fb.com/feed/', { filter: true }),
  // UI/UX
  V('nngroup', 'Nielsen Norman Group', 'expert', ['ux'], 'https://www.nngroup.com/feed/rss/', { about: 'Onderzoek naar gebruiksvriendelijkheid' }),
  V('lukew', 'Luke Wroblewski', 'expert', ['ux'], 'https://www.lukew.com/ff/rss.asp', { about: 'Productontwerper, schrijft over interfaces' }),
  V('bradfrost', 'Brad Frost', 'expert', ['ux'], 'https://bradfrost.com/feed/', { about: 'Bedenker van Atomic Design' }),
  V('smashing', 'Smashing Magazine', 'vakblad', ['ux'], 'https://www.smashingmagazine.com/feed/', { filter: true }),
  V('alistapart', 'A List Apart', 'vakblad', ['ux'], 'https://alistapart.com/main/feed/'),
  V('uxcollective', 'UX Collective', 'community', ['ux'], 'https://uxdesign.cc/feed'),
  V('figma', 'Figma', 'officieel', ['ux'], 'https://www.figma.com/blog/feed/atom.xml'),
  // Digital Design
  V('creativereview', 'Creative Review', 'vakblad', ['design'], 'https://www.creativereview.co.uk/feed/', { filter: true }),
  V('designweek', 'Design Week', 'vakblad', ['design'], 'https://www.designweek.co.uk/feed/', { filter: true }),
  V('fastco-design', 'Fast Company Design', 'vakblad', ['design'], 'https://www.fastcompany.com/co-design/rss', { filter: true }),
  V('awwwards', 'Awwwards', 'vakblad', ['design'], 'https://www.awwwards.com/blog/feed/'),
  // AI voor je werk: vakmensen die er zelf mee werken, de AI-rubriek van vakbladen, en de
  // officiële kanalen van modellen en MCP. (Anthropic heeft geen feed; Simon Willison schrijft
  // over elke nieuwe Claude-versie.)
  V('simonwillison', 'Simon Willison', 'expert', ['ai'], 'https://simonwillison.net/atom/entries/', { about: 'Maker van Datasette, test elk nieuw model en elke tool' }),
  V('oneusefulthing', 'Ethan Mollick', 'expert', ['ai'], 'https://www.oneusefulthing.org/feed', { about: 'Hoogleraar (Wharton), schrijft over AI in het werk' }),
  V('latentspace', 'Latent Space', 'expert', ['ai'], 'https://www.latent.space/feed', { about: 'Over het bouwen met AI, van swyx en Alessio' }),
  V('interconnects', 'Interconnects', 'expert', ['ai'], 'https://www.interconnects.ai/feed', { about: 'Nathan Lambert over nieuwe modellen' }),
  V('marketingai', 'Marketing AI Institute', 'vakblad', ['ai'], 'https://www.marketingaiinstitute.com/blog/rss.xml'),
  V('verge-ai', 'The Verge', 'vakblad', ['ai'], 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', { filter: true }),
  V('ars-ai', 'Ars Technica', 'vakblad', ['ai'], 'https://arstechnica.com/ai/feed/', { filter: true }),
  V('mcp', 'Model Context Protocol', 'officieel', ['ai'], 'https://blog.modelcontextprotocol.io/index.xml'),
  V('openai', 'OpenAI', 'officieel', ['ai'], 'https://openai.com/news/rss.xml', { filter: true }),
  // Kiest voor beide: wat over interfaces gaat telt bij UI/UX, de rest bij design.
  V('sidebar', 'Sidebar', 'curator', ['ux', 'design'], 'https://sidebar.io/feed.xml', { about: 'De redactie kiest elke werkdag vijf designlinks' }),
]

export { VAK_FIELDS, VAK_FIELD_IDS }

// Past een stuk bij het vakgebied? Alleen nodig voor bronnen die breder schrijven (`filter`).
const FITS = {
  // Een sociaal platform én iets met adverteren of marketing (een stuk over een nep-WhatsApp is
  // geen paid social); zoekmachine-adverteren (Google Ads) hoort er niet bij.
  'paid-social': {
    test: (t) =>
      /\b(paid social|social (ads|advertising|commerce)|advantage\+|ads manager)\b/i.test(t) ||
      (/\b(meta|facebook|instagram|threads|tiktok|snapchat|pinterest|linkedin|reddit|youtube|whatsapp)\b/i.test(t) &&
        /\b(ads?|advertis\w*|advert\w*|campaigns?|campagnes?|marketing|marketeers?|marketers?|creators?|influencers?|brands?|merken|targeting|audiences?|budgets?|cpm|roas|reels|shopping|commerce|creatives?|attribution|pixel)\b/i.test(t)),
  },
  ux: /\b(ux|ui|user experience|usability|interfaces?|interaction|design systems?|accessib\w*|a11y|prototyp\w*|figma|user research|onboarding|navigation|forms?|typography|components?|designers?)\b/i,
  // AI: modellen, tools en werken met AI (algemeen techniek- of bedrijfsnieuws telt niet mee).
  ai: /\b(ai|a\.i\.|artificial intelligence|kunstmatige intelligentie|llms?|large language models?|gpt[-\w.]*|chatgpt|claude|gemini|copilot|openai|anthropic|mistral|llama|mcp|model context protocol|agents?|agentic|agenten|prompt\w*|generative|generatieve|genai|machine learning|midjourney|sora|veo|reasoning models?)\b/i,
  // Digitaal ontwerp en merkidentiteit; boeken, verpakkingen en gebouwen niet.
  design: /\b(digital|web ?design|websites?|apps?|interfaces?|ui|ux|online|screens?|interactive|motion|animat\w*|figma|identity|identities|rebrand\w*|logos?|type ?faces?|fonts?|typograph\w*|design systems?|design trends?|icons?)\b/i,
}

// Geen mensenwerk om te lezen (of geen artikel): reclame, aankondigingen, audio, vacatures, lijstjes.
const NOT_READING = /\b(sponsored|partner content|advertorial|presented by|webinars?|podcast|episode|register now|sign up now|giveaway|deals?|discount|coupon|vacatures?|we'?re hiring|job (opening|listing)s?|this week in|weekly (round-?up|recap)|industry news|newsletter)\b/i
const LISTICLE = /^\s*(the\s+)?\d+\s+([\w-]+\s+){0,3}(tools?|templates?|examples?|plugins?|fonts?|apps?|ways|tips|tricks|resources|mockups?|icons?)\b/i
export const cleanTitle = (t = '') => t.replace(/\s+via\s+@\w+(,\s*@\w+)*\s*$/i, '').trim()
// Verzamelingen: dagelijkse overzichten ("[AINews] …") en genummerde linklijstjes ("… (#25)").
const ROUNDUP = /^\s*\[[^\]]*news[^\]]*\]|\(#\d+\)|\b(roundup|round-up|links? of the week|weekly digest|daily digest)\b/i
export const isReading = (it) => !!it.title && !NOT_READING.test(it.title) && !LISTICLE.test(it.title) && !ROUNDUP.test(it.title)

// ---- Week: van maandag 07:00 tot maandag 07:00 (Amsterdam) ----
const AMS = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' })
const DOW = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
const at7 = (y, m, d) => {
  const guess = Date.UTC(y, m - 1, d, 7)
  return guess - tzOffsetMs(guess)
}
function isoWeek(y, m, d) {
  const t = new Date(Date.UTC(y, m - 1, d))
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7) + 3) // de donderdag van die week bepaalt het jaar
  const jan1 = Date.UTC(t.getUTCFullYear(), 0, 1)
  return { year: t.getUTCFullYear(), week: Math.ceil(((t - jan1) / 864e5 + 1) / 7) }
}
// De laatst verschenen Vakweek op moment `now`: over de week vóór de laatste maandag 07:00.
export function vakWeek(now = Date.now()) {
  const p = Object.fromEntries(AMS.formatToParts(new Date(now)).map((x) => [x.type, x.value]))
  let back = DOW[p.weekday]
  if (back === 0 && Number(p.hour) < 7) back = 7
  const [y, m, d] = [+p.year, +p.month, +p.day - back] // Date.UTC rekent een negatieve dag zelf om
  const to = at7(y, m, d)
  const from = at7(y, m, d - 7)
  const next = at7(y, m, d + 7)
  const start = new Date(Date.UTC(y, m - 1, d - 7))
  const { year, week } = isoWeek(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate())
  return { id: `${year}-W${String(week).padStart(2, '0')}`, week, from: new Date(from).toISOString(), to: new Date(to).toISOString(), next: new Date(next).toISOString() }
}

// ---- Over hetzelfde? Genoeg gedeelde, betekenisvolle woorden in de kop ----
const STOP = new Set('about after again against also among another because been before being between both could does doing during each from further have having here into itself just more most much must need only other over same should some such than that their them then there these they this those through under until very want were what when where which while will with would your yours year years week weeks today heres whats how why new news announces launches says adds update updates over naar voor door over deze voor zijn wordt worden heeft hebben niet meer maar onze jouw jullie'.split(' '))
const words = (t) => new Set((t || '').toLowerCase().replace(/[’']s\b/g, '').replace(/[’']/g, '').split(/[^a-z0-9à-ÿ+]+/).filter((w) => (w.length >= 4 || /\d/.test(w)) && !STOP.has(w)))
const textOf = (i) => `${i.title} ${(i.summary || '').slice(0, 300)}`
// Hetzelfde onderwerp: drie gedeelde woorden in de kop, twee gedeelde zeldzame woorden in de
// kop, of drie in kop en intro samen. Zeldzaam (`df`): in hooguit twee stukken van de week;
// "meta" en "ai" staan overal, "dv360" of "apple music" niet.
export function sameSubject(a, b, df = new Map()) {
  if (a.url && a.url === b.url) return true
  const rare = (w) => (df.get(w) || 0) <= 2
  const ta = words(a.title)
  const tb = words(b.title)
  const shared = [...ta].filter((w) => tb.has(w))
  if (shared.length >= 3 || shared.filter(rare).length >= 2) return true
  const wb = words(textOf(b))
  return [...words(textOf(a))].filter((w) => wb.has(w) && rare(w)).length >= 3
}

const WEIGHT = { expert: 3, vakblad: 2, curator: 2, community: 1, officieel: 1 }
const cleanLink = (u) => (u || '').replace(/[?#].*$/, '').replace(/\/$/, '').replace(/^https?:\/\/(www\.)?/, '')
const prettyHost = (u) => hostname(u).replace(/^www\./, '')

// Welk vakgebied krijgt dit stuk? Het eerste dat past; null als geen enkel past.
export function fieldOf(it, src) {
  for (const f of src.fields) {
    if (src.fields.length > 1 || src.filter) {
      if (FITS[f].test(`${it.title} ${it.summary || ''}`)) return f
    } else return f
  }
  return null
}

// Sidebar linkt ook naar producten en tools (een homepage): geen stuk om te lezen.
const SHORTENER = /^(bit\.ly|t\.co|tinyurl\.com|buff\.ly|ow\.ly)$/
export function isArticleLink(url) {
  try {
    const u = new URL(url)
    return !SHORTENER.test(u.hostname.replace(/^www\./, '')) && u.pathname.replace(/\/+$/, '').length > 1
  } catch {
    return false
  }
}

// De Vakweek samenstellen uit de voorraad (alle stukken van de afgelopen weken).
// `since`: sinds wanneer we verzamelen. Is dat later dan het begin van de week, dan is die week
// niet compleet: dan een voorproefje over de afgelopen zeven dagen (tot de eerste volle week).
export function composeVak(pool, { now = Date.now(), sources = VAK_SOURCES, top = 3, more = 5, since = null } = {}) {
  const full = vakWeek(now)
  const preview = !!since && since > full.from
  const wk = preview ? { ...full, from: new Date(now - 7 * 864e5).toISOString(), to: new Date(now).toISOString() } : full
  const byId = new Map(sources.map((s) => [s.id, s]))
  const inWeek = pool.filter((i) => i.publishedAt >= wk.from && i.publishedAt < wk.to && byId.has(i.source) && isReading(i) && (byId.get(i.source).kind !== 'curator' || isArticleLink(i.url)))

  const df = new Map()
  for (const it of inWeek) for (const w of words(textOf(it))) df.set(w, (df.get(w) || 0) + 1)
  const fields = VAK_FIELDS.map((f) => {
    const its = inWeek.filter((i) => fieldOf(i, byId.get(i.source)) === f.id)
    // Groepen: stukken over hetzelfde, uit verschillende bronnen.
    const groups = []
    for (const it of its) {
      // Vergelijken met het eerste stuk van een groep (niet met elk stuk: anders ketent het door).
      const g = groups.find((gr) => sameSubject(gr.items[0], it, df))
      g ? g.items.push(it) : groups.push({ items: [it] })
    }
    const scored = groups.map((g) => {
      const srcs = new Set(g.items.map((i) => i.source))
      // Gekozen door Sidebar telt als signaal als een andere bron het stuk (of onderwerp) ook heeft.
      const picked = g.items.some((i) => byId.get(i.source).kind === 'curator') && g.items.some((i) => byId.get(i.source).kind !== 'curator')
      // Het stuk dat we tonen: van de zwaarste bron; Sidebar zelf alleen als er niets anders is.
      const rank = (i) => (byId.get(i.source).kind === 'curator' ? 0 : WEIGHT[byId.get(i.source).kind]) * 10 + (i.author ? 2 : 0) + (i.summary ? 1 : 0)
      const lead = [...g.items].sort((a, b) => rank(b) - rank(a) || (a.publishedAt < b.publishedAt ? -1 : 1))[0]
      const src = byId.get(lead.source)
      const score = WEIGHT[src.kind] + 2.5 * (srcs.size - 1) + (picked ? 3 : 0) + (lead.author ? 0.5 : 0) + (lead.summary ? 0.5 : 0)
      const why = []
      if (srcs.size > 1) why.push(`${srcs.size} vakbronnen schreven erover`)
      if (picked || src.kind === 'curator') why.push('Gekozen door de redactie van Sidebar')
      if (src.kind === 'expert' && src.about) why.push(src.about) // de naam staat al bij de bron
      const curator = src.kind === 'curator'
      const entry = {
        ...lead,
        title: cleanTitle(lead.title),
        // Een Sidebar-link wijst naar een stuk elders: toon die site als bron.
        sourceName: curator ? prettyHost(lead.url) : lead.sourceName,
        via: curator ? 'Sidebar' : null,
        why,
        also: g.items.filter((i) => i.source !== lead.source && byId.get(i.source).kind !== 'curator' && cleanLink(i.url) !== cleanLink(lead.url)).map((i) => ({ sourceName: i.sourceName, url: i.url, title: i.title })),
        score,
      }
      delete entry.text
      delete entry.cats
      delete entry.ogTried
      return entry
    })
    scored.sort((a, b) => b.score - a.score || b.also.length - a.also.length || (a.publishedAt > b.publishedAt ? -1 : 1))
    // Afwisseling: in de top hooguit één stuk per bron, daaronder hooguit twee.
    const pick = (list, n, perSource) => {
      const out = []
      const count = {}
      for (const e of list) {
        if (out.length >= n) break
        const key = e.via ? 'sidebar:' + e.sourceName : e.source
        if ((count[key] || 0) >= perSource) continue
        count[key] = (count[key] || 0) + 1
        out.push(e)
      }
      return out
    }
    // Een bedrijfsblog (Meta, Figma) haalt de top alleen als ook anderen erover schrijven.
    const topList = pick(scored.filter((e) => byId.get(e.source).kind !== 'officieel' || e.also.length), top, 1)
    const rest = pick(scored.filter((e) => !topList.includes(e)), more, 2)
    return { ...f, count: its.length, top: topList, more: rest }
  })

  return {
    id: wk.id,
    week: wk.week,
    preview,
    from: wk.from,
    to: wk.to,
    next: wk.next,
    builtAt: new Date(now).toISOString(),
    fields,
    sources: sources.map((s) => ({ id: s.id, name: s.name, kind: s.kind, fields: s.fields, about: s.about || null })),
  }
}

// ---- Beeld: de deelafbeelding van het artikel zelf ----
// Veel vakfeeds leveren geen beeld (AdExchanger, Nielsen Norman Group, Sidebar-links) of een
// postzegel (WordPress "-300x157"). De deelafbeelding (og:image) van het artikel is dan het beeld
// dat de schrijver zelf koos (zie og.mjs).
const SMALL_WP = /-(\d{2,3})x\d{2,4}\.(jpe?g|png|webp)(\?|$)/i
export const wantsOgImage = (it) => !it.ogTried && (!it.image || (SMALL_WP.test(it.image) && Number(it.image.match(SMALL_WP)[1]) < 600))
// Per ronde hooguit `max` stukken: eerst wat in de digest staat (`first`), dan de nieuwste;
// elk stuk één keer proberen.
export async function addOgImages(pool, { max = 24, first = new Set(), load = loadOgImage } = {}) {
  const todo = pool
    .filter(wantsOgImage)
    .sort((a, b) => first.has(b.id) - first.has(a.id) || (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, max)
  for (let i = 0; i < todo.length; i += 6) {
    await Promise.all(
      todo.slice(i, i + 6).map(async (it) => {
        const img = await load(it.url)
        if (img) it.image = img
        it.ogTried = true
      }),
    )
  }
  return todo.length
}

// ---- Ophalen en bewaren ----
const KEEP_DAYS = 16
export async function loadVakItems(sources = VAK_SOURCES) {
  const results = await Promise.all(sources.map((s) => loadSourceWithRetry(s, Promise.resolve({}))))
  return { items: results.flatMap((r) => r.items), status: results.map((r) => ({ id: r.id, ok: r.ok, count: r.count })) }
}

// Nieuwe stukken bij de voorraad; wat ouder is dan 16 dagen valt eruit.
export function mergePool(pool, fresh, now = Date.now()) {
  const cutoff = new Date(now - KEEP_DAYS * 864e5).toISOString()
  const byId = new Map(pool.map((i) => [i.id, i]))
  for (const it of fresh) if (!byId.has(it.id)) byId.set(it.id, it)
  return [...byId.values()].filter((i) => i.publishedAt && i.publishedAt >= cutoff)
}
