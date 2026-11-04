// Vastgestelde redactionele normen, 1 november 2026. Geen modelcalls.
import { geoOf, isSport, FRONT_BIG, FAMILY_OF, personalParts } from './editor.mjs'
import { storyForeignOf, NL_HOME, VL_HOME } from '../netlify/lib/desks.mjs'
import { SOURCES } from '../netlify/lib/sources.mjs'
import { keywordTopics } from '../netlify/lib/topics.mjs'

// Expliciete uitgeverlanden; taal en het land in een artikel zijn nooit bewijs hiervoor.
// Onbekende uitgevers leveren geen extra land op. Sectiefeeds blijven dezelfde uitgever.
const ALIAS = { 'nos-sport':'nos', 'nos-cultuur':'nos', 'bbc-sport':'bbc', 'guardian-sport':'guardian', 'guardian-music':'guardian', 'guardian-culture':'guardian', 'npr-music':'npr' }
const COUNTRIES = Object.fromEntries(Object.entries({
  NL: [...NL_HOME, 'tweakers','vi','wielerflits','3voor12'],
  BE: [...VL_HOME],
  US: ['nyt','atlantic','newyorker','foreignpolicy','politico','npr','bloomberg','theverge','wired','ars','techcrunch','mittr','ign','gamespot','polygon','quanta','sciam','espn','pitchfork','rollingstone','stereogum','variety'],
  GB: ['guardian','bbc','economist','ft','independent','telegraph','eurogamer','nature','carbonbrief','autosport','quietus'],
  DE: ['dw'], FR: ['lemonde'], QA: ['aljazeera'], HK: ['scmp'],
}).flatMap(([country, ids]) => ids.map(id => [id, country])))
export const publisherOf = id => ALIAS[id] || id
export const publisherCountry = id => COUNTRIES[publisherOf(id)] || null
export function coverageOf(items = []) {
  const ids = [...new Set(items.map(i => publisherOf(i.source)).filter(Boolean))].sort()
  return { publisherCount: ids.length, publisherCountries: [...new Set(ids.map(publisherCountry).filter(Boolean))].sort() }
}
// ---- Noodfix 2 november 2026: sport op niveau van het verhaal, en de galerij ----
// Een bundel van 64 stukken over een F1-titel, een marathon en meer sport had een NYT-fotogalerij als kop
// (geen sporttag) en 18 uitgevers: "Groot nieuws" voor iedereen. Sport herken je daarom aan het hele verhaal.
const SPORT_CAT = new Map(SOURCES.map(s => [s.id, s.cat]))
const SPORT_NAMES = new Set(SOURCES.filter(s => s.cat === 'sport').map(s => s.name))
// Sleutelwoorden (story.keys) en kopwoorden die op zichzelf al sport zeggen; losse treffers tellen niet, drie wel.
const SPORT_KEYS = new Set(['formula','formule','f1','fia','marathon','voetbal','football','soccer','eredivisie','tennis','wimbledon','olympic','olympisch','wielrennen','cycling','nba','nfl','nhl','mlb','rugby','cricket','darts','qualifying','autodromo','interlagos','wk','ek'])
const SPORT_HEAD = /\b(marathon|grand prix|formula (1|one)|formule 1|f1|premier league|champions league|world cup|wk|ek|eredivisie|olympic\w*|olympisch\w*|nba|nfl)\b/i
// Een verhaal is sport als de meerderheid van zijn uitgevers sportbron of -sectie is (`story.sport` van de
// server wint). Een derde, met minstens drie echte sportbronnen en sportwoorden in de kop of de kenmerken,
// is genoeg: algemene uitgevers (NYT, NPR, Al Jazeera) schrijven mee over de uitslag, maar het blijft sport.
export function sportStory(story = {}, items = [], catOf = null) {
  if (typeof story.sport === 'boolean') return story.sport
  const units = new Map()
  const bySource = new Map()
  for (const i of items) if (i?.source) (bySource.get(i.source) || bySource.set(i.source, []).get(i.source)).push(i)
  for (const [src, its] of bySource) {
    const dedicated = (catOf?.get(src) ?? SPORT_CAT.get(src)) === 'sport'
    units.set(its[0].sourceName || src, dedicated || its.filter(i => isSport(i, catOf)).length * 2 >= its.length)
  }
  for (const name of story.sourceNames || []) if (!units.has(name)) units.set(name, SPORT_NAMES.has(name))
  const sport = [...units.values()].filter(Boolean).length
  if (!units.size || !sport) return false
  if (sport * 2 >= units.size) return true
  const evidence = (story.keys || []).filter(k => SPORT_KEYS.has(k)).length >= 3 || items.some(i => SPORT_HEAD.test(i.title || ''))
  return sport >= 3 && sport * 3 >= units.size && evidence
}
// Fotogalerij, slideshow of video-overzicht: nooit het hoofdverhaal als er iets anders is.
const GALLERY_TITLE = /\b(in photos( and videos?)?|in pictures|photos? and videos?|slideshow|gallery|in beeld|fotoreportage|fotoserie)\b/i
const GALLERY_URL = /\/(interactive|slideshow|gallery|galleries|fotoserie|in-beeld)\/|[-/](in-photos|in-pictures|photos-and-videos?|slideshow|fotoreportage|fotoserie)\b/i
export const isGallery = item => GALLERY_TITLE.test(item?.title || '') || GALLERY_URL.test(String(item?.url || '').split('?')[0])
const onlyGalleries = items => items.length > 0 && items.every(isGallery)

