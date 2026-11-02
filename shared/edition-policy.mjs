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
export function newsRejection(prof, story, items, desk = null) {
  if (onlyGalleries(items)) return 'alleen-galerijen'
  if ((sportStory(story, items, prof.catOf) || items.some(i => isSport(i, prof.catOf))) && !sportChosen(prof) && !exceptionalDutchSport(story, items)) return 'sport-niet-gekozen'
  if (!worldChosen(prof) && cappedInternational(prof, items, desk, story) && !majorNews(story, items)) return 'internationaal-niet-groot-genoeg'
  return null
}
export const allowedNews = (prof, story, items, desk = null) => newsRejection(prof, story, items, desk) === null
