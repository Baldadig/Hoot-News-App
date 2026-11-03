# Overdracht Claude · Build 44 · 3 november 2026

Status: **Hoot 1.0.1 (44) op 3 november 2026 om 15:19:33 Nederlandse tijd succesvol intern naar Apple geüpload. Apple verwerkt het pakket.** Bestaande Xcode-aanmelding gebruikt; geen nieuwe credentials. `testFlightInternalTestingOnly=true`. Geen externe distributie, App Review, Git-push of main-merge. Interne beschikbaarheid na verwerking kon nog niet in App Store Connect worden geverifieerd: de schermbediening gaf fout -3811, ook na één herverbinding. Uploadbevestiging: `build-44/upload-resultaat.json` en `build-44/upload-bewijs.log`.

Branch `build-44-merkovergang`. Build 44 bevat de herstellingen die eerst voor 43 waren voorbereid, de merkkoppen/iris en nu ook de goedgekeurde refreshlader. Build 43 is niet als afzonderlijke beta gepubliceerd. Build 42 was eerder intern geüpload; zie het afzonderlijke verslag.

## Wat Alex vroeg en wat is gebouwd

- Volledige oorspronkelijke onboarding hersteld: rode intro, de drie oorspronkelijke Editie/Stroom/Selectie-slides en oorspronkelijke keuze- en irisflow. Alleen het bronnenraster is vervangen door een doorzoekbare volglijst met logo, naam, omschrijving, gratis/abonnement en Volgen/Volgend. Ontdekken rangschikt op de eerder gekozen interesses. De latere volledig nieuwe onboarding uit 42 is verwijderd. Ook web gebruikt weer de oorspronkelijke intro en keuzevolgorde.
- Het originele icoon (papier, zwarte h, rode punt) vervangt de optie Rood op papier. Opgeslagen `.paper`/`AppIconPapier` blijft compatibel. Rood blijft standaard; de zwarte donkere afbeelding blijft voor alle keuzes identiek.
- Boven Stroom, Selectie en Bewaard staat hetzelfde kleine originele Hoot-woordmerk als boven Editie. Zoeken krijgt dit ook, zodat openen op dat tabblad dezelfde irisbestemming heeft.
- Na doorlopen onboarding sluit de openingsiris naar de werkelijk gemeten punt linksboven op het actieve hoofdscherm. Geen hardgecodeerde schermcoördinaten. Alleen het actieve tabblad ontvangt de BrandHandoff. Een oude tab kan de nieuwe geometrie niet wissen: de registratie heeft een eigenaar. Er is een begrensde extra layoutwachttijd van maximaal 1 seconde; bij ontbrekende geometrie blijft de bestaande veilige vervaging beschikbaar.
- Verminder beweging behoudt de bestaande vervaging, zonder reis/iris. De eerste onboarding houdt zijn eigen rode introductieovergang.
- Tijdens visuele controle bleek de lege Bewaard-pagina verticaal gecentreerd op een deels witte achtergrond. De container vult nu de beschikbare hoogte en staat bovenaan; de papieren achtergrond vult daardoor het scherm. Na de definitieve Release-installatie opnieuw werkelijk aangeklikt en visueel geverifieerd; `build-44/bewaard-logo-definitief.png`. Het eerdere screenshot `bewaard-logo.png` bewaart de waargenomen fout voor vergelijking.

## Goedgekeurde refreshanimatie verwerkt

Alex keurde het interactieve voorstel goed en gaf opdracht de build intern bij Apple te uploaden. De productcode gebruikt nu `RefreshLoadingMark`: dezelfde h-vorm in de bestaande inktkleur, met een kleine rustige beweging van de accentpunt. Bij Verminder beweging staat de punt stil. De zichtbare zin “Even kijken bij je bronnen” is bij pull-to-refresh in Editie, Stroom en Selectie verwijderd; VoiceOver hoort “Bezig met verversen”. De indicator blijft binnen gereserveerde verticale ruimte, ook zonder eerder geladen inhoud. De bestaande eerste-laadmelding buiten pull-to-refresh blijft behouden. Er is geen extra wachttijd of tweede netwerkverzoek toegevoegd.

`build-44/refresh-voorstel.html` bewaart het eerder beoordeelde concept; het is geen extra productpagina.

## Uitgevoerde controles

