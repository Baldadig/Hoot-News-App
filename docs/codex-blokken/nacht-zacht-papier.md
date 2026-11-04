# Nacht · Zacht papier

3 november 2026 · branch `nacht-zacht-papier` vanaf `ronde-2-integratie` `3a201bf`. Alleen lokaal; main, beschermde bestanden, design system en builds 40/41 niet gewijzigd.

## Veranderd

Alleen Nacht krijgt de vier gekozen leesinkten: `#d8d0c2`, `#bdb3a2`, `#a79b87`, `#df8276`. Web gebruikt een afzonderlijke Nacht-override; afgeleide merk-, markering-, band- en caretrollen volgen mee. Op iOS resolveert één centrale UIColor-override dezelfde rollen uitsluitend bij de Nacht-trait én donkere interface. Bestaande kleurassets zijn niet gewijzigd. ReaderHTML krijgt alleen in Nacht de nieuwe waarden. Gewicht, tracking, regelhoogte en ondergrond blijven zoals goedgekeurd.

**Licht/Donker zijn bytegelijk bewezen:** de complete bestaande CSS vóór het nieuwe Nacht-blok heeft dezelfde SHA-256, alle oorspronkelijke native kleurassetbestanden hebben dezelfde hashes en dezelfde niet-Nacht ReaderHTML-proef heeft vóór/na hash `583e38e2d89589e5fad0505c661484807051459d4e0e6dce052a1840133b497d`. De UIKit-regressietest vergelijkt elke rol buiten Nacht ook werkelijk met de oorspronkelijke assetkleur in Licht en Donker.

## Zwarte Papier-lezer onderzocht

Het F-bewijsbestand heette terecht `ongeldig-ios-lezer-papier.png`. De oude proef fotografeerde een UIKit-hiërarchie na een vaste wachttijd, zonder scene-gekoppeld key window of controle op een geladen WebKit-blad. Dat kan een zwarte WK-compositie opleveren en bewijst geen zwarte lezer. ‘Papier’ was hier de naam van het nachtpalet Zacht papier, niet de lichte leesstand.

De nieuwe proef rendert **de echte ArticleWebView met de echte ReaderHTML**, in een UIWindow van de actieve simulator-scene. Hij wacht op `isLoading == false` en een lange geladen pagina, gebruikt `WKWebView.takeSnapshot` en toetst de pixelhelderheid. De Nacht-lezer met Zacht papier toont nu aantoonbaar tekst op zwart; ook de lichte lezer toont normaal papier. Het lange artikel blijft leesbaar na 900 pt doorschuiven. Er is geen willekeurige extra productieachtergrond toegevoegd om een testplaatje wit te schilderen. De lezerondergrond was al correct; het renderbewijs is hersteld. Ter controle is ook de **exacte oorspronkelijke F-HTML** van de mislukte Papier-opname ongewijzigd door de nieuwe scene-gebonden ArticleWebView gehaald: de aanvullende diagnose slaagt en toont zichtbare tekst. Daarmee is de oude HTML/CSS niet de oorzaak van een volledig zwart resultaat. We isoleren de fout tot de oude opname-/gereedheidsroute; niet welke van de twee ontbrekende voorwaarden afzonderlijk doorslaggevend was.

Bijlagen: `ios-lezer-{licht,donker,nacht}.png`, `ios-lezer-lang-*.png`. Het bestaande F-beeld en de ongeldigverklaring zijn apart als voorgeschiedenis bewaard, niet gepresenteerd als een vergelijkbare geldige Papier-meting.

## Foto’s, bronlogo en contrast

De werkelijke `FramedImage`, `RemoteImageLoader` en `SourceMark` zijn in de simulator gerenderd met ongewijzigde openbare NOS-beelden. De proef bevriest alleen de netwerkinput in URLProtocol; hij tekent geen vervangend logo of foto. Het NOS-logo heeft zijn bestaande witte ondergrond, 24 pt rond: hooguit circa 0,14% van een 390 × 844 scherm. De foto beslaat ongeveer 21,6% van dat scherm en blijft in oorspronkelijke kleuren. Een zachtere tekstinkt dempt dus niet automatisch een lichte foto.

`pixelmeting.json` meet lineaire sRGB-luminantie van de echte PNG’s: Nacht-lezer gemiddeld 0,043, met 0% pixels boven 0,7; verderop 0,041. Foto+logo in Nacht gemiddeld 0,090 en 3,57% boven 0,7. Donker met hetzelfde beeld: 0,098 en 4,66%. Dit zijn relatieve screenshotwaarden, geen schermnits, OLED-energie- of gezondheidsmeting. De foto/logo-proef is een werkelijke componentrender, geen handmatig bediende fysieke toestelproef.

Vaste contrasttests: hoofdinkt ≥12:1 op zwart; ink-3 en accent ≥4,5:1 op zwart en de bestaande donkere oppervlakken `#1e1b17`, `#27231e`, `#3a1e1b`, `#151310`. De deelkaart gebruikt ongewijzigde BrandRed/OnBrandRed-assets; de volledige native deelkaarttests blijven groen.

Web 390 px: echte gebouwde Stroom, dezelfde vaste proefinput, drie thema’s, vóór/na Nacht, echte geladen foto’s en logo’s, geen horizontale overloop. Gemeten Night `--paper:#000000`, `--ink:#d8d0c2`, `--ink-3:#a79b87`, `--accent:#df8276`; Licht/Donker blijven hun oorspronkelijke waarden houden. Geen nieuwe web-artikellezer gebouwd: die bestaat niet in de huidige app.

## Controle

1011 webtests geslaagd, 0 fouten, 1 bestaande TODO; build, core-generatie en harde acceptatie groen (uniekheid ≤0,38). **107 native tests geslaagd**, 0 fouten, inclusief de herstelde lange lezerproef. Bewijs en logs in `nacht-zacht-papier/`. Naast de volledige suite van 107 is één gerichte diagnose met de originele F-HTML geslaagd. De tijdelijke diagnostische XCTest staat als bron bij het bewijs, niet blijvend in de regressiesuite.

De baselinecontrole kent uitsluitend het exacte goedgekeurde crossfade-appendix uit I als toegestane zusteraanpassing. De originele CSS-hash blijft verder verplicht; de nieuwe themaregel moet uitsluitend Nacht selecteren. De drie kleurproeven zijn ook met de werkelijk gecombineerde I+J-CSS geslaagd, buiten de werkboom nagebootst. Claude hoeft deze baseline niet te versoepelen bij integratie. Dit is een gecombineerde CSS-controle, geen volledige I/J/K/M-appintegratie. De native asset- en ReaderHTML-controles blijven gelden.

## Voor Claudes design-system-update

Voeg de vier Nacht-rollen hierboven toe als afzonderlijke leesstand, met behoud van merkrood en papier-op-rood. De bestaande documentatie is bewust niet gewijzigd. Beoordeel na integratie ook systeempanelen, foto's op een echt OLED-toestel en VoiceOver. Geen Apple-upload of nieuwe distributiebuild uitgevoerd.
