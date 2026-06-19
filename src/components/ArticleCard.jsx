import { timeAgo } from '../lib/time.js'
import { VerifiedCheck } from './icons.jsx'

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

export default function ArticleCard({ item, isRead, onOpen, onFilterSource }) {
  const isArticle = item.kind !== 'post'
  const title = item.nl_title || item.title
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
      <button type="button" className="post__head" onClick={() => onFilterSource(item)} aria-label={`Toon alleen ${item.sourceName}`}>
        <Avatar src={item.avatar} name={item.sourceName} brand={item.brandColor} contain={item.avatarContain} />
        <div className="post__id">
          <span className="post__name">
            {item.sourceName}
            {item.verified ? <VerifiedCheck /> : null}
          </span>
          <span className="post__meta">
            {item.handle || item.domain} · {timeAgo(item.publishedAt)}
            {item.readMin ? <span className="post__read"> · 📖 {item.readMin} min</span> : null}
          </span>
        </div>
      </button>

      <a className="card__body" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen(item.id)}>
        {isArticle && title ? <h2 className="post__title">{title}</h2> : null}
        {summary ? <p className="post__text">{summary}</p> : null}
        {media}
      </a>
    </article>
  )
}
