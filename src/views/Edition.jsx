import { useRef, useState } from 'react'
import { ViewHeader, StatusLine, Skeleton, LoadError, Empty } from '../components/Shell.jsx'
import { LeadStory, CompactItem, Meta, useHoot, linkOf, itemsOfEntry, aboutOf } from '../components/Items.jsx'
import { Img } from '../components/Img.jsx'
import { SparkleIcon, CaretIcon, ICON_SM } from '../components/icons.jsx'
import { BriefReader } from '../components/BriefReader.jsx'
import { BrandMark } from '../components/Brand.jsx'
import Weather from '../components/Weather.jsx'
import { longDate } from '../lib/time.js'
import { useScrollMemory } from '../hooks/useScrollMemory.js'
import { resolveEditionEntry, heroFirst, EDITION_SIZE } from '../lib/edition.js'
import { fitsHero } from '../lib/img.js'
import { followedNow } from '../lib/follow.js'
import { TermHelp } from '../components/Terms.jsx'

// Rubriek van elke plek in de editie (komt van de server), als label boven het verhaal.
const DESK = { binnenland: 'Binnenland', buitenland: 'Buitenland', vs: 'VS', middenoosten: 'Midden-Oosten', oekraine: 'Oekraïne', wetenschap: 'Wetenschap', tech: 'Tech', economie: 'Economie', bubbel: 'Buiten je bubbel', extern: 'Buiten je bronnen' }
const VIA = { google: 'Google Trends', bluesky: 'Bluesky', wikipedia: 'Wikipedia' }
const deskLabel = (e) => (e.desk === 'bubbel' && e.terms?.length ? `Buiten je bubbel · via ${[...new Set(e.terms.map((t) => VIA[t.via] || t.via))].join(' en ')}` : DESK[e.desk] || null)

const FRONT = 6 // voorpagina: hoofdverhaal, drie ernaast en twee eronder

// Klein verhaal op de voorpagina: rubriek, kop en hooguit twee regels samenvatting (ook bij een
// lange kop: die vertelt zelden wat er gebeurde), dan dezelfde actieregel als elk bericht. Is de
// kolom smal, dan krijgt de bron een eigen regel en staan vergelijken en bewaren eronder.
// Volg je het verhaal, dan staat dat stil achter de rubriek ('Je volgt').
function FrontItem({ item, story, note, followed, taste }) {
  const { markRead, read } = useHoot()
  const opinie = item.type === 'opinie'
  const title = item.title
  const summary = item.summary
  return (
    <article className={`entry fitem${read.has(item.id) ? ' is-read' : ''}`} data-id={item.id}>
      {note || opinie || followed ? (
        <p className="label label--kicker kicker">
          {note ? <span>{note}</span> : null}
          {opinie ? <span className="kicker__type">Opinie</span> : null}
          {followed ? <span className="label--meta front__followed">{followed}</span> : null}
        </p>
      ) : null}
      <a className="fitem__link" href={linkOf(item)} target="_blank" rel="noopener noreferrer" onClick={() => markRead(item.id)}>
        <span className="fitem__text">
          <span className="head-4 fitem__title" role="heading" aria-level="3">
            {title}
          </span>
          {summary ? <span className="clamp fitem__sum">{summary}</span> : null}
        </span>
        {item.image ? (
          <span className="thumb">
            <Img url={item.image} width="64" height="64" />
          </span>
        ) : null}
      </a>
      <TermHelp text={`${title} ${summary || ''}`} max={1} />
      <Meta item={item} story={story} taste={taste} />
    </article>
  )
}

// Een verhaal waar je "minder hiervan" op zei: ingeklapt tot één regel, met de weg terug.
function LessNote({ entryKey, item, story }) {
  const { undoLess, itemsById } = useHoot()
  const items = itemsOfEntry(item, story, itemsById)
  return (
    <p className="lessnote" role="status">
      <span>Je ziet minder over {aboutOf(items)}.</span>
      <button type="button" className="linkbtn linkbtn--plain lessnote__undo" onClick={() => undoLess(entryKey, items)}>
        Ongedaan maken
      </button>
    </p>
  )
}
// Elke plek: het verhaal zelf, of ingeklapt als je er minder van wilde.
const Slot = ({ less, row, children }) => (less.includes(row.key) ? <LessNote entryKey={row.key} item={row.item} story={row.story} /> : children)
const SLOT = { ochtend: 'Ochtendeditie', middag: 'Middageditie', avond: 'Avondeditie' }

