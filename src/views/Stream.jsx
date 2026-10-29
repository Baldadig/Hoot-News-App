import { useEffect, useMemo, useRef, useState } from 'react'
import { ViewHeader, StatusLine, Skeleton, LoadError, Empty } from '../components/Shell.jsx'
import { Entry, useHoot } from '../components/Items.jsx'
import { StreamLine } from '../components/StreamLine.jsx'
import { FilterIcon, CloseIcon, ArrowUpIcon } from '../components/icons.jsx'
import { inInterest } from '../lib/topics.js'
import { rubriekRij, actieveRubriek, kiesRubriek, rijBronnen, inRijVolgorde, legeRegel } from '../lib/streamline.js'
import { useScrollMemory } from '../hooks/useScrollMemory.js'
import { positionKey } from '../lib/context.js'
import { readJSON } from '../lib/store.js'
import { watch } from '../lib/inview.js'

const PAGE = 60 // zoveel berichten tegelijk; de rest komt erbij terwijl je scrolt

const KINDS = [
  { id: '', label: 'Alles' },
  { id: 'artikelen', label: 'Artikelen' },
  { id: 'opinie', label: 'Opinie' },
]

// Het filterblad: de soort (native <dialog>: focus blijft binnen, Esc sluit). Rubriek en bron
// kies je op de lijn in de kop; "Wis alle filters" zet ook die terug, en zegt dat dus.
function FilterSheet({ open, onClose, params, clear, setFilter, count }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="sheet-title">
      <div className="sheet__in">
        <div className="sheet__head">
          <h2 id="sheet-title" className="sheet__title">
            Filters
          </h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Sluiten">
            <CloseIcon />
          </button>
        </div>

        <h3 className="sheet__label">Soort</h3>
        <div className="chips">
          {KINDS.map((k) => (
            <button key={k.id} type="button" className="chip" aria-pressed={(params.soort || '') === k.id} onClick={() => setFilter('soort', k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <p className="sheet__note">"Opinie" staat er alleen als de bron het zelf zo noemt.</p>

        <div className="sheet__foot">
          <button type="button" className="btn btn--quiet" onClick={clear}>
            Wis alle filters
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Toon {count} {count === 1 ? 'bericht' : 'berichten'}
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default function Stream({ active, stream, params, go, pinned, mine = [], bubble = [], preview = 2, sources, loading, failedLoad, statusProps, onRefresh, refreshing, pendingCount, onShowNew }) {
  const { storiesById, sourcesById, muted, setMuted, prefs } = useHoot()
  const ref = useRef(null)
  const [sheet, setSheet] = useState(false)
  const [atDepth, setAtDepth] = useState(false)

  const filters = { bron: params.bron || '', onderwerp: params.onderwerp || '', rubriek: params.rubriek || '', soort: params.soort || '' }
  // `bron` is één id of een lijst met komma's (meer bronnen tegelijk); leeg = alle bronnen.
  const pickList = useMemo(() => filters.bron.split(',').filter(Boolean), [filters.bron])
  const picks = useMemo(() => new Set(pickList), [pickList])

  const list = useMemo(
    () =>
      // "Buiten je bubbel" is geen onderwerp maar een aparte lijst: de drie signalen van de editie.
      filters.onderwerp === 'bubbel' ? bubble.map((b) => b.item) :
      stream.filter((i) => {
        if (picks.size && !picks.has(i.source)) return false
        if (filters.onderwerp && !(i.topics || []).includes(filters.onderwerp)) return false
        if (filters.rubriek && !inInterest(i, filters.rubriek, sourcesById.get(i.source))) return false
        if (filters.soort === 'opinie' && i.type !== 'opinie') return false
        if (filters.soort === 'artikelen' && (i.kind === 'post' || i.type === 'opinie')) return false
        return true
      }),
    [stream, bubble, picks, filters.onderwerp, filters.rubriek, filters.soort, sourcesById]
  )

  // Filters zijn stappen in de geschiedenis: de terugknop zet het vorige filter terug.
  // Elke filtercombinatie is een eigen lijst met een eigen leespositie. Kies je zelf een
  // filter, dan begin je bovenaan; kom je terug (terugknop, navigatie), dan sta je waar je was.
  const apply = (next) => {
    try {
      localStorage.removeItem(positionKey('stroom', next))
    } catch {
      /* niet erg */
    }
    go('stroom', next)
  }
  const setFilter = (key, value) => apply({ ...filters, [key]: value })
  const clear = () => apply({})

  useScrollMemory(ref, positionKey('stroom', filters), list.length > 0, list.length + ':' + (list[0]?.id || ''), active)

  // Niet alles tegelijk tekenen: eerst één portie, de volgende zodra je het eind nadert. Kom je
  // terug op een plek verderop, dan tekenen we in één keer tot daar (de leespositie blijft kloppen).
  const posKey = positionKey('stroom', filters)
  const [limit, setLimit] = useState(PAGE)
  useEffect(() => {
    const at = readJSON(posKey, null)?.id
    const idx = at ? list.findIndex((i) => i.id === at) : -1
    setLimit(Math.max(PAGE, idx + PAGE))
  }, [posKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const more = useRef(null)
  const shown = list.length > limit ? list.slice(0, limit) : list
  useEffect(() => watch(more.current, { rootMargin: '1200px 0px' }, (e) => e.isIntersecting && setLimit((n) => n + PAGE)), [shown.length < list.length])

  const srcName = (id) => sourcesById.get(id)?.name || id
  const kindName = (id) => KINDS.find((k) => k.id === id)?.label
  // Op de lijn alleen bronnen die meedoen: een uitgezette bron levert hier niets op.
  const followed = sources.filter((s) => s.followed && !muted.has(s.id))
  const offSource = pickList.find((id) => muted.has(id)) || null
  const favs = prefs?.favorites || []
  const rank = (s) => (favs.includes(s.id) ? favs.indexOf(s.id) - 1000 : -(s.count || 0))
  const strip = followed.filter((s) => s.kind !== 'sociaal').sort((a, b) => rank(a) - rank(b))
  // Bluesky-accounts die je in de Stroom wilt (Bluesky → In de Stroom) achteraan in de rij, en
  // daarna wat je koos maar er niet in staat (een uitgezette bron, 'Alles van …' bij een account).
  const inStream = followed.filter((s) => s.kind === 'sociaal' && (prefs?.bskyInStream || []).includes(s.id))
  const rij = rijBronnen([...strip, ...inStream], pickList, sourcesById)
  // Een bron erbij of eraf. De lijst in de URL in de volgorde van de rij: dezelfde keuze is
  // dan altijd dezelfde URL (en dus dezelfde leespositie).
  const togglePick = (id) => setFilter('bron', inRijVolgorde(picks.has(id) ? pickList.filter((p) => p !== id) : [...pickList, id], rij).join(','))
  // De rubrieken: Alles en Buiten je bubbel, dan je onderwerpen of de acht rubrieken.
  const rubrieken = useMemo(
    () => rubriekRij({ mine, pinned, hasBubble: bubble.length > 0, filters: { onderwerp: filters.onderwerp, rubriek: filters.rubriek } }),
    [mine, pinned, bubble.length, filters.onderwerp, filters.rubriek],
  )
  const actief = actieveRubriek(filters)

  // Niets voor deze keuze: één stille regel met de weg terug. "Buiten je bubbel" kijkt niet naar
  // bron en soort, dus daar alleen de regel.
  const bubbel = filters.onderwerp === 'bubbel'
  const leeg = legeRegel({
    namen: bubbel ? [] : rij.filter((s) => picks.has(s.id)).map((s) => s.name),
    rubriek: actief ? rubrieken.items.find((r) => r.sig === actief)?.label || '' : '',
    soort: bubbel ? '' : filters.soort,
  })

  // De filterknop (soort) staat in de kop; wat je verder filtert zie je op de lijn.
  const filterButton = (
    <button type="button" className={`iconbtn filterbtn${filters.soort ? ' is-on' : ''}`} onClick={() => setSheet(true)} aria-haspopup="dialog" aria-label={`Filters: soort${filters.soort ? `, nu ${kindName(filters.soort)}` : ''}`} title="Filters: soort (Alles, Artikelen, Opinie)">
      <FilterIcon />
      {filters.soort ? <span className="filterbtn__dot" aria-hidden="true" /> : null}
    </button>
  )

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Stroom" onScroll={(e) => setAtDepth(e.currentTarget.scrollTop > 900)}>
      <div className="col">
        <ViewHeader title="Stroom" onRefresh={onRefresh} refreshing={refreshing} updatedAt={statusProps.meta?.updatedAt} tools={filterButton} compare display>
          {/* De lijn: rubrieken links, je bronnen als stapel rechts. Wat je kiest staat in de URL
              (zoals altijd: een stap in de geschiedenis, met een eigen leespositie). */}
          <StreamLine
            rubrieken={rubrieken}
            active={actief}
            onRubriek={(r) => apply(kiesRubriek(filters, r))}
            bronnen={rij}
            picks={picks}
            onToggle={togglePick}
            onAll={() => setFilter('bron', '')}
            sources={rij.length > 1 || picks.size > 0}
          />
        </ViewHeader>

        {pendingCount > 0 ? (
          <button type="button" className="newpill" aria-label={`${pendingCount} ${pendingCount === 1 ? 'nieuw bericht' : 'nieuwe berichten'} tonen`} onClick={() => (onShowNew(), ref.current?.scrollTo({ top: 0 }))}>
            <ArrowUpIcon />
            {pendingCount} {pendingCount === 1 ? 'nieuw bericht' : 'nieuwe berichten'}
          </button>
        ) : null}

        {loading ? (
          <Skeleton />
        ) : failedLoad ? (
          <LoadError onRetry={onRefresh} />
        ) : (
          <>
            {/* Alleen als er iets mis is (offline, verversen mislukt, alle bronnen onbereikbaar);
                hoe vers het is, staat in de knop Verversen. */}
            <StatusLine {...statusProps} quiet />
            {list.length === 0 && !offSource && stream.length > 0 ? (
              <div className="listempty">
                <p>{leeg}</p>
                {picks.size && !bubbel ? (
                  <button type="button" className="listempty__btn" onClick={() => setFilter('bron', '')}>
                    Toon alle bronnen
                  </button>
                ) : filters.soort && !bubbel ? (
                  <button type="button" className="listempty__btn" onClick={() => setFilter('soort', '')}>
                    Toon alle soorten
                  </button>
                ) : null}
              </div>
            ) : list.length === 0 ? (
              <Empty
                title="Geen berichten voor dit filter"
                action={
                  offSource ? (
                    <button type="button" className="btn" onClick={() => setMuted(offSource, true)}>
                      Zet {srcName(offSource)} aan
                    </button>
                  ) : (
                    <button type="button" className="btn" onClick={clear}>
                      Wis filters
                    </button>
                  )
                }
              >
                {offSource ? `${srcName(offSource)} staat uit. Zet de bron aan om de berichten in je Stroom te zien.` : 'Al je bronnen staan uit. Zet er een aan bij Bronnen.'}
              </Empty>
            ) : (
              <div className={`list${preview === 'alles' ? '' : ` list--lines-${preview}`}`}>
                {shown.map((item) => (
                  <Entry key={item.id} item={item} story={item.storyId ? storiesById.get(item.storyId) : null} />
                ))}
                {shown.length < list.length ? <div ref={more} className="listmore" aria-hidden="true" /> : <p className="listend">Dit is alles wat je bronnen nu aanbieden.</p>}
              </div>
            )}
          </>
        )}
      </div>

      {atDepth ? (
        <button type="button" className="totop" onClick={() => ref.current?.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Terug naar boven">
          <ArrowUpIcon />
        </button>
      ) : null}

      <FilterSheet open={sheet} onClose={() => setSheet(false)} params={filters} setFilter={setFilter} clear={clear} count={list.length} />
    </section>
  )
}
