// Geen recensie of kop zonder nieuws in de Editie (shared/recensie.mjs). Melding Alex, 14 november 2026: in zijn Editie
// stond op plek 09 3voor12 "Ciarán – Róisín", een album van de dag, uit het cultuurblok van zijn interesse Cultuur.
// "Dit is ook een vrij zwak artikel voor een Editie." De Stroom en de Selectie houden recensies.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import vm from 'node:vm'
import { recensieMark, isRecensie, reviewCategory, workTitle } from '../shared/recensie.mjs'
import { excludedFromEdition, hardMark } from '../shared/editie-filter.mjs'
import { mediaFields } from '../netlify/lib/rss.mjs'
import { streamItems } from '../netlify/lib/build.mjs'
import { isReading } from '../netlify/lib/vak.mjs'
import { composeFor } from '../netlify/functions/edition.mjs'
import { composePersonal } from '../src/lib/personal.js'

const art = (o) => ({ kind: 'article', ...o })
// Het stuk uit de melding, zoals het in de live feed van 14 november stond (/api/feed; zonder rubriek, die gaf de oude
// server niet door).
const CIARAN = art({ id: '137cpql', source: '3voor12', sourceName: '3voor12', title: 'Ciarán – Róisín', summary: 'Weer een Ierse artiest, maar ditmaal geen rock- of indieband en ook zeker geen nieuwkomer.', topics: ['muziek'], mainTopics: ['muziek'], url: 'https://3voor12.vpro.nl/artikelen/ciaran-roisin', image: 'https://images.vpro.nl/7874x7wv0b09/3abfa437.png', publishedAt: '2026-11-14T08:00:00.000Z' })

test('de kop uit de melding: een werkkop van een cultuurbron is geen Editiestuk, wel Stroom en Selectie', () => {
  assert.equal(recensieMark(CIARAN), 'werkkop')
  assert.equal(excludedFromEdition(CIARAN), true)
  // hardMark blijft null: de Selectie gebruikt hardMark en houdt het stuk; de Stroom kijkt er niet naar.
  assert.equal(hardMark(CIARAN), null)
  assert.equal(isReading(CIARAN), true)
  assert.deepEqual(streamItems([CIARAN]).map((i) => i.id), [CIARAN.id])
  // Ook in de vorm van de ruwe feed (gewoon streepje), en met de feedrubriek "Album van de dag".
  assert.equal(isRecensie({ ...CIARAN, title: 'Ciarán - Róisín' }), true)
  assert.equal(recensieMark({ ...CIARAN, ...mediaFields({}, ['Album van de dag', 'Nieuwe Muziek']) }), 'feed')
})

