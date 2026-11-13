// De scorekaart van de algemene Editie (frisse ogen · 2): de vijf KPI's uit het rapport van 11 november
// (Hoot-design/editie-doel-onderzoek/RAPPORT.md §5), per dagdeel. Puur en zonder opslag: de server rekent hem bij het
// vastleggen (netlify/lib/build.mjs, archief) en het script scripts/scorekaart.mjs over bewaarde feeds. Eén meetlat,
// los van de selectieregels zelf: de toetsen hieronder zijn bewust eenvoudig en uitlegbaar, zodat een regelwijziging
// die zichzelf goedkeurt niet onopgemerkt blijft.
//
// 1. Eén gebeurtenis, één plek: geen twee plekken over hetzelfde feit, ook over de taalgrens.
// 2. Bovenaan staat nieuws: in de top 3 geen opinie, beschouwende kop, portret, bekend persoon of curiosum.
// 3. Gratis waar het kan: geen betaalde kop als hetzelfde verhaal een gratis Nederlandse kop had.
// 4. Een rustig einde: Buiten je bubbel is gratis, < 24 uur, geen liveblog of sport, nieuw onderwerp; of leeg. Een
//    Naast je bubbel in de algemene Editie telt als fout (besluit van Alex, 11 november: zonder goede kandidaat leeg).
// 5. Wat er speelt, ook in NL: van de vijf grootste NOS/NU.nl-verhalen staan er ≥ 3 in de Editie; en is er een Haags
//    dossier van ≥ 4 uitgevers, dan staat er ≥ 1 Haags verhaal in (grof: herkend aan woorden).
import { signatures, sameEvent, sameHeadEvent, curioStory, peopleStory, isLive } from './stories.mjs'
import { isOpinion, verdictTitle } from '../../shared/article-signals.mjs'
import { publisherOf } from '../../shared/edition-policy.mjs'
import { bubbleRejection, headWords, sportOpBubbel } from './bubble.mjs'
import { keywordTopics } from './topics.mjs'
import { SOURCES } from './sources.mjs'

const H = 36e5
// De sleutels van het archief (netlify/lib/build.mjs, refresh.mjs) en van de dagelijkse scorekaart (/api/scorekaart).
export const ARCHIVE_KEY = (id) => `archief-${id}`
export const ARCHIVE_FEED_KEY = (id) => `archief-feed-${id}`
export const SCORECARD_KEY = (date) => `scorekaart-${date}`
const SPORT_TOPICS = new Set(['voetbal', 'f1', 'wielrennen', 'tennis', 'wintersport', 'olympisch'])
// De gratis Nederlandse nieuwsbronnen (besluit 5, 11 november): NOS, NU.nl, RTL. Nooit het betaalde ND.
export const FREE_NL = new Set(['nos', 'nos-economie', 'nu', 'rtl'])
export const NL_TOP = 5 // de vijf grootste NOS/NU.nl-verhalen
export const NL_MIN = 3 // waarvan er zoveel in de Editie staan
export const HAAG_MIN = 4 // uitgevers voor een Haags dossier
const NL_HOURS = 12
const HAAG_HOURS = 24

