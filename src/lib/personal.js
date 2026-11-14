import { withCleanIntro } from '../../shared/edition-display.mjs'
import { EDITION_AUDIT_BELOW, EDITION_FLOOR, editionStoryCount, majorNews, internationalNews, newsRejection, allowedNews, cappedInternational, worldChosen, sportChosen, cultuurChosen, exceptionalDutchSport, coverageOf, majorGeneralNews } from '../../shared/edition-policy.mjs'
import { withoutDebug, earlierEditions, editionBasis, personalRows } from './personal-basis.js'
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
import { newFactIn, heldDown, selectForReader, EDITION_SIZE, signatures, sameEvent, sameSubject, sameTopic, sameHeadEventOf, TOPIC_MAX, seenBefore, developedSince, recentEditions, openWithNews, leadCandidates, leadPool, centralItems, voteFamilyOf, FAMILY_MAX, previousHeads, curiosaDown, dutchFirst, isStale, sameCluster, isRunning, runningFact, RUNNING_MAX, voteFamilyOfItem, curioStory, peopleStory, weightyStory } from '../../netlify/lib/stories.mjs'
import { isOpinion } from '../../shared/article-signals.mjs'
import { excludedFromEdition } from '../../shared/editie-filter.mjs'
import { deskOfStory, storyForeignOf, VL_HOME, belgianSubject } from '../../netlify/lib/desks.mjs'
import { trustedTopics, OTHER_SPORT } from '../../netlify/lib/topics.mjs'
import { INTERESTS, OPT_IN, baseTopics } from './topics.js'
import { forEdition } from '../../shared/stroom.mjs'
import { metKorteKoppen, herschrevenVan } from '../../shared/kort-kop.mjs'
import { supplyOf, profileOf, personalParts, sumParts, tempoWindows, outsideProfile, strongestFamily, whyOf, isSport, NEIGHBOURS, FAMILY_OF, INT_MAX, chosenDesks, KERN, KERN_MIN, jitter } from '../../shared/editor.mjs'
import { readerRegions, inRegion, readerHome } from '../../shared/lezer.mjs'

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
// Het plafond groeit mee met wat je koos (persona's 14 november: wie alleen Cultuur en Sport koos, kreeg in elke Editie
// precies twee van zulke plekken en acht plekken nieuws uit de rubriekvulling). Het aandeel van de gekozen interesses dat
// sport of cultuur is, krijgt hooguit de helft van de Editie: alleen Cultuur en Sport (2 van 2) geeft 5, Cultuur en
// Sport naast één nieuwsinteresse 3; wie meer nieuws koos, houdt EXTRA_MAX. Alleen een gebied dat ook in het extra blok
// meedoet (`kinds`, uit het profiel) telt. Zonder interesses blijft het EXTRA_MAX. Alleen gehele getallen (web en app gelijk).
export const EXTRA_KIND_OF = { sport: 'sport', cultuur: 'cultuur' }
export function extraMaxOf(interests = [], kinds = new Set(), size = EDITION_SIZE) {
  const chosen = [...new Set(interests)].filter((id) => INTERESTS.some((f) => f.id === id))
  const light = chosen.filter((id) => EXTRA_KIND_OF[id] && kinds.has(EXTRA_KIND_OF[id])).length
  if (!light) return EXTRA_MAX
  return Math.max(EXTRA_MAX, Math.floor((size * light) / (2 * chosen.length)))
}
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

// Soort bericht: de rubriek van de bron, tenzij het onderwerp sport, cultuur of games is.
function kindOfWith(catOf) {
  return (i) => {
    if (isSport(i, catOf)) return 'sport' // darts heeft geen onderwerp (en Netflix maakt het geen film)
    const byTopic = (i.topics || []).map((t) => TOPIC_KIND[t]).find(Boolean)
    if (byTopic) return byTopic
    const cat = catOf.get(i.source)
    return !catOf.size || NEWS_CATS.has(cat) ? 'nieuws' : cat // zonder catalogus: alles als nieuws
  }
}

// Cultuur in de kop (voor de rubriek boven de plek, punt 6): zonder Media en Games ("omroep" in een kop is geen cultuur).
const CULTURE_HEAD = new Set(['muziek', 'film', 'boeken', 'kunst', 'showbizz'])
const NEWS_RUBRIC = new Set(['nl', 'vl', 'regio', 'int'])
export const rubricOfCat = (cat) => (!cat || NEWS_RUBRIC.has(cat) ? 'nieuws' : cat)
export function languageRule({ followed = new Set(), sources = [] } = {}) {
  // De taalregel (besluit Alex, 7 november 2026): wie in een rubriek geen Engelse bron volgt, krijgt in die rubriek ook
  // geen Engelse kop, ook niet van buiten zijn bronnen (Waar iedereen over schrijft, de aanvulling, Buiten en Naast je
  // bubbel, een vervolg, plek 01). Wie IGN volgt, mag een Engelse kop bij Games krijgen, maar geen Engels nieuws.
  // - Rubriek van een bron: zijn plek in de catalogus (`cat`). Nederland, Vlaanderen, Regio en Internationaal zijn samen
  //   Nieuws; Economie, Tech, Wetenschap, Sport, Cultuur en Games zijn elk een rubriek. Bluesky telt niet mee.
  // - Rubriek van een plek: die van zijn kop (rubricOf). Sport, cultuur of games als het onderwerp van het stuk dat is
  //   (zoals kindOf), anders de rubriek van de kopbron. Eén vaste regel per plek, ook voor een nieuwe kop of een vervolg.
  // - Taal van een stuk: `it.lang` (de server zet die alleen bij een stuk in een andere taal dan zijn bron), anders die
  //   van de bron. Nederlands (ook Vlaams) is altijd leesbaar, net als elk stuk van een bron die je volgt. Een stuk van
  //   een anderstalige bron dat de server Nederlands noemt, telt niet als Nederlands: detectLang kent alleen nl en en, en
  //   noemde de Duitse kop "Von allmächtig zu ohnmächtig?" van Politico Europe Nederlands (feed van 5 november).
  // Is de kop onleesbaar, dan kiest relead (in composePersonal) opnieuw uit de leesbare stukken van dezelfde plek: eigen
  // bronnen, dan Nederlands, dan Vlaams, daarbinnen leadPool. Is er geen, dan valt de plek weg en vult de Editie aan zoals
  // altijd, of is ze eerlijk korter. Het gaat om de kop: de bundel achter "+N bronnen" en de bronvergelijking blijven heel.
  // Volg je in elke rubriek een Engelse bron, dan is alles leesbaar en is de Editie precies als zonder deze regel.
  const langOfSource = new Map(sources.map((s) => [s.id, s.lang]))
  const readerLangs = new Map()
  for (const s of sources) {
    if (!followed.has(s.id) || !s.lang || String(s.id).startsWith('bsky:')) continue
    const r = rubricOfCat(s.cat)
    if (!readerLangs.has(r)) readerLangs.set(r, new Set())
    readerLangs.get(r).add(s.lang)
  }
  const catOf = new Map(sources.map((s) => [s.id, s.cat]))
  const kindOf = kindOfWith(catOf)
  const rubricOf = (i) => {
    const k = kindOf(i)
    return k === 'nieuws' ? rubricOfCat(catOf.get(i.source)) : k
  }
  // Een onbekend stuk of een stuk zonder bekende taal laten we staan: daarover kunnen we niets zeggen.
  const readableIn = (i, rubric) => {
    if (!i || followed.has(i.source)) return true
    const ok = (lang) => !lang || lang === 'nl' || !!readerLangs.get(rubric)?.has(lang)
    return ok(i.lang || langOfSource.get(i.source)) && ok(langOfSource.get(i.source))
  }
  const readable = (i) => !i || readableIn(i, rubricOf(i))
  return { rubricOf, readableIn, readable, readerLangs }
}

