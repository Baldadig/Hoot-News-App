import { useEffect, useRef, useState } from 'react'
import { CloseIcon, VerifiedCheck, BackIcon, PlusIcon } from './icons.jsx'
import { resolveProfile } from '../lib/bluesky.js'

const THEMES = [
  { id: 'system', label: 'Systeem', emoji: '🖥️' },
  { id: 'light', label: 'Licht', emoji: '☀️' },
  { id: 'dark', label: 'Donker', emoji: '🌙' },
]

const DENSITIES = [
  { id: 'comfortable', label: 'Comfortabel', emoji: '🌤️' },
  { id: 'compact', label: 'Compact', emoji: '🧱' },
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

// Sub-scherm: sociale bronnen beheren
function SocialView({ socialSources, onAddSource, onRemoveSource }) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    const q = input.trim()
    if (!q || busy) return
    setBusy(true)
    setError('')
    try {
      const profile = await resolveProfile(q)
      onAddSource(profile)
      setInput('')
    } catch (err) {
      setError(err.message || 'Kon dit account niet vinden')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="drawer__section">
      <form className="addsrc" onSubmit={submit}>
        <label className="addsrc__label" htmlFor="addsrc-input">
          Voeg een Bluesky-account toe
        </label>
        <div className="addsrc__row">
          <input
            id="addsrc-input"
            className="addsrc__input"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            placeholder="handle of bsky.app-link"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              if (error) setError('')
            }}
          />
          <button type="submit" className="btn addsrc__btn" disabled={busy || !input.trim()}>
            {busy ? '…' : 'Toevoegen'}
          </button>
        </div>
        {error ? <p className="addsrc__error">⚠️ {error}</p> : null}
      </form>

      {socialSources.length > 0 ? (
        <div className="srclist">
          {socialSources.map((s) => {
            const letter = (s.name || '?').trim().charAt(0) || '?'
            return (
              <div key={s.handle} className="socialrow">
                <span className="avatar" data-letter={letter} style={{ '--brand': '#0085FF' }}>
                  {s.avatar ? <img src={s.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} /> : null}
                </span>
                <span className="srcrow__id">
                  <span className="srcrow__name">{s.name}</span>
                  <span className="srcrow__meta">@{s.handle}</span>
                </span>
                <button type="button" className="socialrow__rm" onClick={() => onRemoveSource(s.handle)} aria-label={`${s.name} verwijderen`}>
                  <CloseIcon />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="socialempty">Nog geen accounts toegevoegd. Plak hierboven een Bluesky-handle om te beginnen.</p>
      )}

      <p className="addsrc__hint">
        Plak een Bluesky-handle (bijv. <code>leftlaser.bsky.social</code>) of een <code>bsky.app</code>-link. Naam en avatar worden automatisch opgehaald.
        <br />
        Threads en Instagram hebben geen publieke feed — staat de maker ook op Bluesky, gebruik dan dat account.
      </p>
    </div>
  )
}

export default function Drawer({
  open,
  onClose,
  theme,
  setTheme,
  density,
  setDensity,
  sources = [],
  activeSource = null,
  onPickSource,
  socialSources = [],
  onAddSource,
  onRemoveSource,
}) {
  const [view, setView] = useState('main') // main | social
  const asideRef = useRef(null)
  const restoreRef = useRef(null)

  // Focus + inert: dicht = onbereikbaar voor toetsenbord/AT; open = focus naar binnen,
  // bij sluiten focus terug naar het element dat het menu opende.
  useEffect(() => {
    const el = asideRef.current
    if (el) el.inert = !open
    if (open) {
      restoreRef.current = document.activeElement
      setView('main')
      const id = requestAnimationFrame(() => el?.querySelector('.iconbtn')?.focus())
      return () => cancelAnimationFrame(id)
    }
    if (restoreRef.current && typeof restoreRef.current.focus === 'function') {
      restoreRef.current.focus()
      restoreRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const isSocial = view === 'social'

  return (
    <>
      <div className={`drawer-overlay${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside ref={asideRef} className={`drawer${open ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Instellingen">
        <div className="drawer__head">
          {isSocial ? (
            <button className="iconbtn" onClick={() => setView('main')} aria-label="Terug">
              <BackIcon />
            </button>
          ) : null}
          <span className="drawer__title">{isSocial ? 'Sociale bronnen' : 'Instellingen'}</span>
          <button className="iconbtn drawer__close" onClick={onClose} aria-label="Sluiten">
            <CloseIcon />
          </button>
        </div>

        {isSocial ? (
          <div className="drawer__page" key="social">
            <SocialView socialSources={socialSources} onAddSource={onAddSource} onRemoveSource={onRemoveSource} />
          </div>
        ) : (
          <div className="drawer__page" key="main">
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
              <button type="button" className="navrow" onClick={() => setView('social')}>
                <span className="navrow__icon" aria-hidden="true">
                  <PlusIcon />
                </span>
                <span className="navrow__id">
                  <span className="navrow__title">Sociale bronnen</span>
                  <span className="navrow__meta">
                    {socialSources.length ? `${socialSources.length} toegevoegd` : 'Voeg Bluesky-accounts toe'}
                  </span>
                </span>
                <span className="srcrow__chev" aria-hidden="true">›</span>
              </button>
            </div>

            <div className="drawer__section">
              <div className="drawer__label">Thema</div>
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

            <div className="drawer__section">
              <div className="drawer__label">Dichtheid</div>
              <div className="segmented" role="group" aria-label="Dichtheid">
                {DENSITIES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`seg${density === d.id ? ' seg--on' : ''}`}
                    onClick={() => setDensity(d.id)}
                    aria-pressed={density === d.id}
                  >
                    <span className="seg__emoji">{d.emoji}</span>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
