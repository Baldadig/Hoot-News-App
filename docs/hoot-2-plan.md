# Hoot 2 — productkeuzes, techniek-onderzoek en bouwplan

> Kernbelofte: **"Begrijp wat er speelt. Lees verder waar jij dat wilt."**
> Succes = hoeveel overzicht iemand uit één bezoek haalt, en hoe makkelijk diegene daarna kan stoppen.

Dit document legt de keuzes vast vóór er gebouwd wordt (stap 1 en 5 van de opdracht). Alles onder
"Voorstel" is een standaardkeuze die ik aanhoud tenzij jij anders beslist; de vier open beslissingen
staan onderaan.

---

## 1. Productkeuzes

### Vier vaste plekken, één zoekfunctie

| Plek | Wat het is | Eindigt het? |
|---|---|---|
| **Editie** | Begrensd overzicht: de belangrijkste verhalen van nu | Ja — maximaal 10 verhalen, daarna "Je bent bij" |
| **Stroom** | Alle losse berichten, nieuwste eerst | Nee — bewust de "alles"-weergave |
| **Bewaard** | Jouw leeslijst | Altijd bereikbaar, ook als hij leeg is |
| **Bronnen** | Welke bronnen meedoen, per bron bekijken, bronnen toevoegen | — |

Zoeken staat als vergrootglas in de kop van elk scherm.

- **Mobiel:** tabbalk onderin (Editie · Stroom · Bewaard · Bronnen), binnen duimbereik.
- **Desktop (≥1024 px):** navigatie links, leeskolom in het midden, contextpaneel rechts
  (het geopende verhaal met al zijn bronnen).

### Hoe selectie, volgorde en bundeling werken (en hoeveel jij erover te zeggen hebt)

**Bundeling.** Berichten over dezelfde gebeurtenis vormen één *verhaal*. Bundelen gebeurt op
overlap in kernwoorden van de koppen, binnen een tijdvenster van 48 uur. Een bundel toont altijd
elke afzonderlijke publicatie met bron, oorspronkelijke kop, tijd en link — er wordt niets
samengevoegd of herschreven.

**Selectie voor de Editie.** Een verhaal komt in de Editie op drie zichtbare gronden, in deze volgorde:

1. **Dekking** — hoeveel van jouw bronnen erover schrijven (meer bronnen = belangrijker).
2. **Versheid** — laatste publicatie binnen 24 uur.
3. **Jouw onderwerpen** — onderwerpen die jij aanzet tellen zwaarder.

Geen klikgedrag, geen "engagement", geen verborgen score. Bij elk Editie-verhaal staat *waarom*
het erin staat ("4 bronnen · 2 uur geleden").

**Volgorde.** Editie: op dekking, daarna versheid. Stroom: strikt chronologisch, zonder weging.

**Jouw controle.**

- Bronnen aan/uit (Bronnen-scherm) — een uitgezette bron verdwijnt overal.
- Onderwerpen zwaarder/lichter laten wegen voor de Editie.
- Filters in de Stroom (bron, onderwerp, soort) — zichtbaar als chips, met één "Wis filters".
- Wat je **niet** kunt: een verhaal handmatig in de Editie zetten. De regels blijven uitlegbaar.

---

## 2. Het verhaal als centrale eenheid

Een verhaal bevat artikelen, updates en sociale bijdragen. Oorspronkelijke kop, auteur (waar de
feed die levert), publicatietijd en link blijven per onderdeel zichtbaar.

**Soort (nieuws / analyse / opinie / sociaal).** Alleen als de bron het zelf aangeeft: een
RSS-categorie of URL-pad (`/opinie/`, `/columns/`, `/analyse/`), of het is een social post. Geen
signaal = geen label. Er komt geen automatisch geraden label; dat zou schijnzekerheid zijn.

**Nieuwe ontwikkelingen herkennen.** Per verhaal onthoudt de app welke onderdelen je al zag. Komt
er iets bij, dan toont het verhaal "2 nieuw sinds je laatste bezoek" en staan die bovenaan.

**Bewaren.** Je bewaart een los bericht óf een heel verhaal. Een bewaard verhaal blijft groeien
(nieuwe publicaties sluiten aan) en gaat niet stuk als de bundel verandert — zie stabiele id's in §5.

---

