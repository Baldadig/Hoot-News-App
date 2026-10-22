# Prompt voor de volgende sessie

Plak dit in een nieuwe sessie (in de map `Hoot-News-App`).

---

Je werkt verder aan **Hoot**, de nieuwslezer van Alex Vrees: een PWA met React 18, Vite en een hash-router, Netlify Functions v2 met Netlify Blobs, en Supabase (EU) voor accounts.

- Live: https://hootnews.nl. Het oude adres hootnewsapp.netlify.app stuurt door (vanaf 1.25).
- Repo: `/Users/alexvrees/Baldadig Dropbox/Alex Vrees/Alex/Claude/Hoot-News-App`.
- Belofte: *je nieuwsbronnen in één rustige editie: drie keer per dag tien verhalen, in een minuut samengevat. Minder scrollen, meer lezen.*

## Werkwijze met Alex

- Praat Nederlands. Alex is visueel en let meteen op uitlijning en ritme. Gebruik de tokens uit `:root` in `src/styles.css` en meet na in de browser, op 375 en op 1280 px, licht en donker.
- Elke ronde krijgt een semver-versie in `package.json`, een kort CHANGELOG-item en een git-tag. Alex pusht zelf via GitHub Desktop.
- Commit-trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Browserwerk waarvoor Alex ingelogd moet zijn (Supabase, Google Cloud, Netlify) gaat **altijd via Brave**, met de Claude in Chrome-extensie. Is die niet verbonden, vraag Alex dan het Claude-zijpaneel in Brave te openen. Wijk niet uit naar de ingebouwde browser.
- Geheimen (API-sleutels, Google client secret) staan alleen in Netlify en Supabase en komen nooit in code. Je logt nooit in namens Alex en vult geen wachtwoorden of sleutels in.
- `node_modules` blijft uitgesloten van Dropbox. Controleer of er geen lege Dropbox-placeholders (0 bytes) tussen de bestanden staan.

## Stand bij de overdracht (22 oktober 2026)

- Live draait **1.25.0**. Lokaal gecommit en getagd, maar **nog niet gepusht**: 1.26.0 t/m 1.27.2.
  - Google-knop, kortere instellingen, meer intro's.
  - Krantenkop rond het logo op desktop.
  - De tweede audit: vaste edities, een overzicht met bronverwijzingen, eigenaar per account, een nieuwe synchronisatiemotor, schonere bundels, de CSP afgedwongen, een privacypagina, en de feed gesplitst in `?deel=start` en `?deel=verhalen`.
  - Het startscherm "Een goed begin" voor "Liever meteen lezen".
  - Tijdlijnkoppen T5 op desktop.
- Er zijn 140 tests (`npm test`). `npm run build` moet slagen.
- Huisstijl:
  - Icoon D: een h in Newsreader 800 met een rode punt.
  - Logo: "hoot." met een rode punt; op desktop met een rode balk erboven en een dunne lijn eronder (zoals E).
  - Iconen: Phosphor Duotone. Letters: Newsreader en Source Sans 3; Roboto alleen voor de Google-knop.

## Eerste taken

0. **Databasewijziging voor de persoonlijke editie (1.28):** voer in Supabase (via Brave) `supabase/migrations/20261023_personal_edition.sql` uit. Die voegt de kolom `edition jsonb` toe aan `user_state`. Zonder die kolom werkt de persoonlijke editie wel, maar alleen per toestel.

1. **Bluesky, alleen voor Alex:** laat in Bluesky alleen Aaron Rupar staan en zet de Oekraïne-accounts uit.
   - Doe dit in Supabase (Brave → SQL Editor), in `public.user_state.prefs.muted` van gebruiker `f5dff1db-7719-4188-ad51-2854b1982638`.
   - Voeg deze ids toe: `bsky:kyivindependent.com`, `bsky:pravda.ua`, `bsky:euromaidanpress.bsky.social`, `bsky:christopherjm.ft.com`, `bsky:meduza.io`, `bsky:bbcstever.bsky.social`, `bsky:thestudyofwar.bsky.social`, `bsky:michaelkofman.bsky.social`, `bsky:phillipspobrien.bsky.social`, `bsky:warinthefuture.bsky.social`, `bsky:anderspucknielsen.dk`, `bsky:sambendett.bsky.social`, `bsky:emilkastehelmi.bsky.social` en `bsky:noelreports.com`.
   - Lees eerst wat er staat, voeg daarna toe (bestaande items niet overschrijven) en controleer het resultaat.
   - Verander de standaard voor andere gebruikers niet.
2. **Na de push live controleren:**
   - headers: `curl -I https://hootnews.nl/` moet een afgedwongen CSP tonen;
   - `?deel=start` en `?deel=verhalen&v=…` werken, en `?deel=kern` blijft werken voor oudere apps;
   - de console geeft geen CSP-meldingen;
   - het eerste AI-overzicht heeft per blok `refs` en bronlinks, en `checked: true`;
   - `/sitemap.xml`, `/robots.txt` en `/og.png` bestaan.
3. **Laat Alex inloggen testen:** account A → uitloggen → account B in dezelfde browser; en bewaren terwijl hij offline is, waarna het vanzelf alsnog lukt.

## Open punten

- De Champions League-nieuws vormt nog één brede bundel van ongeveer 43 berichten. Mogelijke oplossing: clubnamen als zwakke namen behandelen.
- Of het AI-overzicht inhoudelijk klopt, kan alleen live worden gecontroleerd; de API-sleutel staat alleen in Netlify.
- Er is geen bekende gratis Nederlandse wetenschapsbron, en alle regionale kranten in de catalogus vragen een abonnement.
- Google-inlogproject: zet het op "In production" en vraag merkverificatie aan (de privacy-URL is `https://hootnews.nl/#/privacy`) voordat anderen worden uitgenodigd.
- Fase 3 (een persoonlijke editie per gebruiker) moet nog beginnen.

## Kaart van de code

- **Server:**
  - `netlify/lib/`:
    - `build.mjs` (samenstellen, `composeEdition` met momentopname en versie);
    - `stories.mjs` (bundelen, liveblogs, kernregel, `relinkEdition`, `editionSlot`);
    - `brief.mjs` (AI-overzicht met controle);
    - `refresh.mjs` (schrijft start, verhalen, kern, oud en de delen per bron);
    - `rss.mjs` (`introOf`, `plausibleTime`);
    - `sources.mjs` (catalogus).
  - `netlify/functions/feed.mjs`: de API.
- **App:**
  - `src/lib/edition.js`, `syncEngine.js`, `feedCache.js` (IndexedDB), `migrate.js`, `topics.js` (interesses, `STARTER`);
  - `src/hooks/useFeed.js`, `useCloudSync.js`;
  - `src/views/` (Edition, Welcome, Privacy, …) en `src/components/`.
- **Build:** `scripts/headers.mjs` maakt `dist/_headers`, met de CSP-hashes van de inline scripts.
