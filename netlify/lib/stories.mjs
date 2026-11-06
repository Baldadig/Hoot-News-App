import { cleanIntro, headlineFit } from '../../shared/edition-display.mjs'
import { EDITION_TARGET, coverageOf, majorNews, newsRejection, lightVideoFiller, allowedNews, cappedInternational, internationalNews, worldChosen, sportStory, exceptionalDutchSport, isGallery, lightNews, lightStory, majorGeneralNews, publisherOf, openWorld } from '../../shared/edition-policy.mjs'
import { eventScope, conflictingEvents, countriesIn, usPoliticsIn, isOpinion, verdictTitle } from '../../shared/article-signals.mjs'
// Verhalen (bundels), hoofdbericht en editie — pure functies, los van het ophalen,
// zodat ze te testen zijn (zie tests/).

import { DESKS, desksOf, primaryDesk, storyDesks, deskOfStory, storyForeignOf, weight, VL_HOME } from './desks.mjs'
import { detectLang } from '../../shared/lang.mjs'

import { hash } from '../../shared/util.mjs'
import { SOURCES } from './sources.mjs'
import { SLOT_START, hhmm, amsterdamClock } from '../../shared/slot-times.mjs'
import { profileOf, personalParts, sumParts, jitter, deskPlan, homeDesk, chosenDesks, KERN, KERN_MIN, TEMPO_MIN_H, FRONT, FRONT_MIN, FRONT_BIG, FRONT_MAX, FOREIGN_DESKS, NL_OTHER_W, INT_MAX } from '../../shared/editor.mjs'
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
  // De twee Amerikaanse partijen in beide talen als één naam (keuring 6 november 2026). Geen eigen naam (NOT_A_NAME):
  // ze tellen alleen in sameSubject (`parties` in het kenmerk), en als brede naam (BROAD) nooit alleen.
  republikein: 'republicans', republikeinen: 'republicans', republikeinse: 'republicans', republikeins: 'republicans', republican: 'republicans', gop: 'republicans',
  democraat: 'democrats', democraten: 'democrats', democrat: 'democrats',
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
// Uitgebreide stand (H7, verkiezingsnacht 4 november 2026): een kamer in twee talen als één zwakke naam
// ("de Senaat" en "the Senate"). Partijnamen niet: als zwakke of sterke naam vergrootten ze elke
// verkiezingsbundel tot hij bij het terugsnoeien naar de kern uiteenviel (regressiewacht H6: een
// tweetalig midterms-verhaal van 30 oktober verdween). De uitslagen komen samen via mergeVoteResults.
const CHAMBER = { senaat: 'senate', senaats: 'senate', congres: 'congress' }
const ALIAS_EXT = { ...ALIAS, ...EU, ...PARTY, ...CHAMBER }
// Uitgebreide stand: Nederlandse en Engelse spelling van dezelfde naam uit het Cyrillisch verschillen
// systematisch in "sj" tegenover "sh" ("Olesjky"/"Oleshky", "Poesjkin"/"Pushkin"). Eén spelling voor
// de sleutel; na de alias, zodat "Tsjechië" eerst gewoon Tsjechië wordt.
const translit = (k) => k.replace(/sj/g, 'sh')
const NL_LANG = new Set(SOURCES.filter((x) => x.lang === 'nl').map((x) => x.id))
// Te algemeen om op zichzelf een gebeurtenis aan te wijzen: landen, steden, regeringsleiders,
// diensten. Twee verhalen die alleen zo'n naam delen gaan niet samen (zie sameEvent).
const WEAK = new Set(
  'us russia ukraine germany france uk china israel iran nederland europe nato un putin zelensky trump biden harris vance netanyahu musk xi macron starmer merz erdogan modi meloni orban schoof pentagon congress senate senaat congres kremlin whitehouse ice fbi cia nasa who gaza taiwan india japan canada mexico brazil turkije turkey syria syrie venezuela korea northkorea southkorea texas california florida georgia carolina virginia ohio michigan arizona nevada pennsylvania wisconsin washington brussel brussels londen london parijs paris moskou moscow kyiv kiev berlijn berlin seoul busan pyongyang tokio tokyo peking beijing jeruzalem jerusalem teheran tehran amsterdam rotterdam'.split(
    ' '
  )
)
const PARTIES = new Set(['republicans', 'democrats'])
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
  // Ook de nederlaag of zege van een Amerikaanse partij (keuring 6 november 2026: "Het grote vingerwijzen naar de
  // schuldigen van de Republikeinse nederlaag" noemde de verkiezing niet).
  ['election', /(\w*verkiezing\w*|\belection\w*|\bmidterm\w*|\bstembus|\bstemlokal\w*|\bhead to the polls|\b(republikein\w*|republican|democratische|democratic) (nederlaag|zege|overwinning|defeat|loss|losses|victory|sweep))\b/, false],
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
  const parties = new Set() // de Amerikaanse partijen (alleen voor sameSubject, niet voor de kop: centralItems)
  // De sleutel van een naam: de alias, in de uitgebreide stand ook in één spelling (translit).
  const aliasOf = (k) => (ext ? translit(alias[k] || k) : alias[k] || k)
  // De sterke sleutel van een woord, of null.
  const acronyms = new Set() // sleutels die uit een afkorting komen (XIV, PSG)
  // Ronde 2 (uitgebreide stand): in een Nederlands stuk is een naam met een bijvoeglijke of bezits-s dezelfde naam
  // ("Woudenbergs stel" naast "ouders Woudenberg"), als de naam zonder -s in de woordenschat staat en de vorm mét -s
  // niet. Niet in het Engels: daar is de -s een meervoud ("Democrats", "Elections").
  const dutchPiece = ext && NL_LANG.has(article.source)
  const nameOf = (w) => {
    const k = norm(w)
    if (vocab.has(k)) return k
    return dutchPiece && isCap(w) && k.length >= 6 && k.endsWith('s') && vocab.has(k.slice(0, -1)) && !alias[k] && !alias[k.slice(0, -1)] ? k.slice(0, -1) : null
  }
  const strongKey = (w) => {
    let key = null
    if (acr(w)) key = norm(w)
    // Alleen woorden mét hoofdletter die ook elders midden in een zin als naam voorkomen.
    else if (w.length >= minLen && isCap(w) && nameOf(w) && !(w.length === 3 && COMMON_3.has(norm(w)))) key = nameOf(w)
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
      if (PARTIES.has(k)) parties.add(k)
    }
    let key = null
    if (acr(w)) key = norm(w)
    else if (w.length >= minLen && isCap(w) && nameOf(w) && !(w.length === 3 && COMMON_3.has(norm(w)))) key = nameOf(w)
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
  const out = { eventScope: eventScope(article), words: sigWords(article.title), strong, weak, known, parties, concepts, rareIds: new Set(concepts_.filter(([id, , r]) => r && concepts.has(id)).map(([id]) => id)), t: timeOf(article), raw }
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
    out.actions = actionsOf(article.title)
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

