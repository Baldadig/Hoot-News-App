// Onderwerpen op trefwoord (Nederlands en Engels). De id's komen overeen met src/lib/topics.js.
// Liever een onderwerp te weinig dan een verkeerd: woorden met dubbele betekenis staan er niet in.
const KW = [
  // Politiek
  // Niet "den haag": dat is ook de stad (feedback 31 oktober: rellen in Den Haag waren "Den Haag", de politiek).
  ['nederland', /\b(kabinet|tweede kamer|eerste kamer|binnenhof|catshuis|prinsjesdag|miljoenennota|rijksoverheid|coalitie|formatie|minister van|staatssecretaris|kamerlid|kamerleden|\bpvv\b|\bvvd\b|\bd66\b|groenlinks|\bpvda\b|\bcda\b|\bsgp\b|\bbbb\b|\bja21\b|wilders|schoof|timmermans|yesilgoz|omtzigt|jetten|bontenbal)\b/i],
  ['europa', /\b(europese unie|europese commissie|europees parlement|europese leiders|eu-landen|\beu\b|brussel|von der leyen|european union|european commission|european parliament|eurozone|schengen)\b/i],
  ['vs-politiek', /\b(senate|senaat|congress|congres|white house|witte huis|republikein|republican|democraat|democrat|\bgop\b|supreme court|hooggerechtshof|pentagon|capitol|vance|house of representatives|justice department|governor|gouverneur)\b/i],
  ['trump', /\btrump\b/i],
  ['verkiezingen', /\b(verkiezing|verkiezingen|election|elections|stembus|peiling|peilingen|\bpoll(s)?\b|campagne|campaign|kandidaat|candidate|referendum|stemmen geteld)\b/i],
  // Binnenland
  ['wonen', /\b(woningmarkt|huizenprijs|huurwoning|huurders|huurprijs|sociale huur|woningnood|woningbouw|hypotheek|koopwoning|dakloos|starters op de woningmarkt|corporatie)\b/i],
  ['zorg', /\b(ziekenhuis|huisarts|zorgverzekeraar|zorgpremie|eigen risico|verpleeg|zorgmedewerker|wachtlijst|ggz|jeugdzorg|ouderenzorg|thuiszorg|mantelzorg|igj)\b/i],
  ['onderwijs', /\b(onderwijs|leraar|leraren|docent|scholier|leerling|basisschool|middelbare school|\bmbo\b|\bhbo\b|universiteit|studenten|studiefinanciering|collegegeld|eindexamen|lerarentekort)\b/i],
  ['misdaad', /\b(politie|rechter|rechtbank|rechtszaak|verdachte|aangehouden|opgepakt|celstraf|gevangenisstraf|moord|doodgeschoten|steekpartij|explosie bij|ontploffing|drugs|\bom\b eist|openbaar ministerie|advocaat|veroordeeld|arrested|convicted|murder|police)\b/i],
  ['migratie', /\b(asiel|asielzoeker|vluchteling|migratie|migrant|\bcoa\b|\bind\b|ter apel|azc|statushouder|gezinshereniging|asylum|refugee|migrants?|immigration|deportat)\b/i],
  ['verkeer', /\b(\bns\b|treinen|spoor|prorail|filedruk|in de file|snelweg|verkeer|ongeluk op de|openbaar vervoer|\bov\b|staking bij de ns|schiphol|vliegveld|luchthaven|fietsers|verkeersdoden)\b/i],
  // Wereld
  ['oekraine', /\b(oekra|ukrain|zelensk|poetin|putin|kyiv|kiev|kremlin|donetsk|donbas|moskou|moscow|rusland|russia|russian)\b/i],
  ['middenoosten', /\b(midden-oosten|middle east|israël|israel|gaza|hamas|hezbollah|iran|libanon|lebanon|syrië|syria|jemen|yemen|houthi|saoedi|saudi|westelijke jordaanoever|west bank|netanyahu|palestijn|palestinian|irak|iraq)\b/i],
  ['azie', /\b(china|chinese|chinees|peking|beijing|xi jinping|taiwan|hongkong|hong kong|japan|japanse|zuid-korea|noord-korea|north korea|south korea|india|indiase|modi|indonesi|filipijnen|philippines|vietnam|pakistan)\b/i],
  ['afrika', /\b(afrika|africa|african|nigeria|kenia|kenya|ethiopi|soedan|sudan|congo|zuid-afrika|south africa|somali|mali|sahel|niger|egypte|egypt|marokko|morocco|ghana|uganda|rwanda)\b/i],
  ['latam', /\b(latijns-amerika|latin america|brazili|brazil|argentini|argentina|mexico|venezuela|colombia|chili|chile|peru|cuba|lula|milei|maduro|suriname|caribisch)\b/i],
  ['geopolitiek', /\b(navo|nato|defensie|defence|defense|krijgsmacht|militair|military|leger|army|troepen|troops|wapens|weapons|raket|missile|sancties|sanctions|geopolit|handelsoorlog|kernwapen|nuclear weapon)\b/i],
  // Economie
  ['economie', /\b(econom|beurs|aandel|aex|inflatie|\brente\b|\becb\b|\bfed\b|federal reserve|recessie|begroting|\bbbp\b|dow jones|nasdaq|wall street|stock market|stocks|inflation|interest rates|tarieven|tariff|handelsverdrag)\b/i],
  ['werk', /\b(werkloosheid|werkgelegenheid|cao|vakbond|\bfnv\b|staking|stakingen|lonen|loonsverhoging|minimumloon|ontslag|ontslagen|reorganisatie|banen|vacatures|pensioen|\baow\b|unemployment|layoffs|jobs report|labor union|trade union|wages)\b/i],
  ['bedrijven', /\b(kwartaalcijfers|jaarcijfers|omzet|winst|bedrijfswinst|fusie|overname|faillis|beursgang|topman|topvrouw|\bceo\b|earnings|revenue|profit|merger|acquisition|bankrupt|takeover|ipo)\b/i],
  ['energie', /\b(energie|energy|gasprijs|olieprijs|stroomprijs|energieprijs|\bopec\b|kerncentrale|nuclear power|zonnepanelen|windpark|wind farm|stroomnet|netcongestie|\blng\b|aardgas|oil price|gas price)\b/i],
  ['geld', /\b(sparen|spaarrente|belastingaangifte|belastingdienst|toeslag|toeslagen|koopkracht|boodschappen duurder|prijzen stijgen|pensioenfonds|beleggen|crypto|bitcoin|hypotheekrente|savings|personal finance)\b/i],
  // Tech
  ['ai', /\b(kunstmatige intelligentie|artificial intelligence|\ba\.?i\.?\b|openai|chatgpt|anthropic|\bclaude\b|gemini|\bllm\b|machine learning|deepmind|copilot|chatbot|generatieve)\b/i],
  ['tech', /\b(apple|google|alphabet|\bmeta\b|facebook|instagram|whatsapp|microsoft|\bamazon\b|nvidia|tesla|musk|spacex|twitter|\bx\.com\b|tiktok|bytedance|big tech|techbedrijf|techgigant|semiconductor|chipmaker|chipfabrikant|halfgeleider|tsmc|\basml\b)\b/i],
  ['gadgets', /\b(iphone|ipad|macbook|smartphone|telefoon review|android|pixel \d|galaxy|smartwatch|apple watch|airpods|koptelefoon|headphones|laptop|tablet|gadget|wearable|camera review)\b/i],
  ['privacy', /\b(privacy|hack|hacker|hackers|datalek|data breach|cyberaanval|cyberattack|ransomware|malware|phishing|wachtwoord|password|beveiligingslek|vulnerability|encryptie|encryption|spyware|surveillance)\b/i],
  ['ev', /\b(elektrische auto|elektrisch rijden|electric vehicle|\bevs?\b|laadpaal|charging station|tesla model|batterij auto|rivian|\bbyd\b|polestar|autonomous driving|zelfrijdende|robotaxi)\b/i],
  ['games', /\b(gaming|gamer|gamers|playstation|\bps5\b|xbox|nintendo|switch 2|steam deck|esports|e-sports|videogame|videogames|video game|video games|game studio|gamestudio|call of duty|fortnite|minecraft|grand theft auto|\w+-games)\b/i],
  // Wetenschap
  ['klimaat', /\b(klimaat|climate|\bco2\b|uitstoot|emissions|opwarming|global warming|hittegolf|heatwave|zeespiegel|sea level|energietransitie|fossiele|fossil fuel|cop\d\d|ijskap|gletsjer|glacier)\b/i],
  ['gezondheid', /\b(gezondheid|health|kanker|cancer|vaccin|vaccine|virus|ebola|covid|corona|medicijn|medicine|drug trial|alzheimer|dementie|dementia|obesitas|obesity|diabetes|hartziekte|heart disease|\brivm\b|\bwho\b|pandemie|pandemic|epidemie)\b/i],
  ['ruimte', /\b(ruimtevaart|\bnasa\b|\besa\b|spacex|maanlanding|moon landing|mars|astronaut|telescoop|telescope|sterrenstelsel|melkwegstelsel|galaxies|heelal|universe|astronoom|astronomen|astronomer|astronomers|zwart gat|black hole|planeet|planet|asteroïde|asteroid|satelliet|satellite|james webb)\b/i],
  ['natuur', /\b(natuur|nature|dieren|animals|biodiversiteit|biodiversity|diersoort|species|uitgestorven|extinct|vogels|birds|walvis|whale|bossen|forest|oceaan|ocean|wolf|insecten|insects|koraal|coral)\b/i],
  ['brein', /\b(psycholog|brein|brain|hersenen|neuroscien|neurolog|depressie|depression|angststoornis|angststoornissen|angstklachten|anxiety|mentale gezondheid|mental health|slaaptekort|sleep study|adhd|autisme|autism)\b/i],
  // Cultuur
  ['muziek', /\b(album|single|concert|festival|popmuziek|band|zanger|zangeres|rapper|songwriter|tournee|tour dates|setlist|grammy|edison|hitlijst|top 40|lowlands|pinkpop|paradiso|melkweg|eurovisie|eurovision|songfestival)\b/i],
  ['film', /\b(film|movie|tv-serie|televisieserie|tv series|netflix(?!-(?!serie|film|docu))|hbo max|disney\+|oscar|oscars|bioscoop|cinema|regisseur|acteur|acteurs|actor|actrice|actress|box office|streamingdienst|trailer|première|star trek)\b/i],
  ['boeken', /\b(roman|novel|schrijver|schrijfster|auteur van|literatu|boekenweek|booker|nobelprijs voor literatuur|bestseller|poëzie|dichter|poet|poetry|uitgeverij|publisher|memoir)\b/i],
  ['kunst', /\b(museum|tentoonstelling|exhibition|kunstenaar|kunstwerk|artwork|schilderij|painting|beeldhouw|sculpture|theater|theatre|opera|ballet|rijksmuseum|stedelijk|van gogh|rembrandt|veiling|auction)\b/i],
  ['media', /\b(omroep(?! (?:zeeland|brabant|gelderland|west|flevoland|limburg))|\bnpo\b(?! radio)|journalistiek|journalism|tv-programma|talkshow|presentator|mediabedrijf|dpg media|mediahuis|press freedom|persvrijheid|mediawet)\b/i],
  // Sport
  ['voetbal', /\b(voetbal|football|soccer|eredivisie|ajax|psv|feyenoord|oranje|champions league|europa league|premier league|la liga|bundesliga|knvb|wk-kwalificatie|world cup|keeper|doelpunt|penalty|ballon d.or|gouden bal)\b/i],
  ['f1', /\b(formule 1|formula 1|formula one|\bf1\b|verstappen|grand prix|red bull racing|ferrari|mercedes-amg|mclaren|hamilton|leclerc|norris|piastri)\b/i],
  ['wielrennen', /\b(wielren|wielrenner|cycling|tour de france|giro|vuelta|peloton|etappe|stage win|klassieker|van der poel|vingegaard|pogačar|pogacar|veldrijden|cyclocross)\b/i],
  ['tennis', /\b(tennis|wimbledon|roland garros|us open|australian open|\batp\b|\bwta\b|grand slam|djokovic|alcaraz|sinner|swiatek|sabalenka)\b/i],
  ['wintersport', /\b(schaatsen|schaatser|skating|speed skating|elfstedentocht|thialf|shorttrack|skiën|skiing|wereldbeker schaatsen|wintersport|biatlon|biathlon|snowboard)\b/i],
  ['olympisch', /\b(olympisch|olympic|olympics|\bnoc\*nsf\b|\bioc\b|paralympi|atletiek|athletics|zwemmen|swimming|turnen|gymnastics|hockey|volleybal|handbal)\b/i],
]
// Sport zonder eigen onderwerp (darts, snooker...): geen onderwerp, maar wel sport en geen nieuws
// (kindOf in src/lib/personal.js, ownKind in desks.mjs). Feedback 31 oktober: de Netflix-dartsshow van
// Luke Littler stond als Film & series in de Editie van een lezer die Cultuur koos.
export const OTHER_SPORT = /\b(darts\w*|darter\w*|snooker|rugby|honkbal|baseball|basketbal|basketball|ijshockey|motogp)\b/i

