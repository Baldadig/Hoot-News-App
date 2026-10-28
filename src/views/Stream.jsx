import { useEffect, useMemo, useRef, useState } from 'react'
import { clock } from '../lib/time.js'
import { ViewHeader, StatusLine, Skeleton, LoadError, Empty } from '../components/Shell.jsx'
import { Entry, SourceMark, useHoot } from '../components/Items.jsx'
import { FilterIcon, CloseIcon, ArrowUpIcon, StackIcon, CheckIcon } from '../components/icons.jsx'
import { TOPICS, INTERESTS, orderedTopics, inInterest } from '../lib/topics.js'
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
const topicLabel = (id) => (id === 'bubbel' ? 'Buiten je bubbel' : TOPICS.find((t) => t.id === id)?.label || id)
const interestLabel = (id) => INTERESTS.find((i) => i.id === id)?.label || id

// Alle filters in één paneel (native <dialog>: focus blijft binnen, Esc sluit).
function FilterSheet({ open, onClose, params, picks, togglePick, clear, setFilter, sources, count }) {
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

        <h3 className="sheet__label">Bron</h3>
        <div className="chips">
          {sources.map((s) => (
            <button key={s.id} type="button" className="chip chip--src" aria-pressed={picks.has(s.id)} onClick={() => togglePick(s.id)}>
              <SourceMark source={s} size={20} />
              {s.name}
            </button>
          ))}
        </div>


        <div className="sheet__foot">
          <button type="button" className="btn btn--quiet" onClick={clear}>
            Wis filters
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
  const activeCount = Object.values(filters).filter(Boolean).length

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

  const srcName = (id) => sources.find((s) => s.id === id)?.name || id
  const kindName = (id) => KINDS.find((k) => k.id === id)?.label
  // In het filterblad alleen bronnen die meedoen: een uitgezette bron levert hier niets op.
  const followed = sources.filter((s) => s.followed && !muted.has(s.id))
  const offSource = pickList.find((id) => muted.has(id)) || null
  const favs = prefs?.favorites || []
  const rank = (s) => (favs.includes(s.id) ? favs.indexOf(s.id) - 1000 : -(s.count || 0))
  const strip = followed.filter((s) => s.kind !== 'sociaal').sort((a, b) => rank(a) - rank(b))
  // Een bron erbij of eraf. De lijst in de URL in de volgorde van de rij: dezelfde keuze is
  // dan altijd dezelfde URL (en dus dezelfde leespositie).
  const order = (ids) => {
    const at = (id) => {
      const i = strip.findIndex((s) => s.id === id)
      return i < 0 ? strip.length : i
    }
    return [...ids].sort((a, b) => at(a) - at(b))
  }
  const togglePick = (id) => setFilter('bron', order(picks.has(id) ? pickList.filter((p) => p !== id) : [...pickList, id]).join(','))
  // "NOS, Tweakers"; bij meer dan drie: "NOS, Tweakers en 2 andere".
  const pickNames = order(pickList).map(srcName)
  const pickText = pickNames.length > 3 ? (
    <>
      <strong>{pickNames.slice(0, 2).join(', ')}</strong> en {pickNames.length - 2} andere
    </>
  ) : (
    <strong>{pickNames.join(', ')}</strong>
  )
  const otherFilters = [filters.onderwerp && topicLabel(filters.onderwerp), filters.rubriek && interestLabel(filters.rubriek), filters.soort && kindName(filters.soort)].filter(Boolean).join(' · ')
  const sheetCount = [picks.size, filters.soort].filter(Boolean).length // wat in het filterblad staat (onderwerp zit in de rij)

  // De gekozen pil in beeld houden (ook als je terugkomt met een filter uit de URL).
  const stripRef = useRef(null)
  useEffect(() => {
    const strip = stripRef.current
    const on = strip?.querySelector('[aria-pressed="true"]')
    if (!strip || !on) return
    const left = on.offsetLeft - strip.offsetLeft
    if (left < strip.scrollLeft || left + on.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left: Math.max(0, left - 16) })
  }, [filters.onderwerp, filters.rubriek, active])

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Stroom" onScroll={(e) => setAtDepth(e.currentTarget.scrollTop > 900)}>
      <div className="col">
        <ViewHeader title="Stroom" sub="Alles van je bronnen, nieuwste eerst" subWide onRefresh={onRefresh} refreshing={refreshing} compare display>
          {/* Eén rij: alle onderwerpen als pillen (swipen), rechts een vast filtericoon. */}
          <div className="topics">
            <div className="topics__scroll" role="group" aria-label="Onderwerp" ref={stripRef}>
              <button type="button" className="chip chip--sm" aria-pressed={!filters.onderwerp && !filters.rubriek} onClick={() => apply({ ...filters, onderwerp: '', rubriek: '' })}>
                Alles
              </button>
              {bubble.length ? (
                <button type="button" className="chip chip--sm chip--bubble" aria-pressed={filters.onderwerp === 'bubbel'} onClick={() => apply({ ...filters, rubriek: '', onderwerp: filters.onderwerp === 'bubbel' ? '' : 'bubbel' })}>
                  Buiten je bubbel
                </button>
              ) : null}
              {/* Volg je bepaalde onderwerpen, dan die; anders de acht hoofdonderwerpen. */}
              {mine.length
                ? orderedTopics(pinned, mine).map((t) => (
                    <button key={t.id} type="button" className="chip chip--sm" aria-pressed={filters.onderwerp === t.id} onClick={() => apply({ ...filters, rubriek: '', onderwerp: filters.onderwerp === t.id ? '' : t.id })}>
                      {t.label}
                    </button>
                  ))
                : INTERESTS.map((r) => (
                    <button key={r.id} type="button" className="chip chip--sm" aria-pressed={filters.rubriek === r.id} onClick={() => apply({ ...filters, onderwerp: '', rubriek: filters.rubriek === r.id ? '' : r.id })}>
                      {r.label}
                    </button>
                  ))}
            </div>
            <button type="button" className={`iconbtn topics__filter${sheetCount ? ' is-on' : ''}`} onClick={() => setSheet(true)} aria-haspopup="dialog" aria-label={`Filters${sheetCount ? `, ${sheetCount} actief` : ''}`} title="Filters: soort en bron">
              <FilterIcon />
              {sheetCount ? <span className="topics__dot" aria-hidden="true" /> : null}
            </button>
          </div>
          {/* Filter op bron: "Alle" vooraan, dan je bronnen (voorkeursbronnen eerst) als logo met
              naam. Tik zet een bron erbij of eraf; niets gekozen = alles. Wat je filtert staat in
              woorden in de statusregel eronder, met "Wis". */}
          {strip.length > 1 ? (
            <>
              <p className="srcstrip__label" id="srcstrip-label">
                Filter op bron
              </p>
              <div className={`srcstrip${picks.size ? ' is-picking' : ''}`} role="group" aria-labelledby="srcstrip-label">
                <button type="button" className="srcstrip__btn" aria-pressed={!picks.size} aria-label="Alle bronnen" onClick={() => setFilter('bron', '')}>
                  <span className="srcstrip__logo">
                    <span className="srcstrip__all">
                      <StackIcon />
                    </span>
                    <span className="srcstrip__check" aria-hidden="true">
                      <CheckIcon />
                    </span>
                  </span>
                </button>
                {strip.map((s) => (
                  <button key={s.id} type="button" className="srcstrip__btn" aria-pressed={picks.has(s.id)} aria-label={s.name} title={s.name} onClick={() => togglePick(s.id)}>
                    <span className="srcstrip__logo">
                      <SourceMark source={s} size={36} />
                      <span className="srcstrip__check" aria-hidden="true">
                        <CheckIcon />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
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
            {/* Eén regel: wat je ziet en hoe vers het is. Met een filter: welke, met "Wis". */}
            {activeCount && statusProps.online && !statusProps.refreshError ? (
              <p className="status" role="status">
                {picks.size ? pickText : null}
                {picks.size && otherFilters ? ' · ' : null}
                {otherFilters}
                {otherFilters ? ` · ${list.length} ${list.length === 1 ? 'bericht' : 'berichten'}` : ''}
                {statusProps.meta?.updatedAt ? ` · Bijgewerkt om ${clock(statusProps.meta.updatedAt)}` : ''}{' '}
                <button type="button" className="linkbtn linkbtn--inline" onClick={clear}>
                  Wis
                </button>
              </p>
            ) : !statusProps.refreshing && statusProps.online && !statusProps.refreshError && !statusProps.allDown && statusProps.meta?.updatedAt ? (
              <p className="status">Alle bronnen · Bijgewerkt om {clock(statusProps.meta.updatedAt)}</p>
            ) : (
              <StatusLine {...statusProps} />
            )}
            {list.length === 0 && picks.size && !offSource && activeCount === 1 ? (
              // Gekozen bronnen zonder berichten: een stille regel, geen groot leeg scherm.
              <p className="status status--empty">Nog niets van deze bronnen.</p>
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
                {offSource ? `${srcName(offSource)} staat uit. Zet de bron aan om de berichten in je Stroom te zien.` : stream.length === 0 ? 'Al je bronnen staan uit. Zet er een aan bij Bronnen.' : 'Er is op dit moment niets dat hieraan voldoet. De berichten zelf zijn wel geladen.'}
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

      <FilterSheet open={sheet} onClose={() => setSheet(false)} params={filters} picks={picks} togglePick={togglePick} setFilter={setFilter} clear={clear} sources={followed} count={list.length} />
    </section>
  )
}
