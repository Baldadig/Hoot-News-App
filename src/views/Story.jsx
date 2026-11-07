import { useEffect, useRef, useState } from 'react'
import { CompactItem, Meta, SaveButton, ShareButton, SourceMeta, useHoot, linkOf, viaLength } from '../components/Items.jsx'
import { isFollowing } from '../lib/follow.js'
import { CloseIcon, CaretIcon, ICON_SM } from '../components/icons.jsx'
import { BackButton } from '../components/Shell.jsx'
import { Disclosure } from '../components/Disclosure.jsx'
import { timeAgo } from '../lib/time.js'
import { withLead } from '../lib/saved.js'
import { wholeSentences, INTRO_LINES } from '../../shared/zinnen.mjs'
import { ownIntro } from '../../shared/kaart-intro.mjs'
import { useIntroMax } from '../lib/intro.js'

// Esc sluit het vaste zijpaneel (breed scherm), zoals het de dialoog sluit op een smal scherm. Alleen als
// de toets niet al iets anders deed (een dialoog, het wissen van een zoekveld) en niet in een invoerveld.
function useEscapeClose(onClose, enabled) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('.panel')?.hidden) return // het overzicht staat ook gemount als het paneel dicht is
      const t = e.target
      if (t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"], dialog[open], [role="dialog"]')) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [enabled, onClose])
}

// Eén publicatie in het smalle paneel (breed scherm): de kop over de volle breedte en hooguit
// twee regels samenvatting in hele zinnen, dan bron en tijd op hun vaste plek eronder. Geen beeld — dat perst
// de kop samen.
function SourceItem({ item, note }) {
  const { markRead, read } = useHoot()
  const fit = useIntroMax()(INTRO_LINES, 'paneel')
  // Een geleende intro draagt zijn bron ("via X"), ook naast het origineel; die tekens gaan van de maat af.
  const summary = wholeSentences(ownIntro(item), fit.max - viaLength(item), fit.rek - viaLength(item)) // hele zinnen, nooit "…"
  return (
    <article className={`entry srcitem${read.has(item.id) ? ' is-read' : ''}`} data-id={item.id}>
      <a className="srcitem__link" href={linkOf(item)} rel="noreferrer" onClick={() => markRead(item.id)}>
        {note || item.type === 'opinie' ? <p className="label label--kicker kicker">{[item.type === 'opinie' ? 'Opinie' : null, note].filter(Boolean).join(' · ')}</p> : null}
        <h3 className="head-4 srcitem__title">{item.title}</h3>
        {summary ? (
          <p className="clamp clamp--vangnet srcitem__sum">
            {summary}
            {item.borrowedFrom ? <span className="via"> — via {item.borrowedFrom}</span> : null}
          </p>
        ) : null}
      </a>
      <Meta item={item} />
    </article>
  )
}

