# Blok 15 — categoriecontrole V2b

Branch `categorie-set-v2b`, basis actuele lokale main `e262b51`. **78 artikelen van 2 november, 50 bronnen, uitsluitend controle.** Geen classifier, Redacteur-kern, HootStore of landing gewijzigd. Geen voorspellingen voor deze set bekeken of berekend. Geen afstelling op V2b.

## Herkomst en blindheid

Nieuwe publieke verzamelronde op 2 november via `https://gethoot.app/api/feed` en de 83 brononderdelen. Alle 83 opgehaald; 3345 unieke items in die brononderdelen. Na uitsluiting van oudere publicatiedagen, bestaande id/URL/storyId waren er aanvankelijk 865 kandidaten. Root en delen zijn afzonderlijke HTTP-responses: geen claim van een atomair feedmoment. URL, ETag, SHA256 en ophaaltijd per deel staan in `categorie-v2b/collection.json`.

De blinde uitvoer bevatte id, bron, bron-taal, kop, intro, URL en publicatietijd. Geen desk, topics, score of classifieruitvoer. De onbewerkte bronresponsen bleven buiten de repo; hun hashes staan in de collectiegegevens. Voor de gebeurteniscontrole is de eerste selectie van 150 koppen naast alle oude koppen en handmatige gebeurtenissleutels gelegd. De referentie bevat de 150 oorspronkelijke gevallen, de 200 V2a-gevallen en vier aparte regressies. De compacte referentie staat in `baseline-overlap.json`; de hash van het oorspronkelijke fixturebestand is bij de verzameling vastgelegd.

De labels zijn bevroren in **`9933b59`**, vóór tests of een mogelijke categorie-evaluatie. `bevriezing.json` bevat de SHA256. De evaluatie van deze nieuwe holdout is bewust nog niet geopend. Gewone bestaande tests lopen wel, maar classificeren de V2b-artikelen niet.

## Overlap en werkelijke publicatiedag

Identiteit: exacte artikel-id, genormaliseerde URL zonder trackingquery en reeds bekende storyIds zijn automatisch geweerd. Daarna handmatige controle op dezelfde gebeurtenis of hetzelfde verhaal. Onder meer Michigan, Belgische begroting, de Formule 1/Mexico-titelrace, WCKT, Binance, India-protesten en de Patriot-deal zijn niet opgenomen. Gesyndiceerde koppen en vertaalde/herhaalde verhalen zijn maar één keer behouden. De afwegingen bij alle 150 bekeken kandidaten staan in `overlap-review.json`.

Drie extra artikelen zijn geweerd ondanks een nieuwe feedpublicatietijd: twee hadden een URL-datum van 1 november en één was al op 1 november waargenomen. Alle 78 bewaarde gevallen hebben zowel een publicatiedag als eerste waarneming op 2 november in Europe/Amsterdam. Een nieuwe publicatie mag wel over een gebeurtenis van gisteren gaan, mits dat verhaal niet in de oude sets voorkomt.

De semantische controle is een expliciete Codex-beoordeling, geen bewijs van een onfeilbare semantische detector. Conservatief weglaten van verkiezings- en beursverhalen veroorzaakt selectie-effecten; dit is geen representatieve steekproef voor een algemeen nauwkeurigheidspercentage.

## Labels

- Nederlands 45, Engels 32, Duits 1. De Duitse Merz-kop was door de bron als Engels gemarkeerd; de oorspronkelijke bron-taal is apart bewaard.
- Onderwerpen omvatten politiek, economie, lokale veiligheid, onderwijs, zorg, cultuur, tech en sport. Het oude rubriekcontract blijft gehandhaafd; hoofdonderwerp en onderwerp-land staan apart.
- Zes rubrieken en vijftien landen zijn onzeker gehouden. Bijvoorbeeld WA in een kop is zonder uitgeschreven plaats niet blind gelijkgesteld aan Australië; het land van de uitgever is niet het onderwerp-land.
- Zeven gevallen hebben geen voldoende afgebakende gebeurtenis-id. Er is geen fictief incident gemaakt van een algemeen essay of meerdere lokale incidenten in één liveblog.
- De Sovjet-Unie in een historische Cuba-crisisterugblik staat apart als historische code; die wordt niet stil veranderd naar huidig Rusland.

Dit zijn voorlopige modelannotaties, geen menselijke gold standard. Verwachtingen mogen niet worden aangepast om een toekomstige voorspelling te laten slagen. Een latere inhoudelijke labelcorrectie vereist onafhankelijk bewijs, expliciete versie en behoud van de oorspronkelijke holdout.

## Bewaking en controle

`node scripts/validate-categorie-v2b.mjs` controleert hash, 50–100 gevallen, alleen control, id/URL/gebeurtenissleutels, beide datums en afwezigheid van classifiervelden. `tests/categorie-v2b.test.mjs` bewijst ook dat een in het geheugen aangepast verwacht label wordt afgewezen. De controle doet geen classifieraanroep en bewijst geen semantische overeenkomst op zichzelf.

Collector voor een **andere map**: `python3 scripts/collect-categorie-v2b.py --out /tmp/nieuwe-verzameling`. Hij weigert het bevroren bewijs te overschrijven. Opnieuw ophalen is vanzelfsprekend een nieuw feedmoment; het levert niet dezelfde historische HTTP-responses op.

`npm test`: 893 tests, 892 geslaagd, nul fouten, één bestaande TODO. `npm run build`: geslaagd. Logs in `categorie-v2b/`. Geen native wijziging, dus geen iOS-tests nodig. Geen push, tag, merge of publicatie.

## Overdracht

Claude kan deze verzegelde set uitsluitend als nieuwe controle gebruiken. De set staat op zichzelf en heeft geen wijziging van de oude categoriebranch of een nieuw meetscript nodig. Gebruik haar niet als ontwikkelset en pas geen regels aan op individuele uitkomsten. Fixture, baseline, herkomst en bewaking zijn meegeleverd. Patch wordt zonder zichzelf en zonder dit verslag gegenereerd vanaf de main-basis.
