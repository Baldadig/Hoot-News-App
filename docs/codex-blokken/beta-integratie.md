# Beta-integratie · overdracht aan Claude

Status: code, integratie, automatische controles en installatie afgerond op `beta-integratie`, vanaf Main `0a209da`. **Proefstart op de iPhone en gerichte native klikproef geslaagd. Volledige visuele/accountvrijgave blijft open. Geen releasevrijgave.**

## Claude · in één scherm

| Onderdeel | Stand |
|---|---|
| A · tien pakketten | Geïntegreerd, conflicten inhoudelijk opgelost, tests per stap groen. |
| B · acht Redacteur-punten | Gebouwd en gemeten. V2a-controle blijft 42/58; labelconflict Michigan nog open. V2b verzegeld. |
| C · audit | Duidelijke kleine punten hersteld. iPad-/AX-/VoiceOver- en ontwerpkeuring deels open. |
| D · iPhone 16 Pro | Beta 1.0.1 (39) geïnstalleerd en gestart; gegevens ook na de start behouden. Menu/telling gecontroleerd. |

**Eindcontrole:** 980 webtests + één bestaande TODO, 102 native tests; kern/build/golden en harde acceptatie groen. Jaccard nu/rijk 0,32/0,32. Nog twee lokale-betaguardtests groen. [Bewijs](beta/controle-FINAAL.json).

**Telregel:** hooguit tien genummerde verhalen; optionele bubbel apart erna. Tien is het doel, kwaliteit bepaalt het echte aantal. Onder zes verplicht kandidatenbewijs; vloer vier. Historische tekorten en overige normen staan in [beta-redacteur.md](beta-redacteur.md).

**Overnemen:** broncode tot `13232f9`; [commitvolgorde](beta/commits.txt), metingen en overlapkaart hieronder. Begin bij HootStore/Account, gedeelde kern, QuietMotion, lezer, Components, Editie/CSS en changelogs. Bewaar alle inhoudelijke samenvoegingen.

**Vóór release:** Sharp/Linux-koude start, golden-diff, verse dagproef, echte accountsync, native visuele/VoiceOver-keuring. Backend is niet gedeployd. Lokale meldingen worden niet verstuurd. `HOOT_LOCAL_BETA` staat alleen in de lokale bouwopdracht; dat argument hoort niet in de officiële build.

Main, landing en versienummers zijn behouden. Geen push, merge, deploy of upload. **Geen build 40 gestart.** [Alex’ testlijst](../../BETA-TESTLIJST.md).

## Grenzen

Alleen lokaal integreren, testen, committen en beta-installatie op het aangewezen testtoestel. Geen push, main-merge, deploy, upload, versie-/buildnummerwijziging of schrijven naar Netlify/Apple/Supabase. landing blijft bytegelijk aan main. Build 40 vereist een volgende expliciete opdracht.

## Volgorde en controlelog

A: beveiliging → rustige voorpagina → editiekop/deelkaart → lezer-wachttekst + paneeldelta → onboarding → Stroom/Selectie → nummering → categoriegegevens/docs → Nacht + aparte native profielkoppeling. Daarna B: bundelgrens, bronweging, intro/balans, onderwerp-land, toelating/aanvulling, filler, waarom/eindkaart en lokale feedback. Daarna C: audit/klikcontroles; D: lokale telefoonbeta en testlijst.

Alleen V2a wordt gebruikt voor ontwikkeling/meting. V2b is verzegeld en wordt niet ingezien of gescoord bij het afstellen. De bestaande acceptatiemaat uniekheid is Jaccard-overlap: lager is beter; grens nu maximaal 0,38, niet verruimen.

Per stap komen broncommits, conflictoplossing en echte testresultaten hieronder. Niet-uitgevoerde proeven worden niet als geslaagd vermeld.

### A01 · Beveiliging

Broncommit 3ec9058 overgenomen als 24a05a5; geen conflict. Sessiegeneratie/accountgrens en Sharp 0.35.5 overgenomen. Eigen node_modules met npm ci uit de lockfile: de voorgeschreven gedeelde symlink wees nog op Sharp 0.33.5 en is daarom vervangen zonder Main-dependencies te veranderen. Runtimeversie lokaal werkelijk 0.35.5. Web 906 geslaagd + 1 TODO, build groen; native 59 geslaagd; acceptatie alle harde drempels gehaald. Core opnieuw gebouwd zonder wijziging. Linux/Netlify cold-start blijft een externe releasecontrole, niet uitgevoerd of gedeployd. [Logverwijzingen](beta/controle-A01.json).

