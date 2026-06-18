import { timeAgo } from '../lib/time.js'
import { VerifiedCheck } from './icons.jsx'

function hideParent(e) {
  const wrap = e.currentTarget.parentElement
  if (wrap) wrap.style.display = 'none'
}

function Avatar({ src, name }) {
  const letter = (name || '?').trim().charAt(0) || '?'
  return (
    <span className="avatar" data-letter={letter}>
      {src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} /> : null}
    </span>
  )
}

export default function ArticleCard({ item, isRead, onOpen }) {
  const title = item.nl_title || item.title
  const summary = item.nl_summary || item.summary

  return (
    <a className={`card${isRead ? ' card--read' : ''}`} href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen(item.id)}>
      <div className="post__head">
        <Avatar src={item.avatar} name={item.sourceName} />
        <div className="post__id">
          <span className="post__name">
            {item.sourceName}
            {item.verified ? <VerifiedCheck /> : null}
          </span>
          <span className="post__meta">
            {item.handle || item.domain} · {timeAgo(item.publishedAt)}
          </span>
        </div>
      </div>

      {summary ? <p className="post__text">{summary}</p> : null}

      {item.image ? (
        <div className="post__media">
          <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={hideParent} />
        </div>
      ) : null}

      {title ? (
        <div className="linkcard">
          <span className="linkcard__title">{title}</span>
          <span className="linkcard__domain">🔗 {item.domain}</span>
        </div>
      ) : null}
    </a>
  )
}
