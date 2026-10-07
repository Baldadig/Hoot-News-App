export function Skeleton() {
  return (
    <div className="list">
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="card card--skel" key={i}>
          <div className="sk__head">
            <div className="sk sk--avatar" />
            <div className="sk sk--name" />
          </div>
          <div className="sk sk--title" />
          <div className="sk sk--title sk--short" />
          <div className="sk sk--line" />
          <div className="sk sk--media" />
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ onRetry }) {
  return (
    <div className="state">
      <div className="state__emoji">🌧️</div>
      <p className="state__title">Even geen verbinding</p>
      <p className="state__text">De feeds zijn nu niet te bereiken.</p>
      <button className="btn" onClick={onRetry}>
        Opnieuw proberen
      </button>
    </div>
  )
}

export function EmptyState({ filtered, saved, onReset }) {
  if (saved) {
    return (
      <div className="state">
        <div className="state__emoji">🔖</div>
        <p className="state__title">Nog niets bewaard</p>
        <p className="state__text">Tik op het bladwijzertje bij een bericht om het hier te bewaren.</p>
        <button className="btn" onClick={onReset}>
          Terug naar alles
        </button>
      </div>
    )
  }
  if (filtered) {
    return (
      <div className="state">
        <div className="state__emoji">🔍</div>
        <p className="state__title">Niks gevonden</p>
        <p className="state__text">Er zijn geen berichten voor dit filter.</p>
        <button className="btn" onClick={onReset}>
          Toon alles
        </button>
      </div>
    )
  }
  return (
    <div className="state">
      <div className="state__emoji">🦉</div>
      <p className="state__title">Nog niks hier</p>
      <p className="state__text">Trek omlaag om te vernieuwen.</p>
    </div>
  )
}

// Einde van de feed. Meldt alleen iets als een bron écht niet bereikbaar was.
export function Footer({ meta }) {
  if (!meta) return null
  const failed = (meta.sources || []).filter((s) => !s.ok).map((s) => s.name)
  return (
    <footer className="foot">
      {failed.length ? `⚠️ Nu niet bereikbaar: ${failed.join(', ')}` : 'Je bent helemaal bij 🦉'}
    </footer>
  )
}