### A02 · Rustige voorpagina

Broncommit 38979d9 overgenomen als d688bfd; geen conflict. Web 914 geslaagd + 1 bestaande TODO, native 59 geslaagd, build en alle harde acceptatiedrempels groen. Core opnieuw gebouwd zonder wijziging. [Logverwijzingen](beta/controle-A02.json).

### A03 · Desktopkop en deelkaartlogo

98dd0e1 → eb5b360 en ddc9b09 → 36c4a4a. Desktopkop normaal toegepast; alleen ios/CHANGELOG.md botste bij het logo. De beveiligingsregel én logoregel zijn behouden. Web 916 geslaagd + 1 bestaande TODO, native 60 geslaagd; build en alle harde acceptatiedrempels groen. Core ongewijzigd. Logo’s blijven offline ingebed. [Logverwijzingen](beta/controle-A03.json).

### A04 · Lezerwachttekst en inlogpaneel

7ec70f1 → 3f1187b, daarna uitsluitend de delta-patch vanaf 7552530 → 6874b47. ArticleReaderView en changelog automatisch inhoudelijk samengevoegd; geen dubbele basispatch. Het paneel bewaart zeven dagen stilte en maximaal één herinnering. Web 918 geslaagd + 1 bestaande TODO, native 70 geslaagd, build en alle harde acceptatiedrempels groen. [Logverwijzingen](beta/controle-A04.json). De meegeleverde historische logs bevatten witruimtewaarschuwingen; productcode niet. De refreshcallback volgt bij A07.

### A05 · Onboardingbronnen

f568f7f → 00aa0e4, 476370d → 7155b13 en a1e5521 → 29b78c0. Alleen het beoordeelde bronraster en vijf herstelpunten; geen latere kop-/animatiecode. CSS met desktopkop automatisch gecombineerd. Beide changelogconflicten opgelost door alle onafhankelijke regels te behouden en de nieuwe regels onder één Onuitgebracht-kop te zetten. De aantallen en definitieve logs staan in [controle-A05](beta/controle-A05.json); alle checks groen.

### A06 · Stroom en Selectie

e164349 → 720f32c, e2c76c7 → 9eb7cca. CSS-staart bevat zowel het bronraster als Selectie-navigatie; alle changelogregels behouden. HootStore combineerde schoon met Main-fase 1. Extra commit 2bebb2b migreert alleen ontbrekende Bluesky-keuzes; expliciet [] blijft uit, met herstart-/importtests. Web 923 geslaagd + 1 TODO, build en alle harde acceptatiedrempels groen. Eerste native compile faalde op Observation-initialisatie; lokale inleesvariabele hersteld, daarna volledige native suite 84 geslaagd. Webcode niet gewijzigd bij dit compileherstel. [Logs inclusief herstel](beta/controle-A06.json). Echte account-sync blijft ongeprobeerd.

### A07 · Nummering en wachtmarkering

794c2d1 → 9242495 en b05e268 → 973f528. CSS-conflict bij het bestandseinde opgelost met behoud van bronraster, Selectie-index én cijfervakken. QuietMotion combineerde automatisch: label voor lezer blijft instelbaar, indicator/onWaiting-callback blijft beschikbaar. Changelogregels allemaal behouden. Web 923 geslaagd + 1 TODO, native 86 geslaagd, build en alle harde acceptatiedrempels groen. [Logverwijzingen](beta/controle-A07.json).

### A08 · Categoriegegevens en verzegeling

086a179 → 98a1bb9, 1aeace3 → a7b5426, 0cf994b → 346a56b; V2b 9933b59 → e6f491e en 6b48dff → 4d277c3. Definitief V2a-bewijs apart meegenomen zonder oude losse patch. Geen classifier gewijzigd. V2b uitsluitend als verzegelde data geïntegreerd; de guard controleert hashes/herkomst zonder classifier te importeren. Geen V2b-koppen of labels ingezien of voorspellingen erop gemaakt. V2a-nulmeting reproduceert 107/134 ontwikkeling en 42/58 controle, bekende regressies 3/4. Web 924 geslaagd + 1 TODO, native 86 geslaagd, build en alle harde acceptatiedrempels groen. [Logverwijzingen](beta/controle-A08.json).

### A09 · Onderzoeken/documentatie

