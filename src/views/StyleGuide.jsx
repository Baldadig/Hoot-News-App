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

        <h2 className="label label--section sect">Principes</h2>
        <ul className="sg__list">
          <li>Het verhaal is de eenheid; de bron blijft altijd zichtbaar en aanklikbaar.</li>
          <li>Lijnen en witruimte in plaats van omlijnde kaarten. Eén accentkleur.</li>
          <li>Serif voor wat je leest, schreefloos voor wat je bedient.</li>
          <li>Elk aanraakdoel is minimaal 44 × 44 px; openen, bron bekijken en bewaren zijn aparte doelen.</li>
          <li>Niets beweegt terwijl je leest. Nieuwe berichten wachten achter een knop.</li>
        </ul>

        <h2 className="label label--section sect">Kleur (licht en donker delen dezelfde namen)</h2>
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

        <h2 className="label label--section sect">Schaal</h2>
        <ul className="sg__list">
          <li>
            <strong>Afstand</strong>: 4, 8, 12, 16, 24, 32, 48 px (<code>--s1</code> t/m <code>--s7</code>). Elke marge, padding en gap komt hiervandaan; niets daartussen.
          </li>
          <li>
            <strong>Type</strong>: 13 · 15 · 17 · 18 · 27 · 30–34 px (<code>--t1</code> t/m <code>--t6</code>). Metadata · bediening en bronnaam · leestekst · kop van een bericht · schermtitel · hoofdverhaal.
          </li>
          <li>
            <strong>Regelafstand</strong>: koppen 1,15 · bedieningsregels 1,3 · lopende tekst 1,5.
          </li>
          <li>
            <strong>Vorm</strong>: knoppen en velden 8 px · beeld en kaarten 12 px · bladen 16 px · chips en schakelaars een pil. Elk aanraakdoel is 44 px hoog.
          </li>
          <li>
            <strong>Beweging</strong>: 140 · 200 · 400 ms (<code>--dur-1</code> t/m <code>--dur-3</code>). Directe reactie · iets dat in beeld komt · iets dat van plek wisselt (de bronnenstapel en de rode streep in de Stroom, met <code>--ease-glide</code>). Bij Minder beweging staat alles direct goed.
          </li>
          <li>
            <strong>Uitlijning</strong>: één linkerlijn per scherm; de kop van een scherm is één rij van 44 px (titel, schakelaar, knoppen) met daaronder één metaregel.
          </li>
        </ul>

        <h2 className="label label--section sect">Typografie</h2>
        <p className="head-6 lead__title">Hoofdverhaal — serif 30–34 px (t6)</p>
        <p className="head-4 compact__title">Kop van een bericht — serif 18 px (t4)</p>
        <p className="lead__sum">Leestekst — schreefloos 17 px (t3), regelafstand 1,5. Intro van het hoofdverhaal en lopende tekst.</p>
        <p className="compact__sum">Intro in een lijst — schreefloos 15 px (t2), regelafstand 1,5.</p>
        <p className="label label--kicker kicker">
          <span>Kicker 13 px (t1)</span>
          <span className="kicker__type">Opinie</span>
        </p>
        <p className="status">Metadata en status — 13 px (t1); bronnaam en bediening — 15 px (t2)</p>

        <h2 className="label label--section sect">Vorm 1 — Hoofdverhaal</h2>
        <div className="list">{article ? <LeadStory item={withStory || article} story={withStory ? storiesById.get(withStory.storyId) : null} note="1 van 10" /> : null}</div>

        <h2 className="label label--section sect">Vorm 2 — Compact bericht</h2>
        <div className="list">
          {article ? <CompactItem item={article} /> : null}
          {longest ? <CompactItem item={longest} note="Langste kop in de feed" /> : null}
          {bare ? <CompactItem item={bare} note="Zonder beeld" /> : null}
        </div>

        <h2 className="label label--section sect">Vorm 3 — Sociale bijdrage</h2>
        <div className="list">{post ? <SocialItem item={post} /> : <p className="hint">Geen sociale bijdrage geladen.</p>}</div>

        <h2 className="label label--section sect">Bediening</h2>
        <div className="chips">
          <button type="button" className="pill" aria-pressed="true">
            Gekozen
          </button>
          <button type="button" className="pill" aria-pressed="false">
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

        <h2 className="label label--section sect">Toestanden</h2>
        <StatusLine {...online} />
        <StatusLine {...online} allDown onRetry={() => {}} />
        <StatusLine {...online} refreshError onRetry={() => {}} />
        <StatusLine {...online} online={false} />
        <Skeleton rows={2} />
        <Empty title="Lege toestand">Zegt wat er aan de hand is en wat je kunt doen.</Empty>
        <div className="listempty">
          <p>Nog niets van NOS in Wereld.</p>
          <button type="button" className="listempty__btn">
            Toon alle bronnen
          </button>
        </div>
      </div>
    </section>
  )
}
