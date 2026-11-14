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
//  4. de werkkop van een muziek- of gamesbron: alleen een naam en een titel, zonder werkwoord ("Ciarán – Róisín",
//     "yeule – “Lovepill”", "Tara Cunningham – Warm Ground"). Alleen daar: in een nieuws- of algemene cultuurbron (NOS
//     Cultuur, Variety, vakbladen over media) is een kop met een streepje en zonder werkwoord vaak gewoon nieuws
//     ("Brand in Stiens", "Boekenweek 2027 – thema bekend").
// Een nieuwswerkwoord in de kop (wint, overleden, ontslagen, kondigt aan, announces, dies, fired …) houdt de zwakkere
// aanwijzingen (2 en 4, en "review" achteraan) tegen. Een nieuwswoord dat geen werkwoord is (record, dead, death, split,
// Grammy …) staat vaak ook in de titel van een werk of in een recensiezin ("Death Stranding 2 Review", "Split Fiction
// review", "a hardcore record like no other"): dat houdt alleen de werkkop en "review" midden in de slug tegen.
// Een toetsingswerkwoord vlak voor "review" (launches, faces, orders, opens …) maakt er een onderzoek van, geen
// recensie ("Bafta launches review of voting rules", "Tour Faces Ticketing Review"). Bij twijfel blijft het staan.
// Gedeeld door server, web en toestel (edition-core.js): zonder URL-object, alleen deterministische toetsen.
import { SOURCES } from '../netlify/lib/sources.mjs'
import { urlDelen } from './url-delen.mjs'

// Bronnen waar een werkkop (naam – titel) een plaat of game bespreekt of aanprijst: muziek- en gamesbronnen.
const WORK_IDS = new Set(SOURCES.filter((s) => s.music || s.cat === 'games').map((s) => s.id))
// Bronnen waar "X review" in de kop of "-review" achteraan in de slug een bespreking is: cultuur, tech en games. In een
// nieuws- of sportbron is het vaak een toetsing ("deemed clean after review", Foreign Policy "…-europe-review"); daar
// telt het alleen met een cultuurmap in de link (keuring 14 november 2026).
const REVIEW_IDS = new Set(SOURCES.filter((s) => s.music || s.cat === 'cultuur' || s.cat === 'tech' || s.cat === 'games').map((s) => s.id))

// Een feedrubriek (of een deel ervan, "Review / Gaming / Games", "Gear / Reviews") die een recensie of tip is.
const REVIEW_CAT = /^(recensies?|reviews?|live reviews?|album reviews?|film reviews?|book reviews?|tv reviews?|game reviews?|music reviews?|theatre reviews?|(album|film|boek|theater|concert|game|plaat)recensies?|album van de (dag|week)|plaat van de (dag|week)|album of the (day|week)|reissue of the week|luistertips?|tiplijst|playlists?)$/i
export function reviewCategory(cats = []) {
  const list = (Array.isArray(cats) ? cats : [cats]).map((c) => String(c || '').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim()).filter(Boolean)
  return list.some((c) => c.split(/\s*\/\s*/).some((p) => REVIEW_CAT.test(p)))
}

// Een map in de link die alleen recensies of tips bevat.
// Ook met meer koppeltekens: /music-album-reviews/ (Rolling Stone), /tv-movie-reviews/.
const REVIEW_DIR = /^(recensies?|reviews?|review|[a-z]+(?:-[a-z]+)*-reviews?|album-reviews?|albumrecensies?|album-van-de-(dag|week)|plaat-van-de-(dag|week)|album-of-the-(day|week)|reissue-of-the-week|luistertips?)$/i
// Uitgevers die een recensiemap ook voor iets anders gebruiken: Tweakers zet zijn achtergrondverhalen onder /reviews/
// ("Achtergrond - Jensen Huang weg bij Nvidia"); daar telt alleen het label of de feedrubriek.
const DIR_NOT = [/(^|\.)tweakers\.net$/i]
// Een cultuurrubriek in de link: daar is "review" in de slug een recensie (Guardian: /stage/…/cloud-9-review-national-theatre-london).
const CULTURE_DIR = /^(film|films|movies|tv|tv-and-radio|television|tv-movies|series|stage|theatre|theater|podium|music|muziek|books|boeken|games|artanddesign|art|kunst|kunst-media|culture|cultuur|cultuur-media|tv-cultuur|uit)$/i

