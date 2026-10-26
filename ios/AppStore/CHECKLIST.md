# Checklist: Hoot News naar de App Store

Stand: 24 oktober 2026 · app-versie 0.8 (build 8) · iOS 26.0 en hoger · iPhone en iPad

Legenda: ✅ klaar · 🟡 klaar, maar moet jij nakijken of beslissen · ⏳ moet nog · 👤 alleen jij kunt dit doen

## 1. Account en registratie

| | Wat | Toelichting |
|---|---|---|
| 👤 | **Apple Developer Program** | Aanmelden op developer.apple.com/programs, € 99 per jaar. Als particulier of als Baldadig (bedrijf; dan heb je een D-U-N-S-nummer nodig). De naam die je kiest staat in de App Store als "verkoper". |
| 👤 | **Bundle ID registreren** | Certificates, Identifiers & Profiles → Identifiers → `nl.hootnews.Hoot`. Xcode doet dit ook automatisch bij de eerste archive. |
| 👤 | **App aanmaken in App Store Connect** | Mijn apps → + → Nieuwe app: platform iOS, naam **Hoot News**, primaire taal Nederlands, bundle ID `nl.hootnews.Hoot`, SKU `hoot-ios`. |
| 👤 | **Team kiezen in Xcode** | Project Hoot → Signing & Capabilities → Team. |

## 2. De app zelf

| | Wat | Toelichting |
|---|---|---|
| ✅ | Bouwt zonder fouten met de iOS 27.1-SDK | Minimaal iOS 26.0. |
| ✅ | iPhone en iPad (universeel) | Zie [APPARATEN.md](APPARATEN.md): iPad, iPhone mini en iPhone Duo. |
| ✅ | App-icoon 1024 × 1024 | Licht, donker en getint (`Assets.xcassets/AppIcon`). |
| ⏳ | Icoon in Icon Composer (gelaagd Liquid Glass) | Mooier op iOS 26/27, niet verplicht. Open `icon-1024.png` in Icon Composer (Xcode → Open Developer Tool), maak de **h** en de **punt** aparte lagen, sla op als `AppIcon.icon`. |
| ✅ | Startscherm in papierkleur | `Info.plist` → `UILaunchScreen`. |
| ✅ | Privacymanifest | `PrivacyInfo.xcprivacy`: geen tracking, geen verzamelde gegevens, UserDefaults met reden CA92.1. |
| ✅ | Versleuteling: vrijgesteld | `ITSAppUsesNonExemptEncryption = NO` (alleen HTTPS). Dan vraagt App Store Connect er niet meer naar. |
| ✅ | Instellingen volgens de Human Interface Guidelines | Geen eigen licht/donker, verwijzing naar de Instellingen-app, wissen alleen na bevestiging. |
| ✅ | Dynamische tekst en donkere modus | Ook bij de grootste tekstformaten bruikbaar (miniaturen wijken, knoppen schuiven onder elkaar). |
| ⏳ | Getest op een echte iPhone | Via Xcode op je eigen toestel, zie `ios/README.md`. |
| ⏳ | Getest op iPhone Duo | De simulator heeft iOS 27.1 nodig: Xcode → Settings → Components → iOS 27.1 Simulator (± 8 GB). |
| ⏳ | **Inloggen (fase 2)** | Nog niet in deze versie. Komt inloggen met Google erbij, dan is **Inloggen met Apple** verplicht (richtlijn 4.8), en moeten de privacylabels worden bijgewerkt (e-mail, gebruikers-ID). |

## 3. Productpagina (teksten staan klaar in `metadata/nl-NL/`)

