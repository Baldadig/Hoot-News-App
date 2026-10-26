import { useRef } from 'react'
import { ViewHeader, Empty, Skeleton, LoadError } from '../components/Shell.jsx'
import { SaveButton, SourceMark, useHoot } from '../components/Items.jsx'
import { Img } from '../components/Img.jsx'
import { MegaphoneIcon, CursorIcon, PaletteIcon, SparkleIcon, CartIcon } from '../components/icons.jsx'
import { timeAgo } from '../lib/time.js'
import { fitsHero, fitsLarge } from '../lib/img.js'
import { useScrollMemory } from '../hooks/useScrollMemory.js'
import { VAK_FIELDS } from '../../shared/vak.mjs'

const ICON = { 'paid-social': MegaphoneIcon, ux: CursorIcon, design: PaletteIcon, ai: SparkleIcon, ecommerce: CartIcon }
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
const two = (n) => String(n).padStart(2, '0')
const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

// Wie, waar en wanneer — met bewaren rechts. Geen knop naar de bron: vakbronnen staan niet in de Stroom.
function Source({ item }) {
  return (
    <div className="meta">
      <span className="srcbtn">
        <SourceMark source={{ name: item.sourceName, avatar: item.avatar, avatarContain: item.avatarContain, brandColor: item.brandColor }} size={28} />
        <span className="srcbtn__col">
          <span className="srcbtn__name">{item.sourceName}</span>
          <span className="srcbtn__time">
            {item.author ? `${item.author} · ` : ''}
            <time dateTime={item.publishedAt || undefined}>{timeAgo(item.publishedAt)}</time>
            {item.via ? ` · via ${item.via}` : ''}
          </span>
        </span>
      </span>
      <SaveButton id={item.id} payload={item} label="stuk" />
    </div>
  )
}

function Also({ item }) {
  if (!item.also?.length) return null
  return (
    <p className="dcard__also">
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
  )
}

// Een stuk als kaart. `feature`: het eerste van het vak, groot en met beeld (als dat scherp genoeg is).
function Card({ item, rank, feature = false }) {
  const { markRead, read } = useHoot()
  const showImage = item.image && (feature ? fitsHero(item.image) : fitsLarge(item.image))
  return (
    <article className={`dcard${feature ? ' dcard--feature' : ''}${showImage ? '' : ' dcard--text'}${read.has(item.id) ? ' is-read' : ''}`} data-id={item.id}>
      <a className="dcard__link" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(item.id)}>
        {showImage ? (
          <div className="media dcard__media">
            <Img url={item.image} kind="lead" />
          </div>
        ) : null}
        <div className="dcard__body">
          <span className="dcard__rank" aria-hidden="true">
            {two(rank)}
          </span>
          {item.why?.length ? (
            <p className="kicker">
              {item.why.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </p>
          ) : null}
          <h3 className="dcard__title">{item.title}</h3>
          {item.summary ? <p className="dcard__sum">{item.summary}</p> : null}
        </div>
      </a>
      <div className="dcard__foot">
        <Also item={item} />
        <Source item={item} />
      </div>
    </article>
  )
}

