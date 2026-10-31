// Rubrieken voor de editie — pure functies (getest in tests/desks.test.mjs).
// Elke editie probeert per rubriek het belangrijkste verhaal van het moment te hebben:
// binnenland, buitenland, VS, Midden-Oosten, Oekraïne en wetenschap (plus, in feed.mjs,
// één verhaal van buiten je bubbel).

export const DESKS = ['binnenland', 'buitenland', 'vs', 'middenoosten', 'oekraine', 'wetenschap']
export const DESK_LABEL = { binnenland: 'Binnenland', buitenland: 'Buitenland', vs: 'VS', middenoosten: 'Midden-Oosten', oekraine: 'Oekraïne', wetenschap: 'Wetenschap', bubbel: 'Buiten je bubbel' }

// Binnenland is Nederland (feedback 31 oktober: Vlaamse /binnenland/, AD over Chili, NOS over Binance
// stonden onder Binnenland). Een bericht is Binnenland als het over Nederland gaat; de regel staat
// bij isBinnenland. Nederlandse bronnen: de catalogus `nl` en `regio`, plus het FD (economie, maar
// een Nederlandse krant). Vlaamse bronnen (`vl`, en Sporza) schrijven over België: dat is Buitenland.
// Vast in deze lijst (de rekenkern op de iPhone kent de catalogus niet); tests/desks.test.mjs houdt
// hem gelijk aan netlify/lib/sources.mjs.
export const NL_HOME = new Set(['nos', 'nu', 'nrc', 'volkskrant', 'trouw', 'parool', 'ad', 'telegraaf', 'rtl', 'nd', 'ftm', 'haarlemsdagblad', 'nhd', 'leidschdagblad', 'dvhn', 'lc', 'limburger', 'tubantia', 'stentor', 'gelderlander', 'bd', 'ed', 'bndestem', 'pzc', 'fd'])
export const VL_HOME = new Set(['vrt', 'standaard', 'demorgen', 'tijd', 'hln', 'nieuwsblad', 'gva', 'hbvl', 'sporza'])

