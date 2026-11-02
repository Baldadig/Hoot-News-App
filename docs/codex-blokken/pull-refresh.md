# Pull-to-refresh · h. volgt de vinger

Afzonderlijk pakket op branch **pull-refresh-hoot**, vanaf main **78cd0a0**. Productcommit **06d5313**. **Niet opgenomen in de al geüploade build 40.** Geen buildnummer gewijzigd, niets gepusht of op een fysiek toestel geïnstalleerd.

## Gedrag

Het bestaande vectorpad van de Hoot-h blijft intact, in Theme.ink3 met de punt in Theme.accent. Bij trekken verschijnt het teken in de vrijgekomen ruimte boven de inhoud. De punt beweegt rechtstreeks met de trekafstand naar zijn gewone merkpositie; verder trekken geeft nog een kleine extra beweging. Geen los tijdgestuurd filmpje tijdens de trek en geen achtergrondvlak over de kop.

Loslaten op of boven de bestaande drempel van 72 pt start één refresh. Terugtrekken onder de drempel annuleert. Tijdens een lopend verzoek kan geen dubbel verzoek starten. Gewoon/programmatig scrollen start geen refresh. De bestaande VoiceOver-actie Verversen blijft beschikbaar. Bij Verminder beweging staat de punt op zijn gewone plek en volgt alleen de natuurlijke scrollruimte de vinger.

De bestaande laadregel onder de titel van Editie/Stroom verschijnt pas zodra de refresh echt loopt. Tijdens het trekken wordt daar geen extra rij meer tussen geschoven. Selectie gebruikt dezelfde trekmarkering en reserveert tijdens laden een eigen strook. De herbruikbare wachtmarkering in de artikellezer is niet gewijzigd.

## Broncode en verificatie

- `ios/Hoot/Views/QuietMotion.swift`: trektoestand, eigen merkmarkering, afgeschermde trekruimte en callback alleen tijdens echt laden.
- `ios/Hoot/Views/EditionView.swift`, `StreamView.swift`: trekmarkering ingeschakeld, bestaande laadregel behouden.
- `ios/HootTests/RefreshPullTests.swift`: loslaten, annuleren, klein gebaar, programmatige beweging, dubbele verzoeken, opnieuw trekken, VoiceOver-ingang en ongeldige afstanden. Zes gerichte tests groen, waaronder de renderproef.
- Beelden onder `pull-refresh/`: native componentrenders met SwiftUI ImageRenderer op 24/48/72/120 pt en donker/Verminder beweging. Het zijn geen screenshots van een volledige live scroll of bewijs van een fysieke klikproef. De h/punt en ruimte zijn visueel geïnspecteerd.

De eerste render-testbouw faalde omdat accessibilityReduceMotion een alleen-lezen omgevingseigenschap is. Hersteld door de presentatiecomponent de systeemwaarde vanuit de modifier mee te geven. Daarna alle zes gerichte tests groen. Geen nep-instelling of wijziging aan de systeemtoegankelijkheid nodig.

Definitieve ronde op productcommit **06d5313**: **108 native tests groen**, **999 webtests groen** plus één bestaande TODO; gedeelde kern, webbuild en alle harde acceptatiechecks groen. Bewijs: `beta/controle-PULL-REFRESH.json`. Geen acceptatiedrempel aangepast. De native simulator is teruggezet op licht, Large en Verminder beweging uit.

**Handmatige grens:** Device Hub kon aanvankelijk worden gelezen op de fysieke iPhone, maar bij selecteren van de simulator viel de opname uit met -3812; vervolgopnames bleven fout gaan. De app is wel via simctl op de test-simulator gestart. Er is geen betrouwbaar waargenomen veeggebaar vastgelegd. De componentrenders en toestandstests bewijzen dus niet de volledige natuurlijke trekervaring in een draaiende ScrollView. Claude/Alex keurt dit bij de volgende build: klein trekken en terugduwen, tot voorbij 72 pt en loslaten, nogmaals trekken tijdens laden, en grote tekst/Donker/Nacht/Verminder beweging. Het bestaande fysieke toestel is niet voor deze feature gebruikt. Webcode, Redacteur, server en de uploadbestanden van build 40 zijn ongewijzigd. Dit is native appwerk; op het web is geen eigen trekgebaar toegevoegd.
