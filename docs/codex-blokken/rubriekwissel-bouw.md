# Rubriekwissel · korte crossfade

3 november 2026 · branch `rubriekwissel-bouw` vanaf H `3a201bf`. Alleen lokaal, geen beschermde bestanden, main, distributiebuild of publicatie gewijzigd.

## Voor en na

Voorheen wisselde web de inhoud direct en schoof de indicator langer. iOS animeerde wijzigingen op de eerste artikel-id met een inschuifbeweging, ook wanneer een andere rubriek werd gekozen. Nu vervagen tekst en beeld samen in **200 ms**, met dezelfde `ease-glide`-curve als de indicator en zonder verticale transformatie.

De nieuwe rubriek begint bij een bewuste tik bovenaan, zoals concept A. Web behoudt de bestaande geschiedenis en artikelgebonden leespositie bij browser-terug; een nieuwe bewuste keuze wist alleen de positie voor die combinatie. Native bewaart de rubriek via SceneStorage; een bewuste tabkeuze gaat zonder scrollanimatie naar boven. Dit pakket introduceert geen nieuw stelsel van onthouden pixelposities per native tab.

De eerste maximaal drie zichtbare artikelbeelden worden waar nodig voorgeladen, op dezelfde passende afbeeldings-URL’s als de echte rijen. Beeld uit/alleen hoofdverhaal veroorzaakt geen extra Stroom-downloads. Een slecht of traag beeld mag niet onbeperkt blokkeren: na maximaal 600 ms gaat de keuze door met de bestaande afbeeldingsweergave/fallback. Geen nieuw beeldproxy- of zoekpad. Bij Verminder beweging wordt zonder die wachtronde direct gewisseld.

## Uitvoering

Web bewaart tijdelijk één stil oud paneel. Zichtbare geladen beelden en videoframes krijgen daarin een canvas-weergave van hun echte inhoud, zodat het oude beeld niet opnieuw moet decoderen of een gekloonde video kan gaan afspelen. Dit leest geen afbeeldingspixels terug en verstuurt niets. Het oude paneel is inert, buiten de toegankelijkheidsboom en zonder dubbele DOM-id’s. Een nieuwe keuze ruimt de vorige animatie op; na afloop blijft één levende lijst over. Het papier en de scroll-viewport blijven staan. De inhoud heeft tijdens de overgang minimaal de resterende viewporthoogte.

Native gebruikt hetzelfde `RubriekVlak` in Stroom en de componentproef, met opacity-transitie en een minimumhoogte uit de gemeten viewport minus de gemeten titel/rubriekenkop. Een kortere of lege lijst maakt daardoor geen extra lege pagina onder de kop. Een vertrekkend vlak is niet aanraakbaar of hoorbaar. De indicator gebruikt dezelfde 200 ms-curve.

**Bewuste bewegingswijziging voor Claude:** de native algemene inschuifanimatie op een veranderde eerste artikel-id is verwijderd, omdat die ook rubriekwissels verticaal liet bewegen. Nieuwe native berichten krijgen in dit pakket geen afzonderlijke verticale inschuifanimatie; web behoudt zijn expliciete ‘nieuwe berichten’-animatie. Als die native invoeganimatie terug moet, doe dat alleen voor echt getoonde nieuwe berichten en los van de rubrieksleutel.

Voorladen heeft een laatste-keuze-wint-controle. Terug naar de huidige rubriek, een bron-/soortfilter, browser-terug, vertrek uit de Stroom of een nieuwe keuze maken oud wachtwerk ongeldig. Focus blijft op de gebruikte rubriekknop. De toegankelijkheidsmelding volgt één keer de werkelijk toegepaste rubriek; een geannuleerde keuze krijgt geen late melding. Native en web respecteren Verminder beweging ook voor de indicator.

## Meting en controles

Een eerste framemeting vond een eenhedenfout: een CSS-tijd van `0.2s` werd als 0,2 ms gelezen. Dat is opgelost met een geteste parser voor `s` én `ms`; geen wijziging aan de bestaande bewegingstokens. De fout geldt niet als het uiteindelijke resultaat.

De echte gebouwde web-app is met vaste openbare/synthetische invoer op een 390 px iframe bediend. In Licht, Donker en Nacht maten de frameproeven 200 ms voor oud/nieuw paneel én de indicator. De bovenkant bleef op 129 px en de viewport op 791 px; maximaal één oud paneel, na afloop nul. De nieuwe zichtbare foto en bronafbeelding waren geladen. Na snelle keuzes Binnenland → Alles → Tech bleef precies één levende Tech-lijst over. Geen skeleton op de gecachte rubriekwissel. De frame-JSON’s en voor/na-beelden staan naast dit verslag.

Werkelijke native componentrenders op 390 pt: vóór, tijdens en na de wissel in drie thema’s, plus directe wissel met de Reduce Motion-parameter. De geometriecontrole vond geen verschuiving van bovenkant/hoogte van het overgangsvlak. Dit is **geen** handmatig aangeklikte native Stroom-acceptatie. De testparameter dekt de componentkeuze voor Verminder beweging; de systeemschakelaar en VoiceOver moeten nog op een echt toestel worden bediend.

**1013 webtests geslaagd**, nul fouten, één bestaande TODO; build, core-generatie en harde acceptatie groen (uniekheid ≤0,38). **106 native tests geslaagd**, nul fouten, op de eindstand inclusief de kophoogtemeting. Bestaande SceneStorage-waarschuwingen in los gehoste rendertests zijn geen bewijs van echte SceneStorage-terugkeer; die handmatige proef blijft open.

## Tokengaten en overdracht

Geen nieuwe visuele tokenwaarden: 200 ms / ease-glide zijn bestaande waarden. De native constante spiegelt dezelfde duur. De technische voorlaadlimiet van drie beelden en deadline van 600 ms zijn lokaal benoemd; Claude kan die later centraliseren als technische policy, zonder de beweging te veranderen.

H is de basis; neem alleen deze productcommit na H over. J raakt eveneens styles.css maar voegt uitsluitend een apart Nacht-blok toe. Bij combineren moet J’s hele-CSS-baseline de expliciet goedgekeurde crossfaderegels meenemen; kleurwijzigingen blijven verboden buiten Nacht. Het pullpakket raakt StreamView alleen bij `hootRefresh(indicator: true)`; behoud beide veranderingen. Native handmatige tik-/scroll-/VoiceOverproef blijft als keuring voor Claude open. Geen productonboarding gebouwd.

### Laatste onafhankelijke codecontrole

Voorladen probeert een originele fallback-URL maximaal één keer, ook als de browser spaties of accenten normaliseert. Daar is een extra regressieproef voor toegevoegd. Native kiest de eerste drie beelden uit dezelfde reeds ontdubbelde lijst die daadwerkelijk wordt getoond. Web bewaart alleen zichtbare beelden als bitmap; bij een verborgen Stroom wordt geen oude paneelkopie bijgehouden. Dat voorkomt onnodige bitmapgeheugenbelasting door de rest van de zestig rijen. Een nog niet gestarte video behoudt zijn poster in het stille oude paneel.

Na deze controle: volledige websuite 1013 geslaagd + bestaande TODO, volledige native suite 106 geslaagd, eindbouw groen. De laatste viewportbeperking is daarnaast met de vijf gerichte proeven en een nieuwe echte browserframemeting getoetst: 200 ms, maximaal één oud paneel, nul na afloop, bovenkant 129 px, foto en logo geladen. De Redacteur-kern is niet aangepast; de harde acceptatie blijft groen. Codecontrole vond geen verdere blokkerende wijziging binnen dit pakket.