// Echte koppen uit de live feeds van 14 november 2026 (opgehaald met de eigen User-Agent van Hoot).
const ECHT = [
  ['3voor12', 'J.Bernardt – Wild Swim', 'https://3voor12.vpro.nl/artikelen/jbernardt-wild-swim'],
  ['3voor12', 'Album van de Dag: Blackhaine – Saints in the Wethouse', 'https://3voor12.vpro.nl/artikelen/blackhaine-saints-in-the-wethouse'],
  ['3voor12', 'Album van de Week (46): Library Card', 'https://3voor12.vpro.nl/artikelen/album-van-de-week-46-library-card'],
  ['stereogum', 'yeule – “Lovepill”', 'https://stereogum.com/2517963/yeule-lovepill/music/'],
  ['stereogum', 'IDK – “Welcome” (Feat. Eminem & Prod. J Dilla)', 'https://stereogum.com/2517907/idk-welcome-feat-eminem-prod-j-dilla/music/'],
  ['quietus', 'Tara Cunningham – Warm Ground', 'https://thequietus.com/quietus-reviews/tara-cunningham-warm-ground-review/'],
  ['quietus', 'Reissue of the Week: Henning Christiansen’s Symphony Natura', 'https://thequietus.com/quietus-reviews/reissue-of-the-week/henning-christiansen-symphony-natura-review/'],
  ['guardian-music', 'U2: Carnaval de Luz review – rousing, restorative rock from a band ready to take on the world again', 'https://www.theguardian.com/music/2026/nov/09/u2-carnaval-de-luz-review'],
  ['guardian-music', 'Philharmonia/Honeck/Ax review – principal conductor designate gives a scorching taste of things to come', 'https://www.theguardian.com/music/2026/nov/13/philharmonia-manfred-honeck-emanuel-ax-review-royal-festival-hall-london'],
  ['guardian-culture', 'Caryl Churchill’s magnificent Cloud 9 reaches for the skies – the National Theatre has done it proud', 'https://www.theguardian.com/stage/2026/nov/11/cloud-9-review-national-theatre-london-caryl-churchill'],
  ['guardian-culture', 'A lipsmacking journey from kisses galore to tears of despair – How Do We Find Love? review', 'https://www.theguardian.com/artanddesign/2026/nov/13/how-do-we-find-love-review-last-human-kiss-ecstasy-and-the-aftermath-sainsbury-museum-art-centre-norwich'],
  ['npr-music', 'Men on a mission', 'https://www.npr.org/2026/11/14/nx-s1-6040417/u2-carnaval-de-luz-album-review'],
  ['rollingstone', '‘Paper Tiger’ Is a Greek Tragedy With a Thick New York Accent', 'https://www.rollingstone.com/tv-movies/tv-movie-reviews/paper-tiger-review-adam-driver-scarlett-johansson-1235653073/'],
  ['variety', '‘Hen’ Review: A Resilient Chicken Flies the Coop, Over and Over, in an Unexpectedly Stirring Survival Story', 'https://variety.com/2026/film/news/hen-review-1236947197/'],
  ['nyt', 'Book Review: ‘Promise Me, America,’ by Joe Biden', 'https://www.nytimes.com/2026/11/13/books/review/promise-me-america-joe-biden.html'],
  ['atlantic', 'The Writer Who Made Food Fun', 'https://www.theatlantic.com/books/2026/11/m-f-k-fisher-made-food-writing-pleasurable-book-review/689398/'],
  ['ign', 'Heartland Review', 'https://www.ign.com/articles/heartland-review-netflix'],
  ['ign', 'Barbie Rewind Review', 'https://www.ign.com/articles/barbie-rewind-review'],
  ['wired', 'TCL QM7L Mini-LED TV Review (2026)', 'https://www.wired.com/review/tcl-qm7l/'],
  ['tweakers', 'Review - Call of Duty: Modern Warfare 4 - Doet denken aan vervlogen tijden', 'https://tweakers.net/reviews/15598/call-of-duty-modern-warfare-4-doet-denken-aan-vervlogen-tijden.html'],
  ['humo', '‘O My Beloved’ heeft een paar mooie uitschieters, maar verder bevat de nieuwe Kings of Leon vooral kampvuurmuziek', 'https://www.humo.be/muziek/recensie-o-my-beloved-de-nieuwe-van-kings-of-leon~bb933cf2/'],
  ['parool', 'Nog massaler, nog overdonderender – in de Ziggo Dome liet Fontaines D.C. de stadionversie van z’n postpunksound horen', 'https://www.parool.nl/kunst-media/recensie-fontaines-d-c-in-de-ziggo-dome-in-amsterdam~bce835c9/'],
  ['demorgen', '‘Minotaur’: ijzingwekkende Russische thriller verweeft overspel met oorlog ★★★★★', 'https://www.demorgen.be/tv-cultuur/minotaur-ijzingwekkende-russische-thriller-verweeft-overspel-met-oorlog~b21590ad/'],
  ['demorgen', 'Soms spat de jaloezie van de pagina’s in Kristien Hemmerechts’ nieuwe memoir', 'https://www.demorgen.be/boeken/recensie-van-requiem-voor-een-liefde-van-kristien-hemmerechts~bf8396b6/'],
]
test('echte recensiekoppen uit de live feeds gaan uit de Editie', () => {
  const missed = ECHT.filter(([source, title, url]) => !isRecensie(art({ source, title, url })))
  assert.deepEqual(missed, [])
})

