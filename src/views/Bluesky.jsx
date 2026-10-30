import { useMemo, useRef, useState } from 'react'
import { ViewHeader, Empty } from '../components/Shell.jsx'
import { SocialItem, SourceMark, useHoot } from '../components/Items.jsx'
import { AddBluesky, Switch } from './Sources.jsx'
import { useScrollMemory } from '../hooks/useScrollMemory.js'
import { positionKey } from '../lib/context.js'
import { resolveProfile } from '../lib/bluesky.js'

// Accounts die goed bij Hoot passen; met één tik te volgen.
const SUGGESTED = [
  { handle: '3voor12.bsky.social', name: '3voor12' },
  { handle: 'atzedevrieze.bsky.social', name: 'Atze de Vrieze' },
]

const GROUPS = { oekraine: 'Oekraïne' }

// Bluesky: een eigen stroom met de mensen die je volgt. Bovenaan een groep (bv. Oekraïne) en
// wie je volgt (tik = alleen die); per persoon kies je of die ook in de gewone Stroom staat.
export default function Bluesky({ active, posts, sources, muted, onToggle, ownHandles, onAdd, onRemove, params, go, onRefresh, refreshing }) {
  const { prefs, setPref } = useHoot()
  const ref = useRef(null)
  const [adding, setAdding] = useState(false)
  const who = params.wie || ''
  const group = GROUPS[params.groep] ? params.groep : ''
  const people = sources.filter((s) => !muted.has(s.id))
  const groups = Object.keys(GROUPS).filter((g) => people.some((s) => s.group === g))
  const list = useMemo(() => {
    if (who) return posts.filter((p) => p.source === who)
    if (!group) return posts
    const ids = new Set(sources.filter((s) => s.group === group).map((s) => s.id))
    return posts.filter((p) => ids.has(p.source))
  }, [posts, who, group, sources])
  const person = who ? sources.find((s) => s.id === who) : null
  // Binnen een groep alleen de mensen uit die groep als chip.
  const chips = group ? people.filter((s) => s.group === group) : people
  // Weer aan te zetten: accounts die Hoot kent maar die nu uit staan (ook de optionele).
  const dormant = sources.filter((s) => muted.has(s.id))
  const followed = new Set(sources.map((s) => s.id))
  const suggestions = SUGGESTED.filter((s) => !followed.has('bsky:' + s.handle))

  useScrollMemory(ref, positionKey('bluesky', { bron: who || group }), list.length > 0, list.length + ':' + (list[0]?.id || ''), active)

  const inStream = (id) => (prefs.bskyInStream || []).includes(id)
  const setInStream = (id, on) => setPref('bskyInStream', on ? [...new Set([...(prefs.bskyInStream || []), id])] : (prefs.bskyInStream || []).filter((x) => x !== id))
  const follow = async (handle) => {
    try {
      onAdd(await resolveProfile(handle))
    } catch {
      /* niet gevonden: laat staan */
    }
  }

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Bluesky">
      <div className="col">
        <ViewHeader title="Bluesky" sub="De mensen die je volgt, nieuwste eerst" subWide onRefresh={onRefresh} refreshing={refreshing}>
          <div className="topics">
            <div className="topics__scroll" role="group" aria-label="Wie">
              <button type="button" className="chip chip--sm" aria-pressed={!who && !group} onClick={() => go('bluesky', {})}>
                Iedereen
              </button>
              {groups.map((g) => (
                <button key={g} type="button" className="chip chip--sm" aria-pressed={group === g && !who} onClick={() => go('bluesky', group === g && !who ? {} : { groep: g })}>
                  {GROUPS[g]}
                </button>
              ))}
              {chips.map((s) => (
                <button key={s.id} type="button" className="chip chip--sm chip--person" aria-pressed={who === s.id} onClick={() => go('bluesky', who === s.id ? (group ? { groep: group } : {}) : { wie: s.id, ...(group ? { groep: group } : {}) })}>
                  <SourceMark source={s} size={22} />
                  {s.name}
                </button>
              ))}
            </div>
            <button type="button" className={`iconbtn topics__filter${adding ? ' is-on' : ''}`} onClick={() => setAdding((a) => !a)} aria-expanded={adding} aria-label="Iemand volgen" title="Iemand volgen">
              <span aria-hidden="true" className="plus">
                +
              </span>
            </button>
          </div>
        </ViewHeader>

        {adding ? (
          <div className="bsky-add">
            <AddBluesky onAdd={(p) => (onAdd(p), setAdding(false))} />
            {dormant.length || suggestions.length ? (
              <div className="chips bsky-suggest">
                <span className="hint">Voorgesteld:</span>
                {dormant.map((s) => (
                  <button key={s.id} type="button" className="chip chip--sm" onClick={() => onToggle(s.id, true)}>
                    + {s.name}
                  </button>
                ))}
                {suggestions.map((s) => (
                  <button key={s.handle} type="button" className="chip chip--sm" onClick={() => follow(s.handle)}>
                    + {s.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {person ? (
          <div className="bsky-person">
            <div className="setrow">
              <span className="setrow__text">
                <span className="setrow__label">{person.name} ook in de Stroom</span>
                <span className="setrow__hint">Standaard staan posts alleen hier.</span>
              </span>
              <Switch checked={inStream(person.id)} onChange={(on) => setInStream(person.id, on)} label={`${person.name} ook in de Stroom`} />
            </div>
            <div className="setrow">
              <span className="setrow__text">
                <span className="setrow__label">{person.handle}</span>
              </span>
              <button type="button" className="linkbtn" onClick={() => (ownHandles.has(person.id) ? onRemove(person.id.replace(/^bsky:/, '')) : onToggle(person.id, false), go('bluesky', group ? { groep: group } : {}))}>
                Ontvolgen
              </button>
            </div>
          </div>
        ) : null}

        {list.length === 0 ? (
          <Empty title={people.length ? 'Nog geen posts' : 'Je volgt nog niemand'}>{people.length ? 'Zodra de mensen die je volgt iets plaatsen, staat het hier.' : 'Tik op + om iemand op Bluesky te volgen.'}</Empty>
        ) : (
          <div className="list">
            {list.map((item) => (
              <SocialItem key={item.id} item={item} />
            ))}
            <p className="listend">Dit is alles van de afgelopen 48 uur.</p>
          </div>
        )}
      </div>
    </section>
  )
}
