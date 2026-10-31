import { useMemo } from 'react'
import { ViewHeader } from '../components/Shell.jsx'
import { DisplayControls } from '../components/Display.jsx'
import { useHoot } from '../components/Items.jsx'
import { Switch } from './Sources.jsx'
import { AccountSettings } from '../components/Account.jsx'
import { PLACES, NO_WEATHER } from '../lib/weather.js'
import { VAK_FIELD_IDS } from '../../shared/vak.mjs'
import { INTERESTS, topicById } from '../lib/topics.js'
import { CaretIcon, ICON_SM } from '../components/icons.jsx'
import { supplyOf, profileOf, profileSummary } from '../../shared/editor.mjs'

// Alle instellingen op één plek. Wat je al lezend wisselt staat bovenaan (zelfde rijen als
// het Weergave-paneel); daaronder wat je één keer instelt.
function Row({ label, hint, children }) {
  return (
    <div className="setrow">
      <div className="setrow__text">
        <span className="setrow__label">{label}</span>
        {hint ? <span className="setrow__hint">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

export default function Settings({ meta, account, syncStatus, affinity = null, onForgetTopic, onBack, backLabel }) {
  const { prefs, setPref } = useHoot()
  const ai = !!meta?.aiEnabled
  const interestNames = (prefs.interests || []).map((id) => INTERESTS.find((i) => i.id === id)?.label).filter(Boolean).join(', ')
  return (
    <section className="view view--page" aria-label="Instellingen">
      <div className="col col--form">
        <ViewHeader title="Instellingen" showSearch={false} account={false} onBack={onBack} backLabel={backLabel} backInNav />

        <h2 className="label label--section sect">Account</h2>
        <AccountSettings account={account} syncStatus={syncStatus} />

        <h2 className="label label--section sect">Weergave</h2>
        <DisplayControls />

        <h2 className="label label--section sect">Editie</h2>
        <div className="rows">
          <Row label="De Editie in één minuut" hint={ai ? 'Samenvatting door AI. Voor leden.' : 'Nog niet beschikbaar.'}>
            <Switch checked={prefs.brief} onChange={(v) => setPref('brief', v)} label="De Editie in één minuut" />
          </Row>
          <Row label="Buiten je bubbel" hint="Veelgelezen, niet in je Editie.">
            <Switch checked={prefs.bubble} onChange={(v) => setPref('bubble', v)} label="Buiten je bubbel" />
          </Row>
          <div className="setrow setrow--stack">
            <label className="setrow__text" htmlFor="weather-place">
              <span className="setrow__label">Weer</span>
            </label>
            <select id="weather-place" className="input" value={prefs.weatherPlace} onChange={(e) => setPref('weatherPlace', e.target.value)}>
              {PLACES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value={NO_WEATHER}>Geen weer</option>
            </select>
          </div>
          <a className="setrow setrow--link" href="#/welkom">
            <span className="setrow__text">
              <span className="setrow__label">Interesses</span>
              {interestNames ? <span className="setrow__hint">{interestNames}</span> : null}
            </span>
            <span className="caret" aria-hidden="true">
              <CaretIcon size={ICON_SM} />
            </span>
          </a>
        </div>

        <h2 className="label label--section sect">Menu</h2>
        <div className="rows">
          <Row label="Selectie" hint="Elke maandag het beste per onderwerp.">
            <Switch checked={prefs.vak.length > 0} onChange={(v) => setPref('vak', v ? VAK_FIELD_IDS : [])} label="Selectie" />
          </Row>
          <Row label="Bluesky">
            <Switch checked={prefs.bluesky} onChange={(v) => setPref('bluesky', v)} label="Bluesky" />
          </Row>
        </div>

        <Learned affinity={affinity} onForget={onForgetTopic} />

        <h2 className="label label--section sect">Over</h2>
        <p className="about">
          Hoot v{__APP_VERSION__} · gemaakt door <a href="https://baldadig.nl" target="_blank" rel="noopener">Baldadig.nl</a> · <a href="#/over">Over en contact</a> · <a href="#/privacy">Privacy</a> · <a href="#/stijl">Designsysteem</a>
          <br />
          Intro’s komen van de bron, niet van AI.
          {meta?.storage === 'blobs' ? null : ' De Editie kan nu nog wisselen.'}
        </p>
      </div>
    </section>
  )
}

// Wat Hoot van je leerde (bouwspec §8): hetzelfde profiel als De Redacteur gebruikt voor jouw
// Editie, in drie lijsten. Gekozen: je interesses en waar je 'meer hiervan' bij zei. Geleerd: wat
// je vaker opent of bewaart dan je bronnen erover schrijven (blijft op dit toestel); elk onderwerp
// met 'Vergeet dit'. Minder: waar je 'minder hiervan' bij zei, met de weg terug. Gewone taal, geen
// getallen. Zonder iets geleerd zegt de lijst dat. Wat je hier verandert telt pas bij de volgende
// Editie: die van dit dagdeel staat al en blijft staan.
function Learned({ affinity, onForget }) {
  const { prefs, setPref, itemsById, sourcesById, muted } = useHoot()
  const summary = useMemo(() => {
    const sources = [...sourcesById.values()]
    const followed = new Set(sources.filter((s) => s.kind !== 'sociaal' && !muted.has(s.id)).map((s) => s.id))
    const pool = [...itemsById.values()].filter((i) => i.kind === 'article' && followed.has(i.source))
    return profileSummary(profileOf({ interests: prefs.interests, topics: prefs.topics, affinity, taste: prefs.taste, favorites: prefs.favorites, followed, sources, supply: supplyOf(pool) }))
  }, [prefs.interests, prefs.topics, prefs.taste, prefs.favorites, affinity, itemsById, sourcesById, muted])
  const name = (id) => topicById(id)?.label || id
  // 'Minder' terugdraaien: het onderwerp weer op nul, zoals de spec zegt (niet wissen: zo blijft
  // zichtbaar in je account dat je het ooit zei, en telt het niet meer mee).
  const restore = (t) => setPref('taste', { ...prefs.taste, topics: { ...(prefs.taste?.topics || {}), [t]: 0 } })
  // 'Minder' van sterk naar mild op wat je zelf zei (de ruwe taste), niet op de berekende kans.
  const raw = (t) => prefs.taste?.topics?.[t] ?? 0
  const less = [...summary.less].sort((a, b) => raw(a) - raw(b))
  const nothingLearned = !summary.learned.length && !summary.less.length
  return (
    <>
      <h2 className="label label--section sect">Wat Hoot van je leerde</h2>
      <p className="hint learned__intro">Telt vanaf je volgende Editie.</p>
      <div className="rows">
        {summary.chosen.length ? <Row label="Gekozen" hint={summary.chosen.map(name).join(', ')} /> : null}
        {nothingLearned ? <Row label="Nog niets." /> : null}
      </div>
      {summary.learned.length ? (
        <>
          <p className="label label--meta learned__sub">Vaak gelezen</p>
          <div className="rows">
            {summary.learned.map((t) => (
              <Row key={t} label={name(t)}>
                <button type="button" className="btn btn--quiet" onClick={() => onForget?.(t)}>
                  Vergeet dit
                </button>
              </Row>
            ))}
          </div>
        </>
      ) : null}
      {less.length ? (
        <>
          <p className="label label--meta learned__sub">Minder</p>
          <div className="rows">
            {less.map((t) => (
              <Row key={t} label={name(t)}>
                <button type="button" className="btn btn--quiet" onClick={() => restore(t)}>
                  Ongedaan maken
                </button>
              </Row>
            ))}
          </div>
        </>
      ) : null}
    </>
  )
}
