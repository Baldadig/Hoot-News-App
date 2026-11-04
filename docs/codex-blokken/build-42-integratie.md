# Build 42 · integratie en nieuwe onboarding · tussenstand

3 november 2026. Branch `build-42-integratie` vanaf H `3a201bf`. Alleen lokaal. **Actuele uitkomst: 1.0.1 (42) is intern geüpload nadat Alex het resterende handmatige testwerk zelf overnam. Zie build-42.md.** De onderstaande tussenstanden blijven als geschiedenis staan.

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

Definitieve iOS-run: 122 uitgevoerd, één bestaande opt-in systeemproef overgeslagen, nul fouten. Release-build voor generieke iOS-simulator (iPhone/iPad-architecturen) geslaagd. Dit zijn **geen** uitgevoerde handmatige Release-schermproeven op beide apparaten. Een afzonderlijke poging met SIMCTL_CHILD_HOOT_ICON_SYSTEM_PROOF=1 heeft de opt-in niet aan de testhost doorgegeven: ook daar is de systeemproef overgeslagen (één renderproef slaagt). Dit bewijst dus geen nieuwe cyclus door alle vier systeemiconen. Die controle blijft open. Logs en commitbinding: build-42-integratie/controle-stand.json.

## Niet bewezen / blokkades

De browser opende de echte nieuwe productroute en liet interesses kiezen en naar de bronpagina gaan. De eerste lokale fixture had geen kiesbare broncatalogus; die is daarna aangevuld met de bestaande openbare catalogus. De vervolgbediening kon niet worden afgerond: native opnamefout -3812 na één herstelpoging, daarna ook CDP-timeout. Geen screenshots of afgeronde flows geclaimd die niet zijn uitgevoerd.

Open: volledige route volgen, teruggaan, bewaren en annuleren op web én Release-iPhone/iPad; XXXL/AX5, VoiceOver, Verminder beweging; gecombineerde crossfade/pull, video en alle instellingen; oude→nieuwe workerproef op deze uiteindelijke bundel. De eerdere losse pakketbewijzen vervangen deze gecombineerde acceptatie niet. Alle schermbeelden voor deze build ontbreken nog.

App Store Connect: bestaande Brave-sessie is ingelogd; App Store-versie 1.0.1 is Waiting for Review. TestFlight-link geopend, maar de opnamefout verhinderde het uitlezen van de buildlijst. Hoogste nummer dus niet bevestigd. Geen buildnummer verhoogd, geen Release-archive/distributie-export of upload uitgevoerd; fase 2 blijft dicht totdat fase 1/1b groen zijn. Geen nieuwe credentials gevraagd.

## Voor Alex / Claude

Na herstel bediening: resterende controles uitvoeren, screenshotbewijzen toevoegen en pas dan ‘build-42-integratie klaar’ melden. Daarna vrij nummer verifiëren, bestaande signing gebruiken, alleen intern exporteren met testFlightInternalTestingOnly=true en uploaden naar Team Hoot. Geen Vrienden, geen App Review-indiening. Checklist voor echte iPhone staat in build-42-wat-te-testen.md.

Beschermde bestanden bytegelijk aan e09202c. Main niet gewijzigd. Geen push, tag, merge, websitepublicatie, Apple-upload of fysieke installatie. Redacteur en Apple-tokenintrekking zijn niet gewijzigd.


## Vervolg na ‘Probeer opnieuw’ · 3 november

De Release-simulator-app is op de bestaande iPhone 17 Pro geïnstalleerd zonder de app of container te verwijderen. De geïnstalleerde Mach-O is via SHA-256 bytegelijk aan de gebouwde Release-versie. Het huidige zichtbare nummer is nog 1.0.1 (39), afkomstig van de integratiebasis: het distributienummer wordt pas na de Apple-controle verhoogd. Dit is dus geen bewijs dat 42 al bestaat of is geüpload.

Echt bediend: openen van Editie, Instellingen, scrollen naar ‘Stel Hoot opnieuw in’, openen van de nieuwe onboarding met ‘Sluiten zonder opslaan’, bestaande Binnenland-keuze zichtbaar, Tech gekozen, Verder naar de bronlijst. De lijst toont Ars Technica, MIT Technology Review, TechCrunch, The Verge, Tweakers en Wired bovenaan; logo’s en beschrijvingen zijn zichtbaar. Volgen bij Ars Technica aangetikt, vervolgens een onbekende zoekterm ingevoerd; de correcte lege uitleg verschijnt. De volgende klik op Volgend viel uit voordat de resulterende toestand kon worden geverifieerd. Geen bewezen gefilterde lijst of opslaan/annuleren geclaimd.

Daarna opnieuw -3812; één herverbinding naar Device Hub geeft dezelfde fout. Daarom deze native sessie afgebroken volgens de opdracht, niet eindeloos opnieuw geprobeerd. Het simulatorvenster staat mogelijk nog in een onopgeslagen proefroute; bij de volgende geslaagde bediening eerst ‘Sluiten zonder opslaan’. Bron-/interessekeuzes zijn in deze proef niet definitief opgeslagen. Geen fysiek toestel gewijzigd.

