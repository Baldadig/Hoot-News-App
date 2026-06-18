export function Skeleton() {
  return (
    <div className="list">
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="card card--skel" key={i}>
          <div className="sk__head">
            <div className="sk sk--avatar" />
            <div className="sk sk--name" />
          </div>
          <div className="sk sk--line" />
          <div className="sk sk--line sk--short" />
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

export function EmptyState() {
  return (
    <div className="state">
      <div className="state__emoji">🦉</div>
      <p className="state__title">Niks onder dit onderwerp</p>
      <p className="state__text">Kies een ander onderwerp of trek omlaag om te vernieuwen.</p>
    </div>
  )
}

export function Footer({ meta }) {
  if (!meta) return null
  const list = meta.sources || []
  const ok = list.filter((s) => s.ok).length
  const time = meta.updatedAt
    ? new Date(meta.updatedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
    : ''
  return (
    <footer className="foot">
      {ok}/{list.length} bronnen · {meta.aiEnabled ? 'AI aan' : 'AI uit'} · bijgewerkt {time}
    </footer>
  )
}
