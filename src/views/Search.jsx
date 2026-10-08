import { useEffect, useMemo, useRef, useState } from 'react'
import { Empty } from '../components/Shell.jsx'
import { Entry, useHoot } from '../components/Items.jsx'
import { BackIcon } from '../components/icons.jsx'

export default function Search({ onBack }) {
  const { itemsById, saved, storiesById, muted } = useHoot()
  const [q, setQ] = useState('')
  const inputRef = useRef(null)
  useEffect(() => inputRef.current?.focus(), [])

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1)
    if (!words.length) return []
    const pool = new Map(itemsById)
    for (const e of Object.values(saved)) {
      if (e.item) pool.set(e.item.id, e.item)
      for (const i of e.items || []) pool.set(i.id, i)
    }
    return [...pool.values()]
      .filter((i) => !muted.has(i.source))
      .filter((i) => {
        const hay = `${i.title} ${i.summary || ''} ${i.sourceName} ${i.author || ''}`.toLowerCase()
        return words.every((w) => hay.includes(w))
      })
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .slice(0, 60)
  }, [q, itemsById, saved, muted])

  return (
    <section className="view view--page" aria-label="Zoeken">
      <div className="col">
        <header className="vh">
          <form className="searchbar" role="search" onSubmit={(e) => (e.preventDefault(), inputRef.current?.blur())}>
            <button type="button" className="iconbtn" onClick={onBack} aria-label="Terug">
              <BackIcon />
            </button>
            <label className="visually-hidden" htmlFor="q">
              Zoek in berichten
            </label>
            <input id="q" ref={inputRef} type="search" className="input" placeholder="Zoek op woord, bron of auteur" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" autoComplete="off" />
          </form>
        </header>
        {!q.trim() ? (
          <Empty title="Waar zoek je naar?">Je zoekt in de berichten die nu geladen zijn en in alles wat je hebt bewaard. Er is geen archief van eerdere dagen.</Empty>
        ) : results.length === 0 ? (
          <Empty title={`Niets gevonden voor "${q.trim()}"`}>Zoeken kijkt alleen in wat nu geladen of bewaard is. Probeer een korter woord.</Empty>
        ) : (
          <>
            <p className="status" role="status">
              {results.length} {results.length === 1 ? 'resultaat' : 'resultaten'}
              {results.length === 60 ? ' (eerste 60)' : ''}
            </p>
            <div className="list">
              {results.map((i) => (
                <Entry key={i.id} item={i} story={i.storyId ? storiesById.get(i.storyId) : null} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
