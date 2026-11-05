import { useEffect, useMemo, useRef, useState } from 'react'
import { Empty, ViewHeader } from '../components/Shell.jsx'
import { Entry, useHoot } from '../components/Items.jsx'
import { CloseIcon, SearchArt } from '../components/icons.jsx'
import { withoutRepeats } from '../../shared/stroom.mjs'

// Zoeken is een tab (telefoon) en staat in de zijbalk (breed): geen terugknop, wel een schermtitel (h1) zoals elk scherm.
export default function Search() {
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
    // Hetzelfde stuk (ook met een aangepaste kop) één keer, zoals in de Stroom.
    return withoutRepeats(hits).slice(0, 60)
  }, [q, scope, itemsById, sourcesById, saved, muted])

  return (
    <section className="view view--page" aria-label="Zoeken">
      <div className="col col--read">
        <ViewHeader title="Zoeken" showSearch={false}>
          <form className="searchbar" role="search" onSubmit={(e) => (e.preventDefault(), inputRef.current?.blur())}>
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
        </ViewHeader>
        {!q.trim() ? (
          <Empty art={SearchArt} title="Zoek in je nieuws">
            In koppen, intro’s, bronnen en auteurs, ook in Bewaard.
          </Empty>
        ) : results.length === 0 ? (
          <Empty
            art={SearchArt}
            title={`Niets gevonden voor ‘${q.trim()}’`}
            action={
              scope === 'mijn' ? (
                <button type="button" className="btn" onClick={() => setScope('alle')}>
                  Zoek in alle bronnen
                </button>
              ) : null
            }
          >
            Hoot zoekt in koppen, intro’s, bronnen en auteurs, ook in Bewaard.
          </Empty>
        ) : (
          <>
            <p className="status" role="status">
              {results.length} {results.length === 1 ? 'resultaat' : 'resultaten'}
              {results.length === 60 ? ' (eerste 60)' : ''} in {scope === 'mijn' ? 'je eigen bronnen en bewaard' : 'alle bronnen'}
            </p>
            <div className="list rows">
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
