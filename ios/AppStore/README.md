# App Store-map: Hoot News

Alles wat nodig is om Hoot News in de App Store te zetten. Begin bij de **[CHECKLIST.md](CHECKLIST.md)**: daar staat wat klaar is, wat jij nog moet beslissen en wat alleen jij kunt doen (account, uploaden, indienen).

| Map of bestand | Wat |
|---|---|
| [CHECKLIST.md](CHECKLIST.md) | Stappen en stand van zaken, van account tot indienen. |
| `metadata/nl-NL/` | Teksten voor de productpagina: naam, ondertitel, promotietekst, beschrijving, trefwoorden, nieuw in deze versie, URL's. Per veld één bestand, klaar om te plakken (en in het formaat van *fastlane deliver*, voor als je het later automatiseert). |
| `metadata/` | Categorie en copyright. |
| `screenshots/iphone-6.9/`, `screenshots/ipad-13/` | Schermafbeeldingen in de verplichte maten (1320 × 2868 en 2064 × 2752). |
| `screenshots/marketing/` | Dezelfde, met een kop erboven in de huisstijl. Deze zijn bedoeld voor de App Store. |
| `screenshots/test-iphone-mini/` | Controle op het kleinste scherm (niet om te uploaden). |
| [APP-PRIVACY.md](APP-PRIVACY.md) | Antwoorden voor de privacylabels. |
| [LEEFTIJD.md](LEEFTIJD.md) | Antwoorden voor de leeftijdsclassificatie. |
| [REVIEW-NOTES.md](REVIEW-NOTES.md) | Notities voor de beoordelaar van Apple (Engels). |
| [APPARATEN.md](APPARATEN.md) | Hoe de app werkt op iPhone, iPhone mini, iPhone Duo en iPad. |
| `promotie/` | Teksten voor LinkedIn, Instagram en pers, en promotiebeelden. |
| `tools/` | Scripts om de schermafbeeldingen opnieuw te maken. |

## Schermafbeeldingen opnieuw maken

Doe dit vlak voor het indienen, op een rustig nieuwsmoment. Vanuit de map `Hoot-News-App`:

```
zsh ios/AppStore/tools/screenshots.sh
```

Het script maakt de simulators aan (iPhone 17 Pro Max, iPad Pro 13", iPhone 13 mini), zet de statusbalk op 9:41, maakt de opnamen en zet er een kop boven.
