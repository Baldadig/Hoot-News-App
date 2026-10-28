// Wat Hoot volgt: de bronnen, hun merkkleur en de vaste grenzen.
export { BSKY_BRAND } from '../../shared/bluesky.mjs'

// De catalogus. Per bron:
// - `cat`: waar hij in de lijst staat (nl, regio, vl, int, economie, tech, games, wetenschap, sport, cultuur)
// - `lang`, `about` (één regel), `paid` (betaalmuur voor een deel), `color` (merkkleur voor het logo)
// - `pick`: vooraf aangevinkt in de onboarding (bij `for`: alleen als je die interesse kiest;
//   bij `forTopic`: alleen als je dat onderwerp volgt)
// - `base`: hoort bij de oorspronkelijke set; staat aan voor wie de onboarding (nog) niet deed.
//   Alle andere bronnen staan uit tot je ze kiest.
// - `music`: alleen in de Stroom (onderwerp Muziek), niet in de Editie
// - `bsky` / `x`: account voor een mooie merk-avatar
// Alle feeds gecontroleerd op 22 oktober 2026 (bereikbaar, actueel).
const S = (id, name, cat, lang, about, url, more = {}) => ({ id, name, cat, lang, about, urls: Array.isArray(url) ? url : [url], ...more })
export const SOURCES = [
  // Nederland
  S('nos', 'NOS', 'nl', 'nl', 'Het publieke nieuws: snel, breed en gratis.', ['https://feeds.nos.nl/nosnieuwsalgemeen', 'http://feeds.nos.nl/nosnieuwsalgemeen'], { pick: true, base: true, bsky: 'nos.nl', x: 'nos', color: '#B5121B' }),
  S('nu', 'NU.nl', 'nl', 'nl', 'Het snelste nieuws, de hele dag.', 'https://www.nu.nl/rss/Algemeen', { pick: true, color: '#0B4E8C' }),
  S('nrc', 'NRC', 'nl', 'nl', 'Achtergrond, analyse en onderzoek.', ['https://www.nrc.nl/rss/', 'https://www.nrc.nl/index.rss'], { paid: true, pick: true, base: true, bsky: 'nrc.nl', x: 'nrc', color: '#C20E1A' }),
  S('volkskrant', 'de Volkskrant', 'nl', 'nl', 'Nieuws, verhalen en opinie.', ['https://www.volkskrant.nl/voorpagina/rss.xml', 'https://www.volkskrant.nl/nieuws-achtergrond/rss.xml'], { paid: true, pick: true, base: true, bsky: 'volkskrant.nl', x: 'volkskrant', color: '#1481C4' }),
  S('trouw', 'Trouw', 'nl', 'nl', 'Nieuws met aandacht voor mens, natuur en zingeving.', 'https://www.trouw.nl/rss.xml', { paid: true, color: '#00A0DC' }),
  S('parool', 'Het Parool', 'nl', 'nl', 'Amsterdam en de wereld.', 'https://www.parool.nl/rss.xml', { paid: true, color: '#002F6C' }),
  S('ad', 'AD', 'nl', 'nl', 'Algemeen Dagblad: nieuws, sport en regio.', 'https://www.ad.nl/home/rss.xml', { paid: true, color: '#E30613' }),
  S('telegraaf', 'De Telegraaf', 'nl', 'nl', 'De grootste krant van Nederland.', 'https://www.telegraaf.nl/rss', { paid: true, color: '#1D3E73' }),
  S('rtl', 'RTL Nieuws', 'nl', 'nl', 'Nieuws van RTL.', 'https://www.rtlnieuws.nl/rss.xml', { color: '#2B2D7C' }),
  S('nd', 'Nederlands Dagblad', 'nl', 'nl', 'Christelijk dagblad, nieuws en duiding.', 'https://www.nd.nl/rss', { paid: true, color: '#E2001A' }),
  S('ftm', 'Follow the Money', 'nl', 'nl', 'Onderzoeksjournalistiek over geld en macht.', 'https://www.ftm.nl/feed', { paid: true, color: '#E52521' }),
  // Regionaal
  S('haarlemsdagblad', 'Haarlems Dagblad', 'regio', 'nl', 'Haarlem en omgeving.', 'https://www.haarlemsdagblad.nl/rss', { paid: true, color: '#00539F' }),
  S('nhd', 'Noordhollands Dagblad', 'regio', 'nl', 'Noord-Holland.', 'https://www.noordhollandsdagblad.nl/rss', { paid: true, color: '#00539F' }),
  S('leidschdagblad', 'Leidsch Dagblad', 'regio', 'nl', 'Leiden en omgeving.', 'https://www.leidschdagblad.nl/rss', { paid: true, color: '#00539F' }),
  S('dvhn', 'Dagblad van het Noorden', 'regio', 'nl', 'Groningen en Drenthe.', 'https://dvhn.nl/rss', { paid: true, color: '#E2001A' }),
  S('lc', 'Leeuwarder Courant', 'regio', 'nl', 'Friesland.', 'https://lc.nl/rss', { paid: true, color: '#004A99' }),
  S('limburger', 'De Limburger', 'regio', 'nl', 'Limburg.', 'https://www.limburger.nl/rss', { paid: true, color: '#E3000F' }),
  S('tubantia', 'Tubantia', 'regio', 'nl', 'Twente en de Achterhoek.', 'https://www.tubantia.nl/home/rss.xml', { paid: true, color: '#D7192D' }),
  S('stentor', 'De Stentor', 'regio', 'nl', 'Salland, Veluwe en de Kop van Overijssel.', 'https://www.destentor.nl/home/rss.xml', { paid: true, color: '#D7192D' }),
  S('gelderlander', 'De Gelderlander', 'regio', 'nl', 'Gelderland.', 'https://www.gelderlander.nl/home/rss.xml', { paid: true, color: '#D7192D' }),
  S('bd', 'Brabants Dagblad', 'regio', 'nl', 'Noordoost-Brabant.', 'https://www.bd.nl/home/rss.xml', { paid: true, color: '#D7192D' }),
  S('ed', 'Eindhovens Dagblad', 'regio', 'nl', 'Zuidoost-Brabant.', 'https://www.ed.nl/home/rss.xml', { paid: true, color: '#D7192D' }),
  S('bndestem', 'BN DeStem', 'regio', 'nl', 'West-Brabant.', 'https://www.bndestem.nl/home/rss.xml', { paid: true, color: '#D7192D' }),
  S('pzc', 'PZC', 'regio', 'nl', 'Zeeland.', 'https://www.pzc.nl/home/rss.xml', { paid: true, color: '#D7192D' }),
  // Vlaanderen
  S('vrt', 'VRT NWS', 'vl', 'nl', 'Het publieke nieuws van Vlaanderen.', 'https://www.vrt.be/vrtnws/nl.rss.articles.xml', { color: '#1A1A1A' }),
  S('standaard', 'De Standaard', 'vl', 'nl', 'Vlaamse kwaliteitskrant.', 'https://www.standaard.be/rss', { paid: true, color: '#E2001A' }),
  S('demorgen', 'De Morgen', 'vl', 'nl', 'Progressieve Vlaamse krant.', 'https://www.demorgen.be/rss.xml', { paid: true, color: '#1A1A1A' }),
  S('tijd', 'De Tijd', 'vl', 'nl', 'Economie en financiën uit Vlaanderen.', 'https://www.tijd.be/rss/nieuws.xml', { paid: true, color: '#F07D00' }),
  S('hln', 'Het Laatste Nieuws', 'vl', 'nl', 'De grootste krant van Vlaanderen.', 'https://www.hln.be/home/rss.xml', { paid: true, color: '#E30613' }),
  S('nieuwsblad', 'Het Nieuwsblad', 'vl', 'nl', 'Populaire Vlaamse krant.', 'https://www.nieuwsblad.be/rss', { paid: true, color: '#E2001A' }),
  S('gva', 'Gazet van Antwerpen', 'vl', 'nl', 'Antwerpen en de wereld.', 'https://www.gva.be/rss', { paid: true, color: '#E2001A' }),
  S('hbvl', 'Het Belang van Limburg', 'vl', 'nl', 'Belgisch-Limburg.', 'https://www.hbvl.be/rss', { paid: true, color: '#E2001A' }),
  // Internationaal (Engelstalig, met een wereldblik)
  S('nyt', 'NYT', 'int', 'en', 'The New York Times: wereldnieuws en Amerika.', 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', { paid: true, pick: true, for: ['politiek', 'wereld', 'economie'], base: true, bsky: 'nytimes.com', x: 'nytimes', color: '#1A1A1A' }),
  S('guardian', 'The Guardian', 'int', 'en', 'Brits, onafhankelijk, sterk in wereldnieuws.', 'https://www.theguardian.com/world/rss', { pick: true, for: ['wereld'], x: 'guardian', color: '#052962' }),
  S('bbc', 'BBC', 'int', 'en', 'BBC World: wereldnieuws uit Londen.', 'https://feeds.bbci.co.uk/news/world/rss.xml', { pick: true, for: ['wereld'], x: 'bbcworld', color: '#BB1919' }),
  S('economist', 'The Economist', 'int', 'en', 'Economie en wereldpolitiek, scherp samengevat.', 'https://www.economist.com/latest/rss.xml', { paid: true, pick: true, for: ['economie', 'wereld'], base: true, bsky: 'economist.com', x: 'TheEconomist', color: '#E3120B' }),
  S('atlantic', 'The Atlantic', 'int', 'en', 'Essays en lange verhalen over politiek en cultuur.', 'https://www.theatlantic.com/feed/all/', { paid: true, pick: true, for: ['politiek', 'cultuur'], base: true, bsky: 'theatlantic.com', x: 'TheAtlantic', color: '#1A1A1A' }),
  S('ft', 'Financial Times', 'int', 'en', 'Economie, markten en wereldpolitiek.', 'https://www.ft.com/rss/home', { paid: true, pick: true, for: ['economie'], x: 'FT', color: '#990F3D' }),
  S('newyorker', 'The New Yorker', 'int', 'en', 'Reportages, essays en cultuur.', 'https://www.newyorker.com/feed/news', { paid: true, color: '#1A1A1A' }),
  S('foreignpolicy', 'Foreign Policy', 'int', 'en', 'Analyse van internationale politiek.', 'https://foreignpolicy.com/feed/', { paid: true, pick: true, for: ['wereld'], color: '#C8102E' }),
  S('politico-eu', 'Politico Europe', 'int', 'en', 'Brussel en de Europese politiek.', 'https://www.politico.eu/feed/', { pick: true, for: ['politiek'], color: '#DC0A0A' }),
  S('politico', 'Politico', 'int', 'en', 'Amerikaanse politiek, van binnenuit.', ['https://rss.politico.com/politics-news.xml', 'https://www.politico.com/rss/politicopicks.xml'], { pick: true, for: ['politiek'], x: 'politico', color: '#E5202E' }),
  S('aljazeera', 'Al Jazeera', 'int', 'en', 'Wereldnieuws met een blik vanuit het Zuiden.', 'https://www.aljazeera.com/xml/rss/all.xml', { x: 'AJEnglish', color: '#FA9000' }),
  S('npr', 'NPR', 'int', 'en', 'De Amerikaanse publieke omroep.', 'https://feeds.npr.org/1001/rss.xml', { x: 'NPR', color: '#1A1A1A' }),
  S('dw', 'Deutsche Welle', 'int', 'en', 'Duits publiek nieuws, in het Engels.', 'https://rss.dw.com/rdf/rss-en-all', { color: '#05A0E6' }),
  S('lemonde', 'Le Monde in English', 'int', 'en', 'De Franse kwaliteitskrant, in het Engels.', 'https://www.lemonde.fr/en/rss/une.xml', { paid: true, color: '#1A1A1A' }),
  S('scmp', 'South China Morning Post', 'int', 'en', 'Azië en China, vanuit Hongkong.', 'https://www.scmp.com/rss/91/feed', { paid: true, color: '#FDB813' }),
  S('independent', 'The Independent', 'int', 'en', 'Brits, liberaal, wereldnieuws.', 'https://www.independent.co.uk/news/world/rss', { color: '#EC1A2E' }),
  S('telegraph', 'The Telegraph', 'int', 'en', 'Brits, conservatief, wereldnieuws.', 'https://www.telegraph.co.uk/rss.xml', { paid: true, color: '#1A1A1A' }),
  // Economie
  S('fd', 'Het Financieele Dagblad', 'economie', 'nl', 'Economie, bedrijven en financiën.', 'https://fd.nl/?rss', { paid: true, pick: true, for: ['economie'], color: '#F3A712' }),
  S('bloomberg', 'Bloomberg', 'economie', 'en', 'Markten en bedrijfsnieuws.', 'https://feeds.bloomberg.com/markets/news.rss', { paid: true, color: '#1A1A1A' }),
  // Tech
  S('theverge', 'The Verge', 'tech', 'en', 'Technologie, gadgets en internetcultuur.', 'https://www.theverge.com/rss/index.xml', { pick: true, for: ['tech'], base: true, bsky: 'theverge.com', x: 'verge', color: '#5200FF' }),
  S('wired', 'Wired', 'tech', 'en', 'Wat technologie met de wereld doet.', 'https://www.wired.com/feed/rss', { paid: true, pick: true, for: ['tech'], base: true, bsky: 'wired.com', x: 'wired', color: '#222222' }),
  S('tweakers', 'Tweakers', 'tech', 'nl', 'Nederlands technieuws en reviews.', 'https://tweakers.net/feeds/mixed.xml', { pick: true, for: ['tech'], bsky: 'tweakers.net', bskyImages: true, color: '#E5202C' }),
  S('ars', 'Ars Technica', 'tech', 'en', 'Diepgaand over technologie en wetenschap.', 'https://feeds.arstechnica.com/arstechnica/index', { pick: true, for: ['tech'], color: '#FF4E00' }),
  S('techcrunch', 'TechCrunch', 'tech', 'en', 'Start-ups en de techindustrie.', 'https://techcrunch.com/feed/', { color: '#0A9E01' }),
  S('mittr', 'MIT Technology Review', 'tech', 'en', 'Opkomende technologie, waaronder AI.', 'https://www.technologyreview.com/feed/', { paid: true, color: '#1A1A1A' }),
  // Games (onder Tech)
  S('ign', 'IGN', 'games', 'en', 'Het grootste gamesnieuws.', 'https://feeds.feedburner.com/ign/all', { pick: true, forTopic: 'games', topics: ['games'], color: '#BF1313' }),
  S('gamespot', 'GameSpot', 'games', 'en', 'Nieuws en recensies over games.', 'https://www.gamespot.com/feeds/mashup/', { pick: true, forTopic: 'games', topics: ['games'], color: '#1A1A1A' }),
  S('eurogamer', 'Eurogamer', 'games', 'en', 'Europees gamesnieuws en recensies.', 'https://www.eurogamer.net/feed', { pick: true, forTopic: 'games', topics: ['games'], color: '#0071CE' }),
  S('polygon', 'Polygon', 'games', 'en', 'Games, cultuur en recensies.', 'https://www.polygon.com/rss/index.xml', { pick: true, forTopic: 'games', topics: ['games'], color: '#FF0055' }),
  // Wetenschap
  S('quanta', 'Quanta Magazine', 'wetenschap', 'en', 'Wiskunde, natuurkunde en biologie, helder uitgelegd.', 'https://api.quantamagazine.org/feed/', { pick: true, for: ['wetenschap'], color: '#1A1A1A' }),
  S('sciam', 'Scientific American', 'wetenschap', 'en', 'Wetenschap voor iedereen.', 'http://rss.sciam.com/ScientificAmerican-Global', { paid: true, pick: true, for: ['wetenschap'], color: '#C8102E' }),
  S('nature', 'Nature', 'wetenschap', 'en', 'Het wetenschappelijk tijdschrift: nieuws en onderzoek.', 'https://www.nature.com/nature.rss', { paid: true, color: '#1A1A1A', keep: '/articles/d4' }), // alleen nieuws (d4…), geen onderzoekspapers (s4…) zonder intro
  S('carbonbrief', 'Carbon Brief', 'wetenschap', 'en', 'Klimaatwetenschap en -beleid.', 'https://www.carbonbrief.org/feed/', { forTopic: 'klimaat', pick: true, color: '#0F6E5A' }),
  // Sport
  S('nos-sport', 'NOS Sport', 'sport', 'nl', 'Al het sportnieuws van de NOS.', 'https://feeds.nos.nl/nossportalgemeen', { pick: true, for: ['sport'], color: '#B5121B' }),
  S('vi', 'Voetbal International', 'sport', 'nl', 'Het voetbalblad van Nederland.', 'https://www.vi.nl/rss', { pick: true, forTopic: 'voetbal', topics: ['voetbal'], color: '#D6001C' }),
  S('wielerflits', 'WielerFlits', 'sport', 'nl', 'Alles over wielrennen.', 'https://www.wielerflits.nl/feed/', { pick: true, forTopic: 'wielrennen', topics: ['wielrennen'], color: '#F28C00' }),
  S('sporza', 'Sporza', 'sport', 'nl', 'Sport van de VRT.', 'https://sporza.be/nl.rss.xml', { color: '#1A1A1A' }),
  S('bbc-sport', 'BBC Sport', 'sport', 'en', 'Internationaal sportnieuws.', 'https://feeds.bbci.co.uk/sport/rss.xml', { pick: true, for: ['sport'], color: '#FFD230' }),
  S('guardian-sport', 'The Guardian Sport', 'sport', 'en', 'Sport, met verhalen erachter.', 'https://www.theguardian.com/sport/rss', { color: '#052962' }),
  S('espn', 'ESPN', 'sport', 'en', 'Amerikaanse sport.', 'https://www.espn.com/espn/rss/news', { color: '#D00000' }),
  S('autosport', 'Autosport', 'sport', 'en', 'Formule 1 en autosport.', 'https://www.autosport.com/rss/f1/news/', { pick: true, forTopic: 'f1', topics: ['f1'], color: '#E10600' }),
  // Cultuur en muziek. Muziek: in de Stroom (onderwerp Muziek), niet in de Editie.
  S('nos-cultuur', 'NOS Cultuur & Media', 'cultuur', 'nl', 'Cultuur en media van de NOS.', 'https://feeds.nos.nl/nosnieuwscultuurenmedia', { pick: true, for: ['cultuur'], color: '#B5121B' }),
  S('3voor12', '3voor12', 'cultuur', 'nl', 'Muziek van de VPRO: nieuws, recensies, live.', 'https://3voor12.vpro.nl/rss.xml', { pick: true, forTopic: 'muziek', base: true, music: true, bsky: '3voor12.bsky.social', color: '#E5007E' }),
  S('oor', 'OOR', 'cultuur', 'nl', 'Popmuziek sinds 1971.', 'https://oor.nl/feed/', { pick: true, forTopic: 'muziek', base: true, music: true, color: '#111111' }),
  S('pitchfork', 'Pitchfork', 'cultuur', 'en', 'Muziekrecensies en nieuws.', 'https://pitchfork.com/feed/feed-news/rss', { music: true, color: '#1A1A1A' }),
  S('rollingstone', 'Rolling Stone', 'cultuur', 'en', 'Muziek, film en popcultuur.', 'https://www.rollingstone.com/feed/', { music: true, color: '#D32531' }),
  S('guardian-music', 'The Guardian Muziek', 'cultuur', 'en', 'Muzieknieuws en recensies.', 'https://www.theguardian.com/music/rss', { music: true, x: 'guardianmusic', color: '#052962' }),
  S('quietus', 'The Quietus', 'cultuur', 'en', 'Alternatieve en experimentele muziek.', 'https://thequietus.com/feed', { music: true, x: 'TheQuietus', color: '#1B1B1B' }),
  S('stereogum', 'Stereogum', 'cultuur', 'en', 'Indie en pop: nieuws en nieuwe nummers.', 'https://www.stereogum.com/feed/', { music: true, x: 'stereogum', color: '#E2231A' }),
  S('npr-music', 'NPR Music', 'cultuur', 'en', 'Tiny Desk en muziekverhalen.', 'https://feeds.npr.org/1039/rss.xml', { music: true, x: 'nprmusic', color: '#D62021' }),
  S('variety', 'Variety', 'cultuur', 'en', 'Film, series en de entertainmentindustrie.', 'https://variety.com/feed/', { forTopic: 'film', pick: true, topics: ['film'], color: '#1A1A1A' }),
  S('guardian-culture', 'The Guardian Cultuur', 'cultuur', 'en', 'Film, boeken, kunst en podium.', 'https://www.theguardian.com/culture/rss', { color: '#052962' }),
]
export const BRAND = Object.fromEntries(SOURCES.map((s) => [s.id, s.color]))

// Bluesky-accounts die Hoot voor iedereen ophaalt (openbare API, eigen posts van de afgelopen 48 uur).
// Leeg sinds okt. 2026: Bluesky is persoonlijk. Je voegt zelf mensen toe met hun @-naam, in de Stroom
// (app) of op de Bluesky-pagina (web); de standaardset (Aaron Rupar en de groep Oekraïne) is weg.
// `group`: samen te filteren in Bluesky. `optional`: staat uit tot je hem aanzet.
export const BLUESKY_AUTHORS = []
export const BLUESKY_HOURS = 48

// De oorspronkelijke set: die krijgt voorrang bij het samenstellen van de editie.
export const MAIN_IDS = new Set(SOURCES.filter((s) => s.base && !s.music).map((s) => s.id))
export const MUSIC_IDS = new Set(SOURCES.filter((s) => s.music).map((s) => s.id))
// Doet mee aan de editie: landelijk nieuws, internationaal, economie, tech en wetenschap.
// Niet: regionaal (veel gedeelde stukken), Vlaanderen, sport, games en cultuur.
export const EDITION_CATS = new Set(['nl', 'int', 'economie', 'tech', 'wetenschap'])

export const PER_SOURCE_LIMIT = 30 // per nieuwsbron
export const LIMIT_BY_CAT = { regio: 20, vl: 25, sport: 20, games: 15, cultuur: 15 }
export const UA = 'HootReader/0.4 (+https://hootnews.nl) news aggregator'
