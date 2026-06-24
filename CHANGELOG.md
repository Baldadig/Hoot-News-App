# Changelog

Alle noemenswaardige wijzigingen aan Hoot. Houdt [semver](https://semver.org/lang/nl/) aan.

## [0.9.1] — 2026-06-24 — Bronnen in het menu

### Toegevoegd

- **"Mijn bronnen" in het hamburger-menu**: al je bronnen netjes onder elkaar, branded met logo, naam, verified-vinkje en handle. Tik op een bron om alleen die bron te zien (menu sluit automatisch). De actieve bron krijgt een merk-gekleurd accent.
- Nieuwsbronnen staan bovenaan, Bluesky-accounts eronder.

## [0.9.0] — 2026-06-24 — Vier nieuwe onderwerp-categorieën

### Toegevoegd

- **Vier nieuwe tabs**: 💻 **Tech** (Apple/Google/Meta/Musk, platforms, chips, gadgets), 🔬 **Wetenschap** (onderzoek, ruimtevaart, gezondheid), 📈 **Economie** (beurs, inflatie, bedrijven, markten) en 🇳🇱 **Nederland** (binnenlandse politiek & samenleving).
- De tabs zijn opnieuw gegroepeerd: VS-politiek · Trump · Nederland · Oekraïne · Geopolitiek · Tech · AI · Wetenschap · Economie.
- Voor elke nieuwe categorie is zowel de **AI-classificatie** als de **trefwoord-fallback** ingeregeld; één artikel kan meerdere onderwerpen hebben (bijv. een Nederlands AI-bedrijf → Nederland + Tech + AI).
- Verrijkings-cache naar `enrichments-v7` zodat bestaande artikelen opnieuw worden ingedeeld met de nieuwe onderwerpen.

## [0.8.3] — 2026-06-24 — Koppen worden niet meer afgekapt

### Opgelost

- Lange koppen werden na 3 regels met "…" afgekapt. De regel-limiet is verwijderd: **koppen passen nu altijd volledig** (de kaart wordt simpelweg iets hoger). De AI-inkorting van lange koppen blijft eroverheen werken om ze compact te houden waar dat kan.

## [0.8.2] — 2026-06-24 — Terug-naar-boven knop

### Toegevoegd

- **Terug-naar-boven knop**: verschijnt rechtsonder zodra je een stuk naar beneden scrolt en brengt je met één tik soepel terug naar de top. Past bij de bestaande icoon-knoppen (ronde knop, blauwe pijl), en verdwijnt vanzelf weer bovenaan. Werkt licht/donker mee.

## [0.8.1] — 2026-06-24 — Previews voor de Volkskrant & NRC

### Opgelost

- **de Volkskrant en NRC hadden geen previewregel.** Oorzaak: hun RSS levert alleen een kop + foto, géén samenvattingstekst (`<description>` is leeg), en de artikelpagina's blokkeren server-side ophalen. Hun Bluesky-posts herhalen enkel de kop.
- Oplossing: de AI maakt nu voor **bron-loze artikelen** één neutrale Nederlandse zin op basis van de **kop** — met de harde regel om **geen feiten, cijfers of citaten te verzinnen** die niet in de kop staan. Bronnen mét teaser (NYT/Verge/Wired/NOS) worden zoals voorheen inhoudelijk samengevat en vertaald.
- Verrijkings-cache naar `enrichments-v6` zodat bestaande items opnieuw worden gegenereerd met de nieuwe regel.

> Werkt zodra `ANTHROPIC_API_KEY` in Netlify staat. Zonder key blijven VK/NRC-kaarten kop + foto (geen verzonnen tekst).

## [0.8.0] — 2026-06-24 — Slide-in menu & dark mode

### Toegevoegd

- **Slide-in menu** (hamburger linksboven) met **Instellingen** — uitbreidbaar voor later.
- **Thema-keuze**: **Systeem / Licht / Donker** (segmented control). 'Systeem' volgt automatisch je iPhone; je keuze wordt onthouden. Geen "flits" bij laden (thema staat vóór render).

### Gewijzigd

- Donker thema werkt nu via `data-theme` i.p.v. alleen de OS-mediaquery, zodat een handmatige keuze mogelijk is.

## [0.7.1] — 2026-06-18

### Gewijzigd

- **App-icoon** (incl. iOS-homescreen via apple-touch-icon): de uil is **iets kleiner** met meer ademruimte.
- **Verfijnder woordmerk** "Hoot" (fijner gewicht, strakkere tracking) en kleinere uil in het header-logo.
- **Lange koppen worden licht ingekort door de AI** (in de oorspronkelijke taal, ~max 65 tekens) zodat ze netjes passen.

## [0.7.0] — 2026-06-18 — Trending / Discover

### Toegevoegd

- **🔥 Trending-tab**: ontdek verhalen die bij **meerdere gerenommeerde bronnen tegelijk** opduiken (cross-bron signaal).
  - Naast je vaste bronnen worden **extra reputabele bronnen** opgehaald (The Guardian, BBC, Al Jazeera, NPR, Politico, The Atlantic, The Economist, FT, Tweakers) — alleen voor Trending, niet in je hoofd-feed.
  - Verhalen worden geclusterd op titel-overlap; een cluster met ≥2 bronnen wordt trending. Per kaart een **"🔥 N bronnen"**-badge (hover toont welke).
  - Gerangschikt op aantal bronnen + recentheid; representatief artikel kiest waar mogelijk je eigen bron.

## [0.6.1] — 2026-06-18

### Gewijzigd

- **Samenvattingen kappen nooit meer mid-woord af** (`…`): netjes afgerond op zin-/woordgrens, strikt ≤140 tekens.
- AI-prompt: artikel-samenvatting = **één complete Nederlandse zin (max 140), Engelse bronnen worden vertaald**.
- **Koppen blijven in de oorspronkelijke taal** (geen vertaling meer).
- **Bluesky-posts** blijven **origineel** van taal én lengte (geen samenvatting/vertaling), wel onderwerp-tags.
- Verrijking-cache ververst (v4) zodat bestaande items de strakke nieuwe samenvattingen krijgen.

## [0.6.0] — 2026-06-18 — Instapaper

### Toegevoegd

- **Bewaar voor later → Instapaper**: een bladwijzer-knop op elke kaart zet het artikel in je Instapaper.
  - Server-side via een nieuwe functie `/api/save` (Instapaper Simple API); inloggegevens staan veilig als Netlify-omgevingsvariabelen (`INSTAPAPER_USERNAME`, `INSTAPAPER_PASSWORD`) — nooit in de client of code.
  - Bewaarde artikelen blijven lokaal gemarkeerd (gevulde bladwijzer); nette foutmelding als Instapaper nog niet is ingesteld.
- De bron-regel is opgesplitst (bron-knop + leespil + bewaar-knop) zonder geneste knoppen — toegankelijk.

## [0.5.1] — 2026-06-18 — polish-ronde 2

### Gewijzigd

- **Leestijd als pil** rechts in de bron-regel — kapt nooit meer af.
- **Eenmalige tip** ("tik op een bron om te filteren") die verdwijnt zodra je 'm gebruikt of wegtikt.
- **Desktop**: de feed staat nu als een net, gecentreerd paneel (subtiele rand + schaduw) i.p.v. een losse kolom.
- **Eén laad-indicator**: de top-progressbalk is weg; het draaiende ververs-icoon blijft.

## [0.5.0] — 2026-06-18 — UI/UX polish-pass

### Toegevoegd

- **Toetsenbord-focus** (`:focus-visible`-ring) op alle interactieve elementen.
- Lege staat bij een actief filter toont nu een **"Toon alles"**-knop (geen doodlopend scherm).
- **Spacing- en radius-tokens** (`--space-*`, `--radius-pill`) voor een consistent ritme.

### Gewijzigd

- **Toegankelijkere kaart**: opgesplitst in een artikel-container met een echte bron-**knop** (filteren, nu ook met toetsenbord) en een artikel-**link** — geen geneste link-in-knop meer.
- **Gelezen-status** verzacht (minder vervaagd) voor een rustiger feed.
- **Grotere touch targets** voor de onderwerp-chips (~40px).
- **Skeleton** komt overeen met de echte kaart (titel-placeholder toegevoegd).
- Diverse hardcoded spacing/radii vervangen door tokens; dubbele afronding op het brand-icoon weg.

## [0.4.3] — 2026-06-18

### Gewijzigd

- **Avatars vullen nu mooi uit** (cover) i.p.v. een vierkant logo in een rondje.
- Bronnen zonder Bluesky-account (zoals NOS) krijgen hun X-profielfoto via unavatar.io — een scherpe merk-avatar.

## [0.4.2] — 2026-06-18

### Toegevoegd

- **Verwachte leestijd** per artikel (📖), geschat door de AI met een heuristische terugval.

### Gewijzigd

- Kaartvolgorde: **titel → samenvatting (lede) → foto**, typografisch netjes.
- **Strakker geverifieerd-vinkje** (schone cirkel met check i.p.v. het rommelige zegel).

## [0.4.1] — 2026-06-18

### Gewijzigd

- **Mooie merk-avatars**: het officiële profielbeeld van elke nieuwssite wordt opgehaald via de openbare Bluesky-API (met de favicon als nette terugval).
- **Samenvatting** is nu zwarter en beter leesbaar, en wordt niet meer visueel afgekapt (hard op 140 tekens).
- AI maakt **altijd** een Nederlandse samenvatting, ook als de brontekst leeg is (NRC/VK zonder teaser).

## [0.4.0] — 2026-06-18

### Toegevoegd

- **Bron-filter**: tik op de bron-regel van een kaart om alleen die nieuwsbron te zien (met een wisbalk "Alleen … ✕"). Zo bekijk je netjes alles van bv. NRC, The Verge of Wired.
- **Bluesky-video's** spelen direct in de app af (met poster), naast tekst en beeld.
- **Merk-gekleurde avatar-cirkels** per bron, in een nette cirkel.
- **Automatisch verversen** elke 15 minuten (en bij terugkeren in de app).

### Gewijzigd

- Kaartvolgorde: **samenvatting (≤140 tekens) bovenaan → titel → foto**.
- Onderwerp **Extreemrechts → Geopolitiek** (EU, VS, China, Taiwan, Midden-Oosten, NAVO, sancties). De AI bepaalt zelf de indeling.
- App-icoon: groot-ogige witte uil, **gecentreerd** op blauw.
- Bluesky toont **alleen originele posts** van de gevraagde account (Aaron Rupar) — geen reposts van anderen meer.

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
