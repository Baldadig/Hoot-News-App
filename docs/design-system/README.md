Hoot is een rustige nieuwslezer: drie keer per dag een editie van tien verhalen die ophoudt, een Stroom met de laatste berichten van je eigen bronnen en elke maandag een Digest voor je vak. Het beeld is de zaterdagkrant: warm papier, zwarte inkt, krantenrood als enige accent. Bouw elk scherm uit deze tokens en regels. De website (`src/styles.css`) en de iOS-app (`Theme`, `Space`, `Radius` en `Layout` in Swift, plus de kleuren in `Assets.xcassets`) delen dezelfde namen en rollen; maten staan op het web in CSS-pixels en in iOS in punten (1 px = 1 pt). Waar een platform bewust afwijkt, staat dat onder "Per platform". De tokens (`tokens.json`) zijn de bron: bij twijfel geldt de tokenwaarde.

## Principes

- **Het verhaal is de eenheid.** De bron blijft altijd zichtbaar en aanklikbaar; openen, de bron bekijken en bewaren zijn drie aparte doelen van minstens `tap` (44 px).
- **Lijnen en witruimte, geen omlijnde kaarten.** Berichten scheid je met een `rule`-haarlijn en `s5`; een kaart (`surface`, `radius`) alleen voor iets dat echt los staat: een Digest-stuk, een melding, een blad.
- **Drie rollen voor letters.** Koppen en schermtitels in `serif`; bediening, lijsten, intro's en metadata in `sans`; lange leestekst in de lezer weer in `serif`.
- **Eén accent.** `accent` markeert rubriek, actief, "+N bronnen", het label "gratis" en het punt van het woordmerk. Nooit als vlakvulling van een heel scherm, en nooit voor gewone bediening: iconen in de kop (instellingen, zoeken, verversen) zijn `ink-3`.
- **Merkmomenten in merkrood.** Op een handvol vaste momenten wordt het krantenrood een vol vlak (`brand-red` met `on-brand-red`): het opstartscherm van de app, het welkom, het einde van de editie ("Je bent bij.") en de deel- en App Store-beelden. Juist omdat de rest papier en inkt is, voelt dat fris; daarom nergens anders, en nooit op een scherm waar je leest.
- **Niets beweegt terwijl je leest.** Nieuwe berichten wachten achter een knop; de leespositie verschuift nooit vanzelf.
- **Een einde.** Elke lijst die eindigt, zegt dat. Het einde is leidend; verder lezen mag, maar als rustige link, nooit als knop die je doortrekt.

## Taal

- **Nederlands, je en jij**, kort en zakelijk, zonder uitroeptekens of emoji in de bediening.
- **Zeg wat er gebeurt**, in de taal van de lezer: "Bewaar", "Markeer als ongelezen", "Je ziet de versie van 10:10", "Inloggen bij NRC". Niet "Sync", niet "Cache".
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
- **De Digest** is breder dan werk: "Eén keer per week bijgepraat over wat jou bezighoudt." Vak, hobby of liefhebberij.
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
| Merkmoment (vol vlak) | `on-brand-red` op `brand-red` | — |
| Waarschuwing en fouttekst (met woorden) | `warn` | `paper` |
| Rand van een veld of filterknop | `edge` | `paper`, `surface` |

- **`ink-3` is de ondergrens voor kleine tekst** (5,2:1 licht, 6,7:1 donker). Gebruik nooit een lichter grijs, ook niet het secundaire grijs van het systeem: dat haalt op papier maar 3,3:1.
- **De kleurverdelingen Blad en Inkt** (alleen op de website) gebruiken `sheet`, `sheet-surface` en `sheet-edge`, en voor de editiekop `band` met `band-ink` tot en met `band-accent`. Binnen het blad zijn `paper` en `surface` de bladkleuren, dus componenten hoeven niets te weten.
- **Puntjes:** een bron die tijdelijk niet bereikbaar is krijgt een `quiet-amber`-punt van 6 px naast een tekst die hetzelfde zegt; een verhaal met nieuwe berichten een `accent`-punt van 8 px voor "+N bronnen".
- **Fouttekst** is `warn`, nooit het rood van het systeem (dat haalt op papier maar 3,2:1).
- **Randen:** `rule` versiert: lijnen tussen berichten, en de rand van chips en knoppen met een label (het label maakt ze herkenbaar). `edge` (3:1) waar de rand het enige teken is dat iets bediening is: invoervelden en de filterknop met alleen een icoon.