// Woordgrens die ook met ë, é, ï en á werkt (\b in JavaScript doet dat niet).
const W = (alts, flags = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts.join('|')})(?![\\p{L}\\p{N}])`, flags)

// Nederlands bezit, STERK: plaatsen, instituties, partijen en personen die alleen in Nederland
// bestaan, of "Nederland" zelf ("actief in Nederland"). Alleen "Nederlandse" of "Nederlander" is
// zwak en telt niet ("Nederlandse toerist in Chili" gaat over Chili). Clubs (Ajax, PSV) niet: sport.
const NL_PLACES = [
  'nederland', 'holland', 'den haag', 'haagse?', "'s-gravenhage", 'randstad',
  'groningen', 'groningse?', 'friesland', 'friese', 'drenthe', 'drentse', 'overijssel', 'flevoland', 'gelderland', 'gelderse',
  'utrecht', 'utrechtse', 'noord-holland', 'zuid-holland', 'zeeland', 'zeeuwse?', 'noord-brabant', 'brabantse?', 'veluwe', 'achterhoek', 'twente', 'twentse',
  'amsterdam\\p{L}*', 'rotterdam\\p{L}*', 'eindhoven\\p{L}*', 'tilburg\\p{L}*', 'almere', 'breda', 'nijmegen', 'arnhem', 'haarlem', 'enschede', 'apeldoorn',
  'amersfoort', 'zaanstad', 'zaandam', "'s-hertogenbosch", 'den bosch', 'zwolle', 'maastricht', 'dordrecht', 'zoetermeer',   'deventer', 'alkmaar', 'venlo', 'leeuwarden', 'helmond', 'heerlen', 'hilversum', 'schiedam', 'lelystad',   'roermond', 'sittard', 'geleen', 'vlissingen', 'middelburg', 'terneuzen', 'purmerend', 'hengelo', 'den helder', 'harderwijk', 'vught',
  'boxtel', 'ursem', 'overasselt', 'westland', 'schiphol', 'texel', 'ameland', 'terschelling', 'waddenzee', 'ijsselmeer', 'markermeer',
  'volendam', 'zandvoort', 'scheveningen', 'katwijk', 'noordwijk', 'wageningen', 'doetinchem', 'zutphen', 'roosendaal', 'bergen op zoom',
  'kerkrade', 'rijnmond', 'maasvlakte', 'afsluitdijk', 'zuidas', 'bijlmer', 'osdorp', 'vinex',
]
const NL_INST = [
  'tweede kamer', 'eerste kamer', 'kamerleden', 'kamerlid', 'kamervragen', 'kamermeerderheid', 'kamerdebat', 'staten-generaal', 'provinciale staten', 'statenlid',
  'kabinet-\\p{L}+', 'premier jetten', 'koning willem-alexander', 'willem-alexander', 'koningin máxima', 'prinses amalia', 'koningshuis',
  'rijkswaterstaat', 'rivm', 'knmi', 'prorail', 'nvwa', 'belastingdienst', 'toeslagen\\p{L}*', 'openbaar ministerie', 'raad van state',
  'hoge raad', 'algemene rekenkamer', 'marechaussee', 'nctv', 'aivd', 'mivd', 'de nederlandsche bank', 
  'prinsjesdag', 'miljoenennota', 'belastingplan', 'box 3', 'npo', 'klm', 'ns-\\p{L}+', 'albert heijn',
  'asml', 'tata steel', 'abn amro', 'rabobank', 'groningengas', 'koningsdag', 'elfstedentocht',
]
const NL_PERSONS = ['jetten', 'wilders', 'yeşilgöz', 'yesilgoz', 'timmermans', 'bontenbal', 'van der plas', 'omtzigt', 'eerdmans', 'markuszower', 'dijkhoff', 'van essen', 'peter r\\. de vries']
// Partijen: hoofdlettergevoelig (PvdA is Nederlands, PVDA Belgisch; CU, SP en BBB alleen als afkorting).
const NL_PARTIES = W(['PVV', 'VVD', 'D66', 'CDA', 'GroenLinks', 'PvdA', 'GL-PvdA', 'SP', 'NSC', 'BBB', 'JA21', 'FvD', 'Forum voor Democratie', 'PvdD', 'Partij voor de Dieren', 'DENK', 'SGP', 'ChristenUnie', 'CU', '50Plus', '50PLUS', 'BIJ1'], 'u')
// Namen die ook een gewoon woord zijn ("de sporen leiden naar", "kampen", "klaver", "schoof"):
// alleen met hoofdletter.
const NL_CASE = W(['Leiden', 'Leidse', 'Ede', 'Oss', 'Hoorn', 'Duiven', 'Gouda', 'Kampen', 'Weert', 'Assen', 'Delft', 'Emmen', 'Urk', 'Venray',
  'Klaver', 'Schoof', 'IND', 'COA', 'GGD', 'AFM', 'ACM', 'UWV', 'SVB', 'DNB', 'DUO', 'CBS', 'NS'], 'u')
const NL_STRONG = W([...NL_PLACES, ...NL_INST, ...NL_PERSONS])
// Alles wat de huidige rubrieken al herkennen, plus wat ze missen (G20, hoofdsteden, VN, Silicon Valley...).
const FOREIGN_EXTRA = W([
  'g20', 'g7', 'vn', 'vn-\\p{L}+', 'verenigde naties', 'united nations', 'navo-top', 'eu-top', 'europese commissie', 'europees parlement', 'von der leyen', 'rutte',
  'johannesburg', 'kaapstad', 'pretoria', 'warschau', 'krakau', 'rome', 'romeinse', 'milaan', 'madrid', 'barcelona', 'lissabon', 'athene', 'wenen', 'praag', 'boedapest',
  'stockholm', 'oslo', 'kopenhagen', 'helsinki', 'finland', 'fins\\p{L}*', 'dublin', 'ierse', 'schotland', 'schots\\p{L}*', 'wales', 'tokio', 'tokyo', 'seoel',
  'new delhi', 'mumbai', 'shanghai', 'hongkong', 'hong kong', 'singapore', 'sydney', 'toronto', 'montreal', 'los angeles', 'silicon valley', 'hollywood',
  'buenos aires', 'rio de janeiro', 'são paulo', 'lagos', 'nairobi', 'caïro', 'cairo', 'egyptisch\\p{L}*', 'istanbul', 'ankara', 'belgrado', 'servië', 'kosovo',
  'bosnië', 'kroatië', 'kroatisch\\p{L}*', 'sloveni\\p{L}*', 'slowak\\p{L}*', 'litouw\\p{L}*', 'letland', 'letse', 'estland', 'estse', 'baltisch\\p{L}*', 'moldav\\p{L}*',
  'siberië', 'kaukasus', 'chileens\\p{L}*', 'peruaans\\p{L}*', 'colombiaans\\p{L}*', 'cubaans\\p{L}*', 'nigeriaans\\p{L}*', 'keniaans\\p{L}*', 'marokk\\p{L}*', 'algerij\\p{L}*', 'tunesi\\p{L}*', 'libi\\p{L}*',
  'iraans\\p{L}*', 'afghaans\\p{L}*', 'pakistaans\\p{L}*', 'thais\\p{L}*', 'vietnamees\\p{L}*', 'indonesisch\\p{L}*', 'filipijns\\p{L}*', 'australisch\\p{L}*', 'nieuw-zeeland\\p{L}*',
  'pompeï', 'pompeii', 'noors\\p{L}*', 'zweeds\\p{L}*', 'tbilisi', 'georgisch\\p{L}*', 'abu dhabi', 'dubai', 'kyoto', 'bali',
  'binance', 'musk',
])
const BE = W([
  'belgi\\p{L}*', 'belg', 'belgen', 'vlaanderen', 'vlaams\\p{L}*', 'wallonië', 'waals\\p{L}*', 'antwerp\\p{L}*', 'gent', 'gentse', 'brugge', 'leuven', 'charleroi', 'hasselt',
  'mechelen', 'oostende', 'kortrijk', 'aalst', 'brussel\\p{L}*', 'de wever', 'bouchez', 'van bossuyt', 'verlinden', 'demir', 'n-va', 'vlaams belang', 'open vld', 'cd&v', 'abvv', 'acv',
])
const BE_CASE = W(['PVDA', 'MR', 'Vooruit', 'Luik'], 'u')

const RE = {
  oekraine: /\b(oekra\w*|ukrain\w*|zelensk\w*|kyiv|kiev|kyjiv|kharkiv|charkiv|odesa|donetsk|donbas|krim|crimea|dnipro|kramatorsk)\b/i,
  middenoosten: /\b(israël|israel\w*|gaza|hamas|hezbollah|libanon|lebanon|iran\w*|teheran|tehran|khamenei|netanyahu|syri\w*|jemen|yemen|houthi\w*|irak|iraq|saudi\w*|westelijke jordaanoever|west bank|jordani\w*|qatar|golfstaten|midden-oosten|middle east|palestijn\w*|palestin\w*)\b/i,
  vs: /\b(trump|biden|vance|witte huis|white house|washington|congres\w*|congress|senaat|senate|republikein\w*|republican\w*|democra(at|ten|tic|ts)|pentagon|hegseth|midterms?|tussentijdse verkiezingen|amerikaan\w*|american|verenigde staten|united states|u\.s\.|new york|california|californi\w*|texas|florida|chicago|supreme court|hooggerechtshof|fbi|ice)\b/i,
  wetenschap: /\b(wetenschap\w*|onderzoekers|onderzoek toont|studie|scientist\w*|researchers|science|study finds|nobelprijs|nobel prize|klimaat\w*|climate|nasa|esa|astronom\w*|ruimtevaart|telescoop|telescope|natuurkunde|physics|biolog\w*|evolutie|evolution|genetic\w*|genetica|vaccin\w*|medicijn|geneesmiddel|quantum|kwantum|archeolog\w*|fossiel|fossil|aardbeving|earthquake|vulkaan|volcano|neurolog\w*|hersenonderzoek)\b/i,
  buitenland: /\b(frankrijk|france|french|frans\w*|parijs|paris|duitsland|germany|german|duits\w*|berlijn|berlin|brit\w*|engeland|england|london|londen|verenigd koninkrijk|united kingdom|spanje|spain|itali\w*|polen|poland|belgi\w*|brussel|brussels|europese unie|european union|\beu\b|navo|nato|china|chinees|chinese|peking|beijing|taiwan|japan\w*|korea\w*|india\w*|pakistan|afghanistan|rusland|russia\w*|russisch\w*|poetin|putin|kremlin|moskou|moscow|turkije|turkey|erdogan|afrika|africa|nigeria|soedan|sudan|egypte|egypt|brazili\w*|mexico|venezuela\w*|maduro|argentini\w*|canada\w*|australi\w*|albani\w*|albane\w*|spaans\w*|pools\w*|turks\w*|griek\w*|zweed\w*|deens\w*|oostenrijk\w*|zwitser\w*|portug\w*|hongaar\w*|indiase|mexica\w*|canad\w*|egypt\w*|japans\w*|koreaan\w*|afrikaan\w*|europe\w*|europa|servi\w*|hongarije|hungary|orbán|griekenland|greece|zweden|noorwegen|denemarken|oostenrijk|zwitserland|ierland|portugal|tsjechi\w*|roemeni\w*|bulgarije|georgi\w*|armeni\w*|azerbeidzjan|wit-rusland|belarus|filipijnen|indonesi\w*|vietnam|thailand|myanmar|bangladesh|sri lanka|nepal|kenia|ethiopi\w*|somali\w*|congo|zuid-afrika|south africa|haïti|haiti|cuba|colombia|chili|peru)\b/i,
}

// Sport, cultuur en games hebben hun eigen soort (kindOf in src/lib/personal.js): geen Binnenland.
const KIND_TOPICS = new Set(['voetbal', 'f1', 'wielrennen', 'tennis', 'wintersport', 'olympisch', 'muziek', 'film', 'boeken', 'kunst', 'games'])
const KIND_PATH = /\/(sport|cultuur|cultuur-media|entertainment|showbizz|show|film|muziek|boeken|media)\//i
const ownKind = ({ topics = [], url = '', section = '' }) => (topics || []).some((t) => KIND_TOPICS.has(t)) || KIND_PATH.test(url || '') || /^(sport|cultuur)/i.test(section || '')

// Wat de kop en intro zeggen: sterk Nederlands bezit, en of er een buitenlandse plek, land of naam in
// staat (de patronen van de rubrieken plus FOREIGN_EXTRA en België).
export function placeSignals({ title = '', summary = '', text = '' }) {
  const t = `${title} ${summary || text}`
  return {
    nl: NL_STRONG.test(t) || NL_CASE.test(t) || NL_PARTIES.test(t),
    foreign: FOREIGN_EXTRA.test(t) || BE.test(t) || BE_CASE.test(t),
  }
}

// Is dit bericht Binnenland? In deze volgorde (de eerste die geldt, beslist):
//  1. Een Nederlandse bron zet het zelf onder Binnenland of Politiek (URL of rubriek): ja, tenzij er
//     een buitenlandse plek in kop of intro staat zonder sterk Nederlands bezit (AD over Chili).
//  2. Sport, cultuur en games: nee (eigen soort). Een Nederlandse bron die het zelf onder Buitenland
//     zet: nee.
//  3. Sterk Nederlands bezit in kop of intro: ja, ook bij een buitenlandse plek ("Premier Jetten bij
//     G20-top in Johannesburg") en ook uit een buitenlandse bron (de Guardian over Wilders).
//  4. Geen Nederlandse bron: nee (Vlaamse /binnenland/ is België).
//  5. Een buitenlandse plek, land of naam, of het verhaal bestaat vooral uit buitenlandse bronnen
//     (`storyForeign`): nee.
//  6. Anders: ja (een Nederlandse krant over iets zonder buitenland).
// `foreign`: wat desksOf al uit de tekst haalde (buitenland, VS, Midden-Oosten, Oekraïne); los
// aangeroepen rekent isBinnenland het zelf uit.
const textForeignOf = ({ title = '', summary = '', text = '', cats = '' }) => {
  const t = `${title} ${summary || text} ${cats}`
  return RE.oekraine.test(t) || RE.middenoosten.test(t) || RE.vs.test(t) || RE.buitenland.test(t)
}
export function isBinnenland(it, { storyForeign = false, foreign = textForeignOf(it) } = {}) {
  const home = NL_HOME.has(it.source)
  const sig = placeSignals(it)
  const abroad = foreign || sig.foreign
  const sec = `${it.section || ''} ${it.url || ''}`.toLowerCase()
  if (home && /binnenland|\/politiek\//.test(sec) && (!abroad || sig.nl)) return true
  if (ownKind(it)) return false
  if (home && /buitenland|\/world\//.test(sec) && !sig.nl) return false
  if (sig.nl) return true
  if (!home) return false
  if (abroad || storyForeign) return false
  return true
}

// Een verhaal gaat vooral over het buitenland als minder dan de helft van zijn bronnen Nederlands is
// (het NOS-stuk over de dood van Patrick Stewart, tussen NYT, Variety en de Guardian).
export function storyForeignOf(items = []) {
  const src = new Set(items.map((i) => i.source))
  let nl = 0
  for (const s of src) if (NL_HOME.has(s)) nl++
  return nl * 2 < src.size
}

// Rubrieken van één bericht. `section` is de rubriek die de bron zelf meegeeft (de Volkskrant).
// `storyForeign`: het bericht hoort bij een verhaal van vooral buitenlandse bronnen (zie deskOfStory).
// Een bericht verandert niet tijdens het samenstellen: de uitkomst wordt per bericht onthouden (de
// patronen zijn het duurste deel van de selectie). Niet wijzigen wat terugkomt.
const memo = new WeakMap()
export function desksOf(it, { storyForeign = false } = {}) {
  if (!it || typeof it !== 'object') return deskSet(it || {}, storyForeign)
  let m = memo.get(it)
  if (!m) memo.set(it, (m = {}))
  const k = storyForeign ? 'f' : 'n'
  return m[k] || (m[k] = deskSet(it, storyForeign))
}
function deskSet(it, storyForeign) {
  const { title = '', summary = '', text = '', url = '', section = '', cats = '' } = it
  const t = `${title} ${summary || text} ${cats}`
  const out = new Set()
  const sec = `${section} ${url}`.toLowerCase()
  if (RE.oekraine.test(t)) out.add('oekraine')
  if (RE.middenoosten.test(t)) out.add('middenoosten')
  if (RE.vs.test(t)) out.add('vs')
  if (RE.wetenschap.test(t) || /wetenschap|\/science\/|\/health\//.test(sec)) out.add('wetenschap')
  const specific = out.has('oekraine') || out.has('middenoosten') || out.has('vs')
  const textForeign = specific || RE.buitenland.test(t)
  if (isBinnenland(it, { storyForeign, foreign: textForeign })) {
    out.add('binnenland') // Nederland gaat voor: een Nederlandse speler in het buitenland is Binnenland
  } else if (!specific && (textForeign || /buitenland|\/world\//.test(sec) || placeSignals(it).foreign || VL_HOME.has(it.source))) {
    out.add('buitenland')
  }
  return out
}

// De rubriek van een verhaal uit zijn berichten (voor iedereen gelijk): elk bericht in de context van
// het verhaal (storyForeignOf).
export function storyDesks(items = []) {
  const storyForeign = items.length > 1 && storyForeignOf(items)
  return items.map((i) => desksOf(i, { storyForeign }))
}
export const deskOfStory = (items = []) => primaryDesk(storyDesks(items))

// Waar gaat een verhaal vooral over? De rubriek die bij de meeste publicaties terugkomt;
// bij gelijkspel wint de specifiekere (Oekraïne en Midden-Oosten vóór VS, VS vóór buitenland).
const PRIORITY = ['oekraine', 'middenoosten', 'wetenschap', 'vs', 'buitenland', 'binnenland']
export function primaryDesk(itemDesks = []) {
  const count = {}
  for (const set of itemDesks) for (const d of set) count[d] = (count[d] || 0) + 1
  let best = null
  for (const d of PRIORITY) if (count[d] && (!best || count[d] > count[best])) best = d
  // Alleen als minstens de helft van de publicaties erover gaat (één losse vermelding telt niet).
  return best && count[best] * 2 >= itemDesks.length ? best : null
}

// Hoe belangrijk "van het moment": dekking telt het zwaarst, versheid geeft een duw.
export function weight({ sourceCount = 1, ownCount = 1, latestAt }, now = Date.now()) {
  const h = latestAt ? (now - Date.parse(latestAt)) / 36e5 : 99
  return (ownCount > 0 ? 100 : 0) + sourceCount * 4 + (h <= 3 ? 4 : h <= 6 ? 3 : h <= 12 ? 1 : 0)
}
