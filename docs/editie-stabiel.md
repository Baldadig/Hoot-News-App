# Editie stabiel (15 november 2026)

Melding van Alex, als lid op de iPhone (TestFlight build 58, app 1.4) en waarschijnlijk ook op het web: "Mijn ochtend editie is al 3x gewijzigd. Zomaar." Een Editie hoort het hele dagdeel gelijk te blijven.

## Oorzaken

1. **De server schreef over de Editie in je account heen.** Dat gebeurde zodra een vraag een andere afdruk (`basis`) had dan de rij. `fitsAny` keek naar het id en de afdruk. Paste die niet, dan rekende de server opnieuw en legde hij die Editie vast met `claimOver` over de rij die hij net las. Zo won de laatste vrager met een andere afdruk, en niet de eerste schrijver. Elke nieuwe berekening viel echt anders uit: wat je las, het leesprofiel van dat toestel, de delen na de feedronde en na de deploy een nieuwe Redacteur. Met web, app en weer het web gaf dat drie Edities.
2. **Het vangnet en de server wisselden elkaar af.** Na de deploy waren de functie-instanties koud. Het toestel wachtte te lang, toonde zijn eigen Editie en verving die daarna door die van de server.
3. **`composed` werd niet vastgelegd, maar het toestel bewaarde haar wel.** Verloor een vraag de claim, dan toonde dat toestel een Editie die niet in je account stond.

De deploy of de revisie is voor leden geen losse oorzaak: `fitsAny` kijkt niet naar `revision`. Zonder account wel: de revisie stond in de sleutel van de cache.

## Herstel (alleen de server)

- **Eén Editie per dagdeel.** Staat er een Editie van dit dagdeel in je account, dan geldt die, wie haar ook schreef en met welke afdruk. De server leest je account en je instellingen (`edition, prefs`) in één keer, en rekent de afdruk van je account zoals een toestel dat doet na het ophalen (`accountBasesOf`).
- **Het merk van je account (`prefsMark`).** Elke Editie die de server als lid samenstelt, draagt het merk van de keuze in je account op dat moment (`prefsMarkOf`, een sha van de afdrukken van je account), ook als de vrager zelf afwijkt. Alleen als de rij zo'n merk heeft, je account nu een ander merk geeft en de vraag bij je account past, rekent de server opnieuw: je koos echt iets anders, en dat staat al in je account. In alle andere gevallen gaat de rij terug: met de afdruk van de vraag als die bij de rij of (bij dezelfde keuze) bij je account past, anders zoals ze is. Het toestel toont haar, want het web en iOS kijken naar dagdeel en lezer, en vraagt een volgende ronde opnieuw.
- **Een rij zonder merk** (door een toestel zelf vastgelegd, zoals het vangnet van iOS, of van voor dit herstel) blijft het hele dagdeel staan. Een keuzewijziging gaat dan hooguit pas het volgende dagdeel mee.
- **Vraagt een afwijkend toestel als eerste** (een oudere bronnenlijst, een keuze die nog niet is weggeschreven, iOS zonder `onderwerpen`), dan stelt de server samen met de keuze uit je account (bronnen, interesses, onderwerpen en voorkeursbronnen uit `prefs`) en met smaak, wat je las en het leesprofiel van de vraag. Zo is de eerste schrijver ook dan de Editie van jouw keuze, en herkent het web haar daarna als de zijne.
- **Tegelijk:** rekent een instantie al een Editie voor jou en dit dagdeel, dan wacht een tweede vraag daarop in plaats van zelf te rekenen. Over instanties heen beslist `claimOver`, en de verliezer krijgt de Editie die er staat.
- **Afwijking van het plan, bewust:** een vraag die niet bij je account past, krijgt de rij zonder de afdruk van de vraag. Het web schrijft je instellingen pas twee seconden na een wijziging weg, maar vraagt de server meteen. Met die stempel zou je nieuwe keuze tot het volgende dagdeel verdwijnen. Nu neemt de volgende ronde je keuze mee.
- **Nooit meer `composed` voor leden.** Verliest de server de claim, dan geeft hij de Editie die er staat.
- **Een kopie per lid en dagdeel** (`pe-member:<sha256 user-id>:<dagdeel-id>`, opgeruimd na twee dagdelen). Die kopie wordt bewaard na een claim of een treffer, één keer per instantie. Is je account even niet te lezen of te schrijven, dan krijg je de kopie in plaats van een 503. Zonder rij in user_state geldt de kopie het hele dagdeel (`kopie`).
- **Sneller.** Je account wordt tegelijk met de kern gelezen. `loadStart` leest ook koud eerst het startbestand uit Blobs: nagekeken, dat deed het al. Na elke deploy maakt `netlify/functions/deploy-succeeded.mjs` /api/edition warm.
- **Zonder account** staat EDITOR_REVISION niet meer in de sleutel van de cache. Wat je las (`readIds`) blijft er wel in.
- EDITOR_REVISION is niet verhoogd: wat De Redacteur kiest, verandert niet.

## Toetsen

`tests/editie-stabiel.test.mjs` speelt elk mechanisme na:

- web, app en web met een andere afdruk;
- een afwijkend toestel eerst en daarna het web, en beide tegelijk;
- een rij die een toestel zelf vastlegde (zonder merk);
- een toestel dat net anders rekent;
- een echte keuzewijziging;
- een vraag vóór de wijziging in je account staat;
- een deploy met een nieuwe revisie en een nieuwe feedronde;
- een account dat niet te lezen of te schrijven is;
- een verloren claim;
- de cache zonder account;
- geen rij in user_state;
- het warm maken na een deploy.

`tests/editie-vast.test.mjs` is bijgewerkt: een echte wijziging telt pas als ze in je account staat.

## Vervolg in de app en op het web (niet nu)

- **iOS:**
  - het vangnet niet tonen als er in dit dagdeel al een Editie van de server was;
  - `provisional()` niet opnieuw rekenen binnen dezelfde taak;
  - de CodingKeys zonder `onderwerpen` nakijken (HootStore.swift, migratie bij elke pull);
  - `acceptServer` kan `source` gebruiken.
- **Web:**
  - `hoot:my-edition-provisional` niet tonen vóór het antwoord van de server na herladen;
  - een mislukte dynamische import van personal.js na een deploy opvangen met herladen;
  - na het wegschrijven van gewijzigde instellingen opnieuw vragen, zodat een nieuwe keuze meteen meegaat.
