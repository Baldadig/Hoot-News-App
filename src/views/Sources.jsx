import { useState } from 'react'
import { ViewHeader } from '../components/Shell.jsx'
import { SourceMark } from '../components/Items.jsx'
import { TOPICS } from '../lib/topics.js'
import { resolveProfile } from '../lib/bluesky.js'
import { statusLabel } from '../lib/sourceStatus.js'
import { clock, timeAgo } from '../lib/time.js'

const THEMES = [
  { id: 'system', label: 'Systeem' },
  { id: 'light', label: 'Licht' },
  { id: 'dark', label: 'Donker' },
]

export function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch__track">
        <span className="switch__thumb" />
      </span>
    </button>
  )
}

export function SourceRow({ s, muted, onToggle, onRemove }) {
  const status = !s.ok ? 'Tijdelijk niet bereikbaar' : s.count ? `${s.count} berichten` : 'Geen berichten'
  return (
    <li className="srow">
      <a className="srow__main" href={`#/stroom?bron=${encodeURIComponent(s.id)}`} aria-label={`Alles van ${s.name} in de Stroom`}>
        <SourceMark source={s} size={40} />
        <span className="srow__text">
          <span className="srow__name">{s.name}</span>
          <span className={`srow__meta${s.ok || muted ? '' : ' is-down'}`}>
            {s.handle && s.ok ? `${s.handle} · ` : ''}
            {status}
          </span>
        </span>
      </a>
      {onRemove ? (
        <button type="button" className="linkbtn srow__rm" onClick={() => onRemove(s)}>
          Verwijder
        </button>
      ) : null}
      {onToggle ? <Switch checked={!muted} onChange={(on) => onToggle(s.id, on)} label={`${s.name} ${muted ? 'aanzetten' : 'uitzetten'}`} /> : null}
    </li>
  )
}

// Bronstatus: klein en stil. Dicht zolang je er niet om vraagt; één regel per bron die nu
// niet bereikbaar is. Herstelt de bron of zet je hem uit, dan verdwijnt de regel vanzelf.
function SourceStatus({ status, recovered, latestBySource, meta, onRetry, refreshing, online }) {
  const n = status.failed.length
  const at = clock(meta?.updatedAt)
  const summary = !online ? 'je bent offline' : n ? statusLabel(n) : recovered ? 'alle bronnen zijn weer bereikbaar' : 'alle bronnen bereikbaar'
  return (
    <details className="srcstatus">
      <summary>
        <span className={`srcstatus__dot${n ? ' is-down' : ''}`} aria-hidden="true" />
        <span>
          <strong>Bronstatus</strong> · {summary}
        </span>
      </summary>
      <div className="srcstatus__body" role="status">
        {n === 0 ? (
          <p>{recovered ? 'Alle bronnen zijn weer bereikbaar.' : 'Alle bronnen zijn bereikbaar.'}</p>
        ) : (
          <ul>
            {status.failed.map((f) => (
              <li key={f.id}>
                <strong>{f.name}</strong> — tijdelijk niet bereikbaar. {status.allDown ? '' : 'De rest van je nieuws is bijgewerkt. '}
                {latestBySource[f.id] ? `Het laatste bericht dat je van deze bron ziet is van ${timeAgo(latestBySource[f.id])}.` : 'Er staan nu geen berichten van deze bron.'}
              </li>
            ))}
          </ul>
        )}
        <p className="srcstatus__foot">
          {at ? `Laatst gecontroleerd om ${at}. ` : ''}
          {n || !online ? 'Hoot probeert het bij elke verversing opnieuw. ' : ''}
          <button type="button" className="linkbtn" onClick={onRetry} disabled={refreshing}>
            {refreshing ? 'Bezig…' : 'Opnieuw proberen'}
          </button>
        </p>
      </div>
    </details>
  )
}

function AddBluesky({ onAdd }) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text }
  const submit = async (e) => {
    e.preventDefault()
    if (!input.trim() || busy) return
    setBusy(true)
    setMsg(null)
    try {
      const profile = await resolveProfile(input)
      onAdd(profile)
      setInput('')
      setMsg({ ok: true, text: `${profile.name} is toegevoegd.` })
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Dit account is niet gevonden.' })
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="add" onSubmit={submit}>
      <label className="add__label" htmlFor="add-bsky">
        Bluesky-account toevoegen
      </label>
      <div className="add__row">
        <input id="add-bsky" className="input" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck="false" placeholder="naam.bsky.social of link" value={input} onChange={(e) => setInput(e.target.value)} aria-describedby="add-help" />
        <button type="submit" className="btn" disabled={busy || !input.trim()}>
          {busy ? 'Zoeken…' : 'Voeg toe'}
        </button>
      </div>
      {msg ? (
        <p className={`add__msg${msg.ok ? '' : ' is-warn'}`} role="status">
          {msg.text}
        </p>
      ) : null}
      <p className="hint" id="add-help">
        Naam en profielfoto komen van Bluesky. Threads, Instagram en X bieden geen openbare feed en kunnen daarom niet worden toegevoegd.
      </p>
    </form>
  )
}

