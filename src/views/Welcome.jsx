import { useEffect, useMemo, useRef, useState } from 'react'
import { BrandLogo } from '../components/Brand.jsx'
import { SourceMark } from '../components/Items.jsx'
import { INTERESTS, topicById, resolveTopics, suggestSources } from '../lib/topics.js'

// Onboarding in vier schermen: uitleg → interesses (breed) → onderwerpen (smal) → bronnen.
// Alles met tikken; onderaan steeds één knop om door te gaan.
const STEPS = 4

export default function Welcome({ account, sources, prefs, onDone }) {
  const [step, setStep] = useState(0)
  const [interests, setInterests] = useState(() => prefs.interests || [])
  const [picked, setPicked] = useState(() => prefs.topics || [])
  const [chosen, setChosen] = useState(null) // bronnen: pas vooraf invullen als je bij stap 4 komt
  const head = useRef(null)
  const scroller = useRef(null)

  const topics = useMemo(() => resolveTopics(interests, picked), [interests, picked])
  const pickable = sources.filter((s) => s.followed && (s.kind === 'nieuws' || s.kind === 'muziek'))

  // Nieuwe stap: bovenaan beginnen en de kop voorlezen (schermlezer).
  useEffect(() => {
    scroller.current?.scrollTo(0, 0)
    head.current?.focus({ preventScroll: true })
  }, [step])

  const toggle = (set) => (id) => set((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  const next = () => {
    if (step === 2 && chosen === null) setChosen(suggestSources(pickable, interests, topics))
    setStep((s) => s + 1)
  }
  const finish = () => onDone({ interests, topics, sources: chosen ?? suggestSources(pickable, interests, topics), all: pickable })
  const skip = () => onDone(null)

  const cta =
    step === 0
      ? { label: 'Stel Hoot in', onClick: next }
      : step === 1
        ? { label: interests.length ? 'Verder' : 'Kies minstens één', onClick: next, disabled: !interests.length }
        : step === 2
          ? { label: 'Verder', onClick: next }
          : { label: 'Klaar · naar je Editie', onClick: finish, disabled: !(chosen || []).length }

  return (
    <div className="welcome ob" role="dialog" aria-modal="true" aria-labelledby="ob-title" ref={scroller}>
      <div className="col ob__col">
        <div className="ob__top">
          {step > 0 ? (
            <button type="button" className="linkbtn" onClick={() => setStep((s) => s - 1)}>
              ‹ Terug
            </button>
          ) : (
            <BrandLogo height={36} />
          )}
          <ol className="ob__steps" aria-label={`Stap ${step + 1} van ${STEPS}`}>
            {Array.from({ length: STEPS }, (_, i) => (
              <li key={i} className={i <= step ? 'is-done' : undefined} />
            ))}
          </ol>
        </div>

        {step === 0 ? (
          <>
            <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
              Minder scrollen.
              <br />
              Meer lezen.
            </h1>
            <ul className="ob__points">
              <Point emoji="📰" title="Drie keer per dag een editie" text="Tien verhalen die ertoe doen, met een einde. Om 6, 12 en 17 uur." />
              <Point emoji="✨" title="In één minuut bij" text="Een kort overzicht van de editie, voor als je weinig tijd hebt." />
              <Point emoji="🌊" title="De Stroom" text="Alles van jouw bronnen, nieuwste eerst. Lezen doe je bij de bron." />
            </ul>
            {account?.invite && account.status === 'out' ? <p className="ob__note">Je bent uitgenodigd. Inloggen kan straks in Instellingen, zodat alles meegaat naar je andere toestellen.</p> : null}
          </>
        ) : step === 1 ? (
          <>
            <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
              Wat interesseert je?
            </h1>
            <p className="ob__sub">Kies er zoveel als je wilt.</p>
            <div className="ob__grid">
              {INTERESTS.map((i) => (
                <Tile key={i.id} emoji={i.emoji} label={i.label} on={interests.includes(i.id)} onClick={() => toggle(setInterests)(i.id)} />
              ))}
            </div>
          </>
        ) : step === 2 ? (
          <>
            <h1 id="ob-title" ref={head} tabIndex={-1} className="ob__title">
              Wat precies?
            </h1>
            <p className="ob__sub">Niets aangetikt bij een onderwerp? Dan krijg je alles daarbinnen.</p>
            {INTERESTS.filter((i) => interests.includes(i.id)).map((i) => (
              <section key={i.id} className="ob__group" aria-label={i.label}>
                <h2 className="ob__gtitle">
                  <span aria-hidden="true">{i.emoji}</span> {i.label}
                </h2>
                <div className="ob__chips">
                  {i.topics.map(topicById).map((t) => (
                    <button key={t.id} type="button" className="ob__chip" aria-pressed={picked.includes(t.id)} onClick={() => toggle(setPicked)(t.id)}>
                      <span aria-hidden="true">{t.emoji}</span> {t.label}
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
            <p className="ob__sub">Alvast gekozen bij je interesses. Tik om aan of uit te zetten.</p>
            {pickable.length ? (
              [
                ['nl', 'Nederlands'],
                ['en', 'Engels'],
              ].map(([lang, label]) => {
                const list = pickable.filter((s) => (s.lang || 'nl') === lang && (s.kind !== 'muziek' || topics.includes('muziek')))
                return list.length ? (
                  <section key={lang} className="ob__group" aria-label={label}>
                    <h2 className="ob__gtitle">{label}</h2>
                    <ul className="ob__sources">
                      {list.map((s) => (
                        <li key={s.id}>
                          <SourcePick s={s} on={(chosen || []).includes(s.id)} onClick={() => toggle(setChosen)(s.id)} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null
              })
            ) : (
              <p className="ob__sub">De bronnen worden geladen…</p>
            )}
          </>
        )}
      </div>

      <div className="ob__foot">
        <div className="col">
          <button type="button" className="btn btn--wide" onClick={cta.onClick} disabled={cta.disabled}>
            {cta.label}
          </button>
          {step === 0 ? (
            <button type="button" className="linkbtn ob__skip" onClick={skip}>
              Liever meteen lezen
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const Point = ({ emoji, title, text }) => (
  <li className="ob__point">
    <span className="ob__pemoji" aria-hidden="true">
      {emoji}
    </span>
    <span>
      <strong>{title}</strong>
      <span className="ob__ptext">{text}</span>
    </span>
  </li>
)

const Tile = ({ emoji, label, on, onClick }) => (
  <button type="button" className="ob__tile" aria-pressed={on} onClick={onClick}>
    <span className="ob__temoji" aria-hidden="true">
      {emoji}
    </span>
    <span className="ob__tlabel">{label}</span>
    <span className="ob__check" aria-hidden="true" />
  </button>
)

function SourcePick({ s, on, onClick }) {
  return (
    <button type="button" className="ob__src" aria-pressed={on} onClick={onClick}>
      <SourceMark source={s} size={40} />
      <span className="ob__stext">
        <span className="ob__sname">
          {s.name}
          {s.paid ? <span className="ob__tag">abonnement</span> : null}
        </span>
        <span className="ob__sabout">{s.about}</span>
      </span>
      <span className="ob__check" aria-hidden="true" />
    </button>
  )
}
