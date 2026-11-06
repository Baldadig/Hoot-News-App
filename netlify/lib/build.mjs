import { cleanIntro } from '../../shared/edition-display.mjs'
import { EDITOR_REVISION, editionCacheKey } from '../../shared/editor-version.mjs'
// De feed samenstellen: alles ophalen, de Stroom vullen, bundelen tot verhalen en de editie
// vastleggen. Draait op een vast ritme (functions/feed-refresh.mjs); de app krijgt het
// resultaat kant-en-klaar (functions/feed.mjs) en hoeft nooit op het ophalen te wachten.
import Anthropic from '@anthropic-ai/sdk'
import { byRecency, sigWords, sharedCount, buildStories, NL_TOP5_MIN, dutchPlace, editionSlot, previousSlotId, previousOf, selectForReader, openWithNews, curiosaDown, newsBeforePeople, dutchHeads, leadCandidates, leadPool, relinkEdition, widelyCovered, signatures, sameEvent, isLive } from './stories.mjs'
import { profileOf } from '../../shared/editor.mjs'
import { coverageOf, publisherOf, lightNews } from '../../shared/edition-policy.mjs'
import { isOpinion } from '../../shared/article-signals.mjs'
import { VL_HOME } from './desks.mjs'
import { matchTrending, insertBubble, bubbleCandidates, areasOf, nearStories } from './bubble.mjs'
import { createBrief, briefRows } from './brief.mjs'
import { articleKey, mergeSnippets, isLiveblog, bingId, bingUnmeasured, bingOriginal, bingSized } from './snippets.mjs'
import { SOURCES, BLUESKY_AUTHORS, BLUESKY_HOURS, BSKY_BRAND, MAIN_IDS, MUSIC_IDS, EDITION_CATS, UA } from './sources.mjs'
import { loadSourceWithRetry } from './rss.mjs'
import { STORE_KEY, splitFeed, storeOf, withLatest } from './stream.mjs'
import { loadSnippets, loadTrends, loadSourceAvatars, loadBlueskyProfiles, loadBskyCards } from './lookups.mjs'
import { loadOgImage } from './og.mjs'
import { measureFeedImages, loadImageSize } from './image-measure.mjs'
import { rememberShareRecords } from './share-records.mjs'
import { keywordTopics, articleTopics } from './topics.mjs'
import { normTitle, preview } from './text.mjs'
import { kvGet, kvSet, remember, storageMode } from './kv.mjs'
import { fetchAuthorPosts } from '../../shared/bluesky.mjs'
import { hash, safeHttpUrl } from '../../shared/util.mjs'
import { withoutCopies, titleKey } from '../../shared/dedupe.mjs'
import { visibleFor, READER_LANG } from '../../shared/lang.mjs'
import { inStroom, forEdition } from '../../shared/stroom.mjs'

const MIN = 6e4
const DAY = 864e5
const SOURCE = new Map(SOURCES.map((s) => [s.id, s]))
// Telt mee voor verhalen: alles behalve regionaal (veel gedeelde stukken) en muziek.
const inStories = (it) => it.kind === 'article' && SOURCE.get(it.source)?.cat !== 'regio' && !MUSIC_IDS.has(it.source)
// Telt mee voor de editie: landelijk, internationaal, economie, tech en wetenschap.
// De editie is nieuws: geen sport- of muziekbronnen, en ook geen sportbericht uit een gewone
// nieuwsbron (een grote voetbalavond kwam anders via de Volkskrant toch bovenaan).
const SPORT_TOPICS = new Set(['voetbal', 'f1', 'wielrennen', 'tennis', 'wintersport', 'olympisch'])
const inEdition = (it) => EDITION_CATS.has(SOURCE.get(it.source)?.cat) && !MUSIC_IDS.has(it.source) && !keywordTopics(`${it.title} ${it.text || it.summary || ''}`).some((t) => SPORT_TOPICS.has(t))

