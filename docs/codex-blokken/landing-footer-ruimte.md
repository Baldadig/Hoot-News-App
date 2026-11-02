# Landingspagina · meer ademruimte in de footer

2 november 2026. Afzonderlijke branch `landing-footer-ruimte`, vanaf `main` op `78cd0a0`. Alleen lokale voorbereiding; niet gepusht of gepubliceerd.

## Wat is aangepast

Het rode slotblok en de onderste footer kregen meer ruimte volgens de bestaande spacingtokens. Tussen de slotkop en uitleg staat nu 24 px (desktop 32), tussen uitleg en webknop 32 px, tussen knop en kleine tekst 24 px. Ook de boven- en ondermarges van het slotblok zijn groter.

De onderste rij heeft 32 px verticale padding en meer afstand tussen logo, navigatie en makersregel. Links hebben minimaal 44 px hoogte. Op tablet (720–1099 px) staat de makersregel op een eigen gecentreerde rij. Op mobiel staan logo, links en makersregel 24 px uit elkaar, met 48 px onderruimte. Op 320 px wikkelt Instagram naar een tweede navigatieregel.

Tekst, links, kleur, lettertypen en de bewegende punt zijn behouden. Bronwijzigingen: `landing/hoot.css` en `CHANGELOG.md`. Geen app- of iOS-wijzigingen.

## Controle

- `npm run build`: geslaagd.
- `npm test`: 999 geslaagd, 0 mislukt, 1 bestaande TODO (1000 totaal).
- Visueel gecontroleerd op 1440, 768, 390 en 320 px; geen horizontale overflow. Desktop ook in Licht gecontroleerd.
- Screenshots en gemeten afstanden: map `landing-footer-ruimte/`.
- Lokale interactieve preview: http://127.0.0.1:61157/ (server moet blijven draaien).

## Voor Claude

Dit pakket staat los van `landing-selectie-tech` en het ontwerpconcept voor de voordelenrij. Samenvoegen kan per pakket; behoud bij een eventuele CHANGELOG-conflict beide relevante regels. Beoordeel de footer op het echte adres na integratie. Publicatie en eindkeuring liggen bij Claude. Een nieuwe iOS-build is hiervoor niet nodig.
