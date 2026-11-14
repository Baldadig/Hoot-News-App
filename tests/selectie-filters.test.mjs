// Selectie-review 14 november, punt 2: de filters laten te veel door, en Black Friday komt eraan (maandag 30 november).
// Verzamelstukken, koopsignalen, aankondigingen, lijstjes en kenners naast hun vak. Elke regel beide kanten op: de echte
// koppen uit week 45 en de Black Friday-proef moeten weg, de tegenvoorbeelden moeten blijven.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isReading, isBuying, fieldOf, besideField, composeVak, VAK_SOURCES } from '../netlify/lib/vak.mjs'

const src = (id) => VAK_SOURCES.find((s) => s.id === 'vak:' + id)
const weg = (titles) => {
  for (const title of titles) assert.equal(isReading({ title, url: 'https://example.com/a/' + title.length }), false, 'moet weg: ' + title)
}
const blijft = (titles) => {
  for (const title of titles) assert.equal(isReading({ title, url: 'https://example.com/a/' + title.length }), true, 'moet blijven: ' + title)
}

test('verzamelstukken: nummer achter een vaste titel, weekoverzicht, best of, nieuwsupdate, populair (week 45)', () => {
  weg([
    'Data Engineering Weekly #295',
    'Week in review: Employment growth hits unexpected high after months of tepid gains',
    'Weekend reading: Poll proves taxing for portfolios',
    'Best of October 2026',
    'Nieuwsupdate: Massaclaim tegen Chemours om pfas-vervuiling en Nederlandse plasticrecycler vervijfvoudigt capaciteit',
    '10x populair: Instagram-updates, investeren in GEO en storytellingtrends',
    'The Scoop: What the blue wave means for America’s economy',
    'Funny on Sunday: At The Doctor’s Office',
    'Friday Squid Blogging: New Jurassic Squid Predecessors',
    // dezelfde vorm, andere titels
    'Issue 112: What we learned from shipping agents',
    'The Analytics Digest #48',
    'Weekoverzicht: de belangrijkste HR-berichten',
    'Het beste van de week in design',
    'Meest gelezen: de tien stukken van oktober',
  ])
  blijft([
    'Why Nvidia is #1 in AI chips, for now', // één cijfer na een hekje is geen nummer van een vaste titel
    'The best of both worlds: hybrid work after five years',
    'Spotify is the most popular app in Europe, report says',
    'Super Tuesday: what the primaries mean for tech policy', // een weekdag, geen rubriek
    'What a week of review boards taught me about design critique',
    'Nieuws over updates: Google rolt zoekupdate uit',
  ])
})

test('verzamelstukken: een nummer telt alleen als label van een vaste titel (keuring 14 november)', () => {
  weg(['Nr. 34', 'Nummer 12: de stand van de Nederlandse podcast', 'The Product Letter Issue 88', 'Vakblad nr. 7: zorg in de wijk', 'Design notes – Vol. 3', 'Field Guide (No. 14)'])
  blijft([
    'Taylor Swift opnieuw op nummer 1 in de Top 40',
    'World’s 50 Best Restaurants presenteert nieuwe nummer 1, terwijl Nederland wéér ontbreekt in lijst',
    'Koploper Heracles wint ruim van Roda en loopt uit op nummer 2 VVV',
    'Wiki Drops New Mixtape Papiseed Street Vol. 2',
    'Downing Street nummer 10 ontkent lek',
    'Nummer 1-hit van Raye blijft drie weken staan',
    'Een los stuk nummer 3 over filmkrant zonder overlap 21', // de weekendtoets in selectie-bundel
  ])
})

test('koopsignaal: Black Friday-proef (Androidworld, iCulture, Bright, Tweakers) en acties vallen weg', () => {
  weg([
    'Black Friday 2026: de beste deals voor Android-telefoons', // Androidworld
    'Black Friday 2026: dit zijn de beste deals op iPhones en iPads', // iCulture
    'Black Friday: korting op televisies, laptops en koptelefoons', // Bright
    'Black Friday 2026: de deals op een rij', // Tweakers
    'Cyber Monday: 30 procent korting op de MacBook Air',
    'Cyber Monday deals on cameras and lenses',
    'The best deals on mirrorless cameras this week',
    'Deze provider stunt met een gratis Nintendo Switch 2: zo claim je hem', // week 45, Androidworld
    'Test je kennis in de grote Guatemala-quiz en win 2 vliegtickets naar Guatemala!', // week 45, Columbus
    'Doe mee aan de winactie en maak kans op een fotocamera',
  ])
  assert.equal(isBuying('Black Friday 2026: de beste deals voor Android-telefoons'), true)
})

