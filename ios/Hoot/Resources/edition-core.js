// Hoot — De Redacteur, rekenkern voor de iPhone. Gegenereerd uit src/lib/editionCore.js door
// scripts/build-edition-core.mjs (npm run build:core). Niet met de hand bewerken: pas de bron aan
// en bouw opnieuw. Web en app rekenen met precies deze code (bouwspec §9).
var HootCore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/lib/editionCore.js
  var editionCore_exports = {};
  __export(editionCore_exports, {
    CORE_VERSION: () => CORE_VERSION,
    HISTORY_SIZE: () => HISTORY_SIZE,
    basisOf: () => basisOf,
    compose: () => compose,
    composeEdition: () => composeEdition,
    earlierEditions: () => earlierEditions,
    earlierEditionsJSON: () => earlierEditionsJSON,
    editionBasis: () => editionBasis,
    historyJSON: () => historyJSON,
    historyOf: () => historyOf,
    mergePrevious: () => mergePrevious,
    nextHistory: () => nextHistory,
    nextHistoryJSON: () => nextHistoryJSON,
    previousFrom: () => previousFrom,
    previousJSON: () => previousJSON,
    previousOf: () => previousOf,
    profileSummary: () => profileSummary,
    profileSummaryJSON: () => profileSummaryJSON,
    profileSummaryOf: () => profileSummaryOf,
    readingSummary: () => readingSummary,
    readingSummaryJSON: () => readingSummaryJSON,
    recentEditions: () => recentEditions,
    voorstelJSON: () => voorstelJSON
  });

  // shared/edition-display.json
  var edition_display_default = {
    revision: "edition-display-2026-11-02",
    headline: {
      largeMax: 70,
      mediumMax: 100,
      halfLines: 4
    },
    intro: {
      maxPrefixes: 8,
      knownAuthor: "^(?:by|door|written by)\\s+{author}(?:[\\t ]*[·|—–:,-][\\t ]*|\\s*\\n\\s*|\\s*$)",
      rules: [
        {
          source: "^(?:last updated|updated|published|laatst bijgewerkt|bijgewerkt|gepubliceerd)(?:\\s+(?:at|on|op|om))?\\s+(?:(?:\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}|\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4}|(?:Jan(?:uary|uari)?|Feb(?:ruary|ruari)?|Mar(?:ch)?|Maart|Apr(?:il)?|May|Mei|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust|ustus)?|Sep(?:tember)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{1,2}(?:,?\\s+\\d{4})?|\\d{1,2}\\s+(?:Jan(?:uary|uari)?|Feb(?:ruary|ruari)?|Mar(?:ch)?|Maart|Apr(?:il)?|May|Mei|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust|ustus)?|Sep(?:tember)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\\s+\\d{4})?)(?:\\s+(?:at|om))?\\s+)?(?:[01]?\\d|2[0-3]):[0-5]\\d(?:\\s*[ap]\\.?m\\.?)?(?:\\s*(?:UTC|GMT|CEST|CET|EST|EDT|ET|PST|PDT|PT))?[\\t ]*[.·|—–:,-]*\\s*",
          flags: "iu"
        },
        {
          source: "^(?:last updated|updated|published|laatst bijgewerkt|bijgewerkt|gepubliceerd)(?:\\s+(?:on|op))?\\s+(?:\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}|\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4}|(?:Jan(?:uary|uari)?|Feb(?:ruary|ruari)?|Mar(?:ch)?|Maart|Apr(?:il)?|May|Mei|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust|ustus)?|Sep(?:tember)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{1,2}(?:,?\\s+\\d{4})?|\\d{1,2}\\s+(?:Jan(?:uary|uari)?|Feb(?:ruary|ruari)?|Mar(?:ch)?|Maart|Apr(?:il)?|May|Mei|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust|ustus)?|Sep(?:tember)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\\s+\\d{4})?)\\.?[\\t ]*(?:\\n|$)",
          flags: "iu"
        },
        {
          source: "^(?:[01]?\\d|2[0-3]):[0-5]\\d(?:\\s*[ap]\\.?m\\.?)?(?:\\s*(?:UTC|GMT|CEST|CET|EST|EDT|ET|PST|PDT|PT))?\\.?[\\t ]*(?:\\n|$)",
          flags: "iu"
        },
        {
          source: "^(?:[Bb][Yy]|[Dd][Oo][Oo][Rr]|[Ww]ritten [Bb]y)\\s+(?:[A-ZÀ-ÖØ-Þ][\\p{L}\\p{M}.’'-]*)(?:[ \\t]+(?:(?:[A-ZÀ-ÖØ-Þ][\\p{L}\\p{M}.’'-]*)|van|de|den|der|von|ten|ter|da|di|du|la|le)){0,7}(?:,[ \\t]*(?:[A-ZÀ-ÖØ-Þ][\\p{L}\\p{M}.’'-]*)(?:[ \\t]+(?:[A-ZÀ-ÖØ-Þ][\\p{L}\\p{M}.’'-]*)){0,5})?[ \\t]*(?:\\n|$)",
          flags: "u"
        },
        {
          source: "^(?:advertisement|advertentie|read more|lees meer|continue reading|verder lezen)[.…:»>]*[\\t ]*(?:\\n|$)",
          flags: "iu"
        }
      ]
    }
  };

  // shared/edition-display.mjs
  var rules = edition_display_default.intro.rules.map((r) => new RegExp(r.source, r.flags));
  var escaped = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function cleanIntro(text, author = null) {
    if (typeof text !== "string") return "";
    let value = text.replace(/\r\n?/g, "\n").trim();
    const knownAuthor = typeof author === "string" && author.trim().length > 1 && author.length <= 120 ? new RegExp(edition_display_default.intro.knownAuthor.replace("{author}", escaped(author.trim())), "iu") : null;
    const strip = (v) => {
      for (const re of rules) v = v.replace(re, "").trim();
      return knownAuthor ? v.replace(knownAuthor, "").trim() : v;
    };
    for (let n = 0; n < edition_display_default.intro.maxPrefixes; n++) {
      const next = strip(value);
      if (next === value) break;
      value = next;
    }
    if (strip(value) !== value) return "";
    return value.replace(/\s+/g, " ").trim();
  }
  function withCleanIntro(item) {
    if (!item || item.kind === "post") return item;
    const summary = typeof item.summary === "string" ? cleanIntro(item.summary, item.author) : item.summary;
    const text = typeof item.text === "string" ? cleanIntro(item.text, item.author) : item.text;
    return summary === item.summary && text === item.text ? item : { ...item, summary, ...item.text === void 0 ? {} : { text } };
  }
  function headlineTier(title = "") {
    const n = String(title).length;
    return n <= edition_display_default.headline.largeMax ? "large" : n <= edition_display_default.headline.mediumMax ? "medium" : "compact";
  }
  var HALF_HEADLINE_LINES = edition_display_default.headline.halfLines;
  var headlineFit = (title) => ({ large: 0.25, medium: 0.125, compact: 0 })[headlineTier(title)];

  // src/lib/topics.js
  var T = (id, label2) => ({ id, label: label2 });
  var TOPICS = [
    T("nederland", "Den Haag"),
    T("europa", "Europa"),
    T("vs-politiek", "Verenigde Staten"),
    T("verkiezingen", "Verkiezingen"),
    T("wonen", "Wonen"),
    T("zorg", "Zorg"),
    T("onderwijs", "Onderwijs"),
    T("misdaad", "Misdaad & recht"),
    T("migratie", "Asiel & migratie"),
    T("verkeer", "Verkeer & OV"),
    T("oekraine", "Oekraïne & Rusland"),
    T("middenoosten", "Midden-Oosten"),
    T("azie", "China & Azië"),
    T("afrika", "Afrika"),
    T("latam", "Latijns-Amerika"),
    T("geopolitiek", "Defensie & NAVO"),
    T("economie", "Markten & beurs"),
    T("werk", "Werk & inkomen"),
    T("bedrijven", "Bedrijven"),
    T("energie", "Energie"),
    T("geld", "Geld & sparen"),
    T("ai", "AI"),
    T("tech", "Techbedrijven"),
    T("gadgets", "Gadgets"),
    T("privacy", "Hacks & privacy"),
    T("ev", "Elektrisch rijden"),
    T("games", "Games"),
    T("klimaat", "Klimaat"),
    T("gezondheid", "Gezondheid"),
    T("ruimte", "Ruimte"),
    T("natuur", "Natuur & dieren"),
    T("brein", "Psychologie & brein"),
    T("muziek", "Muziek"),
    T("film", "Film & series"),
    T("boeken", "Boeken"),
    T("kunst", "Kunst & musea"),
    T("media", "Media"),
    T("voetbal", "Voetbal"),
    T("f1", "Formule 1"),
    T("wielrennen", "Wielrennen"),
    T("tennis", "Tennis"),
    T("wintersport", "Schaatsen & wintersport"),
    T("olympisch", "Olympische sporten")
  ];
  var INTERESTS = [
    { id: "politiek", label: "Politiek", topics: ["nederland", "europa", "vs-politiek", "verkiezingen"], cats: [] },
    { id: "binnenland", label: "Binnenland", topics: ["wonen", "zorg", "onderwijs", "misdaad", "migratie", "verkeer"], cats: ["regio"] },
    { id: "wereld", label: "Wereld", topics: ["oekraine", "middenoosten", "azie", "afrika", "latam", "geopolitiek"], cats: [] },
    { id: "economie", label: "Economie", topics: ["economie", "werk", "bedrijven", "energie", "geld"], cats: ["economie"] },
    { id: "tech", label: "Tech", topics: ["ai", "tech", "gadgets", "privacy", "ev"], cats: ["tech"] },
    { id: "wetenschap", label: "Wetenschap", topics: ["klimaat", "gezondheid", "ruimte", "natuur", "brein"], cats: ["wetenschap"] },
    // Games hoort sinds 1.3 bij Cultuur (rubrieken, fase 2), niet meer bij Tech; zie currentChoice hieronder.
    { id: "cultuur", label: "Cultuur", topics: ["muziek", "film", "boeken", "kunst", "media", "games"], cats: ["cultuur", "games"] },
    { id: "sport", label: "Sport", topics: ["voetbal", "f1", "wielrennen", "tennis", "wintersport", "olympisch"], cats: ["sport"] }
  ];
  var INTEREST_OF = Object.fromEntries(INTERESTS.flatMap((i) => i.topics.map((t) => [t, i.id])));
  var topicById = (id) => TOPICS.find((t) => t.id === id);
  var RETIRED_TOPICS = { trump: "vs-politiek" };
  var currentTopic = (id) => RETIRED_TOPICS[id] || id;
  var currentTopics = (ids) => Array.isArray(ids) ? [...new Set(ids.map((t) => typeof t === "string" ? currentTopic(t) : t))] : ids;
  function currentTopicMap(map, cap = Infinity) {
    if (!map || typeof map !== "object") return map;
    const out = {};
    for (const [k, v] of Object.entries(map)) {
      const key = currentTopic(k);
      out[key] = key in out && Number.isFinite(out[key]) && Number.isFinite(v) ? Math.max(-cap, Math.min(cap, out[key] + v)) : v;
    }
    return out;
  }

  // src/lib/affinity.js
  var KEEP_TOPICS = 40;
  var KEEP_SOURCES = 30;
  var MIN_EVENTS = 8;
  var READING_N_MAX = 30;
  var READING_KEY = /^[a-z0-9][a-z0-9:._-]{0,79}$/i;
  var READING_W_MAX = 1e3;
  var weights = (o, keep) => Object.fromEntries(
    Object.entries(o && typeof o === "object" && !Array.isArray(o) ? o : {}).filter(([k, v]) => READING_KEY.test(k) && typeof v === "number" && Number.isFinite(v) && v > 0).map(([k, v]) => [k, Math.round(Math.min(v, READING_W_MAX) * 100) / 100]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(0, keep)
  );
  function readingSummary(affinity) {
    if (!affinity || typeof affinity !== "object" || Array.isArray(affinity)) return null;
    const n = Number.isFinite(affinity.n) ? Math.floor(affinity.n) : 0;
    if (n < MIN_EVENTS) return null;
    return { n: Math.min(n, READING_N_MAX), topics: weights(affinity.topics, KEEP_TOPICS), sources: weights(affinity.sources, KEEP_SOURCES) };
  }

  // shared/opinie.mjs
  var DIR = /^(opinie[a-z-]*|opinies|opinion|opinions|[a-z]+-opinion|meningen|mening|columns?|columns-[a-z-]+|columnisten|commentaar|commentisfree|[a-z]+-commentary|opinion-and-essays|wat-u-zegt)$/i;
  var HOST_DIR = [
    [/(^|\.)theatlantic\.com$/i, /^ideas$/i],
    [/(^|\.)economist\.com$/i, /^(leaders|by-invitation)$/i],
    [/(^|\.)independent\.co\.uk$/i, /^voices$/i]
  ];
  var SLUG = /^columns?-[a-z]/i;
  var LABEL = /^(opinie|opinies|opinion|column|columns|columnisten|commentaar|commentary|ingezonden|ingezonden brief|meningen|hoofdredactioneel)$/i;
  var TITLE = /^\W*(?:(?:opinie|opinion|column|commentaar|ingezonden(?: brief)?|hoofdredactioneel(?: commentaar)?)\s*[:|]|column\s+[^:|.!?]{2,40}\s\|)/i;
  var TITLE_CAPS = /^\W*(OPINIE|COLUMN|COMMENTAAR)\.\s/;
  var plain = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  function urlSignal(raw) {
    let u;
    try {
      u = new URL(String(raw || ""));
    } catch {
      return false;
    }
    const parts = u.pathname.split("/").filter(Boolean);
    if (!parts.length) return false;
    const dirs = parts.slice(0, -1);
    if (dirs.some((d) => DIR.test(d))) return true;
    const host = u.hostname;
    if (HOST_DIR.some(([h, d]) => h.test(host) && dirs.some((x) => d.test(x)))) return true;
    return SLUG.test(parts[parts.length - 1]);
  }
  function signedBySelf(item) {
    const author = plain(item.author);
    if (!author || !author.includes(" ")) return false;
    const m = /^([^:|]{3,60}):\s/.exec(String(item.title || ""));
    return !!m && plain(m[1]) === author;
  }
  function signedAtEnd(item) {
    const author = plain(item.author);
    if (!author || !author.includes(" ")) return false;
    const title = String(item.title || "");
    const at = title.lastIndexOf("|");
    return at > 0 && plain(title.slice(at + 1)) === author;
  }
  function isOpinie(item = {}) {
    if (!item || item.kind === "post") return false;
    if (item.type === "opinie") return true;
    if (urlSignal(item.url)) return true;
    if (LABEL.test(String(item.section || "").trim())) return true;
    const title = String(item.title || "");
    return TITLE.test(title) || TITLE_CAPS.test(title) || signedBySelf(item) || signedAtEnd(item);
  }

  // shared/article-signals.mjs
  var words = (pattern) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, "iu");
  var COUNTRIES = [
    ["nl", "nederland|netherlands|dutch|den haag|the hague|zeeuws-vlaanderen|breskens|amsterdam|rotterdam|utrecht|eindhoven"],
    ["us", "verenigde staten|united states|u\\.s\\.|usa|amerikaan\\p{L}*|american\\p{L}*|washington|michigan|ohio|texas|california|florida|new york|colorado|denver"],
    ["in", "india|indiaas|indiase|indian|new delhi|mumbai|modi"],
    ["fr", "frankrijk|france|frans|franse|fransen|french|parijs|paris|marseille"],
    ["de", "duitsland|germany|german|duitse?|duitsers|berlijn|berlin|frankfurt|hamburg|keulen|cologne|munich"],
    ["gb", "verenigd koninkrijk|united kingdom|british|britse?|engeland|england|londen|london"],
    ["be", "belgi\\p{L}*|belg|belgen|vlaanderen|vlaams\\p{L}*|brussel|brussels|antwerpen|antwerp|gent|brugge"],
    ["ua", "oekra\\p{L}*|ukrain\\p{L}*|kyiv|kiev|zelensk\\p{L}*"],
    ["ru", "rusland|russia\\p{L}*|russisch\\p{L}*|moskou|moscow|putin|poetin"],
    ["il", "isra[eë]l\\p{L}*|gaza|netanyahu|hamas|palestijn\\p{L}*|palestin\\p{L}*"],
    ["ir", "iran\\p{L}*|teheran|tehran"],
    ["lb", "libanon|lebanon|hezbollah"],
    ["cn", "china|chinees|chinese|beijing|peking"],
    ["jp", "japan\\p{L}*|tokyo|tokio"],
    ["ca", "canad\\p{L}*|carney|toronto"],
    ["br", "brazili\\p{L}*|brazil\\p{L}*|lula|bolsonaro"],
    ["es", "spanje|spain|spaans\\p{L}*|madrid"],
    ["it", "itali\\p{L}*|rome|milaan|lucca"],
    ["pl", "polen|poland|poolse?|warschau"],
    ["ee", "estland|estse?|estonia\\p{L}*"],
    ["sn", "senegal\\p{L}*"],
    ["sa", "saudi\\p{L}*|saoedi\\p{L}*|saudische?"],
    ["nz", "new zealand|nieuw-zeeland"],
    ["au", "australi\\p{L}*"],
    ["tr", "turkije|turkey|turks\\p{L}*|erdogan"]
  ].map(([id, pattern]) => [id, words(pattern)]);
  function countriesIn(text = "") {
    const found = COUNTRIES.filter(([, re]) => re.test(text)).map(([id]) => id);
    if (/\bUS\b/.test(text) && !found.includes("us")) found.push("us");
    return found;
  }
  var US_SPECIFIC = words("trump|biden|vance|obamacare|white house|witte huis|pentagon|fbi|hegseth|midterms?|tussentijdse verkiezingen|house of representatives|justice department");
  var US_PARTY = words("republican\\p{L}*|republikein\\p{L}*|democra(?:at|ten|ts)|democratic (?:senate|presidential|nominee|candidate|sweep|party)");
  var US_INSTITUTION = words("congress|congres|senate|senaat|supreme court|hooggerechtshof|capitol|governor|gouverneur");
  function usPoliticsIn(text = "") {
    if (US_SPECIFIC.test(text)) return true;
    const countries = countriesIn(text);
    if (countries.some((c) => c !== "us") && !countries.includes("us")) return false;
    return US_PARTY.test(text) || countries.includes("us") && US_INSTITUTION.test(text) || /\bICE\b/.test(text) && /\b(agents?|immigration|deport\w*|arrest\w*|invallen)\b/i.test(text);
  }
  var LOCAL_INCIDENT = words("protest\\p{L}*|betoging\\p{L}*|demonstrat\\p{L}*|rally|rallies|riot\\p{L}*|rellen|onrust|arrest\\p{L}*|aanhouding\\p{L}*|aangehouden|police|politie|schietpartij|shooting|explosi\\p{L}*|brand|fire|crash");
  var SPORT_EVENTS = [
    ["f1", /\b(?:f1|formula one|formula 1|formule 1|grand prix|verstappen|antonelli|norris|leclerc|piastri)\b/i],
    ["running", /\b(?:marathon|hardlopen|hardloper\w*|nageeye|kipruto|chepkirui)\b/i],
    ["cycling", /\b(?:veldrit\w*|veldrijd\w*|koppenberg\w*|cyclocross|tour de france|giro d.italia)\b/i]
  ];
  var LOCATIONS = ["den haag|the hague", "frankfurt", "parijs|paris", "marseille", "berlijn|berlin", "hamburg", "keulen|cologne", "amsterdam", "rotterdam", "utrecht", "new delhi", "mumbai"].map((p, id) => [id, words(p)]);
  function eventScope(article = {}) {
    const title = article.title || "";
    const countries = countriesIn(title);
    const cities = LOCATIONS.filter(([, re]) => re.test(title)).map(([id]) => id);
    const actions = [...title.matchAll(new RegExp(LOCAL_INCIDENT.source, "giu"))].length;
    const overview = countries.length > 1 && (cities.length > 1 || /[,;]/.test(title) && actions > 1);
    return { local: LOCAL_INCIDENT.test(`${title} ${article.summary || ""}`), countries, cities, overview, sports: SPORT_EVENTS.filter(([, re]) => re.test(title)).map(([id]) => id) };
  }
  function conflictingEvents(a, b) {
    if (a?.sports?.length && b?.sports?.length && !a.sports.some((s) => b.sports.includes(s))) return true;
    if (!a?.local || !b?.local) return false;
    if (a.overview || b.overview) return true;
    if (a.countries.length && b.countries.length && !a.countries.some((c) => b.countries.includes(c))) return true;
    return a.cities.length > 0 && b.cities.length > 0 && !a.cities.some((c) => b.cities.includes(c));
  }
  var isOpinion = (item = {}) => !!item && (item.opinion === true || isOpinie(item));
  var verdictTitle = (item = {}) => /[.!?]\s+["“‘]?\p{Lu}[^.!?]*[.!]["”’]?$/u.test(String(item?.title || "").trim());

  // netlify/lib/topics.mjs
  var KW = [
    // Politiek
    // Niet "den haag": dat is ook de stad (feedback 31 oktober: rellen in Den Haag waren "Den Haag", de politiek).
    ["nederland", /\b(kabinet|tweede kamer|eerste kamer|binnenhof|catshuis|prinsjesdag|miljoenennota|rijksoverheid|coalitie|formatie|minister van|staatssecretaris|kamerlid|kamerleden|\bpvv\b|\bvvd\b|\bd66\b|groenlinks|\bpvda\b|\bcda\b|\bsgp\b|\bbbb\b|\bja21\b|wilders|schoof|timmermans|yesilgoz|omtzigt|jetten|bontenbal)\b/i],
    ["europa", /\b(europese unie|europese commissie|europees parlement|europese leiders|eu-landen|\beu\b|brussel|von der leyen|european union|european commission|european parliament|eurozone|schengen)\b/i],
    ["verkiezingen", /\b(verkiezing|verkiezingen|election|elections|stembus|peiling|peilingen|\bpoll(s)?\b|campagne|campaign|kandidaat|candidate|referendum|stemmen geteld)\b/i],
    // Binnenland
    ["wonen", /\b(woningmarkt|huizenprijs|huurwoning|huurders|huurprijs|sociale huur|woningnood|woningbouw|hypotheek|koopwoning|dakloos|starters op de woningmarkt|corporatie)\b/i],
    ["zorg", /\b(ziekenhuis|huisarts|zorgverzekeraar|zorgpremie|eigen risico|verpleeg|zorgmedewerker|wachtlijst|ggz|jeugdzorg|ouderenzorg|thuiszorg|mantelzorg|igj)\b/i],
    ["onderwijs", /\b(onderwijs|leraar|leraren|docent|scholier|leerling|basisschool|middelbare school|\bmbo\b|\bhbo\b|universiteit|studenten|studiefinanciering|collegegeld|eindexamen|lerarentekort)\b/i],
    ["misdaad", /\b(politie|rechter|rechtbank|rechtszaak|verdachte|aangehouden|opgepakt|celstraf|gevangenisstraf|moord|doodgeschoten|steekpartij|explosie bij|ontploffing|drugs|\bom\b eist|openbaar ministerie|advocaat|veroordeeld|arrested|convicted|murder|police)\b/i],
    ["migratie", /\b(asiel|asielzoeker|vluchteling|migratie|migrant|\bcoa\b|\bind\b|ter apel|azc|statushouder|gezinshereniging|asylum|refugee|migrants?|immigration|deportat)\b/i],
    ["verkeer", /\b(\bns\b|treinen|spoor|prorail|filedruk|in de file|snelweg|verkeer|ongeluk op de|openbaar vervoer|\bov\b|staking bij de ns|schiphol|vliegveld|luchthaven|fietsers|verkeersdoden)\b/i],
    // Wereld
    ["oekraine", /\b(oekra|ukrain|zelensk|poetin|putin|kyiv|kiev|kremlin|donetsk|donbas|moskou|moscow|rusland|russia|russian)\b/i],
    ["middenoosten", /\b(midden-oosten|middle east|israël|israel|gaza|hamas|hezbollah|iran|libanon|lebanon|syrië|syria|jemen|yemen|houthi|saoedi|saudi|westelijke jordaanoever|west bank|netanyahu|palestijn|palestinian|irak|iraq)\b/i],
    ["azie", /\b(china|chinese|chinees|peking|beijing|xi jinping|taiwan|hongkong|hong kong|japan|japanse|zuid-korea|noord-korea|north korea|south korea|india|indiase|modi|indonesi|filipijnen|philippines|vietnam|pakistan)\b/i],
    ["afrika", /\b(afrika|africa|african|nigeria|kenia|kenya|ethiopi|soedan|sudan|congo|zuid-afrika|south africa|somali|mali|sahel|niger|egypte|egypt|marokko|morocco|ghana|uganda|rwanda)\b/i],
    ["latam", /\b(latijns-amerika|latin america|brazili|brazil|argentini|argentina|mexico|venezuela|colombia|chili|chile|peru|cuba|lula|milei|maduro|suriname|caribisch)\b/i],
    ["geopolitiek", /\b(navo|nato|defensie|defence|defense|krijgsmacht|militair|military|leger|army|troepen|troops|wapens|weapons|raket|missile|sancties|sanctions|geopolit|handelsoorlog|kernwapen|nuclear weapon)\b/i],
    // Economie
    ["economie", /\b(econom|beurs|aandel|aex|inflatie|\brente\b|\becb\b|\bfed\b|federal reserve|recessie|begroting|\bbbp\b|dow jones|nasdaq|wall street|stock market|stocks|inflation|interest rates|tarieven|tariff|handelsverdrag)\b/i],
    ["werk", /\b(werkloosheid|werkgelegenheid|cao|vakbond|\bfnv\b|staking|stakingen|lonen|loonsverhoging|minimumloon|ontslag|ontslagen|reorganisatie|banen|vacatures|pensioen|\baow\b|unemployment|layoffs|jobs report|labor union|trade union|wages)\b/i],
    ["bedrijven", /\b(kwartaalcijfers|jaarcijfers|omzet|winst|bedrijfswinst|fusie|overname|faillis|beursgang|topman|topvrouw|\bceo\b|earnings|revenue|profit|merger|acquisition|bankrupt|takeover|ipo)\b/i],
    ["energie", /\b(energie|energy|gasprijs|olieprijs|stroomprijs|energieprijs|\bopec\b|kerncentrale|nuclear power|zonnepanelen|windpark|wind farm|stroomnet|netcongestie|\blng\b|aardgas|oil price|gas price)\b/i],
    ["geld", /\b(sparen|spaarrente|belastingaangifte|belastingdienst|toeslag|toeslagen|koopkracht|boodschappen duurder|prijzen stijgen|pensioenfonds|beleggen|crypto|bitcoin|hypotheekrente|savings|personal finance)\b/i],
    // Tech
    ["ai", /\b(kunstmatige intelligentie|artificial intelligence|\ba\.?i\.?\b|openai|chatgpt|anthropic|\bclaude\b|gemini|\bllm\b|machine learning|deepmind|copilot|chatbot|generatieve)\b/i],
    ["tech", /\b(apple|google|alphabet|\bmeta\b|facebook|instagram|whatsapp|microsoft|\bamazon\b|nvidia|tesla|musk|spacex|twitter|\bx\.com\b|tiktok|bytedance|big tech|techbedrijf|techgigant|semiconductor|chipmaker|chipfabrikant|halfgeleider|tsmc|\basml\b)\b/i],
    ["gadgets", /\b(iphone|ipad|macbook|smartphone|telefoon review|android|pixel \d|galaxy|smartwatch|apple watch|airpods|koptelefoon|headphones|laptop|tablet|gadget|wearable|camera review)\b/i],
    ["privacy", /\b(privacy|hack|hacker|hackers|datalek|data breach|cyberaanval|cyberattack|ransomware|malware|phishing|wachtwoord|password|beveiligingslek|vulnerability|encryptie|encryption|spyware|surveillance)\b/i],
    ["ev", /\b(elektrische auto|elektrisch rijden|electric vehicle|\bevs?\b|laadpaal|charging station|tesla model|batterij auto|rivian|\bbyd\b|polestar|autonomous driving|zelfrijdende|robotaxi)\b/i],
    ["games", /\b(gaming|gamer|gamers|playstation|\bps5\b|xbox|nintendo|switch 2|steam deck|esports|e-sports|videogame|videogames|video game|video games|game studio|gamestudio|call of duty|fortnite|minecraft|grand theft auto|\w+-games)\b/i],
    // Wetenschap
    ["klimaat", /\b(klimaat|climate|\bco2\b|uitstoot|emissions|opwarming|global warming|hittegolf|heatwave|zeespiegel|sea level|energietransitie|fossiele|fossil fuel|cop\d\d|ijskap|gletsjer|glacier)\b/i],
    ["gezondheid", /\b(gezondheid|health|kanker|cancer|vaccin|vaccine|virus|ebola|covid|corona|medicijn|medicine|drug trial|alzheimer|dementie|dementia|obesitas|obesity|diabetes|hartziekte|heart disease|\brivm\b|\bwho\b|pandemie|pandemic|epidemie)\b/i],
    ["ruimte", /\b(ruimtevaart|\bnasa\b|\besa\b|spacex|maanlanding|moon landing|mars|astronaut|telescoop|telescope|sterrenstelsel|melkwegstelsel|galaxies|heelal|universe|astronoom|astronomen|astronomer|astronomers|zwart gat|black hole|planeet|planet|asteroïde|asteroid|satelliet|satellite|james webb)\b/i],
    ["natuur", /\b(natuur|nature|dieren|animals|biodiversiteit|biodiversity|diersoort|species|uitgestorven|extinct|vogels|birds|walvis|whale|bossen|forest|oceaan|ocean|wolf|insecten|insects|koraal|coral)\b/i],
    ["brein", /\b(psycholog|brein|brain|hersenen|neuroscien|neurolog|depressie|depression|angststoornis|angststoornissen|angstklachten|anxiety|mentale gezondheid|mental health|slaaptekort|sleep study|adhd|autisme|autism)\b/i],
    // Cultuur
    ["muziek", /\b(album|single|concert|festival|popmuziek|band|zanger|zangeres|rapper|songwriter|tournee|tour dates|setlist|grammy|edison|hitlijst|top 40|lowlands|pinkpop|paradiso|melkweg|eurovisie|eurovision|songfestival)\b/i],
    ["film", /\b(film|movie|tv-serie|televisieserie|tv series|netflix(?!-(?!serie|film|docu))|hbo max|disney\+|oscar|oscars|bioscoop|cinema|regisseur|acteur|acteurs|actor|actrice|actress|box office|streamingdienst|trailer|première|star trek)\b/i],
    ["boeken", /\b(roman|novel|schrijver|schrijfster|auteur van|literatu|boekenweek|booker|nobelprijs voor literatuur|bestseller|poëzie|dichter|poet|poetry|uitgeverij|publisher|memoir)\b/i],
    ["kunst", /\b(museum|tentoonstelling|exhibition|kunstenaar|kunstwerk|artwork|schilderij|painting|beeldhouw|sculpture|theater|theatre|opera|ballet|rijksmuseum|stedelijk|van gogh|rembrandt|veiling|auction)\b/i],
    ["media", /\b(omroep(?! (?:zeeland|brabant|gelderland|west|flevoland|limburg))|\bnpo\b(?! radio)|journalistiek|journalism|tv-programma|talkshow|presentator|mediabedrijf|dpg media|mediahuis|press freedom|persvrijheid|mediawet)\b/i],
    // Sport
    ["voetbal", /\b(voetbal\w*|football|soccer|eredivisie\w*|ajax|psv|feyenoord|oranje|champions league|europa league|premier league|la liga|bundesliga|knvb|wk-kwalificatie|world cup|keeper|doelpunt|penalty|ballon d.or|gouden bal)\b/i],
    ["f1", /\b(formule 1|formula 1|formula one|\bf1\b|verstappen|grand prix|red bull racing|ferrari|mercedes-amg|mclaren|hamilton|leclerc|norris|piastri)\b/i],
    ["wielrennen", /\b(wielren|wielrenner|cycling|tour de france|giro|vuelta|peloton|etappe|stage win|klassieker|van der poel|vingegaard|pogačar|pogacar|veldrijden|cyclocross)\b/i],
    ["tennis", /\b(tennis|wimbledon|roland garros|us open|australian open|\batp\b|\bwta\b|grand slam|djokovic|alcaraz|sinner|swiatek|sabalenka)\b/i],
    ["wintersport", /\b(schaatsen|schaatser|skating|speed skating|elfstedentocht|thialf|shorttrack|skiën|skiing|wereldbeker schaatsen|wintersport|biatlon|biathlon|snowboard)\b/i],
    ["olympisch", /\b(olympisch|olympic|olympics|\bnoc\*nsf\b|\bioc\b|paralympi|atletiek|athletics|zwemmen|swimming|turnen|gymnastics|hockey|volleybal|handbal)\b/i]
  ];
  var OTHER_SPORT = /\b(darts\w*|darter\w*|snooker|rugby|honkbal|baseball|basketbal|basketball|ijshockey|motogp|handbal\w*|handball|uitwedstrijd\w*|vrouwentak|veldrijd\w*|veldrit\w*|koppenberg\w*|eredivisie\w*|voetbal\w*)\b/i;
  var RETIRED = {
    "vs-politiek": /./s,
    trump: /./s,
    // sinds 1.1.0 geen eigen onderwerp meer: Verenigde Staten (vs-politiek)
    brein: /\bangst\b/i,
    film: /\b(netflix|hbo)\b/i,
    media: /\b(omroep|npo)\b/i,
    nederland: /\bden haag\b/i
  };
  function trustedTopics(it) {
    const had = it.topics || [];
    if (!had.some((t) => RETIRED[t])) return had;
    const vis = `${it.title || ""} ${it.summary || it.text || ""} ${it.cats || ""}`;
    const now = keywordTopics(vis);
    const keep = had.filter((t) => now.includes(t) || !RETIRED[t] || !RETIRED[t].test(vis));
    return keep.length === had.length ? had : keep;
  }
  var shown = /* @__PURE__ */ new WeakMap();
  function shownTopics(it) {
    if (!it || typeof it !== "object" || !it.summary) return null;
    let s = shown.get(it);
    if (!s) shown.set(it, s = keywordTopics(`${it.title || ""} ${it.summary} ${it.cats || ""}`));
    return s;
  }
  function keywordTopics(text) {
    const out = [];
    for (const [id, re] of KW) if (re.test(text)) out.push(id);
    if (usPoliticsIn(text)) out.push("vs-politiek");
    if (/\bPangram\b/.test(text) && /\b(internet|ai|detector|detectie|kunstmatige intelligentie)\b/i.test(text) && !out.includes("ai")) out.push("ai");
    return out;
  }

  // netlify/lib/desks.mjs
  var DESKS = ["binnenland", "buitenland", "vs", "middenoosten", "oekraine", "wetenschap"];
  var DESK_LABEL = { binnenland: "Binnenland", buitenland: "Buitenland", vs: "VS", middenoosten: "Midden-Oosten", oekraine: "Oekraïne", wetenschap: "Wetenschap", bubbel: "Buiten je bubbel" };
  var NL_HOME = /* @__PURE__ */ new Set(["nos", "nu", "nrc", "volkskrant", "trouw", "parool", "ad", "telegraaf", "rtl", "nd", "ftm", "haarlemsdagblad", "nhd", "leidschdagblad", "dvhn", "lc", "limburger", "tubantia", "stentor", "gelderlander", "bd", "ed", "bndestem", "pzc", "fd"]);
  var VL_HOME = /* @__PURE__ */ new Set(["vrt", "standaard", "demorgen", "tijd", "hln", "nieuwsblad", "gva", "hbvl", "sporza"]);
  var W = (alts, flags = "iu") => new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts.join("|")})(?![\\p{L}\\p{N}])`, flags);
  var NL_PLACES = [
    "nederland",
    "netherlands",
    "the hague",
    "dutch",
    "holland",
    "den haag",
    "haagse?",
    "'s-gravenhage",
    "randstad",
    "groningen",
    "groningse?",
    "friesland",
    "friese",
    "drenthe",
    "drentse",
    "overijssel",
    "flevoland",
    "gelderland",
    "gelderse",
    "utrecht",
    "utrechtse",
    "noord-holland",
    "zuid-holland",
    "zeeland",
    "zeeuwse?",
    "noord-brabant",
    "brabantse?",
    "veluwe",
    "achterhoek",
    "twente",
    "twentse",
    "amsterdam\\p{L}*",
    "rotterdam\\p{L}*",
    "eindhoven\\p{L}*",
    "tilburg\\p{L}*",
    "almere",
    "breda",
    "nijmegen",
    "arnhem",
    "haarlem",
    "enschede",
    "apeldoorn",
    "amersfoort",
    "zaanstad",
    "zaandam",
    "'s-hertogenbosch",
    "den bosch",
    "zwolle",
    "maastricht",
    "dordrecht",
    "zoetermeer",
    "deventer",
    "alkmaar",
    "venlo",
    "leeuwarden",
    "helmond",
    "heerlen",
    "hilversum",
    "schiedam",
    "lelystad",
    "roermond",
    "sittard",
    "geleen",
    "vlissingen",
    "middelburg",
    "terneuzen",
    "zeeuws-vlaanderen",
    "breskens",
    "purmerend",
    "hengelo",
    "den helder",
    "harderwijk",
    "vught",
    "boxtel",
    "ursem",
    "overasselt",
    "westland",
    "schiphol",
    "texel",
    "ameland",
    "terschelling",
    "waddenzee",
    "ijsselmeer",
    "markermeer",
    "volendam",
    "zandvoort",
    "scheveningen",
    "katwijk",
    "noordwijk",
    "wageningen",
    "doetinchem",
    "zutphen",
    "roosendaal",
    "bergen op zoom",
    "kerkrade",
    "rijnmond",
    "maasvlakte",
    "afsluitdijk",
    "zuidas\\p{L}*",
    "bijlmer",
    "osdorp",
    "vinex",
    "wadden\\p{L}*",
    "pieterburen",
    "lauwersoog",
    "hoofddorp",
    "catshuis",
    "binnenhof"
  ];
  var NL_INST = [
    "tweede kamer",
    "eerste kamer",
    "kamerleden",
    "kamerlid",
    "kamervragen",
    "kamermeerderheid",
    "kamerdebat",
    "staten-generaal",
    "provinciale staten",
    "statenlid",
    "kabinet-\\p{L}+",
    "premier jetten",
    "koning willem-alexander",
    "willem-alexander",
    "koningin máxima",
    "prinses amalia",
    "koningshuis",
    "rijkswaterstaat",
    "rivm",
    "knmi",
    "prorail",
    "nvwa",
    "belastingdienst",
    "toeslagen\\p{L}*",
    "openbaar ministerie",
    "raad van state",
    "hoge raad",
    "algemene rekenkamer",
    "marechaussee",
    "nctv",
    "aivd",
    "mivd",
    "de nederlandsche bank",
    "prinsjesdag",
    "miljoenennota",
    "belastingplan",
    "box 3",
    "npo",
    "ns-\\p{L}+",
    "groningengas",
    "koningsdag",
    "elfstedentocht"
  ];
  var NL_CORP = W(["klm", "albert heijn", "asml", "tata steel", "abn amro", "rabobank", "aex", "damrak"]);
  var NL_PERSONS = ["jetten", "wilders", "yeşilgöz", "yesilgoz", "timmermans", "bontenbal", "van der plas", "omtzigt", "eerdmans", "markuszower", "dijkhoff", "van essen", "peter r\\. de vries"];
  var NL_PARTIES = W(["PVV", "VVD", "D66", "CDA", "GroenLinks", "PvdA", "GL-PvdA", "SP", "NSC", "BBB", "JA21", "FvD", "Forum voor Democratie", "PvdD", "Partij voor de Dieren", "DENK", "SGP", "ChristenUnie", "CU", "50Plus", "50PLUS", "BIJ1"], "u");
  var NL_CASE = W([
    "Leiden",
    "Leidse",
    "Ede",
    "Oss",
    "Hoorn",
    "Duiven",
    "Gouda",
    "Kampen",
    "Weert",
    "Assen",
    "Delft",
    "Emmen",
    "Urk",
    "Venray",
    "Klaver",
    "Schoof",
    "IND",
    "COA",
    "GGD",
    "AFM",
    "ACM",
    "UWV",
    "SVB",
    "DNB",
    "DUO",
    "CBS",
    "NS"
  ], "u");
  var NL_STRONG = W([...NL_PLACES, ...NL_INST, ...NL_PERSONS]);
  var FOREIGN_EXTRA = W([
    "g20",
    "g7",
    "vn",
    "vn-\\p{L}+",
    "verenigde naties",
    "united nations",
    "navo-top",
    "eu-top",
    "europese commissie",
    "europees parlement",
    "von der leyen",
    "rutte",
    "johannesburg",
    "kaapstad",
    "pretoria",
    "warschau",
    "krakau",
    "rome",
    "romeinse",
    "milaan",
    "madrid",
    "barcelona",
    "lissabon",
    "athene",
    "wenen",
    "praag",
    "boedapest",
    "stockholm",
    "oslo",
    "kopenhagen",
    "helsinki",
    "finland",
    "fins\\p{L}*",
    "dublin",
    "ierse",
    "schotland",
    "schots\\p{L}*",
    "wales",
    "tokio",
    "tokyo",
    "seoel",
    "new delhi",
    "mumbai",
    "shanghai",
    "hongkong",
    "hong kong",
    "singapore",
    "sydney",
    "toronto",
    "montreal",
    "los angeles",
    "silicon valley",
    "hollywood",
    "buenos aires",
    "rio de janeiro",
    "são paulo",
    "lagos",
    "nairobi",
    "caïro",
    "cairo",
    "egyptisch\\p{L}*",
    "istanbul",
    "ankara",
    "belgrado",
    "servië",
    "kosovo",
    "bosnië",
    "kroatië",
    "kroatisch\\p{L}*",
    "sloveni\\p{L}*",
    "slowak\\p{L}*",
    "litouw\\p{L}*",
    "letland",
    "letse",
    "estland",
    "estse",
    "baltisch\\p{L}*",
    "moldav\\p{L}*",
    "siberië",
    "kaukasus",
    "chileens\\p{L}*",
    "peruaans\\p{L}*",
    "colombiaans\\p{L}*",
    "cubaans\\p{L}*",
    "nigeriaans\\p{L}*",
    "keniaans\\p{L}*",
    "marokk\\p{L}*",
    "algerij\\p{L}*",
    "tunesi\\p{L}*",
    "libi\\p{L}*",
    "iraans\\p{L}*",
    "afghaans\\p{L}*",
    "pakistaans\\p{L}*",
    "thais\\p{L}*",
    "vietnamees\\p{L}*",
    "indonesisch\\p{L}*",
    "filipijns\\p{L}*",
    "australisch\\p{L}*",
    "nieuw-zeeland\\p{L}*",
    "pompeï",
    "pompeii",
    "paaseiland",
    "easter island",
    "noors\\p{L}*",
    "zweeds\\p{L}*",
    "tbilisi",
    "georgisch\\p{L}*",
    "abu dhabi",
    "dubai",
    "kyoto",
    "bali",
    "binance",
    "musk",
    "koning charles",
    "prins william",
    "prins harry",
    "prinses kate",
    "koning frederik"
  ]);
  var BE = W([
    "belgi\\p{L}*",
    "belg",
    "belgen",
    "vlaanderen",
    "vlaams\\p{L}*",
    "wallonië",
    "waals\\p{L}*",
    "antwerp\\p{L}*",
    "gent",
    "gentse",
    "brugge",
    "leuven",
    "charleroi",
    "hasselt",
    "mechelen",
    "oostende",
    "kortrijk",
    "aalst",
    "brussel\\p{L}*",
    "koning filip",
    "koningin mathilde",
    "prinses elisabeth",
    "de wever",
    "bouchez",
    "van bossuyt",
    "verlinden",
    "demir",
    "n-va",
    "vlaams belang",
    "open vld",
    "cd&v",
    "abvv",
    "acv"
  ]);
  var BE_CASE = W(["PVDA", "MR", "Vooruit", "Luik"], "u");
  var NON_EUROPE = W([
    "canad\\p{L}*",
    "chin(?:a|ese|ees)",
    "chinezen",
    "japan\\p{L}*",
    "korea\\p{L}*",
    "india",
    "indian",
    "indiase?",
    "indiaas",
    "pakistan\\p{L}*",
    "bangladesh",
    "azië",
    "asia\\p{L}*",
    "aziatisch\\p{L}*",
    "brazili\\p{L}*",
    "brazil\\p{L}*",
    "mexic\\p{L}*",
    "argentin\\p{L}*",
    "venezuela\\p{L}*",
    "cuba\\p{L}*",
    "colombia\\p{L}*",
    "chileens\\p{L}*",
    "peru",
    "latijns-amerika",
    "latin america",
    "australi\\p{L}*",
    "nieuw-zeeland\\p{L}*",
    "new zealand",
    "afrika\\p{L}*",
    "africa\\p{L}*",
    "nigeria\\p{L}*",
    "soedan",
    "sudan\\p{L}*",
    "egypt\\p{L}*",
    "egypte",
    "kenia",
    "kenya\\p{L}*",
    "ethiopi\\p{L}*",
    "congo\\p{L}*",
    "iran\\p{L}*",
    "israel\\p{L}*",
    "israël",
    "gaza",
    "saudi\\p{L}*",
    "taiwan\\p{L}*",
    "afghan\\p{L}*",
    "syri\\p{L}*",
    "kanad\\p{L}*",
    "brasilien",
    "mexiko",
    "australien",
    "vereinigte staaten",
    "usa",
    "états-unis",
    "canadien\\p{L}*",
    "verenigde staten",
    "united states",
    "amerika\\p{L}*",
    "america\\p{L}*",
    "u\\.s\\."
  ]);
  var isNonEuropean = (it) => NON_EUROPE.test(it?.title || "");
  var RE = {
    oekraine: /\b(oekra\w*|ukrain\w*|zelensk\w*|kyiv|kiev|kyjiv|kharkiv|charkiv|olesjky|oleshky|odesa|donetsk|donbas|krim|crimea|dnipro|kramatorsk)\b/i,
    middenoosten: /\b(israël|israel\w*|gaza|hamas|hezbollah|libanon|lebanon|iran\w*|teheran|tehran|khamenei|netanyahu|syri\w*|jemen|yemen|houthi\w*|irak|iraq|saudi\w*|westelijke jordaanoever|west bank|jordani\w*|qatar|golfstaten|midden-oosten|middle east|palestijn\w*|palestin\w*)\b/i,
    vs: /\b(trump|biden|vance|witte huis|white house|washington|congres\w*|congress|senaat|senate|republikein\w*|republican\w*|democra(at|ten|tic|ts)|pentagon|hegseth|midterms?|tussentijdse verkiezingen|amerikaan\w*|american|verenigde staten|united states|u\.s\.|new york|california|californi\w*|texas|florida|chicago|supreme court|hooggerechtshof|fbi|ice)\b/i,
    wetenschap: /\b(wetenschap\w*|onderzoekers|onderzoek toont|studie|scientist\w*|researchers|science|study finds|nobelprijs (?:voor de )?(?:natuurkunde|scheikunde|geneeskunde)|nobel prize in (?:physics|chemistry|medicine)|klimaat\w*|climate|solar system|cosmic debris|light-years|nasa|esa|astronom\w*|ruimtevaart|telescoop|telescope|natuurkunde|physics|biolog\w*|genetic\w*|genetica|vaccin\w*|medicijn|geneesmiddel|quantum|kwantum|archeolog\w*|fossiel|fossil|aardbeving|earthquake|vulkaan|volcano|neurolog\w*|hersenonderzoek)\b/i,
    buitenland: /\b(frankrijk|france|french|frans\w*|parijs|paris|duitsland|germany|german|duits\w*|berlijn|berlin|brit\w*|engeland|england|london|londen|verenigd koninkrijk|united kingdom|spanje|spain|itali\w*|polen|poland|estland|estonia\w*|estse|senegal\w*|brazil\w*|belgi\w*|brussel|brussels|europese unie|european union|\beu\b|navo|nato|china|chinees|chinese|peking|beijing|taiwan|japan\w*|korea\w*|india\w*|pakistan|afghanistan|rusland|russia\w*|russisch\w*|poetin|putin|kremlin|moskou|moscow|turkije|turkey|erdogan|afrika|africa|nigeria|soedan|sudan|egypte|egypt|brazili\w*|mexico|venezuela\w*|maduro|argentini\w*|canada\w*|australi\w*|albani\w*|albane\w*|spaans\w*|pools\w*|turks\w*|griek\w*|zweed\w*|deens\w*|oostenrijk\w*|zwitser\w*|portug\w*|hongaar\w*|indiase|mexica\w*|canad\w*|egypt\w*|japans\w*|koreaan\w*|afrikaan\w*|europe\w*|europa|servi\w*|serbi\w*|hongarije|hungary|hungarian|orbán|griekenland|greece|zweden|sweden|swedish|noorwegen|norway|norwegian|denemarken|denmark|danish|oostenrijk|austria\w*|zwitserland|switzerland|ierland|ireland|portugal|tsjechi\w*|czech\w*|roemeni\w*|romania\w*|bulgarije|bulgaria\w*|georgi\w*|armeni\w*|azerbeidzjan|azerbaijan\w*|wit-rusland|belarus|filipijnen|philippine\w*|indonesi\w*|vietnam|thailand|myanmar|bangladesh|sri lanka|nepal|kenia|kenya\w*|ethiopi\w*|somali\w*|congo|zuid-afrika|south africa|haïti|haiti|cuba|colombia|chili|peru)\b/i
  };
  var KIND_TOPICS = /* @__PURE__ */ new Set(["voetbal", "f1", "wielrennen", "tennis", "wintersport", "olympisch", "muziek", "film", "boeken", "kunst", "games"]);
  var KIND_PATH = /\/(sport[\w-]*|voetbal|darts|cultuur|cultuur-media|entertainment|showbizz|boulevard|show|film|muziek|boeken|media)\//i;
  var CULTURE_SPORT = /\b(middenvelder|hattrick|hat-trick|scoorde|doelpunt|club.*contract|smaakmaker.*club|psg|premier league|concert\w*|halloweenkostuum|captain picard|star trek|patrick stewart|acteur|actrice|film|filmfestival)\b/i;
  var ownKind = (it) => {
    const visible = `${it.title || ""} ${it.summary || ""}`;
    if (/^(?:recept:|wat eten we vandaag:)/i.test(it.title || "") || /\/(?:koken-en-eten|geld|vrouw|opmerkelijk)\//i.test(it.url || "")) return true;
    if (/\b(drugging|murder|verkrachting|doodgeschoten|mishandeld)\b/i.test(it.title || "") && countriesIn(it.title || "").length) return false;
    const election = /\b(elections?|verkiezing\w*|midterms?|political texts|senaat|senate)\b/i.test(`${it.title || ""} ${(it.url || "").replace(/[-_/]/g, " ")}`);
    if (election && usPoliticsIn(visible + " " + (it.url || "").replace(/[-_/]/g, " ")) && !keywordTopics(visible).some((t) => KIND_TOPICS.has(t))) return false;
    if (/\b(journal article|research finds|study finds)\b/i.test(it.title || "")) return false;
    return (it.mainTopics || it.topics || []).some((t) => KIND_TOPICS.has(t)) || KIND_PATH.test(it.url || "") || /^(sport|cultuur)/i.test(it.section || "") || OTHER_SPORT.test(it.title || "") || CULTURE_SPORT.test(visible);
  };
  function placeSignals({ title = "", summary = "", text = "" }) {
    const t = `${title} ${summary || text}`;
    const strong = NL_STRONG.test(t);
    const home = strong || NL_CASE.test(t) || NL_PARTIES.test(t);
    return {
      nl: home || NL_CORP.test(t),
      home,
      strong,
      foreign: FOREIGN_EXTRA.test(t) || BE.test(t.replace(/zeeuws-vlaanderen/gi, "")) || BE_CASE.test(t)
    };
  }
  var L = "\\p{L}*";
  var WORLD = W([
    // Europa
    `albani${L}`,
    "andorra",
    `armeni${L}`,
    `azerbeidzjan${L}`,
    `azerbaijan${L}`,
    "wit-rusland",
    `belarus${L}`,
    `bosni${L}`,
    `bulgar${L}`,
    `bulgaria${L}`,
    "cyprus",
    `cyprio${L}`,
    "denemarken",
    `deens${L}`,
    "denmark",
    "danish",
    "finland",
    "fins",
    "finse",
    "finnish",
    `georgi[eë]`,
    `griek${L}`,
    "greece",
    "greek",
    `hongarij${L}`,
    `hongaar${L}`,
    `hungar${L}`,
    "ierland",
    "ireland",
    "iers",
    "ierse",
    "irish",
    `ijsland${L}`,
    `iceland${L}`,
    `kosov${L}`,
    `kroati${L}`,
    `croatia${L}`,
    "letland",
    "letse",
    "latvia",
    `latvian${L}`,
    "liechtenstein",
    `litouw${L}`,
    `lithuania${L}`,
    `luxemburg${L}`,
    "luxembourg",
    `macedoni${L}`,
    "malta",
    "maltees",
    "maltese",
    `moldavi${L}`,
    `moldova${L}`,
    "monaco",
    `montenegr${L}`,
    `noorweg${L}`,
    "noors",
    "noorse",
    `norw${L}`,
    `oostenrijk${L}`,
    `austria${L}`,
    `portug${L}`,
    `roemeni${L}`,
    `romania${L}`,
    "san marino",
    `servi${L}`,
    `serbia${L}`,
    `sloveni${L}`,
    `slowakij${L}`,
    `slowaak${L}`,
    `slovak${L}`,
    `tsjechi${L}`,
    "tsjech",
    "tsjechen",
    `czech${L}`,
    "vaticaan",
    "vatican",
    "schotland",
    "scotland",
    "schots",
    "schotse",
    "scottish",
    "wales",
    "welsh",
    "noord-ierland",
    "northern ireland",
    "zweden",
    `zweed${L}`,
    "sweden",
    "swedish",
    `zwitser${L}`,
    "switzerland",
    "swiss",
    // Afrika
    `algerij${L}`,
    `algeri${L}`,
    `angola${L}`,
    `benin${L}`,
    "botswana",
    "burkina faso",
    "burundi",
    `centraal-afrikaans${L}`,
    "central african republic",
    "comoren",
    "comoros",
    `congo${L}`,
    "djibouti",
    `egypt${L}`,
    `egypte${L}`,
    "equatoriaal-guinee",
    "equatorial guinea",
    `eritre${L}`,
    "eswatini",
    `ethiopi${L}`,
    "gabon",
    "gambia",
    `ghana${L}`,
    `guinee${L}`,
    `guinea${L}`,
    "ivoorkust",
    "ivory coast",
    "kaapverdi[eë]",
    "cape verde",
    `kameroen${L}`,
    "cameroon",
    `keni${L}`,
    `kenya${L}`,
    "lesotho",
    `liberia${L}`,
    `libi[eë]`,
    `libisch${L}`,
    `libya${L}`,
    "madagaskar",
    "madagascar",
    "malawi",
    "mali",
    "malinees",
    "malinese",
    `marokk${L}`,
    `morocc${L}`,
    `mauritani${L}`,
    "mauritius",
    "mozambique",
    `namibi${L}`,
    "niger",
    `nigeria${L}`,
    "oeganda",
    `oegandees${L}`,
    `uganda${L}`,
    `rwanda${L}`,
    `senegal${L}`,
    "seychellen",
    "seychelles",
    "sierra leone",
    `somali${L}`,
    `soedan${L}`,
    `sudan${L}`,
    `tanzania${L}`,
    "tsjaad",
    "togo",
    `tunesi${L}`,
    `tunisi${L}`,
    `zambia${L}`,
    `zimbabw${L}`,
    `zuid-afrika${L}`,
    `south africa${L}`,
    // Azië
    "afghanistan",
    `afghaan${L}`,
    `afghan${L}`,
    "bahrein",
    "bahrain",
    `bangladesh${L}`,
    "bhutan",
    "brunei",
    "cambodja",
    `cambodjaan${L}`,
    `cambodia${L}`,
    `filipijn${L}`,
    `philippine${L}`,
    "hongkong",
    "hong kong",
    `indonesi${L}`,
    "irak",
    `irakees${L}`,
    "iraq",
    `iraqi${L}`,
    `jemen${L}`,
    `yemen${L}`,
    `jordani${L}`,
    "kazachstan",
    "kazakhstan",
    `kirgizi${L}`,
    `kyrgyz${L}`,
    "koeweit",
    `kuwait${L}`,
    "laos",
    `maleisi${L}`,
    `malaysia${L}`,
    "maldiven",
    "maldives",
    `mongoli${L}`,
    "myanmar",
    "birma",
    "burma",
    `nepal${L}`,
    `korea${L}`,
    `noord-korea${L}`,
    `zuid-korea${L}`,
    "oezbekistan",
    "uzbekistan",
    "oman",
    "oost-timor",
    "east timor",
    `pakistan${L}`,
    `qatar${L}`,
    "singapore",
    `sri lanka${L}`,
    `syri${L}`,
    "tadzjikistan",
    "tajikistan",
    `taiwan${L}`,
    "thailand",
    "thai",
    "thaise?",
    "turkmenistan",
    "emiraten",
    "emirates",
    `vietnam${L}`,
    // Amerika
    `argentin${L}`,
    "bahama's",
    "bahamas",
    "barbados",
    "belize",
    `bolivia${L}`,
    `boliviaan${L}`,
    "chili",
    `chileen${L}`,
    "chile",
    `chilean${L}`,
    `colombia${L}`,
    "costa rica",
    `costa ricaan${L}`,
    `costa rican${L}`,
    "cuba",
    `cubaan${L}`,
    `cuban${L}`,
    "dominicaanse republiek",
    "dominican republic",
    `ecuador${L}`,
    "el salvador",
    `salvadoraan${L}`,
    `salvadoran${L}`,
    `guatemala${L}`,
    "guyana",
    "haïti",
    "haiti",
    `haïtiaan${L}`,
    `haitian${L}`,
    "honduras",
    `hondura${L}`,
    `jamaica${L}`,
    `mexic${L}`,
    `nicaragua${L}`,
    `panama${L}`,
    `paraguay${L}`,
    `peru${L}`,
    "puerto rico",
    `suriname${L}`,
    "trinidad",
    `uruguay${L}`,
    `venezuela${L}`,
    `groenland${L}`,
    "greenland",
    // Oceanië
    "fiji",
    "nieuw-zeeland",
    "new zealand",
    `papoea${L}`,
    `papua${L}`,
    "samoa",
    "tonga"
  ]);
  var NL_ANCHOR = W(["nederland\\p{L}*", "dutch", "holland\\p{L}*"]);
  function foreignHead(title = "") {
    const t = String(title || "");
    if (!t || !(WORLD.test(t) || RE.oekraine.test(t) || RE.middenoosten.test(t) || countriesIn(t).some((c) => c !== "nl"))) return false;
    return !NL_ANCHOR.test(t) && !placeSignals({ title: t }).nl;
  }
  var NL_WEAK = W([
    "nederlands\\p{L}*",
    "nederlander\\p{L}*",
    "gemeente\\p{L}*",
    "gemeentelijk\\p{L}*",
    "burgemeester\\p{L}*",
    "wethouder\\p{L}*",
    "provincie\\p{L}*",
    "provinciale",
    "waterschap\\p{L}*",
    "politie\\p{L}*",
    "agenten",
    "brandweer\\p{L}*",
    "rechtbank",
    "kabinet",
    "ministerie",
    "staatssecretaris",
    "minister van",
    "vakbond\\p{L}*",
    "fnv",
    "cao\\p{L}*",
    "huisarts\\p{L}*",
    "zorgverzekeraar\\p{L}*",
    "basisschool",
    "mbo",
    "woningcorporatie\\p{L}*",
    "huurders",
    "asielzoekers\\p{L}*",
    "azc",
    "stikstof\\p{L}*"
  ]);
  var NL_TOPICS = /* @__PURE__ */ new Set(["nederland", "wonen", "zorg", "onderwijs", "misdaad", "migratie", "verkeer"]);
  var NL_SECTION = /binnenland|\/politiek\/|\/nederland\/|\/regio\/|\/112-?nieuws/;
  var NOT_HOME_SECTION = /(^|\s)(tech|economie|wetenschap|opinie|columns?)(\s|$)|\/(tech|economie|financiele-markten|bedrijfsleven|beurs|wetenschap|[\w-]*magazine|lifestyle|leven|boulevard|showbizz|opinie|columns?|columns-opinie|meningen|recepten|vacatures|partnercontent|varia|puzzels?|geld|vrouw|opmerkelijk|eten|ps|uit-in-[\w-]+|geloof|religie-filosofie|tijdgeest|samenleving|duurzaamheid-economie)\//;
  var textForeignOf = ({ title = "", summary = "", text = "", cats = "" }) => {
    const t = `${title} ${summary || text} ${cats}`;
    return RE.oekraine.test(t) || RE.middenoosten.test(t) || usPoliticsIn(t) || RE.buitenland.test(t);
  };
  function isBinnenland(it, { storyForeign = false, foreign = textForeignOf(it) } = {}) {
    const home = NL_HOME.has(it.source);
    const sig = placeSignals(it);
    const abroad = foreign || sig.foreign;
    const head = placeSignals({ title: it.title || "" });
    const nl = VL_HOME.has(it.source) ? head.strong : abroad ? head.home : sig.nl;
    const sec = `${it.section || ""} ${it.url || ""}`.toLowerCase();
    if (ownKind(it)) return false;
    if (home && /binnenland|\/politiek\//.test(sec) && (!abroad || nl)) return true;
    if (home && /buitenland|\/world\//.test(sec) && !head.home) return false;
    if (nl && (home || !abroad)) return true;
    if (!home) return false;
    if (abroad || storyForeign) return false;
    const ts = it.topics || [];
    if (NL_SECTION.test(sec) || ts.some((t) => NL_TOPICS.has(t)) || NL_WEAK.test(`${it.title || ""} ${it.summary || it.text || ""}`)) return true;
    return it.source !== "fd" && ts.every((t) => NL_TOPICS.has(t)) && !NOT_HOME_SECTION.test(sec);
  }
  function storyForeignOf(items = []) {
    const votes = /* @__PURE__ */ new Map();
    for (const item of items) {
      const ds = desksOf(item);
      const foreign = ["buitenland", "vs", "middenoosten", "oekraine"].some((d) => ds.has(d));
      if (!votes.has(item.source) || ds.has("binnenland")) votes.set(item.source, ds.has("binnenland") ? "nl" : foreign ? "int" : null);
    }
    const known = [...votes.values()].filter(Boolean);
    return known.length > 0 && known.filter((g) => g === "int").length * 2 > known.length;
  }
  var memo = /* @__PURE__ */ new WeakMap();
  function desksOf(it, { storyForeign = false } = {}) {
    if (!it || typeof it !== "object") return deskSet(it || {}, storyForeign);
    let m = memo.get(it);
    if (!m) memo.set(it, m = {});
    const k = storyForeign ? "f" : "n";
    return m[k] || (m[k] = deskSet(it, storyForeign));
  }
  function subjectPlaceOf(it = {}) {
    const head = (it.title || "").replace(/\bPalestine Action\b/gi, "activistengroep");
    const fromHead = countriesIn(head);
    const usElection = fromHead.includes("us") && /\b(democra\w*|republic\w*|republikein\w*|senate|senaat)\b/i.test(head) || /\b(senate races|midterms)\b/i.test(head) && usPoliticsIn(`${head} ${it.summary || ""}`);
    if (usElection) return { countries: ["us"], basis: "verkiezingsplaats", text: "United States", evidence: head };
    if (fromHead.length) return { countries: fromHead, basis: "kop", text: head };
    if (usPoliticsIn(head)) return { countries: ["us"], basis: "kop-institutie", text: head };
    let path = "";
    try {
      path = new URL(it.url).pathname.replace(/[-_/]/g, " ");
    } catch {
    }
    if (/\/us\//i.test(String(it.url || "").split("?")[0])) return { countries: ["us"], basis: "bronrubriek", text: `United States ${head}` };
    const fromPath = countriesIn(path);
    if (fromPath.length) return { countries: fromPath, basis: "url", text: `${head} ${path}` };
    const intro = `${head} ${it.summary || it.text || ""} ${it.cats || ""}`;
    return { countries: countriesIn(intro), basis: "intro-of-onbekend", text: intro };
  }
  function deskSet(it, storyForeign) {
    const { title = "", summary = "", text = "", url = "", section = "", cats = "" } = it;
    const t = `${title} ${summary || text} ${cats}`;
    const out = /* @__PURE__ */ new Set();
    if (ownKind(it)) return out;
    const sec = `${section} ${url}`.toLowerCase();
    const place = subjectPlaceOf(it);
    const headCountries = countriesIn(title.replace(/\bPalestine Action\b/gi, "activistengroep"));
    const headHome = placeSignals({ title }).home;
    const geoText = headHome ? title : place.text;
    if (RE.oekraine.test(geoText)) out.add("oekraine");
    if (RE.middenoosten.test(geoText)) out.add("middenoosten");
    const usSection = /\/us\//.test(sec);
    const path = String(url).split("?")[0].replace(/[-_/]/g, " ");
    if (usPoliticsIn(geoText) || !headCountries.length && !headHome && (usSection || usPoliticsIn(path)) || countriesIn(geoText).includes("us")) out.add("vs");
    const education = /\b(leraar|basisschool|docent|onderwijs)\b/i.test(title) && !/\b(onderzoek|studie|research|study)\b/i.test(title);
    if (!education && (RE.wetenschap.test(title) || /wetenschap|\/science\/|\/health\//.test(sec) || /\b(journal article|scholarship|research finds|study finds)\b/i.test(t))) out.add("wetenschap");
    const specific = out.has("oekraine") || out.has("middenoosten") || out.has("vs");
    const textForeign = specific || RE.buitenland.test(geoText) || headCountries.some((c) => c !== "nl");
    if (isBinnenland(it, { storyForeign, foreign: textForeign })) {
      out.add("binnenland");
    } else if (!specific && (textForeign || /buitenland|\/world\//.test(sec) || placeSignals(it).foreign || VL_HOME.has(it.source))) {
      out.add("buitenland");
    }
    if (headHome && out.has("binnenland")) {
      for (const d of ["buitenland", "vs", "middenoosten", "oekraine"]) if (!usPoliticsIn(title) && !RE[d]?.test(title)) out.delete(d);
    }
    if (out.has("vs") && /\b(senate races|senaatsverkiezingen|midterms)\b/i.test(title)) {
      out.delete("middenoosten");
      out.delete("oekraine");
    }
    if (headCountries.some((c) => !["us", "ua", "il", "ir", "lb"].includes(c)) && /^(?:premier|duitse media|canad)/i.test(title)) {
      out.delete("vs");
      out.delete("oekraine");
      out.add("buitenland");
    }
    return out;
  }
  function storyDesks(items = []) {
    const storyForeign = items.length > 1 && storyForeignOf(items);
    return items.map((i) => desksOf(i, { storyForeign }));
  }
  var deskOfStory = (items = []) => primaryDesk(storyDesks(items));
  var PRIORITY = ["oekraine", "middenoosten", "wetenschap", "vs", "buitenland", "binnenland"];
  function primaryDesk(itemDesks = []) {
    const count = {};
    for (const set of itemDesks) for (const d of set) count[d] = (count[d] || 0) + 1;
    let best = null;
    for (const d of PRIORITY) if (count[d] && (!best || count[d] > count[best])) best = d;
    return best && count[best] * 2 >= itemDesks.length ? best : null;
  }
  function weight({ sourceCount = 1, ownCount = 0, latestAt }, now = Date.now()) {
    const h = latestAt ? (now - Date.parse(latestAt)) / 36e5 : 99;
    const chosen = Number.isFinite(ownCount) ? Math.min(4, Math.max(0, ownCount)) : 0;
    return sourceCount * 4 + chosen * 2 + (h <= 3 ? 4 : h <= 6 ? 3 : h <= 12 ? 1 : 0);
  }

  // shared/editor.mjs
  var FOREIGN_DESKS = /* @__PURE__ */ new Set(["buitenland", "vs", "middenoosten", "oekraine"]);
  var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  var sum = (xs) => xs.reduce((s, v) => s + v, 0);
  var byId = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  var FAMILY_OF = Object.fromEntries(INTERESTS.flatMap((f) => f.topics.map((t) => [t, f.id])));
  var FAMILY_LABEL = Object.fromEntries(INTERESTS.map((f) => [f.id, f.label]));
  var FAMILY_OF_CAT = Object.fromEntries(INTERESTS.flatMap((f) => f.cats.filter((c) => c !== "regio").map((c) => [c, f.id])));
  var W_INHERITED = 0.6;
  var W_READ = 0.8;
  var W_TASTE = 0.75;
  var TASTE_SCALE = 12;
  var READ_FULL_SHARE = 0.25;
  var READ_RAMP = 30;
  var LIFT_SMOOTH = 5;
  var SOURCE_FULL = 5;
  var P_MIN = 0.05;
  function supplyOf(items = [], followed = null) {
    const pool = items.filter((i) => i && i.kind === "article" && (!followed || followed.has(i.source)));
    const count = {};
    for (const i of pool) for (const t of new Set(i.topics || [])) count[t] = (count[t] || 0) + 1;
    const out = {};
    for (const [t, c] of Object.entries(count)) out[t] = c / pool.length;
    return out;
  }
  function profileOf({ interests = [], topics = [], affinity = null, taste = null, favorites = [], followed = /* @__PURE__ */ new Set(), sources = [], supply = null } = {}) {
    topics = currentTopics(topics);
    if (affinity?.topics) affinity = { ...affinity, topics: currentTopicMap(affinity.topics) };
    if (taste?.topics) taste = { ...taste, topics: currentTopicMap(taste.topics, TASTE_SCALE) };
    const expl = {};
    const inherited = /* @__PURE__ */ new Set();
    for (const f of INTERESTS) {
      if (!interests.includes(f.id)) continue;
      const picked = f.topics.filter((t) => topics.includes(t));
      const sharp = picked.length > 0 && picked.length < f.topics.length;
      for (const t of f.topics) {
        expl[t] = sharp ? picked.includes(t) ? 1 : 0 : W_INHERITED;
        if (!sharp) inherited.add(t);
      }
    }
    const n = affinity?.n || 0;
    const learned = n >= MIN_EVENTS;
    const readOf = {};
    const shareOf = {};
    if (learned) {
      const at = affinity.topics || {};
      const aSum = sum(Object.values(at)) || 1;
      const A = sum(Object.values(affinity.sources || {})) || aSum;
      const ramp = Math.min(1, n / READ_RAMP);
      for (const [t, a] of Object.entries(at)) {
        const lift = (a + LIFT_SMOOTH) / (A * (supply?.[t] || 0) + LIFT_SMOOTH);
        readOf[t] = clamp(lift - 1, 0, 1) * ramp;
        shareOf[t] = Math.min(1, a / aSum / READ_FULL_SHARE) * ramp;
      }
    }
    const tt = taste?.topics || {};
    const topicP = {};
    const origin = {};
    for (const t of /* @__PURE__ */ new Set([...Object.keys(expl), ...Object.keys(readOf), ...Object.keys(tt)])) {
      const e = expl[t] || 0;
      const r = W_READ * (readOf[t] || 0);
      const v = Math.round(clamp(Math.max(e, r) + W_TASTE * (tt[t] || 0) / TASTE_SCALE, -1, 1) * 100) / 100;
      if (v < P_MIN && v > -P_MIN) continue;
      topicP[t] = v;
      origin[t] = r > e ? "geleerd" : inherited.has(t) && !((tt[t] || 0) > 0) ? "geërfd" : "gekozen";
    }
    const family = {};
    for (const [t, v] of Object.entries(topicP)) {
      const f = FAMILY_OF[t];
      if (f && v > 0) family[f] = Math.max(family[f] || 0, v);
    }
    const as = learned ? affinity.sources || {} : {};
    const sSum = sum(Object.values(as)) || 1;
    const sourceP = {};
    for (const [s, a] of Object.entries(as)) sourceP[s] = Math.min(1, SOURCE_FULL * a / sSum);
    const catOf = new Map(sources.map((s) => [s.id, s.cat]));
    const chosenLight = new Set(sources.filter((s) => s.optional && (s.cat === "games" || s.cat === "cultuur") && followed.has?.(s.id)).map((s) => s.id));
    return { topicP, origin, family, sourceP, shareOf, favorites: new Set(favorites), followed, catOf, chosenLight, interests: new Set(interests) };
  }
  var P = {
    INTEREST: 18,
    // × sterkte van het beste onderwerp × (0,5 + 0,5 × dekking)
    CROSS: 8,
    // snijvlak: raakt ook een tweede gebied van je (≥ CROSS_MIN)
    LESS: 16,
    // × de sterkste "minder" (tot −16)
    FAVORITE: 8,
    // voorkeursbron; gelijk aan FAVORITE_BONUS in netlify/lib/stories.mjs
    SOURCE_READ: 4,
    // × hoe vaak je de bron leest, als dat meer is dan SOURCE_READ_MIN
    MINE: 3,
    // per extra eigen bron die erover schrijft, tot MINE_MAX
    FOLLOW_UP: 10
    // vervolg: je las het en er kwamen ≥ FOLLOW_UP_MIN nieuwe stukken bij
  };
  var CROSS_MIN = 0.35;
  var SOURCE_READ_MIN = 0.2;
  var MINE_MAX = 3;
  var FOLLOW_UP_MIN = 2;
  var FOLLOW_UP_GAP = 36e5;
  var SOURCE_CAT_P = 0.6;
  var SUM_MIN = -30;
  var SUM_MAX = 40;
  var GEO_NL = "geo:nl";
  var SPORT_URL = /\/(sport|voetbal|premier-league|eredivisie|formule-1|wielrennen|tennis)\//i;
  function isSport(item, catOf = null) {
    if ((item.topics || []).some((t) => FAMILY_OF[t] === "sport")) return true;
    if (catOf?.get(item.source) === "sport") return true;
    return SPORT_URL.test(item.url || "") || /\b(eredivisie\w*|voetbalwedstrijd\w*)\b/i.test(`${item.title || ""} ${item.summary || ""}`) || OTHER_SPORT.test(`${item.title || ""} ${item.summary || ""}`);
  }
  var US_TOPICS = /* @__PURE__ */ new Set(["vs-politiek"]);
  var POLITICS_DESKS = /* @__PURE__ */ new Set(["vs", "middenoosten", "oekraine"]);
  var POLITICS_FAMILIES = /* @__PURE__ */ new Set(["politiek", "wereld", "economie", "binnenland"]);
  var politicsItem = (i, deskOfStory2 = null) => POLITICS_DESKS.has(deskOfStory2) || [...desksOf(i)].some((d) => POLITICS_DESKS.has(d) || FOREIGN_DESKS.has(d) && /\b(vn-top|summit|regering|government|minister|verkiezingen|elections|onderhandelingen)\b/i.test(i.title || "")) || (i.topics || []).some((t) => US_TOPICS.has(t));
  function topicHits(item, prof, geo = null, area = null, politics = false) {
    const sport = isSport(item, prof.catOf);
    const ts = (item.topics || []).filter((t) => !(sport && FAMILY_OF[t] === "binnenland" && prof.topicP[t] > 0));
    const abroad = geo === "int" && !VL_HOME.has(item.source);
    const world = (prof.family.wereld || 0) >= OUTSIDE_FAMILY;
    const notChosenPol = (t) => !world && FAMILY_OF[t] === "politiek" && prof.topicP[t] > 0 && prof.origin?.[t] === "geërfd" && (US_TOPICS.has(t) || abroad && (t !== "europa" || isNonEuropean(item)));
    let headTopics = null;
    const politicsWhy = (t) => FAMILY_OF[t] === "politiek" || FAMILY_OF[t] === "wereld" || FAMILY_OF[t] === "economie" && (FAMILY_OF_CAT[prof.catOf?.get(item.source)] === "economie" || (headTopics ??= politics ? keywordTopics(item.title || "") : []).includes(t));
    const notUs = ts.includes("vs-politiek") && !desksOf(item).has("vs");
    let vis;
    const shown2 = (t) => (vis === void 0 ? vis = shownTopics(item) : vis) === null || vis.includes(t);
    const out = ts.filter((t) => prof.topicP[t] !== void 0 && !(abroad && FAMILY_OF[t] === "binnenland" && prof.topicP[t] > 0) && !(notUs && t === "vs-politiek" && prof.topicP[t] > 0) && !notChosenPol(t)).map((t) => ({ t, f: FAMILY_OF[t], v: prof.topicP[t], s: item.source, seen: shown2(t) && !(politics && !POLITICS_FAMILIES.has(FAMILY_OF[t]) && (politics === "desk" || FAMILY_OF_CAT[prof.catOf?.get(item.source)] !== FAMILY_OF[t])) && !(politics && !world && !politicsWhy(t)) }));
    if (area && !politics && prof.family[area] > 0 && !out.some((h) => h.f === area && h.v > 0)) out.push({ t: `gebied:${area}`, f: area, v: Math.min(prof.family[area], W_INHERITED), s: item.source, seen: true });
    const fb = prof.family.binnenland || 0;
    if (fb > 0 && geo === "nl" && !sport) out.push({ t: GEO_NL, f: "binnenland", v: Math.min(fb, W_INHERITED), s: item.source, seen: true });
    if (!ts.length) {
      const cat = prof.catOf.get(item.source);
      const fam = cat && INTERESTS.find((f) => f.cats.includes(cat));
      const famId = area && fam && area !== fam.id ? area : fam?.id;
      if (famId && prof.family[famId]) out.push({ t: `bron:${famId === fam.id ? cat : famId}`, f: famId, v: SOURCE_CAT_P * prof.family[famId], s: item.source, seen: true });
    }
    return out;
  }
  var strongestFirst = (a, b) => b.v - a.v || byId(a.t, b.t);
  var areaOfDesk = (desk) => desk === "wetenschap" ? "wetenschap" : null;
  function geoOf(item, desk = null, foreign = false) {
    if (desk === "binnenland") return "nl";
    if (FOREIGN_DESKS.has(desk)) return "int";
    const ds = desksOf(item, { storyForeign: foreign });
    for (const d of ds) if (FOREIGN_DESKS.has(d)) return "int";
    if (ds.has("binnenland")) return "nl";
    if (!NL_HOME.has(item.source) && (item.topics || []).some((t) => US_TOPICS.has(t))) return "int";
    return foreign ? "int" : null;
  }
  function personalParts(items = [], prof, ctx = {}, story = {}) {
    const parts = {};
    if (!items.length) return parts;
    const foreign = story.foreign ?? (items.length > 1 && storyForeignOf(items));
    const politicsOf = (i) => POLITICS_DESKS.has(story.desk) ? "desk" : politicsItem(i);
    const hits = items.map((i) => topicHits(i, prof, geoOf(i, story.desk ?? null, foreign), areaOfDesk(story.desk ?? (items.length === 1 && desksOf(i).has("wetenschap") ? "wetenschap" : null)), politicsOf(i)));
    const flat = hits.flat();
    const pos = flat.filter((h) => h.v > 0).sort(strongestFirst);
    if (pos.length) {
      const best = pos[0];
      const cover = hits.filter((hs) => hs.some((h) => h.v > 0)).length / items.length;
      const vak = (h) => h.t.startsWith("bron:");
      const coverOf = (l) => hits.filter((hs) => hs.some((h) => h.t === l.t || vak(h) && !vak(l) && h.f === l.f)).length / items.length;
      const seenPos = pos.filter((h) => h.seen);
      const label2 = [...new Map((seenPos.length ? seenPos : pos).map((h) => [h.t, h])).values()].map((h) => ({ ...h, c: coverOf(h) * h.v })).sort((a, b) => b.c - a.c || (a.t === GEO_NL) - (b.t === GEO_NL) || strongestFirst(a, b))[0];
      parts.interest = { pts: Math.round(P.INTEREST * best.v * (0.5 + 0.5 * cover)), t: label2.t, f: label2.f, origin: prof.origin?.[label2.t] || "gekozen", cov: coverOf(label2), ...seenPos.length ? {} : { shown: false } };
      const famCat = (h) => FAMILY_OF_CAT[prof.catOf?.get(h.s)];
      const crossHits = hits.map((hs) => hs.filter((h) => h.v >= CROSS_MIN && h.seen && (!famCat(h) || famCat(h) === h.f)));
      const famCover = (f) => crossHits.filter((hs) => hs.some((h) => h.f === f)).length * 2 > items.length;
      const cross = pos.filter((h) => h.v >= CROSS_MIN && h.seen && famCover(h.f));
      const first = cross[0];
      const second = first && cross.find((h) => h.f !== first.f);
      if (second) parts.cross = { pts: P.CROSS, f: [first.f, second.f] };
    }
    const neg = flat.filter((h) => h.v < 0).sort((a, b) => a.v - b.v || byId(a.t, b.t));
    if (neg.length) parts.less = { pts: Math.round(P.LESS * neg[0].v), t: neg[0].t };
    const fav = items.find((i) => prof.favorites.has(i.source));
    if (fav) parts.favorite = { pts: P.FAVORITE, source: fav.source };
    const rs = Math.max(0, ...items.map((i) => prof.sourceP[i.source] || 0));
    if (rs > SOURCE_READ_MIN) parts.sourceRead = { pts: Math.round(P.SOURCE_READ * rs) };
    const mine = new Set(items.map((i) => i.source)).size;
    if (mine >= 2) parts.mine = { pts: P.MINE * Math.min(MINE_MAX, mine - 1), n: mine };
    const read = ctx.readIds ? items.filter((i) => ctx.readIds.has(i.id)) : [];
    if (read.length) {
      const last = Math.max(...read.map((i) => Date.parse(i.publishedAt) || 0));
      const fresh = items.filter((i) => !ctx.readIds.has(i.id) && Date.parse(i.publishedAt) > last + FOLLOW_UP_GAP).length;
      if (fresh >= FOLLOW_UP_MIN) parts.followUp = { pts: P.FOLLOW_UP, n: fresh };
      else parts.seen = { pts: 0 };
    }
    return parts;
  }
  var sumParts = (parts = {}) => clamp(sum(Object.values(parts).map((p) => p.pts || 0)), SUM_MIN, SUM_MAX);
  function jitter(seed, id) {
    const s = `${seed}|${id}`;
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
    return h % 1e3 / 1e3;
  }
  var TEMPO_LATEST = 11;
  var TEMPO_FACTOR = 3;
  var TEMPO_MIN_H = 14;
  var TEMPO_MAX_H = 72;
  var TEMPO_NO_GAP_H = 24;
  function tempoWindows(items = []) {
    const by = /* @__PURE__ */ new Map();
    for (const i of items) {
      if (i?.kind !== "article" || !i.publishedAt) continue;
      const t = Date.parse(i.publishedAt);
      if (Number.isNaN(t)) continue;
      if (!by.has(i.source)) by.set(i.source, []);
      by.get(i.source).push(t);
    }
    const out = /* @__PURE__ */ new Map();
    for (const [s, ts] of by) {
      const t = ts.sort((a, b) => b - a).slice(0, TEMPO_LATEST);
      const gaps = t.slice(1).map((x, k) => (t[k] - x) / 36e5).sort((a, b) => a - b);
      const med = gaps.length ? gaps[Math.floor(gaps.length / 2)] : TEMPO_NO_GAP_H;
      out.set(s, clamp(TEMPO_FACTOR * med, TEMPO_MIN_H, TEMPO_MAX_H));
    }
    return out;
  }
  var OUTSIDE_TOPIC = 0.3;
  var OUTSIDE_FAMILY = 0.5;
  var outsideProfile = (topics = [], prof) => !topics.some((t) => (prof.topicP[t] || 0) >= OUTSIDE_TOPIC || (prof.family[FAMILY_OF[t]] || 0) >= OUTSIDE_FAMILY);
  var NEIGHBOURS = {
    politiek: ["wereld", "binnenland", "economie"],
    binnenland: ["politiek", "wetenschap", "sport"],
    wereld: ["politiek", "economie"],
    economie: ["tech", "wereld", "politiek"],
    tech: ["wetenschap", "economie", "cultuur"],
    wetenschap: ["tech", "binnenland"],
    cultuur: ["tech", "binnenland"],
    sport: ["binnenland", "cultuur"]
  };
  function strongestFamily(prof) {
    return Object.entries(prof.family).sort((a, b) => b[1] - a[1] || byId(a[0], b[0]))[0]?.[0] || null;
  }
  var MIN_WHY_PTS = 5;
  var FRONT_SOURCES = 8;
  var DESK_NAMES = { ...DESK_LABEL, tech: "Tech", economie: "Economie", regio: "Regio" };
  var WHY_ORDER = ["followUp", "cross", "interest", "favorite", "mine", "sourceRead"];
  var topicLabel = (t) => topicById(t)?.label || t;
  function whyOf(entry = {}, { parts = {}, sourceCount = 0, desk = entry.desk ?? null, plannedDesk = false, labelOf = topicLabel, sourceName = (s) => s, deskLabel = (d) => DESK_NAMES[d] || d } = {}) {
    if (entry.vervolg) return { code: "vervolg", text: `Vervolg · ${entry.vervolg} nieuwe stukken` };
    if (entry.desk === "extern") return { code: "extern", text: "Buiten je bronnen" };
    if (entry.desk === "bubbel") {
      if (entry.near) return { code: "buur", text: `Naast je bubbel · grenst aan ${FAMILY_LABEL[entry.near] || entry.near}` };
      return { code: "bubbel", text: "Buiten je bubbel · via Google Trends" };
    }
    if (entry.desk === "breed") return entry.big ? { code: "groot", text: `Groot nieuws · ${sourceCount} bronnen` } : { code: "breed", text: `Waar iedereen over schrijft · ${sourceCount} bronnen` };
    if (entry.front && (entry.big ?? sourceCount >= FRONT_SOURCES)) return { code: "groot", text: `Groot nieuws · ${sourceCount} bronnen` };
    const rank = (k) => WHY_ORDER.includes(k) ? WHY_ORDER.indexOf(k) : WHY_ORDER.length;
    const [code, p] = Object.entries(parts).filter(([k, x]) => (x.pts || 0) >= MIN_WHY_PTS && !(k === "interest" && x.shown === false)).sort((a, b) => b[1].pts - a[1].pts || rank(a[0]) - rank(b[0]) || byId(a[0], b[0]))[0] || [];
    if (code === "followUp") return { code, text: `Vervolg op wat je las · ${p.n} nieuwe stukken` };
    if (parts.cross && (code === "interest" || code === "cross")) return { code: "cross", text: `Raakt ${FAMILY_LABEL[parts.cross.f[0]]} én ${FAMILY_LABEL[parts.cross.f[1]]}` };
    if (code === "interest") {
      if (p.t.startsWith("bron:")) return { code: "vak", text: `Omdat je ${FAMILY_LABEL[p.f] || "dit gebied"} volgt` };
      if (p.t.startsWith("gebied:")) return { code, text: `Omdat je ${FAMILY_LABEL[p.f] || "dit gebied"} volgt` };
      if (p.t === GEO_NL) return { code, text: `Omdat je ${FAMILY_LABEL.binnenland} volgt` };
      if (p.origin === "geërfd") return { code, text: `Omdat je ${FAMILY_LABEL[p.f] || labelOf(p.t)} volgt` };
      if (p.origin === "geleerd") return { code: "learned", text: `Omdat je vaak over ${labelOf(p.t)} leest` };
      return { code, text: `Omdat je ${labelOf(p.t)} volgt` };
    }
    if (code === "favorite") return { code, text: `Uit je voorkeursbron ${sourceName(p.source)}` };
    if (code === "mine") return { code, text: `${p.n} van je bronnen schrijven erover` };
    if (code === "sourceRead") return { code, text: "Uit een bron die je veel leest" };
    if (entry.big ?? sourceCount >= FRONT_SOURCES) return { code: "groot", text: `Groot nieuws · ${sourceCount} bronnen` };
    if (desk && plannedDesk) return { code: "rubriek", text: `Jouw rubriek ${deskLabel(desk)}` };
    return { code: "rubriek", text: desk ? `Rubriek ${deskLabel(desk)}` : "Het nieuws van nu" };
  }
  var LEARNED_SHOWN = 0.4;
  var CATALOGUE = Object.fromEntries(INTERESTS.flatMap((f) => f.topics).map((t, i) => [t, i]));
  var byCatalogue = (a, b) => (CATALOGUE[a] ?? 1e3) - (CATALOGUE[b] ?? 1e3) || byId(a, b);
  function profileSummary(prof) {
    const p = prof?.topicP || {};
    const origin = prof?.origin || {};
    const strongest = (a, b) => p[b] - p[a] || byCatalogue(a, b);
    const ids = Object.keys(p);
    return {
      chosen: ids.filter((t) => p[t] > 0 && origin[t] !== "geleerd").sort(strongest),
      learned: ids.filter((t) => p[t] >= LEARNED_SHOWN && origin[t] === "geleerd").sort(strongest),
      less: ids.filter((t) => p[t] < 0).sort((a, b) => p[a] - p[b] || byCatalogue(a, b))
    };
  }
  var KERN = [...DESKS];
  var OWN_DESKS = ["tech", "economie", "regio"];
  var DESK_GAIN = 3;
  var TOPIC_DESK = {
    nederland: ["binnenland"],
    verkiezingen: ["binnenland", "vs"],
    "vs-politiek": ["vs"],
    europa: ["buitenland"],
    wonen: ["binnenland", "regio"],
    zorg: ["binnenland"],
    onderwijs: ["binnenland"],
    misdaad: ["binnenland", "regio"],
    migratie: ["binnenland"],
    verkeer: ["regio"],
    oekraine: ["oekraine"],
    middenoosten: ["middenoosten"],
    azie: ["buitenland"],
    afrika: ["buitenland"],
    latam: ["buitenland"],
    geopolitiek: ["buitenland", "oekraine"],
    economie: ["economie"],
    werk: ["economie"],
    bedrijven: ["economie"],
    energie: ["economie"],
    geld: ["economie"],
    ai: ["tech"],
    tech: ["tech"],
    gadgets: ["tech"],
    privacy: ["tech"],
    ev: ["tech"],
    games: ["tech"],
    klimaat: ["wetenschap"],
    gezondheid: ["wetenschap"],
    ruimte: ["wetenschap"],
    natuur: ["wetenschap"],
    brein: ["wetenschap"]
  };
  function topicDesks(t, prof) {
    const ds = TOPIC_DESK[t] || [];
    if (FAMILY_OF[t] !== "politiek" || prof?.origin?.[t] !== "geërfd" || (prof?.family?.wereld || 0) >= OUTSIDE_FAMILY) return ds;
    return ds.filter((d) => !FOREIGN_DESKS.has(d));
  }
  function chosenDesks(prof) {
    const out = /* @__PURE__ */ new Set();
    for (const [t, v] of Object.entries(prof?.topicP || {})) if (v > 0 && prof.origin?.[t] !== "geleerd") for (const d of topicDesks(t, prof)) out.add(d);
    if (prof?.family?.binnenland > 0) out.add("binnenland");
    else out.delete("binnenland");
    return out;
  }
  var DESK_CAP = 3;
  var KERN_MIN = 3;
  var KERN_INT_W = 0;
  var KERN_SCI_W = 0.2;
  var FRONT = 2;
  var FRONT_MIN = 6;
  var FRONT_BIG = 8;
  var FRONT_MAX = 3;
  var NL_OTHER_W = 1;
  var INT_MAX = 2;
  var PLAN_DESKS = [...KERN, ...OWN_DESKS];
  function deskPlan(prof, seats, front = [], filled = []) {
    const w = {};
    const chose = Object.keys(prof?.family || {}).length > 0;
    const world = (prof?.family?.wereld || 0) >= OUTSIDE_FAMILY;
    for (const d of PLAN_DESKS) w[d] = !KERN.includes(d) ? 0 : !chose || world ? 1 : FOREIGN_DESKS.has(d) ? KERN_INT_W : d === "wetenschap" ? KERN_SCI_W : 1;
    const best = {};
    for (const [t, v] of Object.entries(prof?.topicP || {})) {
      if (v <= 0) continue;
      for (const d of topicDesks(t, prof)) best[d] = Math.max(best[d] || 0, v);
    }
    for (const d of PLAN_DESKS) if (best[d]) w[d] += DESK_GAIN * best[d];
    if (prof?.family?.binnenland > 0) w.binnenland += DESK_GAIN * prof.family.binnenland;
    if (prof?.followed?.size && prof?.catOf && ![...prof.followed].some((id) => prof.catOf.get(id) === "regio")) w.regio = 0;
    const got = {};
    for (const d of PLAN_DESKS) got[d] = 0;
    for (const d of filled) if (d in got) got[d]++;
    const order = [];
    while (order.length < seats) {
      let pick = null;
      let bq = 0;
      for (const d of PLAN_DESKS) {
        if (got[d] >= DESK_CAP || w[d] <= 0) continue;
        const q = w[d] / (2 * got[d] + 1);
        if (q > bq + 1e-9) {
          pick = d;
          bq = q;
        }
      }
      if (!pick) break;
      got[pick]++;
      order.push(pick);
    }
    const all = () => [...front, ...order];
    const kernIn = () => new Set(all().filter((d) => KERN.includes(d))).size;
    const heaviest = [...KERN].sort((a, b) => w[b] - w[a] || KERN.indexOf(a) - KERN.indexOf(b));
    for (const d of heaviest) {
      if (kernIn() >= KERN_MIN) break;
      if (all().includes(d)) continue;
      for (let i = order.length - 1; i >= 0; i--) {
        if (all().filter((x) => x === order[i]).length > 1) {
          order[i] = d;
          break;
        }
      }
    }
    const weights2 = {};
    for (const d of PLAN_DESKS) weights2[d] = Math.round(w[d] * 100) / 100;
    return { order, weights: weights2 };
  }
  var OWN_DESK_FAMILY = { tech: "tech", economie: "economie", regio: "binnenland" };
  var OWN_DESK_CAT = { tech: ["tech"], economie: ["economie"], regio: ["regio"] };
  var OWN_DESK_TOPICS = Object.fromEntries(OWN_DESKS.map((d) => [d, new Set(INTERESTS.find((f) => f.id === OWN_DESK_FAMILY[d]).topics)]));
  function servesDesks(items = [], primary = null, prof) {
    const out = new Set(primary ? [primary] : []);
    for (const d of OWN_DESKS) {
      const byTopic = d !== "regio" && items.some((i) => !politicsItem(i) && (i.topics || []).some((t) => OWN_DESK_TOPICS[d].has(t)));
      if (byTopic || items.some((i) => OWN_DESK_CAT[d].includes(prof.catOf.get(i.source)))) out.add(d);
    }
    return out;
  }
  function homeDesk(items = [], primary = null, prof) {
    if (POLITICS_DESKS.has(primary)) return primary;
    const s = servesDesks(items, null, prof);
    const strength = (d) => Math.max(0, ...items.flatMap((i) => (i.topics || []).filter((t) => (TOPIC_DESK[t] || []).includes(d)).map((t) => prof.topicP[t] || 0)));
    const ranked = OWN_DESKS.filter((d) => s.has(d)).map((d) => ({ d, v: strength(d) })).sort((a, b) => b.v - a.v || OWN_DESKS.indexOf(a.d) - OWN_DESKS.indexOf(b.d));
    if (ranked.length && (ranked[0].v > 0 || !primary)) return ranked[0].d;
    return primary || null;
  }

  // netlify/lib/sources.mjs
  var S = (id, name, cat, lang, about, url, more = {}) => ({ id, name, cat, lang, about, urls: Array.isArray(url) ? url : [url], ...more });
  var SOURCES = [
    // Nederland
    S("nos", "NOS", "nl", "nl", "Het publieke nieuws: snel, breed en gratis.", ["https://feeds.nos.nl/nosnieuwsalgemeen", "http://feeds.nos.nl/nosnieuwsalgemeen"], { pick: true, base: true, bsky: "nos.nl", x: "nos", color: "#B5121B" }),
    S("nu", "NU.nl", "nl", "nl", "Het snelste nieuws, de hele dag.", "https://www.nu.nl/rss/Algemeen", { pick: true, color: "#0B4E8C", bsky: "nu.nl" }),
    S("nrc", "NRC", "nl", "nl", "Achtergrond, analyse en onderzoek.", ["https://www.nrc.nl/rss/", "https://www.nrc.nl/index.rss"], { login: "https://www.nrc.nl/login/", paid: true, pick: true, base: true, bsky: "nrc.nl", x: "nrc", color: "#C20E1A" }),
    S("volkskrant", "de Volkskrant", "nl", "nl", "Nieuws, verhalen en opinie.", ["https://www.volkskrant.nl/voorpagina/rss.xml", "https://www.volkskrant.nl/nieuws-achtergrond/rss.xml"], { login: "https://www.volkskrant.nl/login/", paid: true, pick: true, base: true, bsky: "volkskrant.nl", x: "volkskrant", color: "#1481C4" }),
    S("trouw", "Trouw", "nl", "nl", "Nieuws met aandacht voor mens, natuur en zingeving.", "https://www.trouw.nl/rss.xml", { login: "https://www.trouw.nl/login/", paid: true, color: "#00A0DC", bsky: "trouw.nl" }),
    S("parool", "Het Parool", "nl", "nl", "Amsterdam en de wereld.", "https://www.parool.nl/rss.xml", { login: "https://www.parool.nl/login/", paid: true, color: "#002F6C", bsky: "parool.nl" }),
    S("ad", "AD", "nl", "nl", "Algemeen Dagblad: nieuws, sport en regio.", "https://www.ad.nl/home/rss.xml", { login: "https://www.ad.nl/login", paid: true, color: "#E30613", bsky: "ad.nl" }),
    S("telegraaf", "De Telegraaf", "nl", "nl", "De grootste krant van Nederland.", "https://www.telegraaf.nl/rss", { login: "https://www.telegraaf.nl/auth/login", paid: true, color: "#1D3E73", bsky: "telegraaf.nl" }),
    S("rtl", "RTL Nieuws", "nl", "nl", "Nieuws van RTL.", "https://www.rtlnieuws.nl/rss.xml", { color: "#2B2D7C", x: "RTLnieuws" }),
    S("nd", "Nederlands Dagblad", "nl", "nl", "Christelijk dagblad, nieuws en duiding.", "https://www.nd.nl/rss", { login: "https://www.nd.nl/login", paid: true, color: "#E2001A", bsky: "nd.nl" }),
    S("ftm", "Follow the Money", "nl", "nl", "Onderzoeksjournalistiek over geld en macht.", "https://www.ftm.nl/feed", { login: "https://www.ftm.nl/inloggen", paid: true, color: "#E52521", bsky: "ftm.nl" }),
    // Regionaal
    S("haarlemsdagblad", "Haarlems Dagblad", "regio", "nl", "Haarlem en omgeving.", "https://www.haarlemsdagblad.nl/rss", { login: "https://www.haarlemsdagblad.nl/auth/login", paid: true, color: "#00539F", bsky: "haarlemsdagblad.nl" }),
    S("nhd", "Noordhollands Dagblad", "regio", "nl", "Noord-Holland.", "https://www.noordhollandsdagblad.nl/rss", { login: "https://www.noordhollandsdagblad.nl/auth/login", paid: true, color: "#00539F", bsky: "noordhollandsdagblad.nl" }),
    S("leidschdagblad", "Leidsch Dagblad", "regio", "nl", "Leiden en omgeving.", "https://www.leidschdagblad.nl/rss", { login: "https://www.leidschdagblad.nl/auth/login", paid: true, color: "#00539F", bsky: "leidschdagblad.nl" }),
    S("dvhn", "Dagblad van het Noorden", "regio", "nl", "Groningen en Drenthe.", "https://dvhn.nl/rss", { login: "https://dvhn.nl/auth/login", paid: true, color: "#E2001A", bsky: "dvhn.nl" }),
    S("lc", "Leeuwarder Courant", "regio", "nl", "Friesland.", "https://lc.nl/rss", { login: "https://lc.nl/auth/login", paid: true, color: "#004A99", bsky: "lc.nl" }),
    S("limburger", "De Limburger", "regio", "nl", "Limburg.", "https://www.limburger.nl/rss", { login: "https://www.limburger.nl/auth/login", paid: true, color: "#E3000F" }),
    S("tubantia", "Tubantia", "regio", "nl", "Twente en de Achterhoek.", "https://www.tubantia.nl/home/rss.xml", { login: "https://www.tubantia.nl/login", paid: true, color: "#D7192D" }),
    S("stentor", "De Stentor", "regio", "nl", "Salland, Veluwe en de Kop van Overijssel.", "https://www.destentor.nl/home/rss.xml", { login: "https://www.destentor.nl/login", paid: true, color: "#D7192D" }),
    S("gelderlander", "De Gelderlander", "regio", "nl", "Gelderland.", "https://www.gelderlander.nl/home/rss.xml", { login: "https://www.gelderlander.nl/login", paid: true, color: "#D7192D", bsky: "gelderlander.nl" }),
    S("bd", "Brabants Dagblad", "regio", "nl", "Noordoost-Brabant.", "https://www.bd.nl/home/rss.xml", { login: "https://www.bd.nl/login", paid: true, color: "#D7192D" }),
    S("ed", "Eindhovens Dagblad", "regio", "nl", "Zuidoost-Brabant.", "https://www.ed.nl/home/rss.xml", { login: "https://www.ed.nl/login", paid: true, color: "#D7192D" }),
    S("bndestem", "BN DeStem", "regio", "nl", "West-Brabant.", "https://www.bndestem.nl/home/rss.xml", { login: "https://www.bndestem.nl/login", paid: true, color: "#D7192D" }),
    S("pzc", "PZC", "regio", "nl", "Zeeland.", "https://www.pzc.nl/home/rss.xml", { login: "https://www.pzc.nl/login", paid: true, color: "#D7192D" }),
    // Vlaanderen
    S("vrt", "VRT NWS", "vl", "nl", "Het publieke nieuws van Vlaanderen.", "https://www.vrt.be/vrtnws/nl.rss.articles.xml", { color: "#1A1A1A", bsky: "vrtnws.be" }),
    S("standaard", "De Standaard", "vl", "nl", "Vlaamse kwaliteitskrant.", "https://www.standaard.be/rss", { login: "https://www.standaard.be/auth/login", paid: true, color: "#E2001A", bsky: "standaard.be" }),
    S("demorgen", "De Morgen", "vl", "nl", "Progressieve Vlaamse krant.", "https://www.demorgen.be/rss.xml", { login: "https://www.demorgen.be/login/", paid: true, color: "#1A1A1A", bsky: "demorgen.be" }),
    S("tijd", "De Tijd", "vl", "nl", "Economie en financiën uit Vlaanderen.", "https://www.tijd.be/rss/nieuws.xml", { login: "https://www.tijd.be/login.html", paid: true, color: "#F07D00", bsky: "tijd.be" }),
    S("hln", "Het Laatste Nieuws", "vl", "nl", "De grootste krant van Vlaanderen.", "https://www.hln.be/home/rss.xml", { login: "https://www.hln.be/login", paid: true, color: "#E30613", bsky: "hln.be" }),
    S("nieuwsblad", "Het Nieuwsblad", "vl", "nl", "Populaire Vlaamse krant.", "https://www.nieuwsblad.be/rss", { login: "https://www.nieuwsblad.be/auth/login", paid: true, color: "#E2001A" }),
    S("gva", "Gazet van Antwerpen", "vl", "nl", "Antwerpen en de wereld.", "https://www.gva.be/rss", { login: "https://www.gva.be/auth/login", paid: true, color: "#E2001A" }),
    S("hbvl", "Het Belang van Limburg", "vl", "nl", "Belgisch-Limburg.", "https://www.hbvl.be/rss", { login: "https://www.hbvl.be/auth/login", paid: true, color: "#E2001A" }),
    // Internationaal (Engelstalig, met een wereldblik)
    S("nyt", "NYT", "int", "en", "The New York Times: wereldnieuws en Amerika.", "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", { login: "https://myaccount.nytimes.com/auth/login", paid: true, pick: true, for: ["politiek", "wereld", "economie"], base: true, bsky: "nytimes.com", x: "nytimes", color: "#1A1A1A" }),
    S("guardian", "The Guardian", "int", "en", "Brits, onafhankelijk, sterk in wereldnieuws.", "https://www.theguardian.com/world/rss", { login: "https://profile.theguardian.com/signin", pick: true, for: ["wereld"], x: "guardian", color: "#052962" }),
    S("bbc", "BBC", "int", "en", "BBC World: wereldnieuws uit Londen.", "https://feeds.bbci.co.uk/news/world/rss.xml", { pick: true, for: ["wereld"], x: "bbcworld", color: "#BB1919" }),
    S("economist", "The Economist", "int", "en", "Economie en wereldpolitiek, scherp samengevat.", "https://www.economist.com/latest/rss.xml", { login: "https://www.economist.com/api/auth/login", paid: true, pick: true, for: ["economie", "wereld"], base: true, bsky: "economist.com", x: "TheEconomist", color: "#E3120B" }),
    S("atlantic", "The Atlantic", "int", "en", "Essays en lange verhalen over politiek en cultuur.", "https://www.theatlantic.com/feed/all/", { login: "https://accounts.theatlantic.com/login/", paid: true, pick: true, for: ["politiek", "cultuur"], base: true, bsky: "theatlantic.com", x: "TheAtlantic", color: "#1A1A1A" }),
    S("ft", "Financial Times", "int", "en", "Economie, markten en wereldpolitiek.", "https://www.ft.com/rss/home", { login: "https://accounts.ft.com/login", paid: true, pick: true, for: ["economie"], x: "FT", color: "#990F3D" }),
    S("newyorker", "The New Yorker", "int", "en", "Reportages, essays en cultuur.", "https://www.newyorker.com/feed/news", { login: "https://www.newyorker.com/auth/initiate", paid: true, color: "#1A1A1A", bsky: "newyorker.com" }),
    S("foreignpolicy", "Foreign Policy", "int", "en", "Analyse van internationale politiek.", "https://foreignpolicy.com/feed/", { login: "https://foreignpolicy.com/login/", paid: true, pick: true, for: ["wereld"], color: "#C8102E", bsky: "foreignpolicy.com" }),
    S("politico-eu", "Politico Europe", "int", "en", "Brussel en de Europese politiek.", "https://www.politico.eu/feed/", { pick: true, for: ["politiek"], color: "#DC0A0A", bsky: "politico.eu" }),
    S("politico", "Politico", "int", "en", "Amerikaanse politiek, van binnenuit.", ["https://rss.politico.com/politics-news.xml", "https://www.politico.com/rss/politicopicks.xml"], { pick: true, for: ["politiek"], x: "politico", color: "#E5202E" }),
    S("aljazeera", "Al Jazeera", "int", "en", "Wereldnieuws met een blik vanuit het Zuiden.", "https://www.aljazeera.com/xml/rss/all.xml", { x: "AJEnglish", color: "#FA9000" }),
    S("npr", "NPR", "int", "en", "De Amerikaanse publieke omroep.", "https://feeds.npr.org/1001/rss.xml", { x: "NPR", color: "#1A1A1A" }),
    S("dw", "Deutsche Welle", "int", "en", "Duits publiek nieuws, in het Engels.", "https://rss.dw.com/rdf/rss-en-all", { color: "#05A0E6", x: "dwnews" }),
    S("lemonde", "Le Monde in English", "int", "en", "De Franse kwaliteitskrant, in het Engels.", "https://www.lemonde.fr/en/rss/une.xml", { login: "https://secure.lemonde.fr/sfuser/connexion", paid: true, color: "#1A1A1A", bsky: "lemonde.fr" }),
    S("scmp", "South China Morning Post", "int", "en", "Azië en China, vanuit Hongkong.", "https://www.scmp.com/rss/91/feed", { login: "https://account.scmp.com/login", paid: true, color: "#FDB813", bsky: "scmp.com" }),
    S("independent", "The Independent", "int", "en", "Brits, liberaal, wereldnieuws.", "https://www.independent.co.uk/news/world/rss", { login: "https://www.independent.co.uk/login", color: "#EC1A2E", bsky: "the-independent.com" }),
    S("telegraph", "The Telegraph", "int", "en", "Brits, conservatief, wereldnieuws.", "https://www.telegraph.co.uk/rss.xml", { login: "https://secure.telegraph.co.uk/customer/secure/login/", paid: true, color: "#1A1A1A", bsky: "telegraph.co.uk" }),
    // Economie
    // Gratis en Nederlands bij Economie (keuze r5-economiebron, 5 november): de economiefeed van de NOS,
    // zoals NOS Sport en NOS Cultuur. Gecontroleerd op 5 november 2026 (bereikbaar, actueel, 20 berichten).
    S("nos-economie", "NOS Economie", "economie", "nl", "Economie en werk van de NOS.", "https://feeds.nos.nl/nosnieuwseconomie", { pick: true, for: ["economie"], color: "#B5121B", bsky: "nos.nl" }),
    S("fd", "Het Financieele Dagblad", "economie", "nl", "Economie, bedrijven en financiën.", "https://fd.nl/?rss", { login: "https://fd.nl/login", paid: true, pick: true, for: ["economie"], color: "#F3A712", bsky: "fd.nl" }),
    S("bloomberg", "Bloomberg", "economie", "en", "Markten en bedrijfsnieuws.", "https://feeds.bloomberg.com/markets/news.rss", { login: "https://www.bloomberg.com/account/signin", paid: true, color: "#1A1A1A", bsky: "bloomberg.com" }),
    // Tech
    S("theverge", "The Verge", "tech", "en", "Technologie, gadgets en internetcultuur.", "https://www.theverge.com/rss/index.xml", { login: "https://www.theverge.com/auth/login?returnPath=/", pick: true, for: ["tech"], base: true, bsky: "theverge.com", x: "verge", color: "#5200FF" }),
    S("wired", "Wired", "tech", "en", "Wat technologie met de wereld doet.", "https://www.wired.com/feed/rss", { login: "https://www.wired.com/auth/initiate", paid: true, pick: true, for: ["tech"], base: true, bsky: "wired.com", x: "wired", color: "#222222", dealsCategory: "Gear / Deals" }),
    // alleen wat Wired zelf uitsluitend als deal indeelt (rss.mjs, sourceDeal)
    S("tweakers", "Tweakers", "tech", "nl", "Nederlands technieuws en reviews.", "https://tweakers.net/feeds/mixed.xml", { login: "https://tweakers.net/my.tnet/login/", pick: true, for: ["tech"], bsky: "tweakers.net", bskyImages: true, color: "#E5202C" }),
    S("ars", "Ars Technica", "tech", "en", "Diepgaand over technologie en wetenschap.", "https://feeds.arstechnica.com/arstechnica/index", { login: "https://arstechnica.com/civis/login", pick: true, for: ["tech"], color: "#FF4E00", bsky: "arstechnica.com" }),
    S("techcrunch", "TechCrunch", "tech", "en", "Start-ups en de techindustrie.", "https://techcrunch.com/feed/", { color: "#0A9E01", bsky: "techcrunch.com" }),
    S("mittr", "MIT Technology Review", "tech", "en", "Opkomende technologie, waaronder AI.", "https://www.technologyreview.com/feed/", { login: "https://www.technologyreview.com/login/", paid: true, color: "#1A1A1A", bsky: "technologyreview.com" }),
    // Games (onder Tech)
    S("ign", "IGN", "games", "en", "Het grootste gamesnieuws.", "https://feeds.feedburner.com/ign/all", { pick: true, forTopic: "games", topics: ["games"], color: "#BF1313", x: "IGN" }),
    S("gamespot", "GameSpot", "games", "en", "Nieuws en recensies over games.", "https://www.gamespot.com/feeds/mashup/", { pick: true, forTopic: "games", topics: ["games"], color: "#1A1A1A", bsky: "gamespot.com" }),
    S("eurogamer", "Eurogamer", "games", "en", "Europees gamesnieuws en recensies.", "https://www.eurogamer.net/feed", { login: "https://www.eurogamer.net/login", pick: true, forTopic: "games", topics: ["games"], color: "#0071CE", x: "eurogamer" }),
    S("polygon", "Polygon", "games", "en", "Games, cultuur en recensies.", "https://www.polygon.com/rss/index.xml", { pick: true, forTopic: "games", topics: ["games"], color: "#FF0055", bsky: "polygon.com" }),
    // Wetenschap
    S("quanta", "Quanta Magazine", "wetenschap", "en", "Wiskunde, natuurkunde en biologie, helder uitgelegd.", "https://api.quantamagazine.org/feed/", { pick: true, for: ["wetenschap"], color: "#1A1A1A", bsky: "quantamagazine.org" }),
    S("sciam", "Scientific American", "wetenschap", "en", "Wetenschap voor iedereen.", "http://rss.sciam.com/ScientificAmerican-Global", { login: "https://www.scientificamerican.com/login/", paid: true, pick: true, for: ["wetenschap"], color: "#C8102E", x: "sciam" }),
    S("nature", "Nature", "wetenschap", "en", "Het wetenschappelijk tijdschrift: nieuws en onderzoek.", "https://www.nature.com/nature.rss", { login: "https://www.nature.com/my-account", paid: true, color: "#1A1A1A", keep: "/articles/d4", bsky: "nature.com" }),
    // alleen nieuws (d4…), geen onderzoekspapers (s4…) zonder intro
    S("carbonbrief", "Carbon Brief", "wetenschap", "en", "Klimaatwetenschap en -beleid.", "https://www.carbonbrief.org/feed/", { forTopic: "klimaat", pick: true, color: "#0F6E5A", bsky: "carbonbrief.org" }),
    // Sport
    S("nos-sport", "NOS Sport", "sport", "nl", "Al het sportnieuws van de NOS.", "https://feeds.nos.nl/nossportalgemeen", { pick: true, for: ["sport"], color: "#B5121B", bsky: "nos.nl" }),
    S("vi", "Voetbal International", "sport", "nl", "Het voetbalblad van Nederland.", "https://www.vi.nl/rss", { login: "https://www.vi.nl/", pick: true, forTopic: "voetbal", topics: ["voetbal"], color: "#D6001C", x: "VI_nl" }),
    S("wielerflits", "WielerFlits", "sport", "nl", "Alles over wielrennen.", "https://www.wielerflits.nl/feed/", { login: "https://www.wielerflits.nl/", pick: true, forTopic: "wielrennen", topics: ["wielrennen"], color: "#F28C00", x: "WielerFlits" }),
    S("sporza", "Sporza", "sport", "nl", "Sport van de VRT.", "https://sporza.be/nl.rss.xml", { color: "#1A1A1A", bsky: "sporza.be" }),
    S("bbc-sport", "BBC Sport", "sport", "en", "Internationaal sportnieuws.", "https://feeds.bbci.co.uk/sport/rss.xml", { pick: true, for: ["sport"], color: "#FFD230", x: "BBCSport" }),
    S("guardian-sport", "The Guardian Sport", "sport", "en", "Sport, met verhalen erachter.", "https://www.theguardian.com/sport/rss", { login: "https://profile.theguardian.com/signin", color: "#052962", bsky: "theguardian.com" }),
    S("espn", "ESPN", "sport", "en", "Amerikaanse sport.", "https://www.espn.com/espn/rss/news", { login: "https://www.espn.com/login", color: "#D00000", bsky: "espn.com" }),
    S("autosport", "Autosport", "sport", "en", "Formule 1 en autosport.", "https://www.autosport.com/rss/f1/news/", { login: "https://www.autosport.com/sign-in/", pick: true, forTopic: "f1", topics: ["f1"], color: "#E10600", x: "autosport" }),
    // Cultuur en muziek. Muziek: in de Stroom (onderwerp Muziek), niet in de Editie.
    S("nos-cultuur", "NOS Cultuur & Media", "cultuur", "nl", "Cultuur en media van de NOS.", "https://feeds.nos.nl/nosnieuwscultuurenmedia", { pick: true, for: ["cultuur"], color: "#B5121B", bsky: "nos.nl" }),
    S("3voor12", "3voor12", "cultuur", "nl", "Muziek van de VPRO: nieuws, recensies, live.", "https://3voor12.vpro.nl/rss.xml", { pick: true, forTopic: "muziek", base: true, music: true, bsky: "3voor12.bsky.social", color: "#E5007E" }),
    S("pitchfork", "Pitchfork", "cultuur", "en", "Muziekrecensies en nieuws.", "https://pitchfork.com/feed/feed-news/rss", { music: true, color: "#1A1A1A", bsky: "pitchfork.com" }),
    S("rollingstone", "Rolling Stone", "cultuur", "en", "Muziek, film en popcultuur.", "https://www.rollingstone.com/feed/", { login: "https://www.rollingstone.com/", music: true, color: "#D32531", bsky: "rollingstone.com" }),
    S("guardian-music", "The Guardian Muziek", "cultuur", "en", "Muzieknieuws en recensies.", "https://www.theguardian.com/music/rss", { login: "https://profile.theguardian.com/signin", music: true, x: "guardianmusic", color: "#052962" }),
    S("quietus", "The Quietus", "cultuur", "en", "Alternatieve en experimentele muziek.", "https://thequietus.com/feed", { music: true, x: "TheQuietus", color: "#1B1B1B", bsky: "thequietus.com" }),
    S("stereogum", "Stereogum", "cultuur", "en", "Indie en pop: nieuws en nieuwe nummers.", "https://www.stereogum.com/feed/", { login: "https://stereogum.com/login", music: true, x: "stereogum", color: "#E2231A" }),
    S("npr-music", "NPR Music", "cultuur", "en", "Tiny Desk en muziekverhalen.", "https://feeds.npr.org/1039/rss.xml", { music: true, x: "nprmusic", color: "#D62021" }),
    S("variety", "Variety", "cultuur", "en", "Film, series en de entertainmentindustrie.", "https://variety.com/feed/", { login: "https://variety.com/", forTopic: "film", pick: true, topics: ["film"], color: "#1A1A1A", bsky: "variety.com" }),
    S("guardian-culture", "The Guardian Cultuur", "cultuur", "en", "Film, boeken, kunst en podium.", "https://www.theguardian.com/culture/rss", { login: "https://profile.theguardian.com/signin", color: "#052962", bsky: "theguardian.com" })
  ];
  var BRAND = Object.fromEntries(SOURCES.map((s) => [s.id, s.color]));
  var MAIN_IDS = new Set(SOURCES.filter((s) => s.base && !s.music).map((s) => s.id));
  var MUSIC_IDS = new Set(SOURCES.filter((s) => s.music).map((s) => s.id));

  // shared/edition-limits.json
  var edition_limits_default = { target: 10, auditBelow: 6, floor: 4 };

  // shared/edition-limits.mjs
  var EDITION_TARGET = edition_limits_default.target;
  var EDITION_AUDIT_BELOW = edition_limits_default.auditBelow;
  var EDITION_FLOOR = edition_limits_default.floor;
  var editionStoryCount = (entries = []) => Array.isArray(entries) ? entries.filter((e) => e.desk !== "bubbel").length : 0;

  // shared/edition-policy.mjs
  var ALIAS = { "nos-sport": "nos", "nos-cultuur": "nos", "nos-economie": "nos", "bbc-sport": "bbc", "guardian-sport": "guardian", "guardian-music": "guardian", "guardian-culture": "guardian", "npr-music": "npr" };
  var COUNTRIES2 = Object.fromEntries(Object.entries({
    NL: [...NL_HOME, "tweakers", "vi", "wielerflits", "3voor12"],
    BE: [...VL_HOME],
    US: ["nyt", "atlantic", "newyorker", "foreignpolicy", "politico", "npr", "bloomberg", "theverge", "wired", "ars", "techcrunch", "mittr", "ign", "gamespot", "polygon", "quanta", "sciam", "espn", "pitchfork", "rollingstone", "stereogum", "variety"],
    GB: ["guardian", "bbc", "economist", "ft", "independent", "telegraph", "eurogamer", "nature", "carbonbrief", "autosport", "quietus"],
    DE: ["dw"],
    FR: ["lemonde"],
    QA: ["aljazeera"],
    HK: ["scmp"]
  }).flatMap(([country, ids]) => ids.map((id) => [id, country])));
  var publisherOf = (id) => ALIAS[id] || id;
  var publisherCountry = (id) => COUNTRIES2[publisherOf(id)] || null;
  function coverageOf(items = []) {
    const ids = [...new Set(items.map((i) => publisherOf(i.source)).filter(Boolean))].sort();
    return { publisherCount: ids.length, publisherCountries: [...new Set(ids.map(publisherCountry).filter(Boolean))].sort() };
  }
  var SPORT_CAT = new Map(SOURCES.map((s) => [s.id, s.cat]));
  var SPORT_NAMES = new Set(SOURCES.filter((s) => s.cat === "sport").map((s) => s.name));
  var SPORT_KEYS = /* @__PURE__ */ new Set(["formula", "formule", "f1", "fia", "marathon", "voetbal", "football", "soccer", "eredivisie", "tennis", "wimbledon", "olympic", "olympisch", "wielrennen", "cycling", "nba", "nfl", "nhl", "mlb", "rugby", "cricket", "darts", "qualifying", "autodromo", "interlagos", "wk", "ek"]);
  var SPORT_HEAD = /\b(marathon|grand prix|formula (1|one)|formule 1|f1|premier league|champions league|world cup|wk|ek|eredivisie|olympic\w*|olympisch\w*|nba|nfl)\b/i;
  function sportStory(story = {}, items = [], catOf = null) {
    if (typeof story.sport === "boolean") return story.sport;
    const units = /* @__PURE__ */ new Map();
    const bySource = /* @__PURE__ */ new Map();
    for (const i of items) if (i?.source) (bySource.get(i.source) || bySource.set(i.source, []).get(i.source)).push(i);
    for (const [src, its] of bySource) {
      const dedicated = (catOf?.get(src) ?? SPORT_CAT.get(src)) === "sport";
      units.set(its[0].sourceName || src, dedicated || its.filter((i) => isSport(i, catOf)).length * 2 >= its.length);
    }
    for (const name of story.sourceNames || []) if (!units.has(name)) units.set(name, SPORT_NAMES.has(name));
    const sport = [...units.values()].filter(Boolean).length;
    if (!units.size || !sport) return false;
    if (sport * 2 >= units.size) return true;
    const evidence = (story.keys || []).filter((k) => SPORT_KEYS.has(k)).length >= 3 || items.some((i) => SPORT_HEAD.test(i.title || ""));
    return sport >= 3 && sport * 3 >= units.size && evidence;
  }
  var GALLERY_TITLE = /\b(in photos( and videos?)?|in pictures|photos? and videos?|slideshow|gallery|in beeld|fotoreportage|fotoserie)\b/i;
  var GALLERY_URL = /\/(interactive|slideshow|gallery|galleries|fotoserie|in-beeld)\/|[-/](in-photos|in-pictures|photos-and-videos?|slideshow|fotoreportage|fotoserie)\b/i;
  var isGallery = (item) => GALLERY_TITLE.test(item?.title || "") || GALLERY_URL.test(String(item?.url || "").split("?")[0]);
  var onlyGalleries = (items) => items.length > 0 && items.every(isGallery);
  function majorNews(story = {}, items = []) {
    if (onlyGalleries(items)) return false;
    const coverage = coverageOf(items);
    const observedSources = new Set(items.map((i) => i.source).filter(Boolean)).size;
    const count = story.publisherCount ?? (observedSources >= (story.sourceCount || Infinity) ? coverage.publisherCount : story.sourceCount) ?? coverage.publisherCount;
    const countries = new Set(story.publisherCountries || coverage.publisherCountries);
    return count >= FRONT_BIG || count >= 5 && countries.size >= 2;
  }
  var worldChosen = (prof) => prof.interests ? prof.interests.has("wereld") : (prof.family?.wereld || 0) >= 0.5;
  var sportChosen = (prof) => prof.interests ? prof.interests.has("sport") : (prof.family?.sport || 0) >= 0.5;
  var FOREIGN_NEWS = /* @__PURE__ */ new Set(["nyt", "atlantic", "newyorker", "foreignpolicy", "politico", "npr", "bloomberg", "guardian", "bbc", "economist", "ft", "independent", "telegraph", "dw", "lemonde", "aljazeera", "scmp"]);
  var BEAT = /* @__PURE__ */ new Set(["economie", "tech", "wetenschap", "cultuur", "sport"]);
  var generalNews = (item) => !(item?.topics || []).some((t) => BEAT.has(FAMILY_OF[t]));
  var homeCovered = (items, story) => story?.homeCovered === true || (story?.publisherCountries || []).some((c) => c === "NL" || c === "BE") || items.some((i) => ["NL", "BE"].includes(publisherCountry(i?.source)));
  function internationalNews(items = [], desk = null, story = null) {
    if (["buitenland", "vs", "middenoosten", "oekraine"].includes(desk)) return true;
    const foreign = storyForeignOf(items);
    const unknownAbroad = desk !== "wetenschap" && !homeCovered(items, story);
    const geos = items.map((i) => geoOf(i, desk, foreign) ?? (unknownAbroad && FOREIGN_NEWS.has(i?.source) && generalNews(i) ? "int" : null));
    const abroad = geos.filter((g) => g === "int").length;
    return foreign || abroad > geos.filter((g) => g === "nl").length && abroad * 2 >= geos.length;
  }
  function exceptionalDutchSport(story, items) {
    if (!majorNews(story, items)) return false;
    return items.some((i) => /\b(nederland\w*|netherlands|dutch|oranje)\b/i.test(i.title || "") && /\b(wk|wereldkampioenschap\w*|world cup|olympisch\w*|olympic\w*)\b/i.test(i.title || "") && /\b(finale|final|kampioen\w*|goud|gold)\b/i.test(i.title || ""));
  }
  var specialistMemo = /* @__PURE__ */ new WeakMap();
  function specialistMatch(prof, items = [], desk = null) {
    if (!prof?.topicP || !prof?.favorites || ![...BEAT].some((f) => (prof.family?.[f] || 0) >= 0.5)) return false;
    if (!items.length) return false;
    let memo2 = specialistMemo.get(prof);
    if (!memo2) specialistMemo.set(prof, memo2 = { next: /* @__PURE__ */ new WeakMap(), values: /* @__PURE__ */ new Map() });
    for (const item of items) {
      if (!item || typeof item !== "object") return false;
      let next = memo2.next.get(item);
      if (!next) memo2.next.set(item, next = { next: /* @__PURE__ */ new WeakMap(), values: /* @__PURE__ */ new Map() });
      memo2 = next;
    }
    if (memo2.values.has(desk)) return memo2.values.get(desk);
    const hit = personalParts(items, prof, {}, { desk, foreign: true }).interest;
    const match = !!hit && items.filter((i) => keywordTopics(`${i.title || ""} ${i.summary || ""}`).some((t) => FAMILY_OF[t] === hit.f)).length * 2 >= items.length && BEAT.has(hit.f) && hit.shown !== false && hit.cov >= 0.5 && (prof.family?.[hit.f] || 0) >= 0.5;
    memo2.values.set(desk, match);
    return match;
  }
  var OPEN_WORLD_MIN = 4;
  var emptyProfile = (prof) => !prof?.interests?.size && !Object.keys(prof?.family || {}).length;
  function publishersOf(story = {}, items = []) {
    const observedSources = new Set(items.map((i) => i?.source).filter(Boolean)).size;
    return story?.publisherCount ?? (observedSources >= (story?.sourceCount || Infinity) ? coverageOf(items).publisherCount : story?.sourceCount) ?? coverageOf(items).publisherCount;
  }
  var openWorld = (prof, items = [], story = null) => emptyProfile(prof) && !onlyGalleries(items) && publishersOf(story || {}, items) >= OPEN_WORLD_MIN;
  var cappedInternational = (prof, items = [], desk = null, story = null) => internationalNews(items, desk, story) && !specialistMatch(prof, items, desk) && !openWorld(prof, items, story);
  function lightVideoFiller(item, prof = null) {
    const title = item?.title || "";
    if (/\b(evidence of|video evidence|videobewijs|bewijs van|investigation into|onderzoek naar|war crimes|oorlogsmisdrijven)\b/i.test(title)) return false;
    const curated = /\b(get in the spirit|these (?:horror|spooky|scary|halloween)|best (?:horror|spooky|scary|halloween)|(?:horror|halloween|spooky|scary).*(?:roundup|round-up|collection|to watch))\b/i.test(title);
    const video = /\b(youtube|tiktok|videos?|trailers?)\b/i.test(title);
    return curated && video && !((prof?.family?.cultuur || 0) >= 0.5 && (prof?.topicP?.film || 0) >= 0.5);
  }
  var LIGHT_CAT = { games: "games", cultuur: "cultuur" };
  var LIGHT_TOPIC = { games: "games", film: "cultuur", muziek: "cultuur", boeken: "cultuur", kunst: "cultuur", media: "cultuur" };
  var LIGHT_PATH_GAMES = /\/(games?|gaming|gameblog)\//i;
  var LIGHT_PATH = /\/(entertainment|showbizz|show|boulevard|celebrit\w*|lifestyle|style|fashion|mode|t-magazine|dining|food|eten|koken-en-eten|recepten|travel|reizen|realestate|arts|books|boeken|movies|theater|television|tv|film|muziek|music|kunst-media|media-en-cultuur|cultuur(?:-media)?|culture)\//i;
  var LIGHT_HEAD = /\b(podcast\w*|talkshow\w*|presentat(?:or|rice)\w*|tv-serie\w*|streamingdienst\w*|kookboek\w*|recept\w*|recipe\w*)\b/i;
  var CONSUMER_PATH = /\/(reviews?|deals?|gift-guide|buying-guide|best-\w+)\//i;
  var CONSUMER_SLUG = /(?:^|-)(review|hands-on|deal-sale|price-specs\w*|specs-price\w*|release-date-price\w*|kortingscode\w*|aanbieding\w*)(?:-|$)/i;
  var slugOf = (url) => (url.replace(/\/+$/, "").split("/").pop() || "").replace(/\.\w+$/, "").replace(/~.*$/, "");
  var CONSUMER_HEAD = /(^|\b)(review|getest|hands-on|korting|aanbieding|buying guide|gift guide|best (?:\w+ ){0,3}(?:to buy|for \w+))\b|[$€£]\s?\d[\d,.]*\s+off\b|\b\d+% off\b|\bspecs,? (?:and )?price\b|\bprice,? (?:and )?specs\b/i;
  var HARD_HEAD = /\b(rechter\w*|rechtbank|rechtszaak|court|lawsuit|sued|sues|verbod|verboden|ban|bans|banned|boete\w*|fined?|fines|toezichthouder\w*|regulator\w*|antitrust|mededinging\w*|ontslag\w*|layoffs?|laid off|staking\w*|strike|protest\w*|betoging\w*|demonstr\w*|overname\w*|takeover|fusie\w*|merger|hack\w*|datalek\w*|breach|lek|minister\w*|kabinet\w*|regering\w*|government|congres\w*|congress|senaat|senate|parlement\w*|kamer\w*|politie|police|arrest\w*|aangehouden|oorlog|war|aanslag\w*|sanctie\w*|sanctions?|tarie\w*|tariffs?|faillis\w*|bankrupt\w*)\b/i;
  var HARD_FAMILIES = /* @__PURE__ */ new Set(["politiek", "wereld"]);
  var hardNews = (item) => HARD_HEAD.test(item?.title || "") || (item?.topics || []).some((t) => HARD_FAMILIES.has(FAMILY_OF[t]));
  function lightKind(item, catOf = null) {
    if (!item) return null;
    const title = item.title || "";
    if (hardNews(item)) return null;
    const url = String(item.url || "").split("?")[0];
    const cat = catOf?.get(item.source) ?? SPORT_CAT.get(item.source);
    const byTopic = (item.topics || []).map((t) => t === "media" && !LIGHT_PATH.test(url) ? null : LIGHT_TOPIC[t]).find(Boolean);
    if (LIGHT_CAT[cat]) return LIGHT_CAT[cat];
    if (LIGHT_PATH_GAMES.test(url) || byTopic === "games") return "games";
    if (byTopic || LIGHT_PATH.test(url) || LIGHT_HEAD.test(title)) return "cultuur";
    if (CONSUMER_PATH.test(url) || CONSUMER_SLUG.test(slugOf(url)) || CONSUMER_HEAD.test(title)) return "consument";
    return null;
  }
  var CAT_BY_NAME = new Map(SOURCES.map((s) => [s.name, s.cat]));
  var ID_BY_NAME = new Map(SOURCES.map((s) => [s.name, s.id]));
  var LIGHT_ORDER = ["games", "cultuur", "consument"];
  function lightStory(story = {}, items = [], catOf = null) {
    if (story && story.light !== void 0) return story.light || null;
    const bySource = /* @__PURE__ */ new Map();
    for (const i of items) if (i?.source) (bySource.get(i.source) || bySource.set(i.source, []).get(i.source)).push(i);
    const units = /* @__PURE__ */ new Map();
    let hard = 0;
    for (const [src, its] of bySource) {
      const kinds2 = its.map((i) => lightKind(i, catOf)).filter(Boolean);
      if (its.some(hardNews)) hard++;
      units.set(its[0].sourceName || src, kinds2.length * 2 >= its.length ? kinds2[0] : null);
    }
    for (const name of story?.sourceNames || []) if (!units.has(name) && LIGHT_CAT[CAT_BY_NAME.get(name)]) units.set(name, LIGHT_CAT[CAT_BY_NAME.get(name)]);
    const kinds = [...units.values()].filter(Boolean);
    const enough = kinds.length * 2 > units.size || kinds.length >= 2 && hard === 0 && kinds.length * 2 >= units.size;
    if (!units.size || !enough) return null;
    const count = {};
    for (const k of kinds) count[k] = (count[k] || 0) + 1;
    return [...LIGHT_ORDER].sort((a, b) => (count[b] || 0) - (count[a] || 0) || LIGHT_ORDER.indexOf(a) - LIGHT_ORDER.indexOf(b))[0];
  }
  var GENERAL_CATS = /* @__PURE__ */ new Set(["nl", "vl", "int", "regio"]);
  var LIGHT_MAJOR = 6;
  function majorGeneralNews(story = {}, items = [], catOf = null) {
    if (onlyGalleries(items)) return false;
    const catFor = (id) => catOf?.get(id) ?? SPORT_CAT.get(id);
    const voice = (id, cat) => cat === "regio" ? "regio" : publisherOf(id);
    const ids = new Set(items.map((i) => i?.source).filter((id) => id && GENERAL_CATS.has(catFor(id))).map((id) => voice(id, catFor(id))));
    for (const name of story.sourceNames || []) if (GENERAL_CATS.has(CAT_BY_NAME.get(name))) ids.add(voice(ID_BY_NAME.get(name), CAT_BY_NAME.get(name)));
    const countries = new Set([...ids].map(publisherCountry).filter(Boolean));
    return ids.size >= LIGHT_MAJOR || ids.size >= 5 && countries.size >= 2;
  }
  var CULTUUR_KIND = ["muziek", "film", "boeken", "kunst", "media"];
  var cultuurChosen = (prof, min = 0.5) => Math.max(0, ...CULTUUR_KIND.map((t) => prof?.topicP?.[t] || 0)) >= min;
  function lightChosen(prof, kind) {
    if (kind === "games") return (prof?.topicP?.games || 0) >= 0.5;
    if (kind === "cultuur") return cultuurChosen(prof);
    if (kind === "consument") return (prof?.topicP?.gadgets || 0) >= 0.5;
    return true;
  }
  var followedLight = (prof, items) => items.some((i) => prof?.chosenLight?.has?.(i?.source));
  var lightNews = (story, items, catOf = null) => story?.light === void 0 && items.length === 1 && !(story?.sourceNames || []).length ? lightKind(items[0], catOf) : lightStory(story, items, catOf);
  function newsRejection(prof, story, items, desk = null, { bubble = false, allowLight = false } = {}) {
    if (onlyGalleries(items)) return "alleen-galerijen";
    if (items.length && items.every((i) => lightVideoFiller(i, prof))) return "licht-videorondje-buiten-interesse";
    if ((sportStory(story, items, prof.catOf) || items.filter((i) => isSport(i, prof.catOf)).length * 2 > items.length) && !sportChosen(prof) && !exceptionalDutchSport(story, items)) return "sport-niet-gekozen";
    if (!bubble && !allowLight) {
      const light = lightNews(story, items, prof.catOf);
      if (light && !lightChosen(prof, light) && !followedLight(prof, items) && !majorGeneralNews(story, items, prof.catOf)) return "licht-buiten-interesse";
    }
    if (!worldChosen(prof) && cappedInternational(prof, items, desk, story) && !majorNews(story, items)) return "internationaal-niet-groot-genoeg";
    return null;
  }
  var allowedNews = (prof, story, items, desk = null, opts = {}) => newsRejection(prof, story, items, desk, opts) === null;

  // shared/editor-version.mjs
  var BASIS_REVISION = "redacteur-2026-11-07-taalregel";

  // shared/lang.mjs
  var NL = new Set(
    "de het een en op met voor niet dat die dit deze zijn wordt worden werd er ook naar bij aan om nog maar uit als dan wel geen meer zo hoe wat wie waar waarom hij zij ze je jij jouw uw haar hun ons onze mijn zich kan kunnen moet moeten wil willen gaat gaan heeft hebben tegen tussen na toch nu tot sinds vanaf onder zonder omdat want daar hier veel alle iets niets nieuwe eerste jaar jaren krijgt komt blijkt zegt vindt weer al ik mensen zou zouden".split(/\s+/)
  );
  var EN = new Set(
    "the a an and to for with on at by from are were be been has have will would could should not this that these those its he she they you your his her their our my who what when where why how which after before about into than but or as says said there here just all more year years while against between without because its it's don't doesn't didn't won't can't isn't aren't i'm you're they're we're what's here's there's people being does did makes made gets got".split(/\s+/)
  );
  var KNOWN_PATHS = [{ host: /(^|\.)parool\.nl$/, path: /^\/(amsterdam-news|guide)(\/|$)/, lang: "en" }];
  var LANG_MIN = 3;
  var LANG_SHARE = 0.75;
  var INTRO_CHARS = 300;
  function langFromUrl(url) {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, "");
      for (const k of KNOWN_PATHS) if (k.host.test(host) && k.path.test(u.pathname)) return k.lang;
    } catch {
    }
    return null;
  }
  function langCounts(text) {
    const words2 = String(text || "").toLowerCase().replace(/[‘’ʼ]/g, "'").match(/\p{L}+(?:'\p{L}+)*/gu) || [];
    let nl = 0;
    let en = 0;
    for (const w of words2) {
      if (NL.has(w)) nl++;
      if (EN.has(w)) en++;
    }
    return { nl, en };
  }
  function detectLang({ title = "", summary = "", text = "", url = "" } = {}) {
    const byUrl = langFromUrl(url);
    if (byUrl) return byUrl;
    const intro = String(summary || text || "").slice(0, INTRO_CHARS);
    const { nl, en } = langCounts(`${title} ${intro}`);
    const top = Math.max(nl, en);
    if (top < LANG_MIN || top / (nl + en) < LANG_SHARE) return null;
    return en > nl ? "en" : "nl";
  }

  // shared/slot-times.mjs
  var SLOT_START = { ochtend: 6 * 60 + 30, middag: 12 * 60, avond: 17 * 60 };
  var OCHTEND_VROEG = 5 * 60 + 30;

  // netlify/lib/stories.mjs
  var timeOf = (a) => Date.parse(a.publishedAt) || 0;
  var byRecency = (a, b) => timeOf(b) - timeOf(a);
  var deaccent = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  var wordMemo = null;
  var norm = (s) => {
    if (wordMemo && typeof s === "string" && s.length <= 40) {
      let v = wordMemo.get(s);
      if (v === void 0) wordMemo.set(s, v = deaccent(s).toLowerCase());
      return v;
    }
    return deaccent(String(s || "")).toLowerCase();
  };
  var STOP = new Set(
    "de het een en van op in te dat die voor met als om aan bij uit ook naar maar nog wordt worden heeft hebben zijn was werd niet wel meer jaar tegen door over deze onze the and for with that this from have will your about into over after their than what when which were been they them these those where while would could should more most some such also only just like said says year week time news live video update kills killed dead dies death attack attacks near least people police officials official after says report reports doden dood mensen zeker politie volgens aanval nieuwe eerste first three nobel prize prijs nobelprijs wins wint winner winnaar".split(
      " "
    )
  );
  function sigWords(title) {
    const out = /* @__PURE__ */ new Set();
    for (const w of norm(title).replace(/[^a-z0-9 ]/g, " ").split(/\s+/)) if (w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w)) out.add(w);
    return out;
  }
  function numbersOf(text) {
    const out = /* @__PURE__ */ new Set();
    for (const n of String(text || "").match(/\d+(?:[.,]\d+)?/g) || []) if (n.replace(/\D/g, "").length >= 2 && !/^(19|20)\d\d$/.test(n)) out.add(n.replace(",", "."));
    return out;
  }
  function sharedCount(a, b) {
    let n = 0;
    for (const w of a) if (b.has(w)) n++;
    return n;
  }
  var ALIAS2 = {
    vs: "us",
    usa: "us",
    amerika: "us",
    amerikaanse: "us",
    amerikaan: "us",
    amerikanen: "us",
    american: "us",
    americans: "us",
    america: "us",
    rusland: "russia",
    russische: "russia",
    russen: "russia",
    russian: "russia",
    russians: "russia",
    oekraine: "ukraine",
    oekraiense: "ukraine",
    ukrainian: "ukraine",
    duitsland: "germany",
    duitse: "germany",
    german: "germany",
    frankrijk: "france",
    franse: "france",
    french: "france",
    brittannie: "uk",
    britse: "uk",
    british: "uk",
    britain: "uk",
    engeland: "uk",
    england: "uk",
    chinese: "china",
    chinees: "china",
    israelische: "israel",
    israeli: "israel",
    israelisch: "israel",
    israelis: "israel",
    iraanse: "iran",
    iranian: "iran",
    // "Braziliaanse" is het land, geen eigen naam: als sterke naam trok het een portret van een
    // campagneleider in het verhaal over de vlucht van Bolsonaro.
    brazilie: "brazil",
    braziliaanse: "brazil",
    braziliaans: "brazil",
    brazilianen: "brazil",
    brazilian: "brazil",
    brazilians: "brazil",
    nederlandse: "nederland",
    dutch: "nederland",
    netherlands: "nederland",
    europese: "europe",
    european: "europe",
    europa: "europe",
    eu: "europe",
    navo: "nato",
    vn: "un",
    poetin: "putin",
    zelenski: "zelensky",
    zelenskyy: "zelensky",
    witte: "whitehouse",
    white: "whitehouse",
    koreaanse: "korea",
    koreaans: "korea",
    noordkoreaanse: "northkorea",
    zuidkoreaanse: "southkorea",
    koreanen: "korea",
    korean: "korea",
    koreans: "korea",
    // Voornamen van wereldleiders tellen als die leider (anders is "Donald" een sterke naam).
    // De twee Amerikaanse partijen in beide talen als één naam (keuring 6 november 2026). Geen eigen naam (NOT_A_NAME):
    // ze tellen alleen in sameSubject (`parties` in het kenmerk), en als brede naam (BROAD) nooit alleen.
    republikein: "republicans",
    republikeinen: "republicans",
    republikeinse: "republicans",
    republikeins: "republicans",
    republican: "republicans",
    gop: "republicans",
    democraat: "democrats",
    democraten: "democrats",
    democrat: "democrats",
    donald: "trump",
    benjamin: "netanyahu",
    vladimir: "putin",
    volodymyr: "zelensky",
    emmanuel: "macron",
    keir: "starmer",
    friedrich: "merz",
    recep: "erdogan",
    narendra: "modi",
    giorgia: "meloni",
    viktor: "orban",
    kamala: "harris",
    joe: "biden",
    elon: "musk",
    jinping: "xi"
  };
  var EU = {
    belgie: "belgium",
    belgische: "belgium",
    belgisch: "belgium",
    belgen: "belgium",
    belgium: "belgium",
    belgian: "belgium",
    belgians: "belgium",
    bulgarije: "bulgaria",
    bulgaarse: "bulgaria",
    bulgaars: "bulgaria",
    bulgaria: "bulgaria",
    bulgarian: "bulgaria",
    cyprus: "cyprus",
    cypriotische: "cyprus",
    cypriot: "cyprus",
    denemarken: "denmark",
    deense: "denmark",
    deens: "denmark",
    denen: "denmark",
    denmark: "denmark",
    danish: "denmark",
    danes: "denmark",
    estland: "estonia",
    estse: "estonia",
    estisch: "estonia",
    estonia: "estonia",
    estonian: "estonia",
    finland: "finland",
    finse: "finland",
    fins: "finland",
    finnen: "finland",
    finnish: "finland",
    finns: "finland",
    griekenland: "greece",
    griekse: "greece",
    grieks: "greece",
    grieken: "greece",
    greece: "greece",
    greek: "greece",
    greeks: "greece",
    hongarije: "hungary",
    hongaarse: "hungary",
    hongaars: "hungary",
    hongaren: "hungary",
    hungary: "hungary",
    hungarian: "hungary",
    hungarians: "hungary",
    ierland: "ireland",
    ierse: "ireland",
    iers: "ireland",
    ieren: "ireland",
    ireland: "ireland",
    irish: "ireland",
    italie: "italy",
    italiaanse: "italy",
    italiaans: "italy",
    italianen: "italy",
    italy: "italy",
    italian: "italy",
    italians: "italy",
    kroatie: "croatia",
    kroatische: "croatia",
    kroatisch: "croatia",
    kroaten: "croatia",
    croatia: "croatia",
    croatian: "croatia",
    letland: "latvia",
    letse: "latvia",
    lets: "latvia",
    latvia: "latvia",
    latvian: "latvia",
    litouwen: "lithuania",
    litouwse: "lithuania",
    litouws: "lithuania",
    lithuania: "lithuania",
    lithuanian: "lithuania",
    luxemburg: "luxembourg",
    luxemburgse: "luxembourg",
    luxembourg: "luxembourg",
    malta: "malta",
    maltese: "malta",
    oostenrijk: "austria",
    oostenrijkse: "austria",
    oostenrijks: "austria",
    oostenrijkers: "austria",
    austria: "austria",
    austrian: "austria",
    austrians: "austria",
    polen: "poland",
    poolse: "poland",
    pools: "poland",
    poland: "poland",
    polish: "poland",
    poles: "poland",
    portugal: "portugal",
    portugese: "portugal",
    portugees: "portugal",
    portugezen: "portugal",
    portuguese: "portugal",
    roemenie: "romania",
    roemeense: "romania",
    roemeens: "romania",
    roemenen: "romania",
    romania: "romania",
    romanian: "romania",
    romanians: "romania",
    slovenie: "slovenia",
    sloveense: "slovenia",
    sloveens: "slovenia",
    slovenia: "slovenia",
    slovenian: "slovenia",
    slowakije: "slovakia",
    slowaakse: "slovakia",
    slowaaks: "slovakia",
    slovakia: "slovakia",
    slovak: "slovakia",
    slovakian: "slovakia",
    spanje: "spain",
    spaanse: "spain",
    spaans: "spain",
    spanjaarden: "spain",
    spain: "spain",
    spanish: "spain",
    spaniards: "spain",
    tsjechie: "czechia",
    tsjechische: "czechia",
    tsjechisch: "czechia",
    tsjechen: "czechia",
    czechia: "czechia",
    czech: "czechia",
    czechs: "czechia",
    zweden: "sweden",
    zweedse: "sweden",
    zweeds: "sweden",
    sweden: "sweden",
    swedish: "sweden",
    swedes: "sweden",
    // EU-hoofdsteden die als plaats in het nieuws van vandaag stonden. Geen buurlanden: "Servië" als
    // zwakke naam liet een fotoreportage uit het Servische verkiezingsverhaal vallen (clustering-2610).
    warschau: "warsaw",
    warsaw: "warsaw",
    wenen: "vienna",
    vienna: "vienna",
    lissabon: "lisbon",
    lisbon: "lisbon",
    athene: "athens",
    athens: "athens",
    boedapest: "budapest",
    budapest: "budapest",
    praag: "prague",
    prague: "prague",
    kopenhagen: "copenhagen",
    copenhagen: "copenhagen",
    stockholm: "stockholm",
    dublin: "dublin"
  };
  var PARTY = { communistische: "communist", communistisch: "communist", communist: "communist", communists: "communist" };
  var CHAMBER = { senaat: "senate", senaats: "senate", congres: "congress" };
  var ALIAS_EXT = { ...ALIAS2, ...EU, ...PARTY, ...CHAMBER };
  var translit = (k) => k.replace(/sj/g, "sh");
  var NL_LANG = new Set(SOURCES.filter((x) => x.lang === "nl").map((x) => x.id));
  var WEAK = new Set(
    "us russia ukraine germany france uk china israel iran nederland europe nato un putin zelensky trump biden harris vance netanyahu musk xi macron starmer merz erdogan modi meloni orban schoof pentagon congress senate senaat congres kremlin whitehouse ice fbi cia nasa who gaza taiwan india japan canada mexico brazil turkije turkey syria syrie venezuela korea northkorea southkorea texas california florida georgia carolina virginia ohio michigan arizona nevada pennsylvania wisconsin washington brussel brussels londen london parijs paris moskou moscow kyiv kiev berlijn berlin seoul busan pyongyang tokio tokyo peking beijing jeruzalem jerusalem teheran tehran amsterdam rotterdam".split(
      " "
    )
  );
  var PARTIES = /* @__PURE__ */ new Set(["republicans", "democrats"]);
  var WEAK_EXT = /* @__PURE__ */ new Set([...WEAK, ...Object.values(EU), "wallstreet", "hongkong"]);
  var COMMON_3 = new Set(
    "man men dag dit dat hoe wat wie kan wil dan ter wet zee weg bal kop oog nog ook nee wel zet mol pan dam vol tel zak kom hij zij wij ons mij jou hof cup one can are you our all get got off see she his yet way key isn big day war own bad hat fat few buy pay eat web hub led doe fee pat old new now how why who its has had was not but and the for too two ten six red top end run set put say ask let may yes far low out via per pro mid pre non ago sea bay oil".split(
      " "
    )
  );
  var NOT_A_NAME = new Set(
    "new the of van der den des het een and for with from north south east west noord zuid oost voor tegen saint san los las great united states verenigde staten house huis kamer eerste tweede president minister premier koning king queen prins prince paus pope major maj gen general sen rep dr mr mrs ms sir lord secretary department ministerie defense defensie monday tuesday wednesday thursday friday saturday sunday maandag dinsdag woensdag donderdag vrijdag zaterdag zondag january february march april may june july august september october november december januari februari maart mei juni juli augustus oktober republican republicans democrat democrats democratic republikeinen democraten gop times guardian bbc nos nrc npr volkskrant wired verge atlantic economist politico reuters associated press getty afp images photo photos foto video live update breaking opinion analyse analysis why how what when who where this that these those here there after before more most just also only nobel nobelprijs nobelcomite ballon prize prijs literature literatuur peace vrede force air royal city stad agent police politie court national international".split(
      " "
    )
  );
  var CONCEPTS = [
    ["execution", /\b(executie|geexecuteerd|execution|executed|execute)\b/, true],
    ["firingsquad", /\b(vuurpeloton|firing squad)\b/, true],
    ["livestream", /(livestream|live-stream|live uitzend|live uitgezonden|streamed live|live te zien)/, true],
    ["nobel", /\bnobel/, true],
    ["quake", /\b(aardbeving|earthquake)/, true],
    ["flood", /\b(overstroming|flood)/, true],
    ["hurricane", /\b(orkaan|hurricane|tyfoon|typhoon)/, true],
    ["ceasefire", /\b(wapenstilstand|staakt-het-vuren|ceasefire|truce)\b/, true],
    ["hostage", /\b(gijzel|hostage)/, true],
    ["sanctions", /\b(sanctie|sanction)/, true],
    ["tariffs", /\b(invoerheffing|importheffing|heffingen|tariff)/, true],
    ["merger", /\b(fusie|megafusie|overname|merger|acquisition|takeover)\b/, true],
    ["bankrupt", /\b(faillie|bankrupt)/, true],
    ["vaccine", /\bvaccin/, true],
    ["nuclear", /\b(kernwapen|kerncentrale|kernprogramma|nuclear|nucleair)/, true],
    ["derail", /\b(ontspoor|derail)/, true],
    ["planecrash", /\b(neergestort|vliegtuigcrash|plane crash|crashed)\b/, true],
    ["impeach", /\b(impeach|afzetting|afzettingsprocedure)/, true],
    ["shoot", /\b(schiet|schoot|neergeschoten|doodgeschoten|schietpartij|shoot|shoots|shot|shooting|gunman|schutter)\b/, false],
    ["dead", /\b(doden|dood|gedood|omgekomen|sterft|overleden|overlijdt|dies|died|dead|death|killed|kills)\b/, false],
    ["attack", /\b(aanval|aanvallen|aanslag|luchtaanval|attack|attacks|airstrike|strike|strikes|bombard\w*)\b/, false],
    ["arrest", /\b(arrest\w*|gearresteerd|opgepakt|aangehouden|detained)\b/, false],
    ["court", /\b(rechter|rechtbank|rechtszaak|vonnis|veroordeeld|hooggerechtshof|court|judge|trial|convicted|sentenced|verdict)\b/, false],
    ["charged", /\b(aangeklaagd|aanklacht|indicted|charged|indictment)\b/, false],
    // Ook de nederlaag of zege van een Amerikaanse partij (keuring 6 november 2026: "Het grote vingerwijzen naar de
    // schuldigen van de Republikeinse nederlaag" noemde de verkiezing niet).
    ["election", /(\w*verkiezing\w*|\belection\w*|\bmidterm\w*|\bstembus|\bstemlokal\w*|\bhead to the polls|\b(republikein\w*|republican|democratische|democratic) (nederlaag|zege|overwinning|defeat|loss|losses|victory|sweep))\b/, false],
    ["resign", /\b(aftreden|treedt af|stapt op|opgestapt|ontslagen|resign\w*|steps down|fired)\b/, false],
    ["fire", /\b(brand|branden|bosbrand\w*|wildfire\w*|blaze)\b/, false],
    ["protest", /\b(protest\w*|betoging\w*|demonstratie\w*|demonstrat\w*)\b/, false],
    ["police", /\b(politie|police|agent|agenten|officer|officers)\b/, false],
    ["military", /\b(leger|militair\w*|military|army|troops|troepen|soldier\w*|soldaat|soldaten)\b/, false],
    ["immigration", /\b(immigra\w*|migrant\w*|asiel\w*|asylum|deport\w*|uitgezet|uitzetting)\b/, false],
    ["child", /\b(kind|kinderen|child|children|\d+-jarig\w*|\d+-year-old)\b/, false],
    ["award", /\b(wint|winnaar|gewonnen|wins|winner|awarded|award)\b/, false],
    ["missile", /\b(raket\w*|missile\w*|rocket\w*|drone\w*)\b/, false]
  ];
  var CONCEPTS_EXT = [
    ...CONCEPTS,
    ["hack", /\b(hack\w*|gehackt|cyberaanval\w*|cyberattack\w*|datalek|data breach|ransomware)\b/, true],
    ["theft", /\b(roof|beroofd|gestolen|diefstal|steal|stole|stolen|theft|heist|robbery|overval\w*)\b/, true],
    ["pact", /\b(akkoord|alliantie|verdrag|handelsakkoord|alliance|treaty|pact|trade deal)\b/, false],
    // De evacuatie van Olesjky stond in een Nederlands en een Engels verhaal; de zuiveringen in de
    // Chinese partij ook. Geen van beide heeft een gebeurtenis-woord uit de gewone lijst.
    ["evacuate", /\b(evacu\w*|geevacueerd|ontruim\w*)\b/, false],
    ["purge", /\b(zuivering\w*|gezuiverd|purge\w*|expels?|expelled|expulsion\w*)\b/, true],
    ["market", /\b(beurs\w*|aandelen|aandeel|nasdaq|aex|stock market|stocks|shares|selloff|sell-off|plunge\w*|kelder\w*|gekelderd)\b/, false]
  ];
  var COMPOUND = [
    [/\b(Noord|North)[- ]Korea\b/g, "Northkorea"],
    [/\b(Zuid|South)[- ]Korea\b/g, "Southkorea"]
  ];
  var COMPOUND_EXT = [
    ...COMPOUND,
    [/\b(Grondwettelijk|Constitutioneel|Constitutionele|Grondwettelijke)\s+(Hof|hof)\b/g, "Constitutionalcourt"],
    [/\b(Constitutional|constitutional|Top|top)\s+(Court|court|Tribunal|tribunal)\b/g, "Constitutionalcourt"],
    [/\b(Hooggerechtshof|hooggerechtshof)\b/g, "Supremecourt"],
    [/\b(Supreme|supreme)\s+(Court|court)\b/g, "Supremecourt"],
    [/\b(Wall|wall)\s+(Street|street)\b/g, "Wallstreet"],
    [/\bHong\s+Kong\b/g, "Hongkong"]
  ];
  var INSTITUTES = /* @__PURE__ */ new Set(["constitutionalcourt", "supremecourt"]);
  var joinCompounds = (text, ext = false) => (ext ? COMPOUND_EXT : COMPOUND).reduce((t, [re, to]) => t.replace(re, to), String(text || ""));
  var tokenize = (text, ext = false) => joinCompounds(text, ext).replace(/\b([A-Z])\.(?=[A-Z]\.)/g, "$1").replace(/\b([A-Z]{2,})\./g, "$1").replace(/[’']s\b/g, "").match(/[\p{L}\p{N}]+/gu) || [];
  var isCap = (w) => /^\p{Lu}\p{Ll}/u.test(w);
  var isAcronym = (w) => /^\p{Lu}{2,6}$/u.test(w);
  var isAcronymExt = (w) => isAcronym(w) || /^\p{Lu}{1,3}\d{1,3}$/u.test(w);
  var isTitleCase = (title) => {
    const words2 = tokenize(title).filter((w) => w.length >= 4);
    return words2.length >= 3 && words2.filter(isCap).length / words2.length >= 0.6;
  };
  var partTokens = (part) => {
    if (!wordMemo || part.length > 40) return tokenize(part);
    const key = `\0${part}`;
    let v = wordMemo.get(key);
    if (v === void 0) wordMemo.set(key, v = tokenize(part));
    return v;
  };
  function nameVocabulary(articles, ext = false) {
    const vocab = /* @__PURE__ */ new Set();
    const scan = (text) => {
      let sentenceStart = true;
      for (const part of (ext ? joinCompounds(text, true) : String(text || "")).split(/(\s+)/)) {
        if (!part.trim()) continue;
        const words2 = partTokens(part);
        for (const w of words2) {
          if (!sentenceStart && isCap(w) && w.length >= 3) vocab.add(norm(w));
          sentenceStart = false;
        }
        if (/[.!?:;"“‘(]$/.test(part) || /^["“‘(]/.test(part)) sentenceStart = /[.!?:]["”’)]?$/.test(part);
      }
    };
    for (const a of articles) {
      if (!isTitleCase(a.title)) scan(a.title);
      scan(a.text || a.summary);
    }
    return vocab;
  }
  var CONNECT = /* @__PURE__ */ new Set(["van", "de", "der", "den", "du", "da", "di", "la", "le", "von", "bin", "al", "el", "y", "of"]);
  var SEGMENT = /[^\p{L}\p{N}\s’'\-]+/u;
  function signature(article, vocab, ext = false) {
    const alias = ext ? ALIAS_EXT : ALIAS2;
    const weakSet = ext ? WEAK_EXT : WEAK;
    const minLen = ext ? 3 : 4;
    const acr = ext ? isAcronymExt : isAcronym;
    const concepts_ = ext ? CONCEPTS_EXT : CONCEPTS;
    const raw = `${article.title}. ${article.text || article.summary || ""}`;
    const strong = /* @__PURE__ */ new Set();
    const weak = /* @__PURE__ */ new Set();
    const known = /* @__PURE__ */ new Set();
    const parties = /* @__PURE__ */ new Set();
    const aliasOf = (k) => ext ? translit(alias[k] || k) : alias[k] || k;
    const acronyms = /* @__PURE__ */ new Set();
    const dutchPiece = ext && NL_LANG.has(article.source);
    const nameOf = (w) => {
      const k = norm(w);
      if (vocab.has(k)) return k;
      return dutchPiece && isCap(w) && k.length >= 6 && k.endsWith("s") && vocab.has(k.slice(0, -1)) && !alias[k] && !alias[k.slice(0, -1)] ? k.slice(0, -1) : null;
    };
    const capName = (w) => {
      if (w.length < minLen || !isCap(w)) return null;
      const k = nameOf(w);
      return k && !(w.length === 3 && COMMON_3.has(norm(w))) ? k : null;
    };
    const strongKey = (w) => {
      let key = null;
      if (acr(w)) key = norm(w);
      else key = capName(w);
      if (!key) return null;
      key = aliasOf(key);
      if (NOT_A_NAME.has(key) || weakSet.has(key) || key.length < 3) return null;
      if (acr(w)) acronyms.add(key);
      return key;
    };
    for (const w of tokenize(raw, ext)) {
      if (isCap(w) || acr(w)) {
        const k = aliasOf(norm(w));
        if (weakSet.has(k)) known.add(k);
        if (PARTIES.has(k)) parties.add(k);
      }
      let key = null;
      if (acr(w)) key = norm(w);
      else key = capName(w);
      if (!key) continue;
      key = aliasOf(key);
      if (NOT_A_NAME.has(key)) continue;
      if (weakSet.has(key)) weak.add(key);
      else if (key.length >= 3) strong.add(key);
    }
    const text = norm(raw);
    const concepts = /* @__PURE__ */ new Set();
    let rare = 0;
    for (const [id, re, isRare] of concepts_) {
      if (re.test(text)) {
        concepts.add(id);
        if (isRare) rare++;
      }
    }
    const out = { eventScope: eventScope(article), words: sigWords(article.title), strong, weak, known, parties, concepts, rareIds: new Set(concepts_.filter(([id, , r]) => r && concepts.has(id)).map(([id]) => id)), t: timeOf(article), raw };
    if (ext) {
      if (strong.has("constitutionalcourt") || strong.has("supremecourt")) concepts.add("court");
      const runsOf = (text2) => {
        const runs = [];
        for (const part of joinCompounds(text2, ext).split(SEGMENT)) {
          let run = [];
          for (const w of tokenize(part)) {
            const k = strongKey(w);
            if (k) run.push(k);
            else if (!(run.length && CONNECT.has(norm(w)))) run.length && runs.push(run), run = [];
          }
          if (run.length) runs.push(run);
        }
        return runs;
      };
      out.runs = runsOf(raw);
      out.titleRuns = runsOf(article.title);
      out.actions = actionsOf(article.title);
      const alone = new Set(out.runs.filter((run) => run.length === 1).map(([k]) => k));
      const firstName = (k) => out.runs.some((run) => run.some((x, j) => x === k && j < run.length - 1 && !acronyms.has(run[j + 1])));
      for (const k of [...strong]) if (k.length === 3 && !acronyms.has(k) && !alone.has(k) && firstName(k)) strong.delete(k);
      out.runs = out.runs.map((run) => run.filter((k) => strong.has(k))).filter((run) => run.length);
      out.titleRuns = out.titleRuns.map((run) => run.filter((k) => strong.has(k))).filter((run) => run.length);
    }
    return out;
  }
  function sharedEntities(a, b, title = false) {
    const inRuns = (runs) => new Set(runs.flat());
    const sa = title && a.titleRuns ? inRuns(a.titleRuns) : a.strong;
    const sb = title && b.titleRuns ? inRuns(b.titleRuns) : b.strong;
    const shared = [...sa].filter((k) => sb.has(k));
    if (!a.runs || !b.runs) return shared.length;
    const parent = new Map(shared.map((k) => [k, k]));
    const find = (k) => {
      while (parent.get(k) !== k) k = parent.get(k);
      return k;
    };
    for (const runs of [a.runs, b.runs]) for (const run of runs) {
      const ks = run.filter((k) => parent.has(k));
      for (let i = 1; i < ks.length; i++) parent.set(find(ks[i]), find(ks[0]));
    }
    return new Set(shared.map(find)).size;
  }
  function sharedStrong(a, b, ext = false) {
    const n = sharedCount(a.strong, b.strong);
    if (!ext || !n) return n;
    const inst = [...a.strong].filter((k) => INSTITUTES.has(k) && b.strong.has(k)).length;
    if (!inst) return n;
    if (!sharedCount(a.weak, b.weak)) return n - inst;
    const own = (x, y) => [...x.weak].some((k) => !y.weak.has(k));
    return own(a, b) && own(b, a) ? n - inst : n;
  }
  var ACTIONS = [
    ["vonnis", /\b(vonnis\w*|veroordeeld|veroordeling|celstraf\w*|cel|tbs|schuldig|vrijgesproken|vrijspraak|sentenced|sentence|convicted|guilty|acquitted|jailed|prison term)\b/],
    ["sluiting", /\b(stopt|stoppen|sluit|gesloten|opgeheven|bezwijkt|closes|closed|closure|to close|shuts down|shut down)\b/],
    ["opstappen", /\b(stapt op|stappen op|treedt af|opgestapt|resigns|resigned|resignation|steps down|quits)\b/],
    ["arrestatie", /\b(gearresteerd|aangehouden|opgepakt|arrestatie|arrested|detained)\b/],
    ["overlijden", /\b(overleden|overlijdt|sterft|dies|died)\b/]
  ];
  var actionsOf = (title) => {
    const t = norm(title || "");
    return new Set(ACTIONS.filter(([, re]) => re.test(t)).map(([id]) => id));
  };
  var WORD_WINDOW = 48 * 60 * 60 * 1e3;
  var EVENT_WINDOW = 36 * 60 * 60 * 1e3;
  var NAMES_WINDOW = 12 * 60 * 60 * 1e3;
  function sameEvent(a, b, ext = false) {
    if (conflictingEvents(a.eventScope, b.eventScope)) return false;
    const dt = Math.abs(a.t - b.t);
    if (a.strong.size && b.strong.size && !sharedStrong(a, b, ext) && !sharedCount(a.weak, b.weak)) return false;
    if (dt <= WORD_WINDOW) {
      const n = sharedCount(a.words, b.words);
      if (n >= 3 && n / Math.min(a.words.size, b.words.size) >= 0.4) return true;
    }
    if (dt > EVENT_WINDOW) return false;
    const strong = sharedStrong(a, b, ext);
    const weak = sharedCount(a.weak, b.weak);
    const concepts = sharedCount(a.concepts, b.concepts);
    const rare = sharedCount(a.rareIds, b.rareIds);
    if (strong >= 2 && strong + weak + concepts >= 3) return true;
    if (ext && strong >= 2 && dt <= NAMES_WINDOW && sharedEntities(a, b, true) >= 2) return true;
    if (ext && strong >= 1 && dt <= NAMES_WINDOW && a.actions?.size === 1 && b.actions?.size === 1 && [...a.actions][0] === [...b.actions][0] && sharedEntities(a, b, true) >= 1) return true;
    if (strong >= 1 && concepts >= 1 && weak + concepts >= 2) return true;
    if (rare >= 2 && concepts >= 3 && weak + strong >= 1) return true;
    if (sharedCount(a.words, b.words) >= 3 && strong + weak >= 1) return true;
    return false;
  }
  var BROAD = /* @__PURE__ */ new Set(["us", "europe", "un", "nato", "uk", "trump", "whitehouse", "congress", "nederland", "republicans", "democrats"]);
  var SUBJECT_WINDOW = 12 * 60 * 60 * 1e3;
  var textCache = /* @__PURE__ */ new WeakMap();
  var subjectText = (s) => {
    let t = textCache.get(s);
    if (!t) textCache.set(s, t = { words: sigWords(s.raw), nums: numbersOf(s.raw) });
    return t;
  };
  function sameSubject(a, b) {
    if (conflictingEvents(a.eventScope, b.eventScope)) return false;
    if (sameEvent(a, b)) return true;
    const dt = Math.abs(a.t - b.t);
    if (dt > EVENT_WINDOW) return false;
    if (dt <= SUBJECT_WINDOW && a.raw !== void 0 && b.raw !== void 0) {
      const names = [...a.strong].filter((k) => b.strong.has(k));
      if (names.some((k) => a.words.has(k) || b.words.has(k))) {
        const ta = subjectText(a);
        const tb = subjectText(b);
        const words2 = [...ta.words].filter((w) => tb.words.has(w) && !a.strong.has(w) && !b.strong.has(w)).length;
        if (words2 >= 4 || words2 >= 3 && sharedCount(ta.nums, tb.nums) >= 1) return true;
      }
    }
    const shared = [...a.known].filter((k) => b.known.has(k));
    for (const k of a.parties || []) if (b.parties?.has(k)) shared.push(k);
    const concepts = sharedCount(a.concepts, b.concepts);
    if (!concepts) return false;
    if (shared.length >= 2 || shared.length >= 1 && sharedCount(a.strong, b.strong) >= 1) return true;
    return dt <= SUBJECT_WINDOW && shared.some((k) => !BROAD.has(k));
  }
  var HEAD_STOP = new Set("tussen between onder under tijdens during zonder without terwijl while sinds since amid ahead waarom wanneer".split(" "));
  function sameHeadEvent(a, b) {
    if (!a || !b || conflictingEvents(a.eventScope, b.eventScope)) return false;
    if (Math.abs(a.t - b.t) > SUBJECT_WINDOW) return false;
    const names = new Set([...a.strong].filter((k) => b.strong.has(k)));
    for (const k of a.known) if (b.known.has(k)) names.add(k);
    for (const k of a.parties || []) if (b.parties?.has(k)) names.add(k);
    if (!names.size) return false;
    const isName = (w) => [w, ALIAS_EXT[w]].some((k) => k && (WEAK.has(k) || a.strong.has(k) || b.strong.has(k) || a.known.has(k) || b.known.has(k)));
    const words2 = [...a.words].filter((w) => b.words.has(w) && !HEAD_STOP.has(w) && !isName(w)).length;
    if ([...a.strong].some((k) => b.strong.has(k) && !BROAD.has(k))) return words2 >= 1 || sharedCount(a.concepts, b.concepts) >= 1;
    return words2 >= 2;
  }
  function signatures(articles, extra = [], { extended = false } = {}) {
    const outer = wordMemo;
    wordMemo ||= /* @__PURE__ */ new Map();
    try {
      const vocab = nameVocabulary(articles, extended);
      const out = new Map([...articles, ...extra].map((a) => [a.id, signature(a, vocab, extended)]));
      sigVocab.set(out, { vocab, extended, heads: /* @__PURE__ */ new Map() });
      return out;
    } finally {
      wordMemo = outer;
    }
  }
  function previousHeads(sig, previous, now) {
    const v = sigVocab.get(sig);
    if (!v || !previous) return [];
    const shown2 = previous.shown?.length ? previous.shown : [...previous.titles || []].map((title) => ({ title, publishedAt: new Date(previous.at || now).toISOString() }));
    return shown2.map((a, k) => signature({ ...a, id: `vorige:${k}` }, v.vocab, v.extended));
  }
  var sigVocab = /* @__PURE__ */ new WeakMap();
  function headSignature(sig, item) {
    const v = sigVocab.get(sig);
    if (!v || !item) return null;
    let h = v.heads.get(item.id);
    if (!h) v.heads.set(item.id, h = signature({ ...item, text: "", summary: "" }, v.vocab, v.extended));
    return h;
  }
  var OWN_STORY = 5;
  function subjectTaken(sig, c, placed, items, meta = null) {
    let m = c.subj;
    if (!m || m.placed !== placed) m = c.subj = { placed, n: 0, hit: false };
    if (m.hit || m.n >= placed.length) return m.hit;
    const from = m.n;
    m.n = placed.length;
    return m.hit = subjectIn(sig, c, placed.slice(from), items, meta && meta.slice(from));
  }
  var STRAY_MIN = 4;
  function subjectIn(sig, c, list, items, meta = null) {
    const pubs = c.st ? c.st.publisherCount ?? c.st.sourceCount ?? 0 : 0;
    const own = c.kind === "story" && pubs >= OWN_STORY && items?.length ? items.map((i) => headSignature(sig, i)).filter(Boolean) : c.ids.map((id) => sig.get(id)).filter(Boolean);
    if (!meta || c.kind !== "story" || pubs < STRAY_MIN) return own.some((x) => list.some((s) => sameSubject(x, s)));
    const heads = /* @__PURE__ */ new Map();
    const itemOf = /* @__PURE__ */ new Map();
    if (items?.length) {
      for (const i of items) if (sig.has(i.id)) {
        const h = headSignature(sig, i);
        heads.set(sig.get(i.id), h);
        itemOf.set(sig.get(i.id), i).set(h, i);
      }
    }
    const headOf = (x) => heads.has(x) ? heads.get(x) : x;
    const result = (x, it) => voteKind(it) === 2 && voteKind(itemOf.get(x)) === 2;
    const hits = /* @__PURE__ */ new Map();
    for (let k = 0; k < list.length; k++) {
      const mates = own.filter((x) => sameSubject(x, list[k]));
      if (!mates.length) continue;
      const p = meta[k];
      if (!p?.owner) return true;
      const got = hits.get(p.owner) || { event: [], all: [] };
      hits.set(p.owner, got);
      got.all.push(p.item);
      const theirs = headSignature(sig, p.item) || list[k];
      if (mates.some((x) => sameHeadEvent(headOf(x), theirs) || result(x, p.item))) {
        got.event.push(p.item);
        if (strayCore(p, got.event)) return true;
      }
      if (coverageOf(got.all.filter(Boolean)).publisherCount >= pubs) return true;
    }
    return false;
  }
  var STRAY_PUBS = 2;
  function strayCore(p, got) {
    if (got.some((i) => i?.id === p.lead)) return true;
    if (!(p.pubs > 1)) return true;
    return coverageOf(got.filter(Boolean)).publisherCount >= Math.min(STRAY_PUBS, Math.ceil(p.pubs / 2));
  }
  var STALE_AFTER = 24 * 60 * 60 * 1e3;
  var isStale = (item, now) => !!now && now - timeOf(item) > STALE_AFTER;
  function leadCandidates(items, mainIds, preferred = null, now = null, { role = "neutral" } = {}) {
    const score = (i) => (i.type === "opinie" ? -16 : 0) + (/\bpodcast\b/i.test(i.title || "") || isLive(i) ? -16 : 0) + (isStale(i, now) ? -32 : 0) + (isGallery(i) ? -48 : 0) + (preferred?.has(i.source) ? 12 : 0) + (mainIds.has(i.source) ? 8 : 0) + (cleanIntro(i.summary, i.author) ? 2 : 0) + (i.image && !i.imageFrom ? 1 : 0) + (role === "front" ? headlineFit(i.title) : 0);
    const scores = new Map(items.map((i) => [i, score(i)]));
    return [...items].sort((a, b) => scores.get(b) - scores.get(a) || byRecency(a, b));
  }
  var LIVE_TITLE = /^\W*live\b|\blive ?blog\b|\b(war|oorlog) (latest|live)\b|\blatest:|\blatest updates\b|(^|:\s*)(bekijk|vind|volg|lees) hier\b|^\W*praat mee\b|^\W*spoorboekje\b|\bresults live\b|\blive results\b|\blive briefing\b|:\s*all the news\s*$/i;
  var isLive = (a) => LIVE_TITLE.test(a.title || "") || /\/live(blog)?[-/]|[-/]liveblog/i.test(a.url || "");
  var CORE_FROM = 6;
  var VOTE_RE = /(verkiezing|\belection|\bmidterm|\bstembus|\b(elects?|elected|re-?elected|reelection|verkozen|herkozen|kiezers|voters|ballot|stembiljet)\b)/;
  var RESULT_RE = /\b(wint|winnen|wins?|won|gewonnen|verover\w*|herover\w*|flips?|flipped|verslaat|verslagen|beats?|defeats?|defeating|ousts?|ousting|unseats?|verliest|verliezen|verloren|loses|lost|verkozen|herkozen|elected|re-?elected|elects|clinch\w*|meerderheid|majority|uitslag\w*|results?|zege|monsterzege|overwinning\w*|victory|afstraffing|landslide|blue-?nami|tsunami|blauwe golf|blue wave|erkent verlies|concedes?|crushed|trounces?|rebuke)\b/;
  var OFFICE_RE = /\b(senate|senaat\w*|senator\w*|huiszetel\w*|congress\w*|congres\w*|governor\w*|gouverneur\w*|seats?|zetels?|mayor\w*|burgemeester\w*|parliament\w*|parlement\w*)\b/;
  var PARTY_RE = /\b(democrat\w*|republican\w*|republikein\w*)\b/;
  var voteText = (i) => norm(`${i.title || ""} ${i.summary || i.text || ""}`);
  var voteMemo = /* @__PURE__ */ new WeakMap();
  function voteKind(i) {
    if (!i || typeof i !== "object") return 0;
    if (voteMemo.has(i)) return voteMemo.get(i);
    const t = voteText(i);
    const sporty = SPORT_SOURCES.has(i.source);
    const result = RESULT_RE.test(t);
    const k = sporty || !(VOTE_RE.test(t) || result && OFFICE_RE.test(t)) ? 0 : result ? 2 : 1;
    voteMemo.set(i, k);
    return k;
  }
  var SPORT_SOURCES = new Set(SOURCES.filter((x) => x.cat === "sport").map((x) => x.id));
  function votePlace(i) {
    const ds = desksOf(i);
    const t = `${i.title || ""} ${i.summary || ""}`;
    if (ds.has("vs") || usPoliticsIn(t) || PARTY_RE.test(norm(t)) && OFFICE_RE.test(norm(t))) return "us";
    if (ds.has("binnenland")) return "nl";
    return countriesIn(i.title || "")[0] || null;
  }
  function placeOfGroup(items) {
    const count = /* @__PURE__ */ new Map();
    for (const i of items) {
      const p = votePlace(i);
      if (p) count.set(p, (count.get(p) || 0) + 1);
    }
    const best = [...count].sort((a, b) => b[1] - a[1] || textOrder(a[0], b[0]))[0];
    return best && best[1] * 2 >= items.length ? best[0] : null;
  }
  var VOTE_LEAD = 3 * 60 * 60 * 1e3;
  function voteResultOf(items = []) {
    const n = items.length;
    if (!n || coverageOf(items).publisherCount < CORE_FROM) return null;
    const results = items.filter((i) => voteKind(i) === 2);
    if (results.length * 2 < n) return null;
    const place = placeOfGroup(items);
    if (!place) return null;
    const heads = results.filter((i) => RESULT_RE.test(norm(i.title || ""))).map(timeOf).filter(Boolean).sort((a, b) => a - b);
    const from = heads.length ? heads[Math.floor(heads.length / 4)] - VOTE_LEAD : Math.min(...items.map(timeOf).filter(Boolean));
    return { place, from, to: Math.max(...items.map(timeOf)) };
  }
  var voteGroup = (items) => items.filter((i) => voteKind(i) >= 1).length * 2 > items.length;
  var EDITION_SIZE = EDITION_TARGET;
  var MAX_LEADS_PER_SOURCE = 3;
  var isHistoryRow = (x) => Array.isArray(x?.storyIds);
  function previousOfOne(x) {
    if (!x) return null;
    if (isHistoryRow(x)) {
      const keysOf2 = /* @__PURE__ */ new Map();
      if (x.keysOf instanceof Map) for (const [id, ks] of x.keysOf) keysOf2.set(id, new Set(ks));
      else for (const [id, ks] of Object.entries(x.keys && typeof x.keys === "object" ? x.keys : {})) if (Array.isArray(ks) && ks.length) keysOf2.set(id, new Set(ks));
      return {
        id: typeof x.id === "string" ? x.id : "",
        keysOf: keysOf2,
        storyIds: new Set(x.storyIds),
        itemIds: new Set(Array.isArray(x.itemIds) ? x.itemIds : []),
        leadIds: new Set(Array.isArray(x.leadIds) ? x.leadIds : []),
        leadStoryId: typeof x.leadStoryId === "string" ? x.leadStoryId : null,
        at: Date.parse(x.builtAt) || Number(x.at) || 0,
        titles: new Set(Array.isArray(x.titles) ? x.titles : []),
        shown: Array.isArray(x.shown) ? x.shown.filter((s) => s && typeof s.title === "string") : [],
        heldIds: new Set(Array.isArray(x.heldIds) ? x.heldIds : [])
      };
    }
    const edition = x;
    if (!edition.entries?.length) return null;
    const stories = edition.entries.filter((e) => e.kind === "story");
    const lead = edition.entries[0];
    const byId2 = new Map((edition.items || []).map((i) => [i.id, i]));
    const shown2 = edition.entries.map((e) => byId2.get(e.leadId || e.id)).filter((i) => i?.title);
    const keysOf = /* @__PURE__ */ new Map();
    for (const e of [...stories, ...edition.stories || []]) if (Array.isArray(e.keys) && e.keys.length) for (const id of [e.id, e.formerId, ...e.formerIds || []].filter(Boolean)) keysOf.set(id, /* @__PURE__ */ new Set([...keysOf.get(id) || [], ...e.keys]));
    return {
      id: typeof edition.id === "string" ? edition.id : "",
      keysOf,
      storyIds: new Set(stories.flatMap((e) => [e.id, e.formerId].filter(Boolean))),
      itemIds: /* @__PURE__ */ new Set([...edition.entries.map((e) => e.leadId || e.id), ...stories.flatMap((e) => e.itemIds || []), ...(edition.stories || []).flatMap((st) => st.itemIds || [])]),
      leadIds: /* @__PURE__ */ new Set([lead.leadId || lead.id]),
      leadStoryId: lead.kind === "story" ? lead.id : null,
      at: Date.parse(edition.builtAt) || 0,
      titles: new Set(edition.entries.map((e) => e.title || byId2.get(e.leadId || e.id)?.title).filter(Boolean)),
      shown: shown2.map((i) => ({ id: i.id, title: i.title, summary: i.summary || "", publishedAt: i.publishedAt || edition.builtAt })),
      // Verhalen die zonder nieuwe ontwikkeling één Editie langer bleven (ronde 7 · 3, `held`): niet nog een keer.
      heldIds: new Set(stories.filter((e) => e.held).map((e) => e.id))
    };
  }
  function previousOf(editions) {
    const ps = (Array.isArray(editions) ? editions : [editions]).map(previousOfOne).filter(Boolean);
    if (!ps.length) return null;
    ps.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const u = (k) => new Set(ps.flatMap((p) => [...p[k]]));
    const atOf = /* @__PURE__ */ new Map();
    const keysOf = /* @__PURE__ */ new Map();
    for (const p of ps) {
      for (const id of p.storyIds) atOf.set(id, Math.max(atOf.get(id) || 0, p.at));
      for (const [id, ks] of p.keysOf) keysOf.set(id, /* @__PURE__ */ new Set([...keysOf.get(id) || [], ...ks]));
    }
    const last = ps[ps.length - 1];
    return {
      keysOf,
      storyIds: u("storyIds"),
      itemIds: u("itemIds"),
      leadIds: u("leadIds"),
      leadStoryId: last.leadStoryId,
      leadStoryIds: new Set(ps.map((p) => p.leadStoryId).filter(Boolean)),
      at: last.at,
      atOf,
      titles: u("titles"),
      shown: ps.flatMap((p) => p.shown),
      heldIds: u("heldIds")
    };
  }
  var HISTORY_MAX = 3;
  function historyOf(edition) {
    if (!edition) return null;
    if (isHistoryRow(edition)) return edition;
    const p = previousOfOne(edition);
    if (!p) return null;
    return {
      id: edition.id,
      builtAt: edition.builtAt,
      storyIds: [...p.storyIds],
      itemIds: [...p.itemIds],
      leadIds: [...p.leadIds],
      leadStoryId: p.leadStoryId,
      titles: [...p.titles],
      shown: p.shown,
      ...p.heldIds.size ? { heldIds: [...p.heldIds] } : {},
      keys: Object.fromEntries([...p.keysOf].map(([id, ks]) => [id, [...ks]]))
    };
  }
  function recentEditions(list = [], n = HISTORY_MAX) {
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const e of list) {
      if (!e || typeof e.id !== "string" || !e.id || seen.has(e.id) || !(Date.parse(e.builtAt) > 0)) continue;
      seen.add(e.id);
      out.push(e);
    }
    out.sort((a, b) => Date.parse(b.builtAt) - Date.parse(a.builtAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return out.slice(0, n);
  }
  var DEVELOPING_PENALTY = 25;
  var REPEAT_LEAD_PENALTY = 30;
  function seenBefore(st, items, previous) {
    if (!previous) return false;
    if (previous.storyIds?.has(st.id) || (st.formerIds || []).some((id) => previous.storyIds?.has(id))) return true;
    return items.some((i) => previous.itemIds?.has(i.id));
  }
  var HOLD_PUBS = 10;
  function holdable(st, items, previous) {
    if ((st.publisherCount ?? coverageOf(items).publisherCount) < HOLD_PUBS) return false;
    return ![st.id, ...st.formerIds || []].some((id) => previous?.heldIds?.has(id));
  }
  function linkedItems(items, cands, sig = signatures(items)) {
    const near = (s, i) => items.some((j) => j !== i && s.has(i.id) && s.has(j.id) && sameSubject(s.get(i.id), s.get(j.id)));
    const out = cands.filter((i) => near(sig, i));
    if (out.length === cands.length) return out;
    let ext = null;
    const far = (i) => items.some((j) => j !== i && sameEvent((ext ||= signatures(items, [], { extended: true })).get(i.id), ext.get(j.id), true));
    return cands.filter((i) => out.includes(i) || far(i));
  }
  var OTHER_LANG = /\b(las|los|del|para|una|segun|antes de|sus|les|une|pour|avec|dans|und|fur|nicht|uma|nao|della|degli)\b/;
  var otherLangTitle = (i) => OTHER_LANG.test(norm(i?.title || ""));
  var DEVELOPED_FRESH = 2;
  var DEVELOPED_SIG = 2;
  function developedSince(st, items, previous, sig, { mainIds = /* @__PURE__ */ new Set(), preferred = null, now = null, known = null } = {}) {
    const at = previous.atOf?.get(st.id) ?? previous.at ?? 0;
    const isNew = (i) => !previous.itemIds?.has(i.id) && !!i.publishedAt && Date.parse(i.publishedAt) > at;
    const fresh = items.filter(isNew);
    if (fresh.length < DEVELOPED_FRESH) return null;
    const keysOf = (i) => {
      const s = sig.get(i.id);
      return s ? [...s.strong, ...s.concepts] : [];
    };
    const then = /* @__PURE__ */ new Set();
    for (const id of [st.id, ...st.formerIds || []]) for (const k of previous.keysOf?.get(id) || []) then.add(k);
    const all = known ? (st.itemIds || []).map((id) => known.get(id)).filter(Boolean) : items;
    for (const i of [...all, ...items]) if (!isNew(i)) for (const k of keysOf(i)) then.add(k);
    const lead = leadCandidates(fresh, mainIds, preferred, now)[0];
    const others = fresh.filter((i) => i !== lead).map(keysOf);
    const newSig = keysOf(lead).filter((k) => !then.has(k) && others.some((ks) => ks.includes(k))).length;
    return newSig >= DEVELOPED_SIG ? { fresh, lead, newSig } : null;
  }
  var LANG_OF = new Map(SOURCES.map((x) => [x.id, x.lang]));
  var dutchTier = (i) => LANG_OF.get(i.source) !== "nl" || detectLang(i) === "en" ? 2 : VL_HOME.has(i.source) ? 1 : 0;
  var LEAD_CORE = 10;
  function centralItems(items, total = items.length) {
    if (total < LEAD_CORE || items.length < 3) return items;
    const sig = signatures(items, items.map((i) => ({ id: `kop:${i.id}`, title: i.title, publishedAt: i.publishedAt })), { extended: true });
    const keys = items.map((i) => {
      const x = sig.get(`kop:${i.id}`);
      return /* @__PURE__ */ new Set([...x.strong, ...x.weak, ...x.known, ...x.concepts]);
    });
    const freq = /* @__PURE__ */ new Map();
    for (const ks of keys) for (const x of ks) freq.set(x, (freq.get(x) || 0) + 1);
    const score = keys.map((ks) => ks.size >= 2 ? [...ks].reduce((n, x) => n + freq.get(x) - 1, 0) / ks.size : 0);
    const best = Math.max(...score);
    const out = items.filter((_, k) => score[k] > 0 && score[k] * 5 >= best * 3);
    return out.length ? out : items;
  }
  function dutchFirst(items) {
    for (const tier of [0, 1]) {
      const out = items.filter((i) => dutchTier(i) === tier);
      if (out.length) return out;
    }
    return items;
  }
  var BACKGROUND_GAP = 12 * 60 * 60 * 1e3;
  function freshest(items) {
    const newest = Math.max(...items.map(timeOf));
    const out = items.filter((i) => newest - timeOf(i) <= BACKGROUND_GAP);
    return out.length ? out : items;
  }
  var FAMILY_MAX = 1;
  var FAMILY_WIDE_MAX = 2;
  var FAMILY_WIDE_PUBS = 15;
  var FAMILY_SECOND_PUBS = 4;
  var SECOND_FRESH_H = 6;
  var familyRelated = (a, b) => !!a.vote && a.vote === b.vote;
  function families(cands) {
    const stories = cands.filter((c) => c.kind === "story");
    const voteFrom = /* @__PURE__ */ new Map();
    for (const c of stories) {
      const items = [...c.items].sort(byRecency);
      c.items = items;
      const r = voteResultOf(items);
      if (r && (!voteFrom.has(r.place) || coverageOf(items).publisherCount > voteFrom.get(r.place).pubs)) voteFrom.set(r.place, { from: r.from, pubs: coverageOf(items).publisherCount });
    }
    for (const c of stories) {
      const place = voteGroup(c.items) ? placeOfGroup(c.items) : null;
      c.vote = place && voteFrom.has(place) ? place : null;
      c.voteResult = !!c.vote && c.items.filter((i) => voteKind(i) === 2).length * 2 >= c.items.length;
    }
    const pubsOf = (c) => c.st.publisherCount ?? c.st.sourceCount ?? coverageOf(c.items).publisherCount;
    const order = [...stories].sort((a, b) => pubsOf(b) - pubsOf(a) || b.w - a.w || textOrder(a.st.id, b.st.id));
    const extra = /* @__PURE__ */ new Map();
    for (const head of order) {
      if (head.fam) continue;
      head.fam = head.st.id;
      const own = new Set(head.items.map((i) => publisherOf(i.source)));
      const all = new Set(own);
      for (const c of order) {
        if (c.fam || !familyRelated(head, c)) continue;
        c.fam = head.st.id;
        for (const i of c.items) all.add(publisherOf(i.source));
      }
      const total = pubsOf(head) + (all.size - own.size);
      if (all.size > own.size && total >= FRONT_BIG) extra.set(head, all.size - own.size);
    }
    for (const c of stories) c.voteFrom = c.vote ? voteFrom.get(c.vote).from : null;
    return extra;
  }
  function voteFamilyOf(stories = [], byId2 = /* @__PURE__ */ new Map()) {
    const itemsOf = (st) => (st.itemIds || []).map((id) => byId2.get(id)).filter(Boolean);
    const places = /* @__PURE__ */ new Set();
    for (const st of stories) {
      const r = voteResultOf(itemsOf(st).sort(byRecency));
      if (r) places.add(r.place);
    }
    const out = /* @__PURE__ */ new Map();
    if (!places.size) return out;
    for (const st of stories) {
      const items = itemsOf(st);
      const place = items.length && voteGroup(items) ? placeOfGroup(items) : null;
      if (place && places.has(place)) out.set(st.id, place);
    }
    return out;
  }
  var secondFact = (c, now) => !!now && now - timeOf({ publishedAt: c.st.latestAt }) <= SECOND_FRESH_H * 36e5 && !c.voteResult && (c.st.publisherCount ?? coverageOf(c.whole || c.items).publisherCount) >= FAMILY_SECOND_PUBS && !curioStory(c.st, c.items) && c.items.filter((i) => !isOpinion(i)).length * 2 > c.items.length;
  function wideSecond(c, placedC, now) {
    if (c.kind !== "story" || !c.vote) return false;
    const mates = placedC.filter((x) => x.kind === "story" && x.vote === c.vote);
    const pubs = (x) => x.st.publisherCount ?? coverageOf(x.whole || x.items).publisherCount;
    return mates.length >= FAMILY_MAX && mates.length < FAMILY_WIDE_MAX && mates.some((x) => pubs(x) >= FAMILY_WIDE_PUBS) && secondFact(c, now);
  }
  function familyRoom(c, placedC, wide = false, now = null) {
    if (c.kind !== "story" || !c.vote) return true;
    const mates = placedC.filter((x) => x.kind === "story" && x.vote === c.vote);
    if (!mates.length) return true;
    if (mates.length >= (wide ? FAMILY_WIDE_MAX : FAMILY_MAX)) return false;
    if (mates.length >= FAMILY_MAX && !(wide && wideSecond(c, placedC, now))) return false;
    if (c.voteResult && mates.some((x) => x.voteResult)) return false;
    return !(c.voteFrom && timeOf({ publishedAt: c.st.latestAt }) < c.voteFrom);
  }
  var prefer = (xs, f) => {
    const ys = xs.filter(f);
    return ys.length ? ys : xs;
  };
  function leadPool(cands, items, now, own = null, total = items.length, coreItems = centralItems) {
    let xs = prefer(cands, (i) => !isStale(i, now));
    if (!sportStory({}, items)) xs = prefer(xs, (i) => !SPORT_SOURCES.has(i.source));
    if (own) xs = prefer(xs, own);
    const core = new Set(coreItems(items, total));
    xs = prefer(xs, (i) => core.has(i));
    xs = prefer(xs, (i) => !/\?/.test(i.title || ""));
    return dutchFirst(freshest(xs));
  }
  function openWithNews(entries, { itemsOf, pick }) {
    const news = (e2) => itemsOf(e2).some((i) => i && !isOpinion(i));
    const k = entries.findIndex(news);
    if (k < 0) return entries;
    if (k > 0) entries.unshift(...entries.splice(k, 1));
    const e = entries[0];
    if (e.kind !== "story") return entries;
    const items = itemsOf(e).filter(Boolean);
    const lead = items.find((i) => i.id === e.leadId);
    if (!lead || !isOpinion(lead) && !verdictTitle(lead)) return entries;
    const fresh = items.filter((i) => !isOpinion(i));
    const plain2 = fresh.filter((i) => !verdictTitle(i));
    if (!isOpinion(lead) && !plain2.length) return entries;
    const next = pick(plain2.length ? plain2 : fresh, items);
    if (next && next.id !== lead.id) entries[0] = { ...e, leadId: next.id, ..."title" in e ? { title: next.title || null } : {} };
    return entries;
  }
  var CURIO_HEAD = /\b(goud|gouden|gold(?! (?:price|prices|reserves?|futures|standard|mines?|bars?|rally))|golden|gilded|gold-covered|vergulde?|monument|monumenten|monuments|balzaal|ballroom|beroemdhe\w*|celebrit\w*|showbizz)\b/;
  var CURIO_PATH = /\/(opmerkelijk|bizar|curiosa|weird\w*|offbeat|oddities|odd-news|strange|showbizz|celebrity|celebrities|entertainment|lifestyle)\//;
  var CURIO_FORM = /^\W*(opmerkelijk|bizar|curieus|kijk|quiz)\b|\bquiz\b/;
  var SERIOUS = /\b(rechtszaak|rechtbank|rechter|proces|jury|veroordeel\w*|schuldig\w*|celstraf\w*|gevangenis\w*|verkracht\w*|aanranding|misbruik\w*|moord\w*|doodgeschoten|doodgestoken|gedood|doden|dode|dood|omgekomen|dodelijk\w*|geweld\w*|aanslag\w*|schietpartij\w*|steekpartij\w*|mishandel\w*|trial|court|convicted|guilty|sentenced|prison|rape|raped|sexual assault|murder\w*|killed|killing|shooting|stabbing|violence|violent)\b/;
  var curioPiece = (i) => {
    const title = norm(i?.title || "");
    return CURIO_HEAD.test(title) || CURIO_FORM.test(title) || CURIO_PATH.test(String(i?.url || "").split("?")[0].toLowerCase());
  };
  function curioStory(story = {}, items = []) {
    if (!items.length) return false;
    if (items.filter((i) => SERIOUS.test(norm(`${i?.title || ""}`))).length * 2 >= items.length) return false;
    if (lightNews(story, items)) return true;
    return items.filter(curioPiece).length * 3 >= items.length;
  }
  function curiosaDown(entries, { itemsOf, storyOf = () => ({}), top = 3, to = 5 }) {
    const out = [];
    for (let k = Math.min(top, entries.length) - 1; k >= 0; k--) {
      const e = entries[k];
      if (e.desk === "bubbel" || !curioStory(storyOf(e) || {}, itemsOf(e).filter(Boolean))) continue;
      out.unshift(...entries.splice(k, 1));
    }
    if (out.length) entries.splice(Math.min(to - out.length + 1, entries.length), 0, ...out);
    return entries;
  }
  var textOrder = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  var DESK_MIN_PUBS = 3;
  var SPREAD_MIN = 3;
  var CURIO_TIE = 2;
  var titled = (i) => !!String(i?.title ?? "").trim();
  var NL_TOP5_MIN = 2;
  var SOURCE_BY_ID = new Map(SOURCES.map((x) => [x.id, x]));
  function dutchSource(id, sources = SOURCES) {
    const s = sources === SOURCES ? SOURCE_BY_ID.get(id) : sources.find((x) => x.id === id);
    return !!s && ["nl", "regio"].includes(s.cat) && s.lang === "nl" && !VL_HOME.has(s.id);
  }
  function selectForReader(stories, pool, { mainIds = /* @__PURE__ */ new Set(), now = Date.now(), size = EDITION_SIZE, previous = null, preferred = null, prof = profileOf(), ctx = {}, plan = true, seed = "", audit = null, allowLight = false, general = false } = {}) {
    const byId2 = new Map(pool.map((i) => [i.id, i]));
    const prevShown = previous?.shown?.length ? previous.shown : [...previous?.titles || []].map((title) => ({ title, publishedAt: new Date(previous.at || now).toISOString() }));
    const prevArts = prevShown.map((a, k) => ({ ...a, id: `vorige:${k}` }));
    const sig = ctx.signaturesFor ? ctx.signaturesFor(pool, prevArts) : signatures(pool, prevArts);
    const vorige = prevArts.map((a) => sig.get(a.id));
    const sigKnown = ctx.sigKnown || sig;
    const fresh = (iso, hours) => iso && now - Date.parse(iso) < hours * 60 * 60 * 1e3;
    const entries = [];
    const placed = [];
    const leadCount = {};
    let prevLead = null;
    const same = (ids, sigs) => ids.some((id) => sig.has(id) && sigs.some((s) => sameSubject(sig.get(id), s)));
    const placedBy = [];
    let placedC = [];
    const again = (c) => {
      if (c.vervolg || c.held) return false;
      if (since === null || c.kind !== "story") return same(c.ids, vorige);
      const lead = leadOf(c);
      const head = lead && headSignature(sig, lead);
      return !!head && prevArts.some((a) => sameHeadEvent(head, headSignature(sig, a)));
    };
    const clashes = (c) => {
      if (general && wideSecond(c, placedC, now)) {
        const keep = placed.map((_, k) => placedBy[k]?.owner?.vote !== c.vote);
        return subjectIn(sig, c, placed.filter((_, k) => keep[k]), c.items, placedBy.filter((_, k) => keep[k])) || again(c);
      }
      return subjectTaken(sig, c, placed, c.items, placedBy) || again(c);
    };
    const place = (ids, owner = null, lead = null) => {
      const pubs = owner ? owner.kind === "item" ? 1 : coverageOf(owner.items).publisherCount : 0;
      for (const id of ids) if (sig.has(id)) {
        placed.push(sig.get(id));
        placedBy.push({ owner, lead, pubs, item: byId2.get(id) });
      }
    };
    const leadFrom = (items, total, role) => {
      const titledItems = items.filter(titled);
      if (titledItems.length && titledItems.length !== items.length) items = titledItems;
      const all = leadCandidates(items, mainIds, preferred, now, { role });
      const cands2 = all.some((i) => !isGallery(i)) ? all.filter((i) => !isGallery(i)) : all;
      return leadPool(cands2, items, now, (i) => mainIds.has(i.source), total, ctx.centralItemsFor || centralItems);
    };
    const chooseLead = (from) => from.find((i) => i.source !== prevLead && (leadCount[i.source] || 0) < MAX_LEADS_PER_SOURCE) || from.find((i) => (leadCount[i.source] || 0) < MAX_LEADS_PER_SOURCE) || from[0];
    const pickLead = (items, total = items.length) => chooseLead(leadFrom(items, total, entries.length < 3 ? "front" : "neutral"));
    const storyDesk = (st, primary) => ctx.storyDesk?.has(st.id) ? ctx.storyDesk.get(st.id) : st.desk !== void 0 ? st.desk : primary;
    let storyMap = null;
    const storyOfItem = () => storyMap ||= new Map(stories.flatMap((st) => (st.itemIds || []).map((id) => [id, st])));
    const reject = (kind, id, ids, reason) => {
      if (audit) audit.push({ kind, id, itemIds: ids, reason });
    };
    const since = general && previous ? previous.at || 0 : null;
    const sinceLast = (st, items) => {
      const fresh2 = items.filter((i) => titled(i) && timeOf(i) > since && !otherLangTitle(i));
      if (!fresh2.length || fresh2.length === items.length || items.length < 3) return fresh2;
      return linkedItems(items, fresh2, sig);
    };
    const cands = [];
    for (const st of stories) {
      if (!fresh(st.latestAt, 24)) {
        reject("story", st.id, st.itemIds, "ouder-dan-verhaalvenster");
        continue;
      }
      const raw = st.itemIds.map((id) => byId2.get(id)).filter(Boolean);
      const items = raw.filter((i) => !lightVideoFiller(i, prof));
      if (!items.length) {
        reject("story", st.id, st.itemIds, raw.length ? "licht-videorondje-buiten-interesse" : "geen-bekend-artikel");
        continue;
      }
      if (!items.some(titled)) {
        reject("story", st.id, st.itemIds, "zonder-titel");
        continue;
      }
      let dev = null;
      let straf = 0;
      let held = false;
      const recent = since !== null ? sinceLast(st, items) : null;
      if (seenBefore(st, items, previous)) {
        dev = developedSince(st, items, previous, sigKnown, { mainIds, preferred, now, known: ctx.known });
        const wasLead = previous.leadStoryId === st.id || previous.leadStoryIds?.has(st.id) || items.some((i) => previous.leadIds?.has(i.id));
        if (!dev) {
          if (!(recent?.length && holdable(st, items, previous))) {
            reject("story", st.id, st.itemIds, "eerder-getoond-zonder-ontwikkeling");
            continue;
          }
          held = true;
        } else straf = DEVELOPING_PENALTY + (wasLead ? REPEAT_LEAD_PENALTY : 0);
      } else if (recent && !recent.length) {
        reject("story", st.id, st.itemIds, "geen-nieuw-stuk-sinds-vorige-Editie");
        continue;
      }
      const primary = deskOfStory(items);
      const desk = storyDesk(st, primary);
      const mine = coverageOf(items).publisherCount;
      const nl = st.nlCount ?? st.sourceCount;
      const eff = st.publisherCount ?? nl + NL_OTHER_W * (st.sourceCount - nl);
      const belang = weight({ sourceCount: eff, ownCount: mine, latestAt: st.latestAt }, now) - straf;
      const mineAll = ctx.own ? st.itemIds.map((id) => ctx.own.get(id) || byId2.get(id)).filter(Boolean) : items;
      const whole = ctx.known ? st.itemIds.map((id) => ctx.known.get(id) || byId2.get(id)).filter(Boolean) : items;
      const intl = internationalNews(whole, desk, st);
      const parts = personalParts(mineAll, prof, ctx, { desk, foreign: storyForeignOf(mineAll) || intl });
      const tie = general && curioStory(st, items) ? weight({ sourceCount: 0, ownCount: 0, latestAt: st.latestAt }, now) + CURIO_TIE : 0;
      cands.push({ kind: "story", id: st.id, st, items, whole, ids: st.itemIds, intl, primary, desk, home: homeDesk(items, desk ?? primary, prof), belang, parts, sc: st.sourceCount, nl, eff, dev, vervolg: dev ? dev.fresh.length : 0, held, heads: dev ? dev.fresh : recent, w: belang + sumParts(parts) + jitter(seed, st.id) - tie });
    }
    for (const it of pool) {
      if (!mainIds.has(it.source) || it.kind !== "article" || it.type === "opinie" || it.storyId && storyOfItem().has(it.id) || isLive(it)) {
        reject("item", it.id, [it.id], it.storyId && storyOfItem().has(it.id) ? "via-verhaal" : "vorm-of-bron-niet-toegelaten");
        continue;
      }
      if (!titled(it)) {
        reject("item", it.id, [it.id], "zonder-titel");
        continue;
      }
      if (!fresh(it.publishedAt, ctx.tempo?.get(it.source) || TEMPO_MIN_H) || !(it.summary || it.image)) {
        reject("item", it.id, [it.id], "te-oud-of-geen-intro-en-beeld");
        continue;
      }
      if (previous?.itemIds?.has(it.id) || ctx.readIds?.has(it.id)) {
        reject("item", it.id, [it.id], "eerder-getoond-of-gelezen");
        continue;
      }
      if (since !== null && !(timeOf(it) > since)) {
        reject("item", it.id, [it.id], "geen-nieuw-stuk-sinds-vorige-Editie");
        continue;
      }
      const mates = ctx.readIds?.size ? storyOfItem().get(it.id) : null;
      if (mates && personalParts(mates.itemIds.map((id) => ctx.own?.get(id) || byId2.get(id)).filter(Boolean), prof, { readIds: ctx.readIds }).seen) {
        reject("item", it.id, [it.id], "verhaal-al-gelezen");
        continue;
      }
      const primary = primaryDesk([desksOf(it)]);
      const belang = weight({ sourceCount: 1, ownCount: 1, latestAt: it.publishedAt }, now) - 2;
      const parts = personalParts([it], prof, ctx);
      cands.push({ kind: "item", id: it.id, it, items: [it], ids: [it.id], primary, desk: primary, home: homeDesk([it], primary, prof), belang, parts, sc: 1, nl: 1, eff: 1, vervolg: 0, w: belang + sumParts(parts) + jitter(seed, it.id) });
    }
    const heaviest = (a, b) => b.w - a.w || textOrder(a.id, b.id) || textOrder(a.kind, b.kind);
    for (const [c, n] of families(cands)) {
      c.w += 4 * n;
      c.belang += 4 * n;
    }
    cands.sort(heaviest);
    const used = /* @__PURE__ */ new Set();
    placedC = [];
    const foreign = (c) => c.intl ?? internationalNews(c.items, c.desk, c.st);
    const cappedWorld = (c) => c.cw ??= cappedInternational(prof, c.whole || c.items, c.desk, c.st);
    let candById = null;
    let worldAt = -1;
    let worldN = 0;
    const worldPlaced = () => {
      if (worldAt !== entries.length) {
        worldAt = entries.length;
        candById ||= new Map(cands.map((x) => [x.id, x]));
        worldN = entries.filter((e) => {
          const x = candById.get(e.id);
          return x && cappedWorld(x);
        }).length;
      }
      return worldN;
    };
    const leadOf = (c) => {
      if (c.kind !== "story") return null;
      const role = entries.length < 3 ? "front" : "neutral";
      const memo2 = c.leadFrom ||= {};
      return chooseLead(memo2[role] ||= leadFrom(c.heads?.length ? c.heads : c.items, c.dev ? c.dev.fresh.length : c.st.itemIds.length, role));
    };
    const headTaken = (c) => {
      if (!general || c.kind !== "story" || !entries.length || wideSecond(c, placedC, now)) return false;
      const lead = leadOf(c);
      const head = lead && headSignature(sig, lead);
      return !!head && entries.some((e) => sameHeadEvent(head, headSignature(sig, byId2.get(e.leadId || e.id))));
    };
    const newsOk = (c, open) => {
      const r = c.nr !== void 0 ? c.nr : c.nr = newsRejection(prof, c.st || { sourceCount: 1 }, c.items, c.desk, { allowLight });
      return r === null || open && r === "internationaal-niet-groot-genoeg";
    };
    const admissible = (c, open = false) => !used.has(c) && newsOk(c, open) && !clashes(c) && familyRoom(c, placedC, general, now) && (open || !(plan && !worldChosen(prof) && cappedWorld(c) && worldPlaced() >= INT_MAX)) && !headTaken(c);
    const spread = (c) => c.kind === "item" ? 1 : c.st.publisherCount ?? coverageOf(c.whole || c.items).publisherCount;
    let strongAt = -1;
    let strong = false;
    const strongLeft = () => {
      if (strongAt !== entries.length) {
        strongAt = entries.length;
        strong = cands.some((x) => x.kind === "story" && !x.parts.seen && spread(x) >= SPREAD_MIN && admissible(x, true));
      }
      return strong;
    };
    let nlHave = 0;
    const allOf = (c) => c.kind === "story" && ctx.storyItems?.get(c.st.id) || c.whole || c.items;
    const dutchC = (c, desk) => {
      const lead = c.kind === "story" ? leadOf(c) : c.it;
      if (!lead || !dutchSource(lead.source)) return false;
      const memo2 = c.nlMemo ||= /* @__PURE__ */ new Map();
      if (!memo2.has(desk ?? null)) memo2.set(desk ?? null, !internationalNews(allOf(c), desk ?? null, c.st || null));
      if (!memo2.get(desk ?? null)) return false;
      if (c.fhId !== lead.id) {
        c.fhId = lead.id;
        c.fh = foreignHead(lead.title);
      }
      return !c.fh;
    };
    const nlNews = (c) => c.kind === "story" && spread(c) >= 2 && !lightNews(c.st, c.items) && !isOpinion(leadOf(c));
    const nlLike = (c) => c.nlLike ??= c.kind === "story" && spread(c) >= 2 && c.items.some((i) => dutchSource(i.source) && titled(i) && !isOpinion(i)) && !lightNews(c.st, c.items) && !internationalNews(allOf(c), (plan ? c.home : null) ?? null, c.st) && c.items.some((i) => dutchSource(i.source) && titled(i) && !isOpinion(i) && !foreignHead(i.title));
    let nlAt = -1;
    let nlNeed = 0;
    let nlOff = false;
    const nlReserve = () => {
      if (nlOff) return 0;
      if (nlAt !== entries.length) {
        nlAt = entries.length;
        nlNeed = 0;
        for (const x of cands) {
          if (nlNeed >= NL_TOP5_MIN - nlHave) break;
          if (!x.parts.seen && !used.has(x) && nlLike(x) && admissible(x)) nlNeed++;
        }
      }
      return nlNeed;
    };
    const relead = (c) => {
      const mate = placedC.find((x) => x.kind === "story" && x.vote === c.vote);
      const e = mate && entries.find((x) => x.kind === "story" && x.id === mate.st.id);
      if (!e) return;
      const theirs = c.ids.map((id) => sig.get(id)).filter(Boolean);
      const own = mate.items.filter((i) => titled(i) && !(sig.has(i.id) && theirs.some((t) => sameSubject(sig.get(i.id), t))));
      const pool2 = own.some((i) => voteKind(i) === 2) ? own.filter((i) => voteKind(i) === 2) : own;
      if (!pool2.length || pool2.some((i) => i.id === e.leadId)) return;
      const lead = leadPool(leadCandidates(pool2, mainIds, preferred, now, { role: "front" }), mate.items, now)[0];
      if (lead) Object.assign(e, { leadId: lead.id, title: lead.title || null });
    };
    const take = (c, desk, extra = {}, open = false) => {
      if (!admissible(c, open)) return false;
      if (general && spread(c) <= 1 && strongLeft()) return false;
      if (general && plan && entries.length >= size - nlReserve() && !(nlNews(c) && dutchC(c, desk))) return false;
      const second = general && wideSecond(c, placedC, now);
      const lead = leadOf(c);
      if (second) relead(c);
      used.add(c);
      placedC.push(c);
      place(c.ids, c, c.kind === "story" ? lead?.id : c.it.id);
      const base = { desk, w: c.w, parts: c.parts, sourceCount: c.sc, big: majorNews(c.st || { sourceCount: 1 }, c.items), ...c.vervolg ? { vervolg: c.vervolg } : {}, ...c.held ? { held: true } : {}, ...extra };
      if (c.kind === "story") {
        leadCount[lead.source] = (leadCount[lead.source] || 0) + 1;
        prevLead = lead.source;
        entries.push({ kind: "story", id: c.st.id, leadId: lead.id, itemIds: c.st.itemIds, title: lead.title || null, ...c.st.keys ? { keys: c.st.keys } : {}, ...base });
      } else entries.push({ kind: "item", id: c.it.id, itemIds: [c.it.id], title: c.it.title || null, ...base });
      if (general && dutchC(c, desk) && (extra.front || nlNews(c))) nlHave++;
      return true;
    };
    const homeNews = (c) => !!c && !foreign(c) && [c.desk, c.primary, c.home].some((d) => d === "binnenland" || d === "regio");
    const unchosen = (c) => foreign(c) && !openWorld(prof, c.whole || c.items, c.st);
    const strictInt = !worldChosen(prof);
    const counted = /* @__PURE__ */ new Set();
    const capped = (c) => strictInt && cappedWorld(c) && counted.size >= INT_MAX;
    const takeCapped = (c, desk, extra, force = false) => {
      if (!force && capped(c) || !take(c, desk, extra)) return false;
      if (cappedWorld(c)) counted.add(c.id);
      return true;
    };
    let deskOrder = [];
    if (plan) {
      const frontOf = (c) => c.belang + (c.parts.less?.pts || 0);
      const byFront = (a, b) => frontOf(b) - frontOf(a) || heaviest(a, b);
      const worldReader = worldChosen(prof);
      const domesticReader = (prof?.family?.binnenland || 0) > 0 || !worldReader && Object.keys(prof?.family || {}).length === 0;
      const front = cands.filter((c) => c.kind === "story" && (c.sc >= FRONT_MIN || majorNews(c.st, c.items)) && !c.parts.seen).sort(byFront);
      const dutch2 = (c) => homeNews(c);
      const home = !domesticReader ? [] : cands.filter((c) => !c.parts.seen && !c.parts.less && dutch2(c)).sort(byFront);
      let hasHome = false;
      const room = () => Math.min(FRONT_MAX, size) - (hasHome || !home.length ? 0 : 1);
      for (const c of front) {
        if (entries.length >= room() || entries.length >= FRONT && !majorNews(c.st, c.items)) break;
        if (strictInt && capped(c)) continue;
        if (!take(c, c.desk, { front: true })) continue;
        if (cappedWorld(c)) counted.add(c.id);
        if (dutch2(c)) hasHome = true;
      }
      if (!hasHome) home.some((c) => take(c, c.desk, { front: true }));
      for (const c of front) {
        if (entries.length >= Math.min(FRONT_MAX, size)) break;
        if (majorNews(c.st, c.items) && !used.has(c)) {
          takeCapped(c, c.desk, {}, true);
        }
      }
      deskOrder = deskPlan(prof, size - entries.length, entries.map((e) => e.desk), entries.filter((e) => !e.front).map((e) => e.desk)).order;
      const kernShort = (d) => KERN.includes(d) && !entries.some((e) => e.desk === d) && new Set(entries.map((e) => e.desk).filter((x) => KERN.includes(x))).size < KERN_MIN;
      const mine = chosenDesks(prof);
      const strongEnough = (c, d) => mine.has(d) || (c.eff ?? c.sc ?? 1) >= DESK_MIN_PUBS;
      for (const d of deskOrder) {
        if (entries.length >= size) break;
        const force = kernShort(d) && !(strictInt && FOREIGN_DESKS.has(d) && counted.size >= INT_MAX);
        cands.some((c) => c.home === d && !c.parts.seen && (strongEnough(c, d) || kernShort(d)) && takeCapped(c, d, { planned: true }, force));
      }
    }
    for (const c of cands) {
      if (entries.length >= size) break;
      if (!c.parts.seen) takeCapped(c, plan ? c.home : null);
    }
    if (general) for (const c of cands) {
      if (entries.length >= size) break;
      if (c.kind === "story" && !c.parts.seen && spread(c) >= SPREAD_MIN && take(c, plan ? c.home : null, {}, true) && cappedWorld(c)) counted.add(c.id);
    }
    const fill = () => {
      for (const c of cands) {
        if (entries.length >= size) break;
        if (!c.parts.seen) takeCapped(c, plan ? c.home : null, {}, true);
      }
    };
    fill();
    if (general && entries.length < size) {
      nlOff = true;
      for (const c of cands) {
        if (entries.length >= size) break;
        if (c.kind === "story" && !c.parts.seen && spread(c) >= SPREAD_MIN && take(c, plan ? c.home : null, {}, true) && cappedWorld(c)) counted.add(c.id);
      }
      fill();
    }
    entries.sort((a, b) => b.w - a.w || textOrder(a.id, b.id));
    if (strictInt || prof.family.binnenland > 0) {
      const candOf = new Map([...used].map((c) => [c.id, c]));
      const isForeign = (e) => foreign(candOf.get(e.id));
      const lastHome = entries.reduce((k, e, i) => e.front && !isForeign(e) ? i : k, -1);
      const late = entries.filter((e) => !e.front && unchosen(candOf.get(e.id)));
      const moved = prof.family.binnenland > 0 ? entries.slice(0, Math.max(0, lastHome)).filter((e) => e.front && isForeign(e)) : [];
      const rest = entries.filter((e) => !moved.includes(e) && !late.includes(e));
      if (moved.length) rest.splice(rest.indexOf(entries[lastHome]) + 1, 0, ...moved);
      if (prof.family.binnenland > 0 && rest.length && !homeNews(candOf.get(rest[0].id))) {
        const first = rest.find((e) => e.front && homeNews(candOf.get(e.id))) || rest.find((e) => homeNews(candOf.get(e.id)));
        if (first) rest.splice(0, 0, ...rest.splice(rest.indexOf(first), 1));
      }
      entries.splice(0, entries.length, ...rest, ...late);
    }
    const abroadIds = new Set([...used].filter((c) => unchosen(c) && !entries.find((e) => e.id === c.id)?.front).map((c) => c.id));
    if (audit) for (const c of cands) {
      const reason = used.has(c) ? "gekozen-in-route" : c.parts.seen ? "verhaal-al-gelezen" : clashes(c) ? "zelfde-onderwerp-gekozen-of-eerder" : !allowedNews(prof, c.st || { sourceCount: 1 }, c.items, c.desk) ? newsRejection(prof, c.st || { sourceCount: 1 }, c.items, c.desk) : capped(c) ? "internationaal-plafond" : entries.length >= size ? "route-vol" : "onverklaard";
      reject(c.kind, c.id, c.ids, reason);
    }
    Object.defineProperty(entries, "sig", { value: sig, enumerable: false });
    return Object.assign(entries, { deskOrder, abroad: abroadIds, counted });
  }

  // shared/editie-filter.mjs
  var DEAL_RUBRIC = /* @__PURE__ */ new Set(["deals", "aanbiedingen", "aanbieding", "koopjes", "coupons", "kortingscodes", "dagdeals"]);
  var AUDIO_RUBRIC = /* @__PURE__ */ new Set(["podcast", "podcasts", "luister"]);
  var LANG_SEGMENT = /^(?:nl|en|de|fr|es|it|pt|be|uk|us|eu|intl)(?:-[a-z]{2})?$/i;
  var LABEL2 = /^[\s"'‘“(]*(video|podcast|luister|kijk|watch|listen)\s*[:|]/i;
  function rubricSegments(url) {
    const m = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*([^?#]*)/i.exec(String(url || "").trim());
    if (!m) return [];
    const path = m[1];
    const segs = path.split("/").filter(Boolean).map((s) => {
      try {
        return decodeURIComponent(s).toLowerCase();
      } catch {
        return s.toLowerCase();
      }
    });
    const before = segs.slice(0, -1);
    const cut = before.findIndex((x) => /^\d+$/.test(x));
    return cut === -1 ? before : before.slice(0, cut);
  }
  var norm2 = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  function ownIntro(item = {}) {
    if (item.borrowedFrom) return false;
    const s = String(item.summary || item.text || "").trim();
    const t = norm2(item.title);
    const n = norm2(s);
    if (n.split(" ").filter(Boolean).length < 4) return false;
    if (n === t || t && n.startsWith(t) && n.length - t.length < 12) return false;
    if (/appeared first on\b|\blead image\b/i.test(s) && s.length < 200) return false;
    return true;
  }
  function hardMark(item = {}) {
    if (!item || item.kind === "post") return null;
    const segs = rubricSegments(item.url);
    const first = segs[0] && LANG_SEGMENT.test(segs[0]) && segs.length > 1 ? segs[1] : segs[0];
    if (first && DEAL_RUBRIC.has(first)) return { soort: "aanbieding", grond: "rubriek" };
    const media = String(item.mediaType || "");
    const label2 = LABEL2.exec(String(item.title || ""))?.[1]?.toLowerCase();
    if (item.podcastEpisode != null && String(item.podcastEpisode).trim()) return { soort: "aankondiging", grond: "itunes" };
    if (/^audio\//i.test(media) && !ownIntro(item)) return { soort: "aankondiging", grond: "enclosure" };
    if (item.feedMark === "podcast" && !ownIntro(item)) return { soort: "aankondiging", grond: "feedcategorie" };
    if (label2 === "podcast") return { soort: "aankondiging", grond: "label" };
    if ((segs.some((s) => AUDIO_RUBRIC.has(s)) || label2 === "luister" || label2 === "listen") && !ownIntro(item)) return { soort: "aankondiging", grond: label2 === "luister" || label2 === "listen" ? "label" : "rubriek" };
    return null;
  }
  var excludedFromEdition = (item, weg = null) => !!item && (weg && weg.size > 0 && weg.has(item.id) || hardMark(item) != null);

  // shared/stroom.mjs
  var forEdition = (it) => !it?.streamOnly;
  var INTRO_WINDOW_MS = 6 * 3600 * 1e3;

  // src/lib/personal.js
  var EXTERN = "extern";
  var WIDE = "breed";
  var NEWS_CATS = /* @__PURE__ */ new Set(["nl", "vl", "regio", "int", "economie", "tech", "wetenschap"]);
  var EXTRA_MAX = 2;
  var EXTRA_MIN = 0.5;
  var TOPIC_KIND = { voetbal: "sport", f1: "sport", wielrennen: "sport", tennis: "sport", wintersport: "sport", olympisch: "sport", muziek: "cultuur", film: "cultuur", boeken: "cultuur", kunst: "cultuur", games: "games" };
  var SPECIALIST = /* @__PURE__ */ new Set(["tech", "economie", "wetenschap"]);
  var NEAR_MIN_SOURCES = 3;
  var byText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  var trusted = /* @__PURE__ */ new WeakMap();
  function withTrustedTopics(it) {
    if (!it || typeof it !== "object" || !it.topics) return it;
    let c = trusted.get(it);
    if (!c) {
      const t = trustedTopics(it);
      trusted.set(it, c = t === it.topics ? it : { ...it, topics: t });
    }
    return c;
  }
  function storiesForReader(stories = [], items = [], followed = /* @__PURE__ */ new Set(), all = items, sources = []) {
    const ownSource = /* @__PURE__ */ new Map();
    for (const i of items) if (followed.has(i.source)) ownSource.set(i.id, i.source);
    let byId2 = null;
    const deskOf = (st) => {
      byId2 ||= new Map(all.map((i) => [i.id, i]));
      return deskOfStory(st.itemIds.map((id) => byId2.get(id)).filter(Boolean));
    };
    const homeOf = (st) => {
      byId2 ||= new Map(all.map((i) => [i.id, i]));
      return coverageOf(st.itemIds.map((id) => byId2.get(id)).filter(Boolean)).publisherCountries.some((c) => c === "NL" || c === "BE");
    };
    const dutch2 = new Set(sources.filter((s) => s.lang === "nl" && !VL_HOME.has(s.id)).map((s) => s.name));
    return stories.map((st) => ({
      ...st,
      ownCount: new Set(st.itemIds.map((id) => ownSource.get(id)).filter(Boolean)).size,
      desk: st.desk !== void 0 ? st.desk : deskOf(st),
      ...st.nlCount === void 0 && dutch2.size && st.sourceNames ? { nlCount: st.sourceNames.filter((n) => dutch2.has(n)).length } : {},
      // Brengt een Nederlandse of Vlaamse uitgever dit verhaal (internationalNews)? Een oudere server levert
      // `publisherCountries` niet; dan uit alles wat we van het verhaal hebben, niet alleen je eigen bronnen.
      ...st.publisherCountries === void 0 ? { homeCovered: homeOf(st) } : {}
    }));
  }
  function kindOfWith(catOf) {
    return (i) => {
      if (isSport(i, catOf)) return "sport";
      const byTopic = (i.topics || []).map((t) => TOPIC_KIND[t]).find(Boolean);
      if (byTopic) return byTopic;
      const cat = catOf.get(i.source);
      return !catOf.size || NEWS_CATS.has(cat) ? "nieuws" : cat;
    };
  }
  var NEWS_RUBRIC = /* @__PURE__ */ new Set(["nl", "vl", "regio", "int"]);
  var rubricOfCat = (cat) => !cat || NEWS_RUBRIC.has(cat) ? "nieuws" : cat;
  function languageRule({ followed = /* @__PURE__ */ new Set(), sources = [] } = {}) {
    const langOfSource = new Map(sources.map((s) => [s.id, s.lang]));
    const readerLangs = /* @__PURE__ */ new Map();
    for (const s of sources) {
      if (!followed.has(s.id) || !s.lang || String(s.id).startsWith("bsky:")) continue;
      const r = rubricOfCat(s.cat);
      if (!readerLangs.has(r)) readerLangs.set(r, /* @__PURE__ */ new Set());
      readerLangs.get(r).add(s.lang);
    }
    const catOf = new Map(sources.map((s) => [s.id, s.cat]));
    const kindOf = kindOfWith(catOf);
    const rubricOf = (i) => {
      const k = kindOf(i);
      return k === "nieuws" ? rubricOfCat(catOf.get(i.source)) : k;
    };
    const readableIn = (i, rubric) => {
      if (!i || followed.has(i.source)) return true;
      const ok = (lang) => !lang || lang === "nl" || !!readerLangs.get(rubric)?.has(lang);
      return ok(i.lang || langOfSource.get(i.source)) && ok(langOfSource.get(i.source));
    };
    const readable = (i) => !i || readableIn(i, rubricOf(i));
    return { rubricOf, readableIn, readable, readerLangs };
  }
  var STALE_INPUT_MS = 12 * 36e5;
  function staleInput({ global, items = [], followed = /* @__PURE__ */ new Set() }) {
    const at = (i) => Date.parse(i?.publishedAt) || 0;
    const newest = (list) => list.reduce((m, i) => i && i.kind !== "post" && followed.has(i.source) ? Math.max(m, at(i)) : m, 0);
    const theirs = newest(global?.items || []);
    const own = newest(items);
    return theirs > 0 && own > 0 && theirs - own > STALE_INPUT_MS;
  }
  function composePersonal({ global, stories = [], items = [], sources = [], followed = /* @__PURE__ */ new Set(), interests = [], topics = [], now = Date.parse(global?.builtAt) || Date.now(), builtAt = new Date(now).toISOString(), previous = null, affinity = null, favorites = [], taste = null, readIds = /* @__PURE__ */ new Set(), weg = null, _langRule = true, _memoSignatures = true }) {
    if (!global?.entries?.length) return null;
    if (staleInput({ global, items, followed })) return null;
    const gone = /* @__PURE__ */ new Set();
    const readItem = (i) => {
      if (!excludedFromEdition(i, weg)) return true;
      gone.add(i.id);
      return false;
    };
    items = items.filter((i) => forEdition(i) && readItem(i)).map(withCleanIntro).map(withTrustedTopics);
    const readGlobalItems = (global.items || []).filter(readItem).map(withCleanIntro).map(withTrustedTopics);
    const globalWide = (global.wide || []).filter((w) => !w?.item || readItem(w.item)).map((w) => w?.item ? { ...w, item: withTrustedTopics(withCleanIntro(w.item)) } : w);
    const globalNear = (global.near || []).filter((w) => !w?.item || readItem(w.item));
    const readEntry = (e) => !gone.has(e.leadId || e.id) && !excludedFromEdition(e, weg);
    const known = new Map([...items, ...readGlobalItems].map((i) => [i.id, i]));
    const globalEntries = (global.entries || []).map((e) => {
      if (readEntry(e)) return e;
      if (e.kind !== "story") return null;
      const ids = e.itemIds || stories.find((st) => st.id === e.id)?.itemIds || [];
      const lead = leadCandidates(ids.map((id) => known.get(id)).filter(Boolean), followed, new Set(favorites), now)[0];
      return lead ? { ...e, leadId: lead.id, ..."title" in e ? { title: lead.title } : {} } : null;
    }).filter(Boolean);
    global = { ...global, items: readGlobalItems, wide: globalWide, near: globalNear, entries: globalEntries, bubble: (global.bubble || []).filter(readEntry) };
    const catOf = new Map(sources.map((s) => [s.id, s.cat]));
    const kindOf = kindOfWith(catOf);
    const pool = items.filter((i) => i.kind === "article" && followed.has(i.source));
    const prof = profileOf({ interests, topics, affinity, taste, favorites, followed, sources, supply: supplyOf(pool) });
    const tempo = tempoWindows(items.filter((i) => followed.has(i.source)));
    const mineStories = storiesForReader(stories, items, followed, [...items, ...global.items || []], sources);
    const storyDesk = new Map(mineStories.map((st) => [st.id, st.desk]));
    const itemAny = new Map([...items, ...global.items || [], ...[...global.wide || [], ...global.near || []].map((w) => w?.item).filter(Boolean)].map((i) => [i.id, i]));
    const sigAll = signatures([...itemAny.values()].filter((i) => i.kind !== "post"));
    const ctx = { readIds, tempo, storyDesk, known: itemAny, sigKnown: sigAll, own: new Map(pool.map((i) => [i.id, i])) };
    if (_memoSignatures) {
      const memo2 = /* @__PURE__ */ new WeakMap();
      const coreMemo = /* @__PURE__ */ new WeakMap();
      ctx.signaturesFor = (xs, extra2) => {
        if (!memo2.has(xs)) memo2.set(xs, signatures(xs, extra2));
        return memo2.get(xs);
      };
      ctx.centralItemsFor = (xs, total) => {
        let saved = coreMemo.get(xs);
        if (!saved || saved.total !== total) coreMemo.set(xs, saved = { total, items: centralItems(xs, total) });
        return saved.items;
      };
    }
    const seed = `${editionBasis([...followed], interests, topics, favorites)}|${global.id}`;
    const cultuur = INTERESTS.find((f) => f.id === "cultuur")?.topics || [];
    const gamesSharp = interests.includes("cultuur") && topics.includes("games") && !cultuur.every((t) => topics.includes(t));
    const gamesOk = (prof.topicP.games || 0) >= EXTRA_MIN && (gamesSharp || prof.origin.games === "geleerd");
    const extraKinds = /* @__PURE__ */ new Set([...sportChosen(prof) ? ["sport"] : [], ...cultuurChosen(prof, EXTRA_MIN) ? ["cultuur"] : [], ...gamesOk ? ["games"] : []]);
    const storyById = new Map(stories.map((s) => [s.id, s]));
    const storyByItem = new Map(stories.flatMap((s) => s.itemIds.map((id) => [id, s])));
    const bigLight = (i) => ["cultuur", "games"].includes(kindOf(i)) && !!storyByItem.get(i.id) && majorGeneralNews(storyByItem.get(i.id), [i], catOf);
    const newsPool = pool.filter((i) => kindOf(i) === "nieuws" || !sportChosen(prof) && exceptionalDutchSport(storyByItem.get(i.id) || {}, [i]) || bigLight(i));
    const extraPool = pool.filter((i) => extraKinds.has(kindOf(i)));
    let bubbleEntry = global.entries.find((e) => e.desk === "bubbel") || null;
    const ownIds = new Set(items.filter((i) => followed.has(i.source)).map((i) => i.id));
    const covered = (w) => ownIds.has(w.item.id) || (storyById.get(w.storyId)?.itemIds || []).some((id) => ownIds.has(id));
    const bigWide = (w) => majorNews(storyById.get(w.storyId) || w, [w.item]);
    const wideLeads = /* @__PURE__ */ new Map();
    const wideLead = (w) => {
      if (!wideLeads.has(w)) wideLeads.set(w, covered(w) ? itemAny.get([w.item.id, ...storyById.get(w.storyId)?.itemIds || []].find((id) => ownIds.has(id))) : relead(w.item, storyMembers(w.storyId, w.item.id)));
      return wideLeads.get(w);
    };
    const storyOfItem = new Map(stories.flatMap((s) => s.itemIds.map((id) => [id, s.id])));
    const readOf = (id, sid) => {
      if (!readIds.size || !id) return {};
      const st = storyById.get(sid || storyOfItem.get(id) || itemAny.get(id)?.storyId);
      const ids = [.../* @__PURE__ */ new Set([id, ...st?.itemIds || []])];
      if (!ids.some((x) => readIds.has(x))) return {};
      const { seen, followUp } = personalParts(ids.map((x) => itemAny.get(x)).filter(Boolean), prof, { readIds });
      return followUp ? { followUp } : { seen: seen || { pts: 0 } };
    };
    const preferred = new Set(favorites.filter((id) => followed.has(id)));
    const { rubricOf, readableIn, readable } = _langRule ? languageRule({ followed, sources }) : { rubricOf: () => "nieuws", readableIn: () => true, readable: () => true };
    const storyMembers = (sid, id) => [.../* @__PURE__ */ new Set([id, ...storyById.get(sid)?.itemIds || []])].map((x) => itemAny.get(x)).filter(Boolean);
    const relead = (head, xs) => {
      if (readable(head)) return head;
      const rubric = rubricOf(head);
      const ok = xs.filter((i) => i && i.kind !== "post" && readableIn(i, rubric));
      if (!ok.length) return null;
      const fresh = ok.some((i) => !isStale(i, now)) ? ok.filter((i) => !isStale(i, now)) : ok;
      const mine = fresh.filter((i) => followed.has(i.source));
      return leadPool(leadCandidates(mine.length ? mine : dutchFirst(fresh), followed, preferred, now), xs.filter(Boolean), now, (i) => followed.has(i.source))[0] || null;
    };
    const releadEntry = (e) => {
      const head = itemAny.get(e.leadId || e.id);
      if (readable(head)) return e;
      const next = e.kind === "story" ? relead(head, [...membersOf(e)].map((x) => itemAny.get(x))) : null;
      return next ? { ...e, leadId: next.id, ..."title" in e ? { title: next.title || null } : {} } : null;
    };
    const againOf = (id, sid) => {
      if (!previous || !id) return {};
      const st = storyById.get(sid || storyOfItem.get(id) || itemAny.get(id)?.storyId);
      const members = [.../* @__PURE__ */ new Set([id, ...st?.itemIds || []])].map((x) => itemAny.get(x)).filter(Boolean);
      if (!seenBefore(st || { id }, members, previous)) return {};
      const dev = st ? developedSince(st, members, previous, sigAll, { mainIds: followed, preferred, now, known: itemAny }) : null;
      if (!dev) return { seen: true };
      const rubric = rubricOf(itemAny.get(id) || dev.lead);
      const lead = readableIn(dev.lead, rubric) ? dev.lead : leadCandidates(dev.fresh.filter((i) => readableIn(i, rubric)), followed, preferred, now)[0];
      return { vervolg: dev.fresh.length, leadId: lead ? lead.id : id };
    };
    const unread = (id, sid) => !readOf(id, sid).seen && !againOf(id, sid).seen;
    const withHistory = (e, id, sid) => {
      const { followUp } = readOf(id, sid);
      const { vervolg, leadId } = againOf(id, sid);
      let out2 = followUp ? { ...e, parts: { ...e.parts || {}, followUp } } : e;
      if (vervolg) out2 = e.kind === "item" ? { ...out2, id: leadId, vervolg } : { ...out2, leadId, vervolg };
      return out2;
    };
    const capAbroad = !worldChosen(prof);
    const policyOf = (id, sid, entry = {}) => {
      const st = storyById.get(sid || storyOfItem.get(id));
      const members = [.../* @__PURE__ */ new Set([id, ...st?.itemIds || [], ...entry.itemIds || []])].map((x) => itemAny.get(x)).filter(Boolean);
      const meta = st || entry;
      const desk = st?.desk ?? entry.fromDesk ?? entry.desk ?? null;
      const bubble = entry.desk === "bubbel" || entry.bubble === true;
      const reason = newsRejection(prof, meta, members, desk, { bubble });
      return { allowed: reason === null, reason, abroad: internationalNews(members, desk, meta), capped: cappedInternational(prof, members, desk, meta), members, meta, desk };
    };
    const unchosenAbroad = (id, sid) => capAbroad && policyOf(id, sid).capped;
    const eligible = (id, sid, entry = {}) => {
      const p = policyOf(id, sid, entry);
      return p.allowed && (!capAbroad || !p.capped || abroad < INT_MAX);
    };
    const wideAny = (global.wide || []).some((w) => w?.item?.id && !covered(w) && unread(w.item.id, w.storyId) && wideLead(w));
    const size = EDITION_SIZE - (wideAny ? 1 : 0);
    const opts = { mainIds: followed, now, previous, preferred, prof, ctx, seed };
    const extraAll = extraPool.length ? selectForReader(mineStories, extraPool, { ...opts, size: 2 * EXTRA_MAX, plan: false }) : [];
    const extraN = Math.min(EXTRA_MAX, extraAll.length);
    const leadCat = (e) => catOf.get(pool.find((i) => i.id === (e.leadId || e.id))?.source);
    const sel = selectForReader(mineStories, newsPool, { ...opts, size: size - extraN });
    const news = sel.map((e) => {
      const review = /^(review|test)\s*:/i.test(pool.find((i) => i.id === (e.leadId || e.id))?.title || "");
      return SPECIALIST.has(leadCat(e)) && (review || !e.planned && !e.front) ? { ...e, desk: leadCat(e) } : e;
    });
    const inNews = new Set(news.flatMap((e) => e.itemIds || [e.id]));
    let abroad = sel.counted.size;
    const extra = [];
    for (const e of extraAll) {
      if (extra.length >= extraN) break;
      if ((e.itemIds || [e.id]).some((id) => inNews.has(id))) continue;
      const un = unchosenAbroad(e.leadId || e.id, e.kind === "story" ? e.id : null);
      if (!eligible(e.leadId || e.id, e.kind === "story" ? e.id : null, e)) continue;
      if (un) abroad++;
      extra.push({ ...e, desk: null });
    }
    const own = [...news, ...extra];
    const serverStory = (e) => e.kind === "story" ? null : e.formerId || itemAny.get(e.leadId || e.id)?.storyId || null;
    const membersOf = (e) => /* @__PURE__ */ new Set([e.leadId || e.id, ...e.kind === "story" ? [...storyById.get(e.id)?.itemIds || [], ...e.itemIds || []] : storyById.get(serverStory(e))?.itemIds || []]);
    const taken = new Set(own.flatMap((e) => [...membersOf(e)]));
    const leads = own.map((e) => e.leadId || e.id);
    const sameAsPlaced = (id) => sigAll.has(id) && leads.some((x) => x !== id && sigAll.has(x) && sameSubject(sigAll.get(id), sigAll.get(x)));
    const fitOf = (w) => Math.max(0, ...(w.topics || []).map((t) => Math.max(prof.topicP[t] || 0, prof.shareOf[t] || 0)));
    const prevHeads = previous ? previousHeads(sigAll, previous, now) : [];
    const sameAsPrevious = (id, sid) => !!prevHeads.length && sigAll.has(id) && prevHeads.some((s) => sameSubject(sigAll.get(id), s)) && !againOf(id, sid).vervolg;
    const free2 = (w) => w?.item?.id && !!wideLead(w) && eligible(w.item.id, w.storyId, w) && !taken.has(w.item.id) && !sameAsPlaced(w.item.id) && !sameAsPlaced(wideLead(w)?.id) && !(storyById.get(w.storyId)?.itemIds || []).some((id) => taken.has(id)) && (!covered(w) || bigWide(w)) && unread(w.item.id, w.storyId) && !sameAsPrevious(wideLead(w)?.id || w.item.id, w.storyId);
    const wide0 = (global.wide || []).find((w) => free2(w) && bigWide(w) && outsideProfile(w.topics, prof)) || (global.wide || []).find((w) => free2(w) && bigWide(w)) || (global.wide || []).find((w) => free2(w) && outsideProfile(w.topics, prof)) || (global.wide || []).filter(free2).sort((a, b) => fitOf(a) - fitOf(b) || b.sourceCount - a.sourceCount || byText(a.storyId, b.storyId))[0];
    let wide = wide0 ? { ...wide0, item: wideLead(wide0) } : null;
    let swapped = 0;
    if (wide && !wideAny) {
      const kernOf = (es) => new Set(es.map((x) => x.desk).filter((d) => KERN.includes(d))).size;
      const keepsKern = (e) => kernOf(news.filter((x) => x !== e)) >= Math.min(KERN_MIN, kernOf(news));
      const light = news.map((e, i) => ({ e, i })).filter(({ e }) => !e.front && !majorNews(storyById.get(e.id) || e, (e.itemIds || [e.leadId || e.id]).map((id) => itemAny.get(id)).filter(Boolean)) && keepsKern(e)).sort((a, b) => a.e.w - b.e.w || byText(b.e.id, a.e.id))[0];
      if (light) {
        news.splice(light.i, 1);
        taken.clear();
        for (const e of [...news, ...extra]) for (const id of membersOf(e)) taken.add(id);
        const li = leads.indexOf(light.e.leadId || light.e.id);
        if (li >= 0) leads.splice(li, 1);
        if (sel.counted.has(light.e.id)) abroad--;
        swapped = 1;
      } else wide = null;
    }
    const wideEntry = wide ? withHistory({ kind: "story", id: wide.storyId, leadId: wide.item.id, desk: WIDE, sourceCount: wide.sourceCount, ...bigWide(wide) ? { big: true } : {} }, wide.item.id, wide.storyId) : null;
    if (wideEntry) {
      if (unchosenAbroad(wide.item.id, wide.storyId)) abroad++;
      for (const id of [wide.item.id, ...storyById.get(wide.storyId)?.itemIds || []]) taken.add(id);
      leads.push(wide.item.id);
    }
    const globalItems = new Map((global.items || []).map((i) => [i.id, i]));
    const noFavorites = { ...prof, favorites: /* @__PURE__ */ new Set() };
    const fillTo = size - extra.length - swapped;
    const supplementReason = (g) => {
      const id = g.leadId || g.id, sid = g.kind === "story" ? g.id : null;
      const p = policyOf(id, sid, g);
      if (!p.allowed) return null;
      const it = itemAny.get(id);
      if (!it || !(now - Date.parse(it.publishedAt) >= 0) || now - Date.parse(it.publishedAt) >= 24 * 36e5) return null;
      if (majorNews(p.meta, p.members)) return "groot";
      if (worldChosen(prof) && p.abroad && kindOf(it) === "nieuws") return "passend";
      const hit = personalParts(p.members, prof, {}, { desk: p.desk, foreign: p.abroad }).interest;
      if (hit && hit.shown !== false && hit.cov >= 0.5 && hit.pts > 0 && !hit.t.startsWith("bron:")) return "passend";
      if (followed.has(it.source) && kindOf(it) === "nieuws") return "eigen";
      if (!interests.length && !topics.length && !p.abroad && ["binnenland", "regio"].includes(p.desk)) return "basis";
      return null;
    };
    const otherPool = [...global.wide || [], ...global.near || []].filter((w) => w?.item?.id).map((w) => ({ kind: "story", id: w.storyId, leadId: w.item.id, desk: storyById.get(w.storyId)?.desk ?? null, sourceCount: w.sourceCount }));
    const supplementPool = [...new Map([...global.entries, ...otherPool].map((g) => [`${g.kind}:${g.id}`, g])).values()];
    const fillCands = supplementPool.map((g0, idx) => ({ g0, g: releadEntry(g0), idx })).filter((x) => x.g).map(({ g0, g, idx }) => ({ g0, g, idx, score: sumParts(personalParts([itemAny.get(g.leadId || g.id)].filter(Boolean), noFavorites, {}, { desk: g.desk })) - 2 * idx })).filter((x) => supplementReason(x.g) && x.g0 !== bubbleEntry && unread(x.g.leadId || x.g.id, x.g.kind === "story" ? x.g.id : null)).sort((a, b) => b.score - a.score || a.idx - b.idx);
    const fill = [];
    const unchosenG = (g) => capAbroad && policyOf(g.leadId || g.id, g.kind === "story" ? g.id : null, g).capped;
    const fillUp = (to) => {
      for (const { g } of fillCands) {
        if (news.length + fill.length >= to) break;
        const m = membersOf(g);
        if ([...m].some((id) => taken.has(id)) || sameAsPlaced(g.leadId || g.id)) continue;
        const gi = unchosenG(g);
        if (!eligible(g.leadId || g.id, g.kind === "story" ? g.id : null, g)) continue;
        for (const id of m) taken.add(id);
        leads.push(g.leadId || g.id);
        if (gi) abroad++;
        fill.push(withHistory({ ...g, desk: EXTERN, fromDesk: g.desk || null, supplement: supplementReason(g) }, g.leadId || g.id, g.kind === "story" ? g.id : null));
      }
    };
    fillUp(fillTo);
    const clashes = (id) => taken.has(id) || sigAll.has(id) && [...taken].some((x) => sigAll.has(x) && sameEvent(sigAll.get(id), sigAll.get(x)));
    const topicsOfStory = (sid, id) => [...new Set((storyById.get(sid)?.itemIds || [id]).flatMap((x) => itemAny.get(x)?.topics || []))];
    let nearItem = null;
    if (bubbleEntry) {
      const okB = (b) => itemAny.has(b.id) && readable(itemAny.get(b.id)) && eligible(b.id, b.storyId, { ...b, bubble: true }) && !clashes(b.id) && unread(b.id, b.storyId) && outsideProfile(topicsOfStory(b.storyId, b.id), prof) && !(abroad >= INT_MAX && unchosenAbroad(b.id, b.storyId));
      const first = (global.bubble || []).find((b) => b.id === bubbleEntry.id) || { id: bubbleEntry.id };
      const alt = [first, ...global.bubble || []].find(okB);
      if (alt) {
        if (alt.id !== bubbleEntry.id) bubbleEntry = { kind: "item", id: alt.id, desk: "bubbel", terms: alt.terms };
        bubbleEntry = withHistory(bubbleEntry, alt.id, alt.storyId);
      } else {
        const home = strongestFamily(prof);
        const next = new Set(NEIGHBOURS[home] || []);
        const recent = stories.filter((st) => st.sourceCount >= NEAR_MIN_SOURCES && now - Date.parse(st.latestAt) < 24 * 36e5).sort((a, b) => b.sourceCount - a.sourceCount || byText(a.id, b.id)).map((st) => ({ storyId: st.id, sourceCount: st.sourceCount, topics: topicsOfStory(st.id), item: itemAny.get(st.leadId) || st.itemIds.map((x) => itemAny.get(x)).find(Boolean) }));
        const fits = (w) => w?.item?.id && eligible(w.item.id, w.storyId, { ...w, bubble: true }) && !clashes(w.item.id) && !(storyById.get(w.storyId)?.itemIds || []).some((x) => taken.has(x)) && unread(w.item.id, w.storyId) && outsideProfile(w.topics || [], prof) && (w.topics || []).some((t) => next.has(FAMILY_OF[t])) && !(abroad >= INT_MAX && unchosenAbroad(w.item.id, w.storyId));
        const nearLead = (w) => relead(w.item, storyMembers(w.storyId, w.item.id));
        const pick0 = [...global.near || [], ...recent].find((w) => fits(w) && nearLead(w));
        const pick = pick0 && nearLead(pick0) !== pick0.item ? { ...pick0, item: nearLead(pick0) } : pick0;
        bubbleEntry = pick ? withHistory({ kind: "story", id: pick.storyId, leadId: pick.item.id, desk: "bubbel", near: home }, pick.item.id, pick.storyId) : null;
        if (pick) {
          nearItem = pick.item;
          for (const id of [pick.item.id, ...storyById.get(pick.storyId)?.itemIds || []]) taken.add(id);
        }
      }
    }
    if (bubbleEntry) taken.add(bubbleEntry.leadId || bubbleEntry.id);
    let entries = [...news, ...fill, ...extra];
    if (wideEntry) entries.splice(Math.min(6, entries.length), 0, wideEntry);
    const finalTaken = /* @__PURE__ */ new Set();
    const finalLeads = [];
    let internationalCount = 0;
    const accepted = [];
    let capacity = EDITION_SIZE;
    let floorLight = false;
    const famOf = voteFamilyOf(stories, itemAny);
    const famTaken = /* @__PURE__ */ new Map();
    const famKey = (e) => famOf.get(e.kind === "story" ? e.id : serverStory(e)) || famOf.get(storyOfItem.get(e.leadId || e.id)) || null;
    const accept = (e) => {
      if (accepted.length >= capacity) return;
      const id = e.leadId || e.id;
      if (!readable(itemAny.get(id))) return;
      const p = policyOf(id, e.kind === "story" ? e.id : null, e);
      const ids = [...membersOf(e)];
      if (ids.some((x) => finalTaken.has(x)) || sigAll.has(id) && finalLeads.some((x) => sigAll.has(x) && sameSubject(sigAll.get(id), sigAll.get(x)))) return;
      const fam = famKey(e);
      if (fam && (famTaken.get(fam) || 0) >= FAMILY_MAX) return;
      const allowed = p.allowed || floorLight && p.reason === "licht-buiten-interesse";
      if (!allowed || capAbroad && p.capped && internationalCount >= INT_MAX) return;
      if (p.capped) internationalCount++;
      if (fam) famTaken.set(fam, (famTaken.get(fam) || 0) + 1);
      ids.forEach((x) => finalTaken.add(x));
      finalLeads.push(id);
      accepted.push(e);
    };
    entries.forEach(accept);
    if (accepted.length < EDITION_SIZE) selectForReader(mineStories, newsPool, { ...opts, size: EDITION_SIZE }).forEach(accept);
    for (const { g } of fillCands) {
      if (accepted.length >= EDITION_SIZE) break;
      accept(withHistory({ ...g, desk: EXTERN, fromDesk: g.desk || null, supplement: supplementReason(g) }, g.leadId || g.id, g.kind === "story" ? g.id : null));
    }
    if (accepted.length < EDITION_FLOOR) {
      floorLight = true;
      capacity = EDITION_FLOOR;
      selectForReader(mineStories, newsPool, { ...opts, size: EDITION_SIZE, allowLight: true }).forEach(accept);
      floorLight = false;
    }
    if (bubbleEntry) {
      capacity = accepted.length + 1;
      accept(bubbleEntry);
    }
    entries = accepted;
    const knownOf = (e) => [...membersOf(e)].map((id) => itemAny.get(id)).filter(Boolean);
    const hasNews = (e) => knownOf(e).some((i) => !isOpinion(i));
    if (prof.interests.has("binnenland")) {
      const first = entries.findIndex((e) => {
        const p = policyOf(e.leadId || e.id, e.kind === "story" ? e.id : null, e);
        return e.desk !== "bubbel" && !p.abroad && ["binnenland", "regio"].includes(p.desk) && hasNews(e);
      });
      if (first > 0) entries.unshift(...entries.splice(first, 1));
    }
    curiosaDown(entries, { itemsOf: knownOf, storyOf: (e) => e.kind === "story" ? storyById.get(e.id) : null });
    openWithNews(entries, {
      itemsOf: knownOf,
      pick: (xs, all) => {
        const rubric = rubricOf(itemAny.get(entries[0].leadId || entries[0].id) || xs[0]);
        return leadPool(leadCandidates(xs.filter((i) => readableIn(i, rubric)), followed, preferred, now, { role: "front" }), all, now, (i) => followed.has(i.source))[0];
      }
    });
    const poolById = new Map(pool.map((i) => [i.id, i]));
    const wideById = new Map([...(global.wide || []).map((w) => w?.item).filter(Boolean), ...wide ? [wide.item] : [], ...nearItem ? [nearItem] : []].map((i) => [i.id, i]));
    const itemOf = (id) => poolById.get(id) || wideById.get(id) || globalItems.get(id) || itemAny.get(id);
    const srcName = new Map(sources.map((s) => [s.id, s.name]));
    const mineDesks = chosenDesks(prof);
    const out = entries.map((e) => {
      let why = whyOf(e, { parts: e.parts || {}, sourceCount: e.sourceCount || storyById.get(e.id)?.sourceCount || 0, desk: e.desk, plannedDesk: !!e.planned && mineDesks.has(e.desk), sourceName: (s) => srcName.get(s) || s });
      if (e.supplement && !e.vervolg) {
        const p = policyOf(e.leadId || e.id, e.kind === "story" ? e.id : null, e);
        const hit = personalParts(p.members, prof, {}, { desk: p.desk, foreign: p.abroad }).interest;
        const family = INTERESTS.find((x) => x.id === hit?.f)?.label || (worldChosen(prof) ? "Wereld" : "je interesses");
        const reasons = { groot: `Groot nieuws · ${p.meta.publisherCount || p.meta.sourceCount || e.sourceCount || 1} bronnen`, passend: `Aanvulling bij ${family}`, basis: "Actueel nieuws uit Nederland", eigen: "Uit je gekozen bronnen" };
        if (reasons[e.supplement]) why = { ...why, text: reasons[e.supplement], detail: true };
      }
      const { w, parts, planned, front, vervolg, big, ...rest } = e;
      const lead = e.leadId || e.id;
      const itemIds = e.kind === "story" ? e.itemIds || storyById.get(e.id)?.itemIds || [lead] : [lead];
      const keys = e.kind === "story" ? e.keys || storyById.get(e.id)?.keys : null;
      return { ...rest, itemIds, ...keys ? { keys } : {}, title: e.title || itemOf(lead)?.title || null, why, _parts: parts || {}, _front: !!front };
    });
    let supply = null;
    const regularCount = editionStoryCount(out);
    if (regularCount < EDITION_AUDIT_BELOW) {
      const decisions = [];
      selectForReader(mineStories, newsPool, { ...opts, size: EDITION_SIZE, audit: decisions });
      if (extraPool.length) selectForReader(mineStories, extraPool, { ...opts, size: 2 * EXTRA_MAX, plan: false, audit: decisions });
      const selectedIds = new Set(out.flatMap((e) => e.itemIds || [e.leadId || e.id]));
      const selectedSigs = out.map((e) => sigAll.get(e.leadId || e.id)).filter(Boolean);
      const represented = (ids) => ids.some((id) => selectedIds.has(id) || sigAll.has(id) && selectedSigs.some((s) => sameSubject(sigAll.get(id), s)));
      const finalReason = (id, sid, entry = {}) => {
        const p = policyOf(id, sid, entry);
        if (!unread(id, sid)) return "eerder-getoond-of-gelezen";
        if (!p.allowed) return newsRejection(prof, p.meta, p.members, p.desk);
        if (capAbroad && p.capped && internationalCount >= INT_MAX) return "internationaal-plafond";
        return "onverklaard";
      };
      for (const d of decisions) {
        if (represented(d.itemIds)) d.reason = "vertegenwoordigd";
        else if (d.reason === "gekozen-in-route") d.reason = finalReason(d.itemIds.find((id) => itemAny.has(id)) || d.id, d.kind === "story" ? d.id : null);
      }
      for (const d of decisions) {
        if (d.reason === "via-verhaal") {
          const st = storyByItem.get(d.id);
          d.reason = st ? decisions.find((x) => x.kind === "story" && x.id === st.id)?.reason || "onverklaard-verhaal" : "onbekend-verhaal-id";
        }
      }
      const examined = new Set(decisions.flatMap((d) => d.itemIds));
      for (const i of pool) if (!examined.has(i.id)) decisions.push({ kind: "item", id: i.id, itemIds: [i.id], reason: !extraKinds.has(kindOf(i)) && kindOf(i) !== "nieuws" ? "niet-gekozen-vakgebied" : "onverklaard" });
      for (const g of supplementPool) {
        const id = g.leadId || g.id, sid = g.kind === "story" ? g.id : null;
        decisions.push({ kind: g.kind, id: g.id, itemIds: [...membersOf(g)], route: "algemene-editie", reason: represented([...membersOf(g)]) ? "vertegenwoordigd" : !releadEntry(g) ? "andere-taal" : !supplementReason(g) ? finalReason(id, sid, g) === "onverklaard" ? "geen-aantoonbare-aanvulreden" : finalReason(id, sid, g) : finalReason(id, sid, g) });
      }
      const counts = Object.fromEntries([...new Set(decisions.map((d) => d.reason))].sort().map((r) => [r, decisions.filter((d) => d.reason === r).length]));
      const unresolved = decisions.filter((d) => /onverk|onbekend|route-vol|gekozen-in-route/.test(d.reason));
      supply = { target: EDITION_SIZE, auditBelow: EDITION_AUDIT_BELOW, floor: EDITION_FLOOR, selected: regularCount, totalSlots: out.length, ownArticles: pool.length, decisions, counts, unresolved: unresolved.length, proven: regularCount >= EDITION_FLOOR && unresolved.length === 0 };
    }
    const shown2 = [...new Set(out.map((e) => e.leadId || e.id))];
    return {
      id: global.id,
      slot: global.slot,
      date: global.date,
      next: global.next,
      personal: true,
      builtAt,
      version: `${global.id}@mine@${builtAt}`,
      basedOn: global.version || null,
      entries: out,
      items: shown2.map(itemOf).filter(Boolean),
      bubble: global.bubble || [],
      brief: null,
      _plan: sel.deskOrder,
      ...supply ? { _supply: supply } : {}
    };
  }
  function withoutDebug(edition) {
    if (!edition) return edition;
    const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith("_")));
    return { ...strip(edition), entries: (edition.entries || []).map(strip) };
  }
  function earlierEditions({ local = null, account = null, id = null, owner = null } = {}) {
    const rows = [];
    const add = (e) => {
      if (!e || typeof e !== "object") return;
      if (Array.isArray(e.history)) rows.push(...e.history);
      if (e.id !== id) rows.push(e);
    };
    if (local && (!owner || local.owner === owner)) add(local);
    add(account);
    return recentEditions(rows);
  }
  function editionBasis(followed = [], interests = [], topics = [], favorites = []) {
    const parts = [[...followed].sort().join(","), [...interests].sort().join(","), [...topics].sort().join(",")];
    if (favorites.length) parts.push([...favorites].sort().join(","));
    const text = [BASIS_REVISION, ...parts].join("|");
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = (h * 33 ^ text.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  // shared/voorstel.mjs
  var VOORSTEL_MAX = 5;
  var ALGEMEEN = ["nos", "nu", "rtl"];
  var SNEL = "nu";
  var NL_NIEUWS = /* @__PURE__ */ new Set(["politiek", "binnenland"]);
  var EXTRA_CATS = { wereld: ["int"] };
  var free = (s) => !s.paid;
  var aanrader = (s, i) => (s.for || []).includes(i.id) || !!s.forTopic && i.topics.includes(s.forTopic);
  var dutch = (s) => s.lang === "nl";
  function fit(s, i, topics = []) {
    if (!s || !i) return 0;
    if (NL_NIEUWS.has(i.id) && s.id === SNEL) return 2;
    if (s.cat === "nl" || s.cat === "vl") return 0;
    let n = 0;
    if ((s.for || []).includes(i.id)) n += 4;
    if (s.forTopic && topics.includes(s.forTopic) && i.topics.includes(s.forTopic)) n += 3;
    if ([...i.cats, ...EXTRA_CATS[i.id] || []].includes(s.cat)) n += 2;
    if (s.forTopic && !topics.length && i.topics.includes(s.forTopic)) n += 1;
    return n;
  }
  var label = (ids) => {
    const names = INTERESTS.filter((i) => ids.includes(i.id)).map((i) => i.label);
    return names.length > 1 ? `${names.slice(0, -1).join(", ")} en ${names[names.length - 1]}` : names[0] || "";
  };
  function voorstel(sources = [], interests = [], topics = []) {
    const chosen = INTERESTS.filter((i) => interests.includes(i.id) || i.topics.some((t) => topics.includes(t)));
    if (!chosen.length) return null;
    const news = sources.filter((s) => s.kind !== "sociaal");
    const out = [];
    const has = (id) => out.some((o) => o.id === id);
    const add = (s, why2) => s && !has(s.id) && out.length < VOORSTEL_MAX && out.push({ id: s.id, why: why2 });
    const start = ALGEMEEN.map((id) => news.find((s) => s.id === id)).find((s) => s && free(s));
    add(start, "Het nieuws van de dag");
    const covers = (s) => chosen.filter((i) => (s.for || []).includes(i.id)).map((i) => i.id);
    const dominant = news.filter((s) => !has(s.id) && covers(s).length >= 2).sort((a, b) => covers(b).length - covers(a).length)[0] || null;
    const picks = [];
    for (const i of chosen) {
      const fits = news.filter((s) => fit(s, i, topics) > 0 && !has(s.id) && !picks.some((p) => p.s.id === s.id));
      const best = (list) => list.sort((a, b) => fit(b, i, topics) - fit(a, i, topics) || (b.pick ? 1 : 0) - (a.pick ? 1 : 0))[0] || null;
      const pick = best(fits.filter((s) => free(s) && dutch(s))) || best(fits.filter(free));
      if (pick) {
        picks.push({ s: pick, i });
        continue;
      }
      if (dominant && covers(dominant).includes(i.id)) continue;
      const paid = best(fits.filter((s) => aanrader(s, i)));
      if (paid) picks.push({ s: paid, i });
    }
    if (dominant) add(dominant, `Past bij ${label(covers(dominant))}`);
    const why = (s, i) => s.id === SNEL ? `Snel het ${i.id === "politiek" ? "politieke" : "binnenlandse"} nieuws` : `Past bij ${i.label}`;
    for (const { s, i } of picks) add(s, why(s, i));
    for (const i of chosen) {
      if (out.length >= 3) break;
      const fits = news.filter((s) => fit(s, i, topics) > 0 && free(s) && !has(s.id));
      const next = fits.sort((a, b) => (dutch(b) ? 1 : 0) - (dutch(a) ? 1 : 0) || fit(b, i, topics) - fit(a, i, topics) || (b.pick ? 1 : 0) - (a.pick ? 1 : 0))[0];
      if (next) add(next, why(next, i));
    }
    for (const i of chosen) {
      if (out.length >= 3) break;
      const fits = news.filter((s) => fit(s, i, topics) > 0 && aanrader(s, i) && !has(s.id));
      const next = fits.sort((a, b) => (dutch(b) ? 1 : 0) - (dutch(a) ? 1 : 0) || fit(b, i, topics) - fit(a, i, topics) || (b.pick ? 1 : 0) - (a.pick ? 1 : 0))[0];
      if (next) add(next, why(next, i));
    }
    const paidOf = new Set(news.filter((s) => s.paid).map((s) => s.id));
    return out.map((o) => ({ ...o, on: !paidOf.has(o.id) })).sort((a, b) => (b.on ? 1 : 0) - (a.on ? 1 : 0));
  }
  function voorstelJSON(jsonIn) {
    const { sources = [], interests = [], topics = [] } = JSON.parse(jsonIn || "{}");
    return JSON.stringify(voorstel(sources, interests, topics));
  }

  // src/lib/editionCore.js
  var CORE_VERSION = 1;
  var HISTORY_SIZE = HISTORY_MAX;
  var asSet = (v) => v instanceof Set ? v : new Set(Array.isArray(v) ? v : []);
  var mergePrevious = previousOf;
  function nextHistory(prior = [], edition) {
    const rows = (Array.isArray(prior) ? prior : []).filter((x) => x && x.id !== edition?.id);
    return recentEditions(rows).map(historyOf).filter(Boolean);
  }
  function previousFrom(v) {
    if (!v) return null;
    if (Array.isArray(v)) return previousOf(v);
    if (Array.isArray(v.storyIds) || v.entries) return previousOf([v]);
    return null;
  }
  function inputOf(input) {
    const followed = asSet(input.followed);
    const readIds = asSet(input.readIds);
    const now = Number(input.now) || Date.parse(input.global?.builtAt) || 0;
    return {
      global: input.global,
      stories: input.stories || [],
      items: input.items || [],
      sources: input.sources || [],
      followed,
      interests: input.interests || [],
      topics: input.topics || [],
      favorites: input.favorites || [],
      // `reading`: je leesprofiel zoals het naar de server gaat (readingSummary); het vangnet van de app rekent
      // daarmee, net als het web. Zonder `reading` het ruwe `affinity` (de pariteitstests, app 1.2).
      affinity: "reading" in input ? readingSummary(input.reading) : input.affinity || null,
      taste: input.taste || null,
      readIds,
      previous: previousFrom(input.previous),
      now,
      builtAt: input.builtAt || new Date(now).toISOString()
    };
  }
  function compose(input) {
    if (!input || typeof input !== "object") return null;
    const args = inputOf(input);
    const mine = composePersonal(args);
    if (!mine) return null;
    const storyById = new Map(args.stories.map((s) => [s.id, s]));
    const itemById = new Map((mine.items || []).map((i) => [i.id, i]));
    const entries = (mine.entries || []).map((e) => {
      const lead = e.leadId || e.id;
      const itemIds = e.itemIds || (e.kind === "story" ? storyById.get(e.id)?.itemIds || [lead] : [lead]);
      const title = e.title !== void 0 ? e.title : itemById.get(lead)?.title || null;
      const keys = e.kind === "story" ? e.keys || storyById.get(e.id)?.keys : null;
      return { ...e, itemIds, ...keys ? { keys } : {}, title };
    });
    const basis = editionBasis([...args.followed], args.interests, args.topics, args.favorites);
    return { ...withoutDebug({ ...mine, entries }), basis, owner: typeof input.owner === "string" && input.owner ? input.owner : "anon" };
  }
  function composeEdition(jsonIn) {
    const input = typeof jsonIn === "string" ? JSON.parse(jsonIn) : jsonIn;
    const out = compose(input);
    return JSON.stringify(out);
  }
  function basisOf(followed = [], interests = [], topics = [], favorites = []) {
    return editionBasis(followed || [], interests || [], topics || [], favorites || []);
  }
  function historyJSON(editionJSON) {
    return JSON.stringify(historyOf(typeof editionJSON === "string" ? JSON.parse(editionJSON) : editionJSON));
  }
  function nextHistoryJSON(priorJSON, editionJSON) {
    const prior = typeof priorJSON === "string" ? JSON.parse(priorJSON) : priorJSON;
    const edition = typeof editionJSON === "string" ? JSON.parse(editionJSON) : editionJSON;
    return JSON.stringify(nextHistory(prior, edition));
  }
  function earlierEditionsJSON(localJSON, accountJSON, id, owner) {
    const parse = (v) => typeof v === "string" ? JSON.parse(v) : v;
    return JSON.stringify(earlierEditions({ local: parse(localJSON) ?? null, account: parse(accountJSON) ?? null, id: id ?? null, owner: owner ?? null }));
  }
  function previousJSON(listJSON) {
    const p = previousFrom(typeof listJSON === "string" ? JSON.parse(listJSON) : listJSON);
    if (!p) return "null";
    const flat = { ...p, storyIds: [...p.storyIds], itemIds: [...p.itemIds], leadIds: [...p.leadIds], titles: [...p.titles], leadStoryIds: [...p.leadStoryIds], atOf: Object.fromEntries(p.atOf), keysOf: Object.fromEntries([...p.keysOf].map(([id, ks]) => [id, [...ks]])) };
    return JSON.stringify(flat);
  }
  function profileSummaryOf(input) {
    if (!input || typeof input !== "object") return { chosen: [], learned: [], less: [] };
    const followed = asSet(input.followed);
    const prof = profileOf({
      interests: input.interests || [],
      topics: input.topics || [],
      affinity: input.affinity || null,
      taste: input.taste || null,
      favorites: input.favorites || [],
      followed,
      sources: input.sources || [],
      supply: supplyOf((input.items || []).filter(forEdition), followed)
    });
    return profileSummary(prof);
  }
  function profileSummaryJSON(jsonIn) {
    return JSON.stringify(profileSummaryOf(typeof jsonIn === "string" ? JSON.parse(jsonIn) : jsonIn));
  }
  function readingSummaryJSON(affinityJSON) {
    return JSON.stringify(readingSummary(typeof affinityJSON === "string" ? JSON.parse(affinityJSON) : affinityJSON));
  }
  return __toCommonJS(editionCore_exports);
})();
