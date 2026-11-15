# Besluiten 15 november: afleveringen herkennen (aflevering-2)

Alex zei "Doe maar". Bij elke keuze de voorzichtigste, omkeerbare optie.

1. **Showcover: uitgever plus patroon, alleen NRC Vandaag.** `SHOWCOVERS` in `shared/editie-filter.mjs` eist bron `nrc` en een afbeelding onder `static.nrc.nl/taxonomy/` met "NRC Vandaag" in de bestandsnaam (na tot drie keer ontcijferen). Waarom: zo valt geen andere NRC-afbeelding of andere bron eronder. NRC Wereldzaken heeft ook een eigen cover (2 treffers in de fixtures), maar staat er bewust niet in: eerst Alex vragen. Terugdraaien: de regel uit `SHOWCOVERS` halen.
2. **Een showcover-stuk blijft in filter A staan** (`hardMark` blijft null). Waarom: net als het NRC-geval met het label achteraan heeft het een eigen intro en mag het lid van een verhaal blijven; het opent niet, is geen kop en telt niet als bron. Terugdraaien: niets nodig.
3. **"Video met programmalabel" = elk kijklabel in de kop**: vooraan "Video |", "Video:", "Kijk:", "Watch:" en achteraan "| Video", "– Kijk", "(Video)". Waarom: dat is wat de kop zelf een programma noemt; rubriek /video/, `feedMark` en een video-enclosure tellen niet (besluit B2). Let op: "Video | Joe Biden bekogeld…" valt hier ook onder; het stuk mag nog wel lid van een verhaal zijn. Terugdraaien: `videoMetLabel` laten teruggeven `false`, of in stories.mjs, personal.js en bubble.mjs `geenPlekAflevering` weer `audioEpisode` maken.
4. **Eén voorwaarde voor alle routes** (`geenPlekAflevering` = `audioEpisode` of `videoMetLabel`) op elke plek waar `audioEpisode` de plek of de kop bepaalde: stories.mjs (kopkeuze, losse stukken, alleen-aflevering, Nederlandse en gratis kop), personal.js (eigen kop, herkop) en bubble.mjs (Buiten je bubbel). Waarom: web = app en geen route die het anders doet. Terugdraaien: zie 3.
5. **labelAchteraan strenger**: "watch", "audio", "kijk" alleen kaal of met een nummer; kaal "watch"/"audio" niet als het kopdeel een review/test is of het woord al vooraan staat; "video op/on …" is inhoud; "(Podcast)" en "(Video)" lopen nu via `labelAchteraan` (vereist een letter ervoor). Waarom: de valse voorbeelden van de keuring, zonder echte afleveringen te verliezen. Terugdraaien: de regel `TAIL_KAAL`/`PRODUCTKOP`/`op|on` in `labelAchteraan` weghalen.
6. **Revisie verhoogd** naar `redacteur-2026-11-15-aflevering-2`, `redacteur-2026-11-15-persona-4` vooraan in `EARLIER_REVISIONS`. Een nieuwe revisie geldt vanaf het volgende dagdeel. Terugdraaien: de oude revisie terugzetten.
   `tests/redacteur-r10.test.mjs` verwachtte nog `redacteur-2026-11-14-recensies` vooraan; bijgewerkt naar `redacteur-2026-11-15-persona-4`, de revisie die nu op main staat (de opdracht: de oude vooraan). Terugdraaien: beide regels terugzetten.
7. **Golden**: alleen `tests/fixtures/edition-server-golden.json` veranderde, en alleen het revisieveld (twee regels). De Editie zelf is gelijk; `edition-golden.json` onveranderd.

# Besluiten 15 november: de vijf keuzes uit de Selectie-review

Alex zei over de vijf open keuzes uit de Selectie-review van 14 november: "Doe maar". Per keuze de optie die de review aanbeveelt, en waar dat open bleef de voorzichtigste die terug te draaien is. Tak `selectie5`, niet gepusht.

## 1. Keuzeregel: drie plekken, elk met een eigen grond

**Keuze.** De aanbeveling van de review (punt 1): één regel voor alle onderwerpen. De top vult zich zo:

1. Het verhaal van de week: alleen als minstens drie echte bronnen erover schrijven (een curator als Sidebar telt niet), en nooit een personeelsbericht ("terug bij", "vertrekt", "benoemd", "checkt in bij", "Account-update", "names … as CEO").
2. Een kenner: het langste stuk (leestijd uit de feed), niet het nieuwste.
3. De rest op de gewone stand. Is alles tot de laatste plek Engels, dan gaat die eerst naar het beste Nederlandse stuk.

