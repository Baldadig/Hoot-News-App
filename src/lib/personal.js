// De persoonlijke editie — pure functies (tests/personal.test.mjs).
//
// Per dagdeel (dezelfde 06:00 / 12:00 / 17:00 als de algemene editie) stellen we jouw editie
// samen uit jouw bronnen, met hetzelfde selectiewerk als de server (netlify/lib/stories.mjs):
// per rubriek het belangrijkste verhaal, één plek per gebeurtenis, afwisseling in hoofdberichten.
// Je interesses geven voorrang; de rubrieken blijven, zodat het een krant is en geen bubbel.
// Zijn er te weinig verhalen uit je eigen bronnen, dan vullen we aan uit de algemene editie
// ("Buiten je bronnen"). "Buiten je bubbel" blijft op zijn plek. Daarna ligt de editie vast.
import { selectEdition, EDITION_SIZE } from '../../netlify/lib/stories.mjs'
import { resolveTopics } from './topics.js'

export const EXTERN = 'extern' // rubriek van een aangevuld verhaal
export const WIDE = 'breed' // "Waar iedereen over schrijft"

// Extra gewicht voor wat bij je interesses past: genoeg om binnen een rubriek de doorslag te
// geven en de vrije plekken te kleuren, te weinig om echt groot nieuws te verdringen.
export const INTEREST_BONUS = 6

// Nieuws (deze rubrieken van de catalogus) vormt de editie; sport, cultuur en games komen er
// alleen bij als je die interesse hebt, hooguit twee, en nooit als hoofdverhaal: zo verdringt
// een grote sportavond het nieuws niet.
export const NEWS_CATS = new Set(['nl', 'vl', 'regio', 'int', 'economie', 'tech', 'wetenschap'])
const EXTRA_BY_INTEREST = { sport: 'sport', cultuur: 'cultuur', tech: 'games' }
export const EXTRA_MAX = 2
// Ook uit een gewone nieuwsbron (NU.nl, de Volkskrant) is een voetbalbericht sport.
const TOPIC_KIND = { voetbal: 'sport', f1: 'sport', wielrennen: 'sport', tennis: 'sport', wintersport: 'sport', olympisch: 'sport', muziek: 'cultuur', film: 'cultuur', boeken: 'cultuur', kunst: 'cultuur', games: 'games' }

