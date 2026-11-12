> **Versie 2.4 (6 november 2026):** merkrood Rubrica (PMS 484 C, `#9A3324`) overal, tien placeholders, de Editiekop zonder "Jouw Editie", Voor jou in het welkom, de Bluesky-kaart A+, één woordenlijst en de punt in inkt op rood staan in [`brand-guide-v2.4.md`](brand-guide-v2.4.md). Twee families, kaart A+, De stapel en Tien in [`brand-guide-v2.3.md`](brand-guide-v2.3.md); de keuzes voor 1.1.0, Nacht, het app-icoon, de deelkaart en de beeldtaal in [`brand-guide-v2.2.md`](brand-guide-v2.2.md). Waar die gidsen en dit merkboek verschillen, geldt v2.4.

Hoot is een rustige nieuwslezer: drie keer per dag een Editie van tien verhalen met een einde, een Stroom met de laatste berichten van je eigen bronnen en elke maandag een Selectie: bijgepraat over wat jou bezighoudt. Het beeld is de zaterdagkrant: warm papier, zwarte inkt, krantenrood als enige accent. Bouw elk scherm uit deze tokens en regels. De website (`src/styles.css`) en de iOS-app (`Theme`, `Space`, `Radius` en `Layout` in Swift, plus de kleuren in `Assets.xcassets`) delen dezelfde namen en rollen; maten staan op het web in CSS-pixels en in iOS in punten (1 px = 1 pt). Waar een platform bewust afwijkt, staat dat onder "Per platform". De tokens (`tokens.json`) zijn de bron: bij twijfel geldt de tokenwaarde.

## Principes

- **Het verhaal is de eenheid.** De bron blijft altijd zichtbaar en aanklikbaar; openen, de bron bekijken en bewaren zijn drie aparte doelen van minstens `tap` (44 px).
- **Lijnen en witruimte, geen omlijnde kaarten.** Berichten scheid je met een `rule`-haarlijn en `s5`; een kaart (`surface`, `radius`) alleen voor iets dat echt los staat: een stuk uit de Selectie, een melding, een blad.
- **Lezen in serif, bedienen in sans.** Koppen en schermtitels in `serif` (Newsreader 800); alles wat je leest (de intro van een verhaal, de tekst van een post, de lezer, proza) in `lees` (Newsreader op tekstmaat); bediening, labels, metadata, knoppen en alle uitleg- en hulpzinnen in `sans` (Schibsted Grotesk, vervangt Inter sinds v2.3).
- **Eén accent.** `accent` markeert rubriek, actief, "+N bronnen", het label "gratis" en het punt van het woordmerk. Nooit als vlakvulling van een heel scherm, en nooit voor gewone bediening: iconen in de kop (instellingen, zoeken, verversen) zijn `ink-3`.
- **Merkmomenten in merkrood.** Op een handvol vaste momenten wordt het krantenrood een vol vlak (`brand-red` met `on-brand-red`): het opstartscherm (app en web), het welkom, het einde van de editie ("Je bent bij.") en de deel- en App Store-beelden. Juist omdat de rest papier en inkt is, voelt dat fris; daarom nergens anders, en nooit op een scherm waar je leest.
- **Niets beweegt terwijl je leest.** Nieuwe berichten wachten achter een knop; de leespositie verschuift nooit vanzelf.
- **Een einde.** Elke lijst die eindigt, zegt dat. Het einde is leidend; verder lezen mag, maar als rustige link, nooit als knop die je doortrekt.

## Taal

- **Nederlands, je en jij**, kort en zakelijk, zonder uitroeptekens of emoji in de bediening.
- **Zeg wat er gebeurt**, in de taal van de lezer: "Bewaar", "Markeer als ongelezen", "Je ziet de laatste versie", "Inloggen bij NRC". Niet "Sync", niet "Cache".
- **Labels zijn feitelijk:** "Buiten je bronnen", "Gekozen door Sidebar", "Eerste bericht", "Voorkeursbron". Geen aanprijzing ("Must read") en geen schrik ("BREAKING").
- **Fouten zeggen wat er mis is en wat je kunt doen:** "Geen verbinding. Zodra je verbinding hebt, verschijnt de editie hier." met de knop "Probeer opnieuw".
- **Rubrieken in kapitalen** alleen in de `kicker`; verder zinnen met één hoofdletter ("Artikelen openen", niet "Artikelen Openen").
- **Tijd relatief** ("12 min geleden"), datum voluit en met hoofdletter aan het begin ("Dinsdag 27 oktober").