// ---------- 1. Eén gebeurtenis, één plek, ook over de taalgrens ----------
// Een kleine vertaallijst voor gewone woorden en landen (het rapport: "VK" en "UK", "militair" en "soldier"), alleen
// voor de meting. Een paar in twee talen is hetzelfde feit bij ≥ 2 gedeelde woorden die geen land zijn, plus een
// gedeeld land of een gedeelde naam.
const DICT = {
  uk: 'vk', britain: 'vk', british: 'brits', britse: 'brits', brits: 'brits', briton: 'brits', britons: 'brits', brit: 'brits',
  us: 'vs', usa: 'vs', american: 'vs', americans: 'vs', amerikaanse: 'vs', amerikaans: 'vs', amerikaan: 'vs', verenigde: 'vs',
  russia: 'rusland', russian: 'rusland', russische: 'rusland', russisch: 'rusland', russen: 'rusland',
  ukraine: 'oekraine', ukrainian: 'oekraine', oekraïne: 'oekraine', oekraïense: 'oekraine',
  israel: 'israel', israël: 'israel', israeli: 'israel', israëlische: 'israel', israëlisch: 'israel',
  iran: 'iran', iranian: 'iran', iraanse: 'iran', china: 'china', chinese: 'china',
  france: 'frankrijk', french: 'frankrijk', franse: 'frankrijk', germany: 'duitsland', german: 'duitsland', duitse: 'duitsland',
  poland: 'polen', polish: 'polen', poolse: 'polen', krakow: 'krakau', kraków: 'krakau', krakau: 'krakau',
  netherlands: 'nederland', dutch: 'nederland', nederlandse: 'nederland', europe: 'europa', european: 'europa', europese: 'europa',
  gaza: 'gaza', venezuela: 'venezuela', venezolaanse: 'venezuela', ireland: 'ierland', irish: 'ierland', ierse: 'ierland',
  soldier: 'militair', soldiers: 'militair', militairen: 'militair', military: 'militair', serviceman: 'militair',
  arrests: 'opgepakt', arrested: 'opgepakt', arrest: 'opgepakt', aangehouden: 'opgepakt', gearresteerd: 'opgepakt', detained: 'opgepakt', arrestatie: 'opgepakt',
  spying: 'spionage', spy: 'spionage', spies: 'spionage', spion: 'spionage', espionage: 'spionage',
  suspected: 'verdacht', suspect: 'verdacht', verdenking: 'verdacht', verdachte: 'verdacht',
  killed: 'gedood', kills: 'gedood', doden: 'gedood', dead: 'gedood', dode: 'gedood', omgekomen: 'gedood', died: 'overleden', dies: 'overleden',
  shooting: 'schietpartij', gunman: 'schutter', shooter: 'schutter', schutter: 'schutter',
  election: 'verkiezing', elections: 'verkiezing', verkiezingen: 'verkiezing', vote: 'stemming', votes: 'stemming',
  charges: 'aangeklaagd', charged: 'aangeklaagd', aanklacht: 'aangeklaagd',
  attack: 'aanval', attacks: 'aanval', strike: 'aanval', strikes: 'aanval', aanvallen: 'aanval',
  ceasefire: 'bestand', wapenstilstand: 'bestand', wapenbestand: 'bestand', bomb: 'bom', bombs: 'bom', bommen: 'bom',
  president: 'president', minister: 'minister', court: 'rechter', judge: 'rechter', rechtbank: 'rechter',
  six: 'zes', seven: 'zeven', eight: 'acht', ten: 'tien', two: 'twee', three: 'drie', four: 'vier', five: 'vijf',
  trade: 'handel', deal: 'akkoord', agreement: 'akkoord', akkoord: 'akkoord', tariffs: 'heffingen', tariff: 'heffingen',
  impeachment: 'impeachment', pope: 'paus', paus: 'paus', king: 'koning', koning: 'koning',
}
const GEO = new Set(['vk', 'brits', 'vs', 'rusland', 'oekraine', 'israel', 'iran', 'china', 'frankrijk', 'duitsland', 'polen', 'nederland', 'europa', 'gaza', 'venezuela', 'ierland'])
const STOP = new Set('the and for with from after over into about amid says said that this will have been their than more what when where which while would could should under against between een het van voor met naar over door bij uit aan als dat die zijn wordt worden niet nog maar ook wel toch tegen tussen onder hun haar zijn deze dit wat wie hoe waarom heeft hebben werd waren gaat komt zegt wil moet kan'.split(' '))
const wordsOf = (title) => new Set(String(title || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => DICT[w] || w))
const langOf = (item, src) => item?.lang || src.get(item?.source)?.lang || 'nl'
export function crossLanguageSame(a, b) {
  const wa = wordsOf(a.title)
  const wb = wordsOf(b.title)
  const shared = [...wa].filter((w) => wb.has(w))
  const geo = shared.filter((w) => GEO.has(w))
  const other = shared.filter((w) => !GEO.has(w))
  const names = namesOf(a.title).filter((n) => namesOf(b.title).includes(n))
  return other.length >= 2 && (geo.length >= 1 || names.length >= 1)
}
const namesOf = (title) => String(title || '').split(/[^\p{L}\p{N}]+/u).slice(1).filter((w) => w.length >= 3 && /^\p{Lu}/u.test(w)).map((w) => DICT[w.toLowerCase()] || w.toLowerCase())