// Tegenvoorbeelden: nieuws over een werk of een maker, of een kop zonder werkwoord die gewoon nieuws is.
const NIEUWS = [
  ['nos', 'Recensent Jan de Vries ontslagen na ophef', 'https://nos.nl/artikel/2639500-recensent-ontslagen'],
  ['3voor12', 'Ciarán wint Grammy', 'https://3voor12.vpro.nl/artikelen/ciaran-wint-grammy'],
  ['nos', 'Review van het kabinetsbeleid', 'https://nos.nl/artikel/2639501-review-van-het-kabinetsbeleid'],
  ['nrc', 'Kabinet start review', 'https://www.nrc.nl/nieuws/2026/11/14/kabinet-start-review-a4941400'],
  ['rollingstone', 'Rolling Stones kondigen tour aan', 'https://www.rollingstone.com/music/music-news/rolling-stones-tour-2027-1235658300/'],
  ['pitchfork', 'King Gizzard & the Lizard Wizard Announce New Album Entropy, Two North American Tours', 'https://pitchfork.com/news/king-gizzard-announce-new-album-entropy/'],
  ['nos-cultuur', 'Voormalig Doe Maar-drummer Jan Pijnenburg (70) overleden', 'https://nos.nl/l/2639401'],
  ['3voor12', 'Ciarán – Róisín wint Choice Music Prize', 'https://3voor12.vpro.nl/artikelen/ciaran-roisin-wint-choice'],
  ['nos', 'Brand in Stiens', 'https://nos.nl/artikel/2639502-brand-in-stiens'],
  ['nos', 'Trump - Xi', 'https://nos.nl/artikel/2639503-trump-xi'],
  ['guardian', 'Pentagon orders review of Nvidia contracts', 'https://www.theguardian.com/us-news/2026/nov/14/pentagon-orders-review-nvidia'],
  ['guardian', 'Asylum rules under review', 'https://www.theguardian.com/uk-news/2026/nov/14/asylum-rules-under-review'],
  ['guardian-culture', 'Film critic fired over review of Ebenezer', 'https://www.theguardian.com/film/2026/nov/14/film-critic-fired-over-ebenezer-review'],
  ['tweakers', 'Achtergrond - Jensen Huang weg bij Nvidia: hoe kwam het zover en wie kan hem opvolgen?', 'https://tweakers.net/reviews/15604/jensen-huang-weg-bij-nvidia-hoe-kwam-het-zover-en-wie-kan-hem-opvolgen.html'],
  ['eurogamer', "As low-effort AI slop continues to flood Steam, yet more developers announce game delays caused by Valve's growing approval backlog", 'https://www.eurogamer.net/steam-game-submission-review-backlog-ai-slop-approval-delays'],
  ['polygon', 'This 3D Pet SIM You Never Played Has Over 12,000 ‘Overwhelmingly Positive’ Reviews', 'https://www.polygon.com/wobbledogs-3d-pet-sim-steam-overwhelmingly-positive/'],
  ['nu', 'Waarom You Can See Everything de meest besproken documentaire in tijden is', 'https://www.nu.nl/media/6414950/waarom-you-can-see-everything-de-meest-besproken-documentaire-in-tijden-is.html'],
  ['nu', 'Heb je nog een wens? Komende nachten tot 28 vallende sterren per uur te zien', 'https://www.nu.nl/binnenland/6416562/heb-je-nog-een-wens.html'],
  ['rollingstone', 'Coachella Tickets Are Already Sold Out — Here’s What They’re Going for on Resale', 'https://www.rollingstone.com/music/music-news/coachella-tickets-sold-out-1235658206/'],
  ['stereogum', 'Coachella Reveals 2027 Lineup', 'https://stereogum.com/2517000/coachella-reveals-2027-lineup/news/'],
  ['nos-cultuur', 'Booker Prize gaat naar M. John Harrison, oudste winnaar ooit', 'https://nos.nl/l/2638805'],
]
test('tegenvoorbeelden: nieuws over een werk of een maker blijft', () => {
  const wrong = NIEUWS.filter(([source, title, url]) => isRecensie(art({ source, title, url }))).map(([s, t]) => `${s}: ${t} (${recensieMark(art({ source: s, title: t, url: NIEUWS.find((x) => x[1] === t)[2] }))})`)
  assert.deepEqual(wrong, [])
})

test('een kop zonder werkwoord is alleen een werkkop bij een cultuurbron en zonder zinsvorm', () => {
  assert.equal(workTitle('Ciarán – Róisín'), true)
  assert.equal(workTitle('Brand in Stiens'), false)
  assert.equal(workTitle('Coachella Tickets Are Already Sold Out – Here’s What They’re Going for on Resale'), false)
  assert.equal(workTitle('Inheemse Amerikanen – Nicole Beutler Project danst de Two Row Wampum op het Holland Festival'), false)
  assert.equal(isRecensie(art({ source: 'nos', title: 'Ciarán – Róisín', url: 'https://nos.nl/artikel/1-x' })), false)
})

test('de nieuwskoppen uit de vier keuringen en de corpora: alleen echte recensies gaan uit de Editie', () => {
  const sets = JSON.parse(readFileSync(new URL('./fixtures/editie-filters-sets.json', import.meta.url), 'utf8')).items
  const hits = sets.filter((x) => x.label === 'N' && isRecensie(art(x)))
  // Vastgelegd op 14 november 2026: elk is een recensie (review in link of kop, of een recensiemap).
  assert.ok(hits.length <= 20, `${hits.length}`)
  for (const x of hits) assert.match(`${x.url} ${x.title}`, /review|recensie/i, x.title)
})

// Keuring 14 november 2026: twee lekken in de echte feeds, juist via een muziekbron in het cultuurblok.
test('een recensiemap met meer koppeltekens telt (Rolling Stone /music-album-reviews/, /tv-movie-reviews/)', () => {
  const rs = art({ source: 'rollingstone', title: 'Willi Carlisle Says Life Is Dead Serious, Life Is a Joke on the Brilliant ‘Universal Bubba’', url: 'https://www.rollingstone.com/music/music-album-reviews/willi-carlisle-universal-bubba-1235650000/' })
  assert.equal(recensieMark(rs), 'map')
  assert.equal(excludedFromEdition(rs), true)
  assert.equal(recensieMark(art({ source: 'rollingstone', title: 'Een film', url: 'https://www.rollingstone.com/tv-movies/tv-movie-reviews/een-film-1235650001/' })), 'map')
  assert.equal(recensieMark(art({ source: 'rollingstone', title: 'Coachella Lineup Revealed', url: 'https://www.rollingstone.com/music/music-news/coachella-lineup-1235650002/' })), null)
})

