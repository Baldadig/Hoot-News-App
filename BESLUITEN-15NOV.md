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
