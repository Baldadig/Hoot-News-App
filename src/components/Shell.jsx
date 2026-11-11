import { WaitingMark } from './WaitingMark.jsx'
import { useEmptyDraw } from '../hooks/useEmptyDraw.js'
import { useOnline } from '../hooks/useOnline.js'
import { reduced } from '../lib/motion.js'
import { TOP_EVENT } from '../hooks/useScrollMemory.js'
import { timeAgo } from '../lib/time.js'
import { BrandLogo } from './Brand.jsx'
import { useHoot } from './Items.jsx'
import { BooksIcon, EditionIcon, StreamIcon, BookmarkIcon, SourcesIcon, SearchIcon, RefreshIcon, PanelIcon, BackIcon, AccountLineIcon, EditionArt } from './icons.jsx'

export const DESTINATIONS = [
  { id: 'editie', label: 'Editie', Icon: EditionIcon },
  { id: 'stroom', label: 'Stroom', Icon: StreamIcon },
  { id: 'digest', label: 'Selectie', Icon: BooksIcon },
  { id: 'bewaard', label: 'Bewaard', Icon: BookmarkIcon },
  { id: 'bronnen', label: 'Bronnen', Icon: SourcesIcon },
]

// Vaste hoofdnavigatie: onderin op telefoon, links op desktop. Selectie altijd, zoals in de app (zonder onderwerpen met een lege staat die naar Kies onderwerpen leidt).
// Telefoon, zoals de app: Editie, Stroom, Selectie, Bewaard, Zoeken. Bronnen staat dan als knop in de kop van
// de Stroom (.nav__bronnen is er verborgen); in de zijbalk staat het als bestemming. Instellingen staat niet in de
// zijbalk (1.2.1): je account rechtsboven is de enige ingang, zoals in de app.
// `hrefs` brengt je terug naar waar je in die bestemming was (met je filters);
// `sourceNote` is de korte tekst bij het stille statuspuntje op Bronnen.
// Nog eens tikken op de tab waar je al bent scrolt dat scherm naar boven (zoals de tabbalk van iOS).
function toTopOnRetap(e, active) {
  if (!active || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const view = document.querySelector('.main .view:not([hidden])')
  if (!view) return
  e.preventDefault()
  view.dispatchEvent(new Event(TOP_EVENT))
  view.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' })
}

export function Nav({ path, hrefs = {}, sourceNote = '' }) {
  return (
    <nav className="nav" aria-label="Hoofdnavigatie">
      <a className="nav__brand" href={hrefs.editie || '#/editie'} aria-label="Hoot — naar de Editie">
        <BrandLogo height={28} />
      </a>
      <ul className="nav__list">
        {DESTINATIONS.map(({ id, label, Icon }) => (
          <li key={id} className={id === 'bronnen' ? 'nav__bronnen' : undefined}>
            <a className="nav__link" href={hrefs[id] || `#/${id}`} aria-current={path === id ? 'page' : undefined} onClick={(e) => toTopOnRetap(e, path === id)}>
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
          <a className="nav__link" href="#/zoek" aria-current={path === 'zoek' ? 'page' : undefined} onClick={(e) => toTopOnRetap(e, path === 'zoek')}>
            <span className="nav__icon">
              <SearchIcon />
            </span>
            <span>Zoeken</span>
          </a>
        </li>
      </ul>
    </nav>
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
//   [terug] titel ··· [gereedschap] [verversen] [zoeken, onder 960] [bronnen, Stroom onder 960] [account]
// Account staat er altijd (behalve op Instellingen zelf: daar staat hetzelfde op de pagina).
// Het eerste en het laatste icoon staan optisch op de kolomlijn (--tap-inset).
// `compare`: toon op breed scherm de knop die het vergelijkpaneel opent en sluit.
// `subWide`: de ondertitel alleen op breed scherm (op telefoon kost hij een regel die niets nieuws zegt).
// `account`: je account rechtsboven, de ingang naar Instellingen (foto, voorletter of silhouet van person.crop.circle).
// `sources`: de knop Bronnen vóór je account (de Stroom, alleen onder 960). `onBack` + `backLabel`: terug, vóór de titel
// in dezelfde rij; `backInNav`: dit scherm staat ook in de zijbalk, dus daar geen terugknop.
// `tools`: eigen knoppen van het scherm, vóór verversen (de Stroom: de filterknop).
// `refreshDesktop`: de verversknop alleen op breed scherm (de Editie: op de telefoon trek je, zoals in de app).
// `updatedAt`: hoe vers het is, in de knop Verversen ("bijgewerkt 20 min geleden", nooit een kloktijd) in plaats van een regel.
// Onder de rij staat hooguit één metaregel (.vh__sub), over de volle breedte, zodat hij nooit tussen
// titel en knoppen wordt samengeperst. Daarna volgt de inhoud op --after-header.
export function ViewHeader({ title, sub, subWide = false, onRefresh, refreshing, updatedAt, showSearch = true, compare = false, account = true, sources = false, tools = null, refreshDesktop = false, onBack, backLabel = 'Terug', backInNav = false, children }) {
  const hoot = useHoot()
  const panel = hoot?.panel
  const at = timeAgo(updatedAt)
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
          <button type="button" className={`iconbtn${refreshDesktop ? ' desk-only' : ''}`} onClick={onRefresh} disabled={refreshing} aria-label={at ? `Verversen, bijgewerkt ${at}` : 'Verversen'} title={at ? `Verversen · bijgewerkt ${at}` : undefined}>
            {refreshing ? <WaitingMark size={8} text={false} /> : <RefreshIcon />}
          </button>
        ) : null}
        {showSearch ? (
          <a className="iconbtn vh__search" href="#/zoek" aria-label="Zoeken">
            <SearchIcon />
          </a>
        ) : null}
        {sources ? (
          // Telefoon (onder 960): Bronnen links van je account, zoals in de Stroom van de app. Breed staat het in de zijbalk.
          <a className="iconbtn vh__bronnen" href="#/bronnen" aria-label="Bronnen" title="Bronnen">
            <SourcesIcon />
          </a>
        ) : null}
        {account ? <AccountButton account={hoot?.account} onClick={hoot?.openDisplay} /> : null}
      </div>
      {sub ? <p className={`vh__sub${subWide ? ' vh__sub--wide' : ''}`}>{sub}</p> : null}
      {children}
    </header>
  )
}

// Rechtsboven op elk scherm: jij (je foto of voorletter als je bent ingelogd, anders het silhouet van person.crop.circle), en
// daarachter je account en de instellingen. Zoals de accountknop in de app (AccountKnop): het label is gewoon
// "Instellingen", daar zoek je op.
function AccountButton({ account, onClick }) {
  const user = account?.status === 'in' ? account.user : null
  const photo = user?.user_metadata?.avatar_url
  const initial = (user?.user_metadata?.full_name || user?.email || '?').trim().charAt(0).toUpperCase()
  return (
    <button type="button" className={`iconbtn acct${user ? ' is-in' : ''}`} onClick={onClick} aria-haspopup="dialog" aria-label="Instellingen" title="Instellingen">
      {user ? photo ? <img src={photo} alt="" width="32" height="32" referrerPolicy="no-referrer" /> : <span aria-hidden="true">{initial}</span> : <AccountLineIcon />}
    </button>
  )
}

// Het wifi-teken met streep: geen verbinding. Zelfde lijn als de iconen (Phosphor-maat, 256).
function WifiSlashIcon({ size = 20 }) {
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M92 157a56 56 0 0 1 72 0M61 120a104 104 0 0 1 134 0M30 84a152 152 0 0 1 196 0" />
      <path d="M48 48l160 176" />
      <circle cx="128" cy="200" r="8" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Eén regel die eerlijk zegt hoe vers dit is — en waarom niet, als dat zo is.
// Onderscheidt: verversen lukt niet (offline of mislukt) · álle bronnen onbereikbaar · gewoon bijgewerkt.
// Offline en mislukt zeggen hetzelfde als de app (StaleNotice): je ziet de laatste versie, met Opnieuw,
// in een haarlijn op papier en zonder kloktijd.
// Eén of enkele uitgevallen bronnen horen hier niet: die staan stil onder Bronnen → Bronstatus.
export function StatusLine({ online, refreshing, refreshError, meta, allDown = false, onRetry, quiet = false }) {
  const at = timeAgo(meta?.updatedAt)
  if (!online || refreshError)
    return (
      <p className="status status--stale" role="status">
        <WifiSlashIcon />
        <span className="status__text">Verversen lukt nu niet. Je ziet de laatste versie.</span>
        <button type="button" className="linkbtn linkbtn--plain status__retry" onClick={onRetry}>
          Opnieuw
        </button>
      </p>
    )
  // Stil scherm (Editie): het draaiende ververs-icoon zegt genoeg; een regel die komt en gaat
  // zou de inhoud laten verspringen.
  if (refreshing) return quiet ? <p className="visually-hidden" role="status">Even kijken bij je bronnen</p> : <p className="status" role="status">Even kijken bij je bronnen</p>
  if (allDown)
    return (
      <p className="status status--warn" role="status">
        Je bronnen zijn nu niet bereikbaar.{' '}
        <button type="button" className="linkbtn" onClick={onRetry}>
          Opnieuw
        </button>
      </p>
    )
  return at && !quiet ? <p className="status">Bijgewerkt {at}</p> : null
}

// Laden: een skelet in de vorm van wat er komt, zodat de inhoud bij het landen niet verspringt.
// `layout` volgt standaard de indeling van de lijst (useHoot().layout): Tijdlijn is kop, twee
// regels, een beeldstrook 2:1 en de bronregel; Krant is kop en tekst met het kleine beeld rechts.
// `lead`: eerst het hoofdverhaal (beeld, rubriek, kop, kern), zoals de Editie opent. De Editie en
// de Selectie zijn altijd krant en geven dat zelf mee.
export function Skeleton({ rows = 5, layout, lead = false }) {
  const hoot = useHoot()
  const form = layout ?? hoot?.layout
  const list = Array.from({ length: rows }).map((_, i) =>
    form === 'tijdlijn' ? (
      <div className="sk sk--tl" key={i}>
        <div className="sk__bar sk__bar--title" />
        <div className="sk__bar" />
        <div className="sk__bar sk__bar--short" />
        <div className="sk__media" />
        <div className="sk__src">
          <div className="sk__mark" />
          <div className="sk__who">
            <div className="sk__bar sk__bar--name" />
            <div className="sk__bar sk__bar--time" />
          </div>
        </div>
      </div>
    ) : (
      <div className="sk" key={i}>
        <div className="sk__text">
          <div className="sk__bar sk__bar--title" />
          <div className="sk__bar" />
          <div className="sk__bar sk__bar--short" />
        </div>
        <div className="sk__thumb" />
      </div>
    )
  )
  if (!lead) return <div aria-hidden="true">{list}</div>
  // Met het hoofdverhaal: in het raster van de voorpagina (.front), dus breed links het verhaal en
  // de rijen in de zijkolom, smal alles onder elkaar; zo staat alles al waar het gaat landen.
  return (
    <div className="front" aria-hidden="true">
      <div className="sk sk--lead">
        <div className="sk__media sk__media--lead" />
        <div className="sk__bar sk__bar--kicker" />
        <div className="sk__bar sk__bar--head" />
        <div className="sk__bar sk__bar--head sk__bar--short" />
        <div className="sk__bar" />
        <div className="sk__bar sk__bar--short" />
      </div>
      <div className="front__side">{list}</div>
    </div>
  )
}

// Lege staat: wat er (nog) niet is en wat je kunt doen. tone="error" als iets niet lukte: het
// label erboven staat dan in --warn, zodat een fout niet leest als 'nog niets'. Met `art` (een
// lijntekening uit icons.jsx: SavedArt, SearchArt, BlueskyArt) wordt het een lege bladzijde: alles
// gecentreerd, iets boven het midden, met een schermtitel (head-5) in plaats van een itemkop.
// Zonder art, en altijd bij een fout, blijft hij links op de kolomlijn.
export function Empty({ title, children, action, tone = 'neutral', label, art: Art = null }) {
  const page = Art && tone !== 'error'
  const drawRef = useEmptyDraw(!!page)
  return (
    <div ref={drawRef} className={`empty${tone === 'error' ? ' empty--error' : ''}${page ? ' empty--page' : ''}`}>
      {page ? <Art /> : null}
      {label ? <p className="label label--meta empty__label">{label}</p> : null}
      <h2 className={`${page ? 'head-5' : 'head-lg'} empty__title`}>{title}</h2>
      {children ? <p className="empty__text">{children}</p> : null}
      {action}
    </div>
  )
}

// Geen verbinding: het wifi-teken met streep, in de lijn van de andere lege bladzijden (96, raster van de beeldtaal).
function OfflineArt() {
  return (
    <svg className="empty__art empty__art--offline" viewBox="0 0 96 96" width="96" height="96" fill="none" aria-hidden="true">
      <path className="empty__line" d="M14 40a48 48 0 0 1 68 0M26 52a32 32 0 0 1 44 0M38 64a16 16 0 0 1 20 0" />
      <path className="empty__thin" d="M18 18l60 60" />
      <circle className="empty__lint" cx="48" cy="76" r="4" />
    </svg>
  )
}

// Wat de Editie, de Stroom en de Selectie zeggen als er niets op het toestel staat (zoals de app).
const OFFLINE_TEXT = {
  editie: 'Hoot heeft nog geen Editie op dit toestel. Zodra je verbinding hebt, verschijnt hij hier.',
  stroom: 'Zodra je verbinding hebt, verschijnen hier de berichten van je bronnen.',
  selectie: 'Zodra je verbinding hebt, verschijnt de Selectie hier.',
}

// Laden mislukte en er is niets om te tonen. Twee verschillende dingen, zegt de browser:
// offline (geen verbinding; zodra die er is, komt het vanzelf) en online maar de server geeft niets
// (dan ligt het niet aan jou). Gecentreerd met tekening, titel, uitleg en één knop, zoals de app.
export function LoadError({ onRetry, what = null }) {
  const online = useOnline()
  return online ? (
    <Empty art={EditionArt} title="Hoot is even niet bereikbaar" action={<button type="button" className="btn" onClick={onRetry}>Probeer opnieuw</button>}>
      Het ligt niet aan je verbinding. Probeer het zo nog eens.
    </Empty>
  ) : (
    <Empty art={OfflineArt} title="Geen verbinding" action={<button type="button" className="btn" onClick={onRetry}>Probeer opnieuw</button>}>
      {OFFLINE_TEXT[what] || 'Zodra je verbinding hebt, staat alles hier.'}
    </Empty>
  )
}
