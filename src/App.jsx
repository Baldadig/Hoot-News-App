import { useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import TopicFilter from './components/TopicFilter.jsx'
import ArticleCard from './components/ArticleCard.jsx'
import { Skeleton, ErrorState, EmptyState, Footer } from './components/States.jsx'
import { useFeed } from './hooks/useFeed.js'
import { useReadState } from './hooks/useReadState.js'
import usePullToRefresh from './hooks/usePullToRefresh.js'

export default function App() {
  const { items, meta, status, refreshing, reload } = useFeed()
  const { read, markRead } = useReadState()
  const [active, setActive] = useState(null)
  const { containerRef, pull } = usePullToRefresh(reload)

  const counts = useMemo(() => {
    const c = {}
    for (const it of items) for (const t of it.topics || []) c[t] = (c[t] || 0) + 1
    return c
  }, [items])

  const visible = useMemo(
    () => (active ? items.filter((i) => (i.topics || []).includes(active)) : items),
    [items, active]
  )

  const showSkeleton = status === 'loading' && items.length === 0
  const showError = status === 'error' && items.length === 0

  return (
    <div className="app">
      <Header onRefresh={reload} refreshing={refreshing} />
      <TopicFilter active={active} onChange={setActive} counts={counts} />

      <main className="feed" ref={containerRef}>
        <div className="ptr" style={{ height: pull }} aria-hidden="true">
          <span className="ptr__icon" style={{ opacity: Math.min(pull / 70, 1) }}>
            🦉
          </span>
        </div>
        {refreshing && (
          <div className="topbar">
            <span className="topbar__fill" />
          </div>
        )}

        {showSkeleton ? (
          <Skeleton />
        ) : showError ? (
          <ErrorState onRetry={reload} />
        ) : visible.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="list">
            {visible.map((item) => (
              <ArticleCard key={item.id} item={item} isRead={read.has(item.id)} onOpen={markRead} />
            ))}
          </div>
        )}

        <Footer meta={meta} />
      </main>
    </div>
  )
}
