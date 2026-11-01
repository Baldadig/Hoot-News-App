import { test } from 'node:test'
import assert from 'node:assert/strict'
import { desksOf, weight, primaryDesk } from '../netlify/lib/desks.mjs'
import { selectEdition } from '../netlify/lib/stories.mjs'
import { insertBubble } from '../netlify/lib/bubble.mjs'

const d = (o) => [...desksOf(o)].sort()

test('rubrieken uit kop, samenvatting, bron en rubriek van de bron', () => {
  assert.deepEqual(d({ source: 'nos', title: 'Lijnbus uitgebrand in Hoogersmilde, passagiers komen met de schrik vrij' }), ['binnenland'])
  assert.deepEqual(d({ source: 'volkskrant', title: 'Raad van State kraakt VVD-verbod', url: 'https://www.volkskrant.nl/politiek/x~b1/' }), ['binnenland'])
  assert.deepEqual(d({ source: 'nos', title: 'Toegang tot het Louvre geblokkeerd door studenten in Parijs' }), ['buitenland'])
  assert.deepEqual(d({ source: 'nyt', title: 'Midterm Elections: Who Is Winning the Race for Congress' }), ['vs'])
  assert.deepEqual(d({ source: 'nos', title: 'Israëlische politie pakt verdachten op voor aanvallen Westelijke Jordaanoever' }), ['middenoosten'])
  assert.deepEqual(d({ source: 'nyt', title: 'Trump Is Pushing Ukraine to Surrender to Russia, Zelensky Says' }), ['oekraine', 'vs'])
  assert.deepEqual(d({ source: 'volkskrant', title: 'Spookaardbeving jaagt Japanners stuipen op het lijf', url: 'https://www.volkskrant.nl/wetenschap/x~b2/' }), ['buitenland', 'wetenschap'])
})

test('van het moment: meer bronnen en verser weegt zwaarder', () => {
  const now = Date.parse('2026-10-19T10:00:00Z')
  assert.ok(weight({ sourceCount: 5, ownCount: 2, latestAt: '2026-10-19T09:00:00Z' }, now) > weight({ sourceCount: 5, ownCount: 2, latestAt: '2026-10-18T20:00:00Z' }, now))
  assert.ok(weight({ sourceCount: 2, ownCount: 1, latestAt: '2026-10-19T09:00:00Z' }, now) > weight({ sourceCount: 6, ownCount: 0, latestAt: '2026-10-19T09:00:00Z' }, now))
})

const NOW = Date.parse('2026-10-19T10:00:00Z')
const art = (id, source, title, hoursAgo = 1, extra = {}) => ({ id, kind: 'article', source, sourceName: source.toUpperCase(), title, summary: '', image: 'x', publishedAt: new Date(NOW - hoursAgo * 36e5).toISOString(), ...extra })
const MAIN = new Set(['nos', 'nrc', 'nyt', 'volkskrant'])

test('elke rubriek krijgt zijn belangrijkste verhaal, ook als één onderwerp het nieuws domineert', () => {
  // Vijf grote VS-verhalen (veel bronnen), en per andere rubriek één los bericht.
  const vs = [1, 2, 3, 4, 5].map((n) => art('vs' + n, 'nyt', `Trump and Congress clash over budget number ${n} in Washington`, n))
  const stories = vs.map((a, n) => ({ id: 's' + n, itemIds: [a.id], leadId: a.id, sourceCount: 6, ownCount: 1, latestAt: a.publishedAt }))
  const pool = [
    ...vs,
    art('nl', 'nos', 'Opnieuw fataal ongeluk bij veerpontoprit Dordrecht', 2),
    art('bl', 'nos', 'Albanese premier treedt niet af na gewelddadige protesten', 3),
    art('me', 'nos', 'Hezbollah en Israël wisselen opnieuw beschietingen uit bij Libanon', 4),
    art('ua', 'nrc', 'Russische drones treffen energiecentrale bij Kyiv', 5),
    art('wt', 'volkskrant', 'Onderzoekers vinden oudste fossiel van een zoogdier', 6),
  ]
  const e = selectEdition(stories, pool, { mainIds: MAIN, now: NOW })
  const desks = e.map((x) => x.desk).filter(Boolean)
  for (const want of ['binnenland', 'buitenland', 'vs', 'middenoosten', 'oekraine', 'wetenschap']) assert.ok(desks.includes(want), want)
  assert.equal(e[0].id, 's0') // het hoofdverhaal blijft het zwaarste nieuws
  assert.equal(new Set(e.map((x) => x.id)).size, e.length)
})