export function composePersonal({ global, stories = [], items = [], sources = [], followed = new Set(), interests = [], topics = [], now = Date.now(), builtAt = new Date(now).toISOString() }) {
  if (!global?.entries?.length) return null
  const catOf = new Map(sources.map((s) => [s.id, s.cat]))
  // Soort bericht: de rubriek van de bron, tenzij het onderwerp sport, cultuur of games is.
  const kindOf = (i) => {
    const byTopic = (i.topics || []).map((t) => TOPIC_KIND[t]).find(Boolean)
    if (byTopic) return byTopic
    const cat = catOf.get(i.source)
    return !catOf.size || NEWS_CATS.has(cat) ? 'nieuws' : cat // zonder catalogus: alles als nieuws
  }
  const extraKinds = new Set(interests.map((i) => EXTRA_BY_INTEREST[i]).filter(Boolean))
  const pool = items.filter((i) => i.kind === 'article' && followed.has(i.source))
  const newsPool = pool.filter((i) => kindOf(i) === 'nieuws')
  const extraPool = pool.filter((i) => extraKinds.has(kindOf(i)))
  const mine = new Set(resolveTopics(interests, topics))
  const bonus = mine.size ? (its) => (its.some((i) => (i.topics || []).some((t) => mine.has(t))) ? INTEREST_BONUS : 0) : null

  // "Buiten je bubbel" uit de algemene editie houdt zijn plek; "Waar iedereen over schrijft"
  // krijgt er één (als er iets breed gedekts buiten je interesses is); de rest kiezen we zelf.
  const bubbleEntry = global.entries.find((e) => e.desk === 'bubbel') || null
  const outside = (w) => !mine.size || !(w.topics || []).some((t) => mine.has(t))
  const wideCands = (global.wide || []).filter(outside)
  const size = EDITION_SIZE - (bubbleEntry ? 1 : 0) - (wideCands.length ? 1 : 0)
  const extra = extraPool.length ? selectEdition(stories, extraPool, { mainIds: followed, now, size: EXTRA_MAX, bonus, strict: true }).map((e) => ({ ...e, desk: null })) : []
  // Een bericht van een vakbron (tech, economie, wetenschap) krijgt die rubriek, niet een rubriek
  // uit de tekst ("Britse fabrikant" maakte van een koptelefoonreview anders Buitenland).
  const SPECIALIST = new Set(['tech', 'economie', 'wetenschap'])
  const leadCat = (e) => catOf.get(pool.find((i) => i.id === (e.leadId || e.id))?.source)
  const news = selectEdition(stories, newsPool, { mainIds: followed, now, size: size - extra.length, bonus, strict: true }).map((e) => (SPECIALIST.has(leadCat(e)) ? { ...e, desk: leadCat(e) } : e))
  const own = [...news, ...extra]

  // Aanvullen uit de algemene editie, zonder dubbel verhaal of dubbele gebeurtenis.
  const storyById = new Map(stories.map((s) => [s.id, s]))
  const membersOf = (e) => new Set([e.leadId || e.id, ...(e.kind === 'story' ? storyById.get(e.id)?.itemIds || e.itemIds || [] : [])])
  const taken = new Set(own.flatMap((e) => [...membersOf(e)]))

  // Waar iedereen over schrijft: het breedst gedekte verhaal buiten je interesses dat niet al
  // uit je eigen bronnen komt, met een bericht van een gratis bron (zo komt het van de server).
  // Vóór het aanvullen gekozen, zodat het zijn eigen label krijgt in plaats van "Buiten je bronnen".
  const wide = wideCands.find((w) => !taken.has(w.item.id) && !(storyById.get(w.storyId)?.itemIds || []).some((id) => taken.has(id)))
  const wideEntry = wide ? { kind: 'story', id: wide.storyId, leadId: wide.item.id, desk: WIDE, sourceCount: wide.sourceCount } : null
  if (wideEntry) for (const id of [wide.item.id, ...(storyById.get(wide.storyId)?.itemIds || [])]) taken.add(id)

  // Werd er geen breed verhaal gekozen, dan is die plek voor de aanvulling.
  const fillTo = size - extra.length + (wideCands.length && !wideEntry ? 1 : 0)
  const fill = []
  for (const g of global.entries) {
    if (news.length + fill.length >= fillTo) break
    if (g === bubbleEntry) continue
    const m = membersOf(g)
    if ([...m].some((id) => taken.has(id))) continue
    for (const id of m) taken.add(id)
    fill.push({ ...g, desk: EXTERN, fromDesk: g.desk || null })
  }

  // Volgorde: eigen nieuws, aangevuld nieuws, dan sport/cultuur; "Buiten je bubbel" op plek 6,
  // "Waar iedereen over schrijft" direct daarna.
  const entries = [...news, ...fill, ...extra]
  if (bubbleEntry && !entries.some((e) => (e.leadId || e.id) === bubbleEntry.id)) entries.splice(Math.min(5, entries.length), 0, bubbleEntry)
  if (wideEntry) entries.splice(Math.min(6, entries.length), 0, wideEntry)

  // Vast: de berichten zoals ze nu zijn (eigen bronnen uit de feed, aanvulling uit de algemene editie).
  const byId = new Map([...(global.items || []).map((i) => [i.id, i]), ...(wide ? [[wide.item.id, wide.item]] : []), ...pool.map((i) => [i.id, i])])
  const shown = [...new Set(entries.map((e) => e.leadId || e.id))]
  return {
    id: global.id,
    slot: global.slot,
    date: global.date,
    next: global.next,
    personal: true,
    builtAt,
    version: `${global.id}@mine@${builtAt}`,
    basedOn: global.version || null,
    entries,
    items: shown.map((id) => byId.get(id)).filter(Boolean),
    bubble: global.bubble || [],
    brief: null,
  }
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
