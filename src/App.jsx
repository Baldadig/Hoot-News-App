import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { MAIN, rememberLocation, hrefFor } from './lib/context.js'
import { sourceStatus, statusLabel } from './lib/sourceStatus.js'
import { indexStories, resolveStory, toggleSaved } from './lib/saved.js'

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

// Waar je per bestemming was (filters). Leeft zolang de app open is, ook na herladen.
function readNav() {
  try {
    return JSON.parse(sessionStorage.getItem('hoot:nav')) || {}
  } catch {
    return {}
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

  // ---- Context per bestemming: de navigatie brengt je terug naar dezelfde lijst ----
  const [navMem, setNavMem] = useState(readNav)
  useEffect(() => {
    setNavMem((m) => {
      const next = rememberLocation(m, route)
      if (next !== m) {
        try {
          sessionStorage.setItem('hoot:nav', JSON.stringify(next))
        } catch {
          /* niet erg */
        }
      }
      return next
    })
  }, [route.path, route.params]) // eslint-disable-line react-hooks/exhaustive-deps
  const hrefs = useMemo(() => Object.fromEntries(MAIN.map((d) => [d, hrefFor(navMem, d)])), [navMem])

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
  // Ook vindbaar op een eerdere id (als twee bundels zijn samengegaan): bladwijzers en links blijven werken.
  const storiesById = useMemo(() => indexStories(data?.stories), [data])

  // ---- Handelingen ----
  const markRead = useCallback((id) => setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id].slice(-1500))), [setReadIds])

  const toggleSave = useCallback(
    (kind, id, payload) => {
      setSaved((prev) => toggleSaved(prev, kind, id, payload, itemsById))
      if (kind === 'item' && !saved[id] && data?.meta?.instapaper) saveToInstapaper(payload)
    },
    [setSaved, itemsById, saved, data]
  )

  const openSource = useCallback((id) => route.go('stroom', { bron: id }), [route.go])
  const storyParam = route.params.verhaal || null
  // Wie het verhaal opende krijgt bij sluiten de focus terug.
  const opener = useRef(null)
  const openStory = useCallback(
    (id) => {
      opener.current = document.activeElement
      route.go(route.path, { ...route.params, verhaal: id })
    },
    [route.go, route.path, route.params]
  )
  const closeStory = useCallback(() => {
    const { verhaal, ...rest } = route.params
    route.back(route.path, rest)
  }, [route.back, route.path, route.params])

  const newInStory = useCallback(
    (story) => {
      const seen = seenStories[story.id] || (story.formerIds || []).map((id) => seenStories[id]).find(Boolean)
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
  const story = useMemo(() => resolveStory(storyParam, storiesById, saved, itemsById, muted), [storyParam, storiesById, saved, itemsById, muted])

  const storyOpen = !!story
  useEffect(() => {
    if (storyOpen) return
    const el = opener.current
    opener.current = null
    if (el && el.isConnected) el.focus({ preventScroll: true })
  }, [storyOpen])

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

  // Bronstatus: één uitgevallen bron is een stil puntje bij Bronnen; alleen als álles
  // onbereikbaar is staat er een regel boven Editie en Stroom.
  const srcStatus = useMemo(() => sourceStatus(sources, muted), [sources, muted])
  // "Weer bereikbaar" zeggen we alleen als een bron die uitlag echt terug is (niet als je hem uitzet).
  const [wasDown, setWasDown] = useState([])
  useEffect(() => {
    const ids = srcStatus.failed.map((f) => f.id).filter((id) => !wasDown.includes(id))
    if (ids.length) setWasDown((prev) => [...prev, ...ids])
  }, [srcStatus]) // eslint-disable-line react-hooks/exhaustive-deps
  const recovered = !srcStatus.failed.length && wasDown.some((id) => sourcesById.get(id)?.ok && !muted.has(id))
  const latestBySource = useMemo(() => {
    const out = {}
    for (const f of srcStatus.failed) out[f.id] = stream.find((i) => i.source === f.id)?.publishedAt || null
    return out
  }, [srcStatus, stream])
  const statusProps = { online, refreshing, refreshError, meta: data?.meta, allDown: srcStatus.allDown, onRetry: reloadAll }
  const loading = status === 'loading' && !data
  const failedLoad = status === 'error' && !data

  const ctx = useMemo(
    () => ({ saved, toggleSave, read, markRead, openSource, openStory, newInStory, itemsById, storiesById, sourcesById, muted }),
    [saved, toggleSave, read, markRead, openSource, openStory, newInStory, itemsById, storiesById, sourcesById, muted]
  )

  const hideMain = overlay || showWelcome

  // "Naar de inhoud": focus naar het scherm dat je voor je hebt — zonder de route te
  // veranderen en zonder te verspringen. De volgende Tab gaat daarbinnen verder.
  const skip = (e) => {
    e.preventDefault()
    const scope = showWelcome ? document.querySelector('.welcome') : overlay ? document.querySelector('.panel') : document.querySelector('.main .view:not([hidden])')
    const target = scope?.querySelector('h1, [data-skip]') || scope
    if (!target) return
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }
  return (
    <HootContext.Provider value={ctx}>
      <div className="app">
        <a className="skip" href="#inhoud" onClick={skip}>
          Naar de inhoud
        </a>
        <div className="app__nav" inert={hideMain ? '' : undefined}>
          <Nav path={path} hrefs={hrefs} sourceNote={statusLabel(srcStatus.failed.length)} />
        </div>
        <main id="inhoud" className="main" inert={hideMain ? '' : undefined}>
          <Edition active={path === 'editie'} edition={data?.edition} loading={loading} failedLoad={failedLoad} statusProps={statusProps} onRefresh={reloadAll} refreshing={refreshing} />
          <Stream
            active={path === 'stroom'}
            stream={stream}
            params={path === 'stroom' ? route.params : navMem.stroom || {}}
            go={route.go}
            pinned={prefs.pinned}
            density={prefs.density === 'volledig' ? 'volledig' : 'kort'}
            onDensity={(density) => setPrefs((p) => ({ ...p, density }))}
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
            status={srcStatus}
            recovered={recovered}
            latestBySource={latestBySource}
            onRetry={reloadAll}
            refreshing={refreshing}
            online={online}
          />
          {page === 'zoek' ? <Search onBack={() => route.back('editie')} /> : null}
          {page === 'stijl' ? <StyleGuide stream={stream} /> : null}
        </main>
        <aside className={`panel${story ? ' is-open' : ''}`} aria-label="Verhaal" role={overlay ? 'dialog' : undefined} aria-modal={overlay ? 'true' : undefined} inert={showWelcome ? '' : undefined}>
          {story ? <Story key={story.story.id} story={story.story} items={story.items} overlay={overlay} onClose={closeStory} onSeen={markStorySeen} seenBefore={seenStories[story.story.id] || null} /> : <PanelHint open={prefs.panel === 'open'} onToggle={() => setPrefs((p) => ({ ...p, panel: p.panel === 'open' ? 'dicht' : 'open' }))} />}
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