test('één verhaal van buiten je bubbel op plek 6; het minst belangrijke aanvullende verhaal maakt plaats', () => {
  const entries = [...'abcdefghij'].map((id, i) => ({ kind: 'item', id, desk: i < 6 ? 'x' : null }))
  const out = insertBubble(entries, { id: 'bub', terms: [{ term: 't', via: 'google' }] })
  assert.equal(out.length, 10)
  assert.equal(out[5].id, 'bub')
  assert.equal(out[5].desk, 'bubbel')
  assert.ok(!out.some((x) => x.id === 'j'))
  assert.equal(insertBubble(entries, null), entries)
})

test('een verhaal telt voor de rubriek waar het vooral over gaat', () => {
  const s = (...a) => new Set(a)
  assert.equal(primaryDesk([s('middenoosten', 'vs'), s('middenoosten'), s('middenoosten')]), 'middenoosten')
  assert.equal(primaryDesk([s('vs'), s('vs'), s('oekraine', 'vs')]), 'vs')
  assert.equal(primaryDesk([s('oekraine', 'vs')]), 'oekraine') // gelijk: de specifiekere
  assert.equal(primaryDesk([]), null)
  assert.equal(primaryDesk([s('wetenschap'), s(), s(), s(), s()]), null) // één losse vermelding van vijf
})

// ---- Binnenland is Nederland (feedback 31 oktober) ----
// Koppen uit de momentopname van 30 oktober (avond) en de live feed van 31 oktober.
import { isBinnenland, storyForeignOf, deskOfStory, NL_HOME, VL_HOME } from '../netlify/lib/desks.mjs'
import { SOURCES } from '../netlify/lib/sources.mjs'

test('Binnenland: de Nederlandse en Vlaamse bronnen in desks.mjs volgen de catalogus', () => {
  const want = SOURCES.filter((s) => s.cat === 'nl' || s.cat === 'regio' || s.id === 'fd').map((s) => s.id).sort()
  assert.deepEqual([...NL_HOME].sort(), want)
  assert.deepEqual([...VL_HOME].sort(), [...SOURCES.filter((s) => s.cat === 'vl').map((s) => s.id), 'sporza'].sort())
})

