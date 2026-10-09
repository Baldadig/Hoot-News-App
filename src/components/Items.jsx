import { createContext, useContext } from 'react'
import { timeAgo, readTime } from '../lib/time.js'
import { BookmarkIcon, PlayIcon } from './icons.jsx'
import { savedKey } from '../lib/saved.js'

// Alles wat een bericht nodig heeft om te handelen (bewaren, bron bekijken, verhaal openen).
export const HootContext = createContext(null)
export const useHoot = () => useContext(HootContext)

// HLS-video speelt alleen native in Safari/iOS; elders tonen we de poster en opent de post.
const CAN_HLS = typeof document !== 'undefined' && !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl')

const hide = (e) => {
  const box = e.currentTarget.closest('.thumb, .media')
  if (box) box.hidden = true
}

export function SourceMark({ source, size = 22 }) {
  const letter = (source?.name || '?').trim().charAt(0)
  return (
    <span className={`mark${source?.avatarContain ? ' mark--logo' : ''}`} style={{ '--brand': source?.brandColor || 'var(--accent)', width: size, height: size, fontSize: size * 0.5 }} data-letter={letter} aria-hidden="true">
      {source?.avatar ? <img src={source.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.hidden = true)} /> : null}
    </span>
  )
}

// Bron-gegevens van een bericht (de berichten dragen ze zelf, zodat bewaarde items compleet zijn).
const srcOf = (item) => ({ name: item.sourceName, avatar: item.avatar, avatarContain: item.avatarContain, brandColor: item.brandColor })

export function SaveButton({ id, kind = 'item', payload, label = 'bericht' }) {
  const { saved, toggleSave } = useHoot()
  // Een verhaal dat intussen is samengegaan met een ander blijft bewaard onder zijn oude id.
  const key = savedKey(saved, id, kind === 'story' ? payload : null)
  const on = !!key
  const text = on ? `Bewaard — tik om dit ${label} te verwijderen` : `Bewaar dit ${label}`
  return (
    <button type="button" className={`iconbtn save${on ? ' is-on' : ''}`} onClick={() => toggleSave(kind, key || id, payload)} aria-pressed={on} aria-label={text} title={text}>
      <BookmarkIcon filled={on} />
    </button>
  )
}

function Kicker({ item, extra }) {
  const bits = []
  if (extra) bits.push(<span key="x">{extra}</span>)
  if (item.type === 'opinie') bits.push(<span key="t" className="kicker__type">Opinie</span>)
  if (item.section) bits.push(<span key="s">{item.section}</span>)
  return bits.length ? <p className="kicker">{bits}</p> : null
}

// Meta-regel: drie gescheiden klikgebieden — bron bekijken · meer bronnen · bewaren.
export function Meta({ item, story, showSave = true }) {
  const { openSource, openStory, newInStory } = useHoot()
  const fresh = story ? newInStory(story) : 0
  const others = story ? story.sourceCount - 1 : 0
  return (
    <div className="meta">
      <button type="button" className="srcbtn" onClick={() => openSource(item.source)} aria-label={`Alles van ${item.sourceName} bekijken`}>
        <SourceMark source={srcOf(item)} size={28} />
        <span className="srcbtn__col">
          <span className="srcbtn__name">{item.sourceName}</span>
          <span className="srcbtn__time">
            <time dateTime={item.publishedAt || undefined}>{timeAgo(item.publishedAt)}</time>
            {item.readMin ? ` · ${readTime(item.readMin)}` : ''}
          </span>
        </span>
      </button>
      {story && others > 0 ? (
        <button type="button" className="morebtn" onClick={() => openStory(story.id)} aria-label={`Vergelijk ${story.sourceCount} bronnen over dit verhaal${fresh ? `, ${fresh} nieuw` : ''}`}>
          {fresh ? <span className="dot" aria-hidden="true" /> : null}+{others} {others === 1 ? 'bron' : 'bronnen'}
        </button>
      ) : null}
      {showSave ? story ? <SaveButton id={story.id} kind="story" payload={story} label="verhaal" /> : <SaveButton id={item.id} payload={item} /> : null}
    </div>
  )
}