- Web na onboardingherstel: 1021 tests, 1020 geslaagd, 1 bestaande TODO, geen fouten. Productiebouw geslaagd. Sindsdien alleen native merkkop/iriswijzigingen.
- Definitieve native suite inclusief de goedgekeurde refreshlader: 126 tests uitgevoerd, één bestaande opt-in overgeslagen, geen fouten. Inclusief drie BrandHandoff-tests, de bestaande trek/annuleer/één-verzoek-tests en een nieuwe renderproef op 320 pt met normale/grootste toegankelijkheidstekst en Verminder beweging. Vier renderbeelden onder `build-44/refresh-renderproef/`. Dit zijn automatische renderproeven, geen handmatige gebarentests.
- Het eerdere simulatorbeeld is aangevuld met een definitief ondertekend apparaatarchief en lokale IPA-export op broncommit `8dffcae`, inclusief refreshlader. Zowel archief- als IPA-handtekening geverifieerd. 1.0.1 (44), juiste bundle-id, privacy-manifest en drie alternatieve iconen aanwezig, export uitsluitend voor interne TestFlight-tests. Apple bevestigt de geslaagde interne upload; verwerking is nog niet als voltooid geverifieerd. Pakketcontrole: `build-44/pakketcontrole.json`.
- Device Hub, aparte lege iPhone 17 Pro iOS 26.0-simulator: alle vier oorspronkelijke introductieschermen werkelijk aangeklikt en vastgelegd. Daarna meteen lezen, upgrade naar build 44 met behouden simulatorgegevens. Stroom/Selectie/Bewaard werkelijk geopend; screenshots in de map. De simulator heet nog “Hoot Build 43 onboarding”; dat is de naam van het testtoestel, niet het ingebouwde buildnummer.
- Interactief refreshvoorstel: proefknop, voltooiing en Verminder beweging bediend, geen consolefouten.

## Nog zelf beoordelen

- De volledige bewegende koude-startovergang op ieder tabblad, op iPhone en iPad, en met Verminder beweging. De screenshots bewijzen de merkkoppen, niet de animatietiming op alle apparaten.
- Native nieuwe volglijst binnen de herstelde volledige keuze-flow, grote toegankelijkheidstekst en annuleren/heropenen. De vier introducties zijn aangeklikt; dat vervangt deze verdere acceptatie niet.
- Originele icoonkeuze en systeemdialogen in de uiteindelijke beta. De vier systeemkeuzes uit 42 waren eerder aangeklikt, maar het teruggezette originele beeld nog niet opnieuw als volledig systeemrondje.
- De goedgekeurde refreshbeweging in de uiteindelijke TestFlight-build zelf beoordelen; de automatische tests controleren onder meer annuleren, één lopend verzoek en renderen met grote tekst en Verminder beweging.

## Integratie

Basis 42: `77be144`. Origineel icoon: `54a42cd`. Onboardingherstel: `1f3e8c1`. Merkkoppen/iris/buildnummer 44: `1636035`. Lege Bewaard-uitlijning: `dd6fa0b`. Goedgekeurde refreshlader: `dce8abb` en `8dffcae` (definitieve archiefbron).

De beschermde Redacteur-, account-, opslag-, landingspagina- en design-systeembestanden zijn in dit vervolg niet aangepast. Geen DNS, Blobs, Supabase, classifierafstelling of productiedeploy.

## Lokaal installatiepakket

`build/ios-build-44/export-final/Hoot.ipa` (bewust buiten Git). SHA-256 `6b004139a935209a2bab0ea16f65e840d5aa295913d4b16860726bfd9f90e6cb`, 3821608 bytes. Dit is de lokale export van het definitieve archief. De oudere map `export/` bevat de eerdere proef zonder goedgekeurde refreshlader en is niet het te gebruiken pakket. De Apple-upload gebruikt hetzelfde definitieve archief met destination=upload; de lokale IPA-hash bewijst niet de ontvangen bytes bij Apple.

## Definitieve controle voor upload

Archief en IPA-handtekening gecontroleerd, juiste bundle-id, buildnummer 44, versie 1.0.1, privacy-manifest en drie alternatieve iconen. Geen import.json, diagnostische releaseconfiguratie of afwijkende HootAPIBase. Native runtimecontrole op deze Mac geslaagd (Sharp 0.35.5 en resvg); dit bewijst geen Linux-run. Beschermde bestanden opnieuw vergeleken met de build-42-basis: geen wijzigingen.
