import { ViewHeader, StatusLine, Skeleton, Empty } from '../components/Shell.jsx'
import { LeadStory, CompactItem, SocialItem, useHoot } from '../components/Items.jsx'

const COLORS = [
  ['--paper', 'Papier — achtergrond'],
  ['--surface', 'Vlak — panelen, bladen'],
  ['--ink', 'Inkt — koppen en leestekst'],
  ['--ink-2', 'Inkt 2 — samenvattingen'],
  ['--ink-3', 'Inkt 3 — metadata'],
  ['--rule', 'Lijn — scheiding'],
  ['--accent', 'Accent — het enige kleuraccent'],
  ['--accent-soft', 'Accent zacht — actieve keuze'],
  ['--warn', 'Waarschuwing — storing, offline'],
]

// Het designsysteem draait in de app zelf, met echte berichten: wat hier staat ís wat er gebouwd is.
export default function StyleGuide({ stream }) {
  const { storiesById } = useHoot()
  const withStory = stream.find((i) => i.kind === 'article' && i.storyId && i.image)
  const article = stream.find((i) => i.kind === 'article' && i.image && i.summary) || stream.find((i) => i.kind === 'article')
  const longest = [...stream].filter((i) => i.kind === 'article').sort((a, b) => b.title.length - a.title.length)[0]
  const bare = stream.find((i) => i.kind === 'article' && !i.image) || (article ? { ...article, id: article.id + '-x', image: null, summary: '' } : null)
  const post = stream.find((i) => i.kind === 'post')
  const online = { online: true, meta: { updatedAt: new Date().toISOString() } }
  return (
    <section className="view view--page" aria-label="Designsysteem">
      <div className="col sg">
        <ViewHeader title="Designsysteem" sub="Hoot — vormen, kleur en type, met echte inhoud" showSearch={false} />

        <h2 className="sect">Principes</h2>
        <ul className="sg__list">
          <li>Het verhaal is de eenheid; de bron blijft altijd zichtbaar en aanklikbaar.</li>
          <li>Lijnen en witruimte in plaats van omlijnde kaarten. Eén accentkleur.</li>
          <li>Serif voor wat je leest, schreefloos voor wat je bedient.</li>
          <li>Elk aanraakdoel is minimaal 44 × 44 px; openen, bron bekijken en bewaren zijn aparte doelen.</li>
          <li>Niets beweegt terwijl je leest. Nieuwe berichten wachten achter een knop.</li>
        </ul>

        <h2 className="sect">Kleur (licht en donker delen dezelfde namen)</h2>
        <div className="sg__swatches">
          {COLORS.map(([v, label]) => (
            <div className="sg__sw" key={v}>
              <span className="sg__chip" style={{ background: `var(${v})` }} />
              <span>
                <code>{v}</code>
                <br />
                {label}
              </span>
            </div>
          ))}
        </div>

        <h2 className="sect">Typografie</h2>
        <p className="lead__title">Hoofdverhaal — serif 28–34 px</p>
        <p className="compact__title">Gewone kop — serif 22 px</p>
        <p className="compact__sum">Samenvatting — schreefloos 17 px, regelhoogte 1,5. Bedoeld om in één oogopslag te lezen.</p>
        <p className="kicker">
          <span>Kicker 12,5 px</span>
          <span className="kicker__type">Opinie</span>
        </p>
        <p className="status">Metadata en status — 14 px</p>

        <h2 className="sect">Vorm 1 — Hoofdverhaal</h2>
        <div className="list">{article ? <LeadStory item={withStory || article} story={withStory ? storiesById.get(withStory.storyId) : null} note="1 van 10" /> : null}</div>

        <h2 className="sect">Vorm 2 — Compact bericht</h2>
        <div className="list">
          {article ? <CompactItem item={article} /> : null}
          {longest ? <CompactItem item={longest} note="Langste kop in de feed" /> : null}
          {bare ? <CompactItem item={bare} note="Zonder beeld" /> : null}
        </div>

        <h2 className="sect">Vorm 3 — Sociale bijdrage</h2>
        <div className="list">{post ? <SocialItem item={post} /> : <p className="hint">Geen sociale bijdrage geladen.</p>}</div>

        <h2 className="sect">Bediening</h2>
        <div className="chips">
          <button type="button" className="chip" aria-pressed="true">
            Gekozen
          </button>
          <button type="button" className="chip" aria-pressed="false">
            Niet gekozen
          </button>
          <button type="button" className="btn">
            Hoofdactie
          </button>
          <button type="button" className="btn btn--quiet">
            Rustige actie
          </button>
          <button type="button" className="linkbtn">
            Tekstknop
          </button>
        </div>

        <h2 className="sect">Toestanden</h2>
        <StatusLine {...online} />
        <StatusLine {...online} failed={['NRC']} />
        <StatusLine {...online} refreshError onRetry={() => {}} />
        <StatusLine {...online} online={false} />
        <Skeleton rows={2} />
        <Empty title="Lege toestand">Zegt wat er aan de hand is en wat je kunt doen.</Empty>
      </div>
    </section>
  )
}
