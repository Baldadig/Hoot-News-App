# Overdracht aan Claude · landingspagina

2 november 2026. Het volledige landingspakket staat op **landing-afwerking**, vanaf `main` / `origin/main` op **78cd0a0**. Alex publiceert de branch straks met **één push** en merge’t daarna zelf. De laatste productwijziging is `754d369`; de afrondende commit werkt alleen deze overdracht bij.

## Definitieve keuzes van Alex

### De voordelenrij

De overkoepelende kop blijft **‘Jouw nieuws, rustig bij elkaar.’**, met minder visueel gewicht dan de grote koppen in de hero en productsecties. De drie voordelen staan in deze volgorde, met deze exacte teksten:

| Payoff (regel 1 / regel 2) | Begeleidende tekst |
|---|---|
| Meer kanten / van één verhaal. | Vergelijk hoe verschillende bronnen hetzelfde nieuws brengen. |
| Een Editie / die je uitleest. | Ochtend, middag en avond een Editie met een duidelijk einde. |
| Jouw bronnen, / in één Stroom. | Kies wat je volgt. Hoot brengt je bronnen bij elkaar. |

- **Geen iconen, bronlogo’s, vinkjes of extra tekst boven de payoffs.** Alex keurde het vereenvoudigde voorstel goed.
- Alle drie de koppen staan op **twee regels**, met gelijke kophoogte en uitgelijnde alinea’s. De inhoud krijgt ruimte om bij uitzonderlijk grote tekst verder om te lopen; er wordt niets afgeknipt of verkleind.
- Alle drie de scheidingslijnen zijn **gelijk en subtiel**: 1 px in de bestaande lijnkleur. De eerdere nadruk op de eerste lijn leek op een geselecteerd tabblad en is verwijderd. Er is geen selectie, klikactie of wisselende toestand.
- Vanaf 960 px drie kolommen, daaronder één kolom. Newsreader 800 voor de payoffs, bestaande sansletter voor uitleg. Het bestaande raster en de kleurvariabelen blijven leidend.
- **Editie, Stroom en Selectie blijven aparte productnamen.** Alex corrigeerde ‘een selectie’ in de tweede uitleg nadrukkelijk naar **‘een Editie’**. De derde payoff benoemt nadrukkelijk de **Stroom**, met hoofdletter.

### Het voorbeeld in de Selectie-telefoon

Alex wilde een uitnodigender beeld dan het sport-/veldrijvoorbeeld. Een eerste Tech/AI-voorstel is daarna vervangen: hij wilde iets neutralers, positievers en gericht op een vakgebied. Uit de voorgestelde richtingen koos hij **Werk & organisatie**, met een scherpere titel.

- Onderwerp: **Werk & organisatie**.
- Ondertitel: **Samenwerken met aandacht**.
- Kop: **Hoe duidelijke afspraken teams sterker maken**.
- Beeld: rustige, warme vectorillustratie van een werkplek met een afsprakenbord, laptop, stoelen en plant. Geen AI-label of sportbeeld. Bestaande kleuren uit de landingsillustraties; geen nieuwe merkstijl of externe afbeelding.
- De fictieve voorbeeldbron **Weekblad Wereld** en het tweede voorbeeld **Wetenschap** blijven behouden. Dit is een vaste etalage, geen claim over een echt gepubliceerd artikel of actuele redactionele selectie.
- Op mobiel is de uitsnede ruimer zodat beeld, kop en bron zichtbaar zijn. De bestaande ringanimatie blijft behouden.

De bestaande zichtbare benaming **Selectie** bij dit productonderdeel blijft dus staan. Alleen het generieke woord in de uitleg van de Editie is vervangen.

### Het rode slotblok en de footer

Alex vroeg meer lucht tussen de objecten. De afstanden tussen slotkop, uitleg, webknop en kleine tekst zijn vergroot. Ook logo, links en makersregel onderaan krijgen meer ruimte. Bestaande spacingtokens gebruikt.

- Tablet (720–1099 px): de makersregel op een eigen gecentreerde rij.
- Mobiel: logo, navigatie en makersregel verder uit elkaar; links kunnen omwikkelen. Link-/logodoelen minimaal 44 px hoog.
- Teksten, bestemmingen en bestaande puntanimatie behouden.

## Eerdere keuzes die al in main zitten

Deze branch bouwt daarop voort; de volgende bestaande keuzes zijn in de bron gecontroleerd en worden niet opnieuw als nieuwe wijzigingen aangeboden:

