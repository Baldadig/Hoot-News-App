# Blok 9 · Onderzoek Bluesky en afbeeldingen

Branch `stroom-onderzoek`, basis `fae9926`, reproductiescript `8683ca1`. Geen productiecode gewijzigd. Claude bouwt eventuele fixes. Meting van 1 november 2026, 83 publieke brondelen, 3.197 unieke items. Geen persoonlijke accounts gelezen, geen login, geen betaalde artikelen opgehaald.

## 1. Bluesky ontbreekt

**De 36-uursvlaggen zijn hier niet de oorzaak.** `netlify/lib/build.mjs:58` en `:59` laten kind=post expliciet in zowel Stroomvenster als Redacteurpool toe. `shared/stroom.mjs:10` sluit alleen editionOnly uit. Synthetische post doorstaat die predicate; de exacte resultaten staan in stroom/meting.json.

De huidige servercatalogus heeft `BLUESKY_AUTHORS = []` (`netlify/lib/sources.mjs:122`). Daarom bevat de publieke feed nul posts. Dat betekent niet dat eigen Bluesky-accounts niet werken: ze worden op de clients opgehaald, buiten de publieke feed. De server bewaart RSS-bronnen in stream-v1; eigen posts worden client-side opnieuw geladen en niet via die RSS-opslag teruggehaald.

**Web:** `src/hooks/useSocialSources.js:53` haalt eigen accounts op met fetchAuthorItems; `shared/bluesky.mjs:85` haalt eigen posts van 36 uur op, geen replies/reposts, maximaal acht pagina's. `src/lib/bluesky.js:30` zet topics=[] op deze posts. App.jsx:173 combineert ze met de feed. `src/lib/sourcesel.js:27` laat posts alleen door als hun bron expliciet in prefs.bskyInStream staat; die lijst is standaard leeg (`src/lib/prefs.js:22`). De keuze staat in de Bluesky-bestemming (`src/views/Bluesky.jsx:44`). Een account volgen is dus op web niet hetzelfde als het aan de Stroom toevoegen.

Bovendien vallen posts met lege topics vaak weg bij een inhoudelijke rubriekfilter (`src/views/Stream.jsx:73`), en bij soort=artikelen altijd (`:75`). Controleer eerst Alles, geen bron-/soortfilter en de per-account Stroomkeuze. Dit is een aantoonbare route om de ervaren afwezigheid te verklaren; geen bewijs over de instellingen van Alex' echte account.

**iOS:** eigen posts worden wel geladen in `HootStore.swift:425` en staan in de eigen Bluesky-lijst (`:409`). Maar rebuildStream (`:516–518`) accepteert uitsluitend kind=article uit itemsById. ownPosts wordt daar niet toegevoegd. De webkeuze bskyInStream staat bovendien niet in het native voorkeurencontract (`:168`/`:230`). Native Stroom kan dus geen Bluesky-post tonen, ongeacht de tabs of editionOnly-vlag. Dit gedrag is ook in de huidige codecommentaren als aparte bestemming beschreven; noem het geen bewezen nieuwe regressie zonder productbesluit.

**Voorstel voor Claude:** behoud de aparte bestemming en maak expliciet per account ‘Ook in de Stroom’ gelijk op web en iOS. Voeg de bestaande webvoorkeur toe aan het native synccontract; combineer uitsluitend ingestemde eigen posts bij het opbouwen van de Stroom, dedupliceer en pas mute/36 uur toe. Laat de Editie-invoer en forEdition onveranderd. Begin met Alles; forceer posts niet zonder onderwerpclassificatie in elke rubriek.

Omvang: middel, native voorkeuren + Account-sync + Stroomopbouw + instelknop, met gedeelde acceptatiegevallen; geen nieuwe API nodig. Risico: sync mag de webvoorkeur niet onbedoeld wissen; dubbele posts, uitschakelen en verwijderen moeten direct doorwerken. Test het verschil volgen versus Ook in de Stroom en de onafhankelijke Editie-uitkomst.

## 2. Ontbrekende afbeeldingen

Van de 2.682 Stroom-items hebben **80 geen image (2,98%)**. De 515 editionOnly-items zijn niet meegerekend. Bij aanwezige beelden: 0 URL-/pixelvalidatieafwijzingen in deze clientuitvoer, 259 geschikt voor de Netlify-beeld-CDN, 2.343 direct geladen. Vijf alleen klein beschikbare beelden worden bewust niet groot getoond: vier Economist, één ander item. Een kleine thumbnail kan daarbij wel zichtbaar blijven.

