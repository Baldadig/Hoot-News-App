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
