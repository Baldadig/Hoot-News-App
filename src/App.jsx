import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HootContext } from './components/Items.jsx'
import { CloseIcon } from './components/icons.jsx'

const ShareGlyph = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Deel" role="img" style={{ verticalAlign: '-2px' }}>
    <path d="M12 3v12M8 7l4-4 4 4M6 11H5v9h14v-9h-1" />
  </svg>
)
import { Nav } from './components/Shell.jsx'
import Edition from './views/Edition.jsx'
import Stream from './views/Stream.jsx'
import Saved from './views/Saved.jsx'
import Sources from './views/Sources.jsx'
import Story, { StoryIndex } from './views/Story.jsx'
import { useFeed } from './hooks/useFeed.js'
import { useRoute } from './hooks/useRoute.js'
import { useOnline } from './hooks/useOnline.js'
import { useTheme } from './hooks/useTheme.js'
import { useSocialSources } from './hooks/useSocialSources.js'
import { useAccount } from './hooks/useAccount.js'
import { useCloudSync } from './hooks/useCloudSync.js'
import { useStored } from './lib/store.js'
import { MAIN, rememberLocation, hrefFor } from './lib/context.js'
import { sourceStatus, statusLabel } from './lib/sourceStatus.js'
import Bluesky from './views/Bluesky.jsx'
import { mutedSet, toggleSource, inStream, isPost } from './lib/sourcesel.js'
import { DisplaySheet } from './components/Display.jsx'
import { JoinSheet } from './components/Account.jsx'
import { normalizePrefs } from './lib/prefs.js'
import { shouldShowInstallTip } from './lib/install.js'
import { shouldAskToJoin } from './lib/join.js'
import { subscribe as onUpdate, isReady as updateReady, applyUpdate, dismissUpdate } from './lib/swUpdate.js'
import { indexStories, resolveStory, toggleSaved, restoreSaved } from './lib/saved.js'

// Schermen die je zelden opent laden pas als je ze opent (de service worker heeft ze al klaarstaan).
const Search = lazy(() => import('./views/Search.jsx'))
const Settings = lazy(() => import('./views/Settings.jsx'))
const StyleGuide = lazy(() => import('./views/StyleGuide.jsx'))
const Welcome = lazy(() => import('./views/Welcome.jsx'))

