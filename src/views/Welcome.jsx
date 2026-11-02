import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SourceMark } from '../components/Items.jsx'
import { BackButton } from '../components/Shell.jsx'
import { ChipGroup } from '../components/ChipGroup.jsx'
import { BrandLogo, useBrandBar } from '../components/Brand.jsx'
import SunArt from '../components/SunArt.jsx'
import { CaretIcon, INTEREST_ICONS } from '../components/icons.jsx'
import { vakByDomain } from '../../shared/vak.mjs'
import { INTERESTS, STARTER, topicById, resolveTopics, starterGroups } from '../lib/topics.js'
import { sourcesOn, proposeSources, moreSources, packPages, pickedFrom } from '../lib/welcome.js'
import { reduced, irisClose, irisOpen, irisKeyframes, fade, tint, clear, dotAt, waitFor, sleep, tintTimes, openTimes, reducedPlan, crossPlan, rootColor, IRIS, IRIS_BACK, IRIS_MS, STEP_OUT_MS, STEP_IN_MS } from '../lib/motion.js'

// Onboarding, gelijk aan de app (ios/Hoot/Views/WelcomeView.swift) en zonder scrollen: elke pagina
// past in één scherm, ook op 375 × 667. Wat niet past (pillen) verdeelt `Paged` over meer pagina's.
//   intro (rood)  → drie veegpagina's (Editie, Stroom, Selectie), elk met zijn zon
//   → interesses (tegels) → Wat precies? (eigen pagina, alle pillen open, Overslaan)
//   → Je bronnen (compact raster met echte logo’s, direct aan/uit; Meer bronnen bladert)
//   → Je Selectie (eigen stap, optioneel) → de Editie.
// Niets staat vooraf aan: het voorstel voor de bronnen is voor iedereen gelijk (alleen gratis,
// Nederlands eerst, zie lib/welcome.js) en de interesses, onderwerpen en Selectie beginnen leeg.
// Knoppen staan pas op de laatste veegpagina; eerder veeg je (muis slepen, trackpad, pijltjes) of
// tik je op 'Veeg verder →' (de enige hint, zoals het plan).
// Bovenaan op elke pagina het kleine woordmerk linksboven, rechts Inloggen of Terug.
// De rode intro is een eigen laag (.ob__red) over de papieren pagina heen: de schijf van de iris.
// Van rood naar papier krimpt het rood als cirkel tot de punt van het kleine woordmerk op papier
// (0,7 s, zie lib/motion.js); de rand veegt de papieren letters weg en de inkt staat eronder. Terug
// speelt het omgekeerd. Bij Minder beweging één fade van 0,35 s. Tussen papieren pagina's even uit
// en weer in, zoals de app.
// Weg uit Welkom (`leaving`, App.jsx zet het bij Naar je Editie en bij sluiten): het hele scherm
// vervaagt in 0,45 s over de Editie die eronder al staat (zie crossPlan in lib/motion.js), dan meldt
// `onLeft` dat het weg kan. Intussen is het niet meer te bedienen.
// Opnieuw kiezen (vanuit Bronnen of Instellingen, `onClose` is er dan): geen intro, je begint bij de
// interesses met je huidige keuze, sluiten (ook met Escape) slaat niets op, en "Liever meteen
// lezen" is er niet.

// De veegpagina's: elk met zijn zon (components/SunArt.jsx).
const PAGES = [
  { kind: 'editie', title: 'Je Editie', text: 'Drie keer per dag hooguit tien verhalen. Dan ben je bij.' },
  { kind: 'stroom', title: 'De Stroom', text: 'Alles van je bronnen, nieuwste eerst.' },
  { kind: 'selectie', title: 'Je Selectie', text: 'Eén keer per week bijgepraat over wat jou bezighoudt.' },
]
const DOTS = PAGES.length + 1 // de intro telt mee
const SWIPE_PX = 48

