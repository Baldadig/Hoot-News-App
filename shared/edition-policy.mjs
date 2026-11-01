// Vastgestelde redactionele normen, 1 november 2026. Geen modelcalls.
import { geoOf, isSport, FRONT_BIG, FAMILY_OF } from './editor.mjs'
import { storyForeignOf, NL_HOME, VL_HOME } from '../netlify/lib/desks.mjs'

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
export function majorNews(story = {}, items = []) {
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
export function allowedNews(prof, story, items, desk = null) {
  if (items.some(i => isSport(i, prof.catOf)) && !sportChosen(prof) && !exceptionalDutchSport(story, items)) return false
  return worldChosen(prof) || !internationalNews(items, desk, story) || majorNews(story, items)
}