const BINNENLAND = [
  { source: 'nos', title: 'Premier Jetten wil weer doorpraten over belastingplan, maar niet over stikstof' },
  { source: 'volkskrant', title: 'Kabinet stelt stikstofwetten uit: minister Van Essen wil na overleg met boeren meer tijd' },
  { source: 'nos', title: 'Man rent op koning af bij werkbezoek in Ursem, beveiligers grijpen in' },
  { source: 'trouw', title: 'Meer rust? Graag. Maar op welke dag maakt veel organisaties niet uit', url: 'https://www.trouw.nl/binnenland/meer-rust' },
  { source: 'telegraaf', title: 'Egyptisch spionnennetwerk actief in Nederland, ’de lange arm van Cairo’ reikt zelfs tot Ajax', url: 'https://www.telegraaf.nl/binnenland/x' }, // sterk bezit wint van Cairo
  { source: 'nu', title: 'Tienduizenden huishoudens per brief gewaarschuwd voor tijgermug in de buurt' }, // nu ook NU.nl
  { source: 'nd', title: 'De SGP zet hoog in met rechts blok, maar kabinet hint op akkoord door het midden met CU en 50Plus' },
  { source: 'hln', title: 'Verwarde man stormt op koning Willem-Alexander af bij werkbezoek, beveiligers moeten ingrijpen' }, // Vlaamse bron, maar over Nederland
  { source: 'ed', title: 'Eindhoven gaat eigenaren verplichten leegstaande woningen te verhuren' },
  { source: 'fd', title: 'Minister Vincent Karremans: ‘Hinder van Schiphol blijft altijd’' },
  { source: 'guardian', title: 'Dutch coalition talks collapse as Wilders walks out' }, // buitenlandse bron, sterk bezit
  { source: 'ad', title: 'Paniek in onderwereld: politie valt massaal binnen op zoek naar Google Pixel-telefoons' }, // een bedrijfsnaam is geen plek
  { source: 'nos', title: 'Premier Jetten bij G20-top in Johannesburg' }, // randgeval, bewust: een Nederlandse speler in het buitenland
]
for (const it of BINNENLAND) test(`Binnenland: ${it.source} | ${it.title}`, () => assert.ok(desksOf(it).has('binnenland')))

// [bericht, opties, rubriek die het dan wel is (of null)]
const NIET = [
  [{ source: 'nrc', title: 'Heel Silicon Valley heeft belang bij slagen van beursgang Anthropic' }, {}, 'buitenland'],
  [{ source: 'nos', title: "Wat leren we van de grootste cryptoroof ooit? 'Hou je mond over wat je bezit'", summary: 'Een paar transacties van in totaal zo’n 18.000 bitcoin, van het grootste cryptoplatform ter wereld, Binance, naar een anonieme digitale portemonnee.' }, {}, 'buitenland'],
  [{ source: 'ad', title: 'Reisgids Chili ontploft na slechte recensie Nederlandse toerist', url: 'https://www.ad.nl/binnenland/reisgids-chili' }, {}, 'buitenland'], // "Nederlandse" is zwak bezit
  [{ source: 'standaard', title: 'Honderdduizenden Italianen komen op straat, maar protesten verlopen grotendeels vreedzaam', url: 'https://www.standaard.be/binnenland/x' }, {}, 'buitenland'],
  [{ source: 'demorgen', title: '‘Een inschattingsfout’: nederlaag tegen Bouchez blijft premier De Wever achtervolgen', url: 'https://www.demorgen.be/politiek/x' }, {}, 'buitenland'],
  [{ source: 'gva', title: 'Praktisch rijexamen in Vlaanderen vanaf januari enkel nog na theoretisch in Vlaanderen', url: 'https://www.gva.be/binnenland/x' }, {}, 'buitenland'],
  [{ source: 'hbvl', title: 'Verdachte in onderzoek naar dood van Brusselse politieman Nordine El Talbi vrijgelaten', url: 'https://www.hbvl.be/binnenland/x' }, {}, 'buitenland'],
  [{ source: 'gva', title: 'Arizona zocht al naar 42 miljard, maar heeft het budgettaire tij nog altijd niet gekeerd', url: 'https://www.gva.be/politiek/x' }, {}, 'buitenland'], // de Belgische coalitie "Arizona"
  [{ source: 'nieuwsblad', title: 'Lachen op een begrafenis is geen schande', url: 'https://www.nieuwsblad.be/binnenland/x' }, {}, 'buitenland'], // Vlaamse /binnenland/ is België
  [{ source: 'fd', title: 'Het Zuid-Afrikaanse Howick laat zien ook zonder het ANC te kunnen', url: 'https://fd.nl/politiek/x' }, {}, 'buitenland'],
  [{ source: 'fd', title: 'Lagarde stapt op, het gevecht om de opvolging kan beginnen', summary: 'De Europese Centrale Bank zoekt een nieuwe president.', url: 'https://fd.nl/politiek/x' }, {}, 'buitenland'],
  [{ source: 'volkskrant', title: 'Historische beursval: Alphabet verliest 500 miljard dollar aan beurswaarde', url: 'https://www.volkskrant.nl/buitenland/x' }, {}, 'buitenland'], // de bron zet het zelf onder Buitenland
  [{ source: 'nos', title: 'Pools hof oordeelt over onafhankelijkheid rechters' }, {}, 'buitenland'],
  [{ source: 'nos', title: 'Warschau en Kopenhagen sluiten grens voor vrachtverkeer' }, {}, 'buitenland'], // hoofdsteden ontbraken in de patronen
  [{ source: 'nu', title: 'Zeldzame vondst in Pompeï: 2.000 jaar oude kast vol persoonlijke bezittingen' }, {}, 'buitenland'],
  [{ source: 'volkskrant', title: 'Hoe Sarah J. Maas 75 miljoen boeken wist te verkopen', url: 'https://www.volkskrant.nl/cultuur-media/x' }, {}, null], // cultuur: eigen soort
  [{ source: 'nos', title: 'Ajax wint met 3-0 van PSV', topics: ['voetbal'] }, {}, null], // sport: eigen soort
  [{ source: 'nyt', title: 'Christa Pike Describes Pain and Isolation After Botched Execution' }, {}, null], // buitenlandse bron zonder Nederlands bezit
  [{ source: 'nos', title: 'Bedroefde reacties om dood Patrick Stewart: ‘Een man om van te houden’' }, { storyForeign: true }, null], // verhaal van vooral NYT, Variety en de Guardian
]
for (const [it, opts, alt] of NIET) {
  test(`geen Binnenland: ${it.source} | ${it.title}`, () => {
    const ds = desksOf(it, opts)
    assert.ok(!ds.has('binnenland'), [...ds].join(','))
    if (alt) assert.ok(ds.has(alt), `verwacht ${alt}, kreeg ${[...ds]}`)
    assert.equal(isBinnenland(it, opts), false)
  })
}