// `previous`: je vorige editie (zie previousOf in stories.mjs); wat daarin stond, komt alleen
// terug als het zich ontwikkelde (seenBefore/developedSince), ook als aanvulling, breed verhaal
// of bubbel; dan met een nieuw stuk als kop en "Vervolg · N nieuwe stukken".
// `favorites`: je voorkeursbronnen; die wegen zwaarder en leveren bij voorkeur het hoofdbericht.
// `affinity`, `taste`: wat je opent en bewaart, en meer/minder hiervan (src/lib/affinity.js).
// `readIds`: wat je al las (een Set); dat komt niet terug, tenzij er genoeg nieuws bij kwam.
// `now`: de start van het dagdeel (global.builtAt), zodat elk toestel dezelfde Editie maakt.
// Velden met een `_` (zoals `_parts`) zijn alleen ter inzage; withoutDebug haalt ze eraf.
// Vangnet (P0, 9 november): rekent het toestel met berichten van een vorig bezoek? De algemene Editie
// komt vers van de server; staan daarin stukken van je eigen bronnen die ruim een halve dag nieuwer zijn
// dan het nieuwste eigen bericht dat het toestel heeft, dan zijn die berichten achterhaald. Dan geen
// Editie: wie zo samenstelt, vult met wat je al zag en met bronnen die je niet volgt, en legt dat voor het
// hele dagdeel vast. Zonder eigen stukken in de algemene Editie of zonder gedateerde eigen berichten valt
// dit niet te toetsen: dan niet weigeren.
// Geen klok: alleen de berichten zelf (web en app gelijk, bouwspec §9).
export const STALE_INPUT_MS = 12 * 3600e3
export function staleInput({ global, items = [], followed = new Set() }) {
  const at = (i) => Date.parse(i?.publishedAt) || 0
  const newest = (list) => list.reduce((m, i) => (i && i.kind !== 'post' && followed.has(i.source) ? Math.max(m, at(i)) : m), 0)
  const theirs = newest(global?.items || [])
  const own = newest(items)
  return theirs > 0 && own > 0 && theirs - own > STALE_INPUT_MS
}

