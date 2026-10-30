import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SourceMark } from '../components/Items.jsx'
import { BackButton } from '../components/Shell.jsx'
import { Disclosure } from '../components/Disclosure.jsx'
import { ChipGroup } from '../components/ChipGroup.jsx'
import { BrandLogo } from '../components/Brand.jsx'
import { EditionIcon, StreamIcon, BooksIcon, INTEREST_ICONS } from '../components/icons.jsx'
import { vakByDomain } from '../../shared/vak.mjs'
import { INTERESTS, topicById, resolveTopics, suggestSources, catLabel, starterGroups } from '../lib/topics.js'
import { sourcesOn } from '../lib/welcome.js'
import { reduced, irisClose, irisOpen, irisKeyframes, fade, tint, clear, dotAt, waitFor, sleep, tintTimes, openTimes, reducedPlan, IRIS, IRIS_BACK, IRIS_MS, STEP_OUT_MS, STEP_IN_MS } from '../lib/motion.js'

// Onboarding in vijf schermen, gelijk aan de app (ios/Hoot/Views/WelcomeView.swift): uitleg →
// interesses (tegels) → onderwerpen (chips) → bronnen → je vak (voor de Selectie). Alles met tikken;
// onderaan steeds één knop om door te gaan. Bovenaan op elke stap het kleine woordmerk linksboven,
// met de stapteller eronder; rechts Inloggen (op de intro, `onSignIn`) of Terug.
// De rode intro is een eigen laag (.ob__red) over de papieren stap heen: de schijf van de iris.
// Van rood naar papier krimpt het rood als cirkel tot de punt van het kleine woordmerk op papier
// (0,7 s, zie lib/motion.js); de rand veegt de papieren letters weg en de inkt staat eronder. Terug
// speelt het omgekeerd. Bij Minder beweging één fade van 0,35 s. Tussen papieren stappen even uit
// en weer in, zoals de app.
// Opnieuw kiezen (vanuit Bronnen of Instellingen, `onClose` is er dan): alles staat al op je huidige
// keuze, sluiten (ook met Escape) slaat niets op, en "Liever meteen lezen" is er niet.
const STEPS = 5
// Bronnen in de volgorde waarin je ze wilt zien. Regionaal en Vlaams staan ingeklapt;
// de rubrieken alleen als je die interesse (of dat onderwerp) koos.
const GROUPS = [
  { cat: 'nl' },
  { cat: 'int' },
  { cat: 'economie', interest: 'economie' },
  { cat: 'tech', interest: 'tech' },
  { cat: 'games', topic: 'games' },
  { cat: 'wetenschap', interest: 'wetenschap' },
  { cat: 'sport', interest: 'sport' },
  { cat: 'cultuur', interest: 'cultuur' },
  { cat: 'regio', folded: true },
  { cat: 'vl', folded: true },
].map((g) => ({ ...g, label: catLabel(g.cat) }))

// Kleuren van de iris, gelezen op :root (binnen .ob--open is --accent papier): merkrood, en de
// kleur van de punt waar het rood naartoe kleurt (in donker koraal).
const rootColor = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

// Zolang het rood staat, kleurt de browserbalk mee (iOS verbergt dan de statusbalk).
function useThemeColor(on) {
  useEffect(() => {
    if (!on) return
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')]
    const was = metas.map((m) => m.content)
    metas.forEach((m) => (m.content = rootColor('--brand-red') || '#a3201b'))
    return () => metas.forEach((m, i) => (m.content = was[i]))
  }, [on])
}

