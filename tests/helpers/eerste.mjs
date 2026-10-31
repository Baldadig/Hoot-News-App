// De eerste Editie en Binnenland is Nederland (feedback 31 oktober), voor npm test (tests/eerste.test.mjs)
// en de meetlat (meting/acceptatie.mjs laadt dit bestand uit HOOT_DIR):
//   eerste Editie: zeven nieuwe lezers, alleen wat Welkom zet (interesses, de voorgestelde bronnen), geen
//                  leesgeschiedenis. De vriendin (Binnenland, Cultuur, Wetenschap) kreeg het Poolse hof,
//                  de G20 en Oekraïne, en weinig Nederlands. Gemeten per plek: Nederlands, buitenlands of
//                  overig (aan de berichten), op de voorpagina of niet, en of er een gekozen reden was.
//   binnenland   : berichten en plekken onder Binnenland die aantoonbaar niet over Nederland gaan (doel 0),
//                  plus een steekproef uit álle bronnen om met de hand na te kijken. De maat is niet de
//                  regel: een Nederlandse bron telt hier nooit als bewijs, en een eigen lijst buitenlandse
//                  namen (Apple, Google, Anthropic...) en Engelse tekst staan los van desks.mjs.
import { composePersonal } from '../../src/lib/personal.js'
import { resolveTopics, suggestSources } from '../../src/lib/topics.js'
import { DEFAULT_PREFS } from '../../src/lib/prefs.js'
import { applyWelcome } from '../../src/lib/welcome.js'
import { mutedSet } from '../../src/lib/sourcesel.js'
import { buildStories, selectEdition } from '../../netlify/lib/stories.mjs'
import { MAIN_IDS } from '../../netlify/lib/sources.mjs'
import { desksOf, placeSignals, storyForeignOf, VL_HOME } from '../../netlify/lib/desks.mjs'
import { FRONT_SOURCES } from '../../shared/editor.mjs'

export const FIRST = [
  { id: 'vriendin', interests: ['binnenland', 'cultuur', 'wetenschap'] },
  { id: 'bi-cu', interests: ['binnenland', 'cultuur'] },
  { id: 'bi-sp', interests: ['binnenland', 'sport'] },
  { id: 'bi', interests: ['binnenland'] },
  { id: 'we-te', interests: ['wereld', 'tech'] },
  { id: 'bi-po-ec', interests: ['binnenland', 'politiek', 'economie'] },
  { id: 'cu-wt', interests: ['cultuur', 'wetenschap'] },
]

// Wat Welkom zet: de interesses (zonder "Wat precies?"), de voorgestelde bronnen, verder niets.
export function firstSetup(p, sources) {
  const pickable = sources.filter((s) => s.followed !== false && s.kind !== 'sociaal')
  const topics = resolveTopics(p.interests, [])
  const prefs = applyWelcome({ ...DEFAULT_PREFS, onboarded: false }, { interests: p.interests, topics, sources: suggestSources(pickable, p.interests, topics), all: pickable })
  const off = mutedSet(prefs, sources)
  return { followed: new Set(sources.filter((s) => s.kind !== 'sociaal' && !off.has(s.id)).map((s) => s.id)), interests: prefs.interests, topics: prefs.topics, favorites: [], affinity: null, taste: { topics: {}, sources: {} }, readIds: new Set() }
}

const FOREIGN = new Set(['oekraine', 'middenoosten', 'vs', 'buitenland'])
const FIXED = new Set(['bubbel', 'breed'])
const dutchSource = (s) => !!s && s.lang === 'nl' && !VL_HOME.has(s.id)
// Nederlands (NL), buitenlands (INT) of overig (OV), aan de berichten van een plek: buitenlands is een
// bericht met een buitenlandse rubriek, Nederlands een Nederlandstalig bericht (niet Vlaams) zonder.
export function geoOfMembers(members, src) {
  let f = 0, n = 0, o = 0
  for (const i of members) {
    if ([...desksOf(i)].some((d) => FOREIGN.has(d))) f++
    else if (dutchSource(src.get(i.source))) n++
    else o++
  }
  const tot = f + n + o || 1
  if (f * 2 >= tot || (f >= n && f > 0 && f >= o)) return 'INT'
  if (n * 2 >= tot || n > o) return 'NL'
  return 'OV'
}

