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