test('een nieuwswoord dat geen werkwoord is houdt "X review" niet tegen, wel de zwakste aanwijzingen', () => {
  const recensies = [
    ['theverge', 'Soul Glo’s Diaspora Problems is a hardcore record like no other', 'https://www.theverge.com/2026/11/1/soul-glo-diaspora-problems-review'],
    ['ign', 'Death Stranding 2: On the Beach Review', 'https://www.ign.com/articles/death-stranding-2-on-the-beach-review'],
    ['eurogamer', 'Split Fiction review: a co-op triumph', 'https://www.eurogamer.net/split-fiction-review'],
    ['guardian-music', 'Rosalía: Lux review – a towering, holy record', 'https://www.theguardian.com/music/2026/nov/10/rosalia-lux-review'],
    ['guardian-culture', 'The Dead Don’t Hurt review – a bleak western', 'https://www.theguardian.com/film/2026/nov/10/the-dead-dont-hurt-review'],
    ['guardian-music', 'Wet Leg live review: record-breaking crowd', 'https://www.theguardian.com/music/2026/nov/10/wet-leg-live-review-record-crowd'],
    ['ign', 'Fallen Leaves Review', 'https://www.ign.com/articles/fallen-leaves'],
  ]
  for (const [source, title, url] of recensies) assert.equal(isRecensie(art({ source, title, url })), true, title)
  // De werkkop en "review" midden in de slug blijven tegengehouden door zo een woord.
  assert.equal(workTitle('Ciarán – Grammy'), false)
  assert.equal(isRecensie(art({ source: 'guardian-culture', title: 'Oscar voters', url: 'https://www.theguardian.com/film/2026/nov/10/oscar-review-of-rules-voters' })), false)
})

test('een toetsingswerkwoord voor "review" maakt er een onderzoek van; de werkkop alleen bij muziek en games', () => {
  const nieuws = [
    ['variety', 'Bafta launches review of voting rules', 'https://variety.com/2026/film/news/bafta-launches-review-of-voting-rules-1236900000/'],
    ['rollingstone', 'Oasis Reunion Tour Faces Ticketing Review', 'https://www.rollingstone.com/music/music-news/oasis-reunion-tour-faces-ticketing-review-1235650003/'],
    ['guardian-culture', 'Arts Council opens funding review', 'https://www.theguardian.com/culture/2026/nov/10/arts-council-opens-funding-review'],
    ['nos-cultuur', 'Boekenweek 2027 – thema bekend', 'https://nos.nl/l/2639000'],
    ['variety', 'Glastonbury 2027 – first headliners', 'https://variety.com/2026/music/news/glastonbury-2027-first-headliners-1236900001/'],
    ['mediacourant', 'Paradiso – nieuwe directeur', 'https://www.mediacourant.nl/2026/11/paradiso-nieuwe-directeur/'],
  ]
  for (const [source, title, url] of nieuws) assert.equal(isRecensie(art({ source, title, url })), false, title)
  assert.equal(recensieMark(art({ source: 'stereogum', title: 'yeule – “Lovepill”', url: 'https://stereogum.com/2517001/yeule-lovepill/music/' })), 'werkkop')
  assert.equal(recensieMark(art({ source: 'eurogamer', title: 'Hollow Knight – Silksong', url: 'https://www.eurogamer.net/hollow-knight-silksong' })), 'werkkop')
})

test('feedrubriek: een recensierubriek wordt feedMark recensie; podcast of video als hoofdrubriek gaat voor', () => {
  for (const cats of [['Album van de dag', 'Nieuwe Muziek'], ['Recensie'], ['Recensies'], ['News', 'Reviews'], ['Gear', 'Gear / Reviews'], ['Review / Gaming / Games'], ['Live Reviews'], ['Album of the Week'], ['Tiplijst', 'Song van het Jaar']]) {
    assert.equal(mediaFields({}, cats).feedMark, 'recensie', cats.join(','))
    assert.equal(reviewCategory(cats), true)
  }
  for (const cats of [['Nieuws', 'Popronde'], ['Achtergrond / IT Pro / Bedrijfsnieuws'], ['Opinion polls'], ['What to Play', 'Wobbledogs'], ['Music News'], []]) assert.equal(mediaFields({}, cats).feedMark, undefined, cats.join(','))
  assert.equal(mediaFields({}, ['Podcast', 'Reviews']).feedMark, 'podcast')
  assert.equal(mediaFields({}, ['Video', 'Album van de dag']).feedMark, 'video')
})

// Integratie: dezelfde lezer (Cultuur gekozen, 3voor12 gevolgd) op een bewaarde feed. Op main kreeg de recensie plek 09
// (het cultuurblok); nu niet, en die plek gaat naar ander nieuws: de Editie blijft even lang. Een nieuwskop van dezelfde
// bron krijgt de plek wel. Server, web en app (de gebouwde rekenkern) rekenen gelijk.
const feed = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live-feed-2026-11-11-ochtend.json.gz', import.meta.url))).toString('utf8'))
if (!feed.items?.length) feed.items = [...new Map([...(feed.related || []), ...(feed.edition.items || [])].map((i) => [i.id, i])).values()]
const builtAt = Date.parse(feed.edition.builtAt)
const at = new Date(builtAt - 20 * 60e3).toISOString()
const LEZER = { followed: ['nos', 'nu', 'nrc', 'volkskrant', '3voor12', 'pitchfork', 'guardian-music', 'stereogum'], interests: ['binnenland', 'cultuur'], topics: [], favorites: [], taste: null, readIds: [], reading: null }
const vers = { ...CIARAN, publishedAt: at, firstSeenAt: at }
const nieuws = { ...vers, id: 'ciaran-nieuws', title: 'Ciarán wint de 3voor12 Award', url: 'https://3voor12.vpro.nl/artikelen/ciaran-wint-3voor12-award', summary: 'De Ierse zanger kreeg de prijs vrijdagavond in Utrecht uit handen van de jury.' }
const start = { edition: feed.edition, stories: feed.stories, sources: feed.sources }
const ids = (o) => o.entries.map((e) => e.leadId || e.id)

