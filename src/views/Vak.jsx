import { useRef } from 'react'
import { ViewHeader, Empty, Skeleton, LoadError } from '../components/Shell.jsx'
import { SaveButton, SourceMark, useHoot } from '../components/Items.jsx'
import { Img } from '../components/Img.jsx'
import { timeAgo } from '../lib/time.js'
import { useScrollMemory } from '../hooks/useScrollMemory.js'
import { VAK_FIELDS } from '../../shared/vak.mjs'

const DAY = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })
const WEEKDAY = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })
// "12 t/m 18 oktober": de week loopt tot maandag 07:00, dus de laatste dag is de zondag ervoor.
function span(from, to) {
  const a = DAY.format(new Date(from))
  const b = DAY.format(new Date(Date.parse(to) - 8 * 36e5))
  const [da, ma] = a.split(' ')
  const [db, mb] = b.split(' ')
  return ma === mb ? `${da} t/m ${db} ${mb}` : `${a} t/m ${b}`
}

// Eén stuk: waarom het erin staat, de kop, de eigen intro van de schrijver, en wie het schreef.
function VakItem({ item, rank }) {
  const { markRead, read } = useHoot()
  const by = [item.author ? `Door ${item.author}` : null, item.via ? `via ${item.via}` : null].filter(Boolean).join(' · ')
  return (
    <article className={`entry compact vakitem${read.has(item.id) ? ' is-read' : ''}`} data-id={item.id}>
      <a className="compact__link" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(item.id)}>
        <div className="compact__text">
          {rank ? <span className="vakitem__rank" aria-hidden="true">{rank}</span> : null}
          {item.why?.length ? <p className="kicker">{item.why.map((w) => <span key={w}>{w}</span>)}</p> : null}
          <h3 className="compact__title">{item.title}</h3>
          {item.summary ? <p className="compact__sum">{item.summary}</p> : null}
          {by ? <p className="byline">{by}</p> : null}
        </div>
        {item.image ? (
          <div className="thumb">
            <Img url={item.image} width="88" height="88" />
          </div>
        ) : null}
      </a>
      {item.also?.length ? (
        <p className="vakitem__also">
          Ook bij{' '}
          {item.also.map((a, i) => (
            <span key={a.url}>
              {i ? ', ' : ''}
              <a href={a.url} target="_blank" rel="noopener noreferrer">
                {a.sourceName}
              </a>
            </span>
          ))}
        </p>
      ) : null}
      <div className="meta">
        <span className="srcbtn">
          <SourceMark source={{ name: item.sourceName, avatar: item.avatar, avatarContain: item.avatarContain, brandColor: item.brandColor }} size={28} />
          <span className="srcbtn__col">
            <span className="srcbtn__name">{item.sourceName}</span>
            <span className="srcbtn__time">
              <time dateTime={item.publishedAt || undefined}>{timeAgo(item.publishedAt)}</time>
            </span>
          </span>
        </span>
        <SaveButton id={item.id} payload={item} label="stuk" />
      </div>
    </article>
  )
}

// Digest: elke maandag om 07:00 per vakgebied de drie belangrijkste stukken van de week ervoor,
// door mensen geschreven (zie netlify/lib/vak.mjs). Bovenaan kies je je vakgebieden.
export default function Vak({ active, digest, status, onRefresh }) {
  const { prefs, setPref } = useHoot()
  const ref = useRef(null)
  const chosen = prefs.vak || []
  const fields = (digest?.fields || []).filter((f) => chosen.includes(f.id))
  useScrollMemory(ref, 'hoot:pos-vak:' + (digest?.id || ''), fields.length > 0, (digest?.id || '') + chosen.join(), active)

  const toggle = (id) => setPref('vak', chosen.includes(id) ? chosen.filter((f) => f !== id) : VAK_FIELDS.map((f) => f.id).filter((f) => f === id || chosen.includes(f)))
  const sub = digest
    ? digest.preview
      ? `Voorproefje: de afgelopen zeven dagen. De eerste volle digest komt ${WEEKDAY.format(new Date(digest.next))}.`
      : `Week ${digest.week} · ${span(digest.from, digest.to)} · elke maandag om 7 uur nieuw`
    : 'Elke maandag om 7 uur: per vak de drie belangrijkste stukken van de week'

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Digest">
      <div className="col">
        <ViewHeader title="Digest" sub={sub} onRefresh={onRefresh} refreshing={status === 'refreshing' || status === 'loading'} display>
          <div className="topics">
            <div className="topics__scroll" role="group" aria-label="Vakgebieden">
              {VAK_FIELDS.map((f) => (
                <button key={f.id} type="button" className="chip chip--sm" aria-pressed={chosen.includes(f.id)} onClick={() => toggle(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </ViewHeader>
        {status === 'loading' && !digest ? (
          <Skeleton rows={4} />
        ) : status === 'error' && !digest ? (
          <LoadError onRetry={onRefresh} />
        ) : !chosen.length ? (
          <Empty title="Kies je vakgebieden">Tik hierboven op een of meer vakken. Elke maandag staan hier dan per vak de drie belangrijkste stukken van de week.</Empty>
        ) : (
          fields.map((f) => (
            <section key={f.id} className="vakfield" aria-labelledby={`vak-${f.id}`}>
              <h2 className="vakfield__head" id={`vak-${f.id}`}>
                {f.label}
              </h2>
              <p className="hint vakfield__about">{f.about}</p>
              {f.top.length ? (
                <div className="list">
                  {f.top.map((it, i) => (
                    <VakItem key={it.id} item={it} rank={i + 1} />
                  ))}
                </div>
              ) : (
                <p className="hint">Deze week geen stukken die eruit sprongen.</p>
              )}
              {f.more.length ? (
                <>
                  <h3 className="front__more">Ook deze week</h3>
                  <ul className="vakmore">
                    {f.more.map((it) => (
                      <li key={it.id}>
                        <a href={it.url} target="_blank" rel="noopener noreferrer">
                          <span className="vakmore__title">{it.title}</span>
                          <span className="vakmore__src">{it.sourceName}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          ))
        )}
        {digest && chosen.length ? (
          <p className="hint vakfoot">
            Gekozen op drie gronden: hoeveel vakbronnen over hetzelfde schreven, of de redactie van Sidebar het uitkoos, en wie het schreef (een vakexpert telt zwaarder). Alleen stukken van mensen: geen gesponsorde stukken, webinars of lijstjes. De tekst bij elk stuk is de intro van de schrijver zelf.
          </p>
        ) : null}
      </div>
    </section>
  )
}