const PAGES = ['zoek', 'stijl', 'welkom', 'instellingen']
const byRecency = (a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')

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
  const [rawPrefs, setPrefs] = useStored('hoot:prefs', { muted: [], pinned: ['nederland', 'vs-politiek', 'ai'], onboarded: true }) // zonder opslag (migrate.js kon niets schrijven): geen welkom
  const prefs = useMemo(() => normalizePrefs(rawPrefs), [rawPrefs])
  const setPref = useCallback((key, value) => setPrefs((p) => ({ ...p, [key]: value })), [setPrefs])
  // Tekstgrootte en beeld werken via attributen op <html> (zie styles.css).
  useEffect(() => {
    document.documentElement.dataset.text = prefs.textSize
    document.documentElement.dataset.images = prefs.images
  }, [prefs.textSize, prefs.images])
  const [display, setDisplay] = useState(false)
  const openDisplay = useCallback(() => setDisplay(true), [])
  const { data, status, refreshing, refreshError, reload, pendingCount, applyPending } = useFeed(prefs)
  const online = useOnline()
  const { theme, setTheme } = useTheme()
  const hasPanel = useWide('(min-width: 1200px)')
  const [refreshKey, setRefreshKey] = useState(0)
  const social = useSocialSources(refreshKey)

  const [saved, setSaved] = useStored('hoot:saved-v2', {})
  const [readIds, setReadIds] = useStored('hoot:read', [])
  const [seenStories, setSeenStories] = useStored('hoot:stories-seen', {})

  // Account: inloggen met Google; als lid gaan instellingen, Bewaard en gelezen mee.
  const rawAccount = useAccount()
  const { status: syncStatus, forget: forgetAccount } = useCloudSync(rawAccount, { prefs: rawPrefs, setPrefs, saved, setSaved, readIds, setReadIds, seen: seenStories, setSeen: setSeenStories })
  // Uitloggen haalt ook de gegevens van dat account van dit toestel (zie syncEngine.js).
  const signOut = rawAccount.signOut
  const account = useMemo(() => ({ ...rawAccount, signOut: async () => (await signOut(), forgetAccount()) }), [rawAccount, signOut, forgetAccount])

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

  const read = useMemo(() => new Set(Array.isArray(readIds) ? readIds : []), [readIds])

  // ---- Gegevens: bronnen, berichten en verhalen los van elkaar ----
  const sources = useMemo(() => {
    const server = data?.sources || []
    const known = new Set(server.map((s) => s.id))
    const mine = social.sources
      .filter((s) => !known.has('bsky:' + s.handle))
      .map((s) => ({
        id: 'bsky:' + s.handle,
        name: s.name,
        kind: 'sociaal',
        followed: true,
        ok: true,
        avatar: s.avatar,
        avatarContain: false,
        brandColor: '#0085FF',
        handle: '@' + s.handle,
        count: social.items.filter((i) => i.source === 'bsky:' + s.handle).length,
      }))
    return [...server, ...mine]
  }, [data, social.sources, social.items])
  const sourcesById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources])
  // Uit: wat je zelf uitzette, plus optionele bronnen die je nog niet aanzette.
  const muted = useMemo(() => mutedSet(prefs, sources), [prefs, sources])
  const socialIds = useMemo(() => new Set(social.sources.map((s) => 'bsky:' + s.handle)), [social.sources])

  const stream = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const it of [...(data?.items || []), ...social.items]) {
      if (!it.url || seen.has(it.id) || muted.has(it.source) || !inStream(it, prefs)) continue
      seen.add(it.id)
      out.push(it)
    }
    return social.items.length ? out.sort(byRecency) : out
  }, [data, social.items, muted, prefs])

  // Bluesky: alle posts van de accounts die je volgt (eigen bestemming).
  const posts = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const it of [...(data?.items || []), ...social.items]) {
      if (!isPost(it) || seen.has(it.id) || muted.has(it.source)) continue
      seen.add(it.id)
      out.push(it)
    }
    return out.sort(byRecency)
  }, [data, social.items, muted])

  const itemsById = useMemo(() => new Map([...(data?.related || []), ...(data?.items || []), ...social.items].map((i) => [i.id, i])), [data, social.items])
  // Ook vindbaar op een eerdere id (als twee bundels zijn samengegaan): bladwijzers en links blijven werken.
  const storiesById = useMemo(() => indexStories(data?.stories), [data])

  // "Buiten je bubbel": de berichten bij de signalen van deze editie (als ze er zijn).
  // Zoals gepubliceerd (vast), en juist ook uit bronnen die je niet volgt: daar is dit blok voor.
  const bubble = useMemo(() => {
    if (!prefs.bubble) return []
    const published = new Map((data?.edition?.items || []).map((i) => [i.id, i]))
    return (data?.edition?.bubble || []).map((b) => ({ ...b, item: published.get(b.id) || itemsById.get(b.id) })).filter((b) => b.item)
  }, [prefs.bubble, data, itemsById])

  // ---- Handelingen ----
  const markRead = useCallback((id) => setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id].slice(-1500))), [setReadIds])

  // Nieuwe versie klaar? Stille melding; herladen gebeurt alleen als jij dat kiest.
  const [update, setUpdate] = useState(updateReady)
  useEffect(() => onUpdate(setUpdate), [])

  // Tip in Safari op iPhone/iPad: zet Hoot op het beginscherm (één keer, weg te klikken).
  const installTip = useMemo(
    () =>
      safe(
        () =>
          shouldShowInstallTip({
            ua: navigator.userAgent,
            standalone: !!navigator.standalone,
            displayStandalone: window.matchMedia('(display-mode: standalone)').matches,
            dismissed: !!rawPrefs.installTipDone,
            maxTouchPoints: navigator.maxTouchPoints,
            platform: navigator.platform,
          }),
        false
      ),
    [rawPrefs.installTipDone]
  )

  // Na verwijderen uit Bewaard: een paar tellen de kans om het terug te zetten.
  const [undo, setUndo] = useState(null) // { id, entry }
  const [announce, setAnnounce] = useState('')
  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), 8000)
    return () => clearTimeout(t)
  }, [undo])
  const undoRemove = useCallback(() => {
    if (!undo) return
    setSaved((prev) => restoreSaved(prev, undo.id, undo.entry))
    setUndo(null)
    setAnnounce('Teruggezet in Bewaard')
  }, [undo, setSaved])

  const toggleSave = useCallback(
    (kind, id, payload) => {
      if (saved[id]) {
        setUndo({ id, entry: saved[id] })
        setAnnounce('')
      } else {
        setUndo(null)
        setAnnounce(kind === 'story' ? 'Verhaal bewaard' : 'Bericht bewaard')
      }
      setSaved((prev) => toggleSaved(prev, kind, id, payload, itemsById))
    },
    [setSaved, itemsById, saved, data],
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
    [route.go, route.path, route.params],
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
    [seenStories],
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
    [setSeenStories],
  )

  // Onboarding klaar: interesses, onderwerpen en bronnen worden je instellingen.
  // `choice` is null als je "Liever meteen lezen" koos: dan blijft alles zoals het was.
  const finishOnboarding = useCallback(
    (choice) => {
      setPrefs((p) => {
        if (!choice) return { ...p, onboarded: true }
        const on = new Set(choice.sources)
        const shown = new Set(choice.all.map((s) => s.id))
        return {
          ...p,
          onboarded: true,
          interests: choice.interests,
          topics: choice.topics,
          pinned: choice.topics.slice(0, 3),
          muted: [...(p.muted || []).filter((id) => !shown.has(id)), ...choice.all.filter((s) => !s.optional && !on.has(s.id)).map((s) => s.id)],
          enabled: [...(p.enabled || []).filter((id) => !shown.has(id)), ...choice.all.filter((s) => s.optional && on.has(s.id)).map((s) => s.id)],
        }
      })
      route.go('editie', {}, { replace: true })
    },
    [setPrefs, route.go],
  )

  const setMuted = useCallback((id, on) => setPrefs((p) => toggleSource(normalizePrefs(p), sourcesById.get(id) || { id }, on)), [setPrefs, sourcesById])

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
  // Waar je vandaan kwam (de laatste hoofdbestemming): daar brengt "terug" je heen vanuit
  // Instellingen of Zoeken, ook als je er via een gewone link kwam.
  const cameFrom = useRef('editie')
  if (MAIN.includes(path) && path !== 'welkom') cameFrom.current = path
  const FROM_LABEL = { editie: 'Editie', stroom: 'Stroom', bewaard: 'Bewaard', bronnen: 'Bronnen', bluesky: 'Bluesky' }
  const backTo = { onBack: () => route.back(cameFrom.current), backLabel: FROM_LABEL[cameFrom.current] || 'Terug' }

  // Nog geen account? Als je een eind in je Editie of Stroom hebt gelezen, één keer vragen of je
  // wilt inloggen (zie src/lib/join.js).
  const [joinOpen, setJoinOpen] = useState(false)
  const joinAsked = rawPrefs.joinAsked
  const mayAsk = account.status === 'out' && prefs.onboarded && !showWelcome
  useEffect(() => {
    if (!mayAsk || joinOpen) return
    // Alleen echt lezen telt: scrollen na vinger, muis of toets (niet het terugzetten van je
    // leespositie), en alleen in de lijst zelf (niet in een geopend verhaal of paneel).
    let byUser = false
    const onInput = () => (byUser = true)
    const onScroll = (e) => {
      const el = e.target
      if (!byUser || !(el instanceof Element) || !el.matches('section.view')) return
      if (!shouldAskToJoin({ status: 'out', onboarded: true, path, scrolled: el.scrollTop, asked: joinAsked })) return
      setJoinOpen(true)
      setPref('joinAsked', { n: (joinAsked?.n || 0) + 1, at: Date.now() })
    }
    const inputs = ['wheel', 'touchmove', 'keydown']
    for (const ev of inputs) document.addEventListener(ev, onInput, { capture: true, passive: true })
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      for (const ev of inputs) document.removeEventListener(ev, onInput, { capture: true })
      document.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [mayAsk, joinOpen, path, joinAsked, setPref])

  // Geopend verhaal: de actuele versie, of de bewaarde momentopname als het uit de feeds is.
  const story = useMemo(() => resolveStory(storyParam, storiesById, saved, itemsById), [storyParam, storiesById, saved, itemsById])

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

  useEffect(() => {
    document.title =
      {
        editie: 'Editie',
        stroom: 'Stroom',
        bewaard: 'Bewaard',
        bronnen: 'Bronnen',
        zoek: 'Zoeken',
        stijl: 'Designsysteem',
        welkom: 'Welkom', instellingen: 'Instellingen', bluesky: 'Bluesky' }[path] + ' · Hoot'
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
  const statusProps = {
    online,
    refreshing,
    refreshError,
    meta: data?.meta,
    allDown: srcStatus.allDown,
    onRetry: reloadAll,
  }
  const loading = status === 'loading' && !data
  const failedLoad = status === 'error' && !data

  // Twee standen op breed scherm: lezen (geen paneel, de leeskolom staat in het midden) en
  // vergelijken (paneel rechts). Het paneel komt er alleen na een bewuste klik: op
  // "Vergelijk bronnen" boven de lijst, of op "+N bronnen" bij een bericht.
  // Indeling van berichten: 'tijdlijn' (beeld groot in het midden, bron bovenaan — zoals een
  // sociale tijdlijn) of 'krant' (kop links, klein beeld rechts).
  const layout = prefs.layout === 'krant' ? 'krant' : 'tijdlijn'
  const setLayout = useCallback((layout) => setPrefs((p) => ({ ...p, layout })), [setPrefs])
  const panelOpen = hasPanel && prefs.panel === 'open'
  // Vanuit een verhaal terug naar het overzicht (paneel blijft open), of alles dicht.
  const [lastStory, setLastStory] = useState(null)
  useEffect(() => {
    if (story) setLastStory(story.story.id)
  }, [story])
  const backToIndex = useCallback(() => {
    setPrefs((p) => ({ ...p, panel: 'open' }))
    closeStory()
  }, [setPrefs, closeStory])
  const closePanel = useCallback(() => {
    setPrefs((p) => ({ ...p, panel: 'dicht' }))
    if (story) closeStory()
  }, [setPrefs, closeStory, story])
  const togglePanel = useCallback(() => setPrefs((p) => ({ ...p, panel: p.panel === 'open' ? 'dicht' : 'open' })), [setPrefs])
  const panel = useMemo(() => ({ available: hasPanel, open: panelOpen || (hasPanel && !!story), toggle: story ? closePanel : togglePanel }), [hasPanel, panelOpen, story, closePanel, togglePanel])

  const ctx = useMemo(
    () => ({
      panel,
      layout,
      setLayout,
      prefs,
      setPref,
      theme,
      setTheme,
      openDisplay,
      account,
      saved,
      toggleSave,
      read,
      markRead,
      openSource,
      openStory,
      newInStory,
      itemsById,
      storiesById,
      sourcesById,
      muted,
      setMuted,
    }),
    [panel, layout, setLayout, prefs, setPref, theme, setTheme, openDisplay, account, saved, toggleSave, read, markRead, openSource, openStory, newInStory, itemsById, storiesById, sourcesById, muted, setMuted],
  )

  const hideMain = overlay || showWelcome
  // Achter het welkomscherm tekenen we de schermen nog niet (scheelt het laden van beeld
  // dat je niet ziet).
  const shown = showWelcome ? null : path
  // Een scherm wordt pas opgebouwd als je er voor het eerst komt (daarna blijft het staan,
  // met zijn leespositie). Verborgen schermen laadden anders al hun beeld alvast mee:
  // de browser stelt beeld in een verborgen scherm niet uit.
  const visited = useRef(new Set())
  if (shown) visited.current.add(shown)
  const was = (d) => visited.current.has(d)

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
      <div className={`app${story || panelOpen ? ' has-panel' : ''}`}>
        {/* Is het verhaal een dialoog (smal scherm), dan valt alles daarbuiten weg voor de focus. */}
        <a className="skip" href="#inhoud" onClick={skip} inert={hideMain ? '' : undefined}>
          Naar de inhoud
        </a>
        <div className="app__nav" inert={hideMain ? '' : undefined}>
          <Nav path={path} hrefs={hrefs} sourceNote={statusLabel(srcStatus.failed.length)} bluesky={prefs.bluesky || path === 'bluesky'} />
        </div>
        <main id="inhoud" className="main" inert={hideMain ? '' : undefined}>
          {was('editie') ? (
            <Edition active={shown === 'editie'} bubble={bubble} brief={prefs.brief ? data?.edition?.brief : null} edition={data?.edition} loading={loading} failedLoad={failedLoad} statusProps={statusProps} onRefresh={reloadAll} refreshing={refreshing} />
          ) : null}
          {was('stroom') ? (
            <Stream
              active={shown === 'stroom'}
              bubble={bubble}
              preview={prefs.preview}
              stream={stream}
              params={path === 'stroom' ? route.params : navMem.stroom || {}}
              go={route.go}
              pinned={prefs.pinned}
              mine={prefs.topics}
              sources={sources}
              loading={loading}
              failedLoad={failedLoad}
              statusProps={statusProps}
              onRefresh={reloadAll}
              refreshing={refreshing}
              pendingCount={pendingCount}
              onShowNew={showNew}
            />
          ) : null}
          {was('bluesky') ? (
            <Bluesky
              active={shown === 'bluesky'}
              posts={posts}
              sources={sources.filter((s) => s.kind === 'sociaal')}
              muted={muted}
              onToggle={setMuted}
              ownHandles={socialIds}
              onAdd={social.addSource}
              onRemove={social.removeSource}
              params={path === 'bluesky' ? route.params : navMem.bluesky || {}}
              go={route.go}
              onRefresh={reloadAll}
              refreshing={refreshing}
            />
          ) : null}
          {was('bewaard') ? <Saved active={shown === 'bewaard'} /> : null}
          {was('bronnen') ? (
            <Sources
              active={shown === 'bronnen'}
              sources={sources}
              muted={muted}
              onToggle={setMuted}
              meta={data?.meta}
              status={srcStatus}
              recovered={recovered}
              latestBySource={latestBySource}
              onRetry={reloadAll}
              refreshing={refreshing}
              online={online}
              bluesky={prefs.bluesky}
            />
          ) : null}
          <Suspense fallback={null}>
            {page === 'zoek' ? <Search {...backTo} /> : null}
            {page === 'instellingen' ? <Settings meta={data?.meta} account={account} syncStatus={syncStatus} {...backTo} /> : null}
            {page === 'stijl' ? <StyleGuide stream={stream} /> : null}
          </Suspense>
        </main>
        <aside className={`panel${story ? ' is-open' : ''}`} hidden={!story && !panelOpen} aria-label="Verhaal" role={overlay ? 'dialog' : undefined} aria-modal={overlay ? 'true' : undefined} inert={showWelcome ? '' : undefined}>
          {story ? (
            <Story key={story.story.id} story={story.story} items={story.items} overlay={overlay} onClose={overlay ? closeStory : closePanel} onBack={backToIndex} onSeen={markStorySeen} seenBefore={seenStories[story.story.id] || null} />
          ) : (
            <StoryIndex stories={data?.stories} onClose={togglePanel} lastId={lastStory} />
          )}
        </aside>
        <DisplaySheet open={display} onClose={() => setDisplay(false)} account={account} syncStatus={syncStatus} />
        <JoinSheet open={joinOpen && account.status === 'out'} onClose={() => setJoinOpen(false)} onSignIn={account.signIn} />
        <div className="toasts" aria-live="polite" inert={overlay ? '' : undefined}>
          {undo ? (
            <div className="toast">
              <span>Verwijderd uit Bewaard</span>
              <button type="button" className="linkbtn" onClick={undoRemove}>
                Ongedaan maken
              </button>
            </div>
          ) : installTip && prefs.onboarded ? (
            <div className="toast toast--tip">
              <span>
                Zet Hoot op je beginscherm: tik op <ShareGlyph /> en kies <strong>Zet op beginscherm</strong>.
              </span>
              <button type="button" className="iconbtn toast__x" onClick={() => setPref('installTipDone', true)} aria-label="Tip sluiten">
                <CloseIcon />
              </button>
            </div>
          ) : update ? (
            <div className="toast">
              <span>Nieuwe versie beschikbaar</span>
              <button type="button" className="linkbtn" onClick={applyUpdate}>
                Vernieuwen
              </button>
              <button type="button" className="iconbtn toast__x" onClick={dismissUpdate} aria-label="Melding sluiten">
                <CloseIcon />
              </button>
            </div>
          ) : announce ? (
            <span className="visually-hidden" key={announce}>
              {announce}
            </span>
          ) : null}
        </div>
        {showWelcome ? (
          <Suspense fallback={null}>
            <Welcome account={account} sources={sources} prefs={prefs} onDone={finishOnboarding} />
          </Suspense>
        ) : null}
      </div>
    </HootContext.Provider>
  )
}
