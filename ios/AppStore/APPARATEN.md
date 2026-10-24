# Apparaten: iPhone, iPhone mini, iPhone Duo en iPad

Hoot kiest zijn opmaak op de beschikbare breedte, niet op het apparaat (`Hoot/Views/Layout.swift`). Daardoor werkt hetzelfde ontwerp op elk scherm, en past het zich live aan bij vouwen, Split View en Stage Manager, zonder dat je je plek kwijtraakt.

| Breedte | Voorbeelden | Opmaak |
|---|---|---|
| Smal (< 700 pt) | iPhone, iPhone mini, iPhone Duo dichtgevouwen, iPad in een smal venster | Eén kolom; tabbalk onderin die bij scrollen krimpt. |
| Breed (≥ 700 pt) | iPad, iPhone Duo opengevouwen, iPhone Pro Max liggend | Hoofdverhaal met beeld en kop naast elkaar, verhalen in twee kolommen, Digest-kaarten naast elkaar. Tabbalk bovenaan, of als zijbalk (knop links). |

Lopende lijsten (Stroom, verhaal vergelijken) houden een leesbreedte van hooguit 680 pt, zodat regels niet te lang worden.

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
