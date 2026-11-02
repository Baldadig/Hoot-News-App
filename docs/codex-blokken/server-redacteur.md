# Server-Redacteur · 2 november 2026

**Aanvullende fixes nog niet gedeployd.** De CLI heeft geen bestaande Netlify-aanmelding; de connector kan deploys lezen maar niet publiceren. Er zijn geen credentials opgevraagd. Alex kan de geteste wijzigingen via de bestaande Git-route publiceren.

## Actuele productie en merge

- `73e3d54` is voorouder van lokale en remote `main`, mergecommit **053376e**. Opnieuw gecontroleerd na “Merge is gedaan”.
- Alex' merge is automatisch live gegaan: site **hootnewsapp**, deploy **6ae8c4f39d47b114e52c4e39**, gepubliceerd **2026-11-02 17:14:59 UTC**, status ready.
- De aanvullende commits staan op **server-redacteur**, vanaf deze main. Geen landing, domeinen, Supabase-configuratie, bouwversie of V2b gewijzigd. Geen eigen push, tag of Apple-upload.
- Niet teruggedraaid: de huidige productie heeft een gevulde, veilige Editie. De bekende tagfout is afzonderlijk bewezen en lokaal opgelost.

## Gerichte wijzigingen

1. **83c97fd – Michigan:** concrete onderwerpplaats gaat vóór conflicterende geografische interesse-tags. Gedeelde fixture plus web/native spiegel: Michigan blijft VS; niet-geografische inhoudelijke onderwerpen blijven mogelijk. De regressie faalde vóór de fix en slaagt erna.
2. **2089573 – wereldtocht:** Rusland als routepunt maakt een wandelreis geen Oekraïne-onderwerp. Smalle uitzondering op kop en eerste introzin, met oorlogs-/geweldscontroles. Bestaande algemene buitenlandplekken mogen geen geografisch interesse-label tonen zonder hoofdonderwerpbewijs. Werkelijk oorlogsnieuws blijft behouden.
3. **1580654 – Sharp:** optionele beeldmeting importeert Sharp pas binnen de bestaande foutopvang. Een onlaadbare native binary blokkeert niet meer de import van de feedmodule. Een koude-importtest faalde vóór deze wijziging; daarna importeert de echte feedmodule en valt de meting terug op null.
4. **2bc7a9e – vrijgavecontroles:** de normale build importeert Sharp 0.35.5 en Resvg en verwerkt met beide een testbeeld. Op Netlify/Linux moet dit Linux x64 Node 20 zijn. Een fout stopt de build vóór publicatie. Het openbare controleprogramma controleert beide domeinen zonder accounts of opslagmutaties.

## Functies, omgeving en bundeling

De feed-, edition- en feed-refresh-keten gebruikt de gecorrigeerde onderwerp-tags en veilige optionele beeldmeting. De webbundel en iOS Label.swift krijgen dezelfde labelvoorrang. De deelkaartfunctie blijft Resvg gebruiken; geen renderer vervangen. De voorpaginafunctie en afbeeldingsproxy zijn alleen gecontroleerd.

Geen nieuwe omgevingsvariabelen. Bestaand: `NODE_VERSION` (20 in netlify.toml); `NETLIFY` voor doelvalidatie; de optionele bestaande `ANTHROPIC_API_KEY` in de buildketen. Blobs krijgt de bestaande platformcontext. Geen waarden gelezen of vastgelegd, geen AI ingeschakeld of nieuwe afhankelijkheid toegevoegd.

`netlify build --offline --context production` bundelt alle elf functies plus de bestaande edgefunctie succesvol. `sharp` en `@resvg/resvg-js` blijven external_node_modules. De lockfile bevat de Linux x64 optionele pakketten. De lokale zipbestanden bevatten Mac-native binaries: **niet als Linux-productie-artifact uploaden**. Gebruik Git-CD zodat Netlify op Linux installeert en de verplichte native proef uitvoert.

**Beperking:** Docker/OrbStack ontbreekt. De lokale native proef is darwin-arm64 Node 22.19.0, beide beelden goed; er is nog geen lokale Linux-koudestart bewezen. De nieuwe Linux-bouwcontrole en de functieproef na de daadwerkelijke deploy blijven daarom onderdeel van vrijgave. Details: `server-redacteur/sharp-controle.json`, `native-lokaal.json`.

## Opslag en overgang

