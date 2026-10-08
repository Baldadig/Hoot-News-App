import { useRef } from 'react'
import { ViewHeader, StatusLine, Skeleton, LoadError, Empty } from '../components/Shell.jsx'
import { LeadStory, CompactItem, useHoot } from '../components/Items.jsx'
import { OwlMark } from '../components/icons.jsx'
import { longDate, clock } from '../lib/time.js'
import { useScrollMemory } from '../hooks/useScrollMemory.js'

const SLOT = { ochtend: 'Ochtendeditie', avond: 'Avondeditie' }

export default function Edition({ active, edition, loading, failedLoad, statusProps, onRefresh, refreshing }) {
  const { itemsById, storiesById, muted } = useHoot()
  const ref = useRef(null)

  // Elke regel van de editie: een verhaal (bundel) of een los bericht.
  const rows = (edition?.entries || [])
    .map((e) => {
      if (e.kind === 'story') {
        const story = storiesById.get(e.id)
        const item = story && (itemsById.get(story.leadId) || story.itemIds.map((id) => itemsById.get(id)).find(Boolean))
        return item ? { key: e.id, item, story } : null
      }
      const item = itemsById.get(e.id)
      return item && !muted.has(item.source) ? { key: e.id, item, story: null } : null
    })
    .filter(Boolean)

  useScrollMemory(ref, 'hoot:pos-editie:' + (edition?.id || ''), rows.length > 0, rows.length)

  const title = edition ? SLOT[edition.slot] : 'Editie'
  const sub = edition ? longDate(edition.date) : null

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Editie">
      <div className="col">
        <ViewHeader title={title} sub={sub} onRefresh={onRefresh} refreshing={refreshing} />
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
            <details className="how">
              <summary>
                {rows.length} verhalen · samengesteld om {clock(edition.builtAt)}. Hoe is dit gekozen?
              </summary>
              <p>
                Eerst de verhalen waar de meeste bronnen over schrijven, met voorrang voor je eigen bronnen; daarna de meest recente. Aangevuld met losse berichten, om en om per bron. Er telt geen klikgedrag mee. Een editie verandert na het samenstellen niet meer van selectie of volgorde — wel kan een lopend verhaal er publicaties bij krijgen.
              </p>
            </details>
            <div className="list">
              {rows.map(({ key, item, story }, i) =>
                i === 0 ? <LeadStory key={key} item={item} story={story} note={`1 van ${rows.length}`} /> : <CompactItem key={key} item={item} story={story} note={`${i + 1} van ${rows.length}`} />
              )}
            </div>
            <div className="endcap">
              <OwlMark size={40} />
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
