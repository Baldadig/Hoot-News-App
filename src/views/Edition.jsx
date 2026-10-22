import { useRef, useState } from 'react'
import { ViewHeader, StatusLine, Skeleton, LoadError, Empty } from '../components/Shell.jsx'
import { LeadStory, CompactItem, SaveButton, SourceMark, useHoot } from '../components/Items.jsx'
import { Img } from '../components/Img.jsx'
import { ReaderIcon } from '../components/icons.jsx'
import { BriefReader } from '../components/BriefReader.jsx'
import { timeAgo } from '../lib/time.js'
import { BrandMark } from '../components/Brand.jsx'
import Weather from '../components/Weather.jsx'
import { longDate } from '../lib/time.js'
import { useScrollMemory } from '../hooks/useScrollMemory.js'
import { resolveEditionEntry } from '../lib/edition.js'

// Rubriek van elke plek in de editie (komt van de server), als label boven het verhaal.
const DESK = { binnenland: 'Binnenland', buitenland: 'Buitenland', vs: 'VS', middenoosten: 'Midden-Oosten', oekraine: 'Oekraïne', wetenschap: 'Wetenschap', bubbel: 'Buiten je bubbel' }
const VIA = { google: 'Google Trends', bluesky: 'Bluesky', wikipedia: 'Wikipedia' }
const deskLabel = (e) => (e.desk === 'bubbel' && e.terms?.length ? `Buiten je bubbel · via ${[...new Set(e.terms.map((t) => VIA[t.via] || t.via))].join(' en ')}` : DESK[e.desk] || null)

const FRONT = 6 // voorpagina: hoofdverhaal, drie ernaast en twee eronder

// Klein verhaal op de voorpagina. Bron en tijd hebben een eigen regel (breekt af in plaats van
// af te kappen); vergelijken en bewaren staan apart eronder. Bij een lange kop vervalt de
// samenvatting — liever dat dan een afgekapte bronregel.
function FrontItem({ item, story, note }) {
  const { markRead, read, openSource, openStory, newInStory } = useHoot()
  const others = story ? story.sourceCount - 1 : 0
  const fresh = story ? newInStory(story) : 0
  const title = item.title
  const summary = title.length <= 90 ? item.summary : null
  return (
    <article className={`entry fitem${read.has(item.id) ? ' is-read' : ''}`} data-id={item.id}>
      {note ? <p className="kicker fitem__kicker">{note}</p> : null}
      <p className="fitem__src">
        <button type="button" className="fitem__name" onClick={() => openSource(item.source)} aria-label={`Alles van ${item.sourceName} bekijken`}>
          <SourceMark source={{ name: item.sourceName, avatar: item.avatar, avatarContain: item.avatarContain, brandColor: item.brandColor }} size={20} />
          {item.sourceName}
        </button>
        <time dateTime={item.publishedAt || undefined}>{timeAgo(item.publishedAt)}</time>
        {item.type === 'opinie' ? <span className="kicker__type">Opinie</span> : null}
      </p>
      <a className="fitem__link" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(item.id)}>
        <span className="fitem__text">
          <span className="fitem__title" role="heading" aria-level="3">
            {title}
          </span>
          {summary ? <span className="fitem__sum">{summary}</span> : null}
        </span>
        {item.image ? (
          <span className="thumb">
            <Img url={item.image} width="64" height="64" />
          </span>
        ) : null}
      </a>
      <div className="fitem__act">
        {others > 0 ? (
          <button type="button" className="morebtn" onClick={() => openStory(story.id)} aria-label={`Vergelijk ${story.sourceCount} bronnen over dit verhaal${fresh ? `, ${fresh} nieuw` : ''}`}>
            {fresh ? <span className="dot" aria-hidden="true" /> : null}+{others} {others === 1 ? 'bron' : 'bronnen'}
          </button>
        ) : (
          <span />
        )}
        {story ? <SaveButton id={story.id} kind="story" payload={story} label="verhaal" /> : <SaveButton id={item.id} payload={item} />}
      </div>
    </article>
  )
}
const SLOT = { ochtend: 'Ochtendeditie', middag: 'Middageditie', avond: 'Avondeditie' }