### Hoe Hoot over zichzelf praat

De stem van de productpagina in de App Store (Alex, 28 oktober) is de maat voor alle tekst over Hoot zelf: welkom, Over, App Store en uitleg.

- **Eén belofte vooraan, kort:** "Nieuws met een begin en een einde."
- **Beschrijf wat je doet, niet wat de app 'biedt':** "Drie keer per dag zet Hoot een nieuwe editie voor je klaar." "Ben je erdoorheen, dan ben je bij."
- **Gewone woorden voor de onderdelen:** editie, Stroom, "hoe andere media het brengen". Geen kopjes in kapitalen, geen opsommingstekens als het ook in een zin kan.
- **Eerlijk en rustig over privacy:** "Hoot volgt je niet." "Wat de app leert van je leesgedrag, blijft op je toestel." Zeg wat waar is, zonder superlatieven.
- **Zeg waar het nieuws vandaan komt:** "Koppen en korte intro's komen uit openbare nieuwsfeeds. Bij elk verhaal staan de bron en een link naar het oorspronkelijke artikel."
- **De Selectie** is breder dan werk: "Eén keer per week bijgepraat over wat jou bezighoudt." Vak, hobby of liefhebberij.
- **Maker:** "gemaakt in Nederland door Baldadig".

Volledige tekst: `ios/AppStore/metadata/nl-NL/description.txt`.

## Kleur

Licht en donker delen dezelfde namen; de app volgt het toestel.

| Rol | Token | Op |
|---|---|---|
| Pagina | `paper` | — |
| Kaart, blad, melding | `surface` | `paper` |
| Kop en tekst | `ink` | `paper`, `surface` |
| Intro, samenvatting | `ink-2` | `paper`, `surface` |
| Tijd, bron-uitleg, toelichting | `ink-3` | `paper`, `surface` |
| Haarlijn | `rule` | `paper`, `surface` |
| Rubriek, actief, "+N bronnen" | `accent` | `paper`, `surface` |
| Actieve chip | `accent` op `accent-soft` | — |
| Tekst op rood | `on-accent` op `accent` | — |
| Merkmoment (vol vlak) | `on-brand-red` (= `paper-brand`, papier, niet wit) op `brand-red` | — |
| Welkom, de rode intro | `paper-brand` op `brand-red` (web en iOS: papier, niet wit) | — |
| Waarschuwing en fouttekst (met woorden) | `warn` | `paper` |
| Rand van een veld of filterknop | `edge` | `paper`, `surface` |

- **Het rood is Rubrica** (PMS 484 C, de rode oker van de rubricator, waar het woord *rubriek* vandaan komt): `accent` en `brand-red` `#9A3324` in licht, `accent-soft` `#F2E4DF`. Rood op papier en papier op rood 6,5:1, op `surface` 7,0:1, wit op rood 7,3:1. Donker (`#EC7A70`) en Nacht (`#DF8276`) houden hun lichte rood. Tot en met build 48 was het rood `#A3201B` (Brand Guide v2.3).
- **`ink-3` is de ondergrens voor kleine tekst** (5,2:1 licht, 6,7:1 donker). Gebruik nooit een lichter grijs, ook niet het secundaire grijs van het systeem: dat haalt op papier maar 3,3:1.
- **De kleurverdelingen Blad en Inkt** (alleen op de website) gebruiken `sheet`, `sheet-surface` en `sheet-edge`, en voor de editiekop `band` met `band-ink` tot en met `band-accent`. Binnen het blad zijn `paper` en `surface` de bladkleuren, dus componenten hoeven niets te weten.
- **Puntjes:** een bron die tijdelijk niet bereikbaar is krijgt een `quiet-amber`-punt van 6 px naast een tekst die hetzelfde zegt; een verhaal met nieuwe berichten een `accent`-punt van 8 px voor "+N bronnen".
- **Fouttekst** is `warn`, nooit het rood van het systeem (dat haalt op papier maar 3,2:1).
- **Randen:** `rule` versiert: lijnen tussen berichten, en de rand van chips en knoppen met een label (het label maakt ze herkenbaar). `edge` (3:1) waar de rand het enige teken is dat iets bediening is: invoervelden en de filterknop met alleen een icoon.