Bij gelijke stand wijkt een bron die vorige week in de top stond (rouleren). De afwisseling blijft: hooguit één stuk per bron, één betaald stuk, niets uit de Editie van die week, en wat op maandag al in de top stond blijft staan.

**Waarom.** De oude regel beloonde persberichten (personeelsnieuws op plek 1) en gaf bij Economie en Politiek elke week dezelfde drie kenners. De speciale weging voor de vijf leesvoer-onderwerpen vervalt: die maakte de top juist vast.

**Gemeten.** Week 45 nagebouwd uit de live bundel (447 stukken, zonder het Editie-filter): 18 van de 39 onderwerpen veranderen. Meestal schuift de kenner naar plek 1. Nieuw in de top: een Nederlands stuk bij Merk & reclame (Adformatie), SEO & content (Frankwatching) en Kunst & musea (KunstVensters). Engels in de top: 67 van 107, nu 64. "Annechien Steenhuizen terug bij NOS Journaal" staat niet meer op 1.

**Terugdraaien.** In `netlify/lib/vak.mjs` (`composeVak`) de drie `add(...)`-regels weghalen en de oude `score` met `LEESVOER` terugzetten; `previous` mag blijven (doet dan alleen iets bij gelijke stand). Alleen server: web en app volgen vanzelf. De Redacteur (Editie) is niet geraakt.

## 2. Taal: de schakelaar "Ook Engelstalige stukken"

**Keuze.** Zoals de review voorstelt (punt 5):

- In het blad Selectie (web en app) en in het blad Onderwerpen in de Selectie een schakelaar "Ook Engelstalige stukken". Zonder eigen keuze staat hij aan voor wie een Engelstalige bron volgt (Bluesky telt niet), anders uit. De keuze gaat mee met je account (`vakEngels`).
- Uit: de Engelse stukken vallen weg en een onderwerp toont er minder dan drie. Nooit aangevuld met Engels.
- "Vooral Engelstalig" achter de omschrijving van een onderwerp met minder dan drie Nederlandse bronnen (en meer Engelse), of met driekwart of meer Engelse bronnen. Nu: SEO & content, UI/UX, Digitaal ontwerp, Development en Productmanagement, precies de vijf uit fase 6. Komt er een Nederlandse bron bij, dan verdwijnt het label vanzelf.

**Waarom.** Past bij de taalregel van de Editie ("taal volgt bronkeuze"): wie geen Engelse bron koos, krijgt standaard geen Engels.

**Terugdraaien.** De schakelaar: `englishOn` in `src/lib/selection-index.js` en `SelectionOverview.englishOn` in `DigestView.swift` altijd `true` laten geven, en de rijen weghalen. Het label: `mostlyEnglish` in `netlify/lib/vak.mjs` `false` laten geven (server, zonder app-update).

## 3. Maat: geen "alles in één keer", hooguit acht

**Keuze.** "Alle onderwerpen" is weg, op web en in de app. Je kiest er hooguit acht, met de tekst van de review: "Kies er hooguit acht. Dan lees je het ook uit." Een zachte grens: wie al meer volgt, houdt ze en kan er alleen geen bij kiezen tot hij onder de acht zit. Niemand verliest een onderwerp. Geldt overal waar je kiest: Instellingen, het blad Onderwerpen, de lege Selectie en het welkom.

**Waarom.** "Wie alles kiest, kiest niets" (review punt 6). De zachtste vorm, die niets van iemands keuze afpakt.

**Terugdraaien.** `VAK_MAX` (web) en `SelectionOverview.max` (app) hoog zetten; de schakelaar zelf staat in de geschiedenis van `Settings.jsx` en `SettingsView.swift`.

## 4. Sport en Geschiedenis: uit de keuze

**Keuze.** Beide staan niet meer in de keuze (`uitKeuze` in `shared/vak.mjs`, `DigestFieldsList.uitKeuze` in de app). Wie ze al volgt, houdt ze en ziet ze nog; de server stelt ze gewoon samen. Ook niet meer in het voorproefje.

**Waarom.** De review (punt 7 en 11): Sport heeft zes bronnen en leunt op één Engelse wielerblog, Geschiedenis heeft er drie, waarvan één betaald. Uitbouwen vraagt een bronnenronde (nieuwe feeds zoeken en tellen); dat is groter werk dan een keuze. Uit de keuze halen is omkeerbaar en kost niemand iets.

**Terugdraaien.** `uitKeuze: true` weghalen bij beide in `shared/vak.mjs` en de set in `SettingsView.swift` leeg maken.

## 5. De teller per onderwerp: gebouwd, maar UIT

