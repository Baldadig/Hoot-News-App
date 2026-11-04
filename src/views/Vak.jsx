import { useRef, useState, useEffect } from 'react'
import { ViewHeader, Skeleton, LoadError } from '../components/Shell.jsx'
import { SaveButton, ShareButton, SourceMark, useHoot, viaLength } from '../components/Items.jsx'
import { Img } from '../components/Img.jsx'
import { ChipGroup } from '../components/ChipGroup.jsx'
import { Disclosure } from '../components/Disclosure.jsx'
import { timeAgo } from '../lib/time.js'
import { fitsHero, fitsLarge } from '../lib/img.js'
import { useScrollMemory } from '../hooks/useScrollMemory.js'
import { Dialog, DialogHeader } from '../components/Dialog.jsx'
import { CaretIcon, JumpIcon, ICON_SM } from '../components/icons.jsx'
import { reduced } from '../lib/motion.js'
import { selectionOverview, summaryLine, pieces, EMPTY_FIELD, NO_SOURCES, CHOOSE } from '../lib/selection-index.js'
import { useSelectionFold } from '../hooks/useSelectionFold.js'
import { vakByDomain, VAK_FIELDS } from '../../shared/vak.mjs'
import { wholeSentences } from '../../shared/zinnen.mjs'
import { useIntroMax } from '../lib/intro.js'

const DAY = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })
const WEEKDAY = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })
// "12 t/m 18 oktober": de week loopt tot de maandagochtend waarop de Selectie verschijnt (`to`),
// dus de laatste dag is de zondag ervoor.
function span(from, to) {
  const a = DAY.format(new Date(from))
  const b = DAY.format(new Date(Date.parse(to) - 8 * 36e5))
  const [da, ma] = a.split(' ')
  const [db, mb] = b.split(' ')
  return ma === mb ? `${da} t/m ${db} ${mb}` : `${a} t/m ${b}`
}
const two = (n) => String(n).padStart(2, '0')

// Hoe kiest Hoot deze stukken? Tekst 1 · Kort (concepten/4-hoe-kiest.html), woord voor woord gelijk
// aan DigestView.swift (tests/selectie-index.test.mjs).
export const howHootChooses = (n) => [
  `Deze week las Hoot ${n} stukken van kenners en vakbladen over je onderwerpen. Per onderwerp blijven er drie over: waar anderen ook over schrijven, wat een redactie uitkoos, of wat een kenner schreef.`,
  'Niets gesponsord. De intro is van de schrijver zelf.',
]


// Wie, waar en wanneer — met delen en bewaren rechts. Geen knop naar de bron: vakbronnen staan niet in de Stroom.
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
      <ShareButton item={item} label="stuk" />
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
  // Hele zinnen, nooit "…", gemeten in de kaart (binnenruimte en rand eraf): 3 regels, het eerste
  // stuk 4 regels in de grotere letter (.dcard__sum --lines). De clamp staat een regel ruimer.
  const fit = useIntroMax()(feature ? 4 : 3, feature ? 'kaartEerste' : 'kaart')
  // Komt hier ooit een geleende intro, dan met zijn bron ("via X"); die tekens gaan van de maat af.
  const summary = wholeSentences(item.summary, fit.max - viaLength(item), fit.rek - viaLength(item))
  return (
    <article className={`card dcard${feature ? ' dcard--feature' : ''}${showImage ? '' : ' dcard--text'}${read.has(item.id) ? ' is-read' : ''}`} data-id={item.id}>
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
          <h3 className={`${feature ? 'head-lg' : 'head-4'} dcard__title`}>{item.title}</h3>
          {/* Waarom dit stuk: rustige metadata onder de kop, zodat de kop voorgaat. */}
          {item.why?.length ? <p className="dcard__why">{item.why.join(' · ')}</p> : null}
          {summary ? (
            <p className="clamp clamp--vangnet dcard__sum">
              {summary}
              {item.borrowedFrom ? <span className="via"> — via {item.borrowedFrom}</span> : null}
            </p>
          ) : null}
        </div>
      </a>
      <div className="dcard__foot">
        <Also item={item} />
        <Source item={item} />
      </div>
    </article>
  )
}