const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export default function Welcome({ sources, prefs, muted = new Set(), onDone, onClose = null, onSignIn = null, leaving = false, onLeft = () => {} }) {
  const reopen = !!onClose
  const [view, setView] = useState(reopen ? 'kies' : 'intro') // intro | pager | kies | precies | hoot | bronnen | selectie
  const [pg, setPg] = useState(0) // de veegpagina (0 = Editie)
  const [sub, setSub] = useState(0) // de subpagina van Wat precies?, Je bronnen en Je Selectie
  const [pages, setPages] = useState(1) // hoeveel subpagina's er nu zijn
  const sourceReturn = useRef({ view: 'hoot', sub: 0, pages: 1 })
  const [interests, setInterests] = useState(() => prefs.interests || [])
  const [picked, setPicked] = useState(() => pickedFrom(prefs.topics || [], prefs.interests || [], INTERESTS))
  const [edited, setEdited] = useState(null) // je eigen bronnenkeuze; zolang null geldt het voorstel
  const [vak, setVak] = useState(() => prefs.vak || [])
  const [red, setRed] = useState(!reopen) // de rode intro-laag staat er (ook nog tijdens het sluiten)
  const [phase, setPhase] = useState('open') // 'open' | 'closing' (rood → papier) | 'opening' (terug)
  const head = useRef(null) // de kop van de papieren pagina
  const redHead = useRef(null) // de kop op het rood
  const root = useRef(null) // .ob
  const paperCol = useRef(null) // de papieren kolom: vervaagt even tussen pagina's
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
    const { fade: ms, easing } = crossPlan()
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
  const byId = useMemo(() => new Map(pickable.map((s) => [s.id, s])), [pickable])
  // Je bronnen: je eigen keuze, anders het voorstel bij je interesses (voor iedereen gelijk: alleen
  // gratis, Nederlands eerst). Opnieuw kiezen begint bij wat nu aan staat.
  const proposal = useMemo(() => (reopen ? sourcesOn(pickable, muted) : proposeSources(pickable, interests)), [reopen, pickable, muted, interests])
  const mine = edited ?? proposal

  // Nieuwe pagina: de kop voorlezen (schermlezer), pas als de overgang klaar is.
  useEffect(() => {
    if (phase !== 'open') return
    ;(red ? redHead : head).current?.focus({ preventScroll: true })
  }, [view, pg, sub, red, phase])

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
  // papieren woordmerk zijn plek heeft (een beeld of twee), sluit de iris tot zijn punt. De papieren
  // punt op het rood gaat op in het rood, en het laatste stuk kleurt het rood mee naar de punt. Zonder
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
  const show = (v, n = 0) =>
    go(() => {
      setView(v)
      setSub(n)
    })

  // ---- Vegen ----
  // Op de intro en de veegpagina's: naar links is verder, naar rechts terug. Muis slepen, trackpad
  // (zijwaarts), swipe en de pijltjestoetsen doen hetzelfde als de link en de bolletjes.
  const live = (view === 'intro' || view === 'pager') && phase === 'open' && !leaving
  const forward = () => {
    if (view === 'intro') leaveIntro(() => (setView('pager'), setPg(0)))
    else if (view === 'pager' && pg < PAGES.length - 1) setPg(pg + 1)
  }
  const backward = () => {
    if (view === 'pager') {
      if (pg > 0) setPg(pg - 1)
      else backToIntro(() => setView('intro'))
    }
  }
  const jump = (i) => {
    if (i === (view === 'intro' ? 0 : pg + 1)) return
    if (i === 0) backToIntro(() => setView('intro'))
    else if (view === 'intro') leaveIntro(() => (setView('pager'), setPg(i - 1)))
    else setPg(i - 1)
  }
  const swipe = useRef(null)
  const fwd = useRef(forward)
  const bwd = useRef(backward)
  fwd.current = forward
  bwd.current = backward
  const onDown = (e) => {
    if (live) swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onUp = (e) => {
    const s = swipe.current
    swipe.current = null
    if (!s || !live) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
    dx < 0 ? forward() : backward()
  }
  const wheelAt = useRef(0)
  const onWheel = (e) => {
    if (!live || Math.abs(e.deltaX) < 30 || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return
    if (e.timeStamp - wheelAt.current < 700) return
    wheelAt.current = e.timeStamp
    e.deltaX > 0 ? forward() : backward()
  }
  useEffect(() => {
    if (!live) return
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'ArrowRight') fwd.current()
      else if (e.key === 'ArrowLeft') bwd.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [live])

  // ---- Keuzes ----
  const pickInterest = (id) => setInterests((l) => toggleIn(l, id))
  const pickTopic = (id) => setPicked((l) => toggleIn(l, id))
  const allOf = (i) => setPicked((l) => l.filter((t) => !i.topics.includes(t)))
  const pickSource = (id) => setEdited(mine.includes(id) ? mine.filter((x) => x !== id) : [...mine, id])
  const finish = () => onDone({ interests, topics, sources: mine, all: pickable, vak })
  // "Liever meteen lezen": de startset met gratis bronnen, zonder interesses, onderwerpen of vak.
  const startIds = () => {
    const ids = starterGroups(pickable).flatMap((g) => g.sources.map((x) => x.id))
    return ids.length ? ids : STARTER.flatMap((g) => g.ids)
  }
  const startQuick = () => onDone({ interests: [], topics: [], sources: startIds(), all: pickable })

  // Wat precies?: per gekozen interesse een groep, met 'Alles' vooraan. Je Selectie: per domein.
  const fineGroups = INTERESTS.filter((i) => interests.includes(i.id)).map((i) => {
    const Icon = INTEREST_ICONS[i.id]
    const mineTopics = picked.filter((t) => i.topics.includes(t))
    return {
      key: i.id,
      label: i.label,
      icon: <Icon />,
      all: { on: !mineTopics.length, click: () => allOf(i) },
      items: i.topics.map(topicById).map((t) => ({ id: t.id, label: t.label, on: picked.includes(t.id) })),
      toggle: pickTopic,
    }
  })
  const vakGroups = vakByDomain().map((d) => ({
    key: d.id,
    label: d.label,
    items: d.fields.map((f) => ({ id: f.id, label: f.label, on: vak.includes(f.id) })),
    toggle: (id) => setVak((l) => toggleIn(l, id)),
  }))
  const last = sub >= pages - 1 // de laatste subpagina
  useEffect(() => {
    if (sub > pages - 1) setSub(Math.max(0, pages - 1))
  }, [sub, pages])

  // Je bronnen: het voorstel eerst, dan wat verder bij je interesses past. De volgorde ligt vast, ook
  // als je iets aan- of uitzet: een rij blijft op zijn plek.
  const rows = useMemo(() => [...new Set([...proposal, ...moreSources(pickable, interests, []), ...pickable.map(s => s.id)])].filter((id) => byId.has(id)), [proposal, pickable, interests, byId])

  // ---- Wat er onder de kop staat, per pagina ----
  const next = () => {
    if (view === 'kies') show('precies')
    else if (view === 'precies') (last ? show('hoot') : show('precies', sub + 1))
    else if (view === 'selectie') (last ? finish() : show('selectie', sub + 1))
    else if (view === 'bronnen' || view === 'hoot') {
      sourceReturn.current = { view, sub, pages }
      show('selectie')
    }
  }
  const previous = () => {
    if (view === 'kies') backToPager()
    else if (view === 'precies') (sub > 0 ? show('precies', sub - 1) : show('kies'))
    else if (view === 'hoot') (sub > 0 ? show('hoot', sub - 1) : show('precies'))
    else if (view === 'bronnen') (sub > 0 ? show('bronnen', sub - 1) : show('hoot'))
    else if (view === 'selectie') (sub > 0 ? show('selectie', sub - 1) : go(() => {
      setView(sourceReturn.current.view)
      setSub(sourceReturn.current.sub)
      setPages(sourceReturn.current.pages)
    }))
  }
  const backToPager = () =>
    go(() => {
      setView('pager')
      setPg(PAGES.length - 1)
    })
  const cta =
    view === 'kies'
      ? { label: interests.length ? 'Verder' : 'Kies minstens één', disabled: !interests.length }
      : view === 'hoot'
        ? { label: mine.length ? 'Naar Selectie' : 'Kies één bron', disabled: !mine.length || !pickable.length }
        : view === 'bronnen'
          ? { label: 'Naar Selectie', disabled: !mine.length || !pickable.length }
          : view === 'selectie'
            ? { label: last ? (vak.length ? 'Klaar' : 'Later kiezen') : 'Verder' }
          : { label: 'Verder' }
  const skip =
    view === 'precies'
      ? { label: 'Overslaan', onClick: () => go(() => (setPicked([]), setView('hoot'), setSub(0))) } // overslaan = alles: wat je aantikte vervalt
      : view === 'selectie' && !last
        ? { label: vak.length ? 'Klaar' : 'Later kiezen', onClick: finish }
        : view === 'selectie'
          ? null
        : view === 'hoot' || view === 'bronnen'
          ? { label: last ? 'Eerste bronnen' : 'Meer bronnen', onClick: () => show(view, last ? 0 : sub + 1), hidden: pages <= 1 }
          : reopen
          ? { label: 'Sluiten zonder opslaan', onClick: onClose }
          : null
  const counter = view === 'hoot' || view === 'precies' || view === 'selectie' || view === 'bronnen'
  const topLink = reopen && view === 'kies' ? null : <BackButton label="Terug" onClick={previous} className="ob__back" />

  // Het papier staat onder het rood: niet te bedienen zolang de rode laag er is (ook tijdens de
  // iris); de rode laag zelf niet zodra ze sluit of nog opent. Tijdens het sluiten is het rood ook
  // voor schermlezers al weg. Vervaagt het hele scherm (`leaving`), dan is niets erin te bedienen
  // en is het voor schermlezers al weg.
  return (
    <div className={`welcome ob${view === 'hoot' || view === 'bronnen' ? ' ob--sources' : ''}`} role="dialog" aria-modal={leaving ? undefined : 'true'} aria-labelledby="ob-title" aria-hidden={leaving ? 'true' : undefined} inert={leaving ? '' : undefined} ref={root} onPointerDown={onDown} onPointerUp={onUp} onWheel={onWheel}>
      {paper ? (
        <div className="col ob__head" inert={red ? '' : undefined}>
          <div className="ob__top">
            <span className="ob__brand" ref={paperBrand}>
              <BrandLogo height={20} />
            </span>
            {view === 'pager' ? (
              onSignIn ? (
                <button type="button" className="linkbtn linkbtn--plain ob__login" onClick={onSignIn} title="Een account is op uitnodiging. Lezen kan zonder account.">
                  Inloggen
                </button>
              ) : null
            ) : (
              topLink
            )}
          </div>
        </div>
      ) : null}

      {view === 'pager' ? (
        <>
          <div className="col ob__col ob__pager" ref={paperCol} style={{ '--pg': pg }} inert={red ? '' : undefined}>
            <div className="ob__track">
              {PAGES.map((p, i) => (
                <section key={p.kind} className="ob__page" aria-hidden={i === pg ? undefined : 'true'} inert={i === pg ? undefined : ''}>
                  <SunArt kind={p.kind} className="ob__art" />
                  <h1 id={i === pg ? 'ob-title' : undefined} ref={i === pg ? head : null} tabIndex={-1} className="ob__pagetitle">
                    {p.title}
                  </h1>
                  <p className="ob__lede">{p.text}</p>
                </section>
              ))}
            </div>
            <button type="button" className="ob__nav ob__nav--l" aria-label="Vorige" onClick={backward}>
              <CaretIcon dir="left" />
            </button>
            {pg < PAGES.length - 1 ? (
              <button type="button" className="ob__nav ob__nav--r" aria-label="Volgende" onClick={forward}>
                <CaretIcon />
              </button>
            ) : null}
          </div>
          <div className="ob__foot ob__foot--pager" inert={red ? '' : undefined}>
            <div className="col">
              <Dots cur={pg + 1} onPick={jump} />
              <div className="ob__slot">
                <div data-shown={pg < PAGES.length - 1} inert={pg < PAGES.length - 1 ? undefined : ''}>
                  <button type="button" className="ob__next" onClick={forward}>
                    <u>Veeg verder</u>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
                <div data-shown={pg === PAGES.length - 1} inert={pg === PAGES.length - 1 ? undefined : ''}>
                  <button type="button" className="btn btn--lg ob__cta" onClick={() => show('kies')}>
                    Stel je Hoot samen
                  </button>
                  <button type="button" className="linkbtn linkbtn--plain ob__skip" onClick={startQuick} disabled={!pickable.length}>
                    Liever meteen lezen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : paper ? (
        <>
          <div className="col ob__col" ref={paperCol} inert={red ? '' : undefined}>
            {view === 'kies' ? (
              <>
                <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
                  Wat interesseert je?
                </h1>
                <p className="ob__sub">Kies er een paar. Daarmee maken we je Editie en kiezen we je bronnen.</p>
                <div className="ob__grid">
                  {INTERESTS.map((i) => {
                    const Icon = INTEREST_ICONS[i.id]
                    return (
                      <button key={i.id} type="button" className="ob__tile" aria-pressed={interests.includes(i.id)} onClick={() => pickInterest(i.id)}>
                        <span className="ob__ticon">
                          <Icon />
                        </span>
                        <span className="ob__tlabel">{i.label}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : view === 'precies' ? (
              <>
                <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
                  Wat precies?
                </h1>
                <p className="ob__sub">Kies wat je wilt volgen, of sla over voor alles.</p>
                <Paged groups={fineGroups} page={sub} onPages={setPages} />
              </>
            ) : view === 'bronnen' ? (
              <>
                <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
                  Je bronnen
                </h1>
                <p className="ob__sub">Voorgesteld bij je interesses. Tik om te wijzigen.</p>
                <p className="ob__sourcecount" role="status">{mine.length} gekozen</p>
                <PagedSourceGrid ids={rows} byId={byId} on={mine} onPick={pickSource} page={sub} onPages={setPages} />
              </>
            ) : view === 'selectie' ? (
              <>
                <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
                  Je Selectie
                </h1>
                <p className="ob__sub">Elke maandag de drie beste stukken van de week, per onderwerp. Kies wat bij je werk of hobby past.</p>
                <Paged groups={vakGroups} page={sub} onPages={setPages} />
              </>
            ) : (
              <>
                <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
                  Je bronnen
                </h1>
                <p className="ob__sub">Voorgesteld bij je interesses. Tik om te wijzigen.</p>
                <p className="ob__sourcecount" role="status">{mine.length} gekozen</p>
                {pickable.length ? <PagedSourceGrid ids={rows} byId={byId} on={mine} onPick={pickSource} page={sub} onPages={setPages} /> : <p role="status">Bronnen laden…</p>}
              </>
            )}
          </div>
          <div className="ob__foot" inert={red ? '' : undefined}>
            <div className="col">
              {counter ? (
                <p className="ob__pages" aria-live="polite">
                  {pages > 1 ? `Pagina ${Math.min(sub, pages - 1) + 1} van ${pages}` : ''}
                </p>
              ) : null}
              <button type="button" className="btn btn--lg ob__cta" onClick={next} disabled={cta.disabled}>
                {cta.label}
              </button>
              {skip ? (
                <button type="button" className="linkbtn linkbtn--plain ob__skip" onClick={skip.onClick} style={skip.hidden ? { visibility: 'hidden' } : undefined} aria-hidden={skip.hidden ? 'true' : undefined} tabIndex={skip.hidden ? -1 : undefined}>
                  {skip.label}
                </button>
              ) : null}
              {reopen && (view === 'hoot' || view === 'bronnen') ? (
                <button type="button" className="linkbtn linkbtn--plain ob__skip" onClick={onClose}>Sluiten zonder opslaan</button>
              ) : null}
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
                  <button type="button" className="linkbtn linkbtn--plain ob__login" onClick={onSignIn} title="Een account is op uitnodiging. Lezen kan zonder account." aria-describedby="ob-login-hint">
                    Inloggen
                  </button>
                  <span id="ob-login-hint" className="visually-hidden">
                    Een account is op uitnodiging. Lezen kan zonder account.
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <div className="col ob__col ob__mid">
            <SunArt kind="intro" className="ob__art" />
            <h1 id={paper ? undefined : 'ob-title'} ref={redHead} tabIndex={-1} className="ob__hero">
              Minder scrollen.
              <br />
              Meer lezen.
            </h1>
            <p className="ob__lede">Het nieuws van jouw bronnen, rustig op een rij.</p>
          </div>
          <div className="ob__foot ob__foot--pager">
            <div className="col">
              <Dots cur={0} onPick={jump} />
              <div className="ob__slot">
                <div data-shown="true">
                  <button type="button" className="ob__next" onClick={forward}>
                    <u>Veeg verder</u>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// De bolletjes onder de veegpagina's; de intro is het eerste. Elk is een knop (toetsenbord, schermlezer).
function Dots({ cur, onPick }) {
  return (
    <div className="ob__dots" role="group" aria-label="Pagina's">
      {Array.from({ length: DOTS }, (_, i) => (
        <button key={i} type="button" className="ob__dot" aria-label={`Pagina ${i + 1} van ${DOTS}`} aria-current={i === cur} onClick={() => onPick(i)} />
      ))}
    </div>
  )
}

// Eén groep pillen: een label, 'Alles' vooraan (Wat precies?) en de pillen.
function Group({ g }) {
  return (
    <ChipGroup label={g.label} icon={g.icon} level={2} className="ob__group" labelClassName="ob__gtitle">
      {g.all ? (
        <button type="button" className="pill ob__chip" aria-pressed={g.all.on} onClick={g.all.click}>
          Alles
        </button>
      ) : null}
      {g.items.map((it) => (
        <button key={it.id} type="button" className="pill ob__chip" aria-pressed={it.on} onClick={() => g.toggle(it.id)}>
          {it.label}
        </button>
      ))}
    </ChipGroup>
  )
}

// Groepen pillen zonder scrollen: wat op de pagina past staat erop, de rest op de volgende. Een
// verborgen kopie van alle groepen, met de keuze zoals die nu is, wordt gemeten tegen de hoogte die
// de pagina heeft (packPages in lib/welcome.js); bij elke maatwijziging en elke tik opnieuw. Zo
// telt een pagina niet met het slechtste geval en staan er geen halflege pagina's.
function Paged({ groups, page, onPages }) {
  const fit = useRef(null)
  const meas = useRef(null)
  const [pages, setPages] = useState(() => [groups.map((_, i) => i)])
  const measure = useCallback(() => {
    const f = fit.current
    const m = meas.current
    if (!f || !m) return
    const gap = parseFloat(getComputedStyle(m).rowGap) || 0
    const next = packPages([...m.children].map((k) => k.offsetHeight), f.clientHeight, gap)
    setPages((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
  }, [])
  useLayoutEffect(measure) // na elke tekening: een tik kan een pil breder maken (het vinkje)
  useEffect(() => {
    const f = fit.current
    if (!f) return
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    ro?.observe(f)
    document.fonts?.ready?.then(measure)
    addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      removeEventListener('resize', measure)
    }
  }, [measure])
  useEffect(() => onPages(pages.length), [pages.length, onPages])
  const cur = pages[Math.min(page, pages.length - 1)] || []
  return (
    <div className="ob__fit" ref={fit}>
      <div className="ob__groups">
        {cur.map((i) => groups[i] && <Group key={groups[i].key} g={groups[i]} />)}
      </div>
      <div className="ob__groups ob__measure" ref={meas} aria-hidden="true" inert="">
        {groups.map((g) => (
          <Group key={g.key} g={g} />
        ))}
      </div>
    </div>
  )
}

// Herkenbare bronkaarten. Meet hele gridrijen, zodat logo's en namen op één scherm passen.
function PagedSourceGrid({ ids, byId, on, onPick, page, onPages }) {
  const fit = useRef(null)
  const meas = useRef(null)
  const [pages, setPages] = useState(() => [ids.map((_, i) => i)])
  const measure = useCallback(() => {
    const f = fit.current, m = meas.current
    if (!f || !m) return
    const style = getComputedStyle(m)
    const columns = style.gridTemplateColumns.split(' ').filter(Boolean).length || 2
    const gap = parseFloat(style.rowGap) || 0
    const cards = [...m.children]
    const heights = []
    for (let i = 0; i < cards.length; i += columns) heights.push(Math.max(...cards.slice(i, i + columns).map(c => c.offsetHeight)))
    // Hooguit 16 herkenbare bronnen tegelijk; bij weinig hoogte/grote letters minder.
    const maxRows = Math.max(1, Math.floor(16 / columns))
    const rowHeight = Math.max(0, ...heights)
    const room = Math.min(f.clientHeight, maxRows * rowHeight + Math.max(0, maxRows - 1) * gap)
    const rowPages = packPages(heights, room, gap)
    const next = rowPages.map(rows => rows.flatMap(row => Array.from({ length: Math.min(columns, ids.length - row * columns) }, (_, col) => row * columns + col)))
    setPages(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next)
  }, [ids.length])
  useLayoutEffect(measure)
  useEffect(() => {
    const f = fit.current
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    if (f) ro?.observe(f)
    document.fonts?.ready?.then(measure)
    addEventListener('resize', measure)
    return () => { ro?.disconnect(); removeEventListener('resize', measure) }
  }, [measure])
  useEffect(() => onPages(pages.length), [pages.length, onPages])
  const cur = pages[Math.min(page, pages.length - 1)] || []
  const card = id => {
    const s = byId.get(id)
    if (!s) return null
    return <li key={id}><button type="button" className="ob__sourcecard" aria-label={`${s.name}, ${s.paid ? 'abonnement' : 'gratis'}${s.lang === 'en' ? ', Engels' : ''}`} aria-pressed={on.includes(id)} onClick={() => onPick(id)}>
      <SourceMark source={s} size={32} />
      <span className="ob__sourcecard-name"><span>{s.name}</span></span>
      <span className="ob__sourcecard-meta">{s.paid ? 'Abonnement' : 'Gratis'}{s.lang === 'en' ? ' · EN' : ''}</span>
      <span className="ob__check" aria-hidden="true" />
    </button></li>
  }
  return <div className="ob__fit ob__sourcefit" ref={fit}>
    <ul className="ob__sourcegrid">{cur.map(i => card(ids[i]))}</ul>
    <ul className="ob__sourcegrid ob__measure" ref={meas} aria-hidden="true" inert="">{ids.map(card)}</ul>
  </div>
}
