// Koopsignaal (Redacteur · deals, 14 november 2026). Besluit van Alex, na "The 21 Best REI Holiday Sale Outdoor Deals
// (2026)" van Wired op plek 05 van zijn Middageditie: koop-, deal-, cadeaugids- en kortingsstukken horen nooit in de
// Editie. Filter A (editie-filter.mjs) weerde alleen een dealrubriek in het pad; Wired zet zijn deals onder /story/ en
// deelt ze in als "Gear / Deals" plus een productrubriek, zodat ook de bronregel bij het ophalen (rss.mjs, sourceDeal) ze
// bewust liet staan. Filter B (de AI) staat uit. Deze regel kijkt daarom naar de vorm van de kop, met tegenvoorbeelden
// uit vier keuringen (er valt geen nieuws over omzet, toezicht, prijzen of overnames weg).
//
// Een kop is een koopstuk als
//   1. hij altijd een aanbod is: "zo claim je", een winactie, "maak kans op", een cadeaugids, of een aanbodlabel vooraan
//      ("Deal:", "Dagdeal:", "Prijsdaling:", "Promojagers supertip.");
//   2. of hij een koopvorm heeft en niet over iets anders gaat dan kopen:
//      - een dealkop: "de beste deals", "the 21 best … deals", "Today's top deals", "… deals (2026)", "deals op een rij";
//      - een koopdag of uitverkoop (Black Friday, Cyber Monday, Prime Day, holiday sale) met een koopwoord;
//      - een prijsval van een product: "is $100 off", "is down to $35", "lowest price of the year", "on sale for",
//        "nu voor €199", "Save $200 on …";
//      - een koopgids: "N best/favorite … (2026)", "where to buy", "zo koop je".
//   Tegenvoorbeelden (ABOUT): de kop gaat over omzet, gedrag, onderzoek, toezicht of oplichting ("Black Friday deals drove
//   record online sales", "ACM waarschuwt voor nepkortingen"), over een overname, handels- of politiek akkoord ("Top 10
//   M&A deals", "OpenAI signs $10bn chip deal"), over beleid ("korting op de zorgtoeslag"), over een markt of grondstof
//   ("Oil falls to lowest price since 2021", "Bitcoin 30% off its peak") of legt uit hoe iets werkt.
// Bronpoort (herstel 2, 14 november 2026, besluit van de chief of staff na drie keuringen waarin elke woordenlijst nieuwe
// randgevallen opleverde): een verloren nieuwsstuk is erger dan een gemist koopstuk. De kopregels hierboven gelden daarom
// alleen voor een bron die zulke stukken maakt: de catalogus zet hem bij tech, games of cultuur (koopBron), of de feed of
// het pad deelt het stuk in als deal, koopgids of review. Bij alle andere bronnen (algemeen nieuws, regio, sport, economie,
// politiek, buitenland, wetenschap) tellen alleen de ondubbelzinnige signalen (STRICT): een winactie of advertentie, een
// aanbodlabel vooraan dat geen gewoon kopwoord is ("Dagdeal:", "Aanbieding:", "Kortingscode:"), een prijs bij een
// winkel ("nu voor €199 bij Bol", "drops to $199 at Amazon") of een kortingscode met een bedrag of percentage.
// Bij twijfel blijft het stuk staan.
// Herstel 3 (vierde keuring, vorm in plaats van woorden): een winactie telt bij een nieuwsbron alleen als label of
// uitnodiging en nooit met het veto; een koopdaglabel en een prijs bij een winkel alleen met een aanbodvorm erachter;
// aankopen en financiering vallen onder het smalle veto; vakbronnen over een industrie krijgen de strikte stand.
// Inhoudelijk gelijk aan isBuying van de Selectie (netlify/lib/vak.mjs in de tak selectie: BUY_ALWAYS, DEAL_HEAD,
// SHOP_DAY met SHOP_WORD, ABOUT_SALES); dit is daar een uitbreiding van met de Engelse koopvormen, zodat de Selectie
// later deze ene functie kan gebruiken. Alleen eenvoudige, deterministische toetsen: web, server en toestel (edition-core.js).

import { SOURCES } from '../netlify/lib/sources.mjs'

