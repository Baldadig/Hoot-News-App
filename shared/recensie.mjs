// Geen recensie of kop zonder nieuws in de Editie (Alex, 14 november 2026: "Dit is ook een vrij zwak artikel voor een
// Editie", over 3voor12 "Ciarán – Róisín", een album van de dag, als plek uit het cultuurblok van zijn Editie).
// De Editie is tien verhalen nieuws. Een recensie (album, film, serie, boek, game, theater, concert, product), een
// album of plaat van de dag of week, een luistertip, tiplijst of playlist is beschouwing, geen nieuws: die blijven in
// de Stroom en de Selectie, en doen in de Editie langs geen enkele route mee (ook niet uit een interesse of rubriek).
// Valt zo een cultuurplek weg, dan krijgt die plek een ander nieuwsverhaal (het extra blok wordt kleiner, het nieuws
// groter); de Editie blijft tien.
//
// Alleen wat de uitgever zelf zegt, of een vaste kopvorm van een cultuurbron. Nooit een los woord: "Review van het
// kabinetsbeleid", "Recensent X ontslagen", "Ciarán wint Grammy" of "Rolling Stones kondigen tour aan" zijn nieuws.
//  1. de feed: een rubriek als "Recensie", "Reviews", "Album van de dag" (feedMark 'recensie', netlify/lib/rss.mjs);
//  2. de link: een map /recensie/, /reviews/, /review/, /tv-movie-reviews/, /quietus-reviews/, /album-of-the-week/ …,
//     een slug die met "recensie-" begint (DPG: Humo, Parool, De Morgen, de Volkskrant) of op "-review"/"-recensie"
//     eindigt (Guardian, IGN, NPR, Variety), of "review" in de slug onder een cultuurrubriek (/film/, /stage/, /books/);
//  3. de kop: een label vooraan ("Recensie:", "RECENSIE.", "Review -", "Book Review:", "Album van de dag:"), "review"
//     als laatste woord van het eerste deel ("Heartland Review", "U2: Carnaval de Luz review – …", "TV Review (2026)"),
//     of sterren (★★★★);
//  4. de werkkop van een cultuurbron: alleen een naam en een titel, zonder werkwoord ("Ciarán – Róisín", "yeule –
//     “Lovepill”", "Tara Cunningham – Warm Ground"). Alleen bij een muziek-, cultuur- of gamesbron: in een nieuwsbron
//     is een kop zonder werkwoord vaak gewoon nieuws ("Brand in Stiens").
// Een nieuwswerkwoord in de kop (wint, overleden, ontslagen, kondigt aan, announces, dies, fired …) houdt de zwakkere
// aanwijzingen (2 en 4, en "review" achteraan) tegen. Bij twijfel blijft het staan.
// Gedeeld door server, web en toestel (edition-core.js): zonder URL-object, alleen deterministische toetsen.
import { SOURCES } from '../netlify/lib/sources.mjs'
import { urlDelen } from './url-delen.mjs'

// Bronnen waar een werkkop (naam – titel) een plaat, film of game bespreekt of aanprijst.
const CULTURE_IDS = new Set(SOURCES.filter((s) => s.music || s.cat === 'cultuur' || s.cat === 'games').map((s) => s.id))

// Een feedrubriek (of een deel ervan, "Review / Gaming / Games", "Gear / Reviews") die een recensie of tip is.
const REVIEW_CAT = /^(recensies?|reviews?|live reviews?|album reviews?|film reviews?|book reviews?|tv reviews?|game reviews?|music reviews?|theatre reviews?|(album|film|boek|theater|concert|game|plaat)recensies?|album van de (dag|week)|plaat van de (dag|week)|album of the (day|week)|reissue of the week|luistertips?|tiplijst|playlists?)$/i
export function reviewCategory(cats = []) {
  const list = (Array.isArray(cats) ? cats : [cats]).map((c) => String(c || '').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim()).filter(Boolean)
  return list.some((c) => c.split(/\s*\/\s*/).some((p) => REVIEW_CAT.test(p)))
}

// Een map in de link die alleen recensies of tips bevat.
const REVIEW_DIR = /^(recensies?|reviews?|review|[a-z]+-reviews?|album-reviews?|albumrecensies?|album-van-de-(dag|week)|plaat-van-de-(dag|week)|album-of-the-(day|week)|reissue-of-the-week|luistertips?)$/i
// Uitgevers die een recensiemap ook voor iets anders gebruiken: Tweakers zet zijn achtergrondverhalen onder /reviews/
// ("Achtergrond - Jensen Huang weg bij Nvidia"); daar telt alleen het label of de feedrubriek.
const DIR_NOT = [/(^|\.)tweakers\.net$/i]
// Een cultuurrubriek in de link: daar is "review" in de slug een recensie (Guardian: /stage/…/cloud-9-review-national-theatre-london).
const CULTURE_DIR = /^(film|films|movies|tv|tv-and-radio|television|tv-movies|series|stage|theatre|theater|podium|music|muziek|books|boeken|games|artanddesign|art|kunst|kunst-media|culture|cultuur|cultuur-media|tv-cultuur|uit)$/i

