import { useHoot } from './Items.jsx'
import { ArrowOutIcon, HeadphonesIcon, ICON_SM } from './icons.jsx'
import { MAX_VERGELIJKEN, regelVan, labelVan } from '../../shared/luister-weergave.mjs'

// Luister verder in Vergelijken (stap 3, gelijk aan LuisterSectie in ios/Hoot/Luister.swift): een sectie "Luister" met
// hooguit drie afleveringen, de beste eerst. Per rij de cover van de show (url van de uitgever), de titel van de
// aflevering, "{show} · {dag} · {duur}" en de pijl naar buiten. Op het web alleen met de schakelaar (src/lib/luister.js).
export function LuisterSectie({ story }) {
  const { luisterVoor, luisterTik, podcastKeuze } = useHoot()
  const lijst = (luisterVoor?.(story) || []).slice(0, MAX_VERGELIJKEN)
  if (!lijst.length) return null
  return (
    <section className="luister" aria-labelledby={`luister-${story.id}`}>
      <h3 id={`luister-${story.id}`} className="label label--meta luister__label">
        Luister
      </h3>
      <ul className="luister__lijst">
        {lijst.map((a) => (
          <li key={a.showId || a.show}>
            <button type="button" className="luister__rij" onClick={() => luisterTik(a)} aria-label={`${labelVan(a, podcastKeuze)} ${a.aflevering}`}>
              <LuisterCover a={a} />
              <span className="luister__tekst">
                <span className="luister__titel">{a.aflevering}</span>
                <span className="luister__regel">{regelVan(a)}</span>
              </span>
              <span className="luister__uit" aria-hidden="true">
                <ArrowOutIcon size={ICON_SM} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function LuisterCover({ a }) {
  return a.cover ? (
    <img className="luister__cover" src={a.cover} alt="" width="44" height="44" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
  ) : (
    <span className="luister__cover luister__cover--leeg" aria-hidden="true">
      <HeadphonesIcon size={ICON_SM} />
    </span>
  )
}
