# Build 42 · integratie en nieuwe onboarding · tussenstand

3 november 2026. Branch `build-42-integratie` vanaf H `3a201bf`. Alleen lokaal. **Nog niet klaar voor upload**: de verplichte schermbediening en bevestiging van het vrije buildnummer staan open. De term ‘build 42’ is vooralsnog het beoogde nummer.

## Opgenomen

A/B/C eenmaal via H. I (`4400e33`, `85777cf`, `356330d`), J (`b96f585`, `9b47578`, `25f1e05`, `2831a21`), K (`2367907`), pull (`84c98bb`, `ec78820`, `9ead0ae`, `5c03a2f`), bubbeluitleg (`9a9ccc8`). Concept- en rapportbranches niet overgenomen. De nieuwe onboarding is productcode op basis van het gelezen concept, niet een overgenomen docs-branch.

Eén inhoudelijk conflict: einde styles.css. Beide goedgekeurde appendices behouden. De eerste volledige testrun vond een ontbrekende witregel in de samenloop; hersteld door exact de goedgekeurde J-CSS plus het exacte I-appendix te gebruiken. Geen ruimere whitelist of gewijzigde baseline. De strikte kleurtest en daaropvolgende volledige suite slagen.

Bij de reeks cherry-picks meldde Git tweemaal een tijdelijke werkmapwijziging terwijl een volgende status schoon was. Daardoor bleken documentatiecommit 25f1e05 en K niet toegepast. Beide alsnog afzonderlijk toegepast. Alle gevraagde inhoud is aanwezig, maar die twee commits staan daardoor later in de lokale historie dan de gewenste volgorde. StreamView is automatisch samengevoegd; crossfade en hootRefresh-indicator zijn beide behouden. Geen CHANGELOG-conflict in deze actuele basis.

## Nieuwe onboarding

Vier bronstappen (interesses → volgen → indruk → overzicht), daarna afzonderlijk S1 + zoeken (werk/persoonlijk → domeinen → onderwerpen → voorbeeld). Bestaande bron- en vak-id’s, bestaande publieke opslag-API’s. Bestaande gebruikers worden via de bestaande onboarded-controle niet opnieuw binnengeleid. Heropenen begint bij huidige bronnen, interesses, subonderwerpen en Selectie; sluiten schrijft niets. Ook laat binnenkomende bronnen worden eenmalig ingelezen, zodat een vroege heropening geen lege voorkeuren opslaat.

Een doorlopende bronlijst, zoeken, Ontdekken op interesses, Alle bronnen alfabetisch en Volgend; geen bronpaginering. Sportbronnen pas bij expliciete Sport. Alleen expliciete volgknoppen veranderen de conceptkeuze. Na afronden zonder bronkeuze geldt het bestaande gratis begin; de preview zegt dit vooraf. Als alle beschikbare gratis bronnen al gevolgd zijn, wordt geen gratis buiten-bronnen-aanbeveling verzonnen: de preview meldt dat passend aanbod nodig is. Werk/persoonlijk zijn alleen ontdekfilters, geen nieuwe profielvelden.

De oude schermen blijven bewaard: web `NEW_ONBOARDING` in src/lib/follow-welcome.js, native `Onboarding42.enabled` in WelcomeView.swift. Beide staan standaard aan; terugzetten kan per platform zonder code te verwijderen. Selectie-voorbeelden zijn synthetisch en als voorbeeld gelabeld. Volledige stem-/designkeuring blijft bij Claude.

## Uitgevoerd

1020 webtests geslaagd, één bestaande TODO, nul fouten. Productbuild en core-generatie geslaagd; edition-core is ongewijzigd. Harde acceptatie groen, Jaccard 0,32 ≤ 0,38; golden ongewijzigd. Nieuwe tests toetsen volgen/ontvolgen, 20 bronnen, interesserangschikking, Sport, zoeken en opslaan/annuleren zonder het oorspronkelijke voorkeurenobject te muteren.

Definitieve iOS-run: 122 uitgevoerd, één bestaande opt-in systeemproef overgeslagen, nul fouten. Release-build voor generieke iOS-simulator (iPhone/iPad-architecturen) geslaagd. Dit zijn **geen** uitgevoerde handmatige Release-schermproeven op beide apparaten. De afzonderlijke opt-in systeemiconenproef loopt apart; resultaat wordt nog aangevuld. Logs en commitbinding: build-42-integratie/controle-stand.json.

## Niet bewezen / blokkades

De browser opende de echte nieuwe productroute en liet interesses kiezen en naar de bronpagina gaan. De eerste lokale fixture had geen kiesbare broncatalogus; die is daarna aangevuld met de bestaande openbare catalogus. De vervolgbediening kon niet worden afgerond: native opnamefout -3812 na één herstelpoging, daarna ook CDP-timeout. Geen screenshots of afgeronde flows geclaimd die niet zijn uitgevoerd.

Open: volledige route volgen, teruggaan, bewaren en annuleren op web én Release-iPhone/iPad; XXXL/AX5, VoiceOver, Verminder beweging; gecombineerde crossfade/pull, video en alle instellingen; oude→nieuwe workerproef op deze uiteindelijke bundel. De eerdere losse pakketbewijzen vervangen deze gecombineerde acceptatie niet. Alle schermbeelden voor deze build ontbreken nog.

App Store Connect: bestaande Brave-sessie is ingelogd; App Store-versie 1.0.1 is Waiting for Review. TestFlight-link geopend, maar de opnamefout verhinderde het uitlezen van de buildlijst. Hoogste nummer dus niet bevestigd. Geen buildnummer verhoogd, geen Release-archive/distributie-export of upload uitgevoerd; fase 2 blijft dicht totdat fase 1/1b groen zijn. Geen nieuwe credentials gevraagd.

## Voor Alex / Claude

Na herstel bediening: resterende controles uitvoeren, screenshotbewijzen toevoegen en pas dan ‘build-42-integratie klaar’ melden. Daarna vrij nummer verifiëren, bestaande signing gebruiken, alleen intern exporteren met testFlightInternalTestingOnly=true en uploaden naar Team Hoot. Geen Vrienden, geen App Review-indiening. Checklist voor echte iPhone staat in build-42-wat-te-testen.md.

Beschermde bestanden bytegelijk aan e09202c. Main niet gewijzigd. Geen push, tag, merge, websitepublicatie, Apple-upload of fysieke installatie. Redacteur en Apple-tokenintrekking zijn niet gewijzigd.
