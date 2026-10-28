# App Privacy: antwoorden voor App Store Connect

App Store Connect → je app → **App Privacy** → Aan de slag.

## Versie 0.2 (zonder inloggen)

**Verzamel jij of je externe partners gegevens van deze app?** → **Nee, we verzamelen geen gegevens van deze app.**

Waarom dat klopt:

- Geen account, geen analytics, geen advertenties, geen tracking (zie `Hoot/PrivacyInfo.xcprivacy`).
- Voorkeuren, Bewaard en wat je las blijven op het toestel (UserDefaults).
- De app haalt het nieuws op bij hootnews.nl. Netlify (de host) houdt technische logboeken bij, zoals bij elke website. Apple telt dat niet als verzamelen, zolang het niet aan een persoon wordt gekoppeld of voor iets anders wordt gebruikt.
- Artikelen openen in de Safari-weergave. Wat de site van de uitgever doet, valt onder de uitgever en Safari, niet onder Hoot.

Resultaat op de productpagina: **"Geen gegevens verzameld"**.

## Vanaf versie 1.0 (build 23): met inloggen en synchroniseren

**Verzamel jij gegevens?** → **Ja.** Per type: gekoppeld aan de gebruiker, niet voor tracking, doel alleen app-functionaliteit:

| Gegevenstype | Gekoppeld aan jou | Voor tracking | Doel |
|---|---|---|---|
| Contactgegevens → E-mailadres | Ja | Nee | App-functionaliteit (account) |
| Identificatoren → Gebruikers-ID | Ja | Nee | App-functionaliteit |
| Gebruiksgegevens → Productinteractie (bewaard, gelezen, gevolgde verhalen) | Ja | Nee | App-functionaliteit (synchroniseren) |

`PrivacyInfo.xcprivacy` en het privacybeleid op hootnews.nl zijn hierop bijgewerkt (28 oktober).
