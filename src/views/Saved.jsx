import { useMemo, useRef, useState } from 'react'
import { ViewHeader, Empty } from '../components/Shell.jsx'
import { Entry, CompactItem, useHoot } from '../components/Items.jsx'
import { timeAgo } from '../lib/time.js'
import { useScrollMemory } from '../hooks/useScrollMemory.js'
import { CloseIcon } from '../components/icons.jsx'
import { savedLeadId } from '../lib/saved.js'

export default function Saved({ active }) {
  const { saved, itemsById, storiesById } = useHoot()
  const [q, setQ] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  // Laatst bewaard bovenaan. Van een verhaal tonen we de actuele versie als die nog bestaat,
  // anders de momentopname van toen je het bewaarde.
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return Object.entries(saved)
      .map(([id, e]) => {
        // Een kapotte of onbekende rij (bijv. van een andere versie via je account) slaan we over.
        if (!e || typeof e !== 'object') return null
        const savedAt = Number.isFinite(e.savedAt) ? e.savedAt : 0
        if (e.kind === 'story') {
          const story = storiesById.get(id) || e.story
          if (!story) return null
          // Het stuk dat je zag toen je het bewaarde (zie withLead), niet een andere kop uit de bundel.
          const leadId = savedLeadId(e, story)
          const item = itemsById.get(leadId) || (e.items || []).find((i) => i.id === leadId) || (e.items || [])[0]
          return item ? { id, savedAt, item, story } : null
        }
        return e.item ? { id, savedAt, item: e.item, story: null } : null
      })
      .filter(Boolean)
      .filter((r) => !needle || `${r.item.title} ${r.item.summary || ''} ${r.item.sourceName}`.toLowerCase().includes(needle))
      .sort((a, b) => b.savedAt - a.savedAt)
  }, [saved, q, itemsById, storiesById])

  const total = Object.keys(saved).length
  useScrollMemory(ref, 'hoot:pos-bewaard', rows.length > 0, rows.length, active)

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Bewaard">
      <div className="col col--read">
        <ViewHeader title="Bewaard" sub={total ? `${total} ${total === 1 ? 'bericht' : 'berichten'} op dit toestel` : 'Je leeslijst'} />
        {total === 0 ? (
          <Empty
            title="Nog niets bewaard"
            action={
              <a className="btn" href="#/editie">
                Naar de Editie
              </a>
            }
          >
            Tik bij een bericht of verhaal op het bladwijzertje. Het staat dan hier, ook als het uit de Stroom is verdwenen. Bewaarde berichten blijven op dit toestel.
          </Empty>
        ) : (
          <>
            {total > 4 ? (
              <label className="field">
                <span className="visually-hidden">Zoek in bewaard</span>
                <input ref={inputRef} type="search" className="input" placeholder="Zoek in bewaard" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
                {q ? (
                  <button type="button" className="iconbtn input__clear" onClick={() => (setQ(''), inputRef.current?.focus())} aria-label="Zoekterm wissen">
                    <CloseIcon />
                  </button>
                ) : null}
              </label>
            ) : null}
            {rows.length === 0 ? (
              <Empty title="Niets gevonden in je bewaarde berichten">Probeer een ander woord, of wis de zoekterm.</Empty>
            ) : (
              <div className="list rows">
                {rows.map((r) =>
                  r.story ? <CompactItem key={r.id} item={r.item} story={r.story} note={`Verhaal · bewaard ${timeAgo(new Date(r.savedAt).toISOString())}`} /> : <Entry key={r.id} item={r.item} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