export function majorNews(story = {}, items = []) {
  if (onlyGalleries(items)) return false
  const coverage = coverageOf(items)
  // Nieuwe backendvelden bevatten de volledige gebeurtenis, ook bij een gedeeltelijke clientpool.
  const observedSources = new Set(items.map(i => i.source).filter(Boolean)).size
  const count = story.publisherCount ?? (observedSources >= (story.sourceCount || Infinity) ? coverage.publisherCount : story.sourceCount) ?? coverage.publisherCount
  const countries = new Set(story.publisherCountries || coverage.publisherCountries)
  return count >= FRONT_BIG || (count >= 5 && countries.size >= 2)
}
export const worldChosen = prof => prof.interests ? prof.interests.has('wereld') : (prof.family?.wereld || 0) >= 0.5
export const sportChosen = prof => prof.interests ? prof.interests.has('sport') : (prof.family?.sport || 0) >= 0.5
// Algemene nieuwsfeeds van buitenlandse uitgevers (geen sectiefeeds als npr-music of guardian-sport).
// Brengt geen enkele Nederlandse of Vlaamse uitgever het verhaal, dan telt een stuk daaruit zonder
// herkende plaats voor het plafond als buitenland: onbekend mag het harde plafond van twee niet omzeilen
// (NPR over het Amerikaanse hooggerechtshof zonder landnaam in kop of intro). Met een Nederlandse of
// Vlaamse uitgever erbij blijft onbekend onbekend. Een vakstuk (economie, tech, wetenschap, cultuur, sport)
// is geen buitenlands nieuws: The Economist over Google of NPR over AI blijft onbekend.
// `story.publisherCountries` (de hele gebeurtenis, van de server) gaat voor: een lezer die alleen de NYT
// volgt, ziet niet dat NOS het ook bracht.
const FOREIGN_NEWS = new Set(['nyt','atlantic','newyorker','foreignpolicy','politico','npr','bloomberg','guardian','bbc','economist','ft','independent','telegraph','dw','lemonde','aljazeera','scmp'])
const BEAT = new Set(['economie','tech','wetenschap','cultuur','sport'])
const generalNews = item => !(item?.topics || []).some(t => BEAT.has(FAMILY_OF[t]))
const homeCovered = (items, story) => story?.homeCovered === true || (story?.publisherCountries || []).some(c => c === 'NL' || c === 'BE') || items.some(i => ['NL','BE'].includes(publisherCountry(i?.source)))
export function internationalNews(items = [], desk = null, story = null) {
  if (['buitenland','vs','middenoosten','oekraine'].includes(desk)) return true
  const foreign = storyForeignOf(items)
  const unknownAbroad = desk !== 'wetenschap' && !homeCovered(items, story)
  const geos = items.map(i => geoOf(i, desk, foreign) ?? (unknownAbroad && FOREIGN_NEWS.has(i?.source) && generalNews(i) ? 'int' : null))
  const abroad = geos.filter(g => g === 'int').length
  return foreign || (abroad > geos.filter(g => g === 'nl').length && abroad * 2 >= geos.length)
}
export function exceptionalDutchSport(story, items) {
  if (!majorNews(story, items)) return false
  // Bewijs moet in één kop staan: geen samengeraapte woorden uit verschillende artikelen.
  return items.some(i => /\b(nederland\w*|netherlands|dutch|oranje)\b/i.test(i.title || '') && /\b(wk|wereldkampioenschap\w*|world cup|olympisch\w*|olympic\w*)\b/i.test(i.title || '') && /\b(finale|final|kampioen\w*|goud|gold)\b/i.test(i.title || ''))
}
// Het plafond betreft algemeen wereldnieuws. Een aantoonbaar relevant vakverhaal
// houdt zijn echte geografie, maar verbruikt geen algemene Wereld-plek.
const specialistMemo = new WeakMap()
export function specialistMatch(prof, items = [], desk = null) {
  if (!prof?.topicP || !prof?.favorites || ![...BEAT].some(f=>(prof.family?.[f] || 0)>=0.5)) return false
  if (!items.length) return false
  // Profielen en berichten zijn onveranderlijke invoer; identiteiten vormen een zwakke trie.
  // Geen sleutel op alleen artikel-id: een bijgewerkt bericht moet opnieuw worden beoordeeld.
  let memo = specialistMemo.get(prof)
  if (!memo) specialistMemo.set(prof, memo = {next:new WeakMap(),values:new Map()})
  for (const item of items) {
    if (!item || typeof item !== 'object') return false
    let next = memo.next.get(item)
    if (!next) memo.next.set(item,next = {next:new WeakMap(),values:new Map()})
    memo = next
  }
  if (memo.values.has(desk)) return memo.values.get(desk)
  const hit = personalParts(items, prof, {}, {desk, foreign:true}).interest
  const match = !!hit && items.filter(i=>keywordTopics(`${i.title || ''} ${i.summary || ''}`).some(t=>FAMILY_OF[t] === hit.f)).length * 2 >= items.length && BEAT.has(hit.f) && hit.shown !== false && hit.cov >= 0.5 && (prof.family?.[hit.f] || 0) >= 0.5
  memo.values.set(desk,match)
  return match
}
export const cappedInternational = (prof, items = [], desk = null, story = null) => internationalNews(items,desk,story) && !specialistMatch(prof,items,desk)
// Lichte, samengestelde videolijstjes zijn Film, geen Tech doordat de uitgever Tech heet.
// Een nieuwsreportage met videobewijs valt niet onder deze vormregel.
export function lightVideoFiller(item, prof = null) {
  const title = item?.title || ''
  if (/\b(evidence of|video evidence|videobewijs|bewijs van|investigation into|onderzoek naar|war crimes|oorlogsmisdrijven)\b/i.test(title)) return false
  const curated = /\b(get in the spirit|these (?:horror|spooky|scary|halloween)|best (?:horror|spooky|scary|halloween)|(?:horror|halloween|spooky|scary).*(?:roundup|round-up|collection|to watch))\b/i.test(title)
  const video = /\b(youtube|tiktok|videos?|trailers?)\b/i.test(title)
  return curated && video && !((prof?.family?.cultuur || 0) >= 0.5 && (prof?.topicP?.film || 0) >= 0.5)
}
// ---- Lichte stukken (4 november 2026) ----
// Gezien: een GTA VI-downloadgrootte en de naam van Elder Scrolls VI op plek 3 en 4 van de algemene
// Avondeditie (vier games- en techsites tellen als vier uitgevers), en Martha Stewart op 09 in een schone
// beginnerseditie. Games, cultuur en entertainment, lifestyle en consumententech (reviews, deals) zijn een
// eigen soort, net als sport: in een Editie alleen voor wie dat gebied koos, of als het groot nieuws is
// volgens algemene nieuwsuitgevers. Een vakkop met een harde nieuwsreden (rechter, toezichthouder,
// ontslagen, hack, overheid) blijft nieuws. Geen titels of namen: bron, onderwerp, URL-rubriek en kopvorm.
const LIGHT_CAT = { games: 'games', cultuur: 'cultuur' }
const LIGHT_TOPIC = { games: 'games', film: 'cultuur', muziek: 'cultuur', boeken: 'cultuur', kunst: 'cultuur', media: 'cultuur' }
const LIGHT_PATH_GAMES = /\/(games?|gaming|gameblog)\//i
const LIGHT_PATH = /\/(entertainment|showbizz|boulevard|celebrit\w*|lifestyle|style|fashion|mode|t-magazine|dining|food|eten|koken-en-eten|recepten|travel|reizen|realestate|arts|books|boeken|movies|theater|television|tv|film|muziek|music|kunst-media|media-en-cultuur|cultuur(?:-media)?|culture)\//i
const LIGHT_HEAD = /\b(podcast\w*|talkshow\w*|presentat(?:or|rice)\w*|tv-serie\w*|streamingdienst\w*|kookboek\w*|recept\w*|recipe\w*)\b/i
const CONSUMER_PATH = /\/(reviews?|deals?|gift-guide|buying-guide|best-\w+)\//i
const CONSUMER_HEAD = /(^|\b)(review|getest|hands-on|deal|deals|korting|aanbieding|buying guide|gift guide|best (?:\w+ ){0,3}(?:to buy|for \w+))\b/i
// Een harde nieuwsreden in de kop, of een onderwerp van politiek of wereld: dan is het geen licht stuk.
const HARD_HEAD = /\b(rechter\w*|rechtbank|rechtszaak|court|lawsuit|sued|sues|verbod|verboden|ban|bans|banned|boete\w*|fined?|fines|toezichthouder\w*|regulator\w*|antitrust|mededinging\w*|ontslag\w*|layoffs?|laid off|staking\w*|strike|hack\w*|datalek\w*|breach|lek|minister\w*|kabinet\w*|regering\w*|government|congres\w*|congress|senaat|senate|parlement\w*|kamer\w*|politie|police|arrest\w*|aangehouden|oorlog|war|aanslag\w*|sanctie\w*|sanctions?|tarie\w*|tariffs?|faillis\w*|bankrupt\w*)\b/i
const HARD_FAMILIES = new Set(['politiek', 'wereld'])
// De soort van één bericht: 'games', 'cultuur' (ook entertainment en lifestyle), 'consument' of null.
const hardNews = (item) => HARD_HEAD.test(item?.title || '') || (item?.topics || []).some((t) => HARD_FAMILIES.has(FAMILY_OF[t]))
export function lightKind(item, catOf = null) {
  if (!item) return null
  const title = item.title || ''
  if (hardNews(item)) return null
  const url = String(item.url || '').split('?')[0]
  const cat = catOf?.get(item.source) ?? SPORT_CAT.get(item.source)
  const byTopic = (item.topics || []).map((t) => LIGHT_TOPIC[t]).find(Boolean)
  if (LIGHT_CAT[cat]) return LIGHT_CAT[cat]
  if (LIGHT_PATH_GAMES.test(url) || byTopic === 'games') return 'games'
  if (byTopic || LIGHT_PATH.test(url) || LIGHT_HEAD.test(title)) return 'cultuur'
  if (CONSUMER_PATH.test(url) || CONSUMER_HEAD.test(title)) return 'consument'
  return null
}
// Een verhaal is licht als een echte meerderheid van zijn uitgevers het als licht stuk brengt (zoals sportStory):
// per uitgever telt de helft van zijn stukken. `story.light` van de server (die alle stukken kent) wint.
// Zonder dat veld (een oudere server) tellen uitgevers die alleen bij naam bekend zijn (story.sourceNames)
// alleen mee als hun rubriek in de catalogus games of cultuur is; een algemene krant waarvan het toestel
// het stuk niet heeft, is onbekend en telt niet mee. Uitvoer: de soort die het vaakst voorkomt, of null.
const CAT_BY_NAME = new Map(SOURCES.map((s) => [s.name, s.cat]))
const ID_BY_NAME = new Map(SOURCES.map((s) => [s.name, s.id]))
const LIGHT_ORDER = ['games', 'cultuur', 'consument']
export function lightStory(story = {}, items = [], catOf = null) {
  if (story && story.light !== undefined) return story.light || null
  const bySource = new Map()
  for (const i of items) if (i?.source) (bySource.get(i.source) || bySource.set(i.source, []).get(i.source)).push(i)
  const units = new Map()
  let hard = 0
  for (const [src, its] of bySource) {
    const kinds = its.map((i) => lightKind(i, catOf)).filter(Boolean)
    if (its.some(hardNews)) hard++
    units.set(its[0].sourceName || src, kinds.length * 2 >= its.length ? kinds[0] : null)
  }
  for (const name of story?.sourceNames || []) if (!units.has(name) && LIGHT_CAT[CAT_BY_NAME.get(name)]) units.set(name, LIGHT_CAT[CAT_BY_NAME.get(name)])
  const kinds = [...units.values()].filter(Boolean)
  // Een echte meerderheid van de uitgevers, of de helft met minstens twee lichte uitgevers en geen enkele
  // met een harde nieuwsreden (vier sites over Elder Scrolls VI, waarvan twee gamesites). Eén licht stuk
  // naast één nieuwsstuk (een verkeerde bundel) blijft nieuws.
  const enough = kinds.length * 2 > units.size || (kinds.length >= 2 && hard === 0 && kinds.length * 2 >= units.size)
  if (!units.size || !enough) return null
  const count = {}
  for (const k of kinds) count[k] = (count[k] || 0) + 1
  return [...LIGHT_ORDER].sort((a, b) => (count[b] || 0) - (count[a] || 0) || LIGHT_ORDER.indexOf(a) - LIGHT_ORDER.indexOf(b))[0]
}
// Groot nieuws voor een licht verhaal telt alleen algemene nieuwsuitgevers (geen games-, tech- of
// cultuursites): vier gamesites over een downloadgrootte zijn geen vier redacties die het nieuws vinden.
const GENERAL_CATS = new Set(['nl', 'vl', 'int', 'regio'])
export function majorGeneralNews(story = {}, items = [], catOf = null) {
  if (onlyGalleries(items)) return false
  const catFor = (id) => catOf?.get(id) ?? SPORT_CAT.get(id)
  const ids = new Set(items.map((i) => i?.source).filter((id) => id && GENERAL_CATS.has(catFor(id))).map(publisherOf))
  for (const name of story.sourceNames || []) if (GENERAL_CATS.has(CAT_BY_NAME.get(name))) ids.add(publisherOf(ID_BY_NAME.get(name)))
  const countries = new Set([...ids].map(publisherCountry).filter(Boolean))
  return ids.size >= FRONT_BIG || (ids.size >= 5 && countries.size >= 2)
}
// Koos de lezer dit gebied? Games: het onderwerp games (scherp of uit lezen); cultuur: het gebied Cultuur;
// consumententech: het onderwerp gadgets.
export function lightChosen(prof, kind) {
  if (kind === 'games') return (prof?.topicP?.games || 0) >= 0.5
  if (kind === 'cultuur') return (prof?.family?.cultuur || 0) >= 0.5
  if (kind === 'consument') return (prof?.topicP?.gadgets || 0) >= 0.5
  return true
}
// Het hele verhaal als het bekend is: de stukken van de lezer plus wat de server over de bronnen zegt.
export const lightNews = (story, items, catOf = null) => (story?.light === undefined && items.length === 1 && !(story?.sourceNames || []).length ? lightKind(items[0], catOf) : lightStory(story, items, catOf))

