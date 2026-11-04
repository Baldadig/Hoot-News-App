import { useEffect, useMemo, useRef, useState } from 'react'
import { ViewHeader, StatusLine, Skeleton, LoadError, Empty } from '../components/Shell.jsx'
import { Entry, useHoot } from '../components/Items.jsx'
import { PlaceholderList } from '../components/Beeld.jsx'
import { StreamLine } from '../components/StreamLine.jsx'
import { StreamArt, FilterIcon, ArrowUpIcon } from '../components/icons.jsx'
import { Dialog, DialogHeader } from '../components/Dialog.jsx'
import { inInterest } from '../lib/topics.js'
import { rubriekRij, alsRubriek, actieveRubriek, kiesRubriek, rijBronnen, inRijVolgorde, legeRegel } from '../lib/streamline.js'
import { useScrollMemory } from '../hooks/useScrollMemory.js'
import { positionKey } from '../lib/context.js'
import { readJSON } from '../lib/store.js'
import { watch } from '../lib/inview.js'
import { RubriekCrossfade } from '../components/RubriekCrossfade.jsx'
import { firstImages, latestChoice, warmImages } from '../lib/rubriek-crossfade.js'
import { imgProps } from '../lib/img.js'
import { withoutRepeats } from '../../shared/stroom.mjs'

const PAGE = 60 // zoveel berichten tegelijk; de rest komt erbij terwijl je scrolt

const KINDS = [
  { id: '', label: 'Alles' },
  { id: 'artikelen', label: 'Artikelen' },
  { id: 'opinie', label: 'Opinie' },
]

// Het filterblad: de soort (een Dialog: focus blijft binnen, Esc sluit). Rubriek en bron
// kies je op de lijn in de kop; "Wis alle filters" zet ook die terug, en zegt dat dus.
function FilterSheet({ open, onClose, params, clear, setFilter, count }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="sheet-title">
      <DialogHeader id="sheet-title" title="Filters" onClose={onClose} />

      <div className="chips">
        {KINDS.map((k) => (
          <button key={k.id} type="button" className="pill" aria-pressed={(params.soort || '') === k.id} onClick={() => setFilter('soort', k.id)}>
            {k.label}
          </button>
        ))}
      </div>
      <p className="sheet__note">Opinie: zoals de bron het noemt.</p>

      <div className="sheet__foot">
        <button type="button" className="btn btn--quiet" onClick={clear}>
          Wis filters
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Toon {count} {count === 1 ? 'bericht' : 'berichten'}
        </button>
      </div>
    </Dialog>
  )
}

