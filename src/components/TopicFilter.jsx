import { TOPICS } from '../lib/topics.js'

export default function TopicFilter({ active, onChange, counts, trendingCount = 0 }) {
  return (
    <nav className="filter" aria-label="Filter op onderwerp">
      <button className={`chip${active === null ? ' chip--on' : ''}`} onClick={() => onChange(null)} aria-pressed={active === null}>
        Alles
      </button>

      {trendingCount > 0 ? (
        <button
          className={`chip chip--trending${active === 'trending' ? ' chip--on' : ''}`}
          onClick={() => onChange(active === 'trending' ? null : 'trending')}
          aria-pressed={active === 'trending'}
        >
          <span className="chip__emoji">🔥</span>
          Trending
          <span className="chip__count">{trendingCount}</span>
        </button>
      ) : null}

      {TOPICS.map((t) => (
        <button
          key={t.id}
          className={`chip${active === t.id ? ' chip--on' : ''}`}
          onClick={() => onChange(active === t.id ? null : t.id)}
          aria-pressed={active === t.id}
        >
          <span className="chip__emoji">{t.emoji}</span>
          {t.label}
          {counts && counts[t.id] ? <span className="chip__count">{counts[t.id]}</span> : null}
        </button>
      ))}
    </nav>
  )
}
