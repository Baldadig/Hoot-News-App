# Pull-to-refresh · goedgekeurde h. op de integratie

3 november 2026. Alex heeft het interactieve concept expliciet goedgekeurd: ‘Pull to refresh akkoord.’ Extra pakket na ronde 3, branch `pull-refresh-integratie` vanaf H `3a201bf`. Geen uitbreiding van de inhoud van H zelf; Claude kan dit pakket apart beoordelen en meenemen.

## Opgenomen

Bestaande implementatie `06d5313` en bewijs `0827aac` overgenomen als `84c98bb` en `ec78820`. Alleen CHANGELOG had een conflict: de bestaande drie landingspagina-notities én de nieuwe trek-notitie zijn behouden. Native code conflicteerde niet. De browserconceptgoedkeuring is vastgelegd in de gezamenlijke overdracht; de beweging is niet opnieuw ontworpen.

Het bestaande echte h.-merk verschijnt in de lege trekruimte. De punt volgt de trekafstand en valt op zijn plek. Het merkteken raakt de tekst niet: de weergave blijft binnen de beschikbare trekhoogte en is geclipt. Bij Verminder beweging blijft de punt stil. Onder 72 pt loslaten of terugtrekken annuleert. Boven de drempel loslaten begint één verversing. Tijdens een lopend verzoek kan geen tweede starten. Gewone programmatische scrollbewegingen verversen niet.

De tekst ‘Even kijken bij je bronnen’ verschijnt pas bij echt laden, onder de titel van Editie/Stroom. De decoratieve trekmarkering is niet interactief en niet dubbel hoorbaar; de bestaande toegankelijkheidsactie Verversen blijft beschikbaar. De standaard browserversie krijgt hiermee geen nieuwe pull-handler: het door Alex bekeken HTML-bestand is het interactieve bewegingsconcept voor native.

## Gezamenlijke controle

Op de actuele A/B/C-integratie: **1008 webtests geslaagd**, nul fouten, één bestaande TODO; build, core-generatie en harde acceptatie groen, uniekheid ≤0,38. **109 iOS-tests geslaagd**, nul fouten, inclusief zes trek-/merkproeven. Bron, tests en renders staan in deze branch; `pull-refresh/` bevat de bestaande merkbeelden op 24, 48, 72 en 120 pt en Donker/Verminder beweging.

De browserklikproef van het concept is eerder echt uitgevoerd: onder de grens loslaten annuleert; boven de grens loslaten ververst één keer; de tekst staat niet tijdens trekken boven de inhoud; 390 px zonder horizontale overloop; Verminder beweging houdt de punt stil. Alex heeft deze vorm daarna goedgekeurd.

## Native handmatige proef: beperkt

Device Hub kon de geïnstalleerde simulator-app openen en het scherm tonen. De opname werd gestart, maar de daadwerkelijke dragopdracht verloor het venster (‘noWindowsAvailable’). Device Hub is opnieuw geselecteerd en de opname is gestopt; er loopt geen opname door. Een stilstaand appscherm of opname zonder trekbeweging is **geen** geslaagde gebarenproef en wordt niet als bewijs geleverd.

Open voor Claude/Alex: de echte vingerproef in Editie en Stroom, terugtrekken, een tweede trek tijdens laden, en Verminder beweging op een fysiek toestel. De automatische fase-/drempeltests en werkelijke SwiftUI-merkrenders zijn wel groen. Geen installatie op een fysieke iPhone en geen nieuwe TestFlight-build of upload gedaan.

## Integratie naast I/J/K

Deze branch bevat H al. Neem alleen de twee pull-commits en het verslag over nadat H is geïntegreerd. I raakt ook StreamView, maar de pullwijziging daar is uitsluitend `indicator: false` → `true`; behoud bij samenvoegen I’s crossfade, voorladen en hoogtemeting. QuietMotion is alleen in dit pakket gewijzigd. J’s centrale Nacht-rollen kleuren het teken en de punt vanzelf correct; geen extra themakoppeling of icoonwissel toevoegen. De Redacteur, Account, HootStore, landingspagina en design-systembestanden zijn ongewijzigd.
