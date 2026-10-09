# Changelog

Alle noemenswaardige wijzigingen aan Hoot. Houdt [semver](https://semver.org/lang/nl/) aan.

## [1.5.0] — 2026-10-09 — Indeling: Tijdlijn of Krant

- **Twee indelingen voor berichten**, te wisselen onder Stroom → Filters → Indeling en onder Bronnen. **Tijdlijn** (nu standaard): bron bovenaan, dan kop en tekst, en het beeld groot in het midden — zoals een sociale tijdlijn. **Krant**: kop links met een klein beeld rechts, zoals het was. De keuze geldt voor Editie, Stroom, Bewaard en zoeken; het vergelijkpaneel blijft compact.

## [1.4.0] — 2026-10-09 — Twee standen op breed scherm: lezen en vergelijken

- **Lezen** (standaard): geen rechterkolom en geen scheidingslijn meer. De leeskolom (720 px) staat gecentreerd in de ruimte naast de navigatie; de navigatie is iets smaller.
- **Vergelijken**: de knop "Vergelijk bronnen" staat bij de bediening boven Editie en Stroom. Het paneel (340 px) schuift rechts in beeld; sluiten geeft de ruimte terug. Zonder gekozen verhaal toont het de verhalen waar nu de meeste bronnen over schrijven. "+N bronnen" bij een bericht opent hetzelfde paneel. Op telefoon en tablet blijft de vergelijking schermvullend.
- **Sociale bijdragen**: een gedeelde link is nu een compacte kaart (klein beeld, titel, domein); een eigen foto houdt zijn verhouding met begrensde hoogte; video blijft 16:9 met afspeelknop.

## [1.3.0] — 2026-10-09 — Sneller laden, rustiger welkom, kleine bewegingen

### Sneller

- **Schermen worden pas opgebouwd als je er komt.** Verborgen schermen (de Stroom achter de Editie, alles achter het welkomscherm) laadden al hun beeld alvast mee — ruim honderd afbeeldingen en alle videobeelden bij het eerste bezoek. Dat is voorbij.
- **Beeld op maat**: waar de uitgever kleinere varianten aanbiedt (Wired, NYT, The Verge, de Volkskrant, NOS, YouTube, Bluesky-profielfoto's) vraagt Hoot die op, met `srcset`/`sizes`. Een Wired-thumbnail gaat van ± 1 MB naar ± 18 kB. Het hoofdbeeld van de Volkskrant is juist scherper geworden.
- Alleen het zichtbare hoofdbeeld krijgt voorrang; de rest laadt pas in de buurt van het scherm. **Video's** tonen eerst een stilstaand beeld; de speler komt bij de eerste tik.
- De berichten worden al opgehaald terwijl de app zelf nog laadt; de service worker houdt het eerste beeld niet meer op; app-bestanden met een hash in de naam worden een jaar bewaard (nieuws blijft altijd vers).

### Gewijzigd

- **Welkomscherm**: "Naar de Editie" staat direct onder de inleiding; "Pas je bronnen aan" klapt de bronnen uit. Het scherm verspringt niet meer als de bronnen binnenkomen.
- **Editie**: compactere regel ("10 verhalen · 09:35"); alleen "Hoe is dit gekozen?" ziet eruit als een link. Geen komende-en-gaande "Verversen…"-regel meer.
- **Bronvergelijking**: bovenaan kort het aantal bronnen en de laatste update; de uitleg zit achter "Hoe zijn deze bronnen gekoppeld?". Kopjes heten nu "Toegevoegd sinds je vorige bezoek" en "Eerder beschikbaar".
- **Beweging** (klein, en uit bij "verminder beweging"): bladwijzer, onderwerp-chips, het openen van een verhaal, het actief-streepje in de navigatie, het ververs-icoon.
- **Ongedaan maken** na verwijderen uit Bewaard. De knop voor nieuwe berichten heet kort "3 nieuwe berichten"; berichten van uitgezette bronnen tellen niet mee.
- Navigatielabels passen ook bij sterk vergrote tekst; elk bericht is minimaal 44 px hoog.

## [1.2.0] — 2026-10-09 — The Atlantic en The Economist als vaste bron

- **The Atlantic** en **The Economist** zijn nu eigen bronnen: ze doen mee in Editie, Stroom en zoeken en zijn aan/uit te zetten onder Bronnen (voorheen alleen ter vergelijking binnen een verhaal).

## [1.1.1] — 2026-10-09 — Paneel "Bronnen vergelijken" in- en uitklapbaar

- Op breed scherm is het rechterpaneel standaard ingeklapt: de kolom blijft staan (de leeskolom verschuift niet), maar is leeg op één knop na. De knop klapt de uitleg uit en weer in; je keuze wordt onthouden. Een verhaal dat je opent via "+N bronnen" verschijnt er altijd.

## [1.1.0] — 2026-10-09 — Audit: geen dubbele verhalen, context blijft, stille bronstatus, nieuw logo

### Opgelost

- **Geen dubbele gebeurtenissen meer in de Editie.** Nederlandse en Engelse berichten over hetzelfde incident worden nu samengevoegd (namen, plaatsen, begrippen en tijd uit kop én samenvatting). Bij het samenstellen wordt nogmaals op dubbelen gecontroleerd: één gebeurtenis, één plek.
- **Hoofdbericht per verhaal** komt bij voorkeur van een eigen bron, Nederlands waar het kan, geen opinie, en wisselt af (niet twee keer dezelfde bron achter elkaar als het anders kan, hooguit drie per editie).
- **Filters en leespositie blijven** als je via de navigatie van scherm wisselt en terugkomt. Elke filtercombinatie heeft een eigen leespositie; kies je zelf een filter dan begin je bovenaan, de terugknop brengt je terug waar je was.
- **"Naar de inhoud"** zet de focus in het scherm dat je voor je hebt, zonder de route te veranderen. Sluit je een verhaal, dan gaat de focus terug naar de knop waarmee je het opende.
- **Zoeken** kijkt standaard in "Mijn bronnen" (plus bewaard); "Alle bronnen" is een bewuste keuze. De tekst bij Bronnen klopt daarmee.
- Oudere sessies kregen een nieuwe versie soms niet te zien zolang je halverwege een lijst stond; vlak na het openen wordt nu wel direct ververst (leespositie blijft).

### Gewijzigd

- **Bronstatus is klein en stil**: geen melding meer boven Editie of Stroom bij één uitgevallen bron. Een klein puntje bij Bronnen, en daar een inklapbare regel "Bronstatus" met per bron de status, hoe vers de berichten zijn en "Opnieuw proberen". Verdwijnt vanzelf na herstel of als je de bron uitzet. Alleen als álle bronnen onbereikbaar zijn staat er één regel bovenaan.
- Berichten die al geladen waren van een uitgevallen bron blijven staan.
- **Nieuw logo en app-icoon** (uil + woordmerk), in licht en donker; favicon, manifest en homescreen-icoon opnieuw gegenereerd uit de vectoren. Accentkleur volgt de merk-inkt.
- **Leesbaarheid**: op telefoon staat bij het hoofdverhaal eerst de kop en de kern, dan het beeld. De Stroom toont standaard twee regels per bericht ("Kort"); "Volledig" staat onder Filters → Weergave.
- Bewaarde verhalen blijven vindbaar als bundels samengaan (eerdere id's blijven werken).

### Techniek

- Bundeling en editie-selectie staan in `netlify/lib/stories.mjs`; route/context, bronstatus en bewaard in `src/lib/`. `npm test` draait 24 regressietests.

## [1.0.0] — 2026-10-08 — Hoot 2: Editie, Stroom, Bewaard, Bronnen

De app is opnieuw opgezet rond het verhaal als eenheid. Zie `docs/hoot-2-verslag.md`.

### Nieuw

- **Vier vaste bestemmingen** (onderin op telefoon, links op desktop): **Editie**, **Stroom**, **Bewaard**, **Bronnen**, plus **Zoeken**.
- **Editie**: een ochtend- en een avondeditie van tien verhalen, met een einde ("Je bent bij."). Selectie op aantal bronnen, versheid en eigen bronnen; uitleg staat erbij.
- **Verhalen**: berichten over dezelfde gebeurtenis zijn gebundeld; "+3 bronnen" opent elke publicatie apart met eigen kop, bron, tijd en link. Op desktop in een paneel naast de leeskolom.
- **Nieuw sinds je vorige bezoek** binnen een verhaal; verhalen zijn als geheel te bewaren.
- **Bronnen-scherm**: bronnen aan/uit, status per bron, Bluesky toevoegen, je drie onderwerpen, thema. Welkomscherm bij eerste bezoek.
- **Drie inhoudsvormen** (hoofdverhaal, compact bericht, sociale bijdrage) en een designsysteem in de app (`#/stijl`).
- Auteur, rubriek (de Volkskrant) en het label "Opinie" waar de bron die zelf levert.
- Leespositie blijft behouden bij wisselen, terugkeren en herladen. Filters zijn stappen voor de terugknop.

### Gewijzigd

- Server levert `sources`, `items`, `related`, `stories` en `edition` gescheiden; verhaal-id's en eerst-gezien-tijden worden bewaard (Netlify Blobs); één herhaalpoging per bron.
- Tijd-copy: "3 min geleden" naast "3 min lezen".
- Alle aanraakdoelen minimaal 44 × 44 px; geen horizontaal scrollende rijen meer.

### Verwijderd

- Het "geverifieerd"-vinkje (had geen betekenis), de Trending-tab (opgegaan in Editie en verhalen), het instellingenmenu, de compact/comfortabel-keuze, omlaag-trekken om te verversen en de sneltoetsen j/k.

## [0.16.1] — 2026-10-08 — Tweede ronde: wat je ziet

### Opgelost

- **Screenshots in Bluesky-posts werden onleesbaar afgesneden** (16:9-uitsnede). Foto's in social posts tonen nu in hun eigen verhouding, helemaal.
- **"Nieuwe berichten"-pill** stond links over de avatar; staat nu gecentreerd. In donker thema waren de pill en de knoppen slecht leesbaar (wit op lichtblauw) — nu donkere tekst.
- De footer waarschuwde ook als een bron haperde die alleen Trending voedt (bv. FT); nu alleen voor bronnen uit je eigen feed.
- Bluesky-video in een browser zonder HLS (Chrome op de Mac): poster met speel-teken in plaats van een dode speler; de kaart opent de post.

### Opgeruimd

- Dode CSS weg; README bijgewerkt (tabs, bewaren, werking zonder AI-sleutel).

## [0.16.0] — 2026-10-07 — Frisse blik: minder ruis, eerlijkere kaarten, bewaren dat werkt

### Opgelost

- **Koopjes-spam eruit.** Wired bestond voor ~70% uit "Best Prime Day Deals"-lijstjes (35 van de 50 items), die zelfs in Trending opdoken. Koopjesgidsen (op RSS-categorie én kop) en NRC-puzzels worden nu weggefilterd.
- **Previews stoppen niet meer midden in een zin.** 37 van de 104 teasers werden op 140 tekens afgekapt ("…but these discounts are still worth"). Previews bestaan nu uit hele zinnen; alleen als er geen zinseinde is, volgt een "…".
- **Leestijd-pil was nep.** 139 van de 166 kaarten toonden "2 min" omdat de feed alleen een teaser levert. De pil staat er nu alleen nog als de bron de echte artikeltekst meestuurt (NOS, soms The Verge).
- **Bewaren deed niets** (Instapaper is niet ingesteld, dus elke tik faalde). Bewaren is nu een eigen **leeslijst in de app**: tik op het bladwijzertje, vind alles terug onder de nieuwe tab **🔖 Bewaard**, tik nogmaals om te verwijderen. Is Instapaper ooit ingesteld, dan gaat het artikel daar óók heen.
- **Enter opende een artikel dubbel** bij toetsenbord-navigatie.

### Verbeterd

- **Updates komen vanzelf binnen**: de app checkt bij elke keer openen op een nieuwe versie en ververst zichzelf (nooit midden in het lezen). Geforceerd afsluiten is niet meer nodig. Het versienummer staat onderin het menu.
- **Sneller**: bron-avatars worden parallel met de feeds opgehaald en 6 uur onthouden; kaarten buiten beeld worden niet gerenderd.
- **Betere onderwerpen**: RSS-categorieën (o.a. NYT) tellen mee bij het indelen; ruisige trefwoorden ("miljard", "platform") zijn weg.
- Footer zonder jargon: "Je bent helemaal bij 🦉", of een melding als een bron écht niet bereikbaar is.

## [0.15.0] — 2026-06-29 — Geleende preview voor de Volkskrant (gratis, geen AI)

### Toegevoegd

- Artikelen zonder eigen samenvatting (de Volkskrant) krijgen nu een **geleende previewtekst** van een Nederlandse bron (NOS/NRC) die hetzelfde verhaal dekt — gratis, zonder AI. Met bron-vermelding ("· via NRC").
- Streng tegen verkeerde matches: alleen NL→NL (taal klopt) én bij sterke titel-overlap (≥4 gedeelde kernwoorden, of ≥3 mits ze ≥60% van de kop beslaan). Liever geen preview dan een foute.
- Dekking is daardoor beperkt tot verhalen die óók breed gedekt worden; overige VK-kaarten blijven kop + foto.

## [0.14.0] — 2026-06-29 — Bronnen vallen niet meer volledig uit de feed

### Opgelost

- Laag-frequente bronnen (zoals **Left Laser**) verdwenen volledig uit de feed — én uit het bronnen-menu — als hun nieuwste post een paar dagen oud was, omdat de feed alleen de ~160 nieuwste items over alle bronnen toont. Nu houdt elke bron **z'n 6 recentste items** gegarandeerd, zodat geen enkel kanaal onzichtbaar wordt. Je vindt Left Laser dus altijd terug via het bronnen-menu (en kunt erop filteren).

## [0.13.0] — 2026-06-29 — Left Laser via YouTube i.p.v. Bluesky

### Gewijzigd

- **Left Laser komt nu binnen via hun YouTube-kanaal** (native RSS, gratis, betrouwbaar) i.p.v. Bluesky. X/Twitter kan niet zonder betaalde API of fragiele scraper; YouTube heeft gewoon een publieke feed. De Bluesky-versie is verwijderd.
- Video's tonen titel + echte YouTube-thumbnail + merk-avatar (uit hun Bluesky-profiel) en openen op YouTube. Aggregator leidt de thumbnail af uit de `yt:videoId` (YouTube-RSS levert geen `<img>`).

## [0.12.2] — 2026-06-29 — og-scraper verwijderd (door Volkskrant geblokkeerd)

### Gewijzigd

- De og:description-scraper is **verwijderd**. Diagnose was conclusief: de Volkskrant geeft Netlify's server-IP's een **harde HTTP 403** (`ogStats: tried 10, notOk 10, status 403`) — een IP/WAF-block, niet op te lossen met headers. De code leverde in productie niets op (alleen 403's), dus eruit.
- Volkskrant-previews kunnen daardoor alléén via de AI-route (uit de kop), die geen paginafetch nodig heeft en vanaf elk IP werkt — actief zodra `ANTHROPIC_API_KEY` in Netlify staat. Zonder key blijft de Volkskrant kop + foto.

## [0.12.1] — 2026-06-29 — Diagnose: og-teasers werken niet in productie

### Opgelost / onderzoek

- De og:description-teasers (Volkskrant) werkten lokaal maar **niet live** (`ogFetched: 0`, 0/24). Toegevoegd: volledigere crawler-headers (`Accept`, `Accept-Language`), cache-sleutel `og-teasers-v2` (om met-leeg vervuilde entries opnieuw te proberen) en **`meta.ogStats`** (tried/notOk/gotOg/errors/lastStatus) zodat we live exact zien of de Volkskrant Netlify's server-IP's blokkeert.

## [0.12.0] — 2026-06-29 — UX/UX-review-pass (density, nieuwe items, a11y, security)

### Toegevoegd

- **Dichtheid-keuze** (Instellingen → Dichtheid): **Comfortabel** of **Compact**. Compact halveert de fotohoogte en kapt kop/samenvatting op 2 regels → ~2× zoveel items per scherm. Onthouden in localStorage, geen flits bij laden.
- **"↑ N nieuwe berichten"-pill**: automatische verversingen schuiven de feed niet meer weg tijdens het lezen; nieuwe items wachten tot je op de pill tikt (dan pas scrollt 'ie naar boven). Handmatig verversen (knop/pull) werkt direct zoals voorheen.
- **Versheid bovenaan** zichtbaar ("Bijgewerkt om HH:MM") en een **"Verversen mislukt — opnieuw"** als een stille verversing faalt (niet langer een stille failure).
- **Toetsenbord-navigatie** voor power-users: `j`/`k` volgende/vorige, `o`/Enter openen, `s` bewaren, `r` verversen, `g` naar boven.

### Opgelost / Toegankelijkheid

- **Security:** `javascript:`/`data:`-links uit feeds worden geweerd (alleen http(s) toegestaan) in zowel de aggregator als de Bluesky-client.
- Onderwerp-chips hebben nu `aria-pressed`; het menu is `inert` als het dicht is (geen verdwaalde focus), met focus-beheer bij openen/sluiten; merknaam is nu een `<h1>`.
- Grotere tap-doelen (bewaar-, chip- en verwijderknop).

## [0.11.1] — 2026-06-29 — Sociale bronnen als eigen instellingen-scherm

### Gewijzigd

- Het toevoegen van sociale bronnen zit nu achter een nette **drill-down** in Instellingen: het hoofdmenu toont een rij **"Sociale bronnen ›"** (met aantal), die een eigen sub-scherm opent met terug-knop, invoerveld, lijst en uitleg. Het hoofdmenu blijft zo rustig en overzichtelijk (iOS-instellingen-gevoel).
- Toegevoegd: duidelijk label boven het invoerveld, een lege-staat ("Nog geen accounts toegevoegd"), en een vloeiende schermovergang.

## [0.11.0] — 2026-06-29 — Zelf social-bronnen toevoegen

### Toegevoegd

- **Voeg zelf Bluesky-accounts toe** in Instellingen (menu): plak een handle of `bsky.app`-link, Hoot haalt **automatisch de naam en avatar** op en mengt de posts (inclusief video) in je feed — geen serverwijziging nodig, alles in je eigen app (localStorage).
- Toegevoegde accounts verschijnen ook in "Mijn bronnen" om op te filteren, en zijn met één tik weer te verwijderen.
- **Threads/Instagram**: die hebben geen publieke feed/API, dus niet mogelijk — de uitleg in het menu wijst je naar het eventuele Bluesky-account van de maker.

## [0.10.0] — 2026-06-29 — Previewtekst voor de Volkskrant (zonder AI)

### Toegevoegd

- **Volkskrant-artikelen krijgen nu een previewtekst**, ook zónder AI-key. Hoot haalt de **`og:description`** op van de artikelpagina (de deel-tekst die de Volkskrant zelf publiceert voor social media — vóór de paywall), met een social-crawler user-agent. Resultaten worden gecachet (Netlify Blobs `og-teasers-v1`), dus het blijft snel.
- Werkt voor elk artikel zonder RSS-teaser; ~24/29 VK-artikelen krijgen zo een samenvatting. De rest zijn liveblogs die bij de bron zelf geen samenvatting hebben.
- Als de AI later aanstaat, krijgt die nu echte brontekst om van te vertalen/samenvatten in plaats van alleen de kop.
- `meta.ogFetched` toegevoegd voor inzicht.

## [0.9.2] — 2026-06-29 — Left Laser toegevoegd

### Toegevoegd

- **Left Laser** als bron in de feed, via hun **Bluesky**-account (`leftlaser.bsky.social`) — inclusief hun video's. Instagram zelf heeft geen publieke feed/API, dus Bluesky is de nette, betrouwbare route naar dezelfde content.

## [0.9.1] — 2026-06-24 — Bronnen in het menu

### Toegevoegd

- **"Mijn bronnen" in het hamburger-menu**: al je bronnen netjes onder elkaar, branded met logo, naam, verified-vinkje en handle. Tik op een bron om alleen die bron te zien (menu sluit automatisch). De actieve bron krijgt een merk-gekleurd accent.
- Nieuwsbronnen staan bovenaan, Bluesky-accounts eronder.

## [0.9.0] — 2026-06-24 — Vier nieuwe onderwerp-categorieën

### Toegevoegd

- **Vier nieuwe tabs**: 💻 **Tech** (Apple/Google/Meta/Musk, platforms, chips, gadgets), 🔬 **Wetenschap** (onderzoek, ruimtevaart, gezondheid), 📈 **Economie** (beurs, inflatie, bedrijven, markten) en 🇳🇱 **Nederland** (binnenlandse politiek & samenleving).
- De tabs zijn opnieuw gegroepeerd: VS-politiek · Trump · Nederland · Oekraïne · Geopolitiek · Tech · AI · Wetenschap · Economie.
- Voor elke nieuwe categorie is zowel de **AI-classificatie** als de **trefwoord-fallback** ingeregeld; één artikel kan meerdere onderwerpen hebben (bijv. een Nederlands AI-bedrijf → Nederland + Tech + AI).
- Verrijkings-cache naar `enrichments-v7` zodat bestaande artikelen opnieuw worden ingedeeld met de nieuwe onderwerpen.

## [0.8.3] — 2026-06-24 — Koppen worden niet meer afgekapt

### Opgelost

- Lange koppen werden na 3 regels met "…" afgekapt. De regel-limiet is verwijderd: **koppen passen nu altijd volledig** (de kaart wordt simpelweg iets hoger). De AI-inkorting van lange koppen blijft eroverheen werken om ze compact te houden waar dat kan.

## [0.8.2] — 2026-06-24 — Terug-naar-boven knop

### Toegevoegd

- **Terug-naar-boven knop**: verschijnt rechtsonder zodra je een stuk naar beneden scrolt en brengt je met één tik soepel terug naar de top. Past bij de bestaande icoon-knoppen (ronde knop, blauwe pijl), en verdwijnt vanzelf weer bovenaan. Werkt licht/donker mee.

## [0.8.1] — 2026-06-24 — Previews voor de Volkskrant & NRC

### Opgelost

- **de Volkskrant en NRC hadden geen previewregel.** Oorzaak: hun RSS levert alleen een kop + foto, géén samenvattingstekst (`<description>` is leeg), en de artikelpagina's blokkeren server-side ophalen. Hun Bluesky-posts herhalen enkel de kop.
- Oplossing: de AI maakt nu voor **bron-loze artikelen** één neutrale Nederlandse zin op basis van de **kop** — met de harde regel om **geen feiten, cijfers of citaten te verzinnen** die niet in de kop staan. Bronnen mét teaser (NYT/Verge/Wired/NOS) worden zoals voorheen inhoudelijk samengevat en vertaald.
- Verrijkings-cache naar `enrichments-v6` zodat bestaande items opnieuw worden gegenereerd met de nieuwe regel.

> Werkt zodra `ANTHROPIC_API_KEY` in Netlify staat. Zonder key blijven VK/NRC-kaarten kop + foto (geen verzonnen tekst).

## [0.8.0] — 2026-06-24 — Slide-in menu & dark mode

### Toegevoegd

- **Slide-in menu** (hamburger linksboven) met **Instellingen** — uitbreidbaar voor later.
- **Thema-keuze**: **Systeem / Licht / Donker** (segmented control). 'Systeem' volgt automatisch je iPhone; je keuze wordt onthouden. Geen "flits" bij laden (thema staat vóór render).

### Gewijzigd

- Donker thema werkt nu via `data-theme` i.p.v. alleen de OS-mediaquery, zodat een handmatige keuze mogelijk is.

## [0.7.1] — 2026-06-18

### Gewijzigd

- **App-icoon** (incl. iOS-homescreen via apple-touch-icon): de uil is **iets kleiner** met meer ademruimte.
- **Verfijnder woordmerk** "Hoot" (fijner gewicht, strakkere tracking) en kleinere uil in het header-logo.
- **Lange koppen worden licht ingekort door de AI** (in de oorspronkelijke taal, ~max 65 tekens) zodat ze netjes passen.

## [0.7.0] — 2026-06-18 — Trending / Discover

### Toegevoegd

- **🔥 Trending-tab**: ontdek verhalen die bij **meerdere gerenommeerde bronnen tegelijk** opduiken (cross-bron signaal).
  - Naast je vaste bronnen worden **extra reputabele bronnen** opgehaald (The Guardian, BBC, Al Jazeera, NPR, Politico, The Atlantic, The Economist, FT, Tweakers) — alleen voor Trending, niet in je hoofd-feed.
  - Verhalen worden geclusterd op titel-overlap; een cluster met ≥2 bronnen wordt trending. Per kaart een **"🔥 N bronnen"**-badge (hover toont welke).
  - Gerangschikt op aantal bronnen + recentheid; representatief artikel kiest waar mogelijk je eigen bron.

## [0.6.1] — 2026-06-18

### Gewijzigd

- **Samenvattingen kappen nooit meer mid-woord af** (`…`): netjes afgerond op zin-/woordgrens, strikt ≤140 tekens.
- AI-prompt: artikel-samenvatting = **één complete Nederlandse zin (max 140), Engelse bronnen worden vertaald**.
- **Koppen blijven in de oorspronkelijke taal** (geen vertaling meer).
- **Bluesky-posts** blijven **origineel** van taal én lengte (geen samenvatting/vertaling), wel onderwerp-tags.
- Verrijking-cache ververst (v4) zodat bestaande items de strakke nieuwe samenvattingen krijgen.

## [0.6.0] — 2026-06-18 — Instapaper

### Toegevoegd

- **Bewaar voor later → Instapaper**: een bladwijzer-knop op elke kaart zet het artikel in je Instapaper.
  - Server-side via een nieuwe functie `/api/save` (Instapaper Simple API); inloggegevens staan veilig als Netlify-omgevingsvariabelen (`INSTAPAPER_USERNAME`, `INSTAPAPER_PASSWORD`) — nooit in de client of code.
  - Bewaarde artikelen blijven lokaal gemarkeerd (gevulde bladwijzer); nette foutmelding als Instapaper nog niet is ingesteld.
- De bron-regel is opgesplitst (bron-knop + leespil + bewaar-knop) zonder geneste knoppen — toegankelijk.

## [0.5.1] — 2026-06-18 — polish-ronde 2

### Gewijzigd

- **Leestijd als pil** rechts in de bron-regel — kapt nooit meer af.
- **Eenmalige tip** ("tik op een bron om te filteren") die verdwijnt zodra je 'm gebruikt of wegtikt.
- **Desktop**: de feed staat nu als een net, gecentreerd paneel (subtiele rand + schaduw) i.p.v. een losse kolom.
- **Eén laad-indicator**: de top-progressbalk is weg; het draaiende ververs-icoon blijft.

## [0.5.0] — 2026-06-18 — UI/UX polish-pass

### Toegevoegd

- **Toetsenbord-focus** (`:focus-visible`-ring) op alle interactieve elementen.
- Lege staat bij een actief filter toont nu een **"Toon alles"**-knop (geen doodlopend scherm).
- **Spacing- en radius-tokens** (`--space-*`, `--radius-pill`) voor een consistent ritme.

### Gewijzigd

- **Toegankelijkere kaart**: opgesplitst in een artikel-container met een echte bron-**knop** (filteren, nu ook met toetsenbord) en een artikel-**link** — geen geneste link-in-knop meer.
- **Gelezen-status** verzacht (minder vervaagd) voor een rustiger feed.
- **Grotere touch targets** voor de onderwerp-chips (~40px).
- **Skeleton** komt overeen met de echte kaart (titel-placeholder toegevoegd).
- Diverse hardcoded spacing/radii vervangen door tokens; dubbele afronding op het brand-icoon weg.

## [0.4.3] — 2026-06-18

### Gewijzigd

- **Avatars vullen nu mooi uit** (cover) i.p.v. een vierkant logo in een rondje.
- Bronnen zonder Bluesky-account (zoals NOS) krijgen hun X-profielfoto via unavatar.io — een scherpe merk-avatar.

## [0.4.2] — 2026-06-18

### Toegevoegd

- **Verwachte leestijd** per artikel (📖), geschat door de AI met een heuristische terugval.

### Gewijzigd

- Kaartvolgorde: **titel → samenvatting (lede) → foto**, typografisch netjes.
- **Strakker geverifieerd-vinkje** (schone cirkel met check i.p.v. het rommelige zegel).

## [0.4.1] — 2026-06-18

### Gewijzigd

- **Mooie merk-avatars**: het officiële profielbeeld van elke nieuwssite wordt opgehaald via de openbare Bluesky-API (met de favicon als nette terugval).
- **Samenvatting** is nu zwarter en beter leesbaar, en wordt niet meer visueel afgekapt (hard op 140 tekens).
- AI maakt **altijd** een Nederlandse samenvatting, ook als de brontekst leeg is (NRC/VK zonder teaser).

## [0.4.0] — 2026-06-18

### Toegevoegd

- **Bron-filter**: tik op de bron-regel van een kaart om alleen die nieuwsbron te zien (met een wisbalk "Alleen … ✕"). Zo bekijk je netjes alles van bv. NRC, The Verge of Wired.
- **Bluesky-video's** spelen direct in de app af (met poster), naast tekst en beeld.
- **Merk-gekleurde avatar-cirkels** per bron, in een nette cirkel.
- **Automatisch verversen** elke 15 minuten (en bij terugkeren in de app).

### Gewijzigd

- Kaartvolgorde: **samenvatting (≤140 tekens) bovenaan → titel → foto**.
- Onderwerp **Extreemrechts → Geopolitiek** (EU, VS, China, Taiwan, Midden-Oosten, NAVO, sancties). De AI bepaalt zelf de indeling.
- App-icoon: groot-ogige witte uil, **gecentreerd** op blauw.
- Bluesky toont **alleen originele posts** van de gevraagde account (Aaron Rupar) — geen reposts van anderen meer.

## [0.3.1] — 2026-06-18

### Gewijzigd

- **Titel boven de foto** bij artikelen (serif-kop → foto → samenvatting), redactionele volgorde.
- **Nieuw uil-icoon**: groot-ogige witte uil op blauw (eigen ontwerp), wit op blauw.

## [0.3.0] — 2026-06-18

### Gewijzigd

- **Redactioneel ontwerp** (New York Times × Notion): flat, strak, **serif koppen** (Apple "New York"/Georgia), modern klassiek.
- **App-icoon**: witte uil-silhouet op blauw — passe-partout, in de stijl van het oude Twitter-icoon.
- **Samenvattingen op ~140 tekens** (Twitter-lengte), titel én samenvatting in het Nederlands (met de AI-laag aan).
- **Foto's overal even groot** (vaste 16:9-verhouding) voor een rustige, uniforme tijdlijn.

## [0.2.0] — 2026-06-18

### Toegevoegd

- **Onderwerp-tabs** in plaats van bronnen: 🇺🇸 VS-politiek · 🇺🇦 Oekraïne · ⚠️ Extreemrechts · 🤖 AI · 🎪 Trump.
- **AI-verrijking** (Claude Sonnet): Nederlandse, verkorte titels + korte NL-samenvattingen + onderwerp-classificatie, gecachet in Netlify Blobs. Werkt ook **zonder API-sleutel** (originele titels + trefwoord-onderwerpen als terugval).
- **Bluesky in de feed** via de openbare API — eerste account: [@atrupar.com](https://bsky.app/profile/atrupar.com).
- **Tweet-stijl kaart**: bron-avatar met het echte site-logo, geverifieerd-vinkje, samenvatting, grote afbeelding en een link-balkje met titel + domein.

## [0.1.0] — 2026-06-18

### Toegevoegd

- Eerste versie van **Hoot**: één verenigde nieuws-tijdlijn van NRC, de Volkskrant, NYT, The Verge, Wired en NOS.
- Installeerbare PWA met homescreen-uiltje (iPhone-first), offline shell en feed-cache.
- Robuuste Netlify-aggregator: per-bron fallback-URL's, time-outs, ontdubbeling en CDN-caching (5 min).
- Bron-filters, gelezen-status (lokaal bewaard), pull-to-refresh en automatische licht/donker-modus.
