import { ViewHeader } from '../components/Shell.jsx'
import { DisplayControls } from '../components/Display.jsx'
import { useHoot } from '../components/Items.jsx'
import { Switch } from './Sources.jsx'

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

export default function Settings({ meta, onBack }) {
  const { prefs, setPref } = useHoot()
  const ai = !!meta?.aiEnabled
  const ip = !!meta?.instapaper
  return (
    <section className="view view--page" aria-label="Instellingen">
      <div className="col">
        <ViewHeader title="Instellingen" showSearch={false} onBack={onBack} backLabel="Bronnen" />

        <h2 className="sect">Weergave</h2>
        <DisplayControls />

        <h2 className="sect">Lezen</h2>
        <Row label="Bewaren ook naar Instapaper" hint={ip ? 'Gekoppeld: het bladwijzertje stuurt een bericht ook naar je Instapaper.' : 'Nog niet gekoppeld. Voeg je Instapaper-gegevens toe in Netlify (stappen in de README).'}>
          <Switch checked={prefs.instapaper && ip} onChange={(v) => setPref('instapaper', v)} label="Bewaren ook naar Instapaper" />
        </Row>
        <Row label="Voorleesknop in de Editie" hint={meta?.tts ? 'Leest de editie voor met een natuurlijke Nederlandse stem (ook als je scherm uitgaat, met knoppen op je toegangsscherm).' : 'Leest kop en kern voor met de stem van je toestel. Een natuurlijke stem kan via Azure (gratis tot ruim genoeg voor drie edities per dag; stappen in de README).'}>
          <Switch checked={prefs.readAloud} onChange={(v) => setPref('readAloud', v)} label="Voorleesknop in de Editie" />
        </Row>
        {meta?.tts ? (
          <div className="drow">
            <span className="drow__label">Stem</span>
            <div className="seg" role="group" aria-label="Stem">
              {[
                ['fenna', 'Fenna'],
                ['maarten', 'Maarten'],
                ['colette', 'Colette'],
              ].map(([id, label]) => (
                <button key={id} type="button" className="seg__btn seg__btn--text" aria-pressed={prefs.voice === id} onClick={() => setPref('voice', id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <h2 className="sect">Editie</h2>
        <Row label="De editie in één minuut" hint={ai ? 'Een AI-overzicht van 150 woorden, geschreven uit de koppen en samenvattingen van de editie. Drie keer per dag.' : 'Nog niet gekoppeld. Voeg je Anthropic-sleutel toe in Netlify (stappen in de README); kost ongeveer twee tot drie euro per maand.'}>
          <Switch checked={prefs.brief} onChange={(v) => setPref('brief', v)} label="De editie in één minuut" />
        </Row>
        <Row label="Buiten je bubbel" hint="Drie verhalen die anderen nu lezen of zoeken (Google Trends, Bluesky, Wikipedia) en die niet in je editie zitten — ook uit bronnen die je niet volgt.">
          <Switch checked={prefs.bubble} onChange={(v) => setPref('bubble', v)} label="Buiten je bubbel" />
        </Row>
        <Row label="Edities" hint="Ochtend om 06:00, middag om 12:00, avond om 17:00, elk tien verhalen. Per rubriek het belangrijkste verhaal van dat moment — binnenland, buitenland, VS, Midden-Oosten, Oekraïne en wetenschap — plus één verhaal van buiten je bubbel; de overige plekken gaan naar wat verder het meeste nieuws is. Belangrijk betekent: waar de meeste bronnen over schrijven, met voorrang voor je eigen bronnen en voor wat net gebeurd is. Elke gebeurtenis staat er één keer in. Er telt geen klikgedrag mee, en na het samenstellen verandert een editie niet meer." />

        <h2 className="sect">Bronnen</h2>
        <a className="setrow setrow--link" href="#/bronnen">
          <span className="setrow__text">
            <span className="setrow__label">Bronnen en volgorde van onderwerpen</span>
            <span className="setrow__hint">Welke bronnen meedoen, Bluesky-accounts, bronstatus.</span>
          </span>
          <span aria-hidden="true">›</span>
        </a>

        <h2 className="sect">Over</h2>
        <p className="about">
          Hoot v{__APP_VERSION__} · <a href="#/stijl">Designsysteem</a> · <a href="#/welkom">Welkomscherm</a>
          <br />
          {meta?.storage === 'blobs' ? 'Edities en verhalen worden vast bewaard.' : 'Edities en verhalen worden op dit moment niet vast bewaard en kunnen tussentijds wisselen.'} Samenvattingen komen rechtstreeks van de bron. De Volkskrant levert in haar feed alleen koppen; daar komt de voorvertoning (de eigen inleiding van het artikel) uit de zoekindex van Bing, of — met "via" erbij — van een andere bron over hetzelfde nieuws. Alleen "De editie in één minuut" is door AI geschreven.
        </p>
      </div>
    </section>
  )
}
