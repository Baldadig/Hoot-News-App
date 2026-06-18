# Changelog

Alle noemenswaardige wijzigingen aan Hoot. Houdt [semver](https://semver.org/lang/nl/) aan.

## [0.3.1] — 2026-06-18

### Gewijzigd

- **Titel boven de foto** bij artikelen (serif-kop → foto → samenvatting), redactionele volgorde.
- **Nieuw uil-icoon**: groot-ogige witte uil op blauw (eigen ontwerp), wit op blauw.

## [0.3.0] — 2026-06-18

### Gewijzigd

- **Redactioneel ontwerp** (New York Times × Notion): flat, strak, **serif koppen** (Apple "New York"/Georgia), modern klassiek.
- **App-icoon**: witte uil-silhouet op blauw — passe-partout, in de stijl van het oude Twitter-icoon.
- **Samenvattingen op ~140 tekens** (Twitter-lengte), titel én samenvatting in het Nederlands (met de AI-laag aan).
- **Foto's overal even groot** (vaste 16:9-verhouding) voor een rustige, uniforme tijdlijn.

## [0.2.0] — 2026-06-18

### Toegevoegd

- **Onderwerp-tabs** in plaats van bronnen: 🇺🇸 VS-politiek · 🇺🇦 Oekraïne · ⚠️ Extreemrechts · 🤖 AI · 🎪 Trump.
- **AI-verrijking** (Claude Sonnet): Nederlandse, verkorte titels + korte NL-samenvattingen + onderwerp-classificatie, gecachet in Netlify Blobs. Werkt ook **zonder API-sleutel** (originele titels + trefwoord-onderwerpen als terugval).
- **Bluesky in de feed** via de openbare API — eerste account: [@atrupar.com](https://bsky.app/profile/atrupar.com).
- **Tweet-stijl kaart**: bron-avatar met het echte site-logo, geverifieerd-vinkje, samenvatting, grote afbeelding en een link-balkje met titel + domein.

## [0.1.0] — 2026-06-18

### Toegevoegd

- Eerste versie van **Hoot**: één verenigde nieuws-tijdlijn van NRC, de Volkskrant, NYT, The Verge, Wired en NOS.
- Installeerbare PWA met homescreen-uiltje (iPhone-first), offline shell en feed-cache.
- Robuuste Netlify-aggregator: per-bron fallback-URL's, time-outs, ontdubbeling en CDN-caching (5 min).
- Bron-filters, gelezen-status (lokaal bewaard), pull-to-refresh en automatische licht/donker-modus.