// Trefwoorden die eruit zijn gegaan. Een server van vóór die wijziging levert ze nog als onderwerp;
// trustedTopics laat zo'n onderwerp vallen als de zichtbare tekst (kop, intro) het alleen met zo'n oud
// trefwoord verklaart. Feedback 31 oktober: "uit angst voor rellen" was Brein (Wetenschap), "meldt
// Omroep Zeeland" Media, de Netflix-dartsshow Film, "verkiezing" in Brazilië VS-politiek.
const RETIRED = {
  'vs-politiek': /\b(verkiezing|election)\b/i,
  brein: /\bangst\b/i,
  film: /\b(netflix|hbo)\b/i,
  media: /\b(omroep|npo)\b/i,
  nederland: /\bden haag\b/i,
}
// De onderwerpen van een bericht zoals de lezer ze kan nagaan: die van de server, zonder wat alleen een
// teruggetrokken trefwoord verklaart. Alleen weglaten, niets toevoegen: een nieuw trefwoord (zoals
// "acteur") telt pas als de server het meegeeft, zodat toestel en server niet uiteenlopen in wat erbij
// komt (en de meetlat op de vaste momentopname niet verschuift). Op een bijgewerkte server verandert dit
// niets. Geeft dezelfde lijst terug als er niets verandert.
export function trustedTopics(it) {
  const had = it.topics || []
  if (!had.some((t) => RETIRED[t])) return had
  const vis = `${it.title || ''} ${it.summary || it.text || ''} ${it.cats || ''}`
  const now = keywordTopics(vis)
  const keep = had.filter((t) => now.includes(t) || !RETIRED[t] || !RETIRED[t].test(vis))
  return keep.length === had.length ? had : keep
}

// De onderwerpen die kop en intro zelf noemen: alleen die mogen het waarom zijn (shared/editor.mjs). De
// server leest ook de hele tekst; "Raakt Cultuur én Wetenschap" bij een filmrecensie, of Latijns-Amerika
// bij screwworms in de VS, staat dan nergens wat de lezer ziet. Zonder intro (een kale kop, een
// testbericht) null: dan gelden de onderwerpen zoals ze zijn.
const shown = new WeakMap()
export function shownTopics(it) {
  if (!it || typeof it !== 'object' || !it.summary) return null
  let s = shown.get(it)
  if (!s) shown.set(it, (s = keywordTopics(`${it.title || ''} ${it.summary} ${it.cats || ''}`)))
  return s
}

export function keywordTopics(text) {
  const out = []
  for (const [id, re] of KW) if (re.test(text)) out.push(id)
  if (out.includes('trump') && !out.includes('vs-politiek')) out.push('vs-politiek')
  return out
}
