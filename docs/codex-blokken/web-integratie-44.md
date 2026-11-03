# Web-integratie · 3 november 2026

Alles wat nog voor het web ontbrak is samengebracht op **`web-integratie-44`**, vanaf de gecontroleerde actuele lokale én externe main **`e09202c`**. Productcommit **`145ab13`** bevat uitsluitend 38 web-, bouw- en testbestanden. Deze bestanden zijn bytegelijk aan de definitieve webstand van `build-44-merkovergang` (`d05d0c7`); dit is een gerichte selectie, geen merge van de volledige iOS-branch.

De branch wordt na afronden uitgecheckt in de gewone repository **Hoot-News-App**, zodat Alex hem in GitHub Desktop kan publiceren. De tijdelijke controle gebruikte de bestaande werkmap Hoot-opschonen-web, met zijn al aanwezige symlink naar de passende beta-node_modules. Die werkmap keert daarna terug naar haar oorspronkelijke branch. Geen nieuwe werkmap of dubbele bronkopie achtergelaten.

## In dit pakket

1. **Webupdates:** nieuwe service worker onder `/lees/`, oude root-worker netjes uitfaseren, updatebeleid zonder een open leessessie te herladen of lokale gegevens te wissen. Inclusief de noodzakelijke wijzigingen in `scripts/build-site.mjs` en `scripts/retire-root-worker.js`.
2. **Bluesky:** berichten in de Stroom, geen afzonderlijke Bluesky-pagina meer; bronbeheer per account en behoud van de bestaande tijdsgrens/profielsync.
3. **Video:** systeemfullscreen, rustige zwarte videoachtergrond en geen nieuwe automatische geluidsweergave.
4. **Rubrieken:** goedgekeurde crossfade van 200 ms voor tekst en beeld; directe wissel bij Verminder beweging, begrensde oude beeldlaag en behoud van scrollpositie.
5. **Nacht:** de gekozen leesinkt Zacht papier, uitsluitend in Nacht. Bestaande Licht/Donker-regressies blijven gecontroleerd.
6. **Onboarding:** oorspronkelijke rode intro en drie oorspronkelijke uitlegslides blijven staan; daarbinnen de nieuwe bronvolglijst met zoeken, Ontdekken/Alle bronnen/Volgend en rangschikking op interesses. Selectie blijft een afzonderlijke stap.
7. **Bubbeluitleg:** ‘Een extra verhaal naast je Editie.’

De bijbehorende webtests en twee bestaande visuele testpagina's zijn meegenomen. Er zijn geen bestaande main-tests verwijderd. De uitsluitend native app-icoonassettest uit de gemengde buildbranch is bewust niet toegevoegd: deze webbranch voegt geen native alternatieve iconen toe. Daarom 1019 geslaagde tests in dit pakket tegenover 1020 in de gemengde buildbranch; de main-basis heeft 999 geslaagde tests plus één TODO.

## Al op main, dus niet opnieuw overnemen

- De definitieve landingspagina via PR #2 / `4ba1432`: voordelen, Editie/Stroom-teksten, Selectievoorbeeld, FAQ, ruimte en footer.
- Editienummering en eindtelling, deelkaart met uitgeverslogo, rustige voorpagina-API, Selectie-index en de eerdere Stroom-/Nacht-basis.
- De eerder geïntegreerde server-/beveiligingsherstellingen, waaronder de geldende Sharp-versie en runtimecontrole.

Losse oudere branches zijn soms niet op commitniveau voorouders van main, doordat hun werk eerder selectief is geïntegreerd. Dat betekent niet dat hun productwijzigingen ontbreken. De relevante huidige bestanden en latere combinaties zijn vergeleken; niet alsnog oude complete branches op main stapelen.

## Buiten dit webpakket

Geen wijzigingen in `ios/`, `shared/`, `netlify/`, `landing/`, account-/Redacteur-kern, design-systembron, package.json of lockfile. De oorspronkelijke servervolgorde en classificatie zijn niet aangepast. Geen V2b gebruikt om regels af te stellen. Nieuwe native iconen, merkkoppen/iris en de native h-punt-refresh uit build 44 zijn geen webwijzigingen en zijn niet opnieuw overgenomen. Rapporten en concepten die geen productwijziging vragen blijven bij de bestaande Claude-overdrachten.

## Uitgevoerde controle

- **npm test:** 1020 totaal, 1019 geslaagd, één bestaande TODO, nul fouten.
- **npm run build:** geslaagd, inclusief de definitieve service-workerbouw en landingsbouw.
- **npm run build:core:** geslaagd; gegenereerde native kern bytegelijk aan Git gebleven.
- **Harde acceptatie:** alle drempels geslaagd; Jaccard **0,32 ≤ 0,38**. Het zachte 200 ms-rekentijddoel werd onder de gelijktijdige testbelasting niet gehaald (206,75 / 241,80 ms); niet versoepeld.
- Bronselectie: de volledige geselecteerde webdelta is vergeleken met build-44-merkovergang. Geen overige productbestanden toegevoegd of teruggezet. Native/protected/landing-bestanden vergeleken met main: nul verschillen.
- **Gebouwde app echt bediend:** op een nieuwe lokale origin, met vaste openbare synthetische proefinvoer. Vanuit het vierde introductiescherm ‘Stel je Hoot samen’, Tech kiezen, onderwerpen overslaan, dertien extra bronnen volgen tot zeventien, lege zoekuitkomst, afzonderlijke Selectie-stap en terug met zeventien behouden, Volgend-filter. Op **390 px** geen horizontale overloop; alle zeventien volgknoppen binnen het scherm en minstens **44 px** hoog. Screenshot en JSON in `web-integratie-44/`.

De eerste vensteropname toonde slechts 950 px van een browserlayout van 1280 px. Een volledige browseropname en DOM-meting bewezen dat dit opname-afkapping was, geen CSS-overloop. Geen productcode gewijzigd om het opnamevenster te compenseren. Deze lokale fixture controleert geen echte feedkwaliteit of logo-proxy; de logo's kunnen in de fixture op initialen terugvallen. De eerdere echte PWA-updateproef en fullscreenproef blijven bewijs van hun oorspronkelijke pakketten, geen nieuwe fysieke browserproef in deze afronding.

Logs van deze controles: `/tmp/hoot-web-integratie-44-{test,build,core,acceptatie}.log`. Samenvatting in `web-integratie-44/controle.json`. Native tests zijn voor dit uitsluitend webpakket niet opnieuw uitgevoerd.

## Klaar voor Claude / Alex

Beoordeel de ene webbranch; neem niet de volledige build-44-branch mee in een webmerge. Voor de uiteindelijke productiecontrole blijven een bestaande geïnstalleerde PWA, behoud van lokale gegevens bij een echte update, mobiele videofullscreen en de volledige toegankelijkheidsmatrix relevante handmatige controles. De userflows op de gebouwde lokale webapp hierboven zijn wel daadwerkelijk uitgevoerd.

De gewone hoofdmap had al vóór deze taak lokaal Sharp 0.33.5 terwijl lockfile 0.35.5 voorschrijft. De controlewerkmap gebruikte de bestaande correcte 0.35.5-installatie; geen gedeelde dependency-installatie of guard gewijzigd. Een schone CI-installatie volgt het bestaande lockfile. Er is niets gepusht, in main gemerged, gedeployed of naar Apple geüpload in deze taak.