// 1. Altijd een aanbod.
const BUY_ALWAYS = new RegExp([
  '\\bzo claim je\\b', '\\bclaim (?:je|nu) (?:gratis|jouw|je)\\b', '\\bwinactie\\b',
  '\\bwin\\s+(?:(?:een|twee|drie|\\d+|a|two|free)\\s+)?(?:[\\p{L}-]+\\s+){0,2}(?:tickets?|vliegtickets|kaarten|kaartjes|exemplaren|exemplaar|copies|reis|trip|prijzen)\\b',
  '\\bmaak kans op\\b', '\\((?:adv|advertentie)\\)', '\\[(?:adv|advertentie)\\]',
].join('|'), 'iu')
// Cadeaugidsen: een aanbod, behalve als de gids zelf het onderwerp van het nieuws is ("Gift guides are the new battleground
// for Amazon and Temu") of de kop over zaken of toezicht gaat (het smalle veto, NARROW).
const GIFT_GUIDE = new RegExp([
  '\\bgift guides?\\b', '\\bgift ideas?\\b', '\\bcadeaugids\\w*', '\\bcadeautips\\b', '\\bcadeau-?idee(?:ën|en)\\b',
  '\\bgifts? for (?:him|her|men|women|kids|teens|dads?|moms?|mothers?|fathers?|parents|grandparents|everyone|anyone|the \\w+ lover|\\w+ lovers)\\b',
].join('|'), 'iu')
const GIFT_SUBJECT = /\b(?:gift guides?|cadeaugids(?:en)?)\s+(?:are|is|were|was|have|has|had|become|became|draw\w*|fac\w*|get|gets|zijn|is|waren|worden|wordt|krijgen|trekken)\b/i
// Een aanbodlabel vooraan.
const LABEL = /^[\s"'‘“([]*(?:(?:[\p{L}]+-)?deals?|dagdeals?|dagaanbieding|aanbieding(?:en)?|koopjes?|kortingscodes?|prijsfout|promojagers?(?: supertip)?|deal of the day|deal alert)\s*[:|.!–—-]\s/iu

// "Prijsdaling:" en "Prijsverlaging:" vooraan zijn bij Nederlandse nieuwssites ook een gewone kopvorm voor marktnieuws
// ("Prijsdaling: benzine voor het eerst sinds 2021 onder 1,80"), en met alleen een bedrag ook voor het prijsbesluit van
// een maker ("Prijsverlaging: Tesla Model Y nu voor €39.990", derde keuring). Alleen een aanbod met een winkel erachter
// ("bij Coolblue"), en nooit over energie, brandstof, wonen, auto's, rente of de boodschappen.
const PRICE_LABEL = /^[\s"'‘“([]*(?:prijsdaling|prijsverlaging)\s*[:|.!–—-]\s/iu
const PRICE_LABEL_OFFER = /\bbij\s+(?:de\s+)?\p{Lu}/u
const PRICE_LABEL_MARKET = new RegExp([
  'energie\\w*', 'stroom\\w*', 'gas\\w*', 'benzine\\w*', 'brandstof\\w*', 'diesel\\w*', 'tank\\w*', 'pomp\\w*', 'elektriciteit\\w*',
  'huizen\\w*', 'huis', 'woning\\w*', 'huur\\w*', 'huren', 'hypothe\\w*', 'rente\\w*', "auto'?s", 'auto', 'occasions?', 'tweedehands',
  'boodschappen', 'supermarkt\\w*', 'voedsel\\w*', 'levensmiddelen', 'zorgpremie\\w*', 'premie\\w*', 'graan', 'tarwe', 'koffie\\w*', 'cacao', 'melk\\w*',
].map((w) => `\\b${w}\\b`).join('|'), 'iu')
const priceLabelOffer = (t) => PRICE_LABEL_OFFER.test(t.replace(PRICE_LABEL, '')) && !PRICE_LABEL_MARKET.test(t)

// 2. Koopvormen.
const DEAL_HEAD = new RegExp([
  // Selectie (isBuying).
  '\\b(?:de|the|onze|our)?\\s*(?:beste|best|top)\\s+deals\\b', '\\bdeals? (?:op een rij|van de (?:dag|week))\\b',
  '\\b(?:aanbiedingen|koopjes) (?:op een rij|van de (?:dag|week))\\b',
  '\\bkorting op\\b.*\\b(?:deal|actie|code|aanbieding|black friday|cyber monday)\\b',
  // Uitbreiding: "The 21 Best REI Holiday Sale Outdoor Deals", "Today's Top Deals", "… Deals Roundup (2026)".
  '\\b(?:beste|best|top)\\b[^:;!?|]{0,50}?\\bdeals\\b', "\\b(?:today'?s|todays|daily|weekend|this week'?s)\\s+(?:top\\s+|best\\s+)?deals\\b",
  '\\b(?:deals?|sales?|koopjes|aanbiedingen)\\b[^()]{0,40}\\(20\\d\\d\\)', '\\b[\\p{L}]+-deals\\b',
  // Kortingen tot een percentage, en een aanbieding die live is.
  '\\bkortingen? tot (?:wel )?\\d+', '\\btot (?:wel )?\\d+\\s?(?:%|procent) korting\\b', '\\bsale is (?:live|on|back)\\b', '\\bdoorbusters?\\b', '\\bdoorboosters?\\b',
  // "X Deal: Save $80", "Nothing Headphones Sale: Up to 41% Off", "Birthday Sale: 20 Percent Off Sitewide".
  '\\b(?:deal|sale)\\s*:\\s*(?:save|get|up to|\\d)', '\\bsale\\b.*(?:\\b\\d+ ?(?:%|percent) off\\b|\\bsave (?:up to )?\\$?\\d)', '(?:\\b\\d+ ?(?:%|percent) off\\b|\\bsave (?:up to )?\\$?\\d).*\\bsale\\b',
  // Kortingscodes en sim only-acties.
  '\\b(?:promo|coupon|discount) codes?\\b.*(?:\\d+ ?%|20\\d\\d|\\$\\d)', '\\bsim[- ]only\\b',
  '\\bgratis verzending\\b', '\\bfree shipping\\b', '\\b(?:last chance|laatste kans)\\b.*(?:\\bsave (?:up to )?(?:\\$|€|£)?\\d|\\bkorting\\b|\\bbestel\\w*|\\bkoop\\b)',
].join('|'), 'iu')
const SHOP_DAY = /\b(?:black friday|cyber monday|singles'? day|prime days?|amazon prime days?|holiday sale|boxing day|presidents'? day sale|memorial day sale|labor day sale)\b/i
const SHOP_WORD = /\b(?:deals?|korting\w*|aanbieding\w*|koopjes|sale|uitverkoop|goedkoop\w*|cheapest|laagste prijs|lowest price|prijsdaling|discounts?|discounted)\b|\b(?:for |voor )?(?:under|just|only|onder|maar) (?:\$|€|£)\s?\d|\b\d+ ?(?:%|percent|procent) off\b|\$\d[\d,]* off\b|\bsave (?:up to )?\$?\d/i
// Een prijsval van een product (Verge, IGN, Tweakers, iCulture).
const PRICE_DROP = new RegExp([
  "\\b(?:is|are|'s)\\s+(?:now\\s+|currently\\s+)?(?:(?:almost|nearly|just|over|more than|under|only|about|around)\\s+)?(?:\\$|€|£)\\d[\\d,.]*\\s+off\\b",
  "\\b(?:is|are|'s)\\s+(?:(?:almost|nearly|more than|over)\\s+)?half off\\b",
  '\\b(?:is|are|now|drops?|dropped|falls?|fell)\\s+(?:down\\s+)?to\\s+(?:just\\s+|only\\s+)?(?:\\$|€|£)\\d',
  '\\b(?:its|their|a new|an all-time|a record) (?:lowest|best|low) price\\b', '\\blowest price (?:of the year|to date|ever|yet)\\b', '\\bnew low price\\b',
  '\\bon sale (?:for|now|right now|at)\\b', '\\b(?:is|are) on sale\\b', '\\bsteeply discounted\\b', '\\b(?:is|are) discounted\\b',
  "\\b(?:is|are|'s)\\s+(?:now\\s+)?(?:(?:up to|almost|nearly|over|more than|about)\\s+)?\\d+ ?(?:%|percent) off\\b",
  '\\b(?:is|are) (?:only|just) (?:\\$|€|£)\\d', '\\b(?:is|are) (?:\\$|€|£)\\d[\\d,.]* (?:at [\\p{L}.]+(?: [\\p{L}]+)? )?right now\\b', '\\bto (?:a mere|just|only) (?:\\$|€|£)\\d',
  '^[\\s"\'‘“]*(?:grab|get|snag|score)\\b[^.:]*?\\bfor (?:just |only )?(?:\\$|€|£)\\d', '\\bget (?:up to )?(?:\\$|€|£)?\\d[\\d,]*(?: ?%| percent)? off\\b', '\\bhow to save (?:\\$|€|£)\\d',
  '^[\\s"\'‘“]*krijg (?:nu )?(?:€\\s?)?\\d+ ?(?:%|procent|euro) korting\\b', '\\bnu met (?:€\\s?)?\\d+ ?(?:euro|%|procent) korting\\b',
  '^[\\s"\'‘“]*save (?:up to |over |more than )?(?:\\$|€|£)?\\d', '\\bgives? you (?:\\$|€|£)?\\d[\\d,]*(?: ?%| percent)? off\\b',
  '\\bnu (?:voor|vanaf) (?:€|eur\\s?)\\s?\\d', '\\bnu voor \\d+ euro\\b', '\\bin prijs verlaagd\\b', '\\btijdelijk goedkoper\\b', '\\blaagste prijs ooit\\b', '\\bnu \\d+\\s?% korting\\b',
].join('|'), 'iu')
// Een koopgids: "My 9 Favorite Pickleball Paddles (2026)", "3 Best Walking Pads (2026)", "Here's where to buy …".
const GUIDE = new RegExp([
  '^[\\s"\'‘“]*(?:(?:the|my|our|these)\\s+)?\\d+\\s+(?:best|favorite|favourite)\\b[^()]*\\(20\\d\\d\\)\\s*$',
  '\\bbest\\b[^()]*\\bgifts?\\b', '\\bgifts?\\b[^()]*\\(20\\d\\d\\)',
  "\\b(?:here'?s\\s+)?where to (?:buy|preorder|pre-order)\\b", '\\bhow to (?:buy|preorder|pre-order)\\b', '\\b(?:zo|hier|waar) (?:koop|bestel|scoor|bespaar) je\\b', '\\bzo krijg je\\b.*\\b(?:gratis|cadeau|korting)\\b', '\\bgifts? worth (?:giving|buying)\\b', '^[\\s"\'‘“]*\\d+\\+?\\s+(?:[\\p{L}-]+\\s+)?gifts?\\b', '\\bhow (?:you can|to) save on\\b',
].join('|'), 'iu')

// Tegenvoorbeelden: de kop gaat over iets anders dan een aanbod aan de lezer.
const ABOUT = new RegExp([
  // Selectie (ABOUT_SALES): omzet, gedrag, onderzoek, oplichting, toezicht.
  'omzet\\w*', 'sales', 'record\\w*', 'spending', 'uitgaven', 'besteding\\w*', 'besteed\\w*', 'consument\\w*', 'shoppers', 'onderzoek\\w*', 'survey', 'research',
  'cijfers', 'waarom', 'why', 'analyse', 'analysis', 'nep\\w*', 'fakes?', 'scams?', 'oplicht\\w*', 'misleid\\w*', 'fraude', 'acm',
  // Vierde keuring: phishing en valse acties, ook in een samenstelling ("phishingmail", "sms-phishing", "nep-winactie").
  '\\w*phishing\\w*', 'valse?',
  // Toezicht, recht en beleid.
  'ftc', 'regulators?', 'toezicht\\w*', 'waarschuw\\w*', 'warns?', 'boetes?', 'fined?', 'probe', 'lawsuit', 'rechter\\w*', 'court', 'kabinet', 'minister\\w*',
  'overheid', 'government', 'gemeenten?', 'zorgtoeslag', 'toeslag\\w*', 'belasting\\w*', 'tax(?:es)?', 'subsidie\\w*', 'cao', 'pensioen\\w*', 'zorgpremie\\w*',
  // Overnames, akkoorden, handel en politiek.
  'm&a', 'mergers?', 'acquisitions?', 'overnames?', 'takeovers?', 'fusies?', 'trade', 'handels\\w*', 'transfers?', 'contracts?', 'billion', 'miljard\\w*',
  '\\d+\\s?bn', 'funding', 'investments?', 'investering\\w*', 'licens\\w*', 'sponsor\\w*', 'peace', 'vrede\\w*', 'ceasefire', 'bestand', 'tariffs?',
  'akkoord', 'coalitie\\w*', 'senate', 'congress', 'eu', 'brexit', 'nuclear', 'kernwapen\\w*',
  // Aankopen en financiering (vierde keuring): "Netflix buys Spielberg drama", "DPG koopt RTL", "AI funding deals".
  'buys', 'bought', 'koopt', 'kocht', 'gekocht', 'acquires?', 'acquired', 'raises', 'raised', 'vc', 'venture', 'investors?', 'investeerders?', 'startups?',
  'valuation', 'waardering', 'ipo', 'scrutiny', '(?:data|figures|report|rapport|cijfers)\\s+(?:shows?|showed|suggests?|toont|tonen|laat zien|laten zien)',
  // Markten en grondstoffen.
  'oil', 'olie\\w*', 'brent', 'gas', 'gasprijs\\w*', 'stroomprijs\\w*', 'energieprijs\\w*', 'bitcoin', 'crypto\\w*', 'stocks?', 'shares', 'aandel\\w*', 'beurs\\w*',
  'koers\\w*', 'markets', 'wall street', 'nasdaq', 'dow', 'aex', 'gold price', 'goudprijs', 'huizen\\w*', 'housing', 'huur\\w*', 'rente\\w*', 'inflati\\w*', 'economie\\w*',
  'economy', 'retailers', 'winkeliers', 'webwinkels', 'banen', 'jobs', 'layoffs', 'ontslag\\w*',
  // Gevolgen, mensen en plaatsen: nieuws over een aanbieding, geen aanbieding.
  'verwacht\\w*', 'expected', 'analysts?', 'analisten', 'strikes?', 'staking\\w*', 'workers', 'werknemers', 'personeel', 'stampede', 'sparks', 'sued', 'sues',
  'claims?', 'misleading', 'cma', 'rules?', 'price war', 'prijzenoorlog', 'bankrupt\\w*', 'faillis\\w*', 'failliet', 'sluit\\w*', 'sluiting\\w*', 'clos(?:es|ing|ure)', 'dealers', 'inventory', 'voorraad', 'installateurs',
  'problemen', 'fans', 'furious', 'woedend', 'says', 'say', 'zegt', 'zeggen', 'study', 'studie', 'finds', 'flop', 'fewer', 'average', 'gemiddeld\\w*', 'income',
  'inkomen', 'huishoudens', 'households', 'energierekening', 'prices', 'prijzen', 'tickets?',
  'harvest', 'oogst', 'bird flu', 'vogelgriep', 'in (?:europe|europa|china|the us|de vs|amerika|america|japan|india)', 'wereldwijd', 'worldwide',
  'lekt?', 'gegevens', 'reclame', 'rechtbank', 'europese commissie', 'commission', 'plan', 'regeling\\w*', 'families', 'gezinnen', 'students', 'studenten',
  'announces', 'kondigt', 'energy bills', 'fares', 'ov', 'million', 'miljoen', 'sells', 'verkoopt', 'peak', 'piek', 'resale',
  // Sport: transfers, contracten en free agency ("Grading the best NFL free agency deals").
  'transfer\\w*', 'free[- ]agen\\w*', 'contract(?:en)?', 'signings?', 'off-?season', 'trade deadline', 'salary cap', '(?:nfl|nba|mlb|nhl|mls) draft', 'draft picks?',
  'miskop\\w*', 'best and worst', 'beste en slechtste',
  // Gevolgen van een koopdag en zakelijke akkoorden (derde keuring): "Black Friday-korting bij NS leidt tot storing".
  'storing\\w*', 'footfall', 'high street', 'signs', 'signed', 'inks', 'inked', 'lands', 'landed', 'seals', 'sealed', 'tekent', 'getekend',
  // Prijsbeleid: de prijs zelf is het onderwerp ("Insulin price falls to $35 under new law"), of een wet, regeling of geneesmiddel.
  "(?:price|prijs|prices|prijzen|cost|costs|kosten|fee|fees|premium|premiums|premie|tarief|tarieven)\\s+(?:now\\s+|will\\s+|to\\s+)?(?:drops?|dropped|falls?|fell|cuts?|slashed|daalt|daalde|zakt|zakte|omlaag|verlaagd)",
  'under (?:a |the |new |an? )?(?:[\\p{L}-]+\\s+){0,2}(?:law|act|bill|deal|plan|agreement|order|rule)', 'medicare', 'medicaid', 'insulin\\w*', 'insuline',
  'drugs?', 'drugmakers?', 'medicijn\\w*', 'geneesmiddel\\w*', 'pharma\\w*', 'patients', 'patiënten', 'prescriptions?', 'generics?', 'cash buyers',
  // Uitleg en achtergrond.
  'explained', 'uitgelegd', 'zo werkt', 'zo zit het',
].map((w) => `\\b${w}\\b`).join('|') + "|\\bhow\\b[^?]*\\b(?:works?|actually work)\\b", 'iu')

// Sterke koopvormen (herstel na de keuring, 14 november 2026): een dealkop met "best/top … deals" of "… sales", "today's
// deals", "deals (2026)", "sale: the best …", en een koopdag met deals. Daar zegt een los woord in de
// productomschrijving ("gas grill", "record player", "for students", "in Europe", "concert tickets", "phone plan") niets;
// alleen het smalle veto (NARROW) houdt zo'n kop in de Editie.
const STRONG_HEAD = new RegExp([
  '\\b(?:beste|best|top)\\b(?!-)[^:;!?|]{0,50}?\\bdeals\\b',
  '\\b(?:best|top)\\s+[^:;!?|]{1,50}?\\bsales\\b(?!\\s+(?:executives?|chiefs?|managers?|directors?|teams?|heads?|boss\\w*|staff|reps?|figures|data|growth|tax|volumes?|force|jobs?))', "\\b(?:today'?s|todays|daily|weekend|this week'?s)\\s+(?:top\\s+|best\\s+)?deals\\b",
  '\\b(?:deals?|sales?)\\b[^()]{0,40}\\(20\\d\\d\\)', '\\bsale\\s*:\\s*(?:the |our |de |onze )?(?:best|beste|top)\\b',
].join('|'), 'iu')
const STRONG_DAY_WORD = /\bdeals?\b/i
// Het smalle veto: de kop gaat over zaken, markten, toezicht, nep of uitleg, niet over een aanbod aan de lezer.
const NARROW = new RegExp([
  // Omzet en verkoopcijfers: "sales" telt hier alleen met een omzetwoord erbij.
  '\\bomzet\\w*', '\\brecordomzet\\b', '\\brevenue\\b', '\\bspending\\b', '\\buitgaven\\b', '\\bbesteding\\w*', '\\bbesteed\\w*', '\\bgeeft\\b.*\\buit\\b',
  '\\b(?:sales|verkoop)\\s+(?:hit|hits|rise|rises|rose|rising|fall|falls|fell|falling|miss|missed|misses|slump\\w*|jump\\w*|drop\\w*|grow\\w*|grew|surge\\w*|soar\\w*|plunge\\w*|declin\\w*|increas\\w*|beat|top|topped|reach\\w*|figures|data|numbers|up|down|stijgt|daalt|steeg|daalde)\\b',
  '\\b(?:online|retail|e-commerce|ecommerce)\\s+sales\\b', '\\brecord\\w*\\b.*\\b(?:sales|omzet|spending|revenue)\\b', '\\b(?:sales|omzet)\\b.*\\brecord\\w*',
  '\\b(?:sales|verkoop|omzet)cijfers\\b', '\\bcijfers\\b', '\\bconsument\\w*', '\\bshoppers\\b', '\\bdrove\\b', '\\blevert\\b.*\\bop\\b',
  // Onderzoek, uitleg en achtergrond.
  '\\bonderzoek\\w*', '\\bsurvey\\b', '\\bresearch\\b', '\\bstudy\\b', '\\bstudie\\b', '\\bfinds\\b', '\\bwaarom\\b', '\\bwhy\\b', '\\banalyse\\b', '\\banalysis\\b',
  '\\bverwacht\\w*', '\\bexpected\\b', '\\banalysts?\\b', '\\banalisten\\b', '\\bexplained\\b', '\\buitgelegd\\b', '\\bzo werkt\\b', '\\bzo zit het\\b',
  '\\bhow\\b[^?]*\\b(?:works?|actually work)\\b',
  // Nep, oplichting en toezicht.
  '\\bnep\\w*', '\\bfakes?\\b', '\\bscams?\\b', '\\boplicht\\w*', '\\bmisleid\\w*', '\\bmisleading\\b', '\\bfraude\\b', '\\bacm\\b', '\\bftc\\b', '\\bcma\\b',
  '\\b\\w*phishing\\w*', '\\bvalse?\\b', '\\bscrutiny\\b',
  '\\bregulators?\\b', '\\btoezicht\\w*', '\\bwaarschuw\\w*', '\\bwarns?\\b', '\\bboetes?\\b', '\\bfined?\\b', '\\bprobe\\b', '\\blawsuit\\b', '\\bsue[sd]\\b', '\\brechter\\w*',
  '\\brechtbank\\b', '\\bcourt\\b', '\\beuropese commissie\\b',
  // Zaken: overnames, akkoorden, handel, werk en faillissementen.
  '\\bm&a\\b', '\\bmergers?\\b', '\\bacquisitions?\\b', '\\bovernames?\\b', '\\btakeovers?\\b', '\\bfusies?\\b', '\\bakkoord\\b', '\\btrade\\b', '\\bhandels\\w*',
  '\\bbillion\\b', '\\bmiljard\\w*', '\\b\\d+\\s?bn\\b', '\\bretailers\\b', '\\bwinkeliers\\b', '\\bwebwinkels\\b', '\\bworkers\\b', '\\bwerknemers\\b', '\\bpersoneel\\b',
  '\\bstrikes?\\b', '\\bstaking\\w*', '\\bbankrupt\\w*', '\\bfaillis\\w*', '\\bfailliet\\b',
  // Aankopen en financiering (vierde keuring): een akkoord tussen bedrijven, geen aanbod aan de lezer ("AFM's top deals:
  // Netflix buys Spielberg drama", "De beste deals van het mediajaar: DPG koopt RTL", "The top 25 AI funding deals").
  '\\bbuys\\b', '\\bbought\\b', '\\bkoopt\\b', '\\bkocht\\b', '\\bgekocht\\b', '\\bacquires?\\b', '\\bacquired\\b', '\\bfunding\\b', '\\braises\\b',
  '\\braised\\b', '\\bvc\\b', '\\bventure\\b', '\\binvest\\w*', '\\binvesteer\\w*', '\\bstartups?\\b', '\\bvaluation\\b', '\\bipo\\b',
  // Een cijfer als onderwerp: "Amazon's best Prime Day deals were on its own devices, data shows".
  '\\b(?:data|figures|report|rapport|cijfers)\\s+(?:shows?|showed|suggests?|toont|tonen|laat zien|laten zien)\\b',
  // Sport: transfers, contracten en free agency ("NFL free agency 2026: Best and worst deals so far", "De beste deals van de
  // transferzomer: Ajax verdient 80 miljoen"). Een rangschikking van zaken, geen aanbod aan de lezer.
  '\\btransfer\\w*', '\\bfree[- ]agen\\w*', '\\bcontracts?\\b', '\\bcontract(?:en)?\\b', '\\bsignings?\\b', '\\boff-?season\\b', '\\btrade deadline\\b',
  '\\bsalary cap\\b', '\\b(?:nfl|nba|mlb|nhl|mls) draft\\b', '\\bdraft picks?\\b', '\\bmillion\\b', '\\bmiljoen\\b', '\\bmiskop\\w*', '\\bbest and worst\\b',
  '\\bbeste en slechtste\\b', '\\bworst deals\\b', '\\bslechtste deals\\b',
  // Sportzaken in andere woorden (derde keuring): het venster, de periode of de rol, niet alleen het vakwoord. Wat verder gaat
  // (competities, clubs) regelt de bronpoort: een sportbron krijgt de kopregels niet.
  '\\b(?:transfer|january|summer|winter|zomer)\\s?window\\b', '\\bwinterstop\\b', '\\btransferperiode\\b', '\\bwinter meetings\\b', '\\btrade market\\b',
  '\\bexpansion draft\\b', '\\bquarterbacks?\\b', '\\bslechtste\\b',
  // Zakelijke akkoorden: tekenen, sluiten, binnenhalen ("Top Hollywood deals: Netflix lands Spielberg film", "authors land
  // seven-figure advances", "Top 5 defence deals signed at Nato summit").
  '\\bsigns?\\b', '\\bsigned\\b', '\\binks?\\b', '\\binked\\b', '\\blands\\b', '\\blanded\\b', '\\bstruck\\b', '\\bseals?\\b', '\\bsealed\\b',
  '\\btekent\\b', '\\bgetekend\\b', '\\bgesloten\\b', '\\badvances?\\b', '\\b[\\p{L}]+-figure\\b', '\\bdefen[cs]e\\b', '\\bnato\\b', '\\barms\\b', '\\bwapen\\w*', '\\bhollywood\\b',
  // Gevolgen voor winkels en winkelstraat ("Black Friday deals failed to lift UK high street footfall").
  '\\bfootfall\\b', '\\bhigh street\\b', '\\bfail\\w*', '\\bdisappoint\\w*', '\\bprofits?\\b', '\\bwinst\\w*', '\\bclos(?:e|es|ed|ing|ure)\\b', '\\bjobs\\b',
  '\\bbanen\\b', '\\bstoring\\w*',
  // Politieke akkoorden: "peace deals", "trade deals".
  '\\bpeace\\b', '\\bvrede\\w*', '\\bceasefire\\b', '\\bdiplomat\\w*', '\\btariffs?\\b', '\\bnuclear\\b', '\\bkernwapen\\w*',
  // Markten.
  '\\bstocks?\\b', '\\bshares\\b', '\\baandel\\w*', '\\bbeurs\\w*', '\\bkoers\\w*', '\\bmarkets\\b', '\\bwall street\\b', '\\bbitcoin\\b', '\\bcrypto\\w*',
  '\\boil (?:price|prices|supplies|market)\\b', '\\bgold price\\b', '\\bgoudprijs\\b', '\\beconomie\\w*', '\\beconomy\\b', '\\binflati\\w*',
].join('|'), 'iu')

// Een winkelnaam is geen overtreffende trap (derde keuring: "Best Buy to close 50 stores despite holiday deals"). Als één
// woord telt "Best Buy" niet als "best … deals"; "Best Buy's Black Friday deals" blijft een koopdag.
const clean = (t) => String(t || '').replace(/\s+/g, ' ').replace(/[’‘`]/g, "'").replace(/\bbest buy\b/gi, 'BestBuy').replace(/\btop shop\b/gi, 'Topshop').trim()
// Een sterke koopvorm: een onmiskenbare dealkop, of een koopdag met deals. Een koopdag met sale of korting blijft zwak.
const strongForm = (t) => STRONG_HEAD.test(t) || (SHOP_DAY.test(t) && STRONG_DAY_WORD.test(t))

// Bij een nieuwsbron alleen de ondubbelzinnige signalen: de uitgever noemt het zelf een winactie, advertentie, dagdeal,
// aanbieding of kortingscode, of de kop zet een prijs bij een winkel. Ook dan houdt een tegenvoorbeeld (ABOUT) het vast.
// Een winactie vooraan in de gebiedende wijs ("Win kaarten voor U2 in de Johan Cruijff Arena") is ook zo'n eigen signaal.
// Herstel 3 (vierde keuring): ook een winactie is alleen een aanbod als de uitgever haar zo aanbiedt, als label vooraan
// ("Winactie: ...", "Winactie |") of als uitnodiging aan de lezer ("Maak kans op ...", "Win kaarten voor ..."). Staat het
// woord in een gewone zin ("Winactie van Kruidvat op Instagram is nep", "Winactie radiozender loopt uit de hand"), dan
// is het nieuws over een winactie. Ook dan houdt het veto het vast (phishing, nep en oplichting maken er nieuws van). Dat is
// het smalle veto, zoals bij elke onmiskenbare vorm: de prijs zelf ("tickets", "fans") is geen tegenvoorbeeld.
const STRICT_ALWAYS = new RegExp([
  '^[\\s"\'‘“([]*winactie\\s*[:|.!–—-]\\s', '\\bmaak kans op\\b', '\\((?:adv|advertentie)\\)', '\\[(?:adv|advertentie)\\]',
  '^[\\s"\'‘“]*win\\s+(?:(?:een|twee|drie|\\d+|a|two|free)\\s+)?(?:[\\p{L}-]+\\s+){0,2}(?:tickets?|vliegtickets|kaarten|kaartjes|exemplaren|exemplaar|copies|reis|trip|prijzen)\\b',
].join('|'), 'iu')
const STRICT_LABEL = /^[\s"'‘“([]*(?:dagdeals?|dagaanbieding(?:en)?|aanbieding(?:en)?|koopjes?|kortingscodes?|prijsfout|promojagers?(?: supertip)?|deal of the day|deal alert|gesponsord|sponsored|advertorial)\s*[:|.!–—-]\s/iu
// Een koopdaglabel ("Black Friday-deals:") is bij een nieuwsbron ook een kopvorm voor uitleg aan de lezer ("Black
// Friday-deals: hoe goed zijn ze echt?"). Alleen een aanbod met een prijs, een percentage of een winkel erachter.
const DAY_LABEL = /^[\s"'‘“([]*(?:black friday|cyber monday|prime day|singles day)-deals?\s*[:|.!–—-]\s/iu
const STORE = /\b(?:at|bij|via|from)\s+(?:amazon(?:\.\w+)?|bestbuy|walmart|target|costco|newegg|currys|john lewis|bol(?:\.com)?|coolblue|mediamarkt|media markt|alternate|megekko|wehkamp|belsimpel|azerty|fnac|zalando)\b/iu
const PRICE = /(?:\$|€|£)\s?\d|\b\d[\d.,]*\s?euro\b/iu
const PERCENT = /\b\d+\s?(?:%|procent|percent)/iu
// Een prijs bij een winkel is alleen een aanbod met een aanbodvorm: de prijsval van een product (PRICE_DROP: "nu voor",
// "drops to", "is $X off", "on sale for"), korting, "van X voor Y" of "in de aanbieding". Een bedrag met een winkel in een
// gewone zin ("Pakketjes van €20 bij Bol krijgen extra heffing", "costs $58 at Walmart", "raise from Amazon") is nieuws.
const OFFER = /\bkorting\w*|\bafgeprijsd\w*|\bin de aanbieding\b|\bvan\s+(?:€\s?)?\d[\d.,]*(?:\s?euro)?\s+(?:nu\s+)?voor\s+(?:€\s?)?\d/iu
const offerForm = (t) => PRICE_DROP.test(t) || OFFER.test(t)
const CODE = /\b(?:(?:promo|coupon|discount)\s+codes?|kortingscodes?|actiecodes?)\b/iu
const CODE_AMOUNT = /\b\d+\s?(?:%|procent|percent)|(?:\$|€|£)\s?\d|\b\d[\d.,]*\s?euro\b|\b20\d\d\b/iu
function strictGrond(t) {
  if (STRICT_ALWAYS.test(t)) return NARROW.test(t) ? null : 'aanbod'
  const rest = t.replace(DAY_LABEL, '')
  const grond = STRICT_LABEL.test(t) ? 'label'
    : DAY_LABEL.test(t) ? (PRICE.test(rest) || PERCENT.test(rest) || STORE.test(rest) ? 'label' : null)
    : PRICE_LABEL.test(t) ? (STORE.test(t) && !PRICE_LABEL_MARKET.test(t) ? 'label' : null)
    : PRICE.test(t) && STORE.test(t) ? (offerForm(t) ? 'prijsval' : null)
    : CODE.test(t) && CODE_AMOUNT.test(t) ? 'kortingscode' : null
  return grond && !ABOUT.test(t) ? grond : null
}

// De grond van een koopkop, of null. 'aanbod' (altijd), 'label', 'dealkop', 'koopdag', 'prijsval', 'koopgids',
// 'kortingscode'. `ruim`: de bron maakt koopstukken (koopBron); anders alleen de ondubbelzinnige signalen (strictGrond).
export function koopGrond(title = '', { ruim = true } = {}) {
  const t = clean(title)
  if (!t) return null
  if (!ruim) return strictGrond(t)
  // Ook bij een koopbron houdt het smalle veto een winactie vast (vierde keuring: nep, phishing en oplichting).
  if (BUY_ALWAYS.test(t)) return NARROW.test(t) ? null : 'aanbod'
  if (GIFT_GUIDE.test(t) && !GIFT_SUBJECT.test(t) && !NARROW.test(t)) return 'aanbod'
  if (LABEL.test(t)) return ABOUT.test(t) ? null : 'label'
  if (PRICE_LABEL.test(t)) return priceLabelOffer(t) && !ABOUT.test(t) ? 'label' : null
  // Sterke vorm: alleen het smalle veto. Anders (prijsval, koopgids, de rest van de dealkoppen) het brede veto.
  if (strongForm(t)) return NARROW.test(t) ? null : STRONG_HEAD.test(t) ? 'dealkop' : 'koopdag'
  const grond = DEAL_HEAD.test(t) ? 'dealkop' : SHOP_DAY.test(t) && SHOP_WORD.test(t) ? 'koopdag' : PRICE_DROP.test(t) ? 'prijsval' : GUIDE.test(t) ? 'koopgids' : null
  return grond && !ABOUT.test(t) ? grond : null
}
export const koopKop = (title = '', opts) => koopGrond(title, opts) != null

// Een losse koopvorm (zwakker): genoeg als de feed het stuk zelf als aanbod indeelt (feedMark 'aanbod', rss.mjs). Ook dan
// telt een tegenvoorbeeld: Wired zet "Gear / Deals" ook op journalistiek over prijzen ("Here's How Carrier Deals Actually Work").
const LOOSE = /\b(?:best|beste|top)\b|\(20\d\d\)|(?:\$|€|£)\s?\d|\b\d+ ?(?:%|percent|procent)\b|\boff\b/i
export const koopVorm = (title = '') => {
  const t = clean(title)
  return !!t && (koopKop(t) || ((SHOP_WORD.test(t) || LOOSE.test(t)) && !ABOUT.test(t)))
}

// Een feedcategorie die het stuk als aanbod of koopgids indeelt: het laatste deel van de categorie heet zo ("Gear / Deals",
// "Buying Guides", "Aanbiedingen"), en geen deel noemt zaken of markten ("Business / Deals" is een overnamerubriek).
const SHOP_CAT = new Set(['deals', 'deal', 'buying guides', 'buying guide', 'gift guides', 'gift guide', 'shopping', 'aanbiedingen', 'aanbieding', 'koopjes',
  'dagdeals', 'cadeaugids', 'cadeaugidsen', 'koopgids', 'koopgidsen', 'kortingen', 'coupons', 'kortingscodes'])
const BIZ_CAT = /\b(?:business|zakelijk|markets?|markten|finance|financ\w*|economie|economy|money|geld|beurs|m&a|mergers?)\b/i
export function shopCategory(cats = []) {
  return cats.some((c) => {
    const parts = String(c || '').trim().toLowerCase().split(/\s*[/>›»|]\s*/).filter(Boolean)
    return parts.length > 0 && SHOP_CAT.has(parts[parts.length - 1]) && !parts.some((p) => BIZ_CAT.test(p))
  })
}

// De bronpoort. Een bron maakt koop-, deal- en reviewstukken als de catalogus hem bij tech, games of cultuur (of later
// lifestyle of consument) zet, of als de feed (feedMark 'aanbod') of het pad (/deals/, /reviews/, /recommended/,
// /indybest/, /thefilter/, /black-friday/ …) het stuk zo indeelt. Ook dan houdt het veto nieuws over omzet of toezicht vast. `segs`: de padsegmenten voor de slug (rubricSegments in editie-filter.mjs).
const KOOP_CATS = new Set(['tech', 'games', 'cultuur', 'muziek', 'lifestyle', 'consument'])
const CAT_OF = new Map(SOURCES.map((s) => [s.id, s.cat]))
// Herstel 3 (vierde keuring): bronnen in tech en cultuur die over een industrie berichten (start-ups, film- en mediazaken,
// journalistiek) of de cultuurredactie van een nieuwsomroep zijn, maken geen koopstukken. Daar is "top deals" bijna altijd
// een akkoord ("The top AI deals of the week", "The top deals of the Toronto film festival market"). Zij krijgen de strikte
// stand, net als een nieuwsbron; een deal- of koopgidsrubriek in de feed of het pad opent de poort ook hier.
const VAKBRON = new Set(['techcrunch', 'mittr', 'variety', 'villamedia', 'mediacourant', 'nos-cultuur'])
const SHOP_RUBRIC = new Set(['deals', 'deal', 'aanbiedingen', 'aanbieding', 'koopjes', 'coupons', 'kortingscodes', 'dagdeals', 'shopping', 'recommended',
  'indybest', 'thefilter', 'the-filter', 'buying-guide', 'buying-guides', 'gift-guide', 'gift-guides', 'gift-ideas', 'gifts', 'best-buys', 'reviews', 'review',
  'product-reviews', 'recensie', 'recensies', 'gear', 'koopgids', 'koopgidsen', 'cadeaugids', 'cadeaugidsen', 'wirecutter', 'underscored', 'black-friday',
  'cyber-monday', 'prime-day', 'singles-day'])
export function koopBron(item = {}, segs = []) {
  return (KOOP_CATS.has(CAT_OF.get(item.source)) && !VAKBRON.has(item.source)) || item.feedMark === 'aanbod' || segs.some((x) => SHOP_RUBRIC.has(x))
}
