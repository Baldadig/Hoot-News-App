import { useState } from 'react'
import { ViewHeader } from '../components/Shell.jsx'
import { SourceMark } from '../components/Items.jsx'
import { Disclosure } from '../components/Disclosure.jsx'
import { resolveProfile } from '../lib/bluesky.js'
import { statusLabel } from '../lib/sourceStatus.js'
import { clock, timeAgo } from '../lib/time.js'
import { SOURCE_CATS } from '../lib/topics.js'
import { StarIcon } from '../components/icons.jsx'

export function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch__track">
        <span className="switch__thumb" />
      </span>
    </button>
  )
}

export function SourceRow({ s, muted, onToggle, onRemove, favorite = false, onFavorite = null }) {
  const Main = muted ? 'div' : 'a'
  const status = !s.ok ? 'Tijdelijk niet bereikbaar' : s.count ? `${s.count} berichten` : 'Geen berichten'
  return (
    <li className="srow">
      {/* Alleen een link naar de Stroom als de bron aanstaat; een uitgezette bron levert daar niets op. */}
      <Main className="srow__main" {...(muted ? {} : { href: `#/stroom?bron=${encodeURIComponent(s.id)}`, 'aria-label': `Alles van ${s.name} in de Stroom` })}>
        <SourceMark source={s} size={40} />
        <span className="srow__text">
          <span className="srow__name">{s.name}</span>
          <span className={`srow__meta${s.ok || muted ? '' : ' is-down'}`}>
            {s.handle && s.ok ? `${s.handle} · ` : ''}
            {status}
          </span>
        </span>
      </Main>
      {onRemove ? (
        <button type="button" className="linkbtn srow__rm" onClick={() => onRemove(s)}>
          Verwijder
        </button>
      ) : null}
      {onFavorite && !muted ? (
        <button type="button" className={`iconbtn srow__star${favorite ? ' is-on' : ''}`} aria-pressed={favorite} aria-label={`${s.name} als voorkeursbron`} title={favorite ? 'Voorkeursbron' : 'Maak voorkeursbron'} onClick={() => onFavorite(s.id, !favorite)}>
          <StarIcon filled={favorite} />
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
    <Disclosure
      className="srcstatus"
      summary={
        <>
          <span className={`srcstatus__dot${n ? ' is-down' : ''}`} aria-hidden="true" />
          <span>
            <strong>Bronstatus</strong> · {summary}
          </span>
        </>
      }
    >
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
    </Disclosure>
  )
}

export function AddBluesky({ onAdd }) {
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

export default function Sources({ active, sources, muted, onToggle, meta, status, recovered, latestBySource, onRetry, refreshing, online, bluesky = false, favorites = [], onFavorite = null }) {
  const catalog = sources.filter((s) => s.followed && s.kind !== 'sociaal')
  const mine = catalog.filter((s) => !muted.has(s.id))
  const more = catalog.filter((s) => muted.has(s.id))
  return (
    <section className="view" hidden={!active} aria-label="Bronnen">
      <div className="col">
        <ViewHeader title="Bronnen" sub="Wat meedoet in je Editie en Stroom" subWide />

        <h2 className="label label--section sect">Je bronnen · {mine.length}</h2>
        <ul className="srows">
          {mine.map((s) => (
            <SourceRow key={s.id} s={s} muted={false} onToggle={onToggle} favorite={favorites.includes(s.id)} onFavorite={onFavorite} />
          ))}
        </ul>
        <p className="hint">Tik op een bron om alleen die te lezen. Met de ster maak je een bron een voorkeursbron: die weegt zwaarder in je Editie en staat vooraan in de Stroom. Zet je een bron uit, dan verdwijnt hij uit je Stroom en zoeken.</p>
        <SourceStatus status={status} recovered={recovered} latestBySource={latestBySource} meta={meta} onRetry={onRetry} refreshing={refreshing} online={online} />

        <h2 className="label label--section sect">Meer bronnen</h2>
        <p className="hint">Gecontroleerde bronnen die je nu niet volgt. Zet er een aan om hem toe te voegen.</p>
        {SOURCE_CATS.map(([cat, label]) => {
          const list = more.filter((s) => s.cat === cat)
          return list.length ? (
            <Disclosure
              key={cat}
              className="srcgroup"
              summary={
                <>
                  {label}
                  <span className="srcgroup__n">{list.length}</span>
                </>
              }
            >
              <ul className="srows">
                {list.map((s) => (
                  <SourceRow key={s.id} s={s} muted onToggle={onToggle} />
                ))}
              </ul>
            </Disclosure>
          ) : null
        })}

        {bluesky ? (
          <>
            <h2 className="label label--section sect">Bluesky</h2>
            <a className="setrow setrow--link" href="#/bluesky">
              <span className="setrow__text">
                <span className="setrow__label">Mensen op Bluesky</span>
                <span className="setrow__hint">Wie je volgt, toevoegen en of iemand ook in de Stroom staat, regel je in Bluesky.</span>
              </span>
              <span aria-hidden="true">›</span>
            </a>
          </>
        ) : null}

        <h2 className="label label--section sect">Onderwerpen en instellingen</h2>
        <a className="setrow setrow--link" href="#/welkom">
          <span className="setrow__text">
            <span className="setrow__label">Interesses opnieuw kiezen</span>
            <span className="setrow__hint">Wat je volgt, van breed naar smal, en je bronnen.</span>
          </span>
          <span aria-hidden="true">›</span>
        </a>
        <a className="setrow setrow--link" href="#/instellingen">
          <span className="setrow__text">
            <span className="setrow__label">Alle instellingen</span>
            <span className="setrow__hint">Account, weergave, editie, buiten je bubbel.</span>
          </span>
          <span aria-hidden="true">›</span>
        </a>

        <p className="about">Hoot v{__APP_VERSION__}</p>
      </div>
    </section>
  )
}