## Type

- **Twee families, overal gelijk (tekstfont-keuze, 4 november 2026; Schibsted sinds v2.3).** Koppen: Newsreader 800, statisch, optische maat uit (`--serif`). Lopende tekst: Newsreader op optische maat 12, gewicht 450 en in Nacht 480 (`--lees`, `--lees-opsz`, `--lees-wght`; build 48, intro variant 4; terugval optische maat 11, 400). Bediening en uitleg: Schibsted Grotesk 400 · 600 · 700, kickers en labels in kapitalen 800 (`--sans`; vervangt Inter, v2.3). Alles meegeleverd in latin en latin-ext (geen Google Fonts-verzoek): web `src/fonts/` en de statische 800 van `@fontsource/newsreader`, iOS `ios/Hoot/Resources/Fonts/` (vaste standen uit dezelfde bron, `scripts/build-fonts.py`). Licenties: SIL OFL 1.1.
- **Maten van lopende tekst:** intro 17/24 (1,42) overal, ook in lijsten (was 15). Held-lead op de landing 22 px vanaf 440 breed, 19 px op de telefoon, regelafstand 1,42. Newsreader oogt op dezelfde maat kleiner dan een schreefloze letter; vandaar de stap omhoog.
- **Regellengte in em, niet in ch:** een ch is de breedte van een 0 en die verschilt per letter (Source Sans 0,50 · Newsreader 0,56 · Schibsted ± 0,56 · Inter 0,63 em). `measure-prose` is 28,8em (± 68 tekens Newsreader op 17).
- **Cijfers:** de tijd onder de bronnaam staat in tabelcijfers (Schibsted Grotesk), zodat "4 uur" en "41 min" niet verspringen; de statische Newsreader 800 heeft die niet, dus een serif-nummer (de stapteller, de nummers in de inhoud van de Selectie, de rang op een kaart) blijft proportioneel.
- **iOS:** dezelfde letters als het web, met `Font.custom(…, relativeTo:)`, zodat alles meeschaalt met Dynamische tekst (`Letters.swift`: `.kop`, `.ui`, `.leestekst()`). Dezelfde rollen, met de tekststijlen van iOS als maat. Lopende tekst krijgt regelafstand 1,42, bij de toegankelijkheidsmaten 1,3. De lezer laadt Newsreader Tekst (met vet en cursief) en Schibsted Grotesk via de app.

| Stijl | Web | iOS | Waar |
|---|---|---|---|
| `t6-lead` (`head-6`) | serif 800, 30/36 px, vanaf 720 px 34/40 | `.kop(.largeTitle)` (breed doet dat al) | Kop van het hoofdverhaal |
| `t5-screen` (`head-5`) | serif 800, 27/32 px | `Theme.headline(.title)` = `.kop(.title)`; in de balk Newsreader 800 op `.headline`/`.largeTitle` (UIKit) | Schermtitel (Middageditie, Stroom, Selectie …) |
| `head-lg-item` | serif 800, 22/26 px (`lh-head-lg`) | `.kop(.title2)` | Grote itemkop: een bericht in een brede lijst, het eerste stuk van een vak, een bladtitel |
| `t4-item` | serif 800, 18/22 px (`lh-4`) | `.kop(.title3)` | Kop van een bericht |
| `widget-kop` | — (alleen iOS) | Newsreader 800, 16/18,4 vast (`WidgetLetter.widgetKop`) | Koppen in de widgets: Middel · Top 3, Klein · Kop 01, 02 en 03 van Groot, vergrendelscherm. Een kop wordt nooit ingekort (besluit "korte kop dicht", keuring 9): de hele kop, met de regels die hij nodig heeft. `kortKop` is de kop zelf als hij in 60 tekens past. Nooit afgekapt |
| `intro` | lees 400, 17/24 (1,42), Nacht 430 | `.leestekst(.body)` | De intro van elk verhaal (ook in een lijst), de tekst van een post, in `ink-2` |
| `lees-proza` | lees 400, 17/28 | lezer: Newsreader Tekst, 1.6 | Proza, De Editie in één minuut, de lezer |
| `t2-ui` | sans 600, 15 px, 1.3 | `.ui(.subheadline, .semibold)` | Bronnaam (600), knoppen, chips |
| `t1-meta` | sans 400, 13 px | `.ui(.caption)` | Tijd, labels, toelichting |
| `kicker` | sans 800, 13 px, kapitalen, +0.06em, 1.3 | `.ui(.caption, .heavy)`, kapitalen | Rubriek; de punt tussen twee labels in `ink-3`; bij heel grote tekst zonder kapitalen |

