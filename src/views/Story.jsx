import { useEffect, useRef, useState } from 'react'
import { CompactItem, SaveButton, useHoot } from '../components/Items.jsx'
import { BackIcon, CloseIcon } from '../components/icons.jsx'
import { timeAgo } from '../lib/time.js'

// Bronvergelijking: elke publicatie over dit verhaal apart, met eigen kop, bron, tijd en link.
export default function Story({ story, items, overlay, onClose, onSeen, seenBefore }) {
  const { sourcesById } = useHoot()
  // Wat je de vorige keer al zag, vastgelegd bij het openen (zodat "nieuw" niet meteen verdwijnt).
  const [prev] = useState(() => seenBefore)
  const headRef = useRef(null)

  useEffect(() => {
    onSeen(story.id, story.itemIds)
    if (overlay) headRef.current?.focus()
  }, [story.id, story.itemIds.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!overlay) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [overlay, onClose])

  const lead = items.find((i) => i.id === story.leadId) || items[0]
  const fresh = prev ? items.filter((i) => !prev.includes(i.id)) : []
  const rest = prev ? items.filter((i) => prev.includes(i.id)) : items
  const firstId = items[items.length - 1]?.id
  const followed = (i) => sourcesById.get(i.source)?.followed !== false
  const note = (i) => [i.id === firstId && items.length > 1 ? 'Eerste bericht' : null, followed(i) ? null : 'Volg je niet'].filter(Boolean).join(' · ') || null

  return (
    <div className="story">
      <header className="story__head">
        {overlay ? (
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Terug">
            <BackIcon />
          </button>
        ) : null}
        <p className="story__eyebrow" tabIndex={-1} ref={headRef}>
          Verhaal
        </p>
        <SaveButton id={story.id} kind="story" payload={story} label="verhaal" />
        {!overlay ? (
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Verhaal sluiten">
            <CloseIcon />
          </button>
        ) : null}
      </header>

      <div className="story__body">
        <h2 className="story__title">{lead?.title}</h2>
        <p className="story__facts">
          {story.sourceCount} {story.sourceCount === 1 ? 'bron' : 'bronnen'} · laatste update {timeAgo(story.latestAt)}
        </p>
        <details className="how">
          <summary>
            <span className="how__link">Hoe zijn deze bronnen gekoppeld?</span>
          </summary>
          <p>
            {story.sourceNames.join(', ')}. Eerste bericht {timeAgo(story.firstAt)}.
          </p>
          <p>
            Hoot bundelt berichten die over dezelfde gebeurtenis lijken te gaan, op overeenkomst in koppen en samenvattingen (namen, plaatsen, tijd). Dat gaat automatisch en kan er een keer naast zitten. Meerdere bronnen betekent dat er veel over geschreven wordt — niet dat ze elkaar onafhankelijk bevestigen: redacties nemen vaak hetzelfde persbureaubericht over.
          </p>
        </details>

        {fresh.length ? (
          <>
            <h3 className="story__sub">Toegevoegd sinds je vorige bezoek</h3>
            <div className="list">
              {fresh.map((i) => (
                <CompactItem key={i.id} item={i} note={note(i)} plain />
              ))}
            </div>
            <h3 className="story__sub">Eerder beschikbaar</h3>
          </>
        ) : (
          <h3 className="story__sub">Alle publicaties, nieuwste eerst</h3>
        )}
        <div className="list">
          {rest.map((i) => (
            <CompactItem key={i.id} item={i} note={note(i)} plain />
          ))}
        </div>
      </div>
    </div>
  )
}

// Vergelijken zonder dat er al een verhaal open is: de verhalen van nu waar de meeste
// bronnen over schrijven. Kies er een om de publicaties naast elkaar te zien.
export function StoryIndex({ stories = [], onClose }) {
  const { itemsById, openStory, muted } = useHoot()
  const rows = stories
    .filter((s) => s.sourceCount > 1)
    .map((s) => ({ s, lead: [s.leadId, ...s.itemIds].map((id) => itemsById.get(id)).find((i) => i && !muted.has(i.source)) }))
    .filter((r) => r.lead)
    .sort((a, b) => b.s.sourceCount - a.s.sourceCount || (b.s.latestAt || '').localeCompare(a.s.latestAt || ''))
    .slice(0, 12)
  return (
    <div className="story">
      <header className="story__head">
        <p className="story__eyebrow">Bronnen vergelijken</p>
        <button type="button" className="iconbtn" onClick={onClose} aria-label="Paneel sluiten">
          <CloseIcon />
        </button>
      </header>
      <div className="story__body">
        <p className="story__facts">Verhalen waar nu meerdere bronnen over schrijven. Kies er een om elke publicatie apart te zien, met eigen kop en link.</p>
        {rows.length ? (
          <ul className="sidx">
            {rows.map(({ s, lead }) => (
              <li key={s.id}>
                <button type="button" className="sidx__btn" onClick={() => openStory(s.id)}>
                  <span className="sidx__title">{lead.short_title || lead.title}</span>
                  <span className="sidx__meta">
                    {s.sourceCount} bronnen · {timeAgo(s.latestAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Er zijn op dit moment geen verhalen met meerdere bronnen.</p>
        )}
      </div>
    </div>
  )
}
