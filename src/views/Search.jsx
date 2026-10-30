import { useEffect, useMemo, useRef, useState } from 'react'
import { Empty, BackButton } from '../components/Shell.jsx'
import { Entry, useHoot } from '../components/Items.jsx'
import { CloseIcon } from '../components/icons.jsx'
import { withoutCopies } from '../../shared/dedupe.mjs'

export default function Search({ onBack, backLabel = 'Terug' }) {
  const { itemsById, saved, storiesById, sourcesById, muted } = useHoot()
  const [q, setQ] = useState('')
  const [scope, setScope] = useState('mijn') // mijn | alle
  const inputRef = useRef(null)
  useEffect(() => inputRef.current?.focus(), [])

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1)
    if (!words.length) return []
    // "Mijn bronnen": wat je volgt, plus alles wat je hebt bewaard. "Alle bronnen" neemt ook
    // de bronnen mee die alleen ter vergelijking binnen een verhaal staan.
    const pool = new Map()
    for (const [id, i] of itemsById) if (scope === 'alle' || sourcesById.get(i.source)?.followed !== false) pool.set(id, i)
    for (const e of Object.values(saved)) {
      if (e.item) pool.set(e.item.id, e.item)
      for (const i of e.items || []) pool.set(i.id, i)
    }
    const hits = [...pool.values()]
      .filter((i) => !muted.has(i.source))
      .filter((i) => {
        const hay = `${i.title} ${i.summary || ''} ${i.sourceName} ${i.author || ''}`.toLowerCase()
        return words.every((w) => hay.includes(w))
      })
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
    // Hetzelfde stuk bij twee zusterkranten één keer, zoals in de Stroom.
    return withoutCopies(hits).slice(0, 60)
  }, [q, scope, itemsById, sourcesById, saved, muted])

  return (
    <section className="view view--page" aria-label="Zoeken">
      <div className="col">
        <header className="vh">
          <form className="searchbar" role="search" onSubmit={(e) => (e.preventDefault(), inputRef.current?.blur())}>
            {/* Zoeken staat ook in de zijbalk: vanaf 960 is terug overbodig. */}
            <BackButton onClick={onBack} ariaLabel={`Terug naar ${backLabel}`} nav />
            <label className="visually-hidden" htmlFor="q">
              Zoek in berichten
            </label>
            <input id="q" data-skip ref={inputRef} type="search" className="input" placeholder="Zoek op woord, bron of auteur" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" autoComplete="off" />
            {/* Eigen wisknop in plaats van de × van de browser: leegmaken en terug in het veld. */}
            {q ? (
              <button type="button" className="iconbtn input__clear" onClick={() => (setQ(''), inputRef.current?.focus())} aria-label="Zoekterm wissen">
                <CloseIcon />
              </button>
            ) : null}
          </form>
          <div className="chips scope" role="group" aria-label="Waar zoeken">
            <button type="button" className="pill" aria-pressed={scope === 'mijn'} onClick={() => setScope('mijn')}>
              Mijn bronnen
            </button>
            <button type="button" className="pill" aria-pressed={scope === 'alle'} onClick={() => setScope('alle')}>
              Alle bronnen
            </button>
          </div>
        </header>
        {!q.trim() ? (
          <Empty title="Waar zoek je naar?">
            {scope === 'mijn' ? 'Je zoekt in de berichten van je eigen bronnen die nu geladen zijn, en in alles wat je hebt bewaard.' : 'Je zoekt nu ook in de bronnen die je niet volgt en die alleen ter vergelijking binnen een verhaal staan.'} Er is geen archief van eerdere dagen.
          </Empty>
        ) : results.length === 0 ? (
          <Empty
            title={`Niets gevonden voor "${q.trim()}"`}
            action={
              scope === 'mijn' ? (
                <button type="button" className="btn btn--quiet" onClick={() => setScope('alle')}>
                  Zoek in alle bronnen
                </button>
              ) : null
            }
          >
            Zoeken kijkt alleen in wat nu geladen of bewaard is. Probeer een korter woord.
          </Empty>
        ) : (
          <>
            <p className="status" role="status">
              {results.length} {results.length === 1 ? 'resultaat' : 'resultaten'}
              {results.length === 60 ? ' (eerste 60)' : ''} in {scope === 'mijn' ? 'je eigen bronnen en bewaard' : 'alle bronnen'}
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
