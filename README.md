# 🦉 Hoot

Een rustige, reclamevrije nieuwslezer: een editie met een einde, een Stroom van jouw bronnen en een
overzicht in één minuut — als installeerbare webapp op je iPhone. Ontwerp: "Zaterdagkrant" (Newsreader
voor koppen, Source Sans 3 voor tekst, warm papier, krantenrood), iconen van Phosphor (Duotone).

**Bronnen:** een gecontroleerde catalogus van zo'n 90 titels — alle Nederlandse kranten (ook regionaal),
de Vlaamse kranten, NU.nl, Engelstalige bronnen met een blik op de wereld (NYT, Guardian, BBC, The
Economist, FT, The Atlantic, Al Jazeera…), plus economie, tech, games, wetenschap, sport en cultuur.
Wie Hoot instelt, kiest uit acht interesses (Politiek, Binnenland, Wereld, Economie, Tech — met games —,
Wetenschap, Cultuur, Sport) en daarbinnen smallere onderwerpen; de bronnen worden daarop voorgesteld.
Bluesky-accounts zijn optioneel (Instellingen → Extra).

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
- **In delen.** Het resultaat is gesplitst: een kern (`/api/feed?deel=kern`: bronnenlijst, verhalen, editie)
  en per bron een deel (`?bron=nrc&v=…`). De app haalt de kern plus alleen de bronnen die je volgt; een
  deel met versie in de URL is onveranderlijk en blijft eindeloos in de cache. Zonder parameters geeft
  `/api/feed` nog de oude volledige feed, voor apps van vóór 1.22.
- **Serveren** (`netlify/functions/feed.mjs`) leest alleen het kant-en-klare resultaat. De CDN van Netlify
  bewaart het voor iedereen en ververst het op de achtergrond; de browser krijgt "304, niets veranderd" als
  hij de feed al heeft.
- **Gedeelde code** (`shared/`) draait op de server én in de app: Bluesky-posts omzetten, id's.
- **Beeld** gaat op maat: eigen formaten van de uitgever waar die bestaan, anders via de beeld-CDN van
  Netlify (AVIF/WebP, `src/lib/img.js` + `[images]` in `netlify.toml`).
- **Security-headers** (`dist/_headers`) worden bij elke build gemaakt door `scripts/headers.mjs`, met de
  sha256-hashes van de inline scripts in `index.html`. De CSP staat eerst op melden
  (`CSP_ENFORCE = false`); zet hem op `true` als er een dag geen meldingen zijn.
- **De app** toont meteen wat hij de vorige keer had (in IndexedDB op het toestel) en werkt bij als er iets
  nieuws is. Video's: er speelt er altijd één, ze pauzeren als je wegscrolt en bufferen alvast als ze in
  beeld komen.

| Map | Wat |
|---|---|
| `netlify/lib/sources.mjs` | De bronnencatalogus (rubriek, taal, uitleg, abonnement, standaard aan) en Bluesky-accounts |
| `netlify/lib/rss.mjs`, `lookups.mjs` | Feeds ophalen; zoekindex, trends en avatars |
| `netlify/lib/stories.mjs`, `desks.mjs`, `bubble.mjs` | Verhalen bundelen, de editie samenstellen (pure functies, getest) |
| `netlify/lib/build.mjs`, `refresh.mjs`, `kv.mjs` | Alles samenvoegen, bewaren in Netlify Blobs |
| `src/` | De app (React + Vite, installeerbaar als web-app) |

## AI-overzicht

Met **`ANTHROPIC_API_KEY`** maakt Claude Haiku per editie één kort overzicht ("De editie in één minuut").
Zonder sleutel werkt alles door: titels en teasers van de bron zelf, onderwerpen via trefwoorden. Bronnen
zonder teaser (de Volkskrant) krijgen hun eigen inleiding uit de zoekindex, of lenen er een van een andere
Nederlandse bron over hetzelfde verhaal ("via NOS").

## Accounts en uitnodigingen

Hoot is op uitnodiging. Inloggen gaat rechtstreeks met Google (`src/lib/account.js`: Google stuurt een
id-token terug naar Hoot, Supabase in de EU maakt daar een sessie van); als lid gaan je instellingen,
Bewaard, wat je las en welke verhalen je zag mee naar je andere toestellen. Zonder account werkt
alles ook, alleen op dit toestel.

- **Database:** `supabase/migrations/` — één keer uitvoeren in Supabase → SQL Editor. Elke gebruiker
  ziet alleen zijn eigen rijen (row level security); lid worden kan alleen met een geldige uitnodiging.
- **Uitnodigen:** als beheerder in Instellingen → Account → *Iemand uitnodigen*. De link
  (`/?uitnodiging=…`) is één keer te gebruiken en 30 dagen geldig.
- **De app** bevat alleen de publieke sleutel (`src/lib/config.js`); de Supabase-code laadt pas bij
  inloggen.

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
4. De functie `/api/feed` serveert de feed;
   `feed-refresh` draait vanzelf elke 10 minuten.

## Bronnen & onderwerpen aanpassen

- **Nieuwsbronnen** (feed-URL's, met fallbacks) en **Bluesky-accounts** staan in
  [`netlify/lib/sources.mjs`](netlify/lib/sources.mjs) (`SOURCES` en `BLUESKY_AUTHORS`).
  `base: true` staat standaard aan, `pick: true` wordt bij het instellen voorgesteld (`for`: bij welke
  interesses, `forTopic`: bij welk onderwerp).
- **Interesses en onderwerpen** staan in [`src/lib/topics.js`](src/lib/topics.js) en de trefwoorden in
  [`netlify/lib/topics.mjs`](netlify/lib/topics.mjs).
- **Iconen** zijn Phosphor Duotone (MIT), als SVG in `src/components/icons.jsx`; zie `scripts/icons.mjs`.
- Een nieuwe beeldbron via de beeld-CDN: voeg de host toe aan `CDN_HOSTS` in `src/lib/img.js` én aan
  `remote_images` in `netlify.toml` (de test bewaakt dat ze gelijk lopen).

## Omgevingsvariabelen (Netlify → Site configuration → Environment variables)

| Variabele | Waarvoor | Zonder |
|---|---|---|
| `ANTHROPIC_API_KEY` | "De editie in één minuut" (Claude Haiku 5.5, drie keer per dag, met een controle-aanroep; ongeveer twee tot drie euro per maand) | In Instellingen staat "Nog niet beschikbaar"; de rest werkt |

Geheimen staan alleen hier, nooit in de app of in de repository. Na het toevoegen een nieuwe deploy starten (Deploys → Trigger deploy).
