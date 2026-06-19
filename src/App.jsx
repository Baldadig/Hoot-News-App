import { useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import TopicFilter from './components/TopicFilter.jsx'
import ArticleCard from './components/ArticleCard.jsx'
import { Skeleton, ErrorState, EmptyState, Footer } from './components/States.jsx'
import { useFeed } from './hooks/useFeed.js'
import { useReadState } from './hooks/useReadState.js'
import { useSavedState } from './hooks/useSavedState.js'
import usePullToRefresh from './hooks/usePullToRefresh.js'
import { saveToInstapaper } from './lib/save.js'

const HINT_KEY = 'hoot:hint-source'

export default function App() {
  const { items, meta, status, refreshing, reload } = useFeed()
  const { read, markRead } = useReadState()
  const { saved, markSaved } = useSavedState()
  const [activeTopic, setActiveTopic] = useState(null)
  const [source, setSource] = useState(null) // { source, name }
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

  const visible = useMemo(() => {
    let list = items
    if (source) list = list.filter((i) => i.source === source.source)
    if (activeTopic) list = list.filter((i) => (i.topics || []).includes(activeTopic))
    return list
  }, [items, activeTopic, source])

  const showSkeleton = status === 'loading' && items.length === 0
  const showError = status === 'error' && items.length === 0

  const onFilterSource = (item) => {
    setSource({ source: item.source, name: item.sourceName })
    dismissHint()
    containerRef.current?.scrollTo({ top: 0 })
  }

  const saveItem = async (item) => {
    const r = await saveToInstapaper(item)
    if (r.ok) markSaved(item.id)
    return r
  }

  const showHint = !hintDone && !source && status === 'ready' && items.length > 0

  return (
    <div className="app">
      <Header onRefresh={reload} refreshing={refreshing} />
      <TopicFilter active={activeTopic} onChange={setActiveTopic} counts={counts} />

      <main className="feed" ref={containerRef}>
        <div className="ptr" style={{ height: pull }} aria-hidden="true">
          <span className="ptr__icon" style={{ opacity: Math.min(pull / 70, 1) }}>
            🦉
          </span>
        </div>

        {source ? (
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
    </div>
  )
}
