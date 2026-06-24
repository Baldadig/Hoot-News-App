import { useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import TopicFilter from './components/TopicFilter.jsx'
import ArticleCard from './components/ArticleCard.jsx'
import Drawer from './components/Drawer.jsx'
import { Skeleton, ErrorState, EmptyState, Footer } from './components/States.jsx'
import { useFeed } from './hooks/useFeed.js'
import { useReadState } from './hooks/useReadState.js'
import { useSavedState } from './hooks/useSavedState.js'
import { useTheme } from './hooks/useTheme.js'
import usePullToRefresh from './hooks/usePullToRefresh.js'
import { saveToInstapaper } from './lib/save.js'
import { ArrowUpIcon } from './components/icons.jsx'

const HINT_KEY = 'hoot:hint-source'

export default function App() {
  const { items, trending, meta, status, refreshing, reload } = useFeed()
  const { read, markRead } = useReadState()
  const { saved, markSaved } = useSavedState()
  const { theme, setTheme } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTopic, setActiveTopic] = useState(null)
  const [source, setSource] = useState(null) // { source, name }
  const [showTop, setShowTop] = useState(false)
  const [hintDone, setHintDone] = useState(() => {
    try {
      return localStorage.getItem(HINT_KEY) === '1'
    } catch {
      return false
    }
  })
  const { containerRef, pull } = usePullToRefresh(reload)

  const dismissHint = () => {
    setHintDone(true)
    try {
      localStorage.setItem(HINT_KEY, '1')
    } catch {
      /* opslag geblokkeerd — niet erg */
    }
  }

  const counts = useMemo(() => {
    const c = {}
    for (const it of items) for (const t of it.topics || []) c[t] = (c[t] || 0) + 1
    return c
  }, [items])

  // Unieke bronnen uit de feed (voor de branded lijst in het menu)
  const sources = useMemo(() => {
    const seen = new Map()
    for (const it of items) {
      if (seen.has(it.source)) continue
      seen.set(it.source, {
        source: it.source,
        name: it.sourceName,
        avatar: it.avatar,
        brand: it.brandColor,
        contain: it.avatarContain,
        verified: it.verified,
        handle: it.handle || it.domain,
        kind: it.kind,
      })
    }
    // Nieuwsbronnen eerst, daarna Bluesky-mensen
    return [...seen.values()].sort((a, b) => (a.kind === 'post') - (b.kind === 'post'))
  }, [items])

  const trendingView = activeTopic === 'trending'

  const visible = useMemo(() => {
    if (trendingView) return trending
    let list = items
    if (source) list = list.filter((i) => i.source === source.source)
    if (activeTopic) list = list.filter((i) => (i.topics || []).includes(activeTopic))
    return list
  }, [items, trending, trendingView, activeTopic, source])

  const showSkeleton = status === 'loading' && items.length === 0
  const showError = status === 'error' && items.length === 0

  const onFilterSource = (item) => {
    setSource({ source: item.source, name: item.sourceName })
    dismissHint()
    containerRef.current?.scrollTo({ top: 0 })
  }

  // Bron kiezen vanuit het menu: toon alleen die bron en sluit het menu
  const pickSource = (s) => {
    setSource({ source: s.source, name: s.name })
    setActiveTopic(null)
    dismissHint()
    setDrawerOpen(false)
    containerRef.current?.scrollTo({ top: 0 })
  }

  const saveItem = async (item) => {
    const r = await saveToInstapaper(item)
    if (r.ok) markSaved(item.id)
    return r
  }

  const onFeedScroll = (e) => {
    const y = e.currentTarget.scrollTop
    setShowTop((prev) => (prev ? y > 300 : y > 600))
  }

  const scrollToTop = () => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

  const showHint = !hintDone && !source && !trendingView && status === 'ready' && items.length > 0

  return (
    <div className="app">
      <Header onRefresh={reload} refreshing={refreshing} onMenu={() => setDrawerOpen(true)} />
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        theme={theme}
        setTheme={setTheme}
        sources={sources}
        activeSource={source?.source ?? null}
        onPickSource={pickSource}
      />
      <TopicFilter active={activeTopic} onChange={setActiveTopic} counts={counts} trendingCount={trending.length} />

      <main className="feed" ref={containerRef} onScroll={onFeedScroll}>
        <div className="ptr" style={{ height: pull }} aria-hidden="true">
          <span className="ptr__icon" style={{ opacity: Math.min(pull / 70, 1) }}>
            🦉
          </span>
        </div>

        {source && !trendingView ? (
          <button className="srcbar" onClick={() => setSource(null)}>
            <span>
              Alleen <strong>{source.name}</strong>
            </span>
            <span className="srcbar__x" aria-hidden="true">
              ✕
            </span>
          </button>
        ) : showHint ? (
          <button className="hint" onClick={dismissHint}>
            <span>💡 Tik op een bron om alles van die bron te zien</span>
            <span className="hint__x" aria-hidden="true">
              ✕
            </span>
          </button>
        ) : null}

        {showSkeleton ? (
          <Skeleton />
        ) : showError ? (
          <ErrorState onRetry={reload} />
        ) : visible.length === 0 ? (
          <EmptyState
            filtered={!!(activeTopic || source)}
            onReset={() => {
              setActiveTopic(null)
              setSource(null)
            }}
          />
        ) : (
          <div className="list">
            {visible.map((item) => (
              <ArticleCard
                key={item.id}
                item={item}
                isRead={read.has(item.id)}
                isSaved={saved.has(item.id)}
                onOpen={markRead}
                onFilterSource={onFilterSource}
                onSave={saveItem}
              />
            ))}
          </div>
        )}

        <Footer meta={meta} />
      </main>

      <button
        type="button"
        className={`totop${showTop ? ' is-visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Terug naar boven"
        aria-hidden={!showTop}
        tabIndex={showTop ? 0 : -1}
      >
        <ArrowUpIcon />
      </button>
    </div>
  )
}
