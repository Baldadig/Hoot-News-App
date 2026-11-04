# Hoot · Brand guide v2.2

Woensdag 4 november 2026, voor versie 1.1.0. Vult Brand Guide v2.1 aan en gaat erboven waar ze verschillen. Register: `tokens.json` (versie 2). Code: web `src/styles.css`, iOS `ios/Hoot/Views/Components.swift` (`Theme`), `Layout.swift` en `Assets.xcassets`.

Bronnen: de keuzes van Alex (4 november, keuzepagina), het update-voorstel bij de brand guide, de ds-toets (15 verschillen), de beeldtaal en het voorstel voor stem en toon. De gezaghebbende brandmap ("079 - Hoot") is niet gewijzigd; deze gids is de repo-versie van v2.2.

Inhoud: [1 Keuzes](#1--keuzes-voor-110) · [2 Kleur](#2--kleur) · [3 Type](#3--type) · [4 Ruimte en maten](#4--ruimte-en-maten) · [5 Beweging](#5--beweging) · [6 Merk](#6--merk-app-icoon-deelkaart-bronmerk) · [6b Beeldtaal](#beeldtaal) · [7 Onderdelen](#7--onderdelen) · [8 Normaanpassingen](#8--normaanpassingen-uit-de-ds-toets) · [10 Stem en toon](#stem-en-toon)

---

## 1 · Keuzes voor 1.1.0

Door Alex gemaakt op 4 november. Ze zijn norm vanaf v2.2.

| Onderwerp | Keuze |
|---|---|
| Onboarding | Mix: uitleg van A (met de juiste animatie: de zon achter de horizon), bronnen van B. Interesses en Selectie op één scherm. Een seintje na de eerste Editie. Terughoudend vragen om een account. |
| Bovenbalk | A: kopregel met een vlakke strook. |
| Iris | Eerst vervagen, dan reizen. |
| Minder rood | B, met de segmenten van A. |
| Breed | B op iPad staand, A breed. |
| Stroom-kaart | B: de bron onder. |
| Stroom-tabs | A: schuiven, met een zachte rand. |
| Eindzin | Vast per Editie: web en iOS tonen bij dezelfde Editie dezelfde zin. "Dan ben je bij." blijft op de landing en in de onboarding. |
| Selectie en lezen | "Hoe kiest Hoot" 1 · Kort · Selectie-index B (inhoud bovenaan) · inlogpaneel A (paneel onderaan) · Instellingen A met de samenvatting uit B. |
| Labels | Eerste themakeuze heet **Automatisch** (niet "Systeem"). Melding: "Hoot uit je Apple ID halen lukte niet". |
| Beeldtaal | Composities 01, 02, 04, 05, 06, 07, 09, 10 en 11. Lijntekening in lege schermen: ja. |
| Kleurverhouding | 60 · 30 · 10. |
| App-icoon | "Icoon moet te kiezen zijn. Rood behouden." Rood standaard, de keuze blijft. |
| Pull-strook | Sluit in 400 ms (op de schaal). |
| Leesbreedte | Web 720, iOS 680. |
| Deelkaart | Papieren schijf achter het uitgeverslogo: ja. |
| Ds-toets | De 15 oordelen: akkoord (6 herstellen, 9 norm aanpassen; zie §8). |
| Overig | Ondertitel "Jouw nieuws, rustig bij elkaar". Vakbronnen alleen met een gekozen interesse. Liveblogs als één bericht. Server-ontdubbelen volgende ronde. |

---

## 2 · Kleur

### Drie thema's en Automatisch

- **Licht** (de zaterdagkrant), **Donker** (warm donker `#151310`) en **Nacht** (echt zwart, voor OLED en de late avond). Dezelfde rollen in alle drie.
- Weergave › Thema: **Automatisch · Licht · Donker · Nacht**. Automatisch volgt het toestel. Alleen bij Automatisch staat eronder **Als het donker is: Donker | Nacht** (standaard Donker).
- VoiceOver bij Nacht: "Nacht, echt zwart". Het app-icoon wisselt niet mee.
- Opslag gelijk: web `theme` + `themeDark`, iOS `hoot.weergave` + `hoot.weergave.donker`.
- **Regel:** Nacht erft Donker. Wat Nacht anders doet, staat in het register met een `night`-waarde; niets daarbuiten.

### Nacht · Zacht papier

Warme, papierachtige inkt; niets koud of blauw; geen groot licht vlak. Alle grote vlakken zwart (pagina, blad, band, statusbalk). Kaarten en bladen `#1e1b17` met haarlijn. Geen witte flits bij opstarten, iris, laden of rubriekwissel.

| Token | Donker | Nacht | Contrast Nacht (op zwart / op `#1e1b17`) |
|---|---|---|---|
| `paper` | `#151310` | `#000000` | — |
| `ink` | `#f1ece2` | `#d8d0c2` | 13,7 / 11,2 |
| `ink-2` | `#cbc3b5` | `#bdb3a2` | 10,1 / 8,3 |
| `ink-3` | `#a39b8d` | `#a79b87` | 7,7 / 6,3 |
| `accent` | `#ec7a70` | `#df8276` | 7,6 / 6,2 |
| `brand` | `#f1ece2` | `#d8d0c2` (= ink) | 13,7 |
| `band-accent` | `#ec7a70` | `#df8276` (= accent) | 7,6 |
| `mark-bg` | `#f1ece2` | `#d8d0c2` (= ink) | logo's lichten niet op |
| `switch-thumb` | `#fcfaf5` | `#d8d0c2` (= ink) | geen helder vlak |
| `sheet`, `band`, `top` | `#1e1b17`, `#0b0a08` | `#000000` | grote vlakken zwart |
| `sheet-surface` | `#27231e` | `#1e1b17` | — |

Laagste tekstpaar in Nacht: 5,5:1. **Merkrood blijft `#A3201B`** in alle drie de thema's.

### Kleurverhouding 60 · 30 · 10

In uitingen (landing, App Store, deelkaart, campagne): **60 papier, 30 inkt, 10 merkrood**. In de app is het rood een detail: de punt, de kicker, wat gekozen is. Eén rood moment per beeld.

---

## 3 · Type

- **Lezen in serif, bedienen in sans** (keuze 4 november 2026, `tekstfont/ADVIES.md`). Koppen, displays en de nummers 01–10 in **Newsreader 800** (optische maat uit). Lopende tekst (leads, intro's in Editie, Stroom en Selectie, uitlegzinnen, de lezer) in **Newsreader op tekstmaat**, 400, in Nacht 430. Tabs, knoppen, bron, metadata, waarom-regel en cijfers in **Inter** 400 · 600 · 700; labels in kapitalen 800. Web en iOS gelijk; Source Sans 3 en New York/San Francisco zijn weg.
- **Maten:** intro 17/24 (1,42). Held-lead 22 px (vanaf 440) en 19 px (telefoon), 1,42, hooguit 36ch. Inter: letterafstand 0 tot en met 15 px, −0,01em vanaf 20 px, +0,06em voor kapitalen. "Gratis…" onder de knoppen is bediening: Inter 600.
- Regelhoogtes zoals in code en register: itemkop groot **22/26**, itemkop **18/22** (v2.1 p15 noemde 22/24 en 18/20; de extra lucht hoort tussen staart en stok).
- **Editie-nummer** (`edition-number`): 01 t/m 10, twee cijfers, in de kicker vóór de rubriek (`01 · BUITENLAND`), tabelcijfers, kleur en gewicht van de kicker. Op breed web (≥ 960) in de kantlijn (`number-hang`, 2ch + s3). De bubbel komt ná 10, zonder nummer. VoiceOver: "Verhaal 1 van 10".

---

## 4 · Ruimte en maten

- **Leesbreedte: web 720, iOS 680.** Web `measure` (720) voor elk leesblok: Stroom, Bewaard, Zoeken, het verhaal, de eindkaart. iOS `readable` (680, `Layout.readable`): kolom, lezer, inlogpaneel. Eén kolomstap verschil, bewust. De regellengte is op beide gelijk: lopende tekst stopt op `measure-prose` (28,8em: even breed als 58ch in Source Sans 3, maar los van de breedte van de 0).
- Welkom behoudt op het web zijn eigen breedte (680); dat is geen leesblok.
- **Optische correcties** mogen buiten de schaal, **alleen als token met reden**: `baseline-nudge-sans` 2,6 px (Source Sans 15 naast Newsreader 17), `ring-cut` 2 px (stip, vinkje), `ring-cut-stack` 3,2 px (logo's in de stapel).
- Alles verder op de schaal van 4: `s0` 2 (alleen binnen één label) en `s1`…`s7` = 4 · 8 · 12 · 16 · 24 · 32 · 48. De bronkaart in Welkom en zijn vinkje staan nu op `s1` (was 6 · 3 en 3).

---

## 5 · Beweging

Eén schaal: **140 · 200 · 400** (`dur-1`, `dur-2`, `dur-3`). Drie lagen, één ritme:

| Laag | Wat | Duur | Verminder beweging |
|---|---|---|---|
| **Bediening** | reageren: bewaren, chip, schakelaar, streep | 140 · 200 · 400 | direct |
| **Overgang** | inhoud wisselt op dezelfde plek: rubriekwissel, Welkom → Editie | 200 · 450, alleen dekking | direct (Welkom → Editie houdt de vervaging) |
| **Merk** | de punt: sprong, adem, iris, pull-h. | 600 · 700 · 1600 | stil eindbeeld, hooguit één vervaging van 350 |

- **Rubriekwissel: 200 ms crossfade** (`motion-swap`). Oude lijst vervaagt, nieuwe komt op, tekst en beeld samen, alleen dekking. Geen verticale beweging, geen hoogtesprong. De rubriekstreep glijdt zoals altijd (400, `ease-glide`).
- **Pull-to-refresh.** De h. met punt is het enige trek- en laadteken (Editie, Stroom, Selectie). Trekken: de punt zakt mee tot de drempel (72). Laden: de h. staat in een strook van 56, de punt beweegt subtiel. Klaar: de h. vervaagt in **140** (`dur-pull-out`), daarna **sluit de strook in 400 met `ease-glide`** (`dur-pull-close`, was 0,3 s). Niets over de inhoud, geen layoutsprong. VoiceOver: "Bezig met verversen". Verminder beweging: stil, zonder animatie. De enige merkbeweging tijdens het lezen, en alleen op verzoek.
- **Iris.** Opstarten → Editie: het grote woordmerk vervaagt op zijn plek; alleen de iris reist naar de punt van het kleine "hoot." (eerst vervagen, dan reizen). Eindpunt gemeten, nooit hardgecodeerd. Eerste start (Welkom) houdt de rode intro. Verminder beweging: één vervaging van 350. Nacht: geen witte flits.

| Token | Waarde | Rol |
|---|---|---|
| `dur-iris` | 600ms | iris opstart → app |
| `dur-iris-intro` | 700ms | iris rode intro → papier |
| `dur-land` | 700ms | woord landt op de intro |
| `dur-crossplan` | 450ms | Welkom → Editie |
| `dur-reduced` | 350ms | de ene vervaging bij Verminder beweging |
| `dur-bounce` | 1600ms | één sprong van de punt |
| `dur-breathe` | 2750ms | adem per stap |
| `ease-iris` | cubic-bezier(0.6, 0, 0.2, 1) | iris sluit |
| `ease-iris-open` | cubic-bezier(0.8, 0, 0.4, 1) | iris opent |
| `ease-land` | cubic-bezier(0.3, 0, 0.1, 1) | woord landt |

Regels: één ding beweegt tegelijk · alleen dekking, verschuiving en kleur (nooit hoogte of breedte in een lijst) · merkbeweging bij binnenkomst of op verzoek · de punt is de hoofdrolspeler · Nacht flitst nooit · geen veer met een staart.

---

## 6 · Merk: app-icoon, deelkaart, bronmerk

### App-icoon: rood standaard, en te kiezen

**Dit vervangt het oude verbod** ("Geen rode achtergrond", v2.1 p. 02). Standaard is **Papier op rood**: het h.-teken in papier `#F5F1E8` op merkrood `#A3201B`, punt papier (6,7:1). Het icoon blijft te kiezen in Instellingen › App-icoon, in deze volgorde:

1. **Papier op rood** (standaard)
2. **Ruim rood** (meer lucht rond het teken)
3. **Origineel** (papier, zwarte h, rode punt)
4. **Papier op inkt** (papier-h op `#1A1814`, rode punt)

Donkere iOS-weergave: elke keuze zwart; getint: iOS kleurt. Het icoon volgt nooit het leesthema. Blijft: alleen de h. met punt, geen woordmerk, geen schaduw, geen verloop, nooit een rode punt op rood. Web (PWA, favicon) blijft het Origineel; alleen iOS kent keuzes.

### Deelkaart

Merkrood vlak, alles in papier: lijn, woordmerk "hoot.", lijn; kicker in kapitalen; kop in Newsreader 800 (hooguit vier regels, kleinste 32). Onder een haarlijn het uitgeverslogo en de bronnaam, daaronder `gethoot.app`. Link 1200 × 630, staand 540 × 675, marges 64 / 40.

- **Uitgeverslogo op een papieren schijf** (`mark-share` 28, `paper-brand`), met `mark-logo-pad` 14 % lucht (4 px). Het logo staat erop als silhouet in merkrood, zodat geen logokleur met het rood vecht. Web (`netlify/lib/deelkaart.mjs`) en iOS (`DeelKaart.swift`) lezen dezelfde `shared/deelkaart/layout.json` (`mark`) en dezelfde logo's.
- **Geen logo:** het monogram, een lijncirkel van 28 met 1 px papier en de eerste letter. Geen schijf.

### Bronmerk in de app

- Achter een uitgeverslogo ligt `mark-bg`: wit in Licht, gedempt `#f1ece2` in Donker, inkt `#d8d0c2` in Nacht. Web en iOS gelijk (`--mark-bg`, `Theme.markBg`).
- Om elk logo en monogram een **dunne ring**: `hairline`, inkt op 14 % (web `.mark::after`, iOS `Theme.hairline`).

---

<a id="beeldtaal"></a>

## 6b · Beeldtaal

Drie kleuren (papier, inkt, merkrood) in de verhouding 60 · 30 · 10, en zes vormen uit het merk: cirkel (de punt, de zon), halve cirkel (de horizon), kwartcirkel (de hoek), balk (de kolom, 01–10), raster (het ritme), diagonaal (de wissel).

Gekozen composities (SVG in [`beeldtaal/`](beeldtaal/)):

| # | Compositie | Bestand | Hoort bij |
|---|---|---|---|
| 01 | Zon op de horizon | `01-zon-op-de-horizon.svg` | Editie komt op · lege schermen |
| 02 | De iris sluit | `02-de-iris-sluit.svg` | opstart, iris |
| 04 | Raster met één punt | `04-raster-met-een-punt.svg` | Stroom · Zoeken (leeg) |
| 05 | Dag en nacht | `05-dag-en-nacht.svg` | Licht · Nacht |
| 06 | Ochtend, middag, vroege avond | `06-ochtend-middag-vroege-avond.svg` | drie Edities, nooit een klok |
| 07 | Tien en de bubbel | `07-tien-en-de-bubbel.svg` | nummering, de bubbel |
| 09 | Het persvel | `09-het-persvel.svg` | deelkaart |
| 10 | Nacht | `10-nacht.svg` | Nacht |
| 11 | De stapel | `11-de-stapel.svg` | bronnenstapel, Stroom |

**Waar wel:** landing (banden, slot, uitleg), App Store-beelden, lege toestanden (als lijntekening van 96), onboarding (rode intro, uitlegstappen), deelkaart en social, presentaties en drukwerk.
**Waar niet:** nooit in de leeslaag (Editie, Stroom, Selectie, de lezer, Bewaard met inhoud); niet over of naast nieuwsfoto's; niet onder lopende tekst; niet bewegen tijdens het lezen; geen vierde kleur, verloop, schaduw of textuur; nooit een rode punt op rood.

**Bouwregels:** alles op de schaal van 4; lijnen 1 of 2, een accentlijn hooguit 8 · één rood moment per beeld · vormen uit het merk · ruime marge (minstens 24 op 240) · geen letters als vorm behalve de ontlede h · in Nacht: inkt wordt zwart, papier wordt zacht papier `#D8D0C2`, rood wordt `#DF8276` als het klein is · beweging alleen buiten de app, met de merkcurves; met Verminder beweging een stil eindbeeld.

### Lege schermen

Twee lijntekeningen van 96 (`art`), afgeleid van 01 en 04 (`beeldtaal/leeg-01-horizon.svg`, `leeg-04-raster.svg`):

- **Zon op de horizon** (Bewaard, Editie, Stroom, Bluesky): boog en horizon in inkt (2), twee korter wordende regels (1), de rode punt van "hoot." aan het eind van de horizon.
- **Raster met één punt** (Zoeken): 24 inktpunten, één rode punt.

Dunne lijnen en punten in `art-thin`: inkt, in Nacht `ink-3`. Op het web tekent de lijn zich in 400 (`ease-glide`), dan komt de punt (140), dan de tekst (200); iOS gelijk. Verminder beweging: alles staat stil. Een fout krijgt nooit een tekening.

---

## 7 · Onderdelen

- **Einde van de Editie:** "Je weet genoeg." en "Je bent bij." wisselen, vast per Editie. Einde van de Stroom: "Je bent bij." Altijd met punt; op merkrood is de punt papier. Nooit "houdt op", "dat was het", "einde".
- **Inlogpaneel (iOS):** één rustige uitnodiging onder in de lezer bij een betaalde bron: "Abonnee? Log één keer in en lees het hele stuk hier." Eén inktknop "Log in bij {bron}" (hoogte 52, `control-lg`). Sluiten met een x (44) of omlaag vegen: 7 dagen weg voor die bron. Papier, haarlijn boven, `s4` binnen, `s3` tussen, breedte `readable`.
- **Lege toestand:** tekening (§6b), titel als serifkop in inkt, hooguit drie regels uitleg in `ink-2` (`measure-empty`), één inktknop.
- **Segment:** in elk thema dezelfde opmaak (geen Nacht-uitzondering).

---

## 8 · Normaanpassingen uit de ds-toets

Alle 15 oordelen akkoord. **Hersteld in de code** (6): segment zonder Nacht-regel (6) · iOS logovlak in `markBg` bij bronlogo en SourceMark (7, 8) · bronkaart Welkom en vinkje op de schaal (11, 12) · iOS-commentaar art 96 (15).

**Norm aangepast** (9), het register volgt de code:

| # | Wat | Nieuwe norm |
|---|---|---|
| 1 | Thema's | `night` toegevoegd; elke kleurtoken heeft een `night`-waarde (§2). |
| 2 | `on-brand-red` | `#f5f1e8` (= `paper-brand`), 6,7:1. Niet wit. |
| 3 | `shadow-float` | `0 6px 18px rgba(26,24,20,0.20)`; donker en Nacht `0 6px 18px rgba(0,0,0,0.5)`. |
| 4 | Schakelduim in Nacht | `switch-thumb` night = inkt: geen helder vlak. |
| 5 | Grote vlakken in Nacht | Niet alleen `paper`: ook `sheet`, `band`, `top` zwart, `sheet-surface` `#1e1b17`. |
| 9 | Leesbreedte | `measure` 720 (web) naast `readable` 680 (iOS), regellengte `measure-prose` 28,8em. |
| 10 | Regelhoogtes | 22/26 en 18/22 (code en register hadden gelijk). |
| 13 | Basislijn | `baseline-nudge-sans` 2,6 px: optische correctie met reden. |
| 14 | Uitsnijring | `ring-cut` 2 px en `ring-cut-stack` 3,2 px. |

---

<a id="stem-en-toon"></a>

## 10 · Stem en toon

Vult de schrijfregels uit v2.1 en de `RELEASENOTES-STIJLGIDS.md` aan.

### Wie praat er

Hoot praat als **een goede eindredacteur die je kent**: iemand die alles al gelezen heeft, het belangrijkste voor je klaarlegt en je daarna met rust laat. Geen verkoper, geen notificatie, geen robot.

| Hoot is | Dus | Hoot is niet |
|---|---|---|
| **Rustig** | korte zinnen, geen haast, geen uitroeptekens | druk, dringend, "mis het niet" |
| **Helder** | zeg wat er is en wat je kunt doen | vaag, technisch, half |
| **Warm** | je en jij, positief, een uitweg bij elke fout | koel, ambtelijk, verwijtend |
| **Mild poëtisch** | soms één klein beeld: ochtend, papier, licht, uil | zweverig, grappig om het grappig zijn |

Het mild poëtische zit **in de randen**: welkom, het einde van de Editie, releasenotes, landing. In de bediening en in foutmeldingen is Hoot gewoon helder.

### Zeven schrijfregels

1. **KISS.** Liever een beter label dan uitleg. Uitleg alleen als het echt moet, en dan één zin.
2. **Je en jij.** Nooit u. Nooit "de gebruiker".
3. **Werkwoord vooraan** op knoppen: "Volg", "Log in bij NRC", "Probeer opnieuw". Niet "Inloggen-optie".
4. **Kort.** Een zin heeft één gedachte. Twaalf woorden is lang genoeg.
5. **Concreet.** Zeg wat er gebeurt, niet hoe het werkt. "Tien verhalen" in plaats van "een gepersonaliseerde selectie".
6. **Positief en met een einde.** Hoot stopt op tijd en zegt dat het goed is: "Je bent bij." Nooit "houdt op", nooit schuld.
7. **Dagdelen, geen kloktijden.** In de ochtend, de middag, de vroege avond, morgenochtend.

Vaste vorm: **Editie, Stroom, Selectie** met hoofdletter, gelijkwaardig. **Hoot** in lopende tekst, het woordmerk is altijd **hoot.** Geen emoji in de app; in releasenotes hooguit de uil, alleen in de opening. Kapitalen alleen in de kicker.

### Woordenlijst

| Zeg wel | Zeg niet |
|---|---|
| Editie, Stroom, Selectie | digest, feed, tijdlijn (als naam), briefing |
| je bent bij, je weet genoeg | je hebt alles gezien, einde, houdt op |
| bijblijven, rustig lezen, uitlezen | niets missen, FOMO, gemist, scrollen |
| je bronnen, volgen, Volgend | abonnementen (behalve bij betalen), feeds |
| een seintje | notificatie, push, alert |
| De Redacteur (kiest, legt uit) | het algoritme, AI, personalisatie |
| Buiten je bubbel | aanbevolen voor jou, trending, voor jou ✨ |
| bewaren, Bewaard | opslaan in je leeslijst, favorieten |
| in de ochtend, de middag, de vroege avond | 07:00, 12 uur, 18.00 |
| verversen | synchroniseren, sync, refreshen |
| Lukt nu niet. | Fout, mislukt, error, oeps |
| Voor leden. | exclusief, premium, members only |

### Voor en na

**Uitleg · "Hoe kiest Hoot deze stukken?"**
- Voor: "De Redacteur-kern weegt per verhaal het aantal bronnen, de recentheid en je interesseprofiel en vult de Editie aan met een diversiteitsslot."
- Na: "Hoot leest je bronnen en kiest tien verhalen: wat groot is, en wat jij volgt. Daarna één verhaal buiten je bubbel. Klopt er iets niet? Zeg het met 'Klopt dit niet?'."

**Knop**
- Voor: "Inloggen bij / The Atlantic" · "Doorgaan naar de uitgever" · "Bevestigen"
- Na: "Log in bij The Atlantic" · "Lees bij de uitgever" · "Klaar"

**Lege toestand**
- Voor: "Geen items gevonden."
- Na: "Nog niets bewaard. Tik op de bladwijzer bij een verhaal."
- Voor: "Selectie niet beschikbaar."
- Na: "Je eerste Selectie komt maandag. Kies alvast waar je meer over wilt lezen."

**Foutmelding**
- Voor: "Sync mislukt! Probeer het later opnieuw."
- Na: "Verversen lukt nu niet. Je ziet de versie van vanochtend." + knop "Probeer opnieuw"
- Voor: "Oeps, er ging iets mis 😕"
- Na: "Geen verbinding. Zodra je verbinding hebt, haalt Hoot het nieuwste op."

**Einde van de Editie**
- Voor: "Dat was het voor nu. De Editie houdt op."
- Na: "Je weet genoeg." of "Je bent bij." · "De volgende staat in de middag voor je klaar."

**Releasenotes** (volgens de stijlgids: vier regels, max 500 tekens)
- Voor: "Nieuwe donkere modus beschikbaar! Diverse bugs opgelost en verbeterde stabiliteit."
- Na: "🦉 Nacht valt rustig over Hoot. • Nacht: echt zwart, met zachte letters voor de late avond. • Je Editie heeft nu nummers, van 1 tot 10. En meer rust in de details. Fijn lezen."

**Landing**
- Voor: "Hoot is een AI-gestuurde nieuwsaggregator die je nooit meer iets laat missen."
- Na: "Je nieuws op één plek. Drie keer per dag tien verhalen. Dan ben je bij."

**Onboarding**
- Voor: "Stap 3/5: Selecteer de bronnen die je wilt toevoegen aan je feed."
- Na: "Wie wil je lezen? Volg een paar bronnen. Je kunt dit later altijd aanpassen."
- Voor: "Sla over"
- Na: "Later kiezen"

**App Store**
- Ondertitel (max 30 tekens), voor: "Nieuwsaggregator met AI" · na: "Rustig nieuws, met een einde"
- Eerste regel, voor: "Blijf op de hoogte van al het nieuws, 24/7." · na: "Hoot zet het nieuws van jouw bronnen rustig op een rij. Drie keer per dag tien verhalen, en dan ben je bij."
- Bijschrift bij een beeld (Newsreader 800, één regel): "Je Editie, drie keer per dag." · "De Stroom: alles, rustig onder elkaar." · "Nacht: echt zwart, zacht voor je ogen."

### Toets voor elke tekst

Lees hem hardop. Klinkt het als een mens die je kent? Dan:
- [ ] je/jij, geen u
- [ ] werkwoord vooraan (knop)
- [ ] geen kloktijd, geen uitroepteken, geen "houdt op"
- [ ] Editie, Stroom, Selectie met hoofdletter
- [ ] bij een fout: wat er is, wat je nu ziet, een uitweg
- [ ] kan het korter? Haal één zin weg en lees opnieuw.
