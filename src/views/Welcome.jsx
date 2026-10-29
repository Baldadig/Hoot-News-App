import { useEffect, useMemo, useRef, useState } from 'react'
import { SourceMark } from '../components/Items.jsx'
import { EditionIcon, SparkleIcon, StreamIcon, INTEREST_ICONS } from '../components/icons.jsx'
import { vakByDomain } from '../../shared/vak.mjs'
import { INTERESTS, topicById, resolveTopics, suggestSources, catLabel, starterGroups } from '../lib/topics.js'
import { sourcesOn } from '../lib/welcome.js'

// Onboarding in vijf schermen: uitleg → interesses (breed) → onderwerpen (smal) → bronnen → je vak
// (voor de Selectie). Alles met tikken; onderaan steeds één knop om door te gaan.
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

export default function Welcome({ account, sources, prefs, muted = new Set(), onDone, onClose = null }) {
  const reopen = !!onClose
  const [step, setStep] = useState(0)
  const [interests, setInterests] = useState(() => prefs.interests || [])
  const [picked, setPicked] = useState(() => prefs.topics || [])
  const [chosen, setChosen] = useState(null) // bronnen: pas vooraf invullen als je bij stap 4 komt
  const [freeOnly, setFreeOnly] = useState(false) // niet iedereen heeft abonnementen
  const [vak, setVak] = useState(() => prefs.vak || [])
  const [quick, setQuick] = useState(false) // "Liever meteen lezen": de startset met gratis bronnen
  const head = useRef(null)
  const scroller = useRef(null)

  const topics = useMemo(() => resolveTopics(interests, picked), [interests, picked])
  const pickable = sources.filter((s) => s.followed && s.kind !== 'sociaal')

  // Nieuwe stap: bovenaan beginnen en de kop voorlezen (schermlezer).
  useEffect(() => {
    scroller.current?.scrollTo(0, 0)
    head.current?.focus({ preventScroll: true })
  }, [step, quick])

  // Escape sluit het welkom als je het opnieuw opende (de eerste keer moet je erdoor).
  useEffect(() => {
    if (!onClose) return
    const onKey = (e) => e.key === 'Escape' && !e.defaultPrevented && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (set) => (id) => set((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  const next = () => {
    // Opnieuw kiezen: de bronnen die nu aan staan (en wat je hier al aan- of uitzette). Eerste keer: voorstellen.
    if (step === 2) setChosen((c) => (reopen ? c ?? sourcesOn(pickable, muted) : suggestSources(pickable, interests, topics)))
    setStep((s) => s + 1)
  }
  const finish = () => onDone({ interests, topics, sources: chosen ?? suggestSources(pickable, interests, topics), all: pickable, vak })

  const starter = starterGroups(pickable)
  const startQuick = () => {
    setChosen(starter.flatMap((g) => g.sources.map((x) => x.id)))
    setQuick(true)
  }
  // Bronnen nog niet geladen toen je op "Liever meteen lezen" tikte: dan alsnog de startset.
  const starterKey = starter.map((g) => g.sources.length).join()
  useEffect(() => {
    if (quick && !(chosen || []).length && starter.length) setChosen(starter.flatMap((g) => g.sources.map((x) => x.id)))
  }, [quick, starterKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const cta = quick
    ? { label: 'Begin met lezen', onClick: () => onDone({ interests: [], topics: [], sources: chosen || [], all: pickable }), disabled: !(chosen || []).length }
    : step === 0
      ? { label: 'Stel je Hoot samen', onClick: next }
      : step === 1
        ? { label: interests.length ? 'Verder' : 'Kies minstens één', onClick: next, disabled: !interests.length }
        : step === 2
          ? { label: 'Verder', onClick: next }
          : step === 3
            ? { label: 'Verder', onClick: next, disabled: !(chosen || []).length }
            : { label: 'Naar je Editie', onClick: finish }

  const visibleGroups = GROUPS.filter((g) => (!g.interest || interests.includes(g.interest)) && (!g.topic || topics.includes(g.topic)))

  return (
    <div className={`welcome ob${step === 0 && !quick ? ' ob--open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="ob-title" ref={scroller}>
      <div className="col ob__col">
        <div className="ob__top">
          {quick ? (
            <span className="ob__brand">hoot</span>
          ) : (
            <span className="ob__n" aria-label={`Stap ${step + 1} van ${STEPS}`}>
              {step + 1}
              <small>/{STEPS}</small>
            </span>
          )}
          {quick ? (
            <button type="button" className="ob__back" onClick={() => setQuick(false)}>
              ‹ Terug
            </button>
          ) : step > 0 ? (
            <button type="button" className="ob__back" onClick={() => setStep((s) => s - 1)}>
              ‹ Terug
            </button>
          ) : (
            <span className="ob__brand">hoot</span>
          )}
        </div>

        {quick ? (
          <>
            <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
              Een goed begin
            </h1>
            <p className="ob__sub">Bekende Nederlandse bronnen, van nieuws tot cultuur. Allemaal gratis: elk stuk lees je helemaal, zonder abonnement. Tik op een bron om hem weg te laten; later pas je alles aan bij Bronnen.</p>
            {!starter.length ? <p className="ob__sub">De bronnen worden geladen…</p> : null}
            {starter.map((g) => (
              <section key={g.label} className="ob__group" aria-label={g.label}>
                <h2 className="ob__gtitle">{g.label}</h2>
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
        ) : step === 0 ? (
          <>
            <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__hero">
              Minder scrollen. Meer lezen.
            </h1>
            <ul className="ob__points">
              <Point Icon={EditionIcon} title="Je Editie" text="Drie keer per dag tien verhalen, met een einde." />
              <Point Icon={SparkleIcon} title="In één minuut bij" text="Voor leden, op uitnodiging: je Editie kort samengevat." />
              <Point Icon={StreamIcon} title="De Stroom" text="Alles van je bronnen, nieuwste eerst." />
            </ul>
            {account?.invite && account.status === 'out' ? <p className="ob__note">Je bent uitgenodigd. Inloggen kan straks rechtsboven, zodat alles meegaat naar je andere toestellen.</p> : null}
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
                <section key={i.id} className="ob__group" aria-label={i.label}>
                  <h2 className="ob__gtitle">
                    <Icon />
                    {i.label}
                  </h2>
                  <div className="ob__chips">
                    {i.topics.map(topicById).map((t) => (
                      <button key={t.id} type="button" className="ob__chip" aria-pressed={picked.includes(t.id)} onClick={() => toggle(setPicked)(t.id)}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </section>
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
              <section key={d.id} className="ob__group" aria-label={d.label}>
                <h2 className="ob__gtitle">{d.label}</h2>
                <div className="ob__chips">
                  {d.fields.map((f) => (
                    <button key={f.id} type="button" className="ob__chip" aria-pressed={vak.includes(f.id)} onClick={() => toggle(setVak)(f.id)}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </section>
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
            <div className="ob__chips ob__free" role="group" aria-label="Welke bronnen tonen">
              <button type="button" className="ob__chip" aria-pressed={!freeOnly} onClick={() => setFreeOnly(false)}>
                Alle bronnen
              </button>
              <button
                type="button"
                className="ob__chip"
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
                  <details key={g.cat} className="ob__fold">
                    <summary className="ob__gtitle">
                      {g.label}
                      <span className="ob__count">{count ? `${count} gekozen` : `${list.length} bronnen`}</span>
                    </summary>
                    {rows}
                  </details>
                ) : (
                  <section key={g.cat} className="ob__group" aria-label={g.label}>
                    <h2 className="ob__gtitle">{g.label}</h2>
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

      <div className="ob__foot">
        <div className="col">
          <button type="button" className="ob__cta" onClick={cta.onClick} disabled={cta.disabled}>
            {cta.label}
          </button>
          {quick ? (
            <button
              type="button"
              className="ob__skip"
              onClick={() => {
                setQuick(false)
                setStep(1)
              }}
            >
              Liever zelf kiezen
            </button>
          ) : reopen ? (
            <button type="button" className="ob__skip" onClick={onClose}>
              Sluiten zonder opslaan
            </button>
          ) : step === 0 ? (
            <button type="button" className="ob__skip" onClick={startQuick}>
              Liever meteen lezen
            </button>
          ) : null}
        </div>
      </div>
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
