import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SourceMark } from '../components/Items.jsx'
import { BackButton } from '../components/Shell.jsx'
import { ChipGroup } from '../components/ChipGroup.jsx'
import { BrandLogo, useBrandBar } from '../components/Brand.jsx'
import SunArt from '../components/SunArt.jsx'
import { CaretIcon, CheckIcon, ICON_SM, SearchIcon } from '../components/icons.jsx'
import { vakByDomain } from '../../shared/vak.mjs'
import { offeredFields, pickDomains, canChoose } from '../lib/selection-index.js'
import { telGekozen } from '../lib/tel.js'
import { voorstel } from '../../shared/voorstel.mjs'
import { INTERESTS, OPT_IN, resolveTopics, topicById } from '../lib/topics.js'
import { sourcesOn, pickedFrom, withOptIn } from '../lib/welcome.js'
import { toggleFollow, freeStart, startIds, beginLabel, krantenSources, interestBlocks, moreGroups, findSources, followedSources, followedLine, chosenIn, startsOpen, foldCount } from '../lib/follow-welcome.js'
import { reduced, irisClose, irisOpen, irisKeyframes, fade, tint, clear, dotAt, waitFor, sleep, tintTimes, openTimes, reducedPlan, crossPlan, rootColor, IRIS, IRIS_MS, STEP_OUT_MS, STEP_IN_MS } from '../lib/motion.js'

// Welkom, gelijk aan de app (ios/Hoot/Views/WelcomeView.swift). Drie schermen (sinds 14 november is
// het uitlegscherm weg; Editie, Stroom en Selectie leer je kennen door ze te lezen):
//   1. welkom (rood)   de zon komt op achter de horizon; Begin (naar de interesses) en eronder de stille
//                      knop Liever meteen lezen (de gratis startset, zonder sport). "Al een account? Log in"
//                      klein rechtsboven. Verder niets: geen kop van nu en geen ondertitel (onboarding blok 6,
//                      Alex vond de kop van nu verwarrend). Op het web alleen nog via de route welkom zonder
//                      eerdere keuze.
//   2. Wat interesseert je?  de hoofdrubrieken (je Stroom-tabs) en, uitklapbaar, je Selectie.
//   3. Volg je bronnen zoals accounts volgen: niets staat vooraf aan. Bovenaan Voor jou (het voorstel,
//                      of het gratis begin), direct daaronder open de kranten ("Lees je een krant?"),
//                      dan per gekozen interesse een blok met een gratis aanrader; de rest ingeklapt;
//                      zoeken vindt alles. Sinds onboarding blok 4 geen voorbeeld-Editie meer, en de
//                      filters Aanbevolen en Gevolgd alleen bij opnieuw kiezen na een echte eerdere keuze.
// Eerst de interesses, dan de bronnen: zo staan de vak- en nichebronnen bij wat je koos, en niet
// verstopt in één lange lijst. De hoofdknop werkt altijd ("Later kiezen" is weg sinds 1.1.1, keuze r5-later-kiezen). Daarna de Editie: het welkom vervaagt erover (crossPlan). Het seintje
// komt pas onder de eerste Editie (alleen in de app; web-push bestaat niet).
// Van rood naar papier krimpt het rood als iris tot de punt van het kleine woordmerk (lib/motion.js);
// terug speelt het omgekeerd. Bij Minder beweging één fade van 0,35 s. Tussen papieren schermen even
// uit en weer in.
// Opnieuw kiezen (Bronnen of Instellingen, `onClose` is er dan): geen intro; je begint
// bij je interesses met wat nu aan staat, en Sluiten (ook Escape) slaat niets op.

