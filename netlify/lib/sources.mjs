// Wat Hoot volgt: de bronnen, hun merkkleur en de vaste grenzen.
export { BSKY_BRAND } from '../../shared/bluesky.mjs'

// De catalogus. Per bron:
// - `cat`: waar hij in de lijst staat (nl, regio, vl, int, economie, tech, games, wetenschap, sport, cultuur)
// - `lang`, `about` (één regel), `paid` (betaalmuur voor een deel), `color` (merkkleur voor het logo)
//   `lang` is de hoofdtaal: een bericht in een andere taal (shared/lang.mjs; het Parool heeft
//   Engelstalige rubrieken) krijgt `offLang` en ziet alleen een lezer van die taal.
// - `pick`: vooraf aangevinkt in de onboarding (bij `for`: alleen als je die interesse kiest;
//   bij `forTopic`: alleen als je dat onderwerp volgt)
// - `base`: hoort bij de oorspronkelijke set; staat aan voor wie de onboarding (nog) niet deed.
//   Alle andere bronnen staan uit tot je ze kiest.
// - `music`: alleen in de Stroom (onderwerp Muziek), niet in de Editie
// - `opinie`: een opinieblad of -site (besluit Alex 13 november 2026): alles van deze bron is opinie
//   (shared/opinie.mjs). In de Stroom (tab Opinie), in Vergelijken met het label Opinie en in de Selectie,
//   nooit een plek in de Editie, en de bron telt niet mee in de drempels voor groot nieuws (coverageOf,
//   het aantal bronnen van een verhaal). Alleen voor een bron met een actieve, bijna dagelijkse bijdrage.
// - `publisher`: de uitgever als die meer bronnen in de catalogus heeft (shared/edition-policy.mjs, ALIAS):
//   samen één uitgever in De Redacteur, zoals de secties van de NOS. Elke bron blijft apart te kiezen.
// - `bsky` / `x`: account voor een mooie merk-avatar
// - `logo`: het officiele beeld van de site zelf (apple-touch-icon, webmanifest), als Bluesky en X geen
//   goed profielbeeld hebben; gaat voor `bsky` en `x`
// - `login`: de inlogpagina van de uitgever, als er een abonnement of lidmaatschap is (ook als de
//   meeste artikelen gratis zijn). De app opent hem in de lezer en toont of je er bent ingelogd.
//   Bij een inlog in een venster op de site zelf (geen eigen pagina): de voorpagina.
//   Gecontroleerd op 28 oktober 2026.
// Alle feeds gecontroleerd op 22 oktober 2026 (bereikbaar, actueel).
const S = (id, name, cat, lang, about, url, more = {}) => ({ id, name, cat, lang, about, urls: Array.isArray(url) ? url : [url], ...more })
// Het eigen logo van een bron (landing/bronnen/<id>.webp, 192 px, gebouwd naar /img/bronnen/). Absoluut, want de app
// gebruikt dezelfde url. De terugval van het merkbeeld: `logo`, Bluesky, dit eigen logo, favicon (nachttest 14 november:
// unavatar.io gaf 429, en dan toonde web en app een letter of een favicon).
export const OWN_LOGO_BASE = 'https://gethoot.app/img/bronnen/'
const own = (id) => OWN_LOGO_BASE + id + '.webp'
export const SOURCES = [
  // Nederland
  S('nos', 'NOS', 'nl', 'nl', 'Het publieke nieuws: snel, breed en gratis.', ['https://feeds.nos.nl/nosnieuwsalgemeen', 'http://feeds.nos.nl/nosnieuwsalgemeen'], { pick: true, base: true, logo: own('nos'), x: 'nos', color: '#B5121B' }),
  S('nu', 'NU.nl', 'nl', 'nl', 'Het snelste nieuws, de hele dag.', 'https://www.nu.nl/rss/Algemeen', { pick: true, color: '#0B4E8C' , bsky: 'nu.nl' }),
  S('nrc', 'NRC', 'nl', 'nl', 'Achtergrond, analyse en onderzoek.', 'https://www.nrc.nl/rss/', { login: 'https://www.nrc.nl/login/', paid: true, pick: true, base: true, bsky: 'nrc.nl', x: 'nrc', color: '#C20E1A' }),
  S('volkskrant', 'de Volkskrant', 'nl', 'nl', 'Nieuws, verhalen en opinie.', ['https://www.volkskrant.nl/voorpagina/rss.xml', 'https://www.volkskrant.nl/nieuws-achtergrond/rss.xml'], { login: 'https://www.volkskrant.nl/login/', paid: true, pick: true, base: true, bsky: 'volkskrant.nl', x: 'volkskrant', color: '#1481C4' }),
  S('trouw', 'Trouw', 'nl', 'nl', 'Nieuws met aandacht voor mens, natuur en zingeving.', 'https://www.trouw.nl/rss.xml', { login: 'https://www.trouw.nl/login/', paid: true, color: '#00A0DC' , bsky: 'trouw.nl' }),
  S('parool', 'Het Parool', 'nl', 'nl', 'Amsterdam en de wereld.', 'https://www.parool.nl/rss.xml', { login: 'https://www.parool.nl/login/', paid: true, color: '#002F6C' , bsky: 'parool.nl' }),
  S('ad', 'AD', 'nl', 'nl', 'Algemeen Dagblad: nieuws, sport en regio.', 'https://www.ad.nl/home/rss.xml', { login: 'https://www.ad.nl/login', paid: true, color: '#E30613' , bsky: 'ad.nl' }),
  S('telegraaf', 'De Telegraaf', 'nl', 'nl', 'De grootste krant van Nederland.', 'https://www.telegraaf.nl/rss', { login: 'https://www.telegraaf.nl/auth/login', paid: true, color: '#1D3E73' , bsky: 'telegraaf.nl' }),
  S('rtl', 'RTL Nieuws', 'nl', 'nl', 'Nieuws van RTL.', 'https://www.rtlnieuws.nl/rss.xml', { color: '#2B2D7C' , x: 'RTLnieuws' }),
  S('nd', 'Nederlands Dagblad', 'nl', 'nl', 'Christelijk dagblad, nieuws en duiding.', 'https://www.nd.nl/rss', { login: 'https://www.nd.nl/login', paid: true, color: '#E2001A' , bsky: 'nd.nl' }),
  S('ftm', 'Follow the Money', 'nl', 'nl', 'Onderzoeksjournalistiek over geld en macht.', 'https://www.ftm.nl/feed', { login: 'https://www.ftm.nl/inloggen', paid: true, color: '#E52521' , bsky: 'ftm.nl' }),
  // Erbij op 13 november 2026 (bronnen-onderzoek, TOEVOEGEN.md): nieuws en onderzoek. Feeds opgehaald op die dag.
  S('zembla', 'Zembla', 'nl', 'nl', 'Onderzoeksjournalistiek van BNNVARA.', 'https://www.bnnvara.nl/zembla/rss', { color: '#101010', bsky: 'zembla-bnnvara.bsky.social', x: 'ZEMBLA' }),
  S('argos', 'Argos', 'nl', 'nl', 'Onderzoeksjournalistiek van VPRO en HUMAN.', 'https://argos.vpro.nl/rss.xml', { color: '#131947', logo: 'https://argos.vpro.nl/favicons/web-app-manifest-512x512.png' }),
  S('rd', 'Reformatorisch Dagblad', 'nl', 'nl', 'Orthodox-christelijk dagblad: nieuws en duiding.', 'https://www.rd.nl/rss-feed', { login: 'https://www.rd.nl/login', paid: true, color: '#245BA7', bsky: 'rd.nl', x: 'refdag' }),
  S('caribischnetwerk', 'Caribisch Netwerk', 'nl', 'nl', 'Nieuws uit Caribisch Nederland, Aruba, Curaçao en Sint Maarten (NTR).', 'https://caribischnetwerk.ntr.nl/feed/', { color: '#25B8CC', x: 'CaribischNet' }),
  // Opinie (13 november 2026): in de Stroom en de Selectie, niet in de Editie (`opinie`). Allemaal minstens vijf
  // stukken per week, gemeten in de feed. Links Joop, De Groene, Vrij Nederland en Sargasso; rechts Wynia's Week, TPO
  // en GeenStijl; HP/De Tijd daartussen; Sociale Vraagstukken zonder partijkleur.
  S('joop', 'Joop', 'nl', 'nl', 'Opinie en commentaar van BNNVARA, progressief.', 'https://www.joop.nl/feed', { opinie: true, color: '#FC3E28', bsky: 'joop.nl' }),
  S('groene', 'De Groene Amsterdammer', 'nl', 'nl', 'Opinieweekblad met essays, analyses en reportages, links.', 'https://www.groene.nl/rss.xml', { opinie: true, login: 'https://www.groene.nl/', paid: true, color: '#E10005', bsky: 'groene.nl', x: 'DeGroene', logo: own('groene') }), // overal een afgesneden woordmerk; het eigen logo heeft het hele (landing/bronlogos.mjs)
  S('vn', 'Vrij Nederland', 'nl', 'nl', 'Opinieblad met essays en reportages, links-liberaal.', 'https://www.vn.nl/feed/', { opinie: true, login: 'https://www.vn.nl/inloggen/', paid: true, color: '#E20006', bsky: 'vn.nl', x: 'vrij_nederland' }),
  S('sargasso', 'Sargasso', 'nl', 'nl', 'Groepsblog over politiek en beleid, links en genuanceerd.', 'https://sargasso.nl/feed/', { opinie: true, color: '#65C26A', bsky: 'sargassoblog.bsky.social' }),
  S('hpdetijd', 'HP/De Tijd', 'nl', 'nl', 'Opinieblad: eigenzinnig, liberaal en kritisch.', 'https://www.hpdetijd.nl/rss', { opinie: true, login: 'https://www.hpdetijd.nl/login', paid: true, color: '#E40815', bsky: 'hpdetijd.bsky.social', x: 'HPdeTijdNL' }),
  S('wyniasweek', "Wynia's Week", 'nl', 'nl', 'Opinie en analyse, rechts-liberaal.', 'https://www.wyniasweek.nl/feed/', { opinie: true, color: '#EC2027', x: 'wyniasweek' }),
  S('tpo', 'TPO', 'nl', 'nl', 'Opinie en commentaar, conservatief.', 'https://tpo.nl/feed/', { opinie: true, login: 'https://tpo.nl/inloggen/', paid: true, color: '#0F4166', logo: 'https://tpo.nl/wp-content/uploads/2025/10/cropped-TPO_Logobox_New-02-192x192.jpg' }),
  S('geenstijl', 'GeenStijl', 'nl', 'nl', 'Provocerend weblog, rechts-populistisch.', 'https://www.geenstijl.nl/feeds/recent.atom', { opinie: true, color: '#ED2690', bsky: 'geenstijlhq.bsky.social' }),
  S('socialevraagstukken', 'Sociale Vraagstukken', 'nl', 'nl', 'Wetenschappers over de samenleving, zonder partijkleur.', 'https://www.socialevraagstukken.nl/feed/', { opinie: true, color: '#E63400', logo: 'https://socialevraagstukken.b-cdn.net/wp-content/uploads/cropped-favicon-192x192.png' }),
  // Regionaal
  S('haarlemsdagblad', 'Haarlems Dagblad', 'regio', 'nl', 'Haarlem en omgeving.', 'https://www.haarlemsdagblad.nl/rss', { login: 'https://www.haarlemsdagblad.nl/auth/login', paid: true, color: '#00539F' , bsky: 'haarlemsdagblad.nl' }),
  S('nhd', 'Noordhollands Dagblad', 'regio', 'nl', 'Noord-Holland.', 'https://www.noordhollandsdagblad.nl/rss', { login: 'https://www.noordhollandsdagblad.nl/auth/login', paid: true, color: '#00539F' , bsky: 'noordhollandsdagblad.nl' }),
  S('leidschdagblad', 'Leidsch Dagblad', 'regio', 'nl', 'Leiden en omgeving.', 'https://www.leidschdagblad.nl/rss', { login: 'https://www.leidschdagblad.nl/auth/login', paid: true, color: '#00539F' , bsky: 'leidschdagblad.nl' }),
  S('dvhn', 'Dagblad van het Noorden', 'regio', 'nl', 'Groningen en Drenthe.', 'https://dvhn.nl/rss', { login: 'https://dvhn.nl/auth/login', paid: true, color: '#E2001A' , bsky: 'dvhn.nl' }),
  S('lc', 'Leeuwarder Courant', 'regio', 'nl', 'Friesland.', 'https://lc.nl/rss', { login: 'https://lc.nl/auth/login', paid: true, color: '#004A99' , bsky: 'lc.nl' }),
  S('limburger', 'De Limburger', 'regio', 'nl', 'Limburg.', 'https://www.limburger.nl/rss', { login: 'https://www.limburger.nl/auth/login', paid: true, color: '#E3000F' }),
  S('tubantia', 'Tubantia', 'regio', 'nl', 'Twente en de Achterhoek.', 'https://www.tubantia.nl/home/rss.xml', { login: 'https://www.tubantia.nl/login', paid: true, color: '#D7192D' }),
  S('stentor', 'De Stentor', 'regio', 'nl', 'Salland, Veluwe en de Kop van Overijssel.', 'https://www.destentor.nl/home/rss.xml', { login: 'https://www.destentor.nl/login', paid: true, color: '#D7192D' }),
  S('gelderlander', 'De Gelderlander', 'regio', 'nl', 'Gelderland.', 'https://www.gelderlander.nl/home/rss.xml', { login: 'https://www.gelderlander.nl/login', paid: true, color: '#D7192D' , bsky: 'gelderlander.nl' }),
  S('bd', 'Brabants Dagblad', 'regio', 'nl', 'Noordoost-Brabant.', 'https://www.bd.nl/home/rss.xml', { login: 'https://www.bd.nl/login', paid: true, color: '#D7192D' }),
  S('ed', 'Eindhovens Dagblad', 'regio', 'nl', 'Zuidoost-Brabant.', 'https://www.ed.nl/home/rss.xml', { login: 'https://www.ed.nl/login', paid: true, color: '#D7192D' }),
  S('bndestem', 'BN DeStem', 'regio', 'nl', 'West-Brabant.', 'https://www.bndestem.nl/home/rss.xml', { login: 'https://www.bndestem.nl/login', paid: true, color: '#D7192D' }),
  S('pzc', 'PZC', 'regio', 'nl', 'Zeeland.', 'https://www.pzc.nl/home/rss.xml', { login: 'https://www.pzc.nl/login', paid: true, color: '#D7192D' }),
  // De regionale omroepen (13 november 2026): per provincie te kiezen, in De Redacteur samen één uitgever
  // (`publisher`). Omroep Flevoland heeft geen feed.
  S('nhnieuws', 'NH Nieuws', 'regio', 'nl', 'Noord-Holland, de regionale omroep.', 'https://rss.nhnieuws.nl/rss', { publisher: 'regionale-omroep', color: '#0A2EAF', bsky: 'nhnieuws.nl' }),
  S('omroepwest', 'Omroep West', 'regio', 'nl', 'Den Haag, Leiden en omgeving, de regionale omroep.', 'https://www.omroepwest.nl/rss/index.xml', { publisher: 'regionale-omroep', color: '#234F9D', bsky: 'omroepwest.nl' }),
  S('rijnmond', 'Rijnmond', 'regio', 'nl', 'Rotterdam en omgeving, de regionale omroep.', 'https://www.rijnmond.nl/rss/index.xml', { publisher: 'regionale-omroep', color: '#026BAD', bsky: 'rtvrijnmond.bsky.social' }),
  S('rtvutrecht', 'RTV Utrecht', 'regio', 'nl', 'Utrecht, de regionale omroep.', 'https://www.rtvutrecht.nl/rss/index.xml', { publisher: 'regionale-omroep', color: '#EB3758', bsky: 'rtvutrecht.nl' }),
  S('omroepgelderland', 'Omroep Gelderland', 'regio', 'nl', 'Gelderland, de regionale omroep.', 'https://www.omroepgelderland.nl/rss', { publisher: 'regionale-omroep', color: '#00BA45', bsky: 'gld.nl' }),
  S('rtvoost', 'RTV Oost', 'regio', 'nl', 'Overijssel, de regionale omroep.', 'https://www.rtvoost.nl/rss/index.xml', { publisher: 'regionale-omroep', color: '#1362FF', bsky: 'oost.nl' }),
  S('rtvnoord', 'RTV Noord', 'regio', 'nl', 'Groningen, de regionale omroep.', 'https://www.rtvnoord.nl/rss/index.xml', { publisher: 'regionale-omroep', color: '#194796', bsky: 'rtvnoord.nl' }),
  S('rtvdrenthe', 'RTV Drenthe', 'regio', 'nl', 'Drenthe, de regionale omroep.', 'https://www.rtvdrenthe.nl/rss/index.xml', { publisher: 'regionale-omroep', color: '#E50135', bsky: 'rtvdrenthe.bsky.social' }),
  S('omropfryslan', 'Omrop Fryslân', 'regio', 'nl', 'Friesland, de regionale omroep.', 'https://www.omropfryslan.nl/rss/index.xml', { publisher: 'regionale-omroep', color: '#0256A6', bsky: 'omropfryslan.nl' }),
  S('omroepbrabant', 'Omroep Brabant', 'regio', 'nl', 'Noord-Brabant, de regionale omroep.', 'https://www.omroepbrabant.nl/rss', { publisher: 'regionale-omroep', color: '#F9BE02', bsky: 'omroepbrabant.nl' }),
  S('l1', 'L1', 'regio', 'nl', 'Limburg, de regionale omroep.', 'https://www.l1.nl/rss/index.xml', { publisher: 'regionale-omroep', color: '#0F4B75', bsky: 'l1nieuws.nl' }),
  S('omroepzeeland', 'Omroep Zeeland', 'regio', 'nl', 'Zeeland, de regionale omroep.', 'https://www.omroepzeeland.nl/rss/index.xml', { publisher: 'regionale-omroep', color: '#0399CC', bsky: 'omroepzeeland.nl' }),
  // Lokaal, onafhankelijk (13 november 2026).
  S('duic', 'DUIC', 'regio', 'nl', 'Utrecht: lokaal nieuws, onafhankelijk.', 'https://www.duic.nl/rss', { color: '#E40715', x: 'duicnl' }),
  S('versbeton', 'Vers Beton', 'regio', 'nl', 'Rotterdam: verdiepende verhalen over de stad.', 'https://www.versbeton.nl/feed/', { color: '#0103E6', bsky: 'versbeton.nl' }),
  // Vlaanderen
  S('vrt', 'VRT NWS', 'vl', 'nl', 'Het publieke nieuws van Vlaanderen.', 'https://www.vrt.be/vrtnws/nl.rss.articles.xml', { color: '#1A1A1A' , bsky: 'vrtnws.be' }),
  S('standaard', 'De Standaard', 'vl', 'nl', 'Vlaamse kwaliteitskrant.', 'https://www.standaard.be/rss', { login: 'https://www.standaard.be/auth/login', paid: true, color: '#E2001A' , bsky: 'standaard.be' }),
  S('demorgen', 'De Morgen', 'vl', 'nl', 'Progressieve Vlaamse krant.', 'https://www.demorgen.be/rss.xml', { login: 'https://www.demorgen.be/login/', paid: true, color: '#1A1A1A' , bsky: 'demorgen.be' }),
  S('tijd', 'De Tijd', 'vl', 'nl', 'Economie en financiën uit Vlaanderen.', 'https://www.tijd.be/rss/nieuws.xml', { login: 'https://www.tijd.be/login.html', paid: true, color: '#F07D00' , bsky: 'tijd.be' }),
  S('hln', 'Het Laatste Nieuws', 'vl', 'nl', 'De grootste krant van Vlaanderen.', 'https://www.hln.be/home/rss.xml', { login: 'https://www.hln.be/login', paid: true, color: '#E30613' , bsky: 'hln.be' }),
  S('nieuwsblad', 'Het Nieuwsblad', 'vl', 'nl', 'Populaire Vlaamse krant.', 'https://www.nieuwsblad.be/rss', { login: 'https://www.nieuwsblad.be/auth/login', paid: true, color: '#E2001A' }),
  S('gva', 'Gazet van Antwerpen', 'vl', 'nl', 'Antwerpen en de wereld.', 'https://www.gva.be/rss', { login: 'https://www.gva.be/auth/login', paid: true, color: '#E2001A' }),
  S('hbvl', 'Het Belang van Limburg', 'vl', 'nl', 'Belgisch-Limburg.', 'https://www.hbvl.be/rss', { login: 'https://www.hbvl.be/auth/login', paid: true, color: '#E2001A' }),
  // Erbij op 13 november 2026.
  S('apache', 'Apache', 'vl', 'nl', 'Onderzoeksjournalistiek uit Vlaanderen.', 'https://www.apache.be/feed/artikels', { login: 'https://www.apache.be/login', paid: true, color: '#1A1A1A', bsky: 'apache.be' }),
  S('bruzz', 'BRUZZ', 'vl', 'nl', 'Brussel: nieuws, cultuur en uitgaan.', 'https://www.bruzz.be/rss.xml', { color: '#FE0031', bsky: 'bruzzbe.bsky.social', x: 'bruzzbe' }),
  S('humo', 'Humo', 'vl', 'nl', 'Vlaams weekblad: interviews, cultuur en tv.', 'https://www.humo.be/rss.xml', { login: 'https://www.humo.be/login', paid: true, color: '#E3010E', x: 'humo' }),
  // Internationaal (Engelstalig, met een wereldblik)
  S('nyt', 'NYT', 'int', 'en', 'The New York Times: wereldnieuws en Amerika.', 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', { login: 'https://myaccount.nytimes.com/auth/login', paid: true, pick: true, for: ['politiek', 'wereld', 'economie'], base: true, bsky: 'nytimes.com', x: 'nytimes', color: '#1A1A1A' }),
  S('guardian', 'The Guardian', 'int', 'en', 'Brits, onafhankelijk, sterk in wereldnieuws.', 'https://www.theguardian.com/world/rss', { login: 'https://profile.theguardian.com/signin', pick: true, for: ['wereld'], x: 'guardian', color: '#052962' }),
  S('bbc', 'BBC', 'int', 'en', 'BBC World: wereldnieuws uit Londen.', 'https://feeds.bbci.co.uk/news/world/rss.xml', { pick: true, for: ['wereld'], x: 'bbcworld', color: '#BB1919' }),
  S('economist', 'The Economist', 'int', 'en', 'Economie en wereldpolitiek, scherp samengevat.', 'https://www.economist.com/latest/rss.xml', { login: 'https://www.economist.com/api/auth/login', paid: true, pick: true, for: ['economie', 'wereld'], base: true, bsky: 'economist.com', x: 'TheEconomist', color: '#E3120B' }),
  S('atlantic', 'The Atlantic', 'int', 'en', 'Essays en lange verhalen over politiek en cultuur.', 'https://www.theatlantic.com/feed/all/', { login: 'https://accounts.theatlantic.com/login/', paid: true, pick: true, for: ['politiek', 'cultuur'], base: true, bsky: 'theatlantic.com', x: 'TheAtlantic', color: '#1A1A1A' }),
  S('ft', 'Financial Times', 'int', 'en', 'Economie, markten en wereldpolitiek.', 'https://www.ft.com/rss/home', { login: 'https://accounts.ft.com/login', paid: true, pick: true, for: ['economie'], x: 'FT', color: '#990F3D' }),
  S('newyorker', 'The New Yorker', 'int', 'en', 'Reportages, essays en cultuur.', 'https://www.newyorker.com/feed/news', { login: 'https://www.newyorker.com/auth/initiate', paid: true, color: '#1A1A1A' , bsky: 'newyorker.com' }),
  S('foreignpolicy', 'Foreign Policy', 'int', 'en', 'Analyse van internationale politiek.', 'https://foreignpolicy.com/feed/', { login: 'https://foreignpolicy.com/login/', paid: true, pick: true, for: ['wereld'], color: '#C8102E' , bsky: 'foreignpolicy.com' }),
  S('politico-eu', 'Politico Europe', 'int', 'en', 'Brussel en de Europese politiek.', 'https://www.politico.eu/feed/', { pick: true, for: ['politiek'], color: '#DC0A0A' , bsky: 'politico.eu' }),
  S('politico', 'Politico', 'int', 'en', 'Amerikaanse politiek, van binnenuit.', 'https://rss.politico.com/politics-news.xml', { pick: true, for: ['politiek'], x: 'politico', color: '#E5202E' }),
  S('aljazeera', 'Al Jazeera', 'int', 'en', 'Wereldnieuws met een blik vanuit het Zuiden.', 'https://www.aljazeera.com/xml/rss/all.xml', { x: 'AJEnglish', color: '#FA9000' }),
  S('npr', 'NPR', 'int', 'en', 'De Amerikaanse publieke omroep.', 'https://feeds.npr.org/1001/rss.xml', { x: 'NPR', color: '#1A1A1A' }),
  S('dw', 'Deutsche Welle', 'int', 'en', 'Duits publiek nieuws, in het Engels.', 'https://rss.dw.com/rdf/rss-en-all', { color: '#05A0E6' , x: 'dwnews' }),
  S('lemonde', 'Le Monde in English', 'int', 'en', 'De Franse kwaliteitskrant, in het Engels.', 'https://www.lemonde.fr/en/rss/une.xml', { login: 'https://secure.lemonde.fr/sfuser/connexion', paid: true, color: '#1A1A1A' , bsky: 'lemonde.fr' }),
  S('scmp', 'South China Morning Post', 'int', 'en', 'Azië en China, vanuit Hongkong.', 'https://www.scmp.com/rss/91/feed', { login: 'https://account.scmp.com/login', paid: true, color: '#FDB813' , bsky: 'scmp.com' }),
  S('independent', 'The Independent', 'int', 'en', 'Brits, liberaal, wereldnieuws.', 'https://www.independent.co.uk/news/world/rss', { login: 'https://www.independent.co.uk/login', color: '#EC1A2E' , bsky: 'the-independent.com' }),
  S('telegraph', 'The Telegraph', 'int', 'en', 'Brits, conservatief, wereldnieuws.', 'https://www.telegraph.co.uk/rss.xml', { login: 'https://secure.telegraph.co.uk/customer/secure/login/', paid: true, color: '#1A1A1A' , bsky: 'telegraph.co.uk' }),
  // Erbij op 14 november 2026 (Hoot-design/bronnen-internationaal-2026-11-14, ONDERZOEK.md): meer breedte in het
  // internationale nieuws. Alleen officiele feeds van de uitgever, gemeten met de eigen UA op die dag. Geen pick of base:
  // voor niemand ongevraagd aan. Een inlogpagina alleen als die met de eigen UA antwoordt (National Review niet).
  // Geen Amerikaanse nieuwsbronnen erbij (keuring 14 november): de server telt per verhaal alle uitgevers uit de catalogus,
  // en met meer Amerikaanse nieuwsuitgevers haalt een puur binnenlands Amerikaans verhaal in zijn eentje de drempels voor
  // groot nieuws en de opening. Die volgen pas met een regel die de telling per land begrenst.
  // Europa: publieke zenders in het Engels. France 24 en RFI zijn één uitgever (France Médias Monde).
  S('france24', 'France 24', 'int', 'en', 'Frans publiek wereldnieuws, in het Engels.', 'https://www.france24.com/en/rss', { publisher: 'france-medias-monde', color: '#00A3E0', bsky: 'france24.com', x: 'France24_en' }),
  S('rfi', 'RFI English', 'int', 'en', 'Franse publieke radio, sterk in Afrika.', 'https://www.rfi.fr/en/rss', { publisher: 'france-medias-monde', color: '#D7001D', bsky: 'rfi.fr', x: 'RFI_En' }),
  S('euronews', 'Euronews', 'int', 'en', 'Europees nieuws vanuit Europa.', 'https://www.euronews.com/rss?format=mrss&level=theme&name=news', { color: '#027DF0', bsky: 'euronews.com', x: 'euronews' }),
  // De wereld van binnenuit: Australië, Oekraïne, en Israël met twee stemmen.
  S('abc-au', 'ABC News (Australië)', 'int', 'en', 'De publieke omroep van Australië.', 'https://www.abc.net.au/news/feed/51120/rss.xml', { color: '#1A1A1A', logo: 'https://www.abc.net.au/news-assets/touchicon-abc.png', x: 'abcnews' }),
  S('kyivindependent', 'The Kyiv Independent', 'int', 'en', 'Oekraïne van binnenuit, onafhankelijk.', 'https://kyivindependent.com/news-archive/rss/', { color: '#1A1A1A', bsky: 'kyivindependent.com', x: 'KyivIndependent' }),
  S('haaretz', 'Haaretz', 'int', 'en', 'Israëlische kwaliteitskrant, links-liberaal.', 'https://www.haaretz.com/srv/haaretz-latest-headlines', { login: 'https://login.haaretz.com/', paid: true, color: '#0E1734', bsky: 'haaretzcom.bsky.social', x: 'haaretzcom' }),
  S('timesofisrael', 'The Times of Israel', 'int', 'en', 'Israëlisch nieuws, midden.', 'https://www.timesofisrael.com/feed/', { color: '#104F97', bsky: 'timesofisrael.com', x: 'TimesofIsrael' }),
  // Opinie (`opinie`): links en rechts samen. Vox progressief; National Review conservatief, The Free Press eigenzinnig
  // centrum-rechts, Reason libertarisch. Allemaal minstens vijf stukken per dag in de feed.
  S('vox', 'Vox', 'int', 'en', 'Uitleg en opinie, progressief.', 'https://www.vox.com/rss/index.xml', { opinie: true, login: 'https://www.vox.com/auth/login?returnPath=/', paid: true, color: '#FEF100', bsky: 'vox.com', x: 'voxdotcom' }),
  S('nationalreview', 'National Review', 'int', 'en', 'Amerikaans opinieblad, conservatief.', 'https://www.nationalreview.com/feed/', { opinie: true, paid: true, color: '#0265B1', bsky: 'nationalreview.bsky.social', x: 'NRO' }),
  S('thefp', 'The Free Press', 'int', 'en', 'Eigenzinnige opinie en reportage, centrum-rechts.', 'https://www.thefp.com/feed', { opinie: true, login: 'https://www.thefp.com/account/login', paid: true, color: '#1A1A1A', bsky: 'thefp.com', x: 'TheFP' }),
  S('reason', 'Reason', 'int', 'en', 'Opinie en analyse, libertarisch.', 'https://reason.com/feed/', { opinie: true, color: '#F06C34', bsky: 'reason.com', x: 'reason' }),
  // Economie
  // Gratis en Nederlands bij Economie (keuze r5-economiebron, 5 november): de economiefeed van de NOS,
  // zoals NOS Sport en NOS Cultuur. Gecontroleerd op 5 november 2026 (bereikbaar, actueel, 20 berichten).
  S('nos-economie', 'NOS Economie', 'economie', 'nl', 'Economie en werk van de NOS.', 'https://feeds.nos.nl/nosnieuwseconomie', { pick: true, for: ['economie'], color: '#B5121B', logo: own('nos-economie') }),
  S('fd', 'Het Financieele Dagblad', 'economie', 'nl', 'Economie, bedrijven en financiën.', 'https://fd.nl/?rss', { login: 'https://fd.nl/login', paid: true, pick: true, for: ['economie'], color: '#F3A712' , bsky: 'fd.nl' }),
  S('bloomberg', 'Bloomberg', 'economie', 'en', 'Markten en bedrijfsnieuws.', 'https://feeds.bloomberg.com/markets/news.rss', { login: 'https://www.bloomberg.com/account/signin', paid: true, color: '#1A1A1A' , bsky: 'bloomberg.com' }),
  // Tech
  S('theverge', 'The Verge', 'tech', 'en', 'Technologie, gadgets en internetcultuur.', 'https://www.theverge.com/rss/index.xml', { login: 'https://www.theverge.com/auth/login?returnPath=/', pick: true, for: ['tech'], base: true, bsky: 'theverge.com', x: 'verge', color: '#5200FF' }),
  S('wired', 'Wired', 'tech', 'en', 'Wat technologie met de wereld doet.', 'https://www.wired.com/feed/rss', { login: 'https://www.wired.com/auth/initiate', paid: true, pick: true, for: ['tech'], base: true, bsky: 'wired.com', x: 'wired', color: '#222222', dealsCategory: 'Gear / Deals', couponPages: true }), // dealsCategory: alleen wat Wired zelf uitsluitend als deal indeelt (rss.mjs, sourceDeal); couponPages: Wired's eigen kortingscodepagina's (…/story/<naam>-promo-code/, kortingscode.mjs)
  S('tweakers', 'Tweakers', 'tech', 'nl', 'Nederlands technieuws en reviews.', 'https://tweakers.net/feeds/mixed.xml', { login: 'https://tweakers.net/my.tnet/login/', pick: true, for: ['tech'], bsky: 'tweakers.net', bskyImages: true, color: '#E5202C' }),
  S('ars', 'Ars Technica', 'tech', 'en', 'Diepgaand over technologie en wetenschap.', 'https://feeds.arstechnica.com/arstechnica/index', { login: 'https://arstechnica.com/civis/login', pick: true, for: ['tech'], color: '#FF4E00' , bsky: 'arstechnica.com' }),
  S('techcrunch', 'TechCrunch', 'tech', 'en', 'Start-ups en de techindustrie.', 'https://techcrunch.com/feed/', { color: '#0A9E01' , bsky: 'techcrunch.com' }),
  S('mittr', 'MIT Technology Review', 'tech', 'en', 'Opkomende technologie, waaronder AI.', 'https://www.technologyreview.com/feed/', { login: 'https://www.technologyreview.com/login/', paid: true, color: '#1A1A1A' , bsky: 'technologyreview.com' }),
  // Games (onder Tech)
  S('ign', 'IGN', 'games', 'en', 'Het grootste gamesnieuws.', 'https://feeds.feedburner.com/ign/all', { pick: true, forTopic: 'games', topics: ['games'], color: '#BF1313' , x: 'IGN' }),
  S('gamespot', 'GameSpot', 'games', 'en', 'Nieuws en recensies over games.', 'https://www.gamespot.com/feeds/mashup/', { pick: true, forTopic: 'games', topics: ['games'], color: '#1A1A1A' , bsky: 'gamespot.com' }),
  S('eurogamer', 'Eurogamer', 'games', 'en', 'Europees gamesnieuws en recensies.', 'https://www.eurogamer.net/feed', { login: 'https://www.eurogamer.net/login', pick: true, forTopic: 'games', topics: ['games'], color: '#0071CE' , x: 'eurogamer' }),
  S('polygon', 'Polygon', 'games', 'en', 'Games, cultuur en recensies.', 'https://www.polygon.com/rss/index.xml', { pick: true, forTopic: 'games', topics: ['games'], color: '#FF0055' , bsky: 'polygon.com' }),
  // Wetenschap
  S('quanta', 'Quanta Magazine', 'wetenschap', 'en', 'Wiskunde, natuurkunde en biologie, helder uitgelegd.', 'https://api.quantamagazine.org/feed/', { pick: true, for: ['wetenschap'], color: '#1A1A1A' , bsky: 'quantamagazine.org' }),
  S('sciam', 'Scientific American', 'wetenschap', 'en', 'Wetenschap voor iedereen.', 'http://rss.sciam.com/ScientificAmerican-Global', { login: 'https://www.scientificamerican.com/login/', paid: true, pick: true, for: ['wetenschap'], color: '#C8102E' , x: 'sciam' }),
  S('nature', 'Nature', 'wetenschap', 'en', 'Het wetenschappelijk tijdschrift: nieuws en onderzoek.', 'https://www.nature.com/nature.rss', { login: 'https://idp.nature.com/auth/personal/springernature?redirect_uri=https://www.nature.com/', paid: true, color: '#1A1A1A', keep: '/articles/d4', bsky: 'nature.com' }), // alleen nieuws (d4…), geen onderzoekspapers (s4…) zonder intro
  S('carbonbrief', 'Carbon Brief', 'wetenschap', 'en', 'Klimaatwetenschap en -beleid.', 'https://www.carbonbrief.org/feed/', { forTopic: 'klimaat', pick: true, color: '#0F6E5A' , bsky: 'carbonbrief.org' }),
  // Sport
  S('nos-sport', 'NOS Sport', 'sport', 'nl', 'Al het sportnieuws van de NOS.', 'https://feeds.nos.nl/nossportalgemeen', { pick: true, for: ['sport'], color: '#B5121B', logo: own('nos-sport') }),
  S('vi', 'Voetbal International', 'sport', 'nl', 'Het voetbalblad van Nederland.', 'https://www.vi.nl/rss', { login: 'https://www.vi.nl/', pick: true, forTopic: 'voetbal', topics: ['voetbal'], color: '#D6001C' , x: 'VI_nl' }),
  S('wielerflits', 'WielerFlits', 'sport', 'nl', 'Alles over wielrennen.', 'https://www.wielerflits.nl/feed/', { login: 'https://www.wielerflits.nl/', pick: true, forTopic: 'wielrennen', topics: ['wielrennen'], color: '#F28C00' , x: 'WielerFlits' }),
  S('sporza', 'Sporza', 'sport', 'nl', 'Sport van de VRT.', 'https://sporza.be/nl.rss.xml', { color: '#1A1A1A' , bsky: 'sporza.be' }),
  S('bbc-sport', 'BBC Sport', 'sport', 'en', 'Internationaal sportnieuws.', 'https://feeds.bbci.co.uk/sport/rss.xml', { pick: true, for: ['sport'], color: '#FFD230' , x: 'BBCSport' }),
  S('guardian-sport', 'The Guardian Sport', 'sport', 'en', 'Sport, met verhalen erachter.', 'https://www.theguardian.com/sport/rss', { login: 'https://profile.theguardian.com/signin', color: '#052962' , bsky: 'theguardian.com' }),
  S('espn', 'ESPN', 'sport', 'en', 'Amerikaanse sport.', 'https://www.espn.com/espn/rss/news', { login: 'https://www.espn.com/login', color: '#D00000' , bsky: 'espn.com' }),
  S('autosport', 'Autosport', 'sport', 'en', 'Formule 1 en autosport.', 'https://www.autosport.com/rss/f1/news/', { login: 'https://www.autosport.com/sign-in/', pick: true, forTopic: 'f1', topics: ['f1'], color: '#E10600' , x: 'autosport' }),
  // Cultuur en muziek. Muziek: in de Stroom (onderwerp Muziek), niet in de Editie.
  S('nos-cultuur', 'NOS Cultuur & Media', 'cultuur', 'nl', 'Cultuur en media van de NOS.', 'https://feeds.nos.nl/nosnieuwscultuurenmedia', { pick: true, for: ['cultuur'], color: '#B5121B', logo: own('nos-cultuur') }),
  S('3voor12', '3voor12', 'cultuur', 'nl', 'Muziek van de VPRO: nieuws, recensies, live.', 'https://3voor12.vpro.nl/rss.xml', { pick: true, forTopic: 'muziek', base: true, music: true, bsky: '3voor12.bsky.social', color: '#E5007E' }),
  S('pitchfork', 'Pitchfork', 'cultuur', 'en', 'Muziekrecensies en nieuws.', 'https://pitchfork.com/feed/feed-news/rss', { music: true, color: '#1A1A1A' , bsky: 'pitchfork.com' }),
  S('rollingstone', 'Rolling Stone', 'cultuur', 'en', 'Muziek, film en popcultuur.', 'https://www.rollingstone.com/feed/', { login: 'https://www.rollingstone.com/', music: true, color: '#D32531' , bsky: 'rollingstone.com' }),
  S('guardian-music', 'The Guardian Muziek', 'cultuur', 'en', 'Muzieknieuws en recensies.', 'https://www.theguardian.com/music/rss', { login: 'https://profile.theguardian.com/signin', music: true, x: 'guardianmusic', color: '#052962' }),
  S('quietus', 'The Quietus', 'cultuur', 'en', 'Alternatieve en experimentele muziek.', 'https://thequietus.com/feed', { music: true, x: 'TheQuietus', color: '#1B1B1B' , bsky: 'thequietus.com' }),
  S('stereogum', 'Stereogum', 'cultuur', 'en', 'Indie en pop: nieuws en nieuwe nummers.', 'https://www.stereogum.com/feed/', { login: 'https://stereogum.com/login', music: true, x: 'stereogum', color: '#E2231A' }),
  S('npr-music', 'NPR Music', 'cultuur', 'en', 'Tiny Desk en muziekverhalen.', 'https://feeds.npr.org/1039/rss.xml', { music: true, x: 'nprmusic', color: '#D62021' }),
  S('variety', 'Variety', 'cultuur', 'en', 'Film, series en de entertainmentindustrie.', 'https://variety.com/feed/', { login: 'https://variety.com/', forTopic: 'film', pick: true, topics: ['film'], color: '#1A1A1A' , bsky: 'variety.com' }),
  S('guardian-culture', 'The Guardian Cultuur', 'cultuur', 'en', 'Film, boeken, kunst en podium.', 'https://www.theguardian.com/culture/rss', { login: 'https://profile.theguardian.com/signin', color: '#052962' , bsky: 'theguardian.com' }),
  // Nederlandstalige cultuur en media (13 november 2026).
  S('villamedia', 'Villamedia', 'cultuur', 'nl', 'Journalistiek en media, van de NVJ.', 'https://www.villamedia.nl/feeds/nieuws', { color: '#ED111B', bsky: 'villamedia.nl' }),
  S('mediacourant', 'MediaCourant', 'cultuur', 'nl', 'Medianieuws: tv, radio, omroepen en kijkcijfers.', 'https://www.mediacourant.nl/feed/', { color: '#6BD2F2', bsky: 'mediacourant.bsky.social', x: 'mediacourant' }),
  S('cuttingedge', 'Cutting Edge', 'cultuur', 'nl', 'Vlaamse cultuurkritiek: film, muziek, boeken en podium.', 'https://www.cuttingedge.be/feed/', { color: '#E20006', logo: 'https://www.cuttingedge.be/wp-content/uploads/2020/10/cropped-logo2011_onlyCE_e3000f_w512.png' }),
  S('nieuwemuze', 'De Nieuwe Muze', 'cultuur', 'nl', 'Klassieke muziek, opera en jazz.', 'https://www.denieuwemuze.nl/feed/', { music: true, color: '#2D7289', x: 'de_nieuwe_muze' }),
]
// Het eigen logo als de bron in de catalogus staat (vakbronnen hebben er geen); anders null.
const CATALOGUE_IDS = new Set(SOURCES.map((s) => s.id))
export const ownLogo = (id) => (CATALOGUE_IDS.has(id) ? own(id) : null)
export const BRAND = Object.fromEntries(SOURCES.map((s) => [s.id, s.color]))

// Bluesky-accounts die Hoot voor iedereen ophaalt (openbare API, eigen posts van de afgelopen 36 uur).
// Leeg sinds okt. 2026: Bluesky is persoonlijk. Je voegt zelf mensen toe met hun @-naam, in de Stroom
// (app) of op de Bluesky-pagina (web); de standaardset (Aaron Rupar en de groep Oekraïne) is weg.
// `group`: samen te filteren in Bluesky. `optional`: staat uit tot je hem aanzet.
export const BLUESKY_AUTHORS = []
// De Stroom: per bron alles van de afgelopen 36 uur, hooguit 60 berichten (nieuwste eerst).
// Eén regel voor elke bron: de oude, lagere grenzen per rubriek (regio 20, Vlaanderen 25, sport 20,
// games en cultuur 15, muziek 12) kapten drukke bronnen al na een paar uur af (een regionale krant
// na 3 à 5 uur, Polygon na 4,5 uur), dus juist die 36 uur. Wat een feed niet meer noemt, bewaren
// we (stream.mjs): zo reikt ook een drukke bron als NU.nl of de NOS de hele 36 uur terug.
// Alleen voor de Stroom: de verhalen en de Editie houden het oude venster (editionWindowOf).
export const STREAM_HOURS = 36
export const STREAM_MAX = 60
// Bluesky volgt dezelfde 36 uur (ook de eigen accounts in de app: shared/bluesky.mjs, Bluesky.swift).
export const BLUESKY_HOURS = STREAM_HOURS

// De oorspronkelijke set: die krijgt voorrang bij het samenstellen van de editie.
export const MAIN_IDS = new Set(SOURCES.filter((s) => s.base && !s.music).map((s) => s.id))
export const MUSIC_IDS = new Set(SOURCES.filter((s) => s.music).map((s) => s.id))
// Opiniebladen (`opinie`): in de Stroom en de Selectie, niet in de Editie (shared/opinie.mjs, opinieBron).
export const OPINIE_IDS = new Set(SOURCES.filter((s) => s.opinie).map((s) => s.id))
// Doet mee aan de editie: landelijk nieuws, internationaal, economie, tech en wetenschap.
// Niet: regionaal (veel gedeelde stukken), Vlaanderen, sport, games en cultuur.
export const EDITION_CATS = new Set(['nl', 'int', 'economie', 'tech', 'wetenschap'])

// Het oude venster: de eerste 30 berichten van de feed (regio 20, Vlaanderen 25, sport 20, games
// en cultuur 15, muziek 12). Dat blijft de voeding van de verhalen en de Editie (build.mjs), en de
// standaardgrens van loadSource (de vakbronnen van de Selectie). Juist de trage bronnen met
// achtergrondstukken (The Telegraph, Nature, The New Yorker) reiken daarin verder terug dan 36 uur,
// en dat materiaal hebben de bubbel en de verdieping nodig. De 36 uur en de 60 gelden alleen voor
// de Stroom.
export const PER_SOURCE_LIMIT = 30
export const LIMIT_BY_CAT = { regio: 20, vl: 25, sport: 20, games: 15, cultuur: 15 }
export const editionWindowOf = (src) => (src?.music ? 12 : LIMIT_BY_CAT[src?.cat] || PER_SOURCE_LIMIT)
export const UA = 'HootReader/0.4 (+https://gethoot.app) news aggregator'