// Ronde 2 · 5, de taalsplitsing in zeer duidelijke gevallen: dezelfde handeling in de kop, in het Nederlands of het
// Engels. Alleen handelingen die één feit aanwijzen (een vonnis, een sluiting, een opstappen, een arrestatie, een
// overlijden); samen met dezelfde eigen naam in beide koppen is dat dezelfde gebeurtenis (sameEvent regel E).
const ACTIONS = [
  ['vonnis', /\b(vonnis\w*|veroordeeld|veroordeling|celstraf\w*|cel|tbs|schuldig|vrijgesproken|vrijspraak|sentenced|sentence|convicted|guilty|acquitted|jailed|prison term)\b/],
  ['sluiting', /\b(stopt|stoppen|sluit|gesloten|opgeheven|bezwijkt|closes|closed|closure|to close|shuts down|shut down)\b/],
  ['opstappen', /\b(stapt op|stappen op|treedt af|opgestapt|resigns|resigned|resignation|steps down|quits)\b/],
  ['arrestatie', /\b(gearresteerd|aangehouden|opgepakt|arrestatie|arrested|detained)\b/],
  ['overlijden', /\b(overleden|overlijdt|sterft|dies|died)\b/],
]
const actionsOf = (title) => {
  const t = norm(title || '')
  return new Set(ACTIONS.filter(([, re]) => re.test(t)).map(([id]) => id))
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
  // E (ronde 2). Dezelfde eigen naam in beide koppen en dezelfde handeling in beide koppen, vlak na elkaar, ook over de
  // taalgrens: "Novaja Gazeta stopt" en "Novaya Gazeta announces closure", "Woudenbergs stel krijgt 20 jaar cel" en
  // "Celstraffen voor ouders Woudenberg". Precies één soort handeling per kop, zodat een overzichtskop niet alles bindt.
  if (ext && strong >= 1 && dt <= NAMES_WINDOW && a.actions?.size === 1 && b.actions?.size === 1 && [...a.actions][0] === [...b.actions][0] && sharedEntities(a, b, true) >= 1) return true
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
const BROAD = new Set(['us', 'europe', 'un', 'nato', 'uk', 'trump', 'whitehouse', 'congress', 'nederland', 'republicans', 'democrats'])
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
  for (const k of a.parties || []) if (b.parties?.has(k)) shared.push(k)
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
  const out = new Map([...articles, ...extra].map((a) => [a.id, signature(a, vocab, extended)]))
  sigVocab.set(out, { vocab, extended, heads: new Map() })
  return out
}
// De kenmerken van de getoonde koppen van de vorige Editie, met de woordenschat van `sig` (zoals selectForReader
// ze rekent): voor wie na de selectie nog plekken kiest (composePersonal, het brede verhaal).
export function previousHeads(sig, previous, now) {
  const v = sigVocab.get(sig)
  if (!v || !previous) return []
  const shown = previous.shown?.length ? previous.shown : [...(previous.titles || [])].map((title) => ({ title, publishedAt: new Date(previous.at || now).toISOString() }))
  return shown.map((a, k) => signature({ ...a, id: `vorige:${k}` }, v.vocab, v.extended))
}
// Het kenmerk van alleen de kop van een bericht, met de woordenschat van `sig` (zie subjectTaken). Pas
// uitgerekend als het nodig is, één keer per bericht.
const sigVocab = new WeakMap()
function headSignature(sig, item) {
  const v = sigVocab.get(sig)
  if (!v || !item) return null
  let h = v.heads.get(item.id)
  if (!h) v.heads.set(item.id, (h = signature({ ...item, text: '', summary: '' }, v.vocab, v.extended)))
  return h
}
// Eén plek per onderwerp: gaat een kandidaat over iets wat al een plek heeft (`placed`: kenmerken)?
// Een ander hoofdonderwerp is een ander verhaal (toets 4 november 2026): een verhaal van minstens OWN_STORY
// uitgevers is een eigen gebeurtenis en wordt alleen afgewezen als een van zijn koppen over hetzelfde
// onderwerp gaat, niet op de intro's. Gemeten: "Trump stopt de militaire steun aan Israël" (6 uitgevers, zes
// koppen zonder stembus) viel weg naast de uitslagbundel omdat drie intro's de verkiezingen noemden en beide
// Trump en de VS: twee brede namen plus één begrip (regel "twee gedeelde namen" in sameSubject). Kleinere
// verhalen en losse stukken blijven op kop én tekst vergeleken (een zijstuk met een andere kop).
export const OWN_STORY = 5
// Rekentijd: `placed` groeit alleen, dus per kandidaat onthouden tot waar er vergeleken is (`c.subj`); een
// afwijzing blijft een afwijzing, en daarna alleen de nieuwe plekken vergelijken.
function subjectTaken(sig, c, placed, items) {
  let m = c.subj
  if (!m || m.placed !== placed) m = c.subj = { placed, n: 0, hit: false }
  if (m.hit || m.n >= placed.length) return m.hit
  const fresh = placed.slice(m.n)
  m.n = placed.length
  return (m.hit = subjectIn(sig, c, fresh, items))
}
function subjectIn(sig, c, list, items) {
  const hit = (x) => !!x && list.some((s) => sameSubject(x, s))
  const pubs = c.st ? c.st.publisherCount ?? c.st.sourceCount ?? 0 : 0
  if (c.kind === 'story' && pubs >= OWN_STORY && items?.length) return items.some((i) => hit(headSignature(sig, i)))
  return c.ids.some((id) => sig.has(id) && hit(sig.get(id)))
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
// Resultatenpagina's, meepraatpagina's en draaiboeken van een verkiezingsnacht horen daar ook bij
// (4 november 2026: "Bekijk hier alle resultaten", "Praat mee en stel jouw vragen", "Spoorboekje
// midterms", "results live", "Live Results Map" trokken aan de midterms-bundel). Alleen aan het begin
// van de kop of na een dubbele punt: "Senaat in handen van de Democraten: bekijk hier de resultaten" is
// ook zo'n pagina, een gewone zin met "bekijk" niet.
const LIVE_TITLE = /^\W*live\b|\blive ?blog\b|\b(war|oorlog) (latest|live)\b|\blatest:|\blatest updates\b|(^|:\s*)(bekijk|vind|volg|lees) hier\b|^\W*praat mee\b|^\W*spoorboekje\b|\bresults live\b|\blive results\b|\blive briefing\b|:\s*all the news\s*$/i
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
  // 5. (H7, uitgebreide stand) De deeluitslagen van één stembusgang horen bij de uitslag.
  if (extended) mergeVoteResults(groups, sig)

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
    // Licht (games, cultuur, lifestyle, consumententech) uit álle stukken: het toestel kent alleen die van
    // je eigen bronnen. Altijd gezet (de soort, of false), zodat het toestel het niet uit een deel opnieuw
    // raadt; een oudere server zonder dit veld valt terug op wat het toestel heeft (lightStory).
    last.light = (!last.sport && lightStory({}, items)) || false
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
const US_MARKET = new Set(['wallstreet', 'nasdaq', 'us'])
const marketKey = (k) => (US_MARKET.has(k) ? 'us' : k)
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
  // Beursverhaal (ronde 3a, keuring 6 november 2026): een groot verhaal waarvan minstens de helft van de stukken een
  // beursbegrip heeft (`market`, uitgebreide stand), ook zonder twee eigen namen in de kern. De beurscrash van 5
  // november stond in een verhaal van acht uitgevers, een van twee (ND, AD) en zes losse stukken (de Volkskrant, FT,
  // SCMP): een koersval heeft geen eigen naam, alleen een markt ("Wall Street", "Nasdaq", "Amerikaanse beurs").
  for (const [gid, items] of groups) {
    if (new Set(items.map((i) => i.source)).size < CORE_FROM) continue
    if (items.filter((i) => sig.get(i.id)?.concepts.has('market')).length * 2 < items.length) continue
    let b = big.find((x) => x.gid === gid)
    if (!b) {
      const ts = items.map((i) => timeOf(i)).filter(Boolean)
      big.push((b = { gid, items, core: new Set(), weak: new Set(), concepts: new Set(), from: Math.min(...ts), to: Math.max(...ts), sources: new Set(items.map((i) => i.source)).size }))
    }
    b.market = new Set(items.flatMap((i) => [...(sig.get(i.id)?.strong || []), ...(sig.get(i.id)?.weak || [])].map(marketKey)))
  }
  if (!big.length) return
  // Een beursstuk past bij een beursverhaal: zelf een beursbegrip, binnen NAMES_WINDOW, en dezelfde markt genoemd
  // (Wall Street, Nasdaq en de VS als één markt, zie marketKey). Niet bij een tegenstrijdige gebeurtenis.
  const marketFit = (sa, b) => !!b.market && sa.concepts.has('market') && sa.t >= b.from - NAMES_WINDOW && sa.t <= b.to + NAMES_WINDOW && [...sa.strong, ...sa.weak].some((k) => b.market.has(marketKey(k))) && !b.items.some((i) => conflictingEvents(sa.eventScope, sig.get(i.id)?.eventScope))
  const marketOf = (sas) => big.filter((b) => sas.filter((sa) => sa && marketFit(sa, b)).length * 2 > sas.length).sort((x, y) => y.sources - x.sources || (x.gid < y.gid ? -1 : x.gid > y.gid ? 1 : 0))[0]
  const join = (b, items) => {
    b.items.push(...items)
    b.items.sort(byRecency)
  }
  // Een kleine groep (twee tot CORE_FROM bronnen) waarvan de meeste stukken bij één beursverhaal passen, gaat erin op.
  for (const [gid, items] of [...groups]) {
    const n = new Set(items.map((i) => i.source)).size
    if (n < 2 || n >= CORE_FROM) continue
    const b = marketOf(items.map((i) => sig.get(i.id)))
    if (!b || b.gid === gid) continue
    join(b, items)
    groups.delete(gid)
  }
  // De kern als kenmerk: sterke en zwakke namen van minstens de helft van de stukken, met de reeksen
  // van alle stukken (voor sharedEntities). Een instituut in de kern telt, net als in sameEvent, alleen
  // met een gedeeld land (sharedStrong).
  const coreSig = (b) => ({ strong: b.core, weak: b.weak, runs: [...b.items.map((i) => sig.get(i.id)?.runs || [])].flat() })
  for (const a of list) {
    if (inGroup.has(a.id) || a.type === 'opinie') continue
    const sa = sig.get(a.id)
    if (!sa || !sa.t) continue
    if (sa.strong.size < CORE_SHARED) {
      // Een los beursstuk zonder twee eigen namen: bij het beursverhaal waar het past.
      const b = marketOf([sa])
      if (b) (join(b, [a]), inGroup.add(a.id))
      continue
    }
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

// ---------- Stembus (H7) ----------
// Verkiezingsnacht 4 november 2026: de server verdeelde de midterms over twaalf verhalen (de uitslag in
// het Nederlands, de uitslag in het Engels, Senaatsraces per staat, gouverneurs, Trump die Fox keek). Het
// gewicht van elk stuk was te klein om de Editie te openen, en wat een eindredacteur als één verhaal
// ziet, stond in tien bundels. Geen namen of landen hier: een stembusstuk noemt een verkiezing (of
// kiezers, of iemand die gekozen wordt), een uitslagstuk ook wie er won, verloor of de meerderheid kreeg.
const VOTE_RE = /(verkiezing|\belection|\bmidterm|\bstembus|\b(elects?|elected|re-?elected|reelection|verkozen|herkozen|kiezers|voters|ballot|stembiljet)\b)/
const RESULT_RE = /\b(wint|winnen|wins?|won|gewonnen|verover\w*|herover\w*|flips?|flipped|verslaat|verslagen|beats?|defeats?|defeating|ousts?|ousting|unseats?|verliest|verliezen|verloren|loses|lost|verkozen|herkozen|elected|re-?elected|elects|clinch\w*|meerderheid|majority|uitslag\w*|results?|zege|monsterzege|overwinning\w*|victory|afstraffing|landslide|blue-?nami|tsunami|blauwe golf|blue wave|erkent verlies|concedes?|crushed|trounces?|rebuke)\b/
// Een zetel of ambt met een uitslag erbij is ook een stembusstuk ("Democrat Josh Turek flips Iowa Senate seat").
const OFFICE_RE = /\b(senate|senaat\w*|senator\w*|huiszetel\w*|congress\w*|congres\w*|governor\w*|gouverneur\w*|seats?|zetels?|mayor\w*|burgemeester\w*|parliament\w*|parlement\w*)\b/
const PARTY_RE = /\b(democrat\w*|republican\w*|republikein\w*)\b/
const voteText = (i) => norm(`${i.title || ''} ${i.summary || i.text || ''}`)
// 0: niets met een stembus; 1: een stembusstuk (voorbeschouwing, reportage, reactie); 2: een uitslagstuk.
// Een sportbron telt nooit. Niet op onderwerp: de onderwerpen zijn hier onbetrouwbaar ("race" gaf een
// Senaatsrace het onderwerp f1, en een Feyenoord-stuk had het onderwerp verkiezingen).
const voteMemo = new WeakMap()
export function voteKind(i) {
  if (!i || typeof i !== 'object') return 0
  if (voteMemo.has(i)) return voteMemo.get(i)
  const t = voteText(i)
  const sporty = SPORT_SOURCES.has(i.source)
  const result = RESULT_RE.test(t)
  const k = sporty || !(VOTE_RE.test(t) || (result && OFFICE_RE.test(t))) ? 0 : result ? 2 : 1
  voteMemo.set(i, k)
  return k
}
const SPORT_SOURCES = new Set(SOURCES.filter((x) => x.cat === 'sport').map((x) => x.id))
// Waar de stembus stond: de VS-rubriek of VS-politiek in de tekst, Nederland (Binnenland), anders het eerste
// land in de kop. Zonder plaats doet een stuk niet mee.
export function votePlace(i) {
  const ds = desksOf(i)
  const t = `${i.title || ''} ${i.summary || ''}`
  // Een Amerikaanse partij bij een zetel of ambt is de Amerikaanse stembus, ook als de staat ook een land
  // is (Georgia) of de kop geen land noemt ("Kansas elects first Democratic senator").
  if (ds.has('vs') || usPoliticsIn(t) || (PARTY_RE.test(norm(t)) && OFFICE_RE.test(norm(t)))) return 'us'
  if (ds.has('binnenland')) return 'nl'
  return countriesIn(i.title || '')[0] || null
}
// De plaats van een groep stukken: die van minstens de helft, anders geen.
function placeOfGroup(items) {
  const count = new Map()
  for (const i of items) {
    const p = votePlace(i)
    if (p) count.set(p, (count.get(p) || 0) + 1)
  }
  const best = [...count].sort((a, b) => b[1] - a[1] || textOrder(a[0], b[0]))[0]
  return best && best[1] * 2 >= items.length ? best[0] : null
}
// Een uitslag: een groot verhaal (minstens CORE_FROM uitgevers) waarvan minstens de helft van de stukken
// uitslagstukken zijn, met één plaats. Het uitslagmoment: het eerste kwart van de uitslagstukken met een
// uitslagwoord in de kop, min VOTE_LEAD. Niet het allereerste: "How We Model Election Results" en "voorlopige
// uitslagen mogelijk" verschijnen al als de stembussen dichtgaan. Wat daarvóór verscheen, is een
// voorbeschouwing.
export const VOTE_LEAD = 3 * 60 * 60 * 1000
export function voteResultOf(items = []) {
  const n = items.length
  if (!n || coverageOf(items).publisherCount < CORE_FROM) return null
  const results = items.filter((i) => voteKind(i) === 2)
  if (results.length * 2 < n) return null
  const place = placeOfGroup(items)
  if (!place) return null
  const heads = results.filter((i) => RESULT_RE.test(norm(i.title || ''))).map(timeOf).filter(Boolean).sort((a, b) => a - b)
  const from = heads.length ? heads[Math.floor(heads.length / 4)] - VOTE_LEAD : Math.min(...items.map(timeOf).filter(Boolean))
  return { place, from, to: Math.max(...items.map(timeOf)) }
}
// Een stembusgroep: een echte meerderheid van de stukken noemt de stembus ("US strikes Iranian island ahead
// of midterm elections" naast een Guardian-stuk over dezelfde aanval is geen stembusverhaal).
const voteGroup = (items) => items.filter((i) => voteKind(i) >= 1).length * 2 > items.length
// De uitslag zelf (Redacteur 3b, megabundels stoppen): een uitslagstuk (voteKind 2) met een uitslagwoord in de
// kop en zonder eigen hoofdpersoon in de kop ("Democraten heroveren Senaat en Huis", "Democrats Take Congress in a
// Landslide"). Een race met een naam ("El-Sayed wint in Michigan"), een reactie, een analyse, een beurs- of
// mediastuk dat de verkiezing noemt, is een eigen verhaal: dat hoort in de familie (families), niet in de bundel.
// Zonder `sig` (de kenmerken) telt elk uitslagstuk met een uitslagwoord in de kop.
// Een partij is geen hoofdpersoon ("Een Democratische tsunami", "Republikeinse nederlaag").
const ownName = (k) => !/^(democrat|republi|gop)/.test(k)
const resultPiece = (i, sig) => voteKind(i) === 2 && RESULT_RE.test(norm(i.title || '')) && !(sig?.get(i.id)?.titleRuns || []).flat().some(ownName)
// De uitslag bij een stembusgang: van elke stembusgroep (ook een los stuk) met dezelfde plaats gaan de stukken
// die de uitslag zelf melden (resultPiece) en van ná het uitslagmoment zijn (tot EVENT_WINDOW na het laatste
// stuk) naar de uitslag. Wat ouder is, of iets anders meldt, blijft waar het was. Keuring 6 november 2026: met
// elk stembusstuk erbij werd de uitslagbundel 49 tot 89 stukken (beurs, Hegseth, een mediarecensie, tankers in
// Hormuz), met een verkeerde kop. Twee uitslagen met dezelfde plaats (de Nederlandse en de Engelse) gaan samen
// in de grootste; de uitslag is de groep met de meeste stukken over de uitslag zelf, dan uitgevers, dan id.
function mergeVoteResults(groups, sig = null) {
  const anchors = []
  for (const [gid, items] of groups) {
    const r = voteResultOf(items)
    if (r) anchors.push({ gid, r, pubs: coverageOf(items).publisherCount, own: coverageOf(items.filter((i) => resultPiece(i, sig))).publisherCount })
  }
  if (!anchors.length) return
  anchors.sort((a, b) => b.own - a.own || b.pubs - a.pubs || textOrder(a.gid, b.gid))
  const absorbed = new Set()
  for (const a of anchors) {
    if (absorbed.has(a.gid) || !groups.has(a.gid)) continue
    const target = groups.get(a.gid)
    for (const [gid, items] of [...groups]) {
      if (gid === a.gid || !voteGroup(items) || placeOfGroup(items) !== a.r.place) continue
      const vote = items.filter((i) => voteKind(i) >= 1 && timeOf(i) >= a.r.from && timeOf(i) <= a.r.to + EVENT_WINDOW && !target.some((x) => conflictingEvents(eventScope(x), eventScope(i))))
      const move = vote.filter((i) => resultPiece(i, sig))
      // De overige stembusstukken van een gemengde groep (reacties op de uitslag naast de Israël-steun) worden
      // samen een eigen verhaal, in de familie: zo houdt het andere nieuws zijn eigen bundel.
      const apart = items.some((i) => voteKind(i) === 0) ? vote.filter((i) => !move.includes(i)) : []
      if (!move.length && !apart.length) continue
      target.push(...move)
      const rest = items.filter((i) => !move.includes(i) && !apart.includes(i))
      if (rest.length) groups.set(gid, rest)
      else groups.delete(gid)
      if (apart.length) groups.set(`${gid}|stembus`, apart.sort(byRecency))
      absorbed.add(gid)
    }
    target.sort(byRecency)
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
export const EDITION_SIZE = EDITION_TARGET
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
  const { year, month, day, minutes } = amsterdamClock(now)
  const today = `${year}-${month}-${day}`
  // Drie edities per dag, op de minuut (shared/slot-times.mjs): ochtend, middag en avond.
  if (minutes >= SLOT_START.avond) return { id: `${today}-avond`, slot: 'avond', date: today, next: hhmm(SLOT_START.ochtend) }
  if (minutes >= SLOT_START.middag) return { id: `${today}-middag`, slot: 'middag', date: today, next: hhmm(SLOT_START.avond) }
  if (minutes >= SLOT_START.ochtend) return { id: `${today}-ochtend`, slot: 'ochtend', date: today, next: hhmm(SLOT_START.middag) }
  // Vóór de ochtend geldt de avondeditie van gisteren. Gisteren op de kalender, niet "nu min zoveel
  // uur": op de nacht van de wintertijd valt een vaste aftrek anders op dezelfde datum.
  const d = new Date(Date.UTC(+year, +month - 1, +day - 1))
  const date = d.toISOString().slice(0, 10)
  return { id: `${date}-avond`, slot: 'avond', date, next: hhmm(SLOT_START.ochtend) }
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

// ---------- De kop van een plek (H7) ----------
// Verkiezingsnacht 4 november 2026: de midterms-bundel had 64 stukken, en de nieuwste kop met een eigen bron
// was "Feestende Texanen gaan de straat op" (een reportage), de tweede midterms-plek kreeg een Engelse
// NYT-kop terwijl AD en ND het in het Nederlands brachten. Twee regels, na vers-boven-achtergrond:
// 1. Kern (alleen vanaf LEAD_CORE stukken): de kop komt uit de stukken die het verhaal samenvatten, de koppen
//    die bestaan uit de namen en begrippen die de andere koppen ook noemen (in de uitgebreide stand, zodat
//    "Senaat" en "Senate" één naam zijn). Hooguit 40 procent onder de beste. Een vraag als kop alleen als er niets
//    anders is, en een stuk dat meer dan BACKGROUND_GAP ouder is dan het nieuwste ook (freshest).
// 2. Taal: Hoot is Nederlandstalig. Een Nederlands stuk gaat voor, dan een Vlaams, dan de rest; pas daarbinnen
//    eigen bronnen eerst. Taal van het stuk zelf (shared/lang.mjs): een Engelstalig Parool-stuk is Engels.
const LANG_OF = new Map(SOURCES.map((x) => [x.id, x.lang]))
const dutchTier = (i) => (LANG_OF.get(i.source) !== 'nl' || detectLang(i) === 'en' ? 2 : VL_HOME.has(i.source) ? 1 : 0)
export const LEAD_CORE = 10
// `total`: hoeveel stukken het hele verhaal heeft (een toestel kent alleen die van de eigen bronnen).
export function centralItems(items, total = items.length) {
  if (total < LEAD_CORE || items.length < 3) return items
  // Alleen de koppen: een rijke intro noemt alles (een reportage over feestende Texanen noemt ook de
  // verkiezingen en de Democraten), de kop zegt waar het stuk over gaat. De woordenschat van namen komt wel
  // uit kop en intro van alle stukken.
  const sig = signatures(items, items.map((i) => ({ id: `kop:${i.id}`, title: i.title, publishedAt: i.publishedAt })), { extended: true })
  const keys = items.map((i) => {
    const x = sig.get(`kop:${i.id}`)
    // `known`: de algemene namen (landen, kamers, partijen) ook aan het begin van een kop; die hebben geen
    // woordenschat nodig, en een toestel met negen stukken heeft er weinig.
    return new Set([...x.strong, ...x.weak, ...x.known, ...x.concepts])
  })
  // Hoe gewoon zijn de namen en begrippen van een kop in deze bundel? Per sleutel het aantal andere koppen
  // waarin hij staat, gemiddeld over de kop. Een samenvattende kop bestaat uit wat iedereen noemt ("Senaat",
  // "Trump", de verkiezing); een deelstuk heeft eigen namen (een kandidaat, een staat) en zakt. Minstens twee
  // sleutels: één gewone naam is nog geen samenvatting.
  const freq = new Map()
  for (const ks of keys) for (const x of ks) freq.set(x, (freq.get(x) || 0) + 1)
  const score = keys.map((ks) => (ks.size >= 2 ? [...ks].reduce((n, x) => n + freq.get(x) - 1, 0) / ks.size : 0))
  const best = Math.max(...score)
  const out = items.filter((_, k) => score[k] > 0 && score[k] * 5 >= best * 3)
  return out.length ? out : items
}
// De volgorde binnen de kandidaten die vers genoeg zijn: Nederlands, Vlaams, rest; binnen elke laag de
// bestaande volgorde (leadCandidates). Uitvoer: de eerste niet-lege laag.
export function dutchFirst(items) {
  for (const tier of [0, 1]) {
    const out = items.filter((i) => dutchTier(i) === tier)
    if (out.length) return out
  }
  return items
}

// Vers binnen de bundel: een stuk dat meer dan BACKGROUND_GAP ouder is dan het nieuwste verse stuk, is
// achtergrond van vóór het nieuws (4 november 2026: het Wired-interview met Mamdani van de dag ervoor,
// "Ahead of the midterms", was de kop boven NPR over zijn verkiezingsnacht). Alleen als er nieuwer is.
export const BACKGROUND_GAP = 12 * 60 * 60 * 1000
export function freshest(items) {
  const newest = Math.max(...items.map(timeOf))
  const out = items.filter((i) => newest - timeOf(i) <= BACKGROUND_GAP)
  return out.length ? out : items
}

// ---------- Onderwerpfamilies (H7) ----------
// Eén onderwerp, één gewicht, alleen voor de stembus na een uitslag. Een stembusverhaal naast een ander
// stembusverhaal met dezelfde plaats (zie voteKind) kreeg
// alleen het gewicht van zijn eigen bundel, en het andere verhaal werd afgewezen zonder dat zijn bronnen
// ergens meetelden. Op de verkiezingsnacht opende daardoor een Spaans ministersontslag (15 uitgevers) boven
// de midterms (11 in het grootste verhaal, 23 over alle verhalen).
// De familie: het grootste verhaal (uitgevers, dan gewicht, dan id) neemt zijn directe verwanten mee die nog
// in geen familie zitten; geen ketting (familyRelated). Het hoofd van de familie telt alle uitgevers van de
// familie, als dat groot nieuws is (FRONT_BIG); de rest houdt zijn eigen gewicht.
// Plafond: van een stembusfamilie hooguit FAMILY_MAX plekken; na de eerste geen tweede uitslagverhaal (een
// losse race) en geen voorbeschouwing van vóór het uitslagmoment.
// Redacteur 3b: één plek. Sinds de uitslagbundel alleen de uitslag zelf neemt (mergeVoteResults), staan de races,
// reacties en analyses als eigen verhalen in de familie; zij tellen mee in het gewicht van het hoofd, maar een
// tweede plek over dezelfde stembus is een dubbele plek (één gebeurtenis, één plek).
export const FAMILY_MAX = 1
// Ronde 2 (besluit van Alex, 4 november: "Trump accepteert de nederlaag" als aparte plek 2): twee plekken voor één
// gebeurtenis alleen op een uitzonderlijke nieuwsdag, en alleen in de algemene Editie (`general`): het verhaal dat al een
// plek heeft, is zelf door minstens FAMILY_WIDE_PUBS uitgevers gebracht (niet opgeteld over de familie), en het tweede verhaal is een echte tweede ontwikkeling: een ander feit, niet
// dezelfde uitslag (geen uitslagverhaal, geen voorbeschouwing, geen curiosum, geen opinie als kop), zelf gebracht door
// minstens FAMILY_SECOND_PUBS uitgevers, en vers: het nieuwste stuk is van het laatste dagdeel (SECOND_FRESH_H uur).
// Zo'n tweede plek mag over dezelfde namen gaan als de eerste (sameSubject telt alleen tegenover de rest). Anders één plek.
export const FAMILY_WIDE_MAX = 2
export const FAMILY_WIDE_PUBS = 15
export const FAMILY_SECOND_PUBS = 4
export const SECOND_FRESH_H = 6
// Verwant is alleen een stembusverhaal met dezelfde plaats, op een dag mét uitslag (c.vote, zie families).
// Niet via een gedeelde naam (sameSubject): toets 4 november 2026, op 30 oktober opende "Paus Leo brengt als
// eerste paus zijn stem uit" (7 uitgevers) de Editie, omdat alles met Trump of de verkiezingen bij hem optelde
// (Venezuela, Wall Street, een reportage uit Michigan). Vóór een uitslag zijn het losse verhalen.
const familyRelated = (a, b) => !!a.vote && a.vote === b.vote
// Zet op elke verhaalkandidaat `fam` (de familie-id, het id van het hoofd) en `vote` (stembusplaats of null);
// het hoofd krijgt `famPubs` (alle uitgevers). Ook `voteFrom`: per stembusplaats het uitslagmoment van de
// grootste uitslag. Uitvoer: { extra(c) } met de extra uitgevers voor het gewicht.
function families(cands) {
  const stories = cands.filter((c) => c.kind === 'story')
  const voteFrom = new Map()
  for (const c of stories) {
    const items = [...c.items].sort(byRecency)
    c.items = items
    const r = voteResultOf(items)
    if (r && (!voteFrom.has(r.place) || coverageOf(items).publisherCount > voteFrom.get(r.place).pubs)) voteFrom.set(r.place, { from: r.from, pubs: coverageOf(items).publisherCount })
  }
  // Een stembusfamilie bestaat alleen als er een uitslag is: vóór de uitslag zijn het losse
  // voorbeschouwingen (de paus die stemt, een campagnetoespraak), geen één gebeurtenis.
  for (const c of stories) {
    const place = voteGroup(c.items) ? placeOfGroup(c.items) : null
    c.vote = place && voteFrom.has(place) ? place : null
    c.voteResult = !!c.vote && c.items.filter((i) => voteKind(i) === 2).length * 2 >= c.items.length
  }
  const pubsOf = (c) => c.st.publisherCount ?? c.st.sourceCount ?? coverageOf(c.items).publisherCount
  const order = [...stories].sort((a, b) => pubsOf(b) - pubsOf(a) || b.w - a.w || textOrder(a.st.id, b.st.id))
  const extra = new Map()
  for (const head of order) {
    if (head.fam) continue
    head.fam = head.st.id
    const own = new Set(head.items.map((i) => publisherOf(i.source)))
    const all = new Set(own)
    for (const c of order) {
      if (c.fam || !familyRelated(head, c)) continue
      c.fam = head.st.id
      for (const i of c.items) all.add(publisherOf(i.source))
    }
    const total = pubsOf(head) + (all.size - own.size)
    if (all.size > own.size && total >= FRONT_BIG) extra.set(head, all.size - own.size)
  }
  for (const c of stories) c.voteFrom = c.vote ? voteFrom.get(c.vote).from : null
  return extra
}
// De stembusfamilie per verhaal, voor wie de plekken niet zelf kiest (composePersonal: brede verhalen en
// aanvulling): verhaal-id → stembusplaats, alleen voor een plaats met een uitslag. `byId`: de bekende stukken.
export function voteFamilyOf(stories = [], byId = new Map()) {
  const itemsOf = (st) => (st.itemIds || []).map((id) => byId.get(id)).filter(Boolean)
  const places = new Set()
  for (const st of stories) {
    const r = voteResultOf(itemsOf(st).sort(byRecency))
    if (r) places.add(r.place)
  }
  const out = new Map()
  if (!places.size) return out
  for (const st of stories) {
    const items = itemsOf(st)
    const place = items.length && voteGroup(items) ? placeOfGroup(items) : null
    if (place && places.has(place)) out.set(st.id, place)
  }
  return out
}
// Mag deze kandidaat nog bij de plekken van zijn familie? `placedC`: de kandidaten die al een plek hebben.
// `wide`: de algemene Editie mag op een uitzonderlijke nieuwsdag een tweede plek geven (FAMILY_WIDE_MAX).
const secondFact = (c, now) => !!now && now - timeOf({ publishedAt: c.st.latestAt }) <= SECOND_FRESH_H * 36e5 && !c.voteResult && (c.st.publisherCount ?? coverageOf(c.whole || c.items).publisherCount) >= FAMILY_SECOND_PUBS && !curioStory(c.st, c.items) && c.items.filter((i) => !isOpinion(i)).length * 2 > c.items.length
// Is `c` op deze dag een tweede plek voor een familie die er al één heeft (alleen met `wide`)?
function wideSecond(c, placedC, now) {
  if (c.kind !== 'story' || !c.vote) return false
  const mates = placedC.filter((x) => x.kind === 'story' && x.vote === c.vote)
  const pubs = (x) => x.st.publisherCount ?? coverageOf(x.whole || x.items).publisherCount
  return mates.length >= FAMILY_MAX && mates.length < FAMILY_WIDE_MAX && mates.some((x) => pubs(x) >= FAMILY_WIDE_PUBS) && secondFact(c, now)
}
function familyRoom(c, placedC, wide = false, now = null) {
  if (c.kind !== 'story' || !c.vote) return true
  const mates = placedC.filter((x) => x.kind === 'story' && x.vote === c.vote)
  if (!mates.length) return true
  if (mates.length >= (wide ? FAMILY_WIDE_MAX : FAMILY_MAX)) return false
  if (mates.length >= FAMILY_MAX && !(wide && wideSecond(c, placedC, now))) return false
  if (c.voteResult && mates.some((x) => x.voteResult)) return false // geen losse race naast de uitslag
  return !(c.voteFrom && timeOf({ publishedAt: c.st.latestAt }) < c.voteFrom) // geen voorbeschouwing na de uitslag
}

// De kandidaten voor de kop van een plek, na de vaste volgorde van leadCandidates: elke voorkeur alleen als
// er iets overblijft. `own` (optioneel): eigen bronnen eerst, vóór de kern (de persoonlijke Editie).
const prefer = (xs, f) => {
  const ys = xs.filter(f)
  return ys.length ? ys : xs
}
// Een sportbron is nooit de kop van een verhaal dat geen sport is (toets 4 november 2026: "ESPN: NYC Marathon
// runner dies" werd de kop van een bundel over mazelen en een marathon, in een Editie zonder sportkeuze).
export function leadPool(cands, items, now, own = null, total = items.length) {
  let xs = prefer(cands, (i) => !isStale(i, now))
  if (!sportStory({}, items)) xs = prefer(xs, (i) => !SPORT_SOURCES.has(i.source))
  if (own) xs = prefer(xs, own)
  const core = new Set(centralItems(items, total))
  xs = prefer(xs, (i) => core.has(i))
  xs = prefer(xs, (i) => !/\?/.test(i.title || ''))
  return dutchFirst(freshest(xs))
}

// Plek 01 opent met nieuws (keuring 6 november 2026: "Opinie is nooit een hoofdartikel"; de NYT-beschouwing "Trump
// Tried to Undermine the Nation's Elections. It Didn't Work." was de kop van het hoofdverhaal). Na de volgorde:
// - heeft de eerste plek alleen opinie (isOpinion), dan schuift de eerste plek met nieuws naar voren;
// - is de kop van de eerste plek opinie of een beschouwende kop (verdictTitle), dan kiest `pick` een nieuwe kop uit
//   de nieuwsstukken van het verhaal, liefst zonder beschouwende kop. Een opiniestuk blijft gewoon lid.
// `itemsOf(e)`: de bekende stukken van een plek. `pick(kandidaten, alle stukken)`: de kop. Wijzigt `entries` (de plek
// met een nieuwe kop is een kopie).
export function openWithNews(entries, { itemsOf, pick }) {
  const news = (e) => itemsOf(e).some((i) => i && !isOpinion(i))
  const k = entries.findIndex(news)
  if (k < 0) return entries
  if (k > 0) entries.unshift(...entries.splice(k, 1))
  const e = entries[0]
  if (e.kind !== 'story') return entries
  const items = itemsOf(e).filter(Boolean)
  const lead = items.find((i) => i.id === e.leadId)
  if (!lead || (!isOpinion(lead) && !verdictTitle(lead))) return entries
  const fresh = items.filter((i) => !isOpinion(i))
  const plain = fresh.filter((i) => !verdictTitle(i))
  if (!isOpinion(lead) && !plain.length) return entries
  const next = pick(plain.length ? plain : fresh, items)
  if (next && next.id !== lead.id) entries[0] = { ...e, leadId: next.id, ...('title' in e ? { title: next.title || null } : {}) }
  return entries
}

// Curiosa nooit in de top 3 (Redacteur 3b · 5, besluit van Alex; keuring 6 november: "veel uitgevers bij een
// kuriositeit (Oval Office) mag geen top 3 opleveren", liefst plek 6–10). Generiek herkend (ronde 2: geen woorden die
// bij één dag horen, zoals "Oval Office" of "komiek"):
// - de soort: een licht verhaal (lightNews: cultuur, games, lifestyle, consumententech, ook als algemene uitgevers het
//   groot vinden);
// - of minstens een derde van de stukken is luchtig naar rubriek (een bekende luchtige sectie in het URL-pad:
//   opmerkelijk, bizar, showbizz …), naar vorm (een kop die opent met "Opmerkelijk:", "Kijk:", een quiz) of naar
//   onderwerp (goud en verguldsel, een monument, een balzaal, een beroemdheid; niet de goudprijs).
// Ernstig nieuws is nooit een curiosum: gaat minstens de helft van de stukken over een rechtszaak, geweld of de dood,
// dan blijft het nieuws, wat de rubriek ook is (keuring: de veroordeling van Russell Brand voor verkrachting).
const CURIO_HEAD = /\b(goud|gouden|gold(?! (?:price|prices|reserves?|futures|standard|mines?|bars?|rally))|golden|gilded|gold-covered|vergulde?|monument|monumenten|monuments|balzaal|ballroom|beroemdhe\w*|celebrit\w*|showbizz)\b/
const CURIO_PATH = /\/(opmerkelijk|bizar|curiosa|weird\w*|offbeat|oddities|odd-news|strange|showbizz|celebrity|celebrities|entertainment|lifestyle)\//
const CURIO_FORM = /^\W*(opmerkelijk|bizar|curieus|kijk|quiz)\b|\bquiz\b/
const SERIOUS = /\b(rechtszaak|rechtbank|rechter|proces|jury|veroordeel\w*|schuldig\w*|celstraf\w*|gevangenis\w*|verkracht\w*|aanranding|misbruik\w*|moord\w*|doodgeschoten|doodgestoken|gedood|doden|dode|dood|omgekomen|dodelijk\w*|geweld\w*|aanslag\w*|schietpartij\w*|steekpartij\w*|mishandel\w*|trial|court|convicted|guilty|sentenced|prison|rape|raped|sexual assault|murder\w*|killed|killing|shooting|stabbing|violence|violent)\b/
const curioPiece = (i) => {
  const title = norm(i?.title || '')
  return CURIO_HEAD.test(title) || CURIO_FORM.test(title) || CURIO_PATH.test(String(i?.url || '').split('?')[0].toLowerCase())
}
export function curioStory(story = {}, items = []) {
  if (!items.length) return false
  if (items.filter((i) => SERIOUS.test(norm(`${i?.title || ''}`))).length * 2 >= items.length) return false
  if (lightNews(story, items)) return true
  return items.filter(curioPiece).length * 3 >= items.length
}
// Schuift een curiosum uit de top 3 naar plek 6 (of het eind, als de Editie korter is). `itemsOf(e)`: de stukken van
// een plek, `storyOf(e)`: het verhaal (of {}). De bubbel doet niet mee. Wijzigt `entries`.
export function curiosaDown(entries, { itemsOf, storyOf = () => ({}), top = 3, to = 5 }) {
  const out = []
  for (let k = Math.min(top, entries.length) - 1; k >= 0; k--) {
    const e = entries[k]
    if (e.desk === 'bubbel' || !curioStory(storyOf(e) || {}, itemsOf(e).filter(Boolean))) continue
    out.unshift(...entries.splice(k, 1))
  }
  if (out.length) entries.splice(Math.min(to - out.length + 1, entries.length), 0, ...out)
  return entries
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
  const clashes = (c) => subjectTaken(sig, c, placed, c.items)
  const place = (ids) => {
    for (const id of ids) if (sig.has(id)) placed.push(sig.get(id))
  }
  const pickLead = (items) => {
    const all = leadCandidates(items, mainIds, preferred, now, { role: entries.length < 3 ? 'front' : 'neutral' })
    const cands = all.some((i) => !isGallery(i)) ? all.filter((i) => !isGallery(i)) : all // geen galerij als kop, ook niet als enige eigen bron
    // Vers nieuws eerst: een achtergrondstuk van gisteren wordt alleen de kop als er niets recents
    // is. Ook niet om de bronnen te spreiden of omdat de verse bron al vaak de kop is.
    // Uit een grote bundel een kop die het verhaal samenvat, geen vraag, de verste stukken, in het
    // Nederlands als het kan (H7: leadPool).
    const recent = leadPool(cands, items, now)
    // Daarbinnen eigen bronnen eerst.
    const ownOnly = recent.filter((i) => mainIds.has(i.source))
    const from = ownOnly.length ? ownOnly : recent
    return from.find((i) => i.source !== prevLead && (leadCount[i.source] || 0) < MAX_LEADS_PER_SOURCE) || from.find((i) => (leadCount[i.source] || 0) < MAX_LEADS_PER_SOURCE) || from[0]
  }
  // De kop van plek 01 uit `xs` (een deel van de stukken van het verhaal), met de regels van pickLead voor de voorpagina.
  const frontLead = (xs, items) => {
    const all = leadCandidates(xs, mainIds, preferred, now, { role: 'front' })
    const recent = leadPool(all.some((i) => !isGallery(i)) ? all.filter((i) => !isGallery(i)) : all, items, now)
    const own = recent.filter((i) => mainIds.has(i.source))
    return (own.length ? own : recent)[0]
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
    // Games, cultuur, lifestyle en consumententech zijn ook een eigen soort (4 november 2026: GTA VI en
    // Elder Scrolls VI op plek 3 en 4): alleen als algemene nieuwsuitgevers het groot nieuws vinden.
    if (lightNews(st, items) && !majorGeneralNews(st, items)) continue
    const per = storyDesks(items)
    const fav = preferred?.size && items.some((i) => preferred.has(i.source)) ? FAVORITE_BONUS : 0
    cands.push({ kind: 'story', st, items, ids: st.itemIds, desks: new Set(per.flatMap((x) => [...x])), primary: primaryDesk(per), w: weight({ sourceCount: st.publisherCount ?? st.sourceCount, latestAt: st.latestAt }, now) - repeatPenalty(st, items, previous) + fav })
  }
  for (const it of pool) {
    if (!mainIds.has(it.source) || it.kind !== 'article' || it.type === 'opinie' || it.storyId || isLive(it)) continue // een liveblog is geen editieplek
    if (!fresh(it.publishedAt, 14) || !(it.summary || it.image)) continue
    if (previous?.itemIds?.has(it.id)) continue // stond er al
    if (isGallery(it) || lightVideoFiller(it) || lightNews({}, [it])) continue // een galerij of een licht stuk is geen eigen plek
    const desks = desksOf(it)
    cands.push({ kind: 'item', it, ids: [it.id], desks, primary: primaryDesk([desks]), w: weight({ sourceCount: 1, latestAt: it.publishedAt }, now) - 2 + (preferred?.has(it.source) ? FAVORITE_BONUS : 0) })
  }
  if (bonus) for (const c of cands) c.w += bonus(c.kind === 'story' ? c.items : [c.it])
  // Eén onderwerp, één gewicht (H7): het hoofd van een familie telt alle uitgevers van de familie.
  for (const [c, n] of families(cands)) c.w += 4 * n
  cands.sort((a, b) => b.w - a.w)

  const used = new Set()
  const placedC = []
  const take = (c, desk) => {
    if (used.has(c) || clashes(c) || !familyRoom(c, placedC)) return false
    used.add(c)
    placedC.push(c)
    place(c.ids)
    if (c.kind === 'story') {
      const lead = pickLead(c.items)
      leadCount[lead.source] = (leadCount[lead.source] || 0) + 1
      prevLead = lead.source
      entries.push({ kind: 'story', id: c.st.id, leadId: lead.id, desk, w: c.w })
    } else entries.push({ kind: 'item', id: c.it.id, desk, w: c.w })
    candOf.set(entries[entries.length - 1], c)
    return true
  }
  const candOf = new Map()
  // 1. Per rubriek het belangrijkste verhaal.
  //    Eerst wat er vooral over gaat; alleen als dat er niet is, iets wat het ook raakt.
  for (const desk of DESKS) {
    if (entries.length >= size) break
    if (!cands.some((c) => c.primary === desk && take(c, desk)) && !strict) cands.some((c) => c.desks.has(desk) && take(c, desk))
  }
  // 2. Aanvullen met het belangrijkste wat er verder is, onder zijn eigen rubriek (4 november 2026: een
  //    VS-verhaal dat hier binnenkwam, stond zonder rubriek in de Editie).
  for (const c of cands) {
    if (entries.length >= size) break
    take(c, c.primary ?? null)
  }
  // Volgorde: belangrijkste eerst (het hoofdverhaal is het zwaarste nieuws van het moment).
  entries.sort((a, b) => b.w - a.w)
  // Plek 01 opent met nieuws, met een nieuwskop (openWithNews).
  openWithNews(entries, { itemsOf: (e) => candOf.get(e)?.items || [], pick: (xs, items) => frontLead(xs, items) })
  return entries.map(({ w, ...e }) => e)
}

// De persoonlijke selectie (De Redacteur, Hoot-design/algoritme/bouwspec.md §3). Zelfde kandidaten,
// hoofdbericht-regels, één plek per onderwerp en verhaalvenster als selectEdition (sinds Redacteur 3b niet meer
// de algemene Editie: die is selectForReader met een leeg profiel, generalEdition in build.mjs; selectEdition
// blijft voor de meetlat en de toetsen), met vijf verschillen:
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
export const DESK_MIN_PUBS = 3
// Eenbronsstukken in de algemene Editie (Redacteur 3b · ronde 2, keuring 6 november: zeven van de tien plekken met één
// uitgever, onder meer "Griezelen in Walibi", "NRC: Oproep" en een kortingsactie): met `general` krijgt een stuk of verhaal
// van één uitgever alleen een plek als er geen vers verhaal van minstens SPREAD_MIN uitgevers meer over is dat een plek mag.
// De persoonlijke Editie houdt haar eigen bronnen: daar is één eigen stuk juist een keuze.
export const SPREAD_MIN = 3
// Een stuk zonder titel krijgt nooit een plek, en is nooit de kop van een verhaal (31 oktober: "NRC: undefined").
export const titled = (i) => !!String(i?.title ?? '').trim()
export function selectForReader(stories, pool, { mainIds = new Set(), now = Date.now(), size = EDITION_SIZE, previous = null, preferred = null, prof = profileOf(), ctx = {}, plan = true, seed = '', audit = null, allowLight = false, general = false } = {}) {
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
  const placedBy = [] // per kenmerk in `placed`: de kandidaat die de plek kreeg
  let placedC = []
  const clashes = (c) => {
    // Een tweede plek voor één gebeurtenis (alleen algemeen, wideSecond) mag over dezelfde namen gaan als zijn familie.
    if (general && wideSecond(c, placedC, now)) return subjectIn(sig, c, placed.filter((_, k) => placedBy[k]?.vote !== c.vote), c.items) || (!c.vervolg && same(c.ids, vorige))
    return subjectTaken(sig, c, placed, c.items) || (!c.vervolg && same(c.ids, vorige))
  }
  const place = (ids, owner = null) => {
    for (const id of ids) if (sig.has(id)) { placed.push(sig.get(id)); placedBy.push(owner) }
  }
  const pickLead = (items, total = items.length) => {
    if (items.some(titled)) items = items.filter(titled)
    const all = leadCandidates(items, mainIds, preferred, now, { role: entries.length < 3 ? 'front' : 'neutral' })
    const cands = all.some((i) => !isGallery(i)) ? all.filter((i) => !isGallery(i)) : all // geen galerij als kop, ook niet als enige eigen bron
    // Eigen bronnen eerst; daarbinnen een samenvattende kop, geen vraag, de verste stukken, in het
    // Nederlands als het kan (H7: leadPool).
    const from = leadPool(cands, items, now, (i) => mainIds.has(i.source), total)
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
    if (!items.some(titled)) { reject('story', st.id, st.itemIds, 'zonder-titel'); continue }
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
    if (!titled(it)) { reject('item', it.id, [it.id], 'zonder-titel'); continue }
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
  // Eén onderwerp, één gewicht (H7): het hoofd van een familie telt alle uitgevers van de familie, ook voor
  // de voorpagina (belang).
  for (const [c, n] of families(cands)) {
    c.w += 4 * n
    c.belang += 4 * n
  }
  cands.sort(heaviest)

  const used = new Set()
  placedC = []
  const foreign = c => c.intl ?? internationalNews(c.items, c.desk, c.st)
  const cappedWorld = c => cappedInternational(prof,c.whole || c.items,c.desk,c.st)
  const admissible = (c) => !used.has(c) && !clashes(c) && familyRoom(c, placedC, general, now) && allowedNews(prof, c.st || { sourceCount: 1 }, c.items, c.desk, { allowLight }) && !(plan && !worldChosen(prof) && cappedWorld(c) && entries.filter(e => { const x = cands.find(c => c.id === e.id); return x && cappedWorld(x) }).length >= INT_MAX)
  // De spreiding van een kandidaat: het aantal onafhankelijke uitgevers van het hele verhaal (een los stuk: één).
  const spread = (c) => (c.kind === 'item' ? 1 : c.st.publisherCount ?? coverageOf(c.whole || c.items).publisherCount)
  // Is er nog een vers verhaal van minstens SPREAD_MIN uitgevers dat een plek mag? Eén keer per stand van de Editie.
  let strongAt = -1
  let strong = false
  const strongLeft = () => {
    if (strongAt !== entries.length) {
      strongAt = entries.length
      strong = cands.some((x) => x.kind === 'story' && !x.parts.seen && spread(x) >= SPREAD_MIN && !capped(x) && admissible(x))
    }
    return strong
  }
  const relead = (c) => {
    const mate = placedC.find((x) => x.kind === 'story' && x.vote === c.vote)
    const e = mate && entries.find((x) => x.kind === 'story' && x.id === mate.st.id)
    if (!e) return
    const theirs = c.ids.map((id) => sig.get(id)).filter(Boolean)
    const own = mate.items.filter((i) => titled(i) && !(sig.has(i.id) && theirs.some((t) => sameSubject(sig.get(i.id), t))))
    const pool = own.some((i) => voteKind(i) === 2) ? own.filter((i) => voteKind(i) === 2) : own
    if (!pool.length || pool.some((i) => i.id === e.leadId)) return
    const lead = leadPool(leadCandidates(pool, mainIds, preferred, now, { role: 'front' }), mate.items, now)[0]
    if (lead) Object.assign(e, { leadId: lead.id, title: lead.title || null })
  }
  const take = (c, desk, extra = {}) => {
    if (!admissible(c)) return false
    if (general && spread(c) <= 1 && strongLeft()) return false
    // Een tweede plek voor één gebeurtenis: de eerste plek houdt dan een kop over de uitslag zelf, niet over het
    // tweede feit (anders staat hetzelfde feit twee keer bovenaan).
    const second = general && wideSecond(c, placedC, now)
    // De algemene Editie kijkt ook naar wat de lezer ziet: de kop van deze plek mag niet over hetzelfde onderwerp gaan
    // als de kop van een andere plek (5 november: "Trump Media's Shares Fall … After Midterms" en "What Makes These
    // Election Results So Historic", twee verhalen waarvan de stukken elkaar net niet raakten).
    if (general && !second && c.kind === 'story') {
      const lead = pickLead(c.dev ? c.dev.fresh : c.items, c.dev ? c.dev.fresh.length : c.st.itemIds.length)
      if (lead && sig.has(lead.id) && entries.some((e) => sig.has(e.leadId || e.id) && sameSubject(sig.get(lead.id), sig.get(e.leadId || e.id)))) return false
    }
    if (second) relead(c)
    used.add(c)
    placedC.push(c)
    place(c.ids, c)
    const base = { desk, w: c.w, parts: c.parts, sourceCount: c.sc, big: majorNews(c.st || {sourceCount:1}, c.items), ...(c.vervolg ? { vervolg: c.vervolg } : {}), ...extra }
    if (c.kind === 'story') {
      // De kop van een ontwikkeld verhaal is het zwaarste nieuwe stuk, niet een oud stuk uit een andere bron.
      const lead = pickLead(c.dev ? c.dev.fresh : c.items, c.dev ? c.dev.fresh.length : c.st.itemIds.length)
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
  // Buitenland zonder reden; groot buitenlands nieuws is voor een leeg profiel wel een reden (openWorld).
  const unchosen = c => foreign(c) && !openWorld(prof, c.whole || c.items, c.st)
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
    // Een rubriekplek is een voorkeur met een minimumgewicht (Redacteur 3b · 4, besluit van Alex): zonder
    // persoonlijke reden voor de rubriek (chosenDesks) krijgt alleen een verhaal van minstens DESK_MIN_PUBS
    // uitgevers de vaste plek; een zwakker verhaal kan daarna nog op gewicht binnenkomen (stap 3). Wie de
    // rubriek koos, houdt zijn zetel zoals hij was.
    const mine = chosenDesks(prof)
    const strongEnough = (c, d) => mine.has(d) || (c.eff ?? c.sc ?? 1) >= DESK_MIN_PUBS
    for (const d of deskOrder) {
      if (entries.length >= size) break
      const force = kernShort(d) && !(strictInt && FOREIGN_DESKS.has(d) && counted.size >= INT_MAX)
      cands.some((c) => c.home === d && !c.parts.seen && (strongEnough(c, d) || kernShort(d)) && takeCapped(c, d, { planned: true }, force))
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
    // Los bericht: het verhaal van toen bestaat niet meer, dus de rubriek van het bericht zelf gaat voor
    // (4 november 2026: een NRC-stuk over mensensmokkel naar het VK bleef "Oekraïne" omdat het eerst in
    // een Oekraïneverhaal gebundeld zat); zonder eigen rubriek die van de selectie.
    return { kind: 'item', id: e.leadId, formerId: e.id, desk: out.leadDesk || e.desk, w: e.w }
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
