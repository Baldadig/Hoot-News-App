# Changelog — Hoot voor iOS

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
