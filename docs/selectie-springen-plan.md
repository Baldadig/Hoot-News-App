# Selectie: snel naar een onderwerp en rustig inklappen

Voorstel voor Claude en Alex, 1 november 2026. Alleen een plan; geen appcode gewijzigd.

## Aanleiding en bestaande code

De opdracht noemt 37 onderwerpen. De huidige `shared/vak.mjs` bevat **38 onderwerpen in acht domeinen**. Dit plan gebruikt de actuele catalogus; er wordt niets verwijderd om op 37 te komen. De lezer ziet alleen de gekozen onderwerpen, in dezelfde vaste volgorde als nu.

Web (`src/views/Vak.jsx`) heeft al een inhoudsopgave: per gekozen onderwerp de kop en daaronder de drie artikelkoppen. Daarmee kan de lezer naar een onderwerp of artikel springen. Bij veel onderwerpen wordt dat overzicht zelf lang. iOS (`ios/Hoot/Views/DigestView.swift`) heeft al `ScrollViewReader` en onderwerpsecties met id’s, maar mist het gelijkwaardige inhoudsoverzicht. De bestaande Onderwerpen-knop wijzigt wat je volgt; navigatie mag die keuzes niet ongemerkt aanpassen.

## Vier opties

| Optie | Web | iOS | Sterk | Nadeel / omvang |
|---|---|---|---|---|
| A. Compacte onderwerpenbalk | Ankerknoppen in een horizontale balk, met tekstlabel | Horizontale rij knoppen boven de inhoud | Direct, hergebruikt de bestaande id’s | Tot 38 knoppen verdwijnen buiten beeld; afbreken maakt de balk hoog bij grote tekst. Klein tot middelgroot werk; focus na springen vraagt aandacht. |
| B. Inklapbare onderwerpsecties met compact overzicht | Echte kopknop met `aria-expanded`, compacte inhoudsopgave | `DisclosureGroup` of gelijkwaardige kopknop, bestaande `ScrollViewReader` | Behoudt de tijdschriftopbouw, maakt zelf een rustig overzicht mogelijk, helpt ook tijdens lezen | Vereist lokaal bewaren van de open/dichtstand en focus-/scrollherstel. Middelgroot werk. |
| C. Zwevende index | Vaste indexknop of zijpaneel | Zwevende knop of paneel | Altijd snel bereikbaar, ook onderaan | Bedekt inhoud/bediening op telefoon en bij grote tekst; extra laag, sluiten en focusval nodig. Grootste ontwerp- en testlast. |
| D. Zoeken binnen de onderwerpen | Zoekveld filtert uitsluitend de onderwerpindex | Native zoekveld in het onderwerpenoverzicht | Snel als je de naam kent; bruikbaar bij zeer veel onderwerpen | Lezers moeten de naam kennen; geen oplossing voor open/dichtklappen. Extra invoerveld en lege zoekstatus voor een kleine catalogus. Middelgroot werk. |

### A · Onderwerpenbalk

```text
Selectie
[ AI ] [ Design ] [ Werk ] [ ... → ]
─────────────────────────────────
AI
[eerste verhaal]
[twee volgende verhalen]
```

Op iPad kan de balk afbreken, maar bij 38 onderwerpen en grote tekst wordt hij alsnog een lange woordenlijst. Daarom geen voorkeursoplossing.

### B · Inklapbare onderwerpen met compact overzicht — aanbeveling

```text
Selectie
Week ... · 9 stukken in 3 onderwerpen
[Ga naar onderwerp ▾]   Alles inklappen
───────────────────────────────────
⌄ AI                         3 stukken
  [eerste verhaal]
  [volgende verhalen]

› Digitaal ontwerp           3 stukken
› Ondernemen                 3 stukken
```

De bestaande uitgebreide webinhoudsopgave wordt een compact onderwerpsoverzicht; de artikelkoppen hoeven niet dubbel vóór de artikelen te staan. Eén knop **Ga naar onderwerp** opent dit overzicht. Dezelfde namen en dezelfde volgorde op web en iOS. Binnen het overzicht groeperen de acht domeinen de gekozen onderwerpen; lege domeinen verdwijnen. Geen tweede keuze-interface, zoekmachine of nieuwe zijbalk.