Bewijs: iphone-editie-release.png, iphone-instellingen-release.png en onboarding/iphone-interesses-release.png, onboarding/iphone-bronnen-release.png. Dit bewijst uitsluitend deze iPhone/Licht-route op normale tekstgrootte; niet de volledige route, iPad, grote tekst of de overige thema’s. De open uploadvoorwaarden blijven ongewijzigd.


## Vervolg na tweede ‘Probeer opnieuw’ · 3 november

Native iPhone Release/Licht: de Volgend-lijst toont daadwerkelijk Ars Technica naast de drie bestaande bronnen. Daarna de hele route doorlopen: bronnenoverzicht met gratis VRT NWS buiten de eigen bronnen, afzonderlijke Selectie-intentie, Design & creatie, UI/UX en de voorbeeldpagina. ‘Sluiten zonder opslaan’ aangeklikt; terug in Instellingen zijn nog steeds 3 bronnen en 3 onderwerpen aanwezig. Hiermee is annuleren na een volledig doorlopen route echt bewezen.

Vervolgens opnieuw geopend: Binnenland blijft gekozen en Tech staat weer uit; Ars Technica staat niet meer in de eigen lijst. Dit bevestigt ook inhoudelijk dat de proefwijzigingen niet zijn opgeslagen. De tweede route doorlopen met de drie oorspronkelijke bronnen, UI/UX toegevoegd en ‘Naar je Editie’ aangeklikt. In Instellingen staan nu 3 bronnen en 4 gekozen Selectie-onderwerpen. Opslaan is daarmee eveneens werkelijk bediend en gecontroleerd. Alleen dit simulatorprofiel is gewijzigd.

Nacht ingesteld in de gecombineerde Release-app en de instellingen vastgelegd. Alle vier systeemiconen via de echte knoppen gekozen: Ruim rood → Rood op papier → Papier op inkt → Papier op rood. Elke wijziging toont de iOS-bevestiging; de geselecteerde staat is daarna gecontroleerd. Uiteindelijk rood hersteld en vastgelegd. Dit is de handmatige aanvulling op de nog overgeslagen automatische systeemproef. Het bewijst geen apart beginschermbeeld in donker/getint.

Daarna Donker gekozen en vastgelegd; Systeem gekozen, waarbij ‘Als het donker is: Nacht, echt zwart’ verschijnt. Bij het vastleggen/herstellen van die laatste weergave valt ScreenCaptureKit opnieuw uit met -3812. Eén herverbinding geeft dezelfde fout; de sessie is daarom gestopt. De simulator kan nog op Systeem staan; volgende bediening begint met herstel naar Licht. Geen opname loopt.

De lange bronlijst bevat in de AX-boom 279 onderdelen en wordt door de bediening tot 100 afgekapt. Filteren op Volgend maakt alle knoppen weer zichtbaar. Dit is een beperking van de bedieningsweergave, geen bewezen verlies van productbronnen. Een time-out tijdens een grotere actiecombinatie is opgevangen door de werkelijke schermstatus opnieuw uit te lezen; acties zijn niet blind herhaald.

Nieuw bewijs: onboarding/iphone-bronnen-overzicht-release.png, iphone-selectie-preview-release.png, iphone-annuleren-behoud-release.png, iphone-opgeslagen-selectie-release.png; en iphone-instellingen-nacht-release.png, iphone-instellingen-donker-release.png, iphone-iconen-rood-hersteld-release.png. Alleen bestanden die werkelijk zijn opgeslagen worden meegeleverd. Geen volledige iPad-, XXXL-, AX5-, Verminder-beweging-, VoiceOver-, workerupdate- of videoacceptatie geclaimd. Apple-buildlijst nog niet bevestigd en fase 2 niet gestart.


## Alex neemt resterende handmatige tests over · upload geautoriseerd

Alex heeft daarna expliciet gezegd: **‘Je mag van mij de build uploaden. Ik ga zelf testen.’** Daarmee vervalt voor deze uitsluitend interne testupload de eerdere blokkade op de resterende handmatige schermmatrix. De open controles zijn niet als geslaagd aangemerkt: ze gaan mee naar Alex. De automatische controles en pakketcontrole blijven vereist.

De bestaande Brave-sessie opnieuw gebruikt; TestFlight-buildlijst ververst. Voor 1.0.1 staat 41 bovenaan, daarna 40 Internal, 39 en 38. Bewijs: apple-hoogste-build-41.png. Daarom uitsluitend CURRENT_PROJECT_VERSION van 39 naar 42 verhoogd; marketingversie blijft 1.0.1. Distributiearchief en interne export/upload volgen via bestaande automatische Xcode-ondertekening, zonder nieuwe credentials. Definitieve uitkomst komt in build-42.md. Geen wijziging van de bestaande App Review-inzending.


## Definitieve interne upload

Alex nam de resterende handmatige tests expliciet over. Vrij nummer 42 geverifieerd, Release-archive en distributie-export/pakketcontrole geslaagd, uitsluitend intern geüpload om 14:30:34 Europe/Amsterdam met exitcode 0. Apple verwerkt de build nog; beschikbaarheid niet geverifieerd. Zie build-42.md voor het volledige resultaat, IPA-hash en wat Alex nog in TestFlight moet controleren. Geen mainmerge, push of websitepublicatie.
