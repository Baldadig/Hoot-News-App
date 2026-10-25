import { ViewHeader } from '../components/Shell.jsx'

// Over en contact: wie Hoot maakt en hoe je hem bereikt. Dit is ook de support-pagina van de
// app in de App Store (Apple eist een pagina met een manier om contact op te nemen).
const MAIL = 'hallo@hootnews.nl'

export default function Over({ onBack, backLabel }) {
  return (
    <section className="view view--page" aria-label="Over Hoot">
      <div className="col prose">
        <ViewHeader title="Over Hoot" showSearch={false} onBack={onBack} backLabel={backLabel} />

        <p>
          Hoot zet je nieuws op een rij en houdt dan op: drie keer per dag een editie van tien verhalen, een Stroom met de bronnen die jij kiest, en elke maandag een Digest voor je vak. Hoot is
          gratis, heeft geen advertenties en volgt je niet.
        </p>
        <p>Hoot is een onafhankelijk project van Alex Vrees.</p>

        <h2 className="sect">Contact</h2>
        <p>
          Een vraag, een idee, of werkt er iets niet? Mail naar <a href={`mailto:${MAIL}`}>{MAIL}</a>. Je krijgt antwoord van Alex.
        </p>

        <h2 className="sect">Veelgestelde vragen</h2>
        <h3>Hoe kies ik mijn bronnen?</h3>
        <p>
          Op de website via <a href="#/bronnen">Bronnen</a>; in de app via het tandwiel rechtsboven → Bronnen. Gratis bronnen zijn gemarkeerd.
        </p>
        <h3>Waarom zie ik een betaalmuur?</h3>
        <p>
          Sommige bronnen vragen een abonnement. Hoot opent het artikel bij de uitgever zelf. In de app openen betaalde bronnen daarom standaard in Safari, waar je al bent ingelogd bij je
          abonnementen.
        </p>
        <h3>Wanneer verschijnt de editie?</h3>
        <p>Om 6, 12 en 17 uur. Daarna ligt hij vast, zodat je hem uit kunt lezen. De Digest verschijnt elke maandag om 7 uur.</p>
        <h3>Wat gebeurt er met mijn gegevens?</h3>
        <p>
          Zo weinig mogelijk: zie <a href="#/privacy">Privacy</a>.
        </p>
      </div>
    </section>
  )
}