test('koopsignaal: nieuws over omzet, gedrag of een overname blijft', () => {
  blijft([
    'Black Friday deals drove record online sales',
    'OpenAI signs $10bn chip deal with Broadcom',
    'Wat de deal tussen Ahold en Bol betekent',
    'Black Friday-omzet van webwinkels stijgt met 8 procent',
    'Consument geeft minder uit tijdens Black Friday',
    'Waarom retailers steeds eerder beginnen met Black Friday-deals',
    'ACM waarschuwt voor nepkortingen rond Black Friday',
    'Kabinet wil korting op de zorgtoeslag schrappen',
    'Who will win the AI race? Five experts weigh in',
    'Ajax wint van PSV na sterke tweede helft',
    'Why ad discounts hurt your brand',
  ])
})

test('koopsignaal: een aanbieding aan de lezer, niet elk woord over korting (keuring 14 november)', () => {
  // Gedrag en omzet rond een koopdag, en rechtszaken over deals.
  blijft([
    'Singles Day-sale levert Alibaba minder op dan verwacht',
    'Black Friday-sale: winkeliers in binnenstad zien 30 procent minder bezoekers',
    'Black Friday sale at Primark sparks stampede in Manchester',
    'Black Friday sale: Best Buy workers strike over holiday pay',
    'Black Friday sale: 40% off claims misleading, CMA rules',
    'The Best Black Friday Deals Are Often Fakes, Study Finds',
    'FTC sues Amazon over Prime Day ‘deal’ badges it says were deceptive',
    'Amazon sued over Prime Day “deals” that were never discounted',
    'Winkeliers doen dit jaar minder mee aan Black Friday-kortingen',
    'Black Friday: retailers kiezen voor minder korting',
  ])
  // Kortingen als nieuws: van de overheid, een vervoerder, een verhuurder.
  blijft([
    'NS-reizigers krijgen vanaf januari 40 procent korting in de daluren',
    'Kabinet: 50 procent korting op kinderopvang voor middeninkomens',
    'Energierekening: huishoudens krijgen 200 euro korting in januari',
    'Huurders krijgen 15 procent korting bij Vesteda na lekkages',
    'Subsidie op elektrische auto’s keert terug: 2950 euro korting',
  ])
  // "stunt met", "zo claim je" en "win" in een gewone zin.
  blijft(['Kuijts Fenerbahçe stunt met zege op Liverpool', 'Zo claim je je recht op schadevergoeding na datalek', 'Feyenoord win reis naar Champions League-finale niet'])
  // De aanbiedingsvorm buiten een koopdag gaat wel weg.
  weg([
    'MacBook Air M5 nu met 25 procent korting bij Coolblue',
    'Sony WH-1000XM6 nu voor 299 euro',
    'Pixel 10 Pro voor de laagste prijs ooit',
    'Bespaar 200 euro op de Galaxy S26',
    'Save $150 on the DJI Mini 5 Pro',
    'Black Friday deals for photographers: lenses, bags and memory cards',
    'The best Black Friday deals',
    'Provider stunt met lage prijs voor glasvezel',
    'Gratis drie maanden Disney+: zo claim je het',
    'Ecoflow Power Bank Deal: Save $80',
    'Early Black Friday Mattress Deals: Get Up to 35% Off',
    'Kortingscode: 20 procent korting bij Zalando',
    'Booking.com Promo Codes: 20% Off | November 2026',
    'The MacBook Pro Max Just Dropped to Its Lowest Price Ever',
    'De beste Black Friday-deals van 2026 op een rij',
    'The 10 Best Early Black Friday Headphone Deals (2026)',
    'Greenlight Digital Wall Calendar Black Friday Sale (2026)',
    'PS5 Pro Black Friday Deal: Get a Free Game With Purchase',
    'Get a Nintendo Switch 2 for $448 During the Early Black Friday Sale',
    'Met deze vroege Black Friday-deals bij Bol bespaar je nu al fors',
    'Krijg 50 procent korting op je eerste maand Videoland',
    'Decathlon stunt met racefietsen voor nog geen 5.000 euro',
  ])
  // Dezelfde woorden in nieuws: geen gebiedende wijs, een markt, een toezichthouder, een uitleg.
  blijft([
    'Families can get $500 off energy bills under new UK plan',
    'Students can now get 50% off rail fares, Spain announces',
    'Save 10% of income for pension, Dutch funds tell young workers',
    'Energy crisis: save 15% on gas this winter, EU urges households',
    'Brent crude drops to its lowest price of the year',
    'Coffee hits its lowest price of the year as Brazil harvest booms',
    'Trump’s approval rating hits all-time low as prices rise',
    'Europese Commissie onderzoekt kortingscodes van Temu',
    'Rechtbank: kortingscodes van influencers zijn verkapte reclame',
    'Nu 30 procent korting op de energierekening? Zo zit het',
    'Black Friday sale: politie waarschuwt voor zakkenrollers',
    'Prime Day deal: Amazon workers strike in Germany',
  ])
})

