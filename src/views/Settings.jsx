import { ViewHeader } from '../components/Shell.jsx'
import { DisplayControls } from '../components/Display.jsx'
import { useHoot } from '../components/Items.jsx'
import { Switch } from './Sources.jsx'
import { AccountSettings } from '../components/Account.jsx'
import { PLACES, NO_WEATHER } from '../lib/weather.js'
import { VAK_FIELD_IDS } from '../../shared/vak.mjs'
import { tasteSummary, emptyTaste } from '../lib/affinity.js'
import { topicById } from '../lib/topics.js'

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

export default function Settings({ meta, account, syncStatus, onBack, backLabel }) {
  const { prefs, setPref } = useHoot()
  const ai = !!meta?.aiEnabled
  return (
    <section className="view view--page" aria-label="Instellingen">
      <div className="col">
        <ViewHeader title="Instellingen" showSearch={false} onBack={onBack} backLabel={backLabel} />

        <h2 className="sect">Account</h2>
        <AccountSettings account={account} syncStatus={syncStatus} />

        <h2 className="sect">Weergave</h2>
        <DisplayControls />

        <h2 className="sect">Editie</h2>
        <Row label="De Editie in één minuut" hint={ai ? 'AI-samenvatting van de Editie. Voor leden, op uitnodiging.' : 'Nog niet beschikbaar.'}>
          <Switch checked={prefs.brief} onChange={(v) => setPref('brief', v)} label="De Editie in één minuut" />
        </Row>
        <Row label="Buiten je bubbel" hint="Wat anderen nu lezen en niet in je Editie staat.">
          <Switch checked={prefs.bubble} onChange={(v) => setPref('bubble', v)} label="Buiten je bubbel" />
        </Row>
        <div className="setrow setrow--stack">
          <label className="setrow__text" htmlFor="weather-place">
            <span className="setrow__label">Weer in de Editie</span>
            <span className="setrow__hint">Naast de datum.</span>
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
        <Row label="Edities" hint="Om 6, 12 en 17 uur tien verhalen. Daarna ligt de Editie vast." />

        <h2 className="sect">Extra</h2>
        <Row label="Selectie in het menu" hint="Elke maandag per onderwerp de drie belangrijkste stukken. Onderwerpen kies je in de Selectie.">
          <Switch checked={prefs.vak.length > 0} onChange={(v) => setPref('vak', v ? VAK_FIELD_IDS : [])} label="Selectie in het menu" />
        </Row>
        <Row label="Bluesky in het menu" hint="Posts van mensen die je volgt.">
          <Switch checked={prefs.bluesky} onChange={(v) => setPref('bluesky', v)} label="Bluesky in het menu" />
        </Row>

        <h2 className="sect">Bronnen</h2>
        <a className="setrow setrow--link" href="#/welkom">
          <span className="setrow__text">
            <span className="setrow__label">Interesses opnieuw kiezen</span>
            <span className="setrow__hint">Wat bij je interesses past, gaat voor in je Editie. Ook wat je vaak opent of bewaart weegt mee (dat blijft op dit toestel). Voorkeursbronnen kies je met de ster bij Bronnen.</span>
          </span>
          <span aria-hidden="true">›</span>
        </a>
        <Learned taste={prefs.taste} onClear={() => setPref('taste', emptyTaste())} />
        <a className="setrow setrow--link" href="#/bronnen">
          <span className="setrow__text">
            <span className="setrow__label">Bronnen</span>
            <span className="setrow__hint">Aan- en uitzetten.</span>
          </span>
          <span aria-hidden="true">›</span>
        </a>

        <h2 className="sect">Over</h2>
        <p className="about">
          Hoot v{__APP_VERSION__} · gemaakt door <a href="https://baldadig.nl" target="_blank" rel="noopener">Baldadig.nl</a> · <a href="#/over">Over en contact</a> · <a href="#/privacy">Privacy</a> · <a href="#/stijl">Designsysteem</a>
          <br />
          Samenvattingen komen van de bron. Alleen de Editie in één minuut is door AI geschreven.
          {meta?.storage === 'blobs' ? null : ' Edities worden nu niet vast bewaard en kunnen wisselen.'}
        </p>
      </div>
    </section>
  )
}

// Wat je zelf aangaf met "meer of minder hiervan" bij een verhaal in de Editie (gaat mee met je
// account), met de weg terug. Zonder keuzes: niets tonen.
function Learned({ taste, onClear }) {
  const { more, less } = tasteSummary(taste)
  if (!more.length && !less.length) return null
  const names = (ids) => ids.slice(0, 6).map((id) => topicById(id)?.label || id).join(', ')
  return (
    <div className="setrow">
      <span className="setrow__text">
        <span className="setrow__label">Wat Hoot van je leerde</span>
        <span className="setrow__hint">
          {more.length ? <>Meer: {names(more)}. </> : null}
          {less.length ? <>Minder: {names(less)}. </> : null}
          Dit geef je aan bij een verhaal in de Editie (⋯), en het gaat mee met je account.
        </span>
      </span>
      <button type="button" className="btn btn--quiet" onClick={onClear}>
        Wissen
      </button>
    </div>
  )
}