// Een nieuwswerkwoord: dan is het nieuws over een werk of een maker, geen bespreking. Alleen werkwoorden die niet ook
// een naamwoord in een titel zijn.
const NEWS_VERB = /(?<![\p{L}\p{N}])(wint|winnen|wonnen|wins|overleden|overlijdt|sterft|gestorven|doodt|dies|died|killed|ontslagen|ontslaat|fired|sacked|kondigt|kondigen|aangekondigd|announces?|announced|unveils?|onthult|onthullen|stopt|stoppen|gestopt|uit elkaar|arrested|aangehouden|opgepakt|veroordeeld|sentenced|sued|aangeklaagd|klaagt|cancels?|cancell?ed|geschrapt|afgelast|postponed|uitgesteld|reunites?|reunited|verkoopt|nominated|genomineerd|benoemd|appointed|verlaat|vertrekt)(?![\p{L}\p{N}])/iu
// Nieuwswoorden die ook in de titel van een werk of in een recensiezin staan: alleen een veto voor de zwakste
// aanwijzingen (de werkkop en "review" midden in de slug).
const NEWS_WORD = /(?<![\p{L}\p{N}])(won|winning|dood|dead|death|splits?|quits?|breaks?|record|sells?|sold|named|leaves|grammys?|oscars?|edison|nominaties?)(?![\p{L}\p{N}])/iu
// Werkwoorden die een kop een zin maken: een werkkop heeft er geen.
const VERB = /(?<![\p{L}\p{N}])(is|are|was|were|be|been|has|have|had|will|would|can|could|says?|said|gets?|got|makes?|made|takes?|took|brings?|goes|went|comes?|came|zijn|ben|bent|wordt|worden|werd|werden|heeft|hebben|had|hadden|gaat|gaan|ging|komt|komen|kwam|krijgt|krijgen|maakt|maken|brengt|brengen|zegt|zeggen|zei|wil|willen|moet|moeten|kan|kunnen|mag|blijft|staat|ligt|zit)(?![\p{L}\p{N}])/iu

