// Redacteur · deals (14 november 2026): koop-, deal-, cadeaugids- en kortingsstukken nooit in de Editie. Besluit Alex na
// "The 21 Best REI Holiday Sale Outdoor Deals (2026)" van Wired op plek 05 van zijn Middageditie. Elke regel beide kanten
// op: echte koopkoppen uit de live catalogus moeten weg, nieuws over omzet, toezicht, beleid, overnames en markten blijft.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { koopGrond, koopKop, koopVorm, shopCategory } from '../shared/koopsignaal.mjs'
import { hardMark, excludedFromEdition } from '../shared/editie-filter.mjs'
import { mediaFields } from '../netlify/lib/rss.mjs'
import { streamItems } from '../netlify/lib/build.mjs'

const art = (o) => ({ kind: 'article', url: 'https://example.test/story/x/', ...o })
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
