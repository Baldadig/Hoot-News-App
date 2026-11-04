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
| Contactgegevens → **Naam** (aangekondigd 4-11, nog niet in ASC gepubliceerd) | Ja | Nee | App-functionaliteit (account) |
| Identificatoren → Gebruikers-ID | Ja | Nee | App-functionaliteit |
| Gebruiksgegevens → Productinteractie (bewaard, gelezen, gevolgde verhalen) | Ja | Nee | App-functionaliteit (synchroniseren) |

`PrivacyInfo.xcprivacy` en het privacybeleid op gethoot.app zijn hierop bijgewerkt (28 oktober). Let op: met De Redacteur stelt de app de Editie op het toestel samen; het privacybeleid moet dat vóór de indiening van 1.0.1 zeggen.

## Aanvulling na de keuring van 4 november (voorbereid, nog niet doorgevoerd)

Het privacybeleid zegt: "Hoot krijgt daarbij je naam en e-mailadres (bij Google ook je profielfoto)". De app leest `full_name` (`Account.swift`, regel ~597) en Supabase bewaart die in de metadata van `auth.users`. De labels in ASC staan nu op E-mailadres, Gebruikers-ID en Productinteractie. Dus:

1. **ASC (Alex publiceert; de labels gaan direct live):** App Privacy → Gegevens bewerken → Contactgegevens → **Naam** aanvinken: gekoppeld aan de gebruiker, niet voor tracking, doel **App-functionaliteit** (account). Daarna publiceren.
2. **Profielfoto van Google (Alex beslist):** Supabase bewaart bij Google-inlog ook `avatar_url`/`picture` in de metadata. Twee keuzes:
   - Het blijft zo: dan bij ASC ook Gebruikersinhoud → **Foto's of video's** opgeven (gekoppeld, geen tracking, App-functionaliteit), en het manifest uitbreiden met `NSPrivacyCollectedDataTypePhotosorVideos`.
   - Aanbevolen, want Hoot toont de foto nergens: de foto niet meer bewaren (bij het aanmaken van het account `avatar_url` en `picture` uit de metadata halen, of de Google-scope beperken tot e-mail en naam) en het beleid aanpassen ("naam en e-mailadres"). Dan is "Foto's" niet nodig.
3. **Manifest:** `ios/AppStore/privacy-build47/PrivacyInfo.xcprivacy.concept` (en de patch ernaast) voegt `NSPrivacyCollectedDataTypeName` toe. Bewust niet in build 46 (de build is al geüpload); mee in build 47. Het ASC-label hoeft niet op die build te wachten.