**Keuze.** Teller eerst, geen nieuwe onderwerpen (review punt 8 en "Wat ik niet zou doen"). Gebouwd zoals de rest van `/api/tel`: hoe vaak een Selectie-onderwerp gekozen wordt (`onderwerp:<id>`), als totaal per dag, zonder account, id, cookie of IP, en bij Do Not Track of GPC telt de website niets. Weghalen telt niet. Het dagoverzicht van `/api/tel` toont het als `onderwerpen`.

De teller staat **uit** (`ONDERWERP_TELLER = false` in `shared/tel-onderwerp.mjs`). Het privacybeleid zegt nu alleen "hoe vaak de Stroom, de Selectie … is gebruikt", niet welke onderwerpen gekozen worden. Zonder nieuwe zin past hij dus niet.

**Voorstel voor het privacybeleid** (onder "Wat Hoot telt", achter de eerste zin):

> Voor de Selectie telt Hoot ook hoe vaak elk onderwerp wordt gekozen, als totaal per dag.

**Aanzetten na akkoord.** De zin in `src/views/Privacy.jsx` zetten en de vlag op `true`; de toets houdt die twee samen. De app telt dan nog niet mee: dat komt in dezelfde ronde (de app stuurt nu niets, dus web en app zijn gelijk).

**Terugdraaien.** Niets aan te doen zolang hij uit staat; de code is los te verwijderen (`shared/tel-onderwerp.mjs` en de aanroepen van `telGekozen`).

## Niet gedaan

- De werkvelden (fase 5) en nieuwe onderwerpen (fase 6): de review raadt af eerst de teller af te wachten.
- De interesses tellen (fase 5 noemt die ook): buiten dit pakket; dezelfde vlag en zin zouden dat kunnen dragen.
- App Store-teksten: niets aan veranderd.

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

# Besluiten 15 november: bronnen (branch bronnen15)

Alex: "Doe maar". Steeds de voorzichtigste, omkeerbare keuze. Gemeten met de User-Agent van de server
(`HootReader/0.4 (+https://gethoot.app) news aggregator`). De weigering zelf staat in `/api/vak-bronnen` (15 november):
zes keer `HTTP 403 (cf-mitigated: challenge)`, Skipr, Zorg+Welzijn en Nursing `HTTP 403`. Vanaf de Mac werken ze wel;
dat is precies de blokkade, dus niet omzeild.

## Geen andere feed van dezelfde uitgever (optie a)

Keuze: voor geen van de acht. Waarom: besluit 14 november (tests/selectie-bronnen-feeds.test.mjs): "een ander adres van
dezelfde site zou de weigering alleen ontwijken". De uitgever weigert de server bewust. Terug: n.v.t.

## Per vakblad

| Was | Wordt | Waarom | Terugdraaien |
| --- | --- | --- | --- |
| Creative Review (design, merk) | It's Nice That (design, merk, filter) | Brits, zelfde terrein (grafisch ontwerp, identiteit, campagnes). Feed via Feedburner, door itsnicethat.com zelf aangegeven; 20 stukken, nieuwste 15 november. | regel `itsnicethat` in vak.mjs weg, `creativereview` uit ARCHIVED_SOURCES terug naar BASE_SOURCES |
| Design Week (design) | PRINT (design, filter) | Gerenommeerd ontwerpblad (Daily Heller); open feed, geen Cloudflare; nieuwste 13 november. | idem met `printmag` / `designweek` |
| Marketing Week (merk) | Marketing Dive (merk, filter) | Uitgever Industry Dive, net als Social Media Today, dat de server wel binnenhaalt. Nieuwste 13 november. | idem met `marketingdive` / `marketingweek` |
| MT/Sprout (ondernemen, leiderschap) | archief, geen vervanger | Geen gelijkwaardig Nederlands blad met open feed: De Ondernemer (toestemmingspagina), Quote, Management Scope, MKB Servicedesk (geen feed), Business Insider NL (stuurt door), Management Impact (stil sinds 2025). Change Inc. en ManagementSite staan er al. Ondernemen houdt 12, leiderschap 9 bronnen. | `sprout` uit ARCHIVED_SOURCES terug naar BASE_SOURCES, EXTEND `['vak:sprout', 'leiderschap']` terug |
| The Architect's Newspaper (architectuur) | ARCHITECT (architectuur) | Het blad van de AIA, Amerikaans nieuws en projecten zoals AN; nieuwste 13 november. | `architectmag` weg, `archpaper` terug in MORE_SOURCES |
| Skipr (zorg) | ICT&health (zorg) | Nederlands vakblad over digitale zorg, open feed, nieuwste 14 november. Niet hetzelfde als Skipr (zorgbestuur), wel het beste Nederlandse vakblad met een werkende feed. | `icthealth` weg, `skipr` terug |
| Zorg+Welzijn (zorg) | archief, geen vervanger | Zelfde uitgever als Skipr en Nursing (zelfde 403). Gezocht: Medisch Contact, Zorgkrant, V&VN, NTvG, Movisie, Zorgnet Icuro (geen feed), NU'91 (alleen forumreacties), Huisarts en Wetenschap (datums in een vorm die de parser niet leest), ZorgenZ en LHV (stil). | `zorgwelzijn` terug in MORE_SOURCES (het kenmerk betaald staat nu als `paid: true` op de archiefregel; terug in PAID_SOURCES of zo laten) |
| Nursing (zorg) | archief, geen vervanger | Geen Nederlands verpleegkundeblad met open feed gevonden (zie hierboven). | `nursing` terug in MORE_SOURCES |

