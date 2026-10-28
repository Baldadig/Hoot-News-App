// Vakweek: elke maandag om 07:00 per vakgebied de drie belangrijkste stukken van de week ervoor.
// Los van het nieuws (Editie, Stroom): eigen bronnen, eigen voorraad, eigen antwoord (/api/vak).
//
// "Belangrijk" meten we niet aan leescijfers (die hebben alleen de uitgevers), maar aan drie
// zichtbare gronden:
//   1. hoeveel vakbronnen over hetzelfde schrijven;
//   2. of mensen het zelf hebben uitgekozen (de redactie van Sidebar kiest elke werkdag vijf links);
//   3. wie het schreef: een vakexpert weegt zwaarder dan een vakblad, en dat zwaarder dan een
//      bedrijfsblog.
// Alleen mensenwerk: redactionele bronnen en vakmensen met naam; geen gesponsorde stukken,
// webinars, podcasts, vacatures of "10 tools"-lijstjes. Geen AI-tekst: bij elk stuk staat de
// eigen intro van de schrijver.
import { loadSourceWithRetry } from './rss.mjs'
import { tzOffsetMs, hostname } from './text.mjs'
import { loadOgImage } from './og.mjs'
export { ogImageFrom, loadOgImage } from './og.mjs'
import { VAK_FIELDS, VAK_FIELD_IDS } from '../../shared/vak.mjs'

const V = (id, name, kind, fields, url, more = {}) => ({ id: 'vak:' + id, name, kind, fields, urls: [url], cat: 'vak', ...more })

