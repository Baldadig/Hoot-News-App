import { withCleanIntro } from '../../shared/edition-display.mjs'
import { EDITION_AUDIT_BELOW, EDITION_FLOOR, editionStoryCount, majorNews, internationalNews, newsRejection, allowedNews, cappedInternational, worldChosen, sportChosen, exceptionalDutchSport, coverageOf } from '../../shared/edition-policy.mjs'
import { EDITOR_REVISION } from '../../shared/editor-version.mjs'
// De persoonlijke editie — pure functies (tests/personal.test.mjs, tests/compose.test.mjs).
//
// Per dagdeel (ochtend, middag en vroege avond, gelijk met de algemene editie) stelt De Redacteur
// jouw Editie samen uit jouw bronnen (Hoot-design/algoritme/bouwspec.md §4). Het profiel (shared/editor.mjs)
// komt uit je keuzes, meer/minder en wat je opent en bewaart; de selectie (selectForReader in
// netlify/lib/stories.mjs) zet eerst de voorpagina, voor iedereen gelijk, dan jouw rubrieken, dan wat
// het zwaarst weegt. Zijn er te weinig verhalen uit je eigen bronnen, dan vullen we aan uit de
// algemene editie ("Buiten je bronnen"). "Buiten je bubbel" ligt echt buiten je profiel, en "Waar
// iedereen over schrijft" is het brede verhaal dat het minst bij je past. Elke plek krijgt een
// waarom. Uitvoer = f(invoer): `now` is de start van het dagdeel, en er is geen toeval.
//
// Rekenregels als in shared/editor.mjs (web en iOS moeten bit-gelijk uitkomen): alleen + − × ÷,
// Math.round/min/max/floor en Date.parse; elke sortering heeft een totale vergelijker.
import { selectForReader, EDITION_SIZE, signatures, sameEvent, sameSubject, seenBefore, developedSince, recentEditions } from '../../netlify/lib/stories.mjs'
import { deskOfStory, storyForeignOf, VL_HOME } from '../../netlify/lib/desks.mjs'
import { trustedTopics, OTHER_SPORT } from '../../netlify/lib/topics.mjs'
import { INTERESTS } from './topics.js'
import { forEdition } from '../../shared/stroom.mjs'
import { supplyOf, profileOf, personalParts, sumParts, tempoWindows, outsideProfile, strongestFamily, whyOf, isSport, NEIGHBOURS, FAMILY_OF, INT_MAX, chosenDesks, KERN, KERN_MIN } from '../../shared/editor.mjs'

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

// De onderwerpen zoals de lezer ze kan nagaan (trustedTopics in netlify/lib/topics.mjs): een server van
// vóór de laatste trefwoorden levert nog "angst" als Brein en "meldt Omroep Zeeland" als Media. Een kopie
// alleen als er iets verandert, en één keer per bericht (de rubriek per bericht wordt ook onthouden).
const trusted = new WeakMap()
export function withTrustedTopics(it) {
  if (!it || typeof it !== 'object' || !it.topics) return it
  let c = trusted.get(it)
  if (!c) {
    const t = trustedTopics(it)
    trusted.set(it, (c = t === it.topics ? it : { ...it, topics: t }))
  }
  return c
}

