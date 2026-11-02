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


## B2 · Definitief meegenomen na antwoord Alex (2 november)

De proef staat nu WEL in de actieve beta (`1b00f25`, overgenomen uit `765f865`); de eerdere melding ‘apart gehouden’ is historisch. Nieuwsgewicht = 4 per onafhankelijke uitgever + 2 per gekozen uitgever, begrensd op 8 extra punten + bestaande actualiteitsbijdrage. De algemene Editie heeft geen vaste merkenbonus. Sectiefeeds tellen als dezelfde uitgever. De persoonlijke en nieuwe algemene golden-fixtures tonen de veranderde keuzes; de oude nulmeting bleef intact.

Alex koos expliciet: zes is doel, vier de harde vloer; vier/vijf alleen bij aangetoond onvoldoende geschikt aanbod. De dagproef eist nu per korte Editie een sluitend `_supply`-spoor uit de echte selectie: aantallen eigen artikelen, iedere kandidaat/verhaalroute met afwijsreden en nul onverklaarde kandidaten. Dit spoor gaat niet naar het account (`withoutDebug`). Ook de externe acceptatiemeting kreeg uitsluitend twee extra controles (vloer vier en geen korte Editie zonder bewijs); de bijbehorende patch staat in `beta/acceptatie-korte-editie.patch`. De overige grenzen zijn ongewijzigd, inclusief Jaccard ≤0,38 in scenario nu (rijk ≤0,40 zoals bestaand).

Het spoor vond twee verweesde oude verhaal-id’s. Zulke artikelen worden voortaan tegen de actuele verhalenlijst beoordeeld in plaats van blind uitgesloten. In de vaste dagproef blijven uiteindelijk alleen **nieuwe lezer · Middag 30 oktober · vijf plekken** kort, in code/drie/account; de sprong-variant heeft geen Middag. Eigen aanbod: 26 artikelen. Redenen per kandidaat staan volledig in `beta/B02-shortages.json`, inclusief herhaling zonder ontwikkeling, te oud, niet-gekozen vakgebied en internationaal niet groot genoeg. Dit bewijst een tekort binnen deze bekende pool; geen garantie over alle mogelijke externe bronnen of een structureel patroon. Woensdag opnieuw op een verse dag meten.

Definitief: kern en webbuild groen, 966 webtests groen + één bestaande TODO, 98 native tests groen, alle harde acceptatiechecks groen (`beta/controle-B02-R1.json`). Jaccard nu 0,34; rijk 0,35; algoritme alleen 0,41. Nieuwe negatieve tests houden drie verhalen ongeldig en bewijzen dat vijf alleen mét kandidaatbewijs mag. Bronweging blijft behouden. Claude keurt gewicht, gewijzigde golden, het kandidatenbewijs en de externe meetlatpatch. De zichtbare melding bij minder dan vier wordt bij de UI-afwerking meegenomen.


## B4 · Onderwerpplaats en rubrieken

`subjectPlaceOf` maakt landenbewijs inspecteerbaar: kop → expliciete URL/bronrubriek → intro of onbekend. Geen land afgeleid van uitgever of taal. Amerikaanse verkiezingsplaats weegt zwaarder dan het land van een besproken standpunt; ‘Iran bereidt zich voor op oorlog ongeacht Amerikaanse verkiezingen’ blijft Midden-Oosten. Palestine Action is een organisatienaam, geen bewijs dat het protest in het Midden-Oosten is. Sportsamenstellingen en recept-/leefstijlcontext worden niet langer blind Binnenland. Inhoudelijk misdaadnieuws over iemand met een cultuurberoep blijft misdaad/geografie.

Meting: V1 ontwikkeling 92/96 →92/96, controle 44/53 →44/53. V2a ontwikkeling **107/134 →125/134 (93,3%)**, controle **42/58 →42/58 (72,4%)**. Vier bekende regressies **3/4 →4/4**. Het gewenste hogere V2a-controlepercentage is dus **niet gehaald**, en staat open voor Claude. Een tussentijdse te brede verkiezingsregel maakte een Iran-verhaal onterecht VS; na inspectie van die V1-regressie is de regel begrensd en er is een expliciete regressietest toegevoegd. De uiteindelijke controle is daardoor geen volledig ongeziene proef. V2b is nergens geopend, voorspeld of gebruikt om af te stellen; bevroren input/labels blijven gelijk.

