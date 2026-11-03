# Overdracht Claude · Build 44 · 3 november 2026

Status: lokale integratiebranch `build-44-merkovergang`. Geen push of merge. Geen upload van 43 of 44 uitgevoerd in deze ronde. Build 42 is eerder intern geüpload; zie het afzonderlijke build-42-verslag. Build 44 bevat de herstellingen die eerst voor 43 waren voorbereid, plus Alex’ nieuwe merkkop/irisverzoek. De afzonderlijke bronbranch `build-43-integratie` blijft beschikbaar; 43 is geen gepubliceerde beta.

## Wat Alex vroeg en wat is gebouwd

- Volledige oorspronkelijke onboarding hersteld: rode intro, de drie oorspronkelijke Editie/Stroom/Selectie-slides en oorspronkelijke keuze- en irisflow. Alleen het bronnenraster is vervangen door een doorzoekbare volglijst met logo, naam, omschrijving, gratis/abonnement en Volgen/Volgend. Ontdekken rangschikt op de eerder gekozen interesses. De latere volledig nieuwe onboarding uit 42 is verwijderd. Ook web gebruikt weer de oorspronkelijke intro en keuzevolgorde.
- Het originele icoon (papier, zwarte h, rode punt) vervangt de optie Rood op papier. Opgeslagen `.paper`/`AppIconPapier` blijft compatibel. Rood blijft standaard; de zwarte donkere afbeelding blijft voor alle keuzes identiek.
- Boven Stroom, Selectie en Bewaard staat hetzelfde kleine originele Hoot-woordmerk als boven Editie. Zoeken krijgt dit ook, zodat openen op dat tabblad dezelfde irisbestemming heeft.
- Na doorlopen onboarding sluit de openingsiris naar de werkelijk gemeten punt linksboven op het actieve hoofdscherm. Geen hardgecodeerde schermcoördinaten. Alleen het actieve tabblad ontvangt de BrandHandoff. Een oude tab kan de nieuwe geometrie niet wissen: de registratie heeft een eigenaar. Er is een begrensde extra layoutwachttijd van maximaal 1 seconde; bij ontbrekende geometrie blijft de bestaande veilige vervaging beschikbaar.
- Verminder beweging behoudt de bestaande vervaging, zonder reis/iris. De eerste onboarding houdt zijn eigen rode introductieovergang.
- Tijdens visuele controle bleek de lege Bewaard-pagina verticaal gecentreerd op een deels witte achtergrond. De container vult nu de beschikbare hoogte en staat bovenaan; de papieren achtergrond vult daardoor het scherm. Na de definitieve Release-installatie opnieuw werkelijk aangeklikt en visueel geverifieerd; `build-44/bewaard-logo-definitief.png`. Het eerdere screenshot `bewaard-logo.png` bewaart de waargenomen fout voor vergelijking.

## Belangrijke grens: refresh is een voorstel

`build-44/refresh-voorstel.html` is alleen het interactieve voorstel. Het toont de bestaande h-vorm met bewegende punt tijdens laden, zonder laadzin. Een te kleine trek annuleert, boven de drempel volgt een laadproef, daarna verdwijnt het teken. Verminder beweging zet de punt stil. Dit gebruikt proefinhoud, geen netwerkaanvragen. Het voorstel verandert nog niets aan `QuietMotion.swift` of de huidige laadteksten. Eerst Alex’ beoordeling.

## Uitgevoerde controles

- Web na onboardingherstel: 1021 tests, 1020 geslaagd, 1 bestaande TODO, geen fouten. Productiebouw geslaagd. Sindsdien alleen native merkkop/iriswijzigingen.
- Native na merkkop/iriswijzigingen: 125 tests uitgevoerd, 1 bestaande opt-in overgeslagen, geen fouten. Inclusief drie nieuwe BrandHandoff-tests: geometrievolgorde, wisselende eigenaren en behoud van de onboardingbestemming. De daaropvolgende ene layoutregel voor Bewaard wordt apart via de Release-build en schermcontrole geverifieerd.
- Native Release simulator, ondertekend apparaatarchief en lokale IPA-export geslaagd op broncommit `dd6fa0b`. Zowel archief- als IPA-handtekening geverifieerd. 1.0.1 (44), juiste bundle-id, privacy-manifest en drie alternatieve iconen aanwezig, export uitsluitend voor interne TestFlight-tests. Geen Apple-upload uitgevoerd. Pakketcontrole: `build-44/pakketcontrole.json`.
- Device Hub, aparte lege iPhone 17 Pro iOS 26.0-simulator: alle vier oorspronkelijke introductieschermen werkelijk aangeklikt en vastgelegd. Daarna meteen lezen, upgrade naar build 44 met behouden simulatorgegevens. Stroom/Selectie/Bewaard werkelijk geopend; screenshots in de map. De simulator heet nog “Hoot Build 43 onboarding”; dat is de naam van het testtoestel, niet het ingebouwde buildnummer.
- Interactief refreshvoorstel: proefknop, voltooiing en Verminder beweging bediend, geen consolefouten.

## Nog zelf beoordelen

- De volledige bewegende koude-startovergang op ieder tabblad, op iPhone en iPad, en met Verminder beweging. De screenshots bewijzen de merkkoppen, niet de animatietiming op alle apparaten.
- Native nieuwe volglijst binnen de herstelde volledige keuze-flow, grote toegankelijkheidstekst en annuleren/heropenen. De vier introducties zijn aangeklikt; dat vervangt deze verdere acceptatie niet.
- Originele icoonkeuze en systeemdialogen in de uiteindelijke beta. De vier systeemkeuzes uit 42 waren eerder aangeklikt, maar het teruggezette originele beeld nog niet opnieuw als volledig systeemrondje.
- Alex beoordeelt het losse refreshvoorstel voordat de productlaadanimatie wijzigt.

## Integratie

Basis 42: `77be144`. Origineel icoon: `54a42cd`. Onboardingherstel: `1f3e8c1`. Merkkoppen/iris/buildnummer 44: `1636035`. Lege Bewaard-uitlijning: `dd6fa0b`.

De beschermde Redacteur-, account-, opslag-, landingspagina- en design-systeembestanden zijn in dit vervolg niet aangepast. Geen DNS, Blobs, Supabase, classifierafstelling of nieuwe live publicatie.

## Lokaal installatiepakket

`build/ios-build-44/export/Hoot.ipa` (bewust buiten Git). SHA-256 `3734269d8fefbfbab14a7c3d0ce101733529c3426c33ca2da57c506731f06c30`, 3.810.115 bytes. Dit is de lokale export; er is in deze ronde geen upload verricht.
