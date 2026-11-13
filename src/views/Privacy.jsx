import { ViewHeader } from '../components/Shell.jsx'

// Privacy: wat Hoot bewaart en met wie het praat. Alleen wat de app echt doet (zie de code:
// src/lib/store.js, feedCache.js, syncEngine.js, account.js, weather.js en de server in netlify/).
export default function Privacy({ onBack, backLabel }) {
  return (
    <section className="view view--page" aria-label="Privacy">
      <div className="col col--read prose">
        <ViewHeader title="Privacy" showSearch={false} onBack={onBack} backLabel={backLabel} />

        <p>Hoot heeft geen advertenties, geen trackers en geen analytics van anderen. Er worden geen cookies gezet. Hoot volgt je niet.</p>

        <h2 className="label label--section sect">Wat Hoot telt</h2>
        <p>
          Hoot telt alleen totalen: hoeveel Edities er vandaag zijn geopend en uitgelezen, en hoe vaak de Stroom, de Selectie, een vergelijking, een verhaal of het delen is gebruikt. Op de website telt Hoot ook hoe vaak de voorpagina wordt geopend, hoe vaak er een vraag wordt opengeklapt, waar op die pagina er op een knop naar Hoot of de App Store wordt getikt, hoe vaak het welkom wordt doorlopen en via welke link je binnenkwam, als die een kort label draagt (zoals ?via=mail); dat label haalt Hoot daarna uit de adresbalk. Zonder te weten wie. Er gaat geen
          account of id mee en er wordt niets per persoon bewaard: geen IP-adres, alleen een getal per dag, per dagdeel, platform (web of app) en appversie. Je toestel onthoudt zelf alleen dat het een dagdeel al heeft geteld. Staat Do Not Track of Global Privacy Control aan, dan telt de website niets.
        </p>

        <h2 className="label label--section sect">Op je toestel</h2>
        <p>Zonder account bewaart Hoot alles op je toestel, in de opslag van je browser:</p>
        <ul>
          <li>je instellingen, bronnen en interesses;</li>
          <li>wat je bewaarde, wat je al las en welke verhalen je zag;</li>
          <li>wat Hoot leert van wat je leest: welke onderwerpen en bronnen je vaak opent;</li>
          <li>de laatst geladen nieuwsfeed (voor een snelle start) en het weer van vandaag;</li>
          <li>waar je in een lijst was, en de laatst gebruikte inlogstap.</li>
        </ul>
        <p>Je wist dit door de websitegegevens van de site in je browser te verwijderen.</p>

        <h2 className="label label--section sect">Met een account</h2>
        <p>
          Een account is voor iedereen en altijd een keuze: Hoot werkt ook zonder. Inloggen gaat met Apple of Google. Hoot krijgt daarbij je naam en e-mailadres (bij Google ook je profielfoto; bij Apple kun je je e-mailadres
          verbergen). Je account staat bij Supabase, in de EU. Daar bewaren we, alleen voor jou leesbaar: je instellingen,
          wat je bewaarde, wat je las, welke verhalen je zag en je Editie. Zo gaan ze mee naar je andere toestellen.
        </p>
        <p>
          Log je uit, dan gaan die gegevens van dit toestel af; ze blijven in je account. Een ander account op hetzelfde toestel krijgt ze nooit te zien. Je account verwijder je zelf, in de app of op de website
          (Instellingen › Account › Account verwijderen), of je mailt naar <a href="mailto:info@gethoot.app">info@gethoot.app</a>. Dan verdwijnen je account, je instellingen en je
          bewaarde stukken van de server. Heb je ingelogd met Apple, dan trekt Hoot ook de koppeling bij Apple in.
        </p>

        <h2 className="label label--section sect">Wie we om iets vragen</h2>
        <ul>
          <li>
            <strong>Nieuwsbronnen:</strong> kop, intro en beeld komen uit hun openbare feeds. Beelden laad je rechtstreeks bij de uitgever of via de beeldservice van onze host (Netlify), zonder door
            te geven vanaf welke pagina.
          </li>
          <li>
            <strong>Beelden en logo's van elders:</strong> sommige nieuwsbeelden komen van Bing (Microsoft), de logo's van bronnen deels van Google (favicons) en van unavatar.io. Die laad je
            daar rechtstreeks, zoals elk beeld op een website: zij zien dan je IP-adres en je browser, niet wie je bent of wat je leest.
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
            <strong>Je Editie</strong> stelt de Hoot-server samen, zodat je op de website en in de app dezelfde Editie ziet. Daarvoor gaan mee: je bronnen en interesses, welke berichten je al
            las en een samenvatting van wat je vaak leest. De server gebruikt dat alleen om je Editie te maken en bewaart daarvan alleen de Editie zelf: hooguit een dag lang, en met een account in je account.
          </li>
          <li>
            <strong>De Editie in één minuut</strong> (alleen met een account): de koppen en intro's van de Editie gaan naar Anthropic (Claude) om de samenvatting te schrijven. Daar zit niets van jou in.
          </li>
        </ul>
        <p>Hoot draait bij Netlify. Zoals elke website ziet die host bij elk bezoek een IP-adres; Hoot zelf bewaart dat niet.</p>

        <h2 className="label label--section sect">De app voor iPhone en iPad</h2>
        <p>
          De app werkt zonder account en gebruikt geen analytics van anderen, advertenties of tracking. Ook de app telt alleen totalen (zie Wat Hoot telt). Zonder account blijven je instellingen, wat je bewaarde en wat je las op je iPhone of iPad;
          log je in, dan gaan ze mee met je account (zie hierboven). Wat Hoot leert van
          wat je leest (welke onderwerpen en bronnen je vaak opent) bewaart Hoot alleen op je toestel. Wat je zelf aangeeft met ‘meer
          hiervan’ of ‘minder hiervan’ bij een verhaal is een instelling: met een account gaat die mee, en je wist hem
          in Instellingen › Editie › Wat Hoot leerde. Om je Editie samen te stellen stuurt de app je bronnen, je
          onderwerpen, welke stukken je al las en een samenvatting van wat je vaak leest naar onze server; de server
          gebruikt dat alleen om je Editie te maken en bewaart daarvan alleen de Editie zelf: hooguit een dag lang, en met een account in je account.
        </p>
        <ul>
          <li>
            <strong>Het nieuws</strong> haalt de app op bij de Hoot-server, net als de website.
          </li>
          <li>
            <strong>Je eigen Editie</strong> stelt Hoot samen op de Hoot-server, net als op de website. Daarvoor gaan mee: je bronnen, interesses en Selectie-onderwerpen, wat je aangaf met ‘meer hiervan’
            en ‘minder hiervan’, welke berichten je al las en een samenvatting van wat je vaak leest (per onderwerp en bron een getal). Zonder account ook de koppen en intro's van je vorige drie Edities, zonder
            je naam en zonder een vast kenmerk van je toestel. De server stuurt de Editie terug en bewaart daarvan alleen de Editie zelf: hooguit een dag lang, en met een account in je account. Zonder verbinding stelt de app hem voorlopig zelf samen.
          </li>
          <li>
            <strong>De Hoot-lezer</strong> laadt het artikel op je toestel bij de uitgever, zoals Safari dat doet, en toont alleen de tekst en beelden. Er gaat niets via de Hoot-server. Log je in de
            lezer in bij een abonnement, dan typ je je gegevens op de site van de uitgever zelf; Hoot ziet ze niet. Wat de uitgever bewaart (je inlog, je toestemming voor cookies) blijft
            alleen in de lezer op dit toestel. Je wist het met &ldquo;Overal uitloggen in de lezer&rdquo; bij Instellingen › Artikelen › Abonnementen.
          </li>
          <li>
            <strong>Bluesky</strong> (als je dat aanzet): de app vraagt de posts van de mensen die je volgt rechtstreeks op bij de openbare Bluesky-API.
          </li>
          <li>
            <strong>Artikelen bij de uitgever</strong> (op de website of in Safari): daar gelden de regels en cookies van de uitgever.
          </li>
        </ul>
        <p>Je wist alles door de app te verwijderen, of via Instellingen in de app.</p>

        <h2 className="label label--section sect">Wie</h2>
        <p>
          Hoot is gemaakt door <a href="https://baldadig.nl" target="_blank" rel="noopener">Baldadig.nl</a> (Alex Vrees). Je hebt het recht om te weten welke gegevens we van je hebben, ze te laten
          verbeteren of verwijderen, en een klacht in te dienen bij de Autoriteit Persoonsgegevens. Zonder account hebben we niets van je; met een account regelen we het binnen een maand na je mail.
        </p>

        <h2 className="label label--section sect">Contact</h2>
        <p>
          Vragen over je gegevens? Mail naar <a href="mailto:info@gethoot.app">info@gethoot.app</a>.
        </p>
        <p>Bijgewerkt op 13 november 2026.</p>
      </div>
    </section>
  )
}
