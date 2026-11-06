// Inhoudelijke signalen, gedeeld door server en JavaScriptCore. Uitgeversland is geen verhaalplaats.
// Onbekend blijft onbekend; een niet-herkende plaats is nooit bewijs voor de VS of Nederland.
const words = pattern => new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, 'iu')
const COUNTRIES = [
  ['nl', 'nederland|netherlands|dutch|den haag|the hague|zeeuws-vlaanderen|breskens|amsterdam|rotterdam|utrecht|eindhoven'],
  ['us', 'verenigde staten|united states|u\\.s\\.|usa|amerikaan\\p{L}*|american\\p{L}*|washington|michigan|ohio|texas|california|florida|new york|colorado|denver'],
  ['in', 'india|indiaas|indiase|indian|new delhi|mumbai|modi'],
  ['fr', 'frankrijk|france|frans|franse|fransen|french|parijs|paris|marseille'],
  ['de', 'duitsland|germany|german|duitse?|duitsers|berlijn|berlin|frankfurt|hamburg|keulen|cologne|munich'],
  ['gb', 'verenigd koninkrijk|united kingdom|british|britse?|engeland|england|londen|london'],
  ['be', 'belgi\\p{L}*|belg|belgen|vlaanderen|vlaams\\p{L}*|brussel|brussels|antwerpen|antwerp|gent|brugge'],
  ['ua', 'oekra\\p{L}*|ukrain\\p{L}*|kyiv|kiev|zelensk\\p{L}*'],
  ['ru', 'rusland|russia\\p{L}*|russisch\\p{L}*|moskou|moscow|putin|poetin'],
  ['il', 'isra[eë]l\\p{L}*|gaza|netanyahu|hamas|palestijn\\p{L}*|palestin\\p{L}*'],
  ['ir', 'iran\\p{L}*|teheran|tehran'], ['lb', 'libanon|lebanon|hezbollah'],
  ['cn', 'china|chinees|chinese|beijing|peking'], ['jp', 'japan\\p{L}*|tokyo|tokio'],
  ['ca', 'canad\\p{L}*|carney|toronto'], ['br', 'brazili\\p{L}*|brazil\\p{L}*|lula|bolsonaro'],
  ['es', 'spanje|spain|spaans\\p{L}*|madrid'], ['it', 'itali\\p{L}*|rome|milaan|lucca'],
  ['pl', 'polen|poland|poolse?|warschau'], ['ee', 'estland|estse?|estonia\\p{L}*'],
  ['sn', 'senegal\\p{L}*'], ['sa', 'saudi\\p{L}*|saoedi\\p{L}*|saudische?'],
  ['nz', 'new zealand|nieuw-zeeland'],
  ['au', 'australi\\p{L}*'], ['tr', 'turkije|turkey|turks\\p{L}*|erdogan'],
].map(([id, pattern]) => [id, words(pattern)])
export function countriesIn(text = '') {
  const found = COUNTRIES.filter(([, re]) => re.test(text)).map(([id]) => id)
  if (/\bUS\b/.test(text) && !found.includes('us')) found.push('us') // niet het Engelse voornaamwoord us
  return found
}

const US_SPECIFIC = words('trump|biden|vance|obamacare|white house|witte huis|pentagon|fbi|hegseth|midterms?|tussentijdse verkiezingen|house of representatives|justice department')
const US_PARTY = words('republican\\p{L}*|republikein\\p{L}*|democra(?:at|ten|ts)|democratic (?:senate|presidential|nominee|candidate|sweep|party)')
const US_INSTITUTION = words('congress|congres|senate|senaat|supreme court|hooggerechtshof|capitol|governor|gouverneur')
export function usPoliticsIn(text = '') {
  if (US_SPECIFIC.test(text)) return true
  const countries = countriesIn(text)
  // Congress bestaat ook in India, senaat en hooggerechtshof ook in andere landen.
  if (countries.some(c => c !== 'us') && !countries.includes('us')) return false
  return US_PARTY.test(text) || (countries.includes('us') && US_INSTITUTION.test(text)) || (/\bICE\b/.test(text) && /\b(agents?|immigration|deport\w*|arrest\w*|invallen)\b/i.test(text))
}