// Normen 1 november 2026: het land of de taal van een uitgever zegt niet waar een verhaal speelt.
// storyForeignOf telt daarom de plaats in de berichten zelf, niet het aandeel Nederlandse bronnen.
// De dood van Patrick Stewart is cultuur (eigen soort, geen plaats): geen Binnenland en ook geen
// internationale plek; een verhaal dat in de berichten buiten Nederland speelt, is wel buitenlands.
test('Binnenland: een verhaal dat in zijn berichten buiten Nederland speelt, is geen Binnenland; uitgeverland telt niet', () => {
  const items = [
    { source: 'nos', title: 'Bedroefde reacties om dood Patrick Stewart' },
    { source: 'nyt', title: 'Patrick Stewart, Star Trek captain, dies at 86' },
    { source: 'bbc', title: 'Sir Patrick Stewart dies aged 86' },
    { source: 'guardian', title: 'Patrick Stewart obituary' },
  ]
  assert.equal(storyForeignOf(items), false)
  assert.notEqual(deskOfStory(items), 'binnenland')
  assert.ok(!desksOf(items[0]).has('binnenland'), 'het NOS-stuk over de dood van een acteur is cultuur')
  const kremlin = [
    { source: 'nos', title: 'Laatste onafhankelijke Russische krant stopt onder druk van het Kremlin' },
    { source: 'nyt', title: 'Russian News Outlet That Defied Kremlin Will Shut Down' },
    { source: 'nrc', title: 'Novaja Gazeta stopt: Rusland legt kritische krant het zwijgen op' },
  ]
  assert.equal(storyForeignOf(kremlin), true) // ook met twee van de drie bronnen Nederlands
  assert.notEqual(deskOfStory(kremlin), 'binnenland')
})
test('Binnenland: een Nederlands verhaal uit drie Nederlandse bronnen blijft Binnenland', () => {
  const items = [
    { source: 'nd', title: 'De SGP zet hoog in met rechts blok' },
    { source: 'trouw', title: 'Na de zoveelste ronde gesprekken over het Belastingplan zijn alleen 50Plus en ChristenUnie tevreden' },
    { source: 'nu', title: "Rechts blok somber na 'stevig' gesprek met kabinet" },
  ]
  assert.equal(storyForeignOf(items), false)
  assert.equal(deskOfStory(items), 'binnenland')
})
test('Binnenland: namen die ook een gewoon woord zijn tellen alleen met hoofdletter', () => {
  assert.ok(!desksOf({ source: 'nyt', title: 'Clues leiden investigators to a cold case in Ohio' }).has('binnenland'))
  assert.ok(desksOf({ source: 'guardian', title: 'Students protest in Leiden over housing' }).has('binnenland'))
  assert.ok(!desksOf({ source: 'standaard', title: 'PVDA wil hogere lonen' }).has('binnenland')) // PVDA is Belgisch, PvdA Nederlands
  assert.ok(desksOf({ source: 'guardian', title: 'PvdA and GroenLinks merge' }).has('binnenland'))
})

