import { useMemo, useState } from 'react'
import { ViewHeader, Empty } from '../components/Shell.jsx'
import { Entry, CompactItem, useHoot } from '../components/Items.jsx'
import { timeAgo } from '../lib/time.js'

export default function Saved({ active }) {
  const { saved, itemsById, storiesById } = useHoot()
  const [q, setQ] = useState('')

  // Laatst bewaard bovenaan. Van een verhaal tonen we de actuele versie als die nog bestaat,
  // anders de momentopname van toen je het bewaarde.
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return Object.entries(saved)
      .map(([id, e]) => {
        if (e.kind === 'story') {
          const story = storiesById.get(id) || e.story
          const item = itemsById.get(story.leadId) || (e.items || []).find((i) => i.id === story.leadId) || (e.items || [])[0]
          return item ? { id, savedAt: e.savedAt, item, story } : null
        }
        return e.item ? { id, savedAt: e.savedAt, item: e.item, story: null } : null
      })
      .filter(Boolean)
      .filter((r) => !needle || `${r.item.title} ${r.item.summary || ''} ${r.item.sourceName}`.toLowerCase().includes(needle))
      .sort((a, b) => b.savedAt - a.savedAt)
  }, [saved, q, itemsById, storiesById])

  const total = Object.keys(saved).length

  return (
    <section className="view" hidden={!active} aria-label="Bewaard">
      <div className="col">
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
                <input type="search" className="input" placeholder="Zoek in bewaard" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
              </label>
            ) : null}
            {rows.length === 0 ? (
              <Empty title="Niets gevonden in je bewaarde berichten">Probeer een ander woord, of wis de zoekterm.</Empty>
            ) : (
              <div className="list">
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
