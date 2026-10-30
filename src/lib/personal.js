// De persoonlijke editie — pure functies (tests/personal.test.mjs, tests/compose.test.mjs).
//
// Per dagdeel (dezelfde 06:00 / 12:00 / 17:00 als de algemene editie) stelt De Redacteur jouw
// Editie samen uit jouw bronnen (Hoot-design/algoritme/bouwspec.md §4). Het profiel (shared/editor.mjs)
// komt uit je keuzes, meer/minder en wat je opent en bewaart; de selectie (selectForReader in
// netlify/lib/stories.mjs) zet eerst de voorpagina, voor iedereen gelijk, dan jouw rubrieken, dan wat
// het zwaarst weegt. Zijn er te weinig verhalen uit je eigen bronnen, dan vullen we aan uit de
// algemene editie ("Buiten je bronnen"). "Buiten je bubbel" ligt echt buiten je profiel, en "Waar
// iedereen over schrijft" is het brede verhaal dat het minst bij je past. Elke plek krijgt een
// waarom. Uitvoer = f(invoer): `now` is de start van het dagdeel, en er is geen toeval.
//
// Rekenregels als in shared/editor.mjs (web en iOS moeten bit-gelijk uitkomen): alleen + − × ÷,
// Math.round/min/max/floor en Date.parse; elke sortering heeft een totale vergelijker.
import { selectForReader, EDITION_SIZE, signatures, sameEvent, seenBefore, developedSince } from '../../netlify/lib/stories.mjs'
import { desksOf, primaryDesk } from '../../netlify/lib/desks.mjs'
import { INTERESTS } from './topics.js'
import { supplyOf, profileOf, personalParts, sumParts, tempoWindows, outsideProfile, strongestFamily, whyOf, NEIGHBOURS, FAMILY_OF } from '../../shared/editor.mjs'

export const EXTERN = 'extern' // rubriek van een aangevuld verhaal
export const WIDE = 'breed' // "Waar iedereen over schrijft"

// Het oude vaste extraatje voor een interesse. De Redacteur rekent met het profiel (shared/editor.mjs);
// dit blijft alleen voor de meetlat in Hoot-design ("gewogen plekken").
export const INTEREST_BONUS = 10

// Nieuws (deze rubrieken van de catalogus) vormt de editie; sport, cultuur en games komen er
// alleen bij als dat gebied in je profiel sterk genoeg is, hooguit twee, en nooit als hoofdverhaal:
// zo verdringt een grote sportavond het nieuws niet.
export const NEWS_CATS = new Set(['nl', 'vl', 'regio', 'int', 'economie', 'tech', 'wetenschap'])
export const EXTRA_MAX = 2
export const EXTRA_MIN = 0.5 // zo sterk moet sport, cultuur of games in je profiel zijn
// Ook uit een gewone nieuwsbron (NU.nl, de Volkskrant) is een voetbalbericht sport.
const TOPIC_KIND = { voetbal: 'sport', f1: 'sport', wielrennen: 'sport', tennis: 'sport', wintersport: 'sport', olympisch: 'sport', muziek: 'cultuur', film: 'cultuur', boeken: 'cultuur', kunst: 'cultuur', games: 'games' }
// Een bericht van een vakbron krijgt die rubriek, niet een rubriek uit de tekst ("Britse
// fabrikant" maakte van een koptelefoonreview anders Buitenland).
const SPECIALIST = new Set(['tech', 'economie', 'wetenschap'])
const NEAR_MIN_SOURCES = 3 // "Naast je bubbel": een verhaal dat breed genoeg gedekt is
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

// De verhalen zoals deze lezer ze ziet. `ownCount` telt de verschillende bronnen in het verhaal
// die jij volgt (de server telt Hoots basisbronnen): zo krijgt een verhaal dat van jouw bronnen
// alleen Carbon Brief brengt toch de +100 voor "eigen bron" in weight(). De rubriek (`desk`) zet de
// server uit alle berichten en is voor iedereen gelijk; een oudere server leverde hem nog niet,
// dan rekenen we hem hier uit dezelfde berichten uit (`all`: alles wat we van het verhaal hebben).
export function storiesForReader(stories = [], items = [], followed = new Set(), all = items) {
  const ownSource = new Map()
  for (const i of items) if (followed.has(i.source)) ownSource.set(i.id, i.source)
  let byId = null
  const deskOf = (st) => {
    byId ||= new Map(all.map((i) => [i.id, i]))
    return primaryDesk(st.itemIds.map((id) => byId.get(id)).filter(Boolean).map((i) => desksOf(i)))
  }
  return stories.map((st) => ({
    ...st,
    ownCount: new Set(st.itemIds.map((id) => ownSource.get(id)).filter(Boolean)).size,
    desk: st.desk !== undefined ? st.desk : deskOf(st),
  }))
}