export async function buildFeed({ now = Date.now() } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const anthropic = apiKey ? new Anthropic({ apiKey, timeout: 25000, maxRetries: 1 }) : null

  // 1. Ophalen — alles tegelijk; een bron die uitvalt houdt de rest niet op.
  const avatars = remember('avatars-v1', DAY, loadSourceAvatars, { now, valid: (m) => Object.values(m).some(Boolean) })
  const handles = BLUESKY_AUTHORS.map((a) => a.handle)
  const profiles = handles.length === 0 ? Promise.resolve({}) : remember('bsky-profiles-' + hash(handles.join()), DAY, () => loadBlueskyProfiles(handles), { now, valid: (m) => Object.keys(m).length > 0 }).catch(() => ({}))
  // De hele feed per bron; daaruit twee lijsten (shared/stroom.mjs).
  const [fetched, bskyGroups, registry, stored] = await Promise.all([
    settle(SOURCES, (s) => loadSourceWithRetry(s, avatars, { limit: Infinity })),
    settle(BLUESKY_AUTHORS, (a) => loadBluesky(a, now)),
    kvGet('registry-v1').then((r) => (r && typeof r === 'object' ? r : {})),
    kvGet(STORE_KEY).catch(() => null),
  ])
  // De Stroom: per bron alles van de afgelopen 36 uur, hooguit 60, samen met wat we eerder zagen.
  // De verhalen en de Editie: het oude venster, zoals vóór de 36-uursgrens (de eerste 30 van de
  // feed, per rubriek minder). Juist de trage bronnen met achtergrondstukken reiken daarin verder
  // terug dan 36 uur: dat is het materiaal voor de bubbel en de verdieping (stream.mjs, splitFeed).
  const { mainGroups, streamIds, editionIds, editionExtra } = splitFeed(fetched, stored, { now })
  // Bluesky-posts horen bij allebei (ze hebben hun eigen 36 uur, BLUESKY_HOURS).
  const inWindow = (it) => it.kind === 'post' || streamIds.has(it.id)
  const inPool = (it) => it.kind === 'post' || editionIds.has(it.id)

  // 2. De berichten, 3. gaten vullen, 4. voorvertoningen lenen.
  // De drie aanvullingen raken elk andere bronnen (zoekindex, Bluesky, de artikelpagina) en lopen
  // dus tegelijk: zo duurt de ronde niet langer nu ook betaalde bronnen hun deelbeeld krijgen.
  const items = streamItems([...mainGroups.flatMap((g) => g.items), ...editionExtra, ...bskyGroups.flatMap((g) => g.items)])
  const [gaps] = await Promise.all([fillGaps(items, now).then(async (r) => (await sizeBingImages(items, now), r)), imagesFromBluesky(items, now), imagesFromArticles(items, now)])
  stripPromoIntros(items)
  borrowPreviews(items, [...mainGroups.flatMap((g) => g.items), ...editionExtra])
  // Bewaren zoals ze nu zijn (met beeld en inleiding), vóór de verhalen er hun id aan hangen. Met
  // wat een gelijktijdige ronde in een andere instantie intussen schreef (withLatest).
  const latest = await kvGet(STORE_KEY).catch(() => null)
  await kvSet(STORE_KEY, storeOf(withLatest(mainGroups, latest, { now }))).catch(() => {})

  // 5. Verhalen: bundelen over alle bronnen (behalve regionaal en muziek), met per verhaal de
  //    kenmerken van al zijn stukken (`keys`): het toestel kent van een verhaal alleen de eigen
  //    bronnen en moet toch weten wat er in de vorige Editie al over geschreven was. In de
  //    uitgebreide stand (H6): twee namen in de kop binnen twaalf uur, EU-landen en instituten in
  //    twee talen, een los stuk bij de kern van een groot verhaal.
  //    Uit het oude venster (inPool), niet uit de Stroom.
  const articlePool = storyPool(items.filter(inPool))
  const stories = buildStories(articlePool, registry, { mainIds: MAIN_IDS, keys: true, extended: true })
  const poolById = new Map(articlePool.map((i) => [i.id, i]))
  for (const st of stories) for (const id of st.itemIds) poolById.get(id).storyId = st.id
  // Nog zonder intro (de Volkskrant als de zoekindex achterloopt): die van een ander stuk uit
  // hetzelfde verhaal, met "via X". Nooit een samenvatting die we zelf schrijven.
  borrowFromStories(stories, poolById)

  // 6. Eerst-gezien-tijd per bericht, en bij welk verhaal het hoort (houdt id's stabiel).
  await updateRegistry(registry, items, now)

  // Elk bericht zegt of het alleen voor de Editie of alleen voor de Stroom is (shared/stroom.mjs).
  const out = items.map((it) => toClient(it, { editionOnly: !inWindow(it), streamOnly: !inPool(it) })).filter((i) => i.url) // laatste vangnet: geen link, geen bericht

  // 7. De editie van dit dagdeel (één keer samengesteld, daarna vast). Ook daar telt elk stuk
  // één keer, al brengen vijf zusterkranten het.
  const edition = await composeEdition({ now, stories, articlePool: articlePool.filter(inEdition), pool: editionPool(out.filter(forEdition), articlePool), anthropic })
  // Eerst de vastgelegde hoofdbeelden, dan de hoofden van de verhalen, dan de rest.
  // Zo kan de begrensde wachtrij niet worden opgeslokt door alleen de nieuwste Stroom-berichten.
  const outById = new Map(out.map(i => [i.id, i]))
  const beforeImages = JSON.stringify(edition.snapshot.items.map(i => i.imageMeta))
  await measureFeedImages([...edition.public.items, ...stories.map(st => outById.get(st.leadId)).filter(Boolean), ...out, ...edition.snapshot.items], now)
  if (beforeImages !== JSON.stringify(edition.snapshot.items.map(i => i.imageMeta))) {
    await kvSet(editionCacheKey(edition.public.id), edition.snapshot).catch(() => {})
  }
  await rememberShareRecords([...edition.snapshot.items, ...out], [...edition.snapshot.stories, ...stories], SOURCES, now).catch(() => {})
  // Wat intussen uit de feeds is verdwenen halen we uit de momentopname van de editie.
  const liveStoryIds = new Set(stories.map((st) => st.id))
  const haveOut = new Set(out.map((i) => i.id))

  // De app haalt per bron alleen wat je volgt (`parts`): de Stroom én de voeding van De Redacteur
  // op het toestel, met de vlaggen van shared/stroom.mjs. In de kern staat wat iedereen nodig
  // heeft: de bronnen, de verhalen met al hun berichten (om te vergelijken) en de editie. `items`
  // (de oude vorm, refresh.mjs) is alleen de Stroom.
  const parts = {}
  for (const it of out) (parts[it.source] ||= []).push(it)
  const storyItems = out.filter((i) => i.storyId)
  return {
    sources: sourceList({ mainGroups, bskyGroups, avatars: await avatars, profiles: await profiles }),
    items: out.filter(inStroom),
    parts,
    related: [...storyItems, ...edition.snapshot.items.filter((i) => !haveOut.has(i.id) || !i.storyId)],
    stories: [...stories, ...edition.snapshot.stories.filter((st) => !liveStoryIds.has(st.id))],
    edition: edition.public,
    meta: {
      updatedAt: new Date(now).toISOString(),
      storage: storageMode(),
      aiEnabled: !!anthropic,
      vkSnippets: gaps.vkSnippets, // Volkskrant-berichten met een inleiding uit de zoekindex
      imagesFilled: gaps.filled, // berichten met een beeld uit de zoekindex
    },
  }
}

// ---------- Ophalen ----------
const settle = async (list, load) =>
  (await Promise.allSettled(list.map(load))).map((r, i) => (r.status === 'fulfilled' ? r.value : { id: list[i].id || list[i].handle, name: list[i].name, ok: false, count: 0, items: [], error: String(r.reason) }))

async function loadBluesky(author, now) {
  const id = 'bsky:' + author.handle
  try {
    const items = await fetchAuthorPosts(author.handle, { name: author.name, hours: BLUESKY_HOURS, headers: { 'User-Agent': UA }, now })
    return { id, name: author.name, ok: true, count: items.length, items }
  } catch (e) {
    return { id, name: author.name, ok: false, count: 0, items: [], error: String(e?.message || e) }
  }
}

// ---------- 2. De Stroom ----------
// Nieuwste eerst, zonder dubbelen (zelfde link of zelfde kop), maar alleen binnen één bron:
// zusterkranten brengen vaak hetzelfde stuk, en wie Tubantia volgt maar het AD niet, moet de hele
// krant krijgen. Over de bronnen heen ontdubbelt de app (shared/dedupe.mjs), want alleen die weet
// welke bronnen je volgt. De grens per bron (36 uur, hooguit 60) staat in stream.mjs.
// Een bericht in een andere taal dan zijn bron (`offLang`, rss.mjs) toont alleen aan een lezer
// van die taal: de app is Nederlandstalig, dus een Engelstalig Parool-stuk valt hier af, en
// daarmee ook uit de verhalen, de Editie en de bronpakketten. (Een Engelse app bouwt straks met
// readerLang 'en'.)
export function streamItems(all, { readerLang = READER_LANG } = {}) {
  return withoutCopies(all.filter((it) => it.url && visibleFor(it, readerLang)).sort(byRecency), { perSource: true })
}