const Summary = ({ item, className }) => {
  const summary = item.nl_summary || item.summary
  if (!summary) return null
  return (
    <p className={className}>
      {summary}
      {!item.nl_summary && item.borrowedFrom ? <span className="via"> — via {item.borrowedFrom}</span> : null}
    </p>
  )
}

// ---- Vorm 1: hoofdverhaal ----
export function LeadStory({ item, story, note }) {
  const { markRead, read } = useHoot()
  return (
    <article className={`entry lead${read.has(item.id) ? ' is-read' : ''}`} data-id={item.id}>
      <a className="lead__link" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(item.id)}>
        {/* Eerst kop en kern, dan pas het beeld (op breed scherm staat het beeld bovenaan, zie CSS). */}
        <Kicker item={item} extra={note} />
        <h2 className="lead__title">{item.short_title || item.title}</h2>
        <Summary item={item} className="lead__sum" />
        {item.image ? (
          <div className="media media--lead">
            <img src={item.image} alt="" referrerPolicy="no-referrer" onError={hide} />
          </div>
        ) : null}
        {item.author ? <p className="byline">Door {item.author}</p> : null}
      </a>
      <Meta item={item} story={story} />
    </article>
  )
}

// ---- Vorm 2: compact bericht ----
export function CompactItem({ item, story, note, showSave = true }) {
  const { markRead, read } = useHoot()
  return (
    <article className={`entry compact${read.has(item.id) ? ' is-read' : ''}`} data-id={item.id}>
      <a className="compact__link" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(item.id)}>
        <div className="compact__text">
          <Kicker item={item} extra={note} />
          <h3 className="compact__title">{item.short_title || item.title}</h3>
          <Summary item={item} className="compact__sum" />
        </div>
        {item.image ? (
          <div className="thumb">
            <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={hide} />
          </div>
        ) : null}
      </a>
      <Meta item={item} story={story} showSave={showSave} />
    </article>
  )
}

// ---- Vorm 3: sociale bijdrage ----
export function SocialItem({ item }) {
  const { markRead, read, openSource } = useHoot()
  const ratio = item.imageRatio ? Math.min(2.4, Math.max(0.7, item.imageRatio)) : null
  const playable = item.video && CAN_HLS
  return (
    <article className={`entry social${read.has(item.id) ? ' is-read' : ''}`} data-id={item.id}>
      <div className="social__head">
        <button type="button" className="srcbtn srcbtn--social" onClick={() => openSource(item.source)} aria-label={`Alles van ${item.sourceName} bekijken`}>
          <SourceMark source={srcOf(item)} size={36} />
          <span className="social__who">
            <span className="srcbtn__name">{item.sourceName}</span>
            <span className="social__handle">
              {item.handle} · <time dateTime={item.publishedAt || undefined}>{timeAgo(item.publishedAt)}</time>
            </span>
          </span>
        </button>
        <SaveButton id={item.id} payload={item} />
      </div>
      <a className="social__body" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(item.id)}>
        {item.summary ? <p className="social__text">{item.summary}</p> : null}
        {item.video && !playable ? (
          <div className="media media--social media--poster" style={{ aspectRatio: 16 / 9 }}>
            {item.videoPoster ? <img src={item.videoPoster} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
            <span className="media__play">
              <PlayIcon />
            </span>
          </div>
        ) : !item.video && item.image ? (
          <div className={`media media--social${ratio ? ' media--natural' : ''}`} style={{ aspectRatio: ratio || 16 / 9 }}>
            <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={hide} />
          </div>
        ) : null}
      </a>
      {playable ? (
        <div className="media media--social" style={{ aspectRatio: 16 / 9 }}>
          <video controls playsInline preload="none" poster={item.videoPoster || undefined} src={item.video} />
        </div>
      ) : null}
    </article>
  )
}

// Kiest de juiste vorm voor een los bericht.
export function Entry({ item, story }) {
  return item.kind === 'post' ? <SocialItem item={item} /> : <CompactItem item={item} story={story} />
}
