// Vakweek: elke maandag om 07:00 per vakgebied de drie belangrijkste stukken van de week ervoor.
// Los van het nieuws (Editie, Stroom): eigen bronnen, eigen voorraad, eigen antwoord (/api/vak).
//
// "Belangrijk" meten we niet aan leescijfers (die hebben alleen de uitgevers), maar aan drie
// zichtbare gronden:
//   1. hoeveel vakbronnen over hetzelfde schrijven;
//   2. of mensen het zelf hebben uitgekozen (de redactie van Sidebar kiest elke werkdag vijf links);
//   3. wie het schreef: een vakexpert weegt zwaarder dan een vakblad, en dat zwaarder dan een
//      bedrijfsblog.
// Sinds 15 november kiest één regel met drie plekken: het verhaal van de week, een kenner, en de rest op de stand, met
// een Nederlands stuk als de rest Engels is (zie "De keuzeregel" hieronder).
// Wat die week al in een Editie stond, komt niet in de top: de Selectie is leesvoer, geen herhaling.
// Alleen mensenwerk: redactionele bronnen en vakmensen met naam; geen gesponsorde stukken,
// webinars, podcastafleveringen, dealpagina's, vacatures of "10 tools"-lijstjes. Geen AI-tekst: bij elk stuk staat de
// eigen intro van de schrijver.
import { loadSourceWithRetry } from './rss.mjs'
import { loadSourceAvatars } from './lookups.mjs'
import { hardMark } from '../../shared/editie-filter.mjs'
import { visibleFor, langOf } from '../../shared/lang.mjs'
import { tzOffsetMs, hostname } from './text.mjs'
import { loadOgImage } from './og.mjs'
export { ogImageFrom, loadOgImage } from './og.mjs'
import { VAK_FIELDS, VAK_FIELD_IDS, VAK_DOMAINS } from '../../shared/vak.mjs'
import { MORE_SOURCES, EXTEND, MORE_FITS, PAID_SOURCES, feedLang } from './vakBronnen.mjs'

const V = (id, name, kind, fields, url, more = {}) => ({ id: 'vak:' + id, name, kind, fields, urls: [url], cat: 'vak', lang: feedLang(url), ...more })