Let op: It's Nice That staat op Feedburner, PRINT op eigen servers; ARCHITECT, Marketing Dive en ICT&health draaien achter
Cloudflare zonder check vanaf hier. Of de server ze binnenkrijgt is alleen op de server te zien; de wekelijkse
gezondheidscontrole (`/api/vak-bronnen`) vangt het op. Weigert er een, dan zelfde werkwijze: archief.

Zorg blijft dun (Nederlands: Trouw, NU.nl, RIVM, ICT&health; Zorgvisie weigert ook, hoort niet bij dit pakket). Mogelijke
aanvulling voor Alex om te beslissen: ZonMw (`https://www.zonmw.nl/nl/news/feed`) en Trimbos (`https://www.trimbos.nl/feed/`),
beide officieel en open. Niet toegevoegd: geen vakblad, en niet gevraagd.

## Gesponsorde stukken (bijgesteld na de keuring)

Eerste versie: een algemeen adresfilter op `sponsored`, `partner-content` en `advertorial` voor alle Selectie-bronnen.
De keuring vond vals alarm op gewone slugs (`state-sponsored-hackers`, `nike-sponsored-athletes`,
`advertorial-rules-tightened`), en om een algemeen filter was niet gevraagd. Weggehaald.

Keuze nu: alleen een bron met `sponsoredSlug: true` krijgt een adrestoets, en alleen op het woordpaar
`-sponsored-content` in de slug. Alleen It's Nice That heeft die vlag. Waarom: It's Nice That is in dit pakket
nieuw gekomen en zet "sponsored content" uitsluitend in de link; de Selectie belooft al geen gesponsorde stukken.
Zo blijft die belofte voor de nieuwe bron staan zonder iets te raken bij de andere bronnen. Toetsen in
`tests/selectie-bronnen-feeds.test.mjs` (ook een `state-sponsored`-slug die leesvoer blijft).
Terug: de vlag `sponsoredSlug` bij It's Nice That (vak.mjs) weghalen; dan telt geen adres meer mee.

Gezien, niet aangepast (buiten dit pakket): de bestaande koptoets `NOT_READING` in vak.mjs pakt het woord
"sponsored" in een kop, dus ook "state-sponsored" in een kop. Dat was er al voor dit pakket.

## Logo's

Keuze: geen nieuwe logo's. Waarom: vakbronnen hebben geen bestand in landing/bronnen (die rij is alleen voor de
hoofdcatalogus); avatars komen uit een Bluesky-handle (`bsky`), en die is voor de vijf nieuwe niet nagelopen. Geen logo
zonder bron. Terug: n.v.t.

## Spotify-ids (netlify/lib/luister.mjs)

Niet drie maar vijf opgehaalde shows misten een id; alle vijf opgezocht met de zoekfunctie van Spotify (connector) en
gecontroleerd op naam en uitgever, VI ZSM ook op de nieuwste aflevering (13 november, zelfde titel als de feed).

| Show | Spotify | Op Spotify |
| --- | --- | --- |
| VI ZSM | 62IpQNaFifMA8YtzYrozeW | "VI ZSM", Voetbal International |
| Studio Den Haag | 56SVWzBUWCymLP3vDZkYWx | "Studio Den Haag \| BNR", BNR Nieuwsradio |
| BNR Beurs | 2BuBhOIFdutoVEmWuX7F6D | "Beurs \| BNR", BNR Nieuwsradio |
| Today in Focus | 2cSQmzYnf6LyrN0Mi6E64p | "Today in Focus", The Guardian |
| The Intelligence | 12zKAMNyS2GNentUzxq9QN | "The Intelligence from The Economist", The Economist |

De zeven overzichtsshows hebben geen id; die koppelen nooit, dus de link wordt niet getoond. Terug: het veld `spotify`
weghalen; dan zoekt Spotify weer op de naam.

## Redacteur

Niet aangeraakt (alleen de Selectie en Luister verder-links); EDITOR_REVISION blijft gelijk.