// Digest: elke maandag om 07:00 per vakgebied de drie belangrijkste stukken van de week ervoor,
// door mensen geschreven (zie netlify/lib/vak.mjs). Opbouw als een tijdschrift: een kop met de
// week, een inhoudsopgave, en per vak één groot stuk, twee kaarten en een korte lijst.
export default function Vak({ active, digest, status, onRefresh }) {
  const { prefs, setPref } = useHoot()
  const ref = useRef(null)
  const chosen = prefs.vak || []
  const fields = (digest?.fields || []).filter((f) => chosen.includes(f.id))
  useScrollMemory(ref, 'hoot:pos-vak:' + (digest?.id || ''), fields.length > 0, (digest?.id || '') + chosen.join(), active)

  const toggle = (id) => setPref('vak', chosen.includes(id) ? chosen.filter((f) => f !== id) : VAK_FIELDS.map((f) => f.id).filter((f) => f === id || chosen.includes(f)))
  const picked = fields.reduce((n, f) => n + f.top.length, 0)
  const seen = fields.reduce((n, f) => n + (f.count || 0), 0)

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Digest">
      <div className="col">
        <ViewHeader title="Digest" onRefresh={onRefresh} refreshing={status === 'refreshing' || status === 'loading'} display>
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
        ) : digest ? (
          <>
            {/* Kop: welke week, en wat je te lezen krijgt */}
            <header className="dmast">
              <p className="dmast__week">{digest.preview ? 'Voorproefje · de afgelopen zeven dagen' : `Week ${digest.week} · ${span(digest.from, digest.to)}`}</p>
              <p className="dmast__lede">
                {picked} stukken in {fields.length === 1 ? '1 vakgebied' : `${fields.length} vakgebieden`}
              </p>
              {digest.preview ? <p className="dmast__note">De eerste volle digest komt {WEEKDAY.format(new Date(digest.next))} om 7 uur.</p> : <p className="dmast__note">Elke maandag om 7 uur een nieuwe.</p>}
            </header>

            {/* Inhoud: per vak de drie koppen; tik = naar het stuk in de digest */}
            <nav className="dtoc" data-n={fields.length} aria-label="In deze digest">
              {fields.map((f) => {
                const Icon = ICON[f.id]
                return (
                  <div key={f.id} className="dtoc__field">
                    <button type="button" className="dtoc__head" onClick={() => scrollTo(`d-${f.id}`)}>
                      <span className="dtoc__icon">
                        <Icon />
                      </span>
                      {f.label}
                    </button>
                    <ol className="dtoc__list">
                      {f.top.map((it, i) => (
                        <li key={it.id}>
                          <button type="button" onClick={() => scrollTo(`d-${it.id}`)}>
                            <span className="dtoc__n">{two(i + 1)}</span>
                            <span>{it.title}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                )
              })}
            </nav>

            {fields.map((f) => {
              const Icon = ICON[f.id]
              const [first, ...rest] = f.top
              return (
                <section key={f.id} className="dfield" id={`d-${f.id}`} aria-labelledby={`dh-${f.id}`}>
                  <header className="dfield__head">
                    <span className="dfield__icon">
                      <Icon />
                    </span>
                    <div>
                      <h2 className="dfield__title" id={`dh-${f.id}`}>
                        {f.label}
                      </h2>
                      <p className="dfield__about">{f.about}</p>
                    </div>
                  </header>
                  {first ? (
                    <>
                      <div id={`d-${first.id}`} className="dfield__anchor">
                        <Card item={first} rank={1} feature />
                      </div>
                      {rest.length ? (
                        <div className="dpair">
                          {rest.map((it, i) => (
                            <div key={it.id} id={`d-${it.id}`} className="dfield__anchor">
                              <Card item={it} rank={i + 2} />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="hint">Deze week geen stukken die eruit sprongen.</p>
                  )}
                  {f.more.length ? (
                    <div className="dmore">
                      <h3 className="dmore__head">Ook deze week</h3>
                      <ol className="dmore__list">
                        {f.more.map((it) => (
                          <li key={it.id}>
                            <a href={it.url} target="_blank" rel="noopener noreferrer">
                              <span className="dmore__title">{it.title}</span>
                              <span className="dmore__src">
                                {it.sourceName} · {timeAgo(it.publishedAt)}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </section>
              )
            })}

            <details className="dhow">
              <summary>Hoe kiest Hoot deze stukken?</summary>
              <p>Gekozen uit {seen} stukken van vakmensen en vakbladen in de vakgebieden die je volgt, op drie gronden: hoeveel vakbronnen over hetzelfde schreven, of de redactie van Sidebar het uitkoos, en wie het schreef (een vakexpert telt zwaarder dan een vakblad, een bedrijfsblog alleen als anderen erover schrijven).</p>
              <p>Alleen stukken van mensen: geen gesponsorde stukken, webinars, podcasts of lijstjes. De tekst bij elk stuk is de intro van de schrijver zelf, niet van AI.</p>
            </details>
          </>
        ) : null}
      </div>
    </section>
  )
}
