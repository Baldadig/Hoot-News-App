import { cleanIntro, headlineFit } from '../../shared/edition-display.mjs'
import { coverageOf, majorNews, newsRejection, lightVideoFiller, allowedNews, cappedInternational, internationalNews, worldChosen, sportStory, exceptionalDutchSport, isGallery } from '../../shared/edition-policy.mjs'
import { eventScope, conflictingEvents } from '../../shared/article-signals.mjs'
// Verhalen (bundels), hoofdbericht en editie — pure functies, los van het ophalen,
// zodat ze te testen zijn (zie tests/).

import { DESKS, desksOf, primaryDesk, storyDesks, deskOfStory, storyForeignOf, weight } from './desks.mjs'

import { hash } from '../../shared/util.mjs'
import { profileOf, personalParts, sumParts, jitter, deskPlan, homeDesk, KERN, KERN_MIN, TEMPO_MIN_H, FRONT, FRONT_MIN, FRONT_BIG, FRONT_MAX, FOREIGN_DESKS, NL_OTHER_W, INT_MAX } from '../../shared/editor.mjs'
export { hash }

// Een onleesbare tijd telt als heel oud (anders geeft de vergelijking NaN en raakt de sortering,
// en daarmee het afbreken op tijd in buildStories, in de war).
const timeOf = (a) => Date.parse(a.publishedAt) || 0
export const byRecency = (a, b) => timeOf(b) - timeOf(a)

// Legacy-export voor oudere meettools; geeft geen bonus meer bij de kopselectie.
export const NL_SOURCES = new Set(['nrc', 'nos', 'volkskrant', 'tweakers'])

const deaccent = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
const norm = (s) => deaccent(String(s || '')).toLowerCase()

// ---------- 1. Woordoverlap in koppen (zelfde taal) ----------
const STOP = new Set(
  'de het een en van op in te dat die voor met als om aan bij uit ook naar maar nog wordt worden heeft hebben zijn was werd niet wel meer jaar tegen door over deze onze the and for with that this from have will your about into over after their than what when which were been they them these those where while would could should more most some such also only just like said says year week time news live video update kills killed dead dies death attack attacks near least people police officials official after says report reports doden dood mensen zeker politie volgens aanval nieuwe eerste first three nobel prize prijs nobelprijs wins wint winner winnaar'.split(
    ' '
  )
)
export function sigWords(title) {
  const out = new Set()
  for (const w of norm(title).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)) if (w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w)) out.add(w) // jaartallen en getallen zeggen niets
  return out
}
// Getallen van minstens twee cijfers die geen jaartal zijn ("38 opvarenden", "6,3 miljard"): twee stukken
// met hetzelfde getal in de tekst noemen vaak dezelfde gebeurtenis (sameSubject regel E).
export function numbersOf(text) {
  const out = new Set()
  for (const n of String(text || '').match(/\d+(?:[.,]\d+)?/g) || []) if (n.replace(/\D/g, '').length >= 2 && !/^(19|20)\d\d$/.test(n)) out.add(n.replace(',', '.'))
  return out
}
export function sharedCount(a, b) {
  let n = 0
  for (const w of a) if (b.has(w)) n++
  return n
}

// ---------- 2. Taaloverstijgend: namen, plaatsen en gebeurtenis-woorden ----------
// Namen zijn in beide talen gelijk ("Nidal Hasan", "New York"); gebeurtenis-woorden
// vertalen we met een kleine woordenlijst naar een gedeeld begrip.

// Verschillende schrijfwijzen → één naam.
const ALIAS = {
  vs: 'us', usa: 'us', amerika: 'us', amerikaanse: 'us', amerikaan: 'us', amerikanen: 'us', american: 'us', americans: 'us', america: 'us',
  rusland: 'russia', russische: 'russia', russen: 'russia', russian: 'russia', russians: 'russia',
  oekraine: 'ukraine', oekraiense: 'ukraine', ukrainian: 'ukraine',
  duitsland: 'germany', duitse: 'germany', german: 'germany',
  frankrijk: 'france', franse: 'france', french: 'france',
  brittannie: 'uk', britse: 'uk', british: 'uk', britain: 'uk', engeland: 'uk', england: 'uk',
  chinese: 'china', chinees: 'china',
  israelische: 'israel', israeli: 'israel', israelisch: 'israel', israelis: 'israel',
  iraanse: 'iran', iranian: 'iran',
  // "Braziliaanse" is het land, geen eigen naam: als sterke naam trok het een portret van een
  // campagneleider in het verhaal over de vlucht van Bolsonaro.
  brazilie: 'brazil', braziliaanse: 'brazil', braziliaans: 'brazil', brazilianen: 'brazil', brazilian: 'brazil', brazilians: 'brazil',
  nederlandse: 'nederland', dutch: 'nederland', netherlands: 'nederland',
  europese: 'europe', european: 'europe', europa: 'europe', eu: 'europe',
  navo: 'nato', vn: 'un',
  poetin: 'putin', zelenski: 'zelensky', zelenskyy: 'zelensky',
  witte: 'whitehouse', white: 'whitehouse',
  koreaanse: 'korea', koreaans: 'korea', noordkoreaanse: 'northkorea', zuidkoreaanse: 'southkorea', koreanen: 'korea', korean: 'korea', koreans: 'korea',
  // Voornamen van wereldleiders tellen als die leider (anders is "Donald" een sterke naam).
  donald: 'trump', benjamin: 'netanyahu', vladimir: 'putin', volodymyr: 'zelensky', emmanuel: 'macron', keir: 'starmer', friedrich: 'merz', recep: 'erdogan', narendra: 'modi', giorgia: 'meloni', viktor: 'orban', kamala: 'harris', joe: 'biden', elon: 'musk', jinping: 'xi',
}
// H6 (iii), alleen in de uitgebreide stand (`extended`, zie buildStories): landen en adjectieven van
// alle EU-landen (plus hoofdsteden die in het nieuws van vandaag stonden), Nederlands en Engels, naar
// één sleutel die als zwakke naam telt. "Pools" en "Poolse" waren anders twee sterke
// namen die samen al bijna een verhaal maakten, en "Poland" een derde die er niet bij kon.
const EU = {
  belgie: 'belgium', belgische: 'belgium', belgisch: 'belgium', belgen: 'belgium', belgium: 'belgium', belgian: 'belgium', belgians: 'belgium',
  bulgarije: 'bulgaria', bulgaarse: 'bulgaria', bulgaars: 'bulgaria', bulgaria: 'bulgaria', bulgarian: 'bulgaria',
  cyprus: 'cyprus', cypriotische: 'cyprus', cypriot: 'cyprus',
  denemarken: 'denmark', deense: 'denmark', deens: 'denmark', denen: 'denmark', denmark: 'denmark', danish: 'denmark', danes: 'denmark',
  estland: 'estonia', estse: 'estonia', estisch: 'estonia', estonia: 'estonia', estonian: 'estonia',
  finland: 'finland', finse: 'finland', fins: 'finland', finnen: 'finland', finnish: 'finland', finns: 'finland',
  griekenland: 'greece', griekse: 'greece', grieks: 'greece', grieken: 'greece', greece: 'greece', greek: 'greece', greeks: 'greece',
  hongarije: 'hungary', hongaarse: 'hungary', hongaars: 'hungary', hongaren: 'hungary', hungary: 'hungary', hungarian: 'hungary', hungarians: 'hungary',
  ierland: 'ireland', ierse: 'ireland', iers: 'ireland', ieren: 'ireland', ireland: 'ireland', irish: 'ireland',
  italie: 'italy', italiaanse: 'italy', italiaans: 'italy', italianen: 'italy', italy: 'italy', italian: 'italy', italians: 'italy',
  kroatie: 'croatia', kroatische: 'croatia', kroatisch: 'croatia', kroaten: 'croatia', croatia: 'croatia', croatian: 'croatia',
  letland: 'latvia', letse: 'latvia', lets: 'latvia', latvia: 'latvia', latvian: 'latvia',
  litouwen: 'lithuania', litouwse: 'lithuania', litouws: 'lithuania', lithuania: 'lithuania', lithuanian: 'lithuania',
  luxemburg: 'luxembourg', luxemburgse: 'luxembourg', luxembourg: 'luxembourg',
  malta: 'malta', maltese: 'malta',
  oostenrijk: 'austria', oostenrijkse: 'austria', oostenrijks: 'austria', oostenrijkers: 'austria', austria: 'austria', austrian: 'austria', austrians: 'austria',
  polen: 'poland', poolse: 'poland', pools: 'poland', poland: 'poland', polish: 'poland', poles: 'poland',
  portugal: 'portugal', portugese: 'portugal', portugees: 'portugal', portugezen: 'portugal', portuguese: 'portugal',
  roemenie: 'romania', roemeense: 'romania', roemeens: 'romania', roemenen: 'romania', romania: 'romania', romanian: 'romania', romanians: 'romania',
  slovenie: 'slovenia', sloveense: 'slovenia', sloveens: 'slovenia', slovenia: 'slovenia', slovenian: 'slovenia',
  slowakije: 'slovakia', slowaakse: 'slovakia', slowaaks: 'slovakia', slovakia: 'slovakia', slovak: 'slovakia', slovakian: 'slovakia',
  spanje: 'spain', spaanse: 'spain', spaans: 'spain', spanjaarden: 'spain', spain: 'spain', spanish: 'spain', spaniards: 'spain',
  tsjechie: 'czechia', tsjechische: 'czechia', tsjechisch: 'czechia', tsjechen: 'czechia', czechia: 'czechia', czech: 'czechia', czechs: 'czechia',
  zweden: 'sweden', zweedse: 'sweden', zweeds: 'sweden', sweden: 'sweden', swedish: 'sweden', swedes: 'sweden',
  // EU-hoofdsteden die als plaats in het nieuws van vandaag stonden. Geen buurlanden: "Servië" als
  // zwakke naam liet een fotoreportage uit het Servische verkiezingsverhaal vallen (clustering-2610).
  warschau: 'warsaw', warsaw: 'warsaw', wenen: 'vienna', vienna: 'vienna', lissabon: 'lisbon', lisbon: 'lisbon', athene: 'athens', athens: 'athens', boedapest: 'budapest', budapest: 'budapest', praag: 'prague', prague: 'prague', kopenhagen: 'copenhagen', copenhagen: 'copenhagen', stockholm: 'stockholm', dublin: 'dublin',
}
// Uitgebreide stand, naast de landen: één partij in twee talen ("Chinese Communistische Partij" /
// "Communist party"). Sterk, want de partij wijst wél een gebeurtenis aan (de zuiveringen van vandaag).
const PARTY = { communistische: 'communist', communistisch: 'communist', communist: 'communist', communists: 'communist' }
const ALIAS_EXT = { ...ALIAS, ...EU, ...PARTY }
// Uitgebreide stand: Nederlandse en Engelse spelling van dezelfde naam uit het Cyrillisch verschillen
// systematisch in "sj" tegenover "sh" ("Olesjky"/"Oleshky", "Poesjkin"/"Pushkin"). Eén spelling voor
// de sleutel; na de alias, zodat "Tsjechië" eerst gewoon Tsjechië wordt.
const translit = (k) => k.replace(/sj/g, 'sh')
// Te algemeen om op zichzelf een gebeurtenis aan te wijzen: landen, steden, regeringsleiders,
// diensten. Twee verhalen die alleen zo'n naam delen gaan niet samen (zie sameEvent).
const WEAK = new Set(
  'us russia ukraine germany france uk china israel iran nederland europe nato un putin zelensky trump biden harris vance netanyahu musk xi macron starmer merz erdogan modi meloni orban schoof pentagon congress senate senaat congres kremlin whitehouse ice fbi cia nasa who gaza taiwan india japan canada mexico brazil turkije turkey syria syrie venezuela korea northkorea southkorea texas california florida georgia carolina virginia ohio michigan arizona nevada pennsylvania wisconsin washington brussel brussels londen london parijs paris moskou moscow kyiv kiev berlijn berlin seoul busan pyongyang tokio tokyo peking beijing jeruzalem jerusalem teheran tehran amsterdam rotterdam'.split(
    ' '
  )
)
// Uitgebreide stand: de EU-sleutels (en Wall Street en Hongkong, plaatsen) zijn ook zwak.
const WEAK_EXT = new Set([...WEAK, ...Object.values(EU), 'wallstreet', 'hongkong'])
// H6 (iv), uitgebreide stand: een hoofdletterwoord van drie letters uit de woordenschat telt ook als
// naam ("Fab", "Leo", "Max"), maar niet als het een gewoon woord is dat in koppen (In Titelkast, na
// een dubbele punt) met een hoofdletter staat. Gemeten op de dagpool: "Man" (uit "Man Utd") maakte
// van een schietpartij in Amsterdam en een vonnis in Ronse één verhaal. "Hof" los is ook geen naam:
// "het Hof" staat dagelijks met hoofdletter in Nederlands en Belgisch rechtbanknieuws, en het hof in
// Den Haag en het hof in Arnhem zijn twee rechtbanken. Het Grondwettelijk Hof telt via de samengestelde
// naam (COMPOUND_EXT), niet via dit losse woord.
const COMMON_3 = new Set(
  'man men dag dit dat hoe wat wie kan wil dan ter wet zee weg bal kop oog nog ook nee wel zet mol pan dam vol tel zak kom hij zij wij ons mij jou hof cup one can are you our all get got off see she his yet way key isn big day war own bad hat fat few buy pay eat web hub led doe fee pat old new now how why who its has had was not but and the for too two ten six red top end run set put say ask let may yes far low out via per pro mid pre non ago sea bay oil'.split(
    ' '
  )
)
// Hoofdletterwoorden die geen naam zijn (dagen, maanden, titels, delen van namen, bronnen).
// Prijzen ook: de Ballon d'Or wijst net zo min als de Nobelprijs één gebeurtenis aan. Een stuk over
// Mbappé dat terloops "de Ballon d'Or" noemt, kwam anders in het verhaal over winnaar Kane terecht.
const NOT_A_NAME = new Set(
  'new the of van der den des het een and for with from north south east west noord zuid oost voor tegen saint san los las great united states verenigde staten house huis kamer eerste tweede president minister premier koning king queen prins prince paus pope major maj gen general sen rep dr mr mrs ms sir lord secretary department ministerie defense defensie monday tuesday wednesday thursday friday saturday sunday maandag dinsdag woensdag donderdag vrijdag zaterdag zondag january february march april may june july august september october november december januari februari maart mei juni juli augustus oktober republican republicans democrat democrats democratic republikeinen democraten gop times guardian bbc nos nrc npr volkskrant wired verge atlantic economist politico reuters associated press getty afp images photo photos foto video live update breaking opinion analyse analysis why how what when who where this that these those here there after before more most just also only nobel nobelprijs nobelcomite ballon prize prijs literature literatuur peace vrede force air royal city stad agent police politie court national international'.split(
    ' '
  )
)