// kind: expert (vakmens met naam) · vakblad · curator (mensen kiezen links) · community · officieel
// `filter`: de bron schrijft ook over andere dingen; alleen wat bij het vakgebied past telt mee.
export const BASE_SOURCES = [
  // Paid social
  V('jonloomer', 'Jon Loomer', 'expert', ['paid-social'], 'https://www.jonloomer.com/feed/', { about: 'Specialist in Meta-advertenties' }),
  V('socialmediatoday', 'Social Media Today', 'vakblad', ['paid-social'], 'https://www.socialmediatoday.com/feeds/news/', { filter: true }),
  V('socialmediaexaminer', 'Social Media Examiner', 'vakblad', ['paid-social'], 'https://www.socialmediaexaminer.com/feed/', { filter: true }),
  V('digiday', 'Digiday', 'vakblad', ['paid-social'], 'https://digiday.com/feed/', { filter: true }),
  V('adexchanger', 'AdExchanger', 'vakblad', ['paid-social'], 'https://www.adexchanger.com/feed/', { filter: true }),
  V('adweek', 'Adweek', 'vakblad', ['merk'], 'https://www.adweek.com/feed/', { filter: true }),
  V('ppcland', 'PPC Land', 'vakblad', ['paid-social'], 'https://ppc.land/rss/', { filter: true }),
  V('sej-paid', 'Search Engine Journal', 'vakblad', ['paid-social'], 'https://www.searchenginejournal.com/category/paid-media/feed/', { filter: true }),
  V('marketingfacts', 'Marketingfacts', 'vakblad', ['paid-social', 'seo', 'merk'], 'https://www.marketingfacts.nl/rss', { filter: true }),
  // Emerce: /rss stuurt door naar /feed (punt 4 van de Selectie-review, 14 november); meteen de feed zelf.
  V('emerce', 'Emerce', 'vakblad', ['paid-social', 'ecommerce', 'ai', 'seo', 'ondernemen'], 'https://www.emerce.nl/feed', { filter: true }),
  // UI/UX
  V('nngroup', 'Nielsen Norman Group', 'expert', ['ux'], 'https://www.nngroup.com/feed/rss/', { about: 'Onderzoek naar gebruiksvriendelijkheid' }),
  V('lukew', 'Luke Wroblewski', 'expert', ['ux'], 'https://www.lukew.com/ff/rss.asp', { about: 'Productontwerper, schrijft over interfaces' }),
  V('bradfrost', 'Brad Frost', 'expert', ['ux'], 'https://bradfrost.com/feed/', { about: 'Bedenker van Atomic Design' }),
  V('smashing', 'Smashing Magazine', 'vakblad', ['ux'], 'https://www.smashingmagazine.com/feed/', { filter: true }),
  V('alistapart', 'A List Apart', 'vakblad', ['ux'], 'https://alistapart.com/main/feed/'),
  V('uxcollective', 'UX Collective', 'community', ['ux'], 'https://uxdesign.cc/feed'),
  V('figma', 'Figma', 'officieel', ['ux'], 'https://www.figma.com/blog/feed/atom.xml'),
  // Digital Design
  // It's Nice That en PRINT in plaats van Creative Review en Design Week (15 november): die weigeren de server (Cloudflare-
  // check); de oude regels staan in het archief (ARCHIVED_SOURCES). It's Nice That: de feed die de site zelf aangeeft.
  V('itsnicethat', "It's Nice That", 'vakblad', ['design', 'merk'], 'https://feeds.feedburner.com/itsnicethat/SlXC', { filter: true, sponsoredSlug: true }),
  V('printmag', 'PRINT', 'vakblad', ['design'], 'https://www.printmag.com/feed/', { filter: true }),
  V('fastco-design', 'Fast Company Design', 'vakblad', ['design'], 'https://www.fastcompany.com/co-design/rss', { filter: true }),
  V('awwwards', 'Awwwards', 'vakblad', ['design'], 'https://www.awwwards.com/blog/feed/'),
  // AI voor je werk: vakmensen die er zelf mee werken, de AI-rubriek van vakbladen, en de
  // officiële kanalen van modellen en MCP. (Anthropic heeft geen feed; Simon Willison schrijft
  // over elke nieuwe Claude-versie.)
  V('simonwillison', 'Simon Willison', 'expert', ['ai'], 'https://simonwillison.net/atom/entries/', { about: 'Maker van Datasette, test elk nieuw model en elke tool' }),
  V('oneusefulthing', 'Ethan Mollick', 'expert', ['ai'], 'https://www.oneusefulthing.org/feed', { about: 'Hoogleraar (Wharton), schrijft over AI in het werk' }),
  V('latentspace', 'Latent Space', 'expert', ['ai'], 'https://www.latent.space/feed', { about: 'Over het bouwen met AI, van swyx en Alessio' }),
  V('interconnects', 'Interconnects', 'expert', ['ai'], 'https://www.interconnects.ai/feed', { about: 'Nathan Lambert over nieuwe modellen' }),
  V('marketingai', 'Marketing AI Institute', 'vakblad', ['ai'], 'https://www.marketingaiinstitute.com/blog/rss.xml'),
  V('verge-ai', 'The Verge', 'vakblad', ['ai'], 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', { filter: true }),
  V('ars-ai', 'Ars Technica', 'vakblad', ['ai'], 'https://arstechnica.com/ai/feed/', { filter: true }),
  V('mcp', 'Model Context Protocol', 'officieel', ['ai'], 'https://blog.modelcontextprotocol.io/index.xml'),
  V('openai', 'OpenAI', 'officieel', ['ai'], 'https://openai.com/news/rss.xml', { filter: true }),
  // E-commerce en Shopify: vakbladen over online retail (de brede alleen met webwinkelstukken),
  // een vakexpert (Web Smith, 2PM), conversie-optimalisatie, en de wijzigingen van Shopify zelf.
  V('2pm', '2PM', 'expert', ['ecommerce'], 'https://www.2pml.com/feed', { about: 'Web Smith over direct-to-consumer en online retail', filter: true }),
  V('practicalecommerce', 'Practical Ecommerce', 'expert', ['ecommerce'], 'https://www.practicalecommerce.com/feed', { about: 'Praktische stukken van vakmensen voor webwinkels' }),
  V('modernretail', 'Modern Retail', 'vakblad', ['ecommerce'], 'https://www.modernretail.co/feed/'),
  V('dc360', 'Digital Commerce 360', 'vakblad', ['ecommerce'], 'https://www.digitalcommerce360.com/feed/'),
  V('ecommercenews', 'Ecommerce News Europe', 'vakblad', ['ecommerce'], 'https://www.ecommercenews.eu/feed/'),
  V('retaildive', 'Retail Dive', 'vakblad', ['ecommerce'], 'https://www.retaildive.com/feeds/news/', { filter: true }),
  V('convert', 'Convert', 'community', ['ecommerce'], 'https://www.convert.com/blog/feed/'),
  V('shopify', 'Shopify', 'officieel', ['ecommerce'], 'https://changelog.shopify.com/feed.xml'),
  // SEO & content: vakmensen met naam (technische SEO, AI-zoeken, content en schrijven), de vakbladen voor zoeken, en de blogs van Moz en Ahrefs. Nederlands via Marketingfacts en Emerce.
  V('sej-seo', 'Search Engine Journal', 'vakblad', ['seo'], 'https://www.searchenginejournal.com/category/seo/feed/'),
  V('seroundtable', 'Search Engine Roundtable', 'vakblad', ['seo'], 'https://www.seroundtable.com/index.xml', { filter: true }),
  V('growthmemo', 'Kevin Indig', 'expert', ['seo'], 'https://www.growth-memo.com/feed', { about: 'Over SEO en groei in het tijdperk van AI-zoeken' }),
  V('ipullrank', 'Mike King', 'expert', ['seo'], 'https://ipullrank.com/feed', { about: 'Technische SEO en AI-zoeken (iPullRank)' }),
  V('mariehaynes', 'Marie Haynes', 'expert', ['seo'], 'https://www.mariehaynes.com/feed/', { about: 'Specialist in Google-updates en kwaliteit' }),
  V('jonoalderson', 'Jono Alderson', 'expert', ['seo'], 'https://www.jonoalderson.com/feed/', { about: 'Technische SEO en webstrategie' }),
  V('leadershipinseo', 'Harry Clarkson-Bennett', 'expert', ['seo'], 'https://www.leadershipinseo.com/feed', { about: 'SEO voor uitgevers en nieuwssites' }),
  V('sparktoro', 'SparkToro', 'expert', ['seo'], 'https://sparktoro.com/blog/feed/', { about: 'Rand Fishkin en Amanda Natividad over zoeken en publiek', filter: true }),
  V('annhandley', 'Ann Handley', 'expert', ['seo'], 'https://annhandley.com/feed/', { about: 'Schrijver van Everybody Writes, over content en schrijven' }),
  V('moz', 'Moz', 'community', ['seo'], 'https://moz.com/posts/rss/blog'),
  V('ahrefs', 'Ahrefs', 'community', ['seo'], 'https://ahrefs.com/blog/feed/', { filter: true }),
  // Merk & reclame: de Nederlandse vakbladen (Adformatie, MarketingTribune), de internationale, en merkstrategen met naam. Adweek en It's Nice That staan hierboven.
  // Marketing Dive in plaats van Marketing Week (15 november; Marketing Week weigert de server, staat in het archief).
  V('adformatie', 'Adformatie', 'vakblad', ['merk'], 'https://www.adformatie.nl/feeds/articles.rss', { filter: true }),
  V('marketingtribune', 'MarketingTribune', 'vakblad', ['merk'], 'https://www.marketingtribune.nl/rss/rss.xml', { filter: true }),
  V('campaign', 'Campaign', 'vakblad', ['merk'], 'https://www.campaignlive.com/rss/news', { filter: true }),
  V('marketingdive', 'Marketing Dive', 'vakblad', ['merk'], 'https://www.marketingdive.com/feeds/news/', { filter: true }),
  V('musebyclios', 'Muse by Clio', 'vakblad', ['merk'], 'https://musebyclios.com/feed/', { filter: true }),
  V('brandingstrategy', 'Branding Strategy Insider', 'vakblad', ['merk'], 'https://brandingstrategyinsider.com/feed/'),
  V('marketoonist', 'Tom Fishburne', 'expert', ['merk'], 'https://marketoonist.com/feed', { about: 'Tekent en schrijft wekelijks over marketing (Marketoonist)', filter: true }),
  V('markschaefer', 'Mark Schaefer', 'expert', ['merk'], 'https://businessesgrow.com/feed/', { about: 'Marketingstrateeg en auteur, over merken en vertrouwen', filter: true }),
  // Startups & ondernemen: Nederlandse vakbladen (IO+; MT/Sprout weigert de server en staat sinds 15 november in het archief), Sifted en TechCrunch, en oprichters en investeerders die zelf schrijven (Lenny en Andrew Chen staan bij Productmanagement).
  V('ioplus', 'IO+', 'vakblad', ['ondernemen'], 'https://ioplus.nl/nl/feed', { filter: true }),
  V('sifted', 'Sifted', 'vakblad', ['ondernemen'], 'https://sifted.eu/feed'),
  V('tc-startups', 'TechCrunch', 'vakblad', ['ondernemen'], 'https://techcrunch.com/category/startups/feed/', { filter: true }),
  V('saastr', 'Jason Lemkin', 'expert', ['ondernemen'], 'https://www.saastr.com/feed/', { about: 'Oprichter van SaaStr, over B2B-startups laten groeien' }),
  V('tunguz', 'Tomasz Tunguz', 'expert', ['ondernemen'], 'https://tomtunguz.com/index.xml', { about: 'Investeerder (Theory Ventures), schrijft met data over startups' }),
  V('hunterwalk', 'Hunter Walk', 'expert', ['ondernemen'], 'https://hunterwalk.com/feed/', { about: 'Investeerder (Homebrew), over startups en durfkapitaal', filter: true }),
  V('justinjackson', 'Justin Jackson', 'expert', ['ondernemen'], 'https://justinjackson.ca/feed', { about: 'Mede-oprichter van Transistor, over zelf een bedrijf opbouwen' }),
  // Development: vakmensen met naam over web, apps en de engineeringpraktijk (twee Belgen en een Nederlander erbij), vakbladen en de browsermakers zelf.
  V('pragmatic', 'The Pragmatic Engineer', 'expert', ['dev'], 'https://newsletter.pragmaticengineer.com/feed', { about: 'Gergely Orosz over hoe techbedrijven software bouwen' }),
  V('fowler', 'Martin Fowler', 'expert', ['dev'], 'https://martinfowler.com/feed.atom', { about: 'Auteur van Refactoring, schrijft over softwareontwerp' }),
  V('kentbeck', 'Kent Beck', 'expert', ['dev'], 'https://tidyfirst.substack.com/feed', { about: 'Bedenker van Extreme Programming en TDD' }),
  V('bramus', 'Bramus', 'expert', ['dev'], 'https://www.bram.us/feed/', { about: 'Bramus Van Damme (Chrome), over CSS en het webplatform' }),
  V('swiftlee', 'SwiftLee', 'expert', ['dev'], 'https://www.avanderlee.com/feed/', { about: 'Antoine van der Lee over iOS-ontwikkeling' }),
  V('freek', 'Freek Van der Herten', 'expert', ['dev'], 'https://freek.dev/feed', { about: 'Spatie (Antwerpen), over PHP en Laravel' }),
  V('ploeh', 'Mark Seemann', 'expert', ['dev'], 'https://blog.ploeh.dk/rss.xml', { about: 'Over softwareontwerp, testen en codekwaliteit' }),
  V('jimnielsen', 'Jim Nielsen', 'expert', ['dev'], 'https://blog.jim-nielsen.com/feed.xml', { about: 'Webontwikkelaar, schrijft over het web en het vak', filter: true }),
  V('fem', 'Frontend Masters Blog', 'vakblad', ['dev'], 'https://frontendmasters.com/blog/feed/'),
  V('csstricks', 'CSS-Tricks', 'vakblad', ['dev'], 'https://css-tricks.com/feed/'),
  V('infoq', 'InfoQ', 'vakblad', ['dev'], 'https://feed.infoq.com/'),
  V('webkit', 'WebKit', 'officieel', ['dev'], 'https://webkit.org/feed/'),
  V('chromedev', 'Chrome for Developers', 'officieel', ['dev'], 'https://developer.chrome.com/static/blog/feed.xml'),
  // Productmanagement: de bekende vakmensen met naam, groei-experts (alleen met productstukken) en de productcommunity. Mind the Product heeft geen RSS meer; een Nederlandse bron met feed is er (nog) niet.
  V('lenny', "Lenny's Newsletter", 'expert', ['product', 'ondernemen'], 'https://www.lennysnewsletter.com/feed', { about: 'Lenny Rachitsky, de grootste nieuwsbrief over productwerk', filter: true }),
  V('svpg', 'Marty Cagan (SVPG)', 'expert', ['product'], 'https://www.svpg.com/feed/', { about: 'Auteur van Inspired en Empowered' }),
  V('producttalk', 'Product Talk', 'expert', ['product'], 'https://www.producttalk.org/feed/', { about: 'Teresa Torres, auteur van Continuous Discovery Habits' }),
  V('cutler', 'John Cutler', 'expert', ['product'], 'https://cutlefish.substack.com/feed', { about: 'The Beautiful Mess, over productteams en -organisaties' }),
  V('gothelf', 'Jeff Gothelf', 'expert', ['product'], 'https://jeffgothelf.com/feed/', { about: 'Auteur van Lean UX, over outcomes en productteams' }),
  V('ravimehta', 'Ravi Mehta', 'expert', ['product'], 'https://www.ravi-mehta.com/rss/', { about: 'Oud-productchef van Tinder, over het productvak' }),
  V('aakash', 'Product Growth', 'expert', ['product'], 'https://www.news.aakashg.com/feed', { about: 'Aakash Gupta over productmanagement en groei' }),
  V('verna', 'Elena Verna', 'expert', ['product'], 'https://www.elenaverna.com/feed', { about: 'Groei-expert, over product-led growth en pricing', filter: true }),
  V('andrewchen', 'Andrew Chen', 'expert', ['product', 'ondernemen'], 'https://andrewchen.substack.com/feed', { about: 'a16z, over groei, netwerkeffecten en nieuwe producten', filter: true }),
  V('deptofproduct', 'Department of Product', 'vakblad', ['product'], 'https://departmentofproduct.substack.com/feed', { filter: true }),
  V('posthog', 'Product for Engineers', 'vakblad', ['product'], 'https://newsletter.posthog.com/feed', { filter: true }),
  V('productcoalition', 'Product Coalition', 'community', ['product'], 'https://productcoalition.com/feed'),
  V('scrumorg', 'Scrum.org', 'community', ['product'], 'https://www.scrum.org/resources/blog/rss.xml', { filter: true }),
  // Kiest voor beide: wat over interfaces gaat telt bij UI/UX, de rest bij design.
  V('sidebar', 'Sidebar', 'curator', ['ux', 'design'], 'https://sidebar.io/feed.xml', { about: 'De redactie kiest elke werkdag vijf designlinks' }),
]

// De eerste tien onderwerpen hierboven, de andere uit vakBronnen.mjs; een bestaande bron kan daar
// een onderwerp bij krijgen (achteraan, zodat zijn eigen onderwerp voorgaat).
// Brede marketingbladen: eerst de smalle onderwerpen, merk als laatste (de merk-regel is ruim en
// zou anders bijna alles pakken; getest op 150 koppen van Adformatie).
const ORDER = {
  'vak:adformatie': ['paid-social', 'pr', 'social', 'design', 'merk'],
  'vak:marketingtribune': ['paid-social', 'social', 'merk'],
}
// Hoofdtaal per vakbron (`lang`), zodat een anderstalig stuk binnen een bron afvalt (shared/lang.mjs):
// ArchiNed brengt Engelstalige Archiprix-stukken, ManagementSite en Trendbeheer soms ook. Nederlands:
// alles op .nl of .be, plus de Nederlandstalige bronnen op een ander domein (hieronder). Geen
// hoofdtaal: bronnen die bewust in meer talen schrijven. De rest is Engelstalig.
const NL_ELSEWHERE = new Set(
  ['frankwatching', 'photofacts', 'fotodok', 'iusmentis', 'tweakers', 'tweakers-games', 'thuiswinkel', 'esb', 'changeinc', 'verheggen', 'gemeentenu', 'writteninmusic', 'gonzocircus', 'tzum', 'trendbeheer', 'gamekings', 'helden', 'opiniez', 'delagelanden', 'hardhoofd', 'historiek'].map(
    (id) => 'vak:' + id,
  ),
)
const MIXED = new Set(['vak:verfassungsblog']) // Duits en Engels door elkaar
export function vakLang(s) {
  if (MIXED.has(s.id)) return null
  if (NL_ELSEWHERE.has(s.id) || /\.(nl|be|nu)$/.test(hostname(s.urls[0]))) return 'nl'
  return 'en'
}
// Betaald (PAID_SOURCES in vakBronnen.mjs, Selectie-review punt 9): het kenmerk staat op de bron, het stuk draagt het mee.
const withLang = (s) => ({ ...s, lang: vakLang(s), ...(s.paid || PAID_SOURCES.has(s.id) ? { paid: true } : {}) })

export const VAK_SOURCES = [
  ...BASE_SOURCES.map((s) => {
    const more = EXTEND.filter(([id]) => id === s.id).map(([, f]) => f)
    const fields = [...new Set([...s.fields, ...more])]
    return ORDER[s.id] ? { ...s, fields: ORDER[s.id].filter((f) => fields.includes(f)) } : more.length ? { ...s, fields } : s
  }),
  ...MORE_SOURCES,
].map(withLang)

// Past een stuk in de taal van zijn bron (of in die van de lezer)? Opnieuw bepaald uit kop, intro en
// link, zodat ook stukken die al in de voorraad stonden (zonder `offLang`) afvallen.
export const inReaderLang = (it, src) => visibleFor({ ...it, ...langOf({ title: it.title, summary: it.summary || it.text, url: it.url }, src?.lang) })

export { VAK_FIELDS, VAK_FIELD_IDS, VAK_DOMAINS }

// Past een stuk bij het vakgebied? Alleen nodig voor bronnen die breder schrijven (`filter`).
const BASE_FITS = {
  // Een sociaal platform én iets met adverteren of marketing (een stuk over een nep-WhatsApp is
  // geen paid social); zoekmachine-adverteren (Google Ads) hoort er niet bij.
  'paid-social': {
    test: (t) =>
      /\b(paid social|social (ads|advertising|commerce)|advantage\+|ads manager)\b/i.test(t) ||
      (/\b(meta|facebook|instagram|threads|tiktok|snapchat|pinterest|linkedin|reddit|youtube|whatsapp)\b/i.test(t) &&
        /\b(ads?|advertis\w*|advert\w*|campaigns?|campagnes?|marketing|marketeers?|marketers?|creators?|influencers?|brands?|merken|targeting|audiences?|budgets?|cpm|roas|reels|shopping|commerce|creatives?|attribution|pixel)\b/i.test(t)),
  },
  ux: /\b(ux|ui|user experience|usability|interfaces?|interaction|design systems?|accessib\w*|a11y|prototyp\w*|figma|user research|onboarding|navigation|forms?|typography|components?|designers?)\b/i,
  // E-commerce: online verkopen (winkelketens en vastgoed in het algemeen niet).
  ecommerce: /\b(e-?commerce|ecom|webshops?|webwinkels?|online (shopping|shops?|stores?|retail|retailers?|sales|winkels?)|shopify|checkout|cart|winkelwagen|conversie\w*|conversion rate|cro|dtc|d2c|direct-to-consumer|marketplaces?|amazon|bol\.com|zalando|temu|shein|fulfil+ment|thuiswinkel\w*|retouren|returns|social commerce|live shopping)\b/i,
  // AI: modellen, tools en werken met AI (algemeen techniek- of bedrijfsnieuws telt niet mee).
  ai: /\b(ai|a\.i\.|artificial intelligence|kunstmatige intelligentie|llms?|large language models?|gpt[-\w.]*|chatgpt|claude|gemini|copilot|openai|anthropic|mistral|llama|mcp|model context protocol|agents?|agentic|agenten|prompt\w*|generative|generatieve|genai|machine learning|midjourney|sora|veo|reasoning models?)\b/i,
  // Digitaal ontwerp en merkidentiteit; boeken, verpakkingen en gebouwen niet.
  design: /\b(digital|web ?design|websites?|apps?|interfaces?|ui|ux|online|screens?|interactive|motion|animat\w*|figma|identity|identities|rebrand\w*|logos?|type ?faces?|fonts?|typograph\w*|design systems?|design trends?|icons?)\b/i,
  // SEO & content: zoeken (Google, Bing, AI-zoeken), vindbaarheid en het schrijven zelf.
  // Google Ads hoort er niet bij (dat is adverteren).
  seo: /\b(seo|geo|aeo|search engines?|zoekmachine\w*|search console|google (search|discover|images?|news|core update)|googlebot|image search|core updates?|(spam|algorithm|helpful content) updates?|ai (overviews?|mode|search|citations?|visibility)|(generative|agentic|answer) (engine|search)\w*|llm visibility|zero-?click|serps?|rankings?|ranken|vindbaar\w*|crawl\w*|indexing|indexering|geïndexeerd|backlinks?|link ?building|linkbuilding|keywords?|zoekwoord\w*|search (intent|volume|traffic)|organic (traffic|search)|organisch verkeer|schema markup|structured data|e-?e-?a-?t|hreflang|sitemaps?|google business profiles?|local seo|bing|perplexity|content ?(strateg\w*|marketing|marketeers?|distribution|design)|copywrit\w*|copy|tekstschrij\w*|headlines?|storytelling)\b/i,
  // Merk & reclame: merken, campagnes, creatie en bureaus. Het losse woord "marketing" telt
  // niet (dan komt alle martech en elke carrièrerubriek mee).
  merk: /\b(merk|merken|merkstrateg\w*|merkbekendheid|merkwaarde|merkidentiteit|brands?|branding|rebrand\w*|brand (strategy|equity|purpose|building|positioning)|positioning|positionering|campaigns?|campagnes?|commercials?|tv-?spots?|reclame\w*|advertising|advertisers?|adverteerders?|ads?|creati(e|ef|eve|viteit|vity|ves?)|creative directors?|cco|cmo|cmos|reclamebureaus?|bureaus?|agency|agencies|pitch\w*|slogans?|taglines?|logos?|sponsorships?|sponsoring|activations?|cannes lions|effies?|adcc|buitenreclame|ooh|billboards?|wpp|omnicom|publicis|havas|dentsu|mccann)\b/i,
  // Startups & ondernemen: oprichten, financiering en groeien (algemeen economisch nieuws niet;
  // daarom geen losse "groei", "omzet" of "ceo").
  // "\w*startup" vangt ook samenstellingen als "kweekmelkstartup".
  ondernemen: /\b(\w*startups?|start-ups?|\w*scale-?ups?|founders?|oprichters?|co-?founders?|ondernem\w*|entrepreneur\w*|zzp\w*|mkb|smb|small business\w*|bootstrap\w*|funding|financiering\w*|investeerders?|investors?|venture|vc|vcs|durfkapitaal|pre-?seed|seed|series [a-e]|fundraising|kapitaalronde|investeringsronde|raises?|haalt [^.]{0,40}\bop|valuations?|waardering|ipo|beursgang|overnames?|acquisitions?|acquires?|unicorns?|challengers?|product-market fit|pmf|go-to-market|gtm|saas|arr|business models?|verdienmodel|pricing|prijsstrateg\w*|groei(en|strategie|bedrijf|bedrijven|fase|kapitaal)|scaling|opschalen|expansion|internationaal (groeien|uitbreiden)|accelerators?|incubators?|y combinator|techleap|kvk)\b/i,
  // Development: bouwen van web en apps, talen, frameworks, browsers en de engineeringpraktijk
  // (algemeen technieknieuws, hardware en gadgets niet).
  dev: /\b(developers?|devs?|ontwikkelaars?|programmeurs?|programmeren|programming|coding|codebases?|code ?reviews?|engineers?|engineering|software ?(development|ontwikkeling|architect\w*|design|teams?)|softwareontwikkel\w*|front-?end|back-?end|full-?stack|web ?(dev\w*|platform|components?|standards?|apps?|performance)|webontwikkel\w*|javascript|typescript|node\.?js|deno|react|vue|svelte|angular|next\.?js|astro|css|html|wasm|webassembly|browsers?|chromium|webkit|interop|baseline|swift(ui)?|kotlin|jetpack compose|xcode|android studio|flutter|react native|app ?(development|ontwikkeling)|apis?|sdks?|frameworks?|open[- ]source|github|gitlab|git|npm|rust|python|php|laravel|django|rails|compilers?|devtools|tooling|ci\/cd|refactor\w*|unit tests?|tdd|debugg\w*|devops|observability|low-?code|vibe ?cod\w*|coding agents?|claude code|codex|copilot)\b/i,
  // Productmanagement: producten maken en sturen (discovery, strategie, teams, groei en metrics);
  // algemene AI-, startup- of loopbaanstukken niet.
  product: /\b(products?|product-?led|product(manag\w*|eigenaars?|owners?|strateg\w*|teams?|ontwikkeling|visie)|plg|pms?|cpos?|chief product officers?|discovery|roadmaps?|okrs?|outcomes?|north star|jobs[- ]to[- ]be[- ]done|jtbd|prioriti[sz]\w*|prioriter\w*|backlogs?|user stories|acceptance criteria|stakeholders?|experiment\w*|a\/b[- ]?tests?|feature (flags?|factor(y|ies)|requests?)|activation|retention|onboarding|churn|growth (teams?|loops?|models?)|viral loops?|network effects?|go-to-market|gtm|pricing|packaging|monetization|user research|customer (research|interviews?|feedback|discovery)|klantonderzoek|prototyp\w*|mvps?|metrics)\b/i,
}
// De nieuwe onderwerpen krijgen hun regel uit vakBronnen.mjs; van de eerste tien blijft de eigen
// regel staan, behalve waar het onderzoek een betere gaf (getest op de echte koppen): Online
// adverteren (nu ook zoekadvertenties), E-commerce & retail (ook winkels), en SEO, merk, UI/UX en
// digitaal ontwerp met Nederlandse woorden erbij.
const WIDER = ['paid-social', 'ecommerce', 'seo', 'merk', 'ux', 'design']
const FITS = { ...Object.fromEntries(Object.entries(MORE_FITS).filter(([k]) => !(k in BASE_FITS))), ...BASE_FITS, ...Object.fromEntries(WIDER.filter((k) => MORE_FITS[k]).map((k) => [k, MORE_FITS[k]])) }
// Naast het vak van een kenner (Selectie-review 14 november, punt 2): spullen en spelletjes in de kop. Een kenner die zijn
// onderwerptoets mist en het over een horloge, een lader, een telefoon of een game heeft, telt die week niet. Alleen de kop:
// in de intro staan zulke woorden vaak als voorbeeld. De maat, gemeten op week 45 en op 1006 stukken uit de feeds van
// 14 november: alles wat de onderwerptoets mist eruit haalde 39 van de 83 kennerstukken van week 45 weg, ook echte
// vakstukken ("Agent Harness: Definition", "Diversification & Drawdowns"); ook de onderwerpregels van film, muziek, eten en
// reizen op kop en intro vingen er te veel ("Composer 2.11" als muziek, "The Insider" als reizen).
const BESIDE = /\b(iphone|ipad|macbook|apple watch|airpods|smartwatch|horloges?|watches|dial|bezel|charging guide|chargers?|opladers?|headphones|koptelefoons?|remaster(s|ed)?|playstation|xbox|nintendo|switch 2|steam deck)\b|\bfor mac\b/i
export const besideField = (it, field) => field !== 'gadgets' && field !== 'gaming' && BESIDE.test(it.title || '')

// Geen mensenwerk om te lezen (of geen artikel): reclame, aankondigingen, vacatures, lijstjes. En geen liveblog of
// kijkwijzer ("England vs Croatia live updates", "How to watch …"): leesvoer, geen nieuws van de week (fase 3).
// Deals en podcasts niet op een woord in de kop (Selectie · deals · 1, 12 november 2026): "OpenAI signs $10bn chip deal",
// "Wat de deal tussen Ahold en Bol betekent" en nieuws over Black Friday-verkopen zijn vakstukken. Een echte dealpagina of
// podcastaflevering herkent hardMark, dezelfde regel als de Editie (shared/editie-filter.mjs): een dealrubriek als eerste
// padsegment, "Podcast:" vooraan, een iTunes-aflevering of een audio-enclosure zonder eigen intro.
const NOT_READING = /^\W*live\b|\blive ?(updates|blog|event)\b|:\s*the latest (from|on)\b|\bhow to watch\b|\b(sponsored|^sponsor|partner content|advertorial|presented by|webinars?|aflevering \d+|sim[- ]only|register now|sign up now|giveaway|vacatures?|we'?re hiring|job (opening|listing)s?|this week in|weekly (round-?up|recap)|industry news|(our|the|weekly|daily) newsletter|^newsletter)\b/i
// Lijstjes: "12 Best Figma Plugins", en (Selectie-review 14 november, punt 2) elk "N beste/best" met een zelfstandig
// naamwoord erachter: "8 best hotels in Megève", "8 of the best family-friendly hotels", "De 5 beste smartphones".
// Nieuws over een prijs met zo'n naam blijft: "The 50 Best Restaurants 2026: The Full List of Winners".
const LISTICLE = /^\s*(the\s+)?\d+\s+([\w-]+\s+){0,3}(tools?|templates?|examples?|plugins?|fonts?|apps?|ways|tips|tricks|resources|mockups?|icons?)\b/i
const BEST_LIST = /^\s*(?:(?:the|de|our|onze|these|deze)\s+)?\d+\s+(?:of\s+the\s+)?(?:beste|best)\s+[\p{L}-]/iu
const PRIZE = /\b(winners?|winnaars?|awards?|prijs|prijzen|uitgereikt|uitgeroepen|ranking|genomineerd\w*|nominaties?|shortlist)\b/i
const isListicle = (t) => LISTICLE.test(t) || (BEST_LIST.test(t) && !PRIZE.test(t))
// Koopsignaal (Selectie-review, punt 2, vóór Black Friday): een kop die jou als lezer iets laat kopen of winnen is geen
// vakstuk. Het signaal is een aanbieding aan de lezer, nooit elk woord over korting (keuring 14 november): nieuws over
// omzet, gedrag, een rechtszaak of een korting van de overheid of een bedrijf blijft.
// - Altijd: een winactie ("en win 2 vliegtickets", "maak kans op"). "zo claim je" en "stunt met" alleen met een prijs of iets
//   gratis in de kop ("stunt met een gratis Switch 2: zo claim je hem"); "Fenerbahçe stunt met zege" en "Zo claim je je recht
//   op schadevergoeding" blijven.
// - Een aanbiedingsvorm: "de beste deals", "op een rij", een kortingscode, "nu voor 899 euro", "met 30 procent korting",
//   "voor de laagste prijs", en de gebiedende wijs met een bedrag vooraan een zin ("Bespaar 200 euro", "Deal: Save $80").
//   "Families can get $500 off" en "Students can now get 50% off" zijn geen gebiedende wijs.
// - Een koopdag (Black Friday, Cyber Monday, Prime Day) met een aanbieding: korting óp iets, een deal of sale als label
//   ("Black Friday-deal: …", "… Sale (2026)"), deals bij een winkel, of een prijs ("for $448").
// Een nieuwszin wint altijd van de aanbiedingsvorm: omzet, gedrag, onderzoek, een rechtszaak of toezichthouder, een staking,
// een waarschuwing, een markt of grondstof ("Brent crude drops to its lowest price"), een groep die korting krijgt ("NS-reizigers krijgen 40 procent korting", "Kabinet: 50 procent korting").
const PRICE = /[€$£]\s?\d|\b\d+(?:[.,]\d+)?\s?(?:euro|%|procent)|\b(?:gratis|free|korting\w*|cadeau|tegoed|prijs\w*|aanbieding\w*|deals?|\w*goedkop\w*)\b/i
const BUY_ALWAYS = new RegExp(
  [
    '\\bclaim (?:je|nu) (?:gratis|jouw)\\b',
    '\\bwinactie\\b',
    '\\bmaak kans op\\b',
    // "win" met een aantal ("en win 2 vliegtickets"), of zonder aantal alleen vooraan een zin ("Win kaarten voor …").
    // "Feyenoord win reis naar de finale niet" is een zin over een club, geen winactie.
    '\\bwin\\s+(?:een|twee|drie|vier|vijf|\\d+|a|two|three|free)\\s+(?:[\\p{L}-]+\\s+){0,2}(?:tickets?|vliegtickets|kaarten|kaartjes|exemplaren|exemplaar|copies|reis|trip|prijzen)\\b',
    '(?:^|[:!?–—]\\s*|\\ben\\s+|\\band\\s+)win\\s+(?:[\\p{L}-]+\\s+){0,2}(?:tickets?|vliegtickets|kaarten|kaartjes|exemplaren|copies|reis|trip|prijzen)\\b',
  ].join('|'),
  'iu',
)
const WITH_PRICE = /\bzo claim je\b|\bstunt met\b/i
const DAY = '(?:black friday|cyber monday|prime day)'
const AMOUNT = '(?:up to\\s+|tot\\s+)?(?:[€$£]\\s?\\d[\\d.,]*|\\d+\\s?(?:%|procent|euro))(?!\\s+(?:of|van)\\b)'
const DEAL_HEAD = new RegExp(
  [
    '\\b(?:beste|best|top)\\s+(?:deals|offers|aanbiedingen)\\b',
    `\\b(?:beste|best|top)\\s+(?:[\\p{L}'’-]+\\s+){0,3}?${DAY}[\\s-](?:[\\p{L}'’-]+\\s+){0,3}?(?:deals|offers|aanbiedingen)\\b`,
    '\\b(?:deals?|aanbieding\\w*|koopjes|korting\\w*)\\b.*\\bop een rij\\b',
    '\\b(?:deals?|aanbiedingen|koopjes) van de (?:dag|week)\\b',
    '\\b(?:kortingscodes?|promo ?codes?|discount codes?|coupon codes?)\\b',
    '\\bkorting op\\b.*\\b(?:deal|actie|code|aanbieding)\\b',
    '\\b(?:nu|met|tot)\\s+(?:wel\\s+|maar liefst\\s+)?(?:[€$£]\\s?\\d+|\\d+\\s?(?:%|procent|euro))\\s+korting\\b',
    '\\bnu (?:voor|vanaf)\\s+(?:[€$£]\\s?\\d|\\d+(?:[.,]\\d+)?\\s?euro)',
    '\\b(?:its|their)\\s+lowest prices?\\b',
    '\\b(?:nu|voor de)\\s+(?:de\\s+)?laagste prijs\\b',
    `(?:^|[:|–—!?(]\\s*|\\b(?:en|and|to|hier|nu)\\s+)(?:bespaar|scoor|krijg|save|get|grab|snag)\\s+${AMOUNT}`,
  ].join('|'),
  'iu',
)
const SHOP_DAY = /\b(?:black friday|cyber monday|singles'? day|prime day|amazon prime days?)\b/i
const OFFER = /\b(?:deals?|korting(?:en)?|aanbieding(?:en)?|koopjes|discounts?|sale)\s+(?:op|on|voor|for|bij|under)\b|\b(?:deals?|sale)\s*(?::|\(20\d\d\)\s*$|$)|\b(?:for|voor)\s+(?:[€$£]\s?\d|\d+(?:[.,]\d+)?\s?euro)/i
const NEWS = /\b(?:omzet\w*|sales|record\w*|spending|uitgaven|besteding\w*|besteed\w*|consument\w*|shoppers|onderzo\w*|survey|research|stud(?:y|ie)|cijfers|waarom|why|analyse|analysis|nep\w*|fakes?|scams?|oplicht\w*|misleid\w*|misleading|deceptive|fraude|acm|cma|ftc|sues?|sued|rechter|rechtbank|rechtszaak|markt\w*|markets?|beurs|koers\w*|crude|olie|oil|goud|gold|harvest|oogst|grondstof\w*|commodit\w*|waarschuw\w*|warns?|urges?|vraagt|roept|staking|strike|crisis|problemen|zo zit het|krijg(?:en|t)|geeft|verdwijnt|kabinet|overheid|government|huurders|reizigers|studenten|students|huishoudens|households|gezinnen|families|klanten|winkeliers|retailers)\b/i
export const isBuying = (t = '') =>
  BUY_ALWAYS.test(t) || (WITH_PRICE.test(t) && PRICE.test(t.replace(WITH_PRICE, ''))) || ((DEAL_HEAD.test(t) || (SHOP_DAY.test(t) && OFFER.test(t))) && !NEWS.test(t))
// Aankondigingen (Selectie-review, punt 2): een congres met alleen een naam en jaartal, "… Announced", een fragment uit
// een boek. Nieuws óver een congres of boek (met een eigen zin) blijft.
const ANNOUNCE = /^\s*(?:the\s+)?[\p{L}\p{N}&'’ -]{0,40}\b(?:summit|conference|congres|congress|symposium|festival|meetup)\s+20\d\d\s*$|\b(?:conference|congres|summit|symposium|event)\b[^:]{0,40}\bannounced\b|\bread an excerpt\b|\b(?:lees|een) (?:fragment|voorpublicatie) uit\b|^\s*excerpt\s*:/iu
export const cleanTitle = (t = '') => t.replace(/\s+via\s+@\w+(,\s*@\w+)*\s*$/i, '').trim()
// Verzamelingen: dagelijkse overzichten ("[AINews] …") en genummerde linklijstjes ("… (#25)").
// Ook vaste rubrieken met een datum in de kop ("New Ecommerce Tools: October 21, 2026",
// "Freebies, Sales, and Charity Bundles for October 19, 2026") en vaste linklijsten
// ("… – This Week's Links", "News Digest …", "RPG Print News – …", "RPG Crowdfunding News – …").
// En uitzendoverzichten van een programma ("12/11 in Nieuwsuur: Cruciaal debat • Hybride oorlog • …").
const ROUNDUP = /^\s*\d{1,2}\/\d{1,2}(\/\d{2,4})? in [^:]{2,40}:|^\s*\[[^\]]*news[^\]]*\]|\(#\d+\)|\b(roundup|round-up|links? of the week|weekly digest|daily digest|news digest|this week['’]?s links)\b|\b(print|crowdfunding) news\s*[–—-]|(:|\bfor)\s*(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(, \d{4})?\s*$|^\s*fragments\b/i
// Meer verzamelstukken (Selectie-review 14 november, punt 2), als vorm en niet als lijst van titels:
// - een nummer als label van een vaste titel: "Data Engineering Weekly #295", "Issue 112: …", "Nr. 34";
// - een weekoverzicht of leeslijst: "Week in review: …", "Weekend reading: …", "Weekoverzicht";
// - het beste van een periode: "Best of October 2026", "Het beste van de week";
// - een nieuwsupdate of populairlijst als label: "Nieuwsupdate: …", "10x populair: …", "Meest gelezen: …";
// - een vast verzamellabel vooraan: "The Scoop: …", "The Rundown: …", "Recap: …";
// - een rubriek met een weekdag in de naam: "Friday Squid Blogging: …", "Funny on Sunday: …".
const DAYS = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag'
const COLLECTION = new RegExp(
  [
    '(?:^|\\s)#\\d{2,}\\b',
    // Een nummer alleen als label van een vaste titel (keuring 14 november): vooraan, of direct na een korte titel met een
    // dubbele punt of het einde van de kop erachter, of achter een scheidingsteken aan het eind. Nooit een nummer in een
    // zin ("op nummer 1 in de Top 40", "nieuwe nummer 1", "Downing Street nummer 10") en nooit "Vol. 2" van een plaat.
    '^\\s*(?:issue|nummer|nr\\.?|no\\.|vol\\.)\\s*#?\\d+(?:\\s*[:|–—]|\\s+-\\s|\\s*$)',
    '^[^:|–—]{1,50}?\\s(?:issue|nr\\.)\\s*#?\\d+\\s*(?:[:|–—]|$)',
    '(?:[:|–—(]|\\s-)\\s*(?:issue|nummer|nr\\.?|no\\.|vol\\.)\\s*#?\\d+\\)?\\s*$',
    '\\b(?:week|weekend) in review\\b',
    '\\bweekend (?:reading|reads|links)\\b',
    '\\bweekoverzicht\\b',
    '\\bbest of (?:the )?(?:week|month|year|20\\d\\d|january|february|march|april|may|june|july|august|september|october|november|december)\\b',
    '\\bhet beste van (?:de |het )?(?:week|maand|jaar|20\\d\\d)\\b',
    '^\\s*(?:nieuws|news) ?update\\b',
    '^\\s*(?:\\d+\\s*x\\s+)?(?:populair|meest gelezen|most read|most popular)\\s*[:|–—-]',
    '^\\s*\\d+\\s*x\\s+populair\\b',
    '^\\s*(?:the\\s+)?(?:scoop|rundown|recap|wrap-?up|catch-?up|briefing)\\s*:',
    `\\b(?:funny|fun|links|reads|reading|photos?|quiz|thoughts)\\s+on\\s+(?:${DAYS})\\b`,
    `^\\s*(?:${DAYS})\\s+(?:[\\p{L}]+\\s+)?(?:blogging|links|reads|reading|funnies|photos?|quiz|thoughts)\\b`,
  ].join('|'),
  'iu',
)
// Een vast programmalabel van een podcast in de kop, naast "Podcast:" vooraan (hardMark). De Selectie heeft geen AI die
// twijfel beoordeelt, dus hier ook de vormen die vakbronnen gebruiken, en alleen als label (gescheiden door een pijp of
// streep), nooit als woord in een zin: "… | The PetaPixel Podcast", "… – All Things Product Podcast with Teresa Torres",
// "AI & Tech-podcast | …", "The Low Culture Podcast: …", een afleveringsnummer ("Podcast #422", "Podcast Episode 12") of de koptelefoon vooraan.
// Nieuws óver podcasts ("Will YouTube kill the podcast industry?", "NOS-podcast De Dag uitgeroepen tot beste …") blijft.
const SHOW = /^(?:the\s+)?(?:[\p{L}\p{N}&'’.+]+[\s-]+){0,5}podcast(?:\s+(?:with|met)\s+.+)?$/iu
const SHOW_NAME = /^the\s+(?:[\p{L}\p{N}&'’.+-]+\s+){1,4}podcast$/iu
const SHOW_NUMBER = /\bpodcast\s+(?:episode\s+|aflevering\s+)?#?\d+\b/i
export function podcastLabel(title = '') {
  const t = String(title || '').replace(/\s+/g, ' ').trim()
  if (/^\s*🎧/u.test(t) || SHOW_NUMBER.test(t)) return true
  const tail = t.split(/\s(?:[|–—]|-)\s/)
  if (tail.length > 1 && SHOW.test(tail[tail.length - 1].trim())) return true
  const head = t.split(/\s*\|\s*/)
  if (head.length > 1 && SHOW.test(head[0].trim())) return true
  // Met een dubbele punt alleen een eigen naam: "The Low Culture Podcast: …" (niet "Video Podcast: …").
  return SHOW_NAME.test(t.split(/\s*:\s*/)[0].trim()) && t.includes(':')
}
// `sponsoredSlug` (een bron die "sponsored content" alleen in de link zet, zoals It's Nice That): dat woordpaar in de slug
// is reclame. Alleen voor zo'n bron, want bij andere bronnen staat "state-sponsored" of "sponsored-content" in gewone koppen.
const SPONSORED_SLUG = /-sponsored-content(?=[-/]|$)/i
// `textOnly` (een bron die ook audio en video plaatst, zoals Paul Krugman): alleen de geschreven stukken.
const AV = /^(audio|video)\//i
export const isReading = (it, src = null) =>
  !!it.title && !(src?.sponsoredSlug && SPONSORED_SLUG.test(it.url || '')) && !NOT_READING.test(it.title) && !isListicle(it.title) && !ROUNDUP.test(it.title) && !COLLECTION.test(it.title) && !isBuying(it.title) && !ANNOUNCE.test(it.title) && !hardMark(it) && !podcastLabel(it.title) && !(src?.textOnly && AV.test(it.mediaType || ''))

// ---- Week: van maandag 07:00 tot maandag 07:00 (Amsterdam) ----
const AMS = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' })
const DOW = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
const at7 = (y, m, d) => {
  const guess = Date.UTC(y, m - 1, d, 7)
  return guess - tzOffsetMs(guess)
}
function isoWeek(y, m, d) {
  const t = new Date(Date.UTC(y, m - 1, d))
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7) + 3) // de donderdag van die week bepaalt het jaar
  const jan1 = Date.UTC(t.getUTCFullYear(), 0, 1)
  return { year: t.getUTCFullYear(), week: Math.ceil(((t - jan1) / 864e5 + 1) / 7) }
}
// De laatst verschenen Vakweek op moment `now`: over de week vóór de laatste maandag 07:00.
export function vakWeek(now = Date.now()) {
  const p = Object.fromEntries(AMS.formatToParts(new Date(now)).map((x) => [x.type, x.value]))
  let back = DOW[p.weekday]
  if (back === 0 && Number(p.hour) < 7) back = 7
  const [y, m, d] = [+p.year, +p.month, +p.day - back] // Date.UTC rekent een negatieve dag zelf om
  const to = at7(y, m, d)
  const from = at7(y, m, d - 7)
  const next = at7(y, m, d + 7)
  const start = new Date(Date.UTC(y, m - 1, d - 7))
  const { year, week } = isoWeek(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate())
  return { id: `${year}-W${String(week).padStart(2, '0')}`, week, from: new Date(from).toISOString(), to: new Date(to).toISOString(), next: new Date(next).toISOString() }
}

// Bundel niet bevriezen (Selectie-review 14 november, punt 10). Op maandag vanaf het verschijnen tot de middag
// (Amsterdam) stelt elke ronde de bundel van deze week opnieuw samen: een bron die het eerste uur faalde of niet aan de
// beurt was, en beelden die nog ontbraken, komen er dan nog bij. Wat al in de top stond blijft staan (`keep`).
export const RECOMPOSE_UNTIL_HOUR = 12
const amsParts = (now) => Object.fromEntries(AMS.formatToParts(new Date(now)).map((x) => [x.type, x.value]))
export function recomposing(now = Date.now()) {
  const p = amsParts(now)
  return p.weekday === 'Mon' && Number(p.hour) >= 7 && Number(p.hour) < RECOMPOSE_UNTIL_HOUR
}
// In het weekend (zaterdag, zondag en maandag voor het verschijnen) gaan de beelden van de komende bundel voor, niet die
// van de bundel die al uit is.
export function beforeNextBundle(now = Date.now()) {
  const p = amsParts(now)
  return p.weekday === 'Sat' || p.weekday === 'Sun' || (p.weekday === 'Mon' && Number(p.hour) < 7)
}
// De komende bundel zoals hij er nu voor zou staan: samengesteld alsof het al maandag is.
export const nextBundleAt = (now = Date.now()) => Date.parse(vakWeek(now).next) + 60e3
// Per onderwerp de id's van de topstukken van een bundel (voor `keep`).
export const topIds = (digest) => Object.fromEntries((digest?.fields || []).map((f) => [f.id, (f.top || []).map((e) => e.id)]))
// Per onderwerp de bronnen in de top van een bundel (voor `previous`, keuzeregel: rouleren).
export const topSources = (digest) => Object.fromEntries((digest?.fields || []).map((f) => [f.id, [...new Set((f.top || []).map((e) => e.source))]]))

// ---- Over hetzelfde? Genoeg gedeelde, betekenisvolle woorden in de kop ----
const STOP = new Set('about after again against also among another because been before being between both could does doing during each from further have having here into itself just more most much must need only other over same should some such than that their them then there these they this those through under until very want were what when where which while will with would your yours year years week weeks today heres whats how why new news announces launches says adds update updates over naar voor door over deze voor zijn wordt worden heeft hebben niet meer maar onze jouw jullie'.split(' '))
const words = (t) => new Set((t || '').toLowerCase().replace(/[’']s\b/g, '').replace(/[’']/g, '').split(/[^a-z0-9à-ÿ+]+/).filter((w) => (w.length >= 4 || /\d/.test(w)) && !STOP.has(w)))
const textOf = (i) => `${i.title} ${(i.summary || '').slice(0, 300)}`
// Hetzelfde onderwerp: drie gedeelde woorden in de kop, twee gedeelde zeldzame woorden in de
// kop, of drie in kop en intro samen. Zeldzaam (`df`): in hooguit twee stukken van de week;
// "meta" en "ai" staan overal, "dv360" of "apple music" niet.
//
// Cijfers en namen (Selectie-review 14 november, punt 3). "Nintendo", "Switch" en "2" maakten van een recensie van
// Guardians of the Galaxy en drie berichten over de verkoop van de Switch 2 één verhaal. Nu:
// - een klein getal, een versienummer of een jaartal telt niet als gedeeld woord ("2", "27.3", "2026"); een getal van
//   drie cijfers of meer wel ("2.800 jaar", "DV360"), maar nooit als enige grond;
// - er moet minstens één gedeeld inhoudswoord bij zijn dat geen naam is ("prijsverhoging", "biennial", "minus"), of
//   minstens vier gedeelde namen en getallen samen (Peter Isaac, Jumbo, België: dezelfde persoon bij hetzelfde bedrijf).
// Een naam herkennen we aan de schrijfwijze in de twee stukken zelf: in een gewone zin (kop of intro) met een hoofdletter
// en nergens met een kleine letter, of met een hoofdletter binnen het woord (iPhone, watchOS). Een kop met Elk Woord Met
// Een Hoofdletter zegt alleen iets via zijn kleine letters; komt een woord verder nergens voor, dan telt het als gewoon
// woord. Een gewoon woord vooraan in de zin ("Recensie", "Kabinet") kan zo voor een naam doorgaan; dat is de veilige kant.
const CASE_TOKEN = /[\p{L}\p{N}+]+/gu
const titleCase = (t = '') => {
  const ws = (t.match(/\p{L}{4,}/gu) || []).filter((w) => !STOP.has(w.toLowerCase()))
  return ws.length >= 3 && ws.filter((w) => /^\p{Lu}/u.test(w)).length / ws.length >= 0.75
}
// De schrijfwijze per stuk, één keer per stuk uitgerekend (een samenstelling vergelijkt duizenden paren).
const caseMemo = new WeakMap()
function caseOf(it) {
  let c = caseMemo.get(it)
  if (c) return c
  c = { up: new Set(), low: new Set(), mixed: new Set() }
  for (const [text, plain] of [
    [it.title || '', !titleCase(it.title)],
    [(it.summary || '').slice(0, 300), true],
  ]) {
    for (const [tok] of text.matchAll(CASE_TOKEN)) {
      const w = tok.toLowerCase()
      if (/\p{Ll}\p{Lu}/u.test(tok)) c.mixed.add(w)
      if (/^\p{Ll}/u.test(tok)) c.low.add(w)
      else if (plain && /^\p{Lu}/u.test(tok)) c.up.add(w)
    }
  }
  caseMemo.set(it, c)
  return c
}
const isName = (w, ca, cb) => ca.mixed.has(w) || cb.mixed.has(w) || ((ca.up.has(w) || cb.up.has(w)) && !ca.low.has(w) && !cb.low.has(w))
const wordMemo = new WeakMap()
const wordsOf = (it) => {
  let m = wordMemo.get(it)
  if (!m || m.title !== it.title || m.summary !== it.summary) wordMemo.set(it, (m = { title: it.title, summary: it.summary, head: words(it.title), all: words(textOf(it)) }))
  return m
}
const counts = (w) => !/\d/.test(w) || (w.replace(/\D/g, '').length >= 3 && !/^(19|20)\d\d$/.test(w))
export function sameSubject(a, b, df = new Map()) {
  if (a.url && a.url === b.url) return true
  const rare = (w) => (df.get(w) || 0) <= 2
  const grounded = (ws) => {
    if (ws.length >= 4) return true
    const ca = caseOf(a)
    const cb = caseOf(b)
    return ws.some((w) => !/\d/.test(w) && !isName(w, ca, cb))
  }
  const wa = wordsOf(a)
  const wb = wordsOf(b)
  const shared = [...wa.head].filter((w) => wb.head.has(w) && counts(w))
  if ((shared.length >= 3 || shared.filter(rare).length >= 2) && grounded(shared)) return true
  const both = [...wa.all].filter((w) => wb.all.has(w) && rare(w) && counts(w))
  return both.length >= 3 && grounded(both)
}

const WEIGHT = { expert: 3, vakblad: 2, curator: 2, community: 1, officieel: 1 }
// Leesvoer, geen nieuws van de week (Selectie · fase 3): in deze onderwerpen staan analyse- en achtergrondbronnen in
// plaats van de nieuwsfeeds van kranten. Sinds de keuzeregel met drie plekken (15 november, hieronder) geldt in alle
// onderwerpen dezelfde regel; de lijst blijft voor de samenstelling van de bronnen (tests/selectie-fase3.test.mjs).
export const LEESVOER = new Set(['politiek', 'economie', 'sport', 'film', 'muziek'])

// ---- De keuzeregel: drie plekken, elk met een eigen grond (Selectie-review 14 november, punt 1; besluit 15 november) ----
// Eén regel voor alle onderwerpen. De top vult zich in deze volgorde:
//   1. het verhaal van de week: een groep waar minstens drie echte bronnen over schreven (een curator telt niet), en
//      geen personeelsbericht (wie komt, gaat of benoemd wordt);
//   2. een kenner: het langste stuk van een kenner (leestijd uit de feed), niet het nieuwste;
//   3. de rest op de gewone stand (gewicht van de schrijver, andere bronnen, gekozen door een redactie). Is alles in de
//      top tot dan Engels, dan gaat de laatste plek eerst naar het beste Nederlandse stuk.
// Bij gelijke stand wijkt een bron die vorige week in de top van dit onderwerp stond (`previous`): zo rouleert het.
// De afwisseling blijft: hooguit één stuk per bron en één betaald stuk in de top, niets uit de Editie van die week.
export const STORY_SOURCES = 3
// Personeelsberichten en accountnieuws: "Annechien Steenhuizen terug bij NOS Journaal", "Account-update: Conscious Group
// checkt in bij Gardeners", "Directeur Jumbo België vertrekt", "X names Y as CEO". Ze blijven in de Selectie, maar zijn
// nooit het verhaal van de week: dat zij met drie bronnen komen, zegt iets over het persbericht, niet over het belang.
const PEOPLE_NEWS = /\b(?:terug (?:bij|naar)|keert terug bij|vertrekt(?: bij| als)?|stapt (?:op|over)|maakt (?:de )?overstap|overstap naar|benoemd|aangesteld|treedt aan|aan de slag (?:als|bij)|neemt afscheid|nieuwe (?:ceo|cmo|cfo|cto|coo|directeur|directrice|topman|topvrouw|voorzitter|president|hoofdredacteur|creative director|baas)|checkt in bij|account-?updates?|accountwissel\w*|personalia|joins|appointed|appoints|hires|hired|names\s+(?:[\p{L}'’.-]+\s+){1,4}(?:as\s+)?(?:new\s+)?(?:ceo|cmo|cfo|cto|chief|president|head|editor)|steps? down|to step down|departs|promoted to|new (?:ceo|cmo|cfo|cto|chief\s+\w+|head of|editor)|people moves)\b/iu
export const isPeopleNews = (title = '') => PEOPLE_NEWS.test(title)
// Vooral Engelstalig (Selectie-review punt 5 en fase 6; taalkeuze 15 november): een onderwerp met minder dan drie
// Nederlandstalige bronnen (en meer Engelse), of waarvan driekwart of meer van de bronnen Engels schrijft, zegt dat in
// zijn omschrijving.
// Nu: SEO & content, UI/UX, Digitaal ontwerp, Development en Productmanagement. Komt er een Nederlandse bron bij, dan
// verdwijnt het label vanzelf. Server: web en app krijgen het tegelijk, zonder app-update.
export const MOSTLY_EN_LABEL = 'Vooral Engelstalig'
export function mostlyEnglish(fieldId, sources = VAK_SOURCES) {
  const mine = sources.filter((s) => s.fields.includes(fieldId))
  const nl = mine.filter((s) => s.lang === 'nl').length
  const en = mine.filter((s) => s.lang === 'en').length
  return mine.length > 0 && ((nl < 3 && en > nl) || en / mine.length >= 0.75)
}

// Stond dit stuk (zelfde link of zelfde verhaal) deze week al in een Editie? `editie`: de stukken van de bewaarde
// Edities van de week ({ title, url }), zie editieItems in vakRefresh.mjs. Zo'n stuk komt niet in de top.
function editieMatcher(editie = []) {
  if (!editie.length) return () => false
  const links = new Set(editie.map((e) => cleanLink(e.url)).filter(Boolean))
  // Zelfde verhaal: drie gedeelde woorden in de kop ("Jensen", "Nvidia", "Huang"; "John", "Harrison", "Booker"). Strenger
  // dan sameSubject binnen de Selectie: twee woorden als "wins" en "prize" maken nog geen zelfde verhaal (een
  // bordspelprijs is geen Booker Prize), ook niet als ze zeldzaam zijn.
  const heads = editie.filter((e) => e.title).map((e) => words(e.title))
  return (items) =>
    items.some((i) => {
      if (i.url && links.has(cleanLink(i.url))) return true
      const t = [...words(i.title)]
      return heads.some((h) => t.filter((w) => h.has(w)).length >= 3)
    })
}
const cleanLink = (u) => (u || '').replace(/[?#].*$/, '').replace(/\/$/, '').replace(/^https?:\/\/(www\.)?/, '')
const prettyHost = (u) => hostname(u).replace(/^www\./, '')

// Welk vakgebied krijgt dit stuk? Het eerste dat past; null als geen enkel past.
// `kenner` (Selectie-review 14 november, punt 2): ook een kenner met één onderwerp en zonder `filter` doet de
// onderwerptoets. Mist hij die en gaat het stuk over iets naast zijn vak (besideField: games, een horloge, een lader),
// dan telt het die week niet mee ("Ultima and Wing Commander Remasters" bij Leiderschap & management). Alleen bij het
// samenstellen: in de voorraad blijft het stuk bewaard.
export function fieldOf(it, src, { kenner = false } = {}) {
  for (const f of src.fields) {
    if (src.fields.length > 1 || src.filter) {
      if (FITS[f]?.test(`${it.title} ${it.summary || ''}`)) return f
    } else if (kenner && src.kind === 'expert' && FITS[f] && !FITS[f].test(`${it.title} ${it.summary || ''}`) && besideField(it, f)) return null
    else return f
  }
  return null
}

// Sidebar linkt ook naar producten en tools (een homepage): geen stuk om te lezen.
const SHORTENER = /^(bit\.ly|t\.co|tinyurl\.com|buff\.ly|ow\.ly)$/
export function isArticleLink(url) {
  try {
    const u = new URL(url)
    return !SHORTENER.test(u.hostname.replace(/^www\./, '')) && u.pathname.replace(/\/+$/, '').length > 1
  } catch {
    return false
  }
}

// De Vakweek samenstellen uit de voorraad (alle stukken van de afgelopen weken).
// `since`: sinds wanneer we verzamelen. Is dat later dan het begin van de week, dan is die week
// niet compleet: dan een voorproefje over de afgelopen zeven dagen (tot de eerste volle week).
// De week waarover we samenstellen: de volle Vakweek, of het voorproefje over de afgelopen zeven dagen.
export function vakRange(now = Date.now(), since = null) {
  const full = vakWeek(now)
  const preview = !!since && since > full.from
  return { preview, wk: preview ? { ...full, from: new Date(now - 7 * 864e5).toISOString(), to: new Date(now).toISOString() } : full }
}
// De dagdelen van de Editie in die week (id's als in netlify/lib/build.mjs: 2026-11-12-ochtend), in Amsterdamse dagen.
const AMS_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' })
export function editieSlotIds({ from, to }) {
  const days = new Set()
  for (let t = Date.parse(from); t < Date.parse(to) + 864e5; t += 864e5) days.add(AMS_DAY.format(new Date(Math.min(t, Date.parse(to)))))
  return [...days].flatMap((d) => ['ochtend', 'middag', 'avond'].map((s) => `${d}-${s}`))
}

// `keep` (Selectie-review 14 november, punt 10): per onderwerp de id's van de stukken die al in de top van deze week
// stonden. Op maandagochtend stellen we elk uur opnieuw samen; wat al in de top stond blijft op zijn plek (met hetzelfde
// stuk vooraan in zijn groep), er komt alleen bij wat ontbrak. Zo verspringt er niets voor wie al las.
// `previous` (keuzeregel, 15 november): per onderwerp de bron-id's uit de top van vorige week (topSources); die wijken
// bij gelijke stand.
export function composeVak(pool, { now = Date.now(), sources = VAK_SOURCES, top = 3, more = 5, since = null, editie = [], keep = {}, previous = {} } = {}) {
  const { preview, wk } = vakRange(now, since)
  const byId = new Map(sources.map((s) => [s.id, s]))
  const inWeek = pool.filter((i) => i.publishedAt >= wk.from && i.publishedAt < wk.to && byId.has(i.source) && isReading(i, byId.get(i.source)) && inReaderLang(i, byId.get(i.source)) && (byId.get(i.source).kind !== 'curator' || isArticleLink(i.url)))

  const df = new Map()
  for (const it of inWeek) for (const w of words(textOf(it))) df.set(w, (df.get(w) || 0) + 1)
  const inEditie = editieMatcher(editie)
  // Alleen onderwerpen met bronnen (een nieuw onderwerp zonder bronnen staat nog niet in de keuze).
  const covered = new Set(sources.flatMap((s) => s.fields))
  const fields = VAK_FIELDS.filter((f) => covered.has(f.id)).map((f) => {
    const its = inWeek.filter((i) => fieldOf(i, byId.get(i.source), { kenner: true }) === f.id)
    const keepIds = new Set(keep[f.id] || [])
    const wasTop = new Set(previous[f.id] || [])
    const nSrc = new Map() // per stuk: hoeveel echte bronnen erover schreven (voor het verhaal van de week)
    // Groepen: stukken over hetzelfde, uit verschillende bronnen.
    const groups = []
    for (const it of its) {
      // Vergelijken met het eerste stuk van een groep (niet met elk stuk: anders ketent het door).
      const g = groups.find((gr) => sameSubject(gr.items[0], it, df))
      g ? g.items.push(it) : groups.push({ items: [it] })
    }
    const hidden = new Set() // stond deze week al in een Editie: niet in de top
    const ids = new Map() // per stuk de id's van zijn groep (voor `keep`)
    const scored = groups.map((g) => {
      // Bronnen die erover schreven: een curator (Sidebar) linkt alleen en telt niet mee (Selectie-review, punt 3).
      const srcs = new Set(g.items.filter((i) => byId.get(i.source).kind !== 'curator').map((i) => i.source))
      // Gekozen door Sidebar telt als signaal als een andere bron het stuk (of onderwerp) ook heeft.
      const picked = g.items.some((i) => byId.get(i.source).kind === 'curator') && g.items.some((i) => byId.get(i.source).kind !== 'curator')
      // Het stuk dat we tonen: van de zwaarste bron; Sidebar zelf alleen als er niets anders is.
      const rank = (i) => (byId.get(i.source).kind === 'curator' ? 0 : WEIGHT[byId.get(i.source).kind]) * 10 + (i.author ? 2 : 0) + (i.summary ? 1 : 0)
      const kept = keepIds.size ? g.items.find((i) => keepIds.has(i.id)) : null
      const lead = kept || [...g.items].sort((a, b) => rank(b) - rank(a) || (a.publishedAt < b.publishedAt ? -1 : 1))[0]
      const src = byId.get(lead.source)
      const extra = 2.5 * Math.max(0, srcs.size - 1) + (picked ? 3 : 0) + (lead.author ? 0.5 : 0) + (lead.summary ? 0.5 : 0)
      // Eén stand voor alle onderwerpen (keuzeregel, 15 november): de plekken hieronder geven elk hun eigen grond.
      const score = WEIGHT[src.kind] + extra
      // Geen telregel ("N vakbronnen schreven erover") meer: de andere bronnen staan bij naam onder de kaart ("Ook bij …",
      // `also`), web en app gelijk (Selectie-review, punt 3).
      const why = []
      const chooser = g.items.map((i) => byId.get(i.source)).find((x) => x.kind === 'curator')
      if (picked || src.kind === 'curator') why.push(`Gekozen door de redactie van ${chooser.name}`)
      if (src.kind === 'expert' && src.about) why.push(src.about) // de naam staat al bij de bron
      const curator = src.kind === 'curator'
      const entry = {
        ...lead,
        title: cleanTitle(lead.title),
        // Het merkbeeld van de bron zoals het nu is, ook voor een stuk dat al in de voorraad stond (mergePool houdt het oude
        // stuk, met het oude beeld): zo wisselt een nieuw logo (de rode O van de NOS, 15 november) meteen.
        ...(src.logo && !curator ? { avatar: src.logo, avatarContain: false } : {}),
        // Een Sidebar-link wijst naar een stuk elders: toon die site als bron.
        sourceName: curator ? prettyHost(lead.url) : lead.sourceName,
        via: curator ? src.name : null,
        // Betaald: "Abonnement" in de bronregel (web en app). Een Sidebar-link wijst naar een site die we niet kennen.
        paid: !curator && !!src.paid,
        // De taal van het stuk (de feed bepaalt hem per stuk, anders die van de bron): de schakelaar "Ook Engelstalige
        // stukken" op web en in de app (taalkeuze, 15 november).
        lang: lead.lang || src.lang || null,
        why,
        // Ook bij: elke andere bron één keer, bij naam (niet drie keer Eurogamer), in een vaste volgorde (oudste eerst, dan
        // de naam), zodat een nieuwe samenstelling zonder nieuws precies dezelfde bundel geeft.
        also: g.items
          .filter((i) => i.source !== lead.source && byId.get(i.source).kind !== 'curator' && cleanLink(i.url) !== cleanLink(lead.url))
          .sort((x, y) => (x.publishedAt < y.publishedAt ? -1 : x.publishedAt > y.publishedAt ? 1 : String(x.sourceName).localeCompare(String(y.sourceName))))
          .filter((i, k, all) => all.findIndex((x) => x.sourceName === i.sourceName) === k)
          .map((i) => ({ sourceName: i.sourceName, url: i.url, title: i.title })),
        score,
      }
      if (inEditie(g.items)) hidden.add(entry)
      ids.set(entry, g.items.map((i) => i.id))
      nSrc.set(entry, srcs.size)
      delete entry.text
      delete entry.cats
      delete entry.ogTried
      return entry
    })
    // Bij gelijke stand wijkt een bron die vorige week in de top stond (keuzeregel, rouleren). Bij helemaal gelijke stand
    // beslist de id: dezelfde voorraad geeft altijd dezelfde volgorde (punt 10).
    const before = (e) => (wasTop.has(e.source) ? 1 : 0)
    scored.sort((a, b) => b.score - a.score || before(a) - before(b) || b.also.length - a.also.length || (a.publishedAt > b.publishedAt ? -1 : a.publishedAt < b.publishedAt ? 1 : a.id < b.id ? -1 : 1))
    // Afwisseling: in de top hooguit één stuk per bron, daaronder hooguit twee.
    // `paidMax`: in de top hooguit één betaald stuk (Selectie-review, punt 9): van drie stukken kun je er dan hooguit één
    // niet lezen zonder abonnement.
    const keyOf = (e) => (e.via ? 'sidebar:' + e.sourceName : e.source)
    const pick = (list, n, perSource, paidMax = Infinity, seed = []) => {
      const out = [...seed]
      const count = {}
      let paid = 0
      for (const e of seed) {
        count[keyOf(e)] = (count[keyOf(e)] || 0) + 1
        if (e.paid) paid++
      }
      for (const e of list) {
        if (out.length >= n) break
        const key = keyOf(e)
        if (out.includes(e) || (count[key] || 0) >= perSource) continue
        if (e.paid && paid >= paidMax) continue
        count[key] = (count[key] || 0) + 1
        if (e.paid) paid++
        out.push(e)
      }
      return out
    }
    // Een bedrijfsblog (Meta, Figma) haalt de top alleen als ook anderen erover schrijven.
    // Wat al in de top stond eerst, in de volgorde van toen (ook als het nu anders zou scoren of in een Editie stond).
    const seed = [...keepIds].map((id) => scored.find((e) => ids.get(e).includes(id))).filter((e, k, all) => e && all.indexOf(e) === k).slice(0, top)
    const open = scored.filter((e) => !seed.includes(e) && !hidden.has(e) && (byId.get(e.source).kind !== 'officieel' || e.also.length))
    // De drie plekken (keuzeregel, 15 november). Elke plek neemt de eerste kandidaat die de afwisseling toelaat.
    const story = open.filter((e) => nSrc.get(e) >= STORY_SOURCES && !isPeopleNews(e.title)).sort((a, b) => nSrc.get(b) - nSrc.get(a) || scored.indexOf(a) - scored.indexOf(b))
    const expert = open.filter((e) => byId.get(e.source).kind === 'expert').sort((a, b) => (b.readMin || 0) - (a.readMin || 0) || scored.indexOf(a) - scored.indexOf(b))
    let topList = seed.slice(0, top)
    const add = (list) => (topList = pick(list, Math.min(top, topList.length + 1), 1, 1, topList))
    add(story)
    add(expert)
    // De rest op de stand; is alles tot de laatste plek Engels, dan eerst het beste Nederlandse stuk.
    topList = pick(open, Math.max(topList.length, top - 1), 1, 1, topList)
    if (topList.length === top - 1 && topList.length && topList.every((e) => e.lang === 'en')) add(open.filter((e) => e.lang === 'nl'))
    topList = pick(open, top, 1, 1, topList)
    const rest = pick(scored.filter((e) => !topList.includes(e)), more, 2)
    return { ...f, ...(mostlyEnglish(f.id, sources) ? { about: `${f.about} · ${MOSTLY_EN_LABEL}`, en: true } : {}), count: its.length, top: topList, more: rest }
  })

  return {
    id: wk.id,
    week: wk.week,
    preview,
    from: wk.from,
    to: wk.to,
    next: wk.next,
    builtAt: new Date(now).toISOString(),
    fields,
    sources: sources.map((s) => ({ id: s.id, name: s.name, kind: s.kind, fields: s.fields, about: s.about || null, ...(s.paid ? { paid: true } : {}) })),
  }
}

// ---- Beeld: de deelafbeelding van het artikel zelf ----
// Veel vakfeeds leveren geen beeld (AdExchanger, Nielsen Norman Group, Sidebar-links) of een
// postzegel (WordPress "-300x157"). De deelafbeelding (og:image) van het artikel is dan het beeld
// dat de schrijver zelf koos (zie og.mjs).
const SMALL_WP = /-(\d{2,3})x\d{2,4}\.(jpe?g|png|webp)(\?|$)/i
export const wantsOgImage = (it) => !it.ogTried && (!it.image || (SMALL_WP.test(it.image) && Number(it.image.match(SMALL_WP)[1]) < 600))
// Per ronde hooguit `max` stukken: eerst wat in de digest staat (`first`), dan de nieuwste;
// elk stuk één keer proberen. Na `deadline` (ms sinds 1970) begint er geen nieuw groepje meer, en wacht elk beeld
// hooguit tot die eindtijd: wat niet aan de beurt kwam, blijft voor de volgende ronde (B13).
export async function addOgImages(pool, { max = 24, first = new Set(), load = loadOgImage, deadline = Infinity } = {}) {
  const todo = pool
    .filter(wantsOgImage)
    .sort((a, b) => first.has(b.id) - first.has(a.id) || (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, max)
  let tried = 0
  for (let i = 0; i < todo.length; i += 6) {
    const left = deadline - Date.now()
    if (left < 1000) break
    const batch = todo.slice(i, i + 6)
    tried += batch.length
    await Promise.all(
      batch.map(async (it) => {
        const img = await load(it.url, Number.isFinite(left) ? { timeout: Math.min(6000, left) } : undefined)
        if (img) it.image = img
        it.ogTried = true
      }),
    )
  }
  return tried
}

// ---- Ophalen en bewaren ----
const KEEP_DAYS = 16
// Hooguit `concurrency` feeds tegelijk, en na `deadline` (ms sinds 1970) begint er geen nieuwe meer en wachten we niet
// langer: wat dan nog niet klaar is, telt als niet geprobeerd (`skipped`) en niet als mislukt (B13: een ronde die de
// tijdgrens van de functie haalt niet, schrijft niets weg). `load`: alleen voor toetsen.
export const VAK_CONCURRENCY = 24
export async function loadVakItems(sources = VAK_SOURCES, { concurrency = VAK_CONCURRENCY, deadline = Infinity, load = loadSourceWithRetry } = {}) {
  // Het merkbeeld (13 november 2026): `logo` of `x` neemt loadSource zelf; een `bsky`-profielbeeld vragen we hier op.
  const withBsky = sources.filter((s) => s.bsky && !s.logo)
  const avatars = withBsky.length ? loadSourceAvatars(withBsky).catch(() => ({})) : Promise.resolve({})
  const opts = Number.isFinite(deadline) ? { deadline } : {}
  const done = new Array(sources.length).fill(null)
  let next = 0
  const worker = async () => {
    while (next < sources.length && Date.now() < deadline) {
      const k = next++
      done[k] = await load(sources[k], avatars, opts)
    }
  }
  const workers = Promise.all(Array.from({ length: Math.min(concurrency, sources.length) }, worker))
  if (Number.isFinite(deadline)) {
    let timer
    await Promise.race([workers, new Promise((r) => (timer = setTimeout(r, Math.max(0, deadline - Date.now()))))])
    clearTimeout(timer)
  } else await workers
  const skipped = (s) => ({ id: s.id, name: s.name, ok: false, skipped: true, count: 0, items: [] })
  const results = sources.map((s, k) => done[k] || skipped(s))
  const newest = (r) => r.items.reduce((m, i) => (i.publishedAt && i.publishedAt > m ? i.publishedAt : m), '') || null
  // Alleen wat bij een onderwerp past en om te lezen is: brede bronnen (een krant, een
  // rubrieksfeed) leveren veel meer dan we bewaren willen.
  const byId = new Map(sources.map((s) => [s.id, s]))
  // Een bericht in een andere taal dan zijn bron (ArchiNed in het Engels) valt af: zie vakLang.
  const keep = (i) => byId.has(i.source) && visibleFor(i) && isReading(i, byId.get(i.source)) && fieldOf(i, byId.get(i.source))
  // De artikeltekst en rubrieken hebben we hier niet nodig; mediaType, feedMark en podcastEpisode blijven (hardMark
  // kijkt er in composeVak opnieuw naar).
  const slim = ({ text, cats, ...it }) => it
  return { items: results.flatMap((r) => r.items).filter(keep).map(slim), status: results.map((r) => (r.skipped ? { id: r.id, skipped: true } : { id: r.id, ok: r.ok, count: r.count, newest: newest(r), ...(r.ok ? {} : { error: r.error || null, refused: !!r.refused }) })) }
}

// ---- Gezondheid: elk uur bijgehouden ----
// Een bron die een week lang niet laadt, of al twee maanden niets nieuws plaatst, gaat op pauze:
// dan halen we hem niet meer elk uur op. Elk uur proberen we er een paar opnieuw (RETRY_PER_HOUR, de
// langst niet geprobeerde eerst): wie weer werkt, doet weer mee. De reden van de laatste mislukking
// bewaren we (`lastError`), en een bron die ons weigert (401, 403, 429, een botcontrole) heet 'geweigerd'
// in plaats van 'kapot' (B13, nachttest 14 november).
const BROKEN_DAYS = 7
const SILENT_DAYS = 60
// Een foutmelding op één regel en kort (de parser geeft er soms vier regels).
export const oneLine = (e) => String(e || 'onbekend').replace(/\s+/g, ' ').trim().slice(0, 200)
// Niet aan de beurt gekomen (dubbelcheck 14 november, A4): geen oordeel over de bron, maar we tellen hoe vaak het achter
// elkaar gebeurde (`skips`, `lastSkip`). Een poging zet de telling terug op nul. Een bron die zo een week geen poging
// kreeg, staat niet meer op ok maar op 'overgeslagen' (healthOf), en komt dan vooraan bij de herkansing.
export function updateHealth(health = {}, status = [], now = Date.now()) {
  const at = new Date(now).toISOString()
  const out = { ...health }
  for (const r of status) {
    const h = { ...(out[r.id] || { since: at }) }
    if (r.skipped) {
      h.skips = (h.skips || 0) + 1
      h.lastSkip = at
      out[r.id] = h
      continue
    }
    delete h.skips
    if (r.ok) {
      h.lastOk = at
      delete h.refused
    } else {
      h.lastFail = at
      h.lastError = oneLine(r.error)
      h.lastErrorAt = at
      h.refused = !!r.refused
    }
    if (r.newest && (!h.newest || r.newest > h.newest)) h.newest = r.newest
    out[r.id] = h
  }
  return out
}
export function healthOf(h, now = Date.now()) {
  if (!h) return 'nieuw'
  const days = (iso) => (iso ? (now - Date.parse(iso)) / 864e5 : Infinity)
  if (days(h.lastOk) > BROKEN_DAYS && days(h.since) > BROKEN_DAYS) return h.skips ? 'overgeslagen' : h.refused ? 'geweigerd' : 'kapot'
  if (!h.lastOk && !h.lastFail) return 'nieuw' // nog nooit aan de beurt geweest: geen oordeel
  if (days(h.newest) > SILENT_DAYS && days(h.since) > BROKEN_DAYS) return 'stil'
  return 'ok'
}
// Welke bronnen we deze ronde ophalen: wat niet op pauze staat, om het uur de ene of de andere helft (een feed bewaart
// dagen, en zo blijft één ronde ruim binnen de tijd van een geplande functie), plus hooguit RETRY_PER_HOUR bronnen op
// pauze, de langst niet geprobeerde eerst. Die staan vooraan, zodat ze ook in een krappe ronde aan de beurt komen.
// Vroeger kwamen ze alleen op maandagochtend terug, samen met alle bronnen tegelijk; die ronde haalde de tijdgrens niet
// en schreef niets weg, zodat een tijdelijke fout een blijvende pauze werd (B13).
// Gezond: wat we ophalen en wat het weekoverzicht als gezond telt. Een nieuwe bron heeft nog geen oordeel en telt mee.
// Op pauze: kapot, geweigerd, stil, of overgeslagen (een week geen poging gekregen, A4).
const GEZOND = ['ok', 'nieuw']
export const RETRY_PER_HOUR = 10
const half = (id) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 2
const lastTry = (h) => [h?.lastOk, h?.lastFail, h?.since].filter(Boolean).sort().pop() || ''
// De laatste echte poging (geslaagd of mislukt); nog nooit geprobeerd is '' en komt dus eerst.
const lastAttempt = (h) => [h?.lastOk, h?.lastFail].filter(Boolean).sort().pop() || ''
export function sourcesToLoad(health = {}, now = Date.now(), sources = VAK_SOURCES, { split = sources.length > 150, retry = RETRY_PER_HOUR } = {}) {
  const p = Object.fromEntries(AMS.formatToParts(new Date(now)).map((x) => [x.type, x.value]))
  const healthy = sources.filter((s) => GEZOND.includes(healthOf(health[s.id], now)))
  const paused = sources
    .filter((s) => !healthy.includes(s))
    .map((s, k) => [s, lastTry(health[s.id]), k])
    .sort(([, a, ka], [, b, kb]) => (a < b ? -1 : a > b ? 1 : ka - kb))
    .slice(0, retry)
    .map(([s]) => s)
  // Rotatie op de laatste poging (dubbelcheck 14 november, A4): de gezonde bronnen die het langst geen poging kregen, eerst
  // (bij gelijke stand de volgorde van de catalogus). Wie deze ronde niet aan de beurt kwam, staat de volgende ronde vooraan,
  // zodat de tijdgrens van een ronde nooit elk uur dezelfde bronnen achteraan overslaat.
  const turn = healthy
    .filter((s) => !split || half(s.id) === Number(p.hour) % 2)
    .map((s, k) => [s, lastAttempt(health[s.id]), k])
    .sort(([, a, ka], [, b, kb]) => (a < b ? -1 : a > b ? 1 : ka - kb))
    .map(([s]) => s)
  return [...paused, ...turn]
}
// Het weekoverzicht: per onderwerp hoeveel bronnen gezond zijn, en welke op pauze staan.
export function healthReport(health = {}, now = Date.now(), sources = VAK_SOURCES) {
  const rows = sources.map((s) => {
    const h = health[s.id]
    return { id: s.id, name: s.name, fields: s.fields, url: s.urls[0], state: healthOf(h, now), skips: h?.skips || 0, lastOk: h?.lastOk || null, newest: h?.newest || null, lastError: h?.lastError || null, lastErrorAt: h?.lastErrorAt || null }
  })
  const fields = VAK_FIELDS.map((f) => {
    const mine = rows.filter((r) => r.fields.includes(f.id))
    return { id: f.id, label: f.label, sources: mine.length, healthy: mine.filter((r) => GEZOND.includes(r.state)).length }
  }).filter((f) => f.sources)
  return { at: new Date(now).toISOString(), fields, paused: rows.filter((r) => !GEZOND.includes(r.state)) }
}

// Nieuwe stukken bij de voorraad; wat ouder is dan 16 dagen valt eruit. Per bron hooguit de
// nieuwste 60: een rubrieksfeed van een krant (sport, cultuur) levert er per dag tientallen, en
// voor de drie beste van de week is dat ruim genoeg.
const PER_SOURCE = 60
export function mergePool(pool, fresh, now = Date.now()) {
  const cutoff = new Date(now - KEEP_DAYS * 864e5).toISOString()
  const byId = new Map(pool.map((i) => [i.id, i]))
  for (const it of fresh) if (!byId.has(it.id)) byId.set(it.id, it)
  const kept = [...byId.values()].filter((i) => i.publishedAt && i.publishedAt >= cutoff).sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
  const count = {}
  return kept.filter((i) => (count[i.source] = (count[i.source] || 0) + 1) <= PER_SOURCE)
}