// ---- Binnenland vraagt bewijs (keurpunt 31 oktober, live feed) ----
// Een Nederlandse bron maakt een stuk niet Nederlands. Koppen uit de live feed van 31 oktober.
const NIET_NL = [
  { source: 'volkskrant', section: 'Tech', url: 'https://www.volkskrant.nl/tech/liveblog-tech-musk-ai-meta-amazon~b1/', topics: ['ai', 'tech'], title: 'Apple haalt Nvidia in en is opnieuw meest waardevolle bedrijf ter wereld' },
  { source: 'nd', url: 'https://www.nd.nl/varia/varia/1337046/apple-haalt-nvidia', topics: ['economie', 'bedrijven', 'ai', 'tech'], title: 'Apple haalt Nvidia in als meest waardevolle bedrijf ter wereld' },
  { source: 'nrc', url: 'https://www.nrc.nl/nieuws/2026/10/30/met-ai-snijdt-google-a1', topics: ['ai', 'tech'], title: 'Met AI snijdt Google in zijn eigen vlees' },
  { source: 'nrc', url: 'https://www.nrc.nl/nieuws/2026/10/30/pangram-als-oldschool-a2', topics: ['ai'], title: 'Pangram als oldschool actieheld: de vijand verslaan maar ten koste van wat?' },
  { source: 'fd', url: 'https://fd.nl/financiele-markten/1617449/met-beursgang', topics: ['bedrijven', 'geld', 'ai'], title: 'Beursgang Anthropic geeft beleggers eindelijk een tastbare AI-barometer' },
  { source: 'nd', url: 'https://www.nd.nl/varia/varia/1337041/chipfabrikant-intel', topics: ['economie', 'bedrijven', 'tech'], title: 'Chipfabrikant Intel keldert op Wall Street na zwakke verwachting' },
  { source: 'nu', url: 'https://www.nu.nl/tech/6414689/telefoons-en-laptops.html', topics: [], title: 'Telefoons en laptops steeds duurder, tekort aan chips houdt tot zeker 2028 aan' }, // rubriek Tech
  { source: 'ad', url: 'https://www.ad.nl/voetbal/clarence-seedorf~a1/', topics: [], title: 'Clarence Seedorf pakt eerste overwinning met Corinthians in degradatiekraker' }, // sport
  // Twijfelgeval, vastgelegd: een Vlaamse bron over de Nederlandse én de Britse royals is geen Binnenland
  // (sterk bezit uit een buitenlandse bron telt alleen zonder buitenlandse plek of naam).
  { source: 'hbvl', url: 'https://www.hbvl.be/cnt/royals', title: 'ROYALS. Prinses Amalia kiest voor betaalbare mode en koning Charles toont danstalent' },
]
for (const it of NIET_NL) test(`geen Binnenland zonder bewijs: ${it.source} | ${it.title}`, () => assert.ok(!desksOf(it).has('binnenland'), [...desksOf(it)].join(',')))

