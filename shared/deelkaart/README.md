# Deelkaart

`layout.json` bevat de vaste maten en merkkleuren voor web en iOS. `advances.json`
bevat de Newsreader-glyphmaten voor dezelfde regelval op beide platforms.

`Newsreader-800.ttf` is de samengevoegde latin- en latin-ext-subset uit de bestaande
`@fontsource/newsreader`-dependency (800), dezelfde letter als de koppen van het web.
`SchibstedGrotesk-600.ttf` (kicker, bron en domein) is byte voor byte de Schibsted Grotesk 600 van de app
(`ios/Hoot/Resources/Fonts/SchibstedGrotesk-600.ttf`, gemaakt met `scripts/build-fonts.py`; licentie `schibsted-OFL.txt`); de app
bundelt hem daarom niet nog eens in `Resources/Deelkaart/`. De SIL Open Font Licenses
gaan mee in de iOS-app.

Herbouwen na een bewuste lettertype- of maatwijziging:

```sh
# Alleen voor het herbouwscript: Python met fonttools.
python3 scripts/build-deelkaart-assets.py
python3 scripts/build-fonts.py 'Newsreader[opsz,wght].ttf' 'SchibstedGrotesk[wght].ttf' 'Newsreader-Italic[opsz,wght].ttf'   # Schibsted 600
node --test tests/deelkaart.test.mjs
```

Normale builds gebruiken de ingecheckte bestanden. De test bewaakt bytegelijkheid
met `ios/Hoot/Resources/Deelkaart/`. De Swift-regelval wordt tegen dezelfde
`tests/fixtures/deelkaart-cases.json` getoetst als het web.

`layout.mark` legt het uitgeverslogo vast (Brand Guide v2.2 › Deelkaart): een
papieren schijf van 28 (`disc`) met het logo als silhouet in merkrood (`ink`) en
14 % lucht (`pad`, afgerond 4 px). `publisher-marks.json` bevat die silhouetten al
in merkrood (`scripts/build-publisher-marks.mjs`). Zonder logo blijft het monogram
een lijncirkel in papier.