Definitieve controle B04-R1: 969 webtests groen + bestaande TODO, 98 native groen, build/kern en alle harde acceptatiechecks groen. De kern is herbouwd en persoonlijke/algemene golden opnieuw gemaakt; wijzigingen staan in `beta/B04-golden-diff.json`. Dit is een gerichte classificatieverbetering; geen volledige classificatie-API met opgeslagen bewijsgeschiedenis of AI. Risico: deterministische trefwoorden blijven fouten maken, onbekende plaatsen blijven onbekend. Claude keurt met name de resterende 16 V2a-controlefouten en een volgende, werkelijk verse dag; V2b blijft daarvoor verzegeld volgens de bestaande afspraak.


## B3 · Vaknieuws en verantwoorde aanvulling (definitief)

**Tien blijft altijd het streefgetal**, zoals Alex nogmaals bevestigde. Zes is de grens voor verplicht extra kandidatenbewijs; vier blijft de harde vloer. `_supply` vermeldt nu target=10 en auditBelow=6. De teller wordt nergens teruggezet naar zes als normaal aantal.

Het plafond van twee betreft algemeen internationaal nieuws; een werkelijk relevant vakverhaal houdt zijn geografische classificatie, maar telt niet tegen dit plafond. Bewijs: een zichtbare inhoudelijke treffer, minstens de helft van de bekende artikelversies, passend vakgebied en voldoende profielsterkte. Alleen ‘komt van een techbron’ is onvoldoende. De kern bewaart het onderscheid tussen echte geografie en welke plekken tegen de grens tellen. Binnenland opent Nederlands; ongekozen sport en niet-groot algemeen internationaal nieuws blijven uitgesloten. De cap-testhelpers en externe meetlat zijn op deze goedgekeurde D01-scope gezet, met dezelfde grens twee; de ruwe geografische telling blijft apart zichtbaar. De patch `beta/acceptatie-vaknieuws.patch` hoort na de korte-Editiepatch in Hoot-design. Alle andere harde drempels, inclusief 0,38, blijven gelijk.

Aanvullen probeert nu ook de bestaande brede/aanpalende serverkandidaten, met geldige actuele kop, nieuwsbelang of aantoonbare profielrelevantie; nieuwe lezers mogen actueel Nederlands basisnieuws krijgen. Een extra plek bewaart `supplement` als herkomst van de redactionele reden. Geen nieuwe endpoint, database of modelcall. De dagproef bevat nu dezelfde `nearStories`-pool als build.mjs; die ontbrak eerder in de proef. Native behoudt wide/near ook bij de geheugenfallback zonder ruwe startcache; een nieuwe roundtriptest ving ontbrekende CodingKeys, die zijn hersteld.

De volledige momentopname: alle twaalf profielen hebben tien plekken, zowel nu als rijk. De historische dagproef blijft kort bij **nieuw · ochtend: vier (code/drie/account/sprong)**, **nieuw · middag: vijf (code/drie/account)** en **VS-lezer zonder Wereld · ochtend: vijf (alle vier varianten)**. Volledig per-kandidaatbewijs in `beta/B03-shortages.json`; nul onverklaarde afvallers en geen uitkomst onder vier. Dit bewijst uitsluitend het bekende eigen aanbod plus de bestaande aanvullende feedpools. Het is geen uitputtende zoekactie in alle uitgevers, Trends of het web. De ochtendtekorten kunnen door de oude momentopname of de algemene-Wereldgrens ontstaan; woensdag een verse dag beoordelen en zo nodig een breder serveraanbod voorstellen, niet de kwaliteit laten zakken om tien te halen.

