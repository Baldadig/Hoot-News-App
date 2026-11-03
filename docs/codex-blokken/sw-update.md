# A · Web bundel-update

Branch sw-update vanaf main e09202c. Alleen lokaal; geen deploy. De oude prompt-worker hield HTML en een geïnstalleerde versie vast totdat de lezer handmatig vernieuwde of alle vensters sloot. Nieuwe netwerk-HTML alleen lost dit niet op: een open oude sessie heeft ook zijn nog niet geopende schermbestanden nodig.

## Wijziging

VitePWA injectManifest met een eigen worker. Precache volledig installeren vóór skipWaiting; daarna clients.claim zonder venster te herladen. HTML online NetworkFirst (no-cache), bij netwerkfout de opgeslagen shell. Registratie ontdekt updates bij laden, terugkeer en de bestaande periodieke controle; updateViaCache none. Een nieuwe app meldt zijn echte gebouwde bundel-URL. Geen onterechte updatebanner wanneer de geladen bundel al de huidige is.

Oude precachebestanden pas opruimen wanneer precies één appvenster over is én dat venster de huidige bundel meldt. Daardoor blijft een oude tab zijn lazy schermen vinden. Gehashte oude assetpaden worden met ignoreSearch in dezelfde precache gezocht: Workbox bewaart sommige bestanden met een revision-query. Feed- en beeldcache blijven afzonderlijk. Lokale voorkeuren, Bewaard, leesstatus en accountopslag worden niet gewist of gemigreerd.

De afbouw-worker op de oude rootscope unregistert zichzelf zonder clients.navigate. Een reeds geopende rootapp mag zijn opgeslagen publieke chunks blijven ophalen. Domeinverhuizing zelf, DNS, gebruikersdata-overdracht en de bestaande domeinmigratiecode zijn niet veranderd.

## Echte lokale overgangsproef

Werkelijke productiebuilds N/N1…N6, vaste openbare feed, synthetische instellingen/Bewaard/leesstatus. Hoofdproef na volledige installatie van N5:

1. N5 actief, entry index-DxO0DzXP.js, tien zichtbare nummers.
2. Server naar N6. Tweede appvenster krijgt index-DZLVofGD.js. Nieuwe worker geactiveerd, geen waiting worker.
3. Het oude N5-venster blijft staan en opent daarna zijn nog niet bezochte Instellingen. Onderaan staat nog vsw-N5: geen gedwongen herlading. De oude chunk is dus nog bruikbaar onder N6.
4. Tweede venster sluiten, normale volgende laadbeurt: N6-bundel, tien nummers, alle drie synthetische opslagwaarden behouden.
5. Alleen shellrequests bewust laten falen: dezelfde N6-shell, tien nummers en gegevens behouden. Dit is een gecontroleerde netwerkfoutproef, geen volledig offline toestelproef.

[Geïnstalleerde N5](sw-update/proof-installed-N5.json), [volgende N6-laadbeurt](sw-update/proof-next-N6.json), [terugval](sw-update/proof-offline-N6.json), [oude Instellingen](sw-update/old-N5-settings-under-N6.txt).

Een eerdere twee-tab-proef wisselde de testserver terwijl N5 nog aan het installeren was. Dat leverde een ontbrekende oude chunk op. Die proef is niet als geslaagd aangemerkt. Dit onderstreept de beperking: **de complete nieuwe shell moet eerst geïnstalleerd zijn**. Een deploy tijdens een lopende installatie kan die installatie laten mislukken; de bestaande worker blijft dan actief. “Eén volgende laadbeurt” geldt na succesvolle ontdekking/installatie, niet gegarandeerd vanaf het exacte deploymoment. Geen stille geforceerde reload toevoegen om dat te verhullen.

## Controle en grenzen

Na herstel van Dropbox opnieuw npm test: 1002 geslaagd, nul fouten, één bestaande TODO. Productiebuild en build:core geslaagd. Externe harde acceptatie apart uitgevoerd; zie de uiteindelijke overdracht voor de uitslag. Drie nieuwe regressietests voor veilig opruimen, scope/afzender en rootworker zonder navigatie/opslagwissen. Eerdere kern/goldencontrole was bytegelijk; laatste build:core mag geen beschermd kernbestand wijzigen.

Geen nieuwe dependencies of actuele serverdata geschreven. Linux/Sharp niet opnieuw als Linux gemeten; de lokale macOS-runtimecontrole slaagt. Geen fysieke geïnstalleerde iPhone-PWA en geen echte gethoot.app↔hootnews.nl-migratie bediend. Claude: keur die twee overgangen, bfcache/terugknop en lang openstaande tabs. Lang openstaande oude tabs houden cache langer vast; quota of installatiefouten kunnen automatisch bijwerken vertragen. Meerdere zeer snelle deploys tijdens installatie blijven een expliciet risico.

Reproduceren: bouw twee versies met verschillende HOOT_VERSION, bewaar dist als N5/N6 naast de proefserver, plaats een vaste openbare feed.json met meta.parts, start server.py en open probe.html. Zaai alleen de synthetische proefgegevens, installeer N5 volledig, volg stappen 2–5. De proefpagina/server zijn uitsluitend localhost-hulpmiddelen.

Bronnen: [Workbox PrecacheController](https://developer.chrome.com/docs/workbox/modules/workbox-precaching), [Vite PWA injectManifest](https://github.com/vite-pwa/vite-plugin-pwa/blob/main/docs/guide/inject-manifest.md). Deze ondersteunen de gekozen scheiding van installeren, activeren en opruimen; ze vormen geen bewijs dat alle toestelovergangen hier getest zijn.