De knop springt naar het gekozen onderwerp en opent dat zo nodig. De gewone kopknoppen laten de lezer afzonderlijke onderwerpen in- en uitklappen. **Alles inklappen** wordt **Alles uitklappen** als alles dicht staat. Bij één onderwerp is die verzamelknop overbodig. Start voor een nieuwe lezer met alles open, zodat de bestaande leeservaring behouden blijft. Wat de lezer daarna inklapt, blijft lokaal onthouden.

### C · Zwevende index

```text
Selectie
[verhalen ...]            [☰]
                         ┌──────────┐
                         │AI        │
                         │Design    │
                         │Werk      │
                         └──────────┘
```

Op iPad kan een vaste zijindex werken; op telefoon is er al beperkte ruimte en bestaande navigatie. De extra laag levert hier te veel bediening op voor het probleem.

### D · Zoeken

```text
Selectie
Ga naar onderwerp
[Zoek onderwerp ...]
  AI
  Architectuur & wonen
  ...
```

Zoeken door namen, niet door artikeltekst. Geen zoekresultaat mag een gevolgd onderwerp uitschakelen. Dit kan later boven het overzicht als gebruik laat zien dat een lijst onvoldoende is; nu niet toevoegen.

## Aanbevolen gedrag op telefoon en iPad

**Telefoon:** één knop Ga naar onderwerp boven de verhalen, met daarnaast of daaronder de tekstactie Alles inklappen. Geen zwevend element. Het overzicht opent als een eenvoudig blad met gekozen onderwerpen, per domein gegroepeerd. Een keuze sluit het blad, opent het onderwerp en brengt de onderwerpstitel in beeld. De gewone Onderwerpen-knop blijft uitsluitend bedoeld om te bepalen wat je volgt; geef de navigatieknop dus de volledige naam Ga naar onderwerp.

```text
390 px telefoon                 onderwerpblad
┌──────────────────────┐       ┌──────────────────────┐
│ Selectie             │       │ Ga naar onderwerp  × │
│ Week ...             │       │ Tech & product       │
│ [Ga naar onderwerp ▾]│       │ AI             3     │
│ Alles inklappen      │       │ Development    2     │
│ ──────────────────── │       │ Design & creatie     │
│ ⌄ AI · 3 stukken     │       │ Digitaal ontwerp 3   │
│ [hoofdverhaal]       │       └──────────────────────┘
│ › Digitaal ontwerp   │
└──────────────────────┘
```

**iPad / breed web:** dezelfde twee acties en dezelfde onderwerpen. Het compacte overzicht kan als popover bij de knop openen. De bestaande leesbreedte en kaarten binnen een onderwerp blijven behouden; geen permanente derde kolom. Bij grote tekst of smalle Split View gebruikt iPad het telefoonblad. Niet uitsluitend op device-type kiezen: beschikbare breedte en tekstgrootte bepalen de presentatie.

```text
1100 px iPad / desktop
┌──────────────────────────────────────────────────────────────┐
│ Selectie       [Ga naar onderwerp ▾]  Alles inklappen          │
│ Week ...                                                     │
│ ──────────────────────────────────────────────────────────── │
│ ⌄ AI · 3 stukken                                             │
│ [eerste verhaal over de leesbreedte]                          │
│ [tweede verhaal]            [derde verhaal]                   │
│ › Digitaal ontwerp · 3 stukken                               │
└──────────────────────────────────────────────────────────────┘
```

## Bewaren, laden en terugkomen

- Alleen een lokale UI-voorkeur: set ingeklapte onderwerp-id’s. Geen wijziging aan `prefs.vak`, bronkeuzes, API of database; niet via accountsynchronisatie versturen.
- Web: een eigen sleutel, bijvoorbeeld `hoot:selectie:ui:v1:<lokale-eigenaar>`. iOS: een gelijkwaardig lokaal `UserDefaults`-record. Bij accountwisseling gescheiden houden; anoniem krijgt een eigen sleutel. Geen persoonlijke voorkeuren van account A als standaard voor B gebruiken.
- Voorgesteld: de inklapstand blijft over weken heen staan. Een nieuw gekozen onderwerp begint open; id’s die niet meer bestaan worden opgeruimd. Dit is een voorstel voor keuring, geen al gebouwde regel.
- De geselecteerde onderwerpen blijven zichtbaar als kop, ook bij nul geschikte stukken. Toon het echte aantal geselecteerde stukken, geen vaste belofte van drie. Bij openen volgt de bestaande lege toestand.
- De laad- en foutstatus blijven boven de inhoud. Bewaarde inklapstand mag een lege/foutieve feed niet als een volledig gelezen week voorstellen.
- Bestaande leespositie blijft bruikbaar. Herstel eerst de inklapstand en daarna het zichtbare anker; lukt dat niet, ga naar de kop van dat onderwerp. Geen pixels van vorige week blind terugzetten.

