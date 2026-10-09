import { useEffect, useRef, useState } from 'react'
import { CompactItem, Meta, SaveButton, useHoot } from '../components/Items.jsx'
import { BackIcon, CloseIcon } from '../components/icons.jsx'
import { timeAgo } from '../lib/time.js'

// Eén publicatie in het smalle paneel (breed scherm): eerst bron en tijd, dan de kop over
// de volle breedte en hooguit drie regels samenvatting. Geen beeld — dat perst de kop samen.
function SourceItem({ item, note }) {
  const { markRead, read } = useHoot()
  return (
    <article className={`entry srcitem${read.has(item.id) ? ' is-read' : ''}`} data-id={item.id}>
      <Meta item={item} />
      <a className="srcitem__link" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(item.id)}>
        {note || item.type === 'opinie' ? <p className="kicker">{[item.type === 'opinie' ? 'Opinie' : null, note].filter(Boolean).join(' · ')}</p> : null}
        <h3 className="srcitem__title">{item.title}</h3>
        {item.summary ? <p className="srcitem__sum">{item.summary}</p> : null}
      </a>
    </article>
  )
}

// Bronvergelijking: elke publicatie over dit verhaal apart, met eigen kop, bron, tijd en link.
export default function Story({ story, items, overlay, onClose, onBack, onSeen, seenBefore }) {
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
        ) : (
          <button type="button" className="textbtn story__back" onClick={onBack}>
            <BackIcon />
            Alle verhalen
          </button>
        )}
        <p className={`story__eyebrow${overlay ? '' : ' visually-hidden'}`} tabIndex={-1} ref={headRef}>
          Verhaal
        </p>
        <SaveButton id={story.id} kind="story" payload={story} label="verhaal" />
        {!overlay ? (
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Paneel sluiten">
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
              {fresh.map((i) => (overlay ? <CompactItem key={i.id} item={i} note={note(i)} plain /> : <SourceItem key={i.id} item={i} note={note(i)} />))}
            </div>
            <h3 className="story__sub">Eerder beschikbaar</h3>
          </>
        ) : (
          <h3 className="story__sub">Alle publicaties, nieuwste eerst</h3>
        )}
        <div className="list">
          {rest.map((i) => (overlay ? <CompactItem key={i.id} item={i} note={note(i)} plain /> : <SourceItem key={i.id} item={i} note={note(i)} />))}
        </div>
      </div>
    </div>
  )
}

// Overzicht (geen verhaal gekozen): geen tweede nieuwslijst, maar een keuzelijst — elke regel
// opent de bronvergelijking van dat verhaal.
export function StoryIndex({ stories = [], onClose, lastId }) {
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
        <h2 className="sidx__head">Verhalen met meerdere bronnen</h2>
        <p className="story__facts">Kies een verhaal om de bronnen naast elkaar te zien.</p>
        {rows.length ? (
          <ul className="sidx">
            {rows.map(({ s, lead }) => (
              <li key={s.id}>
                <button type="button" className="sidx__btn" onClick={() => openStory(s.id)} aria-current={s.id === lastId ? 'true' : undefined}>
                  <span className="sidx__text">
                    <span className="sidx__title">{lead.short_title || lead.title}</span>
                    <span className="sidx__meta">
                      Vergelijk {s.sourceCount} bronnen · {timeAgo(s.latestAt)}
                      {s.id === lastId ? ' · zojuist bekeken' : ''}
                    </span>
                  </span>
                  <span className="sidx__go" aria-hidden="true">
                    ›
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
