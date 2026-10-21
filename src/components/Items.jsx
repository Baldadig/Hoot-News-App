import { createContext, useContext } from 'react'
import { timeAgo, readTime } from '../lib/time.js'
import { BookmarkIcon, PlayIcon } from './icons.jsx'
import { savedKey } from '../lib/saved.js'
import { avatarUrl } from '../lib/img.js'
import { Img } from './Img.jsx'
import { Video } from './Video.jsx'
import { directVideo } from '../../shared/bluesky.mjs'

// Alles wat een bericht nodig heeft om te handelen (bewaren, bron bekijken, verhaal openen).
export const HootContext = createContext(null)
export const useHoot = () => useContext(HootContext)

// HLS-video speelt alleen native in Safari/iOS; elders tonen we de poster en opent de post.
const CAN_HLS = typeof document !== 'undefined' && !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl')

// Onthoudt welk hoofdbeeld je het laatst zag, zodat index.html het bij je volgende bezoek
// al kan ophalen terwijl de app nog laadt (zie het script in index.html).
const rememberLead = (e) => {
  try {
    localStorage.setItem('hoot:lcp', JSON.stringify({ u: e.currentTarget.currentSrc, at: Date.now() }))
  } catch {
    /* niet erg */
  }
}

export function SourceMark({ source, size = 22 }) {
  const letter = (source?.name || '?').trim().charAt(0)
  return (
    <span className={`mark${source?.avatarContain ? ' mark--logo' : ''}`} style={{ '--brand': source?.brandColor || 'var(--accent)', width: size, height: size, fontSize: size * 0.5 }} data-letter={letter} aria-hidden="true">
      {source?.avatar ? <img src={avatarUrl(source.avatar)} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.hidden = true)} /> : null}
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
  if (item.section && !extra) bits.push(<span key="s">{item.section}</span>) // de rubriek van de editie gaat voor die van de bron
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
            {item.readMin ? <span className="srcbtn__read"> · {readTime(item.readMin)}</span> : null}
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

const Summary = ({ item, className }) =>
  item.summary ? (
    <p className={className}>
      {item.summary}
      {item.borrowedFrom ? <span className="via"> — via {item.borrowedFrom}</span> : null}
    </p>
  ) : null

// ---- Vorm 1: hoofdverhaal ----
// `priority`: dit is het eerste beeld dat je ziet (alleen het zichtbare hoofdverhaal).
export function LeadStory({ item, story, note, priority = false }) {
  const { markRead, read } = useHoot()
  return (
    <article className={`entry lead${read.has(item.id) ? ' is-read' : ''}`} data-id={item.id}>
      <a className="lead__link" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(item.id)}>
        {/* Eerst kop en kern, dan pas het beeld (op breed scherm staat het beeld bovenaan, zie CSS). */}
        <Kicker item={item} extra={note} />
        <h2 className="lead__title">{item.title}</h2>
        <Summary item={item} className="lead__sum" />
        {item.image ? (
          <div className="media media--lead">
            <Img url={item.image} kind="lead" priority={priority} onLoad={priority ? rememberLead : undefined} />
          </div>
        ) : null}
        {item.author ? <p className="byline">Door {item.author}</p> : null}
      </a>
      <Meta item={item} story={story} />
    </article>
  )
}

// ---- Vorm 2: compact bericht ----
// Twee indelingen (instelbaar): "krant" — kop links, klein beeld rechts — en "tijdlijn" —
// bron bovenaan, dan de tekst en het beeld groot in het midden. `plain` houdt de krant-vorm
// aan, voor smalle plekken zoals het vergelijkpaneel.
export function CompactItem({ item, story, note, showSave = true, plain = false }) {
  const { markRead, read, layout } = useHoot()
  const cls = `entry compact${read.has(item.id) ? ' is-read' : ''}`
  if (layout === 'tijdlijn' && !plain) {
    return (
      <article className={`${cls} compact--tl`} data-id={item.id}>
        <Meta item={item} story={story} showSave={showSave} />
        <a className="compact__link" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(item.id)}>
          <Kicker item={item} extra={note} />
          <h3 className="compact__title">{item.title}</h3>
          <Summary item={item} className="compact__sum" />
          {item.image ? (
            <div className="media media--tl">
              <Img url={item.image} kind="lead" />
            </div>
          ) : null}
        </a>
      </article>
    )
  }
  return (
    <article className={cls} data-id={item.id}>
      <a className="compact__link" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(item.id)}>
        <div className="compact__text">
          <Kicker item={item} extra={note} />
          <h3 className="compact__title">{item.title}</h3>
          <Summary item={item} className="compact__sum" />
        </div>
        {item.image ? (
          <div className="thumb">
            <Img url={item.image} width="88" height="88" />
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
  // Drie soorten beeld: een gedeelde link (compacte kaart), een eigen foto (ruimer, met
  // begrensde hoogte en de echte verhouding) en video (16:9 met afspeelknop).
  const isLink = !item.video && !item.imageRatio && !!item.domain && item.domain !== 'bsky.app'
  // Hoogte begrenzen zonder bij te snijden: de breedte volgt uit de verhouding.
  const bounded = (r) => ({ aspectRatio: r, maxWidth: `calc(min(420px, 56vh) * ${r})` })
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
          <div className="media media--social media--poster" style={bounded(16 / 9)}>
            {item.videoPoster ? <img src={directVideo(item.videoPoster)} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : null}
            <span className="media__play">
              <PlayIcon />
            </span>
          </div>
        ) : isLink ? (
          <div className="linkcard">
            {item.image ? (
              <div className="thumb">
                <Img url={item.image} width="88" height="88" />
              </div>
            ) : null}
            <div className="linkcard__text">
              {item.linkTitle ? <span className="linkcard__title">{item.linkTitle}</span> : null}
              <span className="linkcard__domain">{item.domain}</span>
            </div>
          </div>
        ) : !item.video && item.image ? (
          <div className={`media media--social${ratio ? ' media--natural' : ''}`} style={bounded(ratio || 16 / 9)}>
            <Img url={item.image} kind="lead" />
          </div>
        ) : null}
      </a>
      {playable ? <Video src={item.video} poster={item.videoPoster} label={`Video van ${item.sourceName} afspelen`} style={bounded(16 / 9)} /> : null}
    </article>
  )
}

// Kiest de juiste vorm voor een los bericht.
export function Entry({ item, story }) {
  return item.kind === 'post' ? <SocialItem item={item} /> : <CompactItem item={item} story={story} />
}