test('persoonlijke Editie: de recensie krijgt geen plek uit het cultuurblok, de Editie blijft even lang', () => {
  const zonder = composeFor(start, feed.items, LEZER, { owner: 'anon' })
  const met = composeFor(start, [vers, ...feed.items], LEZER, { owner: 'anon' })
  assert.ok(!ids(met).includes(vers.id))
  assert.equal(met.entries.length, zonder.entries.length)
  assert.deepEqual(ids(met), ids(zonder))
  const metNieuws = composeFor(start, [nieuws, ...feed.items], LEZER, { owner: 'anon' })
  assert.ok(ids(metNieuws).includes(nieuws.id), 'een nieuwskop van dezelfde bron krijgt de plek wel')
  assert.equal(metNieuws.entries.length, zonder.entries.length)
})

test('web, app en server rekenen gelijk: de gebouwde rekenkern weert de recensie ook', () => {
  const code = readFileSync(new URL('../ios/Hoot/Resources/edition-core.js', import.meta.url), 'utf8')
  assert.ok(code.includes('function recensieMark('), 'de rekenkern van de app heeft de recensieregel')
  const ctx = {}
  vm.createContext(ctx)
  vm.runInContext(`${code}\nthis.HootCore = HootCore`, ctx)
  const items = [vers, ...feed.items]
  const input = { global: feed.edition, stories: feed.stories, items, sources: feed.sources, followed: LEZER.followed, interests: LEZER.interests, topics: [], favorites: [], now: builtAt }
  const app = JSON.parse(ctx.HootCore.composeEdition(JSON.stringify(input)))
  const web = composePersonal({ ...input, followed: new Set(LEZER.followed), builtAt: new Date(builtAt).toISOString() })
  const server = composeFor(start, items, LEZER, { owner: 'anon' })
  assert.ok(!ids(app).includes(vers.id))
  assert.deepEqual(ids(app), ids(web))
  assert.deepEqual(ids(web), ids(server))
})

// Tweede keuring, 14 november 2026: "X review" aan het eind van de kop en "-review" aan het eind van de slug zijn in een
// nieuws- of sportbron vaak een toetsing of onderzoek. Die tellen alleen bij cultuur-, tech- en gamesbronnen, of met een
// cultuurmap in de link; en een woord als after, following, na, VAR of faces direct voor "review" maakt er een toetsing van.
test('"review" achteraan in kop of slug telt niet bij nieuws- en sportbronnen, en niet na after, VAR of faces', () => {
  const nieuws = [
    ['espn', 'Big hit from Caps’ Chychrun on Sens’ Cousins deemed clean after review', 'https://www.espn.com/nhl/story/_/id/50452880/hit-capitals-chychrun-senators-cousins-deemed-clean'],
    ['espn', 'Premier League VAR review: Arsenal robbed of a penalty through misapplied law', 'https://www.espn.com/soccer/story/_/id/49703019/premier-league-var-review-red-card-penalty-handball-goal-line-technology'],
    ['foreignpolicy', 'Trump Promised Poland More Troops. They’re Still Not There.', 'https://foreignpolicy.com/2026/10/30/trump-poland-troops-deployment-delay-europe-review/'],
    ['espn', 'Arsenal goal ruled out after VAR review', 'https://www.espn.com/soccer/story/_/id/49800000/arsenal-goal-ruled-out-after-var-review'],
    ['espn', 'Red card overturned after review', 'https://www.espn.com/soccer/story/_/id/49800001/red-card-overturned-after-review'],
    ['guardian', 'Netflix shares fall after earnings review', 'https://www.theguardian.com/business/2026/nov/14/netflix-shares-fall-after-earnings-review'],
    ['guardian', 'Starmer’s NHS review', 'https://www.theguardian.com/society/2026/nov/14/starmer-nhs-review'],
    ['guardian', 'BBC chair faces review', 'https://www.theguardian.com/media/2026/nov/14/bbc-chair-faces-review'],
    ['nyt', 'Defense secretary orders Afghanistan withdrawal review', 'https://www.nytimes.com/2026/11/14/us/politics/afghanistan-withdrawal-review.html'],
    ['bloomberg', 'Malaysian King Says No Ambiguity on Najib’s Home Detention Order', 'https://www.bloomberg.com/news/articles/2026-11-07/former-malaysia-pm-najib-s-house-arrest-delayed-pending-review'],
    ['nos', 'Doelpunt Ajax afgekeurd na VAR-review', 'https://nos.nl/artikel/2639600-doelpunt-ajax-afgekeurd-na-var-review'],
    // Ook bij een cultuurbron: een toetsingswoord direct voor "review".
    ['variety', 'Oscars Ceremony Faces Review', 'https://variety.com/2026/film/news/oscars-ceremony-faces-review-1236900002/'],
  ]
  const wrong = nieuws.filter(([source, title, url]) => isRecensie(art({ source, title, url }))).map(([s, t, u]) => `${s}: ${t} (${recensieMark(art({ source: s, title: t, url: u }))})`)
  assert.deepEqual(wrong, [])
  // Een nieuwsbron met een cultuurmap in de link houdt zijn recensies (The Atlantic /books/, Guardian /film/).
  assert.equal(recensieMark(art({ source: 'atlantic', title: 'The Writer Who Made Food Fun', url: 'https://www.theatlantic.com/books/2026/11/m-f-k-fisher-made-food-writing-pleasurable-book-review/689398/' })), 'slug')
  assert.equal(recensieMark(art({ source: 'guardian', title: 'Wicked: For Good review', url: 'https://www.theguardian.com/film/2026/nov/14/wicked-for-good-review' })), 'slug')
  assert.equal(recensieMark(art({ source: 'guardian', title: 'Wicked: For Good review', url: 'https://www.theguardian.com/film/2026/nov/14/wicked-for-good' })), 'kop')
  // Cultuur-, tech- en gamesbronnen houden "X review" en "-review" zonder cultuurmap.
  assert.equal(recensieMark(art({ source: 'ign', title: 'Heartland Review', url: 'https://www.ign.com/articles/heartland-netflix' })), 'kop')
  assert.equal(recensieMark(art({ source: 'theverge', title: 'A phone', url: 'https://www.theverge.com/2026/11/1/pixel-11-review' })), 'slug')
})

