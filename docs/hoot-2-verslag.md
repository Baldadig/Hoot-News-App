# Hoot 2 (v1.0.0) — diagnose, wat er gebouwd is, en controleverslag

## 1. Diagnose van de vorige versie

**Waargenomen** (in de app en de code, v0.16.1):

- Eén scherm met een horizontaal scrollende chipbalk waarin navigatie (Trending, Bewaard) en filters (onderwerpen) door elkaar stonden.
- Geen einde: 160+ kaarten onder elkaar, elk met een beeldvullende foto; op een telefoon ±1,3 bericht per scherm.
- Bundeling bestond alleen in de Trending-tab en toonde één bericht + een lijstje bronnamen; de andere publicaties waren niet te openen.
- Elk bericht had een blauw "geverifieerd"-vinkje zonder betekenis.
- Bronnen beheren zat verstopt in een instellingenmenu; zoeken bestond niet.
- Aanraakdoelen van 36–40 px; "3 min" betekende zowel leeftijd als leestijd.

**Aanname** (niet gemeten met gebruikers): dat een begrensde editie het "wanneer ben ik klaar"-probleem oplost. Dat moet de gebruikerstest uitwijzen.

**Behouden**: ophalen/normaliseren/ontdubbelen op de server, bronfilter, bewaren, Bluesky-accounts toevoegen, de preview-leenregel, het ruisfilter, licht/donker.

**Waarom de app opnieuw is opgezet en de server niet**: de server deed zijn werk betrouwbaar (±1 s, een uitgevallen bron blokkeert niets). De schermopbouw paste niet op vier vaste bestemmingen met een verhaal als eenheid.

## 2. Wat er nu is

| Onderdeel | Uitwerking |
|---|---|
| **Editie** | Ochtendeditie (vanaf 06:00) en avondeditie (vanaf 17:00), 10 verhalen, met "Je bent bij." Selectie en volgorde liggen vast zodra de editie is samengesteld; uitleg staat erbij. |
| **Stroom** | Alles van je bronnen op tijd. Drie eigen onderwerpen als knoppen, de rest onder **Filters** (onderwerp, soort, bron). Actieve filters staan in één balk met "Wis filters"; elk filter is een stap voor de terugknop. |
| **Bewaard** | Berichten én hele verhalen. Altijd zichtbaar, ook leeg. Doorzoekbaar vanaf vijf stuks. Per toestel. |
| **Bronnen** | Aan/uit per bron, per bron lezen, Bluesky-account toevoegen, status per bron ("Nu niet bereikbaar"), de bronnen die alleen ter vergelijking meedoen, je drie onderwerpen, thema. |
| **Zoeken** | Vergrootglas op elk scherm (desktop: in de navigatie). Zoekt in geladen en bewaarde berichten. |
| **Verhaal** | Elke publicatie apart met eigen kop, bron, tijd, auteur (waar de feed die levert) en link. "Eerste bericht", "Volg je niet", en "Nieuw sinds je vorige bezoek". Met de kanttekening dat meerdere bronnen geen onafhankelijke bevestiging zijn. |
| **Drie vormen** | Hoofdverhaal (groot beeld 3:2), compact bericht (thumbnail rechts), sociale bijdrage (tekst voorop, foto in eigen verhouding, video nooit automatisch). |
| **Designsysteem** | In de app: `#/stijl` — tokens, type, de drie vormen met echte inhoud, bediening, toestanden. |