// Bronvergelijking: elke publicatie over dit verhaal apart, met eigen kop, bron, tijd en link.
// `tappedId`: het stuk waarop je tikte om te vergelijken; dat is de kop (ook als je de bron niet volgt).
export default function Story({ story, items, tappedId = null, overlay, onClose, onBack, onSeen, seenBefore }) {
  const { sourcesById, muted, followStories, followStory, markRead } = useHoot()
  const following = isFollowing(followStories, story)
  // Wat je de vorige keer al zag, vastgelegd bij het openen (zodat "nieuw" niet meteen verdwijnt).
  const [prev] = useState(() => seenBefore)
  const headRef = useRef(null)

  useEffect(() => {
    onSeen(story.id, story.itemIds)
    if (overlay) headRef.current?.focus()
  }, [story.id, story.itemIds.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEscapeClose(onClose, !overlay)

  // Als dialoog: Esc sluit, en Tab blijft binnen het paneel (ook in browsers zonder `inert`).
  useEffect(() => {
    if (!overlay) return
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab') return
      const panel = headRef.current?.closest('.panel')
      if (!panel) return
      const focusable = [...panel.querySelectorAll('a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const inside = panel.contains(document.activeElement)
      if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === headRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [overlay, onClose])

  // Niet gevolgd: de bron volg je niet, of je hebt hem uitgezet.
  const followed = (i) => sourcesById.get(i.source)?.followed !== false && !muted.has(i.source)
  const lead = items.find((i) => i.id === tappedId) || items.find((i) => i.id === story.leadId && followed(i)) || items.find(followed) || items[0]
  // De publicatie die de kop levert staat bovenaan (kop, bronregel, link), dus niet nog eens in
  // de lijsten eronder: het paneel zegt de kop één keer (zoals StoryView op iOS).
  const others = items.filter((i) => i.id !== lead?.id)
  const fresh = prev ? others.filter((i) => !prev.includes(i.id)) : []
  const rest = prev ? others.filter((i) => prev.includes(i.id)) : others
  const firstId = items[items.length - 1]?.id
  const note = (i) => [i.id === firstId && items.length > 1 ? 'Eerste bericht' : null, followed(i) ? null : 'Buiten je bronnen'].filter(Boolean).join(' · ') || null

  return (
    <div className="story">
      {/* Kop: één uitgang. Als dialoog (smal scherm) is dat terug, links; in het vaste paneel de X,
          rechts. "Alle verhalen" is daar geen uitgang maar een stap terug in het paneel, dus staat
          hij boven de kop van het verhaal. Esc sluit alleen de dialoog, en de paneelknop staat
          alleen in de kop van de Editie en de Stroom: daarom blijft de X. */}
      <header className="story__head">
        {overlay ? <BackButton onClick={onClose} ariaLabel="Terug" /> : null}
        <p className="label label--meta story__eyebrow" tabIndex={-1} ref={headRef}>
          Vergelijken
        </p>
        <div className="story__acts">
          {/* In een smal paneel (of bij grote tekst) staat er alleen "Volg"; de naam blijft voluit. */}
          <button type="button" className={`pill pill--sm hit followbtn${following ? ' is-on' : ''}`} aria-pressed={following} onClick={() => followStory(story, lead?.title || '')}>
            <span className="followbtn__long">{following ? 'Je volgt dit' : 'Volg dit verhaal'}</span>
            <span className="followbtn__short" aria-hidden="true">
              Volg
            </span>
          </button>
          {/* Het verhaal delen = het stuk bovenaan delen, met de link van zijn uitgever (zoals de app). */}
          {lead ? <ShareButton item={lead} label="verhaal" /> : null}
          <SaveButton id={story.id} kind="story" payload={lead ? withLead(story, lead.id) : story} label="verhaal" />
          {!overlay ? (
            <button type="button" className="iconbtn" onClick={onClose} aria-label="Paneel sluiten">
              <CloseIcon />
            </button>
          ) : null}
        </div>
      </header>

      <div className="story__body">
        {!overlay ? <BackButton label="Alle verhalen" onClick={onBack} className="story__back" /> : null}
        {lead ? (
          <>
            {/* De kop is het stuk zelf: tikken opent het, zoals een kop in de lijst. Rubriek (Opinie,
                Eerste bericht, Buiten je bronnen) als kicker erboven, waar dat van toepassing is. */}
            {note(lead) || lead.type === 'opinie' ? <p className="label label--kicker kicker story__kicker">{[lead.type === 'opinie' ? 'Opinie' : null, note(lead)].filter(Boolean).join(' · ')}</p> : null}
            <h2 className="head-5 story__title">
              <a className="story__link" href={linkOf(lead)} rel="noreferrer" onClick={() => markRead(lead.id)}>
                {lead.title}
              </a>
            </h2>
          </>
        ) : null}
        <p className="story__facts">
          {story.sourceCount} {story.sourceCount === 1 ? 'bron' : 'bronnen'} · laatste update {timeAgo(story.latestAt)}
        </p>
        {/* Van wie de kop is: de bronregel van dat stuk, op zijn vaste plek onder de tekst. */}
        {lead ? (
          <div className="story__src">
            <SourceMeta item={lead} />
          </div>
        ) : null}
        <Disclosure className="how" summaryClassName="linkbtn linkbtn--plain" summary="Hoe zijn deze bronnen gekoppeld?">
          <p>
            {story.sourceNames.join(', ')}. Eerste bericht {timeAgo(story.firstAt)}.
          </p>
          <p>
            Hoot bundelt berichten die over dezelfde gebeurtenis lijken te gaan, op overeenkomst in koppen en samenvattingen (namen, plaatsen, tijd). Dat gaat automatisch en kan er een keer naast zitten. Meerdere bronnen betekent dat er veel over geschreven wordt — niet dat ze elkaar onafhankelijk bevestigen: redacties nemen vaak hetzelfde persbureaubericht over. Liveblogs, die een heel onderwerp volgen, tellen niet mee.
          </p>
        </Disclosure>

        {fresh.length ? (
          <>
            <h3 className="label label--meta story__sub">Toegevoegd sinds je vorige bezoek</h3>
            <div className="list rows">
              {fresh.map((i) => (overlay ? <CompactItem key={i.id} item={i} note={note(i)} plain /> : <SourceItem key={i.id} item={i} note={note(i)} />))}
            </div>
            {rest.length ? <h3 className="label label--meta story__sub">Eerder beschikbaar</h3> : null}
          </>
        ) : rest.length ? (
          <h3 className="label label--meta story__sub">Andere publicaties, nieuwste eerst</h3>
        ) : null}
        {rest.length ? (
          <div className="list rows">
            {rest.map((i) => (overlay ? <CompactItem key={i.id} item={i} note={note(i)} plain /> : <SourceItem key={i.id} item={i} note={note(i)} />))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// Overzicht (geen verhaal gekozen): geen tweede nieuwslijst, maar een keuzelijst — elke regel
// opent de bronvergelijking van dat verhaal.
export function StoryIndex({ stories = [], onClose, lastId }) {
  const { itemsById, openStory, muted } = useHoot()
  useEscapeClose(onClose, true)
  const rows = stories
    .filter((s) => s.sourceCount > 1)
    .map((s) => ({ s, lead: [s.leadId, ...s.itemIds].map((id) => itemsById.get(id)).find((i) => i && !muted.has(i.source)) }))
    .filter((r) => r.lead)
    .sort((a, b) => b.s.sourceCount - a.s.sourceCount || (b.s.latestAt || '').localeCompare(a.s.latestAt || ''))
    .slice(0, 12)
  return (
    <div className="story">
      <header className="story__head">
        <p className="label label--meta story__eyebrow">Bronnen vergelijken</p>
        <div className="story__acts">
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Paneel sluiten">
            <CloseIcon />
          </button>
        </div>
      </header>
      <div className="story__body">
        <h2 className="head-4 sidx__head">Verhalen met meerdere bronnen</h2>
        <p className="story__facts">Kies een verhaal om de bronnen naast elkaar te zien.</p>
        {rows.length ? (
          <ul className="sidx">
            {rows.map(({ s, lead }) => (
              <li key={s.id}>
                <button type="button" className="sidx__btn" onClick={() => openStory(s.id, lead.id)} aria-current={s.id === lastId ? 'true' : undefined}>
                  <span className="sidx__text">
                    <span className="head-4 sidx__title">{lead.title}</span>
                    <span className="sidx__meta">
                      Vergelijk {s.sourceCount} bronnen · {timeAgo(s.latestAt)}
                      {s.id === lastId ? ' · zojuist bekeken' : ''}
                    </span>
                  </span>
                  <span className="sidx__go" aria-hidden="true">
                    <CaretIcon size={ICON_SM} />
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
