import { clock } from '../lib/time.js'
import { BrandLogo } from './Brand.jsx'
import { useHoot } from './Items.jsx'
import { ButterflyIcon, EditionIcon, StreamIcon, BookmarkIcon, SourcesIcon, SearchIcon, RefreshIcon, PanelIcon, TimelineIcon, PaperIcon, TypographyIcon, BackIcon } from './icons.jsx'

export const DESTINATIONS = [
  { id: 'editie', label: 'Editie', Icon: EditionIcon },
  { id: 'stroom', label: 'Stroom', Icon: StreamIcon },
  { id: 'bluesky', label: 'Bluesky', Icon: ButterflyIcon },
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
// Indeling van berichten: schakelaar met twee standen, direct bij de hand in Editie en Stroom.
export function LayoutSwitch() {
  const { layout, setLayout } = useHoot()
  return (
    <div className="seg" role="group" aria-label="Indeling van berichten">
      <button type="button" className="seg__btn" aria-pressed={layout === 'tijdlijn'} onClick={() => setLayout('tijdlijn')} aria-label="Tijdlijn" title="Tijdlijn: bron bovenaan, beeld groot in het midden">
        <TimelineIcon />
        <span className="seg__label">Tijdlijn</span>
      </button>
      <button type="button" className="seg__btn" aria-pressed={layout === 'krant'} onClick={() => setLayout('krant')} aria-label="Krant" title="Krant: kop links, klein beeld rechts">
        <PaperIcon />
        <span className="seg__label">Krant</span>
      </button>
    </div>
  )
}

// `compare`: toon op breed scherm de knop die het vergelijkpaneel opent en sluit.
// `layout`: toon de schakelaar Tijdlijn/Krant in de rij (Editie en Stroom).
// `subWide`: de ondertitel alleen op breed scherm (op telefoon kost hij een regel die niets nieuws zegt).
// `display`: de Aa-knop die het Weergave-paneel opent. `onBack`: terugknop vóór de titel (losse pagina's).
export function ViewHeader({ title, sub, subWide = false, onRefresh, refreshing, showSearch = true, compare = false, display = false, onBack, children }) {
  const hoot = useHoot()
  const panel = hoot?.panel
  return (
    <header className="vh">
      <div className="vh__row">
        {onBack ? (
          <button type="button" className="iconbtn" onClick={onBack} aria-label="Terug">
            <BackIcon />
          </button>
        ) : null}
        <div className="vh__titles">
          <h1 className="vh__title">{title}</h1>
          {sub ? <p className={`vh__sub${subWide ? ' vh__sub--wide' : ''}`}>{sub}</p> : null}
        </div>
        {display ? (
          <button type="button" className="iconbtn" onClick={hoot?.openDisplay} aria-haspopup="dialog" aria-label="Weergave" title="Weergave: thema, indeling, tekst, beeld">
            <TypographyIcon />
          </button>
        ) : null}
        {compare && panel?.available ? (
          <button type="button" className="textbtn" onClick={panel.toggle} aria-pressed={panel.open}>
            <PanelIcon />
            {panel.open ? 'Verberg bronnen' : 'Vergelijk bronnen'}
          </button>
        ) : null}
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
  // Stil scherm (Editie): het draaiende ververs-icoon zegt genoeg; een regel die komt en gaat
  // zou de inhoud laten verspringen.
  if (refreshing) return quiet ? <p className="visually-hidden" role="status">Verversen…</p> : <p className="status" role="status">Verversen…</p>
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
