# 🦉 Hoot

Een rustige, reclamevrije nieuws-tijdlijn die jouw abonnementen bundelt tot één feed.
Redactioneel ontwerp (New York Times × Notion): flat, serif koppen, modern klassiek — als installeerbare webapp op je iPhone.

**Bronnen:** NRC · de Volkskrant · NYT · The Verge · Wired · NOS · Bluesky-accounts (bv. [@atrupar.com](https://bsky.app/profile/atrupar.com))

**Bronnen (vervolg):** Left Laser (YouTube) · zelf toe te voegen Bluesky-accounts (menu → Sociale bronnen)

**Tabs zijn onderwerpen, geen bronnen:** 🔥 Trending · 🔖 Bewaard · 🇺🇸 VS-politiek · 🎪 Trump · 🇳🇱 Nederland · 🇺🇦 Oekraïne · 🌍 Geopolitiek · 💻 Tech · 🤖 AI · 🔬 Wetenschap · 📈 Economie

Koopjesgidsen ("Best Prime Day Deals") en puzzels worden uit de feed gefilterd.

> **Hoot 2 (v1.0.0):** vier bestemmingen — Editie (ochtend/middag/avond, tien verhalen met een einde), Stroom, Bewaard, Bronnen — met het verhaal als eenheid. Ontwerpkeuzes: `docs/hoot-2-plan.md`; wat er gebouwd en gecontroleerd is: `docs/hoot-2-verslag.md`; designsysteem: in de app onder `#/stijl`.

## Hoe lezen werkt

Hoot is de *ontdek- en tijdlijnlaag*. De feed komt uit de openbare RSS van elke bron en uit de
openbare Bluesky-API. Tik je een kaart aan, dan opent het bij de bron, **waar je al bent ingelogd
bij je abonnement** — daar werkt de leesweergave van Safari het beste.
Tip: zet in iOS Safari per site *"Reader automatisch gebruiken"* aan (bv. nrc.nl, nytimes.com).

> Hoot logt nooit namens jou in en schraapt geen betaalde content. Dat houdt de app stabiel en netjes.

## AI-laag (Nederlandse titels & samenvattingen)

Een serverless verrijkingsstap maakt per item een **korte Nederlandse titel**, een **NL-samenvatting
van ~140 tekens** en bepaalt de **onderwerp-tags** met Claude (Sonnet). Resultaten worden gecachet in
**Netlify Blobs**.

- Zet hiervoor in Netlify een omgevingsvariabele **`ANTHROPIC_API_KEY`** (Site settings → Environment variables).
- **Zonder sleutel** (de huidige situatie) werkt de app door: originele titels, de RSS-teaser in hele
  zinnen als preview, onderwerpen via trefwoorden + RSS-categorieën. Bronnen zonder teaser (de Volkskrant)
  tonen kop + foto, of lenen een preview van NOS/NRC bij hetzelfde verhaal ("· via NRC").

## Bewaren

Elke kaart heeft een **bewaar-knop** (bladwijzer). Bewaarde berichten staan in een eigen leeslijst in
de app (tab **🔖 Bewaard**, opgeslagen op het toestel); nog een keer tikken verwijdert ze.

Optioneel gaat een bewaard artikel óók naar Instapaper. Die aanroep
loopt server-side (`/api/save`); je inloggegevens staan alleen als Netlify-omgevingsvariabelen,
nooit in de client of in de code:

- **`INSTAPAPER_USERNAME`** — je Instapaper e-mailadres
- **`INSTAPAPER_PASSWORD`** — je Instapaper wachtwoord (je account moet een wachtwoord ingesteld hebben)

Zonder deze variabelen werkt alleen de eigen leeslijst; Instapaper wordt dan niet aangeroepen.

## Ontwikkelen

```bash
npm install
npm run gen-icons   # genereert de PNG-iconen uit public/icon.svg (eenmalig / na icoonwijziging)
npm run dev         # de feed draait lokaal mee via een dev-API
```

> **Let op (Dropbox):** laat Dropbox `node_modules` niet syncen — duizenden bestanden kunnen het
> mappen-beheer in de war sturen. Markeer de map als genegeerd:
> `xattr -w com.dropbox.ignored 1 node_modules` (idem voor `dist` en `.vite`).

## Bouwen & deployen (Netlify)

```bash
npm run build       # output in dist/
```

1. Push deze map naar GitHub.
2. Koppel de repo in Netlify → build verloopt automatisch via `netlify.toml`.
3. Zet de environment variables: **`ANTHROPIC_API_KEY`** (NL AI-laag) en **`INSTAPAPER_USERNAME`** + **`INSTAPAPER_PASSWORD`** (bewaren).
4. De functies draaien op `/api/feed` (aggregator, 5 min CDN-cache) en `/api/save` (Instapaper).

## Bronnen & onderwerpen aanpassen

- **Nieuwsbronnen** (feed-URL's, met fallbacks) en **Bluesky-accounts** staan in
  [`netlify/functions/feed.mjs`](netlify/functions/feed.mjs) (`SOURCES` en `BLUESKY_AUTHORS`).
- **Extra Trending-bronnen** (alleen voor de 🔥 Trending-tab) staan in `EXTRA_SOURCES` in dezelfde file.
- **Onderwerp-tabs** staan in [`src/lib/topics.js`](src/lib/topics.js) (en de enum in `feed.mjs`).

## Roadmap

- ✅ **v0.6.0** — "Bewaar voor later" → Instapaper
- **volgende** — opgeslagen-weergave, in-app reader, meer Bluesky-accounts beheren, discover/trending, cross-device sync
```


## Omgevingsvariabelen (Netlify → Site configuration → Environment variables)

| Variabele | Waarvoor | Zonder |
|---|---|---|
| `ANTHROPIC_API_KEY` | "De editie in één minuut" (Claude Haiku 5.5, drie keer per dag) | Het blok blijft weg; de rest werkt |
| `INSTAPAPER_USERNAME`, `INSTAPAPER_PASSWORD` | Bewaren ook naar Instapaper (Simple API) | Alleen bewaren in Hoot |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Voorlezen met een natuurlijke Nederlandse stem (Fenna, Maarten of Colette); één MP3 per editie, bewaard | De stem van het toestel |
| `HOOT_AI_ENRICH=1` | Samenvattingen per bericht laten herschrijven door AI (kost per bericht) | Uit (aanbevolen) |

Geheimen staan alleen hier, nooit in de app of in de repository. Na het toevoegen een nieuwe deploy starten (Deploys → Trigger deploy).

### Natuurlijke stem (Azure AI Speech) instellen

1. Ga naar portal.azure.com en maak (gratis) een account.
2. Maak een resource **Speech** (Azure AI services → Speech service), regio **West Europe**, prijsplan **Free F0** (0,5 miljoen tekens per maand gratis; drie edities per dag is ongeveer 0,25 miljoen).
3. Open de resource → **Keys and Endpoint**: kopieer **Key 1** en de **Location/Region** (bv. `westeurope`).
4. Zet ze in Netlify als `AZURE_SPEECH_KEY` en `AZURE_SPEECH_REGION`, en start een nieuwe deploy.