// ---------- 2. Bovenaan staat nieuws ----------
// Een portret of beschouwing aan de kop herkend ("…zat midden in de American dream, totdat…", "Wie is Jensen Huang").
const PORTRAIT = /\b(wie is|wie was|portret|het leven van|zo werd|totdat|who is|who was|profile of|the life of|the rise and fall|how .{3,40} became)\b/i
export function weakTop(lead, items = [], story = {}, sources = SOURCES) {
  if (!lead) return null
  if (isOpinion(lead)) return 'opinie'
  if (verdictTitle(lead)) return 'beschouwing'
  if (PORTRAIT.test(lead.title || '')) return 'portret'
  if (peopleStory(items.length ? items : [lead], sources)) return 'bekend persoon'
  if (curioStory(story || {}, items.length ? items : [lead])) return 'curiosum'
  return null
}

// ---------- 5. Haagse dossiers (grof) ----------
// Een Haags stuk: een Nederlandse kop met een Haags woord. Een dossier: één naam of dossierwoord (een partij, een
// fractieleider, het Belastingplan, box 3, de formatie) in Haagse koppen van ≥ HAAG_MIN uitgevers binnen een etmaal.
const HAAG = /\b(kabinet\w*|tweede kamer|eerste kamer|kamerle\w*|kamervragen|coalitie\w*|oppositie\w*|staatssecretaris\w*|formatie\w*|formateur|informateur|belastingplan|box 3|miljoenennota|begroting\w*|motie\w*|fractie\w*|binnenhof|den haag|haagse|d66|vvd|cda|pvv|groenlinks|pvda|ja21|bbb|nsc|jetten|bontenbal|brekelmans|paternotte|wilders|timmermans|klaver|yesilgöz)\b/i
const DOSSIER = /\b(belastingplan|box 3|miljoenennota|formatie|formateur|informateur|eerste kamer|d66|vvd|cda|pvv|groenlinks|pvda|ja21|bbb|nsc|jetten|bontenbal|brekelmans|paternotte|wilders|timmermans|klaver|yesilgöz)\b/gi
const dossierWords = (title) => [...new Set((String(title || '').match(DOSSIER) || []).map((w) => w.toLowerCase()))]
const NL_CATS = new Set(['nl', 'economie'])

