// De feed samenstellen: alles ophalen, de Stroom vullen, bundelen tot verhalen en de editie
// vastleggen. Draait op een vast ritme (functions/feed-refresh.mjs); de app krijgt het
// resultaat kant-en-klaar (functions/feed.mjs) en hoeft nooit op het ophalen te wachten.
import Anthropic from '@anthropic-ai/sdk'
import { byRecency, sigWords, sharedCount, buildStories, editionSlot, selectEdition, NL_SOURCES } from './stories.mjs'
import { matchTrending, insertBubble } from './bubble.mjs'
import { createBrief, briefRows } from './brief.mjs'
import { articleKey, mergeSnippets, isLiveblog } from './snippets.mjs'
import { SOURCES, EXTRA_SOURCES, BLUESKY_AUTHORS, BLUESKY_HOURS, BRAND, BSKY_BRAND, MAIN_IDS, MUSIC_IDS, TOTAL_LIMIT, GUARANTEE_PER_SOURCE, UA } from './sources.mjs'
import { loadSource, loadSourceWithRetry } from './rss.mjs'
import { loadSnippets, loadTrends, loadSourceAvatars, loadBlueskyProfiles } from './lookups.mjs'
import { keywordTopics } from './topics.mjs'
import { normTitle, preview } from './text.mjs'
import { kvGet, kvSet, remember, storageMode } from './kv.mjs'
import { fetchAuthorPosts } from '../../shared/bluesky.mjs'
import { hash } from '../../shared/util.mjs'

const MIN = 6e4
const DAY = 864e5