824c364 → 5ad2dbd; definitieve Selectie-overdracht en Stroomonderzoek met meetbewijs → 24627a2. Geen nieuw ophaal-/onderzoeksscript of productwijziging. Web 924 geslaagd + 1 TODO, native 86 geslaagd, build en alle harde acceptatiedrempels groen. [Logverwijzingen](beta/controle-A09.json).

### A10 · Nacht en native profielkoppeling

1062541 → 4ddd6de, d1ac35f → af54c3d, c606a4a → 967ad70, 3d5f798 → 5bf5348. Laatste rapportregel uit bc46edb apart meegenomen (a507433), de geneste 17-MB-patch niet gedupliceerd. App.jsx behoudt zowel themeDark-afhankelijkheden als syncStatus/syncPulled voor eigenaarisolatie. ArticleReaderView behoudt het nieuwe wegklikpaneel, de vertraagde laadtekst én Nacht-HTML/achtergronden; het oude paywallNote-blok is niet teruggezet. ReaderLoginPanel gebruikt al de centrale Theme.paper en wordt zo zwart. Components combineert beeldfallback, nummering en Nacht; QuietMotion blijft compleet. Changelogs onder één kop gecombineerd.

Aparte koppeling eb3661f: theme/themeDark als gevalideerde strings in native import/export, ontbrekende oude velden bewaren lokale keuze, ongeldige strings vallen terug. HootApp meldt UserDefaults-wijzigingen aan HootStore; alleen een veranderd themapaar telt op. Remote apply zet eerst de echo-grens en schrijft daarna AppStorage, zodat vertraagde notificaties niet terugschrijven. Vier nieuwe integratietests, inclusief lokale profielronde zonder netwerk. Web 930 geslaagd + 1 TODO, native 96 geslaagd, build en alle harde acceptatiedrempels groen. [Logverwijzingen](beta/controle-A10.json). Dit bewijst geen echte twee-apparatensync.

### B01 · Gebeurtenisbundels

8818e68; aparte broncodecommit. De volledige nacontrole B01-R1 is groen: 935 webtests + 1 TODO, 96 native tests, build en harde acceptatie. Jaccard nu 0,34, rijk 0,36. De eerder geteste 17f45fa is vervangen na inhoudelijke nacontrole op onbedoelde taalsplitsing; B01-R1 is het beslissende bewijs. De gegenereerde native kern bleef bij die laatste servercorrectie bytegelijk. Zie [Redacteur-verslag](beta-redacteur.md) en [definitieve logs](beta/controle-B01-R1.json).

### B02 · Historisch: tijdelijk apart gehouden, inmiddels geïntegreerd

765f865 bewaard op beta-bronweging-proef. Volledige native suite 96 groen, build en externe harde acceptatie groen; web 937 geslaagd + één echte dagreeksregressie + één bestaande TODO. De nieuwe lezer krijgt in één Middageditie vijf plekken tegenover de vaste ondergrens zes. Geen grens aangepast; eerst het conflict kwaliteit/korter versus minimum zes verduidelijken. Met reset --keep is uitsluitend de eigen ongepubliceerde proef uit de actieve branch gehaald; commit en meetbewijs blijven behouden. De branch blijft op de groene B1-basis voor de onafhankelijke B6/B4-werkzaamheden.

### B02 definitief · bronweging en aanbodbewijs

De bronweging is na Alex’ normantwoord teruggenomen in de actieve beta. Tien als doel, bewijs onder zes en vloer vier, geen andere drempel versoepeld. B02-R1 volledig groen (966 web + één bestaande TODO; 98 native). Details en korte Middageditie in `beta-redacteur.md` en `beta/B02-shortages.json`.

### B03/B04/B06 · kern en weergave

B06 koppen/introfilter groen (961 web, 98 native). B04 onderwerpplaats groen (969 web, 98 native); V2a-controlepercentage blijft 42/58 en is dus open kwaliteitsdoel. B03 vaknieuws/aanvullen definitief groen (971 web, 99 native), met tien als doel en bewijs onder zes. Zie beta-redacteur.md voor afwijkingen, eerdere mislukte rondes en resterende serverafhankelijkheid.


### C · Kleine auditpunten en resterende keuring

Stroom gebruikt nu dezelfde normale titel-plus-wachtregel als Editie, met refreshcallback en zonder overlay. Dichte ChoiceChip blijft minstens 44 pt; de WelcomePages-berekening is tegelijk op 44 gezet, zodat de paginering rekening houdt met de echte hoogte. README noemt voorpagina-miniaturen nu consequent 3:2. Het aparte bubbelblok herhaalt de algemene bubbelkop niet; signalenherkomst blijft zichtbaar. Ook de losse accountpagina zegt nu dat alleen een account op uitnodiging is.

