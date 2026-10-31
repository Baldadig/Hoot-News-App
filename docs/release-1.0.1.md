# Release-overdracht — Hoot 1.0.1 build 37

Actuele opdracht van Alex: **“Claude controleert en zet live. jij maakt alleen.”** De verhuizing naar **gethoot.app/lees** is expliciet bevestigd. Codex heeft de afronding lokaal gemaakt; geen verdere merge naar main, push, tag, deploy, domeinwijziging, auth-wijziging of upload naar Apple uitgevoerd. Deze overdracht vervangt de oudere ronde3-overdracht voor de volledige release.

## Meteen openen

- Repository: `/Users/alexvrees/Baldadig Dropbox/Alex Vrees/Alex/Claude/Hoot-News-App`, branch `release-1.0.1`.
- iOS IPA: `Hoot-design/releases/1.0.1-build37-final/export/Hoot.ipa`.
- Actueel archief: `Hoot-design/releases/1.0.1-build37-final/Hoot-verified.xcarchive`. De eerdere `Hoot.xcarchive` in dezelfde map en de oude map `1.0.1-build37` zijn tussentijdse archieven; gebruik **Hoot-verified**.
- IPA gecontroleerd: bundle `nl.hootnews.Hoot`, versie **1.0.1**, build **37**, `ITSAppUsesNonExemptEncryption=false`. SHA256 staat naast het archief. Export is lokaal en geslaagd; **niet geüpload**.
- `domein-plan.md` geeft de route-, opslag-, auth- en omschakelstappen inclusief terugval.

## Wat erin zit

A1 (gemeten beeldranden, staande hoofdbeelden) en A3 (deelkaarten web/iOS) zitten al in e8eff1a en 98b9d92. Taalregel en bestaand voorpagina-werk zijn lokaal geïntegreerd; de releasebranch bevatte daarna al commit 61a2943 (‘v7’). De laatste afronding bevat de perslijn met gedeelde testgevallen en de 400/480/200-ms-timing, opslaan na afloop, reduced motion, juiste vakbrontaal, rustige voorpagina, gedeelde dagdeel-JSON en de wacht-/lege/leesgrens-consistentie. main is niet opnieuw samengevoegd.

Voorpagina: zware koppen/intro's en sport uitgesloten, hooguit één grote Wereld-plek, open-beeldwhitelist leeg. Vul aan uit verhalen én losse actuele publicaties in dezelfde opgeslagen feedpool. Een geldig antwoord heeft exact drie echte koppen; bij onvoldoende veilige inhoud 503 en de bestaande voorbeeldvoorpagina, geen verzonnen koppen. De fixture-uitkomst staat in `gethoot/land-codex/voorpagina-fixture-result.json`. De classificatie zelf is nog de bestaande classifier: het categorie-plan hieronder benoemt de resterende fouten.

Domein lokaal gebouwd: gecombineerde rootlanding en app onder /lees/, eigen worker-scope, beëindiging oude root-worker, oude API op hootnews.nl blijft bestaan, oude HTML brengt anonieme instellingen en Bewaard mee. Accounts loggen opnieuw in; geen inlogtokens of accountgegevens tussen origins kopiëren. Voorkeuren van een bestaande nieuwe origin winnen. Deze migratie is extra scope die Alex apart bevestigde.

## Controle uitgevoerd

