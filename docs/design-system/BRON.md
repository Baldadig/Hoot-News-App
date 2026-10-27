# Design system van Hoot

- **Live, met voorbeelden per onderdeel:** https://claude.ai/artifact/6THjwcBnZH9SkAgBPMPQhx (alleen zichtbaar voor wie toegang heeft gekregen).
- **Hier:** `README.md` (het merkboek: regels voor iedereen die op Hoot bouwt) en `tokens.json` (kleur in licht en donker, type, ruimte, hoeken, maten, regelafstand, beweging).
- **In de code:** website `src/styles.css` (`--paper`, `--ink-3`, `--s1`…`--s7`, `--radius`…), iOS `ios/Hoot/Views/Components.swift` (`Theme`), `ios/Hoot/Views/Layout.swift` (`Space`, `Radius`, `Layout`) en `ios/Hoot/Assets.xcassets` (de kleuren).

Een waarde verander je op alle drie de plekken: het design system, de website en de app. De namen zijn overal gelijk.