C01: 980 webtests + bestaande TODO, 101 native tests, kern/build en harde acceptatie groen (`beta/controle-C01.json`). De laatste eenvoudige accounttekst/nil-label-opruiming komt mee in de finale gezamenlijke nacontrole. Browserbewijs op 390 px: `beta/C-bubbel-390.png`. Reader-login en laadtekst blijven gedekt door de geïntegreerde native tests, inclusief zeven dagen en maximaal één herinnering.

De eerdere native iPad-proeven en hun grenzen staan in `beta/C-native-proeven.json`: rotatie, popover, onderwerpindex openen, bronkeuze terug/vooruit en annuleren zonder opslaan werkten via AX; volledige visuele sprongpositie, exact 699/700 pt, hardwaretoetsenbord en VoiceOver zijn niet vrijgegeven. De laatste native bediening meldt een vergrendelde Mac; de bestaande ontgrendelvraag staat open. De automatische tests vervangen deze keuring niet. D5 (RGB-afstand versus Delta-E), metaregel-/uitlijningskeuzes en reader-tussenkoppen op AX-maten blijven expliciet bij Claude/Alex; geen oude afgewezen concepten teruggebouwd.

### Actuele korte Edities

De laatste momentopname heeft voor alle twaalf testprofielen tien genummerde verhalen, optioneel één bubbel erna (`beta/B-final-telling.json`). De historische dagproef blijft kort voor nieuw/ochtend (vier; alle varianten), nieuw/middag (vijf; code/drie/account) en VS zonder Wereld/ochtend (vijf; alle varianten). Elke onder-zes-uitkomst heeft volledig bekend kandidatenbewijs, nul onverklaarde afvallers en geen reeks onder vier (`beta/B-final-shortages.json`). Dit bewijst het bekende feedaanbod, geen uitputtende zoektocht bij alle uitgevers. Zes is geen nieuw streefaantal: tien blijft het maximum/doel, kwaliteit begrenst het echte aantal.


### D · Lokale iPhone-beta

Broncode heeft een uitsluitend via de bouwopdracht ingeschakelde `HOOT_LOCAL_BETA`-guard. Die leest/wist de bestaande Keychain-sessie niet, biedt geen accountlogin aan en blokkeert accounttransport, tokenverversing en directe Google/Apple-routes. Dat is nodig om de opdracht ‘geen Supabase-writes’ ook bij Alex’ bestaande sessie te respecteren. Zonder dit compile-argument blijft de officiële accountwerking behouden; er is geen projectinstelling of versienummer gewijzigd. Twee expliciete flagtests op de iPad-simulator slagen: nul accountverzoeken bij een nepsessie en geen gewiste keuzes. De volledige normale suite blijft groen: 980 webtests + bestaande TODO, 102 native tests, kern/build en harde acceptatie (`beta/controle-FINAAL.json`). B08 is inmiddels ook met exit 0 afgerond; de extra 600 seconden waren Xcode-diagnostiek na de al geslaagde tests. Latere rondes schakelden alleen deze logverzameling uit, niet tests of drempels.

Debug-build is met het bestaande ontwikkelprofiel ondertekend, handtekening gecontroleerd en als update op **iPhone van Alex · iPhone 16 Pro** geïnstalleerd: **1.0.1 (39)**, bundel `nl.hootnews.Hoot`, API `https://hootnews.nl`. Geen uninstall, archive, Apple-upload, provisioning-update of serverdeploy. Eerste bouwpoging met handmatige ondertekening weigerde het Xcode-beheerde profiel; de geslaagde herhaling gebruikt automatische selectie van precies hetzelfde bestaande profiel, zonder `-allowProvisioningUpdates`.

De eerdere startpogingen liepen vast op verbinding/vergrendeling. Na Alex’ ontgrendeling is de app wél succesvol gestart; gerichte native menu-/telcontrole en gegevenscontrole na de start zijn bevestigd (zie de aanvulling hieronder). Voor/na installatie zijn bron-/interesse-/Selectie-/Bluesky-keuzes, smaak, weergave, eigenaar, Bewaard en gelezen gelijk gebleven (`beta/D-device-preservation.json`). Back-ups staan privé buiten Git in `/tmp/hoot-beta/device-backup`; geen voorkeurinhoud in de overdracht. De genoemde `import.json` is niet gevonden; de echte bestaande gegevens zijn behouden, geen persoonlijk importprofiel verzonnen of ingevoerd. De startcontrole is inmiddels uitgevoerd.

