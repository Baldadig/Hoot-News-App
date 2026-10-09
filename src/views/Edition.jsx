import { useRef } from 'react'
import { ViewHeader, StatusLine, Skeleton, LoadError, Empty, LayoutSwitch } from '../components/Shell.jsx'
import { LeadStory, CompactItem, useHoot } from '../components/Items.jsx'
import { BrandMark } from '../components/Brand.jsx'
import { longDate, clock } from '../lib/time.js'
import { useScrollMemory } from '../hooks/useScrollMemory.js'

const FRONT = 4 // zoveel verhalen staan op de voorpagina
const SLOT = { ochtend: 'Ochtendeditie', avond: 'Avondeditie' }

export default function Edition({ active, edition, loading, failedLoad, statusProps, onRefresh, refreshing }) {
  const { itemsById, storiesById, muted } = useHoot()
  const ref = useRef(null)

  // Elke regel van de editie: een verhaal (bundel) of een los bericht.
  const rows = (edition?.entries || [])
    .map((e) => {
      if (e.kind === 'story') {
        // Het hoofdbericht is bij het samenstellen gekozen (eigen bron, afwisseling); staat die
        // bron uit of is het bericht weg, dan het eerstvolgende uit het verhaal.
        const story = storiesById.get(e.id)
        const item = story && [e.leadId, story.leadId, ...story.itemIds].map((id) => itemsById.get(id)).find((i) => i && !muted.has(i.source))
        return item ? { key: e.id, item, story } : null
      }
      const item = itemsById.get(e.id)
      return item && !muted.has(item.source) ? { key: e.id, item, story: null } : null
    })
    .filter(Boolean)

  useScrollMemory(ref, 'hoot:pos-editie:' + (edition?.id || ''), rows.length > 0, rows.length, active)

  const title = edition ? SLOT[edition.slot] : 'Editie'
  const sub = edition ? longDate(edition.date) : null

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Editie">
      <div className="col col--front">
        <ViewHeader title={title} sub={sub} onRefresh={onRefresh} refreshing={refreshing} compare />
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
            <div className="edbar">
              <details className="how">
                <summary>
                  <span>
                    {rows.length} verhalen · {clock(edition.builtAt)}
                  </span>
                  <span className="how__link">Hoe is dit gekozen?</span>
                </summary>
                <p>
                  De eerste vier staan op de voorpagina, de rest eronder. Eerst de verhalen waar de meeste bronnen over schrijven, met voorrang voor je eigen bronnen; daarna de meest recente. Aangevuld met losse berichten, om en om per bron. Elke gebeurtenis staat er één keer in, ook als Nederlandse en Engelse bronnen er allebei over schrijven. Per verhaal zie je het bericht van een van je eigen bronnen, zo afwisselend mogelijk. Er telt geen klikgedrag mee. Een editie verandert na het samenstellen niet meer van selectie of volgorde — wel kan een lopend verhaal er publicaties bij krijgen.
                </p>
              </details>
              <LayoutSwitch />
            </div>
            {/* Voorpagina: het hoofdverhaal groot, daarnaast drie kleinere — altijd in krant-vorm.
                Op smal scherm (of met het vergelijkpaneel open) staan ze onder elkaar. */}
            <div className="front">
              <LeadStory item={rows[0].item} story={rows[0].story} priority={active} />
              {rows.length > 1 ? (
                <div className="front__side">
                  {rows.slice(1, FRONT).map(({ key, item, story }) => (
                    <CompactItem key={key} item={item} story={story} plain />
                  ))}
                </div>
              ) : null}
            </div>
            {rows.length > FRONT ? (
              <div className="front__rest">
                <h2 className="front__more">Verder in deze editie</h2>
                <div className="list">
                  {rows.slice(FRONT).map(({ key, item, story }, i) => (
                    <CompactItem key={key} item={item} story={story} note={`${i + FRONT + 1} van ${rows.length}`} />
                  ))}
                </div>
              </div>
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