// `bubble`: de plek Buiten je bubbel. `allowLight`: alleen om de vloer van een Editie te halen (EDITION_FLOOR).
export function newsRejection(prof, story, items, desk = null, { bubble = false, allowLight = false } = {}) {
  if (onlyGalleries(items)) return 'alleen-galerijen'
  if (items.length && items.every(i=>lightVideoFiller(i,prof))) return 'licht-videorondje-buiten-interesse'
  if ((sportStory(story, items, prof.catOf) || items.some(i => isSport(i, prof.catOf))) && !sportChosen(prof) && !exceptionalDutchSport(story, items)) return 'sport-niet-gekozen'
  // Buiten je bubbel mag juist iets lichts buiten je profiel zijn; alle gewone plekken niet.
  if (!bubble && !allowLight) {
    const light = lightNews(story, items, prof.catOf)
    if (light && !lightChosen(prof, light) && !majorGeneralNews(story, items, prof.catOf)) return 'licht-buiten-interesse'
  }
  if (!worldChosen(prof) && cappedInternational(prof, items, desk, story) && !majorNews(story, items)) return 'internationaal-niet-groot-genoeg'
  return null
}
export const allowedNews = (prof, story, items, desk = null, opts = {}) => newsRejection(prof, story, items, desk, opts) === null

export {EDITION_TARGET,EDITION_AUDIT_BELOW,EDITION_FLOOR,editionStoryCount} from './edition-limits.mjs'
