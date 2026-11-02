# Blok 4 · Onafhankelijke categorie-testset

Branch `categorie-set`, basis `fae9926`. Blinde data bevroren in `086a179`, meetscript `1aeace3`, extra fixturebewaking `0cf994b`. Geen classifier, Redacteur, stories of iOS-core gewijzigd. Alleen gegevens, meting en bewijs.

## Herkomst en blindheid

De oorspronkelijke 150 gevallen blijven aanwezig. Alle oude publicatiedatums konden worden teruggevonden in de destijds opgeslagen snapshots: 23, 28, 29, 30 en 31 oktober. Huidige feeds kunnen een bestaande id een nieuwe publicatietijd geven; daarom zijn ze niet gebruikt om oude datums te reconstrueren.

Een onafhankelijke tweede agent kreeg uitsluitend id, bron, kop en intro van de 23 twijfelgevallen, zonder oude labels, voorspellingen of classifier. Uitleg in `categorie/tweede-review.md`, labels in `tweede-review-23.json`. Twee rubrieken wijzigen volgens die beoordeling: uj1vtn van VS naar onbekend (te weinig context), 13581lh van VS naar Overig (AI/economie). De eerste labels blijven als originalExpected bewaard. Dit zijn voorlopige modelbeoordelingen, geen menselijke gold standard. Landonzekerheid staat los van rubriekonzekerheid.

V2a bevat **200 koppen van 1 november**, van 67 bronnen. Nederlands en Engels, met onder meer Duitse en Franstalige context; de bronmetadata bewaart de talen. Verzameld via de 83 publieke brondelen in één verzamelronde. De API gaf bij 35 delen een andere werkelijke versie dan start aankondigde. ETags en ophaaltijden zijn vastgelegd; dit is **geen atomair identiek feedmoment**. Classificatie van de opgeslagen artikelen blijft reproduceerbaar.

Id, URL en oude storyIds uitgesloten; daarna conservatieve semantische vergelijking met alle 150 oude koppen. Onder meer verkiezingscampagnes, Binance, oude migrantenboot-/protestverhalen en reeds bekeken voorbeelden zijn geweerd. Dit veroorzaakt selectie-effecten: relatief veel sport en minder VS-campagnenieuws. De uitkomst is geen representatieve schatting van de hele feed.

Kop/intro werden zonder tags of voorspellingen aangeboden. Rubriek, onderwerpgeografie, hoofdonderwerp en handmatige gebeurtenis-/verhaalsleutels zijn vastgelegd en gehasht **vóór** de eerste classifiermeting. Bestanden en SHA256 staan in provenance.json. Ontwikkeling 137, controle 63; split op handmatige gebeurtenis-/verhaalgroep, met conservatief gedeelde groepen voor samenhangende Duitse protesten en Ajax-verhalen. Die groepen zijn alleen voor het voorkomen van meetlekken; ze zeggen niet dat Frankfurt en Keulen één gebeurtenis zijn. Sleutels zijn voorlopige annotaties, geen nieuwe productieclusters.

De classifieruitvoer uit de feed is tijdens annoteren niet bekeken en tijdens meten genegeerd. Het meetscript importeert de ongewijzigde lokale classifier. Geen regels afgestemd op ontwikkeling of controle. Na openen van de controle geen verwachtingen veranderd.

## Meting

| Set | Totaal | Zeker genoeg voor rubriekscore | Juist | Score |
|---|---:|---:|---:|---:|
| V1 ontwikkeling | 97 | 96 | 92 | 95,8% |
| V1 controle | 53 | 53 | 44 | 83,0% |
| V2a ontwikkeling | 137 | 134 | 107 | 79,9% |
| V2a controle | 63 | 58 | 42 | 72,4% |

De acht onzekere V2a-rubrieken worden niet als fout of goed geforceerd. Raw null bij de classifier: 71/137 ontwikkeling en 30/63 controle. Null kan een bedoelde Overig-categorie zijn; dat is expliciet zichtbaar naast de compatibele rubriekmatrix. Precision, recall, aantallen en verwarringsmatrix staan per rubriek en per onafhankelijke geografische klasse in `meting-*.json`.

**Geen losse land-precision/recall:** de huidige classifier geeft geen apart landveld terug. Geografische strata zijn dus groepen waarin rubriekprestatie wordt gemeten, geen verzonnen landvoorspellingen. Voor V1 is geografie niet volledig gelabeld; beoordeel die geografische uitsplitsing niet als nieuwe geografie-evaluatie. Voor een echte landmeting moet Claude eerst een apart onderwerp-landcontract toevoegen.

Vier bekende regressies zijn apart gehouden van de blinde meting. Michigan en India zijn echte opgeslagen feedartikelen. BBC/Den Haag en alleen-plaats-in-intro zijn expliciet synthetische minimale scenario's, geen verzonnen live bewijs. Drie van vier slagen. **Michigan blijft fout: Midden-Oosten in plaats van VS.** Dit is een te herstellen classifierprobleem, niet een reden het verwachte label te wijzigen.

## Reproductie en volgende controle

`node scripts/measure-categories.mjs` toont alleen ontwikkeling; `--final` opent controle; `--regression` alleen bekende regressies. Hash-, fixture- en groepscontroles falen bij gewijzigde blinde annotaties, gewijzigde daadwerkelijk gescoorde labels/tekst of een groepslek. Een alleen-in-geheugen gewijzigde rubriek is als bewakingsproef daadwerkelijk afgewezen; de opgeslagen labels bleven bytegelijk.

V2b blijft conform Alex' afspraak open: 50–100 koppen uit een werkelijk nieuwe verzamelronde op een volgende publicatiedag, vanaf 2 november. Eerst id/URL/gebeurtenissen tegen alle bestaande sets uitsluiten, blind labelen, vastleggen, daarna uitsluitend als controle gebruiken. **Nooit regels op V2b afstellen.** Geen taak of toekomstige verzameling automatisch ingepland.

Volledige websuite: 892 tests, 891 geslaagd, 0 fouten, 1 bestaande TODO; build geslaagd. Logs `/tmp/hoot-categorie-tests.log`, `/tmp/hoot-categorie-build.log`. Geen native wijziging. Geen push, merge of publicatie. De bijgewerkte patch omvat fixture, meetscript en de categorie-bewijsmap tot `0cf994b`; het verslag en de gzip zelf zijn uitgesloten om zelfinsluiting te voorkomen.