// kind: expert (vakmens met naam) · vakblad · curator (mensen kiezen links) · community · officieel
// `filter`: de bron schrijft ook over andere dingen; alleen wat bij het vakgebied past telt mee.
export const VAK_SOURCES = [
  // Paid social
  V('jonloomer', 'Jon Loomer', 'expert', ['paid-social'], 'https://www.jonloomer.com/feed/', { about: 'Specialist in Meta-advertenties' }),
  V('socialmediatoday', 'Social Media Today', 'vakblad', ['paid-social'], 'https://www.socialmediatoday.com/feeds/news/', { filter: true }),
  V('socialmediaexaminer', 'Social Media Examiner', 'vakblad', ['paid-social'], 'https://www.socialmediaexaminer.com/feed/', { filter: true }),
  V('digiday', 'Digiday', 'vakblad', ['paid-social'], 'https://digiday.com/feed/', { filter: true }),
  V('adexchanger', 'AdExchanger', 'vakblad', ['paid-social'], 'https://www.adexchanger.com/feed/', { filter: true }),
  V('adweek', 'Adweek', 'vakblad', ['paid-social', 'merk'], 'https://www.adweek.com/feed/', { filter: true }),
  V('ppcland', 'PPC Land', 'vakblad', ['paid-social'], 'https://ppc.land/rss/', { filter: true }),
  V('sej-paid', 'Search Engine Journal', 'vakblad', ['paid-social'], 'https://www.searchenginejournal.com/category/paid-media/feed/', { filter: true }),
  V('marketingfacts', 'Marketingfacts', 'vakblad', ['paid-social', 'seo', 'merk'], 'https://www.marketingfacts.nl/rss', { filter: true }),
  V('emerce', 'Emerce', 'vakblad', ['paid-social', 'ecommerce', 'ai', 'seo', 'ondernemen'], 'https://www.emerce.nl/rss', { filter: true }),
  V('meta', 'Meta Newsroom', 'officieel', ['paid-social'], 'https://about.fb.com/feed/', { filter: true }),
  // UI/UX
  V('nngroup', 'Nielsen Norman Group', 'expert', ['ux'], 'https://www.nngroup.com/feed/rss/', { about: 'Onderzoek naar gebruiksvriendelijkheid' }),
  V('lukew', 'Luke Wroblewski', 'expert', ['ux'], 'https://www.lukew.com/ff/rss.asp', { about: 'Productontwerper, schrijft over interfaces' }),
  V('bradfrost', 'Brad Frost', 'expert', ['ux'], 'https://bradfrost.com/feed/', { about: 'Bedenker van Atomic Design' }),
  V('smashing', 'Smashing Magazine', 'vakblad', ['ux'], 'https://www.smashingmagazine.com/feed/', { filter: true }),
  V('alistapart', 'A List Apart', 'vakblad', ['ux'], 'https://alistapart.com/main/feed/'),
  V('uxcollective', 'UX Collective', 'community', ['ux'], 'https://uxdesign.cc/feed'),
  V('figma', 'Figma', 'officieel', ['ux'], 'https://www.figma.com/blog/feed/atom.xml'),
  // Digital Design
  V('creativereview', 'Creative Review', 'vakblad', ['design', 'merk'], 'https://www.creativereview.co.uk/feed/', { filter: true }),
  V('designweek', 'Design Week', 'vakblad', ['design'], 'https://www.designweek.co.uk/feed/', { filter: true }),
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
  // Merk & reclame: de Nederlandse vakbladen (Adformatie, MarketingTribune), de internationale, en merkstrategen met naam. Adweek en Creative Review staan hierboven.
  V('adformatie', 'Adformatie', 'vakblad', ['merk'], 'https://www.adformatie.nl/feeds/articles.rss', { filter: true }),
  V('marketingtribune', 'MarketingTribune', 'vakblad', ['merk'], 'https://www.marketingtribune.nl/rss/rss.xml', { filter: true }),
  V('campaign', 'Campaign', 'vakblad', ['merk'], 'https://www.campaignlive.com/rss/news', { filter: true }),
  V('marketingweek', 'Marketing Week', 'vakblad', ['merk'], 'https://www.marketingweek.com/feed/', { filter: true }),
  V('musebyclios', 'Muse by Clio', 'vakblad', ['merk'], 'https://musebyclios.com/feed/', { filter: true }),
  V('brandingstrategy', 'Branding Strategy Insider', 'vakblad', ['merk'], 'https://brandingstrategyinsider.com/feed/'),
  V('marketoonist', 'Tom Fishburne', 'expert', ['merk'], 'https://marketoonist.com/feed', { about: 'Tekent en schrijft wekelijks over marketing (Marketoonist)', filter: true }),
  V('markschaefer', 'Mark Schaefer', 'expert', ['merk'], 'https://businessesgrow.com/feed/', { about: 'Marketingstrateeg en auteur, over merken en vertrouwen', filter: true }),
  // Startups & ondernemen: Nederlandse vakbladen (MT/Sprout, IO+), Sifted en TechCrunch, en oprichters en investeerders die zelf schrijven (Lenny en Andrew Chen staan bij Productmanagement).
  V('sprout', 'MT/Sprout', 'vakblad', ['ondernemen'], 'https://mtsprout.nl/feed', { filter: true }),
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

export { VAK_FIELDS, VAK_FIELD_IDS }

// Past een stuk bij het vakgebied? Alleen nodig voor bronnen die breder schrijven (`filter`).
const FITS = {
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

// Geen mensenwerk om te lezen (of geen artikel): reclame, aankondigingen, audio, vacatures, lijstjes.
const NOT_READING = /\b(sponsored|partner content|advertorial|presented by|webinars?|podcast|episode|register now|sign up now|giveaway|deals?|discount|coupon|vacatures?|we'?re hiring|job (opening|listing)s?|this week in|weekly (round-?up|recap)|industry news|newsletter)\b/i
const LISTICLE = /^\s*(the\s+)?\d+\s+([\w-]+\s+){0,3}(tools?|templates?|examples?|plugins?|fonts?|apps?|ways|tips|tricks|resources|mockups?|icons?)\b/i
export const cleanTitle = (t = '') => t.replace(/\s+via\s+@\w+(,\s*@\w+)*\s*$/i, '').trim()
// Verzamelingen: dagelijkse overzichten ("[AINews] …") en genummerde linklijstjes ("… (#25)").
// Ook vaste rubrieken met een datum in de kop ("New Ecommerce Tools: October 21, 2026").
const ROUNDUP = /^\s*\[[^\]]*news[^\]]*\]|\(#\d+\)|\b(roundup|round-up|links? of the week|weekly digest|daily digest)\b|:\s*(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(, \d{4})?\s*$|^\s*fragments\b/i
export const isReading = (it) => !!it.title && !NOT_READING.test(it.title) && !LISTICLE.test(it.title) && !ROUNDUP.test(it.title)

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

// ---- Over hetzelfde? Genoeg gedeelde, betekenisvolle woorden in de kop ----
const STOP = new Set('about after again against also among another because been before being between both could does doing during each from further have having here into itself just more most much must need only other over same should some such than that their them then there these they this those through under until very want were what when where which while will with would your yours year years week weeks today heres whats how why new news announces launches says adds update updates over naar voor door over deze voor zijn wordt worden heeft hebben niet meer maar onze jouw jullie'.split(' '))
const words = (t) => new Set((t || '').toLowerCase().replace(/[’']s\b/g, '').replace(/[’']/g, '').split(/[^a-z0-9à-ÿ+]+/).filter((w) => (w.length >= 4 || /\d/.test(w)) && !STOP.has(w)))
const textOf = (i) => `${i.title} ${(i.summary || '').slice(0, 300)}`
// Hetzelfde onderwerp: drie gedeelde woorden in de kop, twee gedeelde zeldzame woorden in de
// kop, of drie in kop en intro samen. Zeldzaam (`df`): in hooguit twee stukken van de week;
// "meta" en "ai" staan overal, "dv360" of "apple music" niet.
export function sameSubject(a, b, df = new Map()) {
  if (a.url && a.url === b.url) return true
  const rare = (w) => (df.get(w) || 0) <= 2
  const ta = words(a.title)
  const tb = words(b.title)
  const shared = [...ta].filter((w) => tb.has(w))
  if (shared.length >= 3 || shared.filter(rare).length >= 2) return true
  const wb = words(textOf(b))
  return [...words(textOf(a))].filter((w) => wb.has(w) && rare(w)).length >= 3
}

const WEIGHT = { expert: 3, vakblad: 2, curator: 2, community: 1, officieel: 1 }
const cleanLink = (u) => (u || '').replace(/[?#].*$/, '').replace(/\/$/, '').replace(/^https?:\/\/(www\.)?/, '')
const prettyHost = (u) => hostname(u).replace(/^www\./, '')

// Welk vakgebied krijgt dit stuk? Het eerste dat past; null als geen enkel past.
export function fieldOf(it, src) {
  for (const f of src.fields) {
    if (src.fields.length > 1 || src.filter) {
      if (FITS[f].test(`${it.title} ${it.summary || ''}`)) return f
    } else return f
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
export function composeVak(pool, { now = Date.now(), sources = VAK_SOURCES, top = 3, more = 5, since = null } = {}) {
  const full = vakWeek(now)
  const preview = !!since && since > full.from
  const wk = preview ? { ...full, from: new Date(now - 7 * 864e5).toISOString(), to: new Date(now).toISOString() } : full
  const byId = new Map(sources.map((s) => [s.id, s]))
  const inWeek = pool.filter((i) => i.publishedAt >= wk.from && i.publishedAt < wk.to && byId.has(i.source) && isReading(i) && (byId.get(i.source).kind !== 'curator' || isArticleLink(i.url)))

  const df = new Map()
  for (const it of inWeek) for (const w of words(textOf(it))) df.set(w, (df.get(w) || 0) + 1)
  const fields = VAK_FIELDS.map((f) => {
    const its = inWeek.filter((i) => fieldOf(i, byId.get(i.source)) === f.id)
    // Groepen: stukken over hetzelfde, uit verschillende bronnen.
    const groups = []
    for (const it of its) {
      // Vergelijken met het eerste stuk van een groep (niet met elk stuk: anders ketent het door).
      const g = groups.find((gr) => sameSubject(gr.items[0], it, df))
      g ? g.items.push(it) : groups.push({ items: [it] })
    }
    const scored = groups.map((g) => {
      const srcs = new Set(g.items.map((i) => i.source))
      // Gekozen door Sidebar telt als signaal als een andere bron het stuk (of onderwerp) ook heeft.
      const picked = g.items.some((i) => byId.get(i.source).kind === 'curator') && g.items.some((i) => byId.get(i.source).kind !== 'curator')
      // Het stuk dat we tonen: van de zwaarste bron; Sidebar zelf alleen als er niets anders is.
      const rank = (i) => (byId.get(i.source).kind === 'curator' ? 0 : WEIGHT[byId.get(i.source).kind]) * 10 + (i.author ? 2 : 0) + (i.summary ? 1 : 0)
      const lead = [...g.items].sort((a, b) => rank(b) - rank(a) || (a.publishedAt < b.publishedAt ? -1 : 1))[0]
      const src = byId.get(lead.source)
      const score = WEIGHT[src.kind] + 2.5 * (srcs.size - 1) + (picked ? 3 : 0) + (lead.author ? 0.5 : 0) + (lead.summary ? 0.5 : 0)
      const why = []
      if (srcs.size > 1) why.push(`${srcs.size} vakbronnen schreven erover`)
      const chooser = g.items.map((i) => byId.get(i.source)).find((x) => x.kind === 'curator')
      if (picked || src.kind === 'curator') why.push(`Gekozen door ${chooser.name}`)
      if (src.kind === 'expert' && src.about) why.push(src.about) // de naam staat al bij de bron
      const curator = src.kind === 'curator'
      const entry = {
        ...lead,
        title: cleanTitle(lead.title),
        // Een Sidebar-link wijst naar een stuk elders: toon die site als bron.
        sourceName: curator ? prettyHost(lead.url) : lead.sourceName,
        via: curator ? src.name : null,
        why,
        also: g.items.filter((i) => i.source !== lead.source && byId.get(i.source).kind !== 'curator' && cleanLink(i.url) !== cleanLink(lead.url)).map((i) => ({ sourceName: i.sourceName, url: i.url, title: i.title })),
        score,
      }
      delete entry.text
      delete entry.cats
      delete entry.ogTried
      return entry
    })
    scored.sort((a, b) => b.score - a.score || b.also.length - a.also.length || (a.publishedAt > b.publishedAt ? -1 : 1))
    // Afwisseling: in de top hooguit één stuk per bron, daaronder hooguit twee.
    const pick = (list, n, perSource) => {
      const out = []
      const count = {}
      for (const e of list) {
        if (out.length >= n) break
        const key = e.via ? 'sidebar:' + e.sourceName : e.source
        if ((count[key] || 0) >= perSource) continue
        count[key] = (count[key] || 0) + 1
        out.push(e)
      }
      return out
    }
    // Een bedrijfsblog (Meta, Figma) haalt de top alleen als ook anderen erover schrijven.
    const topList = pick(scored.filter((e) => byId.get(e.source).kind !== 'officieel' || e.also.length), top, 1)
    const rest = pick(scored.filter((e) => !topList.includes(e)), more, 2)
    return { ...f, count: its.length, top: topList, more: rest }
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
    sources: sources.map((s) => ({ id: s.id, name: s.name, kind: s.kind, fields: s.fields, about: s.about || null })),
  }
}

// ---- Beeld: de deelafbeelding van het artikel zelf ----
// Veel vakfeeds leveren geen beeld (AdExchanger, Nielsen Norman Group, Sidebar-links) of een
// postzegel (WordPress "-300x157"). De deelafbeelding (og:image) van het artikel is dan het beeld
// dat de schrijver zelf koos (zie og.mjs).
const SMALL_WP = /-(\d{2,3})x\d{2,4}\.(jpe?g|png|webp)(\?|$)/i
export const wantsOgImage = (it) => !it.ogTried && (!it.image || (SMALL_WP.test(it.image) && Number(it.image.match(SMALL_WP)[1]) < 600))
// Per ronde hooguit `max` stukken: eerst wat in de digest staat (`first`), dan de nieuwste;
// elk stuk één keer proberen.
export async function addOgImages(pool, { max = 24, first = new Set(), load = loadOgImage } = {}) {
  const todo = pool
    .filter(wantsOgImage)
    .sort((a, b) => first.has(b.id) - first.has(a.id) || (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, max)
  for (let i = 0; i < todo.length; i += 6) {
    await Promise.all(
      todo.slice(i, i + 6).map(async (it) => {
        const img = await load(it.url)
        if (img) it.image = img
        it.ogTried = true
      }),
    )
  }
  return todo.length
}

// ---- Ophalen en bewaren ----
const KEEP_DAYS = 16
export async function loadVakItems(sources = VAK_SOURCES) {
  const results = await Promise.all(sources.map((s) => loadSourceWithRetry(s, Promise.resolve({}))))
  return { items: results.flatMap((r) => r.items), status: results.map((r) => ({ id: r.id, ok: r.ok, count: r.count })) }
}

// Nieuwe stukken bij de voorraad; wat ouder is dan 16 dagen valt eruit.
export function mergePool(pool, fresh, now = Date.now()) {
  const cutoff = new Date(now - KEEP_DAYS * 864e5).toISOString()
  const byId = new Map(pool.map((i) => [i.id, i]))
  for (const it of fresh) if (!byId.has(it.id)) byId.set(it.id, it)
  return [...byId.values()].filter((i) => i.publishedAt && i.publishedAt >= cutoff)
}
