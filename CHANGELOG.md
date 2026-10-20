# Changelog

Alle noemenswaardige wijzigingen aan Hoot. Houdt [semver](https://semver.org/lang/nl/) aan.

## [1.16.1] — 2026-10-20 — Bluesky: 48 uur terug

- De Bluesky-stroom haalt nu **de afgelopen 48 uur** binnen in plaats van alleen de laatste 40 posts (bij Aaron Rupar was dat maar zo'n vier uur). Hoot bladert daarvoor door de tijdlijn, 100 posts per keer.
- Bluesky-posts tellen niet meer mee voor de limiet van de nieuwsstroom, zodat ze geen nieuws wegdrukken en zelf niet worden afgekapt. Dat geldt ook voor accounts die je zelf toevoegt.

## [1.16.0] — 2026-10-19 — Natuurlijke stem voor voorlezen

- "Lees voor" kan een **natuurlijke Nederlandse stem** gebruiken (Azure AI Speech, neurale stemmen Fenna, Maarten of Colette; kies onder Instellingen → Lezen). De server maakt per editie en stem één MP3 en bewaart die, dus elke editie wordt maar één keer omgezet. Als er een AI-overzicht is, begint het voorlezen daarmee.
- Speelt door als je scherm uitgaat, met titel en knoppen (pauze, 15 seconden terug/vooruit) op je toegangsscherm.
- Zolang de stem niet gekoppeld is, of als het ophalen mislukt, leest Hoot voor met de stem van je toestel, zoals nu.
- Koppelen: `AZURE_SPEECH_KEY` en `AZURE_SPEECH_REGION` op Netlify (stappen in de README). Het gratis prijsplan (0,5 miljoen tekens per maand) is ruim genoeg voor drie edities per dag.

## [1.15.1] — 2026-10-19 — Ontbrekende beelden en intro's aanvullen

- Wat een feed mist, haalt Hoot nu uit de zoekindex van Bing Nieuws en bewaart het: **beelden** bij de NYT (die zet het beeld vaak pas later in de feed) en The Economist (geeft nooit een beeld), en **beelden én intro's** bij de Volkskrant. Gekoppeld op het artikel (URL of artikelnummer), op maat opgevraagd (vierkant voor een thumbnail, 16:9 voor een groot beeld). Lokaal gemeten op de feed van nu, zonder opgebouwde voorraad: NYT 20 van 21 met beeld (was 19), The Economist 8 van 14 (was 0), de Volkskrant 16 van 22 met intro. Op de live-site groeit dat, omdat vondsten bewaard blijven.
- Wat nog ontbreekt zijn vooral artikelen van het laatste uur: die staan nog niet in de zoekindex en vullen zich daarna aan.

## [1.15.0] — 2026-10-19 — Editie met rubrieken

- **Vaste opbouw**: elke editie heeft per rubriek het belangrijkste verhaal van het moment — **Binnenland, Buitenland, VS, Midden-Oosten, Oekraïne, Wetenschap** — plus **één verhaal van buiten je bubbel** (op plek 6, onder het hoofdverhaal). De overige plekken gaan naar wat verder het meeste nieuws is. Voorheen telde alleen het aantal bronnen, waardoor één onderwerp (vaak de VS) de editie kon vullen.
- **Belangrijk van het moment**: aantal bronnen weegt het zwaarst, met voorrang voor je eigen bronnen en een duw voor wat in de laatste uren gebeurde. Een verhaal telt voor de rubriek waar het vooral over gaat (minstens de helft van de publicaties); bij twijfel de specifiekere (Oekraïne en Midden-Oosten vóór VS).
- De rubriek staat als label boven elk verhaal in de editie; bij het bubbelverhaal ook via welk signaal (Google Trends, Bluesky, Wikipedia). De twee andere bubbelverhalen staan nog in het blok onderaan.
- Cadeaugidsen ("Best Gifts for …") tellen niet meer als nieuws.
- De lopende editie wordt na de update één keer opnieuw samengesteld.

## [1.14.0] — 2026-10-19 — Middageditie

- Drie edities per dag: **ochtend** (06:00), **middag** (12:00, nieuw) en **avond** (17:00). Elke editie wordt op dat moment samengesteld en staat daarna vast; het einde van de editie noemt de volgende. Voorlezen, welkomscherm, Instellingen en README zeggen nu "drie keer per dag". Het AI-overzicht (als de sleutel er is) wordt ook voor de middageditie geschreven: ongeveer twee tot drie euro per maand in plaats van één tot twee.

## [1.13.0] — 2026-10-19 — Web-app op iPhone en iPad

Getest in de iOS-simulator (iPhone 16 Pro, iPhone 13 mini) in Safari en via "Zet op beginscherm".

- **Statusbalk**: stond op "black-translucent", waardoor de klok op het beginscherm wit op het lichte papier werd (onleesbaar). Nu "default" met een themakleur in de kleur van het papier (licht en donker, en mee met je eigen keuze in Weergave): donkere klok op licht papier, en in Safari geen donkerblauwe balk meer bovenin.
- **Navigatie onderin** volgt de maat van een iOS-tabbalk: 50 pt hoog plus precies de ruimte van de home-balk (34 pt op iPhones zonder thuisknop); in Safari en op toestellen zonder home-balk een marge van 4 pt in plaats van niets.
- **Tip "Zet op beginscherm"** in Safari op iPhone en iPad, één keer en weg te klikken; verschijnt niet als Hoot al vanaf het beginscherm draait.

## [1.12.0] — 2026-10-19 — Het weer in de kop van de Editie

- De metaregel van de Editie is één regel: de datum en het weer van vandaag in Haarlem (icoon en hoogste temperatuur, via Open-Meteo, gratis en zonder sleutel; een half uur bewaard), rechts "Lees voor". Voor schermlezers staat er ook de omschrijving en de minimumtemperatuur.
- "Hoe is dit gekozen?", het aantal verhalen en de samensteltijd zijn weg; de uitleg over de selectie staat nu onder Instellingen → Editie.

## [1.11.1] — 2026-10-19 — Pixelcontrole

Nagemeten op 375 en 1440 px (licht en donker) op Editie, Stroom, Bluesky, Bewaard, Bronnen, Instellingen, Zoeken, het Weergave-paneel en de bronvergelijking.

- Alle tekst op de typeschaal: knoppen als "+3 bronnen", "Nieuwe berichten", bronnamen in Bronnen en Bluesky, labels in Instellingen en de tekst van lege toestanden stonden op 16 px (buiten de schaal) en staan nu op 15 of 17.
- De ondertitel van een scherm staat onder de titelrij over de volle breedte; met het vergelijkpaneel open werd hij tussen titel en knoppen samengeperst tot twee regels. Op telefoon ontbreekt hij nu ook bij Bronnen (zoals bij Stroom en Bluesky).
- Instellingen: de terugknop staat als regel "‹ Bronnen" boven de titel, zodat de titel op de kolomlijn staat (stond 48 px ingesprongen). Koppelingsteksten zonder technische namen.
- Op smalle telefoons valt "1 min lezen" weg vóór de tijd wordt afgekapt.
- "Lees voor" heeft een aanraakdoel van 44 px. Op breed scherm staat het filtericoon op de eerste regel pillen in plaats van ertussen.

## [1.11.0] — 2026-10-19 — Bluesky als eigen stroom, muziek, voorpagina zonder gat

- **Bluesky** is een eigen bestemming in het menu (vlinder): de posts van de mensen die je volgt, met bovenaan een rij per persoon (tik = alleen die persoon) en + om iemand te volgen, met suggesties (3voor12, Atze de Vrieze). Aaron Rupar staat er als eerste. Posts staan niet meer in de Stroom; per persoon kun je "ook in de Stroom" aanzetten. Accounts toevoegen gebeurt nu hier in plaats van onder Bronnen.
- **Muziek**: nieuw onderwerp (pil in de Stroom) en eigen groep onder Bronnen. 3voor12 en OOR staan aan; The Guardian Muziek, The Quietus, Stereogum en NPR Music zet je aan als je wilt. Muziek staat in de Stroom, niet in de Editie, en telt los van het nieuws (hooguit 12 per bron), zodat er geen nieuws uit de Stroom verdwijnt.
- **Voorpagina**: onder het hoofdverhaal staan nu twee kleinere verhalen naast elkaar, zodat de linkerkolom even lang is als de kolom ernaast (het gat onder het hoofdverhaal is weg). "Verder in deze editie" begint bij verhaal 7.

## [1.10.1] — 2026-10-12 — Voorvertoning bij de Volkskrant

- De Volkskrant levert in haar feed alleen koppen, waardoor vrijwel elk bericht zonder voorvertoning stond (23 van de 25). Hoot haalt de eigen inleiding van het artikel nu uit de zoekindex van Bing Nieuws, gekoppeld op het artikel-id, en bewaart die. Liveblogs blijven zonder (hun kop wisselt). Het lenen van een andere bron ("via NOS") blijft als aanvulling.

## [1.10.0] — 2026-10-10 — Instellingen, Instapaper, voorlezen, AI-overzicht en buiten je bubbel

### Nieuw

- **Weergave-paneel** (Aa-knop in de titelrij van Editie en Stroom, naar het voorbeeld van Instapaper): thema, indeling Tijdlijn/Krant, tekstgrootte (drie standen), voorvertoning (1, 2, 3 regels of alles) en beeld (aan, alleen hoofdverhaal, uit). De Tijdlijn/Krant-schakelaar is hierheen verhuisd.
- **Pagina Instellingen** (`#/instellingen`, vanuit Bronnen en het Weergave-paneel): Weergave, Lezen (Instapaper, voorlezen), Editie (AI-overzicht, buiten je bubbel, editietijden), Bronnen, Over.
- **Instapaper** zichtbaar als instelling: schakelaar "Bewaren ook naar Instapaper" en de koppelingsstatus. Werkt zodra `INSTAPAPER_USERNAME` en `INSTAPAPER_PASSWORD` op Netlify staan.
- **Voorlezen**: "Lees voor" in de Editie leest kop, kern en bron van de tien verhalen voor met de Nederlandse stem van het toestel (Web Speech API, gratis, per verhaal één stuk zodat iOS niet afbreekt).
- **De editie in één minuut**: een AI-overzicht van 120–160 woorden (Claude Haiku 5.5), geschreven uit uitsluitend de koppen en samenvattingen van de editie, één keer per editie en met de editie bewaard. Werkt zodra `ANTHROPIC_API_KEY` op Netlify staat. De eerdere verrijking per bericht staat uit tenzij `HOOT_AI_ENRICH=1`.
- **Buiten je bubbel**: drie verhalen die anderen nu lezen of zoeken (Google Trends NL, trending op Bluesky, meestgelezen Wikipedia-pagina's NL en EN), vergeleken met alle zeventien bronnen en nooit uit de editie zelf. Als blok onder de Editie en als pil in de Stroom; per verhaal staat erbij via welk signaal het is gevonden.

### Gewijzigd

- Bronnen bevat geen thema- en indelingskeuze meer (nu Weergave/Instellingen); wel een regel naar alle instellingen.
- "Kort/Volledig" is vervangen door het aantal regels voorvertoning; een bestaande keuze wordt omgezet.

## [1.9.0] — 2026-10-09 — Compacte kop in de Stroom

- **Onderwerpen als swipebare pillen.** Eén horizontaal scrollende rij met Alles en alle onderwerpen (36 px hoog, aanraakdoel 44), met een vervaging rechts; de gekozen pil scrolt vanzelf in beeld. Wat je onder Bronnen kiest staat vooraan ("Volgorde van onderwerpen"). Op breed scherm staan alle pillen zichtbaar in twee rijen.
- **Filters als icoon** rechts van de rij, met een stip als er een filter op soort of bron actief is. "Onderwerp" is uit het filterblad; Soort, Bron en Voorvertoning blijven.
- **Eén statusregel**: "Nederland · 14 berichten · bijgewerkt 20:26 · Wis" vervangt de blauwe filterbalk én de losse bijgewerkt-regel.
- De ondertitel "Alles van je bronnen, nieuwste eerst" staat alleen nog op breed scherm.
- De kop vóór het eerste bericht is 132 px in plaats van 235 (iPhone 16 Pro: 15% van het scherm in plaats van 27%; iPhone 13 mini: 16% in plaats van 29%).

## [1.8.0] — 2026-10-09 — Eén raster: afstand, type en vorm op schaal

Geen nieuwe functies; het raster onder de app is vastgelegd en overal toegepast (zie `#/stijl` → Schaal).

- **Afstand**: één schaal van 4 px (4, 8, 12, 16, 24, 32, 48). Alle marges, paddings en gaps zijn daarop gezet; de 17 losse waarden zijn weg.
- **Type**: zes stappen (13, 15, 17, 20, 24, 28–32) met drie regelafstanden (koppen 1,15 · bediening 1,3 · leestekst 1,5). Schermtitel 24, kop van een bericht overal 20, bronnaam en bediening 15, metadata 13.
- **Vorm**: vier hoeken (8 knoppen en velden · 12 beeld en kaarten · 16 bladen · pil voor chips en schakelaars) in plaats van dertien. Alle bediening is 44 px hoog; "Vergelijk bronnen", chips en de Tijdlijn/Krant-schakelaar delen dezelfde pilvorm.
- **Uitlijning**: op desktop staat de hele Editie op één linkerlijn — "Verder in deze editie" sprong 124 px in. De "+N bronnen"-knop hing 6 px buiten de kolom. De kop van een scherm is één rij van 44 px (titel, schakelaar, knoppen) met daaronder één metaregel: "Vrijdag 9 oktober · 10 verhalen · 18:15 · Hoe is dit gekozen?". Berichten in de Stroom hebben boven en onder evenveel ruimte.

## [1.7.0] — 2026-10-09 — Afwerking desktop en betrouwbare updates

### Opgelost

- **Nieuwe versies kwamen niet door bij verversen.** Sinds v1.3.0 wachtte een nieuwe versie tot álle tabbladen dicht waren (de instelling `injectRegister: 'script-defer'` zette het automatisch overnemen stilletjes uit). Nu staat er, zodra een nieuwe versie klaarstaat, een stille melding **"Nieuwe versie beschikbaar · Vernieuwen"**. Hoot herlaadt nooit uit zichzelf; bewaarde berichten, bronnen, filters en leespositie blijven behouden. Getest met twee builds achter elkaar (melding, vernieuwen, geen lus, wegklikken, offline).

### Gewijzigd

- **Vergelijkpaneel (breed scherm)**: elke publicatie toont eerst bron en tijd, dan de kop over de volle breedte en hooguit drie regels samenvatting — zonder beeld. Op telefoon en tablet blijft de ruimere weergave.
- **Overzicht in het paneel** heet "Verhalen met meerdere bronnen"; elke regel zegt "Vergelijk N bronnen" en het laatst bekeken verhaal is gemarkeerd. Vanuit een verhaal brengt "‹ Alle verhalen" je terug; het kruisje sluit het paneel.
- **Schakelaar Tijdlijn/Krant** heeft op breed scherm tekst bij de iconen; de gekozen stand is ook vet en omrand (niet alleen kleur).
- **Kleine verhalen op de voorpagina**: bron en tijd op een eigen regel die niet meer wordt afgekapt; "+N bronnen" en bewaren staan apart eronder; bij een lange kop vervalt de samenvatting.

## [1.6.0] — 2026-10-09 — Editie met een voorpagina

- **Voorpagina**: de eerste vier verhalen staan in krant-vorm. Op breed scherm het hoofdverhaal links (beeld, grote kop, samenvatting) en drie kleinere koppen in een smalle kolom rechts; op telefoon, of met het vergelijkpaneel open, onder elkaar als compacte koppenlijst.
- Daaronder "Verder in deze editie": verhalen 5 tot en met 10 als stroom, in de indeling van de schakelaar (Tijdlijn of Krant). De teller ("5 van 10") staat alleen nog daar.

## [1.5.3] — 2026-10-09 — Indeling-schakelaar ook in de Editie

- De schakelaar Tijdlijn/Krant staat nu ook boven de Editie, rechts naast "Hoe is dit gekozen?".

## [1.5.2] — 2026-10-09 — Compacter hoofdverhaal

- Het eerste verhaal van de Editie neemt op breed scherm minder ruimte in: het beeld is een liggende strook (21:9, ± 300 px hoog in plaats van ± 480 px) en de kop iets kleiner, zodat kop en kern direct in beeld staan.

## [1.5.1] — 2026-10-09 — Indeling als schakelaar

- De keuze Tijdlijn/Krant is een schakelaar met twee iconen in de balk van de Stroom, direct vóór Filters (niet meer in het filterblad). Onder Bronnen blijft de keuze ook staan.

## [1.5.0] — 2026-10-09 — Indeling: Tijdlijn of Krant

- **Twee indelingen voor berichten**, te wisselen onder Stroom → Filters → Indeling en onder Bronnen. **Tijdlijn** (nu standaard): bron bovenaan, dan kop en tekst, en het beeld groot in het midden — zoals een sociale tijdlijn. **Krant**: kop links met een klein beeld rechts, zoals het was. De keuze geldt voor Editie, Stroom, Bewaard en zoeken; het vergelijkpaneel blijft compact.

## [1.4.0] — 2026-10-09 — Twee standen op breed scherm: lezen en vergelijken

- **Lezen** (standaard): geen rechterkolom en geen scheidingslijn meer. De leeskolom (720 px) staat gecentreerd in de ruimte naast de navigatie; de navigatie is iets smaller.
- **Vergelijken**: de knop "Vergelijk bronnen" staat bij de bediening boven Editie en Stroom. Het paneel (340 px) schuift rechts in beeld; sluiten geeft de ruimte terug. Zonder gekozen verhaal toont het de verhalen waar nu de meeste bronnen over schrijven. "+N bronnen" bij een bericht opent hetzelfde paneel. Op telefoon en tablet blijft de vergelijking schermvullend.
- **Sociale bijdragen**: een gedeelde link is nu een compacte kaart (klein beeld, titel, domein); een eigen foto houdt zijn verhouding met begrensde hoogte; video blijft 16:9 met afspeelknop.

## [1.3.0] — 2026-10-09 — Sneller laden, rustiger welkom, kleine bewegingen

### Sneller

- **Schermen worden pas opgebouwd als je er komt.** Verborgen schermen (de Stroom achter de Editie, alles achter het welkomscherm) laadden al hun beeld alvast mee — ruim honderd afbeeldingen en alle videobeelden bij het eerste bezoek. Dat is voorbij.
- **Beeld op maat**: waar de uitgever kleinere varianten aanbiedt (Wired, NYT, The Verge, de Volkskrant, NOS, YouTube, Bluesky-profielfoto's) vraagt Hoot die op, met `srcset`/`sizes`. Een Wired-thumbnail gaat van ± 1 MB naar ± 18 kB. Het hoofdbeeld van de Volkskrant is juist scherper geworden.
- Alleen het zichtbare hoofdbeeld krijgt voorrang; de rest laadt pas in de buurt van het scherm. **Video's** tonen eerst een stilstaand beeld; de speler komt bij de eerste tik.
- De berichten worden al opgehaald terwijl de app zelf nog laadt; de service worker houdt het eerste beeld niet meer op; app-bestanden met een hash in de naam worden een jaar bewaard (nieuws blijft altijd vers).

### Gewijzigd

- **Welkomscherm**: "Naar de Editie" staat direct onder de inleiding; "Pas je bronnen aan" klapt de bronnen uit. Het scherm verspringt niet meer als de bronnen binnenkomen.
- **Editie**: compactere regel ("10 verhalen · 09:35"); alleen "Hoe is dit gekozen?" ziet eruit als een link. Geen komende-en-gaande "Verversen…"-regel meer.
- **Bronvergelijking**: bovenaan kort het aantal bronnen en de laatste update; de uitleg zit achter "Hoe zijn deze bronnen gekoppeld?". Kopjes heten nu "Toegevoegd sinds je vorige bezoek" en "Eerder beschikbaar".
- **Beweging** (klein, en uit bij "verminder beweging"): bladwijzer, onderwerp-chips, het openen van een verhaal, het actief-streepje in de navigatie, het ververs-icoon.
- **Ongedaan maken** na verwijderen uit Bewaard. De knop voor nieuwe berichten heet kort "3 nieuwe berichten"; berichten van uitgezette bronnen tellen niet mee.
- Navigatielabels passen ook bij sterk vergrote tekst; elk bericht is minimaal 44 px hoog.

## [1.2.0] — 2026-10-09 — The Atlantic en The Economist als vaste bron

- **The Atlantic** en **The Economist** zijn nu eigen bronnen: ze doen mee in Editie, Stroom en zoeken en zijn aan/uit te zetten onder Bronnen (voorheen alleen ter vergelijking binnen een verhaal).

## [1.1.1] — 2026-10-09 — Paneel "Bronnen vergelijken" in- en uitklapbaar

- Op breed scherm is het rechterpaneel standaard ingeklapt: de kolom blijft staan (de leeskolom verschuift niet), maar is leeg op één knop na. De knop klapt de uitleg uit en weer in; je keuze wordt onthouden. Een verhaal dat je opent via "+N bronnen" verschijnt er altijd.

## [1.1.0] — 2026-10-09 — Audit: geen dubbele verhalen, context blijft, stille bronstatus, nieuw logo

### Opgelost

- **Geen dubbele gebeurtenissen meer in de Editie.** Nederlandse en Engelse berichten over hetzelfde incident worden nu samengevoegd (namen, plaatsen, begrippen en tijd uit kop én samenvatting). Bij het samenstellen wordt nogmaals op dubbelen gecontroleerd: één gebeurtenis, één plek.
- **Hoofdbericht per verhaal** komt bij voorkeur van een eigen bron, Nederlands waar het kan, geen opinie, en wisselt af (niet twee keer dezelfde bron achter elkaar als het anders kan, hooguit drie per editie).
- **Filters en leespositie blijven** als je via de navigatie van scherm wisselt en terugkomt. Elke filtercombinatie heeft een eigen leespositie; kies je zelf een filter dan begin je bovenaan, de terugknop brengt je terug waar je was.
- **"Naar de inhoud"** zet de focus in het scherm dat je voor je hebt, zonder de route te veranderen. Sluit je een verhaal, dan gaat de focus terug naar de knop waarmee je het opende.
- **Zoeken** kijkt standaard in "Mijn bronnen" (plus bewaard); "Alle bronnen" is een bewuste keuze. De tekst bij Bronnen klopt daarmee.
- Oudere sessies kregen een nieuwe versie soms niet te zien zolang je halverwege een lijst stond; vlak na het openen wordt nu wel direct ververst (leespositie blijft).

### Gewijzigd

- **Bronstatus is klein en stil**: geen melding meer boven Editie of Stroom bij één uitgevallen bron. Een klein puntje bij Bronnen, en daar een inklapbare regel "Bronstatus" met per bron de status, hoe vers de berichten zijn en "Opnieuw proberen". Verdwijnt vanzelf na herstel of als je de bron uitzet. Alleen als álle bronnen onbereikbaar zijn staat er één regel bovenaan.
- Berichten die al geladen waren van een uitgevallen bron blijven staan.
- **Nieuw logo en app-icoon** (uil + woordmerk), in licht en donker; favicon, manifest en homescreen-icoon opnieuw gegenereerd uit de vectoren. Accentkleur volgt de merk-inkt.
- **Leesbaarheid**: op telefoon staat bij het hoofdverhaal eerst de kop en de kern, dan het beeld. De Stroom toont standaard twee regels per bericht ("Kort"); "Volledig" staat onder Filters → Weergave.
- Bewaarde verhalen blijven vindbaar als bundels samengaan (eerdere id's blijven werken).

### Techniek

- Bundeling en editie-selectie staan in `netlify/lib/stories.mjs`; route/context, bronstatus en bewaard in `src/lib/`. `npm test` draait 24 regressietests.

## [1.0.0] — 2026-10-08 — Hoot 2: Editie, Stroom, Bewaard, Bronnen

De app is opnieuw opgezet rond het verhaal als eenheid. Zie `docs/hoot-2-verslag.md`.

### Nieuw

- **Vier vaste bestemmingen** (onderin op telefoon, links op desktop): **Editie**, **Stroom**, **Bewaard**, **Bronnen**, plus **Zoeken**.
- **Editie**: een ochtend- en een avondeditie van tien verhalen, met een einde ("Je bent bij."). Selectie op aantal bronnen, versheid en eigen bronnen; uitleg staat erbij.
- **Verhalen**: berichten over dezelfde gebeurtenis zijn gebundeld; "+3 bronnen" opent elke publicatie apart met eigen kop, bron, tijd en link. Op desktop in een paneel naast de leeskolom.
- **Nieuw sinds je vorige bezoek** binnen een verhaal; verhalen zijn als geheel te bewaren.
- **Bronnen-scherm**: bronnen aan/uit, status per bron, Bluesky toevoegen, je drie onderwerpen, thema. Welkomscherm bij eerste bezoek.
- **Drie inhoudsvormen** (hoofdverhaal, compact bericht, sociale bijdrage) en een designsysteem in de app (`#/stijl`).
- Auteur, rubriek (de Volkskrant) en het label "Opinie" waar de bron die zelf levert.
- Leespositie blijft behouden bij wisselen, terugkeren en herladen. Filters zijn stappen voor de terugknop.

### Gewijzigd

- Server levert `sources`, `items`, `related`, `stories` en `edition` gescheiden; verhaal-id's en eerst-gezien-tijden worden bewaard (Netlify Blobs); één herhaalpoging per bron.
- Tijd-copy: "3 min geleden" naast "3 min lezen".
- Alle aanraakdoelen minimaal 44 × 44 px; geen horizontaal scrollende rijen meer.

### Verwijderd

- Het "geverifieerd"-vinkje (had geen betekenis), de Trending-tab (opgegaan in Editie en verhalen), het instellingenmenu, de compact/comfortabel-keuze, omlaag-trekken om te verversen en de sneltoetsen j/k.

## [0.16.1] — 2026-10-08 — Tweede ronde: wat je ziet

### Opgelost

- **Screenshots in Bluesky-posts werden onleesbaar afgesneden** (16:9-uitsnede). Foto's in social posts tonen nu in hun eigen verhouding, helemaal.
- **"Nieuwe berichten"-pill** stond links over de avatar; staat nu gecentreerd. In donker thema waren de pill en de knoppen slecht leesbaar (wit op lichtblauw) — nu donkere tekst.
- De footer waarschuwde ook als een bron haperde die alleen Trending voedt (bv. FT); nu alleen voor bronnen uit je eigen feed.
- Bluesky-video in een browser zonder HLS (Chrome op de Mac): poster met speel-teken in plaats van een dode speler; de kaart opent de post.

### Opgeruimd

- Dode CSS weg; README bijgewerkt (tabs, bewaren, werking zonder AI-sleutel).

## [0.16.0] — 2026-10-07 — Frisse blik: minder ruis, eerlijkere kaarten, bewaren dat werkt

### Opgelost

- **Koopjes-spam eruit.** Wired bestond voor ~70% uit "Best Prime Day Deals"-lijstjes (35 van de 50 items), die zelfs in Trending opdoken. Koopjesgidsen (op RSS-categorie én kop) en NRC-puzzels worden nu weggefilterd.
- **Previews stoppen niet meer midden in een zin.** 37 van de 104 teasers werden op 140 tekens afgekapt ("…but these discounts are still worth"). Previews bestaan nu uit hele zinnen; alleen als er geen zinseinde is, volgt een "…".
- **Leestijd-pil was nep.** 139 van de 166 kaarten toonden "2 min" omdat de feed alleen een teaser levert. De pil staat er nu alleen nog als de bron de echte artikeltekst meestuurt (NOS, soms The Verge).
- **Bewaren deed niets** (Instapaper is niet ingesteld, dus elke tik faalde). Bewaren is nu een eigen **leeslijst in de app**: tik op het bladwijzertje, vind alles terug onder de nieuwe tab **🔖 Bewaard**, tik nogmaals om te verwijderen. Is Instapaper ooit ingesteld, dan gaat het artikel daar óók heen.
- **Enter opende een artikel dubbel** bij toetsenbord-navigatie.

### Verbeterd

- **Updates komen vanzelf binnen**: de app checkt bij elke keer openen op een nieuwe versie en ververst zichzelf (nooit midden in het lezen). Geforceerd afsluiten is niet meer nodig. Het versienummer staat onderin het menu.
- **Sneller**: bron-avatars worden parallel met de feeds opgehaald en 6 uur onthouden; kaarten buiten beeld worden niet gerenderd.
- **Betere onderwerpen**: RSS-categorieën (o.a. NYT) tellen mee bij het indelen; ruisige trefwoorden ("miljard", "platform") zijn weg.
- Footer zonder jargon: "Je bent helemaal bij 🦉", of een melding als een bron écht niet bereikbaar is.

## [0.15.0] — 2026-06-29 — Geleende preview voor de Volkskrant (gratis, geen AI)

### Toegevoegd

- Artikelen zonder eigen samenvatting (de Volkskrant) krijgen nu een **geleende previewtekst** van een Nederlandse bron (NOS/NRC) die hetzelfde verhaal dekt — gratis, zonder AI. Met bron-vermelding ("· via NRC").
- Streng tegen verkeerde matches: alleen NL→NL (taal klopt) én bij sterke titel-overlap (≥4 gedeelde kernwoorden, of ≥3 mits ze ≥60% van de kop beslaan). Liever geen preview dan een foute.
- Dekking is daardoor beperkt tot verhalen die óók breed gedekt worden; overige VK-kaarten blijven kop + foto.

## [0.14.0] — 2026-06-29 — Bronnen vallen niet meer volledig uit de feed

### Opgelost

- Laag-frequente bronnen (zoals **Left Laser**) verdwenen volledig uit de feed — én uit het bronnen-menu — als hun nieuwste post een paar dagen oud was, omdat de feed alleen de ~160 nieuwste items over alle bronnen toont. Nu houdt elke bron **z'n 6 recentste items** gegarandeerd, zodat geen enkel kanaal onzichtbaar wordt. Je vindt Left Laser dus altijd terug via het bronnen-menu (en kunt erop filteren).

## [0.13.0] — 2026-06-29 — Left Laser via YouTube i.p.v. Bluesky

### Gewijzigd

- **Left Laser komt nu binnen via hun YouTube-kanaal** (native RSS, gratis, betrouwbaar) i.p.v. Bluesky. X/Twitter kan niet zonder betaalde API of fragiele scraper; YouTube heeft gewoon een publieke feed. De Bluesky-versie is verwijderd.
- Video's tonen titel + echte YouTube-thumbnail + merk-avatar (uit hun Bluesky-profiel) en openen op YouTube. Aggregator leidt de thumbnail af uit de `yt:videoId` (YouTube-RSS levert geen `<img>`).

## [0.12.2] — 2026-06-29 — og-scraper verwijderd (door Volkskrant geblokkeerd)

### Gewijzigd

- De og:description-scraper is **verwijderd**. Diagnose was conclusief: de Volkskrant geeft Netlify's server-IP's een **harde HTTP 403** (`ogStats: tried 10, notOk 10, status 403`) — een IP/WAF-block, niet op te lossen met headers. De code leverde in productie niets op (alleen 403's), dus eruit.
- Volkskrant-previews kunnen daardoor alléén via de AI-route (uit de kop), die geen paginafetch nodig heeft en vanaf elk IP werkt — actief zodra `ANTHROPIC_API_KEY` in Netlify staat. Zonder key blijft de Volkskrant kop + foto.

## [0.12.1] — 2026-06-29 — Diagnose: og-teasers werken niet in productie

### Opgelost / onderzoek

- De og:description-teasers (Volkskrant) werkten lokaal maar **niet live** (`ogFetched: 0`, 0/24). Toegevoegd: volledigere crawler-headers (`Accept`, `Accept-Language`), cache-sleutel `og-teasers-v2` (om met-leeg vervuilde entries opnieuw te proberen) en **`meta.ogStats`** (tried/notOk/gotOg/errors/lastStatus) zodat we live exact zien of de Volkskrant Netlify's server-IP's blokkeert.

## [0.12.0] — 2026-06-29 — UX/UX-review-pass (density, nieuwe items, a11y, security)

### Toegevoegd

- **Dichtheid-keuze** (Instellingen → Dichtheid): **Comfortabel** of **Compact**. Compact halveert de fotohoogte en kapt kop/samenvatting op 2 regels → ~2× zoveel items per scherm. Onthouden in localStorage, geen flits bij laden.
- **"↑ N nieuwe berichten"-pill**: automatische verversingen schuiven de feed niet meer weg tijdens het lezen; nieuwe items wachten tot je op de pill tikt (dan pas scrollt 'ie naar boven). Handmatig verversen (knop/pull) werkt direct zoals voorheen.
- **Versheid bovenaan** zichtbaar ("Bijgewerkt om HH:MM") en een **"Verversen mislukt — opnieuw"** als een stille verversing faalt (niet langer een stille failure).
- **Toetsenbord-navigatie** voor power-users: `j`/`k` volgende/vorige, `o`/Enter openen, `s` bewaren, `r` verversen, `g` naar boven.

### Opgelost / Toegankelijkheid

- **Security:** `javascript:`/`data:`-links uit feeds worden geweerd (alleen http(s) toegestaan) in zowel de aggregator als de Bluesky-client.
- Onderwerp-chips hebben nu `aria-pressed`; het menu is `inert` als het dicht is (geen verdwaalde focus), met focus-beheer bij openen/sluiten; merknaam is nu een `<h1>`.
- Grotere tap-doelen (bewaar-, chip- en verwijderknop).

## [0.11.1] — 2026-06-29 — Sociale bronnen als eigen instellingen-scherm

### Gewijzigd

- Het toevoegen van sociale bronnen zit nu achter een nette **drill-down** in Instellingen: het hoofdmenu toont een rij **"Sociale bronnen ›"** (met aantal), die een eigen sub-scherm opent met terug-knop, invoerveld, lijst en uitleg. Het hoofdmenu blijft zo rustig en overzichtelijk (iOS-instellingen-gevoel).
- Toegevoegd: duidelijk label boven het invoerveld, een lege-staat ("Nog geen accounts toegevoegd"), en een vloeiende schermovergang.

## [0.11.0] — 2026-06-29 — Zelf social-bronnen toevoegen

### Toegevoegd

- **Voeg zelf Bluesky-accounts toe** in Instellingen (menu): plak een handle of `bsky.app`-link, Hoot haalt **automatisch de naam en avatar** op en mengt de posts (inclusief video) in je feed — geen serverwijziging nodig, alles in je eigen app (localStorage).
- Toegevoegde accounts verschijnen ook in "Mijn bronnen" om op te filteren, en zijn met één tik weer te verwijderen.
- **Threads/Instagram**: die hebben geen publieke feed/API, dus niet mogelijk — de uitleg in het menu wijst je naar het eventuele Bluesky-account van de maker.

## [0.10.0] — 2026-06-29 — Previewtekst voor de Volkskrant (zonder AI)

### Toegevoegd

- **Volkskrant-artikelen krijgen nu een previewtekst**, ook zónder AI-key. Hoot haalt de **`og:description`** op van de artikelpagina (de deel-tekst die de Volkskrant zelf publiceert voor social media — vóór de paywall), met een social-crawler user-agent. Resultaten worden gecachet (Netlify Blobs `og-teasers-v1`), dus het blijft snel.
- Werkt voor elk artikel zonder RSS-teaser; ~24/29 VK-artikelen krijgen zo een samenvatting. De rest zijn liveblogs die bij de bron zelf geen samenvatting hebben.
- Als de AI later aanstaat, krijgt die nu echte brontekst om van te vertalen/samenvatten in plaats van alleen de kop.
- `meta.ogFetched` toegevoegd voor inzicht.

## [0.9.2] — 2026-06-29 — Left Laser toegevoegd

### Toegevoegd

- **Left Laser** als bron in de feed, via hun **Bluesky**-account (`leftlaser.bsky.social`) — inclusief hun video's. Instagram zelf heeft geen publieke feed/API, dus Bluesky is de nette, betrouwbare route naar dezelfde content.

## [0.9.1] — 2026-06-24 — Bronnen in het menu

### Toegevoegd

- **"Mijn bronnen" in het hamburger-menu**: al je bronnen netjes onder elkaar, branded met logo, naam, verified-vinkje en handle. Tik op een bron om alleen die bron te zien (menu sluit automatisch). De actieve bron krijgt een merk-gekleurd accent.
- Nieuwsbronnen staan bovenaan, Bluesky-accounts eronder.

## [0.9.0] — 2026-06-24 — Vier nieuwe onderwerp-categorieën

### Toegevoegd

- **Vier nieuwe tabs**: 💻 **Tech** (Apple/Google/Meta/Musk, platforms, chips, gadgets), 🔬 **Wetenschap** (onderzoek, ruimtevaart, gezondheid), 📈 **Economie** (beurs, inflatie, bedrijven, markten) en 🇳🇱 **Nederland** (binnenlandse politiek & samenleving).
- De tabs zijn opnieuw gegroepeerd: VS-politiek · Trump · Nederland · Oekraïne · Geopolitiek · Tech · AI · Wetenschap · Economie.
- Voor elke nieuwe categorie is zowel de **AI-classificatie** als de **trefwoord-fallback** ingeregeld; één artikel kan meerdere onderwerpen hebben (bijv. een Nederlands AI-bedrijf → Nederland + Tech + AI).
- Verrijkings-cache naar `enrichments-v7` zodat bestaande artikelen opnieuw worden ingedeeld met de nieuwe onderwerpen.

## [0.8.3] — 2026-06-24 — Koppen worden niet meer afgekapt

### Opgelost

- Lange koppen werden na 3 regels met "…" afgekapt. De regel-limiet is verwijderd: **koppen passen nu altijd volledig** (de kaart wordt simpelweg iets hoger). De AI-inkorting van lange koppen blijft eroverheen werken om ze compact te houden waar dat kan.

## [0.8.2] — 2026-06-24 — Terug-naar-boven knop

### Toegevoegd

- **Terug-naar-boven knop**: verschijnt rechtsonder zodra je een stuk naar beneden scrolt en brengt je met één tik soepel terug naar de top. Past bij de bestaande icoon-knoppen (ronde knop, blauwe pijl), en verdwijnt vanzelf weer bovenaan. Werkt licht/donker mee.

## [0.8.1] — 2026-06-24 — Previews voor de Volkskrant & NRC

### Opgelost

- **de Volkskrant en NRC hadden geen previewregel.** Oorzaak: hun RSS levert alleen een kop + foto, géén samenvattingstekst (`<description>` is leeg), en de artikelpagina's blokkeren server-side ophalen. Hun Bluesky-posts herhalen enkel de kop.
- Oplossing: de AI maakt nu voor **bron-loze artikelen** één neutrale Nederlandse zin op basis van de **kop** — met de harde regel om **geen feiten, cijfers of citaten te verzinnen** die niet in de kop staan. Bronnen mét teaser (NYT/Verge/Wired/NOS) worden zoals voorheen inhoudelijk samengevat en vertaald.
- Verrijkings-cache naar `enrichments-v6` zodat bestaande items opnieuw worden gegenereerd met de nieuwe regel.

> Werkt zodra `ANTHROPIC_API_KEY` in Netlify staat. Zonder key blijven VK/NRC-kaarten kop + foto (geen verzonnen tekst).

## [0.8.0] — 2026-06-24 — Slide-in menu & dark mode

### Toegevoegd

- **Slide-in menu** (hamburger linksboven) met **Instellingen** — uitbreidbaar voor later.
- **Thema-keuze**: **Systeem / Licht / Donker** (segmented control). 'Systeem' volgt automatisch je iPhone; je keuze wordt onthouden. Geen "flits" bij laden (thema staat vóór render).

### Gewijzigd

- Donker thema werkt nu via `data-theme` i.p.v. alleen de OS-mediaquery, zodat een handmatige keuze mogelijk is.

## [0.7.1] — 2026-06-18

### Gewijzigd

- **App-icoon** (incl. iOS-homescreen via apple-touch-icon): de uil is **iets kleiner** met meer ademruimte.
- **Verfijnder woordmerk** "Hoot" (fijner gewicht, strakkere tracking) en kleinere uil in het header-logo.
- **Lange koppen worden licht ingekort door de AI** (in de oorspronkelijke taal, ~max 65 tekens) zodat ze netjes passen.

## [0.7.0] — 2026-06-18 — Trending / Discover

### Toegevoegd

- **🔥 Trending-tab**: ontdek verhalen die bij **meerdere gerenommeerde bronnen tegelijk** opduiken (cross-bron signaal).
  - Naast je vaste bronnen worden **extra reputabele bronnen** opgehaald (The Guardian, BBC, Al Jazeera, NPR, Politico, The Atlantic, The Economist, FT, Tweakers) — alleen voor Trending, niet in je hoofd-feed.
  - Verhalen worden geclusterd op titel-overlap; een cluster met ≥2 bronnen wordt trending. Per kaart een **"🔥 N bronnen"**-badge (hover toont welke).
  - Gerangschikt op aantal bronnen + recentheid; representatief artikel kiest waar mogelijk je eigen bron.

## [0.6.1] — 2026-06-18

### Gewijzigd

- **Samenvattingen kappen nooit meer mid-woord af** (`…`): netjes afgerond op zin-/woordgrens, strikt ≤140 tekens.
- AI-prompt: artikel-samenvatting = **één complete Nederlandse zin (max 140), Engelse bronnen worden vertaald**.
- **Koppen blijven in de oorspronkelijke taal** (geen vertaling meer).
- **Bluesky-posts** blijven **origineel** van taal én lengte (geen samenvatting/vertaling), wel onderwerp-tags.
- Verrijking-cache ververst (v4) zodat bestaande items de strakke nieuwe samenvattingen krijgen.

## [0.6.0] — 2026-06-18 — Instapaper

### Toegevoegd

- **Bewaar voor later → Instapaper**: een bladwijzer-knop op elke kaart zet het artikel in je Instapaper.
  - Server-side via een nieuwe functie `/api/save` (Instapaper Simple API); inloggegevens staan veilig als Netlify-omgevingsvariabelen (`INSTAPAPER_USERNAME`, `INSTAPAPER_PASSWORD`) — nooit in de client of code.
  - Bewaarde artikelen blijven lokaal gemarkeerd (gevulde bladwijzer); nette foutmelding als Instapaper nog niet is ingesteld.
- De bron-regel is opgesplitst (bron-knop + leespil + bewaar-knop) zonder geneste knoppen — toegankelijk.

## [0.5.1] — 2026-06-18 — polish-ronde 2

### Gewijzigd

- **Leestijd als pil** rechts in de bron-regel — kapt nooit meer af.
- **Eenmalige tip** ("tik op een bron om te filteren") die verdwijnt zodra je 'm gebruikt of wegtikt.
- **Desktop**: de feed staat nu als een net, gecentreerd paneel (subtiele rand + schaduw) i.p.v. een losse kolom.
- **Eén laad-indicator**: de top-progressbalk is weg; het draaiende ververs-icoon blijft.

## [0.5.0] — 2026-06-18 — UI/UX polish-pass

### Toegevoegd

- **Toetsenbord-focus** (`:focus-visible`-ring) op alle interactieve elementen.
- Lege staat bij een actief filter toont nu een **"Toon alles"**-knop (geen doodlopend scherm).
- **Spacing- en radius-tokens** (`--space-*`, `--radius-pill`) voor een consistent ritme.

### Gewijzigd

- **Toegankelijkere kaart**: opgesplitst in een artikel-container met een echte bron-**knop** (filteren, nu ook met toetsenbord) en een artikel-**link** — geen geneste link-in-knop meer.
- **Gelezen-status** verzacht (minder vervaagd) voor een rustiger feed.
- **Grotere touch targets** voor de onderwerp-chips (~40px).
- **Skeleton** komt overeen met de echte kaart (titel-placeholder toegevoegd).
- Diverse hardcoded spacing/radii vervangen door tokens; dubbele afronding op het brand-icoon weg.

## [0.4.3] — 2026-06-18

### Gewijzigd

- **Avatars vullen nu mooi uit** (cover) i.p.v. een vierkant logo in een rondje.
- Bronnen zonder Bluesky-account (zoals NOS) krijgen hun X-profielfoto via unavatar.io — een scherpe merk-avatar.

## [0.4.2] — 2026-06-18

### Toegevoegd

- **Verwachte leestijd** per artikel (📖), geschat door de AI met een heuristische terugval.

### Gewijzigd

- Kaartvolgorde: **titel → samenvatting (lede) → foto**, typografisch netjes.
- **Strakker geverifieerd-vinkje** (schone cirkel met check i.p.v. het rommelige zegel).

## [0.4.1] — 2026-06-18

### Gewijzigd

- **Mooie merk-avatars**: het officiële profielbeeld van elke nieuwssite wordt opgehaald via de openbare Bluesky-API (met de favicon als nette terugval).
- **Samenvatting** is nu zwarter en beter leesbaar, en wordt niet meer visueel afgekapt (hard op 140 tekens).
- AI maakt **altijd** een Nederlandse samenvatting, ook als de brontekst leeg is (NRC/VK zonder teaser).

## [0.4.0] — 2026-06-18

### Toegevoegd

- **Bron-filter**: tik op de bron-regel van een kaart om alleen die nieuwsbron te zien (met een wisbalk "Alleen … ✕"). Zo bekijk je netjes alles van bv. NRC, The Verge of Wired.
- **Bluesky-video's** spelen direct in de app af (met poster), naast tekst en beeld.
- **Merk-gekleurde avatar-cirkels** per bron, in een nette cirkel.
- **Automatisch verversen** elke 15 minuten (en bij terugkeren in de app).

### Gewijzigd

- Kaartvolgorde: **samenvatting (≤140 tekens) bovenaan → titel → foto**.
- Onderwerp **Extreemrechts → Geopolitiek** (EU, VS, China, Taiwan, Midden-Oosten, NAVO, sancties). De AI bepaalt zelf de indeling.
- App-icoon: groot-ogige witte uil, **gecentreerd** op blauw.
- Bluesky toont **alleen originele posts** van de gevraagde account (Aaron Rupar) — geen reposts van anderen meer.

## [0.3.1] — 2026-06-18

### Gewijzigd

- **Titel boven de foto** bij artikelen (serif-kop → foto → samenvatting), redactionele volgorde.
- **Nieuw uil-icoon**: groot-ogige witte uil op blauw (eigen ontwerp), wit op blauw.

## [0.3.0] — 2026-06-18

### Gewijzigd

- **Redactioneel ontwerp** (New York Times × Notion): flat, strak, **serif koppen** (Apple "New York"/Georgia), modern klassiek.
- **App-icoon**: witte uil-silhouet op blauw — passe-partout, in de stijl van het oude Twitter-icoon.
- **Samenvattingen op ~140 tekens** (Twitter-lengte), titel én samenvatting in het Nederlands (met de AI-laag aan).
- **Foto's overal even groot** (vaste 16:9-verhouding) voor een rustige, uniforme tijdlijn.

## [0.2.0] — 2026-06-18

### Toegevoegd

- **Onderwerp-tabs** in plaats van bronnen: 🇺🇸 VS-politiek · 🇺🇦 Oekraïne · ⚠️ Extreemrechts · 🤖 AI · 🎪 Trump.
- **AI-verrijking** (Claude Sonnet): Nederlandse, verkorte titels + korte NL-samenvattingen + onderwerp-classificatie, gecachet in Netlify Blobs. Werkt ook **zonder API-sleutel** (originele titels + trefwoord-onderwerpen als terugval).
- **Bluesky in de feed** via de openbare API — eerste account: [@atrupar.com](https://bsky.app/profile/atrupar.com).
- **Tweet-stijl kaart**: bron-avatar met het echte site-logo, geverifieerd-vinkje, samenvatting, grote afbeelding en een link-balkje met titel + domein.

## [0.1.0] — 2026-06-18

### Toegevoegd

- Eerste versie van **Hoot**: één verenigde nieuws-tijdlijn van NRC, de Volkskrant, NYT, The Verge, Wired en NOS.
- Installeerbare PWA met homescreen-uiltje (iPhone-first), offline shell en feed-cache.
- Robuuste Netlify-aggregator: per-bron fallback-URL's, time-outs, ontdubbeling en CDN-caching (5 min).
- Bron-filters, gelezen-status (lokaal bewaard), pull-to-refresh en automatische licht/donker-modus.
