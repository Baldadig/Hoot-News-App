# Opvolging ontwerp- en gebruiksaudit (26-10-2026)

Dit bestand volgt de audit van versie 0.6 (build 6) op een iPhone 16 Pro. De audit zelf is beoordeeld op de schermafbeeldingen in `ios/Audit-schermen/2026-10-26/`.

De punten van de eerste ronde ("vertrouwen en toegang") zijn opgelost in iOS 0.7.0 en web 1.34.1.

## Eerste ronde (P1)

| Bevinding | Status | Wat er veranderde |
|---|---|---|
| Verschillende gebeurtenissen onder één verhaalvergelijking | **Opgelost (server)** | Een echte fout in het bundelen, ook op de website. De verkiezingen in Brazilië en Servië waren één verhaal van 31 bronnen geworden. Er waren twee oorzaken. Ten eerste deelden koppen alleen algemene woorden ("president erkent nederlaag bij verkiezingen"); die koppelen nu niet meer als beide koppen namen hebben en er geen enkele delen. Ten tweede hield één felicitatie van Von der Leyen beide verhalen bij elkaar. In grote bundels telt een verbinding nu alleen als een derde bericht met beide verbonden is. Op de live data van 26-10 worden het twee zuivere verhalen (29 en 24 bronnen); alle andere verhalen bleven precies gelijk. Test: `tests/clustering.test.mjs` met de echte berichten. Live na de push. |
| Kleine grijze tekst heeft te weinig contrast (3,3:1) | **Opgelost** | Nieuwe kleur `Muted` voor datum, intro, bron en toelichtingen. Licht 5,4:1 op papier, donker 6,5:1. |
| Wisbevestiging zonder zichtbare Annuleer | **Opgelost** | Een melding met Annuleer en de exacte gevolgen. De knoppen heten nu "Alles als ongelezen markeren" en "Bewaarde artikelen verwijderen" (met het aantal). |
| Koude start offline verliest de editie | **Opgelost** | Elk geslaagd antwoord wordt ook als bestand bewaard. Zonder netwerk toont de app de laatste editie en Stroom, met "Je ziet de versie van …" en Opnieuw. Getest op de iPhone. Zonder eerdere download ziet de lezer een eigen melding met de knop "Probeer opnieuw". |

## Tweede ronde (P2): deels gedaan

| Bevinding | Status |
|---|---|
| Digest belooft vijf vakken, levert er drie | **Opgelost.** Een vak dat de server niet levert, staat uit met "binnenkort" en verschijnt niet in de Digest-keuze. Na de push levert de server alle vijf. |
| Leesinstellingen met onduidelijke samenhang | **Opgelost.** "Artikelen openen: In Hoot / In Safari", met alleen bij "In Hoot" de keuzes "Abonnementsbronnen in Safari" en "Lezer automatisch openen". |
| Labels (Beeld, Vakken, Volg je niet, de lange Sidebar-regel) | **Opgelost.** Nu: Afbeeldingen, Vakgebieden, Buiten je bronnen, Gekozen door Sidebar. Dit geldt ook op de website. |
| AX3: hiërarchie en compositie | **Deels (0.8.0).** Rubrieklabels zonder kapitalen, geen vak-icoon bij grote tekst, een kortere Digest-kop en "Gekozen door Sidebar". Nog testen met de echte systeemgrootte. |
| Glas boven drukke inhoud; het halve bronnenblad | **Bronnenblad opgelost (0.8.0)**: volledig en dicht blad. De tabbalk is van het systeem; testen met Verminder transparantie en Verhoog contrast. |
| Zoeken: reikwijdte en het lege scherm | **Opgelost (0.8.0).** Het lege scherm en "niets gevonden" zeggen waarin Hoot zoekt. |
| Aanraakvlakken | **"+N bronnen" is nu 44 pt (0.8.0)**; bewaren was al 44 × 44. |
| Uitleg gratis/abonnement bij bronnen | **Opgelost (0.8.0).** |

## Derde ronde (P3): productrichting

**Gedaan (0.8.0):**
- **Stroom:** "nieuw sinds je vorige bezoek" met de lijn "Hier was je gebleven". Zo heeft de Stroom een eigen taak (bijblijven) en een punt waar je weer bij bent.
- **Vergelijken:** een onderwerpstitel, bronnen en artikelen apart geteld, het eerste bericht gemarkeerd.
- **Hoofdverhaal:** een intro in hele zinnen.

Bewust niet gedaan:
- **"Waarom dit stuk" bij de Digest:** zonder redactie is dat verzonnen.
- **Onderscheid tussen nieuws, analyse en opinie in Vergelijken:** de bronnen leveren dat niet betrouwbaar aan.

Nog open: één verhaalpagina met ontwikkelingen en context, en een duidelijker onderscheid tussen Editie, Stroom en Digest. Daar is eerst een ontwerpronde voor nodig.

## Nog te testen op het toestel (door Alex)

De proeven uit de tabel "Gerichte controle op een echt toestel" in de audit. Vooral:
- **Bronvergelijking:** "+N bronnen" via een echte tik, na de push;
- **VoiceOver;**
- **Grotere tekst:** Instellingen › Toegankelijkheid › Weergave en tekstgrootte, ook in de bladen;
- **Bewaard met inhoud.**
