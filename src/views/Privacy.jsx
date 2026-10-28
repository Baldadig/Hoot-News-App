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
          Inloggen gaat met Google, en in de app ook met Apple. Hoot krijgt daarbij je naam en e-mailadres (bij Google ook je profielfoto; bij Apple kun je je e-mailadres
          verbergen). Je account staat bij Supabase, in de EU. Daar bewaren we, alleen voor jou leesbaar: je instellingen,
          wat je bewaarde, wat je las en welke verhalen je zag. Zo gaan ze mee naar je andere toestellen.
        </p>
        <p>
          Log je uit, dan gaan die gegevens van dit toestel af; ze blijven in je account. Een ander account op hetzelfde toestel krijgt ze nooit te zien. Je account verwijder je zelf in de app
          (Instellingen › Account › Account verwijderen), of je mailt naar <a href="mailto:hallo@hootnews.nl">hallo@hootnews.nl</a>. Dan verdwijnen je account, je instellingen en je
          bewaarde stukken van de server.
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

        <h2 className="sect">De app voor iPhone en iPad</h2>
        <p>
          De app werkt zonder account en gebruikt geen analytics, advertenties of tracking. Zonder account blijven je instellingen, wat je bewaarde en wat je las op je iPhone of iPad;
          log je in, dan gaan ze mee met je account (zie hierboven). Ook wat Hoot leert van
          wat je leest (welke onderwerpen en bronnen je vaak opent) blijft op je toestel.
        </p>
        <ul>
          <li>
            <strong>Het nieuws</strong> haalt de app op bij hootnews.nl, net als de website.
          </li>
          <li>
            <strong>Je eigen editie:</strong> om die samen te stellen stuurt de app je bronnen, interesses, voorkeursbronnen en die leesvoorkeuren (zonder je naam, zonder een vast kenmerk van je
            toestel) naar hootnews.nl. De server stelt je editie samen, stuurt hem terug en bewaart niets van wat je stuurde.
          </li>
          <li>
            <strong>De Hoot-lezer</strong> laadt het artikel op je toestel bij de uitgever, zoals Safari dat doet, en toont alleen de tekst en beelden. Er gaat niets via hootnews.nl. Log je in de
            lezer in bij een abonnement, dan typ je je gegevens op de site van de uitgever zelf; Hoot ziet ze niet. Wat de uitgever bewaart (je inlog, je toestemming voor cookies) blijft
            alleen in de lezer op dit toestel. Je wist het met &ldquo;Overal uitloggen in de lezer&rdquo; bij Instellingen › Abonnementen.
          </li>
          <li>
            <strong>Bluesky</strong> (als je dat aanzet): de app vraagt de posts van de mensen die je volgt rechtstreeks op bij de openbare Bluesky-API.
          </li>
          <li>
            <strong>Artikelen bij de uitgever</strong> (op de website of in Safari): daar gelden de regels en cookies van de uitgever.
          </li>
        </ul>
        <p>Je wist alles door de app te verwijderen, of via Instellingen in de app.</p>

        <h2 className="sect">Wie</h2>
        <p>
          Hoot is gemaakt door <a href="https://baldadig.nl" target="_blank" rel="noopener">Baldadig.nl</a> (Alex Vrees). Je hebt het recht om te weten welke gegevens we van je hebben, ze te laten
          verbeteren of verwijderen, en een klacht in te dienen bij de Autoriteit Persoonsgegevens. Zonder account hebben we niets van je; met een account regelen we het binnen een maand na je mail.
        </p>

        <h2 className="sect">Contact</h2>
        <p>
          Vragen over je gegevens? Mail naar <a href="mailto:hallo@hootnews.nl">hallo@hootnews.nl</a>.
        </p>
        <p>Bijgewerkt op 28 oktober 2026.</p>
      </div>
    </section>
  )
}
