import { TOPICS } from '../lib/topics.js'

export default function TopicFilter({ active, onChange, counts }) {
  return (
    <nav className="filter" aria-label="Filter op onderwerp">
      <button className={`chip${active === null ? ' chip--on' : ''}`} onClick={() => onChange(null)}>
        Alles
      </button>
      {TOPICS.map((t) => (
        <button
          key={t.id}
          className={`chip${active === t.id ? ' chip--on' : ''}`}
          onClick={() => onChange(active === t.id ? null : t.id)}
        >
          <span className="chip__emoji">{t.emoji}</span>
          {t.label}
          {counts && counts[t.id] ? <span className="chip__count">{counts[t.id]}</span> : null}
        </button>
      ))}
    </nav>
  )
}
