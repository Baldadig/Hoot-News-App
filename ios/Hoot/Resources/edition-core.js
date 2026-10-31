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
    previousOf: () => previousOf2,
    profileSummary: () => profileSummary,
    profileSummaryJSON: () => profileSummaryJSON,
    profileSummaryOf: () => profileSummaryOf,
    recentEditions: () => recentEditions
  });

  // netlify/lib/desks.mjs
  var DESKS = ["binnenland", "buitenland", "vs", "middenoosten", "oekraine", "wetenschap"];
  var DESK_LABEL = { binnenland: "Binnenland", buitenland: "Buitenland", vs: "VS", middenoosten: "Midden-Oosten", oekraine: "Oekraïne", wetenschap: "Wetenschap", bubbel: "Buiten je bubbel" };
  var NL_NEWS = /* @__PURE__ */ new Set(["nos", "nrc", "volkskrant"]);
  var RE = {
    oekraine: /\b(oekra\w*|ukrain\w*|zelensk\w*|kyiv|kiev|kyjiv|kharkiv|charkiv|odesa|donetsk|donbas|krim|crimea|dnipro|kramatorsk)\b/i,
    middenoosten: /\b(israël|israel\w*|gaza|hamas|hezbollah|libanon|lebanon|iran\w*|teheran|tehran|khamenei|netanyahu|syri\w*|jemen|yemen|houthi\w*|irak|iraq|saudi\w*|westelijke jordaanoever|west bank|jordani\w*|qatar|golfstaten|midden-oosten|middle east|palestijn\w*|palestin\w*)\b/i,
    vs: /\b(trump|biden|vance|witte huis|white house|washington|congres\w*|congress|senaat|senate|republikein\w*|republican\w*|democra(at|ten|tic|ts)|pentagon|hegseth|midterms?|tussentijdse verkiezingen|amerikaan\w*|american|verenigde staten|united states|u\.s\.|new york|california|californi\w*|texas|florida|chicago|supreme court|hooggerechtshof|fbi|ice)\b/i,
    wetenschap: /\b(wetenschap\w*|onderzoekers|onderzoek toont|studie|scientist\w*|researchers|science|study finds|nobelprijs|nobel prize|klimaat\w*|climate|nasa|esa|astronom\w*|ruimtevaart|telescoop|telescope|natuurkunde|physics|biolog\w*|evolutie|evolution|dna|genetic\w*|genetica|vaccin\w*|medicijn|geneesmiddel|quantum|kwantum|archeolog\w*|fossiel|fossil|aardbeving|earthquake|vulkaan|volcano|neurolog\w*|hersenonderzoek)\b/i,
    buitenland: /\b(frankrijk|france|french|frans\w*|parijs|paris|duitsland|germany|german|duits\w*|berlijn|berlin|brit\w*|engeland|england|london|londen|verenigd koninkrijk|united kingdom|spanje|spain|itali\w*|polen|poland|belgi\w*|brussel|brussels|europese unie|european union|\beu\b|navo|nato|china|chinees|chinese|peking|beijing|taiwan|japan\w*|korea\w*|india\w*|pakistan|afghanistan|rusland|russia\w*|russisch\w*|poetin|putin|kremlin|moskou|moscow|turkije|turkey|erdogan|afrika|africa|nigeria|soedan|sudan|egypte|egypt|brazili\w*|mexico|venezuela\w*|maduro|argentini\w*|canada\w*|australi\w*|albani\w*|albane\w*|spaans\w*|pools\w*|turks\w*|griek\w*|zweed\w*|deens\w*|oostenrijk\w*|zwitser\w*|portug\w*|hongaar\w*|indiase|mexica\w*|canad\w*|egypt\w*|japans\w*|koreaan\w*|afrikaan\w*|europe\w*|europa|servi\w*|hongarije|hungary|orbán|griekenland|greece|zweden|noorwegen|denemarken|oostenrijk|zwitserland|ierland|portugal|tsjechi\w*|roemeni\w*|bulgarije|georgi\w*|armeni\w*|azerbeidzjan|wit-rusland|belarus|filipijnen|indonesi\w*|vietnam|thailand|myanmar|bangladesh|sri lanka|nepal|kenia|ethiopi\w*|somali\w*|congo|zuid-afrika|south africa|haïti|haiti|cuba|colombia|chili|peru)\b/i
  };
  function desksOf({ title = "", summary = "", text = "", source = "", url = "", section = "", cats = "" }) {
    const t = `${title} ${summary || text} ${cats}`;
    const out = /* @__PURE__ */ new Set();
    const sec = `${section} ${url}`.toLowerCase();
    if (RE.oekraine.test(t)) out.add("oekraine");
    if (RE.middenoosten.test(t)) out.add("middenoosten");
    if (RE.vs.test(t)) out.add("vs");
    if (RE.wetenschap.test(t) || /wetenschap|\/science\/|\/health\//.test(sec)) out.add("wetenschap");
    const foreign = out.has("oekraine") || out.has("middenoosten") || out.has("vs") || RE.buitenland.test(t) || /buitenland|\/world\//.test(sec);
    if (foreign && !out.has("oekraine") && !out.has("middenoosten") && !out.has("vs")) out.add("buitenland");
    if (NL_NEWS.has(source) && !foreign || /binnenland|\/politiek\//.test(sec)) out.add("binnenland");
    return out;
  }
  var PRIORITY = ["oekraine", "middenoosten", "wetenschap", "vs", "buitenland", "binnenland"];
  function primaryDesk(itemDesks = []) {
    const count = {};
    for (const set of itemDesks) for (const d of set) count[d] = (count[d] || 0) + 1;
    let best = null;
    for (const d of PRIORITY) if (count[d] && (!best || count[d] > count[best])) best = d;
    return best && count[best] * 2 >= itemDesks.length ? best : null;
  }
  function weight({ sourceCount = 1, ownCount = 1, latestAt }, now = Date.now()) {
    const h = latestAt ? (now - Date.parse(latestAt)) / 36e5 : 99;
    return (ownCount > 0 ? 100 : 0) + sourceCount * 4 + (h <= 3 ? 4 : h <= 6 ? 3 : h <= 12 ? 1 : 0);
  }

  // src/lib/topics.js
  var T = (id, label) => ({ id, label });
  var TOPICS = [
    T("nederland", "Den Haag"),
    T("europa", "Europa"),
    T("vs-politiek", "VS-politiek"),
    T("trump", "Trump"),
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
    T("tech", "Big Tech"),
    T("gadgets", "Gadgets"),
    T("privacy", "Privacy & veiligheid"),
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
    { id: "politiek", label: "Politiek", topics: ["nederland", "europa", "vs-politiek", "trump", "verkiezingen"], cats: [] },
    { id: "binnenland", label: "Binnenland", topics: ["wonen", "zorg", "onderwijs", "misdaad", "migratie", "verkeer"], cats: ["regio"] },
    { id: "wereld", label: "Wereld", topics: ["oekraine", "middenoosten", "azie", "afrika", "latam", "geopolitiek"], cats: [] },
    { id: "economie", label: "Economie", topics: ["economie", "werk", "bedrijven", "energie", "geld"], cats: ["economie"] },
    { id: "tech", label: "Tech", topics: ["ai", "tech", "gadgets", "privacy", "ev", "games"], cats: ["tech", "games"] },
    { id: "wetenschap", label: "Wetenschap", topics: ["klimaat", "gezondheid", "ruimte", "natuur", "brein"], cats: ["wetenschap"] },
    { id: "cultuur", label: "Cultuur", topics: ["muziek", "film", "boeken", "kunst", "media"], cats: ["cultuur"] },
    { id: "sport", label: "Sport", topics: ["voetbal", "f1", "wielrennen", "tennis", "wintersport", "olympisch"], cats: ["sport"] }
  ];
  var INTEREST_OF = Object.fromEntries(INTERESTS.flatMap((i) => i.topics.map((t) => [t, i.id])));
  var topicById = (id) => TOPICS.find((t) => t.id === id);

  // src/lib/affinity.js
  var MIN_EVENTS = 8;

  // shared/editor.mjs
  var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  var sum = (xs) => xs.reduce((s, v) => s + v, 0);
  var byId = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  var FAMILY_OF = Object.fromEntries(INTERESTS.flatMap((f) => f.topics.map((t) => [t, f.id])));
  var FAMILY_LABEL = Object.fromEntries(INTERESTS.map((f) => [f.id, f.label]));
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
    const expl = {};
    for (const f of INTERESTS) {
      if (!interests.includes(f.id)) continue;
      const picked = f.topics.filter((t) => topics.includes(t));
      const sharp = picked.length > 0 && picked.length < f.topics.length;
      for (const t of f.topics) expl[t] = sharp ? picked.includes(t) ? 1 : 0 : W_INHERITED;
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
      origin[t] = r > e ? "geleerd" : "gekozen";
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
    return { topicP, origin, family, sourceP, shareOf, favorites: new Set(favorites), followed, catOf };
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
  function topicHits(item, prof) {
    const ts = item.topics || [];
    const out = ts.filter((t) => prof.topicP[t] !== void 0).map((t) => ({ t, f: FAMILY_OF[t], v: prof.topicP[t] }));
    if (!ts.length) {
      const cat = prof.catOf.get(item.source);
      const fam = cat && INTERESTS.find((f) => f.cats.includes(cat));
      if (fam && prof.family[fam.id]) out.push({ t: `bron:${cat}`, f: fam.id, v: SOURCE_CAT_P * prof.family[fam.id] });
    }
    return out;
  }
  var strongestFirst = (a, b) => b.v - a.v || byId(a.t, b.t);
  function personalParts(items = [], prof, ctx = {}) {
    const parts = {};
    if (!items.length) return parts;
    const hits = items.map((i) => topicHits(i, prof));
    const flat = hits.flat();
    const pos = flat.filter((h) => h.v > 0).sort(strongestFirst);
    if (pos.length) {
      const best = pos[0];
      const cover = hits.filter((hs) => hs.some((h) => h.v > 0)).length / items.length;
      const coverOf = (t) => hits.filter((hs) => hs.some((h) => h.t === t)).length / items.length;
      const label = [...new Map(pos.map((h) => [h.t, h])).values()].map((h) => ({ ...h, c: coverOf(h.t) * h.v })).sort((a, b) => b.c - a.c || strongestFirst(a, b))[0];
      parts.interest = { pts: Math.round(P.INTEREST * best.v * (0.5 + 0.5 * cover)), t: label.t, f: label.f, origin: prof.origin?.[label.t] || "gekozen" };
      const second = pos.find((h) => h.f !== best.f && h.v >= CROSS_MIN);
      if (second && best.v >= CROSS_MIN) parts.cross = { pts: P.CROSS, f: [best.f, second.f] };
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
  var FRONT_SOURCES = 6;
  var DESK_NAMES = { ...DESK_LABEL, tech: "Tech", economie: "Economie", regio: "Regio" };
  var WHY_ORDER = ["followUp", "cross", "interest", "favorite", "mine", "sourceRead"];
  var topicLabel = (t) => topicById(t)?.label || t;
  function whyOf(entry = {}, { parts = {}, sourceCount = 0, desk = entry.desk ?? null, plannedDesk = false, labelOf = topicLabel, sourceName = (s) => s, deskLabel = (d) => DESK_NAMES[d] || d } = {}) {
    if (entry.desk === "extern") return { code: "extern", text: "Buiten je bronnen" };
    if (entry.desk === "bubbel") {
      if (entry.near) return { code: "buur", text: `Naast je bubbel · grenst aan ${FAMILY_LABEL[entry.near] || entry.near}` };
      return { code: "bubbel", text: "Buiten je bubbel · via Google Trends" };
    }
    if (entry.desk === "breed") return { code: "breed", text: `Waar iedereen over schrijft · ${sourceCount} bronnen` };
    if (entry.front) return { code: "groot", text: `Groot nieuws · ${sourceCount} bronnen` };
    const rank = (k) => WHY_ORDER.includes(k) ? WHY_ORDER.indexOf(k) : WHY_ORDER.length;
    const [code, p] = Object.entries(parts).filter(([, x]) => (x.pts || 0) >= MIN_WHY_PTS).sort((a, b) => b[1].pts - a[1].pts || rank(a[0]) - rank(b[0]) || byId(a[0], b[0]))[0] || [];
    if (code === "followUp") return { code, text: `Vervolg op wat je las · ${p.n} nieuwe stukken` };
    if (parts.cross && (code === "interest" || code === "cross")) return { code: "cross", text: `Raakt ${FAMILY_LABEL[parts.cross.f[0]]} én ${FAMILY_LABEL[parts.cross.f[1]]}` };
    if (code === "interest") {
      if (p.t.startsWith("bron:")) return { code: "vak", text: "Uit je vakbronnen" };
      if (p.origin === "geleerd") return { code: "learned", text: `Omdat je vaak over ${labelOf(p.t)} leest` };
      return { code, text: `Omdat je ${labelOf(p.t)} volgt` };
    }
    if (code === "favorite") return { code, text: `Uit je voorkeursbron ${sourceName(p.source)}` };
    if (code === "mine") return { code, text: `${p.n} van je bronnen schrijven erover` };
    if (code === "sourceRead") return { code, text: "Uit een bron die je veel leest" };
    if (sourceCount >= FRONT_SOURCES) return { code: "groot", text: `Groot nieuws · ${sourceCount} bronnen` };
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
    trump: ["vs"],
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
  var DESK_CAP = 3;
  var KERN_MIN = 3;
  var FRONT = 2;
  var FRONT_MIN = 6;
  var FRONT_BIG = 10;
  var FRONT_MAX = 3;
  var PLAN_DESKS = [...KERN, ...OWN_DESKS];
  function deskPlan(prof, seats, front = []) {
    const w = {};
    for (const d of PLAN_DESKS) w[d] = KERN.includes(d) ? 1 : 0;
    const best = {};
    for (const [t, v] of Object.entries(prof?.topicP || {})) {
      if (v <= 0) continue;
      for (const d of TOPIC_DESK[t] || []) best[d] = Math.max(best[d] || 0, v);
    }
    for (const d of PLAN_DESKS) if (best[d]) w[d] += DESK_GAIN * best[d];
    const got = {};
    for (const d of PLAN_DESKS) got[d] = 0;
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
    const weights = {};
    for (const d of PLAN_DESKS) weights[d] = Math.round(w[d] * 100) / 100;
    return { order, weights };
  }
  var OWN_DESK_FAMILY = { tech: "tech", economie: "economie", regio: "binnenland" };
  var OWN_DESK_CAT = { tech: ["tech"], economie: ["economie"], regio: ["regio"] };
  var OWN_DESK_TOPICS = Object.fromEntries(OWN_DESKS.map((d) => [d, new Set(INTERESTS.find((f) => f.id === OWN_DESK_FAMILY[d]).topics)]));
  function servesDesks(items = [], primary = null, prof) {
    const out = new Set(primary ? [primary] : []);
    for (const d of OWN_DESKS) {
      const byTopic = d !== "regio" && items.some((i) => (i.topics || []).some((t) => OWN_DESK_TOPICS[d].has(t)));
      if (byTopic || items.some((i) => OWN_DESK_CAT[d].includes(prof.catOf.get(i.source)))) out.add(d);
    }
    return out;
  }
  function homeDesk(items = [], primary = null, prof) {
    const s = servesDesks(items, null, prof);
    const strength = (d) => Math.max(0, ...items.flatMap((i) => (i.topics || []).filter((t) => (TOPIC_DESK[t] || []).includes(d)).map((t) => prof.topicP[t] || 0)));
    const ranked = OWN_DESKS.filter((d) => s.has(d)).map((d) => ({ d, v: strength(d) })).sort((a, b) => b.v - a.v || OWN_DESKS.indexOf(a.d) - OWN_DESKS.indexOf(b.d));
    if (ranked.length && (ranked[0].v > 0 || !primary)) return ranked[0].d;
    return primary || null;
  }

  // netlify/lib/stories.mjs
  var timeOf = (a) => Date.parse(a.publishedAt) || 0;
  var byRecency = (a, b) => timeOf(b) - timeOf(a);
  var NL_SOURCES = /* @__PURE__ */ new Set(["nrc", "nos", "volkskrant", "tweakers"]);
  var deaccent = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  var norm = (s) => deaccent(String(s || "")).toLowerCase();
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
  function sharedCount(a, b) {
    let n = 0;
    for (const w of a) if (b.has(w)) n++;
    return n;
  }
  var ALIAS = {
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
  var WEAK = new Set(
    "us russia ukraine germany france uk china israel iran nederland europe nato un putin zelensky trump biden harris vance netanyahu musk xi macron starmer merz erdogan modi meloni orban schoof pentagon congress senate senaat congres kremlin whitehouse ice fbi cia nasa who gaza taiwan india japan canada mexico brazil turkije turkey syria syrie venezuela korea northkorea southkorea texas california florida georgia carolina virginia ohio michigan arizona nevada pennsylvania wisconsin washington brussel brussels londen london parijs paris moskou moscow kyiv kiev berlijn berlin seoul busan pyongyang tokio tokyo peking beijing jeruzalem jerusalem teheran tehran amsterdam rotterdam".split(
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
    ["election", /(\w*verkiezing\w*|\belection\w*|\bmidterm\w*|\bstembus|\bstemlokal\w*|\bhead to the polls)\b/, false],
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
  var COMPOUND = [
    [/\b(Noord|North)[- ]Korea\b/g, "Northkorea"],
    [/\b(Zuid|South)[- ]Korea\b/g, "Southkorea"]
  ];
  var joinCompounds = (text) => COMPOUND.reduce((t, [re, to]) => t.replace(re, to), String(text || ""));
  var tokenize = (text) => joinCompounds(text).replace(/\b([A-Z])\.(?=[A-Z]\.)/g, "$1").replace(/\b([A-Z]{2,})\./g, "$1").replace(/[’']s\b/g, "").match(/[\p{L}\p{N}]+/gu) || [];
  var isCap = (w) => /^\p{Lu}\p{Ll}/u.test(w);
  var isAcronym = (w) => /^\p{Lu}{2,6}$/u.test(w);
  var isTitleCase = (title) => {
    const words = tokenize(title).filter((w) => w.length >= 4);
    return words.length >= 3 && words.filter(isCap).length / words.length >= 0.6;
  };
  function nameVocabulary(articles) {
    const vocab = /* @__PURE__ */ new Set();
    const scan = (text) => {
      let sentenceStart = true;
      for (const part of String(text || "").split(/(\s+)/)) {
        if (!part.trim()) continue;
        const words = tokenize(part);
        for (const w of words) {
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
  function signature(article, vocab) {
    const raw = `${article.title}. ${article.text || article.summary || ""}`;
    const strong = /* @__PURE__ */ new Set();
    const weak = /* @__PURE__ */ new Set();
    const known = /* @__PURE__ */ new Set();
    for (const w of tokenize(raw)) {
      if (isCap(w) || isAcronym(w)) {
        const k = ALIAS[norm(w)] || norm(w);
        if (WEAK.has(k)) known.add(k);
      }
      let key = null;
      if (isAcronym(w)) key = norm(w);
      else if (w.length >= 4 && isCap(w) && vocab.has(norm(w))) key = norm(w);
      if (!key) continue;
      key = ALIAS[key] || key;
      if (NOT_A_NAME.has(key)) continue;
      if (WEAK.has(key)) weak.add(key);
      else if (key.length >= 3) strong.add(key);
    }
    const text = norm(raw);
    const concepts = /* @__PURE__ */ new Set();
    let rare = 0;
    for (const [id, re, isRare] of CONCEPTS) {
      if (re.test(text)) {
        concepts.add(id);
        if (isRare) rare++;
      }
    }
    return { words: sigWords(article.title), strong, weak, known, concepts, rareIds: new Set(CONCEPTS.filter(([id, , r]) => r && concepts.has(id)).map(([id]) => id)), t: timeOf(article) };
  }
  var WORD_WINDOW = 48 * 60 * 60 * 1e3;
  var EVENT_WINDOW = 36 * 60 * 60 * 1e3;
  function sameEvent(a, b) {
    const dt = Math.abs(a.t - b.t);
    if (a.strong.size && b.strong.size && !sharedCount(a.strong, b.strong) && !sharedCount(a.weak, b.weak)) return false;
    if (dt <= WORD_WINDOW) {
      const n = sharedCount(a.words, b.words);
      if (n >= 3 && n / Math.min(a.words.size, b.words.size) >= 0.4) return true;
    }
    if (dt > EVENT_WINDOW) return false;
    const strong = sharedCount(a.strong, b.strong);
    const weak = sharedCount(a.weak, b.weak);
    const concepts = sharedCount(a.concepts, b.concepts);
    const rare = sharedCount(a.rareIds, b.rareIds);
    if (strong >= 2 && strong + weak + concepts >= 3) return true;
    if (strong >= 1 && concepts >= 1 && weak + concepts >= 2) return true;
    if (rare >= 2 && concepts >= 3 && weak + strong >= 1) return true;
    if (sharedCount(a.words, b.words) >= 3 && strong + weak >= 1) return true;
    return false;
  }
  var BROAD = /* @__PURE__ */ new Set(["us", "europe", "un", "nato", "uk", "trump", "whitehouse", "congress", "nederland"]);
  var SUBJECT_WINDOW = 12 * 60 * 60 * 1e3;
  function sameSubject(a, b) {
    if (sameEvent(a, b)) return true;
    const dt = Math.abs(a.t - b.t);
    if (dt > EVENT_WINDOW) return false;
    const shared = [...a.known].filter((k) => b.known.has(k));
    const concepts = sharedCount(a.concepts, b.concepts);
    if (!concepts) return false;
    if (shared.length >= 2 || shared.length >= 1 && sharedCount(a.strong, b.strong) >= 1) return true;
    return dt <= SUBJECT_WINDOW && shared.some((k) => !BROAD.has(k));
  }
  function signatures(articles) {
    const vocab = nameVocabulary(articles);
    return new Map(articles.map((a) => [a.id, signature(a, vocab)]));
  }
  var STALE_AFTER = 24 * 60 * 60 * 1e3;
  var isStale = (item, now) => !!now && now - timeOf(item) > STALE_AFTER;
  function leadCandidates(items, mainIds, preferred = null, now = null) {
    const score = (i) => (i.type === "opinie" ? -16 : 0) + (/\bpodcast\b/i.test(i.title || "") || isLive(i) ? -16 : 0) + (isStale(i, now) ? -32 : 0) + (preferred?.has(i.source) ? 12 : 0) + (mainIds.has(i.source) ? 8 : 0) + (NL_SOURCES.has(i.source) ? 4 : 0) + (i.summary ? 2 : 0) + (i.image ? 1 : 0);
    return [...items].sort((a, b) => score(b) - score(a) || byRecency(a, b));
  }
  var LIVE_TITLE = /^\W*live\b|\blive ?blog\b|\b(war|oorlog) (latest|live)\b|\blatest:|\blatest updates\b/i;
  var isLive = (a) => LIVE_TITLE.test(a.title || "") || /\/live(blog)?[-/]|[-/]liveblog/i.test(a.url || "");
  var EDITION_SIZE = 10;
  var MAX_LEADS_PER_SOURCE = 3;
  function previousOf(edition) {
    if (!edition?.entries?.length) return null;
    const stories = edition.entries.filter((e) => e.kind === "story");
    const lead = edition.entries[0];
    return {
      storyIds: new Set(stories.flatMap((e) => [e.id, e.formerId].filter(Boolean))),
      itemIds: /* @__PURE__ */ new Set([...edition.entries.map((e) => e.leadId || e.id), ...stories.flatMap((e) => e.itemIds || []), ...(edition.stories || []).flatMap((st) => st.itemIds || [])]),
      leadIds: /* @__PURE__ */ new Set([lead.leadId || lead.id]),
      leadStoryId: lead.kind === "story" ? lead.id : null,
      at: Date.parse(edition.builtAt) || 0
    };
  }
  var REPEAT_PENALTY = 70;
  var DEVELOPING_PENALTY = 25;
  var REPEAT_LEAD_PENALTY = 30;
  function repeatPenalty(st, items, previous) {
    if (!previous) return 0;
    const seen = previous.storyIds?.has(st.id) || items.some((i) => previous.itemIds?.has(i.id));
    if (!seen) return 0;
    const fresh = items.filter((i) => !previous.itemIds?.has(i.id) && i.publishedAt && Date.parse(i.publishedAt) > previous.at).length;
    const developing = fresh >= 3 && fresh / items.length >= 0.3;
    const wasLead = previous.leadStoryId === st.id || items.some((i) => previous.leadIds?.has(i.id));
    return (developing ? DEVELOPING_PENALTY : REPEAT_PENALTY) + (wasLead ? REPEAT_LEAD_PENALTY : 0);
  }
  var textOrder = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  function selectForReader(stories, pool, { mainIds = /* @__PURE__ */ new Set(), now = Date.now(), size = EDITION_SIZE, previous = null, preferred = null, prof = profileOf(), ctx = {}, plan = true, seed = "" } = {}) {
    const byId2 = new Map(pool.map((i) => [i.id, i]));
    const sig = signatures(pool);
    const fresh = (iso, hours) => iso && now - Date.parse(iso) < hours * 60 * 60 * 1e3;
    const entries = [];
    const placed = [];
    const leadCount = {};
    let prevLead = null;
    const clashes = (ids) => ids.some((id) => sig.has(id) && placed.some((s) => sameSubject(sig.get(id), s)));
    const place = (ids) => {
      for (const id of ids) if (sig.has(id)) placed.push(sig.get(id));
    };
    const pickLead = (items) => {
      const cands2 = leadCandidates(items, mainIds, preferred, now);
      const current = cands2.filter((i) => !isStale(i, now));
      const recent = current.length ? current : cands2;
      const ownOnly = recent.filter((i) => mainIds.has(i.source));
      const from = ownOnly.length ? ownOnly : recent;
      return from.find((i) => i.source !== prevLead && (leadCount[i.source] || 0) < MAX_LEADS_PER_SOURCE) || from.find((i) => (leadCount[i.source] || 0) < MAX_LEADS_PER_SOURCE) || from[0];
    };
    const storyDesk = (st, primary) => ctx.storyDesk?.has(st.id) ? ctx.storyDesk.get(st.id) : st.desk !== void 0 ? st.desk : primary;
    const cands = [];
    for (const st of stories) {
      if (!fresh(st.latestAt, 24)) continue;
      const items = st.itemIds.map((id) => byId2.get(id)).filter(Boolean);
      if (!items.length) continue;
      const primary = primaryDesk(items.map((it) => desksOf(it)));
      const mine = new Set(items.map((i) => i.source)).size;
      const belang = weight({ sourceCount: st.sourceCount, ownCount: mine, latestAt: st.latestAt }, now) - repeatPenalty(st, items, previous);
      const parts = personalParts(items, prof, ctx);
      cands.push({ kind: "story", id: st.id, st, items, ids: st.itemIds, primary, home: homeDesk(items, storyDesk(st, primary) ?? primary, prof), belang, parts, sc: st.sourceCount, w: belang + sumParts(parts) + jitter(seed, st.id) });
    }
    for (const it of pool) {
      if (!mainIds.has(it.source) || it.kind !== "article" || it.type === "opinie" || it.storyId || isLive(it)) continue;
      if (!fresh(it.publishedAt, ctx.tempo?.get(it.source) || TEMPO_MIN_H) || !(it.summary || it.image)) continue;
      if (previous?.itemIds?.has(it.id) || ctx.readIds?.has(it.id)) continue;
      const primary = primaryDesk([desksOf(it)]);
      const belang = weight({ sourceCount: 1, ownCount: 1, latestAt: it.publishedAt }, now) - 2;
      const parts = personalParts([it], prof, ctx);
      cands.push({ kind: "item", id: it.id, it, items: [it], ids: [it.id], primary, home: homeDesk([it], primary, prof), belang, parts, sc: 1, w: belang + sumParts(parts) + jitter(seed, it.id) });
    }
    const heaviest = (a, b) => b.w - a.w || textOrder(a.id, b.id) || textOrder(a.kind, b.kind);
    cands.sort(heaviest);
    const used = /* @__PURE__ */ new Set();
    const take = (c, desk, extra = {}) => {
      if (used.has(c) || clashes(c.ids)) return false;
      used.add(c);
      place(c.ids);
      const base = { desk, w: c.w, parts: c.parts, sourceCount: c.sc, ...extra };
      if (c.kind === "story") {
        const lead = pickLead(c.items);
        leadCount[lead.source] = (leadCount[lead.source] || 0) + 1;
        prevLead = lead.source;
        entries.push({ kind: "story", id: c.st.id, leadId: lead.id, ...base });
      } else entries.push({ kind: "item", id: c.it.id, ...base });
      return true;
    };
    let deskOrder = [];
    if (plan) {
      const frontOf = (c) => c.belang + (c.parts.less?.pts || 0);
      const front = cands.filter((c) => c.kind === "story" && c.sc >= FRONT_MIN && !c.parts.seen).sort((a, b) => frontOf(b) - frontOf(a) || heaviest(a, b));
      for (const c of front) {
        if (entries.length >= Math.min(FRONT_MAX, size) || entries.length >= FRONT && c.sc < FRONT_BIG) break;
        take(c, storyDesk(c.st, c.primary), { front: true });
      }
      deskOrder = deskPlan(prof, size - entries.length, entries.map((e) => e.desk)).order;
      for (const d of deskOrder) {
        if (entries.length >= size) break;
        cands.some((c) => c.home === d && !c.parts.seen && take(c, d, { planned: true }));
      }
    }
    for (const c of cands) {
      if (entries.length >= size) break;
      if (c.parts.seen) continue;
      take(c, plan ? c.home : null);
    }
    entries.sort((a, b) => b.w - a.w || textOrder(a.id, b.id));
    return Object.assign(entries, { deskOrder });
  }

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
  function storiesForReader(stories = [], items = [], followed = /* @__PURE__ */ new Set(), all = items) {
    const ownSource = /* @__PURE__ */ new Map();
    for (const i of items) if (followed.has(i.source)) ownSource.set(i.id, i.source);
    let byId2 = null;
    const deskOf = (st) => {
      byId2 ||= new Map(all.map((i) => [i.id, i]));
      return primaryDesk(st.itemIds.map((id) => byId2.get(id)).filter(Boolean).map((i) => desksOf(i)));
    };
    return stories.map((st) => ({
      ...st,
      ownCount: new Set(st.itemIds.map((id) => ownSource.get(id)).filter(Boolean)).size,
      desk: st.desk !== void 0 ? st.desk : deskOf(st)
    }));
  }
  function composePersonal({ global, stories = [], items = [], sources = [], followed = /* @__PURE__ */ new Set(), interests = [], topics = [], now = Date.parse(global?.builtAt) || Date.now(), builtAt = new Date(now).toISOString(), previous = null, affinity = null, favorites = [], taste = null, readIds = /* @__PURE__ */ new Set() }) {
    if (!global?.entries?.length) return null;
    const catOf = new Map(sources.map((s) => [s.id, s.cat]));
    const kindOf = (i) => {
      const byTopic = (i.topics || []).map((t) => TOPIC_KIND[t]).find(Boolean);
      if (byTopic) return byTopic;
      const cat = catOf.get(i.source);
      return !catOf.size || NEWS_CATS.has(cat) ? "nieuws" : cat;
    };
    const pool = items.filter((i) => i.kind === "article" && followed.has(i.source));
    const prof = profileOf({ interests, topics, affinity, taste, favorites, followed, sources, supply: supplyOf(pool) });
    const tempo = tempoWindows(items.filter((i) => followed.has(i.source)));
    const mineStories = storiesForReader(stories, items, followed, [...items, ...global.items || []]);
    const storyDesk = new Map(mineStories.map((st) => [st.id, st.desk]));
    const ctx = { readIds, tempo, storyDesk };
    const seed = `${editionBasis([...followed], interests, topics, favorites)}|${global.id}`;
    const tech = INTERESTS.find((f) => f.id === "tech")?.topics || [];
    const gamesSharp = interests.includes("tech") && topics.includes("games") && !tech.every((t) => topics.includes(t));
    const gamesOk = (prof.topicP.games || 0) >= EXTRA_MIN && (gamesSharp || prof.origin.games === "geleerd");
    const extraKinds = /* @__PURE__ */ new Set([...(prof.family.sport || 0) >= EXTRA_MIN ? ["sport"] : [], ...(prof.family.cultuur || 0) >= EXTRA_MIN ? ["cultuur"] : [], ...gamesOk ? ["games"] : []]);
    const newsPool = pool.filter((i) => kindOf(i) === "nieuws");
    const extraPool = pool.filter((i) => extraKinds.has(kindOf(i)));
    let bubbleEntry = global.entries.find((e) => e.desk === "bubbel") || null;
    const storyById = new Map(stories.map((s) => [s.id, s]));
    const ownIds = new Set(items.filter((i) => followed.has(i.source)).map((i) => i.id));
    const covered = (w) => ownIds.has(w.item.id) || (storyById.get(w.storyId)?.itemIds || []).some((id) => ownIds.has(id));
    const itemAny = new Map([...items, ...global.items || []].map((i) => [i.id, i]));
    const storyOfItem = new Map(stories.flatMap((s) => s.itemIds.map((id) => [id, s.id])));
    const readOf = (id, sid) => {
      if (!readIds.size || !id) return {};
      const st = storyById.get(sid || storyOfItem.get(id) || itemAny.get(id)?.storyId);
      const ids = [.../* @__PURE__ */ new Set([id, ...st?.itemIds || []])];
      if (!ids.some((x) => readIds.has(x))) return {};
      const { seen, followUp } = personalParts(ids.map((x) => itemAny.get(x)).filter(Boolean), prof, { readIds });
      return followUp ? { followUp } : { seen: seen || { pts: 0 } };
    };
    const unread = (id, sid) => !readOf(id, sid).seen;
    const withFollowUp = (e, id, sid) => {
      const { followUp } = readOf(id, sid);
      return followUp ? { ...e, parts: { ...e.parts || {}, followUp } } : e;
    };
    const wideAny = (global.wide || []).some((w) => w?.item?.id && !covered(w) && unread(w.item.id, w.storyId));
    const size = EDITION_SIZE - (bubbleEntry ? 1 : 0) - (wideAny ? 1 : 0);
    const preferred = new Set(favorites.filter((id) => followed.has(id)));
    const opts = { mainIds: followed, now, previous, preferred, prof, ctx, seed };
    const extra = extraPool.length ? selectForReader(mineStories, extraPool, { ...opts, size: EXTRA_MAX, plan: false }).map((e) => ({ ...e, desk: null })) : [];
    const leadCat = (e) => catOf.get(pool.find((i) => i.id === (e.leadId || e.id))?.source);
    const sel = selectForReader(mineStories, newsPool, { ...opts, size: size - extra.length });
    const news = sel.map((e) => !e.planned && !e.front && SPECIALIST.has(leadCat(e)) ? { ...e, desk: leadCat(e) } : e);
    const own = [...news, ...extra];
    const membersOf = (e) => /* @__PURE__ */ new Set([e.leadId || e.id, ...e.kind === "story" ? storyById.get(e.id)?.itemIds || e.itemIds || [] : []]);
    const taken = new Set(own.flatMap((e) => [...membersOf(e)]));
    const fitOf = (w) => Math.max(0, ...(w.topics || []).map((t) => Math.max(prof.topicP[t] || 0, prof.shareOf[t] || 0)));
    const free = (w) => w?.item?.id && !taken.has(w.item.id) && !(storyById.get(w.storyId)?.itemIds || []).some((id) => taken.has(id)) && !covered(w) && unread(w.item.id, w.storyId);
    const wide = (global.wide || []).find((w) => free(w) && outsideProfile(w.topics, prof)) || (global.wide || []).filter(free).sort((a, b) => fitOf(a) - fitOf(b) || b.sourceCount - a.sourceCount || byText(a.storyId, b.storyId))[0];
    const wideEntry = wide ? withFollowUp({ kind: "story", id: wide.storyId, leadId: wide.item.id, desk: WIDE, sourceCount: wide.sourceCount }, wide.item.id, wide.storyId) : null;
    if (wideEntry) for (const id of [wide.item.id, ...storyById.get(wide.storyId)?.itemIds || []]) taken.add(id);
    const globalItems = new Map((global.items || []).map((i) => [i.id, i]));
    const noFavorites = { ...prof, favorites: /* @__PURE__ */ new Set() };
    const fillTo = size - extra.length + (wideAny && !wideEntry ? 1 : 0);
    const fillCands = global.entries.map((g, idx) => ({ g, idx, score: sumParts(personalParts([globalItems.get(g.leadId || g.id)].filter(Boolean), noFavorites, {})) - 2 * idx })).filter((x) => x.g !== bubbleEntry && unread(x.g.leadId || x.g.id, x.g.kind === "story" ? x.g.id : null)).sort((a, b) => b.score - a.score || a.idx - b.idx);
    const fill = [];
    for (const { g } of fillCands) {
      if (news.length + fill.length >= fillTo) break;
      const m = membersOf(g);
      if ([...m].some((id) => taken.has(id))) continue;
      for (const id of m) taken.add(id);
      fill.push(withFollowUp({ ...g, desk: EXTERN, fromDesk: g.desk || null }, g.leadId || g.id, g.kind === "story" ? g.id : null));
    }
    const sigAll = signatures([...itemAny.values()].filter((i) => i.kind !== "post"));
    const clashes = (id) => taken.has(id) || sigAll.has(id) && [...taken].some((x) => sigAll.has(x) && sameEvent(sigAll.get(id), sigAll.get(x)));
    const topicsOfStory = (sid, id) => [...new Set((storyById.get(sid)?.itemIds || [id]).flatMap((x) => itemAny.get(x)?.topics || []))];
    let nearItem = null;
    if (bubbleEntry) {
      const okB = (b) => itemAny.has(b.id) && !clashes(b.id) && unread(b.id, b.storyId) && outsideProfile(topicsOfStory(b.storyId, b.id), prof);
      const first = (global.bubble || []).find((b) => b.id === bubbleEntry.id) || { id: bubbleEntry.id };
      const alt = [first, ...global.bubble || []].find(okB);
      if (alt) {
        if (alt.id !== bubbleEntry.id) bubbleEntry = { kind: "item", id: alt.id, desk: "bubbel", terms: alt.terms };
        bubbleEntry = withFollowUp(bubbleEntry, alt.id, alt.storyId);
      } else {
        const home = strongestFamily(prof);
        const next = new Set(NEIGHBOURS[home] || []);
        const recent = stories.filter((st) => st.sourceCount >= NEAR_MIN_SOURCES && now - Date.parse(st.latestAt) < 24 * 36e5).sort((a, b) => b.sourceCount - a.sourceCount || byText(a.id, b.id)).map((st) => ({ storyId: st.id, sourceCount: st.sourceCount, topics: topicsOfStory(st.id), item: itemAny.get(st.leadId) || st.itemIds.map((x) => itemAny.get(x)).find(Boolean) }));
        const fits = (w) => w?.item?.id && !clashes(w.item.id) && !(storyById.get(w.storyId)?.itemIds || []).some((x) => taken.has(x)) && unread(w.item.id, w.storyId) && outsideProfile(w.topics || [], prof) && (w.topics || []).some((t) => next.has(FAMILY_OF[t]));
        const pick = [...global.near || [], ...recent].find(fits);
        bubbleEntry = pick ? withFollowUp({ kind: "story", id: pick.storyId, leadId: pick.item.id, desk: "bubbel", near: home }, pick.item.id, pick.storyId) : null;
        if (pick) {
          nearItem = pick.item;
          for (const id of [pick.item.id, ...storyById.get(pick.storyId)?.itemIds || []]) taken.add(id);
        }
      }
    }
    const entries = [...news, ...fill, ...extra];
    if (bubbleEntry && !entries.some((e) => (e.leadId || e.id) === (bubbleEntry.leadId || bubbleEntry.id))) entries.splice(Math.min(5, entries.length), 0, bubbleEntry);
    if (wideEntry) entries.splice(Math.min(6, entries.length), 0, wideEntry);
    const srcName = new Map(sources.map((s) => [s.id, s.name]));
    const out = entries.map((e) => {
      const why = whyOf(e, { parts: e.parts || {}, sourceCount: e.sourceCount || storyById.get(e.id)?.sourceCount || 0, desk: e.desk, plannedDesk: !!e.planned, sourceName: (s) => srcName.get(s) || s });
      const { w, parts, planned, front, ...rest } = e;
      return { ...rest, why, _parts: parts || {} };
    });
    const poolById = new Map(pool.map((i) => [i.id, i]));
    const wideById = new Map([...(global.wide || []).map((w) => w?.item).filter(Boolean), ...wide ? [wide.item] : [], ...nearItem ? [nearItem] : []].map((i) => [i.id, i]));
    const itemOf = (id) => poolById.get(id) || wideById.get(id) || globalItems.get(id) || itemAny.get(id);
    const shown = [...new Set(out.map((e) => e.leadId || e.id))];
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
      items: shown.map(itemOf).filter(Boolean),
      bubble: global.bubble || [],
      brief: null,
      _plan: sel.deskOrder
    };
  }
  function withoutDebug(edition) {
    if (!edition) return edition;
    const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith("_")));
    return { ...strip(edition), entries: (edition.entries || []).map(strip) };
  }
  function editionBasis(followed = [], interests = [], topics = [], favorites = []) {
    const parts = [[...followed].sort().join(","), [...interests].sort().join(","), [...topics].sort().join(",")];
    if (favorites.length) parts.push([...favorites].sort().join(","));
    const text = parts.join("|");
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = (h * 33 ^ text.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  // src/lib/editionCore.js
  var CORE_VERSION = 1;
  var HISTORY_SIZE = 3;
  var asSet = (v) => v instanceof Set ? v : new Set(Array.isArray(v) ? v : []);
  function keysOfEntries(edition) {
    const out = /* @__PURE__ */ new Map();
    for (const e of [...edition.entries || [], ...edition.stories || []]) {
      if (!Array.isArray(e.keys) || !e.keys.length) continue;
      for (const id of [e.id, e.formerId, ...e.formerIds || []].filter(Boolean)) out.set(id, /* @__PURE__ */ new Set([...out.get(id) || [], ...e.keys]));
    }
    return out;
  }
  function previousOf2(edition) {
    const p = previousOf(edition);
    if (!p) return null;
    const byId2 = new Map((edition.items || []).map((i) => [i.id, i]));
    const shown = edition.entries.map((e) => byId2.get(e.leadId || e.id)).filter((i) => i?.title);
    return {
      ...p,
      id: typeof edition.id === "string" ? edition.id : "",
      keysOf: p.keysOf instanceof Map ? p.keysOf : keysOfEntries(edition),
      titles: p.titles || new Set(edition.entries.map((e) => e.title || byId2.get(e.leadId || e.id)?.title).filter(Boolean)),
      shown: p.shown || shown.map((i) => ({ id: i.id, title: i.title, summary: i.summary || "", publishedAt: i.publishedAt || edition.builtAt }))
    };
  }
  var isHistoryRow = (x) => Array.isArray(x?.storyIds);
  var byTime = (a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  function historyOf(edition) {
    if (!edition) return null;
    if (isHistoryRow(edition)) return edition;
    const p = previousOf2(edition);
    if (!p) return null;
    return {
      id: edition.id,
      builtAt: edition.builtAt,
      storyIds: [...p.storyIds],
      itemIds: [...p.itemIds],
      leadIds: [...p.leadIds],
      leadStoryId: p.leadStoryId ?? null,
      titles: [...p.titles],
      shown: p.shown,
      keys: Object.fromEntries([...p.keysOf || []].map(([id, ks]) => [id, [...ks]]))
    };
  }
  function recentEditions(list = [], n = HISTORY_SIZE) {
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const e of Array.isArray(list) ? list : []) {
      if (!e || typeof e.id !== "string" || !e.id || seen.has(e.id) || !(Date.parse(e.builtAt) > 0)) continue;
      seen.add(e.id);
      out.push(e);
    }
    out.sort((a, b) => Date.parse(b.builtAt) - Date.parse(a.builtAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return out.slice(0, n);
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
  function nextHistory(prior = [], edition) {
    const rows = (Array.isArray(prior) ? prior : []).filter((x) => x && x.id !== edition?.id);
    return recentEditions(rows).map(historyOf).filter(Boolean);
  }
  function previousOne(x) {
    if (!x || typeof x !== "object") return null;
    if (isHistoryRow(x)) {
      const keysOf = /* @__PURE__ */ new Map();
      if (x.keysOf instanceof Map) for (const [id, ks] of x.keysOf) keysOf.set(id, new Set(ks));
      else for (const [id, ks] of Object.entries(x.keys && typeof x.keys === "object" ? x.keys : {})) if (Array.isArray(ks) && ks.length) keysOf.set(id, new Set(ks));
      return {
        id: typeof x.id === "string" ? x.id : "",
        keysOf,
        storyIds: new Set(x.storyIds),
        itemIds: new Set(Array.isArray(x.itemIds) ? x.itemIds : []),
        leadIds: new Set(Array.isArray(x.leadIds) ? x.leadIds : []),
        leadStoryId: typeof x.leadStoryId === "string" ? x.leadStoryId : null,
        at: Date.parse(x.builtAt) || Number(x.at) || 0,
        titles: new Set(Array.isArray(x.titles) ? x.titles : []),
        shown: Array.isArray(x.shown) ? x.shown.filter((s) => s && typeof s.title === "string") : []
      };
    }
    return previousOf2(x);
  }
  function mergePrevious(list) {
    const ps = (Array.isArray(list) ? list : [list]).map(previousOne).filter(Boolean);
    if (!ps.length) return null;
    ps.sort(byTime);
    const u = (k) => new Set(ps.flatMap((p) => [...p[k] || []]));
    const atOf = /* @__PURE__ */ new Map();
    const keysOf = /* @__PURE__ */ new Map();
    for (const p of ps) {
      for (const id of p.storyIds) atOf.set(id, Math.max(atOf.get(id) || 0, p.at));
      for (const [id, ks] of p.keysOf || []) keysOf.set(id, /* @__PURE__ */ new Set([...keysOf.get(id) || [], ...ks]));
    }
    const last = ps[ps.length - 1];
    return {
      keysOf,
      storyIds: u("storyIds"),
      itemIds: u("itemIds"),
      leadIds: u("leadIds"),
      leadStoryId: last.leadStoryId ?? null,
      leadStoryIds: new Set(ps.map((p) => p.leadStoryId).filter(Boolean)),
      at: last.at,
      atOf,
      titles: u("titles"),
      shown: ps.flatMap((p) => p.shown || [])
    };
  }
  function previousFrom(v) {
    if (!v) return null;
    if (Array.isArray(v)) return mergePrevious(v);
    if (Array.isArray(v.storyIds) || v.entries) return mergePrevious([v]);
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
      affinity: input.affinity || null,
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
      return { ...e, itemIds, title };
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
      supply: supplyOf(input.items || [], followed)
    });
    return profileSummary(prof);
  }
  function profileSummaryJSON(jsonIn) {
    return JSON.stringify(profileSummaryOf(typeof jsonIn === "string" ? JSON.parse(jsonIn) : jsonIn));
  }
  return __toCommonJS(editionCore_exports);
})();
