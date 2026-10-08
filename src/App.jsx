import { useCallback, useEffect, useMemo, useState } from 'react'
import { HootContext } from './components/Items.jsx'
import { Nav } from './components/Shell.jsx'
import Edition from './views/Edition.jsx'
import Stream from './views/Stream.jsx'
import Saved from './views/Saved.jsx'
import Sources from './views/Sources.jsx'
import Story, { PanelHint } from './views/Story.jsx'
import Search from './views/Search.jsx'
import Welcome from './views/Welcome.jsx'
import StyleGuide from './views/StyleGuide.jsx'
import { useFeed } from './hooks/useFeed.js'
import { useRoute } from './hooks/useRoute.js'
import { useOnline } from './hooks/useOnline.js'
import { useTheme } from './hooks/useTheme.js'
import { useSocialSources } from './hooks/useSocialSources.js'
import { useStored, readJSON } from './lib/store.js'
import { saveToInstapaper } from './lib/save.js'

const MAIN = ['editie', 'stroom', 'bewaard', 'bronnen']
const PAGES = ['zoek', 'stijl', 'welkom']
const byRecency = (a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')

// Wie de vorige versie al gebruikte slaat het welkomscherm over en houdt zijn leeslijst.
const isReturning = () => ['hoot:theme', 'hoot:read', 'hoot:feed-cache', 'hoot:saved-items'].some((k) => localStorage.getItem(k) !== null)
function initialSaved() {
  const old = readJSON('hoot:saved-items', null)
  if (!old || typeof old !== 'object') return {}
  return Object.fromEntries(Object.entries(old).map(([id, item]) => [id, { kind: 'item', savedAt: item.savedAt || Date.now(), item }]))
}
const safe = (fn, fallback) => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

function useWide(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

export default function App() {
  const route = useRoute()
  const { data, status, refreshing, refreshError, reload, pendingCount, applyPending } = useFeed()
  const online = useOnline()
  const { theme, setTheme } = useTheme()
  const hasPanel = useWide('(min-width: 1200px)')
  const [refreshKey, setRefreshKey] = useState(0)
  const social = useSocialSources(refreshKey)

  const [prefs, setPrefs] = useStored('hoot:prefs', { muted: [], pinned: ['nederland', 'vs-politiek', 'ai'], onboarded: safe(isReturning, true) })
  const [saved, setSaved] = useStored('hoot:saved-v2', safe(initialSaved, {}))
  const [readIds, setReadIds] = useStored('hoot:read', [])
  const [seenStories, setSeenStories] = useStored('hoot:stories-seen', {})

  const muted = useMemo(() => new Set(prefs.muted), [prefs.muted])
  const read = useMemo(() => new Set(Array.isArray(readIds) ? readIds : []), [readIds])

  // ---- Gegevens: bronnen, berichten en verhalen los van elkaar ----
  const sources = useMemo(() => {
    const server = data?.sources || []
    const known = new Set(server.map((s) => s.id))
    const mine = social.sources
      .filter((s) => !known.has('bsky:' + s.handle))
      .map((s) => ({ id: 'bsky:' + s.handle, name: s.name, kind: 'sociaal', followed: true, ok: true, avatar: s.avatar, avatarContain: false, brandColor: '#0085FF', handle: '@' + s.handle, count: social.items.filter((i) => i.source === 'bsky:' + s.handle).length }))
    return [...server, ...mine]
  }, [data, social.sources, social.items])
  const sourcesById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources])
  const socialIds = useMemo(() => new Set(social.sources.map((s) => 'bsky:' + s.handle)), [social.sources])

  const stream = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const it of [...(data?.items || []), ...social.items]) {
      if (!it.url || seen.has(it.id) || muted.has(it.source)) continue
      seen.add(it.id)
      out.push(it)
    }
    return social.items.length ? out.sort(byRecency) : out
  }, [data, social.items, muted])

  const itemsById = useMemo(() => new Map([...(data?.related || []), ...(data?.items || []), ...social.items].map((i) => [i.id, i])), [data, social.items])
  const storiesById = useMemo(() => new Map((data?.stories || []).map((s) => [s.id, s])), [data])

  // ---- Handelingen ----
  const markRead = useCallback((id) => setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id].slice(-1500))), [setReadIds])

  const toggleSave = useCallback(
    (kind, id, payload) => {
      setSaved((prev) => {
        const next = { ...prev }
        if (next[id]) delete next[id]
        else if (kind === 'story') next[id] = { kind, savedAt: Date.now(), story: payload, items: payload.itemIds.map((i) => itemsById.get(i)).filter(Boolean) }
        else next[id] = { kind: 'item', savedAt: Date.now(), item: payload }
        return next
      })
      if (kind === 'item' && !saved[id] && data?.meta?.instapaper) saveToInstapaper(payload)
    },
    [setSaved, itemsById, saved, data]
  )

  const openSource = useCallback((id) => route.go('stroom', { bron: id }), [route.go])
  const storyParam = route.params.verhaal || null
  const openStory = useCallback((id) => route.go(route.path, { ...route.params, verhaal: id }), [route.go, route.path, route.params])
  const closeStory = useCallback(() => {
    const { verhaal, ...rest } = route.params
    route.back(route.path, rest)
  }, [route.back, route.path, route.params])

  const newInStory = useCallback(
    (story) => {
      const seen = seenStories[story.id]
      return seen ? story.itemIds.filter((id) => !seen.includes(id)).length : 0
    },
    [seenStories]
  )
  const markStorySeen = useCallback(
    (id, ids) =>
      setSeenStories((prev) => {
        if (prev[id] && prev[id].length === ids.length && ids.every((x) => prev[id].includes(x))) return prev
        const next = { ...prev, [id]: ids }
        const keys = Object.keys(next)
        if (keys.length > 300) delete next[keys[0]]
        return next
      }),
    [setSeenStories]
  )

  const setMuted = useCallback((id, on) => setPrefs((p) => ({ ...p, muted: on ? p.muted.filter((m) => m !== id) : [...new Set([...p.muted, id])] })), [setPrefs])

  const reloadAll = useCallback(() => {
    setRefreshKey((k) => k + 1)
    reload()
  }, [reload])
  const showNew = useCallback(() => {
    applyPending()
    setRefreshKey((k) => k + 1)
  }, [applyPending])

  // ---- Welk scherm ----
  const path = MAIN.includes(route.path) || PAGES.includes(route.path) ? route.path : 'editie'
  const showWelcome = path === 'welkom' || !prefs.onboarded
  const page = PAGES.includes(path) && path !== 'welkom' ? path : null

  // Geopend verhaal: de actuele versie, of de bewaarde momentopname als het uit de feeds is.
  const story = useMemo(() => {
    if (!storyParam) return null
    const live = storiesById.get(storyParam)
    const snap = saved[storyParam]?.kind === 'story' ? saved[storyParam] : null
    const st = live || snap?.story
    if (!st) return null
    const snapItems = new Map((snap?.items || []).map((i) => [i.id, i]))
    const items = st.itemIds.map((id) => itemsById.get(id) || snapItems.get(id)).filter(Boolean).filter((i) => !muted.has(i.source))
    return items.length ? { story: st, items } : null
  }, [storyParam, storiesById, saved, itemsById, muted])

  // Onbekend verhaal in de link (verlopen)? Dan de parameter stil weghalen.
  useEffect(() => {
    if (storyParam && data && !story) {
      const { verhaal, ...rest } = route.params
      route.go(route.path, rest, { replace: true })
    }
  }, [storyParam, data, story]) // eslint-disable-line react-hooks/exhaustive-deps

  const overlay = !!story && !hasPanel

  // Opruimen: de cache van de vorige versie is niet meer nodig.
  useEffect(() => {
    try {
      localStorage.removeItem('hoot:feed-cache')
    } catch {
      /* niet erg */
    }
  }, [])
  useEffect(() => {
    document.title = { editie: 'Editie', stroom: 'Stroom', bewaard: 'Bewaard', bronnen: 'Bronnen', zoek: 'Zoeken', stijl: 'Designsysteem', welkom: 'Welkom' }[path] + ' · Hoot'
  }, [path])

  const failed = sources.filter((s) => s.followed && !s.ok && !muted.has(s.id)).map((s) => s.name)
  const statusProps = { online, refreshing, refreshError, meta: data?.meta, failed, onRetry: reloadAll }
  const loading = status === 'loading' && !data
  const failedLoad = status === 'error' && !data

  const ctx = useMemo(
    () => ({ saved, toggleSave, read, markRead, openSource, openStory, newInStory, itemsById, storiesById, sourcesById, muted }),
    [saved, toggleSave, read, markRead, openSource, openStory, newInStory, itemsById, storiesById, sourcesById, muted]
  )

  const hideMain = overlay || showWelcome
  return (
    <HootContext.Provider value={ctx}>
      <div className="app">
        <a className="skip" href="#inhoud">
          Naar de inhoud
        </a>
        <div className="app__nav" inert={hideMain ? '' : undefined}>
          <Nav path={path} />
        </div>
        <main id="inhoud" className="main" inert={hideMain ? '' : undefined}>
          <Edition active={path === 'editie'} edition={data?.edition} loading={loading} failedLoad={failedLoad} statusProps={statusProps} onRefresh={reloadAll} refreshing={refreshing} />
          <Stream
            active={path === 'stroom'}
            stream={stream}
            params={route.params}
            go={route.go}
            pinned={prefs.pinned}
            sources={sources}
            loading={loading}
            failedLoad={failedLoad}
            statusProps={statusProps}
            onRefresh={reloadAll}
            refreshing={refreshing}
            pendingCount={pendingCount}
            onShowNew={showNew}
          />
          <Saved active={path === 'bewaard'} />
          <Sources
            active={path === 'bronnen'}
            sources={sources}
            muted={muted}
            onToggle={setMuted}
            socialHandles={socialIds}
            onAddSocial={social.addSource}
            onRemoveSocial={social.removeSource}
            pinned={prefs.pinned}
            onPinned={(pinned) => setPrefs((p) => ({ ...p, pinned }))}
            theme={theme}
            setTheme={setTheme}
            meta={data?.meta}
          />
          {page === 'zoek' ? <Search onBack={() => route.back('editie')} /> : null}
          {page === 'stijl' ? <StyleGuide stream={stream} /> : null}
        </main>
        <aside className={`panel${story ? ' is-open' : ''}`} aria-label="Verhaal" role={overlay ? 'dialog' : undefined} aria-modal={overlay ? 'true' : undefined} inert={showWelcome ? '' : undefined}>
          {story ? <Story key={story.story.id} story={story.story} items={story.items} overlay={overlay} onClose={closeStory} onSeen={markStorySeen} seenBefore={seenStories[story.story.id] || null} /> : <PanelHint />}
        </aside>
        {showWelcome ? (
          <Welcome
            sources={sources}
            muted={muted}
            onToggle={setMuted}
            onDone={() => {
              setPrefs((p) => ({ ...p, onboarded: true }))
              route.go('editie', {}, { replace: true })
            }}
          />
        ) : null}
      </div>
    </HootContext.Provider>
  )
}