export async function buildFeed({ now = Date.now() } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const anthropic = apiKey ? new Anthropic({ apiKey, timeout: 25000, maxRetries: 1 }) : null

  // 1. Ophalen — alles tegelijk; een bron die uitvalt houdt de rest niet op.
  const avatars = remember('avatars-v1', DAY, loadSourceAvatars, { now, valid: (m) => Object.values(m).some(Boolean) })
  const handles = BLUESKY_AUTHORS.map((a) => a.handle)
  const profiles = remember('bsky-profiles-' + hash(handles.join()), DAY, () => loadBlueskyProfiles(handles), { now, valid: (m) => Object.keys(m).length > 0 }).catch(() => ({}))
  const [mainGroups, extraGroups, bskyGroups, registry] = await Promise.all([
    settle(SOURCES, (s) => loadSourceWithRetry(s, avatars)),
    settle(EXTRA_SOURCES, (s) => loadSource(s, Promise.resolve({}))),
    settle(BLUESKY_AUTHORS, (a) => loadBluesky(a, now)),
    kvGet('registry-v1').then((r) => (r && typeof r === 'object' ? r : {})),
  ])

  // 2. De Stroom, 3. gaten vullen, 4. voorvertoningen lenen.
  const items = streamItems([...mainGroups, ...bskyGroups].flatMap((g) => g.items))
  const gaps = await fillGaps(items, now)
  borrowPreviews(items, mainGroups.flatMap((g) => g.items))

  // 5. Verhalen: bundelen over jouw bronnen plus de extra bronnen (die alleen als "ook bij" meedoen).
  const extraItems = extraGroups.flatMap((g) => g.items).filter((it) => it.url)
  const articlePool = [...items.filter((i) => i.kind === 'article'), ...extraItems]
  const stories = buildStories(articlePool, registry, { mainIds: MAIN_IDS })
  const poolById = new Map(articlePool.map((i) => [i.id, i]))
  for (const st of stories) for (const id of st.itemIds) poolById.get(id).storyId = st.id
  const related = extraItems.filter((it) => it.storyId) // extra bronnen alleen als ze bij een verhaal horen

  // 6. Eerst-gezien-tijd per bericht, en bij welk verhaal het hoort (houdt id's stabiel).
  await updateRegistry(registry, [...items, ...related], now)

  const out = items.map(toClient)
  const relatedOut = related.map(toClient)

  // 7. De editie van dit dagdeel (één keer samengesteld, daarna vast).
  const edition = await composeEdition({ now, stories, articlePool, pool: [...out, ...relatedOut, ...extraItems.filter((it) => !it.storyId).map(toClient)], anthropic })
  // Wat intussen uit de feeds is verdwenen halen we uit de momentopname van de editie.
  const liveStoryIds = new Set(stories.map((st) => st.id))
  const haveOut = new Set([...out, ...relatedOut].map((i) => i.id))

  return {
    sources: sourceList({ mainGroups, extraGroups, bskyGroups, avatars: await avatars, profiles: await profiles }),
    items: out,
    related: [...relatedOut, ...edition.snapshot.items.filter((i) => !haveOut.has(i.id))],
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
// Nieuwste eerst, zonder dubbelen (zelfde link of zelfde kop). Het nieuws krijgt een plafond;
// muziek en Bluesky tellen apart (die hebben hun eigen grens per bron). Daarna houdt elke bron
// zijn recentste berichten, zodat een rustig kanaal niet helemaal wegvalt.
function streamItems(all) {
  const seenUrl = new Set()
  const seenTitle = new Set()
  const deduped = []
  for (const it of all.sort(byRecency)) {
    const nt = normTitle(it.title)
    if (!it.url || seenUrl.has(it.url) || (nt && seenTitle.has(nt))) continue
    seenUrl.add(it.url)
    if (nt) seenTitle.add(nt)
    deduped.push(it)
  }
  const separate = (it) => MUSIC_IDS.has(it.source) || it.kind === 'post'
  const items = [...deduped.filter((it) => !separate(it)).slice(0, TOTAL_LIMIT), ...deduped.filter(separate)]
  const have = new Set(items.map((i) => i.id))
  const perSource = {}
  for (const it of items) perSource[it.source] = (perSource[it.source] || 0) + 1
  for (const it of deduped) {
    if (have.has(it.id) || (perSource[it.source] || 0) >= GUARANTEE_PER_SOURCE) continue
    items.push(it)
    have.add(it.id)
    perSource[it.source] = (perSource[it.source] || 0) + 1
  }
  return items.sort(byRecency)
}

// ---------- 3. Gaten vullen uit de zoekindex ----------
// De Volkskrant (inleiding en beeld), de NYT (beeld dat de feed nog niet heeft) en The Economist
// (geen beelden in de feed). Wat gevonden is wordt bewaard, dus het groeit. De zoekindex vragen
// we alleen als er iets nieuws te zoeken is, of na een half uur opnieuw.
const GAPS = { volkskrant: 'volkskrant.nl', nyt: 'nytimes.com', economist: 'economist.com' }
async function fillGaps(items, now) {
  const result = { vkSnippets: 0, filled: 0 }
  const needs = items.filter((it) => GAPS[it.source] && it.kind === 'article' && !isLiveblog(it.url) && (!it.summary || !it.image))
  if (!needs.length) return result
  const [stored, checkedAt] = await Promise.all([kvGet('gap-fill-v1'), kvGet('gap-fill-at')])
  let store = stored && typeof stored === 'object' ? stored : {}
  const open = needs.filter((it) => !store[articleKey(it.url)])
  const fresh = open.some((it) => Date.parse(it.publishedAt || 0) > (checkedAt || 0))
  if (open.length && (fresh || now - (checkedAt || 0) > 30 * MIN)) {
    const wanted = [...new Set(open.map((it) => it.source))]
    const vkSections = [...new Set(open.filter((it) => it.source === 'volkskrant').map((it) => it.url.split('/')[3] || '').filter((x) => /^[a-z-]+$/.test(x)))]
    const queries = (src) => (src === 'volkskrant' ? ['site:volkskrant.nl', ...vkSections.slice(0, 10).map((sec) => `site:volkskrant.nl/${sec}`)] : [`site:${GAPS[src]}`])
    const found = (await Promise.all(wanted.map((src) => loadSnippets(queries(src), GAPS[src]).catch(() => [])))).flat()
    store = mergeSnippets(store, found, now)
    await Promise.all([found.length ? kvSet('gap-fill-v1', store) : null, kvSet('gap-fill-at', now)])
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

// ---------- 4. Voorvertoning lenen ----------
// Een Nederlands artikel zonder eigen samenvatting krijgt de teaser van een andere Nederlandse
// bron over hetzelfde verhaal. Streng: alleen bij sterke overlap in de kop, met bronvermelding.
function borrowPreviews(items, mainItems) {
  const donors = mainItems.filter((it) => it.kind === 'article' && it.summary && NL_SOURCES.has(it.source)).map((d) => ({ d, w: sigWords(d.title) }))
  for (const it of items) {
    if (it.kind !== 'article' || it.summary || !NL_SOURCES.has(it.source)) continue
    const w = sigWords(it.title)
    if (w.size < 3) continue
    let best = null
    let bestN = 0
    let bestSize = 0
    for (const { d, w: dw } of donors) {
      if (d.source === it.source) continue
      const n = sharedCount(w, dw)
      if (n > bestN) [best, bestN, bestSize] = [d, n, dw.size]
    }
    const ratio = bestN / Math.max(1, Math.min(w.size, bestSize))
    if (best && (bestN >= 4 || (bestN >= 3 && ratio >= 0.6))) {
      it.summary = best.summary
      it.text = best.summary
      it.borrowedFrom = best.sourceName
    }
  }
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
function toClient(it) {
  const topics = keywordTopics(`${it.title} ${it.text || it.summary || ''} ${it.cats || ''}`)
  if (MUSIC_IDS.has(it.source) && !topics.includes('muziek')) topics.push('muziek')
  return compact({
    id: it.id,
    kind: it.kind,
    source: it.source,
    sourceName: it.sourceName,
    handle: it.handle,
    domain: it.domain,
    avatar: it.avatar,
    avatarContain: it.avatarContain,
    brandColor: it.brandColor,
    author: it.author,
    type: it.type,
    section: it.section,
    storyId: it.storyId,
    firstSeenAt: it.firstSeenAt,
    title: it.title,
    summary: it.summary,
    borrowedFrom: it.borrowedFrom,
    readMin: it.readMin,
    topics,
    url: it.url,
    linkTitle: it.linkTitle,
    image: it.image,
    imageRatio: it.imageRatio,
    video: it.video,
    videoPoster: it.videoPoster,
    publishedAt: it.publishedAt,
  })
}
const compact = (o) => {
  for (const k in o) if (o[k] == null || o[k] === false || o[k] === '') delete o[k]
  return o
}

// ---------- 7. Editie ----------
// Per dagdeel één keer samengesteld en daarna vast: selectie en volgorde veranderen niet meer;
// een verhaal dat nog loopt toont wel zijn nieuwe publicaties. Daarbij (één keer, dan vast):
// "Buiten je bubbel" en het AI-overzicht.
// 'edition3-': sleutel verhoogd bij de opbouw met rubrieken (v1.15).
async function composeEdition({ now, stories, articlePool, pool, anthropic }) {
  const slot = editionSlot(new Date(now))
  const key = 'edition3-' + slot.id
  const byId = new Map(pool.map((i) => [i.id, i]))
  let stored = await kvGet(key)
  let changed = false
  if (!stored?.entries?.length) {
    // Muziek hoort in de Stroom, niet in de editie van het nieuws.
    const newsPool = articlePool.filter((a) => !MUSIC_IDS.has(a.source))
    const newsIds = new Set(newsPool.map((a) => a.id))
    const newsStories = stories.filter((st) => st.itemIds.some((id) => newsIds.has(id)))
    const entries = selectEdition(newsStories, newsPool, { mainIds: MAIN_IDS, now })
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
      const picks = matchTrending(trends, pool, { excludeItemIds, excludeStoryIds, coveredTitles: rows().map((r) => r.title), max: 3, now })
      // Het sterkste signaal krijgt een plek in de editie zelf; de rest staat in het blok eronder.
      stored.entries = insertBubble(stored.entries, picks[0])
      stored.bubble = picks.slice(1)
      // De gekozen berichten bewaren bij de editie, zodat ze blijven als de feed ze loslaat.
      for (const b of picks) if (!stored.items.some((i) => i.id === b.id) && byId.has(b.id)) stored.items.push(byId.get(b.id))
      changed = true
    }
  }
  // Ook een overzicht in de oude vorm (zonder tussenkoppen) wordt één keer opnieuw geschreven.
  if (anthropic && !stored.brief?.sections && stored.entries.length) {
    try {
      stored.brief = await createBrief(anthropic, rows(), { now })
      changed ||= !!stored.brief
    } catch (e) {
      console.error('brief', String(e?.message || e))
    }
  }
  if (changed && stored.entries.length) await kvSet(key, stored)

  return {
    snapshot: stored,
    public: { id: slot.id, slot: slot.slot, date: slot.date, next: slot.next, builtAt: stored.builtAt, entries: stored.entries, bubble: stored.bubble || [], brief: stored.brief || null },
  }
}

// ---------- Bronnenlijst ----------
function sourceList({ mainGroups, extraGroups, bskyGroups, avatars, profiles }) {
  const first = (g) => g.items[0]
  const base = (g) => ({ id: g.id, name: g.name, ok: g.ok, count: g.count, error: g.error || null })
  return [
    ...mainGroups.map((g, i) => {
      const s = SOURCES[i]
      return { ...base(g), kind: s.music ? 'muziek' : 'nieuws', optional: !!s.optional, lang: s.lang, about: s.about, paid: !!s.paid, for: s.for || null, followed: true, brandColor: BRAND[g.id] || '#21468b', avatar: first(g)?.avatar || avatars[g.id] || (s.x ? `https://unavatar.io/x/${s.x}` : null), avatarContain: first(g)?.avatarContain || false, handle: first(g)?.domain || null }
    }),
    ...bskyGroups.map((g, i) => {
      const a = BLUESKY_AUTHORS[i]
      const p = profiles[a.handle] || {}
      return { ...base(g), name: a.name || p.name || first(g)?.sourceName, kind: 'sociaal', group: a.group || null, optional: !!a.optional, followed: true, brandColor: BSKY_BRAND, avatar: p.avatar || first(g)?.avatar || null, avatarContain: false, handle: '@' + a.handle }
    }),
    ...extraGroups.map((g) => ({ ...base(g), kind: 'extra', followed: false, brandColor: BRAND[g.id] || '#21468b', avatar: first(g)?.avatar || null, avatarContain: first(g)?.avatarContain || false, handle: first(g)?.domain || null })),
  ]
}