- Volledige Node-run: **834 tests, 833 geslaagd, 0 fouten, 1 bestaande TODO**. Na de laatste voorpagina- en migratie-aanpassingen: **30 gerichte tests, alle geslaagd** (waaronder de echte middagfixture).
- iOS laatste run: **50 tests, 0 fouten**. Release-archief en App Store Connect-export geslaagd.
- Acceptatie: **alle harde drempels gehaald**; uniekheid alleen algoritme **0,39**, grens **0,42**. Zachte doelen verborgen interesses (12/14) en rekentijd nog niet gehaald; niet verdoezeld of versoepeld.
- `build:core` en golden opnieuw gemaakt: geen onverwachte diff in de gegenereerde kern of golden.
- Webbuild geslaagd. CSP-inlinehash en aanwezigheid landing- en appheaders gecontroleerd.
- Landing: **36 gevallen**, 320/360/390/430/768/1100/1260/1440/1920, licht/donker × normale/verminderde beweging. **Geen overflow, geen consolefouten, CLS 0**, live nagebootste koppen op alle gevallen. Zonoverlap op mobiel ongeveer 1/3; horizon op 0,7 toestelbreedte vanaf de bovenrand voor hero/Stroom/Selectie, desktop hero niet verkleind. Bewijs: `gethoot/land-codex/metrics.json` + PNG's.
- M5: webframes op 50 ms, echte iOS-video's en 50-ms-frames, normale en verminderde beweging, naast-elkaar-GIFs; `signatuur/ronde3-screens/m5/README.md` beschrijft de meetgrenzen. Webtabwissel speelt niet opnieuw; native heropenen van dezelfde Editie toont de lijn meteen volledig. Een native tabwissel en de iris nog op echt toestel controleren.
- Design-system-PDF opnieuw opgebouwd in Newsreader/papier/rood, 7 pagina's; tekst gecontroleerd op oude termen en beeldverhoudingen, laatste pagina gerenderd en bekeken. Sociale Editie-stories opnieuw gegenereerd en bekeken: ‘dan ben je bij’ blijft bijeen.

Logs en reproduceerbare QA-scripts staan in `releases/1.0.1-build37-final/controle/`. De scripts gebruiken lokaal Playwright en Chrome uit de beschreven ontwikkelomgeving.

## Bestanden buiten de repo

- `Hoot-design/gethoot/site-src/v4`: live vlag, kopruimte zonder layoutverschuivingen, zon/horizon en /lees/-knoppen; gebouwd naar `gethoot/site`. De gitversie staat in de repo onder `landing/`.
- Merkmap `079 - Hoot/06 Documenten/06 Design system/`: bijgewerkt Markdown en PDF, gespiegeld in repo docs/design-system/README.md.
- `Hoot-design/bron/social-kit/Bron/build.mjs`: regelval, actuele domeinnaam en juiste uitvoermap; PNG/HTML in `079 - Hoot/05 Toepassingen/Social/`. Instagramverwijzing in de leesmij.
- `Hoot-design/algoritme/categorie-plan.md` plus JSON/CSV met **150 unieke koppen**, eerste afzonderlijke agentannotatie. Voorlopige overeenkomst **76%**; gestratificeerde ontwikkelset, geen representatief of blind gevalideerd cijfer. Gemarkeerde twijfelgevallen door een tweede beoordelaar laten nakijken. **Geen classifierwijziging** voor taak 7 uitgevoerd.

## Nog door Claude vóór livegang

1. Review de lokale releasecommit en de gecombineerde diff vanaf origin/main. Kies de webversie/tag; package.json blijft 1.56.0. Controleer dat build 37 nog vrij is in App Store Connect; zo niet, ophogen en opnieuw archiveren.
2. Controleer migratie in Netlify Preview én met werkelijke origins: oud anoniem, oud account, nieuwe bestaande opslag, volle opslag, PWA/offline, API GET/POST zonder redirect. Eén Netlify-project behouden: hootnewsapp met functies/Blobs/secrets. Domeintoewijzing gethoot.app zit nu nog op het aparte landingsproject. Volg domein-plan.md; niet blind DNS of een algemene aliasredirect omschakelen.
3. Supabase/Google-allowlist en uitnodiging testen. Oude auth-URL's behouden tijdens de overgang. Metadata-URL's zijn voorbereid maar niet in App Store Connect opgeslagen.
4. Echte iPhone/iPad-keuring, native tabwissel/iris, VoiceOver en definitieve App Store-schermen nalopen. Bestaande marketingbeelden niet automatisch overschrijven met de technische M5-opnamen met actueel nieuws. Nieuwe rustige marketingopnamen zijn geen onderdeel van de bijgeleverde IPA.
5. Pas na werkende gethoot.app/api de IPA verspreiden: Release gebruikt die host. Daarna zelf push/merge/deploy/upload; alles daarvoor staat lokaal klaar. A2, M4, P9/P10 blijven afgewezen/geparkeerd; ‘Omdat je X volgt’ is niet opnieuw ontworpen.