// Gebeurtenis-woorden, Nederlands én Engels → één begrip. "rare" = zegt veel over wát er gebeurde.
const CONCEPTS = [
  ['execution', /\b(executie|geexecuteerd|execution|executed|execute)\b/, true],
  ['firingsquad', /\b(vuurpeloton|firing squad)\b/, true],
  ['livestream', /(livestream|live-stream|live uitzend|live uitgezonden|streamed live|live te zien)/, true],
  ['nobel', /\bnobel/, true],
  ['quake', /\b(aardbeving|earthquake)/, true],
  ['flood', /\b(overstroming|flood)/, true],
  ['hurricane', /\b(orkaan|hurricane|tyfoon|typhoon)/, true],
  ['ceasefire', /\b(wapenstilstand|staakt-het-vuren|ceasefire|truce)\b/, true],
  ['hostage', /\b(gijzel|hostage)/, true],
  ['sanctions', /\b(sanctie|sanction)/, true],
  ['tariffs', /\b(invoerheffing|importheffing|heffingen|tariff)/, true],
  ['merger', /\b(fusie|megafusie|overname|merger|acquisition|takeover)\b/, true],
  ['bankrupt', /\b(faillie|bankrupt)/, true],
  ['vaccine', /\bvaccin/, true],
  ['nuclear', /\b(kernwapen|kerncentrale|kernprogramma|nuclear|nucleair)/, true],
  ['derail', /\b(ontspoor|derail)/, true],
  ['planecrash', /\b(neergestort|vliegtuigcrash|plane crash|crashed)\b/, true],
  ['impeach', /\b(impeach|afzetting|afzettingsprocedure)/, true],
  ['shoot', /\b(schiet|schoot|neergeschoten|doodgeschoten|schietpartij|shoot|shoots|shot|shooting|gunman|schutter)\b/, false],
  ['dead', /\b(doden|dood|gedood|omgekomen|sterft|overleden|overlijdt|dies|died|dead|death|killed|kills)\b/, false],
  ['attack', /\b(aanval|aanvallen|aanslag|luchtaanval|attack|attacks|airstrike|strike|strikes|bombard\w*)\b/, false],
  ['arrest', /\b(arrest\w*|gearresteerd|opgepakt|aangehouden|detained)\b/, false],
  ['court', /\b(rechter|rechtbank|rechtszaak|vonnis|veroordeeld|hooggerechtshof|court|judge|trial|convicted|sentenced|verdict)\b/, false],
  ['charged', /\b(aangeklaagd|aanklacht|indicted|charged|indictment)\b/, false],
  ['election', /(\w*verkiezing\w*|\belection\w*|\bmidterm\w*|\bstembus|\bstemlokal\w*|\bhead to the polls)\b/, false],
  ['resign', /\b(aftreden|treedt af|stapt op|opgestapt|ontslagen|resign\w*|steps down|fired)\b/, false],
  ['fire', /\b(brand|branden|bosbrand\w*|wildfire\w*|blaze)\b/, false],
  ['protest', /\b(protest\w*|betoging\w*|demonstratie\w*|demonstrat\w*)\b/, false],
  ['police', /\b(politie|police|agent|agenten|officer|officers)\b/, false],
  ['military', /\b(leger|militair\w*|military|army|troops|troepen|soldier\w*|soldaat|soldaten)\b/, false],
  ['immigration', /\b(immigra\w*|migrant\w*|asiel\w*|asylum|deport\w*|uitgezet|uitzetting)\b/, false],
  ['child', /\b(kind|kinderen|child|children|\d+-jarig\w*|\d+-year-old)\b/, false],
  ['award', /\b(wint|winnaar|gewonnen|wins|winner|awarded|award)\b/, false],
  ['missile', /\b(raket\w*|missile\w*|rocket\w*|drone\w*)\b/, false],
]

// H6 (iii), uitgebreide stand: begrippen die de dagpool miste. De Binance-roof stond in zeven eentalige
// verhalen (NL én EN, "hack" en "roof" zijn geen gebeurtenis-woord), de alliantie van Canada en de EU in
// twee. Alleen in de uitgebreide stand, zodat het kenmerk in de gewone stand gelijk blijft.
const CONCEPTS_EXT = [
  ...CONCEPTS,
  ['hack', /\b(hack\w*|gehackt|cyberaanval\w*|cyberattack\w*|datalek|data breach|ransomware)\b/, true],
  ['theft', /\b(roof|beroofd|gestolen|diefstal|steal|stole|stolen|theft|heist|robbery|overval\w*)\b/, true],
  ['pact', /\b(akkoord|alliantie|verdrag|handelsakkoord|alliance|treaty|pact|trade deal)\b/, false],
  // De evacuatie van Olesjky stond in een Nederlands en een Engels verhaal; de zuiveringen in de
  // Chinese partij ook. Geen van beide heeft een gebeurtenis-woord uit de gewone lijst.
  ['evacuate', /\b(evacu\w*|geevacueerd|ontruim\w*)\b/, false],
  ['purge', /\b(zuivering\w*|gezuiverd|purge\w*|expels?|expelled|expulsion\w*)\b/, true],
  ['market', /\b(beurs\w*|aandelen|aandeel|nasdaq|aex|stock market|stocks|shares|selloff|sell-off|plunge\w*|kelder\w*|gekelderd)\b/, false],
]

