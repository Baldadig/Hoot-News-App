// GET /api/voorpagina — drie uitnodigende plekken uit de algemene Editie voor de landingspagina op
// gethoot.app (besluit Alex: rustig en uitnodigend, Nederlands, actueel, met beeld waar dat mag).
// Klein, openbaar en zuinig: kop, bron, rubriek, aantal bronnen en soms een beeld (geen uitgever-URL's,
// geen kloktijden). We lezen de opgeslagen Editie uit dezelfde opslag als /api/feed (KEYS.start) en
// de eigen kandidatenpool die refresh.mjs ernaast schrijft (KEYS.voorpagina, zie
// lib/voorpagina-pool.mjs; KEYS.start zelf heeft geen berichten). We stellen hier nooit zelf een
// Editie samen; is er niets, dan 503 met { edition: null }.
import { readDoc, KEYS } from '../lib/kv.mjs'
import { isDutch } from '../lib/voorpagina-pool.mjs'
import { DESK_LABEL, desksOf, primaryDesk } from '../lib/desks.mjs'
import { INTERESTS } from '../../src/lib/topics.js'
import { signatures, sameSubject } from '../lib/stories.mjs'
import { keywordTopics, OTHER_SPORT } from '../lib/topics.mjs'

export const PLACES = 3
// Zoveel bronnen per verhaal gaan hooguit mee (de landing toont er een rij logo's van).
export const SOURCES_MAX = 12
export const BREED_MAX = 3
export const BREED_MIN = 3
const ORIGINS = new Set(['https://gethoot.app', 'https://www.gethoot.app'])
const CACHE = 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600'

// Bronnen waarvan we het beeld op de landingspagina mogen tonen: open licentie of eigen toestemming.
// Persfoto's van uitgevers (ANP enz.) zijn auteursrechtelijk beschermd, dus de lijst begint leeg
// (rijksoverheid.nl staat niet in onze bronnen). Alex kan hier bronnen-id's (uit sources.mjs)
// toevoegen waarvoor toestemming is; alleen dan krijgt een plek een imageUrl.
export const OPEN_IMAGE_SOURCES = new Set([])

// Rustige, uitnodigende rubrieken, in volgorde van gewicht (hoger = eerder gekozen).
export const CALM_WEIGHT = { binnenland: 5, cultuur: 4, wetenschap: 3, tech: 2 }
// Zwaardere rubrieken: alleen als er anders minder dan drie plekken zijn.
export const HEAVY_DESKS = new Set(['buitenland', 'oekraine', 'middenoosten', 'vs'])
const LABEL = { ...DESK_LABEL, cultuur: 'Cultuur', tech: 'Tech', sport: 'Sport' }

// Zware koppen: begin van woorden (dus ook samenstellingen als "oorlogsmisdaden"). Bewust ruim.
export const HEAVY_WORDS = [
  'dood', 'dode', 'doden', 'dodelijk', 'gedood', 'overleden', 'overlijd', 'overleed', 'omgekomen', 'sterft', 'stierf',
  'moord', 'vermoord', 'aanslag', 'oorlog', 'ramp', 'crash', 'ongeluk', 'ongeval', 'explosie', 'ontploff', 'geweld',
  'rellen', 'verkracht', 'misbruik', 'executie', 'geëxecuteerd', 'gijzel', 'terreur', 'terroris', 'zelfmoord', 'suïcide',
  'kanker', 'ziek', 'slachtoffer', 'schietpartij', 'neergeschoten', 'doodgeschoten', 'steekpartij', 'neergestoken',
  'bombardement', 'gewond', 'opgepakt', 'aangehouden', 'ontvoer', 'mishandel', 'mensensmokkel', 'migrant', 'vluchteling', 'brand', 'kinderporno', 'zedenzaak', 'zedendelict',
  'aanhouding', 'relschopper', 'ongeregeld', 'plunder', 'oprui', 'vermist', 'verdronk', 'verdrink',
]
const HEAVY_RE = new RegExp(`(?<![\\p{L}])(?:${HEAVY_WORDS.map(w => w === 'brand' ? 'brand(?!weer)' : w).join('|')})`, 'iu')
const UNREST = new Set(['misdaad', 'rellen', 'geweld', 'ramp', 'rampen', 'oorlog', 'terrorisme'])
export const isHeavy = (item, desk = item?.desk) =>
  [desk, item?.desk, item?.section].some(d => UNREST.has(String(d || '').toLowerCase())) ||
  [...(item?.topics || []), ...(item?.mainTopics || [])].some(t => UNREST.has(t)) ||
  HEAVY_RE.test(`${item?.title || ''} ${item?.summary || ''}`)

