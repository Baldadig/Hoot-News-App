import { useEffect } from 'react'
import { CloseIcon } from './icons.jsx'

const THEMES = [
  { id: 'system', label: 'Systeem', emoji: '🖥️' },
  { id: 'light', label: 'Licht', emoji: '☀️' },
  { id: 'dark', label: 'Donker', emoji: '🌙' },
]

export default function Drawer({ open, onClose, theme, setTheme }) {
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

        <p className="drawer__hint">Meer instellingen volgen hier.</p>
      </aside>
    </>
  )
}
