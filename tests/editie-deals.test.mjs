// Redacteur · deals (14 november 2026): koop-, deal-, cadeaugids- en kortingsstukken nooit in de Editie. Besluit Alex na
// "The 21 Best REI Holiday Sale Outdoor Deals (2026)" van Wired op plek 05 van zijn Middageditie. Elke regel beide kanten
// op: echte koopkoppen uit de live catalogus moeten weg, nieuws over omzet, toezicht, beleid, overnames en markten blijft.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { koopGrond, koopKop, koopVorm, shopCategory, koopBron } from '../shared/koopsignaal.mjs'
import { hardMark, excludedFromEdition } from '../shared/editie-filter.mjs'
import { mediaFields } from '../netlify/lib/rss.mjs'
import { streamItems } from '../netlify/lib/build.mjs'

// De bron van een stuk, zoals de server hem meegeeft (item.source). Fixtures zonder bron krijgen die van hun host; de
// keuringsset "wired-deals" is de dealfeed van Wired.
const HOST_BRON = [[/theverge\.com$/, 'theverge'], [/wired\.com$/, 'wired'], [/ign\.com$/, 'ign'], [/tweakers\.net$/, 'tweakers'], [/(^|\.)nu\.nl$/, 'nu'],
  [/(^|\.)nos\.nl$/, 'nos'], [/bbc\.co\.uk$/, 'bbc'], [/rollingstone\.com$/, 'rollingstone'], [/variety\.com$/, 'variety'], [/polygon\.com$/, 'polygon']]
const bronVan = (o) => {
  if (o.source === 'wired-deals') return 'wired'
  if (o.source) return o.source
  const host = /^https?:\/\/([^/]+)/i.exec(String(o.url || ''))?.[1]?.replace(/^www\./, '') || ''
  return HOST_BRON.find(([re]) => re.test(host))?.[1]
}
const art = (o) => {
  const x = { kind: 'article', url: 'https://example.test/story/x/', ...o }
  return { ...x, source: bronVan(x) }
}
const read = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8')).items
const labels = [...read('editie-filters-sets.json'), ...read('ruis-labels.json')]

const REI = { title: 'The 21 Best REI Holiday Sale Outdoor Deals (2026)', url: 'https://www.wired.com/story/best-rei-holiday-sale-outdoor-deals-2026/', summary: "Stock up on outdoor gear and gifts for friends at REI's annual holiday sale." }

test('de melding van Alex: de Wired-deal van REI gaat uit de Editie', () => {
  assert.equal(koopGrond(REI.title), 'dealkop')
  assert.deepEqual(hardMark(art(REI)), { soort: 'aanbieding', grond: 'koopkop' })
  assert.equal(excludedFromEdition(art(REI)), true)
})

// Echte koopkoppen uit de live catalogus van 14 november 2026 (gethoot.app/api/feed) en de feed van Wired.
const WEG = [
  'Best Early Black Friday AirPods Deals (2026)', // Wired
  'Atlas Coffee Club’s Black Friday Deals (2026)', // Wired
  'Thanksgiving Meal Deals Roundup (2026): Walmart, Amazon, Target', // Wired
  'Early Black Friday Mattress Deals: Get Up to 55% Off WIRED-Tested Favorites', // Wired
  'Mint Mobile Will Give You $500 Off Select New Phones When You Sign Up for a Year', // Wired
  'My 9 Favorite Pickleball Paddles From 3 Years of Testing (2026)', // Wired, koopgids
  'The best early Black Friday deals you can already shop', // The Verge
  'The Verge’s 2026 gift guide for dads', // The Verge
  'CMF’s milk carton-shaped Bluetooth speaker is down to a new low price', // The Verge
  'Here’s how you can save on your GTA VI preorder ahead of launch', // The Verge
  'Today’s Top Deals: Meta Quest 3S, 1TB SanDisk Portable SSD, and a 55" LG B6E OLED Smart TV', // IGN
  'Save $200 Off the Latest 2026 MacBook Air With New Apple M5 Processor for Black Friday', // IGN
  'This Legend of Zelda Triforce Brain Teaser Is Only $13 for Black Friday', // IGN
  'A PlayStation 5 Compatible SSD With Heatsink Dropped to Possibly the Lowest Price We’ll See for Black Friday', // IGN
  'Walmart’s Black Friday Deals: ‘Pokémon’ 30th Anniversary and TCG Surprises', // Polygon
  'Proton Drive Makes Online Work More Secure, and It’s 60% Off Right Now', // Rolling Stone
  '4 Gifts to Upgrade Your Family’s Holiday Gatherings This Year', // Rolling Stone
  'The Best Grateful Dead Merch to Gift Deadheads in 2026', // Variety
  'PROMOJAGERS SUPERTIP. Deze frituren delen dit weekend gratis frituursnacks uit', // HLN
  'Winactie: Maak kans op 2 tickets voor de WielerZesdaagse Rotterdam in Ahoy', // WielerFlits
  // Nederlands, uit de keuringssets.
  'De beste Black Friday-deals van 2026 op een rij',
  'AirPods Pro 3 nu voor €199 bij Bol',
  'Dagdeal: Philips Hue-starterset voor 99 euro',
  'Aanbieding: Samsung Galaxy S26 voor 649 euro bij Coolblue',
  'Black Friday-deal: Logitech MX Master 4 met 35 procent korting',
  'Kortingscode: 20 procent korting bij Zalando',
  'Samsung Galaxy S26 Ultra nu met 300 euro korting',
]