function contextOf(data) {
  const itemById = new Map()
  for (const i of [...(data.edition?.items || []), ...(data.edition?.wide || []).map((w) => w?.item).filter(Boolean), ...data.items]) itemById.set(i.id, i)
  const storyById = new Map(data.stories.map((s) => [s.id, s]))
  const storyOfItem = new Map(data.stories.flatMap((s) => s.itemIds.map((id) => [id, s])))
  const membersOf = (e) => {
    const st = e.kind === 'story' ? storyById.get(e.id) : null
    const ids = st ? st.itemIds : e.itemIds?.length ? e.itemIds : [e.leadId || e.id]
    return ids.map((id) => itemById.get(id)).filter(Boolean)
  }
  return { itemById, storyById, storyOfItem, membersOf }
}

// De eerste Editie van één nieuwe lezer, per plek beschreven. `compose`: een andere samensteller (de
// meting van vóór de wijziging), met dezelfde indeling in Nederlands en buitenlands.
export function firstEdition(data, p, compose = composePersonal) {
  const src = new Map(data.sources.map((s) => [s.id, s]))
  const ctx = contextOf(data)
  const setup = firstSetup(p, data.sources)
  const ed = compose({ global: data.edition, stories: data.stories, items: data.items, sources: data.sources, now: Date.parse(data.edition.builtAt), builtAt: data.edition.builtAt, previous: null, ...setup })
  return (ed?.entries || []).map((e) => {
    const m = ctx.membersOf(e)
    const geo = geoOfMembers(m, src)
    const it = e._parts?.interest
    return {
      geo,
      nlNews: m.some((i) => ['nl', 'regio'].includes(src.get(i.source)?.cat)),
      fixed: FIXED.has(e.desk),
      front: e._front !== undefined ? !!e._front : e.why?.code === 'groot', // een samensteller van vóór _front: het waarom
      // Een gekozen reden: een interessepunt dat telt; een Binnenland-reden bij een buitenlandse plek telt niet.
      real: !!it && it.pts >= 5 && !(it.f === 'binnenland' && geo !== 'NL'),
      falseBi: it?.f === 'binnenland' && geo !== 'NL',
      why: e.why?.code,
      whyText: e.why?.text || '',
      // "Groot nieuws" belooft een groot verhaal: onder FRONT_SOURCES bronnen is het label uitgehold.
      grootKlein: e.why?.code === 'groot' && (e.sourceCount || ctx.storyById.get(e.id)?.sourceCount || 0) < FRONT_SOURCES,
      title: ctx.itemById.get(e.leadId || e.id)?.title || '',
    }
  })
}

export function measureFirst(data, personas = FIRST, compose = composePersonal) {
  return personas.map((p) => {
    const es = firstEdition(data, p, compose)
    const bi = p.interests.includes('binnenland')
    return {
      id: p.id,
      binnenland: bi ? es.filter((x) => !x.fixed && x.geo === 'NL' && x.nlNews).length : null,
      intOngekozen: es.filter((x) => !x.fixed && !x.front && x.geo === 'INT' && !x.real).length,
      voorpaginaNl: es.filter((x) => x.front && x.geo === 'NL').length,
      voorpaginaInt: es.filter((x) => x.front && x.geo === 'INT').length,
      valsBinnenland: es.filter((x) => x.falseBi).length,
      nl: es.filter((x) => x.geo === 'NL').length,
      int: es.filter((x) => x.geo === 'INT').length,
      plekken: es.length,
      passend: es.filter((x) => !x.fixed && (x.real || (bi && x.geo === 'NL' && x.nlNews))).length,
      grootKlein: es.filter((x) => x.grootKlein).length,
      entries: es,
    }
  })
}

