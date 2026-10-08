import { timeAgo } from '../lib/time.js'
import { VerifiedCheck, BookmarkIcon } from './icons.jsx'

// HLS-video speelt alleen native in Safari/iOS. Elders tonen we de poster en opent de kaart de post.
const CAN_HLS = typeof document !== 'undefined' && !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl')

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

function SaveButton({ saved, onToggle }) {
  const label = saved ? 'Bewaard — tik om te verwijderen' : 'Bewaren voor later'
  return (
    <button type="button" className={`save${saved ? ' save--on' : ''}`} onClick={onToggle} aria-pressed={saved} aria-label={label} title={label}>
      <BookmarkIcon filled={saved} />
    </button>
  )
}

export default function ArticleCard({ item, isRead, isSaved, onOpen, onFilterSource, onToggleSave }) {
  const isArticle = item.kind !== 'post'
  const title = item.short_title || item.title
  const summary = item.nl_summary || item.summary
  // Preview geleend van een andere NL-bron (alleen als we niet de AI-samenvatting tonen).
  const via = !item.nl_summary && item.borrowedFrom ? item.borrowedFrom : null

  // Foto in een social post: eigen verhouding (begrensd), zodat screenshots leesbaar blijven.
  const ratio = item.imageRatio ? Math.min(2.4, Math.max(0.7, item.imageRatio)) : null

  const media =
    item.video && CAN_HLS ? (
      <div className="post__media" onClick={(e) => e.preventDefault()}>
        <video className="post__video" controls playsInline preload="none" poster={item.videoPoster || undefined} src={item.video} />
      </div>
    ) : item.video ? (
      <div className="post__media post__media--poster">
        {item.videoPoster ? <img src={item.videoPoster} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
        <span className="post__play" aria-hidden="true">
          ▶
        </span>
      </div>
    ) : item.image ? (
      <div className={`post__media${ratio ? ' post__media--natural' : ''}`} style={ratio ? { aspectRatio: ratio } : undefined}>
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
        <SaveButton saved={isSaved} onToggle={() => onToggleSave(item)} />
      </div>

      <a className="card__body" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen(item.id)}>
        {isArticle && title ? <h2 className="post__title">{title}</h2> : null}
        {summary ? (
          <p className="post__text">
            {summary}
            {via ? <span className="post__via"> · via {via}</span> : null}
          </p>
        ) : null}
        {media}
      </a>
    </article>
  )
}
