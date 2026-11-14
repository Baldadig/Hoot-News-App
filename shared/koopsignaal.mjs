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
// Inhoudelijk gelijk aan isBuying van de Selectie (netlify/lib/vak.mjs in de tak selectie: BUY_ALWAYS, DEAL_HEAD,
// SHOP_DAY met SHOP_WORD, ABOUT_SALES); dit is daar een uitbreiding van met de Engelse koopvormen, zodat de Selectie
// later deze ene functie kan gebruiken. Alleen eenvoudige, deterministische toetsen: web, server en toestel (edition-core.js).

// 1. Altijd een aanbod.
const BUY_ALWAYS = new RegExp([
  '\\bzo claim je\\b', '\\bclaim (?:je|nu) (?:gratis|jouw|je)\\b', '\\bwinactie\\b',
  '\\bwin\\s+(?:(?:een|twee|drie|\\d+|a|two|free)\\s+)?(?:[\\p{L}-]+\\s+){0,2}(?:tickets?|vliegtickets|kaarten|kaartjes|exemplaren|exemplaar|copies|reis|trip|prijzen)\\b',
  '\\bmaak kans op\\b', '\\((?:adv|advertentie)\\)', '\\[(?:adv|advertentie)\\]',
  // Cadeaugidsen.
  '\\bgift guides?\\b', '\\bcadeaugids\\w*', '\\bcadeautips\\b', '\\bcadeau-?idee(?:ën|en)\\b',
  '\\bgifts? for (?:him|her|men|women|kids|teens|dads?|moms?|mothers?|fathers?|parents|grandparents|everyone|anyone|the \\w+ lover|\\w+ lovers)\\b',
].join('|'), 'iu')
// Een aanbodlabel vooraan.
const LABEL = /^[\s"'‘“([]*(?:(?:[\p{L}]+-)?deals?|dagdeals?|dagaanbieding|aanbieding(?:en)?|koopjes?|kortingscodes?|prijsdaling|prijsverlaging|prijsfout|promojagers?(?: supertip)?|deal of the day|deal alert)\s*[:|.!–—-]\s/iu

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
  // Toezicht, recht en beleid.
  'ftc', 'regulators?', 'toezicht\\w*', 'waarschuw\\w*', 'warns?', 'boetes?', 'fined?', 'probe', 'lawsuit', 'rechter\\w*', 'court', 'kabinet', 'minister\\w*',
  'overheid', 'government', 'gemeenten?', 'zorgtoeslag', 'toeslag\\w*', 'belasting\\w*', 'tax(?:es)?', 'subsidie\\w*', 'cao', 'pensioen\\w*', 'zorgpremie\\w*',
  // Overnames, akkoorden, handel en politiek.
  'm&a', 'mergers?', 'acquisitions?', 'overnames?', 'takeovers?', 'fusies?', 'trade', 'handels\\w*', 'transfers?', 'contracts?', 'billion', 'miljard\\w*',
  '\\d+\\s?bn', 'funding', 'investments?', 'investering\\w*', 'licens\\w*', 'sponsor\\w*', 'peace', 'vrede\\w*', 'ceasefire', 'bestand', 'tariffs?',
  'akkoord', 'coalitie\\w*', 'senate', 'congress', 'eu', 'brexit', 'nuclear', 'kernwapen\\w*',
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
  // Uitleg en achtergrond.
  'explained', 'uitgelegd', 'zo werkt', 'zo zit het',
].map((w) => `\\b${w}\\b`).join('|') + "|\\bhow\\b[^?]*\\b(?:works?|actually work)\\b", 'iu')

const clean = (t) => String(t || '').replace(/\s+/g, ' ').replace(/[’‘`]/g, "'").trim()

// De grond van een koopkop, of null. 'aanbod' (altijd), 'label', 'dealkop', 'koopdag', 'prijsval', 'koopgids'.
export function koopGrond(title = '') {
  const t = clean(title)
  if (!t) return null
  if (BUY_ALWAYS.test(t)) return 'aanbod'
  if (LABEL.test(t)) return ABOUT.test(t) ? null : 'label'
  const grond = DEAL_HEAD.test(t) ? 'dealkop' : SHOP_DAY.test(t) && SHOP_WORD.test(t) ? 'koopdag' : PRICE_DROP.test(t) ? 'prijsval' : GUIDE.test(t) ? 'koopgids' : null
  return grond && !ABOUT.test(t) ? grond : null
}
export const koopKop = (title = '') => koopGrond(title) != null

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
