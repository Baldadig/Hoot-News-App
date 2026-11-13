import { urlDelen } from './url-delen.mjs'
// Taal per bericht. Een bron heeft een hoofdtaal (sources.mjs `lang`), maar brengt soms een stuk
// in een andere taal: het Parool heeft Engelstalige rubrieken (amsterdam-news, guide), een
// Engelstalige bron citeert een Nederlands stuk. Zo'n bericht hoort niet bij lezers van de
// hoofdtaal. Bewust gekozen anderstalige bronnen (de NYT voor een Nederlandse lezer) blijven
// gewoon: het gaat om de taal van één bericht binnen zijn bron.
//
// Zuinig en deterministisch: we tellen veelvoorkomende functiewoorden (lidwoorden, voornaamwoorden,
// voorzetsels, hulpwerkwoorden) in de kop en het begin van de intro. Leenwoorden ("update",
// "deal", "must-see") en namen ("Pieter de Vries") zijn geen functiewoorden en tellen dus niet,
// of nauwelijks. Woorden die in beide talen gewoon zijn (in, is, was, had, of, over, door, we, van)
// tellen niet mee. Uitspraak alleen bij een duidelijke meerderheid; anders onzeker (null), en dan
// geldt de taal van de bron.

// Functiewoorden die vrijwel alleen in die taal voorkomen.
const NL = new Set(
  ('de het een en op met voor niet dat die dit deze zijn wordt worden werd er ook naar bij aan om nog maar uit als dan ' +
    'wel geen meer zo hoe wat wie waar waarom hij zij ze je jij jouw uw haar hun ons onze mijn zich kan kunnen moet moeten ' +
    'wil willen gaat gaan heeft hebben tegen tussen na toch nu tot sinds vanaf onder zonder omdat want daar hier veel ' +
    'alle iets niets nieuwe eerste jaar jaren krijgt komt blijkt zegt vindt weer al ik mensen zou zouden').split(/\s+/),
)
const EN = new Set(
  ('the a an and to for with on at by from are were be been has have will would could should not this that these those ' +
    'its he she they you your his her their our my who what when where why how which after before about into than ' +
    'but or as says said there here just all more year years while against between without ' +
    "because its it's don't doesn't didn't won't can't isn't aren't i'm you're they're we're what's here's there's " +
    'people being does did makes made gets got').split(/\s+/),
)

// Rubrieken waarvan we de taal zeker weten (de uitgever zet ze apart), op host + eerste padstuk.
// Engelstalig bij het Parool: "Amsterdam News" en de uitgaansgids "Guide".
const KNOWN_PATHS = [{ host: /(^|\.)parool\.nl$/, path: /^\/(amsterdam-news|guide)(\/|$)/, lang: 'en' }]

export const LANG_MIN = 3 // minstens zoveel functiewoorden van de winnende taal
export const LANG_SHARE = 0.75 // en minstens dit aandeel van alle getelde functiewoorden
const INTRO_CHARS = 300

export function langFromUrl(url) {
  const u = urlDelen(url) // zonder URL-object: JavaScriptCore heeft er geen; geen geldige link: geen signaal
  if (!u) return null
  const host = u.host.replace(/^www\./, '')
  for (const k of KNOWN_PATHS) if (k.host.test(host) && k.path.test(u.path)) return k.lang
  return null
}

// Telt de functiewoorden per taal in een tekst.
export function langCounts(text) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .match(/\p{L}+(?:'\p{L}+)*/gu) || []
  let nl = 0
  let en = 0
  for (const w of words) {
    if (NL.has(w)) nl++
    if (EN.has(w)) en++
  }
  return { nl, en }
}

// 'nl', 'en' of null (onzeker). Kop plus het begin van de intro.
export function detectLang({ title = '', summary = '', text = '', url = '' } = {}) {
  const byUrl = langFromUrl(url)
  if (byUrl) return byUrl
  const intro = String(summary || text || '').slice(0, INTRO_CHARS)
  const { nl, en } = langCounts(`${title} ${intro}`)
  const top = Math.max(nl, en)
  if (top < LANG_MIN || top / (nl + en) < LANG_SHARE) return null
  return en > nl ? 'en' : 'nl'
}

// De taal van een bericht en of die afwijkt van de hoofdtaal van zijn bron. Onzeker: de brontaal.
// Een bron zonder opgegeven taal (Bluesky, een meertalige vakbron) krijgt nooit `offLang`.
export function langOf(item, sourceLang) {
  const found = detectLang(item)
  const lang = found || sourceLang || null
  return { lang, offLang: !!(sourceLang && found && found !== sourceLang) }
}

// Hoot is (nog) alleen Nederlandstalig: de lezer-taal is de app-taal.
export const READER_LANG = 'nl'
// Een bericht in de taal van zijn bron toont iedereen die de bron volgt; een afwijkend bericht
// alleen een lezer wiens taal het is (een Engelstalig Parool-stuk dus straks in de Engelse app).
export const visibleFor = (item, readerLang = READER_LANG) => !item?.offLang || item.lang === readerLang
