# Changelog — Hoot voor iOS

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