// Voor de verhalen telt een stuk één keer, ook als meer bronnen het brengen: anders telt
// "+N bronnen" dezelfde publicatie dubbel.
export function storyPool(items) {
  return withoutCopies(items.filter(inStories))
}

// Voor de editie (bubbel, "waar iedereen over schrijft"): ook elk stuk één keer. Het exemplaar
// uit een verhaal gaat voor, zodat elk verhaal al zijn berichten terugvindt.
export function editionPool(out, articlePool) {
  const keep = new Set(withoutCopies([...articlePool, ...out]).map((i) => i.id))
  return out.filter((i) => keep.has(i.id))
}

// ---------- 3. Gaten vullen uit de zoekindex ----------
// De Volkskrant (inleiding en beeld), de NYT (beeld dat de feed nog niet heeft) en The Economist
// (geen beelden in de feed). Wat gevonden is wordt bewaard, dus het groeit. De zoekindex vragen
// we alleen als er iets nieuws te zoeken is, of na een half uur opnieuw.
// Bronnen waarvan de feed alleen koppen (of geen beeld) levert: de inleiding en het beeld komen
// dan uit de zoekindex van Bing Nieuws. DPG-kranten: één vraag per rubriek die nu in de feed staat.
// Bloomberg en De Tijd weigeren ons hun artikelpagina (403): hun beeld komt ook uit de zoekindex.
const GAPS = { volkskrant: 'volkskrant.nl', trouw: 'trouw.nl', parool: 'parool.nl', demorgen: 'demorgen.be', nyt: 'nytimes.com', economist: 'economist.com', bloomberg: 'bloomberg.com', tijd: 'tijd.be' }
const PER_SECTION = new Set(['volkskrant', 'trouw', 'parool', 'demorgen'])
// Veel rubrieken tegelijk in de feed. (De Engelstalige van het Parool, guide en amsterdam-news,
// vallen al in de Stroom af: daar zoeken we niets meer voor.)
const WIDE_SECTIONS = new Set(['volkskrant', 'parool'])
// Een stuk zonder intro zoeken we vaker opnieuw (elke 10 minuten in plaats van 30): de zoekindex
// loopt uren achter, en juist de verse stukken staan in de Editie. Wat de algemene vragen niet meer
// vinden (ouder dan hun 50 nieuwste), zoeken we gericht op de kop: hooguit 10 per ronde, eerst wie
// een intro mist, dan wie een beeld mist (Bloomberg, De Tijd), elk stuk hooguit 6 keer en niet vaker
// dan eens per 20 minuten (gapTitleQueries).
const GAP_RETRY = 10 * MIN
const GAP_QUIET = 30 * MIN
export function gapTitleQueries(open, tries = {}, now, { max = 10, every = 20 * MIN, most = 6 } = {}) {
  return open
    .filter((it) => (!it.summary || !it.image) && it.title && (tries[articleKey(it.url)]?.n || 0) < most && now - (tries[articleKey(it.url)]?.at || 0) >= every)
    .sort((a, b) => !!a.summary - !!b.summary || (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, max)
}
async function fillGaps(items, now) {
  const result = { vkSnippets: 0, filled: 0 }
  const needs = items.filter((it) => GAPS[it.source] && it.kind === 'article' && !isLiveblog(it.url, it.title) && (!it.summary || !it.image))
  if (!needs.length) return result
  const [stored, checkedAt, triedRaw] = await Promise.all([kvGet('gap-fill-v1'), kvGet('gap-fill-at'), kvGet('gap-tries-v1')])
  let store = stored && typeof stored === 'object' ? stored : {}
  const tries = triedRaw && typeof triedRaw === 'object' ? triedRaw : {}
  // Open: nog niets gevonden, of wel een beeld maar nog geen intro terwijl het stuk er een mist.
  const open = needs.filter((it) => {
    const hit = store[articleKey(it.url)]
    return !hit || (!it.summary && !hit.s)
  })
  const fresh = open.some((it) => Date.parse(it.publishedAt || 0) > (checkedAt || 0))
  const wait = open.some((it) => !it.summary) ? GAP_RETRY : GAP_QUIET
  if (open.length && (fresh || now - (checkedAt || 0) > wait)) {
    const wanted = [...new Set(open.map((it) => it.source))]
    const sections = (src) => [...new Set(open.filter((it) => it.source === src).map((it) => it.url.split('/')[3] || '').filter((x) => /^[a-z-]+$/.test(x)))]
    const queries = (src) => (PER_SECTION.has(src) ? [`site:${GAPS[src]}`, ...sections(src).slice(0, WIDE_SECTIONS.has(src) ? 10 : 6).map((sec) => `site:${GAPS[src]}/${sec}`)] : [`site:${GAPS[src]}`])
    const aimed = gapTitleQueries(open, tries, now)
    for (const it of aimed) tries[articleKey(it.url)] = { n: (tries[articleKey(it.url)]?.n || 0) + 1, at: now }
    const bySource = (src) => aimed.filter((it) => it.source === src).map((it) => `site:${GAPS[src]} ${it.title.replace(/["“”„]/g, '')}`)
    const found = (
      await Promise.all([
        ...wanted.map((src) => loadSnippets(queries(src), GAPS[src]).catch(() => [])),
        ...wanted.filter((src) => bySource(src).length).map((src) => loadSnippets(bySource(src), GAPS[src], { deep: false }).catch(() => [])),
      ])
    ).flat()
    store = mergeSnippets(store, found, now)
    for (const [k, v] of Object.entries(tries)) if (now - (v?.at || 0) > 2 * DAY) delete tries[k]
    await Promise.all([found.length ? kvSet('gap-fill-v1', store) : null, kvSet('gap-fill-at', now), aimed.length ? kvSet('gap-tries-v1', tries) : null])
  }
  for (const it of needs) {
    const hit = store[articleKey(it.url)]
    if (!hit) continue
    if (!it.summary && hit.s) {
      it.summary = preview(hit.s)
      it.text = hit.s
      if (it.source === 'volkskrant') result.vkSnippets++
    }
    if (!it.image && hit.img) {
      it.image = hit.img
      result.filled++
    }
  }
  return result
}

// ---------- 3a. De maat van een beeld uit de zoekindex ----------
// Bing levert zijn beeld op elke gevraagde maat, ook als het bronbeeld klein is (dan met witte
// randen). We meten het bronbeeld één keer (en onthouden het een week) en vragen het daarna op zijn
// eigen maat op. Groot genoeg (The Economist: 700 breed), dan tonen web en app het ook groot.
// Hooguit 40 nieuwe per ronde, 8 tegelijk, en na 5 seconden houden we op: wat dan nog open is,
// blijft voorlopig een miniatuur.
export async function sizeBingImages(items, now, { load = loadImageSize, get = kvGet, set = kvSet, max = 40, budget = 5000 } = {}) {
  try {
    const want = items.filter((it) => it.kind === 'article' && bingUnmeasured(it.image))
    if (!want.length) return
    const stored = await get('bing-size-v1')
    const cache = stored && typeof stored === 'object' ? stored : {}
    const ids = [...new Set(want.map((it) => bingId(it.image)))]
    const missing = ids.filter((id) => !cache[id] || (!cache[id].w && now - cache[id].at > 60 * MIN)).slice(0, max)
    if (missing.length) {
      const round = AbortSignal.timeout(budget)
      await Promise.all(
        Array.from({ length: 8 }, async () => {
          while (missing.length && !round.aborted) {
            const id = missing.shift()
            const size = await load(bingOriginal(id), { signal: AbortSignal.any([round, AbortSignal.timeout(3000)]) }).catch(() => null)
            if (size || !round.aborted) cache[id] = { at: now, ...(size ? { w: size.w, h: size.h } : {}) }
          }
        }),
      )
      for (const [k, v] of Object.entries(cache)) if (now - (v?.at || 0) > 7 * DAY) delete cache[k]
      await set('bing-size-v1', cache)
    }
    for (const it of want) {
      const hit = cache[bingId(it.image)]
      if (hit?.w) it.image = bingSized(bingId(it.image), hit.w, hit.h)
    }
  } catch {
    /* zonder maat blijft het een miniatuur, zoals voorheen */
  }
}

// ---------- 3b. Beeld via Bluesky ----------
// Bronnen zonder beeld in de feed (`bskyImages`) krijgen het beeld van hun eigen linkkaart op
// Bluesky, gekoppeld op de kop. Tweakers zet in de feed "Review - " voor de kop, op Bluesky niet;
// en past een kop soms nog aan ("om PHP-bug" werd "door PHP-bug"): dan telt sterke overlap.
const KICKER = /^(review|preview|videoreview|achtergrond|column|interview|podcast|plan|video)\s*[-–]\s*/i
export function matchCard(title, cards) {
  const key = normTitle(title.replace(KICKER, ''))
  const exact = cards.find((c) => normTitle(c.title.replace(KICKER, '')) === key)
  if (exact) return exact
  const w = sigWords(title)
  if (w.size < 4) return null
  return cards.find((c) => {
    const cw = sigWords(c.title)
    return sharedCount(w, cw) / Math.max(w.size, cw.size) >= 0.75
  }) || null
}
async function imagesFromBluesky(items, now) {
  for (const src of SOURCES.filter((s) => s.bskyImages && s.bsky)) {
    const needs = items.filter((it) => it.source === src.id && it.kind === 'article' && !it.image)
    if (!needs.length) continue
    const cards = await remember('bsky-cards-' + src.id, 9 * MIN, () => loadBskyCards(src.bsky), { now, valid: (c) => c.length > 0 }).catch(() => [])
    for (const it of needs) {
      const hit = matchCard(it.title, cards || [])
      if (hit) it.image = safeHttpUrl(hit.thumb)
    }
  }
}

// ---------- 3c. Beeld van het artikel zelf ----------
// Bronnen waarvan de feed geen beeld meestuurt (Rolling Stone, DW, Al Jazeera, VRT, Sporza, en
// sinds build 46 ook de betaalde: Nature, Scientific American, FD, MIT Technology Review …): de
// deelafbeelding van het artikel (og.mjs; nooit achter een cookiemuur of login om). Elk artikel één
// keer proberen en onthouden (ook "geen beeld"), per ronde hooguit 60 nieuwe, de nieuwste eerst,
// 10 tegelijk, elke pagina hooguit 4 seconden en de hele stap hooguit 8: wat dan nog open is, komt
// de volgende ronde. Nooit een beeld van een ander artikel (fotorechten); een kopie van hetzelfde stuk
// bij een zusterkrant (zelfde kop) is wel hetzelfde artikel.
const OG_KEEP = 4 * 24 * 60 * MIN
export function wantsArticleImage(it, src) {
  return !!src && !GAPS[src.id] && !src.bskyImages && it.kind === 'article' && !it.image && !isLiveblog(it.url, it.title)
}
export async function imagesFromArticles(items, now, { max = 60, parallel = 10, budget = 8000, timeout = 4000, load = loadOgImage, get = kvGet, set = kvSet, sourceOf = (id) => SOURCE.get(id) } = {}) {
  const needs = items.filter((it) => wantsArticleImage(it, sourceOf(it.source)))
  if (!needs.length) return
  const stored = await get('og-images-v1')
  const store = stored && typeof stored === 'object' ? stored : {}
  // Zusterkranten brengen vaak hetzelfde stuk onder een andere link: één exemplaar per kop
  // ophalen, de kopieën krijgen dat beeld (zie hieronder). Zo gaat het budget naar echte stukken.
  const known = new Set(needs.filter((it) => store[articleKey(it.url)]?.img).map((it) => titleKey(it.title)).filter(Boolean))
  const open = withoutCopies(needs.filter((it) => !(articleKey(it.url) in store) && !known.has(titleKey(it.title))).sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))).slice(0, max)
  const round = AbortSignal.timeout(budget)
  let tried = 0
  await Promise.all(
    Array.from({ length: parallel }, async () => {
      while (open.length && !round.aborted) {
        const it = open.shift()
        const img = safeHttpUrl(await load(it.url, { signal: round, timeout }))
        // Afgebroken door de rondegrens: niet onthouden als "geen beeld", de volgende ronde opnieuw.
        if (img || !round.aborted) {
          store[articleKey(it.url)] = { img, at: now }
          tried++
        }
      }
    }),
  )
  const byTitle = new Map()
  for (const it of needs) {
    const hit = store[articleKey(it.url)]
    if (!hit?.img) continue
    it.image = hit.img
    if (titleKey(it.title)) byTitle.set(titleKey(it.title), hit.img)
  }
  for (const it of needs) if (!it.image && byTitle.has(titleKey(it.title))) it.image = byTitle.get(titleKey(it.title))
  if (tried) {
    for (const [k, v] of Object.entries(store)) if (now - (v?.at || 0) > OG_KEEP) delete store[k]
    await set('og-images-v1', store)
  }
}