| | Wat | Bestand | Limiet |
|---|---|---|---|
| ✅ | Naam: **Hoot News** | `name.txt` | 9 / 30 |
| ✅ | Ondertitel: *Rustig nieuws, met een einde* | `subtitle.txt` | 28 / 30 |
| ✅ | Promotietekst | `promotional_text.txt` | 150 / 170 |
| ✅ | Beschrijving | `description.txt` | 1.799 / 4.000 |
| ✅ | Trefwoorden | `keywords.txt` | 97 / 100 (geen merknamen van bronnen: richtlijn 2.3.7) |
| ✅ | Nieuw in deze versie | `release_notes.txt` | |
| 🟡 | Naam beschikbaar? | | "Hoot" alleen is waarschijnlijk bezet; App Store Connect zegt het bij het aanmaken. Alternatief: *Hoot: rustig nieuws*. |
| ✅ | Categorie: Nieuws (tweede: Tijdschriften en kranten) | `primary_category.txt` | |
| ✅ | Copyright: 2026 Alex Vrees | `copyright.txt` | |
| ✅ | Privacybeleid-URL: https://hootnews.nl/#/privacy | `privacy_url.txt` | |
| ✅ | Privacybeleid dekt de app | | Alinea "De app voor iPhone en iPad" en contactadres toegevoegd (web 1.32.4). |
| ✅ | **Support-URL met contactgegevens** | `support_url.txt` | `https://hootnews.nl/#/over`: pagina "Over Hoot" met contact en veelgestelde vragen (web 1.32.4), ook voor nieuwe bezoekers direct leesbaar. |
| 👤 | **Mailadres hallo@hootnews.nl aanmaken** | | Bij je domeinbeheerder, als echte mailbox of als doorstuuradres naar je eigen mail. Stuur daarna één testmail. |
| ✅ | Marketing-URL: https://hootnews.nl | `marketing_url.txt` | Optioneel. |

## 4. Beelden

| | Wat | Map |
|---|---|---|
| ✅ | iPhone 6,9" (1320 × 2868), verplicht | `screenshots/iphone-6.9/` (kaal) en `screenshots/marketing/iphone-6.9/` (met kop, aanbevolen) |
| ✅ | iPad 13" (2064 × 2752), verplicht omdat de app op iPad draait | `screenshots/ipad-13/` en `screenshots/marketing/ipad-13/` |
| 🟡 | **Inhoud van de schermafbeeldingen** | Het zijn echte edities. Maak ze vlak voor het indienen opnieuw op een rustig nieuwsmoment (zonder gevoelige koppen), met hetzelfde script; zie [README.md](README.md). |
| ⏳ | App-preview (video, 15–30 s) | Optioneel. |
| ✅ | Promotiebeelden voor sociale media | `promotie/` |

## 5. App Privacy (privacylabels)

| | Wat | |
|---|---|---|
| 🟡 | Antwoorden | Zie [APP-PRIVACY.md](APP-PRIVACY.md): **Geen gegevens verzameld** (zolang er geen inloggen is). |

## 6. Leeftijdsclassificatie

| | Wat | |
|---|---|---|
| 🟡 | Vragenlijst | Zie [LEEFTIJD.md](LEEFTIJD.md). Eén keuze is aan jou: of de Safari-weergave telt als "onbeperkte webtoegang". |

## 7. Prijs en beschikbaarheid

| | Wat | |
|---|---|---|
| 🟡 | Gratis | Voorstel. |
| 🟡 | Landen | Voorstel: Nederland en België (de bronnen en teksten zijn Nederlandstalig). Kan later breder. |

## 8. App Review

| | Wat | |
|---|---|---|
| ✅ | Notities voor de beoordelaar (Engels) | [REVIEW-NOTES.md](REVIEW-NOTES.md): wat de app doet, waar de inhoud vandaan komt, geen inloggen nodig. |
| 🟡 | **Inhoud van derden (richtlijn 5.2)** | Hoot toont koppen, intro's en beelden uit openbare feeds en linkt naar de uitgever. Apple kan vragen of je dat mag. De notities leggen het uit; houd er rekening mee dat Apple om toestemming van uitgevers kan vragen. |
| 🟡 | **Minimale functionaliteit (richtlijn 4.2)** | Hoot is native (geen website in een schil) met eigen functies (editie, vergelijken, Digest, bewaren). |
| 👤 | Contactgegevens voor de beoordelaar | Naam, telefoon en e-mail in App Store Connect. |

## 9. Uploaden en indienen

1. 👤 Xcode: kies **Any iOS Device (arm64)** → Product → **Archive**.
2. 👤 Organizer → **Distribute App** → App Store Connect → Upload.
3. 👤 App Store Connect → TestFlight: test eerst zelf (interne tester = jij).
4. 👤 Vul de productpagina in (teksten uit `metadata/`, beelden uit `screenshots/`).
5. 👤 App Privacy, Leeftijd, Prijs: zie de documenten hierboven.
6. 👤 Kies de build → **Ter beoordeling indienen**. Beoordeling duurt meestal 1–2 dagen.
