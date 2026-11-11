# App Privacy: antwoorden voor App Store Connect

App Store Connect → je app → **App Privacy** → Aan de slag.

## Versie 0.2 (zonder inloggen)

**Verzamel jij of je externe partners gegevens van deze app?** → **Nee, we verzamelen geen gegevens van deze app.**

Waarom dat klopt:

- Geen account, geen analytics, geen advertenties, geen tracking (zie `Hoot/PrivacyInfo.xcprivacy`).
- Voorkeuren, Bewaard en wat je las blijven op het toestel (UserDefaults).
- De app haalt het nieuws op bij gethoot.app (sinds build 46; eerdere builds gebruikten hootnews.nl). Netlify (de host) houdt technische logboeken bij, zoals bij elke website. Apple telt dat niet als verzamelen, zolang het niet aan een persoon wordt gekoppeld of voor iets anders wordt gebruikt.
- Artikelen openen in de Safari-weergave. Wat de site van de uitgever doet, valt onder de uitgever en Safari, niet onder Hoot.

Resultaat op de productpagina: **"Geen gegevens verzameld"**.

## Vanaf versie 1.0 (build 23): met inloggen en synchroniseren

**Verzamel jij gegevens?** → **Ja.** Per type: gekoppeld aan de gebruiker, niet voor tracking, doel alleen app-functionaliteit:

| Gegevenstype | Gekoppeld aan jou | Voor tracking | Doel |
|---|---|---|---|
| Contactgegevens → E-mailadres | Ja | Nee | App-functionaliteit (account) |
| Contactgegevens → **Naam** (sinds build 47 in het manifest; in ASC opgegeven) | Ja | Nee | App-functionaliteit (account) |
| Gebruikersinhoud → **Foto's of video's** (de profielfoto van Google; sinds build 48 in het manifest; in ASC opgegeven) | Ja | Nee | App-functionaliteit (account) |
| Identificatoren → Gebruikers-ID | Ja | Nee | App-functionaliteit |
| Gebruiksgegevens → Productinteractie (bewaard, gelezen, gevolgde verhalen) | Ja | Nee | App-functionaliteit (synchroniseren) |

`PrivacyInfo.xcprivacy` en het privacybeleid op gethoot.app zijn hierop bijgewerkt (28 oktober). Let op: met De Redacteur stelt de app de Editie op het toestel samen; het privacybeleid moet dat vóór de indiening van 1.0.1 zeggen.

## Aanvulling na de keuring van 4 november (voorbereid, nog niet doorgevoerd)

Het privacybeleid zegt: "Hoot krijgt daarbij je naam en e-mailadres (bij Google ook je profielfoto)". De app leest `full_name` (`Account.swift`, regel ~597) en Supabase bewaart die in de metadata van `auth.users`. De labels in ASC staan nu op E-mailadres, Gebruikers-ID en Productinteractie. Dus:

1. **ASC (Alex publiceert; de labels gaan direct live):** App Privacy → Gegevens bewerken → Contactgegevens → **Naam** aanvinken: gekoppeld aan de gebruiker, niet voor tracking, doel **App-functionaliteit** (account). Daarna publiceren.
2. **Profielfoto van Google (besloten 5 november: de foto blijft en wordt getoond; label "Naam én Foto's"):** Supabase bewaart bij Google-inlog ook `avatar_url`/`picture` in de metadata. Twee keuzes:
   - Het blijft zo: dan bij ASC ook Gebruikersinhoud → **Foto's of video's** opgeven (gekoppeld, geen tracking, App-functionaliteit), en het manifest uitbreiden met `NSPrivacyCollectedDataTypePhotosorVideos`.
   - Aanbevolen, want Hoot toont de foto nergens: de foto niet meer bewaren (bij het aanmaken van het account `avatar_url` en `picture` uit de metadata halen, of de Google-scope beperken tot e-mail en naam) en het beleid aanpassen ("naam en e-mailadres"). Dan is "Foto's" niet nodig.
3. **Manifest:** `ios/AppStore/privacy-build47/PrivacyInfo.xcprivacy.concept` (en de patch ernaast) voegt `NSPrivacyCollectedDataTypeName` toe. Bewust niet in build 46 (de build is al geüpload); mee in build 47. Het ASC-label hoeft niet op die build te wachten.

## Build 48 (5 november): Naam én Foto's

Besluit: Hoot toont je Google-profielfoto in Instellingen › Account (en in de accountkaart). Daarom:

- **Manifest** (`Hoot/PrivacyInfo.xcprivacy`): naast E-mailadres, **Naam**, Gebruikers-ID en Productinteractie nu ook `NSPrivacyCollectedDataTypePhotosorVideos`: gekoppeld aan de gebruiker, geen tracking, doel `NSPrivacyCollectedDataTypePurposeAppFunctionality`. Het manifest zit in de binary; dit gaat mee met build 48.
- **App Store Connect**: Contactgegevens › Naam en Gebruikersinhoud › Foto's of video's staan al zo (gekoppeld, geen tracking, App-functionaliteit). Niets meer te doen.
- **Privacybeleid** (gethoot.app/privacy, 4 november): noemt de profielfoto bij Google al. Klopt.
- Keuze 2 hierboven (de foto niet meer bewaren) is daarmee vervallen.