## 3. Visuele taal

**Drie inhoudsvormen**

| Vorm | Gebruik | Beeld |
|---|---|---|
| **Hoofdverhaal** | Eerste 1–2 verhalen van de Editie | Groot beeld (3:2), kop 30–34 px |
| **Compact bericht** | Rest van de Editie, hele Stroom | Kleine thumbnail rechts (1:1, 88 px) of geen |
| **Sociale bijdrage** | Bluesky-posts | Tekst voorop; foto in eigen verhouding; video met poster |

**Typografie.** Serif voor koppen, sans voor bediening en metadata. Leestekst 17 px, gewone kop
22–24 px, hoofdverhaal 30–34 px. Getoetst met de langste echte koppen uit de feed (NRC haalt 150+
tekens) in het Nederlands en Engels, ook bij 200% zoom.

**Beeld.** Groot beeld alleen bij een hoofdverhaal. Ontbrekend beeld = geen grijs vlak maar een
kaart zonder beeld. Uitsneden: 3:2 (hoofd), 1:1 (thumbnail), eigen verhouding (social, begrensd).
Video: poster + speel-teken; afspelen waar de browser het kan, anders de post openen.

**Licht en donker** worden naast elkaar ontworpen met dezelfde tokens — geen afgeleide.

Het designsysteem (tokens, type-schaal, de drie vormen, toestanden) komt als pagina **in de app**
(`/stijl`), zodat het altijd klopt met wat er draait.

---

## 4. Gebruikersroutes en toestanden

| Route | Hoe het werkt |
|---|---|
| Eerste bezoek → bronnen kiezen | Welkomscherm met de bronnen als aan/uit-lijst, daarna direct de Editie |
| Overzicht → oorspronkelijke publicatie | Tik op een bericht opent de bron in een nieuw tabblad |
| Verhaal → bronvergelijking | Tik op "4 bronnen" opent het verhaal: alle publicaties onder elkaar |
| Bewaren → terugvinden | Bladwijzer op elk bericht en verhaal; tab Bewaard, met zoeken |
| Nieuwe berichten → hervatten | Nieuwe items wachten achter een pill; leespositie blijft staan, ook na terugkeren uit een artikel en na herladen |

**Toestanden:** laden (skelet in de vorm van de inhoud), leeg (met de volgende stap), fout (met
opnieuw proberen), offline (laatst opgehaalde inhoud + duidelijke melding), gedeeltelijk geladen
("NRC is nu niet bereikbaar" bij de bron én in het overzicht, rest werkt door).

---

## 5. Onderzoek van de bestaande techniek

