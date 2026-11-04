# Lettertypes

Lezen in Newsreader, bedienen in Inter (tekstfont-advies van 4 november 2026). Koppen blijven de
statische Newsreader 800 uit `@fontsource/newsreader` (latin en latin-ext).

| Bestand | Bron | Assen |
|---|---|---|
| `newsreader-latin-opsz-normal.woff2`, `newsreader-latin-ext-opsz-normal.woff2` | npm `@fontsource-variable/newsreader@5.3.0`, map `files/` | wght 200–800, opsz 6–72 |
| `inter-latin-opsz-normal.woff2`, `inter-latin-ext-opsz-normal.woff2` | npm `@fontsource-variable/inter@5.3.0`, map `files/` | wght 100–900, opsz 14–32 |

Ze staan hier en niet als dependency, zodat de webapp (`fonts.css`) en de landing
(`landing/build.mjs`) dezelfde bestanden gebruiken zonder Google Fonts-verzoek of extra install.
Ophalen: `npm pack @fontsource-variable/newsreader@5.3.0 @fontsource-variable/inter@5.3.0`.

SHA-256:

```
6e4f2958c3a7c4a80acde4e5a679abe7e01bc1e30b92be3c7a8b696ef401d101  newsreader-latin-opsz-normal.woff2
45683de03de37187604102316c0b42c0cb2d8dc9c4140a20ad471c3148cc1278  newsreader-latin-ext-opsz-normal.woff2
2c295d99e26dcf357d4d01bcf270fd6924b600c9a13dd8c363ef114f4c6976fa  inter-latin-opsz-normal.woff2
5e6d4fe9d9f4bff8b2a2469d25ab19576bb85331e22c6ed51398e16f95d56a9c  inter-latin-ext-opsz-normal.woff2
```

De iPhone-app gebruikt vaste standen van dezelfde letters (`ios/Hoot/Resources/Fonts/`), gemaakt
met `scripts/build-fonts.py` uit de officiële variabele TTF's van github.com/google/fonts.

Licentie: SIL Open Font License 1.1 (`newsreader-OFL.txt`, `inter-OFL.txt`). Newsreader: Production
Type. Inter: Rasmus Andersson. Newsreader heeft geen ĳ-teken; Nederlands typt i+j.