// Eén rijvorm voor springen, kiezen en in- of uitklappen (Selectie-index B, SE2): de naam, het
// aantal eronder, en rechts een stil teken op de eerste regel van de naam (SE3). `big`: de kop van
// een onderwerp, in de serif op 22, dezelfde rij.
function IndexRow({ kind, name, sub, big = false, expanded, flash = false, ...rest }) {
  const icon = kind === 'jump' ? <JumpIcon size={ICON_SM} /> : kind === 'pick' ? <CaretIcon size={ICON_SM} /> : <CaretIcon dir={expanded ? 'up' : 'down'} size={ICON_SM} />
  return (
    <button type="button" className={`dirow${big ? ' dirow--big' : ''}${flash ? ' dirow--flash' : ''}`} aria-expanded={kind === 'toggle' ? expanded : undefined} {...rest}>
      <span className="dirow__text">
        <span className="dirow__name">{name}</span>
        {sub ? <span className="dirow__sub">{sub}</span> : null}
      </span>
      <span className="dirow__icon" aria-hidden="true">
        {icon}
      </span>
    </button>
  )
}

// Selectie: elke maandagochtend per onderwerp de drie belangrijkste stukken van de week ervoor,
// door mensen geschreven (zie netlify/lib/vak.mjs). Opbouw als de inhoudsopgave van een krant
// (Selectie-index B): de week, wat je te lezen krijgt, de inhoud als lijst, en per onderwerp één
// groot stuk, twee kaarten en een korte lijst. Lege onderwerpen staan onderaan.
export default function Vak({ active, digest, status, onRefresh }) {
  const { prefs, setPref, account, selectionReady = true } = useHoot()
  const ref = useRef(null)
  const chosen = prefs.vak || []
  const owner = account?.status === 'in' ? account.user.id : 'anon'
  const byId = new Map((digest?.fields || []).map(f => [f.id, f]))
  const offered = new Set(byId.keys())
  const overview = selectionOverview(VAK_FIELDS.filter(f => chosen.includes(f.id)).map(f => ({ ...f, ...byId.get(f.id), top: byId.get(f.id)?.top || [], more: byId.get(f.id)?.more || [] })), offered)
  const fields = overview.fields
  const [closed, setClosed] = useSelectionFold(owner, chosen, selectionReady)
  const [choosing, setChoosing] = useState(false)
  const [jump, setJump] = useState(null)
  const [flash, setFlash] = useState(null)
  useScrollMemory(ref, 'hoot:pos-vak:' + owner + ':' + (digest?.id || ''), fields.length > 0, (digest?.id || '') + chosen.join() + closed.join(), active)
  useEffect(() => {
    if (!jump || !active) return
    const token = requestAnimationFrame(() => {
      const heading = document.getElementById(`dh-${jump.id}`)
      if (jump.owner === owner && heading) {
        heading.focus({ preventScroll: true })
        heading.scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'start' })
        // Na het springen licht het onderwerp even op, behalve bij Verminder beweging.
        if (!reduced()) setFlash(jump.id)
      }
      setJump(null)
    })
    return () => cancelAnimationFrame(token)
  }, [jump, active, owner])
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 1200)
    return () => clearTimeout(t)
  }, [flash])
  useEffect(() => { setChoosing(false); setJump(null) }, [owner, active])
  const jumpTo = id => { setClosed(closed.filter(x => x !== id)); setJump({ id, owner }) }
  const toggleField = id => setClosed(closed.includes(id) ? closed.filter(x => x !== id) : [...closed, id])

  const order = vakByDomain().flatMap((d) => d.fields.map((f) => f.id))
  const toggle = (id) => setPref('vak', chosen.includes(id) ? chosen.filter((f) => f !== id) : order.filter((f) => f === id || chosen.includes(f)))
  const seen = fields.reduce((n, f) => n + (f.count || 0), 0)
  const pickRow = (name, sub) => (
    <nav className="dindex" aria-label="Onderwerpen">
      <IndexRow kind="pick" name={name} sub={sub} aria-haspopup="dialog" disabled={!selectionReady} onClick={() => setChoosing(true)} />
    </nav>
  )
  const gekozen = `${chosen.length} gekozen`
  const how = seen > 0 ? (
    <Disclosure className="dhow" summaryClassName="linkbtn linkbtn--plain" summary="Hoe kiest Hoot deze stukken?">
      {howHootChooses(seen).map((line) => <p key={line}>{line}</p>)}
    </Disclosure>
  ) : null

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Selectie">
      <div className="col col--wide">
        <ViewHeader title="Selectie" onRefresh={onRefresh} refreshing={status === 'refreshing' || status === 'loading'} />

        {/* Kiezen: dezelfde onderwerpen als altijd, per domein, in een blad achter de laatste rij. */}
        <Dialog open={choosing} onClose={() => setChoosing(false)} labelledBy="selectie-kies-title" className="dpick">
          <DialogHeader id="selectie-kies-title" title="Onderwerpen" onClose={() => setChoosing(false)} />
          {vakByDomain().map((d) => (
            <ChipGroup key={d.id} label={d.label} listClassName="vakpick__chips">
              {d.fields.map((f) => (
                <button key={f.id} type="button" className="pill pill--sm hit" aria-pressed={chosen.includes(f.id)} onClick={() => toggle(f.id)}>
                  {f.label}
                </button>
              ))}
            </ChipGroup>
          ))}
          <p className="sheet__note">Elke maandag het beste per onderwerp.</p>
        </Dialog>

        {!chosen.length ? (
          <div className="dempty">
            <h2 className="head-lg">Kies je onderwerpen</h2>
            <p className="dempty__text">{CHOOSE}</p>
            {pickRow('Kies onderwerpen', 'Nog niets gekozen')}
          </div>
        ) : status === 'loading' && !digest ? (
          <Skeleton rows={4} layout="krant" />
        ) : status === 'error' && !digest ? (
          <LoadError onRetry={onRefresh} />
        ) : !digest ? null : overview.state === 'leeg' ? (
          <>
            <div className="dempty">
              <h2 className="head-lg">Nog niets voor {overview.names}</h2>
              <p className="dempty__text">{overview.unoffered ? NO_SOURCES : EMPTY_FIELD}</p>
              {pickRow('Kies onderwerpen', gekozen)}
            </div>
            {how}
          </>
        ) : (
          <>
            {/* Kop: welke week, en wat je te lezen krijgt. De week is een datum: ink-3, geen rood (SE6). */}
            <header className="dmast">
              <p className="label label--meta dmast__week">{digest.preview ? 'Voorproefje van deze week' : `Week ${digest.week} · ${span(digest.from, digest.to)}`}</p>
              <h2 className="head-lg dmast__lede">{summaryLine(overview)}</h2>
              {digest.preview ? <p className="dmast__note">De eerste Selectie komt {WEEKDAY.format(new Date(digest.next))}.</p> : <p className="dmast__note">Elke maandagochtend een nieuwe.</p>}
            </header>

            {/* De inhoud: tik op een onderwerp en je springt ernaartoe. De laatste rij: kiezen. */}
            <nav className="dindex" aria-label="Inhoud">
              {fields.map((f) => (
                <IndexRow key={f.id} kind="jump" name={f.label} sub={pieces(f.top.length)} disabled={!selectionReady} onClick={() => jumpTo(f.id)} />
              ))}
              <IndexRow kind="pick" name="Onderwerpen" sub={gekozen} aria-haspopup="dialog" disabled={!selectionReady} onClick={() => setChoosing(true)} />
            </nav>

            {fields.map((f) => {
              const open = !closed.includes(f.id)
              const [first, ...rest] = f.top
              return (
                <section key={f.id} className="dfield" id={`d-${f.id}`} data-id={`field:${f.id}`} aria-labelledby={`dh-${f.id}`}>
                  <h2 className="dfield__head">
                    <IndexRow kind="toggle" big id={`dh-${f.id}`} name={f.label} sub={pieces(f.top.length)} expanded={open} flash={flash === f.id} aria-controls={`dc-${f.id}`} disabled={!selectionReady} onClick={() => toggleField(f.id)} />
                  </h2>
                  <div id={`dc-${f.id}`} hidden={!open}>
                  {first ? (
                    <>
                      {f.about ? <p className="dfield__about">{f.about}</p> : null}
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
                    <p className="hint dfield__none">{EMPTY_FIELD}</p>
                  )}
                  {f.more.length ? (
                    <div className="dmore">
                      <h3 className="label label--section dmore__head">Ook deze week</h3>
                      <ol className="dmore__list">
                        {f.more.map((it) => (
                          <li key={it.id}>
                            <a href={it.url} target="_blank" rel="noopener noreferrer">
                              <span className="head-4 dmore__title">{it.title}</span>
                              <span className="dmore__src">
                                {it.sourceName} · {timeAgo(it.publishedAt)}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  </div>
                </section>
              )
            })}

            {how}
          </>
        )}
      </div>
    </section>
  )
}