const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export default function Welcome({ sources, prefs, muted = new Set(), onDone, onClose = null, onSignIn = null, leaving = false, first = false, onLeft = () => {}, digest = null, onStep = () => {} }) {
  const reopen = !!onClose
  const [view, setView] = useState(reopen ? 'interesses' : 'intro') // intro | interesses | bronnen
  const [interests, setInterests] = useState(() => prefs.interests || [])
  const [edited, setEdited] = useState(null) // je eigen bronnenkeuze; zolang null geldt het begin
  const [vak, setVak] = useState(() => prefs.vak || [])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('aanbevolen') // aanbevolen | gevolgd
  const [more, setMore] = useState(false) // Meer bronnen uitgeklapt
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

  // Achterklap & showbizz (OPT_IN) tik je zelf aan, onder Cultuur (persona's 14 november, punt 9).
  const [optIn, setOptIn] = useState(() => (prefs.topics || []).filter((t) => OPT_IN.has(t)))
  // De onderwerpen per interesse die je aantikte (zonder OPT_IN): bij opnieuw kiezen te kiezen onder elke gekozen
  // interesse, gelijk aan Instellingen › Interesses in de app (InterestsList). Niets of alles aangetikt is alles.
  const [picked, setPicked] = useState(() => pickedFrom((prefs.topics || []).filter((t) => !OPT_IN.has(t)), prefs.interests || [], INTERESTS))
  const topics = useMemo(() => withOptIn(resolveTopics(interests, picked.filter((t) => !OPT_IN.has(t))), interests, optIn), [interests, picked, optIn])
  const pickable = useMemo(() => sources.filter((s) => s.followed && s.kind !== 'sociaal'), [sources])
  // Het voorstel bovenaan de bronnenstap (shared/voorstel.mjs): uit je interesses en je eigen onderwerpen.
  // Taal volgt bronkeuze (Week · 4): een nieuw profiel krijgt Nederlandse bronnen; Engelstalige alleen als je er
  // bij opnieuw kiezen al een volgt.
  const english = useMemo(() => reopen && pickable.some((s) => s.lang === 'en' && !muted.has(s.id)), [reopen, pickable, muted])
  const plan = useMemo(() => voorstel(pickable, interests, picked, { english }), [pickable, interests, picked, english])
  // Je bronnen: je eigen keuze; opnieuw kiezen begint bij wat nu aan staat. De eerste keer staat het voorstel
  // alvast aan (review G2: anders merkt je Editie niets van je interesses); zonder interesses niets.
  // Alleen gratis alvast aan (keuze r5-voorstel-betaald): een betaalde bron in Voor jou zet je zelf aan.
  const initial = useMemo(() => (reopen ? sourcesOn(pickable, muted) : (plan || []).filter((p) => p.on).map((p) => p.id)), [reopen, pickable, muted, plan])
  const mine = edited ?? initial

  // Gemeten (onboarding blok 6): het openen van de interesses en van de bronnen, als dagtotaal (shared/tel.mjs).
  const step = useRef(onStep)
  step.current = onStep
  useEffect(() => {
    if (view === 'interesses') step.current('welkom-interesses')
    else if (view === 'bronnen') step.current('welkom-bronnen')
  }, [view])

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
        irisOpen(layer, { ...geo, duration: IRIS_MS, easing: IRIS })
        tint(layer, accent, brandRed, { duration: o.tintDur })
        timers.push(setTimeout(() => dot && fade(dot, o.dotDur, 0, 1), o.dotStart))
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
      if (dot) fade(dot, t.dotEnd, 1, 0)
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
    if (moves) await fade(col, STEP_OUT_MS, 1, 0).finished.catch(() => {})
    apply()
    if (moves) fade(col, STEP_IN_MS, 0, 1).finished.then(() => clear(col)).catch(() => {})
  }
  const show = (v) =>
    go(() => {
      setView(v)
      setQuery('')
    })

  // ---- Keuzes ----
  const pickSource = (id) => setEdited(toggleFollow(mine, id))
  const finish = (choice = {}) => {
    telGekozen(prefs.vak || [], choice.vak ?? vak) // nieuw gekozen Selectie-onderwerpen als totaal (uit tot de privacyzin er is)
    onDone({ interests, topics, sources: mine, all: pickable, vak, ...choice })
  }
  // "Liever meteen lezen": de startset met gratis bronnen, zonder interesses, onderwerpen of vak.
  const startQuick = () => onDone({ interests: [], topics: [], sources: startIds(pickable), all: pickable, quick: true })

  const previous = () => {
    if (view === 'interesses') reopen ? onClose() : backToIntro(() => setView('intro'))
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
            <div className="col ob__col" ref={paperCol}>
              {view === 'bronnen' ? (
                <Bronnen head={head} sources={pickable} mine={mine} interests={interests} plan={plan} preset={!reopen && edited === null} filters={reopen && !prefs.browsing} onPick={pickSource} onAll={(ids, on) => setEdited(on ? [...new Set([...mine, ...ids])] : mine.filter((x) => !ids.includes(x)))} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} more={more} setMore={setMore} />
              ) : (
                <Interesses head={head} interests={interests} onInterest={(id) => setInterests((l) => toggleIn(l, id))} vak={vak} onVak={(id) => setVak((l) => toggleIn(l, id))} open={selOpen} setOpen={setSelOpen} optIn={optIn} onOptIn={(id) => setOptIn((l) => toggleIn(l, id))} chosen={picked} onTopic={(id) => setPicked((l) => toggleIn(l, id))} digest={digest} selectie={reopen && !prefs.browsing} />
              )}
            </div>
          </div>
          <div className="ob__foot" inert={red ? '' : undefined}>
            <div className="col">
              {view === 'bronnen' ? (
                <>
                  <p className="ob__status" role="status">
                    {pickable.length ? followedLine(mine.length) : 'Bronnen laden…'}
                  </p>
                  {/* Review G3: de knop is nooit dood. Volg je niets, dan begin je met het gratis begin, en de knop
                      noemt die bronnen bij naam ("Begin met NOS, NU.nl en RTL Nieuws", onboarding blok 4). */}
                  <button type="button" className="btn btn--lg ob__cta" onClick={() => (mine.length ? finish() : finish({ sources: freeStart(pickable).map((s) => s.id) }))} disabled={!pickable.length}>
                    {mine.length ? 'Naar je Editie' : beginLabel(pickable)}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn--lg ob__cta" onClick={() => show('bronnen')}>
                    Verder
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
                    Al een account? Log in
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
              Nieuws met
              <br />
              een einde.
            </h1>
          </div>
          <div className="ob__foot">
            <div className="col">
              <button type="button" className="btn btn--lg ob__cta" onClick={() => leaveIntro(() => setView('interesses'))}>
                Begin
              </button>
              <button type="button" className="linkbtn linkbtn--plain ob__skip" onClick={startQuick} disabled={!pickable.length}>
                Liever meteen lezen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ---- 3. Volg je bronnen: Voor jou, de kranten, dan een blok per gekozen interesse ----
// Bovenaan Voor jou: het voorstel (shared/voorstel.mjs, 1.1.1), opgebouwd uit je interesses, met per bron een
// korte reden; zonder interesses het gratis begin. Direct daaronder, altijd open, de kranten als "Lees je een
// krant?" (onboarding blok 4); niets staat daar vooraf aan. De filters Aanbevolen en Gevolgd alleen bij opnieuw
// kiezen na een echte eerdere keuze (`filters`, dezelfde voorwaarde als de Selectie-uitklapper): de eerste keer,
// ook via "Maak Hoot van jou" na meteen lezen, is er maar één lijst. Gelijk aan WelcomeView.swift.
function Bronnen({ head, sources, mine, interests, plan = null, preset = false, filters = false, onPick, onAll, query, setQuery, filter, setFilter, more, setMore }) {
  const planIds = useMemo(() => (plan || []).map((p) => p.id), [plan])
  const why = useMemo(() => new Map((plan || []).map((p) => [p.id, p.why])), [plan])
  const start = useMemo(() => (plan ? planIds.map((id) => sources.find((s) => s.id === id)).filter(Boolean) : freeStart(sources)), [plan, planIds, sources])
  const startIdList = useMemo(() => start.map((s) => s.id), [start])
  const kranten = useMemo(() => krantenSources(sources, startIdList), [sources, startIdList])
  const blocks = useMemo(() => interestBlocks(sources, interests, planIds), [sources, interests, planIds])
  const rest = useMemo(() => moreGroups(sources, interests, [...startIdList, ...kranten.map((s) => s.id)]), [sources, interests, startIdList, kranten])
  const startOn = start.length > 0 && start.every((s) => mine.includes(s.id))
  // De regel boven de lijst van Voor jou (keuze r5-alvast-regel): de gratis bronnen staan alvast aan.
  const planOn = (plan || []).filter((p) => p.on).map((p) => p.id)
  const alvast = plan && preset && planOn.length > 0 && planOn.every((id) => mine.includes(id)) ? alvastLine(planOn.length < planIds.length) : null
  // Eén aanrader per blok: in Voor jou het gratis begin, in een blok alleen zijn eigen aanrader.
  const row = (s, picks = new Set()) => <SourceRow key={s.id} s={s} on={mine.includes(s.id)} pick={picks.has(s.id)} why={why.get(s.id)} onPick={onPick} />
  const startIds = new Set(start.map((s) => s.id))
  const restCount = rest.reduce((n, g) => n + g.sources.length, 0)
  const q = query.trim()
  // Inklapbare categorieën: open of dicht per categorie, de eerste keer bepaald door startsOpen (Voor jou en
  // de kranten, of er staat al iets gevolgd in), daarna door jou. Een ref, zodat ontvolgen een open categorie niet sluit.
  const fold = useRef({})
  const [, redraw] = useState(0)
  const toggle = (id, open) => {
    fold.current[id] = !open
    redraw((n) => n + 1)
  }
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
  } else if (filters && filter === 'gevolgd') {
    const list = followedSources(sources, mine)
    body = list.length ? <ul className="ob__list">{list.map((s) => row(s))}</ul> : <p className="ob__empty">Je volgt nog niets. Begin bij Voor jou.</p>
  } else {
    body = (
      <>
        {start.length ? (
          <Fold id="basis" label="Voor jou" list={start} mine={mine} fold={fold} onToggle={toggle} row={(s) => row(s, startIds)} count={false} note={alvast}>
            {start.length > 1 ? (
              <button type="button" className="linkbtn ob__all" aria-pressed={startOn} onClick={() => onAll(start.map((s) => s.id), !startOn)}>
                {startOn ? 'Alles gevolgd' : 'Volg alles'}
              </button>
            ) : null}
          </Fold>
        ) : null}
        {kranten.length ? <Fold id="kranten" label="Lees je een krant?" list={kranten} mine={mine} fold={fold} onToggle={toggle} row={(s) => row(s)} /> : null}
        {blocks.map((b) => (
          <Fold key={b.id} id={`b-${b.id}`} label={b.label} list={b.sources} mine={mine} fold={fold} onToggle={toggle} row={(s) => row(s, new Set([b.pick]))} />
        ))}
        {restCount ? (
          more ? (
            rest.map((g) => <Fold key={g.cat} id={`g-${g.cat}`} label={g.label} list={g.sources} mine={mine} fold={fold} onToggle={toggle} row={(s) => row(s, new Set())} />)
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
    <>
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
      {filters ? (
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
      ) : null}
      {body}
    </>
  )
}

// Eén categorie van de bronnenstap, inklapbaar. De kop is een knop (naam, aantal gekozen bronnen, pijl);
// ingeklapt staat alleen die kop. `children`: een actie naast de kop (Volg alles in Voor jou).
// `note`: één stille regel direct onder de kop, boven de lijst (Alvast gevolgd).
function Fold({ id, label, list, mine, fold, onToggle, row, count = true, children = null, note = null }) {
  const chosen = chosenIn(list, mine)
  if (!(id in fold.current)) fold.current[id] = startsOpen(id, chosen)
  const open = fold.current[id]
  return (
    <section className={`ob__group${open ? '' : ' ob__group--dicht'}`} aria-labelledby={`ob-${id}`}>
      <div className="ob__ghead">
        <h2 className="label label--section ob__gtitle">
          <button type="button" id={`ob-${id}`} className="ob__gtoggle" aria-expanded={open} aria-controls={`ob-l-${id}`} onClick={() => onToggle(id, open)}>
            <span className="ob__gname">{label}</span>
            {count ? <span className="ob__gcount">{foldCount(chosen, list.length)}</span> : null}
            <span className="ob__gcaret" aria-hidden="true">
              <CaretIcon dir={open ? 'down' : 'right'} size={ICON_SM} />
            </span>
          </button>
        </h2>
        {children}
      </div>
      {open && note ? <p className="ob__alvast">{note}</p> : null}
      {open ? <ul className="ob__list" id={`ob-l-${id}`}>{list.map((s) => row(s))}</ul> : null}
    </section>
  )
}

// Eén bron: logo, naam, omschrijving, gratis (of de gratis aanrader van zijn blok) of abonnement, en
// Volg / Volgend. Alles in inkt: het enige accent op dit scherm is de punt van het woordmerk.
// Alvast gevolgd (gelijk aan de app): staat er ook een betaalde bron in Voor jou, dan zegt de regel dat
// alleen de gratis bronnen aan staan.
const alvastLine = (withPaid) => (withPaid ? 'De gratis bronnen volg je alvast. Uitzetten kan met één tik.' : 'Alvast gevolgd. Uitzetten kan met één tik.')

// `why`: de reden in het voorstel ("Past bij Tech"), vóór gratis of abonnement.
function SourceRow({ s, on, pick = false, why = null, onPick }) {
  return (
    <li className="ob__src">
      <SourceMark source={s} size={40} />
      <div className="ob__stext">
        <span className="ob__sname">{s.name}</span>
        {s.about ? <span className="ob__sabout">{s.about}</span> : null}
        <span className="ob__smeta">
          {why ? `${why} · ` : ''}
          {s.paid ? 'Abonnement' : pick && !why ? 'Gratis aanrader' : 'Gratis'}
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

// ---- 2. Wat interesseert je? Rubrieken en, bij opnieuw kiezen, uitklapbaar je Selectie ----
// `selectie`: alleen wie al eens koos (opnieuw kiezen, niet na meteen lezen) ziet de uitklapper; in het eerste
// welkom vraagt de lege Selectie het zelf (Vak.jsx). Gelijk aan WelcomeView.swift.
// Ook alleen dan, onder elke gekozen interesse, de onderwerpen als pillen (`chosen`, `onTopic`), met Achterklap &
// showbizz (OPT_IN) in dezelfde groep. Gelijk aan Instellingen › Interesses in de app (InterestsList, TopicChips).
function Interesses({ head, interests, onInterest, optIn = [], onOptIn, chosen = [], onTopic, vak, onVak, open, setOpen, digest = null, selectie = false }) {
  // Alleen onderwerpen die in de weekbundel zitten (offersField, "Tot dan verbergen."), zoals het welkom in de app.
  // Zonder wat uit de keuze is (Sport, Geschiedenis; wie het al volgt ziet het nog), en hooguit acht (besluit 15 november).
  const domains = useMemo(() => pickDomains(vakByDomain(), digest, vak), [digest, vak])
  const counted = offeredFields(vak, digest)
  return (
    <>
      <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
        Wat interesseert je?
      </h1>
      <p className="ob__sub">Hoot kiest je Editie hierop. Aanpassen kan altijd.</p>
      <div className="chips ob__rubrieken" role="group" aria-label="Rubrieken">
        {INTERESTS.map((i) => (
          <button key={i.id} type="button" className="pill" aria-pressed={interests.includes(i.id)} onClick={() => onInterest(i.id)}>
            {i.label}
          </button>
        ))}
      </div>
      {/* Wat je onder een interesse zelf aantikt (OPT_IN): alleen als je die interesse koos. Gelijk aan de app (WelcomeView). */}
      {/* Bij opnieuw kiezen staan alle onderwerpen van die interesse in de groep (`selectie`). */}
      {/* In .ob__sel voor dezelfde afstand als de groepen van de Selectie (geen nieuwe CSS). */}
      {INTERESTS.filter((i) => interests.includes(i.id) && (selectie || i.topics.some((t) => OPT_IN.has(t)))).map((i) => (
        <div key={i.id} className="ob__sel">
          <ChipGroup label={`Onder ${i.label}`} level={2} className="ob__domain ob__optin">
            {i.topics.filter((t) => selectie || OPT_IN.has(t)).map((t) => (
              <button key={t} type="button" className="pill" aria-pressed={OPT_IN.has(t) ? optIn.includes(t) : chosen.includes(t)} onClick={() => (OPT_IN.has(t) ? onOptIn(t) : onTopic(t))}>
                {topicById(t)?.label || t}
              </button>
            ))}
          </ChipGroup>
        </div>
      ))}
      {selectie && interests.length ? <p className="ob__selnote">Kies je niets, dan krijg je alles. Groot nieuws staat altijd bovenaan.</p> : null}
      {selectie ? (
      <button type="button" className="ob__disclose" aria-expanded={open} aria-controls="ob-sel" onClick={() => setOpen(!open)}>
        <span>
          <span className="ob__dtitle">Kies onderwerpen voor je Selectie</span>
          <span className="ob__dsub">{offeredFields(vak, digest).length ? `${offeredFields(vak, digest).length} gekozen` : 'Mag ook later'}</span>
        </span>
        <span className="caret" aria-hidden="true">
          <CaretIcon dir={open ? 'up' : 'down'} size={ICON_SM} />
        </span>
      </button>
      ) : null}
      {selectie && open ? (
        <div id="ob-sel" className="ob__sel">
          <p className="ob__selnote">Elke maandag drie stukken over je werk of hobby.</p>
          {domains.map((d) => (
            <ChipGroup key={d.id} label={d.label} level={2} className="ob__domain">
              {d.fields.map((f) => (
                <button key={f.id} type="button" className="pill" aria-pressed={vak.includes(f.id)} disabled={!canChoose(counted, f.id)} onClick={() => onVak(f.id)}>
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