// Eén scorerij. `edition`: { id, builtAt, entries, items? }; `byId`: alle bekende stukken (pool, vastgelegde stukken);
// `storyById`: de verhalen (snapshot of actueel); `stories`: alle verhalen van dat moment (voor KPI 5);
// `earlier`: de stukken die vandaag of in de vorige Editie al stonden (KPI 4); `previousIds`: de stukken van de vorige Editie (KPI 5).
export function scoreEdition({ edition, byId = new Map(), storyById = new Map(), stories = [], earlier = [], previousIds = new Set(), sources = SOURCES } = {}) {
  const src = new Map(sources.map((s) => [s.id, s]))
  const now = Date.parse(edition.builtAt)
  const entries = (edition.entries || []).filter((e) => e.desk !== 'bubbel')
  const bubble = (edition.entries || []).find((e) => e.desk === 'bubbel') || null
  const leadOf = (e) => byId.get(e.leadId || e.id) || null
  const itemsOf = (e) => (e.kind === 'story' ? e.itemIds || storyById.get(e.id)?.itemIds || [] : [e.id]).map((id) => byId.get(id)).filter(Boolean)
  const paid = (it) => !!src.get(it?.source)?.paid
  const before = (it) => !(Date.parse(it?.publishedAt) > now)
  const leads = entries.map(leadOf)
  const n = (k) => String(k + 1).padStart(2, '0')

  // 1. Dubbel. Zelfde taal: dezelfde gebeurtenis of hetzelfde feit in de kop (sameEvent, sameHeadEvent op de kop);
  //    twee talen: de vertaallijst.
  const pool = [...byId.values()].filter((i) => i.kind === 'article' || !i.kind)
  const heads = leads.map((l, k) => (l ? { ...l, id: `kop:${k}`, summary: '', text: '' } : null))
  const sig = signatures(pool, heads.filter(Boolean), { extended: true })
  const paren = []
  for (let a = 0; a < leads.length; a++) {
    for (let b = a + 1; b < leads.length; b++) {
      const x = leads[a]
      const y = leads[b]
      if (!x || !y) continue
      const sx = sig.get(heads[a].id)
      const sy = sig.get(heads[b].id)
      const same = langOf(x, src) === langOf(y, src) ? sameEvent(sx, sy, true) || sameHeadEvent(sx, sy) : crossLanguageSame(x, y)
      if (same) paren.push(`${n(a)}+${n(b)}`)
    }
  }

  // 2. Bovenaan.
  const zwak = []
  entries.slice(0, 3).forEach((e, k) => {
    const why = weakTop(leads[k], itemsOf(e), storyById.get(e.id), sources)
    if (why) zwak.push({ plek: n(k), reden: why, kop: leads[k]?.title || null })
  })

  // 3. Gratis waar het kan.
  let betaald = 0
  const alternatief = []
  entries.forEach((e, k) => {
    const lead = leads[k]
    if (!lead || !paid(lead)) return
    betaald++
    const free = itemsOf(e).find((i) => i.id !== lead.id && !paid(i) && NL_CATS.has(src.get(i.source)?.cat) && langOf(i, src) === 'nl' && before(i))
    if (free) alternatief.push({ plek: n(k), betaald: lead.sourceName || lead.source, gratis: free.sourceName || free.source, kop: free.title })
  })

  // 4. Een rustig einde.
  let einde = { ok: true, keuze: 'leeg', reden: null, bron: null, kop: null }
  if (bubble) {
    const it = leadOf(bubble)
    const earlierArts = earlier.filter((i) => i?.title).map((a, k) => ({ ...a, id: `eerder:${k}` }))
    const esig = signatures(pool, earlierArts)
    const ids = new Set(earlier.flatMap((i) => [i?.id, i?.storyId]).filter(Boolean))
    const shownToday = (a) => ids.has(a.id) || (!!a.storyId && ids.has(a.storyId)) || (bubble.kind === 'story' && ids.has(bubble.id)) || (esig.has(a.id) && earlierArts.some((x) => sameEvent(esig.get(a.id), esig.get(x.id))))
    const catOf = new Map([...src].map(([id, s]) => [id, s.cat]))
    const isSport = (i) => sportOpBubbel(i, { catOf, story: i.storyId ? storyById.get(i.storyId) || stories.find((s) => s.id === i.storyId) : null })
    const reden = it ? bubbleRejection(it, { isFree: (id) => src.has(id) && !src.get(id).paid, isSport, isLive, now, heads: headWords(leads.map((l) => l?.title)), terms: bubble.terms || [], shownToday }) : 'onbekend-stuk'
    const naast = !!bubble.near
    einde = { ok: !naast && !reden, keuze: naast ? 'naast' : 'trend', reden: naast ? 'naast-in-plaats-van-leeg' + (reden ? `, ${reden}` : '') : reden, bron: it?.sourceName || it?.source || null, kop: it?.title || null }
  }

  // 5. Wat er speelt, ook in NL.
  const inEdition = new Set(entries.flatMap((e) => [e.id, e.leadId, ...itemsOf(e).map((i) => i.id)]).filter(Boolean))
  const sportStory = (items) => items.some((i) => src.get(i.source)?.cat === 'sport' || keywordTopics(i.title || '').some((t) => SPORT_TOPICS.has(t)))
  const nlStories = stories
    .map((st) => ({ st, items: (st.itemIds || []).map((id) => byId.get(id)).filter((i) => i && before(i)) }))
    .filter(({ items }) => items.some((i) => FREE_NL.has(i.source) && now - Date.parse(i.publishedAt) <= NL_HOURS * H) && !sportStory(items) && !items.every((i) => isLive(i)))
    // Stond het verhaal al in de vorige Editie, dan is wegblijven geen gemis (actueel gaat voor herhaald).
    .filter(({ items }) => !items.some((i) => previousIds.has(i.id)))
    .map(({ st, items }) => ({ st, items, pubs: new Set(items.map((i) => publisherOf(i.source))).size }))
    .sort((a, b) => b.pubs - a.pubs || (a.st.id < b.st.id ? -1 : 1))
    .slice(0, NL_TOP)
  const top5 = nlStories.map(({ st, items, pubs }) => {
    const inIt = inEdition.has(st.id) || items.some((i) => inEdition.has(i.id))
    const kop = (items.find((i) => FREE_NL.has(i.source)) || items[0])?.title || null
    return { kop, uitgevers: pubs, inEditie: inIt }
  })
  const haagPieces = [...byId.values()].filter((i) => i?.title && NL_CATS.has(src.get(i.source)?.cat) && langOf(i, src) === 'nl' && before(i) && now - Date.parse(i.publishedAt) <= HAAG_HOURS * H && HAAG.test(i.title))
  const pubsBy = new Map()
  for (const i of haagPieces) for (const w of dossierWords(i.title)) (pubsBy.get(w) || pubsBy.set(w, new Set()).get(w)).add(publisherOf(i.source))
  const dossiers = [...pubsBy].filter(([, p]) => p.size >= HAAG_MIN).map(([w]) => w)
  const haagPubs = Math.max(0, ...[...pubsBy.values()].map((p) => p.size))
  const haagIn = entries.some((e, k) => [leads[k], ...itemsOf(e)].some((i) => i && NL_CATS.has(src.get(i.source)?.cat) && dossierWords(i.title).some((w) => dossiers.includes(w))))
  const nlOk = top5.filter((x) => x.inEditie).length

  return {
    id: edition.id,
    builtAt: edition.builtAt,
    revision: edition.revision || String(edition.version || '').split(':')[0] || null,
    plekken: entries.length,
    dubbel: { ok: paren.length === 0, paren },
    bovenaan: { ok: zwak.length === 0, zwak },
    gratis: { ok: alternatief.length === 0, betaald, plekken: entries.length, alternatief },
    einde,
    nl: { ok: nlOk >= Math.min(NL_MIN, top5.length), inEditie: nlOk, top5, haags: { dossier: dossiers.length > 0, dossiers, uitgevers: haagPubs, inEditie: haagIn, ok: !dossiers.length || haagIn } },
  }
}

