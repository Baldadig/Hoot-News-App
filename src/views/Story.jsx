import { useEffect, useRef, useState } from 'react'
import { CompactItem, SaveButton, useHoot } from '../components/Items.jsx'
import { BackIcon, CloseIcon, PanelIcon } from '../components/icons.jsx'
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
          Verhaal · {story.sourceCount} bronnen
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
          {story.sourceNames.join(', ')}. Eerste bericht {timeAgo(story.firstAt)}, laatste {timeAgo(story.latestAt)}.
        </p>
        <p className="story__caveat">
          Gebundeld op overeenkomst in koppen en samenvattingen (namen, plaatsen, tijd). Meerdere bronnen betekent dat er veel over geschreven wordt — niet dat ze elkaar onafhankelijk bevestigen.
        </p>

        {fresh.length ? (
          <>
            <h3 className="story__sub">Nieuw sinds je vorige bezoek</h3>
            <div className="list">
              {fresh.map((i) => (
                <CompactItem key={i.id} item={i} note={note(i)} />
              ))}
            </div>
            <h3 className="story__sub">Had je al gezien</h3>
          </>
        ) : (
          <h3 className="story__sub">Alle publicaties, nieuwste eerst</h3>
        )}
        <div className="list">
          {rest.map((i) => (
            <CompactItem key={i.id} item={i} note={note(i)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Het lege paneel (breed scherm): in- of uitgeklapt. Ingeklapt blijft de kolom staan —
// de leeskolom verschuift dus niet — maar is hij leeg op één knop na. Een verhaal dat je
// opent verschijnt hier altijd, ook als het paneel is ingeklapt.
export function PanelHint({ open, onToggle }) {
  return (
    <div className="panelhint">
      <button type="button" className="iconbtn panelhint__toggle" onClick={onToggle} aria-expanded={open} aria-controls="panel-uitleg" aria-label={open ? 'Paneel Bronnen vergelijken inklappen' : 'Paneel Bronnen vergelijken uitklappen'} title={open ? 'Inklappen' : 'Bronnen vergelijken'}>
        <PanelIcon />
      </button>
      <div id="panel-uitleg" className="panelhint__body" hidden={!open}>
        <h2 className="panelhint__title">Bronnen vergelijken</h2>
        <p>Kies bij een bericht "+2 bronnen" om hier te zien wie er nog meer over schrijft — elke publicatie met eigen kop en link.</p>
      </div>
    </div>
  )
}
