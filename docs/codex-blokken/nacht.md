# Blok 16 · Nacht — overdracht aan Claude

2 november 2026. Branch `nacht-stand`, schoon begonnen vanaf lokale main `0a209da`. Alleen lokaal; niet gepubliceerd. Het goedgekeurde voorstel `oled-voorstel` / `bf9e573` is gevolgd. **Bouw en automatische controles gereed; native profielsynchronisatie en fysieke OLED-keuring blijven expliciete integratie-/acceptatiepunten.**

## Wat werkt

- Web en iOS: **Systeem · Licht · Donker · Nacht**. De bestaande naam Systeem is behouden. Alleen bij Systeem verschijnt **Als het donker is: Donker · Nacht**. Standaard blijft Donker. Onbekende waarden vallen terug op Systeem, onbekende avondvariant op Donker.
- Nacht gebruikt zwart `#000000` als paginagrond. De warme donkere basiskleuren blijven gelijk: surface `#1e1b17`, ink `#f1ece2`, ink-2 `#cbc3b5`, ink-3 `#a39b8d`, accent `#ec7a70`, accent-soft `#3a1e1b`, edge `#766e61`, rule `#34302a`.
- Het oude donkere CSS-tokenblok is bytegelijk aan main, door een test bewaakt. Geen kleurasset gewijzigd. Geen beeldfilter, wijziging van beelddekking of nieuwe animatie toegevoegd.
- In Nacht worden enkele bestaande witte bedieningsdetails warm: web-schakelaarduim, native uitgeschakelde schakelaar, standaardtekst en navigatietitel, Tijdlijn/Krant-tekst en het eigen video-afspeelsymbool. Dit zijn rolcorrecties binnen Nacht, geen wijziging van de donkere basiswaarden. Accountinitialen zijn inkt op accent. De Apple-knop krijgt een zwarte grond met warme tekst.
- Bestaand merkrood bij welkom, opstarten en eindkaart blijft staan, met vast papier. Kleine rode details gebruiken het lichte accent, geen brandRed-tekst op zwart. Deelbeelden zijn niet aangepast.

## Web: opslag, eerste paint en profiel

`hoot:theme` accepteert system/light/dark/night; `hoot:theme-dark` dark/night. Dezelfde waarden staan in `hoot:prefs` als **theme** en **themeDark**, zodat de bestaande profielmotor ze volledig synchroniseert. Geen nieuwe API of databasemigratie. De profielkolom is JSONB en kent geen server-enum voor deze sleutels (`supabase/migrations/20261022_accounts.sql`). Opschoning gebeurt in `normalizePrefs`; de domeinverhuizing valideert beide losse sleutels streng.

Opslagschema 4 neemt oude losse themakeuzes over. Het hoofddocument past het uiteindelijke thema vóór de modules/React toe, inclusief `color-scheme: dark`, zwarte achtergrond vóór CSS en beide theme-color-metatags zonder mediarestrictie. Ook bij kapotte prefs-JSON blijft een geldige losse themakeuze bruikbaar. De hook volgt matchMedia live alleen voor Systeem en verwijdert oude listeners. Bestaande rode browserbalk tijdens een merkmoment behoudt zijn bestaande lifecycle.

CSS: één Nacht-blok na de donkere/paletblokken. De expliciete dark-selectors voor tokens, palet, schakelaar, bronletter en Stroom-lijn zijn gedeeld met night. Blad en Inkt lossen in Nacht eveneens zwart op. StyleGuide heeft een derde gemeten kolom.

## iOS: centrale aanpak en nog te koppelen profiel

`NachtThema.swift` beheert de voorkeuren via gewone strings in AppStorage:

| Profielveld | Lokale sleutel | Geldige waarden |
| --- | --- | --- |
| theme | hoot.weergave | system, light, dark, night |
| themeDark | hoot.weergave.donker | dark, night |

