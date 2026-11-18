// Luister verder, breder (besluit Alex, 18 november): "De podcast matching staat nog iets te scherp en conservatief
// afgesteld. Het moet breder." Gemist in de live proef van 18 november: NRC Vandaag "Luidt GTA VI het einde van een
// gametijdperk in?" (een hele aflevering over de game) bij de GTA-verhalen, omdat de kop een andere kant belichtte
// (reclame in China, een Xbox-deal), het model "zeker nee" gaf, of een vooruitblik op de release "voorbij" noemde. FD
// Dagkoers "GTA VI: niet alleen een paar 'geeks' vragen vrij" kwam als show met meer onderwerpen niet eens bij het oordeel.
// De GTA-gevallen staan hier als regressie; de regels zelf zijn generiek (geen namen in de code). Geen echte AI: de
// nep-client (tests/helpers/nep-oordeel.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { paren, vangnet, koppelMetOordeel, afkortingen, ja, strengJa, OORDEEL_SYSTEM, OORDEEL_KEY, OORDEEL_VORIGE } from '../netlify/lib/luister.mjs'
import { signatures } from '../netlify/lib/stories.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { nepClient, leesVraag, JA, VERDIEPING, NEE } from './helpers/nep-oordeel.mjs'

const NOW = Date.parse('2026-11-18T09:00:00Z')
const stuk = (id, source, sourceName, title, summary, at) => ({ id, kind: 'article', source, sourceName, title, summary, url: `https://${source}.example/${id}`, publishedAt: at })
const ITEMS = [
  // Het GTA-verhaal: de kop belicht een andere kant (reclame in China), de rest de release, de fans en een Xbox-deal.
  stuk('g1', 'nu', 'NU.nl', 'Maker promoot GTA VI in China ondanks missende verkooptoestemming', 'Rockstar maakt in China reclame voor GTA VI, terwijl het spel daar nog geen verkooptoestemming heeft.', '2026-11-18T07:30:00Z'),
  stuk('g2', 'nos', 'NOS', "Vrij nemen voor GTA VI: 'Het is gewoon leuk om de slechterik te spelen'", 'Duizenden gamers nemen vrij om donderdag meteen GTA VI te kunnen spelen.', '2026-11-17T15:00:00Z'),
  stuk('g3', 'guardian', 'The Guardian', 'Pretending to be in New Zealand, booking leave and buying consoles – the lengths fans are going to for GTA 6', 'Fans of Grand Theft Auto are going to great lengths ahead of the release of GTA 6.', '2026-11-17T18:00:00Z'),
  stuk('g4', 'eurogamer', 'Eurogamer', 'How To Play GTA 6 Early On Xbox Using This Trick', 'Rockstar fans can play GTA 6 a few hours early.', '2026-11-17T20:00:00Z'),
  stuk('g5', 'tweakers', 'Tweakers', 'Xbox sluit streamingdeal voor GTA 6', 'Microsoft streamt GTA 6 via Xbox Cloud Gaming.', '2026-11-18T06:00:00Z'),
  // Een ander verhaal.
  stuk('h1', 'nos', 'NOS', 'Elizabeth Holmes vraagt gratie aan bij president', 'De oprichter van Theranos zit een celstraf uit.', '2026-11-17T12:00:00Z'),
  stuk('h2', 'nyt', 'The New York Times', 'Elizabeth Holmes Seeks Pardon', 'The Theranos founder is serving a prison sentence.', '2026-11-17T13:00:00Z'),
]
const STORIES = [
  { id: 'sgta', leadId: 'g1', itemIds: ['g1', 'g2', 'g3', 'g4', 'g5'] },
  { id: 'sholmes', leadId: 'h1', itemIds: ['h1', 'h2'] },
]
const byId = new Map(ITEMS.map((i) => [i.id, i]))
const ep = (id, show, titel, samenvatting, at) => ({ id, show, titel, samenvatting, tekst: samenvatting, t: Date.parse(at), guid: id, duur: 1500, links: [], pagina: `https://pod.example/${id}` })
const NRC = ep('enrc', 'nrc-vandaag', 'Luidt GTA VI het einde van een gametijdperk in?', 'Donderdag verschijnt GTA VI, na jaren wachten. Het is de duurste game ooit gemaakt en de verwachtingen zijn torenhoog. Hoe kan een game zo’n hype veroorzaken, en wat betekent de lancering voor de rest van de game-industrie? Techredacteur Joost Vink legt het uit.', '2026-11-17T04:00:00Z')
const TIF = ep('etif', 'today-in-focus', 'Grand Theft Auto VI: the cultural event of the decade?', 'After years of delays, Grand Theft Auto VI is finally about to be released. Why has a video game become the cultural event of the decade? Keza MacDonald explains.', '2026-11-17T03:00:00Z')
const FD = ep('efd', 'fd-dagkoers', "GTA VI: niet alleen een paar 'geeks' vragen vrij", 'Werkgevers merken het: werknemers vragen massaal vrij voor de lancering van GTA VI. Wat betekent de game voor uitgever Take-Two en voor de economie?', '2026-11-18T04:30:00Z')
const FD_ANDERS = ep('efd2', 'fd-dagkoers', 'De rente, de huizenmarkt en een overname', 'Wat doet de ECB met de rente? Daarna de huizenmarkt, en tot slot de game-uitgever achter GTA VI.', '2026-11-18T05:00:00Z')
const HOLMES = ep('ehol', 'the-daily', 'The Rise and Fall of Elizabeth Holmes, Revisited', 'A new documentary looks back at Theranos and its founder, Elizabeth Holmes.', '2026-11-17T10:00:00Z')
const NA = ep('ena', 'nrc-vandaag', 'GTA VI: wat betekent de game voor Rockstar?', 'Deze aflevering namen we op voordat bekend werd dat Rockstar in China reclame maakt voor GTA VI. We praten over de game en de hype.', '2026-11-17T05:00:00Z')

