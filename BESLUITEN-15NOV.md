# Besluiten 15 november, pakket B7 en de privacyzin

Branch `b7` in de kloon Hoot-werk-b7. Niet gepusht. Alex zei "Doe maar": steeds de voorzichtigste, omkeerbare keuze.

## 1. B7: de rangorde na de landenregel

**De open vraag.** De landenregel telt hooguit zes uitgevers per land buiten Nederland en Vlaanderen (`COUNTRY_MAX`, `countedPublishers`). Die begrensde telling staat in `story.publisherCount`, en die gaat overal in: groot nieuws (`majorNews`), het gewicht van een verhaal (de rangorde), de familie en plafonds als `HOLD_PUBS`. De vraag uit het oordeel (B7, CODE 4): mag de regel ook de rangorde raken, of alleen de drempels?

**Keuze: één telling overal, zoals nu live.** Geen verandering in de code die kiest.

Waarom:
- Dit verandert de Editie het minst: het is precies wat lezers nu krijgen.
- De andere kant (het gewicht op het ruwe aantal uitgevers) gemeten met de scorekaart (`--herbouw --naast`, 17 dagdelen): geen verschil in de algemene Editie. De bewaarde feeds kennen de nieuwe Amerikaanse bronnen nog niet. Na de uitrol zou het ruwe gewicht wel verschuiven: een Amerikaans verhaal weegt dan zwaarder naarmate de catalogus meer Amerikaanse uitgevers krijgt. Dat is precies wat de landenregel wil voorkomen (AMERIKA-VERSLAG: "niet groter dan voorheen mogelijk was").
- KISS: één getal per verhaal, geen tweede telling voor de volgorde.
- Groot nieuws voor een wereldverhaal blijft zoals voorheen: vijf uit minstens twee landen.

Wat er wel veranderde:
- De zin bij de landenregel in CHANGELOG.md klopte niet helemaal ("haalt de drempels zoals voorheen"): `HOLD_PUBS`, de familie en `FRONT_BIG` rekenen ook begrensd. Nu staat er: groot nieuws zoals voorheen, rangorde, familie en de andere plafonds met de begrensde telling.
- Uitleg bij `COUNTRY_MAX` in shared/edition-policy.mjs. Alleen commentaar: de rekenkern van de app neemt geen commentaar mee, en `build:core --check` is bij.
- Toets in tests/bronnen-internationaal.test.mjs: een wereldverhaal met alle Amerikaanse uitgevers weegt even zwaar als met zes, en is groot nieuws.
- EDITOR_REVISION niet verhoogd: de Editie-keuze verandert niet. Golden en server-golden ongewijzigd.

**Terugdraaien of de andere kant kiezen.** Wil Alex toch de rangorde zonder de regel: zet in netlify/lib/stories.mjs het gewicht (`weight({ sourceCount: … })` bij de kandidaten, en `eff` in de persoonlijke Editie) op het ruwe aantal uitgevers, bijvoorbeeld een veld `rawPubs` naast `...coverageOf(items)`. Dan EDITOR_REVISION omhoog, de kern bouwen en de nieuwe toets omdraaien. Deze commit terugdraaien haalt alleen commentaar, een toets en twee CHANGELOG-regels weg.

## 2. De privacyzin

**Al doorgevoerd.** Commit f4d6d105 ("Privacy: logo's deels van de uitgevers zelf (akkoord Alex)") zette de voorstelzin uit HERSTEL.md letterlijk in src/views/Privacy.jsx.

**Klopt met de code.** Nagelopen:
- Het merkbeeld van een bron komt uit `logo`, Bluesky, het eigen logo van Hoot of een favicon van Google (netlify/lib/rss.mjs en build.mjs; `favicon` in netlify/lib/text.mjs).
- Vijf bronnen hebben een `logo` bij de uitgever zelf: argos.vpro.nl, tpo.nl, socialevraagstukken.b-cdn.net, www.abc.net.au en www.cuttingedge.be.
- De andere `logo`s staan op gethoot.app (`own`).
- Nieuwsbeelden van Bing: src/lib/img.js en netlify/lib/snippets.mjs.

**App gelijk aan web.** De app heeft geen eigen privacytekst. Instellingen, Over Hoot, Privacy linkt naar https://gethoot.app/privacy, dezelfde pagina. PrivacyInfo.xcprivacy gaat over het verzamelen van gegevens, niet over logo's.

**Eén kleine aanpassing:** onderaan stond nog "Bijgewerkt op 13 november 2026", terwijl de zin op 14 november veranderde. Nu staat er 14 november. Terugdraaien: die ene regel in Privacy.jsx.

## 3. Open punten, alleen beschreven (niet gebouwd)

### Belgisch nieuws voor de Vlaamse lezer

**Stand.** Een stuk van een Vlaamse bron is Buitenland in de rubriek van het verhaal (desks.mjs, zoals op main; dubbelcheck A6 regel 2 is teruggedraaid). Sinds persona 6 (main) krijgt een lezer met meer Vlaamse dan Nederlandse bronnen (`readerHome` = BE) in zijn persoonlijke Editie wel het label Binnenland voor een Belgisch stuk (`rubriek` in src/lib/personal.js, `belgianSubject`).

Wat nog open staat: het plafond voor buitenland (hooguit twee buitenlandse plekken voor wie Wereld niet koos, `internationalNews` en `cappedInternational` in shared/edition-policy.mjs) kijkt niet naar het thuisland. Voor de Vlaamse lezer zonder Wereld telt Belgisch nieuws daar dus nog als buitenland, terwijl het label Binnenland zegt.

**De keuze.**
- (a) Zo laten.
- (b) Het plafond ook vanaf het thuisland laten rekenen: voor `readerHome` BE telt een Belgisch stuk niet als buitenland en Nederlands nieuws wel.

**Advies: (b).**
- Dan zijn label en plafond één regel ("web = app", één regel per onderwerp).
- Het raakt alleen lezers met vooral Vlaamse bronnen. De algemene Editie en de Nederlandse lezer veranderen niet.
- Bouwen met een persona-toets voor de Vlaamse lezer (Geel, het kernkabinet, plus een Nederlands stuk dat dan buitenland wordt). Daarna EDITOR_REVISION omhoog en de kern bouwen.
- Niet de oude regel in desks.mjs terugzetten: die liet 130 van de 477 Vlaamse stukken voor iedereen aan het plafond ontsnappen.

### De kanttekening bij A4 (vakbronnen)

**Stand.** `healthOf` in netlify/lib/vak.mjs kijkt eerst naar `skips`. Een bron die ons weigert (403) en daarna, langer dan BROKEN_DAYS zonder succes, één keer niet aan de beurt komt, heet `overgeslagen` in plaats van `geweigerd`. `lastError` blijft wel staan, dus de oorzaak is nog te zien in /api/vak-bronnen. Beide staten zijn op pauze en komen vooraan bij de herkansing, dus de Selectie merkt geen verschil. Alleen het label in het overzicht verschilt.

**De keuze.**
- (a) Zo laten.
- (b) `geweigerd` voor `overgeslagen` laten gaan, met `h.refused ? 'geweigerd' : h.skips ? 'overgeslagen' : 'kapot'`.

**Advies: (b).**
- Het is één regel, en de oorzaak (de uitgever weigert) is nuttiger dan het gevolg (niet aan de beurt).
- Het gedrag verandert niet, want beide staten staan op pauze.
- Een toets in tests/vakbronnen-gezondheid.test.mjs erbij.
- Geen Redacteur, dus geen revisie.