test('koopkop: echte koopstukken uit de live catalogus en de keuringssets gaan weg', () => {
  for (const title of WEG) assert.ok(koopKop(title), 'moet weg: ' + title)
})

// Herstel na de keuring (14 november 2026): bij een sterke koopvorm ("best/top … deals", "best … sales", "deals (2026)",
// "sale: the best …", een koopdag met deals) houdt een los woord in de productomschrijving de deal niet meer vast. Alleen
// het smalle veto (zaken, markten, toezicht, nep, uitleg) telt dan. Gangbare Black Friday-koppen, generiek bedoeld.
const STERK_WEG = [
  'The best Black Friday sales 2026: Argos, Currys and John Lewis', // was: sales
  'Best Black Friday gas grill deals', // was: gas
  'Best early Black Friday record player deals', // was: record
  'Steam autumn sale: the best games to buy', // was: geen koopvorm
  'The best Black Friday TV deals in Europe', // was: in europe
  'Best Black Friday laptop deals for students', // was: students
  'Best Prime Day deals for families', // was: families
  'The best Black Friday deals for Fortnite fans', // was: fans
  'Best Cyber Monday phone plan deals', // was: plan
  'The best Black Friday deals on concert tickets', // was: tickets
  'Best Black Friday olive oil deals', // was: oil
  'Cyber Monday deals on EU-spec e-bikes', // was: eu
  'Best Boxing Day sales in the UK', // was: sales
  'Black Friday deals on Disney+ plans', // koopdag met deals
  'Top Prime Day deals for gamers who say no to cables', // was: say
  'Best Black Friday Peloton deals: prices slashed', // was: prices
  'Black Friday 2026: the best deals on Apple gear for families', // was: families
  'De beste Black Friday-deals voor studenten', // was: studenten
]

test('sterke koopvorm: een los woord in de productomschrijving houdt de deal niet in de Editie', () => {
  for (const title of STERK_WEG) assert.ok(koopKop(title), 'moet weg: ' + title)
  // Ook via de feedcategorie (koopVorm).
  for (const title of STERK_WEG) assert.ok(hardMark(art({ title, feedMark: 'aanbod' }))?.soort === 'aanbieding', 'moet weg: ' + title)
})

// Het smalle veto: zaken, omzet, markten, toezicht, nep en uitleg blijven, ook met een sterke koopvorm.
const STERK_BLIJFT = [
  'Black Friday online sales hit record $11 billion',
  'Webwinkels verwachten recordomzet op Black Friday',
  'Black Friday sales slump as shoppers hold back',
  'Cyber Monday sales beat forecasts',
  'Prime Day 2026 sales top $14 billion',
  'Best Buy sales fall after weak holiday season',
  'Black Friday: Amazon workers strike in Germany',
  'Black Friday-deals: ACM ziet minder nepkortingen',
  'Why the best Black Friday deals are in October now',
  'Top sales executive leaves Apple',
  'Black Friday sale at H&M sparks queues',
  'Salescijfers Black Friday vallen tegen',
  'Unilever agrees sale of ice cream unit',
  'Sale of Chelsea FC to US consortium approved',
  'Sales of electric cars rise 30% in Europe',
  'Tesla shares fall 8% after sales miss',
  'Bitcoin is 30% off its peak',
  'Gold price drops to lowest price in a month',
  'Top 10 M&A deals of 2026',
  'Trump signs trade deal with Japan',
]

test('smal veto: nieuws met een sterke koopvorm blijft', () => {
  for (const title of STERK_BLIJFT) assert.equal(koopGrond(title), null, 'moet blijven: ' + title)
})