export function composePersonal({ global, stories = [], items = [], sources = [], followed = new Set(), interests = [], topics = [], now = Date.parse(global?.builtAt) || Date.now(), builtAt = new Date(now).toISOString(), previous = null, affinity = null, favorites = [], taste = null, readIds = new Set(), weg = null, _langRule = true, _memoSignatures = true }) {
  if (!global?.entries?.length) return null
  if (staleInput({ global, items, followed })) return null
  // Wat alleen in de Stroom hoort (streamOnly) telt niet mee: De Redacteur rekent met het oude venster
  // per bron, ook op het toestel (shared/stroom.mjs).
  // Geen aanbieding of kijk-/luisteraanbod (Redacteur · filters-ai): A (shared/editie-filter.mjs) overal, en op de server ook
  // `weg`, de id's die de AI zeker als aanbieding of aankondiging zag (editionFilter in de kern). Het toestel geeft geen
  // `weg` mee en rekent als vangnet met A alleen. Ook een oude serverkop, de brede/verwante aanvulling en de bubbel.
  const gone = new Set()
  const readItem = (i) => {
    if (!excludedFromEdition(i, weg)) return true
    gone.add(i.id)
    return false
  }
  items = items.filter((i) => forEdition(i) && readItem(i)).map(withCleanIntro).map(withTrustedTopics)
  const readGlobalItems = (global.items || []).filter(readItem).map(withCleanIntro).map(withTrustedTopics)
  const globalWide = (global.wide || []).filter((w) => !w?.item || readItem(w.item)).map((w) => (w?.item ? { ...w, item: withTrustedTopics(withCleanIntro(w.item)) } : w))
  const globalNear = (global.near || []).filter((w) => !w?.item || readItem(w.item))
  const readEntry = (e) => !gone.has(e.leadId || e.id) && !excludedFromEdition(e, weg)
  const known = new Map([...items, ...readGlobalItems].map((i) => [i.id, i]))
  const globalEntries = (global.entries || []).map((e) => {
    if (readEntry(e)) return e
    if (e.kind !== 'story') return null
    // Een serververhaal kan nog een bruikbaar leesstuk bevatten: vervang dan alleen de kop; de taalregel hieronder kiest
    // zo nodig opnieuw binnen dezelfde plek.
    const ids = e.itemIds || stories.find((st) => st.id === e.id)?.itemIds || []
    const lead = leadCandidates(ids.map((id) => known.get(id)).filter(Boolean), followed, new Set(favorites), now)[0]
    return lead ? { ...e, leadId: lead.id, ...('title' in e ? { title: lead.title } : {}) } : null
  }).filter(Boolean)
  global = { ...global, items: readGlobalItems, wide: globalWide, near: globalNear, entries: globalEntries, bubble: (global.bubble || []).filter(readEntry) }
  const catOf = new Map(sources.map((s) => [s.id, s.cat]))
  const kindOf = kindOfWith(catOf)
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
  // `newFacts`: de toets op een nieuw feit voor wat je las (personalParts), met dezelfde kenmerken als developedSince.
  const ctx = { readIds, tempo, storyDesk, known: itemAny, sigKnown: sigAll, own: new Map(pool.map((i) => [i.id, i])), newFacts: (fresh, old, own, whole) => newFactIn(fresh, old, sigAll, own, whole) }
  // Rekentijd: binnen deze samenstelling (dezelfde onveranderlijke pool en vorige Editie) dezelfde kenmerken en kern hergebruiken.
  if (_memoSignatures) {
    const memo = new WeakMap()
    const coreMemo = new WeakMap()
    ctx.signaturesFor = (xs, extra) => {
      if (!memo.has(xs)) memo.set(xs, signatures(xs, extra))
      return memo.get(xs)
    }
    ctx.centralItemsFor = (xs, total) => {
      let saved = coreMemo.get(xs)
      if (!saved || saved.total !== total) coreMemo.set(xs, (saved = { total, items: centralItems(xs, total) }))
      return saved.items
    }
  }
  const seed = `${editionBasis([...followed], interests, topics, favorites)}|${global.id}`

  // 2. Het extra blok: sport en cultuur als dat gebied sterk genoeg in je profiel zit (ook uit
  //    lezen); games alleen als je dat onderwerp scherp koos of las, niet geërfd van Cultuur (wie Cultuur
  //    kiest, bedoelt meestal muziek, film en boeken; tot 1.3 hoorde Games bij Tech, met dezelfde regel).
  //    Games telt daarom ook niet mee voor de sterkte van Cultuur (cultuurChosen in shared/edition-policy.mjs).
  // Zonder Achterklap & showbizz: dat zit niet in Cultuur-alles (OPT_IN in topics.js).
  const cultuur = baseTopics(INTERESTS.find((f) => f.id === 'cultuur'))
  const gamesSharp = interests.includes('cultuur') && topics.includes('games') && !cultuur.every((t) => topics.includes(t))
  const gamesOk = (prof.topicP.games || 0) >= EXTRA_MIN && (gamesSharp || prof.origin.games === 'geleerd')
  const extraKinds = new Set([...(sportChosen(prof) ? ['sport'] : []), ...(cultuurChosen(prof, EXTRA_MIN) ? ['cultuur'] : []), ...(gamesOk ? ['games'] : [])])
  const storyById = new Map(stories.map(s => [s.id, s]))
  const storyByItem = new Map(stories.flatMap(s => s.itemIds.map(id => [id, s])))
  // Groot cultuurnieuws (zie majorGeneralNews) is nieuws, ook met onderwerp muziek of film.
  const bigLight = (i) => ['cultuur', 'games'].includes(kindOf(i)) && !!storyByItem.get(i.id) && majorGeneralNews(storyByItem.get(i.id), [i], catOf)
  const newsPool = pool.filter(i => kindOf(i) === 'nieuws' || (!sportChosen(prof) && exceptionalDutchSport(storyByItem.get(i.id) || {}, [i])) || bigLight(i))
  // Niet gedaan (review 4 november, B3): stukken van een zelf aangezette games- of cultuurbron ook zonder
  // de interesse in dit blok. Dat gaf iedereen met dezelfde bronnen dezelfde twee stukken (harde
  // acceptatie, uniekheid alleen algoritme 0,38 → 0,48). Ter beslissing; zie REDACTEUR-RAPPORT.md.
  const extraPool = pool.filter((i) => extraKinds.has(kindOf(i)))

  // "Buiten je bubbel" uit de algemene editie houdt een plek; "Waar iedereen over schrijft" krijgt
  // er één zodra er een breed verhaal is dat je eigen bronnen niet al brengen. Schrijft een van je
  // bronnen er al over, dan geen gratis bron van buiten ervoor in de plaats. Groot nieuws (vanaf
  // acht uitgevers of vijf uit twee landen) kan met het stuk uit je eigen
  // bron als kop (`wideLead`), in de plaats van je lichtste plek: de Nederlandse voorpagina laat niet
  // al het grote nieuws toe (selectForReader).
  let bubbleEntry = global.entries.find((e) => e.desk === 'bubbel') || null
  // Alleen nieuws telt als "je bron schrijft erover": een opiniestuk (ook van een opinieblad) wordt nooit de kop.
  const ownIds = new Set(items.filter((i) => followed.has(i.source) && !isOpinion(i)).map((i) => i.id))
  const covered = (w) => ownIds.has(w.item.id) || (storyById.get(w.storyId)?.itemIds || []).some((id) => ownIds.has(id))
  const bigWide = w => majorNews(storyById.get(w.storyId) || w, [w.item])
  // De kop van een breed verhaal: je eigen stuk als je bron erover schrijft, anders dat van de server, mits leesbaar
  // (de taalregel hieronder); null als het verhaal geen leesbaar stuk heeft.
  const wideLeads = new Map()
  const wideLead = (w) => {
    if (!wideLeads.has(w)) wideLeads.set(w, covered(w) ? itemAny.get([w.item.id, ...(storyById.get(w.storyId)?.itemIds || [])].find((id) => ownIds.has(id))) : relead(w.item, storyMembers(w.storyId, w.item.id)))
    return wideLeads.get(w)
  }

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
    const members = ids.map((x) => itemAny.get(x)).filter(Boolean)
    const { seen, followUp } = personalParts(members, prof, { readIds, newFacts: ctx.newFacts }, { whole: members, keyAt: st?.keyAt, pubAt: st?.pubAt, pubs: st?.publisherCount })
    return followUp ? { followUp } : { seen: seen || { pts: 0 } } // gelezen maar onbekend bericht: ook gezien
  }
  const preferred = new Set(favorites.filter((id) => followed.has(id)))

  // De taalregel (languageRule hierboven): een kop die je kunt lezen. `_langRule: false` alleen voor de toets dat de
  // regel niets verandert voor wie in elke rubriek een Engelse bron volgt (tests/taalregel.test.mjs).
  const { rubricOf, readableIn, readable } = _langRule ? languageRule({ followed, sources }) : { rubricOf: () => 'nieuws', readableIn: () => true, readable: () => true }
  const storyMembers = (sid, id) => [...new Set([id, ...(storyById.get(sid)?.itemIds || [])])].map((x) => itemAny.get(x)).filter(Boolean)
  // De kop van een plek met kop `head` en stukken `xs`: dezelfde kop als die leesbaar is, anders de beste leesbare.
  const relead = (head, xs) => {
    if (readable(head)) return head
    const rubric = rubricOf(head)
    const ok = xs.filter((i) => i && i.kind !== 'post' && !isOpinion(i) && readableIn(i, rubric))
    if (!ok.length) return null
    // Eerst wat niet verouderd is, dan je eigen bronnen, dan Nederlands vóór Vlaams; daarbinnen leadPool (kern, vers).
    const fresh = ok.some((i) => !isStale(i, now)) ? ok.filter((i) => !isStale(i, now)) : ok
    const mine = fresh.filter((i) => followed.has(i.source))
    return leadPool(leadCandidates(mine.length ? mine : dutchFirst(fresh), followed, preferred, now), xs.filter(Boolean), now, (i) => followed.has(i.source))[0] || null
  }
  // Een plek uit de algemene Editie met een leesbare kop: dezelfde plek, een kopie met een nieuwe kop, of null (een los
  // bericht of een verhaal zonder leesbaar stuk).
  const releadEntry = (e) => {
    const head = itemAny.get(e.leadId || e.id)
    if (readable(head)) return e
    const next = e.kind === 'story' ? relead(head, [...membersOf(e)].map((x) => itemAny.get(x))) : null
    return next ? { ...e, leadId: next.id, ...('title' in e ? { title: next.title || null } : {}) } : null
  }
  // Wat in je vorige Editie stond, komt ook als aanvulling, breed verhaal of bubbel alleen terug als
  // het zich ontwikkelde (zie selectForReader); dan met het zwaarste nieuwe stuk als kop.
  const againOf = (id, sid) => {
    if (!previous || !id) return {}
    const st = storyById.get(sid || storyOfItem.get(id) || itemAny.get(id)?.storyId)
    const members = [...new Set([id, ...(st?.itemIds || [])])].map((x) => itemAny.get(x)).filter(Boolean)
    if (!seenBefore(st || { id }, members, previous)) return {}
    const dev = st ? developedSince(st, members, previous, sigAll, { mainIds: followed, preferred, now, known: itemAny }) : null
    if (!dev) return { seen: true }
    // Geen onleesbare vervolgkop (de taalregel): dan het beste leesbare nieuwe stuk, of anders blijft de kop staan.
    const rubric = rubricOf(itemAny.get(id) || dev.lead)
    const lead = readableIn(dev.lead, rubric) ? dev.lead : leadCandidates(dev.fresh.filter((i) => readableIn(i, rubric)), followed, preferred, now)[0]
    return { vervolg: dev.fresh.length, leadId: lead ? lead.id : id }
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
    // Een onderwerp dat je zelf aantikt (OPT_IN, Achterklap & showbizz) komt alleen bij wie het aantikte (besluit 13
    // november); geen gewicht was niet genoeg, het stuk bleef als gewoon nieuws toegelaten (nachttest 14 november, R3).
    const lead = itemAny.get(id) || members[0]
    const optIn = (lead?.topics || []).some((t) => OPT_IN.has(t) && !topics.includes(t))
    const reason = optIn ? 'niet-aangetikt' : newsRejection(prof, meta, members, desk, { bubble })
    return { allowed: reason === null, reason, abroad: internationalNews(members, desk, meta), capped: cappedInternational(prof,members,desk,meta), members, meta, desk }
  }
  const unchosenAbroad = (id, sid) => capAbroad && policyOf(id, sid).capped
  const eligible = (id, sid, entry = {}) => {
    const p = policyOf(id, sid, entry)
    return p.allowed && (!capAbroad || !p.capped || abroad < INT_MAX)
  }
  const wideAny = (global.wide || []).some(w => w?.item?.id && !covered(w) && unread(w.item.id, w.storyId) && wideLead(w))
  const size = EDITION_SIZE - (wideAny ? 1 : 0)
  const opts = { mainIds: followed, now, previous, preferred, prof, ctx, seed }
  // Het extra blok kiest er een paar meer, zodat een verhaal dat het nieuws al heeft (de dood van een
  // acteur, met een stuk van NOS Cultuur) er niet twee keer in staat.
  // Het plafond groeit mee met je keuze (extraMaxOf); de eerste EXTRA_MAX plekken gaan zoals altijd van het nieuws af,
  // de groei daarna ruilt alleen lichte plekken (hieronder), zodat groot nieuws en de voorpagina blijven.
  const extraMax = extraMaxOf(interests, extraKinds)
  const extraAll = extraPool.length ? selectForReader(mineStories, extraPool, { ...opts, size: 2 * extraMax, plan: false }) : []
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
  // De groei boven EXTRA_MAX (extraMaxOf): per extra plek ruilt de lichtste nieuwsplek, eerst een zonder gekozen interesse.
  // Nooit de voorpagina of groot nieuws: dat blijft staan, ook als er dan minder groei is.
  const extraIds = new Set(extra.flatMap((e) => e.itemIds || [e.id]))
  const isMajor = (e) => majorNews(storyById.get(e.id) || e, (e.itemIds || [e.leadId || e.id]).map((id) => itemAny.get(id)).filter(Boolean))
  for (const e of extraAll) {
    if (extra.length >= extraMax) break
    if (extra.includes(e) || extra.some((x) => x.id === e.id)) continue
    const ids = e.itemIds || [e.id]
    if (ids.some((id) => inNews.has(id) || extraIds.has(id))) continue
    if (!eligible(e.leadId || e.id, e.kind === 'story' ? e.id : null, e)) continue
    // Ook niet de enige plek van een kernrubriek als de Editie er dan te weinig heeft (KERN_MIN, zoals bij het brede verhaal).
    const kernIn = (es) => new Set(es.map((x) => x.desk).filter((d) => KERN.includes(d))).size
    const keeps = (x) => kernIn(news.filter((y) => y !== x)) >= Math.min(KERN_MIN, kernIn(news))
    const light = news.map((x, i) => ({ x, i })).filter(({ x }) => !x.front && !isMajor(x) && keeps(x)).sort((a, b) => (a.x.parts?.interest ? 1 : 0) - (b.x.parts?.interest ? 1 : 0) || (a.x.w || 0) - (b.x.w || 0) || byText(b.x.id, a.x.id))[0]
    if (!light) break
    news.splice(light.i, 1)
    if (sel.counted.has(light.x.id)) abroad--
    if (unchosenAbroad(e.leadId || e.id, e.kind === 'story' ? e.id : null)) abroad++
    for (const id of ids) extraIds.add(id)
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
  // Ook geen breed verhaal over het onderwerp van een kop uit je vorige Editie (zoals selectForReader), tenzij het
  // zich ontwikkelde: dan komt het als vervolg.
  const prevHeads = previous ? previousHeads(sigAll, previous, now) : []
  const sameAsPrevious = (id, sid) => !!prevHeads.length && sigAll.has(id) && prevHeads.some((s) => sameSubject(sigAll.get(id), s)) && !againOf(id, sid).vervolg
  const free = (w) => w?.item?.id && !!wideLead(w) && eligible(w.item.id, w.storyId, w) && !taken.has(w.item.id) && !sameAsPlaced(w.item.id) && !sameAsPlaced(wideLead(w)?.id) && !(storyById.get(w.storyId)?.itemIds || []).some((id) => taken.has(id)) && (!covered(w) || bigWide(w)) && unread(w.item.id, w.storyId) && !sameAsPrevious(wideLead(w)?.id || w.item.id, w.storyId)
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
  // De kop van een aanvulling volgt de taalregel (releadEntry); de volgorde van de server (`idx`) blijft die van toen.
  const fillCands = supplementPool
    .map((g0, idx) => ({ g0, g: releadEntry(g0), idx }))
    .filter((x) => x.g)
    .map(({ g0, g, idx }) => ({ g0, g, idx, score: sumParts(personalParts([itemAny.get(g.leadId || g.id)].filter(Boolean), noFavorites, {}, { desk: g.desk })) - 2 * idx }))
    .filter((x) => supplementReason(x.g) && x.g0 !== bubbleEntry && unread(x.g.leadId || x.g.id, x.g.kind === 'story' ? x.g.id : null))
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
  // Sport zonder onderwerp (een stuk onder /sport/, of een verhaal met `sport: true`) is voor de sportlezer niet buiten
  // zijn profiel (nachttest 14 november, R1): het gebied telt dan mee in outsideProfile.
  const familiesOfStory = (sid, id) => (storyById.get(sid)?.sport || (storyById.get(sid)?.itemIds || [id]).some((x) => itemAny.has(x) && isSport(itemAny.get(x), prof.catOf)) ? ['sport'] : [])
  let nearItem = null
  // Buiten je bubbel per lezer (persona's 14 november, punt 5): niet van een bron die je volgt (Rijnmond voor wie Rijnmond
  // volgt, VRT voor wie VRT volgt), niet in een rubriek die je koos (box 3 in de Kamer voor wie Binnenland koos: de
  // onderwerpen van het stuk alleen, outsideProfile, zagen dat niet) en niet uit je regio (de plaatsen van je regionale
  // bronnen: de Visserbrug in Groningen voor wie het Dagblad van het Noorden leest). Interesses (outsideProfile) en
  // leestaal (readable) golden al. Gratis, zoals de server de kandidaten kiest (bubbleRejection), ook hier: een oudere
  // kern leverde nog betaalde kandidaten. Komt het stuk zelf van een bron die je volgt, dan mag een ander stuk van hetzelfde
  // verhaal van een bron die je niet volgt de kop zijn (wie de startset volgt, had anders vrijwel nooit een bubbel: de
  // kandidaten komen vooral van NOS, NU.nl en RTL); is er geen, dan valt de kandidaat af.
  const regions = readerRegions({ followed, sources })
  const sourceById = new Map(sources.map((s) => [s.id, s]))
  const bubbleDesks = chosenDesks(prof)
  const outsideItem = (i) => !!i && i.kind !== 'post' && !isOpinion(i) && readable(i) && !followed.has(i.source) && !sourceById.get(i.source)?.paid && !inRegion(i, regions, (s) => sourceById.get(s))
  const bubbleLeadOf = (sid, id) => {
    const it = itemAny.get(id)
    if (!it) return null
    const story = sid || it.storyId || null
    const desk = storyById.get(story)?.desk ?? storyDesk.get(story) ?? deskOfStory([it])
    if ((desk && bubbleDesks.has(desk)) || inRegion(it, regions, (s) => sourceById.get(s))) return null
    if (outsideItem(it)) return it
    const others = story ? storyMembers(story, id).filter((i) => i.id !== id && outsideItem(i)) : []
    return leadCandidates(others, followed, preferred, now)[0] || null
  }
  if (bubbleEntry) {
    // Zonder Wereld geen buitenlands bubbelstuk (feedback 31 oktober: Seedorf bij Corinthians, Braziliaans
    // voetbal, ook voor wie alleen Binnenland koos): dan het volgende signaal, of "Naast je bubbel".
    // Een los bericht met een onleesbare kop (de taalregel) slaan we over: dan het volgende signaal.
    const okB = (b) => itemAny.has(b.id) && readable(itemAny.get(b.id)) && !!bubbleLeadOf(b.storyId, b.id) && eligible(b.id, b.storyId, { ...b, bubble: true }) && !clashes(b.id) && unread(b.id, b.storyId) && outsideProfile(topicsOfStory(b.storyId, b.id), prof, familiesOfStory(b.storyId, b.id)) && !(abroad >= INT_MAX && unchosenAbroad(b.id, b.storyId))
    // Niet voor iedereen hetzelfde stuk: de trend is een bron van kandidaten, niet de keuze. Van de kandidaten die voor jou
    // kunnen (het signaal van de algemene Editie en de andere van de server), kiest je eigen vaste zaad (jitter: je bronnen,
    // interesses en het dagdeel). Zelfde lezer en dagdeel, zelfde stuk; geen toeval.
    const first = (global.bubble || []).find((b) => b.id === bubbleEntry.id) || { id: bubbleEntry.id }
    const seenB = new Set()
    const alt = [first, ...(global.bubble || [])].filter((b) => b?.id && !seenB.has(b.id) && seenB.add(b.id) && okB(b)).sort((a, b) => jitter(seed, a.id) - jitter(seed, b.id) || byText(a.id, b.id))[0]
    if (alt) {
      const lead = bubbleLeadOf(alt.storyId, alt.id)
      if (lead.id !== bubbleEntry.id) bubbleEntry = { kind: 'item', id: lead.id, desk: 'bubbel', terms: alt.terms }
      bubbleEntry = withHistory(bubbleEntry, lead.id, alt.storyId || lead.storyId)
    } else {
      const home = strongestFamily(prof)
      const next = new Set(NEIGHBOURS[home] || [])
      const recent = stories
        .filter((st) => st.sourceCount >= NEAR_MIN_SOURCES && now - Date.parse(st.latestAt) < 24 * 36e5)
        .sort((a, b) => b.sourceCount - a.sourceCount || byText(a.id, b.id))
        .map((st) => ({ storyId: st.id, sourceCount: st.sourceCount, topics: topicsOfStory(st.id), item: itemAny.get(st.leadId) || st.itemIds.map((x) => itemAny.get(x)).find(Boolean) }))
      const fits = (w) => w?.item?.id && !!bubbleLeadOf(w.storyId, w.item.id) && eligible(w.item.id, w.storyId, { ...w, bubble: true }) && !clashes(w.item.id) && !(storyById.get(w.storyId)?.itemIds || []).some((x) => taken.has(x)) && unread(w.item.id, w.storyId) && outsideProfile(w.topics || [], prof) && (w.topics || []).some((t) => next.has(FAMILY_OF[t])) && !(abroad >= INT_MAX && unchosenAbroad(w.item.id, w.storyId))
      // Met een leesbare kop (de taalregel) van een bron die je niet volgt: uit hetzelfde verhaal, of anders het volgende verhaal.
      const nearLead = (w) => bubbleLeadOf(w.storyId, w.item.id)
      const pick0 = [...(global.near || []), ...recent].find((w) => fits(w) && nearLead(w))
      const pick = pick0 && nearLead(pick0) !== pick0.item ? { ...pick0, item: nearLead(pick0) } : pick0
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
  // Eén stembus, één plek (FAMILY_MAX, Redacteur 3b): ook een breed verhaal of een aanvulling is geen tweede
  // plek over dezelfde stembus op een dag met een uitslag.
  const famOf = voteFamilyOf(stories, itemAny)
  const famTaken = new Map()
  const acceptedItems = [] // per geaccepteerde plek de stukken die dit toestel kent (sameCluster)
  const famKey = (e) => famOf.get(e.kind === 'story' ? e.id : serverStory(e)) || famOf.get(storyOfItem.get(e.leadId || e.id)) || (e.kind === 'item' ? voteFamilyOfItem(itemAny.get(e.leadId || e.id), famOf) : null) || null
  // Leeftijd (13 november 2026): hooguit RUNNING_MAX lopende verhalen (eerste stuk ouder dan RUNNING_H uur) in je hele
  // Editie, langs elke route; een lopend verhaal uit de algemene Editie of het brede nieuws heeft ook een nieuw feit binnen
  // het venster nodig (runningFact). Wat selectForReader al toetste, draagt `_running` (debugveld, niet in de uitvoer).
  let runningN = 0
  const runningStory = (e, known) => {
    const st = storyById.get(e.kind === 'story' ? e.id : serverStory(e))
    return st && isRunning(st, known, now) ? st : null
  }
  // Samengevoegde stukken per plek (de plek zelf blijft hetzelfde object): alleen een verhaal neemt stukken op.
  const mergedIds = new Map()
  const mergeInto = (k, ids) => {
    const t = accepted[k]
    if (t.kind !== 'story') return
    const have = new Set([...(t.itemIds || storyById.get(t.id)?.itemIds || [t.leadId || t.id]), ...(mergedIds.get(t) || [])])
    const add = ids.filter((x) => !have.has(x) && !finalTaken.has(x))
    if (!add.length) return
    mergedIds.set(t, [...(mergedIds.get(t) || []), ...add])
    for (const x of add) finalTaken.add(x)
    acceptedItems[k] = [...acceptedItems[k], ...add.map((x) => itemAny.get(x)).filter(Boolean)]
  }
  const accept = e => {
    if (accepted.length >= capacity) return
    const id = e.leadId || e.id
    // Vangnet van de taalregel: geen plek met een onleesbare kop, langs welke route ook.
    if (!readable(itemAny.get(id))) return
    const p = policyOf(id, e.kind === 'story' ? e.id : null, e)
    const ids = [...membersOf(e)]
    if (ids.some(x => finalTaken.has(x))) return
    // Dezelfde gebeurtenis als een plek die er al staat (dezelfde kop-gebeurtenis, sameSubject, of hetzelfde cluster): geen
    // tweede plek, en de stukken gaan bij die plek (persona's 14 november: één feit in twee verhalen, de Donbas-ruil op 02 en
    // 05, het Amerikaanse vliegverbod op 04 en 06). Zo staat het verhaal één keer, met alle bronnen, en weet de volgende
    // Editie dat beide helften er stonden.
    const head = itemAny.get(id)
    const known = ids.map((x) => itemAny.get(x)).filter(Boolean)
    // Alleen hetzelfde onderwerp (sameSubject zonder dezelfde gebeurtenis): geen tweede plek, maar ook niet samenvoegen.
    const same = sigAll.has(id) ? finalLeads.findIndex(x => sigAll.has(x) && (sameEvent(sigAll.get(id), sigAll.get(x)) || sameHeadEventOf(sigAll, head, itemAny.get(x)))) : -1
    const k = same >= 0 ? same : acceptedItems.findIndex((xs) => sameCluster(sigAll, known, xs))
    if (k >= 0) return mergeInto(k, known.map((i) => i.id))
    if (sigAll.has(id) && finalLeads.some(x => sigAll.has(x) && sameSubject(sigAll.get(id), sigAll.get(x)))) return
    const fam = famKey(e)
    if (fam && (famTaken.get(fam) || 0) >= FAMILY_MAX) return
    // Eén onderwerp hooguit TOPIC_MAX plekken (sameTopic), langs elke route.
    if (head && finalLeads.filter((x) => sameTopic(sigAll, head, itemAny.get(x))).length >= TOPIC_MAX) return
    const allowed = p.allowed || (floorLight && p.reason === 'licht-buiten-interesse')
    if (!allowed || (capAbroad && p.capped && internationalCount >= INT_MAX)) return
    const run = runningStory(e, known)
    if (run && (runningN >= RUNNING_MAX || (!e._running && !runningFact(run, known, sigAll, now)))) return
    if (run) runningN++
    if (p.capped) internationalCount++
    if (fam) famTaken.set(fam, (famTaken.get(fam) || 0) + 1)
    ids.forEach(x => finalTaken.add(x))
    finalLeads.push(id)
    acceptedItems.push(known)
    accepted.push(e)
  }
  entries.forEach(accept)
  // Valt er een plek weg, dan eerst de volgende kandidaat uit je gekozen sport of cultuur (tot het plafond), pas daarna
  // de vulling met nieuws.
  const extraIn = () => accepted.filter((e) => extra.includes(e) || e._extra).length
  for (const e of extraAll) {
    if (accepted.length >= EDITION_SIZE || extraIn() >= extraMax) break
    if (extra.some((x) => x.id === e.id)) continue
    accept({ ...e, desk: null, _extra: true })
  }
  if (accepted.length < EDITION_SIZE) selectForReader(mineStories, newsPool, { ...opts, size: EDITION_SIZE }).forEach(accept)
  // Dan pas aanvullen uit de algemene Editie, met dezelfde toelating en zonder dubbel verhaal.
  for (const { g } of fillCands) {
    if (accepted.length >= EDITION_SIZE) break
    accept(withHistory({ ...g, desk: EXTERN, fromDesk: g.desk || null, supplement: supplementReason(g) }, g.leadId || g.id, g.kind === 'story' ? g.id : null))
  }
  if (accepted.length < EDITION_FLOOR) {
    floorLight = true
    capacity = EDITION_FLOOR
    // Leeftijd (13 november 2026): op de vloer ook de leeftijdsgrenzen van vóór die dag (FLOOR_STORY_H, FLOOR_ITEM_H).
    selectForReader(mineStories, newsPool, { ...opts, size: EDITION_SIZE, allowLight: true, floor: true }).forEach(accept)
    floorLight = false
  }
  // Pas na hooguit tien gewone plekken: één optionele bubbel, met dezelfde inhouds- en dubbelgrenzen.
  if (bubbleEntry) { capacity = accepted.length + 1; accept(bubbleEntry) }
  // Uiteengevallen verhalen samenvoegen (persona's 14 november): een verhaal dat geen plek kreeg maar over dezelfde
  // gebeurtenis gaat als een plek (dezelfde kop-gebeurtenis of hetzelfde cluster, binnen een dag), geeft zijn stukken aan
  // die plek. Zo staat het feit één keer met al zijn bronnen, en komt de andere helft in het volgende dagdeel niet terug
  // als nieuw (de vorige Editie kent dan beide helften).
  const placedStories = new Set(accepted.filter((e) => e.kind === 'story').map((e) => e.id))
  for (const st of stories) {
    if (placedStories.has(st.id) || !(now - Date.parse(st.latestAt) < 24 * 36e5)) continue
    const xs = st.itemIds.filter((x) => !finalTaken.has(x)).map((x) => itemAny.get(x)).filter((i) => i && i.kind !== 'post')
    if (!xs.length) continue
    const k = accepted.findIndex((e, j) => e.kind === 'story' && e.desk !== 'bubbel' && (xs.some((i) => sameHeadEventOf(sigAll, i, itemAny.get(e.leadId || e.id))) || sameCluster(sigAll, xs, acceptedItems[j])))
    if (k >= 0) mergeInto(k, xs.map((i) => i.id))
  }
  entries = accepted
  // De opening (persona's 14 november, punt 3; keuze van Alex: groot nieuws gaat voor). Plek 01 is groot nieuws of het
  // sterkste stuk uit een gekozen interesse, niet vanzelf Binnenland: wie Binnenland koos, opende elke Editie met het
  // eerste binnenlandse stuk, ook een regionaal stuk van negen uur oud met één bron boven een wereldwijde storing met 27.
  // - Staat er groot nieuws (majorNews) in de Editie en is plek 01 dat niet, dan opent het grootste (de meeste uitgevers;
  //   bij gelijke stand de volgorde van de Editie). Is plek 01 al groot nieuws, dan blijft die staan.
  // - Geen groot nieuws: is plek 01 de voorpagina of een gekozen interesse, dan blijft die; anders opent het sterkste stuk
  //   met een gekozen interesse als reden (het gewicht van de selectie). Binnenland is dan een interesse als alle andere.
  // Nooit Buiten je bubbel, Waar iedereen over schrijft of een plek die zonder nieuw feit blijft staan; alleen een plek
  // met nieuws (geen sport of cultuur uit het extra blok), geen kuriositeit of verhaal over een bekend persoon dat geen
  // zwaar nieuws is, en zonder Wereld geen buitenlands verhaal onder het plafond (31 oktober: wie Binnenland koos zonder
  // Wereld, opent met Nederland, niet met de paus of Wall Street). De stukken van een plek die dit toestel kent (ook voor
  // openWithNews).
  const knownOf = (e) => [...membersOf(e)].map((id) => itemAny.get(id)).filter(Boolean)
  const hasNews = (e) => knownOf(e).some((i) => !isOpinion(i))
  const storyOfEntry = (e) => storyById.get(e.kind === 'story' ? e.id : serverStory(e)) || {}
  const placeOk = (e) => e.desk !== 'bubbel' && e.desk !== WIDE && !e.held && hasNews(e)
  const opener = (e) => {
    if (!placeOk(e)) return false
    const xs = knownOf(e)
    const head = itemAny.get(e.leadId || e.id)
    if (head && kindOf(head) !== 'nieuws' && !bigLight(head)) return false
    if (curioStory(storyOfEntry(e), xs) || (peopleStory(xs, sources.length ? sources : undefined) && !weightyStory(storyOfEntry(e), xs, sources.length ? sources : undefined))) return false
    return !(capAbroad && policyOf(e.leadId || e.id, e.kind === 'story' ? e.id : null, e).capped)
  }
  const pubsOf = (e) => {
    const st = storyById.get(e.kind === 'story' ? e.id : serverStory(e))
    return st?.publisherCount ?? st?.sourceCount ?? e.sourceCount ?? 1
  }
  const bigOpen = (e) => majorNews(storyById.get(e.kind === 'story' ? e.id : serverStory(e)) || e, knownOf(e))
  const chosenHit = (e) => !!e.parts?.interest && e.parts.interest.shown !== false && e.parts.interest.pts > 0
  // De voorpagina van de selectie (`front`, voor iedereen gelijk) blijft op 01 als er geen groter nieuws onder staat.
  // Wat de selectie als groot nieuws bovenaan zette, blijft staan (ook buitenlands nieuws zonder Wereld: dat zakt niet).
  if (entries.length > 1 && !(placeOk(entries[0]) && bigOpen(entries[0]))) {
    const cands = entries.map((e, i) => ({ e, i })).filter(({ e, i }) => i > 0 && opener(e))
    const big = cands.filter(({ e }) => bigOpen(e)).sort((a, b) => pubsOf(b.e) - pubsOf(a.e) || a.i - b.i)[0]
    const keep = !big && placeOk(entries[0]) && (entries[0].front || chosenHit(entries[0]))
    const strong = !big && !keep && prof.interests.size ? cands.filter(({ e }) => chosenHit(e)).sort((a, b) => (b.e.w || 0) - (a.e.w || 0) || a.i - b.i)[0] : null
    const pick = big || strong
    if (pick) entries.unshift(...entries.splice(pick.i, 1))
  }
  // Curiosa nooit in de top 3 (Redacteur 3b · 5): een kuriositeit of licht verhaal schuift naar plek 6.
  curiosaDown(entries, { itemsOf: knownOf, storyOf: (e) => (e.kind === 'story' ? storyById.get(e.id) : null) })
  // Wat zonder nieuw feit één Editie langer blijft (alleen in je vorige Editie, niet gelezen), zakt onder de top 5
  // (ronde 7 · 3c, nieuw feit 13 november), zoals in de algemene Editie. Na curiosaDown: die zet een curiosum op plek 6 en
  // schuift zo wat eronder stond één op.
  heldDown(entries)
  // Plek 01 opent met nieuws, met een nieuwskop; liefst uit je eigen bronnen (keuring 6 november 2026).
  // Alleen een leesbare kop (de taalregel), in de rubriek van de huidige kop van plek 01.
  openWithNews(entries, {
    itemsOf: knownOf,
    pick: (xs, all) => {
      const rubric = rubricOf(itemAny.get(entries[0].leadId || entries[0].id) || xs[0])
      return leadPool(leadCandidates(xs.filter((i) => readableIn(i, rubric)), followed, preferred, now, { role: 'front' }), all, now, (i) => followed.has(i.source))[0]
    },
  })

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
  // De rubriek boven de plek (persona's 14 november, punt 6), pas hier en apart (`rubriek`, alleen als die afwijkt): `desk`
  // blijft de rubriek van het verhaal, voor iedereen gelijk, waarmee de samenstelling en de toetsen rekenen; wat je ziet
  // (web: resolveEditionEntry, app: EditionView), volgt jou.
  // - Sport en cultuur vóór de geografie: een sportverhaal (story.sport van de server, of de kop is sport: isSport) heet
  //   Sport, ook als de server het onder Buitenland zette (Daleman op de 500 meter); een cultuurstuk (de kop van een
  //   cultuurbron, of een cultuuronderwerp in de kop: CULTURE_HEAD) heet Cultuur. Zo krijgen ook sport en cultuur uit het
  //   extra blok een rubriek; wat daar alleen via een onderwerp in de intro kwam, houdt er geen.
  // - De geografie vanaf je thuisland (readerHome in shared/lezer.mjs: meer Vlaamse dan Nederlandse nieuwsbronnen is
  //   België): voor een lezer in Vlaanderen is een Belgisch stuk Binnenland (belgianSubject) en Nederlands nieuws Buitenland.
  // Niet voor Buiten je bubbel, Waar iedereen over schrijft of een aanvulling (die houden hun eigen label).
  const home = readerHome({ followed, sources })
  const shownDesk = (e) => {
    if (['bubbel', WIDE, EXTERN].includes(e.desk)) return e.desk
    const head = itemAny.get(e.leadId || e.id)
    if (!head) return e.desk
    if (storyOfEntry(e).sport || isSport(head, catOf)) return 'sport'
    if (catOf.get(head.source) === 'cultuur' || (head.mainTopics || []).some((t) => CULTURE_HEAD.has(t))) return 'cultuur'
    if (home === 'BE' && (e.desk === 'buitenland' || !e.desk) && belgianSubject(head)) return 'binnenland'
    if (home === 'BE' && ['binnenland', 'regio'].includes(e.desk) && !belgianSubject(head)) return 'buitenland'
    return e.desk
  }
  const out = entries.map((e) => {
    const desk = shownDesk(e)
    let why = whyOf(desk === e.desk ? e : { ...e, desk }, { parts: e.parts || {}, sourceCount: e.sourceCount || storyById.get(e.id)?.sourceCount || 0, desk, plannedDesk: !!e.planned && mineDesks.has(desk), sourceName: (s) => srcName.get(s) || s })
    if (e.supplement && !e.vervolg) {
      const p = policyOf(e.leadId || e.id,e.kind === 'story' ? e.id : null,e)
      const hit = personalParts(p.members,prof,{}, {desk:p.desk,foreign:p.abroad}).interest
      const family = INTERESTS.find(x=>x.id === hit?.f)?.label || (worldChosen(prof) ? 'Wereld' : 'je interesses')
      const reasons = {groot:`Groot nieuws · ${p.meta.publisherCount || p.meta.sourceCount || e.sourceCount || 1} bronnen`,passend:`Aanvulling bij ${family}`,basis:'Actueel nieuws uit Nederland',eigen:'Uit je gekozen bronnen'}
      if (reasons[e.supplement]) why = {...why,text:reasons[e.supplement],detail:true}
    }
    const { w, parts, planned, front, vervolg, big, _extra, ...rest } = e
    const lead = e.leadId || e.id
    const itemIds0 = e.kind === 'story' ? e.itemIds || storyById.get(e.id)?.itemIds || [lead] : [lead]
    const itemIds = mergedIds.has(e) ? [...new Set([...itemIds0, ...mergedIds.get(e)])] : itemIds0
    const keys = e.kind === 'story' ? e.keys || storyById.get(e.id)?.keys : null
    return { ...rest, ...(desk !== e.desk ? { rubriek: desk } : {}), itemIds, ...(keys ? { keys } : {}), title: e.title || itemOf(lead)?.title || null, why, _parts: parts || {}, _front: !!front }
  })
  // Bij een korte Editie geen blinde minimumverlaging: elke bekende kandidaat krijgt een
  // terminale reden uit dezelfde selectieroute. Dit is lokaal debugbewijs, geen accountpayload.
  let supply = null
  const regularCount = editionStoryCount(out)
  if (regularCount < EDITION_AUDIT_BELOW) {
    const decisions = []
    selectForReader(mineStories, newsPool, { ...opts, size: EDITION_SIZE, audit: decisions })
    if (extraPool.length) selectForReader(mineStories, extraPool, { ...opts, size: 2 * extraMax, plan: false, audit: decisions })
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
      decisions.push({kind:g.kind,id:g.id,itemIds:[...membersOf(g)],route:'algemene-editie',reason: represented([...membersOf(g)]) ? 'vertegenwoordigd' : !releadEntry(g) ? 'andere-taal' : !supplementReason(g) ? (finalReason(id,sid,g) === 'onverklaard' ? 'geen-aantoonbare-aanvulreden' : finalReason(id,sid,g)) : finalReason(id,sid,g)})
    }
    const counts = Object.fromEntries([...new Set(decisions.map(d=>d.reason))].sort().map(r=>[r,decisions.filter(d=>d.reason===r).length]))
    const unresolved = decisions.filter(d=>/onverk|onbekend|route-vol|gekozen-in-route/.test(d.reason))
    supply = {target:EDITION_SIZE,auditBelow:EDITION_AUDIT_BELOW,floor:EDITION_FLOOR,selected:regularCount,totalSlots:out.length,ownArticles:pool.length,decisions,counts,unresolved:unresolved.length,proven:regularCount>=EDITION_FLOOR && unresolved.length===0}
  }
  const shown = [...new Set(out.map((e) => e.leadId || e.id))]
  // Met `kortKop` per plek (shared/kort-kop.mjs): de korte kop voor de widgets, net als de Editie voor iedereen; een
  // kop die daar herschreven is, krijgt hier dezelfde korte kop.
  return metKorteKoppen({
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
  }, { herschreven: herschrevenVan(global) }) // de herschreven korte koppen van de algemene Editie (nooit zelf het model vragen)
}

export { withoutDebug, earlierEditions, editionBasis, personalRows } from './personal-basis.js'
