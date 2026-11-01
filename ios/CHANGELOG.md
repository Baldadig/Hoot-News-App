# Changelog — Hoot voor iOS

## Onuitgebracht

- Nieuwe Editie: perslijn en hoofdverhaal verschijnen één keer na de iris, met vervagen bij Verminder beweging.
- Taalfilter voor tweetalige bronnen en juiste hoofdtaal van vakbronnen.
- Rustige voorpagina: geen zwaar nieuws of sport, hooguit één groot Wereld-verhaal.
- Wachtmarkering, lege bladzijden, leesgrens en schakelaars bijgewerkt; dagdelen uit gedeelde JSON.
- Gethoot.app/lees lokaal voorbereid als nieuwe plek; domeinen, auth en livegang volgen na controle door Claude.
- Build 37 voorbereid; exportvrijstelling voor standaard HTTPS vastgelegd.
- Build 39: De Redacteur, fase 1. Zonder de interesse Wereld hooguit twee internationale plekken in je Editie, en alleen bij groot nieuws (acht uitgevers, of vijf uit minstens twee landen). Sport alleen als je Sport koos. Wie Binnenland koos, opent met Nederlands nieuws. Liever een kortere Editie dan een plek die niet past. Een buitenlands stuk zonder herkende plaats telt mee voor het plafond. Tijdens het samenstellen toont de app geen algemene Editie meer, maar wacht op de jouwe. Zelfde rekenkern als het web. Een buitenlands verhaal met één Nederlands bericht erin is geen Binnenland.
- Build 38: de app blijft voor 1.0.1 op de API van hootnews.nl (werkt nu al, blijft na de verhuizing bestaan). Gedeelde verhalen krijgen een hootnews.nl/deel/-link met de uitgeverslink erbij, zodat een oud verhaal naar de uitgever gaat in plaats van een dode pagina.

- Verhalen delen als Hoot-krantenkop in merkrood, in liggend en staand formaat (A3).

- Hoofdbeelden: meet egale randen vooraf en toon staande beelden in een eigen verhouding (A1).

## [1.0.1] — 2026-10-31 — De Redacteur op de iPhone, Welkom zoals het web, Tijdlijn | Krant (build 36; TestFlight: build 34 en 35 op 29-10-2026)

