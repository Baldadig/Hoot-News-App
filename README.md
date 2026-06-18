# 🦉 Hoot

Een rustige, reclamevrije nieuws-tijdlijn die jouw abonnementen bundelt tot één feed.
Redactioneel ontwerp (New York Times × Notion): flat, serif koppen, modern klassiek — als installeerbare webapp op je iPhone.

**Bronnen:** NRC · de Volkskrant · NYT · The Verge · Wired · NOS · Bluesky-accounts (bv. [@atrupar.com](https://bsky.app/profile/atrupar.com))

**Tabs zijn onderwerpen, geen bronnen:** 🇺🇸 VS-politiek · 🇺🇦 Oekraïne · ⚠️ Extreemrechts · 🤖 AI · 🎪 Trump

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
- **Zonder sleutel** werkt de app door: originele titels, de RSS-teaser (140 tekens) als samenvatting,
  onderwerpen via trefwoorden. De footer toont `AI aan` / `AI uit`.

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
3. Zet **`ANTHROPIC_API_KEY`** bij de environment variables (voor de NL AI-laag).
4. De aggregator draait als serverless functie op `/api/feed` (5 min CDN-cache).

## Bronnen & onderwerpen aanpassen

- **Nieuwsbronnen** (feed-URL's, met fallbacks) en **Bluesky-accounts** staan in
  [`netlify/functions/feed.mjs`](netlify/functions/feed.mjs) (`SOURCES` en `BLUESKY_AUTHORS`).
- **Onderwerp-tabs** staan in [`src/lib/topics.js`](src/lib/topics.js) (en de enum in `feed.mjs`).

## Roadmap

- **v0.4.0** — "Bewaar voor later" → Instapaper
- **v0.5.0** — in-app reader voor vrij ophaalbare artikelen
- **v0.6.0** — meer Bluesky-accounts beheren in de app + discover/trending
- **v0.7.0** — cross-device sync (Supabase) + offline opgeslagen lezen
```