// De stukken die een vastgelegde Editie toonde (de plekken en de bubbelplek), met het verhaal erbij: voor "niet eerder
// vandaag getoond". `edition`: { entries, items } (de vastgelegde vorm, of de Editie in een feed).
export function shownItems(edition = {}, byId = new Map()) {
  const own = new Map((edition.items || []).map((i) => [i.id, i]))
  const out = []
  for (const e of edition.entries || []) {
    const it = own.get(e.leadId || e.id) || byId.get(e.leadId || e.id)
    if (it) out.push({ id: it.id, storyId: e.kind === 'story' ? e.id : it.storyId || null, title: it.title, summary: it.summary || '', publishedAt: it.publishedAt, source: it.source })
  }
  return out
}

// De stukken van een vastgelegde Editie (plekken, hun verhalen en de bubbelplek): "stond er al" voor KPI 5.
export function editionItemIds(edition = {}, storyById = new Map()) {
  const out = new Set()
  for (const e of edition.entries || []) {
    out.add(e.leadId || e.id)
    for (const id of e.itemIds || (e.kind === 'story' ? storyById.get(e.id)?.itemIds || [] : [])) out.add(id)
  }
  return out
}

// Samenvatting over meerdere rijen, in de vorm van het rapport ("6 van 12").
export function summarize(rows = []) {
  const k = rows.length
  const count = (f) => rows.filter(f).length
  return {
    dagdelen: k,
    dubbel: count((r) => !r.dubbel.ok),
    bovenaan: count((r) => r.bovenaan.ok),
    gratis: rows.reduce((s, r) => s + r.gratis.alternatief.length, 0),
    betaald: rows.reduce((s, r) => s + r.gratis.betaald, 0),
    plekken: rows.reduce((s, r) => s + r.gratis.plekken, 0),
    einde: count((r) => r.einde.ok),
    leeg: count((r) => r.einde.keuze === 'leeg'),
    naast: count((r) => r.einde.keuze === 'naast'),
    nl: count((r) => r.nl.ok),
    haags: count((r) => r.nl.haags.ok),
    haagsDossier: count((r) => r.nl.haags.dossier),
  }
}