| Bron | Zonder beeld / totaal Stroom |
|---|---:|
| Bloomberg | 31 / 31 |
| De Tijd | 15 / 15 |
| Leeuwarder Courant | 12 / 60 |
| Tweakers | 6 / 17 |
| Scientific American | 5 / 5 |
| Al Jazeera | 3 / 60 |
| FD | 2 / 19 |

De overige zes ontbrekende beelden zijn verspreid over zes bronnen. Volledige telling per bron in stroom/meting.json.

**Whitelist:** CDN_HOSTS is een optimalisatielijst, geen weergaveverbod. `src/lib/img.js:115` valt voor onbekende hosts terug op de oorspronkelijke URL; iOS ImageURL.swift:47 doet hetzelfde. Daardoor zijn er **nul door de CDN-whitelist geweigerde beelden** in deze meting. De open-licentie-whitelist van de landingsvoorpagina is een andere regel en hoort niet op alle Stroom-beelden toegepast te worden.

**Pijplijn:** rss.mjs:89 weigert niet-http(s), tracking/pixelbeelden; :147 kiest media/enclosure/HTMLbeeld. toClient in build.mjs:366 valideert opnieuw. Zonder ruwe RSS kun je uit ontbrekend image niet afleiden of een beeld ooit aanwezig was. Daarom zijn de drie belangrijkste volledig beeldloze feeds opnieuw read-only via de bestaande RSS-loader opgehaald: Bloomberg 19 items/0 beelden, De Tijd 10/0, Scientific American 50/0. Alle drie laden met succes. Details in stroom/rss-steekproef.json. Dit is een latere steekproef, niet exact dezelfde opgeslagen publicaties.

Deze drie bronnen staan paid=true en niet in GAPS. `build.mjs:246` sluit betaalde bronnen uit van het ophalen van ontbrekende OG-beelden; de bskyImages-route geldt alleen bij die expliciete vlag. Zo blijven 51 van de 80 beeldgaten verklaarbaar zonder een clientbug: RSS levert geen beeld en de aanvullingsroute geldt hier niet. Voor LC/Tweakers en de overige gedeeltelijke gaten is de precieze oorzaak per artikel nog niet met upstream-bewijs vastgesteld.

**Client:** web Img.jsx:10 probeert bij een CDN-fout het origineel en verbergt het beeldvak als ook dat faalt. iOS Components.swift:234 toont bij een AsyncImage-fout een stil placeholdervlak en heeft geen equivalent origineel-fallback. Beide kunnen dus ondanks een geldige feed-URL een beeld niet tonen. Daarnaast kunnen afbeeldingen uit/alleen hoofdbeeld en fitsLarge bewust beeld uitsluiten. **HTTP-laadfouten zijn niet geteld:** nul ongeldige URL's bewijst geen nul 403/404/timeout. Er is geen beveiliging of whitelist verruimd.

**Voorstel voor Claude:** begin met onderscheidbare interne meetredenen (geen RSSbeeld, validatie, aanvulling niet toegestaan, budget niet bereikt, CDNfout, origineelfout), zonder artikelinhoud of accountdata te loggen. Voeg vervolgens voor native dezelfde beperkte origineel-fallback toe als web. Los per bron alleen aantoonbaar beschikbare publieke RSS-/linkkaartbeelden op; betaalde pagina's niet gaan scrapen en geen willekeurige beeldbankfoto aan een kop koppelen.

Omvang: klein voor logging/fallback, middel voor brongewijze aanvulling. Raak de gedeelde Editie-beeldmeting en zijn budget niet ongemerkt: een bredere wachtrij kan de hoofdbeelden verdringen of de verversing vertragen. Test A1, getoonde/verborgen afbeeldingen, thumbnails, netwerkfout en dezelfde Editie vóór/na.

## Reproductie en beperkingen

`node scripts/onderzoek-stroom.mjs docs/codex-blokken/stroom/feed-delen.json.gz` reproduceert de telling exact. Snapshot is openbaar, gecomprimeerd en zonder gebruikersdata. Het script muteert niets. De ontvangen ETags en tijden staan in de snapshot. 35 brondelen verschillen van de aangekondigde startversie; de meting is een verzamelronde, geen atomair consistent feedmoment.

De native article-predicate in de JS-reproductie illustreert de gelezen Swift-regel; er is geen nieuwe native runtime-reproductie van Bluesky uitgevoerd. Geen echte persoonlijke Bluesky-volglijst of volledige upstream-geschiedenis gecontroleerd.

Volledige suite: 892 tests, 891 geslaagd, 0 fouten, 1 bestaande TODO; build geslaagd. Logs `/tmp/hoot-stroom-onderzoek-{tests,build}.log`. Codepatch bevat alleen het reproductiescript vóór deze bewijscommit (`fae9926..8683ca1`); rapport en snapshot zitten in de volgende commit. Geen push, merge of publicatie.
