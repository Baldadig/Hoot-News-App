import { useEffect, useMemo, useRef, useState } from 'react'
import { clock } from '../lib/time.js'
import { ViewHeader, StatusLine, Skeleton, LoadError, Empty } from '../components/Shell.jsx'
import { Entry, SourceMark, useHoot } from '../components/Items.jsx'
import { FilterIcon, CloseIcon, ArrowUpIcon } from '../components/icons.jsx'
import { TOPICS, orderedTopics } from '../lib/topics.js'
import { useScrollMemory } from '../hooks/useScrollMemory.js'
import { positionKey } from '../lib/context.js'

const KINDS = [
  { id: '', label: 'Alles' },
  { id: 'artikelen', label: 'Artikelen' },
  { id: 'opinie', label: 'Opinie' },
]
const topicLabel = (id) => (id === 'bubbel' ? 'Buiten je bubbel' : TOPICS.find((t) => t.id === id)?.label || id)

// Alle filters in één paneel (native <dialog>: focus blijft binnen, Esc sluit).
function FilterSheet({ open, onClose, params, setFilter, clear, sources, count }) {
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
            <button key={s.id} type="button" className="chip chip--src" aria-pressed={params.bron === s.id} onClick={() => setFilter('bron', params.bron === s.id ? '' : s.id)}>
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

export default function Stream({ active, stream, params, go, pinned, bubble = [], preview = 2, sources, loading, failedLoad, statusProps, onRefresh, refreshing, pendingCount, onShowNew }) {
  const { storiesById } = useHoot()
  const ref = useRef(null)
  const [sheet, setSheet] = useState(false)
  const [atDepth, setAtDepth] = useState(false)

  const filters = { bron: params.bron || '', onderwerp: params.onderwerp || '', soort: params.soort || '' }
  const activeCount = Object.values(filters).filter(Boolean).length

  const list = useMemo(
    () =>
      // "Buiten je bubbel" is geen onderwerp maar een aparte lijst: de drie signalen van de editie.
      filters.onderwerp === 'bubbel' ? bubble.map((b) => b.item) :
      stream.filter((i) => {
        if (filters.bron && i.source !== filters.bron) return false
        if (filters.onderwerp && !(i.topics || []).includes(filters.onderwerp)) return false
        if (filters.soort === 'opinie' && i.type !== 'opinie') return false
        if (filters.soort === 'artikelen' && (i.kind === 'post' || i.type === 'opinie')) return false
        return true
      }),
    [stream, bubble, filters.bron, filters.onderwerp, filters.soort]
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

  const srcName = (id) => sources.find((s) => s.id === id)?.name || id
  const kindName = (id) => KINDS.find((k) => k.id === id)?.label
  const followed = sources.filter((s) => s.followed)
  const filterText = [filters.onderwerp && topicLabel(filters.onderwerp), filters.bron && `Alleen ${srcName(filters.bron)}`, filters.soort && kindName(filters.soort)].filter(Boolean).join(' · ')
  const sheetCount = [filters.bron, filters.soort].filter(Boolean).length // wat in het filterblad staat (onderwerp zit in de rij)

  // De gekozen pil in beeld houden (ook als je terugkomt met een filter uit de URL).
  const stripRef = useRef(null)
  useEffect(() => {
    const strip = stripRef.current
    const on = strip?.querySelector('[aria-pressed="true"]')
    if (!strip || !on) return
    const left = on.offsetLeft - strip.offsetLeft
    if (left < strip.scrollLeft || left + on.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left: Math.max(0, left - 16) })
  }, [filters.onderwerp, active])

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Stroom" onScroll={(e) => setAtDepth(e.currentTarget.scrollTop > 900)}>
      <div className="col">
        <ViewHeader title="Stroom" sub="Alles van je bronnen, nieuwste eerst" subWide onRefresh={onRefresh} refreshing={refreshing} compare display>
          {/* Eén rij: alle onderwerpen als pillen (swipen), rechts een vast filtericoon. */}
          <div className="topics">
            <div className="topics__scroll" role="group" aria-label="Onderwerp" ref={stripRef}>
              <button type="button" className="chip chip--sm" aria-pressed={!filters.onderwerp} onClick={() => setFilter('onderwerp', '')}>
                Alles
              </button>
              {bubble.length ? (
                <button type="button" className="chip chip--sm chip--bubble" aria-pressed={filters.onderwerp === 'bubbel'} onClick={() => setFilter('onderwerp', filters.onderwerp === 'bubbel' ? '' : 'bubbel')}>
                  Buiten je bubbel
                </button>
              ) : null}
              {orderedTopics(pinned).map((t) => (
                <button key={t.id} type="button" className="chip chip--sm" aria-pressed={filters.onderwerp === t.id} onClick={() => setFilter('onderwerp', filters.onderwerp === t.id ? '' : t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            <button type="button" className={`iconbtn topics__filter${sheetCount ? ' is-on' : ''}`} onClick={() => setSheet(true)} aria-haspopup="dialog" aria-label={`Filters${sheetCount ? `, ${sheetCount} actief` : ''}`} title="Filters: soort en bron">
              <FilterIcon />
              {sheetCount ? <span className="topics__dot" aria-hidden="true" /> : null}
            </button>
          </div>
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
            {activeCount && statusProps.online && !statusProps.refreshError ? (
              <p className="status" role="status">
                {filterText} · {list.length} {list.length === 1 ? 'bericht' : 'berichten'}
                {statusProps.meta?.updatedAt ? ` · bijgewerkt ${clock(statusProps.meta.updatedAt)}` : ''}{' '}
                <button type="button" className="linkbtn linkbtn--inline" onClick={clear}>
                  Wis
                </button>
              </p>
            ) : (
              <StatusLine {...statusProps} />
            )}
            {list.length === 0 ? (
              <Empty
                title="Geen berichten voor dit filter"
                action={
                  <button type="button" className="btn" onClick={clear}>
                    Wis filters
                  </button>
                }
              >
                {stream.length === 0 ? 'Al je bronnen staan uit. Zet er een aan bij Bronnen.' : 'Er is op dit moment niets dat hieraan voldoet. De berichten zelf zijn wel geladen.'}
              </Empty>
            ) : (
              <div className={`list${preview === 'alles' ? '' : ` list--lines-${preview}`}`}>
                {list.map((item) => (
                  <Entry key={item.id} item={item} story={item.storyId ? storiesById.get(item.storyId) : null} />
                ))}
                <p className="listend">Dit is alles wat je bronnen nu aanbieden.</p>
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

      <FilterSheet open={sheet} onClose={() => setSheet(false)} params={filters} setFilter={setFilter} clear={clear} sources={followed} count={list.length} />
    </section>
  )
}