- **Het verhaal wint van de schermtitel** (C7). De schermtitel (`head-5`, 27/32) zegt waar je bent; het oog landt op het nieuws: de kop van het hoofdverhaal (`head-6`, 30/36, vanaf 720 px 34/40) is altijd groter. Op het web staat dit zo; iOS volgt (I5): schermtitel `Theme.headline(.title)`, hoofdverhaal `.largeTitle` serif.
- **Widgets** (iOS, sinds 11 november 2026): achtergrond `paper`, koppen in `widget-kop` (16/18,4) en 01 groot in `t4-item`, labels in `kicker`, bron en voortgang in `t1-meta`, het enige rood is het nummer 01. Binnenmarge minstens `s4` (16) en nooit minder dan de marge van iOS; lucht tussen koppen minstens `s3`. Past een kop niet, dan krijgt hij meer regels of valt de kop eronder weg; een kop wordt nooit ingekort (shared/kort-kop.mjs). Liever minder koppen dan krap.
- **Koppen** krijgen `text-wrap: balance` (hoofdverhaal) of `pretty` (berichten) en breken nooit af met "…".
- **Intro's:** bij het hoofdverhaal hele zinnen (4–6 regels). In een lijst kies je zelf 1–3 regels of de hele intro; een ingekorte intro eindigt met "…", zodat je ziet dat er meer is.
- **De lezer** zet lopende tekst in Newsreader Tekst (met echt vet en cursief): 1,12rem × je tekstgrootte (was 1,06 in New York; Newsreader oogt op dezelfde maat kleiner), regelafstand 1.6, hooguit `readable` breed; de kop in Newsreader 800, kicker, bronregel en bijschriften in Schibsted Grotesk.

## Ruimte en vorm

- **Eén schaal van 4 px:** `s1` 4, `s2` 8, `s3` 12, `s4` 16, `s5` 24, `s6` 32, `s7` 48. Elke marge, padding en tussenruimte komt hiervandaan, ook in Swift (`Space.s1`–`Space.s7`). De enige uitzondering is `s0` (2 px): tussen twee regels van één label, zoals bronnaam en tijd.
- **Maten van dingen** (geen ruimte) hebben eigen tokens: icoon 22, bronlogo 24 in de bronregel en 28–30 in de bronnenrij, miniatuur 96 × 64 (3:2; web op een smalle telefoon 84 × 56, bij grote tekst 108 × 72) en dezelfde 3:2-miniatuur op de voorpagina. Beeldverhoudingen zijn ook tokens: `media-tl` 2:1 voor de Tijdlijn (een besluit), `media-lead` 2:1 en `media-lead-wide` 21:9 voor het hoofdverhaal op de website, `media-lead-portrait` 4:5 en `media-lead-portrait-wide` 3:4 (kolom 300) voor een gemeten staand hoofdbeeld, `media-card` 16:9 voor een kaart van de Selectie, `media-link` 1,91:1 voor de linkkaart in een post. Elk aanraakdoel is minstens `tap` (44 × 44), ook als het zichtbare deel kleiner is.
- **Zijmarge** is `gutter` (16 px). De leesbreedte is op het web `measure` (720 px) en op iOS `readable` (680 px); de regellengte is op beide `measure-prose` (28,8em, even breed als 58ch in Source Sans 3). Brede pagina's (Editie, Selectie op iPad en desktop) gaan tot `wide` (1000 px).
- **Vier hoeken:** `radius-sm` (8) voor miniaturen; `radius` (12) voor beeld, kaarten, meldingen, velden en icoonknoppen; `radius-lg` (16) voor bladen; `radius-pill` voor chips, knoppen met tekst, schakelaars en bronlogo's. In Swift `Radius.sm`, `.md`, `.lg`.
- **Schaduw alleen voor wat zweeft** (`shadow-float`). Inhoud ligt plat: diepte komt van `surface` op `paper`. Zwevend zijn precies drie dingen: de melding "Ongedaan maken" (web en iOS), de knop met nieuwe berichten en terug naar boven. Glas (iOS) heeft zijn eigen diepte en krijgt geen extra schaduw.
- **Glas (iOS) alleen voor bediening:** de tabbalk, knoppen in de navigatiebalk, en knoppen die iets doen ("Meer berichten", "Probeer opnieuw", de onderwerpen van de Selectie). Nooit voor inhoud zoals een bericht of kaart.
- **Indeling op breedte, niet op toestel.** iOS: vanaf 700 pt twee kolommen (Editie, Selectie), vanaf 1000 pt beeld en tekst van het hoofdverhaal naast elkaar, daaronder de kop over de hele breedte. Web: stappen bij 560, 720, 960 en 1200 px (zie "Per platform").

