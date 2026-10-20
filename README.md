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

## Hoe het werkt

```
 elke 10 min                         bij elke vraag (milliseconden)
┌──────────────────────┐  opslag   ┌──────────────────┐  CDN (durable,   ┌──────────┐
│ feed-refresh (cron)  │ ────────▶ │ /api/feed        │  stale-while-    │ de app   │
│ lib/build.mjs:       │  Blobs    │ leest alleen het │  revalidate) ──▶ │ (PWA)    │
│ RSS · Bluesky · Bing │           │ laatste resultaat│  ETag → 304      │          │
│ verhalen · editie    │           └──────────────────┘                  └──────────┘
└──────────────────────┘
```

- **Samenstellen** gebeurt op een vast ritme, niet als jij de app opent: `netlify/functions/feed-refresh.mjs`
  (elke 10 minuten, 's nachts elk half uur) roept `netlify/lib/build.mjs` aan. Dat haalt alle bronnen op,
  vult de Stroom, bundelt verhalen en legt de editie van het dagdeel vast.
- **Serveren** (`netlify/functions/feed.mjs`) leest alleen het kant-en-klare resultaat. De CDN van Netlify
  bewaart het voor iedereen en ververst het op de achtergrond; de browser krijgt "304, niets veranderd" als
  hij de feed al heeft.
- **Gedeelde code** (`shared/`) draait op de server én in de app: Bluesky-posts omzetten, id's.
- **Beeld** gaat op maat: eigen formaten van de uitgever waar die bestaan, anders via de beeld-CDN van
  Netlify (AVIF/WebP, `src/lib/img.js` + `[images]` in `netlify.toml`).
- **De app** toont meteen wat hij de vorige keer had (opgeslagen op het toestel) en werkt bij als er iets
  nieuws is. Video's: er speelt er altijd één, ze pauzeren als je wegscrolt en bufferen alvast als ze in
  beeld komen.

| Map | Wat |
|---|---|
| `netlify/lib/sources.mjs` | Welke bronnen en Bluesky-accounts Hoot volgt |
| `netlify/lib/rss.mjs`, `lookups.mjs` | Feeds ophalen; zoekindex, trends en avatars |
| `netlify/lib/stories.mjs`, `desks.mjs`, `bubble.mjs` | Verhalen bundelen, de editie samenstellen (pure functies, getest) |
| `netlify/lib/build.mjs`, `refresh.mjs`, `kv.mjs` | Alles samenvoegen, bewaren in Netlify Blobs |
| `src/` | De app (React + Vite, installeerbaar als web-app) |

## AI-overzicht

Met **`ANTHROPIC_API_KEY`** maakt Claude Haiku per editie één kort overzicht ("De editie in één minuut").
Zonder sleutel werkt alles door: titels en teasers van de bron zelf, onderwerpen via trefwoorden. Bronnen
zonder teaser (de Volkskrant) krijgen hun eigen inleiding uit de zoekindex, of lenen er een van een andere
Nederlandse bron over hetzelfde verhaal ("via NOS").

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
3. Zet de environment variables (zie hieronder).
4. De functies draaien op `/api/feed` (de feed), `/api/tts` (voorlezen) en `/api/save` (Instapaper);
   `feed-refresh` draait vanzelf elke 10 minuten.

## Bronnen & onderwerpen aanpassen

- **Nieuwsbronnen** (feed-URL's, met fallbacks) en **Bluesky-accounts** staan in
  [`netlify/lib/sources.mjs`](netlify/lib/sources.mjs) (`SOURCES` en `BLUESKY_AUTHORS`).
- **Extra bronnen** (alleen als "ook bij" in een verhaal) staan in `EXTRA_SOURCES` in hetzelfde bestand.
- **Onderwerpen** staan in [`src/lib/topics.js`](src/lib/topics.js) en de trefwoorden in
  [`netlify/lib/topics.mjs`](netlify/lib/topics.mjs).
- Een nieuwe beeldbron via de beeld-CDN: voeg de host toe aan `CDN_HOSTS` in `src/lib/img.js` én aan
  `remote_images` in `netlify.toml` (de test bewaakt dat ze gelijk lopen).

## Omgevingsvariabelen (Netlify → Site configuration → Environment variables)

| Variabele | Waarvoor | Zonder |
|---|---|---|
| `ANTHROPIC_API_KEY` | "De editie in één minuut" (Claude Haiku 5.5, drie keer per dag) | Het blok blijft weg; de rest werkt |
| `INSTAPAPER_USERNAME`, `INSTAPAPER_PASSWORD` | Bewaren ook naar Instapaper (Simple API) | Alleen bewaren in Hoot |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Voorlezen met een natuurlijke Nederlandse stem (Fenna, Maarten of Colette); één MP3 per editie, bewaard | De stem van het toestel |

Geheimen staan alleen hier, nooit in de app of in de repository. Na het toevoegen een nieuwe deploy starten (Deploys → Trigger deploy).

### Natuurlijke stem (Azure AI Speech) instellen

1. Ga naar portal.azure.com en maak (gratis) een account.
2. Maak een resource **Speech** (Azure AI services → Speech service), regio **West Europe**, prijsplan **Free F0** (0,5 miljoen tekens per maand gratis; drie edities per dag is ongeveer 0,25 miljoen).
3. Open de resource → **Keys and Endpoint**: kopieer **Key 1** en de **Location/Region** (bv. `westeurope`).
4. Zet ze in Netlify als `AZURE_SPEECH_KEY` en `AZURE_SPEECH_REGION`, en start een nieuwe deploy.
