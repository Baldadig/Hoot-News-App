import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SourceMark } from '../components/Items.jsx'
import { BackButton } from '../components/Shell.jsx'
import { ChipGroup } from '../components/ChipGroup.jsx'
import { BrandLogo, useBrandBar } from '../components/Brand.jsx'
import SunArt from '../components/SunArt.jsx'
import { CaretIcon, CheckIcon, ICON_SM, SearchIcon } from '../components/icons.jsx'
import { vakByDomain } from '../../shared/vak.mjs'
import { INTERESTS, resolveTopics } from '../lib/topics.js'
import { sourcesOn, pickedFrom, sourceLine } from '../lib/welcome.js'
import { toggleFollow, freeStart, startIds, basisSources, interestBlocks, moreGroups, findSources, followedSources, followedLine, previewLines } from '../lib/follow-welcome.js'
import { reduced, irisClose, irisOpen, irisKeyframes, fade, tint, clear, dotAt, waitFor, sleep, tintTimes, openTimes, reducedPlan, crossPlan, rootColor, IRIS, IRIS_BACK, IRIS_MS, STEP_OUT_MS, STEP_IN_MS } from '../lib/motion.js'

// Welkom (1.1.0), gelijk aan de app (ios/Hoot/Views/WelcomeView.swift). Vier schermen:
//   1. welkom (rood)   de zon komt op achter de horizon; Begin. Account klein rechtsboven.
//   2. Zo werkt Hoot   Editie, Stroom en Selectie als gelijken op één scherm, elk met zijn eigen zon
//                      (components/SunArt.jsx: de zon achter de horizon, rustig; Minder beweging stil).
//                      Kies je interesses, of Liever meteen lezen (de gratis startset, zonder sport).
//   3. Wat interesseert je?  de hoofdrubrieken (je Stroom-tabs) en, uitklapbaar, je Selectie.
//   4. Volg je bronnen zoals accounts volgen: niets staat vooraf aan. Bovenaan de Basis (Nederlands
//                      nieuws, het gratis begin voorop), dan per gekozen interesse een blok met een
//                      gratis aanrader; de rest ingeklapt; zoeken vindt alles. Een voorbeeld-Editie
//                      groeit mee (breed rechts, smal in een uitklapbalk boven de knop).
// Eerst de interesses, dan de bronnen: zo staan de vak- en nichebronnen bij wat je koos, en niet
// verstopt in één lange lijst. "Later kiezen" kan altijd. Daarna de Editie: het welkom vervaagt erover (crossPlan). Het seintje
// komt pas onder de eerste Editie (alleen in de app; web-push bestaat niet).
// Van rood naar papier krimpt het rood als iris tot de punt van het kleine woordmerk (lib/motion.js);
// terug speelt het omgekeerd. Bij Minder beweging één fade van 0,35 s. Tussen papieren schermen even
// uit en weer in.
// Opnieuw kiezen (Bronnen of Instellingen, `onClose` is er dan): geen intro en geen uitleg; je begint
// bij je interesses met wat nu aan staat, en Sluiten (ook Escape) slaat niets op.

const TRIO = [
  { kind: 'editie', title: 'Editie', text: 'Drie keer per dag tien verhalen. Dan ben je bij.' },
  { kind: 'stroom', title: 'Stroom', text: 'Alles van je bronnen, nieuwste eerst.' },
  { kind: 'selectie', title: 'Selectie', text: 'Elke maandag het beste over wat jou bezighoudt.' },
]