**Gegevensmodel** (`/api/feed`): `sources[]`, `items[]` (Stroom), `related[]` (publicaties van niet-gevolgde bronnen die bij een verhaal horen), `stories[]` (verwijzen naar item-id's), `edition`, `meta`. Elk bericht heeft `publishedAt` én `firstSeenAt`, plus `author`, `type`, `section` waar de bron die levert.

**Stabiele verhaal-id's**: een register (bericht → verhaal, eerst-gezien) in Netlify Blobs. Een bundel die groeit houdt de id die zijn leden al hadden; een bewaard verhaal bevat bovendien een momentopname en blijft dus leesbaar als het uit de feeds verdwijnt.

**Soort-labels**: alleen "Opinie" (uit URL-pad of RSS-categorie bij de Volkskrant, NYT, NRC) en "sociaal". Geen enkele bron markeert analyse, dus dat label bestaat niet. Het verificatievinkje is verwijderd.

**Niet gebouwd, bewust**: automatische samenvattingen (staan uit), synchronisatie van Bewaard, een zoekarchief, onderwerp-weging voor de Editie, sociale posts ín verhalen (titel-overlap is daarvoor te onbetrouwbaar), NL- en EN-berichten in één verhaal (bundeling werkt op woordoverlap binnen één taal).

## 3. Controleverslag

Alles hieronder is gedaan in **browseremulatie** (de ingebouwde browser, WebKit), met live gegevens via de lokale ontwikkelserver. Er is **niet** getest op een echte iPhone of Android-toestel.

| Controle | Uitkomst |
|---|---|
| Breedtes 320, 360, 390, 430, 768, 1440 px — horizontale scroll | Geen, op alle zes schermen (Editie, Stroom, Bewaard, Bronnen, Zoeken, Designsysteem) |
| Aanraakdoelen ≥ 44 × 44 px | Gemeten op alle links/knoppen/velden per breedte: allemaal ≥ 44 px (één afwijking gevonden — post van één regel — en hersteld) |
| Navigatie stabiel met nul bewaard | Ja: vier vaste bestemmingen; Bewaard toont een lege toestand met uitleg |
| Filters zichtbaar en te wissen | Ja; terugknop zet het vorige filter terug (getest: bron kiezen → terug) |
| Bewaren overleeft herladen | Ja (bericht en verhaal) |
| Leespositie | Blijft staan bij wisselen van bestemming en na terug; na herladen exact hersteld (zelfde bericht, zelfde offset) |
| Nieuwe berichten zonder sprong | Automatisch verversen houdt nieuwe berichten achter een knop; **de knop zelf heb ik niet in het echt zien verschijnen** (vereist een verversing met nieuwe berichten) |
| Bundels tonen losse publicaties + herkomst | Ja, telefoon (eigen scherm) en desktop (paneel rechts) |
| Lange koppen | Langste NRC-kop (150+ tekens) en Engelse koppen breken netjes af; op telefoon is de compacte kop daarom 20 px in plaats van 22 |
| Ontbrekend beeld | Geen grijs vlak; de tekst gebruikt de volle breedte |
| 160+ berichten | Stroom met 164 berichten; berichten buiten beeld worden niet gerenderd |
| Contrast (WCAG) | Licht: tekst 17,1 · samenvatting 7,8 · metadata 5,1 · accent 8,7. Donker: 17,1 · 10,6 · 7,0 · 10,1. Alles ≥ 4,5 |
| Toetsenbord | Skip-link, logische tabvolgorde, zichtbare focus, Esc sluit verhaal en filterblad, achtergrond is `inert` zolang een overlay open is |
| Schermlezer | Structuur gecontroleerd (landmarks, `aria-current`, `aria-pressed`, `role=switch`, koppen per scherm, beschrijvende labels). **Geen echte VoiceOver/TalkBack-ronde gedaan** |
| 200% vergroting | Op desktop komt 200% overeen met de 768/720 px-indeling (getest). 200% op een telefoon is niet apart getest |
| Offline / storing | Offline-melding met tijdstip getest; één bron uitgevallen toont de naam, de rest werkt door (FT gaf tijdens het testen een 502 zonder gevolgen) |
| Video | Speelt nooit automatisch; `prefers-reduced-motion` schakelt animaties uit. De poster-terugval voor browsers zonder HLS is niet visueel gecontroleerd |
| Snelheid | Functie lokaal 0,5–0,9 s (17 bronnen parallel). Bundel: 62,5 kB JS + 4,3 kB CSS (gzip). **Niet gemeten op een echte telefoon of trage verbinding** |

## 4. Resterende beperkingen en wat jij nog moet doen

1. **Opslag live controleren.** Vaste edities en verhaal-id's leunen op Netlify Blobs; dat was in productie nog nooit gebruikt. Na de push toont Bronnen onderaan of het werkt ("…worden vast bewaard"). Werkt het niet, dan kan een editie tussentijds van samenstelling wisselen.
2. **Gebruikerstest** (vijf mensen, twee minuten): belangrijkste verhalen benoemen, een tweede bron vinden, een bewaard bericht terughalen. Niet uitgevoerd.
3. **Echte toestellen**: iPhone/Safari en Android/Chrome, inclusief VoiceOver en een meting op een trage verbinding.
4. Vervallen ten opzichte van de vorige versie: omlaag-trekken om te verversen (de knop rechtsboven doet dit), de compact/comfortabel-keuze (het compacte bericht is nu de standaard), en de sneltoetsen j/k.