// Een nieuwswerkwoord: dan is het nieuws over een werk of een maker, geen bespreking.
const NEWS_VERB = /(?<![\p{L}\p{N}])(wint|winnen|wonnen|won|wins|winning|overleden|overlijdt|sterft|gestorven|dood|doodt|dies|died|dead|death|killed|ontslagen|ontslaat|fired|sacked|kondigt|kondigen|aangekondigd|announces?|announced|unveils?|onthult|onthullen|stopt|stoppen|gestopt|quits?|splits?|uit elkaar|arrested|aangehouden|opgepakt|veroordeeld|sentenced|sued|aangeklaagd|klaagt|cancels?|cancell?ed|geschrapt|afgelast|postponed|uitgesteld|reunites?|reunited|verkoopt|sells?|sold|breaks?|record|grammy|oscar|edison|nominated|genomineerd|nominatie|benoemd|appointed|named|leaves|verlaat|vertrekt)(?![\p{L}\p{N}])/iu
// Werkwoorden die een kop een zin maken: een werkkop heeft er geen.
const VERB = /(?<![\p{L}\p{N}])(is|are|was|were|be|been|has|have|had|will|would|can|could|says?|said|gets?|got|makes?|made|takes?|took|brings?|goes|went|comes?|came|zijn|ben|bent|wordt|worden|werd|werden|heeft|hebben|had|hadden|gaat|gaan|ging|komt|komen|kwam|krijgt|krijgen|maakt|maken|brengt|brengen|zegt|zeggen|zei|wil|willen|moet|moeten|kan|kunnen|mag|blijft|staat|ligt|zit)(?![\p{L}\p{N}])/iu

// Een label vooraan in de kop.
const TITLE_LABEL = /^[\s"'‘“(]*(recensies?|review|reviews|book review|album review|film review|tv review|game review|filmrecensie|albumrecensie|boekrecensie|theaterrecensie|concertrecensie|album van de (dag|week)|plaat van de (dag|week)|album of the (day|week)|reissue of the week|luistertips?|playlist)(\s*\(\d+\))?\s*(?:[:|]|\s[-–—]\s)/i
const TITLE_CAPS = /^\W*(RECENSIE|REVIEW)\.\s/
// "review"/"recensie" als laatste woord van het eerste deel van de kop, met een woord ervoor dat geen onderzoek of
// toetsing aanduidt ("Pentagon orders review", "plan under review", "peer review" blijven nieuws).
const TITLE_END = /(?:^|\s)([\p{L}\p{N}’'”"‘.:)&!?/+-]+)\s+(review|recensie)(?:\s*\(\d{4}\))?\s*(?:$|[:|–—]|\s-\s)/iu
const NOT_BEFORE = /^(under|peer|judicial|safety|strategic|security|policy|budget|spending|defen[cs]e|independent|internal|external|formal|full|urgent|annual|rapid|case|legal|performance|code|statutory|public|government|federal|official|price|pricing|orders?|ordered|launch(?:es|ed)?|starts?|started|opens?|opened|seeks?|demands?|calls?|for|a|an|the|een|de|het|start|begint|eist|vraagt|kritische|onafhankelijke|externe|interne)$/i
const STARS = /[★☆]{2,}|\(\s*[0-5](?:[.,]5)?\s*\/\s*5\s*\)/

const plainTitle = (s) => String(s || '').replace(/\s+/g, ' ').trim()

function urlSignal(raw) {
  const u = urlDelen(raw)
  if (!u) return null
  const parts = u.path.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s).toLowerCase()
    } catch {
      return s.toLowerCase()
    }
  })
  if (!parts.length) return null
  // De slug: het laatste deel dat geen getal of id is (The Atlantic en Tweakers zetten er een nummer achter).
  let k = parts.length - 1
  while (k > 0 && /^[\d.]+(\.html?)?$/.test(parts[k])) k--
  const slug = parts[k].replace(/\.html?$/, '').replace(/~[a-z0-9]+$/, '').replace(/-\d{5,}$/, '')
  const dirs = parts.slice(0, k)
  if (!DIR_NOT.some((h) => h.test(u.host)) && dirs.some((d) => REVIEW_DIR.test(d))) return 'map'
  if (/^recensie-/.test(slug)) return 'slug'
  const tokens = slug.split('-')
  const last = tokens[tokens.length - 1]
  if ((last === 'review' || last === 'recensie') && tokens.length > 1 && !NOT_BEFORE.test(tokens[tokens.length - 2])) return 'slug'
  if (dirs.some((d) => CULTURE_DIR.test(d)) && tokens.some((t, j) => (t === 'review' || t === 'recensie') && j > 0 && !NOT_BEFORE.test(tokens[j - 1]))) return 'slug'
  return null
}

// "Naam – Titel": twee korte delen, zonder werkwoord en zonder zinstekens.
export function workTitle(title) {
  const t = plainTitle(title).replace(/\s*\((?:feat|ft|prod)\.[^)]*\)/gi, '')
  if (!t || /[?!:;,]/.test(t) || /[.]$/.test(t)) return false
  const parts = t.split(/\s[-–]\s/)
  if (parts.length !== 2) return false
  const words = (s) => s.replace(/["“”‘’']/g, '').split(/\s+/).filter(Boolean)
  const [a, b] = parts.map(words)
  if (!a.length || !b.length || a.length > 5 || b.length > 6) return false
  return !VERB.test(t) && !NEWS_VERB.test(t)
}

// De aanwijzing, of null: 'feed' | 'map' | 'slug' | 'label' | 'kop' | 'sterren' | 'werkkop'.
export function recensieMark(item = {}) {
  if (!item || item.kind === 'post') return null
  if (item.feedMark === 'recensie') return 'feed'
  const title = plainTitle(item.title)
  if (TITLE_LABEL.test(title) || TITLE_CAPS.test(title)) return 'label'
  if (STARS.test(title)) return 'sterren'
  const news = NEWS_VERB.test(title)
  const url = urlSignal(item.url)
  if (url === 'map') return 'map'
  if (news) return null
  if (url) return url
  const end = TITLE_END.exec(title)
  if (end && !NOT_BEFORE.test(end[1])) return 'kop'
  if (CULTURE_IDS.has(item.source) && workTitle(title)) return 'werkkop'
  return null
}

export const isRecensie = (item) => recensieMark(item) != null