// Tegenvoorbeelden: nieuws dat een koopwoord draagt (live catalogus, keuringen, en de Selectie-tak).
const BLIJFT = [
  'Even Black Friday Will Be More Expensive Than Usual', // Wired, live
  'In het pakhuis van Toyfan uit Oldenzaal is het wachten op Black Friday, Sinterklaas en kerstmis', // Tubantia, live
  'Grote premieverschillen basiszorgverzekering: dit zijn de duurste en goedkoopste', // AD, live
  'Worden de boodschappen nou goedkóper? De stuntstroopwafel en andere prijsraadsels in de supermarkt', // NRC, live
  'Oil supplies bounce back, but prices are still high', // Axios, live
  'Court filing alleges Trump adviser received cash, luxury gifts from foreign interests', // Politico, live
  'Jewish Heirs Challenge Sale of $180 Million van Gogh Painting at Sotheby’s', // NYT, live
  'Belastingdeal over links legt breuklijn coalitie bloot', // FD, live
  '$1,200 Off the iPhone Duo? Here\'s How Carrier Deals Actually Work', // Wired, journalistiek over deals
  // Selectie-tak (isBuying): omzet, gedrag, overnames.
  'Black Friday deals drove record online sales',
  'OpenAI signs $10bn chip deal with Broadcom',
  'Wat de deal tussen Ahold en Bol betekent',
  'Black Friday-omzet van webwinkels stijgt met 8 procent',
  'Consument geeft minder uit tijdens Black Friday',
  'Waarom retailers steeds eerder beginnen met Black Friday-deals',
  'ACM waarschuwt voor nepkortingen rond Black Friday',
  'Kabinet wil korting op de zorgtoeslag schrappen',
  'Top 10 M&A deals of the year',
  // Keuringen: beleid, markten, gevolgen.
  'NS geeft 50 procent korting op treinkaartjes tijdens werkzaamheden',
  'Energierekening: huishoudens krijgen 200 euro korting in januari',
  'Singles Day-sale levert Alibaba minder op dan verwacht',
  'Black Friday sale: Best Buy workers strike over holiday pay',
  'Coffee hits its lowest price of the year as Brazil harvest booms',
  'Tesla Model 3 drops to $29,990 in the US',
  'Rolex Daytona is 30% off its 2022 peak on resale market',
  'Families can get $500 off energy bills under new UK plan',
  'Ajax-deal: Brobbey voor 25 miljoen naar Sevilla',
  'Europese Commissie onderzoekt kortingscodes van Temu',
  'Israel’s Latest Last Chance to Save Itself',
  'Blokker failliet: uitverkoop met kortingen tot 90 procent begint maandag',
  'The Best Black Friday Deals Are Often Fakes, Study Finds',
]

test('koopkop: nieuws over omzet, toezicht, beleid, overnames en markten blijft', () => {
  for (const title of BLIJFT) assert.equal(koopGrond(title), null, 'moet blijven: ' + title)
})

test('keuringen: geen nieuwskop gaat weg, en A vangt nu veel meer deals', () => {
  // De koopregel weert geen enkele nieuwskop uit de vier keuringen en de corpora (ook niet de randgevallen van de AI-keuringen,
  // waarvan er vijf al bekend en gedocumenteerd op rubriek of label weggaan).
  const nieuws = labels.filter((x) => x.label === 'N')
  assert.deepEqual(nieuws.filter((x) => hardMark(art(x))?.soort === 'aanbieding' && hardMark(art(x)).grond !== 'rubriek').map((x) => `${x.set}: ${x.title}`), [])
  assert.deepEqual(nieuws.filter((x) => koopKop(x.title)).map((x) => `${x.set}: ${x.title}`), [])
  const deals = labels.filter((x) => x.label === 'W')
  // Vastgelegd op 14 november 2026 (was 58 met alleen rubriek en media); meer vangen mag, minder niet zonder reden.
  assert.ok(deals.filter((x) => hardMark(art(x))).length >= 250, String(deals.filter((x) => hardMark(art(x))).length))
})

// Tweede keuring (14 november 2026): drie generieke gaten. Sportnieuws over transfers, contracten en free agency, prijsbeleid
// als nieuws ("X price drops to $Y under ... law") en "Prijsdaling:" als kopvorm voor marktnieuws bleven niet staan. Elk
// voorbeeld uit de keuring, plus eigen varianten; daarnaast de koopstukken die wel weg moeten blijven gaan.
const SPORT_BLIJFT = [
  'NFL free agency 2026: Best and worst deals so far',
  'Ranking the best contracts and deals of MLB free agency',
  'The best deals of the NBA offseason, ranked',
  'Grading the best NFL free agency deals',
  'Top 5 transfer deals of the summer (2026)',
  'De beste deals van de transferzomer: Ajax verdient 80 miljoen',
  'Transferzomer: de beste deals en grootste miskopen in de Eredivisie',
  // Eigen varianten.
  'The best NHL trade deadline deals, graded',
  'Top 10 signings of the Premier League summer window',
  'Best and worst deals of the MLS offseason (2026)',
  'Ranking the top contract deals of the NBA off-season',
  'The best free-agent deals of the winter, ranked',
  'Top transfers: de beste deals van de winterstop',
  'Beste deals van de Eredivisie: PSV verkoopt voor 40 miljoen',
  'The 10 best value contracts in the NFL right now',
  'Best $1 million deals of NBA free agency',
  'Today\'s best deals in college football NIL contracts',
]

test('tweede keuring: sportnieuws over transfers, contracten en free agency blijft', () => {
  for (const title of SPORT_BLIJFT) assert.equal(koopGrond(title), null, 'moet blijven: ' + title)
  for (const title of SPORT_BLIJFT) assert.equal(hardMark(art({ title })), null, 'moet blijven: ' + title)
})

const PRIJSBELEID_BLIJFT = [
  'Wegovy price drops to $199 a month under Trump deal',
  'Ozempic price drops to $199 for cash buyers',
  'Insulin price falls to $35 under new law',
  'Netflix price drops to $5 with ads',
  // Eigen varianten.
  'Zepbound price falls to $349 for patients without insurance',
  'Inhaler costs drop to $35 under Medicare rule',
  'Spotify Premium price cut to $9 in India',
  'Disney+ price falls to $6 for students under new plan',
  'EpiPen generic drops to $110 after FDA approval of rival drugs',
  'Prijs van insuline daalt naar €20 door nieuwe regeling',
  'Generic drug prices fall to $4 at Walmart pharmacies',
  'Medicijn tegen overgewicht nu voor €150 vergoed onder nieuwe wet',
]