// De verhalen zoals deze lezer ze ziet. `ownCount` telt de verschillende bronnen in het verhaal
// die jij volgt (de server telt Hoots basisbronnen): zo krijgt een verhaal dat van jouw bronnen
// alleen Carbon Brief brengt toch de begrensde bijdrage voor gekozen bronnen in weight(). De rubriek (`desk`) zet de
// server uit alle berichten en is voor iedereen gelijk; een oudere server leverde hem nog niet,
// dan rekenen we hem hier uit dezelfde berichten uit (`all`: alles wat we van het verhaal hebben).
// `nlCount`: hoeveel van de bronnen Nederlandstalig zijn (niet Vlaams), uit `sourceNames` en de
// catalogus (`sources`); alleen voor een Nederlandse voorpagina als Wereld niet gekozen is. Het nieuwsgewicht telt elke bron gelijk.
export function storiesForReader(stories = [], items = [], followed = new Set(), all = items, sources = []) {
  const ownSource = new Map()
  for (const i of items) if (followed.has(i.source)) ownSource.set(i.id, i.source)
  let byId = null
  const deskOf = (st) => {
    byId ||= new Map(all.map((i) => [i.id, i]))
    return deskOfStory(st.itemIds.map((id) => byId.get(id)).filter(Boolean))
  }
  const homeOf = (st) => {
    byId ||= new Map(all.map((i) => [i.id, i]))
    return coverageOf(st.itemIds.map((id) => byId.get(id)).filter(Boolean)).publisherCountries.some((c) => c === 'NL' || c === 'BE')
  }
  const dutch = new Set(sources.filter((s) => s.lang === 'nl' && !VL_HOME.has(s.id)).map((s) => s.name))
  return stories.map((st) => ({
    ...st,
    ownCount: new Set(st.itemIds.map((id) => ownSource.get(id)).filter(Boolean)).size,
    desk: st.desk !== undefined ? st.desk : deskOf(st),
    ...(st.nlCount === undefined && dutch.size && st.sourceNames ? { nlCount: st.sourceNames.filter((n) => dutch.has(n)).length } : {}),
    // Brengt een Nederlandse of Vlaamse uitgever dit verhaal (internationalNews)? Een oudere server levert
    // `publisherCountries` niet; dan uit alles wat we van het verhaal hebben, niet alleen je eigen bronnen.
    ...(st.publisherCountries === undefined ? { homeCovered: homeOf(st) } : {}),
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
  // Wat alleen in de Stroom hoort (streamOnly) telt niet mee: De Redacteur rekent met het oude venster
  // per bron, ook op het toestel (shared/stroom.mjs).
  items = items.filter(forEdition).map(withCleanIntro).map(withTrustedTopics)
  global = { ...global, items: (global.items || []).map(withCleanIntro).map(withTrustedTopics), wide: (global.wide || []).map((w) => (w?.item ? { ...w, item: withTrustedTopics(withCleanIntro(w.item)) } : w)) }
  const catOf = new Map(sources.map((s) => [s.id, s.cat]))
  // Soort bericht: de rubriek van de bron, tenzij het onderwerp sport, cultuur of games is.
  const kindOf = (i) => {
    if (isSport(i, catOf)) return 'sport' // darts heeft geen onderwerp (en Netflix maakt het geen film)
    const byTopic = (i.topics || []).map((t) => TOPIC_KIND[t]).find(Boolean)
    if (byTopic) return byTopic
    const cat = catOf.get(i.source)
    return !catOf.size || NEWS_CATS.has(cat) ? 'nieuws' : cat // zonder catalogus: alles als nieuws
  }
  const pool = items.filter((i) => i.kind === 'article' && followed.has(i.source))

  // 1. Profiel, tempo per bron en de rubriek per verhaal (voor iedereen gelijk).
  const prof = profileOf({ interests, topics, affinity, taste, favorites, followed, sources, supply: supplyOf(pool) })
  const tempo = tempoWindows(items.filter((i) => followed.has(i.source)))
  const mineStories = storiesForReader(stories, items, followed, [...items, ...(global.items || [])], sources)
  const storyDesk = new Map(mineStories.map((st) => [st.id, st.desk]))
  // Alles wat het toestel kent (eigen bronnen plus de algemene Editie), met kenmerken: voor de
  // bubbel en voor "ontwikkeld sinds je vorige Editie" (developedSince).
  const itemAny = new Map([...items, ...(global.items || []), ...[...(global.wide || []), ...(global.near || [])].map(w=>w?.item).filter(Boolean)].map((i) => [i.id, i]))
  const sigAll = signatures([...itemAny.values()].filter((i) => i.kind !== 'post'))
  // `own`: al je eigen berichten, zodat de punten van een verhaal ook tellen wat je ervan leest in
  // sport of cultuur (de dood van Patrick Stewart is Film voor wie Cultuur koos).
  const ctx = { readIds, tempo, storyDesk, known: itemAny, sigKnown: sigAll, own: new Map(pool.map((i) => [i.id, i])) }
  const seed = `${editionBasis([...followed], interests, topics, favorites)}|${global.id}`

  // 2. Het extra blok: sport en cultuur als dat gebied sterk genoeg in je profiel zit (ook uit
  //    lezen); games alleen als je dat onderwerp scherp koos of las, niet geërfd van Tech (wie Tech
  //    kiest, bedoelt meestal AI en technologie).
  const tech = INTERESTS.find((f) => f.id === 'tech')?.topics || []
  const gamesSharp = interests.includes('tech') && topics.includes('games') && !tech.every((t) => topics.includes(t))
  const gamesOk = (prof.topicP.games || 0) >= EXTRA_MIN && (gamesSharp || prof.origin.games === 'geleerd')
  const extraKinds = new Set([...(sportChosen(prof) ? ['sport'] : []), ...((prof.family.cultuur || 0) >= EXTRA_MIN ? ['cultuur'] : []), ...(gamesOk ? ['games'] : [])])
  const storyById = new Map(stories.map(s => [s.id, s]))
  const storyByItem = new Map(stories.flatMap(s => s.itemIds.map(id => [id, s])))
  const newsPool = pool.filter(i => kindOf(i) === 'nieuws' || (!sportChosen(prof) && exceptionalDutchSport(storyByItem.get(i.id) || {}, [i])))
  const extraPool = pool.filter((i) => extraKinds.has(kindOf(i)))

  // "Buiten je bubbel" uit de algemene editie houdt een plek; "Waar iedereen over schrijft" krijgt
  // er één zodra er een breed verhaal is dat je eigen bronnen niet al brengen. Schrijft een van je
  // bronnen er al over, dan geen gratis bron van buiten ervoor in de plaats. Groot nieuws (vanaf
  // acht uitgevers of vijf uit twee landen) kan met het stuk uit je eigen
  // bron als kop (`wideLead`), in de plaats van je lichtste plek: de Nederlandse voorpagina laat niet
  // al het grote nieuws toe (selectForReader).
  let bubbleEntry = global.entries.find((e) => e.desk === 'bubbel') || null
  const ownIds = new Set(items.filter((i) => followed.has(i.source)).map((i) => i.id))
  const covered = (w) => ownIds.has(w.item.id) || (storyById.get(w.storyId)?.itemIds || []).some((id) => ownIds.has(id))
  const bigWide = w => majorNews(storyById.get(w.storyId) || w, [w.item])
  const wideLead = (w) => (covered(w) ? itemAny.get([w.item.id, ...(storyById.get(w.storyId)?.itemIds || [])].find((id) => ownIds.has(id))) : w.item)

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
  // Eén harde norm voor eigen nieuws, breed nieuws, bubbel en serveraanvulling.
  const capAbroad = !worldChosen(prof)
  const policyOf = (id, sid, entry = {}) => {
    const st = storyById.get(sid || storyOfItem.get(id))
    const members = [...new Set([id, ...(st?.itemIds || []), ...(entry.itemIds || [])])].map(x => itemAny.get(x)).filter(Boolean)
    const meta = st || entry
    const desk = st?.desk ?? entry.fromDesk ?? entry.desk ?? null
    // Buiten je bubbel (de plek zelf of een kandidaat ervoor) mag licht zijn; zie newsRejection.
    const bubble = entry.desk === 'bubbel' || entry.bubble === true
    const reason = newsRejection(prof, meta, members, desk, { bubble })
    return { allowed: reason === null, reason, abroad: internationalNews(members, desk, meta), capped: cappedInternational(prof,members,desk,meta), members, meta, desk }
  }
  const unchosenAbroad = (id, sid) => capAbroad && policyOf(id, sid).capped
  const eligible = (id, sid, entry = {}) => {
    const p = policyOf(id, sid, entry)
    return p.allowed && (!capAbroad || !p.capped || abroad < INT_MAX)
  }
  const wideAny = (global.wide || []).some(w => w?.item?.id && !covered(w) && unread(w.item.id, w.storyId))
  const size = EDITION_SIZE - (wideAny ? 1 : 0)
  const opts = { mainIds: followed, now, previous, preferred, prof, ctx, seed }
  // Het extra blok kiest er een paar meer, zodat een verhaal dat het nieuws al heeft (de dood van een
  // acteur, met een stuk van NOS Cultuur) er niet twee keer in staat.
  const extraAll = extraPool.length ? selectForReader(mineStories, extraPool, { ...opts, size: 2 * EXTRA_MAX, plan: false }) : []
  const extraN = Math.min(EXTRA_MAX, extraAll.length)

  // 3. Het nieuws, met jouw indeling. Een plek buiten de indeling en de voorpagina met een kop van
  //    een vakbron krijgt de rubriek van die bron.
  const leadCat = (e) => catOf.get(pool.find((i) => i.id === (e.leadId || e.id))?.source)
  const sel = selectForReader(mineStories, newsPool, { ...opts, size: size - extraN })
  const news = sel.map((e) => {
    const review = /^(review|test)\s*:/i.test(pool.find(i=>i.id === (e.leadId || e.id))?.title || '')
    return SPECIALIST.has(leadCat(e)) && (review || (!e.planned && !e.front)) ? {...e,desk:leadCat(e)} : e
  })
  const inNews = new Set(news.flatMap((e) => e.itemIds || [e.id]))
  // Elke internationale plek telt tegen de grens, ook met een persoonlijke reden.
  let abroad = sel.counted.size
  const extra = []
  for (const e of extraAll) {
    if (extra.length >= extraN) break
    if ((e.itemIds || [e.id]).some((id) => inNews.has(id))) continue
    // Een extra plek gebruikt hetzelfde toelatingscriterium en telt mee voor het plafond.
    const un = unchosenAbroad(e.leadId || e.id, e.kind === 'story' ? e.id : null)
    if (!eligible(e.leadId || e.id, e.kind === 'story' ? e.id : null, e)) continue
    if (un) abroad++
    extra.push({ ...e, desk: null })
  }
  const own = [...news, ...extra]
  // De berichten van een plek: het verhaal zoals het toestel het nu kent én zoals de algemene Editie het
  // vastlegde (`itemIds`), want de server kan een gebeurtenis sindsdien anders gebundeld hebben (feedback 31
  // oktober: de rubberboot bij Breskens stond als twee verhalen in één Editie, die via de algemene Editie
  // twee Vlaamse stukken deelden).
  // Een los bericht uit de algemene Editie kan bij een verhaal horen dat hier al staat (`formerId`, of
  // het verhaal van het bericht volgens de server): dan zijn de berichten van dat verhaal ook bezet.
  const serverStory = (e) => (e.kind === 'story' ? null : e.formerId || itemAny.get(e.leadId || e.id)?.storyId || null)
  const membersOf = (e) => new Set([e.leadId || e.id, ...(e.kind === 'story' ? [...(storyById.get(e.id)?.itemIds || []), ...(e.itemIds || [])] : storyById.get(serverStory(e))?.itemIds || [])])
  const taken = new Set(own.flatMap((e) => [...membersOf(e)]))
  // Ook zonder gedeeld bericht geen tweede plek over hetzelfde onderwerp (sameSubject, zoals selectForReader):
  // de koppen van wat er al staat.
  const leads = own.map((e) => e.leadId || e.id)
  const sameAsPlaced = (id) => sigAll.has(id) && leads.some((x) => x !== id && sigAll.has(x) && sameSubject(sigAll.get(id), sigAll.get(x)))

  // 4. Waar iedereen over schrijft: bij voorkeur de eerste (in de volgorde van de server) buiten je
  //    profiel; anders het minst passende vrije verhaal (laagste fit, dan de meeste bronnen).
  //    Vóór het aanvullen gekozen, zodat het zijn eigen label krijgt in plaats van "Buiten je bronnen".
  const fitOf = (w) => Math.max(0, ...(w.topics || []).map((t) => Math.max(prof.topicP[t] || 0, prof.shareOf[t] || 0)))
  const free = (w) => w?.item?.id && eligible(w.item.id, w.storyId, w) && !taken.has(w.item.id) && !sameAsPlaced(w.item.id) && !sameAsPlaced(wideLead(w)?.id) && !(storyById.get(w.storyId)?.itemIds || []).some((id) => taken.has(id)) && (!covered(w) || bigWide(w)) && unread(w.item.id, w.storyId)
  //    Groot nieuws dat er nog niet in staat, gaat voor (zie hierboven), ook daar eerst buiten je profiel.
  const wide0 =
    (global.wide || []).find((w) => free(w) && bigWide(w) && outsideProfile(w.topics, prof)) ||
    (global.wide || []).find((w) => free(w) && bigWide(w)) ||
    (global.wide || []).find((w) => free(w) && outsideProfile(w.topics, prof)) ||
    (global.wide || []).filter(free).sort((a, b) => fitOf(a) - fitOf(b) || b.sourceCount - a.sourceCount || byText(a.storyId, b.storyId))[0]
  let wide = wide0 ? { ...wide0, item: wideLead(wide0) } : null
  // Geen plek vrijgehouden (je bronnen brengen al het brede nieuws), maar wel groot nieuws dat ontbreekt:
  // dan ruilt je lichtste plek ervoor (niet de voorpagina, niet ander groot nieuws).
  let swapped = 0
  if (wide && !wideAny) {
    // Niet de enige plek van een kernrubriek als de Editie er dan te weinig heeft (een krant, geen bubbel).
    const kernOf = (es) => new Set(es.map((x) => x.desk).filter((d) => KERN.includes(d))).size
    const keepsKern = (e) => kernOf(news.filter((x) => x !== e)) >= Math.min(KERN_MIN, kernOf(news))
    const light = news.map((e, i) => ({ e, i })).filter(({ e }) => !e.front && !majorNews(storyById.get(e.id) || e, (e.itemIds || [e.leadId || e.id]).map(id => itemAny.get(id)).filter(Boolean)) && keepsKern(e)).sort((a, b) => a.e.w - b.e.w || byText(b.e.id, a.e.id))[0]
    if (light) {
      news.splice(light.i, 1)
      // Alleen wat geen andere plek nog heeft, komt vrij: twee plekken kunnen een bericht delen.
      taken.clear()
      for (const e of [...news, ...extra]) for (const id of membersOf(e)) taken.add(id)
      const li = leads.indexOf(light.e.leadId || light.e.id)
      if (li >= 0) leads.splice(li, 1)
      if (sel.counted.has(light.e.id)) abroad--
      swapped = 1
    } else wide = null // geen plek om te ruilen
  }
  const wideEntry = wide ? withHistory({ kind: 'story', id: wide.storyId, leadId: wide.item.id, desk: WIDE, sourceCount: wide.sourceCount, ...(bigWide(wide) ? { big: true } : {}) }, wide.item.id, wide.storyId) : null
  if (wideEntry) {
    if (unchosenAbroad(wide.item.id, wide.storyId)) abroad++
    for (const id of [wide.item.id, ...(storyById.get(wide.storyId)?.itemIds || [])]) taken.add(id)
    leads.push(wide.item.id)
  }

  // 5. Aanvullen uit de algemene editie, zonder dubbel verhaal, in jouw volgorde: wat bij je past
  //    eerst, "minder" achteraan, verder de volgorde van de server. Werd er geen breed verhaal
  //    gekozen, dan is die plek ook voor de aanvulling.
  const globalItems = new Map((global.items || []).map((i) => [i.id, i]))
  const noFavorites = { ...prof, favorites: new Set() }
  // Een gereserveerde plek die leeg blijft (geen toegelaten breed verhaal of bubbelstuk) gaat eerst naar
  // toegelaten eigen nieuws (stap 8), pas daarna naar de algemene Editie: zo blijft de Editie van jou.
  const fillTo = size - extra.length - swapped
  const supplementReason = g => {
    const id = g.leadId || g.id, sid = g.kind === 'story' ? g.id : null
    const p = policyOf(id,sid,g)
    if (!p.allowed) return null
    const it = itemAny.get(id)
    if (!it || !(now - Date.parse(it.publishedAt) >= 0) || now - Date.parse(it.publishedAt) >= 24 * 36e5) return null
    if (majorNews(p.meta,p.members)) return 'groot'
    if (worldChosen(prof) && p.abroad && kindOf(it) === 'nieuws') return 'passend'
    const hit = personalParts(p.members,prof,{}, {desk:p.desk,foreign:p.abroad}).interest
    if (hit && hit.shown !== false && hit.cov >= 0.5 && hit.pts > 0 && !hit.t.startsWith('bron:')) return 'passend'
    if (followed.has(it.source) && kindOf(it) === 'nieuws') return 'eigen'
    if (!interests.length && !topics.length && !p.abroad && ['binnenland','regio'].includes(p.desk)) return 'basis'
    return null
  }
  const otherPool = [...(global.wide || []), ...(global.near || [])].filter(w=>w?.item?.id).map(w=>({kind:'story',id:w.storyId,leadId:w.item.id,desk:storyById.get(w.storyId)?.desk ?? null,sourceCount:w.sourceCount}))
  const supplementPool = [...new Map([...global.entries,...otherPool].map(g=>[`${g.kind}:${g.id}`,g])).values()]
  const fillCands = supplementPool
    .map((g, idx) => ({ g, idx, score: sumParts(personalParts([itemAny.get(g.leadId || g.id)].filter(Boolean), noFavorites, {}, { desk: g.desk })) - 2 * idx }))
    .filter((x) => supplementReason(x.g) && x.g !== bubbleEntry && unread(x.g.leadId || x.g.id, x.g.kind === 'story' ? x.g.id : null))
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
  // Ook serveraanvulling houdt dezelfde harde grens, ongeacht een persoonlijke reden.
  const fill = []
  // Een aangevuld verhaal is niet vrij van de grens als de lezer zijn rubriek niet koos: een wetenschapsverhaal
  // over Pompeï is buitenland zonder reden (feedback 31 oktober); de berichten zeggen of het buitenland is.
  const unchosenG = g => capAbroad && policyOf(g.leadId || g.id, g.kind === 'story' ? g.id : null, g).capped
  const fillUp = (to) => {
    for (const { g } of fillCands) {
      if (news.length + fill.length >= to) break
      const m = membersOf(g)
      if ([...m].some((id) => taken.has(id)) || sameAsPlaced(g.leadId || g.id)) continue
      const gi = unchosenG(g)
      if (!eligible(g.leadId || g.id, g.kind === 'story' ? g.id : null, g)) continue
      for (const id of m) taken.add(id)
      leads.push(g.leadId || g.id)
      if (gi) abroad++
      fill.push(withHistory({ ...g, desk: EXTERN, fromDesk: g.desk || null, supplement: supplementReason(g) }, g.leadId || g.id, g.kind === 'story' ? g.id : null))
    }
  }
  fillUp(fillTo)

  // 6. Buiten je bubbel: niet iets dat al in je Editie staat, en ook niet iets binnen je profiel
  //    (geen Ajax voor de sportlezer). Geen trend-signaal buiten je profiel? Dan het breedst gedekte
  //    verhaal in een gebied naast je sterkste interesse: "Naast je bubbel".
  const clashes = (id) => taken.has(id) || (sigAll.has(id) && [...taken].some((x) => sigAll.has(x) && sameEvent(sigAll.get(id), sigAll.get(x))))
  const topicsOfStory = (sid, id) => [...new Set((storyById.get(sid)?.itemIds || [id]).flatMap((x) => itemAny.get(x)?.topics || []))]
  let nearItem = null
  if (bubbleEntry) {
    // Zonder Wereld geen buitenlands bubbelstuk (feedback 31 oktober: Seedorf bij Corinthians, Braziliaans
    // voetbal, ook voor wie alleen Binnenland koos): dan het volgende signaal, of "Naast je bubbel".
    const okB = (b) => itemAny.has(b.id) && eligible(b.id, b.storyId, { ...b, bubble: true }) && !clashes(b.id) && unread(b.id, b.storyId) && outsideProfile(topicsOfStory(b.storyId, b.id), prof) && !(abroad >= INT_MAX && unchosenAbroad(b.id, b.storyId))
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
      const fits = (w) => w?.item?.id && eligible(w.item.id, w.storyId, { ...w, bubble: true }) && !clashes(w.item.id) && !(storyById.get(w.storyId)?.itemIds || []).some((x) => taken.has(x)) && unread(w.item.id, w.storyId) && outsideProfile(w.topics || [], prof) && (w.topics || []).some((t) => next.has(FAMILY_OF[t])) && !(abroad >= INT_MAX && unchosenAbroad(w.item.id, w.storyId))
      const pick = [...(global.near || []), ...recent].find(fits)
      bubbleEntry = pick ? withHistory({ kind: 'story', id: pick.storyId, leadId: pick.item.id, desk: 'bubbel', near: home }, pick.item.id, pick.storyId) : null
      if (pick) {
        nearItem = pick.item
        for (const id of [pick.item.id, ...(storyById.get(pick.storyId)?.itemIds || [])]) taken.add(id)
      }
    }
  }

  // Geen bubbelstuk gevonden: dan vult de algemene Editie die plek, zodat er altijd tien staan.
  if (bubbleEntry) taken.add(bubbleEntry.leadId || bubbleEntry.id)

  // 7. Volgorde: eigen nieuws, aangevuld nieuws, dan sport/cultuur; "Buiten je bubbel" op plek 6,
  //    "Waar iedereen over schrijft" direct daarna.
  let entries = [...news, ...fill, ...extra]
  if (wideEntry) entries.splice(Math.min(6, entries.length), 0, wideEntry)

  // Vul vrijgevallen gereserveerde plekken met toegelaten eigen nieuws; de norm wijkt niet
  // voor een vaste lengte. Bij onvoldoende geschikt aanbod blijft de Editie eerlijk korter.
  const finalTaken = new Set()
  const finalLeads = []
  let internationalCount = 0
  const accepted = []
  let capacity = EDITION_SIZE
  // De vloer (EDITION_FLOOR): haalt de Editie die niet met nieuws, dan mag een licht stuk buiten je
  // interesses (games, cultuur, lifestyle, consumententech) de laatste plekken vullen, en alleen dat: sport,
  // het internationale plafond en de rest van de normen wijken nooit.
  let floorLight = false
  const accept = e => {
    if (accepted.length >= capacity) return
    const id = e.leadId || e.id
    const p = policyOf(id, e.kind === 'story' ? e.id : null, e)
    const ids = [...membersOf(e)]
    if (ids.some(x => finalTaken.has(x)) || (sigAll.has(id) && finalLeads.some(x => sigAll.has(x) && sameSubject(sigAll.get(id), sigAll.get(x))))) return
    const allowed = p.allowed || (floorLight && p.reason === 'licht-buiten-interesse')
    if (!allowed || (capAbroad && p.capped && internationalCount >= INT_MAX)) return
    if (p.capped) internationalCount++
    ids.forEach(x => finalTaken.add(x))
    finalLeads.push(id)
    accepted.push(e)
  }
  entries.forEach(accept)
  if (accepted.length < EDITION_SIZE) selectForReader(mineStories, newsPool, { ...opts, size: EDITION_SIZE }).forEach(accept)
  // Dan pas aanvullen uit de algemene Editie, met dezelfde toelating en zonder dubbel verhaal.
  for (const { g } of fillCands) {
    if (accepted.length >= EDITION_SIZE) break
    accept(withHistory({ ...g, desk: EXTERN, fromDesk: g.desk || null, supplement: supplementReason(g) }, g.leadId || g.id, g.kind === 'story' ? g.id : null))
  }
  if (accepted.length < EDITION_FLOOR) {
    floorLight = true
    capacity = EDITION_FLOOR
    selectForReader(mineStories, newsPool, { ...opts, size: EDITION_SIZE, allowLight: true }).forEach(accept)
    floorLight = false
  }
  // Pas na hooguit tien gewone plekken: één optionele bubbel, met dezelfde inhouds- en dubbelgrenzen.
  if (bubbleEntry) { capacity = accepted.length + 1; accept(bubbleEntry) }
  entries = accepted
  // Binnenland blijft de opening, ook bij een combinatie met Wereld en bij serveraanvulling.
  if (prof.interests.has('binnenland')) {
    const first = entries.findIndex(e => {
      const p = policyOf(e.leadId || e.id, e.kind === 'story' ? e.id : null, e)
      return e.desk !== 'bubbel' && !p.abroad && ['binnenland','regio'].includes(p.desk)
    })
    if (first > 0) entries.unshift(...entries.splice(first, 1))
  }

  // Vast: de berichten zoals ze nu zijn (eigen bronnen uit de feed, aanvulling uit de algemene editie).
  const poolById = new Map(pool.map((i) => [i.id, i]))
  const wideById = new Map([...(global.wide || []).map((w) => w?.item).filter(Boolean), ...(wide ? [wide.item] : []), ...(nearItem ? [nearItem] : [])].map((i) => [i.id, i]))
  const itemOf = (id) => poolById.get(id) || wideById.get(id) || globalItems.get(id) || itemAny.get(id)

  // 8. Het waarom per plek, vast met de Editie. Gewicht en punten gaan niet mee (alleen `_parts`
  //    ter inzage, zonder getallen in de UI). Elke plek draagt alle stukken van zijn verhaal
  //    (`itemIds`), de getoonde kop (`title`) en de kenmerken van het hele verhaal (`keys`, van de
  //    server, over alle bronnen): zo weet de volgende Editie precies wat er stond, ook wat dit
  //    toestel zelf niet kent (developedSince).
  const srcName = new Map(sources.map((s) => [s.id, s.name]))
  const mineDesks = chosenDesks(prof) // "Jouw rubriek" alleen voor een rubriek die bij je keuzes hoort
  const out = entries.map((e) => {
    let why = whyOf(e, { parts: e.parts || {}, sourceCount: e.sourceCount || storyById.get(e.id)?.sourceCount || 0, desk: e.desk, plannedDesk: !!e.planned && mineDesks.has(e.desk), sourceName: (s) => srcName.get(s) || s })
    if (e.supplement && !e.vervolg) {
      const p = policyOf(e.leadId || e.id,e.kind === 'story' ? e.id : null,e)
      const hit = personalParts(p.members,prof,{}, {desk:p.desk,foreign:p.abroad}).interest
      const family = INTERESTS.find(x=>x.id === hit?.f)?.label || (worldChosen(prof) ? 'Wereld' : 'je interesses')
      const reasons = {groot:`Groot nieuws · ${p.meta.publisherCount || p.meta.sourceCount || e.sourceCount || 1} bronnen`,passend:`Aanvulling bij ${family}`,basis:'Actueel nieuws uit Nederland',eigen:'Uit je gekozen bronnen'}
      if (reasons[e.supplement]) why = {...why,text:reasons[e.supplement],detail:true}
    }
    const { w, parts, planned, front, vervolg, big, ...rest } = e
    const lead = e.leadId || e.id
    const itemIds = e.kind === 'story' ? e.itemIds || storyById.get(e.id)?.itemIds || [lead] : [lead]
    const keys = e.kind === 'story' ? e.keys || storyById.get(e.id)?.keys : null
    return { ...rest, itemIds, ...(keys ? { keys } : {}), title: e.title || itemOf(lead)?.title || null, why, _parts: parts || {}, _front: !!front }
  })
  // Bij een korte Editie geen blinde minimumverlaging: elke bekende kandidaat krijgt een
  // terminale reden uit dezelfde selectieroute. Dit is lokaal debugbewijs, geen accountpayload.
  let supply = null
  const regularCount = editionStoryCount(out)
  if (regularCount < EDITION_AUDIT_BELOW) {
    const decisions = []
    selectForReader(mineStories, newsPool, { ...opts, size: EDITION_SIZE, audit: decisions })
    if (extraPool.length) selectForReader(mineStories, extraPool, { ...opts, size: 2 * EXTRA_MAX, plan: false, audit: decisions })
    const selectedIds = new Set(out.flatMap(e => e.itemIds || [e.leadId || e.id]))
    const selectedSigs = out.map(e => sigAll.get(e.leadId || e.id)).filter(Boolean)
    const represented = ids => ids.some(id => selectedIds.has(id) || (sigAll.has(id) && selectedSigs.some(s => sameSubject(sigAll.get(id), s))))
    const finalReason = (id, sid, entry = {}) => {
      const p = policyOf(id, sid, entry)
      if (!unread(id, sid)) return 'eerder-getoond-of-gelezen'
      if (!p.allowed) return newsRejection(prof,p.meta,p.members,p.desk)
      if (capAbroad && p.capped && internationalCount >= INT_MAX) return 'internationaal-plafond'
      return 'onverklaard'
    }
    for (const d of decisions) {
      if (represented(d.itemIds)) d.reason = 'vertegenwoordigd'
      else if (d.reason === 'gekozen-in-route') d.reason = finalReason(d.itemIds.find(id => itemAny.has(id)) || d.id, d.kind === 'story' ? d.id : null)
    }
    for (const d of decisions) {
      if (d.reason === 'via-verhaal') {
        const st = storyByItem.get(d.id)
        d.reason = st ? (decisions.find(x => x.kind === 'story' && x.id === st.id)?.reason || 'onverklaard-verhaal') : 'onbekend-verhaal-id'
      }
    }
    const examined = new Set(decisions.flatMap(d => d.itemIds))
    for (const i of pool) if (!examined.has(i.id)) decisions.push({kind:'item',id:i.id,itemIds:[i.id],reason: !extraKinds.has(kindOf(i)) && kindOf(i) !== 'nieuws' ? 'niet-gekozen-vakgebied' : 'onverklaard'})
    for (const g of supplementPool) {
      const id = g.leadId || g.id, sid = g.kind === 'story' ? g.id : null
      decisions.push({kind:g.kind,id:g.id,itemIds:[...membersOf(g)],route:'algemene-editie',reason: represented([...membersOf(g)]) ? 'vertegenwoordigd' : !supplementReason(g) ? (finalReason(id,sid,g) === 'onverklaard' ? 'geen-aantoonbare-aanvulreden' : finalReason(id,sid,g)) : finalReason(id,sid,g)})
    }
    const counts = Object.fromEntries([...new Set(decisions.map(d=>d.reason))].sort().map(r=>[r,decisions.filter(d=>d.reason===r).length]))
    const unresolved = decisions.filter(d=>/onverk|onbekend|route-vol|gekozen-in-route/.test(d.reason))
    supply = {target:EDITION_SIZE,auditBelow:EDITION_AUDIT_BELOW,floor:EDITION_FLOOR,selected:regularCount,totalSlots:out.length,ownArticles:pool.length,decisions,counts,unresolved:unresolved.length,proven:regularCount>=EDITION_FLOOR && unresolved.length===0}
  }
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
    ...(supply ? { _supply: supply } : {}),
  }
}

// Zonder de velden ter inzage (`_parts`, `_plan`): zo gaat de Editie naar het toestel en je account.
export function withoutDebug(edition) {
  if (!edition) return edition
  const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')))
  return { ...strip(edition), entries: (edition.entries || []).map(strip) }
}

// De Edities van vóór deze, voor `previous` en voor `history` (aanvulling-pariteit-herhaling.md H3, H5):
// wat op dit toestel ligt (de laatste vastgelegde Editie met haar `history`) en wat in je account staat
// (`user_state.edition`, met de zijne), samen, ontdubbeld op id, de laatste HISTORY_MAX (nieuwste eerst).
// De Editie van dit dagdeel zelf telt niet mee (die wordt juist samengesteld of overgenomen), wat lokaal
// van een andere lezer is ook niet; de rij uit het account is altijd van deze lezer. Zo kennen beide
// toestellen dezelfde Edities van toen, ook als het ene de Middag oversloeg.
export function earlierEditions({ local = null, account = null, id = null, owner = null } = {}) {
  const rows = []
  const add = (e) => {
    if (!e || typeof e !== 'object') return
    if (Array.isArray(e.history)) rows.push(...e.history)
    if (e.id !== id) rows.push(e)
  }
  if (local && (!owner || local.owner === owner)) add(local)
  add(account)
  return recentEditions(rows)
}

// Vingerafdruk van waaruit een editie is samengesteld: je bronnen en interesses. Een editie met
// een andere afdruk is niet (meer) de jouwe — bijvoorbeeld gemaakt op een toestel dat je
// instellingen nog niet had geladen — en wordt opnieuw samengesteld.
export function editionBasis(followed = [], interests = [], topics = [], favorites = []) {
  const parts = [[...followed].sort().join(','), [...interests].sort().join(','), [...topics].sort().join(',')]
  if (favorites.length) parts.push([...favorites].sort().join(',')) // zonder voorkeuren: dezelfde afdruk als vroeger
  const text = [EDITOR_REVISION, ...parts].join('|')
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
    if (e.desk === 'bubbel') return
    const item = byId.get(e.leadId || e.id)
    if (item) rows.push({ entry, sourceName: item.sourceName, title: item.title, summary: item.summary || '' })
  })
  return rows
}
