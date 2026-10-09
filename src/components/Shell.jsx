import { clock } from '../lib/time.js'
import { BrandLogo } from './Brand.jsx'
import { EditionIcon, StreamIcon, BookmarkIcon, SourcesIcon, SearchIcon, RefreshIcon } from './icons.jsx'

export const DESTINATIONS = [
  { id: 'editie', label: 'Editie', Icon: EditionIcon },
  { id: 'stroom', label: 'Stroom', Icon: StreamIcon },
  { id: 'bewaard', label: 'Bewaard', Icon: BookmarkIcon },
  { id: 'bronnen', label: 'Bronnen', Icon: SourcesIcon },
]

// Vaste hoofdnavigatie: onderin op telefoon, links op desktop. Altijd dezelfde vier.
// `hrefs` brengt je terug naar waar je in die bestemming was (met je filters);
// `sourceNote` is de korte tekst bij het stille statuspuntje op Bronnen.
export function Nav({ path, hrefs = {}, sourceNote = '' }) {
  return (
    <nav className="nav" aria-label="Hoofdnavigatie">
      <a className="nav__brand" href={hrefs.editie || '#/editie'} aria-label="Hoot — naar de Editie">
        <BrandLogo height={38} />
      </a>
      <ul className="nav__list">
        {DESTINATIONS.map(({ id, label, Icon }) => (
          <li key={id}>
            <a className="nav__link" href={hrefs[id] || `#/${id}`} aria-current={path === id ? 'page' : undefined}>
              <span className="nav__icon">
                <Icon />
                {id === 'bronnen' && sourceNote ? <span className="nav__dot" aria-hidden="true" /> : null}
              </span>
              <span>{label}</span>
              {id === 'bronnen' && sourceNote ? <span className="visually-hidden">: {sourceNote}</span> : null}
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
// Onderscheidt: offline · verversen mislukt · álle bronnen onbereikbaar · gewoon bijgewerkt.
// Eén of enkele uitgevallen bronnen horen hier niet: die staan stil onder Bronnen → Bronstatus.
export function StatusLine({ online, refreshing, refreshError, meta, allDown = false, onRetry, quiet = false }) {
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
  if (allDown)
    return (
      <p className="status status--warn" role="status">
        Je bronnen zijn nu niet bereikbaar. Je ziet wat eerder is opgehaald.{' '}
        <button type="button" className="linkbtn" onClick={onRetry}>
          Opnieuw proberen
        </button>
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