test('tweede keuring: prijsbeleid als nieuws blijft, ook met een bedrag erachter', () => {
  for (const title of PRIJSBELEID_BLIJFT) assert.equal(koopGrond(title), null, 'moet blijven: ' + title)
})

const PRIJSDALING_BLIJFT = [
  'Prijsdaling: energie wordt goedkoper in december',
  'Prijsdaling: tweedehands auto\'s fors goedkoper',
  'Prijsdaling: benzine voor het eerst sinds 2021 onder 1,80',
  // Eigen varianten.
  'Prijsdaling: huizen in Amsterdam voor het eerst goedkoper',
  'Prijsdaling: huren in de vrije sector stabiliseren',
  'Prijsverlaging: rente op hypotheken zakt verder',
  'Prijsdaling: diesel onder €1,70 per liter',
  'Prijsdaling: stroom en gas weer goedkoper voor huishoudens',
  'Prijsdaling: koffie en cacao op de wereldmarkt fors goedkoper',
  'Prijsverlaging: zorgpremie 2027 lager dan verwacht',
  'Prijsdaling: occasions kosten gemiddeld €1.500 minder',
  'Prijsdaling: boodschappen bij de supermarkt iets goedkoper',
]

test('tweede keuring: "Prijsdaling:" vooraan is marktnieuws, tenzij er een productprijs of winkel achter staat', () => {
  for (const title of PRIJSDALING_BLIJFT) assert.equal(koopGrond(title), null, 'moet blijven: ' + title)
  // Een aanbodlabel met een productprijs of een winkel blijft een aanbod.
  for (const title of ['Prijsdaling: AirPods Pro 3 nu voor €199 bij Bol', 'Prijsverlaging: Samsung Galaxy S26 voor 649 euro bij MediaMarkt',
    'Prijsdaling: Philips Hue-starterset bij Coolblue', 'Prijsdaling: Sony WH-1000XM6 tijdelijk €299 bij Bol']) assert.equal(koopGrond(title), 'label', 'moet weg: ' + title)
  // Met alleen een bedrag is het ook het prijsbesluit van een maker (derde keuring): dat blijft.
  for (const title of ['Prijsverlaging: Tesla Model Y nu voor €39.990', 'Prijsverlaging: Samsung Galaxy S26 voor 649 euro', 'Prijsdaling: Sony WH-1000XM6 tijdelijk €299'])
    assert.equal(koopGrond(title), null, 'moet blijven: ' + title)
})

test('tweede keuring: koopstukken in dezelfde vormen gaan nog steeds weg', () => {
  for (const title of ['AirPods Pro 3 drop to $199 at Amazon', 'PS5 Pro Drops to $599 at Walmart for Black Friday', 'The best Black Friday TV deals you can get right now',
    'Best Black Friday sports gear deals', 'The best Black Friday deals on NFL jerseys', 'Best NBA 2K27 deals for Black Friday', 'Top Cyber Monday deals on football boots',
    'The Verge\'s 2026 gift guide for dads', 'Gift guide: 20 cadeaus onder de 50 euro'])
    assert.ok(koopKop(title), 'moet weg: ' + title)
  // Een cadeaugids als onderwerp van het nieuws blijft (gevonden bij de hertelling op de bewaarde feeds).
  assert.equal(koopGrond('Gift guides are the new battleground for Amazon and Temu'), null)
})

test('feedcategorie: "Gear / Deals" en "Buying Guides" zijn aanbod, "Business / Deals" niet', () => {
  assert.equal(shopCategory(['Gear', 'Gear / Deals', 'Gear / Products / Outdoor']), true)
  assert.equal(shopCategory(['Gear', 'Gear / Buying Guides']), true)
  assert.equal(shopCategory(['Aanbiedingen']), true)
  assert.equal(shopCategory(['Business', 'Business / Deals']), false)
  assert.equal(shopCategory(['Markets > Deals']), false)
  assert.equal(shopCategory(['Gear', 'Gear / Reviews', 'Gear / Products / Televisions']), false)
  assert.deepEqual(mediaFields({}, ['Gear', 'Gear / Deals']), { feedMark: 'aanbod' })
  assert.deepEqual(mediaFields({}, ['Podcast', 'Deals']), { feedMark: 'podcast' })
  assert.deepEqual(mediaFields({}, ['Business', 'Business / Deals']), {})
})

test('feedcategorie: alleen met een koopvorm in de kop, en nooit bij een tegenvoorbeeld', () => {
  const mark = (title) => hardMark(art({ title, feedMark: 'aanbod' }))
  assert.equal(mark('Ruggable Washable Rug Sale: Up to 40% Off')?.grond, 'koopkop')
  assert.equal(mark('Our 6 Favorite Rain Jackets for Hiking (2026)')?.soort, 'aanbieding')
  assert.equal(mark('$1,200 Off the iPhone Duo? Here\'s How Carrier Deals Actually Work'), null)
  assert.equal(mark('The New M6 MacBook Pro Has a Serious Price Problem'), null)
  assert.equal(koopVorm('The New M6 MacBook Pro Has a Serious Price Problem'), false)
  // Zonder de feedcategorie: geen koopkop, dus het blijft.
  assert.equal(hardMark(art({ title: 'Our 6 Favorite Rain Jackets for Hiking' })), null)
})