Definitief: 971 webtests groen + bestaande TODO; 99 native tests groen; build, gedeelde kern en alle harde acceptatiechecks groen (`beta/controle-B03-definitief.json`). Jaccard nu 0,34/rijk 0,35; algoritme alleen 0,39/0,40. De persoonlijke golden veranderde door de vaknieuwstoelating en onderbouwde aanvulling; de algemene golden niet. Details per lezer in `beta/B03-golden-diff.json`. Herhaalde vakrelevantie gebruikt een WeakMap-trie op onveranderlijke objecten; een nieuw artikelobject met hetzelfde id krijgt een nieuwe beoordeling. De zachte 200-ms-doelstelling blijft onder de parallelle controles gemist; geen harde drempel verlaagd en geen ononderbouwde snelheidsclaim. Ronde B03-R1 is bewust onderbroken voor deze optimalisatie en telt niet als geslaagde proef.

**Live beperking:** bundeling/classificatie van nieuw ingelezen artikelen verandert pas wanneer Claude de bijbehorende backendcode publiceert. De lokale iPhone-beta blijft op hootnews.nl en verandert de productieserver niet. De nieuwe persoonlijke kern en frontend zijn lokaal wel aanwezig. Claude keurt vóór publicatie de cap-scope, alle gewijzigde golden, de aanvulredenen en de resterende kortere dagdelen.


## B5 · Geen ongepaste videovulling

Een gerichte vormregel herkent samengestelde horror-/Halloween-videolijstjes en laat ze alleen meewegen bij een passende Film/Cultuur-interesse. Een gekozen techmerk is onvoldoende. De persoonlijke selector verwijdert zulke ongeschikte versies ook als mogelijke bundelkop; de algemene Editie gebruikt ze niet als losse vulling. Videobewijs/onderzoek naar gebeurtenissen en gewone analyses vallen er expliciet buiten. Dit is geen algemene celebrity- of entertainmentban.

