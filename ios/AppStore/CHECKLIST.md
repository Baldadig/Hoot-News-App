# Checklist: Hoot News naar de App Store

Stand: 28 oktober 2026 · app-versie 0.17 (build 18) in TestFlight · iOS 26.0 en hoger · iPhone en iPad · gratis · Nederland en België

Legenda: ✅ klaar · 🟡 klaar, maar moet jij nakijken of beslissen · ⏳ moet nog · 👤 alleen jij kunt dit doen

## 0. Stand in App Store Connect (28 oktober)

| | Wat | |
|---|---|---|
| ✅ | Apple Developer Program | Actief, als individu "Alex Vrees", team HSBZ66VRTZ. |
| ✅ | App aangemaakt | Hoot News · Nederlands · `nl.hootnews.Hoot` · SKU `hoot-ios` · Apple ID 6828037269. |
| ✅ | TestFlight | Build 18 (0.17) klaar; interne groep "Team Hoot" met Alex, automatische distributie. |
| ✅ | App-informatie | Ondertitel, categorieën Nieuws + Tijdschriften en kranten. |
| ✅ | Leeftijd | 13+ (zie LEEFTIJD.md; geen onbeperkte webtoegang, geen UGC/sociale media). |
| ✅ | App Privacy | "Geen gegevens verzameld", gepubliceerd; privacybeleid https://gethoot.app/#/privacy (bijgewerkt voor de app; zelfde pagina als hootnews.nl). |
| ✅ | Prijs en landen | Gratis; Nederland en België. |
| ✅ | Versie 1.0: teksten | Promotietekst, beschrijving, trefwoorden, support- en marketing-URL, copyright 2026 Baldadig, notities voor de beoordelaar. |
| ✅ | Contentrechten | Ingevuld door Alex (28 okt): bevat inhoud van derden, rechten aanwezig. |
| ✅ | Contactgegevens App Review | Alex Vrees, alex@baldadig.nl. Uitbrengen: handmatig na goedkeuring. |
| ✅ | Digital Services Act | Handelaar, ingevuld door Alex (28 okt). |
| 🟡 | Schermafbeeldingen | Opnieuw gemaakt 4-11 (avond): neutraal hoofdbeeld (ruimtetelescoop), Vergelijken met een sportverhaal, Nacht = de Stroom. Selectie-beeld toont nog week 44; opnieuw bij week 45. |
| ✅ | Versie 1.0 | Build 27 ingediend op 28 oktober om 21:54 ("Waiting for Review"). Build 26 (20:11) teruggetrokken: onzichtbare "Verder" en sync-fouten, gevonden in de slooptest. Handmatig uitbrengen na goedkeuring. |
| ✅ | Inloggen (Google en Apple) | Google Cloud: iOS-client "Hoot iOS" en inlogscherm "In production". Supabase: iOS-client-id bij Google, Apple aan (nl.hootnews.Hoot), functie `delete_my_account`. |
| ✅ | Privacylabels | E-mailadres, gebruikers-ID, productinteractie: gekoppeld aan je account, alleen voor de werking van de app, geen tracking. |
| ✅ | Review-notities | Bijgewerkt, met een uitnodigingscode voor de beoordelaar. De code staat alleen in App Store Connect › App Review-informatie, nooit in deze repo. "Sign-in required" uit. |
| ⬜ | Header op de productpagina | Nieuw in App Store Connect: één header-afbeelding, 5244 × 2950 of 3840 × 1646 px. Maken in de stijl van de schermafbeeldingen (merkrood, witte krantenletter). Optioneel. |
| ⬜ | Selectie-beeld | Na goedkeuring, vanaf maandag 2 november: nieuw Selectie-beeld voor versie 1.0.1. |

## 1. Account en registratie

|---|---|---|
| 👤 | **Apple Developer Program** | Aanmelden op developer.apple.com/programs, € 99 per jaar. Als particulier of als Baldadig (bedrijf; dan heb je een D-U-N-S-nummer nodig). De naam die je kiest staat in de App Store als "verkoper". |
| 👤 | **Bundle ID registreren** | Certificates, Identifiers & Profiles → Identifiers → `nl.hootnews.Hoot`. Xcode doet dit ook automatisch bij de eerste archive. |
| 👤 | **App aanmaken in App Store Connect** | Mijn apps → + → Nieuwe app: platform iOS, naam **Hoot News**, primaire taal Nederlands, bundle ID `nl.hootnews.Hoot`, SKU `hoot-ios`. |
| 👤 | **Team kiezen in Xcode** | Project Hoot → Signing & Capabilities → Team. |

## 2. De app zelf

