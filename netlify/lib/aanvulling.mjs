// Dun is aanvullen met gratis Nederlands nieuws, pas daarna korter (frisse ogen · ronde 2, besluit 5 van Alex, 11
// november). Alleen voor de algemene Editie, op de server, na selectForReader. Een aanvulling is een eenbronsplek: een
// plek met één uitgever (een los stuk, of een verhaal van één uitgever). Die komt pas als er geen vers verhaal van
// SPREAD_MIN uitgevers meer over is (selectForReader), dus alleen als de Editie dun is. Dan:
// - eerst gratis Nederlands nieuws: NOS (ook NOS Economie), NU.nl en RTL Nieuws (FREE_FILL); nooit het betaalde ND;
// - hooguit FILL_PER_SOURCE eenbronsplek per bron (4 en 10 november ochtend hadden er zes);
// - hooguit PLACES_PER_SOURCE plekken van één bron in de hele Editie;
// - pas daarna de eenbronsstukken van de basisbronnen die de selectie al koos (NRC, de Volkskrant, The Verge …), met
//   dezelfde grenzen;
// - lukt ook dat niet, dan is de Editie eerlijk korter.
// Een gratis Nederlands stuk moet aan dezelfde toelating voldoen als een eenbronsstuk in selectForReader: een kop, een
// intro of beeld, geen opinie of liveblog, vers (TEMPO_MIN_H uur en van na de vorige Editie), niet in de vorige Editie,
// geen lid van een verhaal van meer uitgevers, toegelaten (newsRejection: geen sport of licht nieuws, buitenland binnen
// het plafond) en geen onderwerp dat al een plek heeft of in de vorige Editie stond (sameSubject, sameCluster).
import { signatures, sameSubject, sameCluster, isLive, titled } from './stories.mjs'
import { coverageOf, publisherOf, newsRejection, cappedInternational, isGallery } from '../../shared/edition-policy.mjs'
import { isOpinion } from '../../shared/article-signals.mjs'
import { TEMPO_MIN_H, INT_MAX, profileOf } from '../../shared/editor.mjs'
import { desksOf, primaryDesk } from './desks.mjs'
import { SOURCES } from './sources.mjs'

export const FREE_FILL = new Set(['nos', 'nos-economie', 'nu', 'rtl'])
export const FILL_PER_SOURCE = 1
export const PLACES_PER_SOURCE = 3
const SOURCE = new Map(SOURCES.map((s) => [s.id, s]))
const H = 36e5
const timeOf = (i) => Date.parse(i?.publishedAt) || 0

