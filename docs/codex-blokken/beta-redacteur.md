# Beta · Redacteur · overdracht aan Claude

In uitvoering op beta-integratie, uitsluitend lokaal. V2b blijft verzegeld. Geen nieuwe modelcalls, serverwrites, release of appversienummers.

## Nulmeting vóór de kernwijzigingen

A10: web 930 geslaagd + 1 bestaande TODO, native 96 geslaagd; alle harde acceptatiedrempels groen. Jaccard-overlap nu 0,36 (maximum 0,38), rijk 0,37 (maximum 0,40); dit zijn maxima, lager is unieker. De CPU-doelstelling onder parallelle testbelasting is niet gehaald en is geen harde vrijgave. Het bestaande tweetaligheidstekort blijft één expliciete TODO, niet stil weggehaald.

V2a: ontwikkeling 107/134 (79,9%), controle 42/58 (72,4%), vier bekende regressies 3/4. Dit zijn voorlopige annotaties, geen menselijke gold standard. V2b niet ingezien of voorspeld.

Kop-/intro-/beeldmeting vóór wijzigingen: 597 plekken uit twaalf persona’s op vijf bestaande momentopnamen van 30/31 oktober. Bovenste drie plekken: 180 waarnemingen, kop mediaan 70, p75 76, p90 91, maximum 146 tekens; introdekking 100%, beelddekking 95%. Eén momentopname heeft slechts 270 bekende artikelen; de andere vier circa 1700. Herhaalde koppen zijn meegeteld zoals ze voor verschillende lezers werkelijk gekozen worden. Dit is geen onafhankelijk onderzoek onder 597 mensen. [Ruwe waarnemingen](beta/visual-all-before.json).

## B1 · Bundelgrens

Broncodecommit 8818e68. De bestaande serverstand extended krijgt een extra grens: een groep houdt een direct verbonden anker en voldoende onderlinge steun; concrete gedeelde namen of een zeldzame gebeurteniskern behouden echte taalvarianten. Losse deelgroepen mogen alleen via een gemeenschappelijke naamkern terug samen; die kern wordt bij iedere stap een doorsnede, nooit een optelsom. Zo kan x → (x,y) → y niet opnieuw een keten worden. Alleen ontbrekende naamherkenning is geen bewijs voor twee gebeurtenissen: zonder tegenstrijdige context zijn twee verschillende inhoudelijke kernen nodig voor een splitsing. Dit bewaart onder meer de twaalf bestaande berichten over dezelfde vliegtuigcrash.

Formule 1, hardlopen en veldrijden leveren afzonderlijke gebeurteniscontext; verschillende disciplines kunnen geen directe verbinding vormen. sameSubject eerbiedigt nu dezelfde lokale conflictgrens als sameEvent. De historische gewone bundelstand blijft behouden; de productiebackend gebruikt extended. De iOS-kern is opnieuw gegenereerd voor de gedeelde signalen en sameSubject.

Nieuwe regressies: twee zelfstandige gebeurtenissen met twee brugkoppen, F1 versus marathon met algemene gedeelde kopwoorden, de echte sportuitsnede, lokale protesten met dezelfde organisatienaam en de meertalige vliegtuigcrash. De eerste vier proeven falen op drie punten tegen de oorspronkelijke Main-code, en slagen met de wijziging; de vijfde bewaakt behoud van het bestaande echte verhaal. Alle bestaande H6-/clusteringproeven blijven verplicht. De strenge eerste proef die ook echte taalvarianten splitste is verworpen, niet als resultaat gepresenteerd.

Metingen van zes invoersets staan in [clustervergelijking](beta/B01-cluster-comparison.json). De noodfix-fixture bevat metadata van de oude bundel van 64 stukken, maar niet alle 64 oorspronkelijke volledige artikelen. Dit bewijst dus geen volledige reconstructie van die live bundel; wel scheiding van de bekende F1-/marathonstukken en de expliciete brugregressie. Nieuwe backendbundels worden pas live na Claude’s integratie/deploy.

Golden: de editorrevisie is bewust vernieuwd naar redacteur-2026-11-02-beta1 om oude vastlegging niet stil als nieuwe logica te behandelen. Invoer van alle vier fixtures ongewijzigd; klimaat en vs veranderen alleen basis. Nieuw en vs-zonder-topics veranderen daarnaast enkele gelijke-standkeuzes doordat het revisienummer deel van het deterministische zaad is. [Velddiff](beta/B01-golden-diff.json). Geen acceptatiedrempel of historisch nulmeetbestand gewijzigd.

Definitieve volledige controle B01-R1: 935 webtests geslaagd, 1 bestaande TODO; 96 native tests geslaagd; build en alle harde acceptatiedrempels groen. Jaccard nu 0,34 (voor 0,36), rijk 0,36 (voor 0,37). Nu/rijk gebruiken opgeslagen verhalen en tonen dus vooral het effect van sameSubject/revisiezaad, niet van opnieuw bundelen; de afzonderlijke clustervergelijking meet dat laatste. De eerste volledige ronde was groen, maar wees tijdens inhoudelijke nacontrole op de te strenge taalsplitsing; de definitieve ronde bevat de behoudsregel en extra regressie. Risico: het blijft een regelgestuurde gebeurtenisherkenning. Onbekende plaatsen, anders gespelde namen en meerdere ontwikkelingen rond één persoon vragen verdere menselijke beoordeling; geen claim van foutloosheid.