| Onderdeel | Wat er nu is | Oordeel | Voor Hoot 2 |
|---|---|---|---|
| **Ophalen** | `feed.mjs`: 8 eigen + 9 extra bronnen parallel, per bron een eigen timeout en foutafhandeling; een uitgevallen bron blokkeert de rest niet | Betrouwbaar (live ±1,3 s) | Hergebruiken. Toevoegen: één herhaalpoging per bron |
| **Normaliseren** | HTML → platte tekst, http(s)-only links, hele-zin-previews, ruisfilter (koopjes, puzzels) | Betrouwbaar | Hergebruiken. Toevoegen: auteur, soort-signaal, ophaaltijd |
| **Dubbelen herkennen** | Op URL en genormaliseerde kop | Werkt | Hergebruiken |
| **Clusteren** | `buildTrending`: gretig bundelen op ≥3 gedeelde kernwoorden; levert alleen één representant + bronnamen | **Te smal** | Herschrijven: alle leden teruggeven, tijdvenster, stabiele id |
| **Stabiele verhaal-id's** | Bestaan niet; een bundel wordt elke aanvraag opnieuw berekend | **Ontbreekt** | Register in Netlify Blobs: bericht-id → verhaal-id. Nieuwe berichten sluiten aan bij een bestaand verhaal; een bewaard verhaal blijft dus geldig |
| **Publicatietijd vs ophaaltijd** | Alleen publicatietijd per bericht + één ophaaltijd voor de hele feed | Onvolledig | Per bericht `publishedAt` én `firstSeenAt` (uit hetzelfde register) |
| **Gegevensmodel** | Eén platte lijst berichten; bron-gegevens zitten in elk bericht gekopieerd | Vermengd | Drie lagen: `sources[]`, `items[]`, `stories[]` (verwijzen naar item-id's) |
| **Caching** | CDN 5 min + stale-while-revalidate; service worker NetworkFirst; laatste feed in localStorage | Goed | Hergebruiken; offline-toestand zichtbaar maken |
| **Platformlimieten** | Netlify-functie: standaard 10 s; nu ±1,3 s. Blobs beschikbaar, nu alleen voor de (uitstaande) AI-cache | Ruim binnen de grens | Register klein houden (laatste 7 dagen) |
| **Bewaren** | Leeslijst in localStorage, heel bericht als momentopname, per toestel | Werkt, overleeft herladen | Uitbreiden naar verhalen. Synchronisatie: zie open beslissing 3 |
| **Zoeken** | Bestaat niet | **Ontbreekt** | Zoeken in geladen berichten + bewaard, op het toestel. Géén archief (open beslissing 4) |
| **Samenvattingen (AI)** | Code aanwezig, staat uit (geen sleutel) | Bewust uit | Blijft uit tot bronverwijzing, foutafhandeling en labeling af zijn (fase 3) |

**Conclusie:** geen herbouw van de server. Ophalen, normaliseren en ontdubbelen blijven; clusteren
en het gegevensmodel worden uitgebreid. De app zelf (navigatie, kaarten, schermen) wordt wél
opnieuw opgezet — de huidige is één scherm met een chipbalk en past niet op vier vaste plekken.

---

## 6. Bouwvolgorde

**Fase 1 — de basis (navigatie, leesritme, beeld, terugvinden)**
Vier plekken + zoeken, tabbalk mobiel / drie kolommen desktop, de drie inhoudsvormen, beeldregels,
Bewaard met zoeken, Bronnen-scherm met aan/uit en eerste-bezoek-keuze, leespositie behouden,
alle toestanden, `/stijl`. De Editie toont in deze fase al een begrensde lijst op basis van de
bestaande bundeling.

**Fase 2 — verhalen en bronvergelijking**
Nieuwe clustering met stabiele id's en `firstSeenAt`, verhaalscherm met alle publicaties,
"nieuw sinds je laatste bezoek", verhaal bewaren, soort-labels uit bronsignalen.

**Fase 3 — pas als de basis overtuigt**
Onderwerp-weging voor de Editie, en eventueel samenvattingen (met bronverwijzing en label).

### Acceptatiecriteria — wie toetst wat

| Criterium | Hoe |
|---|---|
| Navigatie stabiel, ook met nul bewaard | Ik, in de browser |
| Filters zichtbaar, begrijpelijk, te wissen | Ik |
| Bewaren overleeft herladen | Ik |
| Leespositie behouden na terugkeren | Ik (browser) + jij op de iPhone |
| Geen sprongen bij nieuwe berichten | Ik |
| Bundels tonen losse publicaties + herkomst | Ik |
| Toetsenbord, 200% zoom | Ik |
| Schermlezer | Ik controleer de structuur; een echte VoiceOver-ronde doe jij |
| 320–1440 px zonder horizontale scroll | Ik, op elke breedte gemeten |
| Aanraakdoelen ≥ 44 × 44 px | Ik, gemeten |
| Laadgedrag op telefoon | Ik meet met vertraagde verbinding; de echte telefoonmeting doe jij |
| Test met vijf gebruikers (2 minuten) | **Kan ik niet doen.** Ik lever het testscript; jij voert het uit |

Het "klikbare prototype" is de werkende versie zelf op een aparte voorvertoning-link (zie open
beslissing 1) — geen los Figma-bestand dat daarna uit de pas loopt.

---

## Beslissingen (8 oktober 2026)

1. **Gebouwd op `main`**, over de bestaande app heen.
2. **Editie = vaste ochtend- en avondeditie** (06:00 en 17:00, Nederlandse tijd).
3. **Bewaard wordt niet gedeeld** tussen toestellen.
4. **Zoeken zonder archief**: alleen in wat geladen en bewaard is.
5. **Lettertype**: geen voorkeur opgegeven; gekozen voor de systeem-serif (New York op iPhone en Mac), zonder extra download.

Zie `hoot-2-verslag.md` voor wat er gebouwd is en hoe het is gecontroleerd.