// `sel`: de plekken uit selectForReader (met `counted`: de buitenlandse plekken); `stories`: alle verhalen (om te weten of
// een stuk bij een groter verhaal hoort); `newsStories`/`newsPool`: wat de Editie mocht gebruiken; `previous`: de vorige
// Editie (previousOf). Geeft de nieuwe lijst plekken (een kopie) en zet de afvalredenen in `audit`.
export function freeDutchFill(sel, { stories = [], newsStories = stories, newsPool = [], mainIds = new Set(), now = Date.now(), previous = null, prof = profileOf(), size = 10, audit = null } = {}) {
  const byId = new Map(newsPool.map((i) => [i.id, i]))
  const storyById = new Map([...stories, ...newsStories].map((st) => [st.id, st]))
  const itemsOf = (e) => (e.kind === 'story' ? storyById.get(e.id)?.itemIds || e.itemIds || [] : [e.id]).map((id) => byId.get(id)).filter(Boolean)
  const pubsOf = (e) => (e.kind === 'story' ? storyById.get(e.id)?.publisherCount ?? coverageOf(itemsOf(e)).publisherCount : 1)
  const sourceOf = (e) => byId.get(e.leadId || e.id)?.source || null
  const keep = sel.filter((e) => pubsOf(e) >= 2)
  const single = sel.filter((e) => pubsOf(e) < 2)
  const places = new Map()
  const singles = new Map()
  const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1)
  for (const e of keep) bump(places, publisherOf(sourceOf(e)))
  const note = (e, reason) => audit?.push({ kind: e.kind, id: e.id, itemIds: e.itemIds || [e.id], reason })
  const room = (src) => {
    const p = publisherOf(src)
    return (singles.get(p) || 0) < FILL_PER_SOURCE && (places.get(p) || 0) < PLACES_PER_SOURCE
  }
  const chosen = []
  const take = (e, src) => {
    chosen.push(e)
    bump(singles, publisherOf(src))
    bump(places, publisherOf(src))
  }
  const free = (src) => FREE_FILL.has(src)
  const allowedSource = (src) => !!src && (free(src) || (mainIds.has(src) && !(SOURCE.get(src)?.paid && !SOURCE.get(src)?.base)))
  // 1. De gratis Nederlandse eenbronsplekken die de selectie al koos.
  for (const e of single.filter((x) => free(sourceOf(x)))) {
    if (keep.length + chosen.length >= size) break
    if (room(sourceOf(e))) take(e, sourceOf(e))
    else note(e, 'aanvulling-bron-vol')
  }
  // 2. Nieuwe gratis Nederlandse stukken, alleen als er nog plek is.
  if (keep.length + chosen.length < size) {
    const since = previous?.at || 0
    const storyOfItem = new Map(stories.flatMap((st) => (st.itemIds || []).map((id) => [id, st])))
    const inEdition = new Set([...keep, ...single].flatMap((e) => [e.id, e.leadId, ...itemsOf(e).map((i) => i.id)]).filter(Boolean))
    const cands = newsPool
      // Eerst de goedkope voorwaarden (bron, tijd), dan de rest.
      .filter((it) => free(it.source) && it.kind === 'article' && !inEdition.has(it.id) && now - timeOf(it) < TEMPO_MIN_H * H && timeOf(it) <= now && timeOf(it) > since && !previous?.itemIds?.has(it.id))
      .filter((it) => titled(it) && !isOpinion(it) && it.type !== 'opinie' && !isLive(it) && !isGallery(it) && !/\?/.test(it.title) && (it.summary || it.image))
      .filter((it) => { const st = storyOfItem.get(it.id); return !st || (st.publisherCount ?? coverageOf((st.itemIds || []).map((id) => byId.get(id)).filter(Boolean)).publisherCount) < 2 })
      .sort((a, b) => timeOf(b) - timeOf(a) || (a.id < b.id ? -1 : 1))
    if (cands.length) {
      const prevShown = previous?.shown?.length ? previous.shown : [...(previous?.titles || [])].map((title) => ({ title, publishedAt: new Date(previous.at || now).toISOString() }))
      const prevArts = prevShown.map((a, k) => ({ ...a, id: `vorige:${k}` }))
      // De kenmerken van selectForReader (zelfde pool, zelfde vorige koppen); alleen zonder die opnieuw rekenen.
      const sig = sel.sig || signatures(newsPool, prevArts)
      const vorige = prevArts.map((a) => sig.get(a.id)).filter(Boolean)
      const placedSigs = () => [...keep, ...chosen].flatMap((e) => itemsOf(e).map((i) => sig.get(i.id))).filter(Boolean)
      const counted = new Set(sel.counted || [])
      let world = [...keep, ...chosen].filter((e) => counted.has(e.id)).length
      for (const it of cands) {
        if (keep.length + chosen.length >= size) break
        if (!room(it.source)) continue
        const desk = primaryDesk([desksOf(it)])
        if (newsRejection(prof, { sourceCount: 1 }, [it], desk) !== null) continue
        const capped = cappedInternational(prof, [it], desk, null)
        if (capped && world >= INT_MAX) continue
        const s = sig.get(it.id)
        if (s && (vorige.some((v) => sameSubject(s, v)) || placedSigs().some((p) => sameSubject(s, p)))) continue
        // Eén onderwerp op één dag, één plek (sameCluster): ook geen aanvulling over een onderwerp dat al een plek heeft.
        if ([...keep, ...chosen].some((e) => sameCluster(sig, [it], itemsOf(e)))) continue
        take({ kind: 'item', id: it.id, itemIds: [it.id], title: it.title || null, desk, aanvulling: 'gratis-nl' }, it.source)
        if (capped) world++
      }
    }
  }
  // 3. Pas daarna de andere eenbronsplekken die de selectie koos (basisbronnen), met dezelfde grenzen.
  for (const e of single.filter((x) => !free(sourceOf(x)))) {
    const src = sourceOf(e)
    if (keep.length + chosen.length >= size) { note(e, 'aanvulling-gratis-nl-eerst'); continue }
    if (!allowedSource(src)) note(e, 'aanvulling-niet-uit-deze-bron')
    else if (!room(src)) note(e, 'aanvulling-bron-vol')
    else take(e, src)
  }
  // Eerst de verhalen van meer uitgevers in de volgorde van de selectie (gewicht), dan de aanvulling in de volgorde
  // waarin ze gekozen werd: gratis Nederlands eerst.
  const out = [...keep, ...chosen]
  return Object.assign(out, { deskOrder: sel.deskOrder, abroad: sel.abroad, counted: sel.counted })
}

// De ochtend licht aanvullen (frisse ogen · ronde 3, punt 8; besluit van Alex, 11 november: de Ochtendeditie op een vast
// moment vastleggen en de ochtend licht aanvullen). De Ochtendeditie ligt vast vanaf de start van de ochtend. Is ze dan
// korter dan tien plekken (dun: er was nog te weinig), dan mag de server in de rest van de ochtend hooguit
// OCHTEND_AANVULLING plekken aan het eind toevoegen, met gratis Nederlands nieuws dat sindsdien verscheen (NOS, NU.nl,
// RTL), met precies dezelfde eisen als freeDutchFill (stap 2). Wat er staat, verandert nooit: geen andere kop, geen
// andere volgorde, niets eruit; de bubbelplek blijft de laatste. `entries`: de vastgelegde plekken; `done`: hoeveel er al
// bij kwamen. Geeft de nieuwe plekken (hooguit zoveel als er ruimte is).
export const OCHTEND_AANVULLING = 2
export function morningTopUp(entries = [], { stories = [], newsStories = stories, newsPool = [], mainIds = new Set(), now = Date.now(), previous = null, prof = profileOf(), size = 10, done = 0, max = OCHTEND_AANVULLING } = {}) {
  const regular = entries.filter((e) => e.desk !== 'bubbel')
  const bubble = entries.filter((e) => e.desk === 'bubbel')
  const room = Math.min(size - regular.length, max - done)
  if (room <= 0) return []
  const have = new Set([...regular, ...bubble].flatMap((e) => [e.id, e.leadId]).filter(Boolean))
  const bubbleStories = new Set(bubble.map((e) => newsPool.find((i) => i.id === (e.leadId || e.id))?.storyId).filter(Boolean))
  const out = freeDutchFill(regular.map((e) => ({ ...e })), { stories, newsStories, newsPool, mainIds, now, previous, prof, size })
  return out.filter((e) => e.aanvulling === 'gratis-nl' && !have.has(e.id) && !bubbleStories.has(newsPool.find((i) => i.id === e.id)?.storyId)).slice(0, room)
}