Netlify Blobs-store `hoot`: vaste Editie via `edition-redacteur-2026-11-02-beta2-<datum>-<dagdeel>`. Die revisie blijft gelijk. Feeddocumenten: `feed-start-v1`, `feed-core-v1`, `feed-related-v1`, `feed-snapshot-v1`, `feed-part-<bron>` en `voorpagina-pool-v1`. De bestaande dagdeelsnapshot blijft staan; verse Stroom-items worden bij een refresh opnieuw getagd. De oude Editie kan oude tags in haar snapshot houden, maar het nieuwe labelcontract voorkomt de verkeerde geografische kopregel.

De reguliere feed-refresh draait ongeveer elke tien minuten, ’s nachts minder vaak. Geen handmatige refresh, snapshot-wijziging of cache-reset uitgevoerd. Het volgende dagdeel krijgt normaal een nieuwe samenstelling. Een deployterugval herstelt geen opgeslagen Blobs-inhoud; zie TERUGDRAAIEN.md.

## Publieke controle vóór de aanvullende fixes

Bewijs met UTC-tijdstip per meting: `server-redacteur/live-voor-fixes.json`. De bewaarde Avondeditie is `2026-11-02-avond`, builtAt `2026-11-02T17:20:23.039Z`. Baseline voor vergelijking: `server-redacteur/editie-baseline.json`.

- Beide feeds HTTP 200; hetzelfde kopstuk over premier De Wever, Buitenland, 13 bronnen; geen sport of galerij.
- Tien genummerde plekken, één bubbel apart erna. Beide domeinen dezelfde entries.
- Voorpagina HTTP 200 met drie koppen. Deelkaart HTTP 200, PNG 1200×630. Afbeeldingsproxy HTTP 200, PNG 160×90.
- Michigan: live gegevens correct naar VS; de gerapporteerde labeluitkomst is berekend met **de lokale nieuwe** labelcode, geen bewijs dat de oude live frontend die fix al heeft.
- Wandelaar: verse live feed heeft nog `oekraine`, dus deze controle is terecht rood vóór publicatie van de fix. Het nieuwe lokale label is Buitenland. Geen resultaat als reeds live hersteld rapporteren.
- Marathon/F1: geen gemengde disciplinebundel in het gevonden aanbod; niet het kopstuk.

Functielogs: nog niet visueel gekeurd. Brave is aanwezig, maar de computerbediening geeft een schermopnamefout. De connector heeft geen functieloginterface. Publieke endpointproeven vervangen geen loginspectie.

## Verificatie en resterende vrijgavestappen

Definitieve ronde op broncommit **2bc7a9e**: **999 webtests groen**, geen fouten, één bestaande TODO; **102 native tests groen**; gedeelde kern, webbuild en alle harde acceptatiedrempels groen. Bewijs: `beta/controle-SERVER-FINAAL.json`. Jaccard nu/rijk 0,32/0,32 bij ongewijzigde grenzen ≤0,38/≤0,40. Golden opnieuw gemaakt zonder verschil; edition-core opnieuw gebouwd zonder verschil. V2b uitsluitend op byte-identiteit gecontroleerd en ongewijzigd. Simulator terug op licht, Large, Verminder beweging uit.

De bestaande zachte doelen blijven open (onder andere tweetalige dekking: 32 bij doel 35); geen drempel verlaagd. Het volledige Netlify-offlinebouwproces slaagde met de nieuwe native proef. Native testlogs bevatten bekende SceneStorage-waarschuwingen uit de testomgeving; geen testfouten. Deze warnings zijn geen bewijs van een nieuwe crash en ook niet als opgelost gemeld.

Na publiceren vanuit de geteste main: noteer deploy-ID en commit, controleer de Linux-native bouwlog, draai `node scripts/controle-na-deploy.mjs --baseline docs/codex-blokken/server-redacteur/editie-baseline.json --json /tmp/hoot-na-deploy.json`. Herhaal na de reguliere refresh en bij het volgende dagdeel. Lees de functielogs. Niet aanwezige regressieverhalen staan als overgeslagen, niet als geslaagde live proeven.

**Nog open:** daadwerkelijke publicatie van de aanvullende fixes, Linux-uitvoering in de cloud, controle na refresh, controle van het nieuwe dagdeel en functielogs. Claude keurt woensdag de inhoudelijke Redacteur; dit verslag is geen vervanging daarvan.
