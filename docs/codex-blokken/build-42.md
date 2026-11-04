# Build 42 · intern naar Apple geüpload

3 november 2026 · **1.0.1 (42)** · uitsluitend interne TestFlight. Branch `build-42-integratie`; archief gebouwd op `133ace4`. Main, website en bestaande App Review-inzending ongewijzigd. Geen push of tag.

## Uitkomst

Upload via de bestaande Xcode-accountsessie met automatische ondertekening. Gestart 14:29:36, geslaagd **14:30:34 Europe/Amsterdam**, exitcode **0**. Xcode: `Upload succeeded.`, `Uploaded Hoot`, `EXPORT SUCCEEDED`. Apple meldt **Uploaded package is processing**. Dat is ontvangst en verwerking, nog geen geverifieerde beschikbaarheid in TestFlight. De daaropvolgende UI-statuscontrole viel uit met de bekende -3812; geen afgeronde verwerking geclaimd.

`testFlightInternalTestingOnly = true`, `destination = upload`, automatisch versiebeheer uit. De door Xcode teruggeschreven lokale exportopties bevestigen internal-only eveneens. Geen externe Vrienden-groep gekoppeld, geen App Review-indiening, geen release. De ververste TestFlight-lijst toonde vooraf 41 als hoogste nummer voor 1.0.1, dus 42 was vrij. Alleen het buildnummer verhoogd.

## Wat erin zit

A/B/C geïntegreerd: webupdates met behoud van lokale gegevens, Bluesky in de web-Stroom, systeemfullscreen. Korte rubriekcrossfade, Nacht Zacht papier en Papier-lezer, vier appiconen met rood als standaard, goedgekeurde h.-pull-to-refresh, bubbeluitleg en de nieuwe bronnen-volgen-onboarding met aparte Selectie-keuze. De webcode is mee getest maar niet gepubliceerd. De oude onboarding blijft achter terugvalschakelaars bestaan. Gedetailleerde commits, conflictoplossingen en schermbewijzen: build-42-integratie.md.

## Controles en open testwerk

1020 webtests geslaagd, één bestaande TODO, nul fouten. Definitieve native run: 122 uitgevoerd, één opt-in skip, nul fouten. Die systeemicoonproef is daarna handmatig aangevuld: alle vier iconen echt gekozen met iOS-bevestiging, rood hersteld. Webbuild, core-generatie, Release-simulatorbuild en harde acceptatie groen (uniekheid 0,32 ≤ 0,38). Golden en beschermde bestanden ongewijzigd. Release-archive en distributie-export geslaagd.

Echte Release-iPhoneproeven bewijzen volledige onboarding, bronrangschikking, zoekuitleg, behouden keuzes na annuleren en opslaan met controle in Instellingen, thema-/icoonkeuzes. iPad, XXXL/AX5, VoiceOver, volledige video/pull/crossfade-matrix en de oude→nieuwe webworker op deze eindbundel zijn niet volledig bediend. Alex heeft expliciet gezegd: **‘Je mag van mij de build uploaden. Ik ga zelf testen.’** Daarom de interne upload uitgevoerd met behoud van die open testpunten; ze zijn niet alsnog als geslaagd afgevinkt. Praktische checklist: build-42-wat-te-testen.md.

## Pakket

Bundle-id `nl.hootnews.Hoot`, marketingversie 1.0.1, build 42; `ITSAppUsesNonExemptEncryption = false`. Host `https://hootnews.nl`; geen localhost, import.json, lokale betavlag, debug-hostschakelaar of tijdelijke diagnosecode. Privacy-manifest en drie alternatieve iconen aanwezig, naast het standaardicoon. Ondertekening van archief én geëxporteerde IPA geverifieerd.

Lokaal archief: `build/ios-build-42/Hoot.xcarchive`. Lokaal gecontroleerde IPA: `build/ios-build-42/export/Hoot.ipa` (3,836,201 bytes).

SHA-256 lokale export: `e25fc3fc71da381b9b7cafe416a76f893715dfb5d83d81256a59bfe878b0207a`.

De upload gebruikt hetzelfde gecontroleerde archief en dezelfde interne distributie-instellingen. Xcode heeft de apart voor upload verpakte IPA niet in de uploadmap bewaard; de bovenstaande hash geldt exact voor de bewaarde lokale export, niet als ongeverifieerde bytehash van Apples ontvangen object. Grote buildartefacten blijven lokaal en staan buiten Git.

## Voor Alex

Wacht tot Apple de verwerking afrondt. Controleer daarna TestFlight → interne groep **Team Hoot**. Als de build niet automatisch aan de groep verschijnt, koppel 1.0.1 (42) daar. Alleen als Apple nog een exportcompliancevraag toont, bevestig de reeds in het pakket vastgelegde informatie. Groepen, Wat te testen en compliance zijn niet via de UI gewijzigd. De testtekst en korte releasenotes staan lokaal klaar. Test de open punten uit de checklist op je eigen toestel; Claude reviewt de branch woensdag.

Bewijs: build-42-integratie/upload-resultaat.json, upload-build-42.log, archive-pakketcontrole.json, ipa-pakketcontrole.json, interne-uploadopties.json en apple-hoogste-build-41.png.