test('de Stroom verandert niet: een koopstuk staat er gewoon', () => {
  const now = Date.parse('2026-11-14T12:00:00Z')
  const xs = [{ id: 'r', kind: 'article', source: 'wired', title: REI.title, url: REI.url, publishedAt: new Date(now).toISOString() }]
  assert.deepEqual(streamItems(xs).map((i) => i.id), ['r'])
  assert.equal(hardMark({ ...xs[0], kind: 'post' }), null)
})

// Herstel 2, de bronpoort (14 november 2026, besluit van de chief of staff na drie keuringen): een verloren nieuwsstuk is erger
// dan een gemist koopstuk. De kopregels gelden alleen voor een bron die koopstukken maakt (tech, games, cultuur, of een deal-,
// koopgids- of reviewrubriek in de feed of het pad); bij een nieuwsbron tellen alleen de ondubbelzinnige signalen.
const bij = (title, source, url = 'https://example.test/story/x/') => hardMark({ kind: 'article', url, title, source })

test('bronpoort: tech, games en cultuur, of een deal- of reviewrubriek in de feed of het pad', () => {
  for (const source of ['wired', 'theverge', 'ign', 'tweakers', 'polygon', 'rollingstone', 'pitchfork']) assert.equal(koopBron({ source }), true, source)
  // Herstel 3: vakbronnen over een industrie en de cultuurredactie van de NOS krijgen de strikte stand, behalve met een rubriek.
  for (const source of ['techcrunch', 'mittr', 'variety', 'villamedia', 'mediacourant', 'nos-cultuur']) assert.equal(koopBron({ source }), false, source)
  assert.equal(koopBron({ source: 'variety' }, ['lists', 'shopping']), true)
  for (const source of ['nos', 'nu', 'nrc', 'espn', 'vi', 'bbc-sport', 'bloomberg', 'fd', 'politico', 'guardian', 'telegraph', 'nature', 'rtvutrecht', undefined])
    assert.equal(koopBron({ source }), false, String(source))
  assert.equal(koopBron({ source: 'nos', feedMark: 'aanbod' }), true)
  for (const seg of ['deals', 'recommended', 'indybest', 'thefilter', 'reviews', 'black-friday', 'gift-guides']) assert.equal(koopBron({ source: 'telegraph' }, ['x', seg]), true, seg)
  assert.equal(koopBron({ source: 'nos' }, ['nieuws', 'artikel']), false)
})

// Alle nieuwskoppen uit de derde keuring blijven, bij de bronnen waar ze vandaan kunnen komen (en de zakelijke en Best Buy-
// koppen ook bij een koopbron: daar werken de winkelnaam en het smalle veto).
const DERDE_NIEUWS = [
  ['Best Buy to close 50 stores despite holiday deals', ['theverge', 'wired', 'nos']],
  ['Best Buy cuts jobs as holiday deals disappoint', ['theverge', 'wired', 'bloomberg']],
  ['Best Buy announces holiday deals as profit forecast lags', ['theverge', 'wired', 'bloomberg']],
  ['The best deals of the January window', ['bbc-sport', 'guardian-sport', 'espn']],
  ['Eredivisie: de beste deals van deze zomer', ['vi', 'nos-sport']],
  ['De beste deals van de winterstop: Feyenoord slaat toe', ['vi', 'nos-sport']],
  ['Top 10 biggest deals in Premier League history', ['bbc-sport', 'guardian-sport', 'guardian']],
  ['Ranking the best quarterback deals in the NFL', ['espn']],
  ['The best driver deals for the 2027 F1 grid', ['autosport', 'bbc-sport']],
  ['Best value deals in the WNBA expansion draft', ['espn']],
  ['Ajax en PSV: de slechtste aankopen en beste deals van het decennium', ['vi', 'nos-sport']],
  ['Top 5 defence deals signed at Nato summit', ['bbc', 'guardian', 'politico-eu', 'wired']],
  ['Spotify signs best podcast deals in industry with Rogan, Cooper', ['variety', 'rollingstone', 'theverge', 'bloomberg']],
  ['The best book deals of the year: authors land seven-figure advances', ['guardian-culture', 'variety', 'nyt']],
  ['Top Hollywood deals: Netflix lands Spielberg film', ['variety', 'nyt']],
  ['Black Friday deals failed to lift UK high street footfall', ['bbc', 'guardian', 'theverge']],
  ['Black Friday-korting op treinkaartjes bij NS leidt tot storing', ['nos', 'nu', 'tweakers']],
  ['Prijsverlaging: Tesla Model Y nu voor €39.990', ['nu', 'tweakers', 'ad']],
  // Eigen varianten.
  ['Top transfer window deals: Arsenal and Chelsea spend big', ['bbc-sport', 'espn']],
  ['De beste deals van de transferperiode, met PSV voorop', ['vi', 'nos-sport']],
  ['Best deals of baseball\'s winter meetings', ['espn']],
  ['Best Buy reports weak Black Friday as shoppers wait for deals', ['theverge', 'nos']],
  ['Top 10 film deals: Apple lands Scorsese, Amazon inks Bond', ['variety', 'nyt']],
  ['Black Friday deals disappoint high street retailers', ['bbc', 'theverge']],
  ['Prijsdaling: zonnepanelen nu €2.000 goedkoper', ['nos', 'tweakers']],
  ['Prime Day deals: are they actually worth it?', ['nos', 'nu']],
  ['Kortingsregeling voor ov-reizigers verdwijnt', ['nos']],
  ['NS geeft Black Friday-korting op treinkaartjes', ['nos', 'nu']],
]

