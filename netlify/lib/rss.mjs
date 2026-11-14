import { cleanIntro } from '../../shared/edition-display.mjs'
// RSS/Atom-feeds ophalen en omzetten naar Hoot-berichten.
import Parser from 'rss-parser'
import { hash, safeHttpUrl } from '../../shared/util.mjs'
import { typeset } from '../../shared/typeset.mjs'
import { BRAND, UA, editionWindowOf, ownLogo } from './sources.mjs'
import { firstOf } from './stream.mjs'
import { favicon, toText, clip, preview, cleanUrl, hostname, safeIso, plausibleTime, withoutPromo, PROMO_OWN } from './text.mjs'
import { langOf } from '../../shared/lang.mjs'
import { rubricSegments } from '../../shared/editie-filter.mjs'
import { couponPage } from './kortingscode.mjs'
import { opinieRubriek } from '../../shared/opinie.mjs'

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

// Een audio- of video-enclosure, iTunes-afleveringsvelden (aflevering, of duur bij audio) en de hoofdcategorie (de eerste) als die
// Podcast of Video is. Een latere categorie is een onderwerp ("Podcasts" bij een stuk óver podcasts), geen soort.
export function mediaFields(it = {}, cats = []) {
  const out = {}
  const type = String(it.enclosure?.type || '')
  if (/^(audio|video)\//i.test(type)) out.mediaType = type.toLowerCase()
  // Alleen een echt afleveringsnummer, of een duur bij een audio-enclosure (herstel AI-keuring 1: een nieuwsvideo met
  // itunes:duration is geen aflevering).
  const ep = it.itunes?.episode ?? (/^audio\//i.test(type) ? it.itunes?.duration : null)
  if (ep != null && String(ep).trim()) out.podcastEpisode = String(ep).trim().slice(0, 20)
  const first = String(cats[0] || '').trim().toLowerCase()
  if (/^podcasts?$/.test(first)) out.feedMark = 'podcast'
  else if (/^(videos?|video's)$/.test(first)) out.feedMark = 'video'
  return out
}

function categoriesOf(it) {
  return (it.categories || []).map((c) => (typeof c === 'string' ? c : c?._ || c?.$?.term || '')).filter(Boolean)
}
// Ophaalfilter (Redacteur · ruis, 11 november 2026). Bij het ophalen valt alleen weg wat ZEKER geen nieuws is, op een
// harde aanwijzing van de uitgever zelf, en nooit op een los woord in de kop (de oude woordfilter op "Black Friday",
// "N% off", kortingscode, uitverkoop en "… newsletter:" gooide nieuws weg vóór de Stroom én de Editie: ACM- en
// FTC-toezicht op Black Friday, "Bitcoin 30% off", de beurs "na massale uitverkoop"; de categorie "Software" weerde een
// Politico-stuk over AI). Wat nu nog wegvalt:
//   1. reclame: de feed markeert het (categorie "Sponsored", "Advertorial", "Partner content", "Newsletter sign-up" …),
//      de link staat in een reclame- of commercerubriek (/advertorial/, /sponsored/, /partner/, /commerce/, /pricewatch/ …),
//      of de kop begint met een reclamelabel ("Advertentie:", "Sponsored |"). Bewust NIET: /product-recommendations/
//      (daar schrijft een commerce-redactie ook stukken die op nieuws lijken; bij twijfel blijft het staan, B beoordeelt het);
//   2. wat de uitgever zelf als geen-bericht indeelt: een persbericht (/press-releases/), puzzels (/puzzels/), een
//      versie-overzicht (/downloads/) en een eigen actie of winactie (feedcategorie ".Actie" of ".Plan");
//   3. lege of kapotte items (geen kop of geen http(s)-link) en dubbele items (dezelfde link): in loadSource;
//   4. een kortingscode-pagina, alleen bij een bron die dat in sources.mjs aanzet (`couponPages`, nu alleen Wired) en als
//      kop én slug het zeggen ("Nike Promo Codes: …", …/nike-promo-code/; kortingscode.mjs).
// Een aanbieding of kijk-/luisteraanbod dat de uitgever niet zo markeert, staat gewoon in de Stroom (een deal mag daar
// staan). Uit de Editie houden A (harde aanwijzing, shared/editie-filter.mjs) en B (de AI, netlify/lib/editie-ai.mjs) het.
// Alleen een rubriek telt (een segment vóór de slug, rubricSegments), nooit de slug: "/show/ex-partner-van-zanger" blijft.
const NOISE_RUBRIC = new Set([
  // reclame en commerce
  'advertorial', 'advertorials', 'advertentie', 'advertenties', 'sponsored', 'sponsored-content', 'gesponsord', 'partner', 'partner-content',
  'partnercontent', 'partnerbijdrage', 'brandpartner', 'brand-partner', 'branded-content', 'brand-studio', 'paid-content', 'paid-post', 'paidpost',
  'commerce', 'pricewatch',
  // eigen huisvlijt, geen bericht
  'press-release', 'press-releases', 'persbericht', 'persberichten', 'puzzel', 'puzzels', 'puzzle', 'puzzles', 'downloads',
])
// Een feedcategorie telt alleen als ze in haar geheel zo heet (dus niet "Advertising" of "Software": dat zijn onderwerpen).
const NOISE_CATEGORY = new Set([
  'sponsored', 'sponsored content', 'sponsored post', 'gesponsord', 'gesponsorde inhoud', 'advertorial', 'advertentie', 'partner content',
  'partnercontent', 'partnerbijdrage', 'paid content', 'paid post', 'branded content', 'promoted', 'promoted content',
  'newsletter sign-up', 'newsletter signup', 'newsletter sign up', 'press release', 'press releases', 'persbericht', '.actie', '.plan',
])
const AD_LABEL = /^[\s"'‘“([]*(advertentie|advertorial|gesponsord|sponsored(?: content)?|partner ?content|partnerbijdrage|paid (?:post|content)|branded content|promoted)\s*[:|\]–—]/i
// Per bron (Redacteur · wired-deals, 11 november 2026): een bron kan in sources.mjs een eigen aanbodrubriek opgeven
// (`dealsCategory`, nu alleen Wired: "Gear / Deals"). Een algemene regel "… / Deals" kan bij een andere bron een
// overnamerubriek zijn ("Business / Deals"), daarom geldt dit alleen voor de bron die het opgeeft. En ook dan alleen als de
// feed het stuk uitsluitend als aanbod indeelt: de rubriek zelf en hoogstens haar bovenrubriek ("Gear"), niets anders.
// Wired zet "Gear / Deals" namelijk ook op journalistiek over koopjes en prijzen ("$1,200 Off the iPhone Duo? Here's How
// Carrier Deals Actually Work", "The New M6 MacBook Pro Has a Serious Price Problem"); die hebben er een productrubriek bij
// ("Gear / Products / Phones") en blijven dus staan. Een woord in de kop of de link telt nooit; bij twijfel blijft het staan.
export function sourceDeal(src = {}, cats = []) {
  const mark = String(src?.dealsCategory || '').trim().toLowerCase()
  if (!mark) return false
  const own = cats.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
  if (!own.includes(mark)) return false
  const parts = mark.split(/\s*\/\s*/)
  const parents = new Set(parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join(' / ')))
  return own.every((c) => c === mark || parents.has(c.split(/\s*\/\s*/).join(' / ')))
}
export function noiseReason(it = {}, cats = [], src = null) {
  if (cats.some((c) => NOISE_CATEGORY.has(String(c).trim().toLowerCase()))) return 'categorie'
  if (AD_LABEL.test(toText(String(it.title || '')).trim())) return 'label'
  if (rubricSegments(it.link || it.guid || '').some((s) => NOISE_RUBRIC.has(s))) return 'rubriek'
  if (src && sourceDeal(src, cats)) return 'bron-aanbod'
  // Een kortingscode-pagina (Redacteur · kortingscodes): per bron (`couponPages`), kop én slug, zie kortingscode.mjs.
  if (couponPage({ title: toText(String(it.title || '')), link: it.link || it.guid || '' }, src)) return 'kortingscode'
  return null
}
export const isNoise = (it, cats = [], src = null) => noiseReason(it, cats, src) != null
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
// De categorie: opinieRubriek (shared/opinie.mjs), ook "Opinie & columns" en een vaste columnrubriek van één uitgever.
export function typeOf(link, cats) {
  if (/\/(opinie|opinion|opinions|columns?[a-z-]*|commentaar|commentisfree)\//i.test(link)) return 'opinie'
  if (opinieRubriek(cats, link)) return 'opinie'
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
  if (!res.ok) throw new Error(feedError(res.status, res.headers))
  return parser.parseString((await res.text()).replace(/^[\s\uFEFF]+/, ''))
}

// De reden van een mislukte feed, zo dat we hem kunnen bewaren en tonen (B13, nachttest 14 november). Een uitgever die
// ons weigert (401, 403, 429, of een botcontrole van Cloudflare met de kop cf-mitigated) heet "geweigerd": dat lossen we
// niet op door het vaker te proberen, wel door de uitgever te vragen HootReader toe te laten of de bron te vervangen.
// Een weigering omzeilen we nooit.
export const REFUSED = /^geweigerd:/
export function feedError(status, headers) {
  const mitigated = typeof headers?.get === 'function' ? headers.get('cf-mitigated') : headers?.['cf-mitigated']
  if (status === 401 || status === 403 || status === 429 || mitigated) return `geweigerd: HTTP ${status}${mitigated ? ` (cf-mitigated: ${mitigated})` : ''}`
  return 'HTTP ' + status
}

// Een feed die de oudste bovenaan zet (Hidde de Vries, Thuiswinkel.org) leverde met de grens alleen oude stukken, en de
// server zette hem op kapot (nachttest 14 november). Staat de feed meer oplopend dan aflopend, dan stabiel aflopend op
// publicatietijd, stukken zonder tijd achteraan. Een gewone feed (nieuwste eerst) houdt precies zijn eigen volgorde.
const tijd = (i) => Date.parse(i.publishedAt) || 0
export function newestFirst(items = []) {
  let op = 0, af = 0
  for (let k = 1; k < items.length; k++) {
    const a = tijd(items[k - 1]), b = tijd(items[k])
    if (a && b) { if (b > a) op++; else if (b < a) af++ }
  }
  if (op <= af) return items
  return items.map((i, k) => [i, k]).sort(([a, ka], [b, kb]) => (tijd(a) && tijd(b) ? tijd(b) - tijd(a) : !tijd(a) - !tijd(b)) || ka - kb).map(([i]) => i)
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
      // Mooie merk-avatar: 0) het officiele beeld van de site (`logo`), 1) Bluesky-profiel, 2) het eigen logo van Hoot, 3) favicon.
      const brandAvatar = src.logo || avatars[src.id] || ownLogo(src.id)
      const fresh = (feed.items || []).map((it) => [it, categoriesOf(it)]).filter(([it, cats]) => !isNoise(it, cats, src) && (!src.keep || String(it.link || '').includes(src.keep)))
      const seen = new Set()
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
      })
      // Zonder geldige (http/https) link of zonder kop niet tonen, en elk stuk één keer (dezelfde link = hetzelfde id;
      // BBC Sport zet soms een stuk twee keer in de feed).
      .filter((i) => i.url && i.title && !seen.has(i.id) && seen.add(i.id))
      const items = firstOf(newestFirst(mapped), limit) // de grens telt alleen berichten in de brontaal
      return { id: src.id, name: src.name, ok: true, used: url, count: items.length, items }
    } catch (e) {
      lastErr = e
    }
  }
  const error = String((lastErr && lastErr.message) || lastErr)
  return { id: src.id, name: src.name, ok: false, used: null, count: 0, items: [], error, refused: REFUSED.test(error) }
}
// Eén herhaalpoging bij een mislukte bron (korte hapering), daarna opgeven zonder de rest te blokkeren.
// Niet bij een weigering: dan weigert de uitgever de tweede keer ook. Heeft de ronde een eindtijd (`deadline`, ms sinds
// 1970), dan alleen als er nog minstens een seconde over is, en wacht de ronde niet langer dan tot die eindtijd: dan
// telt de eerste poging (B13: de ronde moet op tijd klaar zijn om iets weg te schrijven). `loadOne`: alleen voor toetsen.
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
export async function loadSourceWithRetry(src, avatarsP, opts = {}) {
  const { loadOne = loadSource, ...rest } = opts
  const first = await loadOne(src, avatarsP, rest)
  if (first.ok || first.refused) return first
  const left = opts.deadline ? opts.deadline - Date.now() - 350 : Infinity
  if (left < 1000) return first
  await pause(350)
  const again = loadOne(src, avatarsP, rest)
  const second = left === Infinity ? await again : await Promise.race([again, pause(left).then(() => first)])
  return second.ok ? second : first
}
