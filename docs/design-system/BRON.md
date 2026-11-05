# Design system van Hoot

- **Versie 2.3 (5 november 2026):** [`brand-guide-v2.3.md`](brand-guide-v2.3.md): twee families (Newsreader om te lezen, Schibsted Grotesk om te bedienen, vervangt Inter), kaart A+ op de telefoon, beelden (witte randen weg, tien placeholders), beweging (Horizon, De stapel, Tien en de bubbel, opstart-iris) en de schrijfwijze. Gaat boven v2.2 waar ze verschillen.
- **Versie 2.2 (4 november 2026):** [`brand-guide-v2.2.md`](brand-guide-v2.2.md): de keuzes voor 1.1.0, drie thema's (Licht, Donker, Nacht · Zacht papier), kleurverhouding 60 · 30 · 10, bewegingstaal (200 ms crossfade, 400 ms strook, iris), app-icoon (rood standaard en kiesbaar), leesbreedte (web 720, iOS 680), deelkaart, beeldtaal en stem en toon. Gaat boven v2.1 waar ze verschillen.
- **Register:** `tokens.json` (versie 3): kleur in Licht, Donker en Nacht, type, ruimte, hoeken, maten, regelafstand, beweging, schaduw en het merk (app-iconen, kleurverhouding, beeldtaal).
- **Beeldtaal:** de gekozen composities als SVG in [`beeldtaal/`](beeldtaal/) (01, 02, 04, 05, 06, 07, 09, 10, 11), plus de twee lijntekeningen van de lege bladzijde.
- **Live, met voorbeelden per onderdeel:** https://claude.ai/artifact/6THjwcBnZH9SkAgBPMPQhx (alleen zichtbaar voor wie toegang heeft gekregen).
- **Hier:** `README.md` (het merkboek: regels voor iedereen die op Hoot bouwt).
- **In de code:** website `src/styles.css` (`--paper`, `--ink-3`, `--s1`…`--s7`, `--radius`…), iOS `ios/Hoot/Views/Components.swift` (`Theme`), `ios/Hoot/Theme/NachtThema.swift` (Nacht), `ios/Hoot/Views/Layout.swift` (`Space`, `Radius`, `Layout`) en `ios/Hoot/Assets.xcassets` (de kleuren). Deelkaart: `shared/deelkaart/layout.json`.
- **Gezaghebbend buiten de repo:** de brandmap "079 - Hoot" (Brand Guide als HTML/PDF). Brand Guide v2.3 als PDF: "079 - Hoot - Brand Guide v2.3.pdf".

Een waarde verander je op alle drie de plekken: het design system, de website en de app. De namen zijn overal gelijk.