export default function Edition({ active, edition, bubble = [], brief = null, briefForMembers = false, onJoin, loading, failedLoad, statusProps, onRefresh, refreshing }) {
  const { itemsById, storiesById, muted, followStories, newInStory, openStory, less, account } = useHoot()
  const following = followedNow(followStories, storiesById, newInStory)
  const ref = useRef(null)

  // Elke plek van de editie: het gepubliceerde bericht (vast) met de bundel erachter. Alle plekken
  // blijven staan; een bron die je niet volgt krijgt een label (behalve "Buiten je bubbel", dat
  // daar juist voor is).
  const published = new Map((edition?.items || []).map((i) => [i.id, i]))
  const placed = (edition?.entries || [])
    .map((e, index) => {
      const r = resolveEditionEntry(e, { storiesById, itemsById, published, muted })
      if (!r) return null
      const label = e.desk === 'breed' ? `Waar iedereen over schrijft · ${e.sourceCount} bronnen` : deskLabel({ ...e, desk: r.desk })
      // "Buiten je bubbel" en "Buiten je bronnen" zeggen het zelf al; elders een label als je de bron niet volgt.
      const note = r.followed || ['bubbel', 'extern', 'breed'].includes(e.desk) ? label : [label, 'Buiten je bronnen'].filter(Boolean).join(' · ')
      return { key: e.id, index, desk: e.desk, item: r.item, story: r.story, note }
    })
    .filter(Boolean)
  const rows = heroFirst(placed, fitsHero)

  // Je volgt, zonder dubbelingen: een gevolgd verhaal dat op de voorpagina staat (en niet is
  // ingeklapt), krijgt daar 'Je volgt' achter de rubriek en valt uit het lijstje erboven. Wat je
  // volgt verandert niet; alleen waar het staat.
  const onFront = new Map() // plek → label
  const shown = new Set() // verhalen die al op de voorpagina staan
  for (const r of rows.slice(0, FRONT)) {
    const f = r.story && !less.includes(r.key) ? following.find((x) => x.story.id === r.story.id) : null
    if (!f) continue
    onFront.set(r.key, f.fresh ? `Je volgt · ${f.fresh} nieuw` : 'Je volgt')
    shown.add(f.story.id)
  }
  const followingRest = following.filter((f) => !shown.has(f.story.id))

  const [reading, setReading] = useState(false)
  const hasBrief = !!(brief?.sections?.length || brief?.text)

  useScrollMemory(ref, 'hoot:pos-editie:' + (edition?.id || ''), rows.length > 0, rows.length, active)

  const title = edition ? SLOT[edition.slot] : 'Editie'
  const ready = !loading && !failedLoad && rows.length > 0
  const sub = edition ? longDate(edition.date).replace(/^./, (c) => c.toUpperCase()) : null

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Editie">
      <div className="col col--wide col--front">
        {/* De kop van de Editie: titel, één metaregel (datum · weer · omvang) en de ingang naar het
            overzicht; de inktlijn eronder is het begin van het nieuws. Eén blok, zodat de kleur
            "Inkt" er een band van kan maken. */}
        <div className="edtop">
          <ViewHeader title={title} sub={edition ? null : sub} onRefresh={onRefresh} refreshing={refreshing} compare />
          {ready ? (
            <>
              <StatusLine {...statusProps} quiet />
              {/* Eén metaregel, net als onder elke schermkop: datum, het weer en waar de Editie uit
                  bestaat. Geen weer, dan valt het tussenstuk weg (en zijn punt). Een korte Editie
                  zegt hoeveel verhalen er zijn als eigen deel, met dezelfde punt ervoor. */}
              <p className="vh__sub edmeta">
                <span>{sub}</span>
                <span className="edmeta__wx">
                  <Weather />
                </span>
                <span>{edition.personal ? 'Samengesteld uit jouw bronnen en interesses' : 'De Editie voor iedereen'}</span>
                {rows.length < EDITION_SIZE ? (
                  <span>
                    {rows.length} {rows.length === 1 ? 'verhaal' : 'verhalen'}: er was niet meer nieuws dat breed genoeg werd gebracht
                  </span>
                ) : null}
              </p>
              {hasBrief ? (
                <button type="button" className="briefcta" onClick={() => setReading(true)} aria-haspopup="dialog">
                  <span className="briefcta__icon" aria-hidden="true">
                    <SparkleIcon />
                  </span>
                  <span className="briefcta__text">
                    <span className="head-4 briefcta__title">De Editie in één minuut</span>
                    <span className="briefcta__sub">Samenvatting door AI, met de bronnen erbij</span>
                  </span>
                  <span className="briefcta__go" aria-hidden="true">
                    <CaretIcon size={ICON_SM} />
                  </span>
                </button>
              ) : null}
              {!hasBrief && briefForMembers ? (
                // Hoot is op uitnodiging: dat staat er al vóór je inlogt. Ingelogd zonder lidmaatschap?
                // Dan brengt de knop je naar het veld voor je uitnodigingscode (Instellingen).
                <button type="button" className="briefcta" onClick={onJoin} aria-haspopup={account?.status === 'noInvite' ? undefined : 'dialog'}>
                  <span className="briefcta__icon" aria-hidden="true">
                    <SparkleIcon />
                  </span>
                  <span className="briefcta__text">
                    <span className="head-4 briefcta__title">Jouw Editie in één minuut</span>
                    <span className="briefcta__sub">{account?.status === 'noInvite' ? 'Voor leden: vul je uitnodigingscode in' : 'Voor leden, op uitnodiging'}</span>
                  </span>
                  <span className="briefcta__go" aria-hidden="true">
                    <CaretIcon size={ICON_SM} />
                  </span>
                </button>
              ) : null}
            </>
          ) : null}
        </div>
        {loading ? (
          <Skeleton rows={4} />
        ) : failedLoad ? (
          <LoadError onRetry={onRefresh} />
        ) : rows.length === 0 ? (
          <Empty
            title="Er is nog geen Editie"
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
            {followingRest.length ? (
              <section className="following" aria-label="Verhalen die je volgt">
                <h2 className="label label--section following__head">Je volgt</h2>
                <ul>
                  {followingRest.map((f) => (
                    <li key={f.id}>
                      <button type="button" className="following__row" onClick={() => openStory(f.story.id)}>
                        <span className="head-4 following__title">{f.title}</span>
                        <span className={`following__new${f.fresh ? ' is-new' : ''}`}>{f.fresh ? `${f.fresh} nieuw` : 'niets nieuws'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {hasBrief ? <BriefReader open={reading} onClose={() => setReading(false)} brief={brief} rows={rows} kicker={`${title} · ${longDate(edition.date)}`} /> : null}
            {/* Voorpagina: het hoofdverhaal groot, daarnaast drie kleinere — altijd in krant-vorm.
                Is het raam smaller dan 42rem (telefoon), dan staan ze onder elkaar. */}
            <div className="front">
              <Slot less={less} row={rows[0]}>
                <LeadStory item={rows[0].item} story={rows[0].story} note={rows[0].note} followed={onFront.get(rows[0].key)} priority={active} taste={rows[0].key} />
              </Slot>
              {rows.length > 1 ? (
                <div className="front__side rows">
                  {rows.slice(1, 4).map((r) => (
                    <Slot key={r.key} less={less} row={r}>
                      <FrontItem item={r.item} story={r.story} note={r.note} followed={onFront.get(r.key)} taste={r.key} />
                    </Slot>
                  ))}
                </div>
              ) : null}
              {/* Onder het hoofdverhaal twee kleinere naast elkaar: vult de linkerkolom op tot de
                  hoogte van de kolom ernaast (geen gat onder het hoofdverhaal). */}
              {rows.length > 4 ? (
                <div className="front__under rows">
                  {rows.slice(4, FRONT).map((r) => (
                    <Slot key={r.key} less={less} row={r}>
                      <FrontItem item={r.item} story={r.story} note={r.note} followed={onFront.get(r.key)} taste={r.key} />
                    </Slot>
                  ))}
                </div>
              ) : null}
            </div>
            {rows.length > FRONT ? (
              <div className="front__rest">
                <h2 className="label label--section front__more">Verder in deze Editie</h2>
                <div className="list rows">
                  {rows.slice(FRONT).map((r) => (
                    <Slot key={r.key} less={less} row={r}>
                      <CompactItem item={r.item} story={r.story} note={r.note} taste={r.key} />
                    </Slot>
                  ))}
                </div>
              </div>
            ) : null}
            {bubble.length ? (
              <section className="bubble" aria-label="Buiten je bubbel">
                <h2 className="label label--section front__more">Buiten je bubbel</h2>
                <p className="hint bubble__hint">Wat anderen nu lezen of zoeken en wat niet in je Editie zit — ook uit bronnen die je niet volgt.</p>
                <div className="list rows">
                  {bubble.map((b) => (
                    <CompactItem key={b.id} item={b.item} story={b.storyId ? storiesById.get(b.storyId) : null} note={`Via ${[...new Set(b.terms.map((t) => VIA[t.via] || t.via))].join(' en ')}`} plain />
                  ))}
                </div>
              </section>
            ) : null}
            <div className="endcap">
              <BrandMark size={44} />
              <h2 className="head-5 endcap__title">Je bent bij.</h2>
              <p className="endcap__text">
                Dit was de {SLOT[edition.slot].toLowerCase()} van {longDate(edition.date)}. De volgende staat klaar om {edition.next}.
              </p>
              {/* Het einde is leidend; verder lezen mag, maar als rustige link (geen knop die je doortrekt). */}
              <a className="linkbtn endcap__more" href="#/stroom">
                Of lees verder in de Stroom
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