// `previous`: je vorige editie (zie previousOf in stories.mjs); wat daarin stond, komt alleen
// terug als het zich ontwikkelde (seenBefore/developedSince), ook als aanvulling, breed verhaal
// of bubbel; dan met een nieuw stuk als kop en "Vervolg · N nieuwe stukken".
// `favorites`: je voorkeursbronnen; die wegen zwaarder en leveren bij voorkeur het hoofdbericht.
// `affinity`, `taste`: wat je opent en bewaart, en meer/minder hiervan (src/lib/affinity.js).
// `readIds`: wat je al las (een Set); dat komt niet terug, tenzij er genoeg nieuws bij kwam.
// `now`: de start van het dagdeel (global.builtAt), zodat elk toestel dezelfde Editie maakt.
// Velden met een `_` (zoals `_parts`) zijn alleen ter inzage; withoutDebug haalt ze eraf.
export function composePersonal({ global, stories = [], items = [], sources = [], followed = new Set(), interests = [], topics = [], now = Date.parse(global?.builtAt) || Date.now(), builtAt = new Date(now).toISOString(), previous = null, affinity = null, favorites = [], taste = null, readIds = new Set() }) {
  if (!global?.entries?.length) return null
  const catOf = new Map(sources.map((s) => [s.id, s.cat]))
  // Soort bericht: de rubriek van de bron, tenzij het onderwerp sport, cultuur of games is.
  const kindOf = (i) => {
    const byTopic = (i.topics || []).map((t) => TOPIC_KIND[t]).find(Boolean)
    if (byTopic) return byTopic
    const cat = catOf.get(i.source)
    return !catOf.size || NEWS_CATS.has(cat) ? 'nieuws' : cat // zonder catalogus: alles als nieuws
  }
  const pool = items.filter((i) => i.kind === 'article' && followed.has(i.source))

  // 1. Profiel, tempo per bron en de rubriek per verhaal (voor iedereen gelijk).
  const prof = profileOf({ interests, topics, affinity, taste, favorites, followed, sources, supply: supplyOf(pool) })
  const tempo = tempoWindows(items.filter((i) => followed.has(i.source)))
  const mineStories = storiesForReader(stories, items, followed, [...items, ...(global.items || [])])
  const storyDesk = new Map(mineStories.map((st) => [st.id, st.desk]))
  // Alles wat het toestel kent (eigen bronnen plus de algemene Editie), met kenmerken: voor de
  // bubbel en voor "ontwikkeld sinds je vorige Editie" (developedSince).
  const itemAny = new Map([...items, ...(global.items || [])].map((i) => [i.id, i]))
  const sigAll = signatures([...itemAny.values()].filter((i) => i.kind !== 'post'))
  const ctx = { readIds, tempo, storyDesk, known: itemAny, sigKnown: sigAll }
  const seed = `${editionBasis([...followed], interests, topics, favorites)}|${global.id}`

  // 2. Het extra blok: sport en cultuur als dat gebied sterk genoeg in je profiel zit (ook uit
  //    lezen); games alleen als je dat onderwerp scherp koos of las, niet geërfd van Tech (wie Tech
  //    kiest, bedoelt meestal AI en technologie).
  const tech = INTERESTS.find((f) => f.id === 'tech')?.topics || []
  const gamesSharp = interests.includes('tech') && topics.includes('games') && !tech.every((t) => topics.includes(t))
  const gamesOk = (prof.topicP.games || 0) >= EXTRA_MIN && (gamesSharp || prof.origin.games === 'geleerd')
  const extraKinds = new Set([...((prof.family.sport || 0) >= EXTRA_MIN ? ['sport'] : []), ...((prof.family.cultuur || 0) >= EXTRA_MIN ? ['cultuur'] : []), ...(gamesOk ? ['games'] : [])])
  const newsPool = pool.filter((i) => kindOf(i) === 'nieuws')
  const extraPool = pool.filter((i) => extraKinds.has(kindOf(i)))

  // "Buiten je bubbel" uit de algemene editie houdt een plek; "Waar iedereen over schrijft" krijgt
  // er één zodra er een breed verhaal is dat je eigen bronnen niet al brengen. Schrijft een van je
  // bronnen er al over, dan geen gratis bron van buiten ervoor in de plaats.
  let bubbleEntry = global.entries.find((e) => e.desk === 'bubbel') || null
  const storyById = new Map(stories.map((s) => [s.id, s]))
  const ownIds = new Set(items.filter((i) => followed.has(i.source)).map((i) => i.id))
  const covered = (w) => ownIds.has(w.item.id) || (storyById.get(w.storyId)?.itemIds || []).some((id) => ownIds.has(id))

  // Wat je al las, doet nergens meer mee (bouwspec §2): ook niet als aanvulling, breed verhaal of
  // bubbel. Een plek met een gelezen bericht komt alleen terug als vervolg (≥ 2 nieuwe stukken);
  // dan gaat `followUp` mee in de parts. We kijken naar het hele verhaal van de kop, ook als de
  // plek een los bericht is.
  const storyOfItem = new Map(stories.flatMap((s) => s.itemIds.map((id) => [id, s.id])))
  const readOf = (id, sid) => {
    if (!readIds.size || !id) return {}
    const st = storyById.get(sid || storyOfItem.get(id) || itemAny.get(id)?.storyId)
    const ids = [...new Set([id, ...(st?.itemIds || [])])]
    if (!ids.some((x) => readIds.has(x))) return {}
    const { seen, followUp } = personalParts(ids.map((x) => itemAny.get(x)).filter(Boolean), prof, { readIds })
    return followUp ? { followUp } : { seen: seen || { pts: 0 } } // gelezen maar onbekend bericht: ook gezien
  }
  const preferred = new Set(favorites.filter((id) => followed.has(id)))
  // Wat in je vorige Editie stond, komt ook als aanvulling, breed verhaal of bubbel alleen terug als
  // het zich ontwikkelde (zie selectForReader); dan met het zwaarste nieuwe stuk als kop.
  const againOf = (id, sid) => {
    if (!previous || !id) return {}
    const st = storyById.get(sid || storyOfItem.get(id) || itemAny.get(id)?.storyId)
    const members = [...new Set([id, ...(st?.itemIds || [])])].map((x) => itemAny.get(x)).filter(Boolean)
    if (!seenBefore(st || { id }, members, previous)) return {}
    const dev = st ? developedSince(st, members, previous, sigAll, { mainIds: followed, preferred, now, known: itemAny }) : null
    return dev ? { vervolg: dev.fresh.length, leadId: dev.lead.id } : { seen: true }
  }
  // Doet nog mee: niet gelezen zonder nieuws, en niet gezien zonder ontwikkeling.
  const unread = (id, sid) => !readOf(id, sid).seen && !againOf(id, sid).seen
  const withHistory = (e, id, sid) => {
    const { followUp } = readOf(id, sid)
    const { vervolg, leadId } = againOf(id, sid)
    let out = followUp ? { ...e, parts: { ...(e.parts || {}), followUp } } : e
    if (vervolg) out = e.kind === 'item' ? { ...out, id: leadId, vervolg } : { ...out, leadId, vervolg }
    return out
  }
  const wideAny = (global.wide || []).some((w) => w?.item?.id && !covered(w) && unread(w.item.id, w.storyId))
  const size = EDITION_SIZE - (bubbleEntry ? 1 : 0) - (wideAny ? 1 : 0)
  const opts = { mainIds: followed, now, previous, preferred, prof, ctx, seed }
  const extra = extraPool.length ? selectForReader(mineStories, extraPool, { ...opts, size: EXTRA_MAX, plan: false }).map((e) => ({ ...e, desk: null })) : []

  // 3. Het nieuws, met jouw indeling. Een plek buiten de indeling en de voorpagina met een kop van
  //    een vakbron krijgt de rubriek van die bron.
  const leadCat = (e) => catOf.get(pool.find((i) => i.id === (e.leadId || e.id))?.source)
  const sel = selectForReader(mineStories, newsPool, { ...opts, size: size - extra.length })
  const news = sel.map((e) => (!e.planned && !e.front && SPECIALIST.has(leadCat(e)) ? { ...e, desk: leadCat(e) } : e))
  const own = [...news, ...extra]
  const membersOf = (e) => new Set([e.leadId || e.id, ...(e.kind === 'story' ? storyById.get(e.id)?.itemIds || e.itemIds || [] : [])])
  const taken = new Set(own.flatMap((e) => [...membersOf(e)]))

  // 4. Waar iedereen over schrijft: bij voorkeur de eerste (in de volgorde van de server) buiten je
  //    profiel; anders het minst passende vrije verhaal (laagste fit, dan de meeste bronnen).
  //    Vóór het aanvullen gekozen, zodat het zijn eigen label krijgt in plaats van "Buiten je bronnen".
  const fitOf = (w) => Math.max(0, ...(w.topics || []).map((t) => Math.max(prof.topicP[t] || 0, prof.shareOf[t] || 0)))
  const free = (w) => w?.item?.id && !taken.has(w.item.id) && !(storyById.get(w.storyId)?.itemIds || []).some((id) => taken.has(id)) && !covered(w) && unread(w.item.id, w.storyId)
  const wide =
    (global.wide || []).find((w) => free(w) && outsideProfile(w.topics, prof)) ||
    (global.wide || []).filter(free).sort((a, b) => fitOf(a) - fitOf(b) || b.sourceCount - a.sourceCount || byText(a.storyId, b.storyId))[0]
  const wideEntry = wide ? withHistory({ kind: 'story', id: wide.storyId, leadId: wide.item.id, desk: WIDE, sourceCount: wide.sourceCount }, wide.item.id, wide.storyId) : null
  if (wideEntry) for (const id of [wide.item.id, ...(storyById.get(wide.storyId)?.itemIds || [])]) taken.add(id)

  // 5. Aanvullen uit de algemene editie, zonder dubbel verhaal, in jouw volgorde: wat bij je past
  //    eerst, "minder" achteraan, verder de volgorde van de server. Werd er geen breed verhaal
  //    gekozen, dan is die plek ook voor de aanvulling.
  const globalItems = new Map((global.items || []).map((i) => [i.id, i]))
  const noFavorites = { ...prof, favorites: new Set() }
  const fillTo = size - extra.length + (wideAny && !wideEntry ? 1 : 0)
  const fillCands = global.entries
    .map((g, idx) => ({ g, idx, score: sumParts(personalParts([globalItems.get(g.leadId || g.id)].filter(Boolean), noFavorites, {})) - 2 * idx }))
    .filter((x) => x.g !== bubbleEntry && unread(x.g.leadId || x.g.id, x.g.kind === 'story' ? x.g.id : null))
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
  const fill = []
  for (const { g } of fillCands) {
    if (news.length + fill.length >= fillTo) break
    const m = membersOf(g)
    if ([...m].some((id) => taken.has(id))) continue
    for (const id of m) taken.add(id)
    fill.push(withHistory({ ...g, desk: EXTERN, fromDesk: g.desk || null }, g.leadId || g.id, g.kind === 'story' ? g.id : null))
  }

  // 6. Buiten je bubbel: niet iets dat al in je Editie staat, en ook niet iets binnen je profiel
  //    (geen Ajax voor de sportlezer). Geen trend-signaal buiten je profiel? Dan het breedst gedekte
  //    verhaal in een gebied naast je sterkste interesse: "Naast je bubbel".
  const clashes = (id) => taken.has(id) || (sigAll.has(id) && [...taken].some((x) => sigAll.has(x) && sameEvent(sigAll.get(id), sigAll.get(x))))
  const topicsOfStory = (sid, id) => [...new Set((storyById.get(sid)?.itemIds || [id]).flatMap((x) => itemAny.get(x)?.topics || []))]
  let nearItem = null
  if (bubbleEntry) {
    const okB = (b) => itemAny.has(b.id) && !clashes(b.id) && unread(b.id, b.storyId) && outsideProfile(topicsOfStory(b.storyId, b.id), prof)
    // Eerst het signaal dat de algemene editie koos, dan de andere kandidaten van de server.
    const first = (global.bubble || []).find((b) => b.id === bubbleEntry.id) || { id: bubbleEntry.id }
    const alt = [first, ...(global.bubble || [])].find(okB)
    if (alt) {
      if (alt.id !== bubbleEntry.id) bubbleEntry = { kind: 'item', id: alt.id, desk: 'bubbel', terms: alt.terms }
      bubbleEntry = withHistory(bubbleEntry, alt.id, alt.storyId)
    } else {
      const home = strongestFamily(prof)
      const next = new Set(NEIGHBOURS[home] || [])
      const recent = stories
        .filter((st) => st.sourceCount >= NEAR_MIN_SOURCES && now - Date.parse(st.latestAt) < 24 * 36e5)
        .sort((a, b) => b.sourceCount - a.sourceCount || byText(a.id, b.id))
        .map((st) => ({ storyId: st.id, sourceCount: st.sourceCount, topics: topicsOfStory(st.id), item: itemAny.get(st.leadId) || st.itemIds.map((x) => itemAny.get(x)).find(Boolean) }))
      const fits = (w) => w?.item?.id && !clashes(w.item.id) && !(storyById.get(w.storyId)?.itemIds || []).some((x) => taken.has(x)) && unread(w.item.id, w.storyId) && outsideProfile(w.topics || [], prof) && (w.topics || []).some((t) => next.has(FAMILY_OF[t]))
      const pick = [...(global.near || []), ...recent].find(fits)
      bubbleEntry = pick ? withHistory({ kind: 'story', id: pick.storyId, leadId: pick.item.id, desk: 'bubbel', near: home }, pick.item.id, pick.storyId) : null
      if (pick) {
        nearItem = pick.item
        for (const id of [pick.item.id, ...(storyById.get(pick.storyId)?.itemIds || [])]) taken.add(id)
      }
    }
  }

  // 7. Volgorde: eigen nieuws, aangevuld nieuws, dan sport/cultuur; "Buiten je bubbel" op plek 6,
  //    "Waar iedereen over schrijft" direct daarna.
  const entries = [...news, ...fill, ...extra]
  if (bubbleEntry && !entries.some((e) => (e.leadId || e.id) === (bubbleEntry.leadId || bubbleEntry.id))) entries.splice(Math.min(5, entries.length), 0, bubbleEntry)
  if (wideEntry) entries.splice(Math.min(6, entries.length), 0, wideEntry)

  // Vast: de berichten zoals ze nu zijn (eigen bronnen uit de feed, aanvulling uit de algemene editie).
  const poolById = new Map(pool.map((i) => [i.id, i]))
  const wideById = new Map([...(global.wide || []).map((w) => w?.item).filter(Boolean), ...(wide ? [wide.item] : []), ...(nearItem ? [nearItem] : [])].map((i) => [i.id, i]))
  const itemOf = (id) => poolById.get(id) || wideById.get(id) || globalItems.get(id) || itemAny.get(id)

  // 8. Het waarom per plek, vast met de Editie. Gewicht en punten gaan niet mee (alleen `_parts`
  //    ter inzage, zonder getallen in de UI). Elke plek draagt alle stukken van zijn verhaal
  //    (`itemIds`) en de getoonde kop (`title`): zo weet de volgende Editie precies wat er stond.
  const srcName = new Map(sources.map((s) => [s.id, s.name]))
  const out = entries.map((e) => {
    const why = whyOf(e, { parts: e.parts || {}, sourceCount: e.sourceCount || storyById.get(e.id)?.sourceCount || 0, desk: e.desk, plannedDesk: !!e.planned, sourceName: (s) => srcName.get(s) || s })
    const { w, parts, planned, front, vervolg, ...rest } = e
    const lead = e.leadId || e.id
    const itemIds = e.kind === 'story' ? e.itemIds || storyById.get(e.id)?.itemIds || [lead] : [lead]
    return { ...rest, itemIds, title: e.title || itemOf(lead)?.title || null, why, _parts: parts || {} }
  })
  const shown = [...new Set(out.map((e) => e.leadId || e.id))]
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
    _plan: sel.deskOrder,
  }
}