const WEL_NL = [
  { source: 'nos', url: 'https://nos.nl/l/2637380', topics: [], title: "Zeehondencentrum stelt faillissement voorlopig uit na 'overweldigende steun'", summary: 'Het voormalige Zeehondencentrum Pieterburen vraagt voorlopig geen faillissement aan.' },
  { source: 'nos', url: 'https://nos.nl/l/2637364', topics: ['misdaad'], title: 'Advocaat getaserde bezorger: man is gewond en doet aangifte tegen agent' }, // onderwerp van Binnenland
  { source: 'bd', url: 'https://www.bd.nl/112-nieuws-meierijstad/brand-gemeld~a1/', topics: [], title: 'Brand gemeld bij bedrijf in Schijndel, brandweer treft alleen rook aan' }, // regionaal, 112
  { source: 'fd', url: 'https://fd.nl/economie/1617611/nederlandse-economie', topics: [], title: 'Nederlandse economie verrast met groei van 0,6% in derde kwartaal' }, // zwak bezit
  { source: 'hbvl', url: 'https://www.hbvl.be/cnt/royals2', title: 'Prinses Amalia viert haar verjaardag met een etentje' }, // Vlaamse bron, alleen Nederlands bezit
]
for (const it of WEL_NL) test(`Binnenland met bewijs: ${it.source} | ${it.title}`, () => assert.ok(desksOf(it).has('binnenland'), [...desksOf(it)].join(',')))

test('rubrieken: de Nobelprijs voor de Vrede is geen Wetenschap', () => {
  const it = { source: 'volkskrant', section: 'Buitenland', title: 'Laatste onafhankelijke Russische krant stopt onder druk van het Kremlin', summary: 'Novaja Gazeta was de krant van Dmitri Moeratov, die in 2021 de Nobelprijs voor de Vrede ontving.' }
  assert.ok(!desksOf(it).has('wetenschap'), [...desksOf(it)].join(','))
  assert.ok(desksOf({ source: 'nos', title: 'Nobelprijs voor de natuurkunde naar onderzoekers van kwantumchips' }).has('wetenschap'))
})

test('Binnenland: met een buitenlandse plek moet het Nederlandse bezit in de kop staan', () => {
  const iran = { source: 'volkskrant', section: 'Buitenland', url: 'https://www.volkskrant.nl/buitenland/iran-meldt~b7/', topics: ['middenoosten'], title: 'Iran meldt aanvallen in Straat van Hormuz, VAE zegt olielek gestopt te hebben', summary: 'KLM vliegt tot en met 27 maart niet van Amsterdam naar Dubai, meldt de luchtvaartmaatschappij.' }
  assert.ok(!desksOf(iran).has('binnenland'), [...desksOf(iran)].join(','))
  const ahold = { source: 'volkskrant', section: 'Economie', url: 'https://www.volkskrant.nl/economie/ahold~b5/', topics: [], title: 'Ahold blijft maar uitbreiden: dit keer in Tsjechië en Slowakije', summary: 'Ahold Delhaize, moederbedrijf van onder meer Albert Heijn, neemt honderden supermarkten van het Britse Tesco over.' }
  assert.ok(!desksOf(ahold).has('binnenland'), [...desksOf(ahold)].join(','))
})
test('rubrieken: "evolution" in een nieuwsbrief over crypto is geen Wetenschap', () => {
  const it = { source: 'atlantic', title: 'A Very Bad 24 Hours for Crypto', summary: 'This is an edition of Over/Under, a newsletter on the latest in prediction markets, gambling, and the evolution of everyday risk.' }
  assert.ok(!desksOf(it).has('wetenschap'), [...desksOf(it)].join(','))
})