## Type

- **Website:** Newsreader 800 voor koppen, Source Sans 3 (400–800) voor tekst en bediening, beide meegeleverd (geen Google Fonts-verzoek).
- **iOS:** de serif van het systeem (New York, `.serif` design, bold) en San Francisco, zodat alles meeschaalt met Dynamische tekst. Dezelfde rollen, met de tekststijlen van iOS als maat.

| Stijl | Web | iOS | Waar |
|---|---|---|---|
| `t6-lead` | serif 800, 30–34 px, 1.15 | `.title` / breed `.largeTitle`, serif bold | Kop van het hoofdverhaal |
| `t5-screen` | serif 800, 27 px | grote navigatietitel in serif heavy (`.largeTitle`); klein in de balk serif bold (`.headline`) | Schermtitel (Middageditie, Stroom, Digest …) |
| `t4-item` | serif 800, 18 px | `.title3`, serif bold | Kop van een bericht |
| `t3-body` | sans 400, 17 px, 1.5 | `.body` | Lopende tekst, intro van het hoofdverhaal |
| `t2-sum` | sans 400, 15 px, 1.5 | `.subheadline` | Intro van een bericht in een lijst, in `ink-2` |
| `t2-ui` | sans 600, 15 px, 1.3 | `.subheadline` semibold | Bronnaam (600), knoppen, chips |
| `t1-meta` | sans 400, 13 px | `.caption` | Tijd, labels, toelichting |
| `kicker` | sans 800, 13 px, kapitalen, +0.06em, 1.3 | `.caption` heavy, kapitalen | Rubriek; de punt tussen twee labels in `ink-3`; bij heel grote tekst zonder kapitalen |

- **Koppen** krijgen `text-wrap: balance` (hoofdverhaal) of `pretty` (berichten) en breken nooit af met "…".
- **Intro's:** bij het hoofdverhaal hele zinnen (4–6 regels). In een lijst kies je zelf 1–3 regels of de hele intro; een ingekorte intro eindigt met "…", zodat je ziet dat er meer is.
- **De lezer** zet lopende tekst in de serif: 1,06rem × je tekstgrootte, regelafstand 1.6, hooguit `readable` breed.

## Ruimte en vorm

- **Eén schaal van 4 px:** `s1` 4, `s2` 8, `s3` 12, `s4` 16, `s5` 24, `s6` 32, `s7` 48. Elke marge, padding en tussenruimte komt hiervandaan, ook in Swift (`Space.s1`–`Space.s7`). De enige uitzondering is `s0` (2 px): tussen twee regels van één label, zoals bronnaam en tijd.
- **Maten van dingen** (geen ruimte) hebben eigen tokens: icoon 22, bronlogo 24 in de bronregel en 28–30 in de bronnenrij, miniatuur 76 (web 64–88 naar indeling). Elk aanraakdoel is minstens `tap` (44 × 44), ook als het zichtbare deel kleiner is.
- **Zijmarge** is `gutter` (16 px). De leesbreedte is `readable` (680 px); brede pagina's (Editie, Digest op iPad en desktop) gaan tot `wide` (1000 px).
- **Vier hoeken:** `radius-sm` (8) voor miniaturen; `radius` (12) voor beeld, kaarten, meldingen, velden en icoonknoppen; `radius-lg` (16) voor bladen; `radius-pill` voor chips, knoppen met tekst, schakelaars en bronlogo's. In Swift `Radius.sm`, `.md`, `.lg`.
- **Schaduw alleen voor wat zweeft** (`shadow-float`). Inhoud ligt plat: diepte komt van `surface` op `paper`. Zwevend zijn precies drie dingen: de melding "Ongedaan maken" (web en iOS), de knop met nieuwe berichten en terug naar boven. Glas (iOS) heeft zijn eigen diepte en krijgt geen extra schaduw.
- **Glas (iOS) alleen voor bediening:** de tabbalk, knoppen in de navigatiebalk, en knoppen die iets doen ("Meer berichten", "Probeer opnieuw", de vakgebieden van de Digest). Nooit voor inhoud zoals een bericht of kaart.
- **Indeling op breedte, niet op toestel.** iOS: vanaf 700 pt twee kolommen (Editie, Digest), vanaf 1000 pt beeld en tekst van het hoofdverhaal naast elkaar, daaronder de kop over de hele breedte. Web: stappen bij 560, 720, 960 en 1200 px (zie "Per platform").