export default function Welcome({ sources, prefs, muted = new Set(), onDone, onClose = null, onSignIn = null }) {
  const reopen = !!onClose
  const [step, setStep] = useState(0)
  const [interests, setInterests] = useState(() => prefs.interests || [])
  const [picked, setPicked] = useState(() => prefs.topics || [])
  const [chosen, setChosen] = useState(null) // bronnen: pas vooraf invullen als je bij stap 4 komt
  const [freeOnly, setFreeOnly] = useState(false) // niet iedereen heeft abonnementen
  const [vak, setVak] = useState(() => prefs.vak || [])
  const [quick, setQuick] = useState(false) // "Liever meteen lezen": de startset met gratis bronnen
  const [red, setRed] = useState(true) // de rode intro-laag staat er (ook nog tijdens het sluiten)
  const [phase, setPhase] = useState('open') // 'open' | 'closing' (rood → papier) | 'opening' (terug)
  const head = useRef(null) // de kop van de papieren stap
  const redHead = useRef(null) // de kop op het rood
  const scroller = useRef(null) // .ob: scrolt de papieren stap
  const paperCol = useRef(null) // de papieren kolom: vervaagt even tussen stappen
  const paperBrand = useRef(null) // het papieren woordmerk: het doel van de iris
  const redRef = useRef(null) // de rode laag
  const afterOpen = useRef(null) // wat er gebeurt zodra het rood weer open is (Terug)
  const paper = quick || step > 0 // er is een papieren stap getekend
  useThemeColor(red)

  const topics = useMemo(() => resolveTopics(interests, picked), [interests, picked])
  const pickable = sources.filter((s) => s.followed && s.kind !== 'sociaal')

  // Nieuwe stap: bovenaan beginnen en de kop voorlezen (schermlezer), pas als de overgang klaar is.
  useEffect(() => {
    if (phase !== 'open') return
    ;(red ? redRef : scroller).current?.scrollTo(0, 0)
    ;(red ? redHead : head).current?.focus({ preventScroll: true })
  }, [step, quick, red, phase])

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

  const toggle = (set) => (id) => set((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

  // ---- Overgangen ----

  // Van de rode intro naar papier (de eerste stap of Een goed begin): `apply` tekent de papieren
  // stap onder het rood; zodra het papieren woordmerk zijn plek heeft (een beeld of twee), sluit de
  // iris tot zijn punt. De papieren punt op het rood gaat op in het rood, en het laatste stuk kleurt
  // het rood mee naar de punt. Zonder plek, of bij Minder beweging: een fade.
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
  // Tussen papieren stappen: even uit en weer in.
  const go = async (apply) => {
    const col = paperCol.current
    const moves = !reduced() && !!col?.animate
    if (moves) await fade(col, STEP_OUT_MS, 1, 0, 'ease-out').finished.catch(() => {})
    apply()
    if (moves) fade(col, STEP_IN_MS, 0, 1, 'ease-in').finished.then(() => clear(col)).catch(() => {})
  }

  const next = () => {
    // Opnieuw kiezen: de bronnen die nu aan staan (en wat je hier al aan- of uitzette). Eerste keer: voorstellen.
    if (step === 2) setChosen((c) => (reopen ? c ?? sourcesOn(pickable, muted) : suggestSources(pickable, interests, topics)))
    if (step === 0) leaveIntro(() => setStep(1))
    else go(() => setStep((s) => s + 1))
  }
  const back = () => (step === 1 ? backToIntro(() => setStep(0)) : go(() => setStep((s) => s - 1)))
  const finish = () => onDone({ interests, topics, sources: chosen ?? suggestSources(pickable, interests, topics), all: pickable, vak })

  const starter = starterGroups(pickable)
  const startQuick = () =>
    leaveIntro(() => {
      setChosen(starter.flatMap((g) => g.sources.map((x) => x.id)))
      setQuick(true)
    })
  // Bronnen nog niet geladen toen je op "Liever meteen lezen" tikte: dan alsnog de startset.
  const starterKey = starter.map((g) => g.sources.length).join()
  useEffect(() => {
    if (quick && !(chosen || []).length && starter.length) setChosen(starter.flatMap((g) => g.sources.map((x) => x.id)))
  }, [quick, starterKey]) // eslint-disable-line react-hooks/exhaustive-deps
  // De hoofdknop van de papieren stap (de intro heeft de zijne in de rode laag).
  const cta = quick
    ? { label: 'Begin met lezen', onClick: () => onDone({ interests: [], topics: [], sources: chosen || [], all: pickable }), disabled: !(chosen || []).length }
    : step === 1
      ? { label: interests.length ? 'Verder' : 'Kies minstens één', onClick: next, disabled: !interests.length }
      : step === 2
        ? { label: 'Verder', onClick: next }
        : step === 3
          ? { label: 'Verder', onClick: next, disabled: !(chosen || []).length }
          : { label: 'Naar je Editie', onClick: finish }

  const visibleGroups = GROUPS.filter((g) => (!g.interest || interests.includes(g.interest)) && (!g.topic || topics.includes(g.topic)))

  // Het papier staat onder het rood: niet te bedienen zolang de rode laag er is (ook tijdens de
  // iris); de rode laag zelf niet zodra ze sluit of nog opent. Tijdens het sluiten is het rood ook
  // voor schermlezers al weg.
  return (
    <div className="welcome ob" role="dialog" aria-modal="true" aria-labelledby="ob-title" ref={scroller}>
      {paper ? (
        <div className="col ob__head" inert={red ? '' : undefined}>
          <div className="ob__top">
            <span className="ob__brand" ref={paperBrand}>
              <BrandLogo height={20} />
            </span>
            <BackButton label="Terug" onClick={quick ? () => backToIntro(() => setQuick(false)) : back} className="ob__back" />
          </div>
        </div>
      ) : null}
      {paper ? (
        <div className="col ob__col" ref={paperCol} inert={red ? '' : undefined}>
          {quick ? null : (
            <span className="ob__n" aria-label={`Stap ${step + 1} van ${STEPS}`}>
              {step + 1}
              <small>/{STEPS}</small>
            </span>
          )}

          {quick ? (
            <>
              <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
                Een goed begin
              </h1>
              <p className="ob__sub">Bekende Nederlandse bronnen, van nieuws tot cultuur. Allemaal gratis: elk stuk lees je helemaal, zonder abonnement. Tik op een bron om hem weg te laten; later pas je alles aan bij Bronnen.</p>
              {!starter.length ? <p className="ob__sub">De bronnen worden geladen…</p> : null}
              {starter.map((g) => (
                <section key={g.label} className="ob__group" aria-label={g.label}>
                  <h2 className="label label--meta ob__gtitle">{g.label}</h2>
                  <ul className="ob__sources">
                    {g.sources.map((x) => (
                      <li key={x.id}>
                        <SourcePick s={x} on={(chosen || []).includes(x.id)} onClick={() => toggle(setChosen)(x.id)} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          ) : step === 1 ? (
            <>
              <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
                Wat interesseert je?
              </h1>
              <p className="ob__sub">Daarmee stellen we je bronnen voor en vormen we je Editie: wat bij je interesses past, krijgt voorrang.</p>
              <div className="ob__grid">
                {INTERESTS.map((i) => {
                  const Icon = INTEREST_ICONS[i.id]
                  return (
                    <button key={i.id} type="button" className="ob__tile" aria-pressed={interests.includes(i.id)} onClick={() => toggle(setInterests)(i.id)}>
                      <span className="ob__ticon">
                        <Icon />
                      </span>
                      <span className="ob__tlabel">{i.label}</span>
                    </button>
                  )
                })}
              </div>
            </>
          ) : step === 2 ? (
            <>
              <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
                Wat precies?
              </h1>
              <p className="ob__sub">Kies wat je het meest boeit. Kies je niets, dan krijg je alles binnen dat onderwerp.</p>
              {INTERESTS.filter((i) => interests.includes(i.id)).map((i) => {
                const Icon = INTEREST_ICONS[i.id]
                return (
                  <ChipGroup key={i.id} label={i.label} icon={<Icon />} level={2} className="ob__group" labelClassName="ob__gtitle">
                    {i.topics.map(topicById).map((t) => (
                      <button key={t.id} type="button" className="pill ob__chip" aria-pressed={picked.includes(t.id)} onClick={() => toggle(setPicked)(t.id)}>
                        {t.label}
                      </button>
                    ))}
                  </ChipGroup>
                )
              })}
            </>
          ) : step === 4 ? (
            <>
              <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
                Wat volg je graag?
              </h1>
              <p className="ob__sub">Eén keer per week bijgepraat over wat jou bezighoudt: elke maandag zet de Selectie per onderwerp de drie beste stukken van de week voor je klaar, geschreven door mensen. Kies wat bij je werk past of wat je graag volgt, of sla het over.</p>
              {vakByDomain().map((d) => (
                <ChipGroup key={d.id} label={d.label} level={2} className="ob__group" labelClassName="ob__gtitle">
                  {d.fields.map((f) => (
                    <button key={f.id} type="button" className="pill ob__chip" aria-pressed={vak.includes(f.id)} onClick={() => toggle(setVak)(f.id)}>
                      {f.label}
                    </button>
                  ))}
                </ChipGroup>
              ))}
            </>
          ) : (
            <>
              <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
                Jouw bronnen
              </h1>
              <p className="ob__sub">
                {reopen ? 'Aan staan de bronnen die je nu volgt.' : 'We kozen er alvast een paar die bij je interesses passen.'} Tik om ze aan of uit te zetten. Van een bron met abonnement zie je altijd de koppen; het hele artikel lees je als je abonnee bent.
              </p>
              <div className="chips ob__free" role="group" aria-label="Welke bronnen tonen">
                <button type="button" className="pill ob__chip" aria-pressed={!freeOnly} onClick={() => setFreeOnly(false)}>
                  Alle bronnen
                </button>
                <button
                  type="button"
                  className="pill ob__chip"
                  aria-pressed={freeOnly}
                  onClick={() => {
                    setFreeOnly(true)
                    setChosen((c) => (c || []).filter((id) => !pickable.find((s) => s.id === id)?.paid))
                  }}
                >
                  Alleen gratis
                </button>
              </div>
              {pickable.length ? (
                visibleGroups.map((g) => {
                  // Gratis bronnen eerst; met "Alleen gratis" alleen die.
                  const list = pickable.filter((s) => s.cat === g.cat && (!freeOnly || !s.paid)).sort((a, b) => Number(!!a.paid) - Number(!!b.paid))
                  if (!list.length) return null
                  const rows = (
                    <ul className="ob__sources">
                      {list.map((s) => (
                        <li key={s.id}>
                          <SourcePick s={s} on={(chosen || []).includes(s.id)} onClick={() => toggle(setChosen)(s.id)} />
                        </li>
                      ))}
                    </ul>
                  )
                  const count = list.filter((s) => (chosen || []).includes(s.id)).length
                  return g.folded ? (
                    <Disclosure
                      key={g.cat}
                      className="ob__fold"
                      summaryClassName="label label--meta ob__gtitle"
                      summary={
                        <>
                          {g.label}
                          <span className="ob__count">{count ? `${count} gekozen` : `${list.length} bronnen`}</span>
                        </>
                      }
                    >
                      {rows}
                    </Disclosure>
                  ) : (
                    <section key={g.cat} className="ob__group" aria-label={g.label}>
                      <h2 className="label label--meta ob__gtitle">{g.label}</h2>
                      {rows}
                    </section>
                  )
                })
              ) : (
                <p className="ob__sub">De bronnen worden geladen…</p>
              )}
            </>
          )}
        </div>
      ) : null}

      {paper ? (
        <div className="ob__foot" inert={red ? '' : undefined}>
          <div className="col">
            <button type="button" className="btn btn--lg ob__cta" onClick={cta.onClick} disabled={cta.disabled}>
              {cta.label}
            </button>
            {quick ? (
              <button
                type="button"
                className="linkbtn linkbtn--plain ob__skip"
                onClick={() =>
                  go(() => {
                    setQuick(false)
                    setStep(1)
                  })
                }
              >
                Liever zelf kiezen
              </button>
            ) : reopen ? (
              <button type="button" className="linkbtn linkbtn--plain ob__skip" onClick={onClose}>
                Sluiten zonder opslaan
              </button>
            ) : null}
          </div>
        </div>
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
                  <button type="button" className="linkbtn linkbtn--plain ob__login" onClick={onSignIn} title="Hoot is nog op uitnodiging." aria-describedby="ob-login-hint">
                    Inloggen
                  </button>
                  <span id="ob-login-hint" className="visually-hidden">
                    Hoot is nog op uitnodiging.
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <div className="col ob__col">
            <span className="ob__n" aria-label={`Stap 1 van ${STEPS}`}>
              1<small>/{STEPS}</small>
            </span>
            <h1 id={paper ? undefined : 'ob-title'} ref={redHead} tabIndex={-1} className="ob__hero">
              Minder scrollen. Meer lezen.
            </h1>
            <ul className="ob__points">
              <Point Icon={EditionIcon} title="Je Editie" text="Drie keer per dag tien verhalen, met een einde." />
              <Point Icon={StreamIcon} title="De Stroom" text="Alles van je bronnen, nieuwste eerst." />
              <Point Icon={BooksIcon} title="Je Selectie" text="Eén keer per week bijgepraat over wat jou bezighoudt." />
            </ul>
          </div>
          <div className="ob__foot">
            <div className="col">
              <button type="button" className="btn btn--lg ob__cta" onClick={next}>
                Stel je Hoot samen
              </button>
              {reopen ? (
                <button type="button" className="linkbtn linkbtn--plain ob__skip" onClick={onClose}>
                  Sluiten zonder opslaan
                </button>
              ) : (
                <button type="button" className="linkbtn linkbtn--plain ob__skip" onClick={startQuick}>
                  Liever meteen lezen
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const Point = ({ Icon, title, text }) => (
  <li className="ob__point">
    <span className="ob__pi" aria-hidden="true">
      <Icon />
    </span>
    <span>
      <strong>{title}</strong>
      <span className="ob__ptext">{text}</span>
    </span>
  </li>
)

function SourcePick({ s, on, onClick }) {
  return (
    <button type="button" className="ob__src" aria-pressed={on} onClick={onClick}>
      <SourceMark source={s} size={40} />
      <span className="ob__stext">
        <span className="ob__sname">
          {s.name}
          {s.paid ? <span className="ob__tag">abonnement</span> : <span className="ob__tag ob__tag--free">gratis</span>}
          {s.lang === 'en' ? <span className="ob__tag">EN</span> : null}
        </span>
        <span className="ob__sabout">{s.about}</span>
      </span>
      <span className="ob__check" aria-hidden="true" />
    </button>
  )
}
