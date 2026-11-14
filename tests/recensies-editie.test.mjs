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
