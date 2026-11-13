import { useState } from 'react'
import { ViewHeader } from '../components/Shell.jsx'
import { SourceMark, useHoot } from '../components/Items.jsx'
import { Disclosure } from '../components/Disclosure.jsx'
import { resolveProfile } from '../lib/bluesky.js'
import { statusLabel } from '../lib/sourceStatus.js'
import { timeAgo } from '../lib/time.js'
import { SOURCE_CATS } from '../lib/topics.js'
import { StarIcon, CaretIcon, ICON_SM } from '../components/icons.jsx'

// `className` en `disabled` zijn er voor het Designsysteem, dat de schakelaar in elke staat toont.
export function Switch({ checked, onChange, label, className = '', disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch${className ? ` ${className}` : ''}`} disabled={disabled} onClick={() => onChange(!checked)}>
      <span className="switch__track">
        <span className="switch__thumb" />
      </span>
    </button>
  )
}

export function SourceRow({ s, muted, onToggle, onRemove, favorite = false, onFavorite = null }) {
  const Main = muted ? 'div' : 'a'
  const status = !s.ok ? 'Niet bereikbaar' : s.count ? `${s.count} berichten` : 'Geen berichten'
  return (
    <li className="srow">
      {/* Alleen een link naar de Stroom als de bron aanstaat; een uitgezette bron levert daar niets op. */}
      <Main className="srow__main" {...(muted ? {} : { href: `#/stroom?bron=${encodeURIComponent(s.id)}`, 'aria-label': `Alles van ${s.name} in de Stroom` })}>
        <SourceMark source={s} size={40} />
        <span className="srow__text">
          <span className="srow__name">
            {s.name}
            {/* Zoals in de app: "Gratis" in accent, "Abonnement" stil. */}
            {s.paid ? <span className="srow__tag srow__tag--paid"> Abonnement</span> : <span className="srow__tag srow__tag--free"> Gratis</span>}
          </span>
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
  const at = timeAgo(meta?.updatedAt)
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
        {n === 0 ? null : (
          <ul>
            {status.failed.map((f) => (
              <li key={f.id}>
                <strong>{f.name}</strong>: niet bereikbaar. {latestBySource[f.id] ? `Laatste bericht van ${timeAgo(latestBySource[f.id])}.` : 'Geen berichten.'}
              </li>
            ))}
          </ul>
        )}
        <p className="srcstatus__foot">
          {at ? `Gecontroleerd ${at}. ` : ''}
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
        X, Threads en Instagram kunnen niet.
      </p>
    </form>
  )
}

export default function Sources({ active, sources, muted, onToggle, meta, status, recovered, latestBySource, onRetry, refreshing, online, ownHandles = new Set(), onSocialAdd, onSocialRemove, favorites = [], onFavorite = null }) {
  const catalog = sources.filter((s) => s.followed && s.kind !== 'sociaal')
  const mine = catalog.filter((s) => !muted.has(s.id))
  const more = catalog.filter((s) => muted.has(s.id))
  return (
    <section className="view" hidden={!active} aria-label="Bronnen">
      <div className="col col--form">
        <ViewHeader title="Bronnen" />

        <h2 className="label label--section sect">Je bronnen · {mine.length}</h2>
        <ul className="srows rows">
          {mine.map((s) => (
            <SourceRow key={s.id} s={s} muted={false} onToggle={onToggle} favorite={favorites.includes(s.id)} onFavorite={onFavorite} />
          ))}
        </ul>
        <p className="hint">Met de ster gaat een bron voor in je Editie en Stroom.</p>
        <p className="hint">Abonnement: hele artikelen alleen voor abonnees. Aanzetten kost niets.</p>
        <SourceStatus status={status} recovered={recovered} latestBySource={latestBySource} meta={meta} onRetry={onRetry} refreshing={refreshing} online={online} />

        <h2 className="label label--section sect">Meer bronnen</h2>
        <div className="rows">
          {SOURCE_CATS.map(([cat, label]) => {
            const list = more.filter((s) => s.cat === cat)
            return list.length ? (
              <Disclosure
                key={cat}
                className="srcgroup"
                summaryClassName="head-4"
                summary={
                  <>
                    {label}
                    <span className="srcgroup__n">{list.length}</span>
                  </>
                }
              >
                <ul className="srows rows">
                  {list.map((s) => (
                    <SourceRow key={s.id} s={s} muted onToggle={onToggle} />
                  ))}
                </ul>
              </Disclosure>
            ) : null
          })}
        </div>

        <SocialSources sources={sources.filter(s => s.kind === 'sociaal')} muted={muted} onToggle={onToggle} ownHandles={ownHandles} onAdd={onSocialAdd} onRemove={onSocialRemove} />

        <h2 className="label label--section sect">Instellingen</h2>
        <div className="rows">
          <a className="setrow setrow--link" href="#/welkom">
            <span className="setrow__text">
              <span className="setrow__label">Interesses</span>
            </span>
            <span className="caret" aria-hidden="true">
              <CaretIcon size={ICON_SM} />
            </span>
          </a>
          <a className="setrow setrow--link" href="#/instellingen">
            <span className="setrow__text">
              <span className="setrow__label">Alle instellingen</span>
            </span>
            <span className="caret" aria-hidden="true">
              <CaretIcon size={ICON_SM} />
            </span>
          </a>
        </div>

      </div>
    </section>
  )
}

// Beheer bij je bronnen; de posts zelf hebben alleen de Stroom als bestemming.
function SocialSources({ sources, muted, onToggle, ownHandles, onAdd, onRemove }) {
  const {prefs, setPref} = useHoot()
  const setInStream = (id, on) => {
    setPref('bskyInStream', on ? [...new Set([...(prefs.bskyInStream || []), id])] : (prefs.bskyInStream || []).filter(x => x !== id))
    if (on && muted.has(id)) onToggle(id, true)
  }
  const remove = source => {
    if (ownHandles.has(source.id)) onRemove?.(source.id.replace(/^bsky:/,''))
    else { setInStream(source.id, false); onToggle(source.id, false) }
  }
  return <>
    <h2 className="label label--section sect">Bluesky</h2>
    <div className="rows">
      <div className="setrow"><span className="setrow__text"><span className="setrow__label">Bluesky in de Stroom</span></span><Switch checked={prefs.bluesky} onChange={on=>setPref('bluesky',on)} label="Bluesky in de Stroom" /></div>
      {sources.filter(s => !muted.has(s.id)).map(s => <div className="setrow" key={s.id}>
        <SourceMark source={s} size={32} />
        <span className="setrow__text"><span className="setrow__label">{s.name}</span><span className="setrow__hint">{s.handle || s.id.replace(/^bsky:/,'@')}</span></span>
        <Switch checked={(prefs.bskyInStream||[]).includes(s.id)} onChange={on=>setInStream(s.id,on)} label={`${s.name} ook in de Stroom`} />
        <button type="button" className="linkbtn hit" onClick={()=>remove(s)} aria-label={`${s.name} ontvolgen`}>Ontvolgen</button>
      </div>)}
    </div>
    <p className="hint">Posts van de afgelopen anderhalve dag, bij je nieuws in de Stroom.</p>
    {onAdd ? <AddBluesky onAdd={onAdd} /> : null}
  </>
}
