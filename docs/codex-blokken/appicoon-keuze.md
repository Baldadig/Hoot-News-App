# App-icoonkeuze

3 november 2026 · branch `appicoon-keuze`, vanaf integratie `3a201bf`. Alleen lokaal. Geen buildnummer, push, upload, accountcode of HootStore gewijzigd.

## Wat is gebouwd

Papier op rood (A) is het primaire AppIcon. Ruim rood (B), Rood op papier (C) en Papier op inkt (D) zijn drie alternatieve appicon-sets. Iedere set heeft licht, donker en getint. De donkere afbeelding is bij alle vier **bytegelijk aan de bestaande donkere uitvoering** (SHA-256 `79085c6c00329bec72b1b1a04bbbac0cf48d3301e0c98c943f81a64fae3bb2b3`). Dat is de bestaande transparante merkvoorgrond; iOS levert de zwarte systeemondergrond. Geen koppeling aan de Hoot-leesstand.

De lichte PNG’s behouden exact het bestaande goedgekeurde beeld, met het overbodige alfakanaal verwijderd. De getinte variant gebruikt dezelfde SVG-geometrie als het voorstel, omgezet naar een ondoorzichtige grijswaarden-PNG. Alle twaalf bestanden zijn 1024 × 1024; vier lichte uitvoeringen zonder alfa, vier grijswaarden-uitvoeringen zonder alfa, vier identieke donkere voorgronden. Geen nieuw logo getekend. De bestaande lichte primaire uitvoering vervalt ten gunste van het door Alex gekozen rood; de bestaande donkere uitvoering blijft behouden.

De Xcode-buildsetting `ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES` laat Xcode zelf de primaire/alternatieve Info.plist-vermeldingen genereren. Geen handgeschreven dubbele CFBundleIcons-configuratie. Dit volgt [Apples alternate-icons-configuratie](https://developer.apple.com/documentation/xcode/configuring-your-app-to-use-alternate-app-icons). Voor de donkere transparante voorgrond en grijswaarden-getint volgt de assetcatalogus [Apples icoonconfiguratie](https://developer.apple.com/documentation/xcode/configuring-your-app-icon).

Instellingen → Weergave → App-icoon toont de vier voorbeelden met label en geselecteerd vinkje/rand. De rij groeit bij grote tekst en heeft minimaal 44 pt aanraakhoogte. VoiceOver gebruikt het label plus de geselecteerd-trait. De voorbeelden blijven de vier lichte ontwerpen tonen: zo kies je herkenbaar je variant, ook als iOS de beginschermiconen donker toont. De uitleg benoemt de gemeenschappelijke donkere uitvoering en de normale systeemmelding.

De systeemnaam is de waarheid (`nil` = A). Er is geen optimistisch vinkje, extra profielveld of account nodig. Terug naar A roept de primaire keuze aan. Bij heropenen/activeren wordt de werkelijke iOS-keuze opnieuw gelezen. Een lopend verzoek blokkeert dubbel tikken; fouten laten de oude keuze staan en geven een leesbare melding.

## Werkelijk gevonden en opgelost

De eerste simulatorproef wijzigde de systeemnaam al naar B, maar meldde de callback niet op tijd terug. Alleen op die callback wachten kan de keuzerij vastzetten. De adapter luistert daarom naar de callback **én** controleert de werkelijke systeemnaam; uiterlijk na tien seconden volgt een fout als iOS niets heeft bevestigd. Late callbacks kunnen de continuation niet tweemaal hervatten. Het systeemvenster wordt niet verborgen of automatisch weggeklikt. Dit is een vangnet op bewezen systeemstaat, geen nagemaakt succes.

De herhaalde proef op iPhone 17 Pro / iOS 26.0 Simulator is geslaagd:

```
roomy → AppIconRuim
paper → AppIconPapier
black → AppIconZwart
red → primary
```

De losse systeemproef is bewust opt-in (`TEST_RUNNER_HOOT_ICON_SYSTEM_PROOF=1`) zodat een gewone regressierun geen beginschermvoorkeur wijzigt. De laatste volledige native run zette dit aan: **109 geslaagde tests, nul fouten, nul overgeslagen tests**. De keuze eindigde op A. De eerdere vastgelopen callbackproef geldt niet als acceptatiebewijs; `controle-system-proof2.txt` en de volledige eindrun zijn dat wel.

## Controle en grenzen

1009 webtests geslaagd, één bestaande TODO, nul fouten; build, core-generatie en harde acceptatie groen. De aanvullende assettest controleert afmetingen, alfa, grijswaarden en het identieke donkere bestand. Na de laatste PNG-formaatcorrectie heeft Xcode de assets opnieuw succesvol gecompileerd; de productlogica is gelijk aan de volledige native eindrun. De gegenereerde app bevat drie alternatieve vermeldingen en alle vier de voorbeeld-assets.

Werkelijke SwiftUI-voorbeelden van de keuzepagina in Licht, Donker, Nacht, XXXL en AX5 staan in `appicoon-keuze/`. Dit zijn simulator-componentrenders. De systeem-API is daadwerkelijk gebruikt. Device Hub leverde tijdens de handmatige controle geen bruikbaar scherm terug; visuele Home-screen-keuring van licht/donker/getint, VoiceOver-bediening en een fysieke iPhone blijven voor Claude/Alex open. Een assetcatalogus of API-naam alleen bewijst die visuele systeemkeuring niet.

App-grootte gemeten op dezelfde arm64 Debug-simulatorconfiguratie, zonder testbundels: integratie 18.256.122 bytes → icoonkeuze 18.558.063 bytes: **+301.941 bytes, circa 1,65%**. Het tussentijdse generieke simulatorproduct bevatte twee architecturen en is uit deze vergelijking geweerd. Dit is geen IPA-/App Store-downloadgrootte. Zie `appgrootte.json`.

## Voor Claude

Review productdelta vanaf `3a201bf`; H zit al in de branch. Alleen de icooncommit overnemen na H, niet opnieuw A/B/C stapelen. Let bij integratie met Nacht op de centrale Theme-rollen: dit pakket verandert die niet. De vier voorbeeld-imagesets bevatten alleen de goedgekeurde voorstellen. `maak-iconen.mjs` documenteert de omzetting uit de bestaande voorstelmap. Geen design-system- of brand-guidebestand gewijzigd.