`BETA-TESTLIJST.md` is Alex’ korte proeflijst. Echte account-sync staat open voor de officiële integratie; `beta/TWEE-APPARATEN-CHECKLIST.md` geeft de concrete proef. In deze lokale beta blijven wijzigingen op het toestel. Een latere officiële sync kan accountkeuzes terugplaatsen; Claude moet de terugkeer naar de officiële build begeleiden.


## Gedetailleerde overnamekaart

- **A1–A10 geïntegreerd en getest:** beveiliging/Sharp, rustige API, desktopkop/deelkaart, lezer/wachttekst/inlogpaneel, bronraster, Stroom/Selectie, nummering, categoriegegevens, documenten en Nacht. Native Nacht-profielkoppeling apart in `eb3661f`. Alle oorspronkelijke overlappen zijn inhoudelijk gecombineerd; zie het log hieronder.
- **B1–B8 gebouwd:** bundelgrens `8818e68`; bronweging `1b00f25` + aanbodbewijs `8556c98`; intro/kopbalans `aee9a5d`; onderwerpplaats `7de240a`; vaknieuws/aanvulling `d0955e3`; videovulling `8a7c3b7`; telling `c5f6cdb`; redenen/eindkaart `82727db`; lokale meldingen `4bca693`. Lees [het meetverslag](beta-redacteur.md) vóór overname; alleen losse broncommits cherry-picken zonder hun genoemde voorwaarden is onvoldoende. De volledige volgorde staat in `beta/commits.txt`.
- **Norm:** hooguit tien genummerde verhalen, optioneel één bubbel ongenummerd erna. Tien blijft het doel, geen garantie. Onder zes verplicht aanbodbewijs; onder vier geen normale Editie. Geen drempel voor uniekheid verruimd. Zonder Wereld maximaal twee algemene internationale plekken; bewezen relevant vaknieuws valt daarbuiten. Binnenland opent Nederlands. Sportuitzondering blijft smal.
- **Eindcontrole:** 980 webtests groen + één bestaande TODO; 102 native groen; kern/build/golden en alle harde acceptatiechecks groen. Jaccard nu/rijk 0,32/0,32; twaalf actuele profielen tien gewone verhalen. Historische tekorten en kandidaatbewijs: `beta/B-final-shortages.json`. Laatste broncontrole: [controle-FINAAL](beta/controle-FINAAL.json). Aanvullend twee native lokale-betaguardtests groen.
- **iPhone 16 Pro:** lokale Debug-beta **1.0.1 (39)** met bestaand profiel geïnstalleerd, gegevens bij installatie behouden. Proefstart en gerichte native menu-/telcontrole inmiddels bevestigd. `13232f9` voegt uitsluitend via bouwargument `HOOT_LOCAL_BETA` een accountsynchronisatieblokkade toe; **dit argument niet in de officiële build zetten**. Bestaande Keychain-sessie wordt niet gelezen/gewist. API blijft hootnews.nl. [Testlijst](../../BETA-TESTLIJST.md) en [twee-apparatenproef](beta/TWEE-APPARATEN-CHECKLIST.md).
- **Niet af als productvrijgave:** V2a-controle blijft **42/58**, dus classificatiedoel niet gehaald; ontwikkelset wel verbeterd. V2b is verzegeld en bytegelijk. Niet afstellen op V2b. Backend niet gepubliceerd: nieuwe ingestrege categorisering/bundels komen pas na Claude’s deploy volledig beschikbaar. Lokale feedback wordt nog niet verstuurd. Geen nieuwe AI, database of account-API toegevoegd.
- **Keuring vóór officiële build:** Sharp 0.35.5 op echte Linux/Netlify koude start; HootStore/Account-eigenaar- en echo-overlap; alle golden-wijzigingen; verse dagproef en resterende korte Edities; koppen/intro’s/aanvulredenen; iPad exact 699/700 pt, index-sprong, AX-tekst en VoiceOver; twee echte apparaten en OLED/Nacht. Ontwerpkeuzes D5 en auditdetails blijven expliciet open. Backenddeploy, landing LIVE-vlag en Apple-release zijn van Claude/Alex.
- **Overlappen bij overname:** `HootStore.swift` (veiligheid, Bluesky, Nacht, Redacteur), `Components.swift` (Nacht, beelden, nummering, opties), `QuietMotion.swift` (lezertekst én refreshcallback), `ArticleReaderView.swift` (Nacht, laadmelding, inlogpaneel), `EditionView.swift` / `Edition.jsx` / `styles.css`, de gedeelde kern en de changelogs. Neem de oude volledige lezerpaneelpatch niet naast de reeds toegepaste delta over.
- **Extern meetpakket:** pas in Hoot-design achtereenvolgens `acceptatie-korte-editie.patch`, `acceptatie-vaknieuws.patch`, `acceptatie-genummerde-reeks.patch` toe (in `beta/`). Dit volgt Alex’ expliciete scope/telkeuzes; alle andere harde normen zijn behouden. De meetlat daar is lokaal reeds zo gecontroleerd.
- **Grenzen gehouden:** Main schoon/ongewijzigd, landing bytegelijk, app- en projectversies gelijk; alleen Sharp-dependency gewijzigd in package.json. Geen push, tag, merge, deploy, Apple-upload, login of Supabase-write. Build 40 is niet gestart. Patch en controle-instructies volgen bij ‘Levering’ onderaan.