const SPORT_TOPICS = new Set(['voetbal', 'f1', 'wielrennen', 'wielersport', 'tennis', 'darts', 'sport', 'olympisch', 'wintersport', 'basketbal'])
const SECTION_KIND = /(?:^|[/\s-])(sport\w*|voetbal|cultuur\w*|entertainment|showbizz|boulevard|film|muziek|boeken|media)(?:[/\s-]|$)/i
function contentKind(item) {
  const visible = `${item.title || ''} ${item.summary || ''}`
  const topics = [...(item.mainTopics || []), ...(item.topics || []), ...keywordTopics(visible)]
  const section = SECTION_KIND.exec(`${item.section || ''} ${item.url || ''}`)?.[1]?.toLowerCase()
  if (topics.some(t => SPORT_TOPICS.has(t)) || OTHER_SPORT.test(visible) || /\b(?:(?:eredivisie|voetbal|tennis|hockey|beker|competitie)wedstrijd\w*|marathon\w*|hardloop\w*)\b/i.test(visible) || /^(sport|voetbal)/.test(section || '')) return 'sport'
  if (section || topics.some(t => ['muziek', 'film', 'boeken', 'kunst'].includes(t))) return 'cultuur'
  return null
}

export { isDutch }

const INTEREST_RUBRIEK = { cultuur: 'cultuur', tech: 'tech', wetenschap: 'wetenschap', sport: 'sport' }
const TOPIC_RUBRIEK = Object.fromEntries(INTERESTS.flatMap((i) => (INTEREST_RUBRIEK[i.id] ? i.topics.map((t) => [t, INTEREST_RUBRIEK[i.id]]) : [])))
TOPIC_RUBRIEK.nederland = 'binnenland'

// Rubriek van een plek, alleen als die zeker is (schets landing-schets, 12 november). Eerder won een
// trefwoord uit de intro het van de rubriek van de Editie ("Iraanse actor" werd Cultuur via film,
// "walvis" in een autotest werd Wetenschap). Nu: harde signalen eerst (rubriek in de URL of sectie,
// categorie van de bron), dan de rubriek die de Redacteur in de Editie gaf. Een trefwoord alleen
// beslist nooit. null = niet zeker: de landing toont dan geen rubriek, alleen het nummer.
// Alleen hele mappen in de URL tellen (nooit woorden uit de slug: "sociale-media" is geen Cultuur,
// "voetbal-geweld" geen Sport), plus de sectie die de uitgever zelf meegeeft.
const SPORT_DIR = /^(?:sport[\w-]*|voetbal[\w-]*|darts|tennis|wielrennen|wielersport|formule-?1|f1|schaatsen|hockey)$/i
const CULTUUR_DIR = /^(?:cultuur[\w-]*|media-en-cultuur|film|films|muziek|boeken|kunst|theater)$/i
// Showbizz is niet zeker Cultuur: ook een incident bij de koning of een rechtszaak staat soms onder /boulevard/.
const SHOWBIZZ_DIR = /^(?:entertainment|showbizz|boulevard|bv-en-co|celebrities|celebrity|media|achterklap|sterren|royalty|show|people)$/i
function mappen(url) {
  try { return new URL(url).pathname.split('/').filter(Boolean).slice(0, -1) } catch { return [] }
}
export function strongKind(item, srcCat) {
  const delen = [...mappen(item.url || ''), String(item.section || '').trim().toLowerCase().replace(/\s*&\s*/g, '-').replace(/\s+/g, '-')].filter(Boolean)
  if (delen.some((d) => SPORT_DIR.test(d))) return 'sport'
  if (delen.some((d) => CULTUUR_DIR.test(d))) return 'cultuur'
  if (['sport', 'tech', 'cultuur'].includes(srcCat)) return srcCat
  if (delen.some((d) => SHOWBIZZ_DIR.test(d))) return 'showbizz'
  return null
}
const GEO = new Set(['binnenland', ...HEAVY_DESKS])
export function rubriek(item, desk, srcCat, editieDesk = null) {
  const strong = strongKind(item, srcCat)
  // Showbizz telt alleen als Cultuur als de Editie het zelf ook Cultuur noemt; anders geen rubriek.
  if (strong === 'showbizz') return editieDesk === 'cultuur' ? 'cultuur' : null
  if (strong) return strong
  if (editieDesk && editieDesk !== 'bubbel' && LABEL[editieDesk]) return editieDesk
  // Het hoofdonderwerp van het bericht (niet een trefwoord uit de intro) mag Cultuur geven. Tech alleen via de bron (Tweakers e.d.).
  const main = (item.mainTopics || []).some((t) => ['muziek', 'film', 'boeken', 'kunst'].includes(t)) ? 'cultuur' : null // 'media' en 'games' zijn niet zeker Cultuur
  if (main) return main
  // Uit de pool: alleen de geografische indeling (Nederland of niet) is hard genoeg om te tonen.
  if (desk && GEO.has(desk)) return desk
  return null
}