## 1.2.1 (11 november): De Redacteur op de server, met een samenvatting van je leesprofiel

Besluit Alex (11 november): "Leesprofiel meesturen". De Editie wordt op de server samengesteld (POST /api/edition v2). Daarvoor stuurt de app mee: bronnen, interesses en onderwerpen, meer/minder hiervan, de id's van gelezen berichten (tot 1500), met account het inlogtoken, en nu ook een **samenvatting van het leesprofiel**: per onderwerp en per bron een gewicht (afgerond op twee decimalen, hooguit 40 onderwerpen en 30 bronnen) en een teller tot 30. Geen artikelen, tijden, naam of toestel-id.

- **Bewaard?** Nee. De server rekent ermee en gooit het weg; niets van de body komt in een log (er staat geen `console.*` in de functie). Zonder account komt alleen een sha256-afdruk van de vraag in de cachesleutel, en in de cache alleen de Editie. Met account legt de server alleen de Editie zelf vast in `user_state.edition` (dat deed 1.2 ook al).
- **Labels in ASC:** Apple telt gegevens die alleen voor het verzoek zelf worden gebruikt en niet bewaard, niet als "verzameld". Daarom geen nieuw label nodig. De bestaande labels (E-mailadres, Naam, Foto's, Gebruikers-ID, Productinteractie: gekoppeld, geen tracking, App-functionaliteit) dekken de opgeslagen Editie en de gesynchroniseerde leesgeschiedenis. `PrivacyInfo.xcprivacy` blijft gelijk.
- **Tekst die niet meer klopte, aangepast in de repo:** `metadata/nl-NL/description.txt` zei "Wat de app leert van je leesgedrag, blijft op je toestel." Nu: "…, bewaart Hoot alleen op je toestel." Het privacybeleid (`src/views/Privacy.jsx`, gethoot.app/privacy) noemt de samenvatting nu.

**Na te lopen door Alex in App Store Connect (bij het indienen van 1.2.1):**
1. Beschrijving (nl-NL): de zin over het leesgedrag vervangen door die uit `description.txt`. De beschrijving kan alleen mee met een nieuwe versie.
2. App Privacy: niets wijzigen, wel nalezen dat er geen label "Gebruiksgegevens › Andere gebruiksgegevens" of "Browsegeschiedenis" nodig is volgens de uitleg hierboven (alleen voor het verzoek, niet bewaard).
3. Privacybeleid-URL: pas na de deploy van de website klopt gethoot.app/privacy met 1.2.1. Eerst de website deployen, dan indienen.
4. Release notes van 1.2.1: als je het noemt, kort en eerlijk ("je Editie is op iPhone en web dezelfde").

## Meten zonder volgen (branch `meten`, vanaf de volgende app-build)

De app stuurt een kleine POST naar `gethoot.app/api/tel` (alleen Release): gebeurtenis (Editie geopend, Editie uitgelezen, artikel geopend, Stroom, Selectie, vergelijking, delen), het dagdeel van de Editie, platform `ios`, major.minor van de app en een aantal. Geen account, geen token, geen toestel-id, geen tijdstempel, geen IP-opslag, geen cookie. De server telt op in één dagdocument; er blijft een getal per gebeurtenis, platform en dagdeel over. Op het toestel staat alleen "al geteld voor dagdeel X" (UserDefaults).

**Is dit "verzamelen" volgens Apple?** Voorzichtig: ja. Apple telt gegevens als verzameld zodra ze het toestel verlaten en langer bewaard worden dan nodig is om het verzoek zelf af te handelen. De dagtellers worden bewaard (hooguit 400 dagen). Ze zijn wel anoniem en geaggregeerd: niet te herleiden tot een persoon of toestel, dus **niet gekoppeld** en **niet voor tracking**. Het gegevenstype is Gebruiksgegevens › Productinteractie, doel Analytics.

**Wat Alex in App Store Connect aanpast (niet gedaan; bij het indienen van de eerstvolgende build):**
1. App Privacy › Gegevens bewerken › Gebruiksgegevens › **Productinteractie** staat er al (gekoppeld, geen tracking, App-functionaliteit). Vink daar **Analytics** bij als doel.
2. "Gekoppeld aan de gebruiker" blijft **Ja** voor dat gegevenstype: ASC kent die keuze één keer per gegevenstype, en de gesynchroniseerde leesgeschiedenis van ingelogde leden is wel gekoppeld. De tellers zelf zijn dat niet; dit is dus een voorzichtige (te ruime) opgave, geen onjuiste.
3. Tracking: **Nee**. Er is geen koppeling met gegevens van anderen en geen id.
4. Publiceren, en pas daarna de build met `Telling.swift` indienen (de labels moeten kloppen vóór de binary).

`Hoot/PrivacyInfo.xcprivacy` is hierop aangepast: `NSPrivacyCollectedDataTypePurposeAnalytics` bij Productinteractie. Het privacybeleid (gethoot.app/privacy) noemt het in "Wat Hoot telt"; eerst de website deployen, dan indienen. "Geen gegevens verzameld" op de productpagina was al niet meer waar sinds het inloggen; dit verandert het label niet verder.
