import { clock } from '../lib/time.js'
import { OwlMark, EditionIcon, StreamIcon, BookmarkIcon, SourcesIcon, SearchIcon, RefreshIcon } from './icons.jsx'

export const DESTINATIONS = [
  { id: 'editie', label: 'Editie', Icon: EditionIcon },
  { id: 'stroom', label: 'Stroom', Icon: StreamIcon },
  { id: 'bewaard', label: 'Bewaard', Icon: BookmarkIcon },
  { id: 'bronnen', label: 'Bronnen', Icon: SourcesIcon },
]

// Vaste hoofdnavigatie: onderin op telefoon, links op desktop. Altijd dezelfde vier.
export function Nav({ path }) {
  return (
    <nav className="nav" aria-label="Hoofdnavigatie">
      <a className="nav__brand" href="#/editie" aria-label="Hoot — naar de Editie">
        <OwlMark size={30} />
        <span>Hoot</span>
      </a>
      <ul className="nav__list">
        {DESTINATIONS.map(({ id, label, Icon }) => (
          <li key={id}>
            <a className="nav__link" href={`#/${id}`} aria-current={path === id ? 'page' : undefined}>
              <Icon />
              <span>{label}</span>
            </a>
          </li>
        ))}
        <li className="nav__search">
          <a className="nav__link" href="#/zoek" aria-current={path === 'zoek' ? 'page' : undefined}>
            <SearchIcon />
            <span>Zoeken</span>
          </a>
        </li>
      </ul>
    </nav>
  )
}

// Kop van elk scherm: titel links, zoeken en verversen rechts (zoeken altijd op dezelfde plek).
export function ViewHeader({ title, sub, onRefresh, refreshing, showSearch = true, children }) {
  return (
    <header className="vh">
      <div className="vh__row">
        <div className="vh__titles">
          <h1 className="vh__title">{title}</h1>
          {sub ? <p className="vh__sub">{sub}</p> : null}
        </div>
        {onRefresh ? (
          <button type="button" className={`iconbtn${refreshing ? ' is-spinning' : ''}`} onClick={onRefresh} disabled={refreshing} aria-label="Verversen">
            <RefreshIcon />
          </button>
        ) : null}
        {showSearch ? (
          <a className="iconbtn vh__search" href="#/zoek" aria-label="Zoeken">
            <SearchIcon />
          </a>
        ) : null}
      </div>
      {children}
    </header>
  )
}

// Eén regel die eerlijk zegt hoe vers dit is — en waarom niet, als dat zo is.
// Onderscheidt: offline · verversen mislukt · één bron uitgevallen · gewoon bijgewerkt.
export function StatusLine({ online, refreshing, refreshError, meta, failed = [], onRetry, quiet = false }) {
  const at = clock(meta?.updatedAt)
  if (!online) return <p className="status status--warn" role="status">Je bent offline. Je ziet wat om {at || 'eerder'} is opgehaald.</p>
  if (refreshError)
    return (
      <p className="status status--warn" role="status">
        Verversen lukte niet. Je ziet de versie van {at || 'eerder'}.{' '}
        <button type="button" className="linkbtn" onClick={onRetry}>
          Probeer opnieuw
        </button>
      </p>
    )
  if (refreshing) return <p className="status" role="status">Verversen…</p>
  if (failed.length)
    return (
      <p className="status status--warn" role="status">
        {failed.join(' en ')} {failed.length === 1 ? 'is' : 'zijn'} nu niet bereikbaar. De rest is bijgewerkt om {at}.
      </p>
    )
  return at && !quiet ? <p className="status">Bijgewerkt om {at}</p> : null
}

export function Skeleton({ rows = 5 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="sk" key={i}>
          <div className="sk__text">
            <div className="sk__bar sk__bar--title" />
            <div className="sk__bar" />
            <div className="sk__bar sk__bar--short" />
          </div>
          <div className="sk__thumb" />
        </div>
      ))}
    </div>
  )
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h2 className="empty__title">{title}</h2>
      <p className="empty__text">{children}</p>
      {action}
    </div>
  )
}

export function LoadError({ onRetry }) {
  return (
    <Empty
      title="De berichten zijn nu niet op te halen"
      action={
        <button type="button" className="btn" onClick={onRetry}>
          Opnieuw proberen
        </button>
      }
    >
      Controleer je verbinding. Zodra het weer lukt, staat alles hier.
    </Empty>
  )
}
