// Wat Hoot volgt: de bronnen, hun merkkleur en de vaste grenzen.
export { BSKY_BRAND } from '../../shared/bluesky.mjs'

// bsky = Bluesky-handle van het officiële account, voor een mooie merk-avatar.
export const SOURCES = [
  { id: 'nrc', name: 'NRC', bsky: 'nrc.nl', x: 'nrc', urls: ['https://www.nrc.nl/rss/', 'https://www.nrc.nl/index.rss', 'https://www.nrc.nl/rss.php'] },
  { id: 'volkskrant', name: 'de Volkskrant', bsky: 'volkskrant.nl', x: 'volkskrant', urls: ['https://www.volkskrant.nl/voorpagina/rss.xml', 'https://www.volkskrant.nl/nieuws-achtergrond/rss.xml'] },
  { id: 'nyt', name: 'NYT', bsky: 'nytimes.com', x: 'nytimes', urls: ['https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml'] },
  { id: 'theverge', name: 'The Verge', bsky: 'theverge.com', x: 'verge', urls: ['https://www.theverge.com/rss/index.xml'] },
  { id: 'wired', name: 'Wired', bsky: 'wired.com', x: 'wired', urls: ['https://www.wired.com/feed/rss'] },
  { id: 'nos', name: 'NOS', bsky: 'nos.nl', x: 'nos', urls: ['https://feeds.nos.nl/nosnieuwsalgemeen', 'http://feeds.nos.nl/nosnieuwsalgemeen'] },
  { id: 'atlantic', name: 'The Atlantic', bsky: 'theatlantic.com', x: 'TheAtlantic', urls: ['https://www.theatlantic.com/feed/all/'] },
  { id: 'economist', name: 'The Economist', bsky: 'economist.com', x: 'TheEconomist', urls: ['https://www.economist.com/latest/rss.xml'] },
  // Muziek: in de Stroom (onderwerp Muziek), niet in de Editie. `optional`: staat uit tot je hem aanzet.
  { id: '3voor12', name: '3voor12', bsky: '3voor12.bsky.social', music: true, urls: ['https://3voor12.vpro.nl/rss.xml'] },
  { id: 'oor', name: 'OOR', music: true, urls: ['https://oor.nl/feed/'] },
  { id: 'guardian-music', name: 'The Guardian Muziek', x: 'guardianmusic', music: true, optional: true, urls: ['https://www.theguardian.com/music/rss'] },
  { id: 'quietus', name: 'The Quietus', x: 'TheQuietus', music: true, optional: true, urls: ['https://thequietus.com/feed'] },
  { id: 'stereogum', name: 'Stereogum', x: 'stereogum', music: true, optional: true, urls: ['https://www.stereogum.com/feed/'] },
  { id: 'npr-music', name: 'NPR Music', x: 'nprmusic', music: true, optional: true, urls: ['https://feeds.npr.org/1039/rss.xml'] },
  // Left Laser via YouTube-RSS (native, gratis, betrouwbaar). Avatar via hun Bluesky-profiel.
  { id: 'leftlaser', name: 'Left Laser', bsky: 'leftlaser.bsky.social', urls: ['https://www.youtube.com/feeds/videos.xml?channel_id=UCZU-vIoeB1e3by8mVaVLwIg'] },
]

// Merk-kleuren per bron (voor de avatar-cirkel)
export const BRAND = {
  nrc: '#C20E1A',
  volkskrant: '#1481C4',
  nyt: '#1A1A1A',
  theverge: '#5200FF',
  wired: '#222222',
  nos: '#B5121B',
  leftlaser: '#E40421',
  '3voor12': '#E5007E',
  oor: '#111111',
  'guardian-music': '#052962',
  quietus: '#1b1b1b',
  stereogum: '#E2231A',
  'npr-music': '#D62021',
  guardian: '#052962',
  bbc: '#BB1919',
  aljazeera: '#FA9000',
  npr: '#1a1a1a',
  politico: '#E5202E',
  atlantic: '#1a1a1a',
  economist: '#E3120B',
  ft: '#990F3D',
  tweakers: '#E5202C',
}

