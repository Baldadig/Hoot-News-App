import { useEffect, useMemo, useRef, useState } from 'react'
import { SourceMark } from '../components/Items.jsx'
import { EditionIcon, SparkleIcon, StreamIcon, INTEREST_ICONS } from '../components/icons.jsx'
import { INTERESTS, topicById, resolveTopics, suggestSources } from '../lib/topics.js'

// Onboarding in vier schermen: uitleg → interesses (breed) → onderwerpen (smal) → bronnen.
// Alles met tikken; onderaan steeds één knop om door te gaan.
const STEPS = 4

// Bronnen in de volgorde waarin je ze wilt zien. Regionaal en Vlaams staan ingeklapt;
// de rubrieken alleen als je die interesse (of dat onderwerp) koos.
const GROUPS = [
  { cat: 'nl', label: 'Nederland' },
  { cat: 'int', label: 'Internationaal' },
  { cat: 'economie', label: 'Economie', interest: 'economie' },
  { cat: 'tech', label: 'Tech', interest: 'tech' },
  { cat: 'games', label: 'Games', topic: 'games' },
  { cat: 'wetenschap', label: 'Wetenschap', interest: 'wetenschap' },
  { cat: 'sport', label: 'Sport', interest: 'sport' },
  { cat: 'cultuur', label: 'Cultuur en muziek', interest: 'cultuur' },
  { cat: 'regio', label: 'Regionaal', folded: true },
  { cat: 'vl', label: 'Vlaanderen', folded: true },
]

export default function Welcome({ account, sources, prefs, onDone }) {
  const [step, setStep] = useState(0)
  const [interests, setInterests] = useState(() => prefs.interests || [])
  const [picked, setPicked] = useState(() => prefs.topics || [])
  const [chosen, setChosen] = useState(null) // bronnen: pas vooraf invullen als je bij stap 4 komt
  const head = useRef(null)
  const scroller = useRef(null)

  const topics = useMemo(() => resolveTopics(interests, picked), [interests, picked])
  const pickable = sources.filter((s) => s.followed && s.kind !== 'sociaal')

  // Nieuwe stap: bovenaan beginnen en de kop voorlezen (schermlezer).
  useEffect(() => {
    scroller.current?.scrollTo(0, 0)
    head.current?.focus({ preventScroll: true })
  }, [step])

  const toggle = (set) => (id) => set((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  const next = () => {
    if (step === 2) setChosen(suggestSources(pickable, interests, topics))
    setStep((s) => s + 1)
  }
  const finish = () => onDone({ interests, topics, sources: chosen ?? suggestSources(pickable, interests, topics), all: pickable })

  const cta =
    step === 0
      ? { label: 'Stel Hoot in', onClick: next }
      : step === 1
        ? { label: interests.length ? 'Verder' : 'Kies minstens één', onClick: next, disabled: !interests.length }
        : step === 2
          ? { label: 'Verder', onClick: next }
          : { label: 'Klaar · naar je Editie', onClick: finish, disabled: !(chosen || []).length }

  const visibleGroups = GROUPS.filter((g) => (!g.interest || interests.includes(g.interest)) && (!g.topic || topics.includes(g.topic)))

  return (
    <div className={`welcome ob${step === 0 ? ' ob--open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="ob-title" ref={scroller}>
      <div className="col ob__col">
        <div className="ob__top">
          <span className="ob__n" aria-label={`Stap ${step + 1} van ${STEPS}`}>
            {step + 1}
            <small>/{STEPS}</small>
          </span>
          {step > 0 ? (
            <button type="button" className="ob__back" onClick={() => setStep((s) => s - 1)}>
              ‹ Terug
            </button>
          ) : (
            <span className="ob__brand">hoot</span>
          )}
        </div>

        {step === 0 ? (
          <>
            <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__hero">
              Minder scrollen. Meer lezen.
            </h1>
            <ul className="ob__points">
              <Point Icon={EditionIcon} title="Drie keer per dag een editie" text="Tien verhalen die ertoe doen, met een einde. Om 6, 12 en 17 uur." />
              <Point Icon={SparkleIcon} title="In één minuut bij" text="Een kort overzicht van de editie, voor als je weinig tijd hebt." />
              <Point Icon={StreamIcon} title="De Stroom" text="Alles van jouw bronnen, nieuwste eerst. Lezen doe je bij de bron." />
            </ul>
            {account?.invite && account.status === 'out' ? <p className="ob__note">Je bent uitgenodigd. Inloggen kan straks rechtsboven, zodat alles meegaat naar je andere toestellen.</p> : null}
          </>
        ) : step === 1 ? (
          <>
            <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
              Wat interesseert je?
            </h1>
            <p className="ob__sub">Kies er zoveel als je wilt.</p>
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
            <p className="ob__sub">Niets aangetikt? Dan krijg je alles binnen dat onderwerp.</p>
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
        ) : (
          <>
            <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
              Jouw bronnen
            </h1>
            <p className="ob__sub">Alvast gekozen bij je interesses. Tik om aan of uit te zetten.</p>
            {pickable.length ? (
              visibleGroups.map((g) => {
                const list = pickable.filter((s) => s.cat === g.cat)
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
          {step === 0 ? (
            <button type="button" className="ob__skip" onClick={() => onDone(null)}>
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
          {s.paid ? <span className="ob__tag">abonnement</span> : null}
          {s.lang === 'en' ? <span className="ob__tag">EN</span> : null}
        </span>
        <span className="ob__sabout">{s.about}</span>
      </span>
      <span className="ob__check" aria-hidden="true" />
    </button>
  )
}
