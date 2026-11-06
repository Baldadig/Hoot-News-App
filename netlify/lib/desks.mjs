import { countriesIn, usPoliticsIn } from '../../shared/article-signals.mjs'
// Rubrieken voor de editie — pure functies (getest in tests/desks.test.mjs).
// Elke editie probeert per rubriek het belangrijkste verhaal van het moment te hebben:
// binnenland, buitenland, VS, Midden-Oosten, Oekraïne en wetenschap (plus, in feed.mjs,
// één verhaal van buiten je bubbel).
import { OTHER_SPORT, keywordTopics } from './topics.mjs'

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
const NL_CORP = W(['klm', 'albert heijn', 'asml', 'tata steel', 'abn amro', 'rabobank', 'aex', 'damrak'])
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
  return (it.mainTopics || it.topics || []).some(t => KIND_TOPICS.has(t)) || KIND_PATH.test(it.url || '') || /^(sport|cultuur)/i.test(it.section || '') || OTHER_SPORT.test(it.title || '') || CULTURE_SPORT.test(visible)
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

// Redacteur 3b · ronde 4 · 2: een buitenlandse plaats of een buitenlands land als onderwerp in de kop. Alle landen (met
// bijvoeglijke vormen en enkele hoofdsteden) bovenop countriesIn; geen instellingen als de EU of de NAVO, want die gaan
// Nederland ook aan. Zonder Nederlands anker in dezelfde kop (Nederland, Nederlands, Dutch, of een Nederlandse plaats,
// instelling, persoon of bedrijf: placeSignals) is de kop buitenlands: "Paraguayaanse president treedt af" wel,
// "Nederlandse militairen naar Litouwen" niet.
const WORLD = W([
  'paraguay\\p{L}*', 'uruguay\\p{L}*', 'bolivia\\p{L}*', 'ecuador\\p{L}*', 'argentin\\p{L}*', 'chili', 'chileen\\p{L}*', 'chile', 'chilean\\p{L}*', 'peru\\p{L}*', 'colombia\\p{L}*', 'venezuela\\p{L}*', 'guyana', 'suriname\\p{L}*',
  'mexic\\p{L}*', 'guatemala\\p{L}*', 'honduras', 'hondura\\p{L}*', 'nicaragua\\p{L}*', 'el salvador', 'salvadoraan\\p{L}*', 'costa rica\\p{L}*', 'panama\\p{L}*', 'cuba\\p{L}*', 'haïti\\p{L}*', 'haiti\\p{L}*', 'dominicaanse republiek', 'dominican republic', 'jamaica\\p{L}*', 'puerto rico',
  'marokk\\p{L}*', 'morocc\\p{L}*', 'algerij\\p{L}*', 'algeri\\p{L}*', 'tunesi\\p{L}*', 'tunisi\\p{L}*', 'libi[eë]', 'libya\\p{L}*', 'libisch\\p{L}*', 'egypt\\p{L}*', 'soedan\\p{L}*', 'sudan\\p{L}*', 'ethiopi\\p{L}*', 'eritre\\p{L}*', 'somali\\p{L}*', 'keni\\p{L}*', 'kenya\\p{L}*', 'oeganda\\p{L}*', 'uganda\\p{L}*', 'tanzania\\p{L}*', 'rwanda\\p{L}*', 'burundi', 'congo\\p{L}*', 'nigeria\\p{L}*', 'ghana\\p{L}*', 'mali', 'malinees\\p{L}*', 'niger', 'tsjaad', 'chad', 'kameroen', 'cameroon', 'senegal\\p{L}*', 'ivoorkust', 'angola\\p{L}*', 'mozambique', 'zimbabw\\p{L}*', 'zambia\\p{L}*', 'namibi\\p{L}*', 'botswana', 'madagaskar', 'madagascar', 'zuid-afrika\\p{L}*', 'south africa\\p{L}*',
  'irak\\p{L}*', 'iraq\\p{L}*', 'syri\\p{L}*', 'jordani\\p{L}*', 'jemen\\p{L}*', 'yemen\\p{L}*', 'oman', 'qatar\\p{L}*', 'koeweit', 'kuwait\\p{L}*', 'bahrein', 'bahrain', 'emiraten', 'emirates', 'saoedi\\p{L}*', 'saudi\\p{L}*', 'afghanistan', 'afghaan\\p{L}*', 'afghan\\p{L}*', 'pakistan\\p{L}*',
  'kazachstan', 'kazakhstan', 'oezbekistan', 'uzbekistan', 'kirgizi\\p{L}*', 'kyrgyz\\p{L}*', 'tadzjikistan', 'tajikistan', 'turkmenistan', 'mongoli\\p{L}*', 'bangladesh\\p{L}*', 'sri lanka\\p{L}*', 'nepal\\p{L}*', 'myanmar', 'thailand', 'thai', 'thaise?', 'cambodja\\p{L}*', 'cambodia\\p{L}*', 'laos', 'vietnam\\p{L}*', 'maleisi\\p{L}*', 'malaysia\\p{L}*', 'singapore', 'indonesi\\p{L}*', 'filipijn\\p{L}*', 'philippine\\p{L}*', 'taiwan\\p{L}*', 'korea\\p{L}*', 'noord-korea\\p{L}*', 'zuid-korea\\p{L}*',
  'ierland', 'ireland', 'iers\\p{L}*', 'irish', 'schotland', 'scotland', 'schots\\p{L}*', 'scottish', 'wales', 'portug\\p{L}*', 'zwitser\\p{L}*', 'switzerland', 'swiss', 'oostenrijk\\p{L}*', 'austria\\p{L}*', 'tsjechi\\p{L}*', 'czech\\p{L}*', 'slowakij\\p{L}*', 'slovak\\p{L}*', 'sloveni\\p{L}*', 'kroati\\p{L}*', 'croatia\\p{L}*', 'bosni\\p{L}*', 'servi\\p{L}*', 'serbia\\p{L}*', 'montenegr\\p{L}*', 'kosov\\p{L}*', 'albani\\p{L}*', 'macedoni\\p{L}*', 'griek\\p{L}*', 'greece', 'greek', 'bulgari\\p{L}*', 'roemeni\\p{L}*', 'romania\\p{L}*', 'hongarij\\p{L}*', 'hongaar\\p{L}*', 'hungar\\p{L}*', 'moldavi\\p{L}*', 'moldova\\p{L}*', 'wit-rusland', 'belarus\\p{L}*', 'litouw\\p{L}*', 'lithuania\\p{L}*', 'letland', 'lets\\p{L}*', 'latvia\\p{L}*', 'finland', 'fins\\p{L}*', 'finnish', 'zweed\\p{L}*', 'zweden', 'sweden', 'swedish', 'noorweg\\p{L}*', 'noors\\p{L}*', 'norw\\p{L}*', 'denemarken', 'deens\\p{L}*', 'denmark', 'danish', 'ijsland\\p{L}*', 'iceland\\p{L}*', 'luxemburg\\p{L}*', 'luxembourg', 'malta', 'cyprus', 'georgi[eë]', 'armeni\\p{L}*', 'azerbeidzjan\\p{L}*', 'azerbaijan\\p{L}*',
  'nieuw-zeeland', 'new zealand', 'australi\\p{L}*', 'canad\\p{L}*', 'groenland\\p{L}*', 'greenland',
])
const NL_ANCHOR = W(['nederland\\p{L}*', 'dutch', 'holland\\p{L}*'])
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
  const ts = it.topics || []
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
  try { path = new URL(it.url).pathname.replace(/[-_/]/g,' ') } catch {}
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
export function weight({ sourceCount = 1, ownCount = 0, latestAt }, now = Date.now()) {
  const h = latestAt ? (now - Date.parse(latestAt)) / 36e5 : 99
  // Twee punten per gekozen uitgever, hooguit acht: voorkeur helpt, maar kan dekking niet overheersen.
  const chosen = Number.isFinite(ownCount) ? Math.min(4, Math.max(0, ownCount)) : 0
  return sourceCount * 4 + chosen * 2 + (h <= 3 ? 4 : h <= 6 ? 3 : h <= 12 ? 1 : 0)
}
