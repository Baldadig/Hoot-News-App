# Changelog — Hoot voor iOS

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