- **De Redacteur kent je (build 36):** dezelfde rekenkern als web 1.56.0: Binnenland is Nederland, hooguit één buitenlands verhaal zonder dat je Wereld koos (met het waarom), een label dat bij het verhaal past en één plek per gebeurtenis.
- **Hele zinnen en typeset gelijk aan het web (build 36):** wholeSentences (met de rek voor één eerste zin), introMax en typeset() zijn letterlijke spiegels van shared/zinnen.mjs en shared/typeset.mjs, getoetst met dezelfde tests/fixtures/zinnen.json en typeset.json als het web.
- **Keuring label en Welkom (build 36):** het label is nu precies labelFor van het web met hetzelfde bestand tests/fixtures/label-cases.json: een onderwerp geeft alleen een kicker als het het verhaal draagt (past bij de rubriek van de plek, of staat in de kop of het vak van de bron, `mainTopics` van de server); "Omdat je X volgt" valt altijd weg. Bij de toegankelijkheidsgroottes staan Wat precies?, Je bronnen en Je Selectie op één pagina die scrolt, de teller staat onder de kop en het vraagteken blijft bij zijn woord. Je bronnen heeft Klaar op elke pagina en Meer bronnen om door te bladeren, met dichtere rijen (naam, labels en uitleg elk op één regel). De Stroom toont alle acht rubrieken als je er geen koos, net als het web.
- **Zon in de Editie, label en Stroom (build 36):** naast de naam van de Editie staat een kleine, stille zon, laag bij de Ochtend- en Avondeditie en hoog bij de Middageditie; onderaan komt de zon één keer op boven ‘Je bent bij.’ (6 s, zodra hij in beeld komt; stil bij Verminder beweging). Het label is een interesse alleen bij een sterke treffer: de plek van het verhaal hoort bij een rubriek die je koos (buitenland is Wereld), anders het hoofdonderwerp als je dat volgt; een niet-aangetikt onderwerp toont alleen de rubriek, media geeft nooit een kicker en "Omdat je … volgt" valt weg als de kicker al je interesse is. De gevallen staan in tests/fixtures/label-cases.json, gedeeld met het web. De Stroom toont alleen Alles en je gekozen hoofdrubrieken in vaste volgorde, Buiten je bubbel als laatste; Bluesky staat bij Instellingen. Een seintje? toont letterlijk "Je Ochtendeditie ligt klaar. Tien verhalen, dan ben je bij.", Overslaan op Wat precies? is alles, en uitloggen wist ook Bewaard en wat je las op het toestel.
- **Welkom zonder scrollen (build 36):** de rode intro heeft de zon in papier die één keer opkomt, dan sluit het rood als iris tot de punt en veeg je door Editie, Stroom en Selectie (elk een eigen zon, OnboardingArt) met de knoppen pas op de laatste pagina; daarna je interesses als liggende tegels, Wat precies? op een eigen pagina met alle onderwerpen open en Overslaan (bij veel interesses verdeeld over pagina's die op een scherm passen, ook op de kleinste iPhone), Je Hoot met het gratis Nederlandse voorstel voor je bronnen (Aanpassen) en je Selectie (Later kiezen) in bladen, en Een seintje? als laatste; Liever meteen lezen begint zonder vak, de standaard voor je vak is leeg en uitloggen wist je keuzes op het toestel (WelcomePages, getoetst in OnboardingTests).
- **Keuring Welkom en label (build 36):** de interessetegels staan vanaf xxLarge op een eigen rij met ruimte voor de naam en een icoon dat de rest niet opschuift; je interesse wint pas van de plek als het verhaal er echt over gaat (een boot met migranten met één los bijonderwerp Cultuur blijft Binnenland), de meetcode voor de paginahoogte is eruit en de tests laten de data van de app met rust.
- **Label gelijk aan het web, Welkom zonder scrollen (build 36):** StoryLabel is nu regel voor regel labelFor van het web met dezelfde testgevallen (je onderwerpen als bron, een volgend onderwerp wint van een sportbron, het waarom valt weg als de kicker het zegt, Buiten je bubbel noemt waar het vandaan komt); de nummering boven de verhalen en de telling '10 van 10' zijn weg; Je bronnen en Je Selectie zijn eigen pagina's met een paar keuzes per pagina in plaats van lange bladen, en Wat precies? rekent met de maten van de tekstgrootte en deelt een groep zo nodig zelf, zodat niets onder de knop wegvalt.
- **Label, KISS en contact (build 36):** het label boven een verhaal is één pure functie (StoryLabel in Label.swift, getoetst in LabelTests, dezelfde gevallen als src/lib/label.js): je (sub)interesse als het verhaal die raakt ("Politiek · Den Haag"), anders de rubriek, een sportbron is Sport; het waarom staat er alleen als het iets toevoegt en "Buiten je bronnen" staat in de bronregel; de info-, hint- en foutteksten in Instellingen, Account, Bronnen, Abonnementen en Zoeken zijn korter (kiss-teksten.json), Voorkeursbronnen is uit Instellingen, Onderwerpen heet Selectie, het lege scherm van de Stroom heeft de knop Naar Bronnen; website en privacy wijzen naar gethoot.app, met een Contact-rij (info@gethoot.app).
- **De Redacteur op de iPhone (build 36):** jouw Editie wordt op het toestel samengesteld met dezelfde rekenkern als de website (edition-core.js in JavaScriptCore), met het waarom per plek; telefoon en web nemen elkaars Editie over (de eerste schrijver wint, via je account), `previous` kijkt drie Edities terug, en als de rekenkern faalt stelt de server samen.
- **Het waarom en wat Hoot leerde (build 36):** onder de rubriek van elke plek in jouw Editie staat kort waarom hij er staat ("Omdat je AI volgt", "3 van je bronnen schrijven erover"), stil in inkt-3 zoals op de website; Instellingen krijgt de sectie Wat Hoot van je leerde met gekozen, geleerd (Vergeet dit) en minder (Ongedaan maken) uit dezelfde rekenkern, met dezelfde woorden als op hootnews.nl en de uitleg dat een wijziging pas bij je volgende Editie telt; als lid rekent de app pas na de eerste sync-pull, de pull haalt `edition` mee, en de kenmerken van toen (`keys`) gaan mee in de geschiedenis; rubriek Regio heeft een label.
- **Geschiedenis drie diep (build 36):** de `history` van jouw Editie verloor bij elk dagdeel het dagdeel ervóór (de vorige Editie werd weggegooid in plaats van samengevat), zodat de Avond de Ochtend niet meer kende; nu vat de rekenkern haar samen, de regel heeft precies de vorm van de website (met `leadStoryId` en `shown`) en `previous` rekent in dezelfde volgorde als daar.
- **Geschiedenis in de vorm van het web (build 36):** de `history` van jouw Editie is nu precies die van de website — de drie Edities ervóór, nooit zichzelf — zodat telefoon en web elkaars geschiedenis lezen zonder haar te herschrijven; de volle Editie uit je account telt mee als het toestel een dagdeel oversloeg dat het web wél vastlegde (de Avond kent dan Middag én Ochtend), en wat lokaal van een andere lezer is (anoniem naast je account, of je account na uitloggen) telt niet mee.
- **Editie, kop en einde (build 36):** de dagdelen komen uit één tabel met het web (shared/slots.mjs, getoetst in SlotsTests), ook in de seintjes; het einde is één zin op hooguit 300 pt zonder losse laatste woord; de metaregel houdt "oktober ·" bij elkaar bij grote tekst en Instellingen legt "Jouw Editie" uit; de offline-melding staat onder de datum, als haarlijn op papier, met Opnieuw in inkt en zonder kloktijd.
- **Einde van de Editie (build 36):** de datum in de eindzin breekt niet meer tussen dag en maand: "31 oktober" blijft bij elkaar (vaste spatie, alleen in die zin).
- **Lezer, teller en cijfers (build 36):** de lezer breekt koppen niet meer af (geen "Captain Pi-card"; alleen bij Heel groot lange woorden in tussenkoppen); de stapteller in Welkom is één breuk, "2⁄6"; tijden in de bronnenlijst en de nummers in de Selectie staan in tabelcijfers; de Selectie zegt "in 3 onderwerpen"; bij grote tekst houdt de Stroom één logo in de stapel en groeit de rubriekenlijn tot de eerste accessibility-maat, zodat "Buiten je bubbel" heel blijft.
- **Naam in de Stroom (build 36):** de rode naam van je gekozen bron past weer bij normale tekst ("de Volkskrant", "The Economist", tot 150 breed); alleen bij grote tekst houdt hij het op 96 en loopt een lange naam uit.
- **Bediening in inkt (build 36):** Instellingen staat op papier (rijen op surface met een haarlijn, kopjes als kicker in inkt, iconen in ink3, Klaar als tekst); schakelaars, waarden, de lezer-werkbalk, de schijf in de Selectie en Ongedaan maken zijn inkt, de actieve tab blijft rood; gekozen heeft één grammatica in chip, tegel en rond vinkje: in rust een haarlijn, gekozen rood zacht met een rode rand en een vinkje vooraan.
- **Hele zinnen en de telling (build 36):** intro's eindigen in een hele zin, nooit midden in een woord of op een beletselteken (wholeSentences in Text+Sentences.swift, maat per regelinstelling, met miniatuur 20 procent minder; nooit een decimale komma als in 3,5; de knip is gelijk aan het web), ook in de Selectie; de Editie telt in de rubriek "01 · BUITENLAND" (Buiten je bubbel telt niet mee, gelezen in ink3) en het einde opent met "10 van 10".
- **Lege staat, schermtitel en typeset (build 36):** een lege plek heeft een stil lijnicoon in rule, de titel als serifkop en een inktknop (Bewaard met dezelfde woorden als het web en "Naar de Editie", ook Zoeken); Editie, Stroom, Selectie en Bewaard zetten hun titel stil in de scroll (balk inline) en het hoofdverhaal is altijd largeTitle; de kop in de lezer krijgt typeset() (Text+Typeset.swift, spiegel van shared/typeset.mjs, getoetst in TypesetTests).
- **Ritme onder de titel en de lege bladzijde (build 36):** onder de schermtitel staat op elk scherm dezelfde lucht (s2) tot wat volgt, ook boven de onderwerpenknop in de Selectie en de eerste kaart in Bewaard; alleen de metaregel van de Editie sluit aan; de lege plek heeft een lijnicoon van 96 (zoals moment 7), s2 tussen titel en uitleg en de uitleg in ink2 zoals op het web; Zoeken schrijft intro’s met een gekrulde apostrof.
- **Selectie:** 37 onderwerpen in acht domeinen. Je kiest ze via de knop Onderwerpen.
- **Meer of minder hiervan:** druk lang op een verhaal in de Editie.
  - Bij minder klapt het verhaal in, met de mogelijkheid om het ongedaan te maken.
  - Onder Wat Hoot van je leerde in Instellingen kun je je keuzes wissen.
- **Van opstart naar welkom:** sneller en zonder hapering (0,7 s).
- **Stroom:** de kop is één lijn met krantenrubrieken (onderwerpen) en rechts een bronnenstapel die uitwaaiert (build 35).
- **Selectie:** een eigen icoon, tijdschriften (build 35).
- **Namen:** Editie, Stroom en Selectie overal met een hoofdletter.
- **OOR is weg.**
- **Lezen:** nog maar twee keuzes, In de lezer of In Safari. In Safari ben je al ingelogd bij je kranten, met wachtwoorden, passkeys en Google of Apple. "Op de website" en de twee schakelaars eronder zijn weg; wie dat had, opent nu in Safari.
- **Bronlogo's:** scherp, en in de lijst op wit (het Parool-logo verdween in donker).
- **Stroom:** een bron kiezen zet de rubriek terug op Alles.
- **Uit de nachtreview (voor build 36):**
  - **Privacymanifest:** reden voor bestandsdatums (C617.1).
  - **Account verwijderen:** trekt ook de inlog met Apple in.
  - **Bewaard wissen:** voor leden zegt de melding eerlijk dat het op al je apparaten weg is.
  - **Selectie-week over een maandgrens:** "26 oktober t/m 1 november".
  - **Vergelijk:** opent het stuk waarop je tikte.
  - **Stroom:** dubbele koppen van zusterkranten worden weggehaald.
  - **Inloggen:** "op uitnodiging" staat vóór de inlogknoppen.
- **Selectie (build 36):** nieuw onderwerp Geekcultuur, onder Cultuur & vrije tijd: sf, fantasy, strips, bordspellen en internetcultuur. Het verschijnt zodra de server het levert.
- **Van opstart naar de Editie (build 36):** het rood sluit zich als een iris tot de rode punt van "hoot." linksboven in de Editie, en de krant schuift zacht op zijn plek. Opent Hoot op een ander tabblad, dan sluit het rood tot zijn eigen punt. In donker kleurt het rood mee naar de lichtere punt. Met Verminder beweging vervaagt het opstartscherm nu echt (dat was een harde knip).
- **Seintje bij een nieuwe Editie (build 36):** een stil seintje, zonder geluid of badge, in de ochtend, middag en vroege avond, een paar minuten nadat je Editie klaarligt. Aan te zetten in Instellingen › Seintjes, per Editie aan of uit, alleen op dit toestel; of met "Seintje als hij klaarligt?" onder het einde van de Editie. Tikken opent de Editie. Lokaal gepland, zeven dagen vooruit, dus geen server nodig.
- **Seintje in Welkom (build 36):** na je vak een laatste, rustige stap: "Een seintje?", met een nagemaakte melding die zacht binnenvalt. Pas na "Ja, graag" komt de vraag van iOS; "Nu niet" vraagt niets. Weet iOS het al, of staat het seintje al aan, dan is je vak de laatste stap ("Naar je Editie").
- **Delen (build 36):** in het deelmenu van iOS staan nu de kop en het beeld van Hoot, niet wat de uitgever teruggeeft (soms "Abonneer nu"). Gedeeld wordt altijd de link van de uitgever, dus Zet in leeslijst, Instapaper en je eigen lezer werken gewoon. Nieuw: een deelknop rechtsboven in Vergelijken (deelt het stuk bovenaan). Een Bluesky-post deelt met de titel van zijn link, of anders het begin van de post.
- **Bluesky (build 36):** volg je nog niemand, dan staat er een knop "Iemand toevoegen" in de lege rubriek, in plaats van een verwijzing naar de + rechtsboven.
- **Geen kloktijden meer (build 36):** seintjes, het einde van de Editie en de Selectie zeggen nu in de ochtend, middag of vroege avond, of maandagochtend; de Edities heten overal Ochtendeditie, Middageditie en Avondeditie.
- **Wat precies? (build 36):** onder Instellingen › Interesses kies je per interesse wat je het meest boeit, zoals AI of Film & series; kies je niets, dan krijg je alles binnen dat onderwerp. Het telt mee in je Editie en gaat mee met je account, net als op hootnews.nl.
- **Welkom zoals op hootnews.nl (build 36):** een rode intro, dan in stappen je interesses, Wat precies?, je bronnen, je Selectie en het seintje, met tegels en keuzeknoppen in plaats van lijsten met schakelaars. Het opstartscherm gaat naadloos over in de rode intro; bij de eerste stap sluit het rood zich als een iris tot de punt van "hoot." linksboven. Knoppen op papier zijn inkt, op rood papier met rode letters; ook "Kies je bronnen" na even rondkijken.
- **Het merk als tekening (build 36):** "hoot." in de Editie, het welkom en bij Inloggen, en "h." aan het einde van de Editie en in het voorbeeldseintje, zijn nu dezelfde vaste paden als op hootnews.nl, niet meer getypt; het opstartscherm en de iris landen er nog precies op. Gekozen tegels en keuzeknoppen zijn rood zacht met een rode rand (de knoppen met een vinkje), knoppen op papier zijn inkt, en op merkrood is alles papier. Het opstartscherm vervaagt nu als één beeld, zonder roze zweem in de letters.
- **Lees de Stroom als (build 36):** Tijdlijn of Krant, in Instellingen › Editie en Stroom; dezelfde keuze met dezelfde naam als op hootnews.nl, en hij gaat mee met je account (het web synct hem nu ook). Tijdlijn: kop, intro en dan het beeld groot over de hele breedte (2:1), met de bron eronder. Krant: kop en intro met een klein beeld (3:2) rechts, elk bericht een eigen blok met een haarlijn. Geldt voor de Stroom, een bron, Bewaard en Zoeken; de Editie blijft een krant en Bluesky-posts houden hun eigen vorm. Een video toont zijn stilstaande beeld met een afspeelknop. Bij heel grote tekst staat het beeld in beide vormen onder de tekst. De tekening van het welkom (zon en horizon) is weg: het nieuwe Welkom gebruikte haar niet meer.

## [1.0.0] — 2026-10-28 — De eerste versie voor de App Store

- **De App Store-versie,** met alles uit 0.17 tot en met 0.19.
- **Vergelijken:** het verhaal heeft een beeld bovenaan, en de kop opent het hoofdbericht. Het hoofdbericht staat niet nog eens in de lijst.
- **Zoeken** let niet meer op accenten.
- **Lezer: schoner.** Deze onderdelen worden weggehaald:
  - een losse datumregel;
  - een auteursportret bovenaan;
  - promotieblokken met een tussenkop ("Maak NOS jouw voorkeursbron in Google");
  - verborgen linkteksten ("(opent in nieuw venster)");
  - "Skip to main content", cookiemeldingen en dubbele alinea's.
- **Lezer: brede tabellen** scrollen zelf, zonder dat de hele pagina opzij schuift.
- **Opnamestand voor App Store-beelden (alleen Debug):** echte verhalen naar keuze (`-HootFeature`), en `-HootScroll slot` voor het einde van de editie.

## [0.19.0] — 2026-10-28 — Nieuw welkom, rustiger einde, ongedaan maken

- **Welkom herschreven.**
  - **Kop:** op twee regels, die meekrimpen op een smal scherm.
  - **Tekst:** één korte regel uitleg, en drie onderdelen van elk één regel. Het icoon staat op de titelregel en de uitleg is gedempt.
  - **Opmaak:** vaste witruimtes. De knoppen staan onder de inhoud en vallen er nooit overheen (op de iPhone 16 Pro viel de Digest-regel eronder).
- **Einde van de editie:** "Of lees verder in de Stroom" is een rustige link, geen knop meer.
- **Bronfilter in woorden:** kies je een bron in de Stroom, dan staat eronder "Alleen NRC" met "Alle bronnen".
- **Digest-kaart:** het rangnummer is kleiner, en waarom een stuk gekozen is, staat onder de kop.
- **Bewaard:** na het wegvegen staat er zes seconden "Ongedaan maken". VoiceOver leest dat ook voor.
- **Accentkleur hersteld:** het accent wijst rechtstreeks naar de rode kleur. In 0.17 en 0.18 viel het soms terug op systeemblauw.

## [0.18.0] — 2026-10-28 — Tien vakgebieden, je vak in het welkom

- **De Digest heeft tien vakgebieden.** Nieuw zijn SEO & content, Merk & reclame, Development, Productmanagement en Startups & ondernemen. Tot de server ze levert, staan ze op "binnenkort".
- **Je vak in het welkom:** na "Eerst kiezen wat je interesseert" komt nu "En je vak?".
- **Zoeken** let niet meer op accenten: "Oekraine" vindt ook "Oekraïne".
- **De lezer:** een brede tabel scrolt zelf, zonder dat de hele pagina opzij schuift.

## [0.17.0] — 2026-10-28 — Bugronde, schermtitels in de serif, nieuw welkom

- **Schermtitels in de krantenletter:** Middageditie, Stroom, Digest en de rest staan in de serif, groot op heavy en klein in de balk op bold. Ze groeien mee met de tekstgrootte, zoals op de website. Daarbij is de punt van het woordmerk weer rood; hij werd blauw van de balk.
- **Welkom herschreven.** Er staat een uitnodigende zin onder de belofte, en de drie onderdelen zijn vloeiender beschreven.
- **Gemaakt door Baldadig.nl**, met een link.
- **Opgelost uit de bugtest:**
  - **Stroom:**
    - De streep "Hier was je gebleven" blijft staan als je een artikel leest en terugkomt.
    - Een uitgezette bron blijft niet als filter hangen.
  - **Jouw editie:**
    - De app stuurde bij de vorige editie ook de stukken mee die daarna bij een verhaal kwamen. Daardoor zakten verhalen die zich ontwikkelen te ver weg. Nu stuurt hij alleen wat er toen stond, zoals de website.
    - Een trager antwoord overschrijft geen nieuwer antwoord meer.
    - Een persoonlijke editie op oude instellingen wordt niet meer getoond.
  - **Laden:**
    - Lukt het laden van een bron niet, dan blijven de stukken staan die je al had, met de melding dat je niet helemaal bij bent.
    - De app wacht niet meer op Bluesky voordat hij klaar is.
    - Na een mislukte koude start probeert de app het opnieuw zodra je terugkomt.
    - Vergelijken laadt na het verversen de nieuwe verhalenbundel.
    - De Digest ververst zichzelf als er een nieuwe is.
  - **Lezer:**
    - Hij geeft het op na 20 seconden in plaats van eindeloos te laden.
    - Hij laadt opnieuw als WebKit stopt.
    - Een doorverwijzing telt niet meer als mislukking.
    - "Verder naar de lezer" gaat terug naar het artikel.
    - Na inloggen bij een abonnement laadt het artikel opnieuw.
    - Inlogknoppen die een nieuw venster openen, werken.
    - Bluesky-posts openen op bsky.app.
  - **Overig:**
    - Het welkom komt terug als je de app tijdens het eerste welkom sloot.
    - Bij "Kies eerst je interesses" waren de schakelaars wit op wit.
    - In Zoeken is een rij niet meer in zijn geheel een link naar Vergelijken.
    - Een video geeft het geluid terug aan je muziek.
    - Sneltoetsen werken niet meer achter de lezer.
    - VoiceOver kan niet meer achter het opstartscherm komen.
    - Taalfouten zijn verbeterd, zoals "1 bronnen", "dit toestel" en "bladwijzericoon".

## [0.16.0] — 2026-10-28 — Een organische stuiter, Bluesky in de Stroom

- **De punt stuitert klein en organisch.** Hij gaat 9 pt omhoog en remt daarbij af, valt versneld terug, deukt kort in bij het landen, veert nog 2 pt na en ligt dan even stil. Eén sprong duurt 1,6 s.
  - **Fout opgelost:** in 0.15 werd het indeuken berekend vanaf de hoek van het woord in plaats van vanaf de punt. Daardoor schoot de punt bij elke landing zo'n 20 pt opzij.
  - **Precies op zijn plek:** de punt staat nu exact waar hij in het vaste opstartscherm staat (schaal 49/73,5, zoals iOS de SVG tekent).
- **Bluesky:**
  - **Instellingen:** daar zet je Bluesky alleen nog aan of uit.
  - **In de Stroom:** daar volg je mensen, via Accounts met hun @-naam.
  - **Standaardaccounts weg:** er zijn geen standaardaccounts meer (zie web 1.39.0).
  - **Fouten opgelost:** het accountscherm stond in Instellingen in een tweede navigatiebalk; dat scherm is daar weggehaald. Een filter op iemand die je niet meer volgt, gaf een lege lijst zonder uitweg; dat filter vervalt nu vanzelf.

## [0.15.0] — 2026-10-28 — De stuiterende punt

- **Opstartscherm als lader:** na het vaste rode opstartscherm volgt een scherm dat er pixel voor pixel hetzelfde uitziet, maar waarin de punt achter "hoot" stuitert. Elke sprong duurt 1,6 s: rustig omhoog, weer omlaag, landen met een klein deukje, en dan even stil.
  - **Hoe lang:** het scherm blijft staan tot je editie er is, minstens één sprong en hooguit 5 seconden. Daarna vervaagt het.
  - **Rustige stand:** met "Verminder beweging" staat de punt stil.
- **Welkom alleen bij een verse installatie.** Wie al instellingen of gelezen stukken op het toestel heeft, slaat het welkom over. Het welkom komt pas na het opstartscherm.

## [0.14.0] — 2026-10-27 — Merkrood

- **Opstartscherm in merkrood** met "hoot." in papierwit (`BrandRed`, `LaunchMark`), in licht en donker gelijk. iOS bewaart opstartschermen: het nieuwe verschijnt na herinstalleren, soms pas na een herstart.
- **Welkom bij de eerste start:** een rood scherm met "Minder scrollen. Meer lezen.", de drie onderdelen (Editie, Stroom, Digest), "Begin met lezen" en "Kies eerst je interesses". Het staat in de buitenste weergave, omdat de lezer al op volledig scherm presenteert.
- **Einde van de editie** is een rode kaart: "Je bent bij.", wanneer de volgende editie komt, en "Toch verder lezen in de Stroom".
- **App Store- en promobeelden** in merkrood met papierwitte koppen. Een te lange kop wordt nu automatisch kleiner, zodat hij niet meer buiten het beeld valt.
- **Theme:** `brandRed` en `onBrandRed`, gelijk aan de website.

## [0.13.0] — 2026-10-27 — Het design system toegepast

- **Kleuren van het design system:** `Ink`, `Ink2`, `Ink3`, `Rule`, `Edge`, `AccentSoft`, `OnAccent` en `Warn` in de asset catalog, en `Theme` met dezelfde namen als de website. `Muted` is `Ink3` geworden, met dezelfde waarde als op de website.
  - Intro's staan in `ink2`, niet meer in het grijs van metadata.
  - Koppen staan in `ink`, niet in het zwart van het systeem.
  - Haarlijnen zijn `rule`.
  - Fouttekst is `warn`, niet het rood van het systeem (3,2:1).
- **`Space` en `Radius`:** dezelfde schaal van 4 pt en dezelfde hoeken (8 · 12 · 16) als de website. Losse maten (6, 10, 14, 18, 28) zijn weg. `Layout.wide` is 1000, gelijk aan de website.
- **Bronnenrij in de Stroom filtert nu**, zoals op de website: één tik toont alleen die bron, nog een tik weer alles. De gekozen bron staat in kleur met een rode ring. Elk logo heeft een aanraakvlak van 44 pt, net als de ster en de bronnaam.
- **Einde van de editie** zoals op de website: "Je bent bij." met wanneer de volgende editie klaarstaat.
- **Rubriek:** de punt tussen twee labels staat in grijs.
- **De lezer** gebruikt de tokenwaarden, een kop op 800 en marges van de schaal.
- **Bediening in de Stroom** (Bronnen, Accounts) is grijs en zonder glazen rondje, zoals het tandwiel.

## [0.12.0] — 2026-10-27 — De lezer, iPad en iPhone mini

- **De Hoot-lezer.** Artikelen openen standaard in de lezer: alleen de tekst en beelden, in de opmaak van Hoot (krantenletter, papier, licht en donker), met tekstgrootte, delen, bewaren en "Open bij de uitgever".
  - **Techniek:** het artikel laadt op je iPhone zoals in Safari. Readability (Mozilla, Apache 2.0) haalt de tekst eruit, in een eigen JavaScript-omgeving waar de site niet bij kan. Er gaat niets via de server van Hoot.
  - **Abonnementen:** bij Instellingen › Inloggen bij je abonnementen log je één keer in op de site van de uitgever. Daarna lees je ook hun hele artikelen in de lezer. De inlog blijft op dit toestel, en uitloggen kan overal in één keer.
  - **Toestemming of inloggen:** vraagt een uitgever daarom, dan zie je die pagina zelf en kies jij. Daarna gaat de lezer verder. Hoot omzeilt geen toestemmings- of betaalmuren.
  - **Opgeschoond:** soortlabels ("Nieuws", "Analyse"), het auteursblok, "Gepubliceerd" en "Leestijd", "Lees ook" en deelknoppen.
  - **Lukt het niet:** dan zegt de lezer dat, met "Open op de website".
- **Artikelen openen:** kies tussen in de lezer, op de website (in Hoot) of in Safari.
- **iPad:**
  - **Hoofdverhaal:** beeld en tekst staan alleen naast elkaar bij veel ruimte (vanaf 1000 pt). Op de iPad mini en in Split View staat een breed beeld met de kop over de hele breedte.
  - **Sneltoetsen:** ⌘1–4 voor de tabbladen, ⌘F om te zoeken, ⌘R om te verversen.
  - **Aanwijzer:** artikelen lichten op onder de muis of het trackpad.
- **iPhone 13 mini:** alle schermen nagelopen op 375 pt.
- **Branding:** het woordmerk "hoot." staat klein linksboven in de editie.
- **Rustiger tandwiel:** grijs en zonder glazen rondje.
- **Bronnaam in lijsten:** in Vergelijken, Bewaard en Zoeken is de bronnaam geen link meer. Die maakte van de hele rij een link.

## [0.11.1] — 2026-10-27 — Rustiger bronnenrij

- **De rij met bronnen in de Stroom is kleiner en rustiger:** logo's van 30 pt in grijs, zonder sterretjes, met een aanraakvlak van 44 pt.

## [0.11.0] — 2026-10-27 — Jouw editie, ook zonder account

- **De editie komt uit jouw bronnen.** De app vraagt per dagdeel jouw editie op bij `/api/edition`. Die gebruikt hetzelfde selectiewerk als de website, met je bronnen, interesses, voorkeursbronnen en smaak, en herhaalt niet wat in je vorige editie stond. Onder de datum staat "Jouw editie". Lukt het niet, dan de editie voor iedereen.
- **Interesses** (Instellingen › Jouw editie): de acht van de website. Wat erbij past, gaat voor.
- **Voorkeursbronnen:** een ster bij een bron in Bronnen, of op het bronscherm. Die bronnen wegen zwaarder en leveren bij voorkeur het hoofdbericht.
- **De app leert je smaak:** wat je opent en bewaart, per onderwerp en bron, op deze iPhone.
- **Snel naar één bron:** bovenaan de Stroom staan je bronnen als logo's, met de voorkeursbronnen vooraan en een sterretje. Een tik, of een tik op de bronnaam bij een bericht, opent alles van die bron, nieuwste eerst.
- Import (`import.json`) neemt nu ook interesses en voorkeursbronnen over.

## [0.10.0] — 2026-10-26 — Video's in Bluesky

- **Video's spelen in de app.** In Bluesky (bovenaan de Stroom) staat bij een video het stilstaande beeld met een afspeelknop. Een tik speelt hem af in de post, met de gewone iOS-bediening en volledig scherm.
  - Er wordt pas iets geladen als je tikt.
  - Er speelt er maar één tegelijk.
  - Weg scrollen pauzeert de video.
  - Geluid speelt ook met de stil-schakelaar aan.
- Video's komen rechtstreeks van Bluesky's video-CDN, ook bij posts die je zelf volgt.
- **Alleen in Debug:** `-HootScreen video` start de eerste video vanzelf.

## [0.9.0] — 2026-10-26 — Bluesky, en je eigen instellingen

- **Bluesky in de Stroom.** Zet het aan in Instellingen › Bluesky; bovenaan de Stroom kies je dan "Nieuws" of "Bluesky".
  - Je ziet de posts van de mensen die je volgt, nieuwste eerst, met foto's en gedeelde links, en kunt filteren op één persoon.
  - Via Accounts kun je zelf mensen volgen, met hun naam of een link van bsky.app. Je ziet dan hun eigen posts van de afgelopen 48 uur, zonder reposts en antwoorden, net als op de website.
  - Bluesky is geen eigen tabblad, want een zesde tabblad verstopt iOS met Bewaard en Zoeken achter "Meer".
- **Intro bij berichten:** kies 1, 2 of 3 regels of de hele intro, zoals de voorvertoning op de website.
- **Bewaarde Bluesky-posts** tonen in Bewaard hun tekst.
- **Instellingen overnemen.** De app leest eenmalig `import.json` in zijn eigen map (de instellingen van je account op hootnews.nl, plus je eigen Bluesky-accounts) en verwijdert het bestand daarna. Zo kan de app op een testtoestel meteen met de instellingen van de tester draaien, zonder inloggen.

## [0.8.0] — 2026-10-26 — Tweede ronde uit de ontwerpaudit

- **Stroom: nieuw sinds je vorige bezoek.** Onder de titel staat hoeveel berichten er nieuw zijn. Een rode lijn "Hier was je gebleven" markeert waar je de vorige keer was; daaronder heb je alles al gezien. De grens schuift niet mee terwijl je leest. Bij het eerste bezoek zegt de Stroom wat hij is: "De laatste berichten van je bronnen, nieuwste eerst."
- **Vergelijken:**
  - de kop van het verhaal staat bovenaan;
  - er wordt eerlijk geteld: "29 bronnen, 63 artikelen" (bronnen zijn uitgevers);
  - het eerste bericht is gemarkeerd;
  - de titel is "Vergelijken".
- **Hoofdverhaal:** de intro bestaat uit hele zinnen in plaats van een zin die halverwege afbreekt.
- **Heel grote tekst:** rubrieklabels zonder kapitalen, en bij de vakgebieden geen icoon, zodat de beschrijving de hele breedte krijgt.
- **"+N bronnen":** heeft een aanraakvlak van 44 pt.
- **Bronnen:** een volledig, dicht blad (geen feed die erdoorheen schijnt), met uitleg over gratis en abonnement.
- **Zoeken:** zegt waarin Hoot zoekt (koppen en intro's in je Stroom), ook als er niets gevonden is, in plaats van "controleer de spelling".
- **Digest:** de kop is kort ("15 stukken in 5 vakgebieden"); het aantal waaruit gekozen is, staat bij de uitleg.
- **Alleen in Debug:** `-HootSeenMinutes`, en grote tekst en donker werken nu ook in bladen.

## [0.7.0] — 2026-10-26 — Eerste ronde uit de ontwerpaudit

- **Zonder netwerk de laatste editie.** Elk geslaagd antwoord wordt ook als bestand bewaard. Zonder netwerk zie je de laatste editie en Stroom, met "Je ziet de versie van …". Zonder eerdere download is er een knop "Probeer opnieuw".
- **Beter leesbaar grijs.** Datum, intro, bron en toelichtingen hebben een eigen kleur met minstens 4,5:1 contrast: licht 5,4:1, donker 6,5:1.
- **Wissen met een zichtbare Annuleer.** De knoppen zeggen precies wat er gebeurt: "Alles als ongelezen markeren" en "Bewaarde artikelen verwijderen" (met het aantal).
- **Leesinstellingen als één keuze.** "Artikelen openen: In Hoot / In Safari". Alleen bij "In Hoot" verschijnen "Abonnementsbronnen in Safari" en "Lezer automatisch openen".
- **Vakgebieden:** een vak dat de server nog niet levert, staat uit met "binnenkort".
- **Labels:** "Afbeeldingen", "Vakgebieden" en "Buiten je bronnen".
- **Alleen in Debug:** startargumenten die de app direct op een scherm openen, plus `ios/AppStore/tools/device-screens.sh` voor schermafbeeldingen op een echte iPhone.

## [0.6.0] — 2026-10-25 — E-commerce in de Digest

- **Nieuw vak E-commerce**, met een winkelwagen als icoon. Voor nieuwe installaties staat het standaard aan.
- In Instellingen telt "Vakken in de Digest" nu vanzelf mee met het aantal vakken.

## [0.5.0] — 2026-10-25 — AI in de Digest

- **Nieuw vak AI** (modellen, tools, MCP en werkwijzen), met een eigen icoon. Voor nieuwe installaties staat het standaard aan.
- **"Design in digital" heet nu Digital Design.**

## [0.4.0] — 2026-10-25 — Herstel na de audit

Gebaseerd op `AUDIT-2026-10-24.md`:

- **Grote tekst (F-01):**
  - de Digest blijft bij de grootste tekstformaten binnen het scherm;
  - de bronregel breekt nu af in plaats van de kolom breder te maken;
  - "Ook bij …" loopt terug;
  - iconen blijven binnen hun vlak.
- **Lezen en inloggen (F-03):**
  - betaalde bronnen openen standaard in Safari, waar je ingelogd bent bij je abonnementen (uit te zetten in Instellingen);
  - de teksten in de app en in de App Store-beschrijving zeggen nu juist hoe inloggen werkt.
- **Kapotte serverantwoorden (F-04):** één kapot verhaal of bericht wordt overgeslagen; de rest van de editie blijft zichtbaar.
- **Meerdere vensters (F-05):** een artikel opent alleen in het venster waarin je tikt (iPad).
- **Snel wisselen van bronnen (F-06):** een nieuwe keuze breekt het vorige laden af. Een trager, ouder antwoord kan je keuze niet meer overschrijven.
- **Offline (F-07):** "Verversen lukt nu niet. Je ziet de versie van 12:05", met een knop om het opnieuw te proberen.
- **Adressen (F-08):** alleen http(s)-artikelen openen in de app, en er komt geen leeg scherm meer zonder sluitknop.
- **Datum (F-09):** de datum van de editie volgt de Amsterdamse tijd, ook als je toestel in een andere tijdzone staat.
- **Swift 6 (F-10):** het project draait in de Swift 6-taalmodus, zonder concurrencywaarschuwingen.
- **Liquid Glass (F-11):** de verouderde tint op de Safari-weergave is weg.
- **Schermafbeeldingen (F-12):** de haak voor schermafbeeldingen werkt alleen nog in Debug-builds.
- **Opslag (F-13):** Bewaard en gelezen staan in een eigen bestand, en gelezen op volgorde. Bestaande gegevens gaan vanzelf mee.
- **Snelheid (F-14):** de Stroom wordt één keer per laadactie gesorteerd, en beelden blijven in een grotere cache (300 MB).

## [0.3.0] — 2026-10-24 — iPad, iPhone mini, iPhone Duo en klaar voor de App Store

- **iPad:** de app werkt nu ook op iPad, in alle standen en met Split View en Stage Manager. De iPadOS-tabbalk staat bovenaan en kan een zijbalk worden.
- **Brede opmaak** (iPad, opengevouwen iPhone Duo, Pro Max liggend): het hoofdverhaal met beeld en kop naast elkaar, de verhalen in twee kolommen, en de Digest-kaarten naast elkaar. Bij vouwen of een ander venster wisselt de opmaak live.
- **iPhone mini en grote tekst:** knoppen schuiven onder de bron als het niet op één regel past; miniaturen schalen mee en verdwijnen bij de grootste tekst.
- **Instellingen volgens de Human Interface Guidelines:**
  - geen eigen licht/donker meer (de app volgt je iPhone);
  - een verwijzing naar de Instellingen-app voor meldingen;
  - geen rij meer voor inloggen dat er nog niet is;
  - wissen alleen na bevestiging.
- "+1 bron" in plaats van "+1 bronnen".
- **Voor de App Store:** privacymanifest, vrijstelling voor versleuteling, en de map `AppStore/` met checklist, teksten, schermafbeeldingen, privacy- en leeftijdsantwoorden, notities voor de beoordelaar en promotie.

## [0.2.0] — 2026-10-24 — Instellingen

- Account-knop rechtsboven op Editie, Stroom, Digest en Bewaard; opent het instellingenblad.
- Weergave: thema (systeem, licht, donker) en beeld (aan, alleen hoofdverhaal, uit). De tekstgrootte volgt je iPhone.
- Editie: "Buiten je bubbel" aan of uit.
- Lezen: openen in de app of in Safari, en of de Lezer meteen aan staat.
- Bronnen en de vakken van de Digest; Bewaard leegmaken en gelezen vergeten; Over (versie, privacy, hootnews.nl).
- Inloggen staat al in het blad en komt in de volgende versie (Google en Apple).

## [0.1.0] — 2026-10-24 — Fase 1: de basis

- Native SwiftUI-app voor iOS 26 met Liquid Glass: tabbalk (Editie, Stroom, Digest, Bewaard) met zoeken als eigen glazen knop; de balk krimpt bij omlaag scrollen.
- Editie met het hoofdverhaal groot (altijd met een scherp beeld) en "+N bronnen" om een verhaal te vergelijken.
- Stroom met al je bronnen; bronnen aan- en uitzetten in een blad.
- Digest als tijdschrift: per vak het eerste stuk groot, dan twee kaarten en "Ook deze week"; vakken kiezen met glazen knoppen.
- Bewaard en Zoeken; lezen via de Safari-weergave in de app; lang drukken om te bewaren, delen of in Safari te openen.
- Beelden op maat, met dezelfde regels als de web-app (NU.nl, NOS, NYT, de Volkskrant, Wired, The Verge, The Guardian en meer).
- Huisstijl: papier, inkt en krantenrood; koppen in New York; donkere modus; app-icoon licht, donker en getint.
