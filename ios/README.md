# Hoot voor iOS

Een native SwiftUI-app (iOS 26, Liquid Glass) op dezelfde server als de web-app (hootnews.nl).

## Op je eigen iPhone zetten

1. Open `ios/Hoot.xcodeproj` in Xcode.
2. Klik links op **Hoot** (het blauwe project) → tab **Signing & Capabilities** → kies bij **Team** je Apple ID. Heb je die nog niet toegevoegd: Xcode → Settings → Accounts → +.
3. Sluit je iPhone aan (of kies hem draadloos). Zet op de iPhone **Instellingen → Privacy en beveiliging → Ontwikkelaarsmodus** aan; de iPhone herstart.
4. Kies bovenin Xcode je iPhone als bestemming en druk op ▶︎ (Run).
5. De eerste keer: **Instellingen → Algemeen → VPN en apparaatbeheer** → je Apple ID → Vertrouw.

Met een gratis Apple ID werkt de app 7 dagen; daarna opnieuw op ▶︎ drukken. Met een Apple Developer-account ($ 99 per jaar) kan het via TestFlight, zonder kabel en zonder einddatum.

## Wat er in zit (fase 1)

- **Editie**: de editie van dit dagdeel, met het hoofdverhaal groot (altijd met een scherp beeld), en "+N bronnen" om te vergelijken.
- **Stroom**: alles van je bronnen, nieuwste eerst. Bronnen aan- en uitzetten via de knop rechtsboven.
- **Digest**: elke maandag per vak de drie belangrijkste stukken van de week.
- **Bewaard**: wat je bewaarde (op dit toestel).
- **Zoeken**: in alles wat Hoot nu van je bronnen heeft.
- **Instellingen**: via de account-knop rechtsboven (weergave, editie, lezen, bronnen, vakken).
- Lezen gaat in de app via de Safari-weergave (met Lezer, en ingelogd bij je abonnementen zoals in Safari).

Liquid Glass: de tabbalk met zoeken als eigen knop (krimpt bij omlaag scrollen), glazen knoppen en
werkbalken, bladen met glas. Koppen in New York (de serif van iOS), tekst in San Francisco, met
Dynamische tekst en donkere modus.

## Volgende fasen

2. Inloggen met Google en met Apple (verplicht naast Google in de App Store), en synchroniseren van
   bronnen, Bewaard en gelezen met je account.
3. Je eigen editie (samengesteld uit je bronnen), de editie in één minuut, Buiten je bubbel,
   Verhaal volgen en Begrippen uitleggen.
4. Meldingen ("je editie staat klaar"), een widget, Siri en de deelknop.
5. App Store: icoon in Icon Composer (gelaagd glas), privacylabels, schermafbeeldingen, indienen.