// Derde keuring, 14 november 2026, en de bronpoort: een verloren nieuwsstuk is erger dan een gemiste recensie. Een
// toetsing door een toezichthouder, overheid of bedrijf ("charter review", "FCC review", "under review", "Is Reviewing")
// en nieuws óver een recensie zijn geen recensie; noemt de kop zelf zo een vorm, dan telt de slug niet. "X recensie"
// achteraan in kop of slug telt, net als "X review", alleen bij cultuur-, tech-, games- en muziekbronnen.
test('toetsing en ophef over een recensie in de kop: slug en kopwoord tellen niet (bronpoort)', () => {
  const nieuws = [
    ['variety', 'BBC Charter Review: Government Sets Out Licence Fee Options', 'https://variety.com/2026/tv/global/bbc-charter-review-licence-fee-options-1236900100/'],
    ['guardian-culture', 'BBC charter review: ministers set out future of licence fee', 'https://www.theguardian.com/tv-and-radio/2026/nov/14/bbc-charter-review-ministers-licence-fee'],
    ['variety', 'Paramount-Warner Merger Gets FCC Review', 'https://variety.com/2026/biz/news/paramount-warner-merger-fcc-review-1236900101/'],
    ['techcrunch', 'Nvidia’s Arm deal faces UK antitrust review', 'https://techcrunch.com/2026/11/14/nvidia-arm-deal-antitrust-review/'],
    ['theverge', 'EU opens antitrust review of Microsoft Teams bundling', 'https://www.theverge.com/news/1030000/microsoft-teams-antitrust-review'],
    ['guardian-music', 'Glastonbury licence under review after crowd crush', 'https://www.theguardian.com/music/2026/nov/14/glastonbury-licence-review-crowd-crush'],
    ['wired', 'The FTC Is Reviewing Amazon’s Deal', 'https://www.wired.com/story/ftc-amazon-deal-review/'],
    ['guardian-culture', 'Arts Council England review recommends sweeping changes', 'https://www.theguardian.com/culture/2026/nov/14/arts-council-england-review-recommends-sweeping-changes'],
    ['nos-cultuur', 'Subsidieregeling kunstenaars onder review', 'https://nos.nl/artikel/2640000-subsidieregeling-kunstenaars-onder-review'],
    ['nu', 'Ophef over recensie', 'https://www.nu.nl/cultuur/6400000/ophef-over-recensie.html'],
    ['nos', 'Schrijver reageert woedend op vernietigende recensie', 'https://nos.nl/artikel/2640001-schrijver-reageert-woedend-op-vernietigende-recensie'],
    ['nos-cultuur', 'Ophef om vernietigende recensie van NRC', 'https://nos.nl/artikel/2640002-ophef-om-vernietigende-recensie'],
    ['volkskrant', 'Reisgids Chili ontploft na slechte recensie', 'https://www.volkskrant.nl/nieuws/reisgids-chili-ontploft-na-slechte-recensie~b1a2b3c4/'],
    ['nu', 'Boek krijgt lovende recensie', 'https://www.nu.nl/cultuur/6400001/boek-krijgt-lovende-recensie.html'],
    ['tweakers', 'EU start review van Microsoft-overname', 'https://tweakers.net/nieuws/240000/eu-start-review-van-microsoft-overname.html'],
    ['variety', 'Merger Faces FCC Review', 'https://variety.com/2026/biz/news/merger-faces-fcc-review-1236900102/'],
    ['bloomberg', 'Deal Under Review', 'https://www.bloomberg.com/news/articles/2026-11-14/deal-under-review'],
  ]
  const wrong = nieuws.filter(([source, title, url]) => isRecensie(art({ source, title, url }))).map(([s, t, u]) => `${s}: ${t} (${recensieMark(art({ source: s, title: t, url: u }))})`)
  assert.deepEqual(wrong, [])
  // De ondubbelzinnige vormen blijven bij elke bron tellen.
  assert.equal(recensieMark(art({ source: 'volkskrant', title: 'Recensie: Wicked', url: 'https://www.volkskrant.nl/cultuur-media/wicked~b5d6e7f8/' })), 'label')
  assert.equal(recensieMark(art({ source: 'parool', title: 'Een bitterzoete ode aan de stad', url: 'https://www.parool.nl/nieuws/recensie-the-only-living-pickpocket~b9a8b7c6/' })), 'slug')
  assert.equal(recensieMark(art({ source: 'demorgen', title: '‘Ebenezer’ toont gene herboren Johnny Depp ★★☆☆☆', url: 'https://www.demorgen.be/nieuws/ebenezer~bb0ebbb9/' })), 'sterren')
  assert.equal(recensieMark(art({ source: 'trouw', title: 'De pijn van een verkeersongeluk', url: 'https://www.trouw.nl/recensies/de-pijn~bbb8b913/' })), 'map')
  // "X recensie" achteraan alleen bij een cultuurbron of met een cultuurmap in de link.
  assert.equal(recensieMark(art({ source: 'nos-cultuur', title: 'The Batman: recensie', url: 'https://nos.nl/l/2640003' })), 'kop')
  assert.equal(recensieMark(art({ source: 'nos', title: 'The Batman: recensie', url: 'https://nos.nl/l/2640004' })), null)
})

