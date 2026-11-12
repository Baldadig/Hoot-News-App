import SwiftUI

// Beweging in de app: drie duren en twee curves, gelijk aan het web (src/lib/motion.js en de tokens in
// src/styles.css; tests/beweging.test.mjs houdt de getallen gelijk).
//   kort 0,12 s    directe reactie (bewaren, schakelaar, chip)
//   gewoon 0,24 s  iets dat in beeld komt of van plek wisselt
//   merk 0,7 s     de iris: opstart en Welkom
//   bediening      alles wat je bedient: vlot weg, zacht geland (0,2 0,8 0,2 1)
//   iris           de iris sluit en opent, het woord landt: zacht weg, zacht aan (0,6 0 0,2 1)
// Verminder beweging: alles wat verplaatst of schaalt wordt één fade van `minder` (0,2 s); zie `kies`.
// Bewuste uitzonderingen op de drie duren (lussen en choreografie met een eigen tijdlijn): de sprong
// van het opstartscherm en de adem (SplashView, Brand), Tien en de bubbel (FirstEditionMark), de
// laadstrepen (LoadLines), de pull-strook (PullHorizon, QuietMotion) en het drukken van de Editie.
enum Beweging {
    static let kort = 0.12
    static let gewoon = 0.24
    static let merk = 0.7
    static let minder = 0.2

    static func bediening(_ duur: Double) -> Animation { .timingCurve(0.2, 0.8, 0.2, 1, duration: duur) }
    static func iris(_ duur: Double) -> Animation { .timingCurve(0.6, 0, 0.2, 1, duration: duur) }

    static var kortAnim: Animation { bediening(kort) }
    static var gewoonAnim: Animation { bediening(gewoon) }
    static var merkAnim: Animation { iris(merk) }
    static var minderAnim: Animation { bediening(minder) }

    // Dezelfde keuze overal: bij Verminder beweging de fade van 200 ms, anders de gewone animatie.
    // Gebruik het voor alles dat verplaatst of schaalt; een zuivere dekkingswissel mag zijn eigen
    // `kort` of `gewoon` houden.
    static func kies(_ animatie: Animation, still: Bool) -> Animation { still ? minderAnim : animatie }
}
