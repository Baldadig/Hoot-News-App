import { countriesIn, usPoliticsIn } from '../../shared/article-signals.mjs'
import { urlDelen } from '../../shared/url-delen.mjs'
// Rubrieken voor de editie — pure functies (getest in tests/desks.test.mjs).
// Elke editie probeert per rubriek het belangrijkste verhaal van het moment te hebben:
// binnenland, buitenland, VS, Midden-Oosten, Oekraïne en wetenschap (plus, in feed.mjs,
// één verhaal van buiten je bubbel).
import { OTHER_SPORT, keywordTopics, SHOWBIZZ_PATH } from './topics.mjs'

export const DESKS = ['binnenland', 'buitenland', 'vs', 'middenoosten', 'oekraine', 'wetenschap']
export const DESK_LABEL = { binnenland: 'Binnenland', buitenland: 'Buitenland', vs: 'VS', middenoosten: 'Midden-Oosten', oekraine: 'Oekraïne', wetenschap: 'Wetenschap', bubbel: 'Buiten je bubbel' }

// Binnenland is Nederland (feedback 31 oktober: Vlaamse /binnenland/, AD over Chili, NOS over Binance
// stonden onder Binnenland). Een bericht is Binnenland als het over Nederland gaat; de regel staat
// bij isBinnenland. Nederlandse bronnen: de catalogus `nl` en `regio`, plus het FD (economie, maar
// een Nederlandse krant). Vlaamse bronnen (`vl`, en Sporza) schrijven over België: dat is Buitenland.
// Vast in deze lijst (de rekenkern op de iPhone kent de catalogus niet); tests/desks.test.mjs houdt
// hem gelijk aan netlify/lib/sources.mjs.
// 13 november 2026: de nieuwe Nederlandse en Vlaamse bronnen (onderzoek, opinie, regionale omroepen, lokaal).
export const NL_HOME = new Set(['nos', 'nu', 'nrc', 'volkskrant', 'trouw', 'parool', 'ad', 'telegraaf', 'rtl', 'nd', 'ftm', 'haarlemsdagblad', 'nhd', 'leidschdagblad', 'dvhn', 'lc', 'limburger', 'tubantia', 'stentor', 'gelderlander', 'bd', 'ed', 'bndestem', 'pzc', 'fd',
  'zembla', 'argos', 'rd', 'caribischnetwerk', 'joop', 'groene', 'vn', 'sargasso', 'hpdetijd', 'wyniasweek', 'tpo', 'geenstijl', 'socialevraagstukken',
  'nhnieuws', 'omroepwest', 'rijnmond', 'rtvutrecht', 'omroepgelderland', 'rtvoost', 'rtvnoord', 'rtvdrenthe', 'omropfryslan', 'omroepbrabant', 'l1', 'omroepzeeland', 'duic', 'versbeton'])
export const VL_HOME = new Set(['vrt', 'standaard', 'demorgen', 'tijd', 'hln', 'nieuwsblad', 'gva', 'hbvl', 'sporza', 'apache', 'bruzz', 'humo'])