## Beeld

- **Alleen scherpe beelden:** een hoofdverhaal alleen met een beeld van minstens 700 px breed, een groot beeld vanaf 400 px; anders geen beeld.
- **Vaste verhoudingen**, bijgesneden en niet uitgerekt:
  - hoofdbeeld 16:9 (iPhone), 2:1 (iPad mini) of 3:2 (breed);
  - miniatuur vierkant, met `radius-sm` tot `radius`.
- **Bij heel grote tekst** valt de miniatuur weg: de kop krijgt de hele breedte.
- **Bronlogo's** zijn cirkels, zonder naam eronder: het logo is genoeg. In de bronnenrij ("Filter op bron") staat "Alle" vooraan. Je kiest één of meer bronnen; wat aan staat is in kleur, met een ring in `accent` en een vinkje, de rest grijs en gedimd. De namen van wat je kiest staan in de statusregel eronder, met "Wis" (web en iOS gelijk).

## Beweging

- `dur-1` (140 ms) voor een directe reactie (bewaren, chip), `dur-2` (200 ms) voor iets dat in beeld komt; curve `cubic-bezier(0.2, 0.7, 0.2, 1)`.
- Alleen dekking, verplaatsing en kleur; nooit iets dat de leespositie verschuift. Alles valt weg bij Verminder beweging.

## Toestanden

- **Leeg:** wat er komt en wat je kunt doen ("Nog niets bewaard. Tik op het bladwijzericoon bij een bericht om het hier te bewaren.").
- **Geen verbinding:** de laatst bewaarde versie, met "Verversen lukt nu niet. Je ziet de versie van 10:10." en "Opnieuw". Zonder eerdere versie een melding met de knop "Probeer opnieuw".
- **Het einde van de editie:** een kaart in merkrood met de "h.", "Je bent bij.", "Dit was de avondeditie van dinsdag 27 oktober. De volgende staat klaar om 06:00." en "Toch verder lezen in de Stroom".
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
  - bewaren is een bladwijzer (vol in `accent` = bewaard).
- **Keuzeknoppen (chips)** die aan staan, tonen een vinkje en `accent`: nooit alleen een kleur.

## Per platform

Bewuste verschillen, omdat elk platform zijn eigen conventies heeft:

- **Letters:** web Newsreader en Source Sans 3; iOS New York en San Francisco, zodat Dynamische tekst werkt.
- **Hoofdverhaal op een smalle website:** eerst rubriek, kop en intro, dan het beeld (21:9 vanaf 720 px). In de app staat het beeld boven de kop (16:9, iPad mini 2:1, breed 3:2 ernaast).
- **Lege toestand:** web met een serif-titel en uitleg in `ink-2`; iOS met de standaardweergave van het systeem (`ContentUnavailableView`) met dezelfde teksten.
- **Bronnaam:** op de website kapt een lange naam af op één regel; in de app loopt hij door.
- **Alleen in de app:** de Hoot-lezer (zie ReaderPage) en de Bluesky-keuze bovenaan de Stroom.

## Toegankelijkheid

- Kleine tekst haalt minstens 4,5:1 op zijn achtergrond in beide thema's (zie de tabel bij Kleur); iconen en randen die iets betekenen minstens 3:1.
- Elk aanraakdoel is minstens 44 × 44, en groeit mee: knoppen en chips hebben een minimumhoogte, geen vaste hoogte.
- **Toetsenbordfocus (web):** een rand van 2 px in `accent`, 2 px buiten het element (`:focus-visible`). De volgorde volgt de leesvolgorde; na het sluiten van een blad of dialoog gaat de focus terug naar wat het opende.
- Dynamische tekst (iOS) en zoomen (web) werken tot de grootste maten. Labels lopen dan door in plaats van af te breken, en decoratie (miniaturen, vak-iconen) maakt plaats voor tekst.
- Wat bij elkaar hoort, leest VoiceOver als één element. De bron, bewaren en "+N bronnen" blijven aparte knoppen met een duidelijk label ("Vergelijk 5 andere bronnen").