## Toegankelijkheid en huisstijl

- Web: onderwerp is een `h2` met een echte `button`, `aria-expanded` en `aria-controls`. Verstopte artikelen zijn uit tabvolgorde én toegankelijkheidsboom (`hidden`), niet alleen doorzichtig of nul hoog.
- Native: een herkenbare knop met naam en uitgeklapt-/ingeklaptstatus. VoiceOver hoort bijvoorbeeld AI, 3 stukken, ingeklapt. De volledige kop is het raakvlak; minimaal de bestaande 44 pt. Gebruik de bestaande stijlen en afstandstokens.
- Enter en Spatie klappen om; normale Tab-volgorde. Een compact overzicht/blad is met Escape of de native sluitactie te sluiten en geeft focus terug aan Ga naar onderwerp.
- Na bewust springen krijgt de onderwerpstitel focus, met normale focusmarkering voor bediening. Niet automatisch focussen bij elke feedupdate. Alles inklappen houdt focus op de verzamelknop; nooit in net verborgen artikelinhoud.
- Grote tekst: koppen en labels mogen over meerdere regels, aantallen houden hun betekenis. Op AX-groottes geen horizontale index en geen vaste paneelhoogte die namen afsnijdt.
- Geen verplichte uitklapanimatie. Bij Verminder beweging meteen openen en zonder vloeiende scroll springen. Ook normaal geen showanimatie of verschuiving na een achtergrondverversing.
- Hergebruik Newsreader voor de bestaande onderwerpstitels en Source Sans 3 voor bediening. Geen nieuwe accentkleur, badgefamilie of iconenstijl. Rood blijft volgens de bestaande rollen gereserveerd.

## Uitwerking en ruwe omvang

Voorgestelde volgorde voor een later te keuren bouwpakket:

1. Gedeelde gedragsgevallen vastleggen: open/dicht, onderwerp openen vóór springen, bewaren, nieuwe week, accountwisseling en lege inhoud.
2. Web: huidige ankers en inhoudsopgave hergebruiken; lokale inklapstaat en focusherstel toevoegen.
3. iOS: onderwerpsecties dezelfde status geven; bestaande `ScrollViewReader` gebruiken; blad/popover toevoegen.
4. Toetsenbord/VoiceOver, AX5, iPad Split View, Verminder beweging en leespositie controleren.

Ruwe omvang: middelgroot UI-pakket, circa **2–3 dagdelen implementatie voor web en iOS samen plus 1–2 dagdelen controle en afwerking**, mits de bestaande data- en leespositiecode bruikbaar blijven. Dit is een ordegrootte voor beoordeling, geen opleverbelofte. Als leespositieherstel of native focus meer aanpassing vraagt, eerst dat deel onderzoeken; geen migratie of nieuwe backend toevoegen.

## Acceptatie voor het latere bouwpakket

- Alleen gekozen onderwerpen, gelijke volgorde web/iOS; wisselen tussen navigeren en volgen is duidelijk.
- Sprong naar een ingeklapt onderwerp opent het en toont de juiste kop; geen dubbele koppen of eerste artikel onder een vast element.
- Alles inklappen/uitklappen en afzonderlijke kopknoppen blijven bereikbaar op telefoon, desktop en iPad.
- Lokale staat blijft bij heropenen/nieuwe week; nieuw onderwerp open; accountwisseling gescheiden.
- Geen tabbable/screenreader-inhoud in gesloten onderwerpen. Geen verloren focus, horizontale overflow of afgekorte onderwerpnaam bij grote tekst.
- Bestaande kaarten, selectie-algoritme, artikelvolgorde en wekelijkse publicatie blijven intact.

**Keuze ter beoordeling:** optie B met een compact onderwerpsoverzicht. Eerst deze ene navigatievorm goed uitvoeren; geen zwevende index of zoekveld toevoegen zonder gebleken noodzaak.
