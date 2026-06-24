import { useEffect } from 'react'
import { CloseIcon, VerifiedCheck } from './icons.jsx'

const THEMES = [
  { id: 'system', label: 'Systeem', emoji: '🖥️' },
  { id: 'light', label: 'Licht', emoji: '☀️' },
  { id: 'dark', label: 'Donker', emoji: '🌙' },
]

function SourceRow({ s, active, onPick }) {
  const letter = (s.name || '?').trim().charAt(0) || '?'
  return (
    <button
      type="button"
      className={`srcrow${active ? ' srcrow--on' : ''}`}
      onClick={() => onPick(s)}
      aria-label={`Toon alleen ${s.name}`}
      style={{ '--brand': s.brand || 'var(--accent)' }}
    >
      <span className={`avatar${s.contain ? ' avatar--logo' : ''}`} data-letter={letter}>
        {s.avatar ? <img src={s.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} /> : null}
      </span>
      <span className="srcrow__id">
        <span className="srcrow__name">
          {s.name}
          {s.verified ? <VerifiedCheck /> : null}
        </span>
        <span className="srcrow__meta">{s.handle}</span>
      </span>
      <span className="srcrow__chev" aria-hidden="true">›</span>
    </button>
  )
}

export default function Drawer({ open, onClose, theme, setTheme, sources = [], activeSource = null, onPickSource }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div className={`drawer-overlay${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`drawer${open ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Instellingen" aria-hidden={!open}>
        <div className="drawer__head">
          <span className="drawer__title">Instellingen</span>
          <button className="iconbtn" onClick={onClose} aria-label="Sluiten">
            <CloseIcon />
          </button>
        </div>

        {sources.length > 0 ? (
          <div className="drawer__section">
            <div className="drawer__label">Mijn bronnen</div>
            <div className="srclist">
              {sources.map((s) => (
                <SourceRow key={s.source} s={s} active={activeSource === s.source} onPick={onPickSource} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="drawer__section">
          <div className="drawer__label">Weergave</div>
          <div className="segmented" role="group" aria-label="Thema">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`seg${theme === t.id ? ' seg--on' : ''}`}
                onClick={() => setTheme(t.id)}
                aria-pressed={theme === t.id}
              >
                <span className="seg__emoji">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}