export default function Stream({ active, stream, params, go, bubble = [], preview = 2, sources, loading, failedLoad, statusProps, onRefresh, refreshing, pendingCount, onShowNew }) {
  const { storiesById, sourcesById, muted, setMuted, prefs, layout } = useHoot()
  const ref = useRef(null)
  const [sheet, setSheet] = useState(false)
  const [atDepth, setAtDepth] = useState(false)
  const [freshShown, setFreshShown] = useState(0)

  // De rij kent alleen hoofdrubrieken: een oud onderwerp-filter wordt zijn rubriek (alsRubriek).
  const filters = alsRubriek({ bron: params.bron || '', onderwerp: params.onderwerp || '', rubriek: params.rubriek || '', soort: params.soort || '' })
  // `bron` is één id of een lijst met komma's (meer bronnen tegelijk); leeg = alle bronnen.
  const pickList = useMemo(() => filters.bron.split(',').filter(Boolean), [filters.bron])
  const picks = useMemo(() => new Set(pickList), [pickList])

  const choices = useRef(latestChoice())
  useEffect(() => () => choices.current.cancel(), [])
  const select = (selection) => {
    const picked = new Set(selection.bron.split(',').filter(Boolean))
    return selection.onderwerp === 'bubbel' ? bubble.map(b => b.item) : withoutRepeats(stream.filter(i => {
      if (picked.size && !picked.has(i.source)) return false
      if (selection.onderwerp && !(i.topics || []).includes(selection.onderwerp)) return false
      if (selection.rubriek && !inInterest(i, selection.rubriek, sourcesById.get(i.source))) return false
      if (selection.soort === 'opinie' && i.type !== 'opinie') return false
      if (selection.soort === 'artikelen' && (i.kind === 'post' || i.type === 'opinie')) return false
      return true
    }))
  }
  const list = useMemo(
    () => select(filters),
    [stream, bubble, picks, filters.onderwerp, filters.rubriek, filters.soort, sourcesById]
  )

  // Filters zijn stappen in de geschiedenis: de terugknop zet het vorige filter terug.
  // Elke filtercombinatie is een eigen lijst met een eigen leespositie. Kies je zelf een
  // filter, dan begin je bovenaan; kom je terug (terugknop, navigatie), dan sta je waar je was.
  const apply = (next) => {
    choices.current.cancel()
    try {
      localStorage.removeItem(positionKey('stroom', next))
    } catch {
      /* niet erg */
    }
    go('stroom', next)
  }
  const chooseCategory = async (r) => {
    if (r.sig === actieveRubriek(filters)) { choices.current.cancel(); return }
    const latest = choices.current.begin()
    const next = kiesRubriek(filters, r)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    await warmImages(firstImages(select(next), !reduced && prefs?.images === 'aan'), url => imgProps(url, prefs?.layout === 'krant' ? 'thumb' : 'lead'))
    if (latest()) { apply(next); return true }
    return false
  }
  const setFilter = (key, value) => apply({ ...filters, [key]: value })
  const clear = () => apply({})

  useScrollMemory(ref, positionKey('stroom', filters), list.length > 0, list.length + ':' + (list[0]?.id || ''), active)

  // Niet alles tegelijk tekenen: eerst één portie, de volgende zodra je het eind nadert. Kom je
  // terug op een plek verderop, dan tekenen we in één keer tot daar (de leespositie blijft kloppen).
  const posKey = positionKey('stroom', filters)
  // Ook browser-terug of vertrek maakt een voorladende oude keuze ongeldig.
  useEffect(() => { choices.current.cancel() }, [posKey, active])
  useEffect(() => setFreshShown(0), [posKey])
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
  // Een bron kiezen zet de rubriek terug op Alles: je kijkt dan naar die bron, niet naar een onderwerp.
  const togglePick = (id) => apply({ ...filters, onderwerp: '', rubriek: '', bron: inRijVolgorde(picks.has(id) ? pickList.filter((p) => p !== id) : [...pickList, id], rij).join(',') })
  // De rubrieken: Alles, je hoofdrubrieken in vaste volgorde, Buiten je bubbel als laatste.
  const interests = prefs?.interests || []
  const rubrieken = useMemo(
    () => rubriekRij({ interests, hasBubble: bubble.length > 0, filters: { onderwerp: filters.onderwerp, rubriek: filters.rubriek } }),
    [interests.join(','), bubble.length, filters.onderwerp, filters.rubriek], // eslint-disable-line react-hooks/exhaustive-deps
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
    <button type="button" className={`iconbtn filterbtn${filters.soort ? ' is-on' : ''}`} onClick={() => setSheet(true)} aria-haspopup="dialog" aria-label={`Filters${filters.soort ? `, nu ${kindName(filters.soort)}` : ''}`} title="Filters">
      <FilterIcon />
      {filters.soort ? <span className="filterbtn__dot" aria-hidden="true" /> : null}
    </button>
  )

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Stroom" onScroll={(e) => setAtDepth(e.currentTarget.scrollTop > 900)}>
      <div className="col col--read">
        <ViewHeader title="Stroom" onRefresh={onRefresh} refreshing={refreshing} updatedAt={statusProps.meta?.updatedAt} tools={filterButton} compare>
          {/* De lijn: rubrieken links, je bronnen als stapel rechts. Wat je kiest staat in de URL
              (zoals altijd: een stap in de geschiedenis, met een eigen leespositie). */}
          <StreamLine
            rubrieken={rubrieken}
            active={actief}
            onRubriek={chooseCategory}
            bronnen={rij}
            picks={picks}
            onToggle={togglePick}
            onAll={() => setFilter('bron', '')}
            sources={rij.length > 1 || picks.size > 0}
          />
        </ViewHeader>

        {pendingCount > 0 ? (
          <button type="button" className="btn btn--accent newpill" aria-label={`${pendingCount} ${pendingCount === 1 ? 'nieuw bericht' : 'nieuwe berichten'} tonen`} onClick={() => { setFreshShown(!picks.size && !filters.rubriek && !filters.onderwerp && !filters.soort ? pendingCount : 0); onShowNew(); ref.current?.scrollTo({ top: 0 }) }}>
            <ArrowUpIcon />
            {pendingCount} {pendingCount === 1 ? 'nieuw bericht' : 'nieuwe berichten'}
          </button>
        ) : null}

        <RubriekCrossfade category={actief}>
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
                  <button type="button" className="linkbtn linkbtn--plain listempty__btn" onClick={() => setFilter('bron', '')}>
                    Toon alle bronnen
                  </button>
                ) : filters.soort && !bubbel ? (
                  <button type="button" className="linkbtn linkbtn--plain listempty__btn" onClick={() => setFilter('soort', '')}>
                    Toon alle soorten
                  </button>
                ) : null}
              </div>
            ) : list.length === 0 ? (
              <Empty art={StreamArt}
                title={offSource ? `${srcName(offSource)} staat uit` : 'Al je bronnen staan uit'}
                action={
                  offSource ? (
                    <button type="button" className="btn" onClick={() => setMuted(offSource, true)}>
                      Zet {srcName(offSource)} aan
                    </button>
                  ) : (
                    <a className="btn" href="#/bronnen">
                      Naar Bronnen
                    </a>
                  )
                }
              >
              </Empty>
            ) : (
              <PlaceholderList rows={shown.map((item) => ({ item, kind: layout === 'tijdlijn' ? 'tijdlijn' : 'krant' }))}>
              <div className={`list rows${preview === 'alles' ? '' : ` list--lines-${preview}`}`}>
                {shown.map((item, index) => (
                  <div key={item.id} className={index < Math.min(freshShown, 6) ? 'stream-new' : undefined} style={index < 6 ? { '--rise-delay': `${index * 40}ms` } : undefined}>
                    {freshShown > 0 && index === freshShown ? <div className="seen" role="separator"><span>Hier was je gebleven</span></div> : null}
                    <Entry item={item} story={item.storyId ? storiesById.get(item.storyId) : null} />
                  </div>
                ))}
                {shown.length < list.length ? <div ref={more} className="listmore" aria-hidden="true" /> : <p className="listend">Je bent bij.</p>}
              </div>
              </PlaceholderList>
            )}
          </>
        )}
        </RubriekCrossfade>
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