// Samengestelde landnamen als één woord, zodat "Noord-" en "Zuid-" geen losse namen worden.
const COMPOUND = [
  [/\b(Noord|North)[- ]Korea\b/g, 'Northkorea'],
  [/\b(Zuid|South)[- ]Korea\b/g, 'Southkorea'],
]
// H6 (iii), uitgebreide stand: instituten in twee talen als één naam ("Grondwettelijk Hof",
// "Constitutioneel Hof", "constitutional court", "top court" → Constitutionalcourt), en Wall Street als
// één plaats (zwak, zie EU). De samengestelde naam krijgt ook het begrip `court` (zie signature).
const COMPOUND_EXT = [
  ...COMPOUND,
  [/\b(Grondwettelijk|Constitutioneel|Constitutionele|Grondwettelijke)\s+(Hof|hof)\b/g, 'Constitutionalcourt'],
  [/\b(Constitutional|constitutional|Top|top)\s+(Court|court|Tribunal|tribunal)\b/g, 'Constitutionalcourt'],
  [/\b(Hooggerechtshof|hooggerechtshof)\b/g, 'Supremecourt'],
  [/\b(Supreme|supreme)\s+(Court|court)\b/g, 'Supremecourt'],
  [/\b(Wall|wall)\s+(Street|street)\b/g, 'Wallstreet'],
  [/\bHong\s+Kong\b/g, 'Hongkong'],
]
// Een instituut is een naam zonder land: elk land heeft een grondwettelijk hof, elke Amerikaanse staat
// een Supreme Court. Als gedeelde sterke naam telt het alleen samen met een gedeelde zwakke naam
// (land, stad), en niet als beide stukken daarnaast een eigen plaats noemen die de ander niet kent:
// het hof van Israël en dat van Brazilië over een kieswet zijn twee rechtbanken, het Georgia Supreme
// Court en het Pennsylvania Supreme Court ook, al liggen beide in de VS (zie sharedStrong).
const INSTITUTES = new Set(['constitutionalcourt', 'supremecourt'])
const joinCompounds = (text, ext = false) => (ext ? COMPOUND_EXT : COMPOUND).reduce((t, [re, to]) => t.replace(re, to), String(text || ''))
const tokenize = (text, ext = false) => joinCompounds(text, ext).replace(/\b([A-Z])\.(?=[A-Z]\.)/g, '$1').replace(/\b([A-Z]{2,})\./g, '$1').replace(/[’']s\b/g, '').match(/[\p{L}\p{N}]+/gu) || []
const isCap = (w) => /^\p{Lu}\p{Ll}/u.test(w)
const isAcronym = (w) => /^\p{Lu}{2,6}$/u.test(w)
// Uitgebreide stand: ook een afkorting met cijfers ("G20", "RTX", "PS5"); "G20" was anders geen naam,
// en de geschrapte groepsfoto met Lavrov stond in vier verhalen.
const isAcronymExt = (w) => isAcronym(w) || /^\p{Lu}{1,3}\d{1,3}$/u.test(w)
// Koppen In Titelkast (NYT, Wired) zeggen niets over wat een naam is.
const isTitleCase = (title) => {
  const words = tokenize(title).filter((w) => w.length >= 4)
  return words.length >= 3 && words.filter(isCap).length / words.length >= 0.6
}

// Woordenschat van namen: woorden die midden in een gewone zin met een hoofdletter staan.
function nameVocabulary(articles, ext = false) {
  const vocab = new Set()
  const scan = (text) => {
    let sentenceStart = true
    // Samengestelde namen eerst samenvoegen: ze lopen over een spatie ("Grondwettelijk Hof").
    for (const part of (ext ? joinCompounds(text, true) : String(text || '')).split(/(\s+)/)) {
      if (!part.trim()) continue
      const words = tokenize(part)
      for (const w of words) {
        if (!sentenceStart && isCap(w) && w.length >= 3) vocab.add(norm(w))
        sentenceStart = false
      }
      if (/[.!?:;"“‘(]$/.test(part) || /^["“‘(]/.test(part)) sentenceStart = /[.!?:]["”’)]?$/.test(part)
    }
  }
  for (const a of articles) {
    if (!isTitleCase(a.title)) scan(a.title)
    scan(a.text || a.summary)
  }
  return vocab
}

// Verbindingswoorden binnen een naam ("Virgil van Dijk", "Ursula von der Leyen"): ze breken een reeks
// hoofdletterwoorden niet (zie `runs` in signature).
const CONNECT = new Set(['van', 'de', 'der', 'den', 'du', 'da', 'di', 'la', 'le', 'von', 'bin', 'al', 'el', 'y', 'of'])
// Een reeks: aaneengesloten sterke namen in één zinsdeel (tussen leestekens), zoals "Kylian Mbappé" of
// "Patrick Stewart". Twee stukken die alleen zo'n reeks delen, delen één persoon, niet twee namen.
const SEGMENT = /[^\p{L}\p{N}\s’'\-]+/u

// Kenmerk van één artikel: sterke namen, zwakke namen, gebeurtenis-begrippen.
// `ext` (H6, uitgebreide stand van buildStories): EU-landen en instituten via ALIAS_EXT/COMPOUND_EXT,
// hoofdletterwoorden van drie letters die in de woordenschat staan tellen ook ("Hof", "Fab"), en het
// kenmerk draagt `runs`: de reeksen sterke namen in kop en tekst (voor sameEvent regel i).
function signature(article, vocab, ext = false) {
  const alias = ext ? ALIAS_EXT : ALIAS
  const weakSet = ext ? WEAK_EXT : WEAK
  const minLen = ext ? 3 : 4
  const acr = ext ? isAcronymExt : isAcronym
  const concepts_ = ext ? CONCEPTS_EXT : CONCEPTS
  const raw = `${article.title}. ${article.text || article.summary || ''}`
  const strong = new Set()
  const weak = new Set()
  const known = new Set() // bekende algemene namen, ook uit koppen in Titelkast (alleen voor sameSubject)
  // De sleutel van een naam: de alias, in de uitgebreide stand ook in één spelling (translit).
  const aliasOf = (k) => (ext ? translit(alias[k] || k) : alias[k] || k)
  // De sterke sleutel van een woord, of null.
  const acronyms = new Set() // sleutels die uit een afkorting komen (XIV, PSG)
  const strongKey = (w) => {
    let key = null
    if (acr(w)) key = norm(w)
    // Alleen woorden mét hoofdletter die ook elders midden in een zin als naam voorkomen.
    else if (w.length >= minLen && isCap(w) && vocab.has(norm(w)) && !(w.length === 3 && COMMON_3.has(norm(w)))) key = norm(w)
    if (!key) return null
    key = aliasOf(key)
    if (NOT_A_NAME.has(key) || weakSet.has(key) || key.length < 3) return null
    if (acr(w)) acronyms.add(key)
    return key
  }
  for (const w of tokenize(raw, ext)) {
    if (isCap(w) || acr(w)) {
      const k = aliasOf(norm(w))
      if (weakSet.has(k)) known.add(k)
    }
    let key = null
    if (acr(w)) key = norm(w)
    else if (w.length >= minLen && isCap(w) && vocab.has(norm(w)) && !(w.length === 3 && COMMON_3.has(norm(w)))) key = norm(w)
    if (!key) continue
    key = aliasOf(key)
    if (NOT_A_NAME.has(key)) continue
    if (weakSet.has(key)) weak.add(key)
    else if (key.length >= 3) strong.add(key)
  }
  const text = norm(raw)
  const concepts = new Set()
  let rare = 0
  for (const [id, re, isRare] of concepts_) {
    if (re.test(text)) {
      concepts.add(id)
      if (isRare) rare++
    }
  }
  // `raw`: kop en tekst, alleen voor sameSubject regel E (subjectText, pas uitgerekend als het nodig is).
  const out = { eventScope: eventScope(article), words: sigWords(article.title), strong, weak, known, concepts, rareIds: new Set(concepts_.filter(([id, , r]) => r && concepts.has(id)).map(([id]) => id)), t: timeOf(article), raw }
  if (ext) {
    // Een samengesteld instituut is ook een rechtbank-begrip (het losse woord "court" is weg).
    if (strong.has('constitutionalcourt') || strong.has('supremecourt')) concepts.add('court')
    const runsOf = (text) => {
      const runs = []
      for (const part of joinCompounds(text, ext).split(SEGMENT)) {
        let run = []
        for (const w of tokenize(part)) {
          const k = strongKey(w)
          if (k) run.push(k)
          else if (!(run.length && CONNECT.has(norm(w)))) (run.length && runs.push(run), (run = []))
        }
        if (run.length) runs.push(run)
      }
      return runs
    }
    out.runs = runsOf(raw)
    out.titleRuns = runsOf(article.title)
    // Een naam van drie letters die alleen vóór een andere naam staat is een voornaam ("Kim Jong",
    // "Max Verstappen"): die telt niet apart, net als "Donald" (ALIAS). "Hof", "Fab 28" en "Leo XIV"
    // (een afkorting erachter is geen achternaam) blijven staan.
    const alone = new Set(out.runs.filter((run) => run.length === 1).map(([k]) => k))
    const firstName = (k) => out.runs.some((run) => run.some((x, j) => x === k && j < run.length - 1 && !acronyms.has(run[j + 1])))
    for (const k of [...strong]) if (k.length === 3 && !acronyms.has(k) && !alone.has(k) && firstName(k)) strong.delete(k)
    out.runs = out.runs.map((run) => run.filter((k) => strong.has(k))).filter((run) => run.length)
    out.titleRuns = out.titleRuns.map((run) => run.filter((k) => strong.has(k))).filter((run) => run.length)
  }
  return out
}

// Hoeveel verschillende namen delen twee kenmerken? Sterke namen die in a of in b in dezelfde reeks
// staan ("Kylian" en "Mbappé") tellen als één. Zonder `runs` (gewone stand) telt elke naam apart.
// `title`: alleen namen die in beide koppen staan (regel i): de tekst van een voorbeschouwing noemt
// alle clubs van het weekend, de kop zegt waar het stuk over gaat.
export function sharedEntities(a, b, title = false) {
  const inRuns = (runs) => new Set(runs.flat())
  const sa = title && a.titleRuns ? inRuns(a.titleRuns) : a.strong
  const sb = title && b.titleRuns ? inRuns(b.titleRuns) : b.strong
  const shared = [...sa].filter((k) => sb.has(k))
  if (!a.runs || !b.runs) return shared.length
  const parent = new Map(shared.map((k) => [k, k]))
  const find = (k) => {
    while (parent.get(k) !== k) k = parent.get(k)
    return k
  }
  for (const runs of [a.runs, b.runs]) for (const run of runs) {
    const ks = run.filter((k) => parent.has(k))
    for (let i = 1; i < ks.length; i++) parent.set(find(ks[i]), find(ks[0]))
  }
  return new Set(shared.map(find)).size
}

// Gedeelde sterke namen. In de uitgebreide stand telt een instituut (INSTITUTES) alleen mee als beide
// kenmerken ook een zwakke naam delen en niet elk een eigen, ongedeelde zwakke naam hebben (twee
// rechtbanken in twee plaatsen). In de gewone stand komt zo'n sleutel niet voor (COMPOUND_EXT).
function sharedStrong(a, b, ext = false) {
  const n = sharedCount(a.strong, b.strong)
  if (!ext || !n) return n
  const inst = [...a.strong].filter((k) => INSTITUTES.has(k) && b.strong.has(k)).length
  if (!inst) return n
  if (!sharedCount(a.weak, b.weak)) return n - inst
  const own = (x, y) => [...x.weak].some((k) => !y.weak.has(k))
  return own(a, b) && own(b, a) ? n - inst : n
}

const WORD_WINDOW = 48 * 60 * 60 * 1000
const EVENT_WINDOW = 36 * 60 * 60 * 1000
const NAMES_WINDOW = 12 * 60 * 60 * 1000 // H6 (i): twee namen gemeen is alleen vlak na elkaar genoeg

// Gaan twee artikelen over dezelfde gebeurtenis?
// `ext` (H6 (i), uitgebreide stand): twee stukken die binnen twaalf uur twee verschillende eigen namen
// in de kop delen (geen land, geen titelwoord, en niet één persoon met voor- en achternaam) gaan over
// hetzelfde, ook zonder gebeurtenis-woord: "Apple haalt Nvidia in" en "Apple Overtakes Nvidia". Zo'n
// paar heeft geen vertaalbaar werkwoord, en de woordregel ziet over de taalgrens niets. Alleen de kop:
// in de tekst noemt een voorbeschouwing alle clubs van het weekend (gemeten: één voetbalverhaal van
// twaalf bronnen over PSG, Arsenal én Liverpool).
export function sameEvent(a, b, ext = false) {
  if (conflictingEvents(a.eventScope, b.eventScope)) return false
  const dt = Math.abs(a.t - b.t)
  // Beide noemen namen, maar geen enkele dezelfde: twee gebeurtenissen van dezelfde soort
  // ("president erkent nederlaag bij verkiezingen" in Brazilië en in Servië).
  if (a.strong.size && b.strong.size && !sharedStrong(a, b, ext) && !sharedCount(a.weak, b.weak)) return false
  // Zelfde taal: ≥3 gedeelde kernwoorden in de kop én ≥40% van de kortste kop.
  if (dt <= WORD_WINDOW) {
    const n = sharedCount(a.words, b.words)
    if (n >= 3 && n / Math.min(a.words.size, b.words.size) >= 0.4) return true
  }
  if (dt > EVENT_WINDOW) return false
  // Uitgebreide stand: een instituut zonder gedeeld land telt niet als naam (sharedStrong).
  const strong = sharedStrong(a, b, ext)
  const weak = sharedCount(a.weak, b.weak)
  const concepts = sharedCount(a.concepts, b.concepts)
  const rare = sharedCount(a.rareIds, b.rareIds)
  // A. Twee gedeelde namen plus nog iets (voorkomt: zelfde persoon, andere gebeurtenis).
  if (strong >= 2 && strong + weak + concepts >= 3) return true
  // H6 (i). Twee verschillende namen in beide koppen, vlak na elkaar: zie boven.
  if (ext && strong >= 2 && dt <= NAMES_WINDOW && sharedEntities(a, b, true) >= 2) return true
  // B. Eén naam, hetzelfde soort gebeurtenis, en nog een aanknopingspunt.
  if (strong >= 1 && concepts >= 1 && weak + concepts >= 2) return true
  // C. Geen naam gemeen, maar een zeldzame combinatie van gebeurtenis-woorden.
  if (rare >= 2 && concepts >= 3 && weak + strong >= 1) return true
  // D. Zelfde taal, drie gedeelde kernwoorden in de kop en ook een gedeelde naam (lange koppen
  //    halen de 40% van de woordregel niet altijd).
  if (sharedCount(a.words, b.words) >= 3 && strong + weak >= 1) return true
  return false
}

// Voor de editie (niet voor het bundelen): gaan twee berichten over hetzelfde onderwerp van nu?
// Strenger dan sameEvent: twee algemene namen ("Israël", "Netanyahu") plus hetzelfde soort
// gebeurtenis ("verkiezingen") is genoeg om maar één plek te krijgen. Zo staan er geen drie stukken
// over één verkiezingsdag in tien verhalen.
const BROAD = new Set(['us', 'europe', 'un', 'nato', 'uk', 'trump', 'whitehouse', 'congress', 'nederland'])
const SUBJECT_WINDOW = 12 * 60 * 60 * 1000
// De kernwoorden en getallen van kop en tekst samen, één keer per kenmerk.
const textCache = new WeakMap()
const subjectText = (s) => {
  let t = textCache.get(s)
  if (!t) textCache.set(s, (t = { words: sigWords(s.raw), nums: numbersOf(s.raw) }))
  return t
}
export function sameSubject(a, b) {
  if (conflictingEvents(a.eventScope, b.eventScope)) return false
  if (sameEvent(a, b)) return true
  const dt = Math.abs(a.t - b.t)
  if (dt > EVENT_WINDOW) return false
  // E. Eén eigen naam gemeen die in een van de koppen staat, en kop plus tekst delen verder minstens vier
  //    kernwoorden, of drie en een getal: het nieuws van hetzelfde moment over dezelfde plek of persoon
  //    zonder gedeeld gebeurtenis-woord (feedback 31 oktober: "Rubberboot met tientallen migranten van zee
  //    gehaald bij Breskens" en "Hulpdiensten rukken uit voor boot voor Zeeuwse kust", allebei met 38
  //    opvarenden, stonden twee keer in één Editie).
  if (dt <= SUBJECT_WINDOW && a.raw !== undefined && b.raw !== undefined) {
    const names = [...a.strong].filter((k) => b.strong.has(k))
    if (names.some((k) => a.words.has(k) || b.words.has(k))) {
      const ta = subjectText(a)
      const tb = subjectText(b)
      const words = [...ta.words].filter((w) => tb.words.has(w) && !a.strong.has(w) && !b.strong.has(w)).length
      if (words >= 4 || (words >= 3 && sharedCount(ta.nums, tb.nums) >= 1)) return true
    }
  }
  const shared = [...a.known].filter((k) => b.known.has(k))
  const concepts = sharedCount(a.concepts, b.concepts)
  if (!concepts) return false
  // Twee gedeelde namen, of één met ook een gedeelde eigen naam: hetzelfde onderwerp.
  if (shared.length >= 2 || (shared.length >= 1 && sharedCount(a.strong, b.strong) >= 1)) return true
  // Eén naam alleen ("Brazilië" en "verkiezingen") alleen als het nieuws van hetzelfde moment is:
  // een portret van gisteren is geen tweede stuk over de vlucht van vandaag. Een heel brede naam
  // (de VS, Trump, Europa) is nooit genoeg: Amerikaanse verkiezingsverhalen zijn er vele.
  return dt <= SUBJECT_WINDOW && shared.some((k) => !BROAD.has(k))
}

// `extra`: berichten die wel een kenmerk krijgen maar niet meetellen voor de woordenschat van namen
// (de koppen van een vorige Editie, zie selectForReader).
// `extended`: de uitgebreide stand van H6 (zie buildStories); standaard uit, dan is het kenmerk gelijk
// aan vroeger.
export function signatures(articles, extra = [], { extended = false } = {}) {
  const vocab = nameVocabulary(articles, extended)
  return new Map([...articles, ...extra].map((a) => [a.id, signature(a, vocab, extended)]))
}

// Een bericht van meer dan een dag oud (een portret, een analyse van gisteren) is achtergrond:
// het wordt geen hoofdbericht zolang er recentere berichten in de bundel zitten.
// Een bericht zonder datum telt ook als achtergrond: we weten niet dat het vers is.
const STALE_AFTER = 24 * 60 * 60 * 1000
export const isStale = (item, now) => !!now && now - timeOf(item) > STALE_AFTER

// Volgorde van kandidaten voor het hoofdbericht: eigen/voorkeursbronnen, nieuws boven opinie,
// dan met preview, met beeld, en het nieuwste. Geen bonus voor land of taal van de uitgever.
// `preferred`: je voorkeursbronnen (de ster bij een bron); die gaan nog vóór je andere bronnen.
// `now`: het moment van samenstellen (zonder: geen achtergrond-regel).
export function leadCandidates(items, mainIds, preferred = null, now = null, { role = 'neutral' } = {}) {
  // Een opiniestuk is nooit het hoofdbericht als er een nieuwsbericht is.
  // Een podcast of liveblog is ook nooit het hoofdbericht (een promo, of over van alles tegelijk).
  // Achtergrond weegt zwaarder mee dan alle voorkeuren samen (27): een vers bericht gaat altijd voor.
  // Een fotogalerij of slideshow is nooit het hoofdbericht als er iets anders is (isGallery).
  const score = (i) => (i.type === 'opinie' ? -16 : 0) + (/\bpodcast\b/i.test(i.title || '') || isLive(i) ? -16 : 0) + (isStale(i, now) ? -32 : 0) + (isGallery(i) ? -48 : 0) + (preferred?.has(i.source) ? 12 : 0) + (mainIds.has(i.source) ? 8 : 0) + (cleanIntro(i.summary, i.author) ? 2 : 0) + (i.image ? 1 : 0) + (role === 'front' ? headlineFit(i.title) : 0)
  const scores = new Map(items.map(i => [i, score(i)]))
  return [...items].sort((a, b) => scores.get(b) - scores.get(a) || byRecency(a, b))
}

// Verhalen: verbonden groepen van artikelen over dezelfde gebeurtenis (≥2 bronnen).
// `registry` (item-id → { s: verhaal-id }) houdt de id stabiel als een bundel groeit of
// twee bundels samengaan; de afgevallen id's blijven vindbaar via `formerIds`.
// Dagoverzichten en liveblogs gaan over van alles tegelijk en trekken daardoor bundels aan elkaar.
const DIGEST = /^(wekdienst|liveblog|live:|podcast|nieuwsoverzicht|het nieuws van|the morning|morning briefing|evening briefing|what to know|five takeaways)/i
// Liveblogs ("LIVE | …", "▶ Live - …", "… latest", …/liveblog/…) volgen een heel onderwerp, niet
// één gebeurtenis: ze staan los in de Stroom en tellen niet mee in een verhaal.
const LIVE_TITLE = /^\W*live\b|\blive ?blog\b|\b(war|oorlog) (latest|live)\b|\blatest:|\blatest updates\b/i
export const isLive = (a) => LIVE_TITLE.test(a.title || '') || /\/live(blog)?[-/]|[-/]liveblog/i.test(a.url || '')
// Een grote bundel is pas één gebeurtenis als elk bericht met meerdere andere is verbonden (twee
// vanaf zes berichten, drie vanaf tien): wat er via één of twee schakels aan hangt (een analyse,
// een ander nieuwtje over dezelfde mensen) valt los en vormt eventueel een eigen verhaal.
const CORE_FROM = 6
const coreDegree = (size) => (size >= 10 ? 3 : 2)

// `keys`: geef elk verhaal zijn kenmerken mee (`keys`: de namen en gebeurtenis-begrippen van ál zijn
// stukken, gesorteerd). De server zet dit aan: zo weet een toestel, dat van een verhaal alleen de
// stukken uit de eigen bronnen kent, toch wat er in de vorige Editie al over geschreven was
// (developedSince). Standaard uit: dan is de uitvoer byte-gelijk aan vroeger (meetlat). De kenmerken
// voor `keys` staan altijd in de gewone stand, ook als het bundelen uitgebreid is: het toestel rekent
// developedSince op gewone signaturen (personal.js, en de iOS-bundel), en een gewone sleutel die in de
// uitgebreide stand anders heet of wegvalt ("wall" + "street" → Wallstreet zwak, "belgische" →
// belgium zwak, "olesjky" → oleshky) telde anders als nieuw: twee Nederlandse stukken die Wall Street
// noemen gaven in hun eentje een vals "Vervolg".
// `extended`: sameEvent gericht uitgebreid (aanvulling-pariteit-herhaling.md H6): (i) twee eigen
// namen binnen twaalf uur, (ii) een los stuk dat de kern van een groot verhaal noemt hoort erbij,
// (iii) EU-landen en instituten als één naam, (iv) namen van drie letters. De server en de dagreeks
// zetten dit aan; standaard uit, zodat de meetlat (buildStories + selectEdition) byte-gelijk blijft.
export function buildStories(articles, registry = {}, { mainIds = new Set(), keys = false, extended = false } = {}) {
  const list = articles.filter((a) => !DIGEST.test(a.title || '') && !isLive(a)).sort(byRecency)
  const sig = signatures(list, [], { extended })
  // `keys` in de stand van het toestel (zie boven), met de woordenschat van álle aangeboden berichten:
  // het toestel rekent zijn kenmerken ook over dagoverzichten en liveblogs.
  const keySig = keys ? signatures(articles) : sig
  const now = list.length ? timeOf(list[0]) : null // het nieuwste bericht: zo laat is het in deze feeds
  // 1. Alle paren die over dezelfde gebeurtenis gaan.
  const links = new Map(list.map((a) => [a.id, new Set()]))
  for (let i = 0; i < list.length; i++) {
    const si = sig.get(list[i].id)
    if (si.words.size < 3 && si.strong.size < 1) continue
    for (let j = i + 1; j < list.length; j++) {
      const sj = sig.get(list[j].id)
      if (si.t && sj.t && si.t - sj.t > WORD_WINDOW) break // gesorteerd op tijd
      if (sameEvent(si, sj, extended)) {
        links.get(list[i].id).add(list[j].id)
        links.get(list[j].id).add(list[i].id)
      }
    }
  }
  // 2. Groepen: verbonden berichten. 3. Grote groepen terug naar hun kern (zie CORE_DEGREE);
  //    wat los valt, vormt onderling opnieuw groepjes.
  const groups = new Map()
  const byId = new Map(list.map((a) => [a.id, a]))
  // In een grote bundel telt een verbinding alleen als nog een derde bericht met beide verbonden
  // is: één losse schakel (een reactie die over twee verkiezingen tegelijk gaat) trekt dan geen
  // twee gebeurtenissen meer aan elkaar.
  const embedded = (ids) => {
    const adj = new Map()
    for (const x of ids) adj.set(x, new Set([...links.get(x)].filter((y) => ids.has(y) && [...links.get(y)].some((z) => z !== x && ids.has(z) && links.get(x).has(z)))))
    return adj
  }
  const components = (ids, adj = links) => {
    const seen = new Set()
    const out = []
    for (const id of ids) {
      if (seen.has(id)) continue
      const comp = []
      const stack = [id]
      seen.add(id)
      while (stack.length) {
        const x = stack.pop()
        comp.push(x)
        for (const y of adj.get(x)) if (ids.has(y) && !seen.has(y)) (seen.add(y), stack.push(y))
      }
      out.push(comp)
    }
    return out
  }
  const settle = (ids) => {
    for (const comp of components(ids)) {
      if (comp.length < CORE_FROM) {
        groups.set(comp[0], comp.map((id) => byId.get(id)))
        continue
      }
      const core = new Set(comp)
      const adj = embedded(core)
      const need = coreDegree(comp.length)
      let pruned = true
      while (pruned) {
        pruned = false
        for (const x of [...core]) if ([...adj.get(x)].filter((y) => core.has(y)).length < need) (core.delete(x), (pruned = true))
      }
      const loose = new Set(comp.filter((x) => !core.has(x)))
      if (core.size >= 2) {
        const parts = components(core, adj)
        for (const part of parts) groups.set(part[0], part.map((id) => byId.get(id)))
      } else for (const x of core) loose.add(x)
      if (loose.size === comp.length) for (const id of comp) groups.set(id, [byId.get(id)]) // geen kern: allemaal los
      else if (loose.size) settle(loose)
    }
  }
  settle(new Set(list.map((a) => a.id)))
  // Verbonden zijn is geen gedeelde gebeurtenis. Twee dichte groepen kunnen via een paar
  // overzichtsstukken één component worden. Elke uiteindelijke groep houdt daarom een direct
  // verbonden anker én minstens tweederde onderlinge steun per lid. Het anker komt uit de meest
  // samenhangende buurt, niet uit de overzichtskop die toevallig de meeste losse verhalen noemt.
  const coherentParts = (ids) => {
    if (ids.length < 3) return [ids]
    const noConflicts = ids.every(a => ids.every(b => a === b || !conflictingEvents(sig.get(a).eventScope, sig.get(b).eventScope)))
    const common = field => [...sig.get(ids[0])[field]].filter(k => ids.every(id => sig.get(id)[field].has(k)))
    // Meertalige verslaggeving kan een verbinding missen terwijl de hele groep dezelfde concrete
    // namen of zeldzame gebeurteniscombinatie draagt. Dat inhoudelijke bewijs gaat vóór graafdichtheid.
    const counts = field => {
      const seen = new Map()
      for (const id of ids) for (const k of sig.get(id)[field]) seen.set(k, (seen.get(k) || 0) + 1)
      return [...seen.values()]
    }
    // Een grote gebeurtenis heeft ook achtergrondstukken zonder de naam in de kop. Behoud ze bij
    // een vrijwel overal genoemde concrete naam (85%) en een gedeeld gebeurtenistype (minstens de helft).
    // Dit is geen vrijstelling voor landen/leiders uit WEAK of voor algemene sportwoorden.
    const nucleus = counts('strong').some(n => n * 100 >= ids.length * 85)
      && counts('concepts').some(n => n * 2 >= ids.length)
    if (noConflicts && (ids.length < CORE_FROM || common('strong').length >= 2 || common('rareIds').length >= 2 || nucleus)) return [ids]
    const edge = (a, b) => links.get(a).has(b)
    const conflict = (a, b) => conflictingEvents(sig.get(a).eventScope, sig.get(b).eventScope)
    const coherent = (part) => part.every(a => part.every(b => a === b || !conflict(a, b)))
      && part.some(a => part.every(b => a === b || edge(a, b)))
      && part.every(a => part.filter(b => a !== b && edge(a, b)).length * 3 >= (part.length - 1) * 2)
    if (coherent(ids)) return [ids]
    const remaining = new Set(ids), out = []
    while (remaining.size) {
      const neighbourhood = a => {
        const ns = [...links.get(a)].filter(b => remaining.has(b))
        let closed = 0
        for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) if (edge(ns[i], ns[j])) closed++
        return { id: a, closed, possible: Math.max(1, ns.length * (ns.length - 1) / 2), degree: ns.length }
      }
      const ranked = [...remaining].map(neighbourhood).sort((a, b) =>
        b.closed * a.possible - a.closed * b.possible || b.degree - a.degree || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      const anchor = ranked[0].id, part = [anchor]
      remaining.delete(anchor)
      for (const { id } of ranked.slice(1)) if (edge(anchor, id) && coherent([...part, id])) {
        part.push(id)
        remaining.delete(id)
      }
      out.push(part)
    }
    // Een ontbrekende taalverbinding mag een concrete naam niet in twee verhalen breken.
    // Na samenvoegen blijft alleen de doorsnede van de kernen over: x → (x,y) → y wordt nooit
    // alsnog één keten. Algemene sport-/rubriekwoorden zijn geen naam van een gebeurtenis.
    const generic = new Set(['world', 'league', 'rugby', 'formula', 'formule', 'grand', 'prix', 'driver', 'drivers', 'race', 'marathon'])
    const namedCore = part => {
      const count = new Map()
      for (const id of part) for (const key of sig.get(id).strong) if (!generic.has(key)) count.set(key, (count.get(key) || 0) + 1)
      return new Set([...count].filter(([, n]) => n * 2 >= part.length).map(([key]) => key))
    }
    const merged = []
    for (const part of out) {
      const core = namedCore(part)
      const target = merged.find(g => [...core].some(k => g.core.has(k)) && part.every(a => g.ids.every(b => !conflict(a, b))))
      if (target) {
        target.core = new Set([...target.core].filter(k => core.has(k)))
        target.ids.push(...part)
      } else merged.push({ ids: part, core })
    }
    // Alleen ontbrekende naamherkenning (bijvoorbeeld een Nederlandse kop zonder vliegtuigtype)
    // is geen bewijs voor een tweede gebeurtenis. Zonder tegenstrijdige context zijn er minstens
    // twee verschillende inhoudelijke kernen nodig om de groep definitief te splitsen.
    if (noConflicts && merged.filter(g => g.core.size > 0).length < 2) return [ids]
    return merged.map(g => g.ids)
  }
  // De server gebruikt extended; de oude, gewone stand blijft de historische nulmeting.
  if (extended) for (const [gid, items] of [...groups]) {
    const parts = coherentParts(items.map(i => i.id))
    if (parts.length === 1) continue
    groups.delete(gid)
    for (const ids of parts) groups.set(ids[0], ids.map(id => byId.get(id)))
  }
  for (const g of groups.values()) g.sort(byRecency)

  // 4. (H6 ii, uitgebreide stand) Een los stuk dat de kern van een groot verhaal noemt, hoort erbij.
  if (extended) attachLoose(groups, list, sig)

  const stories = []
  const used = new Set()
  for (const items of groups.values()) {
    const sourceIds = new Set(items.map((i) => i.source))
    if (sourceIds.size < 2) continue
    const votes = {}
    for (const i of items) {
      const sid = registry[i.id]?.s
      if (sid) votes[sid] = (votes[sid] || 0) + 1
    }
    const known = Object.keys(votes).sort((a, b) => votes[b] - votes[a])
    let id = known[0] || 's' + hash(items[items.length - 1].id)
    while (used.has(id)) id = 's' + hash(id + '+')
    used.add(id)
    const own = items.filter((i) => mainIds.has(i.source))
    const names = []
    for (const i of items) if (!names.includes(i.sourceName)) names.push(i.sourceName)
    stories.push({
      id,
      formerIds: known.slice(1).filter((x) => x !== id),
      leadId: leadCandidates(items, mainIds, null, now)[0].id,
      itemIds: items.map((i) => i.id),
      sourceCount: sourceIds.size,
      ...coverageOf(items),
      ownCount: new Set(own.map((i) => i.source)).size,
      // De rubriek uit álle berichten van het verhaal, niet uit wat een lezer volgt: zo heet
      // hetzelfde verhaal voor iedereen hetzelfde (de persoonlijke Editie neemt hem over).
      desk: deskOfStory(items),
      sourceNames: names,
      latestAt: items[0].publishedAt || null,
      firstAt: items[items.length - 1].publishedAt || null,
      ...(keys ? { keys: storyKeys(items, keySig) } : {}),
    })
    // Sport op niveau van het verhaal (shared/edition-policy.mjs): alleen gezet als het zo is, zodat andere
    // verhalen byte-gelijk blijven. De lead hoeft geen sporttag te hebben (een NYT-fotogalerij).
    const last = stories[stories.length - 1]
    if (sportStory({ sourceNames: names, keys: last.keys }, items)) last.sport = true
  }
  return stories
}

// H6 (ii): een los stuk (in geen enkele groep van twee of meer) dat minstens CORE_SHARED sterke namen
// deelt met de kern van een groot verhaal (≥ CORE_FROM bronnen; kern = de namen die in minstens de
// helft van zijn stukken staan), binnen EVENT_WINDOW van dat verhaal, hoort erbij. Zo komt de
// NYT-necrologie ("Patrick Stewart Was Regal, Stately and Quite Hilarious", zonder sterfwoord) bij het
// verhaal over zijn dood. Twee slotten, bewust (negatieve fixtures: Mbappé-opinies, Intel-explosie):
// - de gedeelde namen zijn twee verschillende (sharedEntities), óf het stuk deelt ook een
//   gebeurtenis-begrip met de kern (de stem van de paus: `election`), óf de kern is een overlijden
//   (`dead` in minstens een derde van de stukken: de portretten en eerbetonen van de dag erna noemen
//   de dood zelf niet meer; gemeten 8 van 17 bij Stewart): wie dood is, is die dag maar één
//   gebeurtenis; een levende voetballer is er twee (de Ballon d'Or én de rel in China, zonder gedeeld
//   begrip);
// - een opiniestuk hoort nergens bij: het gaat over de persoon, niet over wat er gebeurde.
// Bij meer kandidaten wint het verhaal met de meeste gedeelde namen, dan de meeste bronnen, dan de
// laagste id (totale volgorde).
const CORE_SHARED = 2
function attachLoose(groups, list, sig) {
  const inGroup = new Set()
  for (const items of groups.values()) if (new Set(items.map((i) => i.source)).size >= 2) for (const i of items) inGroup.add(i.id)
  const big = []
  for (const [gid, items] of groups) {
    if (new Set(items.map((i) => i.source)).size < CORE_FROM) continue
    const count = new Map()
    const weakCount = new Map()
    const conceptCount = new Map()
    let dead = 0
    for (const i of items) {
      const s = sig.get(i.id)
      if (!s) continue
      for (const k of s.strong) count.set(k, (count.get(k) || 0) + 1)
      for (const k of s.weak) weakCount.set(k, (weakCount.get(k) || 0) + 1)
      for (const k of s.concepts) conceptCount.set(k, (conceptCount.get(k) || 0) + 1)
      if (s.concepts.has('dead')) dead++
    }
    const half = items.length / 2
    const core = new Set([...count].filter(([, n]) => n >= half).map(([k]) => k))
    if (core.size < CORE_SHARED) continue
    const weak = new Set([...weakCount].filter(([, n]) => n >= half).map(([k]) => k))
    const concepts = new Set([...conceptCount].filter(([, n]) => n >= half).map(([k]) => k))
    const ts = items.map((i) => timeOf(i)).filter(Boolean)
    big.push({ gid, items, core, weak, concepts, dead: dead * 3 >= items.length, from: Math.min(...ts), to: Math.max(...ts), sources: new Set(items.map((i) => i.source)).size })
  }
  if (!big.length) return
  // De kern als kenmerk: sterke en zwakke namen van minstens de helft van de stukken, met de reeksen
  // van alle stukken (voor sharedEntities). Een instituut in de kern telt, net als in sameEvent, alleen
  // met een gedeeld land (sharedStrong).
  const coreSig = (b) => ({ strong: b.core, weak: b.weak, runs: [...b.items.map((i) => sig.get(i.id)?.runs || [])].flat() })
  for (const a of list) {
    if (inGroup.has(a.id) || a.type === 'opinie') continue
    const sa = sig.get(a.id)
    if (!sa || sa.strong.size < CORE_SHARED || !sa.t) continue
    let best = null
    for (const b of big) {
      if (b.items.some(i => conflictingEvents(sa.eventScope, sig.get(i.id)?.eventScope))) continue
      if (sa.t < b.from - EVENT_WINDOW || sa.t > b.to + EVENT_WINDOW) continue
      const shared = sharedStrong(sa, coreSig(b), true)
      if (shared < CORE_SHARED) continue
      if (!b.dead && sharedEntities(sa, coreSig(b)) < CORE_SHARED && !sharedCount(sa.concepts, b.concepts)) continue
      if (!best || shared > best.shared || (shared === best.shared && (b.sources > best.b.sources || (b.sources === best.b.sources && b.gid < best.b.gid)))) best = { b, shared }
    }
    if (!best) continue
    best.b.items.push(a)
    best.b.items.sort(byRecency)
    inGroup.add(a.id)
  }
}

// De kenmerken van een verhaal: alle sterke namen en gebeurtenis-begrippen van zijn stukken, één keer
// en gesorteerd (totale volgorde, zodat web en server dezelfde lijst maken). Hooguit KEYS_MAX.
export const KEYS_MAX = 80
export function storyKeys(items, sig) {
  const out = new Set()
  for (const i of items) {
    const s = sig.get(i.id)
    if (!s) continue
    for (const k of s.strong) out.add(k)
    for (const k of s.concepts) out.add(k)
  }
  return [...out].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).slice(0, KEYS_MAX)
}

// ---------- Editie ----------
export const EDITION_SIZE = 10
const MAX_LEADS_PER_SOURCE = 3

// De editie vóór deze: middag → ochtend, avond → middag, ochtend → gisteravond.
export function previousSlotId(slot) {
  if (slot.slot === 'avond') return `${slot.date}-middag`
  if (slot.slot === 'middag') return `${slot.date}-ochtend`
  const [y, m, d] = slot.date.split('-').map(Number)
  return `${new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)}-avond`
}

// Wat uit een vastgelegde editie telt als "stond er al" (zie selectEdition en selectForReader).
// `itemIds` zijn alle stukken van de verhalen van toen (de entries van een persoonlijke Editie dragen
// ze zelf, de algemene Editie via `edition.stories`); `titles` de getoonde koppen en `shown` de
// getoonde berichten zelf (kop, intro, tijd), zodat een tweede verhaal over dezelfde gebeurtenis
// (ander id) ook herkend wordt (sameSubject in selectForReader). `keysOf` (verhaal-id → Set) zijn de
// kenmerken van toen per verhaal (`keys`, van de server: alle stukken uit alle bronnen), zodat
// "ontwikkeld" niet afhangt van welke stukken dit toestel kent (developedSince).
// Eén Editie, of een samenvatting ervan zoals die in `user_state.edition.history` staat (historyOf:
// de id-lijsten als arrays, `keys` per verhaal als object). Ook de platte vorm die POST /api/edition
// aanneemt telt (`at` in ms zonder builtAt, `keysOf` al als Map): de rekenkern van de app
// (src/lib/editionCore.js) leest hiermee en mag niets anders rekenen dan het web.
const isHistoryRow = (x) => Array.isArray(x?.storyIds)
function previousOfOne(x) {
  if (!x) return null
  if (isHistoryRow(x)) {
    const keysOf = new Map()
    if (x.keysOf instanceof Map) for (const [id, ks] of x.keysOf) keysOf.set(id, new Set(ks))
    else for (const [id, ks] of Object.entries(x.keys && typeof x.keys === 'object' ? x.keys : {})) if (Array.isArray(ks) && ks.length) keysOf.set(id, new Set(ks))
    return {
      id: typeof x.id === 'string' ? x.id : '',
      keysOf,
      storyIds: new Set(x.storyIds),
      itemIds: new Set(Array.isArray(x.itemIds) ? x.itemIds : []),
      leadIds: new Set(Array.isArray(x.leadIds) ? x.leadIds : []),
      leadStoryId: typeof x.leadStoryId === 'string' ? x.leadStoryId : null,
      at: Date.parse(x.builtAt) || Number(x.at) || 0,
      titles: new Set(Array.isArray(x.titles) ? x.titles : []),
      shown: Array.isArray(x.shown) ? x.shown.filter((s) => s && typeof s.title === 'string') : [],
    }
  }
  const edition = x
  if (!edition.entries?.length) return null
  const stories = edition.entries.filter((e) => e.kind === 'story')
  const lead = edition.entries[0]
  const byId = new Map((edition.items || []).map((i) => [i.id, i]))
  const shown = edition.entries.map((e) => byId.get(e.leadId || e.id)).filter((i) => i?.title)
  const keysOf = new Map()
  for (const e of [...stories, ...(edition.stories || [])]) if (Array.isArray(e.keys) && e.keys.length) for (const id of [e.id, e.formerId, ...(e.formerIds || [])].filter(Boolean)) keysOf.set(id, new Set([...(keysOf.get(id) || []), ...e.keys]))
  return {
    id: typeof edition.id === 'string' ? edition.id : '',
    keysOf,
    storyIds: new Set(stories.flatMap((e) => [e.id, e.formerId].filter(Boolean))),
    itemIds: new Set([...edition.entries.map((e) => e.leadId || e.id), ...stories.flatMap((e) => e.itemIds || []), ...(edition.stories || []).flatMap((st) => st.itemIds || [])]),
    leadIds: new Set([lead.leadId || lead.id]),
    leadStoryId: lead.kind === 'story' ? lead.id : null,
    at: Date.parse(edition.builtAt) || 0,
    titles: new Set(edition.entries.map((e) => e.title || byId.get(e.leadId || e.id)?.title).filter(Boolean)),
    shown: shown.map((i) => ({ id: i.id, title: i.title, summary: i.summary || '', publishedAt: i.publishedAt || edition.builtAt })),
  }
}

// `previous` over één of meer Edities (aanvulling-pariteit-herhaling.md H3): de laatste drie vastgelegde
// Edities van deze lezer (vandaag plus gisteravond), als Edities of als history-regels (H5), door elkaar.
// Vereniging van verhalen, stukken, hoofdberichten, koppen en getoonde berichten; `keysOf` per verhaal
// verenigd; `atOf` per verhaal is de builtAt van de laatste Editie waarin het stond (developedSince
// rekent "nieuw" vanaf dat moment); `leadStoryIds` alle hoofdverhalen, `leadStoryId` en `at` die van de
// laatste Editie. Met één Editie is de uitkomst gelijk aan vroeger (selectEdition blijft byte-gelijk).
export function previousOf(editions) {
  const ps = (Array.isArray(editions) ? editions : [editions]).map(previousOfOne).filter(Boolean)
  if (!ps.length) return null
  // Oudste eerst, nieuwste laatst; totale volgorde (tijd, dan id) zodat elk toestel hetzelfde rekent.
  ps.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const u = (k) => new Set(ps.flatMap((p) => [...p[k]]))
  const atOf = new Map()
  const keysOf = new Map()
  for (const p of ps) {
    for (const id of p.storyIds) atOf.set(id, Math.max(atOf.get(id) || 0, p.at))
    for (const [id, ks] of p.keysOf) keysOf.set(id, new Set([...(keysOf.get(id) || []), ...ks]))
  }
  const last = ps[ps.length - 1]
  return {
    keysOf,
    storyIds: u('storyIds'),
    itemIds: u('itemIds'),
    leadIds: u('leadIds'),
    leadStoryId: last.leadStoryId,
    leadStoryIds: new Set(ps.map((p) => p.leadStoryId).filter(Boolean)),
    at: last.at,
    atOf,
    titles: u('titles'),
    shown: ps.flatMap((p) => p.shown),
  }
}

// De samenvatting van een vastgelegde Editie voor `user_state.edition.history` (H5): wat previousOf
// ervan nodig heeft, als platte JSON (arrays en een object per verhaal voor `keys`). Een regel die al
// een samenvatting is, blijft zoals hij is.
export const HISTORY_MAX = 3
export function historyOf(edition) {
  if (!edition) return null
  if (isHistoryRow(edition)) return edition
  const p = previousOfOne(edition)
  if (!p) return null
  return {
    id: edition.id,
    builtAt: edition.builtAt,
    storyIds: [...p.storyIds],
    itemIds: [...p.itemIds],
    leadIds: [...p.leadIds],
    leadStoryId: p.leadStoryId,
    titles: [...p.titles],
    shown: p.shown,
    keys: Object.fromEntries([...p.keysOf].map(([id, ks]) => [id, [...ks]])),
  }
}

// De laatste `n` vastgelegde Edities uit een lijst van Edities en/of history-regels: ontdubbeld op id
// (de eerste wint), nieuwste eerst (builtAt, dan id: totale volgorde). Voor `previous` en `history`.
export function recentEditions(list = [], n = HISTORY_MAX) {
  const seen = new Set()
  const out = []
  for (const e of list) {
    if (!e || typeof e.id !== 'string' || !e.id || seen.has(e.id) || !(Date.parse(e.builtAt) > 0)) continue
    seen.add(e.id)
    out.push(e)
  }
  out.sort((a, b) => Date.parse(b.builtAt) - Date.parse(a.builtAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return out.slice(0, n)
}

export function editionSlot(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
  const parts = (d) => Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]))
  const p = parts(now)
  const h = Number(p.hour)
  // Drie edities per dag: ochtend (06:00), middag (12:00), avond (17:00).
  if (h >= 17) return { id: `${p.year}-${p.month}-${p.day}-avond`, slot: 'avond', date: `${p.year}-${p.month}-${p.day}`, next: '06:00' }
  if (h >= 12) return { id: `${p.year}-${p.month}-${p.day}-middag`, slot: 'middag', date: `${p.year}-${p.month}-${p.day}`, next: '17:00' }
  if (h >= 6) return { id: `${p.year}-${p.month}-${p.day}-ochtend`, slot: 'ochtend', date: `${p.year}-${p.month}-${p.day}`, next: '12:00' }
  // Vóór 06:00 geldt de avondeditie van gisteren. Gisteren op de kalender, niet "nu min zes
  // uur": op de nacht van de wintertijd is 05:59 min zes uur nog dezelfde datum.
  const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day - 1))
  const date = d.toISOString().slice(0, 10)
  return { id: `${date}-avond`, slot: 'avond', date, next: '06:00' }
}

// Selectie op drie zichtbare gronden: dekking (aantal bronnen), versheid, en of je eigen
// bronnen erover schrijven. Eén gebeurtenis krijgt één plek: vóór het plaatsen controleren
// we elke kandidaat nogmaals tegen wat er al staat. Het hoofdbericht wisselt van bron
// (niet twee keer dezelfde achter elkaar, hooguit drie per editie) zolang het verhaal
// een alternatief uit je eigen bronnen heeft.
// `bonus(items)` (optioneel): extra gewicht voor een kandidaat, bijvoorbeeld voor de interesses
// van een lezer (de persoonlijke editie in de app); de server gebruikt hem niet.
// `strict`: een rubriek alleen voor wat er echt over gaat (niet "raakt het ook"); voor de
// persoonlijke editie, waar een techreview anders "Buitenland" kon heten.
// `previous`: de vorige editie ({ storyIds, itemIds, leadIds, at }). Wat daar al in stond, komt
// alleen terug als er sindsdien echt iets bij kwam, en wordt niet weer vanzelf het hoofdverhaal:
// anders zijn ochtend, middag en avond drie keer dezelfde krant.
export const REPEAT_PENALTY = 70 // zelfde verhaal, weinig nieuws: zakt achter verhalen van nu
export const DEVELOPING_PENALTY = 25 // zelfde verhaal dat zich ontwikkelt: mag blijven, maar lager
export const REPEAT_LEAD_PENALTY = 30 // was het hoofdverhaal: niet nog een keer bovenaan
export function repeatPenalty(st, items, previous) {
  if (!previous) return 0
  const seen = previous.storyIds?.has(st.id) || items.some((i) => previous.itemIds?.has(i.id))
  if (!seen) return 0
  const fresh = items.filter((i) => !previous.itemIds?.has(i.id) && i.publishedAt && Date.parse(i.publishedAt) > previous.at).length
  const developing = fresh >= 3 && fresh / items.length >= 0.3
  const wasLead = previous.leadStoryId === st.id || items.some((i) => previous.leadIds?.has(i.id))
  return (developing ? DEVELOPING_PENALTY : REPEAT_PENALTY) + (wasLead ? REPEAT_LEAD_PENALTY : 0)
}

// Voor de persoonlijke Editie is gezien een filter, geen straf (aanvulling-pariteit-herhaling.md H1):
// een verhaal uit je vorige Editie doet nergens meer mee, tenzij het zich ontwikkelde (H2). Een
// 11-bronnenverhaal hield anders na straf genoeg punten om in Ochtend, Middag én Avond te staan,
// telkens met een andere bron als kop.
export function seenBefore(st, items, previous) {
  if (!previous) return false
  if (previous.storyIds?.has(st.id) || (st.formerIds || []).some((id) => previous.storyIds?.has(id))) return true
  return items.some((i) => previous.itemIds?.has(i.id))
}

// Ontwikkeld: minstens DEVELOPED_FRESH stukken van ná de vorige Editie die daar niet in stonden, én de
// kop van het zwaarste nieuwe stuk draagt minstens DEVELOPED_SIG namen of gebeurtenis-begrippen die in
// geen enkel stuk van toen voorkwamen. Op kenmerken (signature, via ALIAS), niet op woorden: een
// vertaalde kop is nooit "nieuw".
// "Van toen" mag niet afhangen van wat dit toestel kent: het kent van een verhaal alleen de stukken uit
// jouw bronnen plus de koppen van de algemene Editie, en een portret of necrologie heeft altijd eigen
// namen (Shakespeare, Jean-Luc Picard) die bij de andere bronnen van toen wél al stonden. Daarom
// legt elke plek de kenmerken van zijn hele verhaal vast (`keys`, van de server over alle bronnen;
// `previous.keysOf`), en komen daar de kenmerken bij van de oude stukken die het toestel zelf kent
// (`known`: ook uit de algemene Editie). Als extra slot telt een nieuwe naam alleen als nog een ander
// nieuw stuk hem noemt: een echte ontwikkeling (staatsbegrafenis in Westminster Abbey) melden
// meerdere nieuwe stukken, een eigenaardigheid van één stuk niet. `sig`: signatures over alle
// bekende berichten. Uitvoer: { fresh, lead, newSig } of null. `previous.at` mag per verhaal
// verschillen (`atOf`, als previous meer Edities omvat).
export const DEVELOPED_FRESH = 2
export const DEVELOPED_SIG = 2
export function developedSince(st, items, previous, sig, { mainIds = new Set(), preferred = null, now = null, known = null } = {}) {
  const at = previous.atOf?.get(st.id) ?? previous.at ?? 0
  const isNew = (i) => !previous.itemIds?.has(i.id) && !!i.publishedAt && Date.parse(i.publishedAt) > at
  const fresh = items.filter(isNew)
  if (fresh.length < DEVELOPED_FRESH) return null
  const keysOf = (i) => {
    const s = sig.get(i.id)
    return s ? [...s.strong, ...s.concepts] : []
  }
  const then = new Set()
  for (const id of [st.id, ...(st.formerIds || [])]) for (const k of previous.keysOf?.get(id) || []) then.add(k)
  const all = known ? (st.itemIds || []).map((id) => known.get(id)).filter(Boolean) : items
  for (const i of [...all, ...items]) if (!isNew(i)) for (const k of keysOf(i)) then.add(k)
  const lead = leadCandidates(fresh, mainIds, preferred, now)[0]
  const others = fresh.filter((i) => i !== lead).map(keysOf)
  const newSig = keysOf(lead).filter((k) => !then.has(k) && others.some((ks) => ks.includes(k))).length
  return newSig >= DEVELOPED_SIG ? { fresh, lead, newSig } : null
}

// Een verhaal of bericht uit een voorkeursbron weegt zwaarder (zo'n twee bronnen dekking).
export const FAVORITE_BONUS = 8
export function selectEdition(stories, pool, { mainIds = new Set(), now = Date.now(), size = EDITION_SIZE, bonus = null, strict = false, previous = null, preferred = null } = {}) {
  const byId = new Map(pool.map((i) => [i.id, i]))
  const sig = signatures(pool)
  const fresh = (iso, hours) => iso && now - Date.parse(iso) < hours * 60 * 60 * 1000
  const entries = []
  const placed = [] // kenmerken van alles wat al een plek heeft
  const leadCount = {}
  let prevLead = null
  const clashes = (ids) => ids.some((id) => sig.has(id) && placed.some((s) => sameSubject(sig.get(id), s)))
  const place = (ids) => {
    for (const id of ids) if (sig.has(id)) placed.push(sig.get(id))
  }
  const pickLead = (items) => {
    const all = leadCandidates(items, mainIds, preferred, now, { role: entries.length < 3 ? 'front' : 'neutral' })
    const cands = all.some((i) => !isGallery(i)) ? all.filter((i) => !isGallery(i)) : all // geen galerij als kop, ook niet als enige eigen bron
    // Vers nieuws eerst: een achtergrondstuk van gisteren wordt alleen de kop als er niets recents
    // is. Ook niet om de bronnen te spreiden of omdat de verse bron al vaak de kop is.
    const current = cands.filter((i) => !isStale(i, now))
    const recent = current.length ? current : cands
    // Daarbinnen eigen bronnen eerst.
    const ownOnly = recent.filter((i) => mainIds.has(i.source))
    const from = ownOnly.length ? ownOnly : recent
    return from.find((i) => i.source !== prevLead && (leadCount[i.source] || 0) < MAX_LEADS_PER_SOURCE) || from.find((i) => (leadCount[i.source] || 0) < MAX_LEADS_PER_SOURCE) || from[0]
  }

  // Kandidaten: verhalen (meerdere publicaties) en losse berichten uit je eigen bronnen.
  const cands = []
  for (const st of stories) {
    if (!fresh(st.latestAt, 24)) continue
    const items = st.itemIds.map((id) => byId.get(id)).filter(Boolean).filter(i=>!lightVideoFiller(i))
    if (!items.length) continue
    // De algemene Editie is nieuws: een sportverhaal (ook met een kop zonder sporttag) en een verhaal van
    // alleen galerijen doen niet mee, behalve groot Oranje-sportnieuws (exceptionalDutchSport).
    if (items.every(isGallery) || (sportStory(st, items) && !exceptionalDutchSport(st, items))) continue
    const per = storyDesks(items)
    const fav = preferred?.size && items.some((i) => preferred.has(i.source)) ? FAVORITE_BONUS : 0
    cands.push({ kind: 'story', st, items, ids: st.itemIds, desks: new Set(per.flatMap((x) => [...x])), primary: primaryDesk(per), w: weight({ sourceCount: st.publisherCount ?? st.sourceCount, latestAt: st.latestAt }, now) - repeatPenalty(st, items, previous) + fav })
  }
  for (const it of pool) {
    if (!mainIds.has(it.source) || it.kind !== 'article' || it.type === 'opinie' || it.storyId || isLive(it)) continue // een liveblog is geen editieplek
    if (!fresh(it.publishedAt, 14) || !(it.summary || it.image)) continue
    if (previous?.itemIds?.has(it.id)) continue // stond er al
    if (isGallery(it) || lightVideoFiller(it)) continue // een galerij is geen eigen plek
    const desks = desksOf(it)
    cands.push({ kind: 'item', it, ids: [it.id], desks, primary: primaryDesk([desks]), w: weight({ sourceCount: 1, latestAt: it.publishedAt }, now) - 2 + (preferred?.has(it.source) ? FAVORITE_BONUS : 0) })
  }
  if (bonus) for (const c of cands) c.w += bonus(c.kind === 'story' ? c.items : [c.it])
  cands.sort((a, b) => b.w - a.w)

  const used = new Set()
  const take = (c, desk) => {
    if (used.has(c) || clashes(c.ids)) return false
    used.add(c)
    place(c.ids)
    if (c.kind === 'story') {
      const lead = pickLead(c.items)
      leadCount[lead.source] = (leadCount[lead.source] || 0) + 1
      prevLead = lead.source
      entries.push({ kind: 'story', id: c.st.id, leadId: lead.id, desk, w: c.w })
    } else entries.push({ kind: 'item', id: c.it.id, desk, w: c.w })
    return true
  }
  // 1. Per rubriek het belangrijkste verhaal.
  //    Eerst wat er vooral over gaat; alleen als dat er niet is, iets wat het ook raakt.
  for (const desk of DESKS) {
    if (entries.length >= size) break
    if (!cands.some((c) => c.primary === desk && take(c, desk)) && !strict) cands.some((c) => c.desks.has(desk) && take(c, desk))
  }
  // 2. Aanvullen met het belangrijkste wat er verder is.
  for (const c of cands) {
    if (entries.length >= size) break
    take(c, null)
  }
  // Volgorde: belangrijkste eerst (het hoofdverhaal is het zwaarste nieuws van het moment).
  entries.sort((a, b) => b.w - a.w)
  return entries.map(({ w, ...e }) => e)
}

// De persoonlijke selectie (De Redacteur, Hoot-design/algoritme/bouwspec.md §3). Zelfde kandidaten,
// hoofdbericht-regels, één plek per onderwerp en verhaalvenster als selectEdition (die blijft voor
// de algemene Editie ongewijzigd), met vijf verschillen:
// 1. "eigen bronnen" in het basisgewicht zijn die van de lezer (`mainIds`);
// 2. persoonlijke punten uit het profiel (shared/editor.mjs), begrensd, plus een vast zaad dat
//    alleen gelijke stand breekt;
// 3. de rubrieken volgen jouw indeling: eerst de voorpagina (voor iedereen gelijk, Nederlands: zie
//    FRONT_NL_MIN in shared/editor.mjs), groot nieuws dat daar niet past, dan je zetels (deskPlan),
//    dan aanvullen op gewicht, met hooguit INT_MAX buitenland zonder persoonlijke reden;
// 4. al gelezen zonder nieuws doet nergens meer mee, en een los bericht blijft zo lang staan als
//    het tempo van zijn bron (`ctx.tempo`, zie tempoWindows);
// 5. wat in je vorige Editie stond (`previous`) is een filter, geen straf (seenBefore): het komt
//    alleen terug als het zich ontwikkelde (developedSince), dan met het zwaarste nieuwe stuk als
//    kop, "Vervolg · N nieuwe stukken" als waarom (`vervolg`) en lager in de volgorde. Een kandidaat
//    over hetzelfde onderwerp als een vorige kop (ander verhaal-id) komt ook niet terug.
// `prof`: profileOf. `ctx`: { readIds, tempo, storyDesk, known, sigKnown } (`known`: alle bekende
// berichten op id, `sigKnown` hun kenmerken, voor developedSince). `plan: false` slaat voorpagina en
// indeling over (het extra blok). Rekenregels als in shared/editor.mjs: elke sortering is totaal.
// Uitvoer: de plekken met `w` en `parts` (het waarom wordt daarna gezet), `itemIds`, `title` en de
// `keys` van het verhaal (zodat previousOf de hele Editie van toen kent), plus `deskOrder`.
const textOrder = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
export function selectForReader(stories, pool, { mainIds = new Set(), now = Date.now(), size = EDITION_SIZE, previous = null, preferred = null, prof = profileOf(), ctx = {}, plan = true, seed = '', audit = null } = {}) {
  const byId = new Map(pool.map((i) => [i.id, i]))
  // De getoonde berichten van de vorige Editie (of, van een oudere Editie, alleen de koppen) krijgen
  // een kenmerk met de woordenschat van de pool van nu.
  const prevShown = previous?.shown?.length ? previous.shown : [...(previous?.titles || [])].map((title) => ({ title, publishedAt: new Date(previous.at || now).toISOString() }))
  const prevArts = prevShown.map((a, k) => ({ ...a, id: `vorige:${k}` }))
  const sig = signatures(pool, prevArts)
  const vorige = prevArts.map((a) => sig.get(a.id))
  const sigKnown = ctx.sigKnown || sig // alles wat het toestel kent (composePersonal), voor "van toen"
  const fresh = (iso, hours) => iso && now - Date.parse(iso) < hours * 60 * 60 * 1000
  const entries = []
  const placed = []
  const leadCount = {}
  let prevLead = null
  const same = (ids, sigs) => ids.some((id) => sig.has(id) && sigs.some((s) => sameSubject(sig.get(id), s)))
  // Eén plek per onderwerp, ook tegenover de koppen van de vorige Editie; een ontwikkeld verhaal
  // gaat vanzelf over zijn eigen vorige kop en wordt daar niet op afgewezen.
  const clashes = (c) => same(c.ids, placed) || (!c.vervolg && same(c.ids, vorige))
  const place = (ids) => {
    for (const id of ids) if (sig.has(id)) placed.push(sig.get(id))
  }
  const pickLead = (items) => {
    const all = leadCandidates(items, mainIds, preferred, now, { role: entries.length < 3 ? 'front' : 'neutral' })
    const cands = all.some((i) => !isGallery(i)) ? all.filter((i) => !isGallery(i)) : all // geen galerij als kop, ook niet als enige eigen bron
    const current = cands.filter((i) => !isStale(i, now))
    const recent = current.length ? current : cands
    const ownOnly = recent.filter((i) => mainIds.has(i.source))
    const from = ownOnly.length ? ownOnly : recent
    return from.find((i) => i.source !== prevLead && (leadCount[i.source] || 0) < MAX_LEADS_PER_SOURCE) || from.find((i) => (leadCount[i.source] || 0) < MAX_LEADS_PER_SOURCE) || from[0]
  }
  // De rubriek van een verhaal is voor iedereen gelijk: st.desk uit buildStories (of `ctx.storyDesk`),
  // ook als die leeg is. Alleen een verhaal van een oudere server zonder rubriek krijgt de
  // hoofdrubriek uit wat deze lezer ervan heeft.
  const storyDesk = (st, primary) => (ctx.storyDesk?.has(st.id) ? ctx.storyDesk.get(st.id) : st.desk !== undefined ? st.desk : primary)
  let storyMap = null
  const storyOfItem = () => (storyMap ||= new Map(stories.flatMap((st) => (st.itemIds || []).map((id) => [id, st]))))

  const reject = (kind, id, ids, reason) => { if (audit) audit.push({kind, id, itemIds: ids, reason}) }
  const cands = []
  for (const st of stories) {
    if (!fresh(st.latestAt, 24)) { reject('story', st.id, st.itemIds, 'ouder-dan-verhaalvenster'); continue }
    const raw = st.itemIds.map((id) => byId.get(id)).filter(Boolean)
    const items = raw.filter(i=>!lightVideoFiller(i,prof))
    if (!items.length) { reject('story', st.id, st.itemIds, raw.length ? 'licht-videorondje-buiten-interesse' : 'geen-bekend-artikel'); continue }
    // Gezien in je vorige Editie: alleen terug als het zich ontwikkelde, en dan lager (de straf
    // telt hier alleen voor de volgorde, niet voor de plek).
    let dev = null
    let straf = 0
    if (seenBefore(st, items, previous)) {
      dev = developedSince(st, items, previous, sigKnown, { mainIds, preferred, now, known: ctx.known })
      if (!dev) { reject('story', st.id, st.itemIds, 'eerder-getoond-zonder-ontwikkeling'); continue }
      const wasLead = previous.leadStoryId === st.id || previous.leadStoryIds?.has(st.id) || items.some((i) => previous.leadIds?.has(i.id))
      straf = DEVELOPING_PENALTY + (wasLead ? REPEAT_LEAD_PENALTY : 0)
    }
    const primary = deskOfStory(items)
    const desk = storyDesk(st, primary)
    const mine = coverageOf(items).publisherCount // onafhankelijke gekozen uitgevers, niet hun sectiefeeds
    // Elke onafhankelijke bron telt vol; land/taal van de uitgever verandert het nieuwsgewicht niet.
    const nl = st.nlCount ?? st.sourceCount
    const eff = st.publisherCount ?? (nl + NL_OTHER_W * (st.sourceCount - nl))
    const belang = weight({ sourceCount: eff, ownCount: mine, latestAt: st.latestAt }, now) - straf
    // De punten uit al je eigen berichten van het verhaal (`ctx.own`), ook die buiten deze pool.
    const mineAll = ctx.own ? st.itemIds.map((id) => ctx.own.get(id) || byId.get(id)).filter(Boolean) : items
    // Of het verhaal buitenlands is, volgt het hele verhaal (alles wat het toestel ervan kent, `ctx.known`),
    // niet je eigen stukken: anders maakte één NU-bericht van Heidi Klum op Halloween (naast RTL, Telegraaf,
    // BBC en Variety) een buitenlands verhaal tot "Omdat je Binnenland volgt" (keuring 1 november).
    const whole = ctx.known ? st.itemIds.map((id) => ctx.known.get(id) || byId.get(id)).filter(Boolean) : items
    const intl = internationalNews(whole, desk, st)
    const parts = personalParts(mineAll, prof, ctx, { desk, foreign: storyForeignOf(mineAll) || intl })
    cands.push({ kind: 'story', id: st.id, st, items, whole, ids: st.itemIds, intl, primary, desk, home: homeDesk(items, desk ?? primary, prof), belang, parts, sc: st.sourceCount, nl, eff, dev, vervolg: dev ? dev.fresh.length : 0, w: belang + sumParts(parts) + jitter(seed, st.id) })
  }
  for (const it of pool) {
    if (!mainIds.has(it.source) || it.kind !== 'article' || it.type === 'opinie' || (it.storyId && storyOfItem().has(it.id)) || isLive(it)) { reject('item', it.id, [it.id], it.storyId && storyOfItem().has(it.id) ? 'via-verhaal' : 'vorm-of-bron-niet-toegelaten'); continue }
    if (!fresh(it.publishedAt, ctx.tempo?.get(it.source) || TEMPO_MIN_H) || !(it.summary || it.image)) { reject('item', it.id, [it.id], 'te-oud-of-geen-intro-en-beeld'); continue }
    if (previous?.itemIds?.has(it.id) || ctx.readIds?.has(it.id)) { reject('item', it.id, [it.id], 'eerder-getoond-of-gelezen'); continue } // stond er al, of je las het al
    // Hoort het bij een verhaal waarvan je al een stuk las (ook zonder storyId op het bericht), dan
    // telt dat ook: zonder nieuws doet het niet meer mee.
    const mates = ctx.readIds?.size ? storyOfItem().get(it.id) : null
    if (mates && personalParts(mates.itemIds.map((id) => ctx.own?.get(id) || byId.get(id)).filter(Boolean), prof, { readIds: ctx.readIds }).seen) { reject('item', it.id, [it.id], 'verhaal-al-gelezen'); continue }
    const primary = primaryDesk([desksOf(it)])
    const belang = weight({ sourceCount: 1, ownCount: 1, latestAt: it.publishedAt }, now) - 2
    const parts = personalParts([it], prof, ctx)
    cands.push({ kind: 'item', id: it.id, it, items: [it], ids: [it.id], primary, desk: primary, home: homeDesk([it], primary, prof), belang, parts, sc: 1, nl: 1, eff: 1, vervolg: 0, w: belang + sumParts(parts) + jitter(seed, it.id) })
  }
  const heaviest = (a, b) => b.w - a.w || textOrder(a.id, b.id) || textOrder(a.kind, b.kind)
  cands.sort(heaviest)

  const used = new Set()
  const foreign = c => c.intl ?? internationalNews(c.items, c.desk, c.st)
  const cappedWorld = c => cappedInternational(prof,c.whole || c.items,c.desk,c.st)
  const take = (c, desk, extra = {}) => {
    if (used.has(c) || clashes(c) || !allowedNews(prof, c.st || { sourceCount: 1 }, c.items, c.desk)) return false
    if (plan && !worldChosen(prof) && cappedWorld(c) && entries.filter(e => { const x = cands.find(c => c.id === e.id); return x && cappedWorld(x) }).length >= INT_MAX) return false
    used.add(c)
    place(c.ids)
    const base = { desk, w: c.w, parts: c.parts, sourceCount: c.sc, big: majorNews(c.st || {sourceCount:1}, c.items), ...(c.vervolg ? { vervolg: c.vervolg } : {}), ...extra }
    if (c.kind === 'story') {
      // De kop van een ontwikkeld verhaal is het zwaarste nieuwe stuk, niet een oud stuk uit een andere bron.
      const lead = pickLead(c.dev ? c.dev.fresh : c.items)
      leadCount[lead.source] = (leadCount[lead.source] || 0) + 1
      prevLead = lead.source
      entries.push({ kind: 'story', id: c.st.id, leadId: lead.id, itemIds: c.st.itemIds, title: lead.title || null, ...(c.st.keys ? { keys: c.st.keys } : {}), ...base })
    } else entries.push({ kind: 'item', id: c.it.id, itemIds: [c.it.id], title: c.it.title || null, ...base })
    return true
  }
  // Alle buitenlandse plekken tellen, ook een gekozen thema, voorpagina en breed nieuws.
  // De harde toelating in take() kan niet door force/fallback worden omzeild. Een verhaal is buitenlands
  // naar het hele verhaal (`c.intl`), zoals composePersonal het telt: een Halloween-stuk van Heidi Klum met
  // NU, RTL en Telegraaf naast BBC en Variety is geen Nederlandse voorpagina.
  const homeNews = c => !!c && !foreign(c) && [c.desk,c.primary,c.home].some(d => d === 'binnenland' || d === 'regio')
  const unchosen = foreign
  const strictInt = !worldChosen(prof)
  const counted = new Set()
  const capped = c => strictInt && cappedWorld(c) && counted.size >= INT_MAX
  const takeCapped = (c, desk, extra, force = false) => {
    if ((!force && capped(c)) || !take(c, desk, extra)) return false
    if (cappedWorld(c)) counted.add(c.id)
    return true
  }
  let deskOrder = []
  if (plan) {
    // 1. De voorpagina: het zwaarste nieuws van het moment, voor iedereen gelijk. Alleen wat je al
    //    las of waar je "minder" op stemde, zakt (de rest van je profiel telt hier niet). Een
    //    Binnenland reserveert een Nederlandse opening; uitgeverland is geen toegangsdrempel.
    const frontOf = (c) => c.belang + (c.parts.less?.pts || 0)
    const byFront = (a, b) => frontOf(b) - frontOf(a) || heaviest(a, b)
    const worldReader = worldChosen(prof)
    const domesticReader = (prof?.family?.binnenland || 0) > 0 || (!worldReader && Object.keys(prof?.family || {}).length === 0)
    const front = cands.filter((c) => c.kind === 'story' && (c.sc >= FRONT_MIN || majorNews(c.st, c.items)) && !c.parts.seen).sort(byFront)
    const dutch = c => homeNews(c)
    const home = !domesticReader ? [] : cands.filter(c => !c.parts.seen && !c.parts.less && dutch(c)).sort(byFront)
    let hasHome = false
    const room = () => Math.min(FRONT_MAX, size) - (hasHome || !home.length ? 0 : 1) // een plek voor Nederland
    for (const c of front) {
      if (entries.length >= room() || (entries.length >= FRONT && !majorNews(c.st, c.items))) break
      if (strictInt && capped(c)) continue
      if (!take(c, c.desk, { front: true })) continue
      if (cappedWorld(c)) counted.add(c.id)
      if (dutch(c)) hasHome = true
    }
    if (!hasHome) home.some((c) => take(c, c.desk, { front: true }))
    // Groot nieuws (acht uitgevers, of vijf uit minstens twee landen) dat niet op de Nederlandse voorpagina past, krijgt toch
    // een plek, zolang voorpagina en groot nieuws samen hooguit FRONT_MAX plekken zijn (wat dan nog
    // ontbreekt, wordt "Waar iedereen over schrijft": composePersonal); buitenland telt mee voor de grens.
    for (const c of front) {
      if (entries.length >= Math.min(FRONT_MAX, size)) break
      if (majorNews(c.st, c.items) && !used.has(c)) {
        takeCapped(c, c.desk, {}, true)
      }
    }
    // Groot nieuws dat zo een plek kreeg, vult al een zetel van zijn rubriek (de voorpagina niet: die
    // komt bovenop je indeling, zoals altijd).
    deskOrder = deskPlan(prof, size - entries.length, entries.map((e) => e.desk), entries.filter((e) => !e.front).map((e) => e.desk)).order
    // 2. Jouw rubrieken, in de volgorde van de zetels: per zetel de zwaarste kandidaat die er thuishoort.
    // De grens wijkt alleen voor de kernregel: een krant heeft minstens KERN_MIN kernrubrieken.
    const kernShort = (d) => KERN.includes(d) && !entries.some((e) => e.desk === d) && new Set(entries.map((e) => e.desk).filter((x) => KERN.includes(x))).size < KERN_MIN
    // Zonder Wereld gaat de kernregel niet langs de grens voor een buitenlandse rubriek als er al buitenland
    // zonder reden staat (feedback 31 oktober: de VS-verkiezingen naast Polen bij wie alleen Binnenland koos).
    for (const d of deskOrder) {
      if (entries.length >= size) break
      const force = kernShort(d) && !(strictInt && FOREIGN_DESKS.has(d) && counted.size >= INT_MAX)
      cands.some((c) => c.home === d && !c.parts.seen && takeCapped(c, d, { planned: true }, force))
    }
  }
  // 3. Aanvullen op gewicht; ook de laatste terugval respecteert de harde nieuwsgrenzen.
  for (const c of cands) {
    if (entries.length >= size) break
    if (!c.parts.seen) takeCapped(c, plan ? c.home : null)
  }
  for (const c of cands) {
    if (entries.length >= size) break
    if (!c.parts.seen) takeCapped(c, plan ? c.home : null, {}, true)
  }
  entries.sort((a, b) => b.w - a.w || textOrder(a.id, b.id))
  // Zonder Wereld komt buitenland zonder reden buiten de voorpagina achteraan, en wie Binnenland koos,
  // opent met Nederland: een buitenlands verhaal op de voorpagina komt na de Nederlandse (feedback 31
  // oktober: wie alleen Binnenland koos, kreeg Polen als eerste verhaal).
  if (strictInt || prof.family.binnenland > 0) {
    const candOf = new Map([...used].map((c) => [c.id, c]))
    const isForeign = (e) => foreign(candOf.get(e.id))
    const lastHome = entries.reduce((k, e, i) => (e.front && !isForeign(e) ? i : k), -1)
    const late = entries.filter((e) => !e.front && unchosen(candOf.get(e.id)))
    const moved = prof.family.binnenland > 0 ? entries.slice(0, Math.max(0, lastHome)).filter((e) => e.front && isForeign(e)) : []
    const rest = entries.filter((e) => !moved.includes(e) && !late.includes(e))
    if (moved.length) rest.splice(rest.indexOf(entries[lastHome]) + 1, 0, ...moved)
    // Wie Binnenland koos, krijgt als eerste plek een Nederlands verhaal, ook als een buitenlands verhaal
    // met een reden zwaarder weegt (feedback 31 oktober: bi-po-ec opende met de paus, Lula en Wall
    // Street): de Nederlandse voorpagina, anders het zwaarste Nederlandse verhaal.
    if (prof.family.binnenland > 0 && rest.length && !homeNews(candOf.get(rest[0].id))) {
      const first = rest.find((e) => e.front && homeNews(candOf.get(e.id))) || rest.find((e) => homeNews(candOf.get(e.id)))
      if (first) rest.splice(0, 0, ...rest.splice(rest.indexOf(first), 1))
    }
    entries.splice(0, entries.length, ...rest, ...late)
  }
  // `abroad`: de buitenlandse plekken zonder persoonlijke reden buiten de voorpagina (hun id's), zodat
  // composePersonal bij het extra blok en het aanvullen dezelfde grens aanhoudt.
  // `counted`: alle internationale plekken, inclusief voorpagina en kernrubrieken.
  const abroadIds = new Set([...used].filter((c) => unchosen(c) && !entries.find((e) => e.id === c.id)?.front).map((c) => c.id))
  if (audit) for (const c of cands) {
    const reason = used.has(c) ? 'gekozen-in-route' : c.parts.seen ? 'verhaal-al-gelezen' : clashes(c) ? 'zelfde-onderwerp-gekozen-of-eerder' : !allowedNews(prof, c.st || {sourceCount:1}, c.items, c.desk) ? newsRejection(prof,c.st || {sourceCount:1},c.items,c.desk) : capped(c) ? 'internationaal-plafond' : entries.length >= size ? 'route-vol' : 'onverklaard'
    reject(c.kind, c.id, c.ids, reason)
  }
  return Object.assign(entries, { deskOrder, abroad: abroadIds, counted })
}

// De editie ligt vast, maar verhaal-id's niet: na een latere verversing kan een id bij een andere
// bundel horen (gesplitst of opnieuw ingedeeld). Daarom bij elke uitlevering:
// - elk verhaal-onderdeel krijgt de momentopname van toen (`itemIds`, `sourceCount`), en
// - zit het hoofdbericht niet meer in het verhaal met die id, dan wijzen we naar het verhaal waar
//   het nu wél in zit (of tonen het als los bericht), met de rubriek van wat we dan tonen.
export function relinkEdition(entries = [], { stories = [], snapshot = [], byId = new Map() } = {}) {
  const live = new Map(stories.map((st) => [st.id, st]))
  const then = new Map(snapshot.map((st) => [st.id, st]))
  const storyOf = new Map()
  for (const st of stories) for (const id of st.itemIds || []) storyOf.set(id, st)
  const itemsOf = (ids) => ids.map((id) => byId.get(id)).filter(Boolean)
  const deskOf = (ids) => deskOfStory(itemsOf(ids))
  // De rubriek van het hoofdbericht alleen, maar in de context van zijn verhaal van toen: een NOS-stuk
  // in een verhaal van vooral buitenlandse bronnen is geen Binnenland (storyForeignOf).
  const leadDeskOf = (e, snap) => {
    const lead = byId.get(e.leadId)
    if (!lead) return null
    const ctx = itemsOf(snap?.itemIds || e.itemIds || [])
    return primaryDesk([desksOf(lead, { storyForeign: ctx.length > 1 && storyForeignOf(ctx) })])
  }
  const taken = new Set(entries.map((e) => e.id)) // twee onderdelen mogen niet naar hetzelfde verhaal wijzen
  return entries.map((e) => {
    if (e.kind !== 'story') return e
    const snap = then.get(e.id)
    const out = { ...e, itemIds: snap?.itemIds || e.itemIds || [], sourceCount: snap?.sourceCount || e.sourceCount || 0, leadDesk: leadDeskOf(e, snap) }
    const cur = live.get(e.id)
    if (!e.leadId || cur?.itemIds?.includes(e.leadId)) return out
    const now = storyOf.get(e.leadId)
    if (now && !taken.has(now.id)) {
      taken.add(now.id)
      return { ...out, id: now.id, formerId: e.id, desk: deskOf(now.itemIds) || out.leadDesk || e.desk }
    }
    // Los bericht: de rubriek van de selectie gaat voor (die keek naar het hele verhaal).
    return { kind: 'item', id: e.leadId, formerId: e.id, desk: e.desk || out.leadDesk, w: e.w }
  })
}

// "Waar iedereen over schrijft": de breedst gedekte verhalen van dit moment, elk met een bericht
// van een gratis bron (wie geen abonnement heeft, moet het kunnen lezen), bij voorkeur in het
// Nederlands en met een intro. Sport telt niet mee (de editie is nieuws). De app kiest er per
// lezer één uit die buiten diens interesses valt (src/lib/personal.js).
export function widelyCovered(stories = [], byId = new Map(), { isFree = () => false, isDutch = () => false, isSport = () => false, min = 6, max = 8 } = {}) {
  const out = []
  for (const st of [...stories].sort((a, b) => b.sourceCount - a.sourceCount)) {
    if (out.length >= max) break
    const items = st.itemIds.map((id) => byId.get(id)).filter(Boolean)
    if (st.sourceCount < min && !majorNews(st, items)) continue
    if (!items.length || items.filter(isSport).length * 2 >= items.length) continue
    const free = items.filter((i) => isFree(i.source) && !isLive(i) && i.type !== 'opinie')
    const lead = leadCandidates(free, new Set())[0] // dezelfde kwaliteit/actualiteit, geen landbonus
    if (!lead) continue
    out.push({ storyId: st.id, sourceCount: st.sourceCount, ...coverageOf(items), topics: [...new Set(items.flatMap((i) => i.topics || []))], item: lead })
  }
  return out
}