## Levering

De complete binaire patch staat buiten de werkboom in `../Hoot-design/beta-integratie-2026-11-02/beta-integratie.patch.gz`. Zo bevat de patch zichzelf niet. Het bijbehorende `CONTROLE.json` noemt SHA-256, broncommit, de ongewijzigde Main-basis en de werkelijke `git apply --check`-uitkomst. De patch geldt als compleet integratiepakket; de individuele commits blijven de bron voor beoordeling per onderdeel. Controleer altijd eerst tegen de actuele Main, werk in een eigen branch en kies inhoudelijk bij overlap.

De simulatoren zijn teruggezet op Licht en Large, Verminder beweging uit; de iPad heeft weer de gewone (niet lokaal begrensde) testbuild. Browserproefvensters zijn gesloten. Geen echte accountproef of visuele vrijgave suggereren op basis van deze reset.

## Aanvulling · fysieke proef na ontgrendelen

De iPhone 16 Pro heeft de lokale beta succesvol gestart. Na eenmaal opnieuw verbinden van Device Hub werkte ook de schermopname. Echte native bediening gecontroleerd: Instellingen openen, de lokale accountpagina zonder login, terug/sluiten, lang drukken op een artikel, Meer/Minder zichtbaar, submenu met de vier foutredenen, sluiten zonder smaakkeuze of melding. De zichtbare nummering loopt tot 10; de bubbel is ongenummerd en apart na die reeks. Eindkaart: 10 van 10 en ‘Dan ben je bij.’ Controlebeelden `beta/D-iphone-*.png`. De bestanden/bron-/interesse-/Selectie-/Bluesky-/smaak-/weergave-/eigenaarskeuzes zijn ook **na starten** gelijk (`beta/D-after-launch.json`); de vastgelegde Editie heeft tien gewone verhalen en één bubbel.

**Nieuw concreet keurpunt, P1 vóór release:** het getoonde Michigan-verhaal krijgt in de persoonlijke kern al `desk: vs`, maar het artikel heeft de oude tag `middenoosten`. `labelFor`/`StoryLabel.strong` beschouwen elk Wereld-onderwerp bij een VS-plek als sterk; daardoor wordt op de echte iPhone ‘Wereld · Midden-Oosten’ getoond. Dit is dus méér dan alleen wachten op de backenddeploy. Claude moet de voorrang tussen concrete onderwerpplaats en gevolgde geografische tags in web én native corrigeren en op de actuele/bestaande feed controleren. Openbare kop/tags en reproduceerbare weergave-input staan in `beta/D-michigan-labelbewijs.json`. Geen nieuwe classificatieregel of V2b-afstelling gedaan tijdens deze status-/proefronde. B4 heeft nog geen inhoudelijke releasevrijgave.

Een kleine zichtbare tekstrest staat in SettingsView: ‘veelgelezen, niet in je Editie’ sluit minder goed aan op het nieuwe aparte extra blok. Bij keuring vervangen door bijvoorbeeld ‘Een extra verhaal naast je Editie’. Geen gebruikerskeuze gewijzigd tijdens de klikproef. Volledige iPad-resize-, AX-, VoiceOver- en echte syncvrijgave blijven open; de geslaagde gerichte iPhone-proef vervangt die niet.