const memKv = () => {
  const kv = new Map()
  return { kv, get: (k) => kv.get(k), update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) }
}
const opts = (episodes) => ({ stories: STORIES, byId, episodes, now: NOW, mainIds: MAIN_IDS })
const paar = (e, st = 'sgta') => paren(opts([e])).paren.find((c) => c.x.st.id === st && c.e.id === e.id)
const ronde = async (episodes, beslis) => {
  const { get, update } = memKv()
  const client = nepClient(beslis)
  const r = await koppelMetOordeel({ ...opts(episodes), client, get, update, maxAanroepen: Infinity, maxVragen: Infinity })
  return { r, gevraagd: client.calls.flatMap((c) => leesVraag(c.messages[0].content)) }
}
const ONZEKER = { ...VERDIEPING, zeker: 'nee' }

test('(a) NRC Vandaag bij een GTA-verhaal met een kop over een andere kant: kandidaat, en "verdieping, één onderwerp, zeker nee" koppelt', async () => {
  const c = paar(NRC)
  assert.ok(c, 'een kandidaat bij het GTA-verhaal')
  assert.equal(vangnet(c, NOW), null, 'geen harde uitsluiting')
  const { r, gevraagd } = await ronde([NRC], () => ONZEKER)
  const vraag = gevraagd.find((v) => v.titel === NRC.titel)
  assert.ok(vraag, 'De Redacteur krijgt het paar')
  assert.match(vraag.kop, /promoot GTA VI in China/, 'met de kop over de andere kant')
  const k = r.rows.koppelingen.find((k) => k.verhaal === 'sgta')
  assert.ok(k, 'het GTA-verhaal krijgt de aflevering')
  assert.equal(k.show, 'NRC Vandaag')
  assert.equal(k.soort, 'verdiepend')
  assert.ok(r.byStory.get('sgta'))
})

