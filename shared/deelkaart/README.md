# Deelkaart

`layout.json` bevat de vaste maten en merkkleuren voor web en iOS. `advances.json`
bevat de Newsreader-glyphmaten voor dezelfde regelval op beide platforms.

De TTF's zijn samengevoegde latin- en latin-ext-subsets uit de bestaande
`@fontsource/newsreader` (800) en `@fontsource/source-sans-3` (600) dependencies.
De bijbehorende SIL Open Font Licenses worden ook in de iOS-app gebundeld.

Herbouwen na een bewuste lettertype- of maatwijziging:

```sh
# Alleen voor het herbouwscript: Python met fonttools.
python3 scripts/build-deelkaart-assets.py
node --test tests/deelkaart.test.mjs
```

Normale builds gebruiken de ingecheckte bestanden. De test bewaakt bytegelijkheid
met `ios/Hoot/Resources/Deelkaart/`. De Swift-regelval wordt tegen dezelfde
`tests/fixtures/deelkaart-cases.json` getoetst als het web.
