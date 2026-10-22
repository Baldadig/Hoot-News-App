import { ViewHeader } from '../components/Shell.jsx'

// Privacy: wat Hoot bewaart en met wie het praat. Alleen wat de app echt doet (zie de code:
// src/lib/store.js, feedCache.js, syncEngine.js, account.js, weather.js en de server in netlify/).
export default function Privacy({ onBack, backLabel }) {
  return (
    <section className="view view--page" aria-label="Privacy">
      <div className="col prose">
        <ViewHeader title="Privacy" showSearch={false} onBack={onBack} backLabel={backLabel} />

        <p>Hoot heeft geen advertenties, geen trackers en geen analytics. Er worden geen cookies gezet.</p>

        <h2 className="sect">Op je toestel</h2>
        <p>Zonder account blijft alles op je toestel, in de opslag van je browser:</p>
        <ul>
          <li>je instellingen, bronnen en interesses;</li>
          <li>wat je bewaarde, wat je al las en welke verhalen je zag;</li>
          <li>de laatst geladen nieuwsfeed (voor een snelle start) en het weer van vandaag;</li>
          <li>waar je in een lijst was, en de laatst gebruikte inlogstap.</li>
        </ul>
        <p>Je wist dit door de websitegegevens van hootnews.nl in je browser te verwijderen.</p>

        <h2 className="sect">Met een account</h2>
        <p>
          Inloggen gaat met Google. Hoot krijgt daarbij je naam, e-mailadres en profielfoto. Je account staat bij Supabase, in de EU. Daar bewaren we, alleen voor jou leesbaar: je instellingen,
          wat je bewaarde, wat je las en welke verhalen je zag. Zo gaan ze mee naar je andere toestellen.
        </p>
        <p>
          Log je uit, dan gaan die gegevens van dit toestel af; ze blijven in je account. Een ander account op hetzelfde toestel krijgt ze nooit te zien. Wil je je account laten verwijderen, vraag het
          dan aan Alex Vrees.
        </p>

        <h2 className="sect">Wie we om iets vragen</h2>
        <ul>
          <li>
            <strong>Nieuwsbronnen:</strong> kop, intro en beeld komen uit hun openbare feeds. Beelden laad je rechtstreeks bij de uitgever of via de beeldservice van onze host (Netlify), zonder door
            te geven vanaf welke pagina.
          </li>
          <li>
            <strong>Artikelen</strong> open je bij de bron zelf. Daar gelden hun regels en hun cookies.
          </li>
          <li>
            <strong>Het weer:</strong> Open-Meteo, voor de plaats die je zelf kiest. Je locatie vragen we nooit.
          </li>
          <li>
            <strong>Bluesky</strong> (als je dat aanzet): de openbare Bluesky-API, voor accounts die je zelf toevoegt.
          </li>
          <li>
            <strong>De editie in één minuut:</strong> de koppen en intro's van de editie gaan naar Anthropic (Claude) om de samenvatting te schrijven. Daar zit niets van jou in.
          </li>
        </ul>
        <p>Hoot draait bij Netlify. Zoals elke website ziet die host bij elk bezoek een IP-adres; Hoot zelf bewaart dat niet.</p>
      </div>
    </section>
  )
}
