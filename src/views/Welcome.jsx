import { useState } from 'react'
import { BrandLogo } from '../components/Brand.jsx'
import { SourceRow } from './Sources.jsx'

// Eerste bezoek: de belofte en meteen kunnen beginnen. Je start met alle bronnen;
// aanpassen kan hier (uitklappen) of later onder Bronnen. De bronnenlijst zit dicht,
// zodat het scherm niet verspringt als de bronnen binnenkomen.
export default function Welcome({ sources, muted, onToggle, onDone }) {
  const own = sources.filter((s) => s.followed)
  const [open, setOpen] = useState(false) // de lijst (met logo's) pas opbouwen als je hem opent
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="col welcome__col">
        <BrandLogo height={52} />
        <h1 id="welcome-title" className="welcome__title">
          Begrijp wat er speelt. Lees verder waar jij dat wilt.
        </h1>
        <p className="welcome__text">
          Twee keer per dag een <strong>Editie</strong> van tien verhalen, met een einde. Daarnaast de <strong>Stroom</strong>: alles van je bronnen op volgorde van tijd. Lezen doe je bij de bron zelf.
        </p>
        <button type="button" className="btn btn--wide" onClick={onDone}>
          Naar de Editie
        </button>
        <details className="welcome__more" onToggle={(e) => setOpen(e.currentTarget.open)}>
          <summary>Pas je bronnen aan</summary>
          {!open ? null : own.length ? (
            <ul className="srows">
              {own.map((s) => (
                <SourceRow key={s.id} s={s} muted={muted.has(s.id)} onToggle={onToggle} />
              ))}
            </ul>
          ) : (
            <p className="hint">De bronnen worden geladen…</p>
          )}
        </details>
        <p className="hint">Je begint met al je bronnen. Aanpassen kan altijd onder Bronnen.</p>
      </div>
    </div>
  )
}
