import { clock } from '../lib/time.js'
import { BrandLogo } from './Brand.jsx'
import { useHoot } from './Items.jsx'
import { BooksIcon, ButterflyIcon, EditionIcon, StreamIcon, BookmarkIcon, SourcesIcon, SearchIcon, RefreshIcon, PanelIcon, TimelineIcon, PaperIcon, BackIcon, AccountIcon, SettingsIcon } from './icons.jsx'

export const DESTINATIONS = [
  { id: 'editie', label: 'Editie', Icon: EditionIcon },
  { id: 'stroom', label: 'Stroom', Icon: StreamIcon },
  { id: 'digest', label: 'Selectie', Icon: BooksIcon },
  { id: 'bluesky', label: 'Bluesky', Icon: ButterflyIcon },
  { id: 'bewaard', label: 'Bewaard', Icon: BookmarkIcon },
  { id: 'bronnen', label: 'Bronnen', Icon: SourcesIcon },
]

// Vaste hoofdnavigatie: onderin op telefoon, links op desktop. Selectie en Bluesky alleen als je die aanzet.
// `hrefs` brengt je terug naar waar je in die bestemming was (met je filters);
// `sourceNote` is de korte tekst bij het stille statuspuntje op Bronnen.
export function Nav({ path, hrefs = {}, sourceNote = '', bluesky = false, digest = false }) {
  return (
    <nav className="nav" aria-label="Hoofdnavigatie">
      <a className="nav__brand" href={hrefs.editie || '#/editie'} aria-label="Hoot — naar de Editie">
        <BrandLogo height={28} />
      </a>
      <ul className="nav__list">
        {DESTINATIONS.filter((d) => (bluesky || d.id !== 'bluesky') && (digest || d.id !== 'digest')).map(({ id, label, Icon }) => (
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
      {/* Breed scherm: Instellingen onderaan de zijbalk. Op de telefoon blijft de tabbalk zoals hij
          is; daar kom je via Account en weergave bij Instellingen. */}
      <ul className="nav__foot">
        <li>
          <a className="nav__link" href="#/instellingen" aria-current={path === 'instellingen' ? 'page' : undefined}>
            <SettingsIcon />
            <span>Instellingen</span>
          </a>
        </li>
      </ul>
    </nav>
  )
}

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

// Terug: één knop voor elk scherm. De inkt van het pijltje staat op de kolomlijn (--tap-inset en
// --caret-inset), het label is optioneel ("Alle verhalen", "Terug"); zonder label zegt `aria-label`
// waarheen.
// `nav`: dit scherm staat ook in de zijbalk (Instellingen, Zoeken), dus vanaf 960 is de knop overbodig.
export function BackButton({ label, onClick, ariaLabel, nav = false, className = '' }) {
  return (
    <button type="button" className={`backbtn${nav ? ' backbtn--nav' : ''}${className ? ` ${className}` : ''}`} onClick={onClick} aria-label={ariaLabel} title={label ? undefined : ariaLabel}>
      <BackIcon />
      {label ? <span className="backbtn__label">{label}</span> : null}
    </button>
  )
}

// Kop van elk scherm, één rij van 44 met vaste plekken. Van links naar rechts:
//   [terug] titel ··· [gereedschap] [verversen] [zoeken, onder 960] [account]
// Account staat er altijd (behalve op Instellingen zelf: daar staat hetzelfde op de pagina).
// Het eerste en het laatste icoon staan optisch op de kolomlijn (--tap-inset).
// `compare`: toon op breed scherm de knop die het vergelijkpaneel opent en sluit.
// `subWide`: de ondertitel alleen op breed scherm (op telefoon kost hij een regel die niets nieuws zegt).
// `account`: de knop Account en weergave (rechtsboven). `onBack` + `backLabel`: terug, vóór de titel
// in dezelfde rij; `backInNav`: dit scherm staat ook in de zijbalk, dus daar geen terugknop.
// `tools`: eigen knoppen van het scherm, vóór verversen (de Stroom: de filterknop).
// `updatedAt`: hoe vers het is, in de knop Verversen ("bijgewerkt om 13:50") in plaats van een regel.
// Onder de rij staat hooguit één metaregel (.vh__sub), over de volle breedte, zodat hij nooit tussen
// titel en knoppen wordt samengeperst. Daarna volgt de inhoud op --after-header.
export function ViewHeader({ title, sub, subWide = false, onRefresh, refreshing, updatedAt, showSearch = true, compare = false, account = true, tools = null, onBack, backLabel = 'Terug', backInNav = false, children }) {
  const hoot = useHoot()
  const panel = hoot?.panel
  const at = clock(updatedAt)
  return (
    <header className="vh">
      <div className="vh__row">
        {onBack ? <BackButton onClick={onBack} ariaLabel={`Terug naar ${backLabel}`} nav={backInNav} /> : null}
        <div className="vh__titles">
          <h1 className="head-5 vh__title">{title}</h1>
        </div>
        {compare && panel?.available ? (
          // Klein, net als verversen en zoeken: "+N bronnen" bij elk verhaal is de gewone weg;
          // dit opent de lijst met alle verhalen ernaast.
          <button type="button" className="iconbtn" onClick={panel.toggle} aria-pressed={panel.open} aria-label={panel.open ? 'Verberg de verhalenlijst' : 'Alle verhalen ernaast'} title={panel.open ? 'Verberg de verhalenlijst' : 'Alle verhalen ernaast'}>
            <PanelIcon />
          </button>
        ) : null}
        {tools}
        {onRefresh ? (
          <button type="button" className={`iconbtn${refreshing ? ' is-spinning' : ''}`} onClick={onRefresh} disabled={refreshing} aria-label={at ? `Verversen, bijgewerkt om ${at}` : 'Verversen'} title={at ? `Verversen · bijgewerkt om ${at}` : undefined}>
            <RefreshIcon />
          </button>
        ) : null}
        {showSearch ? (
          <a className="iconbtn vh__search" href="#/zoek" aria-label="Zoeken">
            <SearchIcon />
          </a>
        ) : null}
        {account ? <AccountButton account={hoot?.account} onClick={hoot?.openDisplay} /> : null}
      </div>
      {sub ? <p className={`vh__sub${subWide ? ' vh__sub--wide' : ''}`}>{sub}</p> : null}
      {children}
    </header>
  )
}

// Rechtsboven op elk scherm: jouw account (met je foto of voorletter als je bent ingelogd) en
// daarachter de weergave.
function AccountButton({ account, onClick }) {
  const user = account?.status === 'in' ? account.user : null
  const photo = user?.user_metadata?.avatar_url
  const initial = (user?.user_metadata?.full_name || user?.email || '?').trim().charAt(0).toUpperCase()
  const label = user ? `Account en weergave (${user.email})` : 'Account en weergave'
  return (
    <button type="button" className={`iconbtn acct${user ? ' is-in' : ''}`} onClick={onClick} aria-haspopup="dialog" aria-label={label} title={label}>
      {user ? photo ? <img src={photo} alt="" width="30" height="30" referrerPolicy="no-referrer" /> : <span aria-hidden="true">{initial}</span> : <AccountIcon />}
    </button>
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
        Verversen lukt nu niet. Je ziet de versie van {at || 'eerder'}.{' '}
        <button type="button" className="linkbtn" onClick={onRetry}>
          Opnieuw
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