## Beeld

- **Alleen scherpe beelden:** een hoofdverhaal alleen met een beeld van minstens 700 px breed, een groot beeld vanaf 400 px; anders geen beeld.
- **Vaste verhoudingen**, bijgesneden en niet uitgerekt:
  - hoofdbeeld 2:1 bij liggend beeld, 4:5 bij staand beeld en 3:4 naast de tekst op een breed scherm;
  - een bericht in de Stroom, Bewaard en Zoeken heeft twee vormen, op web en iOS gelijk ("Lees de Stroom als"): **Tijdlijn** — kop, intro, het beeld over de volle kolombreedte in 2:1 (`media-tl`, `radius`), de bronregel eronder; **Krant** — kop en intro links, een klein beeld 3:2 rechts met vaste breedte (`thumb`, `radius-sm`), de bronregel onder de tekst. Op alle breedtes dezelfde twee vormen;
  - miniatuur op de voorpagina 3:2, met `radius-sm`.
- **Bij heel grote tekst** valt de miniatuur weg: de kop krijgt de hele breedte.
- **Bronlogo's** zijn cirkels, zonder naam eronder: het logo is genoeg.
- **De lijn bovenaan de Stroom** (web en iOS gelijk):
  - links de rubrieken in de krantenletter, op één lijn met een haarlijn in `ink` (donker `ink-3`) eronder; één rode streep van 3 onder wat aan staat, die meeglijdt;
  - rechts op dezelfde lijn je bronnen als stapel van drie logo's van 28, half over elkaar, met een papierring;
  - een tik waaiert ze uit over de lijn (logo 36 in een doel van 44, "Alle bronnen" op de plek van de stapel) en de rubrieken wijken. Wat aan staat heeft een ring in `accent` en een vinkje; de rest is grijs en gedimd, maar blijft aan te tikken;
  - dicht met een keuze staan de gekozen logo's bovenop, met de naam in `accent` ervoor ("NOS", of "3 bronnen") en één klein vinkje op het voorste logo;
  - de lijn is in elke staat even hoog (48 plus de haarlijn).

## Beweging