// Harde drempels (min of max over de zeven lezers) en doelen.
export const DREMPELS_EERSTE = [
  { key: 'binnenlandMin', label: 'eerste Editie, lezer met Binnenland: Nederlandse plekken (kleinste)', min: 3, hard: true },
  { key: 'intOngekozenMax', label: 'eerste Editie: buitenland zonder gekozen reden, buiten voorpagina en vaste plekken (grootste)', max: 2, hard: true },
  { key: 'voorpaginaNlMin', label: 'eerste Editie: Nederlandse verhalen op de voorpagina (kleinste)', min: 1, hard: true },
  { key: 'voorpaginaIntMax', label: 'eerste Editie: buitenlandse verhalen op de voorpagina (grootste)', max: 1, hard: true },
  { key: 'grootKlein', label: 'eerste Editie: "Groot nieuws" bij minder dan 6 bronnen (totaal)', max: 0, hard: true },
  { key: 'valsBinnenland', label: 'eerste Editie: buitenlandse plek met Binnenland als reden (totaal)', max: 0, hard: true },
  { key: 'passendMin', label: 'eerste Editie: plekken die bij de keuze passen (kleinste)', min: 4, hard: true },
  { key: 'passendMin', label: 'eerste Editie: plekken die bij de keuze passen (streven)', min: 5, hard: false },
  { key: 'nlGem', label: 'eerste Editie, lezer met Binnenland: Nederlandse plekken (gem., streven)', min: 5, hard: false },
]
export function verdictFirst(rows) {
  const bi = rows.filter((r) => r.binnenland !== null)
  return {
    binnenlandMin: Math.min(...bi.map((r) => r.binnenland)),
    intOngekozenMax: Math.max(...rows.map((r) => r.intOngekozen)),
    voorpaginaNlMin: Math.min(...rows.map((r) => r.voorpaginaNl)),
    voorpaginaIntMax: Math.max(...rows.map((r) => r.voorpaginaInt)),
    valsBinnenland: rows.reduce((s, r) => s + r.valsBinnenland, 0),
    passendMin: Math.min(...rows.map((r) => r.passend)),
    grootKlein: rows.reduce((s, r) => s + r.grootKlein, 0),
    nlGem: bi.reduce((s, r) => s + r.nl, 0) / (bi.length || 1),
  }
}