// Een label vooraan in de kop.
const TITLE_LABEL = /^[\s"'‘“(]*(recensies?|review|reviews|book review|album review|film review|tv review|game review|filmrecensie|albumrecensie|boekrecensie|theaterrecensie|concertrecensie|album van de (dag|week)|plaat van de (dag|week)|album of the (day|week)|reissue of the week|luistertips?|playlist)(\s*\(\d+\))?\s*(?:[:|]|\s[-–—]\s)/i
const TITLE_CAPS = /^\W*(RECENSIE|REVIEW)\.\s/
// "review"/"recensie" als laatste woord van het eerste deel van de kop, met een woord ervoor dat geen onderzoek of
// toetsing aanduidt ("Pentagon orders review", "plan under review", "peer review" blijven nieuws).
const TITLE_END = /(?:^|\s)(?:([\p{L}\p{N}’'”"‘.:)&!?/+-]+)\s+)?([\p{L}\p{N}’'”"‘.:)&!?/+-]+)\s+(review|recensie)(?:\s*\(\d{4}\))?\s*(?:$|[:|–—]|\s-\s)/iu
const NOT_BEFORE = /^(under|peer|judicial|after|following|na|var|faces?|faced|facing|safety|strategic|security|policy|budget|spending|defen[cs]e|independent|internal|external|formal|full|urgent|annual|rapid|case|legal|performance|code|statutory|public|government|federal|official|price|pricing|orders?|ordered|launch(?:es|ed)?|starts?|started|opens?|opened|seeks?|demands?|calls?|for|a|an|the|een|de|het|start|begint|eist|vraagt|kritische|onafhankelijke|externe|interne)$/i
// Een toetsingswerkwoord twee plaatsen voor "review": "faces ticketing review", "launches independent review".
const TOETS_VERB = /^(launch(?:es|ed|ing)?|faces?|faced|facing|orders?|ordered|opens?|opened|starts?|started|begins?|seeks?|demands?|calls?|announces?|announced|eist|vraagt|start|begint|kondigt)$/i
// Is "review" op plaats j een toetsing in plaats van een recensie? Kijkt naar het woord ervoor en dat daarvoor.
const toetsing = (words, j) => NOT_BEFORE.test(words[j - 1] || '') || TOETS_VERB.test(words[j - 2] || '')
const STARS = /[★☆]{2,}|\(\s*[0-5](?:[.,]5)?\s*\/\s*5\s*\)/

const plainTitle = (s) => String(s || '').replace(/\s+/g, ' ').trim()

function urlSignal(raw, cultuurBron) {
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
  const cultuurMap = dirs.some((d) => CULTURE_DIR.test(d))
  if (!DIR_NOT.some((h) => h.test(u.host)) && dirs.some((d) => REVIEW_DIR.test(d))) return 'map'
  if (/^recensie-/.test(slug)) return 'slug'
  const tokens = slug.split('-')
  const last = tokens[tokens.length - 1]
  // "-review" achteraan alleen bij een cultuur-, tech- of gamesbron of onder een cultuurmap.
  if ((last === 'recensie' || (last === 'review' && (cultuurBron || cultuurMap))) && tokens.length > 1 && !toetsing(tokens, tokens.length - 1)) return 'slug'
  if (cultuurMap && tokens.some((t, j) => (t === 'review' || t === 'recensie') && j > 0 && j < tokens.length - 1 && !toetsing(tokens, j))) return 'midden'
  return null
}

// Een cultuurmap in de link (/film/, /books/, /culture/ …).
function cultuurLink(raw) {
  const u = urlDelen(raw)
  if (!u) return false
  return u.path.split('/').filter(Boolean).slice(0, -1).some((d) => CULTURE_DIR.test(d.toLowerCase()))
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
  return !VERB.test(t) && !NEWS_VERB.test(t) && !NEWS_WORD.test(t)
}

// De aanwijzing, of null: 'feed' | 'map' | 'slug' | 'label' | 'kop' | 'sterren' | 'werkkop'.
export function recensieMark(item = {}) {
  if (!item || item.kind === 'post') return null
  if (item.feedMark === 'recensie') return 'feed'
  const title = plainTitle(item.title)
  if (TITLE_LABEL.test(title) || TITLE_CAPS.test(title)) return 'label'
  if (STARS.test(title)) return 'sterren'
  const news = NEWS_VERB.test(title)
  const cultuurBron = REVIEW_IDS.has(item.source)
  const url = urlSignal(item.url, cultuurBron)
  if (url === 'map') return 'map'
  if (news) return null
  // "review" midden in de slug is de zwakste linkaanwijzing: ook een nieuwswoord in de kop houdt die tegen (de kop zelf
  // kan dan nog een recensie zeggen, "Wet Leg live review: record-breaking crowd").
  if (url === 'midden') {
    if (!NEWS_WORD.test(title)) return 'slug'
  } else if (url) return url
  const end = TITLE_END.exec(title)
  // "X review" aan het eind alleen bij een cultuur-, tech- of gamesbron of met een cultuurmap in de link ("recensie"
  // overal: dat woord is in het Nederlands geen toetsing).
  if (end && !toetsing([end[1] || '', end[2], end[3]], 2) && (end[3].toLowerCase() === 'recensie' || cultuurBron || cultuurLink(item.url))) return 'kop'
  if (WORK_IDS.has(item.source) && workTitle(title)) return 'werkkop'
  return null
}

export const isRecensie = (item) => recensieMark(item) != null