// ---------- 4. Voorvertoning lenen ----------
// Een Nederlandstalig artikel zonder eigen samenvatting krijgt de teaser van een andere
// Nederlandstalige bron over hetzelfde verhaal. Streng: alleen bij sterke overlap in de kop, met bronvermelding.
// Alle Nederlandstalige bronnen doen mee, als ontvanger én als gever (Trouw, Parool, De Morgen
// en regionale kranten leveren vaak alleen een kop).
const dutch = (id) => SOURCE.get(id)?.lang === 'nl'
// Per bericht: een Engelstalig Parool-stuk geeft geen teaser aan een Nederlands bericht.
const dutchItem = (it) => (it.lang || SOURCE.get(it.source)?.lang) === 'nl'
// Sterke overlap in de kop: minstens 4 gedeelde kernwoorden, of 3 als dat 60% of meer is van de
// kortste kop. Dezelfde drempel voor lenen op de kop en lenen binnen een verhaal.
export function strongOverlap(n, sizeA, sizeB) {
  return n >= 4 || (n >= 3 && n / Math.max(1, Math.min(sizeA, sizeB)) >= 0.6)
}
// Kernwoorden om te lenen: zonder bezittelijke en persoonlijke voornaamwoorden. "Help, mijn kind ..."
// boven twee verschillende stukken is geen gedeeld onderwerp.
const PRONOUNS = new Set(['mijn', 'jouw', 'haar', 'jullie', 'zich', 'zelf', 'your', 'mine', 'ours', 'hers', 'yours'])
// Ook zwakke werkwoorden zeggen niets over het onderwerp: "Wat doet Klaver ..." en "Klaver doet ..."
// delen alleen Klaver (keuring b46). Korter dan 4 letters (is, kan, wil) telt sigWords al niet.
const WEAK_VERBS = new Set(
  'doet doen deed deden gedaan maakt maken maakte maakten gemaakt gaat gaan ging gingen gegaan komt komen kwam kwamen gekomen wilt wilde wilden willen kunt kunnen konden moet moeten moest moesten heeft hebben hadden gehad wordt worden werd werden geworden staat staan stond stonden laat laten liet lieten zegt zeggen zei zeiden krijgt krijgen kreeg kregen blijft blijven bleef bleven lijkt lijken zitten does make makes made goes going gets have wants'.split(' ')
)
// Eigen namen in een kop (plaatsen, personen): woorden met hoofdletter die niet het begin van een zin of
// van een stuk na een leesteken zijn. Elke kop met een eigen naam die de ander niet noemt gaat over een ander
// geval ("... aanrijding in Meeuwen" naast "... aanrijding in Leiden"): dan lenen we niet.
const namesOf = (title) => {
  const out = new Set()
  const tokens = String(title || '').split(/\s+/).filter(Boolean)
  tokens.forEach((raw, i) => {
    const prev = tokens[i - 1]
    if (i === 0 || /[:.!?;–—|"“‘'(]$/.test(prev) || /^["“‘'(]/.test(prev) && i === 1) return
    const w = raw.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    if (w.length >= 3 && /^\p{Lu}\p{Ll}/u.test(w) && !/^\p{Lu}+$/u.test(w)) out.add(w.toLowerCase())
  })
  return out
}
const wordsOf = (title) => new Set(String(title || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean))
const named = (name, words) => {
  for (const w of words) if (w === name || (Math.min(w.length, name.length) >= 5 && (w.startsWith(name) || name.startsWith(w)))) return true
  return false
}
export function conflictingNames(titleA, titleB) {
  const a = namesOf(titleA)
  const b = namesOf(titleB)
  const wa = wordsOf(titleA)
  const wb = wordsOf(titleB)
  return [...a].some((n) => !named(n, wb)) && [...b].some((n) => !named(n, wa))
}
const borrowWords = (title) => {
  const w = sigWords(title)
  for (const p of PRONOUNS) w.delete(p)
  for (const v of WEAK_VERBS) w.delete(v)
  return w
}
// Een intro om te lenen, zonder reclame: zinnen die oproepen een app te downloaden, je te abonneren of
// meldingen aan te zetten gaan eruit ("Download de app DS Nieuws ..." onder een kop van De Morgen). Blijft
// er niets over, dan wordt er niet geleend. De vaste tekst van een liveblog leent nooit.
const PROMO = /\b(?:download|installeer|app store|google play|in de app|onze app|nieuwsapp|abonneer|schrijf je in|meld je aan|nieuwsbrief|pushmelding|pushbericht|notificaties|volg ons|lees ook|bekijk ook|kijk ook|volg hier|subscribe|sign up|newsletter)/i
// Eigen intro's: alleen gebiedende reclamezinnen, met woordgrenzen. "Downloading", "a malicious download" of
// "subscribers" is gewoon nieuws (Wired, IGN, Eurogamer).
const PROMO_OWN = /\b(?:download\s+(?:de|onze|deze|ons|the|our|this|my|gratis|free|now|today)\b|download\s+hier\b|installeer\b|(?:get|download)\s+the\s+app\b|(?:in|via)\s+onze\s+app\b|abonneer\s+(?:je|u)\b|schrijf\s+je\s+in\b|meld\s+je\s+aan\b|volg\s+ons\b|sign\s+up\b|subscribe\s+(?:to|now|today|for|here)\b|subscribe[.!]|(?:our|this|the)\s+(?:daily\s+|weekly\s+)?newsletter\b|(?:onze|de|deze)\s+nieuwsbrief\b|schakel\s+(?:pushmeldingen|notificaties)\s+in\b|zet\s+(?:pushmeldingen|notificaties)\s+aan\b|turn\s+on\s+notifications\b)/i
// Ook de eigen intro van een bron krijgt dit filter ("Download de app" onder een kop van De Standaard):
// valt er niets over, dan is er geen intro.
export function withoutPromo(text, re = PROMO_OWN) {
  const sentences = String(text || '').match(/[^.!?]+(?:[.!?]+["'’”)]?|$)\s*/g) || []
  return sentences.filter((z) => !re.test(z)).join('').trim()
}
export function lendableIntro(d) {
  if (!d?.summary || isLiveblog(d.url, d.title)) return ''
  return withoutPromo(d.summary, PROMO)
}
// Eigen intro's van alle berichten (geen posts), vóór het lenen: een intro die alleen reclame was, laat de
// plek leeg en mag dan lenen.
export function stripPromoIntros(items) {
  for (const it of items) {
    if (it.kind === 'post') continue
    if (typeof it.summary === 'string' && PROMO_OWN.test(it.summary)) it.summary = withoutPromo(it.summary)
    if (typeof it.text === 'string' && PROMO_OWN.test(it.text)) it.text = withoutPromo(it.text)
  }
}
export function borrowPreviews(items, mainItems) {
  const donors = mainItems
    .filter((it) => it.kind === 'article' && it.summary && !it.borrowedFrom && dutchItem(it) && visibleFor(it) && lendableIntro(it))
    .map((d) => ({ d, w: borrowWords(d.title) }))
  for (const it of items) {
    if (it.kind !== 'article' || it.summary || !dutchItem(it) || isLiveblog(it.url, it.title)) continue
    const w = borrowWords(it.title)
    if (w.size < 3) continue
    let best = null
    let bestN = 0
    let bestSize = 0
    for (const { d, w: dw } of donors) {
      if (d.source === it.source || conflictingNames(it.title, d.title)) continue
      const n = sharedCount(w, dw)
      if (n > bestN) [best, bestN, bestSize] = [d, n, dw.size]
    }
    if (best && strongOverlap(bestN, w.size, bestSize)) {
      it.summary = lendableIntro(best)
      it.text = it.summary
      it.borrowedFrom = best.sourceName
    }
  }
}

// ---------- 5b. Intro lenen binnen een verhaal ----------
// Een stuk dat na de zoekindex en het lenen op de kop nog geen intro heeft, krijgt die van een ander
// stuk uit hetzelfde verhaal: zelfde taal, een andere bron, een eigen intro (geen geleende, en
// liever geen afgekapte), en dezelfde sterke overlap in de kop als bij lenen op de kop (strongOverlap):
// het bundelen van verhalen voegt soms twee stukken ten onrechte samen. Met
// bronvermelding (`borrowedFrom`: "via X"). Geen liveblogs.
const TRAIL = /(?:…|\.{3})\s*$/
const langOf = (it) => it.lang || SOURCE.get(it.source)?.lang
export function borrowFromStories(stories, byId) {
  let n = 0
  for (const st of stories) {
    const members = st.itemIds.map((id) => byId.get(id)).filter((i) => i?.kind === 'article')
    for (const it of members) {
      if (it.summary || isLiveblog(it.url, it.title)) continue
      const w = borrowWords(it.title)
      const matches = (d) => {
        const dw = borrowWords(d.title)
        return strongOverlap(sharedCount(w, dw), w.size, dw.size) && !conflictingNames(it.title, d.title)
      }
      const donor = members
        .filter((d) => d !== it && d.summary && !d.borrowedFrom && d.source !== it.source && langOf(d) === langOf(it) && visibleFor(d) && lendableIntro(d) && matches(d))
        .sort((a, b) => TRAIL.test(a.summary) - TRAIL.test(b.summary))[0]
      if (!donor) continue
      it.summary = lendableIntro(donor)
      if (!it.text) it.text = it.summary
      it.borrowedFrom = donor.sourceName
      n++
    }
  }
  return n
}

// ---------- 6. Register ----------
async function updateRegistry(registry, list, now) {
  let changed = false
  for (const it of list) {
    const r = registry[it.id]
    if (!r) {
      registry[it.id] = { f: now, ...(it.storyId ? { s: it.storyId } : {}) }
      changed = true
    } else if ((r.s || null) !== (it.storyId || null)) {
      if (it.storyId) r.s = it.storyId
      else delete r.s
      changed = true
    }
    it.firstSeenAt = new Date(registry[it.id].f).toISOString()
  }
  const current = new Set(list.map((i) => i.id))
  for (const id of Object.keys(registry)) {
    if (!current.has(id) && now - registry[id].f > 8 * DAY) {
      delete registry[id]
      changed = true
    }
  }
  if (changed) await kvSet('registry-v1', registry)
}

// ---------- Wat de app van een bericht krijgt ----------
// Lege velden laten we weg: dat scheelt een kwart van de omvang.
function toClient(it, { editionOnly = false, streamOnly = false } = {}) {
  const src = SOURCE.get(it.source)
  const own = [...(src?.topics || []), ...(src?.music ? ['muziek'] : [])]
  const { topics, mainTopics } = articleTopics(it, own)
  return compact({
    id: it.id,
    kind: it.kind,
    source: it.source,
    sourceName: it.sourceName,
    handle: it.handle,
    domain: it.domain,
    avatar: safeHttpUrl(it.avatar),
    avatarContain: it.avatarContain,
    brandColor: it.brandColor,
    author: it.author,
    type: it.type,
    section: it.section,
    // Alleen bij een afwijkende taal (de brontaal staat in de bronnenlijst): scheelt omvang.
    lang: it.offLang ? it.lang : null,
    offLang: it.offLang,
    storyId: it.storyId,
    firstSeenAt: it.firstSeenAt,
    title: it.title,
    summary: it.kind === 'post' ? it.summary : withoutPromo(cleanIntro(it.summary, it.author)),
    borrowedFrom: it.borrowedFrom,
    readMin: it.readMin,
    topics,
    mainTopics: mainTopics.length ? mainTopics : null,
    url: safeHttpUrl(it.url),
    linkTitle: it.linkTitle,
    image: safeHttpUrl(it.image),
    imageRatio: it.imageRatio,
    imageMeta: it.imageMeta,
    video: safeHttpUrl(it.video),
    videoPoster: safeHttpUrl(it.videoPoster),
    publishedAt: it.publishedAt,
    editionOnly,
    streamOnly,
  })
}
const compact = (o) => {
  for (const k in o) if (o[k] == null || o[k] === false || o[k] === '') delete o[k]
  return o
}

// ---------- 7. Editie ----------
// De algemene Editie (Redacteur 3b, besluit van Alex 6 november): de persoonlijke Editie met een leeg profiel
// (de basisbronnen, geen interesses), met dezelfde vangrails: de voorpagina met een Nederlandse plek, hooguit
// INT_MAX buitenland zonder reden, de kernrubrieken en de toelating (selectForReader). Wie niets koos, koos ook niet
// tegen buitenland: groot buitenlands nieuws (OPEN_WORLD_MIN uitgevers) is voor een leeg profiel een reden en valt
// buiten INT_MAX (ronde 2, shared/edition-policy.mjs: openWorld). Daarna opent plek 01 met
// nieuws (openWithNews). Geen waarom, geen trends: alleen de plekken, in de vorm van de vastgelegde Editie.
// `stories`/`pool`: alles; `newsStories`/`newsPool`: wat voor de Editie telt. `previous`: de vorige Editie.
export function generalEdition({ stories = [], newsStories = stories, pool = [], newsPool = pool, now = Date.now(), mainIds = MAIN_IDS, sources = SOURCES, previous = null } = {}) {
  const prof = profileOf({ followed: mainIds, sources })
  // Voor de Nederlandse plekken (dutchPlace) tellen alle stukken van een verhaal, ook die buiten de nieuwspool (ronde 4 · 2).
  const allById = new Map(pool.map((i) => [i.id, i]))
  const fullStory = new Map(stories.map((st) => [st.id, st]))
  const allOf = (id) => (fullStory.get(id)?.itemIds || []).map((x) => allById.get(x)).filter(Boolean)
  const storyItems = new Map(newsStories.map((st) => [st.id, allOf(st.id)]))
  const sel = selectForReader(newsStories, newsPool, { mainIds, now, previous, prof, general: true, ctx: { storyItems } })
  const byId = new Map(newsPool.map((i) => [i.id, i]))
  const storyById = new Map(newsStories.map((st) => [st.id, st]))
  const entries = sel.map((e) => (e.kind === 'story' ? { kind: 'story', id: e.id, leadId: e.leadId, desk: e.desk ?? null } : { kind: 'item', id: e.id, desk: e.desk ?? null }))
  const itemsOf = (e) => (e.kind === 'story' ? storyById.get(e.id)?.itemIds || [] : [e.id]).map((id) => byId.get(id)).filter(Boolean)
  // Curiosa nooit in de top 3 (3b · 5), nieuwsbelang boven sensatie (ronde 6 · 2), dan plek 01 met nieuws, dan de
  // Nederlandse ondergrens (3b · 3) en bovenaan Nederlandse koppen (ronde 6 · 1).
  curiosaDown(entries, { itemsOf, storyOf: (e) => storyById.get(e.id) })
  const allItemsOf = (e) => (e.kind === 'story' ? storyItems.get(e.id) || itemsOf(e) : itemsOf(e))
  // Nieuwsbelang boven sensatie (ronde 6 · 2): een verhaal over een bekend persoon opent niet als er bovenaan een even
  // groot verhaal over economie, politiek of grote gevolgen staat; een misdaad- of rechtszaak ook niet (ronde 7 · 2).
  newsBeforePeople(entries, { itemsOf, allItemsOf, storyOf: (e) => storyById.get(e.id), sources })
  openWithNews(entries, { itemsOf, pick: (xs, all) => leadPool(leadCandidates(xs, mainIds, null, now, { role: 'front' }), all, now)[0] })
  dutchFloor(entries, { itemsOf: allItemsOf, byId, storyOf: (e) => storyById.get(e.id), sources })
  // Bovenaan een Nederlandse kop als het verhaal er een heeft (ronde 6 · 1). Na de ondergrens: die telt de plekken met de
  // kop die de selectie koos, zodat een buitenlands verhaal met een Nederlandse kop geen Nederlandse plek verdringt.
  dutchHeads(entries, { itemsOf, mainIds, now })
  return entries
}

// De Nederlandse ondergrens (Redacteur 3b · 3, besluit van Alex): in de top 5 van de algemene Editie staan
// minstens NL_TOP5_MIN Nederlandse plekken voor echt nieuws (dutchPlace). Echt nieuws: een verhaal van minstens twee
// uitgevers, niet licht, en de kop is geen opinie. Staan er te weinig, dan schuiven de hoogste Nederlandse plekken van
// verder in de Editie op naar het eind van de top 5, en zakken de laagste niet-Nederlandse plekken daar direct onder;
// plek 01 blijft staan. Nog geen normalisatie per taalgebied.
// Wat een Nederlandse plek is, staat bij dutchPlace (netlify/lib/stories.mjs): één definitie voor bouw en meetlat.
export { NL_TOP5_MIN, dutchPlace }
export function dutchFloor(entries, { itemsOf, byId, storyOf = () => null, sources = SOURCES, top = 5, min = NL_TOP5_MIN }) {
  const dutch = (e) => dutchPlace(e, { itemsOf, byId, storyOf, sources })
  const news = (e) => {
    const items = itemsOf(e)
    const lead = byId.get(e.leadId || e.id)
    return e.kind === 'story' && coverageOf(items).publisherCount >= 2 && !lightNews({}, items) && !!lead && !isOpinion(lead)
  }
  const head = entries.slice(0, top)
  const need = min - head.filter(dutch).length
  if (need <= 0) return entries
  const up = entries.slice(top).filter((e) => dutch(e) && news(e)).slice(0, need)
  const down = head.slice(1).filter((e) => !dutch(e)).slice(-up.length)
  if (!up.length || down.length < up.length) return entries
  // De top 5 zonder de laagste niet-Nederlandse plekken, dan de Nederlandse in hun eigen volgorde; wat zakt,
  // staat direct daarna, dan de rest zoals het was.
  const next = [...head.filter((e) => !down.includes(e)), ...up, ...down, ...entries.slice(top).filter((e) => !up.includes(e))]
  entries.splice(0, entries.length, ...next)
  return entries
}

// Per dagdeel één keer samengesteld en daarna vast: selectie en volgorde veranderen niet meer;
// een verhaal dat nog loopt toont wel zijn nieuwe publicaties. Daarbij (één keer, dan vast):
// "Buiten je bubbel" en het AI-overzicht.
// Een nieuwe Redacteur-revisie krijgt een eigen snapshot; alleen geschiedenis valt terug op edition3.
async function composeEdition({ now, stories, articlePool, pool, anthropic }) {
  const slot = editionSlot(new Date(now))
  const key = editionCacheKey(slot.id)
  const byId = new Map(pool.map((i) => [i.id, i]))
  let stored = await kvGet(key)
  let changed = false
  if (!stored?.entries?.length) {
    // Muziek hoort in de Stroom, niet in de editie van het nieuws.
    const newsPool = articlePool
    const newsIds = new Set(newsPool.map((a) => a.id))
    const newsStories = stories.filter((st) => st.itemIds.some((id) => newsIds.has(id)))
    // Wat in de vorige editie stond, komt alleen terug als het zich echt ontwikkelde.
    const previous = previousOf(await kvGet(editionCacheKey(previousSlotId(slot))).catch(() => null) || await kvGet('edition3-' + previousSlotId(slot)).catch(() => null))
    const entries = generalEdition({ stories, newsStories, pool, newsPool, now, mainIds: MAIN_IDS, sources: SOURCES, previous })
    const snapStories = entries.filter((e) => e.kind === 'story').map((e) => stories.find((st) => st.id === e.id))
    const snapIds = new Set([...snapStories.flatMap((st) => st.itemIds), ...entries.filter((e) => e.kind === 'item').map((e) => e.id)])
    stored = { id: slot.id, builtAt: new Date(now).toISOString(), entries, stories: snapStories, items: [...snapIds].map((id) => byId.get(id)).filter(Boolean) }
    changed = entries.length > 0
  }
  const storyById = new Map([...stories, ...stored.stories].map((st) => [st.id, st]))
  const rows = () => briefRows(stored.entries, storyById, new Map([...byId, ...stored.items.map((i) => [i.id, i])]))

  // Buiten je bubbel: de trends halen we pas op als deze editie ze nog nodig heeft.
  if (!Array.isArray(stored.bubble)) {
    const trends = await loadTrends().catch(() => [])
    if (trends.length) {
      const excludeStoryIds = new Set(stored.entries.filter((e) => e.kind === 'story').map((e) => e.id))
      const excludeItemIds = new Set([...stored.entries.filter((e) => e.kind === 'item').map((e) => e.id), ...[...excludeStoryIds].flatMap((id) => storyById.get(id)?.itemIds || [])])
      // Ook geen bericht over een gebeurtenis die al in de editie staat (een liveblog hoort bij
      // geen verhaal, en "Serbia" staat niet in de Nederlandse kop "Serviërs vieren …").
      const sig = signatures(pool.filter((i) => i.kind === 'article'))
      const shown = [...excludeItemIds].map((id) => sig.get(id)).filter(Boolean)
      const fresh = pool.filter((a) => !sig.has(a.id) || !shown.some((s) => sameEvent(sig.get(a.id), s)))
      // Nederlandstalig waar dat kan (Hoot is voor Nederlandse lezers, en wie met de gratis
      // Nederlandse startset begint, krijgt geen Engels stuk midden in de editie); daarna de rest.
      // Naast het stuk in de editie zes kandidaten, hooguit twee per gebied: de persoonlijke Editie
      // kiest daaruit wat buiten jouw profiel valt (een sportlezer krijgt geen voetbal).
      const opts = { excludeItemIds, excludeStoryIds, coveredTitles: rows().map((r) => r.title), max: Infinity, now }
      const areaOf = (p) => areasOf(byId.get(p.id), SOURCE.get(byId.get(p.id)?.source)?.cat)
      const picks = bubbleCandidates([matchTrending(trends, fresh.filter((a) => dutch(a.source)), opts), matchTrending(trends, fresh, opts)], { areaOf })
      // Het sterkste signaal krijgt een plek in de editie zelf; de rest staat in het blok eronder.
      stored.entries = insertBubble(stored.entries, picks[0])
      stored.bubble = picks.slice(1)
      // De gekozen berichten bewaren bij de editie, zodat ze blijven als de feed ze loslaat.
      for (const b of picks) if (!stored.items.some((i) => i.id === b.id) && byId.has(b.id)) stored.items.push(byId.get(b.id))
      changed = true
    }
  }
  // Het overzicht: één keer per editie. Lukt het (of de controle) niet, dan later nog eens,
  // hooguit drie keer; daarna blijft het weg en staat de editie er zonder.
  // Een overzicht van vóór 1.27 (zonder verwijzingen per blok) wordt één keer opnieuw geschreven.
  const briefOk = stored.brief?.sections?.length && stored.brief.sections.every((x) => Array.isArray(x.refs))
  if (anthropic && !briefOk && stored.entries.length && (stored.briefTries || 0) < 3) {
    stored.briefTries = (stored.briefTries || 0) + 1
    changed = true
    try {
      stored.brief = await createBrief(anthropic, rows(), { now })
    } catch (e) {
      console.error('brief', String(e?.message || e))
      stored.brief = null
    }
  }
  if (changed && stored.entries.length) await kvSet(key, stored)

  const isFree = (id) => SOURCE.has(id) && !SOURCE.get(id).paid
  const isSport = (i) => SOURCE.get(i.source)?.cat === 'sport' || (i.topics || []).some((t) => SPORT_TOPICS.has(t))

  // Gepubliceerd = vast: de berichten zoals ze bij het samenstellen waren (kop, intro, beeld)
  // gaan mee als `items`; latere wijzigingen in de feed zie je in de Stroom, niet in de editie.
  // De verwijzing naar het verhaal (de bundel achter "+N bronnen") volgt wel de actuele indeling.
  const snapItems = new Map(stored.items.map((i) => [i.id, i]))
  const shown = [...stored.entries.map((e) => e.leadId || e.id), ...(stored.bubble || []).map((b) => b.id)]
  return {
    snapshot: stored,
    public: {
      id: slot.id,
      slot: slot.slot,
      date: slot.date,
      next: slot.next,
      builtAt: stored.builtAt,
      version: `${EDITOR_REVISION}:${stored.id}@${stored.builtAt}`,
      entries: relinkEdition(stored.entries, { stories, snapshot: stored.stories, byId: new Map([...snapItems, ...byId]) }),
      items: [...new Set(shown)].map((id) => snapItems.get(id)).filter(Boolean),
      bubble: stored.bubble || [],
      brief: stored.brief?.sections?.length ? stored.brief : null,
      // Actueel (niet vast): waaruit de persoonlijke editie "Waar iedereen over schrijft" kiest.
      wide: widelyCovered(stories, byId, { isFree, isDutch: dutch, isSport }),
      // Actueel: waaruit de persoonlijke Editie "Naast je bubbel" kiest als geen trend buiten je profiel valt.
      near: nearStories(stories, byId, { isFree, isDutch: dutch, isSport, isLive, now }),
    },
  }
}

// ---------- Bronnenlijst ----------
function sourceList({ mainGroups, bskyGroups, avatars, profiles }) {
  const first = (g) => g.items[0]
  const base = (g) => ({ id: g.id, name: g.name, ok: g.ok, count: g.count, error: g.error || null })
  return [
    ...mainGroups.map((g, i) => {
      const s = SOURCES[i]
      return {
        ...base(g),
        kind: s.music ? 'muziek' : 'nieuws',
        cat: s.cat,
        // Wie de onboarding niet deed, krijgt de oorspronkelijke set; de rest staat uit tot je hem kiest.
        optional: !s.base,
        pick: !!s.pick,
        for: s.for || null,
        forTopic: s.forTopic || null,
        lang: s.lang,
        about: s.about,
        paid: !!s.paid,
        login: s.login || null,
        followed: true,
        brandColor: s.color || '#21468b',
        avatar: first(g)?.avatar || avatars[g.id] || (s.x ? `https://unavatar.io/x/${s.x}` : null),
        avatarContain: first(g)?.avatarContain || false,
        handle: first(g)?.domain || null,
      }
    }),
    ...bskyGroups.map((g, i) => {
      const a = BLUESKY_AUTHORS[i]
      const p = profiles[a.handle] || {}
      return { ...base(g), name: a.name || p.name || first(g)?.sourceName, kind: 'sociaal', group: a.group || null, optional: !!a.optional, followed: true, brandColor: BSKY_BRAND, avatar: p.avatar || first(g)?.avatar || null, avatarContain: false, handle: '@' + a.handle }
    }),
  ]
}