export default function Edition({ active, edition, bubble = [], brief = null, loading, failedLoad, statusProps, onRefresh, refreshing }) {
  const { itemsById, storiesById, muted } = useHoot()
  const ref = useRef(null)

  // Elke regel van de editie: een verhaal (bundel) of een los bericht.
  const rows = (edition?.entries || [])
    .map((e) => {
      const r = resolveEditionEntry(e, { storiesById, itemsById, muted })
      return r ? { key: e.id, item: r.item, story: r.story, note: deskLabel({ ...e, desk: r.desk }) } : null
    })
    .filter(Boolean)

  const [reading, setReading] = useState(false)
  const hasBrief = !!(brief?.sections?.length || brief?.text)

  useScrollMemory(ref, 'hoot:pos-editie:' + (edition?.id || ''), rows.length > 0, rows.length, active)

  const title = edition ? SLOT[edition.slot] : 'Editie'
  const sub = edition ? longDate(edition.date).replace(/^./, (c) => c.toUpperCase()) : null

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Editie">
      <div className="col col--front">
        <ViewHeader title={title} sub={edition ? null : sub} onRefresh={onRefresh} refreshing={refreshing} compare display />
        {loading ? (
          <Skeleton rows={4} />
        ) : failedLoad ? (
          <LoadError onRetry={onRefresh} />
        ) : rows.length === 0 ? (
          <Empty
            title="Er is nog geen editie"
            action={
              <a className="btn" href="#/stroom">
                Naar de Stroom
              </a>
            }
          >
            Er zijn te weinig verse verhalen om een editie van te maken. In de Stroom staat alles wat er wél is.
          </Empty>
        ) : (
          <>
            <StatusLine {...statusProps} quiet />
            {/* Eén metaregel onder de titel: datum, omvang, tijd en de uitleg. */}
            {/* Eén metaregel: datum en het weer van vandaag; rechts het AI-overzicht. */}
            <div className="edmeta">
              <span className="edmeta__text">
                {sub}
                <Weather />
              </span>
              {hasBrief ? (
                <span className="edmeta__acts">
                  <button type="button" className="textbtn textbtn--sm" onClick={() => setReading(true)} aria-haspopup="dialog" aria-label="De editie in één minuut lezen">
                    <ReaderIcon />1 minuut
                  </button>
                </span>
              ) : null}
            </div>
            {hasBrief ? <BriefReader open={reading} onClose={() => setReading(false)} brief={brief} kicker={`${title} · ${longDate(edition.date)}`} /> : null}
            {/* Voorpagina: het hoofdverhaal groot, daarnaast drie kleinere — altijd in krant-vorm.
                Op smal scherm (of met het vergelijkpaneel open) staan ze onder elkaar. */}
            <div className="front">
              <LeadStory item={rows[0].item} story={rows[0].story} note={rows[0].note} priority={active} />
              {rows.length > 1 ? (
                <div className="front__side">
                  {rows.slice(1, 4).map(({ key, item, story, note }) => (
                    <FrontItem key={key} item={item} story={story} note={note} />
                  ))}
                </div>
              ) : null}
              {/* Onder het hoofdverhaal twee kleinere naast elkaar: vult de linkerkolom op tot de
                  hoogte van de kolom ernaast (geen gat onder het hoofdverhaal). */}
              {rows.length > 4 ? (
                <div className="front__under">
                  {rows.slice(4, FRONT).map(({ key, item, story, note }) => (
                    <FrontItem key={key} item={item} story={story} note={note} />
                  ))}
                </div>
              ) : null}
            </div>
            {rows.length > FRONT ? (
              <div className="front__rest">
                <h2 className="front__more">Verder in deze editie</h2>
                <div className="list">
                  {rows.slice(FRONT).map(({ key, item, story, note }) => (
                    <CompactItem key={key} item={item} story={story} note={note} />
                  ))}
                </div>
              </div>
            ) : null}
            {bubble.length ? (
              <section className="bubble" aria-label="Buiten je bubbel">
                <h2 className="front__more">Buiten je bubbel</h2>
                <p className="hint bubble__hint">Wat anderen nu lezen of zoeken en wat niet in je editie zit — ook uit bronnen die je niet volgt.</p>
                <div className="list">
                  {bubble.map((b) => (
                    <CompactItem key={b.id} item={b.item} story={b.storyId ? storiesById.get(b.storyId) : null} note={`Via ${[...new Set(b.terms.map((t) => ({ google: 'Google Trends', bluesky: 'Bluesky', wikipedia: 'Wikipedia' })[t.via] || t.via))].join(' en ')}`} plain />
                  ))}
                </div>
              </section>
            ) : null}
            <div className="endcap">
              <BrandMark size={44} />
              <h2 className="endcap__title">Je bent bij.</h2>
              <p className="endcap__text">
                Dit was de {SLOT[edition.slot].toLowerCase()} van {longDate(edition.date)}. De volgende staat klaar om {edition.next}.
              </p>
              <a className="btn btn--quiet" href="#/stroom">
                Toch verder lezen in de Stroom
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