Reconstructie van het gemelde voorbeeld (exacte kop/bron uit Alex' melding, **synthetische** intro/datum/id; oorspronkelijke feedmetadata niet gevonden): op veertien uur oud en binnen een geldig bronvenster selecteerde de vorige code hem bij geen interesses, Tech en Wereld; nu nul keer. Bij bewuste Cultuur-keuze blijft één selectie mogelijk. Voor/na is via de gebundelde vorige commit gemeten, zie `beta/B05-vulling-vergelijking.json`; de fixture vermeldt de herkomst. Geen claim dat deze reconstructie het oorspronkelijke gehele feedmoment reproduceert.

Definitief B05-R1: 973 webtests groen + bestaande TODO; 99 native groen, kern/build en harde acceptatie groen. De eerdere B05-ronde is vroeg onderbroken om een negatieve videobewijscontrole toe te voegen; telt niet als eindbewijs. De persoonlijke en algemene golden zijn opnieuw gegenereerd en bleven gelijk. Risico: deze begrensde, uitlegbare vormregel herkent geen universele categorie ‘clickbait’. De bredere inhoudelijke aanvulreden van B3 blijft daarom ook nodig. Claude keurt taalvarianten en rapporteerbare twijfelgevallen; geen V2b gebruikt.


## Aanvulling Alex · tien genummerde verhalen, bubbel apart

Alex bepaalde expliciet: hooguit tien genummerde verhalen, optioneel één bubbelverhaal zonder nummer erna. De kern reserveert daarvoor geen genummerde plek meer. De algemene serverselectie en persoonlijke kern voegen de bubbel pas na de gewone reeks toe, met behoud van toelating, plafond en ontdubbeling. Web en native maken er één afzonderlijk blok van; de web-Editie toont niet langer daarnaast de hele signalenlijst uit de Stroom. De eindtelling blijft het werkelijke genummerde aantal. Het persoonlijke één-minuut-overzicht neemt de bubbel niet als genummerde plek mee.

Maximum tien, bewijs onder zes en vloer vier staan in één gedeelde JSON, bytegelijk in iOS. Een bubbel mag een reeks van drie niet tot een geldige vier maken. De interne Redacteur-revisie is beta2 om oude negen-plus-bubbel-caches opnieuw samen te stellen; app/projectversienummers blijven ongewijzigd. Een bestaande review-labeltest werd door het nieuwe zaad instabiel: een productreview van een vakbron houdt nu zijn vakrubriek, ook als de rubriekplanning anders een geografische stoel koos.

De omvangs- en uniekheidsmeting telt de reguliere reeks; de optionele bubbel levert geen gratis extra uniekheid. Grenzen blijven 10, 4 en Jaccard ≤0,38 (rijk ≤0,40). Voor/na beide scopes en aantallen per lezer staan in `beta/B-telling-{before,after}.json`; herhaal met `node scripts/measure-edition-counts.mjs <uitvoer.json>`. Vóór de wijziging waren er negen gewone verhalen als de bubbel een plek innam. Na: de twaalf actuele testprofielen hebben tien genummerde verhalen; hooguit één extra erna. De reguliere Jaccard blijft onder de ongewijzigde grens. Bij tekort blijft de reeks korter, met werkelijke eindtelling.

Controle: 975 webtests groen + bestaande TODO; 100 native groen; kern, build en harde acceptatie groen (`beta/controle-TELLING-definitief.json`). De eerste ronde had uitsluitend twee nog oude asserts op totale arraylengte; gericht aangepast en de hele websuite herhaald. `beta/acceptatie-genummerde-reeks.patch` past de externe meetlat op de genummerde definitie aan en hoort na de vorige twee meetlatpatches. Golden is opnieuw gemaakt: een gewone plek extra en de nieuwe interne revisie verklaren de wijzigingen. Claude keurt extra-blokvolgorde, laagste aantallen en caches van oudere clients.


## B7 · Leesbare reden, eerlijk begin en positief einde

Aanvullingen behouden hun concrete selectiereden (nieuwsbelang, echte vakrelevantie, gekozen bron of Nederlands basisnieuws). Een expliciete eigen bron krijgt daarbij niet ten onrechte ‘Buiten je bronnen’. Overige waarom-regels staan leesbaarder in inkt-2 en toelichtingsmaat; ‘Omdat je X volgt’ blijft verborgen, ook voor oudere vakcodes. De gedeelde labelfixture controleert web/native-pariteit. Dit wijzigt alleen presentatie en opgeslagen reden, niet de selectie. De persoonlijke golden verandert daardoor alleen in why-details.

Zonder eigen interesses/onderwerpen/voorkeursbronnen heet het begin ‘Om te beginnen’. De intro belooft ‘hooguit tien verhalen’ en maakt duidelijk dat alleen een account op uitnodiging is. De eindkaart zegt ‘Dan ben je bij.’ Onder vier genummerde verhalen toont web/native ‘Nog geen Editie’ zonder normale eindkaart; een optionele bubbel redt die vloer niet.

Controle B07: 978 webtests groen, één bestaande TODO; 100 native tests groen; kern/build en harde acceptatie groen. `beta/controle-B07.json`. Browserproef op 390 px met een synthetische context maar de echte Edition-component: tien nummers, nul bubbelnummers, bubbel achter 10, eindtelling 10 van 10, geen horizontale overloop (`B07-renderer-proof.json`, screenshots). Bij drie nummers verschijnt wel de aanbodmelding en geen eindkaart. Dit is componentbewijs, geen live-feedproef of volledige native klikvrijgave. De bubbelkop wordt nog dubbel herhaald; dat kleine presentatiedetail volgt in deel C. Claude keurt contrast, metadata en korte-Editie-uitleg in het geheel.


## B8 · Verhaalopties en lokale foutmeldingen

De bestaande meer/minder-bediening is ook bereikbaar bij artikelen in de Stroom. Op web opent de stille meerknop de opties; native staan ze in het bestaande menu bij lang drukken. ‘Klopt dit niet?’ heeft vier concrete keuzes: verkeerde rubriek, verkeerd land, andere gebeurtenis of dubbel verhaal. Dit bewaart een begrensde toestelnotitie (maximaal 200), gescheiden per eigenaar; er is geen nieuwe server, automatische classifieraanpassing of smaakwijziging door een foutmelding. URL-query’s en fragmenten worden niet opgeslagen. Een ontvangsttekst zegt eerlijk dat de melding nog niet is verstuurd. Meer/minder blijft de bestaande smaakfunctie, met de bestaande lokale inklapreactie op Minder.

Browserproef op 390 px: de echte TasteButton met een synthetische artikelcontext opent alle vier redenen, bewaart via de echte lokale opslagfunctie en toont de ontvangsttekst zonder horizontale overloop. Screenshots `beta/B08-melding-*.png`. De tests controleren eigenaarscheiding, opslaglimiet, herhalen, corrupte/volle opslag en dat melden geen smaak of syncgegevens verandert. Geen echte accounts gebruikt. Selectiekern/golden ongewijzigd; dit is bediening rond bestaande uitkomsten. Native menu-interactie blijft aanvullend te keuren als Device Hub weer bedienbaar is.

B08-controle: 980 webtests groen + bestaande TODO; build, gedeelde kern en alle harde acceptatiechecks groen (Jaccard 0,32/0,32). De iOS-testlog meldt 101 geslaagde tests zonder assertfouten; Xcode verzamelt bij het vastleggen van deze broncommit nog diagnostiek, dus de procesexit is nog niet als groen geboekt. De finale controle vult dit aan. Golden opnieuw gemaakt zonder wijziging.


## Definitieve gezamenlijke nacontrole

Na B8 en de kleine auditpunten: 980 webtests geslaagd plus één bestaande TODO, 102 native tests geslaagd, gedeelde kern, webbuild, golden en alle harde acceptatiedrempels groen (`beta/controle-FINAAL.json`). Golden/core na de finale bronstand opnieuw gegenereerd zonder bronwijziging. Jaccard nu/rijk 0,32/0,32, ongewijzigde plafonds ≤0,38/≤0,40. Twaalf actuele profielen hebben tien genummerde verhalen; de optionele bubbel telt apart. De historische tekorten uit B3 blijven en zijn opnieuw vastgelegd in `beta/B-final-shortages.json`. V2b is uitsluitend op byte-identiteit gecontroleerd, geen voorspellingen of labels ingezien voor afstelling.

Dit is een lokale beta en geen bewijs van een foutloos nieuwsalgoritme. Met name het V2a-controledoel, nieuw serveraanbod, verse-dagmeting en echte accountpariteit vragen Claude’s keuring. De lokale meldfunctie bewaart feedback maar stuurt die niet door en past classificatie niet zelfstandig aan.


### Fysieke nacontrole · Michigan-label blijft een releasepunt

De lokale beta start op Alex’ iPhone 16 Pro; nummering, aparte bubbel, positieve eindkaart en verhaalmenu zijn echt bediend/gezien. De persoonlijke Editie bevat tien gewone verhalen plus één bubbel. Gegevens zijn na de proefstart behouden. De schermopname herstelde na opnieuw verbinden van Device Hub.

Bij het Michigan-verhaal is de opgeslagen redactionele plek al `vs`, maar de oude artikel-tag is `middenoosten` (geen mainTopics). De huidige gedeelde labelbetekenis laat elk Wereld-onderwerp bij een VS-plek winnen, waardoor web/native een verkeerde geografische kicker kunnen tonen. De fysieke screenshot bevestigt dat op de iPhone. Dit vereist behalve vernieuwde backendgegevens óók keuring/herstel van labelvoorrang; het is geen geslaagde volledige oplossing van B4. Zie `beta/D-michigan-labelbewijs.json` voor een minimale openbare reproductie-input. Niet afgesteld op V2b en in deze nacontrole geen broncode gewijzigd. De eerdere 980/102 geslaagde tests blijven geldig voor dezelfde productbroncode, maar dekten dit labelconflict nog niet.