// Bluesky-accounts (openbare API). Alleen eigen posts van deze auteurs, de afgelopen 48 uur.
// `group`: samen te filteren in Bluesky. `optional`: staat uit tot je hem aanzet.
// Oekraïne (okt. 2026): wie daar ter plekke of met eigen bronnen over schrijft én op Bluesky
// actief is. Gekozen op activiteit en relevantie in de afgelopen 48 uur (zie CHANGELOG 1.19.0).
export const BLUESKY_AUTHORS = [
  { handle: 'atrupar.com', name: 'Aaron Rupar' },
  // Ter plekke
  { handle: 'kyivindependent.com', name: 'The Kyiv Independent', group: 'oekraine' },
  { handle: 'pravda.ua', name: 'Ukrainska Pravda', group: 'oekraine' },
  { handle: 'euromaidanpress.bsky.social', name: 'Euromaidan Press', group: 'oekraine' },
  { handle: 'christopherjm.ft.com', name: 'Christopher Miller (FT)', group: 'oekraine' },
  // Binnen Rusland
  { handle: 'meduza.io', name: 'Meduza', group: 'oekraine' },
  { handle: 'bbcstever.bsky.social', name: 'Steve Rosenberg (BBC)', group: 'oekraine' },
  // Analyse van het slagveld
  { handle: 'thestudyofwar.bsky.social', name: 'ISW', group: 'oekraine' },
  { handle: 'michaelkofman.bsky.social', name: 'Michael Kofman', group: 'oekraine' },
  { handle: 'phillipspobrien.bsky.social', name: "Phillips O'Brien", group: 'oekraine' },
  { handle: 'warinthefuture.bsky.social', name: 'Mick Ryan', group: 'oekraine' },
  { handle: 'anderspucknielsen.dk', name: 'Anders Puck Nielsen', group: 'oekraine' },
  { handle: 'sambendett.bsky.social', name: 'Samuel Bendett', group: 'oekraine' },
  { handle: 'emilkastehelmi.bsky.social', name: 'Emil Kastehelmi', group: 'oekraine' },
  // Snel en veel (frontbeelden, minder gecontroleerd): uit tot je hem aanzet.
  { handle: 'noelreports.com', name: 'NOELREPORTS', group: 'oekraine', optional: true },
]
export const BLUESKY_HOURS = 48

// Extra gerenommeerde bronnen: doen alleen mee als "ook bij" in een verhaal en voor de bubbel.
export const EXTRA_SOURCES = [
  { id: 'guardian', name: 'The Guardian', x: 'guardian', urls: ['https://www.theguardian.com/world/rss'] },
  { id: 'bbc', name: 'BBC', x: 'bbcworld', urls: ['https://feeds.bbci.co.uk/news/world/rss.xml'] },
  { id: 'aljazeera', name: 'Al Jazeera', x: 'AJEnglish', urls: ['https://www.aljazeera.com/xml/rss/all.xml'] },
  { id: 'npr', name: 'NPR', x: 'NPR', urls: ['https://feeds.npr.org/1001/rss.xml'] },
  { id: 'politico', name: 'Politico', x: 'politico', urls: ['https://rss.politico.com/politics-news.xml', 'https://www.politico.com/rss/politicopicks.xml'] },
  { id: 'ft', name: 'Financial Times', x: 'FT', urls: ['https://www.ft.com/rss/home'] },
  { id: 'tweakers', name: 'Tweakers', x: 'tweakers', urls: ['https://feeds.feedburner.com/tweakers/mixed', 'https://tweakers.net/feeds/mixed.xml'] },
]
export const MAIN_IDS = new Set(SOURCES.map((s) => s.id))
export const MUSIC_IDS = new Set(SOURCES.filter((s) => s.music).map((s) => s.id))

export const PER_SOURCE_LIMIT = 30 // per nieuwsbron (muziek: 12)
export const TOTAL_LIMIT = 160 // nieuws in de Stroom; muziek en Bluesky tellen apart
export const GUARANTEE_PER_SOURCE = 6 // zo valt een rustige bron nooit helemaal weg
export const UA = 'HootReader/0.4 (+https://hootnewsapp.netlify.app) news aggregator'