const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export default function Welcome({ sources, items = [], prefs, muted = new Set(), onDone, onClose = null, onSignIn = null, leaving = false, first = false, onLeft = () => {} }) {
  const reopen = !!onClose
  const [view, setView] = useState(reopen ? 'interesses' : 'intro') // intro | uitleg | interesses | bronnen
  const [interests, setInterests] = useState(() => prefs.interests || [])
  const picked = useMemo(() => pickedFrom(prefs.topics || [], prefs.interests || [], INTERESTS), [prefs.topics, prefs.interests])
  const [edited, setEdited] = useState(null) // je eigen bronnenkeuze; zolang null geldt het begin
  const [vak, setVak] = useState(() => prefs.vak || [])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('aanbevolen') // aanbevolen | gevolgd
  const [more, setMore] = useState(false) // Meer bronnen uitgeklapt
  const [peekOpen, setPeekOpen] = useState(false)
  const [selOpen, setSelOpen] = useState(() => (prefs.vak || []).length > 0)
  const [red, setRed] = useState(!reopen) // de rode intro-laag staat er (ook nog tijdens het sluiten)
  const [phase, setPhase] = useState('open') // 'open' | 'closing' (rood → papier) | 'opening' (terug)
  const head = useRef(null) // de kop van de papieren pagina
  const redHead = useRef(null) // de kop op het rood
  const root = useRef(null) // .ob
  const paperCol = useRef(null) // de papieren kolom: vervaagt even tussen pagina's
  const scroller = useRef(null)
  const paperBrand = useRef(null) // het papieren woordmerk: het doel van de iris
  const redRef = useRef(null) // de rode laag
  const afterOpen = useRef(null) // wat er gebeurt zodra het rood weer open is (Terug)
  const left = useRef(onLeft)
  left.current = onLeft
  const paper = view !== 'intro' // er is een papieren pagina getekend
  useBrandBar(red) // zolang het rood staat, kleurt de browserbalk mee

  // Weg: het hele scherm vervaagt over de Editie eronder (alleen dekking, 0,45 s, ook bij Minder
  // beweging); daarna mag App.jsx het weghalen. Komt `leaving` toch terug op onwaar, dan weer dekkend.
  useEffect(() => {
    if (!leaving) return
    const el = root.current
    if (!el?.animate) {
      left.current()
      return
    }
    let alive = true
    const { fade: ms, easing } = crossPlan(first)
    fade(el, ms, 1, 0, easing)
      .finished.then(() => alive && left.current())
      .catch(() => {})
    return () => {
      alive = false
      clear(el)
    }
  }, [leaving])

  const topics = useMemo(() => resolveTopics(interests, picked), [interests, picked])
  const pickable = useMemo(() => sources.filter((s) => s.followed && s.kind !== 'sociaal'), [sources])
  // Je bronnen: je eigen keuze; opnieuw kiezen begint bij wat nu aan staat, de eerste keer bij niets.
  const initial = useMemo(() => (reopen ? sourcesOn(pickable, muted) : []), [reopen, pickable, muted])
  const mine = edited ?? initial

  // Nieuwe pagina: de kop voorlezen (schermlezer) en bovenaan beginnen, pas als de overgang klaar is.
  useEffect(() => {
    if (phase !== 'open') return
    if (scroller.current) scroller.current.scrollTop = 0
    ;(red ? redHead : head).current?.focus({ preventScroll: true })
  }, [view, red, phase])

  // Terug naar de intro: de laag staat er net; eerst één beeld gesloten in beeld (clip op de punt,
  // de kleur van de punt, de papieren punt weg), dan opent het rood weer uit de punt.
  useLayoutEffect(() => {
    if (phase !== 'opening') return
    const layer = redRef.current
    if (!layer) return
    let alive = true
    const dot = layer.querySelector('.ob__brand .brand__dot')
    const done = () => {
      if (!alive) return
      clear(layer)
      clear(dot)
      layer.style.clipPath = ''
      layer.style.backgroundColor = ''
      if (dot) dot.style.opacity = ''
      afterOpen.current?.()
      afterOpen.current = null
      setPhase('open')
    }
    const at = dotAt(paperBrand.current?.querySelector('.brand__dot'))
    if (reduced() || !at || !layer.animate) {
      fade(layer, reducedPlan().fade, 0, 1).finished.then(done).catch(() => {})
      return () => {
        alive = false
      }
    }
    const geo = { ...at, w: innerWidth, h: innerHeight }
    const accent = rootColor('--accent')
    const brandRed = rootColor('--brand-red')
    layer.style.clipPath = irisKeyframes(geo)[1]
    layer.style.backgroundColor = accent
    if (dot) dot.style.opacity = '0'
    const o = openTimes(IRIS_MS)
    const timers = [
      setTimeout(() => {
        irisOpen(layer, { ...geo, duration: IRIS_MS, easing: IRIS_BACK })
        tint(layer, accent, brandRed, { duration: o.tintDur })
        timers.push(setTimeout(() => dot && fade(dot, o.dotDur, 0, 1, 'ease-in'), o.dotStart))
        timers.push(setTimeout(done, o.end))
      }, o.delay),
    ]
    return () => {
      alive = false
      timers.forEach(clearTimeout)
    }
  }, [phase])

  // Escape sluit het welkom als je het opnieuw opende (de eerste keer moet je erdoor).
  useEffect(() => {
    if (!onClose) return
    const onKey = (e) => e.key === 'Escape' && !e.defaultPrevented && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // ---- Overgangen ----

  // Van de rode intro naar papier: `apply` tekent de papieren pagina onder het rood; zodra het
  // papieren woordmerk zijn plek heeft (een beeld of twee), sluit de iris tot zijn punt. Zonder
  // plek, of bij Minder beweging: een fade.
  const leaveIntro = async (apply) => {
    apply()
    setPhase('closing')
    const layer = redRef.current
    const at = await waitFor(() => dotAt(paperBrand.current?.querySelector('.brand__dot')), 300)
    if (!layer) return
    if (reduced() || !at || !layer.animate) {
      await fade(layer, reducedPlan().fade, 1, 0).finished.catch(() => {})
    } else {
      const t = tintTimes(IRIS_MS)
      irisClose(layer, { ...at, w: innerWidth, h: innerHeight, duration: IRIS_MS, easing: IRIS })
      const dot = layer.querySelector('.ob__brand .brand__dot')
      if (dot) fade(dot, t.dotEnd, 1, 0, 'ease-out')
      tint(layer, rootColor('--brand-red'), rootColor('--accent'), { delay: t.tintStart, duration: t.tintDur })
      await sleep(t.end)
    }
    setRed(false)
    setPhase('open')
  }
  // Terug naar de intro: de laag komt terug en opent (zie de layout-effect); `apply` daarna.
  const backToIntro = (apply) => {
    afterOpen.current = apply
    setRed(true)
    setPhase('opening')
  }
  // Tussen papieren pagina's: even uit en weer in.
  const go = async (apply) => {
    const col = paperCol.current
    const moves = !reduced() && !!col?.animate
    if (moves) await fade(col, STEP_OUT_MS, 1, 0, 'ease-out').finished.catch(() => {})
    apply()
    if (moves) fade(col, STEP_IN_MS, 0, 1, 'ease-in').finished.then(() => clear(col)).catch(() => {})
  }
  const show = (v) =>
    go(() => {
      setView(v)
      setQuery('')
      setPeekOpen(false)
    })

  // ---- Keuzes ----
  const pickSource = (id) => setEdited(toggleFollow(mine, id))
  const finish = (choice = {}) => onDone({ interests, topics, sources: mine, all: pickable, vak, ...choice })
  // "Liever meteen lezen": de startset met gratis bronnen, zonder interesses, onderwerpen of vak.
  const startQuick = () => onDone({ interests: [], topics: [], sources: startIds(pickable), all: pickable, quick: true })
  // Later kiezen bij de interesses: zoals het was (de eerste keer dus leeg), door naar de bronnen.
  const laterInterests = () =>
    go(() => {
      setInterests(prefs.interests || [])
      setVak(prefs.vak || [])
      setView('bronnen')
      setQuery('')
      setPeekOpen(false)
    })
  // Later kiezen bij de bronnen: zoals het was, en de eerste keer zonder iets gevolgd het gratis begin.
  const laterSources = () => finish({ sources: mine.length ? mine : reopen ? initial : startIds(pickable) })

  const previous = () => {
    if (view === 'uitleg') backToIntro(() => setView('intro'))
    else if (view === 'interesses') reopen ? onClose() : show('uitleg')
    else if (view === 'bronnen') show('interesses')
  }
  const topLink = reopen && view === 'interesses' ? (
    <button type="button" className="linkbtn linkbtn--plain ob__back" onClick={onClose}>
      Sluiten
    </button>
  ) : (
    <BackButton label="Terug" onClick={previous} className="ob__back" />
  )

  // Het papier staat onder het rood: niet te bedienen zolang de rode laag er is (ook tijdens de
  // iris); de rode laag zelf niet zodra ze sluit of nog opent. Vervaagt het hele scherm
  // (`leaving`), dan is niets erin te bedienen en is het voor schermlezers al weg.
  return (
    <div className="welcome ob" role="dialog" aria-modal={leaving ? undefined : 'true'} aria-labelledby="ob-title" aria-hidden={leaving ? 'true' : undefined} inert={leaving ? '' : undefined} ref={root}>
      {paper ? (
        <>
          <div className="col ob__head" inert={red ? '' : undefined}>
            <div className="ob__top">
              <span className="ob__brand" ref={paperBrand}>
                <BrandLogo height={20} />
              </span>
              {topLink}
            </div>
          </div>
          <div className="ob__scroll" ref={scroller} inert={red ? '' : undefined}>
            <div className={`col ob__col${view === 'bronnen' ? ' ob__col--split' : ''}`} ref={paperCol}>
              {view === 'uitleg' ? (
                <Uitleg head={head} />
              ) : view === 'bronnen' ? (
                <Bronnen head={head} sources={pickable} items={items} mine={mine} interests={interests} onPick={pickSource} onAll={(ids, on) => setEdited(on ? [...new Set([...mine, ...ids])] : mine.filter((x) => !ids.includes(x)))} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} more={more} setMore={setMore} />
              ) : (
                <Interesses head={head} interests={interests} onInterest={(id) => setInterests((l) => toggleIn(l, id))} vak={vak} onVak={(id) => setVak((l) => toggleIn(l, id))} open={selOpen} setOpen={setSelOpen} />
              )}
            </div>
          </div>
          <div className="ob__foot" inert={red ? '' : undefined}>
            {view === 'bronnen' ? <PeekBar open={peekOpen} setOpen={setPeekOpen} sources={pickable} items={items} mine={mine} /> : null}
            <div className="col">
              {view === 'uitleg' ? (
                <>
                  <button type="button" className="btn btn--lg ob__cta" onClick={() => show('interesses')}>
                    Kies je interesses
                  </button>
                  <button type="button" className="linkbtn linkbtn--plain ob__skip" onClick={startQuick} disabled={!pickable.length}>
                    Liever meteen lezen
                  </button>
                </>
              ) : view === 'bronnen' ? (
                <>
                  <p className="ob__status" role="status">
                    {pickable.length ? followedLine(mine.length) : 'Bronnen laden…'}
                  </p>
                  <button type="button" className="btn btn--lg ob__cta" onClick={() => finish()} disabled={!mine.length}>
                    Naar je Editie
                  </button>
                  <button type="button" className="linkbtn linkbtn--plain ob__skip" onClick={laterSources} disabled={!pickable.length}>
                    Later kiezen
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn--lg ob__cta" onClick={() => show('bronnen')}>
                    Verder
                  </button>
                  <button type="button" className="linkbtn linkbtn--plain ob__skip" onClick={laterInterests}>
                    Later kiezen
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      ) : null}

      {red ? (
        <div className="ob__red ob--open" ref={redRef} inert={phase !== 'open' ? '' : undefined} aria-hidden={phase === 'closing' ? 'true' : undefined}>
          <div className="col ob__head">
            <div className="ob__top">
              <span className="ob__brand">
                <BrandLogo height={20} />
              </span>
              {onSignIn ? (
                <>
                  <button type="button" className="linkbtn linkbtn--plain ob__login" onClick={onSignIn} title="Lezen kan ook zonder account." aria-describedby="ob-login-hint">
                    Account
                  </button>
                  <span id="ob-login-hint" className="visually-hidden">
                    Lezen kan ook zonder account.
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <div className="col ob__mid">
            <SunArt kind="intro" className="ob__art" />
            <h1 id={paper ? undefined : 'ob-title'} ref={redHead} tabIndex={-1} className="ob__hero">
              Minder scrollen.
              <br />
              Meer lezen.
            </h1>
            <p className="ob__lede">Het nieuws van jouw bronnen, rustig op een rij.</p>
          </div>
          <div className="ob__foot">
            <div className="col">
              <button type="button" className="btn btn--lg ob__cta" onClick={() => leaveIntro(() => setView('uitleg'))}>
                Begin
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ---- 2. Zo werkt Hoot: drie gelijken, elk met zijn eigen zon ----
function Uitleg({ head }) {
  return (
    <>
      <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
        Zo werkt Hoot
      </h1>
      <p className="ob__sub">Drie manieren om bij te blijven. Jij kiest de bronnen.</p>
      <ul className="ob__trio">
        {TRIO.map((t) => (
          <li key={t.kind} className="ob__trow">
            <SunArt kind={t.kind} className="ob__tart" />
            <div>
              <h2 className="ob__tname">{t.title}</h2>
              <p className="ob__ttext">{t.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

// ---- 4. Volg je bronnen: de Basis, dan een blok per gekozen interesse ----
function Bronnen({ head, sources, items, mine, interests, onPick, onAll, query, setQuery, filter, setFilter, more, setMore }) {
  const start = useMemo(() => freeStart(sources), [sources])
  const basis = useMemo(() => basisSources(sources), [sources])
  const blocks = useMemo(() => interestBlocks(sources, interests), [sources, interests])
  const rest = useMemo(() => moreGroups(sources, interests), [sources, interests])
  const startOn = start.length > 0 && start.every((s) => mine.includes(s.id))
  // Eén aanrader per blok: in de Basis het gratis begin, in een blok alleen zijn eigen aanrader.
  const row = (s, picks = new Set()) => <SourceRow key={s.id} s={s} on={mine.includes(s.id)} pick={picks.has(s.id)} onPick={onPick} />
  const startIds = new Set(start.map((s) => s.id))
  const restCount = rest.reduce((n, g) => n + g.sources.length, 0)
  const q = query.trim()
  let body
  if (!sources.length) body = null
  else if (q) {
    const hits = findSources(sources, q)
    body = hits.length ? (
      <ul className="ob__list">{hits.map((s) => row(s))}</ul>
    ) : (
      <p className="ob__empty" role="status">
        Niets gevonden voor ‘{q}’. Probeer een andere naam.
      </p>
    )
  } else if (filter === 'gevolgd') {
    const list = followedSources(sources, mine)
    body = list.length ? <ul className="ob__list">{list.map((s) => row(s))}</ul> : <p className="ob__empty">Je volgt nog niets. Begin bij de Basis.</p>
  } else {
    body = (
      <>
        {basis.length ? (
          <section className="ob__group" aria-labelledby="ob-basis">
            <div className="ob__ghead">
              <h2 id="ob-basis" className="label label--section">
                Basis
              </h2>
              {start.length ? (
                <button type="button" className="linkbtn ob__all" aria-pressed={startOn} onClick={() => onAll(start.map((s) => s.id), !startOn)}>
                  {startOn ? 'Alle drie gevolgd' : 'Volg alle drie'}
                </button>
              ) : null}
            </div>
            <ul className="ob__list">{basis.map((s) => row(s, startIds))}</ul>
          </section>
        ) : null}
        {blocks.map((b) => (
          <section key={b.id} className="ob__group" aria-labelledby={`ob-b-${b.id}`}>
            <div className="ob__ghead">
              <h2 id={`ob-b-${b.id}`} className="label label--section">
                {b.label}
              </h2>
              <span className="ob__gcount">{b.sources.length}</span>
            </div>
            <ul className="ob__list">{b.sources.map((s) => row(s, new Set([b.pick])))}</ul>
          </section>
        ))}
        {restCount ? (
          more ? (
            rest.map((g) => (
              <section key={g.cat} className="ob__group" aria-labelledby={`ob-g-${g.cat}`}>
                <div className="ob__ghead">
                  <h2 id={`ob-g-${g.cat}`} className="label label--section">
                    {g.label}
                  </h2>
                  <span className="ob__gcount">{g.sources.length}</span>
                </div>
                <ul className="ob__list">{g.sources.map((s) => row(s, new Set()))}</ul>
              </section>
            ))
          ) : (
            <button type="button" className="ob__more" aria-expanded="false" onClick={() => setMore(true)}>
              <span className="label label--section">Meer bronnen</span>
              <span className="ob__morehint">Toon {restCount}</span>
            </button>
          )
        ) : null}
      </>
    )
  }
  return (
    <div className="ob__split">
      <div className="ob__main">
        <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
          Volg je bronnen
        </h1>
        <p className="ob__sub">Kies wie je wilt lezen. Je Editie komt uit wat je volgt.</p>
        <div className="ob__search">
          <SearchIcon />
          <label className="visually-hidden" htmlFor="ob-q">
            Zoek een bron
          </label>
          <input id="ob-q" className="input" type="search" placeholder="Zoek een bron" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="chips ob__filter" role="group" aria-label="Toon">
          {[
            ['aanbevolen', 'Aanbevolen'],
            ['gevolgd', mine.length ? `Gevolgd · ${mine.length}` : 'Gevolgd'],
          ].map(([v, l]) => (
            <button key={v} type="button" className="pill" aria-pressed={filter === v && !q} onClick={() => (setFilter(v), setQuery(''))}>
              {l}
            </button>
          ))}
        </div>
        {body}
      </div>
      <aside className="ob__peek" aria-label="Voorbeeld van je Editie">
        <Peek sources={sources} items={items} mine={mine} />
      </aside>
    </div>
  )
}

// Eén bron: logo, naam, omschrijving, gratis (of de gratis aanrader van zijn blok) of abonnement, en
// Volg / Volgend. Alles in inkt: het enige accent op dit scherm is de punt van het woordmerk.
function SourceRow({ s, on, pick = false, onPick }) {
  return (
    <li className="ob__src">
      <SourceMark source={s} size={40} />
      <div className="ob__stext">
        <span className="ob__sname">{s.name}</span>
        {s.about ? <span className="ob__sabout">{s.about}</span> : null}
        <span className="ob__smeta">
          {s.paid ? 'Abonnement' : pick ? 'Gratis aanrader' : 'Gratis'}
          {s.lang === 'en' ? ' · Engels' : ''}
        </span>
      </div>
      <button type="button" className={`btn ob__follow${on ? ' btn--quiet' : ''}`} aria-pressed={on} aria-label={`${s.name} ${on ? 'volgend' : 'volgen'}`} onClick={() => onPick(s.id)}>
        {on ? <CheckIcon /> : null}
        {on ? 'Volgend' : 'Volg'}
      </button>
    </li>
  )
}

// Het meegroeiende voorbeeld: de nieuwste kop van elke bron die je volgt (echte koppen).
function Peek({ sources, items, mine, bare = false }) {
  const lines = useMemo(() => previewLines(items, sources, mine, 4), [items, sources, mine])
  const names = (mine.length ? followedSources(sources, mine) : freeStart(sources)).map((s) => s.name)
  return (
    <>
      {bare ? null : (
        <>
          <p className="label label--meta">Voorbeeld</p>
          <h2 className="ob__peektitle">Zo ziet je Editie eruit</h2>
        </>
      )}
      {lines.length ? (
        <ol className="ob__lines">
          {lines.map((l, i) => (
            <li key={l.id} className="ob__line">
              <span className="ob__ln" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <span className="ob__lt">{l.title}</span>
                <span className="ob__ls">{l.source.name}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="ob__peeknote">Uit {sourceLine(names)}.</p>
      )}
      {mine.length ? null : <p className="ob__peeknote">Je volgt nog niets; dit is het gratis begin.</p>}
    </>
  )
}

// Op een smal scherm: het voorbeeld in een uitklapbalk boven de knop.
function PeekBar({ open, setOpen, sources, items, mine }) {
  return (
    <div className="ob__peekbar">
      <div className="col">
        <button type="button" className="ob__bar" aria-expanded={open} aria-controls="ob-peekbody" onClick={() => setOpen(!open)}>
          <span>
            <span className="ob__bartitle">Zo ziet je Editie eruit</span>
            <span className="ob__barsub">{mine.length ? `Uit ${sourceLine(followedSources(sources, mine).map((s) => s.name))}` : 'Gratis begin'}</span>
          </span>
          <span className="caret" aria-hidden="true">
            <CaretIcon dir={open ? 'up' : 'down'} size={ICON_SM} />
          </span>
        </button>
        {open ? (
          <div className="ob__barbody" id="ob-peekbody">
            <Peek sources={sources} items={items} mine={mine} bare />
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ---- 3. Wat interesseert je? Rubrieken en, uitklapbaar, je Selectie ----
function Interesses({ head, interests, onInterest, vak, onVak, open, setOpen }) {
  const domains = useMemo(() => vakByDomain(), [])
  return (
    <>
      <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
        Wat interesseert je?
      </h1>
      <p className="ob__sub">Dit worden je tabs in de Stroom. Daarna kies je je bronnen.</p>
      <div className="chips ob__rubrieken" role="group" aria-label="Rubrieken">
        {INTERESTS.map((i) => (
          <button key={i.id} type="button" className="pill" aria-pressed={interests.includes(i.id)} onClick={() => onInterest(i.id)}>
            {i.label}
          </button>
        ))}
      </div>
      <button type="button" className="ob__disclose" aria-expanded={open} aria-controls="ob-sel" onClick={() => setOpen(!open)}>
        <span>
          <span className="ob__dtitle">Kies onderwerpen voor je Selectie</span>
          <span className="ob__dsub">{vak.length ? `${vak.length} gekozen` : 'Mag ook later'}</span>
        </span>
        <span className="caret" aria-hidden="true">
          <CaretIcon dir={open ? 'up' : 'down'} size={ICON_SM} />
        </span>
      </button>
      {open ? (
        <div id="ob-sel" className="ob__sel">
          <p className="ob__selnote">Elke maandag het beste over je werk of hobby.</p>
          {domains.map((d) => (
            <ChipGroup key={d.id} label={d.label} level={2} className="ob__domain">
              {d.fields.map((f) => (
                <button key={f.id} type="button" className="pill" aria-pressed={vak.includes(f.id)} onClick={() => onVak(f.id)}>
                  {f.label}
                </button>
              ))}
            </ChipGroup>
          ))}
        </div>
      ) : null}
    </>
  )
}
