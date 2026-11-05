# Lettertypes

Lezen in Newsreader, bedienen in Schibsted Grotesk (tekstfont-advies van 4 november 2026; Schibsted vervangt Inter). Koppen blijven de
statische Newsreader 800 uit `@fontsource/newsreader` (latin en latin-ext).

| Bestand | Bron | Assen |
|---|---|---|
| `newsreader-latin-opsz-normal.woff2`, `newsreader-latin-ext-opsz-normal.woff2` | npm `@fontsource-variable/newsreader@5.3.0`, map `files/` | wght 200–800, opsz 6–72 |
| `newsreader-latin-wght-italic.woff2`, `newsreader-latin-ext-wght-italic.woff2` | npm `@fontsource-variable/newsreader@5.3.0`, map `files/` | cursief, wght 200–800 (opsz vast 16); alleen voor `.via` |
| `schibsted-latin-wght-normal.woff2`, `schibsted-latin-ext-wght-normal.woff2` | npm `@fontsource-variable/schibsted-grotesk@5.3.0`, map `files/` (latin en latin-ext) | wght 400–900 |
| `inter-*.woff2` | npm `@fontsource-variable/inter@5.3.0` | niet meer geladen door het web; blijft staan voor de deelkaart en de iOS-standen (`scripts/build-fonts.py`) tot die overgaan |

Ze staan hier en niet als dependency, zodat de webapp (`fonts.css`) en de landing
(`landing/build.mjs`) dezelfde bestanden gebruiken zonder Google Fonts-verzoek of extra install.
Ophalen: `npm pack @fontsource-variable/newsreader@5.3.0 @fontsource-variable/inter@5.3.0 @fontsource-variable/schibsted-grotesk@5.3.0`.

SHA-256:

```
6e4f2958c3a7c4a80acde4e5a679abe7e01bc1e30b92be3c7a8b696ef401d101  newsreader-latin-opsz-normal.woff2
45683de03de37187604102316c0b42c0cb2d8dc9c4140a20ad471c3148cc1278  newsreader-latin-ext-opsz-normal.woff2
2c295d99e26dcf357d4d01bcf270fd6924b600c9a13dd8c363ef114f4c6976fa  inter-latin-opsz-normal.woff2
5e6d4fe9d9f4bff8b2a2469d25ab19576bb85331e22c6ed51398e16f95d56a9c  inter-latin-ext-opsz-normal.woff2
48bc8861b9b2ca9300747cad4fd6a3b4ac3028d364df00bd1b72097baa75e509  newsreader-latin-wght-italic.woff2
d8c263970d52e0b94b3d5d4250d5962fe39f8f3b6fa9ad13b406d73ff3f4b036  newsreader-latin-ext-wght-italic.woff2
4c8b93f431d462c696e12b9d6a033feb3394d36e66e781357c496b95d8a75e05  schibsted-latin-wght-normal.woff2
ee9eeb232cc1fe7979dad813a570f4b19f1eb4496daf56c94ec9de63abdb2936  schibsted-latin-ext-wght-normal.woff2
```

De iPhone-app gebruikt vaste standen van dezelfde letters (`ios/Hoot/Resources/Fonts/`), gemaakt
met `scripts/build-fonts.py` uit de officiële variabele TTF's van github.com/google/fonts.

Licentie: SIL Open Font License 1.1 (`newsreader-OFL.txt`, `schibsted-OFL.txt`, `inter-OFL.txt`). Newsreader: Production
Type. Schibsted Grotesk: Schibsted Media Group / Bakken & Bæck. Inter: Rasmus Andersson. Newsreader heeft geen ĳ-teken; Nederlands typt i+j.

## Leesstijl (intro variant 4, 5 november 2026)

`newsreader-latin-opsz-normal.woff2` (en de `-ext`) is het variabele bestand met opsz- én wght-as; het web en de landing zetten
de optische maat vast met `font-variation-settings: 'opsz' 12` en het gewicht via `font-weight` (tokens `--lees-wght` 450,
Nacht 480, en `--lees-vs`). Dit is hetzelfde bestand als `intro-letter/fonts/newsreader-latin-opsz-normal.woff2` in Hoot-design
(zelfde SHA-256 als hierboven). iOS: vaste standen `NewsreaderTekst-450.ttf` en `-480.ttf` (opsz 12). Terugval variant 3: 400/430, opsz 11.