// ---- Binnenland is Nederland ----
// Fout: een Binnenland-label bij een bericht dat aantoonbaar niet over Nederland gaat. Zonder sterk
// Nederlands bezit (een plaats, instelling, partij of persoon die alleen in Nederland bestaat) is dat:
//  - een buitenlandse plek, land of naam in kop of intro, of een verhaal van vooral buitenlandse bronnen;
//  - een buitenlands bedrijf, merk of markt uit FOREIGN_NAMES (een eigen lijst van de maat, niet van de
//    regel in desks.mjs: zo ziet de maat wat de regel mist, zoals Apple, Google en Anthropic), tenzij het
//    bericht een Nederlands thema heeft (politie, zorg, wonen);
//  - Engelse tekst (een Nederlands stuk is Nederlandstalig).
// Een Nederlandse bron telt nooit als bewijs (dat deed de vorige maat, en dan is 0 altijd de uitkomst).
const FOREIGN_NAMES = /(?<![\p{L}\p{N}])(apple|iphone|nvidia|google|alphabet|anthropic|openai|chatgpt|microsoft|meta|facebook|instagram|whatsapp|amazon|intel|tesla|netflix|spotify|samsung|tiktok|bytedance|x\.com|youtube|uber|airbnb|disney|warner|paramount|lufthansa|boeing|wall street|nasdaq|dow jones|s&p 500|silicon valley|hollywood|pangram|call of duty|nintendo|sony|playstation|xbox)(?![\p{L}\p{N}])/iu
// Woorden die alleen Engels zijn (niet "is", "of" of "over", die ook Nederlands zijn).
const ENGLISH = /(?<![\p{L}])(the|and|with|from|after|says|said|into|will|would|their|been|which)(?![\p{L}])/giu
const english = (t) => (t.match(ENGLISH) || []).length >= 2
// Een Nederlands thema (politie, zorg, wonen...) maakt een merknaam bijzaak: de politie die in Nederland
// zoekt naar Google Pixel-telefoons is Binnenland.
const NL_THEMES = new Set(['nederland', 'wonen', 'zorg', 'onderwijs', 'misdaad', 'migratie', 'verkeer'])
const textOf = (i) => `${i.title || ''} ${i.summary || ''}`
function notDutch(i, storyForeign = false) {
  if (placeSignals(i).nl) return null
  if (placeSignals(i).foreign || [...desksOf(i)].some((d) => FOREIGN.has(d))) return 'buitenlandse plek'
  if (storyForeign) return 'verhaal van vooral buitenlandse bronnen'
  if (FOREIGN_NAMES.test(textOf(i)) && !(i.topics || []).some((t) => NL_THEMES.has(t))) return 'buitenlandse naam'
  if (english(textOf(i))) return 'Engelse tekst'
  return null
}
const hashOf = (s) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return h
}
export function measureBinnenland(data, { sample = 25 } = {}) {
  const arts = [...new Map([...data.items, ...(data.edition?.items || [])].filter((i) => i.kind === 'article').map((i) => [i.id, i])).values()]
  const byId = new Map(arts.map((i) => [i.id, i]))
  const storyOf = new Map(data.stories.flatMap((s) => s.itemIds.map((id) => [id, s])))
  const itemsOf = (st) => st.itemIds.map((id) => byId.get(id)).filter(Boolean)
  const foreignOf = (i) => {
    const st = storyOf.get(i.id)
    const its = st ? itemsOf(st) : [i]
    return its.length > 1 && storyForeignOf(its)
  }
  const bin = arts.filter((i) => desksOf(i, { storyForeign: foreignOf(i) }).has('binnenland'))
  const bad = bin.map((i) => ({ ...i, reden: notDutch(i, foreignOf(i)) })).filter((i) => i.reden)
  // De algemene Editie, opnieuw samengesteld (buildStories + selectEdition met de basisbronnen): een
  // Binnenland-plek is fout als de meerderheid van zijn berichten aantoonbaar niet Nederlands is.
  const stories = buildStories(arts, {}, { mainIds: MAIN_IDS })
  const now = Date.parse(data.meta?.updatedAt || data.edition.builtAt)
  const stById = new Map(stories.map((s) => [s.id, s]))
  const general = selectEdition(stories, arts, { mainIds: MAIN_IDS, now }).filter((e) => e.desk === 'binnenland')
  const generalBad = general.filter((e) => {
    const its = e.kind === 'story' ? itemsOf(stById.get(e.id)) : [byId.get(e.id)].filter(Boolean)
    const sf = its.length > 1 && storyForeignOf(its)
    return its.filter((i) => notDutch(i, sf)).length * 2 > its.length
  })
  // Steekproef uit alle bronnen (ook NOS, NRC en de Volkskrant), in een vaste maar willekeurige volgorde.
  const seen = new Set()
  const fresh = bin
    .slice()
    .sort((a, b) => hashOf(a.id) - hashOf(b.id) || (a.id < b.id ? -1 : 1))
    .filter((i) => i.title && !seen.has(i.title) && seen.add(i.title)) // één keer per kop (regionale kranten delen stukken)
  return { berichten: bin.length, zonderNl: bad.length, aandeel: bin.length ? bad.length / bin.length : 0, algemeen: general.length, algemeenZonderNl: generalBad.length, fout: bad, steekproef: fresh.slice(0, sample) }
}