- `dur-1` (140 ms) voor een directe reactie (bewaren, chip), `dur-2` (200 ms) voor iets dat in beeld komt; curve `ease`, `cubic-bezier(0.2, 0.7, 0.2, 1)`.
- `dur-3` (400 ms) voor iets dat van plek wisselt: de bronnenstapel die uitwaaiert en de rode streep onder de rubrieken. Curve `ease-glide`, `cubic-bezier(0.2, 0.8, 0.2, 1)`: vlot weg, zacht geland.
- Alleen dekking, verplaatsing en kleur; nooit iets dat de leespositie verschuift. Alles valt weg bij Verminder beweging.
- Merkbeweging (brandboard §03, `src/lib/motion.js`): de iris in Welkom sluit het merkrood in 700 ms (`cubic-bezier(0.6, 0, 0.2, 1)`) tot de punt van het kleine woordmerk op papier, en opent bij Terug weer (`cubic-bezier(0.8, 0, 0.4, 1)`); de laatste 40 % kleurt het rood mee naar `accent` (in donker koraal). Dit loopt via de Web Animations API, buiten de CSS-regel voor Verminder beweging, en wordt daar één fade van 350 ms.
- Het opstartscherm (brandboard §03a/b, `index.html` + `src/components/Splash.jsx`): bij een koude lading (nog geen vlag `hoot:splashed` in sessionStorage) en op het beginscherm bij elke start een vlak in `brand-red` met het woordmerk in `paper-brand` (160 × 49, als LaunchMark in de app) en de stuiterende punt: één sprong van 1,6 s (y −9/0/−2/0 pt, deuk 1,12 × 0,88 vanaf de onderkant), een CSS-`@keyframes` die bij Verminder beweging stilstaat. Het staat minstens één sprong en hooguit 5 s, tot de Editie er is (die laadt intussen). Dan glijdt het woordmerk naar het kleine "hoot." (de kop van de Editie op smal, het woordmerk in de zijbalk op breed; `cubic-bezier(0.3, 0, 0.1, 1)`, 55 % van de tijd) en sluit het rood als iris tot zijn punt in 600 ms (dezelfde curve en tint als in Welkom); zonder "hoot." in beeld sluit het tot de eigen punt en vervaagt het 150 ms. Voor nieuwe gebruikers landt het woordmerk, in de rust van de sprong, op de rode intro van Welkom (700 ms; het rood blijft) en vervaagt het opstartscherm in 300 ms; de iris komt dan bij de eerste papieren stap. Verminder beweging: fade van 350 ms. Zolang het staat, is de app `inert` en kleurt de browserbalk merkrood. De stijl staat in `index.html`, omdat het er moet zijn vóór `styles.css` geladen is; het is de laag `z-splash`.
- Van Welkom naar de Editie (`crossPlan` in `src/lib/motion.js`, als `.easeInOut(0.45)` in HootApp.swift): geen harde knip en geen skelet, maar een overvloeier van 450 ms, alleen dekking. De Editie staat al achter Welkom (App.jsx tekent hem tijdens Welkom, dus hij laadt en personaliseert intussen); bij Naar je Editie of Sluiten vervaagt het hele welkomscherm erover en gaat het dan pas weg, niet te bedienen zolang het vervaagt. Ook bij Verminder beweging: er verplaatst niets.

## Toestanden

- **Leeg:** wat er komt en wat je kunt doen ("Nog niets bewaard. Tik op het bladwijzericoon bij een bericht om het hier te bewaren.").
- **Geen verbinding:** de laatst bewaarde versie, met "Verversen lukt nu niet. Je ziet de laatste versie." en "Opnieuw". Zonder eerdere versie een melding met de knop "Probeer opnieuw".
- **Het einde van de editie:** een kaart in merkrood met de opkomende zon, "Je bent bij.", "Dit was de Avondeditie van zaterdag 31 oktober. De volgende staat morgenochtend klaar." (dagdelen, nooit kloktijden: na de ochtend "in de middag", na de middag "in de vroege avond") en "Of lees verder in de Stroom".
- **Gelezen:** de kop in `ink-3` in plaats van `ink`.
- **Verwijderen:** één ding (een bewaard bericht) gaat meteen, met daarna zes seconden "Ongedaan maken" (web: melding; iOS: balk onderaan, ook voorgelezen door VoiceOver). Alles tegelijk wissen ("Bewaarde artikelen verwijderen", "Alles als ongelezen markeren") vraagt bevestiging, met een zichtbare "Annuleer" en precies wat er verdwijnt.

## Merk en iconen

- **Het woordmerk "hoot."** staat in de serif, op 800 of heavy, in `brand`, met de punt in `accent`.
  - Klein linksboven in de Editie en in de zijbalk van de website.
  - Nooit groter dan de schermtitel, en nooit als achtergrond.
- **Het merkteken** is de "h." alleen. Het app-icoon heeft papier eronder (licht) of `paper` donker. Het favicon heeft geen vlak, zodat het naast de favicons van kranten past.
- **Iconen:**
  - website: Phosphor, duotone, 22 px, in `currentColor`;
  - iOS: SF Symbols in de gewichten van het systeem.
  - Nooit emoji in de bediening; emoji in inhoud van anderen blijven staan.