export default function Sources({ active, sources, muted, onToggle, socialHandles, onAddSocial, onRemoveSocial, pinned, onPinned, theme, setTheme, layout, onLayout, meta, status, recovered, latestBySource, onRetry, refreshing, online }) {
  const own = sources.filter((s) => s.followed)
  const extra = sources.filter((s) => !s.followed)
  const togglePin = (id) => onPinned(pinned.includes(id) ? pinned.filter((p) => p !== id) : pinned.length >= 3 ? pinned : [...pinned, id])
  return (
    <section className="view" hidden={!active} aria-label="Bronnen">
      <div className="col">
        <ViewHeader title="Bronnen" sub="Wat meedoet in je Editie en Stroom" />

        <h2 className="sect">Je bronnen</h2>
        <ul className="srows">
          {own.map((s) => (
            <SourceRow key={s.id} s={s} muted={muted.has(s.id)} onToggle={onToggle} onRemove={socialHandles.has(s.id) ? () => onRemoveSocial(s.id.replace(/^bsky:/, '')) : null} />
          ))}
        </ul>
        <p className="hint">Tik op een bron om alleen die te lezen. Een bron die uit staat verdwijnt uit Editie, Stroom en zoeken.</p>
        <SourceStatus status={status} recovered={recovered} latestBySource={latestBySource} meta={meta} onRetry={onRetry} refreshing={refreshing} online={online} />

        <AddBluesky onAdd={onAddSocial} />

        <h2 className="sect">Alleen ter vergelijking</h2>
        <p className="hint">Deze bronnen volg je niet. Ze verschijnen niet in je Editie of Stroom, alleen binnen een verhaal, zodat je kunt zien wie er nog meer over schrijft. Zoeken doet dat ook alleen in je eigen bronnen, tenzij je daar zelf “Alle bronnen” kiest.</p>
        <ul className="srows srows--plain">
          {extra.map((s) => (
            <li className="srow srow--plain" key={s.id}>
              <SourceMark source={s} size={28} />
              <span className="srow__name">{s.name}</span>
              {!s.ok ? <span className="srow__meta">tijdelijk niet bereikbaar</span> : null}
            </li>
          ))}
        </ul>

        <h2 className="sect">Onderwerpen bovenaan de Stroom</h2>
        <p className="hint">Kies er maximaal drie. De rest vind je altijd onder Filters.</p>
        <div className="chips">
          {TOPICS.map((t) => (
            <button key={t.id} type="button" className="chip" aria-pressed={pinned.includes(t.id)} disabled={!pinned.includes(t.id) && pinned.length >= 3} onClick={() => togglePin(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <h2 className="sect">Indeling van berichten</h2>
        <div className="chips" role="group" aria-label="Indeling van berichten">
          <button type="button" className="chip" aria-pressed={layout === 'tijdlijn'} onClick={() => onLayout('tijdlijn')}>
            Tijdlijn
          </button>
          <button type="button" className="chip" aria-pressed={layout === 'krant'} onClick={() => onLayout('krant')}>
            Krant
          </button>
        </div>
        <p className="hint">Tijdlijn zet de bron bovenaan en het beeld groot in het midden, zoals een sociale tijdlijn. Krant zet de kop links en een klein beeld rechts.</p>

        <h2 className="sect">Weergave</h2>
        <div className="chips" role="group" aria-label="Thema">
          {THEMES.map((t) => (
            <button key={t.id} type="button" className="chip" aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <p className="about">
          Hoot v{__APP_VERSION__} · <a href="#/stijl">Designsysteem</a> · <a href="#/welkom">Welkomscherm</a>
          <br />
          {meta?.storage === 'blobs' ? 'Edities en verhalen worden vast bewaard.' : 'Edities en verhalen worden op dit moment niet vast bewaard en kunnen tussentijds wisselen.'} Samenvattingen komen rechtstreeks van de bron; er wordt niets automatisch geschreven.
        </p>
      </div>
    </section>
  )
}