- De webknop staat voorop, de App Store-melding is secundair.
- Lezen kan gratis zonder account; de FAQ onderscheidt dat van een account op uitnodiging.
- De landingsdemo haalt geen live koppen op: **LIVE = false**. Niet opnieuw aanzetten zonder de afgesproken redactionele keuring.
- De bestaande signature-animaties van Editie, Stroom en Selectie blijven werken. Landings-JavaScript is bytegelijk aan main, inclusief de bestaande ondersteuning voor verminderde beweging en bediening via de scène.
- De drie uitlegregels bij De Redacteur blijven op mobiel onder elkaar; de telefoon blijft ook tussen 900 en 1099 px in de hero staan.

## Wat staat in Git

Productwijzigingen uitsluitend **landing/index.src.html** en **landing/hoot.css**. Daarnaast CHANGELOG.md, dit verslag, het eerdere footerbewijs en de gezamenlijke controlebeelden/JSON. Geen app-, Redacteur-, serverfunctie-, configuratie- of iOS-wijzigingen. Geen gegenereerde dist-map, IPA, archive of lokale previewbestanden in de diff.

De oorspronkelijke footercommit is overgenomen als `8272717`. Daarna: voordelen `5bd2f31`, Werk & organisatie `f7b4e7c`, integratiebewijs `6cdd744`, publicatiestap `2f86cc8`, tekstcorrectie `754d369`. De commits vormen één branch en kunnen samen in één push worden verstuurd; er hoeft niets uit andere branches te worden verzameld.

**Niet nog apart mergen:** `landing-footer-ruimte` zit er al in. `landing-selectie-tech` bevat het afgewezen AI-voorbeeld en hoort niet mee. De losse voordelenproef is inmiddels naar productcode vertaald; de beelden bij dit pakket zijn leidend.

## Testbewijs en grenzen

- Na samenvoegen van footer, voordelen en Werk & organisatie: **npm test: 999 geslaagd, 0 mislukt, 1 bestaande TODO**, totaal 1000. Productiebuild geslaagd.
- Na de laatste twee tekstcorrecties: de twee bestaande landingtests en de productiebuild opnieuw geslaagd. De volledige suite is daarna niet nogmaals uitgevoerd; presenteer de eerdere 999 daarom niet als een nieuwe meting na de tekstcorrectie.
- CSS `hoot.99876168.css`; landings-JavaScript ongewijzigd `hoot.f0318c13.js`.
- Gebouwde secties bekeken op 1440, 768, 390 en 320 px, desktop in Licht en Donker. Geen horizontale overloop in de gemeten onderdelen. Op 1440 px gelijke tweeregelige kophoogte en exact gelijke alineastart; op 320/768 px eveneens twee regels per voordeelkop. De laatste Stroom-kop op 320 px opnieuw gecontroleerd.
- Selectie op 1440/390/320 px: kop binnen de telefoonscène. Footer op 768/320 px opnieuw bekeken; eerdere volledige footerbeelden ook meegeleverd.
- `git diff --check` schoon. iOS is ongewijzigd; hiervoor is geen nieuwe TestFlight-build nodig.

Bewijs: **docs/codex-blokken/landing-afwerking/**. Lokale preview: http://127.0.0.1:61229/review.html; deze gebruikt de daadwerkelijk gebouwde secties en linkt naar de volledige gebouwde pagina. De server moet daarvoor op Alex’ Mac draaien. De previewbediening staat buiten Git.

## Eén push, daarna merge door Alex

**Nog niet gepusht of gemerged.** De eerdere terminalpush miste GitHub-aanmelding; de bestaande GitHub Desktop-bediening viel vervolgens uit met opnamefout -3812, ook na één herstelpoging. Er zijn geen nieuwe credentials opgevraagd. De branch heeft geen upstream naar main, zodat hij afzonderlijk kan worden gepubliceerd.

1. GitHub Desktop → repository **Hoot-News-App** → werkmap **Hoot-beta-integratie** → branch **landing-afwerking**.
2. **Publish branch** (of Push origin als de branch intussen al is gepubliceerd). Daarmee gaat het hele pakket in één push mee.
3. Merge **landing-afwerking → main**. Geen andere featurebranch nodig.
4. Na de normale Git/Netlify-build de echte site controleren: voordelen zonder iconen, drie tweeregelige koppen en gelijke lijnen; Werk & organisatie met juiste kop en beeld; ruimere footer. Bekijk ook 320/390 px en Licht/Donker.

Geen directe productiepublicatie door Codex. De laatste live controle na de merge is nog niet uitgevoerd. Claude kan woensdag deze definitieve keuzes, code en meetbeelden beoordelen; de eerdere ontwerpfase is voor dit pakket afgerond.
