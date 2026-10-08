import { OwlMark } from '../components/icons.jsx'
import { SourceRow } from './Sources.jsx'

// Eerste bezoek: in één scherm de belofte en de keuze welke bronnen meedoen.
export default function Welcome({ sources, muted, onToggle, onDone }) {
  const own = sources.filter((s) => s.followed)
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="col welcome__col">
        <OwlMark size={48} />
        <h1 id="welcome-title" className="welcome__title">
          Begrijp wat er speelt. Lees verder waar jij dat wilt.
        </h1>
        <p className="welcome__text">
          Twee keer per dag een <strong>Editie</strong> van tien verhalen, met een einde. Daarnaast de <strong>Stroom</strong>: alles van je bronnen op volgorde van tijd. Lezen doe je bij de bron zelf.
        </p>
        <h2 className="sect">Welke bronnen doen mee?</h2>
        {own.length ? (
          <ul className="srows">
            {own.map((s) => (
              <SourceRow key={s.id} s={s} muted={muted.has(s.id)} onToggle={onToggle} />
            ))}
          </ul>
        ) : (
          <p className="hint">De bronnen worden geladen…</p>
        )}
        <p className="hint">Je kunt dit later altijd aanpassen onder Bronnen.</p>
        <button type="button" className="btn btn--wide" onClick={onDone}>
          Naar de Editie
        </button>
      </div>
    </div>
  )
}