test('bronpoort: alle nieuwskoppen uit de derde keuring blijven staan', () => {
  for (const [title, bronnen] of DERDE_NIEUWS) for (const source of bronnen) assert.equal(bij(title, source), null, `moet blijven bij ${source}: ${title}`)
})

// Koopkoppen blijven weggaan bij de bronnen waar ze vandaan komen; bij een nieuwsbron alleen de ondubbelzinnige signalen.
test('bronpoort: koopkoppen van Wired, The Verge, IGN, Tweakers, Rolling Stone, Variety en Polygon gaan weg', () => {
  const VAN = { 0: 'wired', 1: 'wired', 2: 'wired', 3: 'wired', 4: 'wired', 5: 'wired', 6: 'theverge', 7: 'theverge', 8: 'theverge', 9: 'theverge', 10: 'ign', 11: 'ign',
    12: 'ign', 13: 'ign', 14: 'polygon', 15: 'rollingstone', 16: 'rollingstone', 17: 'rollingstone', 18: 'hln', 19: 'wielerflits' }
  WEG.forEach((title, i) => assert.ok(bij(title, VAN[i] ?? 'tweakers')?.soort === 'aanbieding', 'moet weg: ' + title))
  for (const title of [...STERK_WEG, 'AirPods Pro 3 drop to $199 at Amazon', 'PS5 Pro Drops to $599 at Walmart for Black Friday', 'The Verge\'s 2026 gift guide for dads',
    'These Gift Ideas and Collectibles Could Be the Next Best Thing', 'Gift ideas for the music lover in your life', 'Best Buy\'s Black Friday deals: AirPods, TVs and more'])
    assert.ok(['theverge', 'ign', 'rollingstone'].every((source) => bij(title, source)?.soort === 'aanbieding'), 'moet weg: ' + title)
  // Black Friday-proef (derde keuring): twintig koopkoppen bij een koopbron.
  for (const title of ['Best Black Friday TV Deals (2026)', 'The best Black Friday laptop deals', 'Sony WH-1000XM6 is $80 off for Black Friday', 'Black Friday Sale: Up to 50% Off Everything',
    'Black Friday-aanbiedingen bij Bol: dit zijn de beste', 'Samsung Galaxy S26 nu voor €399 bij Coolblue', 'iPad Air tijdelijk goedkoper voor Black Friday',
    'Cyber Monday deals 2026: the best offers on TVs', 'De beste Black Friday-deals van 2026 op een rij', 'Elden Ring Nightreign Is 40% Off for Black Friday'])
    assert.ok(['tweakers', 'theverge', 'ign'].every((source) => bij(title, source)?.soort === 'aanbieding'), 'moet weg: ' + title)
  // Een deal- of Black Friday-rubriek in het pad opent de poort ook bij een nieuwsbron.
  assert.equal(bij('De beste Black Friday-deals op een rij', 'nu', 'https://www.nu.nl/black-friday/6418010/de-beste-black-friday-deals.html')?.soort, 'aanbieding')
  assert.equal(bij('The 25 best Christmas gift ideas for her', 'telegraph', 'https://www.telegraph.co.uk/recommended/leisure/best-christmas-gifts-for-her/')?.soort, 'aanbieding')
})

test('bronpoort: bij een nieuwsbron alleen de ondubbelzinnige signalen', () => {
  for (const [title, source] of [['Winactie: Maak kans op 2 tickets voor de WielerZesdaagse Rotterdam in Ahoy', 'wielerflits'], ['AirPods Pro 3 nu voor €199 bij Bol', 'nu'],
    ['AirPods Pro 3 drop to $199 at Amazon', 'nos'], ['Dagdeal: Philips Hue-starterset voor 99 euro', 'telegraaf'], ['Aanbieding: Samsung Galaxy S26 voor 649 euro bij Coolblue', 'ad'],
    ['Kortingscode: 20 procent korting bij Zalando', 'ad'], ['Prijsdaling: AirPods Pro 3 nu voor €199 bij Bol', 'nu'], ['PROMOJAGERS SUPERTIP. Deze frituren delen dit weekend gratis frituursnacks uit', 'hln'],
    ['Zalando promo code: 15% off your first order', 'independent'], ['[ADV] Ontdek de nieuwe Volvo EX30', 'telegraaf'],
    // Gevonden bij de hertelling: een winactie in de gebiedende wijs, een gesponsord stuk en een koopdaglabel.
    ['Win kaarten voor U2 in de Johan Cruijff Arena op 6 juni 2027', 'parool'], ['Gesponsord: win een reis naar Lapland', 'hln'],
    ['Black Friday-deals: AirPods Pro 3 nu voor 199 euro', 'nu']])
    assert.equal(bij(title, source)?.soort, 'aanbieding', `moet weg bij ${source}: ${title}`)
  // Dezelfde vormen die bij een koopbron weggaan, blijven bij een nieuwsbron staan (twijfel blijft staan).
  for (const [title, source] of [['The best Black Friday TV deals in Europe', 'guardian'], ['Top 10 deals of the summer', 'bbc-sport'], ['Kindle Paperwhite op Black Friday voor €99', 'nos'],
    ['Deal: Ajax en Sevilla eens over Brobbey', 'nos-sport'], ['Prijsverlaging: Samsung Galaxy S26 voor 649 euro', 'nu'], ['Gift guides are the new battleground for Amazon and Temu', 'ft'],
    ['Tesla Model 3 drops to $29,990 in the US', 'bloomberg'], ['Europese Commissie onderzoekt kortingscodes van Temu', 'nos'], ['Kortingscodes van november: zo bespaar je op je boodschappen', 'nu'],
    ['Black Friday-deals: ACM ziet minder nepkortingen', 'nos'], ['Win for Ajax keeps title hopes alive', 'nos-sport']])
    assert.equal(bij(title, source), null, `moet blijven bij ${source}: ${title}`)
  // "land" in een productnaam is geen akkoord: de dealkop van IGN gaat weg.
  assert.equal(bij('Today’s Top Deals: Kirby and the Forgotten Land for Switch 2, Apple AirTags, and LEGO Santa Minifigure', 'ign')?.soort, 'aanbieding')
})