// Woordgrens die ook met ë, é, ï en á werkt (\b in JavaScript doet dat niet).
const W = (alts, flags = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts.join('|')})(?![\\p{L}\\p{N}])`, flags)

// Nederlands bezit, STERK: plaatsen, instituties, partijen en personen die alleen in Nederland
// bestaan, of "Nederland" zelf ("actief in Nederland"). Alleen "Nederlandse" of "Nederlander" is
// zwak en telt niet ("Nederlandse toerist in Chili" gaat over Chili). Clubs (Ajax, PSV) niet: sport.
const NL_PLACES = [
  'nederland', 'netherlands', 'the hague', 'dutch', 'holland', 'den haag', 'haagse?', "'s-gravenhage", 'randstad',
  'groningen', 'groningse?', 'friesland', 'friese', 'drenthe', 'drentse', 'overijssel', 'flevoland', 'gelderland', 'gelderse',
  'utrecht', 'utrechtse', 'noord-holland', 'zuid-holland', 'zeeland', 'zeeuwse?', 'noord-brabant', 'brabantse?', 'veluwe', 'achterhoek', 'twente', 'twentse',
  'amsterdam\\p{L}*', 'rotterdam\\p{L}*', 'eindhoven\\p{L}*', 'tilburg\\p{L}*', 'almere', 'breda', 'nijmegen', 'arnhem', 'haarlem', 'enschede', 'apeldoorn',
  'amersfoort', 'zaanstad', 'zaandam', "'s-hertogenbosch", 'den bosch', 'zwolle', 'maastricht', 'dordrecht', 'zoetermeer',   'deventer', 'alkmaar', 'venlo', 'leeuwarden', 'helmond', 'heerlen', 'hilversum', 'schiedam', 'lelystad',   'roermond', 'sittard', 'geleen', 'vlissingen', 'middelburg', 'terneuzen', 'zeeuws-vlaanderen', 'breskens', 'purmerend', 'hengelo', 'den helder', 'harderwijk', 'vught',
  'boxtel', 'ursem', 'overasselt', 'westland', 'schiphol', 'texel', 'ameland', 'terschelling', 'waddenzee', 'ijsselmeer', 'markermeer',
  'volendam', 'zandvoort', 'scheveningen', 'katwijk', 'noordwijk', 'wageningen', 'doetinchem', 'zutphen', 'roosendaal', 'bergen op zoom',
  'kerkrade', 'rijnmond', 'maasvlakte', 'afsluitdijk', 'zuidas\\p{L}*', 'bijlmer', 'osdorp', 'vinex',
  'wadden\\p{L}*', 'pieterburen', 'lauwersoog', 'hoofddorp', 'catshuis', 'binnenhof',
]
const NL_INST = [
  'tweede kamer', 'eerste kamer', 'kamerleden', 'kamerlid', 'kamervragen', 'kamermeerderheid', 'kamerdebat', 'staten-generaal', 'provinciale staten', 'statenlid',
  'kabinet-\\p{L}+', 'premier jetten', 'koning willem-alexander', 'willem-alexander', 'koningin máxima', 'prinses amalia', 'koningshuis',
  'rijkswaterstaat', 'rivm', 'knmi', 'prorail', 'nvwa', 'belastingdienst', 'toeslagen\\p{L}*', 'openbaar ministerie', 'raad van state',
  'hoge raad', 'algemene rekenkamer', 'marechaussee', 'nctv', 'aivd', 'mivd', 'de nederlandsche bank', 
  'prinsjesdag', 'miljoenennota', 'belastingplan', 'box 3', 'npo', 'ns-\\p{L}+', 'groningengas', 'koningsdag', 'elfstedentocht',
]
// Nederlandse bedrijven en de beurs: Nederlands bezit, maar ze werken ook in het buitenland. Met een
// buitenlandse plek bewijzen ze niets (feedback 31 oktober: "KLM-crew vol ongeloof" over een dode
// Lufthansa-medewerker in India stond onder Binnenland).
const NL_CORP_NAMES = ['klm', 'albert heijn', 'asml', 'tata steel', 'abn amro', 'rabobank', 'aex', 'damrak']
const NL_CORP = W(NL_CORP_NAMES)
// Voor lokaal nieuws van elders (localAbroad) ook de andere grote Nederlandse bedrijven en het adres van de beurs: een
// Nederlands bedrijf in een kop over Amerika is nieuws van hier (herstelkeuring 3, punt 7: Philips en de Amerikaanse
// justitie). Een eigen uitbreiding, zodat de rubriek (placeSignals) en de algemene Editie niet verschuiven.
const HERE_CORP = W([...NL_CORP_NAMES, 'beursplein( 5)?', 'philips', 'heineken', 'ahold\\p{L}*', 'akzo\\p{L}*', 'kpn', 'postnl', 'aegon', 'adyen', 'prosus', 'wolters kluwer', 'boskalis', 'vopak'])
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
  'pompeï', 'pompeii', 'paaseiland', 'easter island', 'noors\\p{L}*', 'zweeds\\p{L}*', 'tbilisi', 'georgisch\\p{L}*', 'abu dhabi', 'dubai', 'kyoto', 'bali',
  'binance', 'musk', 'koning charles', 'prins william', 'prins harry', 'prinses kate', 'koning frederik',
])
const BE = W([
  'belgi\\p{L}*', 'belg', 'belgen', 'vlaanderen', 'vlaams\\p{L}*', 'wallonië', 'waals\\p{L}*', 'antwerp\\p{L}*', 'gent', 'gentse', 'brugge', 'leuven', 'charleroi', 'hasselt',
  'mechelen', 'oostende', 'kortrijk', 'aalst', 'brussel\\p{L}*', 'koning filip', 'koningin mathilde', 'prinses elisabeth', 'de wever', 'bouchez', 'van bossuyt', 'verlinden', 'demir', 'n-va', 'vlaams belang', 'open vld', 'cd&v', 'abvv', 'acv',
])
const BE_CASE = W(['PVDA', 'MR', 'Vooruit', 'Luik'], 'u')

// Niet-Europese landen, werelddelen en bijvoeglijke naamwoorden (Nederlands en Engels): voor wie
// Politiek koos en Wereld niet, is een politiek stuk over Canada's premier geen Nederlandse of
// Europese politiek, ook niet als het uit een Europese bron komt (feedback 31 oktober: een interview met
// de Canadese premier Carney van Politico Europe was "Omdat je Politiek volgt"). Alleen de kop telt.
const NON_EUROPE = W([
  'canad\\p{L}*', 'chin(?:a|ese|ees)', 'chinezen', 'japan\\p{L}*', 'korea\\p{L}*', 'india', 'indian', 'indiase?', 'indiaas', 'pakistan\\p{L}*', 'bangladesh', 'azië', 'asia\\p{L}*', 'aziatisch\\p{L}*',
  'brazili\\p{L}*', 'brazil\\p{L}*', 'mexic\\p{L}*', 'argentin\\p{L}*', 'venezuela\\p{L}*', 'cuba\\p{L}*', 'colombia\\p{L}*', 'chileens\\p{L}*', 'peru', 'latijns-amerika', 'latin america',
  'australi\\p{L}*', 'nieuw-zeeland\\p{L}*', 'new zealand', 'afrika\\p{L}*', 'africa\\p{L}*', 'nigeria\\p{L}*', 'soedan', 'sudan\\p{L}*', 'egypt\\p{L}*', 'egypte', 'kenia', 'kenya\\p{L}*', 'ethiopi\\p{L}*', 'congo\\p{L}*',
  'iran\\p{L}*', 'israel\\p{L}*', 'israël', 'gaza', 'saudi\\p{L}*', 'taiwan\\p{L}*', 'afghan\\p{L}*', 'syri\\p{L}*',
  'kanad\\p{L}*', 'brasilien', 'mexiko', 'australien', 'vereinigte staaten', 'usa', 'états-unis', 'canadien\\p{L}*', 'verenigde staten', 'united states', 'amerika\\p{L}*', 'america\\p{L}*', 'u\\.s\\.',
])
export const isNonEuropean = (it) => NON_EUROPE.test(it?.title || '')

const RE = {
  oekraine: /\b(oekra\w*|ukrain\w*|zelensk\w*|kyiv|kiev|kyjiv|kharkiv|charkiv|olesjky|oleshky|odesa|donetsk|donbas|krim|crimea|dnipro|kramatorsk)\b/i,
  middenoosten: /\b(israël|israel\w*|gaza|hamas|hezbollah|libanon|lebanon|iran\w*|teheran|tehran|khamenei|netanyahu|syri\w*|jemen|yemen|houthi\w*|irak|iraq|saudi\w*|westelijke jordaanoever|west bank|jordani\w*|qatar|golfstaten|midden-oosten|middle east|palestijn\w*|palestin\w*)\b/i,
  vs: /\b(trump|biden|vance|witte huis|white house|washington|congres\w*|congress|senaat|senate|republikein\w*|republican\w*|democra(at|ten|tic|ts)|pentagon|hegseth|midterms?|tussentijdse verkiezingen|amerikaan\w*|american|verenigde staten|united states|u\.s\.|new york|california|californi\w*|texas|florida|chicago|supreme court|hooggerechtshof|fbi|ice)\b/i,
  wetenschap: /\b(wetenschap\w*|onderzoekers|onderzoek toont|studie|scientist\w*|researchers|science|study finds|nobelprijs (?:voor de )?(?:natuurkunde|scheikunde|geneeskunde)|nobel prize in (?:physics|chemistry|medicine)|klimaat\w*|climate|solar system|cosmic debris|light-years|nasa|esa|astronom\w*|ruimtevaart|telescoop|telescope|natuurkunde|physics|biolog\w*|genetic\w*|genetica|vaccin\w*|medicijn|geneesmiddel|quantum|kwantum|archeolog\w*|fossiel|fossil|aardbeving|earthquake|vulkaan|volcano|neurolog\w*|hersenonderzoek)\b/i,
  buitenland: /\b(frankrijk|france|french|frans\w*|parijs|paris|duitsland|germany|german|duits\w*|berlijn|berlin|brit\w*|engeland|england|london|londen|verenigd koninkrijk|united kingdom|spanje|spain|itali\w*|polen|poland|estland|estonia\w*|estse|senegal\w*|brazil\w*|belgi\w*|brussel|brussels|europese unie|european union|\beu\b|navo|nato|china|chinees|chinese|peking|beijing|taiwan|japan\w*|korea\w*|india\w*|pakistan|afghanistan|rusland|russia\w*|russisch\w*|poetin|putin|kremlin|moskou|moscow|turkije|turkey|erdogan|afrika|africa|nigeria|soedan|sudan|egypte|egypt|brazili\w*|mexico|venezuela\w*|maduro|argentini\w*|canada\w*|australi\w*|albani\w*|albane\w*|spaans\w*|pools\w*|turks\w*|griek\w*|zweed\w*|deens\w*|oostenrijk\w*|zwitser\w*|portug\w*|hongaar\w*|indiase|mexica\w*|canad\w*|egypt\w*|japans\w*|koreaan\w*|afrikaan\w*|europe\w*|europa|servi\w*|serbi\w*|hongarije|hungary|hungarian|orbán|griekenland|greece|zweden|sweden|swedish|noorwegen|norway|norwegian|denemarken|denmark|danish|oostenrijk|austria\w*|zwitserland|switzerland|ierland|ireland|portugal|tsjechi\w*|czech\w*|roemeni\w*|romania\w*|bulgarije|bulgaria\w*|georgi\w*|armeni\w*|azerbeidzjan|azerbaijan\w*|wit-rusland|belarus|filipijnen|philippine\w*|indonesi\w*|vietnam|thailand|myanmar|bangladesh|sri lanka|nepal|kenia|kenya\w*|ethiopi\w*|somali\w*|congo|zuid-afrika|south africa|haïti|haiti|cuba|colombia|chili|peru)\b/i,
}

// Sport, cultuur en games hebben hun eigen soort (kindOf in src/lib/personal.js): geen Binnenland.
const KIND_TOPICS = new Set(['voetbal', 'f1', 'wielrennen', 'tennis', 'wintersport', 'olympisch', 'muziek', 'film', 'boeken', 'kunst', 'games'])
// De boulevard (RTL) is showbizz (feedback 31 oktober: de voogdij van de ex-man van Halle Berry stond
// onder Binnenland); darts en andere sport zonder eigen onderwerp is sport (OTHER_SPORT).
const KIND_PATH = /\/(sport[\w-]*|voetbal|darts|cultuur|cultuur-media|entertainment|showbizz|boulevard|show|film|muziek|boeken|media)\//i
const CULTURE_SPORT = /\b(middenvelder|hattrick|hat-trick|scoorde|doelpunt|club.*contract|smaakmaker.*club|psg|premier league|concert\w*|halloweenkostuum|captain picard|star trek|patrick stewart|acteur|actrice|film|filmfestival)\b/i
// Een musicus in de kop is cultuur, net als een acteur (dubbelcheck 14 november, A6: de overleden drummer van Doe Maar
// stond onder Buitenland, omdat de intro Spanje noemde). Alleen in de kop, en niet als de kop een politieke plek heeft: een
// zanger die in de intro voorbijkomt, maakt een politiek stuk geen cultuur (herstelkeuring: de Obama-video's met Usher).
const MUSICIAN = /\b(\w*drummer|zanger|zangeres|gitarist|bassist|toetsenist|popgroep|popband|rockband|popster|rapper)\b/i
const musicianHead = (title) => MUSICIAN.test(title) && !usPoliticsIn(title)
// Misdaad of een rechtszaak in de kop: dan is een musicus of acteur in die kop een beroep, geen cultuur (tweede keuring
// van het herstel: "Rapper Boef veroordeeld voor mishandeling in Amsterdam" en "Zanger Marco Borsato vrijgesproken van
// ontucht" zijn Binnenland). Alleen het beroep valt weg; een rubriek als /boulevard/ of /cultuur/ in de link blijft gelden.
const CRIME_HEAD = /\b(drugging|murder\w*|convicted|arrested|acquitted|sentenced|verkracht\w*|ontucht|doodgeschoten|neergeschoten|doodgestoken|mishandel\w*|moord\w*|veroordeeld|vrijgesproken|opgepakt|aangehouden|gearresteerd|aangeklaagd|aanklacht|verdacht\w*|celstraf|gevangenisstraf|taakstraf|strafeis|rechtszaak|rechtbank|rechter|cassatie|hoger beroep|steekpartij|schietpartij)\b/i
const PROFESSION = /\b(acteur|actrice)\b/i
const PROFESSION_TOPICS = new Set(['muziek', 'film'])
const professionInCrime = (it) => CRIME_HEAD.test(it.title || '') && (MUSICIAN.test(it.title || '') || PROFESSION.test(it.title || ''))
const ownKind = (it) => {
  const visible = `${it.title || ''} ${it.summary || ''}`
  if (/^(?:recept:|wat eten we vandaag:)/i.test(it.title || '') || /\/(?:koken-en-eten|geld|vrouw|opmerkelijk)\//i.test(it.url || '')) return true
  // Een beroep in een misdaadbericht is geen cultuurrubriek.
  if (/\b(drugging|murder|verkrachting|doodgeschoten|mishandeld)\b/i.test(it.title || '') && countriesIn(it.title || '').length) return false
  const election = /\b(elections?|verkiezing\w*|midterms?|political texts|senaat|senate)\b/i.test(`${it.title || ''} ${(it.url || '').replace(/[-_/]/g, ' ')}`)
  // Oude feeds kunnen een sporttag uit een voetnoot bevatten. Een echte politieke hoofdzaak en
  // géén zichtbaar sport/cultuuronderwerp gaan dan vóór die oude tag (bv. verkiezingsopinie met f1).
  if (election && usPoliticsIn(visible + ' ' + (it.url || '').replace(/[-_/]/g, ' ')) && !keywordTopics(visible).some(t => KIND_TOPICS.has(t))) return false
  if (/\b(journal article|research finds|study finds)\b/i.test(it.title || '')) return false
  // Showbizz is een eigen soort, met dezelfde rubrieken als het onderwerp (SHOWBIZZ_PATH): NU.nl /achterklap/ werd
  // anders Binnenland (nachttest 14 november, R3).
  const path = KIND_PATH.test(it.url || '') || SHOWBIZZ_PATH.test(it.url || '') || /^(sport|cultuur)/i.test(it.section || '') || OTHER_SPORT.test(it.title || '')
  if (professionInCrime(it)) {
    // Het beroep telt niet, ook niet als onderwerp (muziek, film); de rest van de kop en intro wel.
    const rest = visible.replace(MUSICIAN, ' ').replace(PROFESSION, ' ')
    return path || (it.mainTopics || it.topics || []).some(t => KIND_TOPICS.has(t) && !PROFESSION_TOPICS.has(t)) || CULTURE_SPORT.test(rest)
  }
  return (it.mainTopics || it.topics || []).some(t => KIND_TOPICS.has(t)) || path || CULTURE_SPORT.test(visible) || musicianHead(it.title || '')
}


// Wat de kop en intro zeggen: sterk Nederlands bezit, en of er een buitenlandse plek, land of naam in
// staat (de patronen van de rubrieken plus FOREIGN_EXTRA en België).
// `home`: hetzelfde zonder de Nederlandse bedrijven (NL_CORP), het bezit dat ook bij een buitenlandse
// plek telt; `strong`: alleen NL_STRONG (plaatsen, instellingen, personen), zonder de namen met
// hoofdletter en de partijen, voor een Vlaamse bron (Ten Ede in Pijperzele is geen Ede).
export function placeSignals({ title = '', summary = '', text = '' }) {
  const t = `${title} ${summary || text}`
  const strong = NL_STRONG.test(t)
  const home = strong || NL_CASE.test(t) || NL_PARTIES.test(t)
  return {
    nl: home || NL_CORP.test(t),
    home,
    strong,
    foreign: FOREIGN_EXTRA.test(t) || BE.test(t.replace(/zeeuws-vlaanderen/gi, '')) || BE_CASE.test(t),
  }
}

// Redacteur 3b · ronde 4 · 2 (lijst verbreed in ronde 5 · 2): een buitenlands land als onderwerp in de kop. Alle landen
// van de wereld per werelddeel, op alfabet, met Nederlandse en Engelse namen en bijvoeglijke vormen, bovenop countriesIn
// (shared/article-signals.mjs) en de rubrieken Oekraïne en Midden-Oosten. Niet in de lijst: instellingen als de EU of de
// NAVO (die gaan Nederland ook aan), namen die ook een gewoon woord of een voornaam zijn (Chad, Jordan), de landen van het
// Koninkrijk (Aruba, Curaçao, Sint Maarten), en hoofdsteden en andere steden: een stad staat in een Nederlandse kop vaak
// als bestemming of vertrekplaats ("vlucht uit Boekarest vertrok niet") en maakt het onderwerp niet buitenlands. Zonder
// Nederlands anker in dezelfde kop (Nederland, Nederlands, Dutch, of een Nederlandse plaats, instelling, persoon of bedrijf:
// placeSignals) is de kop buitenlands: "Zuid-Amerikaanse president treedt af" wel, "Nederlandse militairen naar Litouwen"
// niet.
const L = '\\p{L}*'
const WORLD = W([
  // Europa
  `albani${L}`, 'andorra', `armeni${L}`, `azerbeidzjan${L}`, `azerbaijan${L}`, 'wit-rusland', `belarus${L}`, `bosni${L}`, `bulgar${L}`, `bulgaria${L}`,
  'cyprus', `cyprio${L}`, 'denemarken', `deens${L}`, 'denmark', 'danish', 'finland', 'fins', 'finse', 'finnish', `georgi[eë]`, `griek${L}`, 'greece', 'greek',
  `hongarij${L}`, `hongaar${L}`, `hungar${L}`, 'ierland', 'ireland', 'iers', 'ierse', 'irish', `ijsland${L}`, `iceland${L}`, `kosov${L}`, `kroati${L}`, `croatia${L}`,
  'letland', 'letse', 'latvia', `latvian${L}`, 'liechtenstein', `litouw${L}`, `lithuania${L}`, `luxemburg${L}`, 'luxembourg', `macedoni${L}`, 'malta', 'maltees', 'maltese',
  `moldavi${L}`, `moldova${L}`, 'monaco', `montenegr${L}`, `noorweg${L}`, 'noors', 'noorse', `norw${L}`, `oostenrijk${L}`, `austria${L}`, `portug${L}`,
  `roemeni${L}`, `romania${L}`, 'san marino', `servi${L}`, `serbia${L}`, `sloveni${L}`, `slowakij${L}`, `slowaak${L}`, `slovak${L}`,
  `tsjechi${L}`, 'tsjech', 'tsjechen', `czech${L}`, 'vaticaan', 'vatican', 'schotland', 'scotland', 'schots', 'schotse', 'scottish', 'wales', 'welsh', 'noord-ierland', 'northern ireland',
  'zweden', `zweed${L}`, 'sweden', 'swedish', `zwitser${L}`, 'switzerland', 'swiss',
  // Afrika
  `algerij${L}`, `algeri${L}`, `angola${L}`, `benin${L}`, 'botswana', 'burkina faso', 'burundi', `centraal-afrikaans${L}`, 'central african republic', 'comoren', 'comoros', `congo${L}`, 'djibouti',
  `egypt${L}`, `egypte${L}`, 'equatoriaal-guinee', 'equatorial guinea', `eritre${L}`, 'eswatini', `ethiopi${L}`, 'gabon', 'gambia', `ghana${L}`, `guinee${L}`, `guinea${L}`, 'ivoorkust', 'ivory coast',
  'kaapverdi[eë]', 'cape verde', `kameroen${L}`, 'cameroon', `keni${L}`, `kenya${L}`, 'lesotho', `liberia${L}`, `libi[eë]`, `libisch${L}`, `libya${L}`, 'madagaskar', 'madagascar', 'malawi', 'mali', 'malinees', 'malinese',
  `marokk${L}`, `morocc${L}`, `mauritani${L}`, 'mauritius', 'mozambique', `namibi${L}`, 'niger', `nigeria${L}`, 'oeganda', `oegandees${L}`, `uganda${L}`, `rwanda${L}`,
  `senegal${L}`, 'seychellen', 'seychelles', 'sierra leone', `somali${L}`, `soedan${L}`, `sudan${L}`, `tanzania${L}`, 'tsjaad', 'togo', `tunesi${L}`, `tunisi${L}`, `zambia${L}`,
  `zimbabw${L}`, `zuid-afrika${L}`, `south africa${L}`,
  // Azië
  'afghanistan', `afghaan${L}`, `afghan${L}`, 'bahrein', 'bahrain', `bangladesh${L}`, 'bhutan', 'brunei', 'cambodja', `cambodjaan${L}`, `cambodia${L}`, `filipijn${L}`, `philippine${L}`,
  'hongkong', 'hong kong', `indonesi${L}`, 'irak', `irakees${L}`, 'iraq', `iraqi${L}`, `jemen${L}`, `yemen${L}`, `jordani${L}`, 'kazachstan', 'kazakhstan',
  `kirgizi${L}`, `kyrgyz${L}`, 'koeweit', `kuwait${L}`, 'laos', `maleisi${L}`, `malaysia${L}`, 'maldiven', 'maldives', `mongoli${L}`, 'myanmar', 'birma', 'burma', `nepal${L}`,
  `korea${L}`, `noord-korea${L}`, `zuid-korea${L}`, 'oezbekistan', 'uzbekistan', 'oman', 'oost-timor', 'east timor', `pakistan${L}`,
  `qatar${L}`, 'singapore', `sri lanka${L}`, `syri${L}`, 'tadzjikistan', 'tajikistan', `taiwan${L}`, 'thailand', 'thai', 'thaise?', 'turkmenistan', 'emiraten', 'emirates',
  `vietnam${L}`,
  // Amerika
  `argentin${L}`, "bahama's", 'bahamas', 'barbados', 'belize', `bolivia${L}`, `boliviaan${L}`, 'chili', `chileen${L}`, 'chile', `chilean${L}`, `colombia${L}`, 'costa rica', `costa ricaan${L}`, `costa rican${L}`,
  'cuba', `cubaan${L}`, `cuban${L}`, 'dominicaanse republiek', 'dominican republic', `ecuador${L}`, 'el salvador', `salvadoraan${L}`, `salvadoran${L}`, `guatemala${L}`, 'guyana', 'haïti', 'haiti', `haïtiaan${L}`, `haitian${L}`,
  'honduras', `hondura${L}`, `jamaica${L}`, `mexic${L}`, `nicaragua${L}`, `panama${L}`, `paraguay${L}`, `peru${L}`, 'puerto rico', `suriname${L}`, 'trinidad', `uruguay${L}`,
  `venezuela${L}`, `groenland${L}`, 'greenland',
  // Oceanië
  'fiji', 'nieuw-zeeland', 'new zealand', `papoea${L}`, `papua${L}`, 'samoa', 'tonga',
])
const NL_ANCHOR = W(['nederland\\p{L}*', 'dutch', 'holland\\p{L}*'])
// Lokaal nieuws van elders (persona's 14 november, punt 7): Australische deelstaatpolitiek en een rechtszaak in New South
// Wales als vulsel, en puur Amerikaans binnenland (een ceremonie van Hegseth, de laatste zwarte senatoren uit Mississippi,
// het leiderschap van de Democraten in de Senaat) als opener of als Waar iedereen over schrijft. Lokaal van elders is:
// - Amerikaans binnenland: een Amerikaanse plek (rubriek VS, Amerikaanse politiek of een staat in de kop) zonder ander land,
//   werelddeel of internationaal onderwerp in de kop (Oekraïne, het Midden-Oosten, de EU, de NAVO, China: RE.buitenland);
// - een deelstaat of provincie van een ander land in de kop (Australië, Canada, de VS), of de binnenlandrubriek van een
//   buitenlandse titel in de link (/australia-news/, /us-news/, /uk-news/, /nyregion/), ook dan zonder ander land.
// Of het verhaal breder speelt (groot nieuws: majorNews, sinds de landenregel altijd met een tweede land), beslist de
// aanroeper: `items` zijn de stukken, de kop eerst. Brengen minstens twee verschillende uitgevers van hier het verhaal
// (`homePublishers`: de Nederlandse en Vlaamse uitgevers van de hele gebeurtenis, homePublishersOf in
// shared/edition-policy.mjs, geteld per uitgever en niet per land), dan is het geen lokaal nieuws van elders: dan vond de
// pers hier het nieuws (tweede keuring persona's 14 november: de uitslag van de Democraten bij NOS en NRC). Eén stuk van
// hier is niet genoeg, ook niet als dat de kop zelf is: een Nederlandse krant brengt ook een schietpartij in een
// Amerikaanse stad of een senaatsrace in een staat (derde keuring). Een Britse krant over Amerika telt niet: de Guardian
// en de BBC brengen ook Amerikaans binnenland. Een Amerikaanse staat of stad herkent countriesIn (dubbelcheck A6),
// één lijst voor de rubriek en voor lokaal nieuws van elders.
const OTHER_STATES = W(['new south wales', 'nsw', 'queensland', 'tasmani\\p{L}*', 'western australia', 'south australia', 'northern territory', 'victorian', 'ontario', 'quebec', 'québec', 'alberta', 'british columbia', 'manitoba', 'saskatchewan', 'nova scotia'])
const HOME_MIN = 2
const LOCAL_SECTION = /\/(australia-news|us-news|uk-news|nyregion|us\/politics|politics\/us)\//i
// De landen van een deelstaat of binnenlandrubriek: hun eigen naam maakt een stuk niet breder.
const OWN_COUNTRY = /\b(australi\w*|canad\w*|brit\w*|engeland|england|london|londen|verenigd koninkrijk|united kingdom|uk|vk|schotland|scotland|schots\w*|scottish|wales|welsh|noord-ierland|northern ireland)\b/gi
// Een land als bijvoeglijk naamwoord of inwonersnaam: één tabel voor elk land van countriesIn (shared/article-signals.mjs) en
// WORLD, met de Nederlandse en Engelse vormen (herstelkeuring 3 en de keuring daarna, punt 7: "Iraanse", "Venezolaanse",
// "Pakistaanse", "Turkish", "Polish" telden als Amerikaans binnenland). Een vaste, gesloten woordenschat, geen lijst van
// gevallen. Een vorm die de naam of de stam van het land al vangt (Japanse, Canadian), staat er toch: dan is elke rij af en
// hoeft niemand na te rekenen welke stam wat vangt. De sleutel is de landcode van countriesIn (voor de rest de naam), zodat
// het eigen land van een deelstaat of binnenlandrubriek niet meetelt; Schotland, Wales en Noord-Ierland staan onder gb.
// Niet in de tabel: de Verenigde Staten en Nederland zelf, en vormen die ook een gewoon woord of een voornaam zijn ("lets",
// "letten", "pool", "poles", "finn", "dane", "est", "indians", "georgian": ook de Amerikaanse staat). Alleen voor lokaal
// nieuws van elders (localAbroad), zodat de rubriek en de algemene Editie niet verschuiven.
const COUNTRY_FORMS = [
  // countriesIn
  ['in', 'indiaas', 'indiase', `indiër${L}`, 'indiers', 'indian'],
  ['fr', 'frans', 'franse', 'fransen', 'fransman', 'fransmannen', 'française', 'français', 'french', 'frenchman', 'frenchmen'],
  ['de', 'duits', 'duitse', 'duitser', 'duitsers', 'german', 'germans'],
  ['gb', 'brits', 'britse', 'brit', 'briten', 'british', 'briton', 'britons', 'engels', 'engelse', 'engelsen', 'engelsman', 'engelsmannen', 'english', 'englishman', 'englishmen'],
  ['be', 'belgisch', 'belgische', 'belg', 'belgen', 'belgian', 'belgians'],
  ['ua', `oekraïens${L}`, `oekraiens${L}`, `oekraïner${L}`, 'ukrainian', 'ukrainians'],
  ['ru', 'russisch', 'russische', 'rus', 'russen', 'russian', 'russians'],
  ['il', `israëlisch${L}`, `israelisch${L}`, `israëli${L}`, `israeli${L}`],
  ['ir', `iraans${L}`, `iraniër${L}`, 'iranian', 'iranians'],
  ['lb', 'libanees', 'libanese', 'libanezen', 'lebanese'],
  ['cn', 'chinees', 'chinese', 'chinezen'],
  ['jp', 'japans', 'japanse', 'japanner', 'japanners', 'japanese'],
  ['ca', 'canadees', 'canadese', 'canadezen', 'canadian', 'canadians'],
  ['br', `braziliaan${L}`, 'brazilian', 'brazilians'],
  ['es', 'spaans', 'spaanse', `spanjaard${L}`, 'spanish', 'spaniard', 'spaniards'],
  ['it', `italiaan${L}`, 'italian', 'italians'],
  ['pl', 'pools', 'poolse', 'polish'],
  ['ee', 'ests', 'estse', `estlander${L}`, 'estonian', 'estonians'],
  ['sn', 'senegalees', 'senegalese', 'senegalezen'],
  ['sa', `saoedisch${L}`, `saoediër${L}`, `saudisch${L}`, 'saudi', 'saudis'],
  ['nz', `nieuw-zeelands${L}`, `nieuw-zeelander${L}`, 'new zealander', 'new zealanders'],
  ['au', 'australisch', 'australische', `australiër${L}`, 'australian', 'australians'],
  ['tr', 'turks', 'turkse', 'turk', 'turken', 'turkish'],
  // Europa
  ['albanië', `albanees${L}`, 'albanese', 'albanezen', 'albanian', 'albanians'],
  ['andorra', 'andorrees', 'andorrese', 'andorran'],
  ['armenië', 'armeens', 'armeense', `armeniër${L}`, 'armenian', 'armenians'],
  ['azerbeidzjan', `azerbeidzjaan${L}`, `azerisch${L}`, 'azeri', 'azeris', 'azerbaijani', 'azerbaijanis'],
  ['belarus', `wit-russisch${L}`, 'wit-rus', 'wit-russen', `belarussisch${L}`, `belarus${L}`, 'belarusian', 'belarusians'],
  ['bosnië', 'bosnisch', 'bosnische', `bosniër${L}`, 'bosnian', 'bosnians'],
  ['bulgarije', 'bulgaars', 'bulgaarse', 'bulgaren', 'bulgarian', 'bulgarians'],
  ['cyprus', `cypriotisch${L}`, `cyprioot${L}`, 'cyprioten', 'cypriot', 'cypriots'],
  ['denemarken', 'deens', 'deense', 'denen', 'danish', 'danes'],
  ['finland', 'fins', 'finse', 'finnen', 'finnish', 'finns'],
  ['georgië', 'georgisch', 'georgische', `georgiër${L}`],
  ['griekenland', 'grieks', 'griekse', 'grieken', 'greek', 'greeks'],
  ['hongarije', 'hongaars', 'hongaarse', 'hongaren', 'hungarian', 'hungarians'],
  ['ierland', 'iers', 'ierse', 'ieren', 'irish', 'irishman', 'irishmen'],
  ['ijsland', 'ijslands', 'ijslandse', `ijslander${L}`, 'icelandic', 'icelander', 'icelanders'],
  ['kosovo', `kosovaar${L}`, 'kosovaren', 'kosovan', 'kosovar', 'kosovars'],
  ['kroatië', 'kroatisch', 'kroatische', 'kroaat', 'kroaten', 'croatian', 'croatians', 'croat', 'croats'],
  ['letland', 'letse', `letlander${L}`, 'latvian', 'latvians'],
  ['liechtenstein', `liechtensteins${L}`, `liechtensteiner${L}`],
  ['litouwen', 'litouws', 'litouwse', `litouwer${L}`, 'lithuanian', 'lithuanians'],
  ['luxemburg', 'luxemburgs', 'luxemburgse', `luxemburger${L}`, 'luxembourgish', `luxembourger${L}`],
  ['macedonië', 'macedonisch', 'macedonische', `macedoniër${L}`, 'macedonian', 'macedonians'],
  ['malta', 'maltees', 'maltese', 'maltezer', 'maltezers'],
  ['moldavië', 'moldavisch', 'moldavische', `moldaviër${L}`, 'moldovan', 'moldovans'],
  ['monaco', `monegask${L}`, 'monegasque'],
  ['montenegro', 'montenegrijns', 'montenegrijnse', `montenegrijn${L}`, 'montenegrin', 'montenegrins'],
  ['noorwegen', 'noors', 'noorse', `noorweger${L}`, 'norwegian', 'norwegians'],
  ['oostenrijk', 'oostenrijks', 'oostenrijkse', `oostenrijker${L}`, 'austrian', 'austrians'],
  ['portugal', 'portugees', 'portugese', 'portugezen', 'portuguese'],
  ['roemenië', 'roemeens', 'roemeense', `roemeen${L}`, `roemeniër${L}`, 'romanian', 'romanians'],
  ['san marino', 'sanmarinees', 'sanmarinese'],
  ['servië', 'servisch', 'servische', `serviër${L}`, 'serviers', 'serbian', 'serbians', 'serb', 'serbs'],
  ['slovenië', 'sloveens', 'sloveense', 'sloveen', 'slovenen', 'slovenian', 'slovenians', 'slovene', 'slovenes'],
  ['slowakije', 'slowaaks', 'slowaakse', 'slowaak', 'slowaken', 'slovak', 'slovaks', 'slovakian'],
  ['tsjechië', 'tsjechisch', 'tsjechische', 'tsjech', 'tsjechen', 'czech', 'czechs'],
  ['vaticaan', 'vaticaans', 'vaticaanse'],
  ['gb', 'schots', 'schotse', 'schotten', 'scottish', 'scot', 'scots'],
  ['gb', 'welsh', 'welshman', 'welshmen'],
  ['gb', 'noord-iers', 'noord-ierse'],
  ['zweden', 'zweeds', 'zweedse', 'zweed', 'zweden', 'swedish', 'swede', 'swedes'],
  ['zwitserland', 'zwitsers', 'zwitserse', 'zwitser', 'swiss'],
  // Afrika
  ['algerije', 'algerijns', 'algerijnse', `algerijn${L}`, 'algerian', 'algerians'],
  ['angola', 'angolees', 'angolese', 'angolezen', 'angolan', 'angolans'],
  ['benin', 'beninees', 'beninese', 'beninezen', 'beninese'],
  ['botswana', `botswaans${L}`, 'botswaan', 'botswanan', 'motswana', 'batswana'],
  ['burkina faso', 'burkinees', 'burkinese', 'burkinezen', 'burkinabe', 'burkinabé'],
  ['burundi', 'burundees', 'burundese', 'burundezen', 'burundian', 'burundians'],
  ['centraal-afrikaanse republiek', `centraal-afrikaans${L}`, 'central african'],
  ['comoren', 'comorees', 'comorese', 'comorian'],
  ['congo', 'congolees', 'congolese', 'congolezen'],
  ['djibouti', `djiboutiaans${L}`, 'djiboutian'],
  ['egypte', 'egyptisch', 'egyptische', `egyptenaar${L}`, 'egyptenaren', 'egyptian', 'egyptians'],
  ['equatoriaal-guinee', `equatoriaal-guinees${L}`, 'equatoguinean'],
  ['eritrea', 'eritrees', 'eritrese', 'eritreeërs', 'eritrean', 'eritreans'],
  ['eswatini', 'swazi', 'swazis'],
  ['ethiopië', 'ethiopisch', 'ethiopische', `ethiopiër${L}`, 'ethiopian', 'ethiopians'],
  ['gabon', 'gabonees', 'gabonese', 'gabonezen'],
  ['gambia', `gambiaan${L}`, 'gambian', 'gambians'],
  ['ghana', `ghanees${L}`, 'ghanese', 'ghanezen', 'ghanaian', 'ghanaians'],
  ['guinee', `guinees${L}`, 'guinese', 'guinean', 'guineans'],
  ['ivoorkust', `ivoriaan${L}`, 'ivorian', 'ivorians'],
  ['kaapverdië', `kaapverdiaan${L}`, 'cape verdean', 'cape verdeans'],
  ['kameroen', `kameroens${L}`, `kameroener${L}`, 'cameroonian', 'cameroonians'],
  ['kenia', `keniaan${L}`, 'kenyan', 'kenyans'],
  ['lesotho', 'basotho', 'mosotho'],
  ['liberia', `liberiaan${L}`, 'liberian', 'liberians'],
  ['libië', 'libisch', 'libische', `libiër${L}`, 'libyan', 'libyans'],
  ['madagaskar', `malagassisch${L}`, `malagassiër${L}`, 'malagasy'],
  ['malawi', `malawisch${L}`, `malawiër${L}`, 'malawian', 'malawians'],
  ['mali', 'malinees', 'malinese', 'malinezen', 'malian', 'malians'],
  ['marokko', 'marokkaans', 'marokkaanse', `marokkaan${L}`, 'moroccan', 'moroccans'],
  ['mauritanië', 'mauritaans', 'mauritaanse', `mauritaniër${L}`, 'mauritanian', 'mauritanians'],
  ['mauritius', `mauritiaan${L}`, 'mauritian', 'mauritians'],
  ['mozambique', `mozambikaan${L}`, 'mozambican', 'mozambicans'],
  ['namibië', 'namibisch', 'namibische', `namibiër${L}`, 'namibian', 'namibians'],
  ['niger', 'nigerees', 'nigerese', 'nigerezen', 'nigerien', 'nigeriens'],
  ['nigeria', `nigeriaan${L}`, 'nigerian', 'nigerians'],
  ['oeganda', 'oegandees', 'oegandese', 'oegandezen', 'ugandan', 'ugandans'],
  ['rwanda', `rwandees${L}`, 'rwandese', 'rwandezen', 'rwandan', 'rwandans'],
  ['senegal', 'senegalees', 'senegalese'],
  ['seychellen', `seychels${L}`, 'seychellois'],
  ['sierra leone', `sierra leoons${L}`, 'sierra leonean', 'sierra leoneans'],
  ['somalië', 'somalisch', 'somalische', `somaliër${L}`, 'somali', 'somalis'],
  ['soedan', 'soedanees', 'soedanese', 'soedanezen', 'sudanese'],
  ['tanzania', `tanzaniaan${L}`, 'tanzanian', 'tanzanians'],
  ['tsjaad', `tsjadisch${L}`, `tsjadiër${L}`, 'chadian', 'chadians'],
  ['togo', 'togolees', 'togolese', 'togolezen'],
  ['tunesië', 'tunesisch', 'tunesische', `tunesiër${L}`, 'tunisian', 'tunisians'],
  ['zambia', `zambiaan${L}`, 'zambian', 'zambians'],
  ['zimbabwe', `zimbabwaan${L}`, 'zimbabwean', 'zimbabweans'],
  ['zuid-afrika', `zuid-afrikaan${L}`, 'south african', 'south africans'],
  // Azië
  ['afghanistan', 'afghaans', 'afghaanse', 'afghaan', 'afghanen', 'afghan', 'afghans'],
  ['bahrein', `bahreins${L}`, `bahreiner${L}`, 'bahraini', 'bahrainis'],
  ['bangladesh', `bengaals${L}`, 'bengalen', 'bangladeshi', 'bangladeshis', 'bengali', 'bengalis'],
  ['bhutan', `bhutaans${L}`, 'bhutanese'],
  ['brunei', `bruneis${L}`, 'bruneian'],
  ['cambodja', `cambodjaan${L}`, 'cambodian', 'cambodians'],
  ['filipijnen', `filipijns${L}`, 'filipino', 'filipinos', 'filipina', 'philippine'],
  ['hongkong', `hongkongs${L}`, `hongkonger${L}`, 'hong konger', 'hong kongers'],
  ['indonesië', 'indonesisch', 'indonesische', `indonesiër${L}`, 'indonesian', 'indonesians'],
  ['irak', 'iraaks', 'iraakse', 'irakees', 'irakezen', 'iraqi', 'iraqis'],
  ['jemen', `jemenitisch${L}`, `jemeniet${L}`, 'jemenieten', 'yemeni', 'yemenis'],
  ['jordanië', 'jordaans', 'jordaanse', `jordaniër${L}`, 'jordanian', 'jordanians'],
  ['kazachstan', 'kazachs', 'kazachse', 'kazach', 'kazachen', 'kazakh', 'kazakhs', 'kazakhstani'],
  ['kirgizië', 'kirgizisch', 'kirgizische', 'kirgies', 'kirgiezen', 'kyrgyz'],
  ['koeweit', 'koeweits', 'koeweitse', 'koeweiti', `koeweiter${L}`, 'kuwaiti', 'kuwaitis'],
  ['laos', `laotiaan${L}`, 'laotian', 'laotians', 'lao'],
  ['maleisië', 'maleisisch', 'maleisische', `maleisiër${L}`, 'malaysian', 'malaysians'],
  ['maldiven', `maldivisch${L}`, `maldiviër${L}`, 'maldivian', 'maldivians'],
  ['mongolië', 'mongools', 'mongoolse', 'mongolen', 'mongolian', 'mongolians'],
  ['myanmar', 'birmees', 'birmese', 'birmezen', 'myanmarees', 'myanmarese', 'burmese'],
  ['nepal', `nepalees${L}`, 'nepalese', 'nepalezen', 'nepali', 'nepalis'],
  ['korea', `koreaan${L}`, 'korean', 'koreans', `noord-koreaan${L}`, `zuid-koreaan${L}`, 'north korean', 'south korean'],
  ['oezbekistan', 'oezbeeks', 'oezbeekse', 'oezbeek', 'oezbeken', 'uzbek', 'uzbeks'],
  ['oman', `omaans${L}`, `omaniet${L}`, 'omani', 'omanis'],
  ['pakistan', 'pakistaans', 'pakistaanse', `pakistaan${L}`, 'pakistani', 'pakistanis'],
  ['qatar', 'qatarees', 'qatarese', 'qatarezen', 'qatari', 'qataris'],
  ['singapore', 'singaporees', 'singaporese', 'singaporezen', 'singaporean', 'singaporeans'],
  ['sri lanka', `sri lankaan${L}`, `srilankaan${L}`, 'sri lankan', 'sri lankans'],
  ['syrië', 'syrisch', 'syrische', `syriër${L}`, 'syrian', 'syrians'],
  ['tadzjikistan', 'tadzjieks', 'tadzjiekse', 'tadzjiek', 'tadzjieken', 'tajik', 'tajiks'],
  ['taiwan', `taiwanees${L}`, 'taiwanese', 'taiwanezen'],
  ['thailand', 'thais', 'thaise', 'thai'],
  ['turkmenistan', `turkmeens${L}`, 'turkmeen', 'turkmenen', 'turkmen'],
  ['emiraten', 'emiraats', 'emiraatse', 'emirati', 'emiratis'],
  ['vietnam', `vietnamees${L}`, 'vietnamese', 'vietnamezen'],
  ['oost-timor', `oost-timorees${L}`, 'timorese'],
  // Amerika
  ['argentinië', 'argentijns', 'argentijnse', `argentijn${L}`, 'argentine', 'argentinian', 'argentinians'],
  ['bahama\'s', `bahamaan${L}`, 'bahamian', 'bahamians'],
  ['barbados', `barbadiaan${L}`, 'barbadian', 'barbadians'],
  ['belize', `belizaan${L}`, 'belizean', 'belizeans'],
  ['bolivia', `boliviaan${L}`, 'bolivian', 'bolivians'],
  ['chili', 'chileens', 'chileense', 'chileen', 'chilenen', 'chilean', 'chileans'],
  ['colombia', `colombiaan${L}`, 'colombian', 'colombians'],
  ['costa rica', `costa ricaan${L}`, 'costa rican', 'costa ricans'],
  ['cuba', `cubaan${L}`, 'cuban', 'cubans'],
  ['dominicaanse republiek', 'dominicaans', 'dominicaanse', 'dominicanen', 'dominican', 'dominicans'],
  ['ecuador', `ecuadoraan${L}`, 'ecuadorian', 'ecuadorians'],
  ['el salvador', `salvadoraan${L}`, 'salvadoran', 'salvadorans'],
  ['guatemala', 'guatemalteeks', 'guatemalteekse', 'guatemalteek', 'guatemalteken', 'guatemalan', 'guatemalans'],
  ['guyana', `guyaan${L}`, 'guyanese'],
  ['haïti', `haïtiaan${L}`, `haitiaan${L}`, 'haitian', 'haitians'],
  ['honduras', 'hondurees', 'hondurese', 'hondurezen', 'honduran', 'hondurans'],
  ['jamaica', `jamaicaan${L}`, 'jamaican', 'jamaicans'],
  ['mexico', 'mexicaans', 'mexicaanse', `mexicaan${L}`, 'mexican', 'mexicans'],
  ['nicaragua', `nicaraguaan${L}`, 'nicaraguan', 'nicaraguans'],
  ['panama', `panamees${L}`, 'panamese', 'panamezen', 'panamanian', 'panamanians'],
  ['paraguay', `paraguayaan${L}`, 'paraguayan', 'paraguayans'],
  ['peru', `peruaan${L}`, 'peruvian', 'peruvians'],
  ['puerto rico', `puerto ricaan${L}`, 'puerto rican', 'puerto ricans'],
  ['suriname', 'surinaams', 'surinaamse', `surinamer${L}`, 'surinamese'],
  ['trinidad', `trinidadiaan${L}`, 'trinidadian', 'trinidadians'],
  ['uruguay', `uruguayaan${L}`, 'uruguayan', 'uruguayans'],
  ['venezuela', 'venezolaans', 'venezolaanse', 'venezolaan', 'venezolanen', 'venezuelan', 'venezuelans'],
  ['groenland', 'groenlands', 'groenlandse', `groenlander${L}`, 'greenlandic', 'greenlander', 'greenlanders'],
  // Oceanië
  ['fiji', `fijisch${L}`, `fijiër${L}`, 'fijian', 'fijians'],
  ['papoea-nieuw-guinea', `papoea${L}`, 'papua new guinean'],
  ['samoa', `samoaan${L}`, 'samoan', 'samoans'],
  ['tonga', `tongaan${L}`, 'tongan', 'tongans'],
].map(([c, ...forms]) => [c, W(forms)])
// "Holland" als achternaam is geen Nederlands anker (keuring na herstelkeuring 3: "Tom Holland" in NL_ANCHOR). Een woord met
// een hoofdletter direct ervoor maakt er een naam van, behalve een voorzetsel, lidwoord of windrichting ("naar Holland",
// "Visit Holland", "Noord Holland"). Alleen voor het anker van hier in localAbroad, zoals COUNTRY_FORMS.
const NAME_HOLLAND = /(?<![\p{L}\p{N}])(?!(?:In|Uit|Naar|Van|Voor|Met|En|De|Het|Een|Over|Via|Bij|Tegen|Om|Door|To|From|Of|For|And|The|A|At|Across|Around|Into|Near|Against|Beat|Beats|Visit|Team|Made|Noord|Zuid|North|South)\s)\p{Lu}[\p{Ll}'’.-]+\s+Holland(?![\p{L}\p{N}])/gu
const formsIn = (t, own = []) => COUNTRY_FORMS.some(([c, re]) => !own.includes(c) && re.test(t))
// Werelddelen en regio's, met naam en bijvoeglijke vorm, Nederlands en Engels (keuring 4 na herstelkeuring 3, punt 7: "Trump
// begint rondreis door Azië", "US strikes in the Caribbean", "Arab leaders meet Trump" en "Rubio visits the Balkans" telden
// als Amerikaans binnenland). Een vaste woordenschat zoals COUNTRY_FORMS. Afrika, Europa en het Midden-Oosten vangt
// RE.buitenland al deels; hier staan ook hun Engelse bijvoeglijke vormen. Een Amerikaanse bevolkingsgroep ("African
// American", "Aziatisch-Amerikaanse") is geen ander werelddeel: Amerikaans of Amerikaan direct erachter telt niet. Arctic als
// weerwoord ("Arctic blast hits Midwest") ook niet.
const REGIONS = new RegExp(W([
  `azi[eë]`, `aziat${L}`, 'asia', `asian${L}`, `afrika${L}`, `africa${L}`, 'arab', 'arabs', `arabi${L}`, `arabier${L}`,
  `latijns-amerika${L}`, `latin america${L}`, `zuid-amerika${L}`, `south america${L}`, `midden-amerika${L}`, `central america${L}`,
  `caribisch${L}`, `caraïb${L}`, `caraib${L}`, `caribbean${L}`, `balkan${L}`, `baltisch${L}`, 'baltic', `baltic state${L}`,
  `scandinavi${L}`, 'sahel', `koerd${L}`, `kurd${L}`, 'arctic(?!\\s+(?:blast|air|cold|chill|freeze|front|storm|weather))', `arctisch${L}`, `noordpool${L}`, `poolgebied${L}`,
]).source + '(?![\\s-]+(?:americ|amerikaan))', 'iu')
const beyondIn = (t, own = []) => countriesIn(t).some((c) => !own.includes(c)) || WORLD.test(t) || formsIn(t, own) || REGIONS.test(t) || RE.oekraine.test(t) || RE.middenoosten.test(t) || RE.buitenland.test(t) || /\b(UK|VK|EU|NAVO|NATO|VN|UN)\b/.test(t) || /\b(global\w*|world\w*|wereld\w*|internationa\w*|buitenland\w*|paus|pope|vaticaan|vatican)\b/i.test(t)
export function localAbroad(items = [], { desk = null, homePublishers = [] } = {}) {
  const head = items.find(Boolean)
  const t = String(head?.title || '')
  if (!t) return false
  const elsewhere = () => new Set(homePublishers).size >= HOME_MIN
  const usHere = desk === 'vs' || usPoliticsIn(t) || countriesIn(t).includes('us')
  // Een anker van hier in de kop maakt het geen lokaal nieuws van elders: Nederlands bezit (placeSignals), ook een Nederlands
  // bedrijf of de beurs (HERE_CORP), en een Nederlander of "Nederlandse" (NL_ANCHOR; Holland niet als achternaam).
  const here = t.replace(NAME_HOLLAND, ' ')
  const hereAnchor = () => placeSignals({ title: here }).home || HERE_CORP.test(here) || NL_ANCHOR.test(here)
  if (usHere) return !beyondIn(t, ['us']) && !hereAnchor() && !elsewhere()
  if (!(OTHER_STATES.test(t) || LOCAL_SECTION.test(String(head?.url || '').split('?')[0]))) return false
  return !beyondIn(t.replace(OWN_COUNTRY, ' '), ['au', 'ca', 'gb']) && !hereAnchor() && !elsewhere()
}

// Gaat dit stuk over België? Voor de rubriek boven een plek bij een lezer in Vlaanderen (persona's 14 november, punt 6: voor
// een Gentse lezer heette Belgisch nieuws Buitenland). Een Belgische plaats, instelling, persoon of partij in kop of intro
// (BE), of een Vlaamse bron die het zelf onder Binnenland of Politiek zet; nooit met een ander land, Oekraïne, het
// Midden-Oosten, Amerikaanse politiek of een Nederlands anker in de kop.
export function belgianSubject(it = {}) {
  const head = String(it.title || '')
  if (!head) return false
  if (countriesIn(head).some((c) => c !== 'be') || RE.oekraine.test(head) || RE.middenoosten.test(head) || usPoliticsIn(head) || NL_ANCHOR.test(head) || placeSignals({ title: head }).strong) return false
  const t = `${head} ${it.summary || ''}`.replace(/zeeuws-vlaanderen/gi, '')
  if (BE.test(t) || BE_CASE.test(t)) return true
  return VL_HOME.has(it.source) && /\/(binnenland|belgie|politiek|regio)\//i.test(`${it.section || ''} ${String(it.url || '').split('?')[0]}`)
}
export function foreignHead(title = '') {
  const t = String(title || '')
  if (!t || !(WORLD.test(t) || RE.oekraine.test(t) || RE.middenoosten.test(t) || countriesIn(t).some((c) => c !== 'nl'))) return false
  return !NL_ANCHOR.test(t) && !placeSignals({ title: t }).nl
}

// Nederlands bezit, ZWAK: woorden die in een Nederlandse krant meestal over Nederland gaan (de
// gemeente, de politie, "Nederlandse"), maar ook over elders kunnen gaan. Telt alleen bij een
// Nederlandse bron zonder buitenlandse plek (regel 6 hieronder), nooit alleen.
const NL_WEAK = W([
  'nederlands\\p{L}*', 'nederlander\\p{L}*', 'gemeente\\p{L}*', 'gemeentelijk\\p{L}*', 'burgemeester\\p{L}*', 'wethouder\\p{L}*', 'provincie\\p{L}*', 'provinciale', 'waterschap\\p{L}*',
  'politie\\p{L}*', 'agenten', 'brandweer\\p{L}*', 'rechtbank', 'kabinet', 'ministerie', 'staatssecretaris', 'minister van', 'vakbond\\p{L}*', 'fnv', 'cao\\p{L}*',
  'huisarts\\p{L}*', 'zorgverzekeraar\\p{L}*', 'basisschool', 'mbo', 'woningcorporatie\\p{L}*', 'huurders', 'asielzoekers\\p{L}*', 'azc', 'stikstof\\p{L}*',
])
// Onderwerpen (netlify/lib/topics.mjs) die bij een Nederlandse bron over Nederland gaan: Den Haag en
// de onderwerpen van Binnenland. Andere onderwerpen (AI, Big Tech, de beurs) zeggen niets over het land.
const NL_TOPICS = new Set(['nederland', 'wonen', 'zorg', 'onderwijs', 'misdaad', 'migratie', 'verkeer'])
const NL_SECTION = /binnenland|\/politiek\/|\/nederland\/|\/regio\/|\/112-?nieuws/
// Rubrieken van een Nederlandse krant die niet over het land gaan: tech, economie en de beurs,
// wetenschap, het magazine, lifestyle, opinie en columns, de puzzel. Daar is een stuk zonder bewijs
// geen Binnenland.
const NOT_HOME_SECTION = /(^|\s)(tech|economie|wetenschap|opinie|columns?)(\s|$)|\/(tech|economie|financiele-markten|bedrijfsleven|beurs|wetenschap|[\w-]*magazine|lifestyle|leven|boulevard|showbizz|opinie|columns?|columns-opinie|meningen|recepten|vacatures|partnercontent|varia|puzzels?|geld|vrouw|opmerkelijk|eten|ps|uit-in-[\w-]+|geloof|religie-filosofie|tijdgeest|samenleving|duurzaamheid-economie)\//

// Is dit bericht Binnenland? Binnenland is Nederland, en daar moet bewijs voor zijn: een Nederlandse
// bron maakt een stuk niet Nederlands (feedback 31 oktober: Apple die Nvidia inhaalt, Google en AI,
// de beursgang van Anthropic stonden onder Binnenland). In deze volgorde (de eerste die geldt, beslist):
//  1. Een Nederlandse bron zet het zelf onder Binnenland of Politiek (URL of rubriek): ja, tenzij er
//     een buitenlandse plek in kop of intro staat zonder sterk Nederlands bezit (AD over Chili).
//  2. Sport, cultuur en games: nee (eigen soort). Een Nederlandse bron die het zelf onder Buitenland
//     zet: nee.
//  3. Sterk Nederlands bezit in kop of intro: ja, ook bij een buitenlandse plek ("Premier Jetten bij
//     G20-top in Johannesburg"), maar dan moet het bezit in de kop staan (regels 1 tot 3) en is een
//     Nederlands bedrijf geen bewijs (KLM bij een dode Lufthansa-medewerker in India). Een Vlaamse bron
//     alleen met een Nederlandse plaats, instelling of persoon in de kop. Uit een
//     buitenlandse bron alleen zonder buitenlandse plek: de Guardian over Wilders wel, een Vlaams
//     royaltyrondje over Amalia én koning Charles niet.
//  4. Geen Nederlandse bron: nee (Vlaamse /binnenland/ is België).
//  5. Een buitenlandse plek, land of naam, of het verhaal bestaat vooral uit buitenlandse bronnen
//     (`storyForeign`): nee.
//  6. Ja met ander bewijs: een Nederlandse rubriek in de URL (/nederland/, /regio/, /112-nieuws/), een
//     onderwerp van Binnenland of Den Haag, of zwak bezit (de gemeente, de politie, "Nederlandse").
//  7. Zonder bewijs alleen een nieuwsbericht van een algemene Nederlandse of regionale krant (niet het
//     FD) zonder enig ander onderwerp dan die van Binnenland en Den Haag, en niet uit een rubriek als
//     tech, economie, het magazine of opinie (NOT_HOME_SECTION): de lijnbus in Hoogersmilde wel, een
//     Nederlandse krant over Apple, Google of AI niet (onderwerp AI of Big Tech, of de rubriek Tech).
// `foreign`: wat desksOf al uit de tekst haalde (buitenland, VS, Midden-Oosten, Oekraïne); los
// aangeroepen rekent isBinnenland het zelf uit.
const textForeignOf = ({ title = '', summary = '', text = '', cats = '' }) => {
  const t = `${title} ${summary || text} ${cats}`
  return RE.oekraine.test(t) || RE.middenoosten.test(t) || usPoliticsIn(t) || RE.buitenland.test(t)
}
export function isBinnenland(it, { storyForeign = false, foreign = textForeignOf(it) } = {}) {
  const home = NL_HOME.has(it.source)
  const sig = placeSignals(it)
  const abroad = foreign || sig.foreign
  // Met een buitenlandse plek moet het Nederlandse bezit in de kop staan: daar staat het onderwerp. Een
  // intro die meldt dat KLM niet naar Dubai vliegt, maakt een stuk over Iran geen Binnenland.
  // Een Nederlands bedrijf (KLM) bewijst dan niets, en een Vlaamse bron moet een echte Nederlandse plaats,
  // instelling of persoon in de kop hebben.
  const head = placeSignals({ title: it.title || '' })
  const nl = VL_HOME.has(it.source) ? head.strong : abroad ? head.home : sig.nl
  const sec = `${it.section || ''} ${it.url || ''}`.toLowerCase()
  if (ownKind(it)) return false
  if (home && /binnenland|\/politiek\//.test(sec) && (!abroad || nl)) return true
  if (home && /buitenland|\/world\//.test(sec) && !head.home) return false
  if (nl && (home || !abroad)) return true
  if (!home) return false
  if (abroad || storyForeign) return false
  // Het beroep in een misdaadbericht (muziek, film) is geen onderwerp dat Binnenland tegenhoudt (zie ownKind).
  const ts = (it.topics || []).filter((t) => !(PROFESSION_TOPICS.has(t) && professionInCrime(it)))
  if (NL_SECTION.test(sec) || ts.some((t) => NL_TOPICS.has(t)) || NL_WEAK.test(`${it.title || ''} ${it.summary || it.text || ''}`)) return true
  return it.source !== 'fd' && ts.every((t) => NL_TOPICS.has(t)) && !NOT_HOME_SECTION.test(sec)
}

// Een verhaal gaat vooral over het buitenland als minder dan de helft van zijn bronnen Nederlands is
// (het NOS-stuk over de dood van Patrick Stewart, tussen NYT, Variety en de Guardian).
export function storyForeignOf(items = []) {
  const votes = new Map()
  for (const item of items) {
    const ds = desksOf(item)
    const foreign = ['buitenland', 'vs', 'middenoosten', 'oekraine'].some(d => ds.has(d))
    if (!votes.has(item.source) || ds.has('binnenland')) votes.set(item.source, ds.has('binnenland') ? 'nl' : foreign ? 'int' : null)
  }
  const known = [...votes.values()].filter(Boolean)
  return known.length > 0 && known.filter(g => g === 'int').length * 2 > known.length
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
// Onderwerpplaats: zichtbaar bewijs uit kop, daarna expliciete URL-context, daarna intro.
// Dit is geen uitgeversland en geen gok op basis van de taal. Bewijs blijft inspecteerbaar.
export function subjectPlaceOf(it = {}) {
  const head = (it.title || '').replace(/\bPalestine Action\b/gi, 'activistengroep')
  const fromHead = countriesIn(head)
  const usElection = (fromHead.includes('us') && /\b(democra\w*|republic\w*|republikein\w*|senate|senaat)\b/i.test(head)) || (/\b(senate races|midterms)\b/i.test(head) && usPoliticsIn(`${head} ${it.summary || ''}`))
  if (usElection) return {countries:['us'],basis:'verkiezingsplaats',text:'United States',evidence:head}
  if (fromHead.length) return {countries:fromHead,basis:'kop',text:head}
  if (usPoliticsIn(head)) return {countries:['us'],basis:'kop-institutie',text:head}
  let path = ''
  path = (urlDelen(it.url)?.path || '').replace(/[-_/]/g,' ') // zonder URL-object (shared/url-delen.mjs)
  if (/\/us\//i.test(String(it.url || '').split('?')[0])) return {countries:['us'],basis:'bronrubriek',text:`United States ${head}`}
  const fromPath = countriesIn(path)
  if (fromPath.length) return {countries:fromPath,basis:'url',text:`${head} ${path}`}
  const intro = `${head} ${it.summary || it.text || ''} ${it.cats || ''}`
  return {countries:countriesIn(intro),basis:'intro-of-onbekend',text:intro}
}
function deskSet(it, storyForeign) {
  const { title = '', summary = '', text = '', url = '', section = '', cats = '' } = it
  const t = `${title} ${summary || text} ${cats}`
  const out = new Set()
  if (ownKind(it)) return out
  const sec = `${section} ${url}`.toLowerCase()
  const place = subjectPlaceOf(it)
  const headCountries = countriesIn(title.replace(/\bPalestine Action\b/gi, 'activistengroep'))
  const headHome = placeSignals({ title }).home
  const geoText = headHome ? title : place.text
  if (RE.oekraine.test(geoText)) out.add('oekraine')
  if (RE.middenoosten.test(geoText)) out.add('middenoosten')
  const usSection = /\/us\//.test(sec)
  // Een specifieke bronrubriek/slug kan de ontbrekende context in een korte kop leveren (midterms).
  const path = String(url).split('?')[0].replace(/[-_/]/g, ' ')
  if (usPoliticsIn(geoText) || ((!headCountries.length && !headHome) && (usSection || usPoliticsIn(path))) || countriesIn(geoText).includes('us')) out.add('vs')
  const education = /\b(leraar|basisschool|docent|onderwijs)\b/i.test(title) && !/\b(onderzoek|studie|research|study)\b/i.test(title)
  if (!education && (RE.wetenschap.test(title) || /wetenschap|\/science\/|\/health\//.test(sec) || /\b(journal article|scholarship|research finds|study finds)\b/i.test(t))) out.add('wetenschap')
  const specific = out.has('oekraine') || out.has('middenoosten') || out.has('vs')
  // Een land of stad uit countriesIn in de kop (Frankfurt, Keulen) is ook een buitenlandse plek, ook als
  // RE.buitenland die naam niet kent: anders werd de NOS over plunderingen in Frankfurt Binnenland.
  const textForeign = specific || RE.buitenland.test(geoText) || headCountries.some((c) => c !== 'nl')
  if (isBinnenland(it, { storyForeign, foreign: textForeign })) {
    out.add('binnenland') // Nederland gaat voor: een Nederlandse speler in het buitenland is Binnenland
  } else if (!specific && (textForeign || /buitenland|\/world\//.test(sec) || placeSignals(it).foreign || VL_HOME.has(it.source))) {
    // Een stuk van een Vlaamse bron blijft Buitenland: Belgisch nieuws noemt zelden een Belgische plek die we kennen (Geel,
    // het kernkabinet), en zonder deze regel ontsnapt het aan het plafond voor buitenland. Cultuur en sport hebben hun
    // eigen soort en komen hier niet (ownKind). Of Belgisch nieuws voor de Vlaamse lezer geen Buitenland heet, is een
    // besluit voor Alex (herstelkeuring dubbelcheck 14 november, A6).
    out.add('buitenland')
  }
  if (headHome && out.has('binnenland')) for (const d of ['buitenland', 'vs', 'middenoosten', 'oekraine']) if (!usPoliticsIn(title) && !RE[d]?.test(title)) out.delete(d)
  if (out.has('vs') && /\b(senate races|senaatsverkiezingen|midterms)\b/i.test(title)) { out.delete('middenoosten'); out.delete('oekraine') }
  if (headCountries.some(c => !['us','ua','il','ir','lb'].includes(c)) && /^(?:premier|duitse media|canad)/i.test(title)) { out.delete('vs'); out.delete('oekraine'); out.add('buitenland') }
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
// Leeftijd (13 november 2026, besluit van Alex: "Mijn persoonlijke editie"): naast de duw voor vers nieuws gaat er één punt
// af per vol uur boven AGE_FREE_H uur sinds het laatste stuk, hooguit AGE_MAX eraf. Een verhaal van gisteravond zakt zo
// onder even groot nieuws van vanochtend. Zonder `latestAt` telt het als oud (de volle straf).
export const AGE_FREE_H = 6
export const AGE_MAX = 12
const hoursSince = (latestAt, now) => (latestAt ? (now - Date.parse(latestAt)) / 36e5 : 99)
// De duw voor vers nieuws alleen (zonder dekking en zonder leeftijdsstraf): die valt weg voor een luchtig verhaal (CURIO_TIE).
export const freshBonus = (latestAt, now = Date.now()) => {
  const h = hoursSince(latestAt, now)
  return h <= 3 ? 4 : h <= 6 ? 3 : h <= 12 ? 1 : 0
}
export const agePenalty = (latestAt, now = Date.now()) => Math.min(AGE_MAX, Math.max(0, Math.floor(hoursSince(latestAt, now) - AGE_FREE_H)))
export function weight({ sourceCount = 1, ownCount = 0, latestAt }, now = Date.now()) {
  // Twee punten per gekozen uitgever, hooguit acht: voorkeur helpt, maar kan dekking niet overheersen.
  const chosen = Number.isFinite(ownCount) ? Math.min(4, Math.max(0, ownCount)) : 0
  return sourceCount * 4 + chosen * 2 + freshBonus(latestAt, now) - agePenalty(latestAt, now)
}