// Vierde keuring, 14 november 2026: structureel, zonder nieuwe woorden. Een map telt alleen als hij ook een map is (een
// vaste recensiemap of een korte sectienaam, niet de slug voor Stereogums /news/), en pas na het nieuwswerkwoord en de
// toetsing in de kop. Noemt de kop zelf "review" of "recensie", dan beslist de kop: slug, midden en kopwoord tellen
// alleen als het woord achteraan het eerste deel staat of vooraan als label, en niet na een werkwoord.
test('de kop beslist: review midden in de kop, na een werkwoord, of een slug die geen map is, telt niet', () => {
  const nieuws = [
    ['stereogum', 'Olivia Rodrigo Responds To Negative Reviews Of New Album', 'https://stereogum.com/2518002/olivia-rodrigo-responds-negative-reviews/news/'],
    ['stereogum', 'Pitchfork Lays Off Staff, Ends Daily Album Reviews', 'https://stereogum.com/2518003/pitchfork-lays-off-staff-ends-daily-album-reviews/news/'],
    ['stereogum', 'Live Nation Faces DOJ Review', 'https://stereogum.com/2518004/live-nation-faces-doj-review/news/'],
    ['ars', 'Starship launch license still awaiting FAA review', 'https://arstechnica.com/space/2026/11/starship-launch-license-still-awaiting-faa-review/'],
    ['theverge', 'NHTSA closes Tesla Autopilot recall review', 'https://www.theverge.com/news/1030001/nhtsa-closes-tesla-autopilot-recall-review'],
    ['variety', 'Paramount Skydance Completes Post-Merger Workforce Review', 'https://variety.com/2026/biz/news/paramount-skydance-post-merger-workforce-review-1236900103/'],
    ['guardian-culture', 'National Trust publishes colonialism review', 'https://www.theguardian.com/culture/2026/nov/14/national-trust-publishes-colonialism-review'],
    ['eurogamer', 'UK government finally publishes loot box review', 'https://www.eurogamer.net/uk-government-finally-publishes-loot-box-review'],
    ['mediacourant', 'Publieke omroep krijgt review', 'https://www.mediacourant.nl/2026/11/publieke-omroep-krijgt-review/'],
    ['tweakers', 'Ontwikkelaars wachten weken op App Store-review', 'https://tweakers.net/nieuws/240001/ontwikkelaars-wachten-weken-op-app-store-review.html'],
    ['guardian-music', 'Glastonbury ticketing review after Ticketmaster chaos', 'https://www.theguardian.com/music/2026/nov/14/glastonbury-ticketing-review-after-ticketmaster-chaos'],
    ['wired', 'Inside the Pentagon’s Review of Anthropic', 'https://www.wired.com/story/pentagon-anthropic-review/'],
    ['nos-cultuur', 'Ophef rond Volkskrant-recensie van debuutroman', 'https://nos.nl/artikel/2640005-ophef-rond-volkskrant-recensie-van-debuutroman'],
  ]
  const wrong = nieuws.filter(([source, title, url]) => isRecensie(art({ source, title, url }))).map(([s, t, u]) => `${s}: ${t} (${recensieMark(art({ source: s, title: t, url: u }))})`)
  assert.deepEqual(wrong, [])
  // Echte recensies in dezelfde vormen blijven tellen.
  const echt = [
    ['ign', 'Monster Hunter Outlanders Review So Far', 'https://www.ign.com/articles/monster-hunter-outlanders-review', 'slug'],
    ['eurogamer', 'The Legend of Zelda: Ocarina of Time (2026) review', 'https://www.eurogamer.net/the-legend-of-zelda-ocarina-of-time-remake-review', 'slug'],
    ['guardian-music', 'Radie Peat: No Human Tongue Can Tell review – Lankum singer’s solo debut is the year’s best folk album', 'https://www.theguardian.com/music/2026/oct/30/radie-peat-no-human-tongue-can-tell-review', 'slug'],
    ['guardian-culture', 'Ten Lives by Mona Chalabi review – what if we were totally honest about our wealth?', 'https://www.theguardian.com/books/2026/nov/11/ten-lives-by-mona-chalabi-review-what-if-we-were-totally-honest-about-our-wealth', 'slug'],
    ['guardian-culture', 'Tyler Perry’s The Gospel of Christmas review – Netflix unloads more slapdash festive fare', 'https://www.theguardian.com/film/2026/nov/11/tyler-perry-gospel-of-christmas-review-netflix', 'slug'],
    ['parool', 'Recensie The Only Living Pickpocket in New York: een bitterzoete ode aan de stad van weleer', 'https://www.parool.nl/film/recensie-the-only-living-pickpocket-in-new-york~bde33587/', 'slug'],
    ['stereogum', '5 Thoughts On Olivia Rodrigo’s Unraveled Tour', 'https://stereogum.com/2516108/5-thoughts-on-olivia-rodrigos-unraveled-tour/reviews/concert-review/', 'map'],
    ['quietus', 'Coil – Gold is the Metal (with the Broadest Shoulders)', 'https://thequietus.com/quietus-reviews/coil/', 'map'],
    ['ign', 'Assassin’s Creed Shadows Review', 'https://www.ign.com/articles/assassins-creed-shadows-review', 'slug'],
  ]
  for (const [source, title, url, mark] of echt) assert.equal(recensieMark(art({ source, title, url })), mark, title)
})