- **Tikbare iconen:**
  - in `ink-3`;
  - actief in `accent`;
  - bewaren is een bladwijzer (vol in `accent` = bewaard);
  - delen staat links van bewaren (web: Phosphor "Export", iOS: `square.and.arrow.up`) en deelt altijd de link van de uitgever met de kop als titel, nooit een Hoot-link. Op het web via het deelblad van het toestel; zonder deelblad gaat de link naar het klembord met de melding "Link gekopieerd".
- **Keuzeknoppen (chips)** die aan staan, tonen een vinkje en `accent`: nooit alleen een kleur.

## Per platform

Bewuste verschillen, omdat elk platform zijn eigen conventies heeft:

- **Letters:** gelijk: Newsreader en Schibsted Grotesk op beide (sinds 1.1.0, build 47). Het web gebruikt de variabele letters met de optische maat op de lettermaat; iOS vaste standen (Kop 800 op opsz 16, leestekst op opsz 12 in 450 en 480 voor Nacht, vet en cursief op opsz 17, Schibsted Grotesk in vier standen), omdat Dynamische tekst geen as kan meenemen.
- **Hoofdverhaal op een smalle website:** het beeld staat boven rubriek, kop en intro (liggend 2:1, op het brede web 21:9). Staand beeld is 4:5 en op een ruim scherm 3:4 naast de tekst. De app volgt dezelfde plaatsing; liggend blijft daar 2:1.
- **Lege toestand:** web en iOS gebruiken een getekende bladzijde, een serif-titel en uitleg in `ink-2`. Foutmeldingen op iOS houden de systeemweergave met een knop om opnieuw te proberen.
- **Bronnaam:** op de website kapt een lange naam af op één regel; in de app loopt hij door.
- **Alleen in de app:** de Hoot-lezer (zie ReaderPage) en de Bluesky-keuze bovenaan de Stroom.
- **Delen:** in de app in het contextmenu (lang drukken), in de lezer en bij een verhaal; op het web is er geen lang drukken, dus staat delen als icoon in de actieregel van elk bericht, naast bewaren, en in de kop van een verhaal.

## Toegankelijkheid

- Kleine tekst haalt minstens 4,5:1 op zijn achtergrond in beide thema's (zie de tabel bij Kleur); iconen en randen die iets betekenen minstens 3:1.
- Elk aanraakdoel is minstens 44 × 44, en groeit mee: knoppen en chips hebben een minimumhoogte, geen vaste hoogte.
- **Toetsenbordfocus (web):** een rand van 2 px in `accent`, 2 px buiten het element (`:focus-visible`). De volgorde volgt de leesvolgorde; na het sluiten van een blad of dialoog gaat de focus terug naar wat het opende.
- Dynamische tekst (iOS) en zoomen (web) werken tot de grootste maten. Labels lopen dan door in plaats van af te breken, en decoratie (miniaturen, vak-iconen) maakt plaats voor tekst.
- Wat bij elkaar hoort, leest VoiceOver als één element. De bron, delen, bewaren en "+N bronnen" blijven aparte knoppen met een duidelijk label ("Deel dit bericht", "Vergelijk 5 andere bronnen").

## Aanvulling voor 1.0.1 build 37

- Het Welkom gebruikt de vier zonnen. Het einde van de Editie blijft de enige opkomende zon tijdens het lezen.
- De perslijn tekent zich alleen bij een nieuwe Editie, na het opstartscherm: 400 ms voor de lijn, het hoofdverhaal vanaf 480 ms in 200 ms. Bij Verminder beweging vervagen beide in 200 ms.
- Een schakelaar die aan staat is inkt; de duim is papier in het donkere thema.
- Staande hoofdbeelden worden vooraf gemeten en krijgen 4:5, of 3:4 naast de tekst in een kolom van 300. Liggend blijft 2:1, op het brede web 21:9.
- De deelkaart gebruikt merkrood en papier, Newsreader 800 en het vaste woordmerk; web en iOS delen de maten en regelval.
- Dagdelen komen voor beide platforms uit één JSON-tabel. De wachtende punt staat stil bij Verminder beweging.