Licht/Donker/Nacht dwingen het juiste schema af; Systeem gebruikt nil en de werkelijke toestelstand. Een custom UIKit-trait is met de SwiftUI-environment verbonden. Hierdoor blijft `Theme.paper` één centrale Color voor bestaande views, inclusief UIKit/WK-kleuren. De window-bridge regelt de UIKit-vensterkleur. Het instellingenblad krijgt dezelfde centrale modifier op zijn eigen presentatie: anders bleef een al geopend blad donker na Nacht → Licht. Die echte klikfout is hersteld en heeft een regressietest op een werkelijk gepresenteerd blad (Nacht → Licht → Nacht). De keuze gebruikt geen eigen overgang. Zie Apple's [custom traits](https://developer.apple.com/documentation/uikit/providing-data-to-the-view-hierarchy-with-custom-traits); de gebruikte bridge is aanwezig in het geïnstalleerde SDK en de black-resolutie is unit-getest.

ReaderHTML krijgt een expliciete Nacht-override. WKWebView is niet opaque; laden/ondergrond en overscroll hebben een passende paper-kleur. De Hoot-balk onder de lezer en de eigen inlogbalk worden zwart in Nacht. Safari krijgt een zwarte balk; de externe uitgeverspagina zelf houdt zijn eigen vormgeving. De startgrond blijft het bestaande merkrood; LaunchMark/LaunchWord zijn niet aangepast.

**HootStore.swift is bewust onaangeraakt. Claude moet vóór profielacceptatie toevoegen:**

1. In `HootStore.Import.Prefs` (rond regel 154): optionele strings `theme` en `themeDark`, hun CodingKeys en `decodeIfPresent`.
2. In `apply(_ p: Import.Prefs?, unite:)` (rond regel 200): als een veld aanwezig is, normaliseren en naar de twee bovenstaande UserDefaults-sleutels schrijven. Ontbrekende velden van oude clients laten de lokale keuze staan. Gebruik gewone `UserDefaults.standard.set(String,forKey:)`, niet de bestaande JSON/Data-savehelper: AppStorage leest hier strings.
3. In `syncedPrefs` (rond regel 228): de gevalideerde lokale waarden exporteren als theme/themeDark.
4. Lokale wijzigingen moeten de bestaande synchronisatie starten. Gebruik de bestaande `syncTick` → `Account.changed()`-route. Bewaar daarvoor een laatst-gezien themapaar: lokale wijziging tikt syncTick op; remote `apply` werkt eerst dat paar bij en schrijft daarna de lokale sleutels. Zo veroorzaakt een remote import geen echo/pushlus via een latere UserDefaults-notificatie. Observeer alleen dit paar, geen willekeurige UserDefaults-wijziging. De huidige picker schrijft lokaal; zonder deze koppeling blijft iOS bewust lokaal werken.
5. Integratietest: web Nacht → iOS; iOS Systeem+Nacht → web; uitloggen/inloggen en twee toestellen; ontbrekende/ongeldige velden en geen echo-loop. Er is in dit pakket geen echt account gebruikt.

Oude webclients behandelen onbekend `night` als de systeemstand; de oude native main heeft nog geen eigen themavoorkeur en volgt het toestel. Een oude client die het hele prefs-object terugschrijft kan nieuwe velden laten verdwijnen. Release daarom de profielkoppeling samen met nieuwe clients; claim geen verliesvrije synchronisatie met alle oude versies.

## Controles en bewijs