const mark = (ok) => (ok ? '✓' : '✗')
// Eén regel per dagdeel, in gewone taal. `prev`: de rij van het vorige dagdeel of de vorige dag (naast elkaar).
export function scoreLine(r) {
  const bub = r.einde.keuze === 'leeg' ? 'leeg' : `${r.einde.keuze === 'naast' ? 'Naast je bubbel' : 'Buiten je bubbel'} ${r.einde.bron || '?'}${r.einde.reden ? ` (${r.einde.reden})` : ''}`
  return [
    `| ${r.id} | ${r.revision || '?'}`,
    `${mark(r.dubbel.ok)} ${r.dubbel.paren.join(' ') || '—'}`,
    `${mark(r.bovenaan.ok)} ${r.bovenaan.zwak.map((z) => `${z.plek} ${z.reden}`).join(', ') || '—'}`,
    `${mark(r.gratis.ok)} ${r.gratis.alternatief.length} (${r.gratis.betaald}/${r.gratis.plekken} betaald)`,
    `${mark(r.einde.ok)} ${bub}`,
    `${mark(r.nl.ok)} ${r.nl.inEditie}/${r.nl.top5.length}${r.nl.haags.dossier ? `, Den Haag ${r.nl.haags.inEditie ? 'ja' : 'nee'} (${(r.nl.haags.dossiers || []).join(', ')})` : ''} |`,
  ].join(' | ')
}
export const SCORE_HEAD = '| dagdeel | revisie | 1 één plek | 2 nieuws bovenaan | 3 gratis | 4 einde | 5 NL |\n|---|---|---|---|---|---|---|'
export function summaryLine(s) {
  return `${s.dagdelen} dagdelen · 1 dubbel in ${s.dubbel} · 2 bovenaan in orde ${s.bovenaan} · 3 betaald met gratis NL-alternatief ${s.gratis} (${s.betaald} van ${s.plekken} betaald) · 4 einde in orde ${s.einde} (waarvan leeg ${s.leeg}, Naast je bubbel ${s.naast}) · 5 NL in orde ${s.nl}, Den Haag in orde ${s.haags} (dossier in ${s.haagsDossier})`
}