// Herstel 3 (vierde keuring): vormen in plaats van woorden. Alle nieuwskoppen uit de vierde keuring blijven staan, elk bij
// twee tot drie bronnen waar ze vandaan kunnen komen.
const VIERDE_NIEUWS = [
  // 1. Een winactie in een gewone zin, of met phishing, nep of oplichting: nieuws over een winactie.
  ['Politie: pas op voor nep-winactie van Albert Heijn op WhatsApp', ['nos', 'nu', 'ad']],
  ['Facebook-winactie van Jumbo blijkt oplichting', ['nos', 'nu', 'ad']],
  ['Winactie van Kruidvat op Instagram is nep, waarschuwt de supermarkt', ['nos', 'nu', 'ad']],
  ['Winactie radiozender loopt uit de hand: honderden mensen bij studio', ['nos', 'nu', 'ad']],
  ['Win kaarten voor de finale? Oplichters lokken fans met valse acties', ['nos', 'nu', 'nos-cultuur']],
  ['Win tickets voor Lowlands? Oplichters lokken fans met valse acties', ['nos-cultuur', 'nu', 'wielerflits']],
  // 2. Een koopdaglabel boven een consumentenvraag.
  ['Black Friday-deals: hoe goed zijn ze echt?', ['nos', 'telegraaf', 'nu']],
  ['Black Friday-deals: hoe echt zijn de kortingen dit jaar?', ['nos', 'telegraaf', 'nu']],
  ['Black Friday-deals: waar moet je op letten?', ['nos', 'telegraaf', 'nu']],
  // 3. Een bedrag bij een winkel in een gewone zin.
  ['Pakketjes van €20 bij Bol.com krijgen extra heffing uit Brussel', ['nu', 'nos', 'ad']],
  ['Eerste iPhone 18 gaat voor €1.200 over de toonbank bij MediaMarkt', ['nos', 'nu', 'telegraaf']],
  ['Thanksgiving dinner costs $58 at Walmart, its cheapest in years', ['npr', 'guardian', 'bbc']],
  ['Warehouse staff win $2 hourly raise from Amazon after months of talks', ['guardian', 'bbc', 'npr']],
  // 4. Een kortingscode met een percentage die phishing blijkt.
  ['Kortingscode van 10 procent bij Zalando blijkt phishing', ['nos', 'nu', 'ad']],
  ['Kortingscode van 20 procent blijkt phishingmail', ['nos', 'nu']],
  // 5. Zakennieuws bij een vakbron of een koopbron: aankopen, financiering, cijfers.
  ['The top AI deals of the week', ['techcrunch', 'mittr']],
  ['The top 25 AI funding deals of 2026 so far', ['techcrunch', 'mittr', 'theverge']],
  ['The top deals of the Toronto film festival market', ['variety', 'villamedia']],
  ["AFM's top deals: Netflix buys Spielberg drama", ['variety', 'rollingstone', 'theverge']],
  ['De beste deals van het mediajaar: DPG koopt RTL', ['mediacourant', 'villamedia', 'tweakers']],
  ["Amazon's best Prime Day deals were on its own devices, data shows", ['theverge', 'wired', 'techcrunch']],
  // Sport en zaken die de vierde keuring al zag staan.
  ['De beste deals van de winter: PSV haalt verdediger op', ['vi', 'nos-sport', 'espn']],
  ['The best deals of the NBA offseason, ranked', ['espn', 'bbc-sport']],
  ["Wall Street banks' top deals of 2026 (so far)", ['bloomberg', 'ft', 'fd']],
  ['Aanbieding: kabinet biedt boeren 2 miljard', ['nos', 'nu', 'ad']],
  ['Dagdeal in de Wetstraat', ['hln', 'vrt', 'standaard']],
  ['Koopjes: huizen in Groningen nog altijd het goedkoopst', ['nos', 'nu']],
  ['Prijsverlaging: Albert Heijn verlaagt prijzen', ['nos', 'nu', 'ad']],
]

