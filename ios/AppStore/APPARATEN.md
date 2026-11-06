# Apparaten: iPhone, iPhone mini, iPhone Duo en iPad

Hoot kiest zijn opmaak op de beschikbare breedte, niet op het apparaat (`Hoot/Views/Layout.swift`). Daardoor werkt hetzelfde ontwerp op elk scherm, en past het zich live aan bij vouwen, Split View en Stage Manager, zonder dat je je plek kwijtraakt.

| Breedte | Voorbeelden | Opmaak |
|---|---|---|
| Smal (< 700 pt) | iPhone, iPhone mini, iPhone Duo dichtgevouwen, iPad in een smal venster | Eén kolom; tabbalk onderin die bij scrollen krimpt. |
| Breed (≥ 700 pt) | iPad, iPhone Duo opengevouwen, iPhone Pro Max liggend | Hoofdverhaal met beeld en kop naast elkaar, verhalen in twee kolommen, Selectie-kaarten naast elkaar. Tabbalk bovenaan, of als zijbalk (knop links). |

De Editie op een breed scherm: staand één leeskolom met de nummers in de kantlijn (B); liggend het hoofdverhaal met een zijkolom en daarna paren (A), maar alleen als er binnen de marges minstens 900 pt is (meer bij grotere tekst). Anders blijft het B.

Lopende lijsten (Stroom, verhaal vergelijken, Zoeken, Bewaard) houden een leesbreedte van hooguit 680 pt, zodat regels niet te lang worden.

## iPhone mini (en grote tekst)

- Bron, tijd, "+N bronnen" en bewaren staan op één regel als dat past. Anders schuiven "+N bronnen" en bewaren onder de bron.
- Miniaturen schalen mee met Dynamische tekst, tot 96 pt. Bij de toegankelijkheidsformaten verdwijnen ze, zodat de kop de hele breedte krijgt.
- Getest op de simulator van de iPhone 13 mini: `screenshots/test-iphone-mini/`.

## iPhone Duo

- Dichtgevouwen: dezelfde opmaak als elke iPhone.
- Opengevouwen: de brede opmaak, net als op iPad. Vouwen terwijl je leest wisselt de opmaak, en je blijft op dezelfde plek.
- Het profiel van de Duo in Xcode heeft twee ingebouwde schermen en apps in een venster dat van formaat verandert. Precies daarop is de opmaak gebouwd.
- **Nog te testen:** de Duo-simulator heeft iOS 27.1 nodig, en die staat niet op deze Mac. Installeren: Xcode → Settings → Components → iOS 27.1 Simulator (± 8 GB). Daarna kan ik de app daarop testen en nakijken.

## iPad

- Alle vier de standen; Split View en Stage Manager.
- iPadOS-tabbalk bovenaan, met een knop om de zijbalk te tonen (`.sidebarAdaptable`).
- Instellingen als blad; artikelen in de Safari-weergave.
- Getest op de simulator van de iPad Pro 13" (M5): `screenshots/ipad-13/`.

## iPad mini

- Staand 744 pt breed: breed, de Editie in B (één leeskolom van 680 met de nummers in de kantlijn), tabbalk bovenaan.
- Liggend 1133 pt: iPadOS zet de zijbalk open; dan blijft er ± 806 pt over en staat de Editie in B. Zijbalk dicht (968 pt binnen de marges): A.
- Split View en Stage Manager: onder 700 pt de iPhone-opmaak met de tabbalk onderin, ook liggend op de helft (± 561 pt).
- Gekeurd op de simulator "iPad mini (A17 Pro)", 6 november 2026: zie Hoot-design/ipad-mini/VERSLAG.md. Draaien kan simctl niet; dat deed een UI-test met XCUIDevice.