const LOCAL_INCIDENT = words('protest\\p{L}*|betoging\\p{L}*|demonstrat\\p{L}*|rally|rallies|riot\\p{L}*|rellen|onrust|arrest\\p{L}*|aanhouding\\p{L}*|aangehouden|police|politie|schietpartij|shooting|explosi\\p{L}*|brand|fire|crash')
// Een wedstrijddiscipline is gebeurteniscontext, geen reden om alle sport van dezelfde dag te bundelen.
const SPORT_EVENTS = [
  ['f1', /\b(?:f1|formula one|formula 1|formule 1|grand prix|verstappen|antonelli|norris|leclerc|piastri)\b/i],
  ['running', /\b(?:marathon|hardlopen|hardloper\w*|nageeye|kipruto|chepkirui)\b/i],
  ['cycling', /\b(?:veldrit\w*|veldrijd\w*|koppenberg\w*|cyclocross|tour de france|giro d.italia)\b/i],
]
const LOCATIONS = ['den haag|the hague', 'frankfurt', 'parijs|paris', 'marseille', 'berlijn|berlin', 'hamburg', 'keulen|cologne', 'amsterdam', 'rotterdam', 'utrecht', 'new delhi', 'mumbai'].map((p, id) => [id, words(p)])
export function eventScope(article = {}) {
  const title = article.title || ''
  const countries = countriesIn(title)
  const cities = LOCATIONS.filter(([, re]) => re.test(title)).map(([id]) => id)
  const actions = [...title.matchAll(new RegExp(LOCAL_INCIDENT.source, 'giu'))].length
  const overview = countries.length > 1 && (cities.length > 1 || (/[,;]/.test(title) && actions > 1))
  return { local: LOCAL_INCIDENT.test(`${title} ${article.summary || ''}`), countries, cities, overview, sports: SPORT_EVENTS.filter(([, re]) => re.test(title)).map(([id]) => id) }
}
export function conflictingEvents(a, b) {
  if (a?.sports?.length && b?.sports?.length && !a.sports.some(s => b.sports.includes(s))) return true
  if (!a?.local || !b?.local) return false
  // Een overzicht van lokale gebeurtenissen in meerdere landen vormt geen brug tussen die gebeurtenissen.
  if (a.overview || b.overview) return true
  if (a.countries.length && b.countries.length && !a.countries.some(c => b.countries.includes(c))) return true
  return a.cities.length > 0 && b.cities.length > 0 && !a.cities.some(c => b.cities.includes(c))
}

// Opinie: een column, commentaar of opiniestuk (keuring 6 november 2026: "Opinie is nooit een hoofdartikel").
// Alleen de signalen die de feed al geeft: het soort uit de rss (`type`, zie netlify/lib/rss.mjs), het pad van
// de link (/opinie/, /opinion/, /columns-…/, /commentaar/, /commentisfree/, de Ideas-rubriek van The Atlantic,
// de nieuwsanalyse van Al Jazeera), de rubriek (`section`) en een label voor in de kop ("Opinie:", "Column |").
const OPINION_PATH = /\/(opinie|opinies|opinion|opinions|columns?[a-z-]*|columnisten|commentaar|commentisfree|opinion-and-essays|news-analysis)\//i
const OPINION_LABEL = /^(opinie|opinion|column|columns|columnisten|commentaar|commentary|ingezonden)$/i
const OPINION_TITLE = /^\W*(opinie|opinion|column|commentaar|ingezonden)\s*[:|]/i
export function isOpinion(item = {}) {
  if (!item) return false
  if (item.type === 'opinie') return true
  const url = String(item.url || '')
  if (OPINION_PATH.test(url) || /theatlantic\.com\/ideas\//i.test(url)) return true
  return OPINION_LABEL.test(String(item.section || '').trim()) || OPINION_TITLE.test(item.title || '')
}
// Een beschouwende kop: twee zinnen met een oordeel of wending als slot ("Trump Tried to Undermine the Nation's
// Elections. It Didn't Work."). Geen opinie, wel een analyse die als mening leest; alleen een voorkeur voor de kop
// van plek 01 (zie openWithNews in netlify/lib/stories.mjs).
export const verdictTitle = (item = {}) => /[.!?]\s+["“‘]?\p{Lu}[^.!?]*[.!]["”’]?$/u.test(String(item?.title || '').trim())