|---|---|---|
| ✅ | Bouwt zonder fouten met de iOS 27.1-SDK | Minimaal iOS 26.0. |
| ✅ | iPhone en iPad (universeel) | Zie [APPARATEN.md](APPARATEN.md): iPad, iPhone mini en iPhone Duo. |
| ✅ | App-icoon 1024 × 1024 | Licht, donker en getint (`Assets.xcassets/AppIcon`). |
| ⏳ | Icoon in Icon Composer (gelaagd Liquid Glass) | Mooier op iOS 26/27, niet verplicht. Open `icon-1024.png` in Icon Composer (Xcode → Open Developer Tool), maak de **h** en de **punt** aparte lagen, sla op als `AppIcon.icon`. |
| ✅ | Startscherm in papierkleur | `Info.plist` → `UILaunchScreen`. |
| ✅ | Privacymanifest | `PrivacyInfo.xcprivacy`: geen tracking; UserDefaults met reden CA92.1 en bestandsdatums met reden C617.1 (opruimen van de eigen offline kopieën). Die tweede reden ontbrak tot 29 oktober: builds tot en met 35 hadden hem niet, kijk in de mail van App Store Connect of er een ITMS-91053-melding kwam. |
| ✅ | Versleuteling: vrijgesteld | `ITSAppUsesNonExemptEncryption = NO` (alleen HTTPS). Dan vraagt App Store Connect er niet meer naar. |
| ✅ | Instellingen volgens de Human Interface Guidelines | Geen eigen licht/donker, verwijzing naar de Instellingen-app, wissen alleen na bevestiging. |
| ✅ | Dynamische tekst en donkere modus | Ook bij de grootste tekstformaten bruikbaar (miniaturen wijken, knoppen schuiven onder elkaar). |
| ⏳ | Getest op een echte iPhone | Via Xcode op je eigen toestel, zie `ios/README.md`. |
| ⏳ | Getest op iPhone Duo | De simulator heeft iOS 27.1 nodig: Xcode → Settings → Components → iOS 27.1 Simulator (± 8 GB). |
| ⏳ | **Inloggen (fase 2)** | Nog niet in deze versie. Komt inloggen met Google erbij, dan is **Inloggen met Apple** verplicht (richtlijn 4.8), en moeten de privacylabels worden bijgewerkt (e-mail, gebruikers-ID). |

## 3. Productpagina (teksten staan klaar in `metadata/nl-NL/`)

|---|---|---|---|
| ✅ | Naam: **Hoot News** | `name.txt` | 9 / 30 |
| ✅ | Ondertitel: *Rustig nieuws, met een einde* | `subtitle.txt` | 28 / 30 |
| ✅ | Promotietekst | `promotional_text.txt` | 150 / 170 |
| ✅ | Beschrijving | `description.txt` | 857 / 4.000 |
| ✅ | Trefwoorden | `keywords.txt` | 97 / 100 (geen merknamen van bronnen: richtlijn 2.3.7) |
| ✅ | Nieuw in deze versie | `release_notes.txt` | |
| 🟡 | Naam beschikbaar? | | "Hoot" alleen is waarschijnlijk bezet; App Store Connect zegt het bij het aanmaken. Alternatief: *Hoot: rustig nieuws*. |
| ✅ | Categorie: Nieuws (tweede: Tijdschriften en kranten) | `primary_category.txt` | |
| ✅ | Copyright: 2026 Alex Vrees | `copyright.txt` | |
| ✅ | Privacybeleid-URL: https://gethoot.app/#/privacy | `privacy_url.txt` | Sinds 31-10 op gethoot.app (alias van dezelfde Netlify-site). In App Store Connect bij 1.0.1 bijwerken. |
| ✅ | Privacybeleid dekt de app | | Alinea "De app voor iPhone en iPad" en contactadres toegevoegd (web 1.32.4). |
| ✅ | **Support-URL met contactgegevens** | `support_url.txt` | `https://gethoot.app/#/over`: pagina "Over Hoot" met contact en veelgestelde vragen (web 1.32.4), ook voor nieuwe bezoekers direct leesbaar. |
| ✅ | **Contactadres info@gethoot.app** | | 31-10: gethoot.app in Google Workspace (Baldadig) als secundair domein, MX/SPF/DKIM/DMARC bij TransIP; info@gethoot.app is een alias op alex@baldadig.nl. Overal als contact- en supportadres gebruiken (App Store Connect: contactgegevens bij App Review en de Support-URL). |
| ✅ | Marketing-URL: https://gethoot.app | `marketing_url.txt` | Wordt later de landingspagina (plan in Hoot-design/gethoot). |

## 4. Beelden

|---|---|---|
| ✅ | iPhone 6,9" (1320 × 2868), verplicht | `screenshots/iphone-6.9/` (kaal) en `screenshots/marketing/iphone-6.9/` (met kop, aanbevolen) |
| ✅ | iPad 13" (2064 × 2752), verplicht omdat de app op iPad draait | `screenshots/ipad-13/` en `screenshots/marketing/ipad-13/` |
| 🟡 | **Inhoud van de schermafbeeldingen** | Het zijn echte edities. Maak ze vlak voor het indienen opnieuw op een rustig nieuwsmoment (zonder gevoelige koppen), met hetzelfde script; zie [README.md](README.md). |
| ⏳ | App-preview (video, 15–30 s) | Optioneel. |
| ✅ | Promotiebeelden voor sociale media | `promotie/` |

## 5. App Privacy (privacylabels)