test('vierde keuring: alle nieuwskoppen blijven staan', () => {
  for (const [title, bronnen] of VIERDE_NIEUWS) for (const source of bronnen) assert.equal(bij(title, source), null, `moet blijven bij ${source}: ${title}`)
})

test('vierde keuring: koopstukken met een aanbodvorm gaan bij een nieuwsbron nog steeds weg', () => {
  for (const [title, bronnen] of [
    ['Black Friday-deals: 50 procent korting op Philips Airfryer bij Bol', ['nu', 'ad']],
    ['Black Friday-deals: AirPods Pro 3 nu voor 199 euro', ['nu', 'telegraaf']],
    ['Black Friday-deal: Logitech MX Master 4 bij Coolblue', ['nu', 'ad']],
    ['Nu voor €199: Samsung Galaxy Buds bij MediaMarkt', ['nos', 'nu']],
    ['Samsung-tv van 899 euro voor 599 euro bij Coolblue', ['nu', 'ad']],
    ['PS5 Pro Drops to $599 at Walmart for Black Friday', ['guardian', 'bbc']],
    ['Kortingscode: 25 procent korting op je eerste bestelling bij HelloFresh', ['nu', 'ad']],
    ['Win kaarten voor U2 in de Johan Cruijff Arena op 6 juni 2027', ['parool', 'nos-cultuur']],
    ['Winactie: Maak kans op 2 tickets voor de WielerZesdaagse Rotterdam in Ahoy', ['wielerflits', 'nu']],
  ]) for (const source of bronnen) assert.equal(bij(title, source)?.soort, 'aanbieding', `moet weg bij ${source}: ${title}`)
  // Bij een koopbron blijft een dealkop zonder zakenwoord weggaan; een vakbron mist hem bewust.
  assert.equal(bij('The top AI deals of the week', 'theverge')?.soort, 'aanbieding')
  assert.equal(bij('The Best Grateful Dead Merch to Gift Deadheads in 2026', 'variety'), null)
  assert.equal(bij('Last chance to save $500 on Disrupt 2027 passes', 'techcrunch'), null)
})


// Herstel 4 (vijfde keuring): drie echte koopstukken van koopbronnen bleven staan door een fout in een woordenlijst.
test('vijfde keuring: de twee Wired-deals onder "Gear / Deals" en de Eurogamer-winactie gaan weg', () => {
  const wired = JSON.parse(readFileSync(new URL('./fixtures/wired-deals-2026-11-11.json', import.meta.url), 'utf8')).items
  for (const title of ['Rocco’s Black Friday Sale: Smart Fridges Hit Their Lowest Prices of 2026', 'Get 25 Percent Off My Favorite Renter-Friendly Storage Lockers']) {
    const it = wired.find((x) => x.title === title)
    assert.ok(it, title)
    const item = { kind: 'article', title: it.title, url: it.url, source: 'wired', ...mediaFields({}, it.cats) }
    assert.equal(item.feedMark, 'aanbod', title)
    assert.equal(hardMark(item)?.soort, 'aanbieding', `moet weg: ${title}`)
  }
  // "Renter" is geen rente: de prijsvalvorm telt ook zonder de feedcategorie.
  assert.equal(bij('Get 25 Percent Off My Favorite Renter-Friendly Storage Lockers', 'wired')?.soort, 'aanbieding')
  assert.equal(bij('Tell us your favourite Grand Theft Auto gaming memory and win a copy of GTA 6', 'eurogamer', 'https://www.eurogamer.net/grand-theft-auto-gaming-memory-competition-gta-6-win')?.soort, 'aanbieding')
  // De andere kant: nieuws met dezelfde woorden blijft.
  assert.equal(bij('GTA 6 copy leaks', 'eurogamer'), null)
  assert.equal(bij('Rente op spaarrekening stijgt opnieuw', 'nos'), null)
  // Op de route via de feedcategorie houdt het smalle veto een tegenvoorbeeld nog steeds vast.
  assert.equal(hardMark(art({ title: '$1,200 Off the iPhone Duo? Here\'s How Carrier Deals Actually Work', feedMark: 'aanbod', source: 'wired' })), null)
})

test('vijfde keuring (advies): nieuws over een winactie, een koopdagvraag en een zakenrangschikking blijft', () => {
  for (const [title, bronnen] of [
    ['Win kaarten voor Lowlands? Pas op, zegt de Fraudehelpdesk', ['ad', 'nu', 'nos']],
    ['Black Friday-deals: zijn ze dit jaar echt goedkoper bij Bol?', ['nu', 'nos', 'telegraaf']],
    ['The best deals Disney made with Marvel, ranked', ['polygon', 'variety', 'theverge']],
  ]) for (const source of bronnen) assert.equal(bij(title, source), null, `moet blijven bij ${source}: ${title}`)
  // Zonder vraagteken blijft het koopdaglabel met een winkel een aanbod.
  assert.equal(bij('Black Friday-deal: Logitech MX Master 4 bij Coolblue', 'nu')?.soort, 'aanbieding')
})