test('aankondigingen: een congres met alleen naam en jaartal, "Announced", een fragment uit een boek (week 45)', () => {
  weg(['UX Conference January Announced (Jan 19 – Feb 1)', 'The Pragmatic Summit 2027', 'Read an Excerpt From A Fist of Molten Fire by James Rollins', 'Lees een fragment uit de nieuwe roman van Arnon Grunberg'])
  blijft(['What I learned at the Pragmatic Summit 2027 about platform teams', 'Web Summit verhuist in 2027 naar Amsterdam', 'Apple announced a new MacBook, and designers are not impressed'])
})

test('lijstjes: elk "N beste/best" met een zelfstandig naamwoord, maar geen prijsnieuws (week 45)', () => {
  weg([
    '8 best hotels in Megève for a glamorous Alpine stay',
    '9 best hotels in the Seychelles 2025 for the ultimate island escape',
    '8 best Afghan restaurants in London for your next culinary adventure',
    '8 of the best family-friendly hotels in Lapland for a magical Arctic escape',
    'De 5 beste smartphones van 2026',
    '12 Best Figma Plugins for 2026', // de oude regel blijft
  ])
  blijft(['The 50 Best Restaurants 2026: The Full List of Winners', 'Top 10 M&A deals of the year', 'Waarom de beste hotels geen sterren meer nodig hebben', 'How the best designers handle feedback'])
})

test('kenners: ook de onderwerptoets, en wie over spullen of games schrijft telt die week niet (week 45)', () => {
  const rands = src('rands')
  assert.equal(rands.kind, 'expert')
  for (const title of ['Ultima and Wing Commander Remasters', 'Christopher Ward C63 Sealander Extreme GMT, black dial and ceramic bezel, on an orange Cordura strap', 'Apple Charging Guide Updated']) {
    assert.equal(fieldOf({ title }, rands, { kenner: true }), null, title)
    assert.equal(fieldOf({ title }, rands), 'leiderschap', 'in de voorraad blijft het stuk bewaard: ' + title)
  }
  assert.equal(fieldOf({ title: 'In Your Face – Meeting reminder app for Mac, Windows, iPhone, and iPad' }, src('bradfrost'), { kenner: true }), null)
  // Een echt vakstuk zonder de woorden van de onderwerpregel blijft: dat is de maat.
  for (const [id, title] of [
    ['nngroup', 'Agent Harness: Definition'],
    ['wealthcommon', 'Diversification & Drawdowns'],
    ['noahpinion', 'Why I’m becoming a China bear'],
    ['rands', 'The Mario Meeting'],
    ['saastr', 'A Critical App We Pay For Went Down for 2 Days. They Never Offered a Credit. I Won’t Forget.'],
    ['inrng', 'How Did The Riders To Watch Fare?'],
    ['schneier', 'Another Way Police Are Locating People from Their Smartphones'],
  ]) assert.ok(fieldOf({ title }, src(id), { kenner: true }), `${id}: ${title}`)
  // Bij Gadgets en Games is een telefoon of game het vak zelf.
  assert.equal(besideField({ title: 'iPhone 18 review: the camera is the story' }, 'gadgets'), false)
})

test('kenners: in de samenstelling telt een stuk naast het vak niet mee', () => {
  const now = Date.parse('2026-11-12T10:00:00Z')
  const at = '2026-11-05T09:00:00.000Z'
  const it = (id, source, title) => ({ id, source: 'vak:' + source, sourceName: src(source).name, title, summary: 'Een eigen intro.', url: 'https://example.org/' + id, publishedAt: at })
  const pool = [it('a', 'rands', 'Ultima and Wing Commander Remasters'), it('b', 'lethain', 'How to run a planning process that people trust'), it('c', 'adamgrant', 'The hidden cost of always being available')]
  const lead = composeVak(pool, { now }).fields.find((f) => f.id === 'leiderschap')
  const ids = [...lead.top, ...lead.more].map((e) => e.id)
  assert.ok(!ids.includes('a'))
  assert.deepEqual(ids.sort(), ['b', 'c'])
})