// Zuivere extractie: `start` is de feed (bronnen, verhalen, editie). Geeft { slot, date, entries } of null.
// Deterministisch: dezelfde feed geeft altijd dezelfde drie plekken.
export function extract(start, places = PLACES, openImageSources = OPEN_IMAGE_SOURCES) {
  const ed = start?.edition
  if (!ed || !Array.isArray(ed.entries) || !ed.slot || !ed.date) return null
  const srcs = new Map((start.sources || []).map((s) => [s.id, s]))
  const byId = new Map([...(start.items || []), ...(ed.items || [])].map((i) => [i.id, i]))
  const stories = new Map((start.stories || []).map((s) => [s.id, s]))
  const storyOf = new Map((start.stories || []).flatMap(s => (s.itemIds || [s.leadId]).filter(Boolean).map(id => [id, s.id])))

  const make = (item, desk, sourceCount, order, storyId = null, editieDesk = null) => {
    if (!item?.title) return null
    const src = srcs.get(item.source)
    const sport = src?.cat === 'sport' || desk === 'sport' || contentKind(item) === 'sport' || strongKind(item, src?.cat) === 'sport'
    if (!isDutch(item, src?.lang) || isHeavy(item, desk) || sport) return null
    // Een bericht uit de voorpagina-pool draagt zijn rubriek al (uitgerekend met URL en rubriek van de bron).
    const resolvedDesk = CALM_WEIGHT[desk] || HEAVY_DESKS.has(desk) ? desk : 'desk' in item ? item.desk : primaryDesk([desksOf(item)])
    const r = rubriek(item, resolvedDesk, src?.cat, editieDesk)
    const heavy = HEAVY_DESKS.has(r)
    if (heavy && (sourceCount || 1) < 5) return null
    return { item, storyId: storyId || item.storyId || storyOf.get(item.id), rubriek: r, sourceCount: sourceCount || 1, order, heavy }
  }

  const cands = []
  const used = new Set()
  let bubble = null
  ed.entries.forEach((e, idx) => {
    if (e.desk === 'bubbel') { // de echte 'Buiten je bubbel' van deze Editie, apart (de landing labelt er plek 3 mee)
      const it = byId.get(e.kind === 'story' ? e.leadId || stories.get(e.id)?.leadId : e.id)
      // Geen zware-rubriekregel hier: de bubbel is per definitie ver weg (vaak Buitenland), wel geen zwaar nieuws of sport.
      const src = it && srcs.get(it.source)
      // Geen showbizz als bubbel op de landing (Alex, 13 november: "Tyra Banks is weer vrijgezel" onder "Iets wat je anders
      // niet had gelezen"). Dan is er hier geen bubbel en heet plek 3 gewoon "Ook het lezen waard".
      if (it?.title && isDutch(it, src?.lang) && !isHeavy(it) && src?.cat !== 'sport' && contentKind(it) !== 'sport' && strongKind(it, src?.cat) !== 'showbizz') {
        bubble = { item: it, storyId: it.storyId || null, rubriek: rubriek(it, 'desk' in it ? it.desk : primaryDesk([desksOf(it)]), src?.cat), sourceCount: e.sourceCount || 1, order: idx }
      }
      return
    }
    const story = e.kind === 'story' ? stories.get(e.id) : null
    const item = byId.get(e.kind === 'story' ? e.leadId || story?.leadId : e.id)
    const c = make(item, e.desk || null, e.kind === 'story' ? e.sourceCount || story?.sourceCount || 1 : 1, idx, story?.id, e.desk || null)
    if (e.kind === 'story') used.add(e.id)
    if (c) cands.push(c)
  })

  // Bekijk ook de overige verhalen van dezelfde dagdeel-pool (laatste 24 uur). Drie kandidaten
  // kunnen na ontdubbelen te weinig zijn; bovendien kan de pool een ontbrekende rubriek leveren.
  {
    const ref = Date.parse(ed.builtAt) || Math.max(0, ...(start.stories || []).map((s) => Date.parse(s.latestAt) || 0))
    const rest = (start.stories || []).filter((s) => !used.has(s.id) && ref - (Date.parse(s.latestAt) || 0) <= 864e5)
    rest.forEach((s, i) => {
      const item = byId.get(s.leadId) || (s.itemIds || []).map((id) => byId.get(id)).find(Boolean)
      const c = make(item, item ? primaryDesk([desksOf(item)]) : null, s.sourceCount, 1000 + i, s.id)
      if (c) cands.push(c)
    })
  }

  // Ook losse publicaties uit dezelfde opgeslagen feedpool mogen aanvullen. Ze hebben nog
  // niet altijd een verhaal; alleen de Editie-items lezen zou juist rustige cultuur/tech missen.
  {
    const ref = Date.parse(ed.builtAt) || 0
    for (const [i, item] of (start.items || []).entries()) {
      if (item.kind === 'post' || !Number.isFinite(Date.parse(item.publishedAt)) || ref - Date.parse(item.publishedAt) > 864e5) continue
      const key = item.storyId || item.id
      if (cands.some(c => (c.item.storyId || c.item.id) === key || c.item.title === item.title)) continue
      const story = item.storyId ? stories.get(item.storyId) : null
      const c = make(item, null, story?.sourceCount || 1, 10000 + i)
      if (c) cands.push(c)
    }
  }

  // Kiezen: eerst de rustige rubrieken (op gewicht, één per rubriek), dan aanvullen binnen de rustige
  // plekken, en alleen als het dan nog geen drie zijn de zwaardere rubrieken.
  const rank = (a, b) => (CALM_WEIGHT[b.rubriek] || 0) - (CALM_WEIGHT[a.rubriek] || 0) || a.order - b.order || b.sourceCount - a.sourceCount
  const picked = []
  const sig = signatures([...new Map([...cands, ...(bubble ? [bubble] : [])].map(c => [c.item.id, c.item])).values()])
  const duplicate = (a, b) => a.item.id === b.item.id ||
    (a.storyId && a.storyId === b.storyId) ||
    a.item.title.trim().toLocaleLowerCase('nl') === b.item.title.trim().toLocaleLowerCase('nl') ||
    sameSubject(sig.get(a.item.id), sig.get(b.item.id))
  // de bubbel blijft de bubbel: niet ook nog als gewone plek
  const available = c => !picked.some(p => duplicate(p, c)) && !(bubble && duplicate(bubble, c))
  const pickFrom = (list) => {
    const sorted = [...list].sort(rank)
    for (const c of sorted) if (picked.length < places && available(c) && !picked.some((p) => p.rubriek === c.rubriek)) picked.push(c)
    for (const c of sorted) if (picked.length < places && available(c)) picked.push(c)
  }
  pickFrom(cands.filter((c) => !c.heavy))
  if (picked.length < places) {
    const world = cands.filter(c => c.heavy && available(c)).sort(rank)[0]
    if (world) picked.push(world)
  }

  // Volgorde: eerst de hoogste in de Editie, dan op aantal bronnen.
  picked.sort((a, b) => a.order - b.order || b.sourceCount - a.sourceCount)
  // De bronnen die over dit verhaal schrijven (landing, "Eén verhaal, veel bronnen"): id en naam uit de catalogus,
  // de bron van de kop eerst, daarna in de volgorde van de catalogus (de bekendste Nederlandse titels staan daar
  // vooraan: herkenbaarheid), hooguit SOURCES_MAX. Alleen namen die het verhaal zelf al draagt (story.sourceNames);
  // geen URL's. Minder dan twee bekende bronnen: het veld blijft weg.
  const idOfName = new Map((start.sources || []).filter((s) => s.name).map((s) => [s.name, s.id]))
  const rang = new Map((start.sources || []).map((s, i) => [s.name, i]))
  const bronnen = (item, storyId) => {
    const lead = srcs.get(item.source)
    const rest = [...((storyId && stories.get(storyId)?.sourceNames) || [])].sort((a, b) => (rang.get(a) ?? 1e9) - (rang.get(b) ?? 1e9))
    const names = [lead?.name || item.sourceName, ...rest]
    const seen = new Set()
    const list = []
    for (const name of names) {
      const id = idOfName.get(name)
      if (!id || seen.has(id)) continue
      seen.add(id)
      list.push({ id, name })
      if (list.length === SOURCES_MAX) break
    }
    return list.length >= 2 ? list : null
  }
  const plek = ({ item, rubriek: r, sourceCount, storyId }) => {
    const out = { desk: r, deskLabel: r ? LABEL[r] || null : null, title: item.title, source: item.sourceName || item.source, sourceCount }
    if (srcs.has(item.source)) out.sourceId = item.source // voor het logo van de bron op de landing
    const list = bronnen(item, storyId)
    if (list) out.sources = list
    if (openImageSources.has(item.source) && /^https:\/\//.test(item.image || '')) out.imageUrl = item.image
    return out
  }
  const entries = picked.map(plek)
  if (entries.length !== places) return null
  const b = bubble ? plek(bubble) : null
  // 'breed': de verhalen waar de meeste bronnen over schrijven (hooguit BREED_MAX, elk met minstens BREED_MIN bekende
  // bronnen), voor het bronnenblok van de landing. Zelfde zeef als de plekken (Nederlands, niet zwaar, geen sport),
  // elk onderwerp één keer. Geen verhaal dat eraan voldoet: het veld blijft weg.
  const breed = []
  for (const c of cands.filter((c) => c.storyId).map((c) => ({ c, p: plek(c) })).filter((x) => (x.p.sources || []).length >= BREED_MIN).sort((x, y) => y.p.sources.length - x.p.sources.length || x.c.order - y.c.order)) {
    if (breed.length < BREED_MAX && !breed.some((x) => duplicate(x.c, c.c))) breed.push(c)
  }
  const out = { slot: ed.slot, date: ed.date, entries }
  if (b) out.bubble = b
  if (breed.length) out.breed = breed.map((x) => x.p)
  return out
}

// KEYS.start heeft `items: []`; de berichten voor het aanvullen komen uit de voorpagina-pool.
export function withPool(start, pool) {
  if (!start || typeof start !== 'object') return start
  const own = Array.isArray(start.items) ? start.items : []
  const extra = Array.isArray(pool?.items) ? pool.items : []
  const seen = new Set(own.map((i) => i.id))
  return { ...start, items: [...own, ...extra.filter((i) => i && !seen.has(i.id))] }
}

const base = (origin) => ({
  'Content-Type': 'application/json; charset=utf-8',
  Vary: 'Origin',
  ...(ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
})

export default async (req) => {
  const origin = req.headers.get('origin') || ''
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...base(origin), 'Access-Control-Allow-Methods': 'GET, HEAD', 'Cache-Control': CACHE } })
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response(JSON.stringify({ error: 'Alleen GET.' }), { status: 405, headers: { ...base(origin), Allow: 'GET, HEAD, OPTIONS', 'Cache-Control': 'no-store' } })
  let edition = null
  try {
    const [doc, pool] = await Promise.all([readDoc(KEYS.start), readDoc(KEYS.voorpagina).catch(() => null)])
    let extra = null
    try { extra = pool ? JSON.parse(pool.body) : null } catch { extra = null } // kapotte pool: alleen de Editie
    edition = doc ? extract(withPool(JSON.parse(doc.body), extra)) : null
  } catch {
    edition = null
  }
  if (!edition) return new Response(req.method === 'HEAD' ? null : JSON.stringify({ edition: null }), { status: 503, headers: { ...base(origin), 'Cache-Control': 'no-store' } })
  return new Response(req.method === 'HEAD' ? null : JSON.stringify({ edition }), { headers: { ...base(origin), 'Cache-Control': CACHE } })
}

export const config = { path: '/api/voorpagina' }
