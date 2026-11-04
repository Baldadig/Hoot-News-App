import { useMemo } from 'react'
import { ViewHeader } from '../components/Shell.jsx'
import { DisplayControls, MenuRow, StreamLayoutRow } from '../components/Display.jsx'
import { useHoot } from '../components/Items.jsx'
import { Switch } from './Sources.jsx'
import { AccountSettings } from '../components/Account.jsx'
import { PLACES, NO_WEATHER } from '../lib/weather.js'
import { VAK_FIELD_IDS } from '../../shared/vak.mjs'
import { INTERESTS, topicById } from '../lib/topics.js'
import { CaretIcon, ICON_SM } from '../components/icons.jsx'
import { supplyOf, profileOf, profileSummary } from '../../shared/editor.mjs'
import { hootSummary } from '../lib/settings-summary.js'

// Instellingen A (concepten-2/6-instellingen.html): één blad, geordend op wat je als lezer wilt
// doen. Bovenaan je account met de samenvatting van je Hoot, dan Jouw Hoot, Lezen, Stroom en Over
// Hoot. Koppen in gewone zinsvorm (I7), keuzes als menu met een vinkje (I4), geen rode segmenten.
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

// Een rij naar een ander scherm: de waarde links onder het label (I1), nooit afgekapt, en de caret rechts.
function LinkRow({ href, label, hint }) {
  return (
    <a className="setrow setrow--link" href={href}>
      <span className="setrow__text">
        <span className="setrow__label">{label}</span>
        {hint ? <span className="setrow__hint">{hint}</span> : null}
      </span>
      <span className="caret" aria-hidden="true">
        <CaretIcon size={ICON_SM} />
      </span>
    </a>
  )
}

export default function Settings({ meta, account, syncStatus, affinity = null, onForgetTopic, onBack, backLabel }) {
  const { prefs, setPref, theme, sourcesById, muted } = useHoot()
  const ai = !!meta?.aiEnabled
  const interestNames = (prefs.interests || []).map((id) => INTERESTS.find((i) => i.id === id)?.label).filter(Boolean).join(', ')
  const followed = [...(sourcesById?.values() || [])].filter((s) => s.kind !== 'sociaal' && !muted?.has(s.id)).length
  const summary = hootSummary({ interests: (prefs.interests || []).length, sources: followed })
  const vak = prefs.vak.length
  return (
    <section className="view view--page" aria-label="Instellingen">
      <div className="col col--form">
        <ViewHeader title="Instellingen" showSearch={false} account={false} onBack={onBack} backLabel={backLabel} backInNav />

        <AccountSettings account={account} syncStatus={syncStatus} summary={summary} manage />

        <h2 className="sect sect--plain">Jouw Hoot</h2>
        <div className="rows">
          <LinkRow href="#/welkom" label="Interesses" hint={interestNames || 'Alle interesses'} />
          <LinkRow href="#/bronnen" label="Bronnen" hint={followed === 1 ? '1 bron' : `${followed} bronnen`} />
          <Row label="Selectie" hint={vak ? (vak === 1 ? '1 onderwerp' : `${vak} onderwerpen`) : 'Elke maandag het beste per onderwerp.'}>
            <Switch checked={vak > 0} onChange={(v) => setPref('vak', v ? VAK_FIELD_IDS : [])} label="Selectie" />
          </Row>
          <Row label="Buiten je bubbel" hint="Een extra verhaal naast je Editie.">
            <Switch checked={prefs.bubble} onChange={(v) => setPref('bubble', v)} label="Buiten je bubbel" />
          </Row>
          <Row label="De Editie in één minuut" hint={ai ? 'Samenvatting door AI. Met een account.' : 'Nog niet beschikbaar.'}>
            <Switch checked={prefs.brief} onChange={(v) => setPref('brief', v)} label="De Editie in één minuut" />
          </Row>
          <MenuRow label="Weer" value={prefs.weatherPlace} onChange={(v) => setPref('weatherPlace', v)} options={[...PLACES.map((p) => ({ value: p.id, label: p.name })), { value: NO_WEATHER, label: 'Geen weer' }]} />
        </div>

        <Learned affinity={affinity} onForget={onForgetTopic} />

        <h2 className="sect sect--plain">Lezen</h2>
        <DisplayControls stream={false} />
        {theme === 'system' ? <p className="hint setfoot">Automatisch volgt je toestel.</p> : null}

        <h2 className="sect sect--plain">Stroom</h2>
        <div className="rows">
          <StreamLayoutRow />
          <Row label="Bluesky in de Stroom" hint="Kies je accounts bij Bronnen.">
            <Switch checked={prefs.bluesky} onChange={(v) => setPref('bluesky', v)} label="Bluesky in de Stroom" />
          </Row>
        </div>

        <h2 className="sect sect--plain">Over Hoot</h2>
        <div className="rows">
          <LinkRow href="#/toestel" label="Op dit toestel" />
          <LinkRow href="#/over" label="Over en contact" />
          <LinkRow href="#/privacy" label="Privacy" />
        </div>
        <p className="hint setfoot">
          Hoot {__APP_VERSION__} · gemaakt door <a href="https://baldadig.nl" target="_blank" rel="noopener">Baldadig</a>. Intro’s komen van de bron, niet van AI.
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
      <h2 className="sect sect--plain">Wat Hoot van je leerde</h2>
      <p className="hint learned__intro">Telt vanaf je volgende Editie.</p>
      <div className="rows">
        {summary.chosen.length ? <Row label="Gekozen" hint={summary.chosen.map(name).join(', ')} /> : null}
        {nothingLearned ? <Row label="Nog niets." /> : null}
      </div>
      {summary.learned.length ? (
        <>
          <p className="learned__sub">Vaak gelezen</p>
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
          <p className="learned__sub">Minder</p>
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
