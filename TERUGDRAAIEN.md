# Redacteur: terugdraaien bij een fout

Alleen voor de bestaande site **hootnewsapp** (`eca436ff-e3ce-4000-b910-7af132c83ab3`). Geen DNS, Supabase of nieuwe sites.

## Eerst vaststellen wat is gepubliceerd

Open Netlify → hootnewsapp → Deploys. Noteer de gepubliceerde deploy-ID en commit. Een mislukte bouw publiceert niet: dan blijft de vorige deploy live en hoef je niets terug te zetten.

De laatste vóór deze fixes gecontroleerde productie is **6ae8c4f39d47b114e52c4e39**, commit **053376e**, gepubliceerd op 2 november 2026 om 17:14:59 UTC. Dit is de door Alex gepubliceerde beta-integratie. De feed is gevuld, de kaarten en afbeeldingen werken; de bekende wandelaar-tag is hier nog fout. Kies deze versie alleen als tijdelijke functionele terugval, niet als inhoudelijk goedgekeurde Redacteur.

## Een slechte gepubliceerde deploy terugzetten

Bij een Sharp-laadfout, feed/Editie niet-200, lege Editie of ongeschikt kopstuk (galerij of gewoon sportnieuws):

1. Open Deploys en kies **Lock to stop auto publishing** op de huidige publicatie. Daarmee kunnen volgende builds de noodterugval niet meteen vervangen. Bouw niet uitzetten.
2. Open de eerder werkende deploy **6ae8c4f39d47b114e52c4e39** en kies **Publish deploy**. Controleer site-ID, commit en doel vóór bevestigen. Gebruik niet “Retry deploy”: dat bouwt mogelijk een nieuwere branchkop.
3. Controleer in Deploys dat deze deploy weer de gepubliceerde productie is. Noteer tijdstip en oorzaak.
4. Draai vanuit de repo `node scripts/controle-na-deploy.mjs --baseline docs/codex-blokken/server-redacteur/editie-baseline.json --json /tmp/hoot-terugval.json` en bekijk de functielogs. De bekende wandelaar-tag kan op de terugval nog rood zijn; feed, gevulde Editie en veilig kopstuk moeten wel goed zijn.
5. Laat auto publishing vergrendeld tot een gerichte reparatie is getest en met Alex is afgestemd. Ontgrendelen publiceert niet vanzelf de gewenste oude commit: kies en controleer de bedoelde nieuwe deploy.

Alex heeft deze noodterugval expliciet gevraagd in de serveropdracht. Dat gaat vóór de algemene Netlify-skillconventie om alleen vooruit te repareren.

## Huidige Editie behouden

De vaste dagdeelsnapshot staat in Netlify Blobs, store `hoot`, sleutel `edition-redacteur-2026-11-02-beta2-<datum>-<dagdeel>`. Deze fixes veranderen de revisie niet. Laat de snapshot staan: niets wissen, overschrijven of hernoemen, geen nieuwe editorrevisie instellen. De volgende reguliere refresh mag de verse feed verversen, maar stelt de bestaande Editie niet opnieuw samen. Bij het volgende dagdeel wordt de nieuwe sleutel normaal gevuld.

Een deployterugval draait **geen Blobs-inhoud** terug. Als een slechte versie al een verkeerde nieuwe dagdeelsnapshot heeft bewaard, kan die na de code-terugval blijven bestaan. Meld dit afzonderlijk; verklaar de terugval dan niet geslaagd. Geen stille cache-reset of handmatige inhoudsreparatie. Bewaar het bewijs en laat de vervolgactie expliciet beoordelen.

## Controle na herstel

Controleer beide domeinen, de eerste entry via `leadId` (niet de opslagvolgorde van `edition.items`), vier tot tien genummerde verhalen, maximaal één bubbel erna, voorpagina (drie koppen of 503), deelkaart en afbeeldingsproxy. Herhaal na een reguliere feed-refresh en bij het eerstvolgende dagdeel. Leg niet uitgevoerde controles als open vast.