test('(a) de vraag oordeelt op het verhaal als geheel: een andere kant van dezelfde zaak is een verdieping', () => {
  assert.ok(!/De norm is streng/.test(OORDEEL_SYSTEM), 'de strenge norm is weg')
  assert.ok(!/als de kop over een andere kant van het verhaal gaat dan de aflevering/.test(OORDEEL_SYSTEM), 'een andere kant is niet meer "anders"')
  assert.ok(!/over een breder thema gaat/.test(OORDEEL_SYSTEM))
  assert.match(OORDEEL_SYSTEM, /Beoordeel op het verhaal als geheel \(alle stukken\), niet alleen op de kop/)
  assert.match(OORDEEL_SYSTEM, /ook als de kop over de reclame, de verkoop of een deal rond die game gaat/)
  assert.equal(OORDEEL_KEY, 'luister-oordeel-v8', 'de paren worden opnieuw beoordeeld')
})

test('(b) een echt andere kwestie koppelt niet: de Holmes-docu bij het GTA-verhaal, en alleen dezelfde naam bij een nee', async () => {
  assert.equal(paar(HOLMES), undefined, 'de Holmes-docu is geen kandidaat bij het GTA-verhaal')
  const { r } = await ronde([HOLMES, NRC], (v) => (v.titel === NRC.titel ? NEE : JA))
  assert.ok(!r.rows.koppelingen.some((k) => k.verhaal === 'sgta' && k.aflevering === HOLMES.titel))
  // Alleen een gedeelde naam in een andere zaak: het model zegt "anders", en dan niets, ook bij zeker nee.
  assert.ok(!r.rows.koppelingen.some((k) => k.verhaal === 'sgta'))
  assert.match(OORDEEL_SYSTEM, /"anders": de aflevering gaat over een andere kwestie\. Ook als alleen een persoon, partij, bedrijf, club, land of competitie overeenkomt/)
  const { r: r2 } = await ronde([NRC], () => ({ ...NEE, zeker: 'nee' }))
  assert.equal(r2.rows.koppelingen.length, 0)
})

test('(c) "opgenomen vóór dit nieuws" blijft hard weg, en een ja van het model verandert dat niet', async () => {
  const c = paar(NA)
  assert.ok(c)
  assert.match(vangnet(c, NOW) || '', /na de opname/)
  const { r, gevraagd } = await ronde([NA], () => JA)
  assert.ok(!gevraagd.some((v) => v.titel === NA.titel), 'niet eens gevraagd')
  assert.equal(r.rows.koppelingen.length, 0)
  // En zegt het model het zelf (opgenomenVoorDitNieuws ja), dan ook niet.
  const { r: r2 } = await ronde([NRC], () => ({ ...ONZEKER, opgenomenVoorDitNieuws: 'ja' }))
  assert.equal(r2.rows.koppelingen.length, 0)
})

test('(d) een show met meer onderwerpen en een naam van het verhaal in de titel gaat naar het oordeel; koppelt alleen bij één onderwerp', async () => {
  const c = paar(FD)
  assert.ok(c, 'FD Dagkoers is een kandidaat')
  assert.equal(c.o.titelNaam, true)
  assert.equal(vangnet(c, NOW), null)
  const ja1 = await ronde([FD], () => ONZEKER)
  const vraag = ja1.gevraagd.find((v) => v.titel === FD.titel)
  assert.ok(vraag)
  assert.match(vraag.show, /FD Dagkoers \(Het Financieele Dagblad\), show met meer onderwerpen/, 'de vraag zegt wat voor show het is')
  assert.match(OORDEEL_SYSTEM, /Een show met meer onderwerpen \(achter de show staat "show met meer onderwerpen"\)/)
  assert.equal(ja1.r.rows.koppelingen.find((k) => k.verhaal === 'sgta')?.show, 'FD Dagkoers')
  const nee = await ronde([FD], () => ({ ...ONZEKER, eenOnderwerp: 'nee' }))
  assert.equal(nee.r.rows.koppelingen.length, 0, 'eenOnderwerp nee: niets')
  // Zonder naam van het verhaal in de titel: geen kandidaat (en niet gevraagd).
  const anders = paren(opts([FD_ANDERS])).paren.find((x) => x.e.id === FD_ANDERS.id)
  assert.ok(!anders || vangnet(anders, NOW), 'geen naam in de titel: geen kandidaat of hard weg')
  const r3 = await ronde([FD_ANDERS], () => JA)
  assert.ok(!r3.gevraagd.some((v) => v.titel === FD_ANDERS.titel))
  assert.equal(r3.r.rows.koppelingen.length, 0)
})