// Vijfde keuring, 14 november 2026: "Review" of "Recensie" als heel laatste deel van de kop (na "|", "–" of " - ") is een
// label achteraan, net als een label vooraan. De Polygon- en GameSpot-recensies uit de ijkset van 4 november vielen
// anders weer door. "Year in Review" en "Review and Recap" zijn geen label.
test('label achteraan: "… | Review" telt, "Year in Review" en "Review and Recap" niet', () => {
  const echt = [
    ['polygon', 'The Legend of Zelda: Ocarina of Time Is Still Perfect on Switch 2 | Review', 'https://www.polygon.com/the-legend-of-zelda-ocarina-of-time-switch-2-review/'],
    ['gamespot', 'The Zelda: Ocarina Of Time Remake Shows That A Masterpiece Is Ageless | Review', 'https://www.gamespot.com/videos/the-zelda-ocarina-of-time-remake-shows-that-a-masterpiece-is-ageless-review/'],
    ['polygon', 'Hades 3 Is a Triumph | Review', 'https://www.polygon.com/hades-3-triumph/'],
    ['volkskrant', 'De nieuwe Wes Anderson is een feest – Recensie', 'https://www.volkskrant.nl/cultuur-media/de-nieuwe-wes-anderson~b1234567/'],
    ['theverge', 'Apple’s HomeView is my new favorite smart display - Review', 'https://www.theverge.com/tech/1030002/apple-homeview-smart-display'],
  ]
  for (const [source, title, url] of echt) {
    assert.equal(recensieMark(art({ source, title, url })), 'label', title)
    assert.equal(excludedFromEdition(art({ source, title, url })), true, title)
  }
  const niet = [
    ['theverge', 'Year in Review: the biggest tech stories of 2026', 'https://www.theverge.com/2026/12/20/year-in-review-tech'],
    ['theverge', 'The Verge’s 2026 Year in Review', 'https://www.theverge.com/2026/12/21/verge-2026'],
    ['ign', 'The Rings of Power Season 3, Episodes 1-4 Review and Recap', 'https://www.ign.com/articles/the-rings-of-power-season-3-episodes-1-4-recap'],
    ['nos', 'Kabinet start review van asielbeleid', 'https://nos.nl/artikel/2640006-kabinet-start-review-van-asielbeleid'],
    ['bbc', 'Ofcom review of BBC finds bias | Politics', 'https://www.bbc.com/news/articles/c0000001'],
    ['nos', 'Review', 'https://nos.nl/artikel/2640007-review'],
  ]
  for (const [source, title, url] of niet) assert.notEqual(recensieMark(art({ source, title, url })), 'label', title)
  assert.equal(recensieMark(art({ source: 'nos', title: 'Kabinet start review van asielbeleid', url: 'https://nos.nl/artikel/2640006-kabinet-start-review-van-asielbeleid' })), null)
})