|---|---|---|
| 🟡 | Antwoorden | Zie [APP-PRIVACY.md](APP-PRIVACY.md): **Geen gegevens verzameld** (zolang er geen inloggen is). |

## 6. Leeftijdsclassificatie

|---|---|---|
| 🟡 | Vragenlijst | Zie [LEEFTIJD.md](LEEFTIJD.md). Eén keuze is aan jou: of de Safari-weergave telt als "onbeperkte webtoegang". |

## 7. Prijs en beschikbaarheid

|---|---|---|
| 🟡 | Gratis | Voorstel. |
| 🟡 | Landen | Voorstel: Nederland en België (de bronnen en teksten zijn Nederlandstalig). Kan later breder. |

## 8. App Review

|---|---|---|
| ✅ | Notities voor de beoordelaar (Engels) | [REVIEW-NOTES.md](REVIEW-NOTES.md): wat de app doet, waar de inhoud vandaan komt, geen inloggen nodig. |
| 🟡 | **Inhoud van derden (richtlijn 5.2)** | Hoot toont koppen, intro's en beelden uit openbare feeds en linkt naar de uitgever. Apple kan vragen of je dat mag. De notities leggen het uit; houd er rekening mee dat Apple om toestemming van uitgevers kan vragen. |
| 🟡 | **Minimale functionaliteit (richtlijn 4.2)** | Hoot is native (geen website in een schil) met eigen functies (editie, vergelijken, Selectie, bewaren). |
| 👤 | Contactgegevens voor de beoordelaar | Naam, telefoon en e-mail in App Store Connect. |

## 9. Uploaden en indienen

1. 👤 Xcode: kies **Any iOS Device (arm64)** → Product → **Archive**.
2. 👤 Organizer → **Distribute App** → App Store Connect → Upload.
3. 👤 App Store Connect → TestFlight: test eerst zelf (interne tester = jij).
4. 👤 Vul de productpagina in (teksten uit `metadata/`, beelden uit `screenshots/`).
5. 👤 App Privacy, Leeftijd, Prijs: zie de documenten hierboven.
6. 👤 Kies de build → **Ter beoordeling indienen**. Beoordeling duurt meestal 1–2 dagen.

## 1.0.1 (build 36) indienen — stappen (bijgewerkt 31-10-2026)

1. Alles samengevoegd en gekeurd op main (designronde, signatuurronde, KISS-teksten, onboarding, De Redacteur, taalregel), web en iOS gelijk.
2. Alex pusht main; Netlify zet hootnews.nl en gethoot.app live (zelfde site; gethoot.app heeft een eigen Let's Encrypt-certificaat).
3. Controle live: https://gethoot.app/#/over en https://gethoot.app/#/privacy laden met geldig certificaat; contactadres op beide pagina's is info@gethoot.app; het privacybeleid zegt dat de app de Editie op het toestel samenstelt.
4. Build 36 archiveren en uploaden naar App Store Connect (versie 1.0.1).
5. In App Store Connect bij versie 1.0.1 invullen of bijwerken:
   - Support-URL: https://gethoot.app/#/over
   - Marketing-URL: https://gethoot.app
   - Privacybeleid-URL (App-informatie): https://gethoot.app/#/privacy
   - Contactgegevens App Review: info@gethoot.app
   - Naam: Hoot: je nieuws op één plek · ondertitel, beschrijving, trefwoorden en releasenotes uit `metadata/nl-NL/` (geen kloktijden)
   - Nieuwe schermafbeeldingen (nieuw Welkom, Editie met waarom-regels, Stroom Tijdlijn/Krant, Selectie)
6. Versie 1.0 (build 27) uit review halen, 1.0.1 (build 36) koppelen en indienen. De verklaringen en de laatste klik zijn van Alex.
7. Daarna stilstand tot Apple accepteert.

## 1.1.0 (build 46) — klaargezet in App Store Connect (4 november 2026), NIET ingediend

- Versie 1.1.0 aangemaakt, build 46 gekoppeld; teksten uit `metadata/nl-NL/` (naam *Hoot: Nieuws met een einde.*, ondertitel *Jouw nieuws, rustig bij elkaar*).
- Schermafbeeldingen: opnamen met `tools/capture-110.sh` (simulators "Hoot Pro Max" en "iPad Pro 13-inch (M5)"), kop en toestel met `tools/store.mjs`. iPhone 6,9" in `screenshots/iphone-6.9/` (kaal) en `screenshots/marketing/iphone-6.9/`; de 6,3"-slot van App Store Connect (1206 × 2622) in `screenshots/marketing/iphone-6.3/`; iPad 13" in `screenshots/ipad-13/` en `screenshots/marketing/ipad-13/`. Zes beelden: Editie, Vergelijken, Stroom, Selectie, lezer, Nacht.
- Releasenotes: zie `../../RELEASENOTES-BUILD-46.md` (geen emoji: App Store Connect weigert die).
- Nog te doen door Alex: zie de overdracht in het gesprek (indienen, uitnodigingscode in de reviewnotities, Selectie-week bij vers beeld).