// Zonder de velden ter inzage (`_parts`, `_plan`): zo gaat de Editie naar het toestel en je account.
export function withoutDebug(edition) {
  if (!edition) return edition
  const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')))
  return { ...strip(edition), entries: (edition.entries || []).map(strip) }
}

// Vingerafdruk van waaruit een editie is samengesteld: je bronnen en interesses. Een editie met
// een andere afdruk is niet (meer) de jouwe — bijvoorbeeld gemaakt op een toestel dat je
// instellingen nog niet had geladen — en wordt opnieuw samengesteld.
export function editionBasis(followed = [], interests = [], topics = [], favorites = []) {
  const parts = [[...followed].sort().join(','), [...interests].sort().join(','), [...topics].sort().join(',')]
  if (favorites.length) parts.push([...favorites].sort().join(',')) // zonder voorkeuren: dezelfde afdruk als vroeger
  const text = parts.join('|')
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0
  return h.toString(36)
}

// De invoer voor het overzicht in één minuut: per plek het getoonde bericht (met de plek erbij,
// voor de verwijzingen per blok). Zelfde vorm als briefRows op de server.
export function personalRows(edition) {
  const byId = new Map((edition?.items || []).map((i) => [i.id, i]))
  const rows = []
  ;(edition?.entries || []).forEach((e, entry) => {
    const item = byId.get(e.leadId || e.id)
    if (item) rows.push({ entry, sourceName: item.sourceName, title: item.title, summary: item.summary || '' })
  })
  return rows
}
