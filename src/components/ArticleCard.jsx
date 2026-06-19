import { useState } from 'react'
import { timeAgo } from '../lib/time.js'
import { VerifiedCheck, BookmarkIcon } from './icons.jsx'

function hideParent(e) {
  const wrap = e.currentTarget.parentElement
  if (wrap) wrap.style.display = 'none'
}

function Avatar({ src, name, brand, contain }) {
  const letter = (name || '?').trim().charAt(0) || '?'
  return (
    <span className={`avatar${contain ? ' avatar--logo' : ''}`} data-letter={letter} style={{ '--brand': brand || 'var(--accent)' }}>
      {src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} /> : null}
    </span>
  )
}

function SaveButton({ saved, onSave }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(false)

  const click = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (saved || busy) return
    setBusy(true)
    setErr(false)
    const r = await onSave()
    setBusy(false)
    if (!r || !r.ok) {
      setErr(true)
      setTimeout(() => setErr(false), 2600)
    }
  }

  const label = saved ? 'Bewaard in Instapaper' : err ? 'Bewaren mislukt — staat Instapaper ingesteld?' : 'Bewaar in Instapaper'

  return (
    <button
      type="button"
      className={`save${saved ? ' save--on' : ''}${err ? ' save--err' : ''}${busy ? ' save--busy' : ''}`}
      onClick={click}
      disabled={busy || saved}
      aria-pressed={saved}
      aria-label={label}
      title={label}
    >
      <BookmarkIcon filled={saved} />
    </button>
  )
}

export default function ArticleCard({ item, isRead, isSaved, onOpen, onFilterSource, onSave }) {
  const isArticle = item.kind !== 'post'
  const title = item.title
  const summary = item.nl_summary || item.summary

  const media = item.video ? (
    <div className="post__media" onClick={(e) => e.preventDefault()}>
      <video className="post__video" controls playsInline preload="none" poster={item.videoPoster || undefined} src={item.video} />
    </div>
  ) : item.image ? (
    <div className="post__media">
      <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={hideParent} />
    </div>
  ) : null

  return (
    <article className={`card${isRead ? ' card--read' : ''}`}>
      <div className="post__head">
        <button type="button" className="post__source" onClick={() => onFilterSource(item)} aria-label={`Toon alleen ${item.sourceName}`}>
          <Avatar src={item.avatar} name={item.sourceName} brand={item.brandColor} contain={item.avatarContain} />
          <div className="post__id">
            <span className="post__name">
              {item.sourceName}
              {item.verified ? <VerifiedCheck /> : null}
            </span>
            <span className="post__meta">
              {item.handle || item.domain} · {timeAgo(item.publishedAt)}
            </span>
          </div>
        </button>
        {item.trendCount ? (
          <span className="trendbadge" title={`Ook bij: ${(item.alsoIn || []).join(', ')}`}>
            🔥 {item.trendCount} bronnen
          </span>
        ) : item.readMin ? (
          <span className="readpill" aria-label={`${item.readMin} minuten lezen`}>
            📖 {item.readMin} min
          </span>
        ) : null}
        <SaveButton saved={isSaved} onSave={() => onSave(item)} />
      </div>

      <a className="card__body" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen(item.id)}>
        {isArticle && title ? <h2 className="post__title">{title}</h2> : null}
        {summary ? <p className="post__text">{summary}</p> : null}
        {media}
      </a>
    </article>
  )
}