- `npm test`: **913 tests, 912 geslaagd, 0 mislukt, 1 bestaande TODO**. Daarna is alleen de Nacht-schakelaarrol aangepast; de token/hooktests zijn opnieuw groen en de productiebuild is opnieuw groen.
- `npm run build`: groen, ook na de laatste CSS-rolcorrectie.
- Native volledige suite na de laatste blad-correctie: **59 tests, 0 fouten** (`/tmp/hoot-night-release-review.log`, resultaat `/tmp/hoot-night-release-review.xcresult`). Alle 53 bestaande tests blijven aanwezig; 4 nieuwe unit-tests en 2 render-matrix-tests. De nieuwe regressietest presenteert werkelijk het instellingenblad en controleert de live wissel Nacht → Licht → Nacht.
- Unit-tests: vier keuzes/ongeldige waarden, automatische avondvariant, lokale opslag, oorspronkelijke light/dark-paper, SwiftUI/UITrait-paper zwart, ReaderHTML-override. Web: migratie, strenge domeinvalidatie, eerste-paint-script, echte hook met listener cleanup, volledige fake profielronde naar tweede webclient, contrast en bytegelijke donkere tokens.
- Ink/zwart **17,84:1**, ink/surface **14,57:1**, ink-3/zwart **7,63:1**. De meetgegevens van het voorstel staan in `nacht/contrast.json`; de tekst/accentdrempels worden in de test opnieuw berekend. Surface/zwart blijft bewust zacht: **1,22:1**. Edge blijft voor betekenisvolle bediening.
- [Beeldblad Licht · Donker · Nacht](nacht/index.html). Web 390×844 px, native 390×844 pt (PNG op 3×), iPad-viewports 744×1133 / 1133×744 pt. De testhost wacht tot de bestaande print-animatie klaar is. De eindkaartmatrix is later aanvullend als zes echte view-renders vastgelegd. De foto-onafhankelijke native renders schakelen beelden alleen in de test uit en herstellen die voorkeur daarna; de echte native/web-bediening toont daarnaast ongewijzigde foto's.
- De zes native renderstanden: Licht, Donker, Nacht, Systeem met toestel licht, Systeem+toestel donker+Donker, Systeem+toestel donker+Nacht. Echte views: Editie, Stroom, Selectie, Instellingen, afzonderlijke keuze, onboarding, laden, account en lokale ReaderHTML. Afzonderlijk XXXL en AX5 voor de keuze; een tweede rendertest legt de echte eindkaart in dezelfde zes standen vast. Geen claim dat een render een kliktest is. SceneStorage-waarschuwingen komen van de losse UIHostingController-testhost; werkelijke app-bediening staat apart.
- Web: echte bediening van alle vier opties, avondvariant, herladen/persistentie, hoofdschermen, lege Bewaard, instellingen/popup, heropende onboarding en eindkaart; Blad/Inkt zwart gemeten. Automatisch-donker-beelden gebruiken een **testserver met nagebootste matchMedia-uitkomst**, niet een gewijzigde Mac-systeemstand. API-data is een publieke momentopname; dit is geen beoordeling of tuning van De Redacteur.
- Native werkelijk bediend: alle vier menuopties, geselecteerde toestand, tweede avondkeuze, herstart met Systeem+Nacht en donker toestel. XXXL-menu met alle opties zichtbaar; AX5 daadwerkelijk ingesteld/vastgelegd, maar de lange volledige instellingenpagina vraagt scrollen. De afzonderlijke AX5-keuze is daarnaast gerenderd. Native keuzebeelden met `eerste-ronde` tonen de eerste bediening vóór de laatste correcties. `native-instellingen-*-definitief.jpg` bewijst de herhaalde wissel binnen hetzelfde geopende blad; de PNG-matrix toont de eindkleuren. Verminder beweging stond aan tijdens de laatste ronde (simulatorvoorkeur gecontroleerd). Geen nieuwe thema-animatie.
- Werkelijke iPad-simulator: Editie en Instellingen in staande en liggende stand in Nacht, inclusief systeemzijbalk. Deze Device Hub-beelden heten `native-ipad-*`; de andere ipad-PNG's zijn viewport-renders op de iPhone-testhost, geen echte iPad-interactie.

### Nog geen volledige klikacceptatie

De web-main heeft geen eigen artikellezer of uitgevers-inlogpaneel: hij opent artikelen bij de uitgever. Daarom zijn daarvan geen fictieve webschermen gebouwd. Native lokale ReaderHTML is in alle zes standen gerenderd; de volledige netwerklezer met uitgeverslogin/het betaalpaneel en eindkaart is niet in elke stand interactief doorlopen. Het nieuwere inlogpaneel van blok 13 staat niet op deze main. Een lokale bestandsfixture voor de volledige lezer bleek in de losse testhost geen betrouwbaar geladen WK-beeld te geven; die poging en beelden zijn niet als bewijs opgenomen. Een frame-voor-frame opname van een koude start, echte Split View-resizing, VoiceOver-uitspraak en fysieke OLED-keuring blijven nodig. Device Hub is na de herstart door Alex ook voor de netwerklezer gebruikt; daarvoor waren twee timeouts opgetreden. De hervatte Nacht-controle is met echte beelden vastgelegd; geen login verricht. Er is geen -3811/-3812-code waargenomen.

## Witscan: bevindingen en uitzonderingen

Run vanaf de repo:

```
node scripts/night-white-scan.mjs docs/codex-blokken/nacht/witscan-nacht.json docs/codex-blokken/nacht/witscan-resultaat.json
```

De scan leest elke pixel, vergelijkt relatieve luminantie met ink `#f1ece2` (+0,005 afrondingstolerantie) en geeft aantallen, boundingbox en 32px-vindplaatsen. Het manifest bevat expliciete foto-/logo-/merkvlakmaskers voor web en een merkvlakmasker voor het native rode welkom. Onbekende witte plekken worden nooit automatisch gemaskeerd.

- Native instellingen (ook iPad-viewports), keuze, XXXL/AX5-keuze, laden, account en ReaderHTML: **0 pixels boven de grens**. De eerdere witte native segmenttekst is na de scan gecorrigeerd.
- Native Editie/Stroom/Selectie houden kleine witte uitgeverslogo's. Ze staan bewust ongemaskeerd in het resultaat, zodat de vindplaatsen controleerbaar blijven; de bestaande Donker-behandeling is behouden. Bijvoorbeeld Editie: RTL-logo links rond (51,1584) en NOS-logo rond (51,2304), bij 3×-raster. Geen grote witte kaartgrond.
- Webscreenshots zijn JPEG 4:2:0 van de browser. De resterende heldere randpixels volgen de letters: compressie/ringing kan een warmer CSS-glyph plaatselijk lichter maken. De daadwerkelijke DOM-kleur is `rgb(241,236,226)`; er is geen nieuwe witte tekstkleur of witte paginagrond. De ruwe aantallen blijven staan, geen valse nulclaim.
- Systeemlagen (statusbalk, contextmenu, toetsenbord, native zijbalk/tabbalk, alerts) volgen donker en houden systeemglyphs/materialen. Het grijs van Liquid Glass is geen witte paginagrond. Een externe uitgevers-/inlogpagina kan wit zijn: Hoot past daar geen donkerfilter of herstyling op toe. De simulatoren zijn na afloop teruggezet op licht, Large en Verminder beweging uit. De echte Device Hub-opnamen omvatten ook de lichte Mac-app eromheen; die vallen buiten de app-rastermeting.
- De harde-kleurinventaris staat in `nacht/harde-kleuren.txt`. Lichte logovlakken blijven; conditionele `.white` buiten Nacht blijft; Google/Apple hebben hun eigen knopbehandeling. Gedeelde afbeeldingen en merkvlakken blijven buiten de gewone Nacht-palette.

## Samenvoegen en fysieke keuring

Beschermde Redacteur-bestanden, HootStore en landing zijn niet gewijzigd. Geen API-, abonnement-, selectie- of sorteerlogica aangepast. Kleine benodigde extra raakvlakken: App-context, prefs/sync (webprofiel), lokale lezer, en één videosymbool voor de actieve witscan.

Overlap voor Claude:

- `lezer-inlog-paneel`: **ArticleReaderView.swift** en mogelijk AccountView/SettingsView. Behoud zijn paneellogica/dismissal én deze Nacht-background/ReaderHTML-aanpassingen; niet blind één kant kiezen.
- `editie-nummering`: vooral **HootApp.swift / Components.swift** en eventueel App-context. Nummering/voice-over uit dat pakket behouden. Dit pakket wijzigt EditionView niet.
- `stroom-selectie-afwerking`: **Components.swift, SettingsView.swift, src/styles.css** en mogelijk HootApp. Neem uitsluitend Night-tokens/selectors mee; de hele oude stylesheet niet overnemen. Nieuwe thema-keuze als eigen sectie behouden.

Alex: beoordeel op een echte OLED bij lage helderheid de kaartgrenzen, rode details en zon, de lokale lezer (ook doorschuiven/overscroll), bronlogo's, systeemkeuzemenu en het opstartmoment. Controleer ook een foto met veel wit: de foto blijft bewust ongewijzigd. Dit pakket doet geen medische belofte over slaap.

Patch: `docs/codex-blokken/nacht.patch.gz` wordt na de lokale code-/bewijscommit als aparte levering gemaakt, zonder zichzelf in de patch op te nemen. Apply-check tegen actuele lokale main en eindcommit staan in de afsluitende melding. Niet pushen, taggen, mergen, deployen of uploaden.