test('(d) de volgorde blijft: NRC Vandaag (een bron die de lezer volgt) voor FD Dagkoers, die bij andere staat', async () => {
  const { r } = await ronde([NRC, FD], () => ONZEKER)
  const k = r.rows.koppelingen.find((k) => k.verhaal === 'sgta')
  assert.equal(k.show, 'NRC Vandaag')
  assert.deepEqual(k.andere, [`FD Dagkoers: ${FD.titel}`])
  assert.equal(r.rows.koppelingen.filter((k) => k.verhaal === 'sgta').length, 1, 'één aflevering per verhaal')
})

test('(e) een naam en zijn afkorting: "Grand Theft Auto VI" past bij "GTA 6" en "GTA VI"', async () => {
  const c = paar(TIF)
  assert.ok(c, 'Today in Focus is een kandidaat bij het GTA-verhaal')
  assert.deepEqual(c.o.names, ['gta'])
  const { r } = await ronde([TIF], () => ONZEKER)
  assert.equal(r.rows.koppelingen.find((k) => k.verhaal === 'sgta')?.show, 'Today in Focus')
  // Generiek: een reeks van drie eigen namen krijgt zijn beginletters, alleen als die afkorting in de ronde een naam is.
  const a = [{ id: 'x1', title: 'Grand Theft Auto VI komt eraan', summary: 'Gamers wachten op Grand Theft Auto VI.', publishedAt: '2026-11-17T10:00:00Z' }, { id: 'x2', title: 'Release van GTA 6 nadert', summary: 'De release van GTA 6 nadert.', publishedAt: '2026-11-17T11:00:00Z' }, { id: 'x3', title: 'Uitgever van GTA VI wint', summary: 'Een gamer zegt: GTA VI is groot.', publishedAt: '2026-11-17T12:00:00Z' }]
  const sig = afkortingen(signatures(a, [], { extended: true }))
  assert.ok(sig.get('x1').strong.has('gta'), 'Grand Theft Auto geeft gta')
  assert.ok(sig.get('x1').titleRuns.some((run) => run.includes('gta')), 'ook in de titel')
  assert.ok(sig.get('x2').strong.has('gta') && sig.get('x3').strong.has('gta'), 'GTA 6 en GTA VI zijn allebei gta')
  const los = afkortingen(signatures([a[0], { ...a[0], id: 'x4' }], [], { extended: true }))
  assert.ok(!los.get('x1').strong.has('gta'), 'geen afkorting die in de ronde nergens als naam staat')
})

test('zeker telt alleen nog streng: een verdieping zonder zeker is een ja, strengJa (BNR) vraagt zeker ja', () => {
  assert.equal(ja(ONZEKER), true)
  assert.equal(strengJa(ONZEKER), false)
  assert.equal(strengJa(VERDIEPING), true)
  // Van de vorige opslag (v7) geldt alleen een duidelijk ja; de rest wordt opnieuw gevraagd.
  assert.equal(OORDEEL_VORIGE.geldt(null, VERDIEPING), true)
  assert.equal(OORDEEL_VORIGE.geldt(null, ONZEKER), false)
  assert.equal(OORDEEL_VORIGE.geldt(null, { ...VERDIEPING, vooruitblikOpVoorbij: 'ja' }), false)
})

test('een vooruitblik op de release, die over de game zelf gaat, is een verdieping (vooruitblikOpVoorbij nee); een beantwoorde vraag niet', async () => {
  assert.match(OORDEEL_SYSTEM, /"ja" alleen als de vraag van de vooruitblik bij de kop al beantwoord is/)
  const { r } = await ronde([NRC], () => ({ ...ONZEKER, vooruitblikOpVoorbij: 'ja' }))
  assert.equal(r.rows.koppelingen.length, 0)
})