## Nog uit te voeren

B2 bronweging → B6 bronruis/kopbalans → B4 onderwerp-land → B3 vaknieuws/plafond/aanvulreden → B5 ongepaste vulling → B7 zichtbare waarom/eindzin → B8 lokale correctie en meer/minder. Per punt eigen broncodecommit, core/golden/meting en expliciete risico’s. Daarna C-audit/bediening en D-installatie op de bevestigde iPhone 16 Pro.

## B2 · Bronweging, proef apart gehouden

Proefcommit 765f865 staat veilig op beta-bronweging-proef en is voorlopig niet actief op beta-integratie. Vaste +100 vervalt; gekozen uitgevers geven +2 per uitgever tot maximaal +8. Algemene weging negeert de oude ownCount van vaste merken volledig. Sectiefeeds gebruiken publisherCount. Gerichte weging-/persoonlijk-/goldentests groen (97 + 33). Volledige ronde: native 96 groen, build en alle externe harde acceptatiedrempels groen (Jaccard nu 0,34, rijk 0,35), maar npm test heeft één echte regressie naast de bestaande TODO: nieuwe lezer, Middageditie uit de dagproef, vijf plekken tegenover de harde zes. Geen drempel verlaagd. De proef is daarom uit de actieve integratie gehaald tot de normconflict-vraag aan Alex is beantwoord of passend aanvullend aanbod dit kan oplossen. Doorwerken aan onafhankelijke B6 en B4; B2 blijft verplicht terug te beoordelen bij B3.

De oorspronkelijke nulmeting is ongewijzigd. De proef voegt een aparte actuele algemene golden toe; de generatiescript/test-aanpassing houdt exactheid in stand zonder de historische nulmeting te herschrijven. De persoonlijke golden verandert volgorde en één klimaatplek door de nieuwe weging, invoer blijft gelijk. Bewijs: controle-B02.json en B02-weight-before/after.json, B02-golden-diff.json. Geen vrijgave voor deze proef.


## B6 · Kopbalans en bronruis

Gemeten op vijf bestaande momentopnamen, twaalf lezers per moment: 597 plekken, waarvan 180 in de eerste drie. Vóór: koplengte alle plekken p50/p75/p90 = 71/78/95, maximum 146; bovenste drie 70/76/91, maximum 146. Introdekking bovenaan 99,4%, beelddekking 95%. Na: 70/78/95, maximum 133; bovenaan 69/74/91, maximum 131; intro- en beelddekking bovenaan gelijk. Dit meet de gekozen inhoud, niet de hoogte in een browser. De bestanden `beta/B06-display-{before,after}.json` bevatten alle rijen; herhaal met `node scripts/measure-edition-display.mjs <uitvoer.json>`.

Norm: <=70 tekens grote kop, 71–100 middel, >100 compact, steeds bestaande tokens. Smalle halve kolommen maximaal vier kopregels met ellips en de volledige kop voor hulptechnologie. Native toegankelijkheidsmaten gebruiken één kolom. Bij gelijkwaardige versies binnen dezelfde gebeurtenis weegt een passende kop in de eerste drie plekken maximaal 0,25 punt mee; bronvoorkeur (12 punten), actualiteit en inhoud blijven doorslaggevend. Geen herordening van gebeurtenissen om een foto naar voren te halen: een synthetische regressie bewijst dat de oude beeldpromotie anders de Nederlandse opening kon passeren. In de 60 gemeten echte Edities trad die promotie niet op.

Eén JSON-regelset voor de JS- en Swift-introfilter; verwijderd worden uitsluitend herkenbare prefixes (tijdstempel, zelfstandige auteursregel, advertentietekst), niet tijden in gewone zinnen. 22 gedeelde gevallen, idempotentie en native assetgelijkheid worden getest. Artikelinhoud bij de uitgever blijft intact. De vier persoonlijke golden-uitkomsten veranderden niet. Het webcontrolebeeld `beta/B06-kop-390.png` laat de lange Patriot-kop op 390 px zien; dit is een componentproef, geen volledige kliktest. Het oude beeldbestand van die proef wordt niet geladen door zijn historische fixturepad; dit is geen bewijs over de productiebeeldfallback.

Eerste controle: build en harde acceptatie groen; web 960 geslaagd, één oude vaste-lettergrootteassertie fout en één bestaande tweetaligheid-TODO. De assertie is gericht aangepast aan de nieuwe kopcontracten (43 gerichte tests groen). Eerste native compilatie struikelde over een fout token in de nieuwe test, hersteld naar `.body`; definitieve native uitslag volgt hieronder. Risico: prefixherkenning blijft bewust conservatief; onbekende vormen blijven staan. Claude keurt typografische balans op echte inhoud en de gedeelde JSON/Swift-pariteit.

Definitieve B6-controle: 961 webtests groen, één bestaande TODO, 98 native tests groen; kern, webbuild en harde acceptatie groen. Bewijs: `beta/controle-B06-R1.json`.
