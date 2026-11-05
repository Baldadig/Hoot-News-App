import SwiftUI
import UIKit
import Observation

// Letters van Hoot, gelijk aan het web (src/styles.css › Type): lezen in serif, bedienen in sans.
//   Kop     Newsreader 800 (optische maat 16, zoals de statische Newsreader 800 van het web)
//   Lees    Newsreader voor lopende tekst: intro's, de tekst van een post, de lezer; intro variant 4 (keuze Alex,
//           5 november 2026): optische maat 12, gewicht 450 (NewsreaderTekst-450.ttf), in Nacht 480, zodat de dunne
//           halen op zwart niet breken. Op het web: --lees-wght / --lees-opsz in src/styles.css. De lezer (WKWebView,
//           ReaderFonts) laadt dezelfde stand als woff. Terugvaloptie variant 3: opsz 11, wght 400 (Nacht 430):
//           zie scripts/build-fonts.py, dan hier de twee namen en de bestandsnamen -400 / -430 terugzetten.
//   UI      Schibsted Grotesk 400 · 600 · 700 · 800 voor bediening, labels, metadata en knoppen
//   Uitleg  uitleg- en hulpzinnen in de bediening zijn schreefloos: Schibsted 17/24 (.uitleg() = .zin()); Newsreader is er alleen voor kop, intro en artikeltekst
// De letters staan in Resources/Fonts (scripts/build-fonts.py) en worden via UIAppFonts geladen.
// Alles met `relativeTo:`, zodat Dynamische tekst blijft werken; maten zijn die van de tekststijl
// bij de standaardgrootte (Large), keer de eigen Tekstgrootte van Hoot (TekstSchaal, Instellingen D):
// die telt op bij Dynamic Type, hij vervangt het niet.
enum Letters {
    static let kop = "NewsreaderKop-ExtraBold"
    static let lees = "NewsreaderTekst-Regular"
    static let leesNacht = "NewsreaderTekst-Nacht"
    static let leesVet = "NewsreaderTekst-Bold"

    // Schibsted Grotesk kent in de bundel vier standen. Medium valt op regular (500 zit niet in de bundel,
    // en het web gebruikt 500 niet voor bediening); heavy en black worden 800.
    static func ui(_ weight: Font.Weight) -> String {
        switch weight {
        case .semibold: "SchibstedGrotesk-SemiBold"
        case .bold: "SchibstedGrotesk-Bold"
        case .heavy, .black: "SchibstedGrotesk-ExtraBold"
        default: "SchibstedGrotesk-Regular"
        }
    }

    // De eigen Tekstgrootte (× 0,9 tot × 1,45). Wie dit leest in een `body`, tekent opnieuw als hij verandert.
    static var schaal: CGFloat { TekstSchaal.shared.factor }
    // Een eigen maat bij de standaardgrootte, met de Tekstgrootte erbij.
    static func maat(_ size: CGFloat) -> CGFloat { size * schaal }

    // De standaardmaat van een tekststijl (Large), zoals iOS die zelf gebruikt, keer de Tekstgrootte.
    static func size(_ style: Font.TextStyle) -> CGFloat { basis(style) * schaal }
    // Zonder de Tekstgrootte: de maat van iOS zelf.
    static func basis(_ style: Font.TextStyle) -> CGFloat {
        switch style {
        case .largeTitle: 34
        case .title: 28
        case .title2: 22
        case .title3: 20
        case .headline, .body: 17
        case .callout: 16
        case .subheadline: 15
        case .footnote: 13
        case .caption: 12
        case .caption2: 11
        default: 17
        }
    }

    // Regelafstand van lopende tekst: 1,42 (17/24 op het web); bij de toegankelijkheidsmaten 1,3,
    // zodat het geen lappen tekst worden. De letter zelf staat op 1,193 (de lijnhoogte van New York,
    // ingebakken in de app-standen van Newsreader); de rest is lineSpacing.
    // Met `size` en `line` (een eigen maat en regelhoogte bij Large): de regelafstand is het verschil, geschaald.
    static func leesSpacing(_ style: Font.TextStyle, typeSize: DynamicTypeSize, size own: CGFloat? = nil, line: CGFloat? = nil) -> CGFloat {
        let traits = UITraitCollection(preferredContentSizeCategory: UIContentSizeCategory(typeSize))
        let metrics = UIFontMetrics(forTextStyle: style.uiKit)
        if let own, let line { return metrics.scaledValue(for: max(0, maat(line) - maat(own) * 1.193), compatibleWith: traits).rounded() }
        let size = metrics.scaledValue(for: Letters.size(style), compatibleWith: traits)
        return (size * ((typeSize.isAccessibilitySize ? 1.3 : 1.42) - 1.193)).rounded()
    }
}

extension Font {
    // Bediening en metadata in Schibsted Grotesk, met de maat en het meegroeien van een tekststijl.
    // Zonder gewicht het gewicht van de tekststijl zelf: .headline is halfvet, zoals bij iOS.
    static func ui(_ style: Font.TextStyle, _ weight: Font.Weight? = nil) -> Font {
        .custom(Letters.ui(weight ?? (style == .headline ? .semibold : .regular)), size: Letters.size(style), relativeTo: style)
    }
    // Vaste maat (voor wat nu al .system(size:) was: groeit niet mee).
    static func ui(size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom(Letters.ui(weight), fixedSize: size)
    }
    // Koppen, displays en de nummers 01–10 in Newsreader 800.
    static func kop(_ style: Font.TextStyle) -> Font {
        .custom(Letters.kop, size: Letters.size(style), relativeTo: style)
    }
    static func kop(size: CGFloat) -> Font { .custom(Letters.kop, fixedSize: size) }
    // Een kop op leesmaat in Newsreader Tekst vet (700), zoals .ob__lt op het web (welkom: het voorbeeld).
    static func leesVet(_ style: Font.TextStyle = .body) -> Font {
        .custom(Letters.leesVet, size: Letters.size(style), relativeTo: style)
    }
    // Lopende tekst in Newsreader op tekstmaat. Liever .leestekst(), dat ook de regelafstand en Nacht zet.
    static func lees(_ style: Font.TextStyle = .body, nacht: Bool = false) -> Font {
        .custom(nacht ? Letters.leesNacht : Letters.lees, size: Letters.size(style), relativeTo: style)
    }
}

// Lopende tekst: Newsreader (opsz 12, gewicht 450), regelafstand 1,42 (toegankelijkheidsmaten 1,3), in Nacht gewicht 480.
// `size` en `line`: een eigen maat en regelhoogte in punten bij de standaardgrootte (kaart A+: intro 18/28,
// hoofdverhaal 20/30). Ze groeien mee met Dynamische tekst, relatief aan `style`.
struct Leestekst: ViewModifier {
    @Environment(\.nachtActief) private var nacht
    @Environment(\.dynamicTypeSize) private var typeSize
    let style: Font.TextStyle
    var size: CGFloat? = nil
    var line: CGFloat? = nil
    func body(content: Content) -> some View {
        content
            .font(size.map { .custom(nacht ? Letters.leesNacht : Letters.lees, size: Letters.maat($0), relativeTo: style) } ?? .lees(style, nacht: nacht))
            .lineSpacing(Letters.leesSpacing(style, typeSize: typeSize, size: size, line: line))
    }
}

extension View {
    func leestekst(_ style: Font.TextStyle = .body, size: CGFloat? = nil, line: CGFloat? = nil) -> some View { modifier(Leestekst(style: style, size: size, line: line)) }
    // Een uitlegzin (de tekst van een lege bladzijde, de kaart "Maak Hoot van jou"): bediening, dus
    // schreefloos, Schibsted 17/24 (besluit 4 november 2026). Newsreader blijft voor kop, intro en artikeltekst.
    func uitleg() -> some View { zin() }
    // Een onboardingzin (Welkom: de zin onder het merk, de uitleg onder een kop, de lege staat van het zoeken):
    // schreefloos, Schibsted Grotesk 17/24. Geen lopende tekst om te lezen, maar de stem van de bediening.
    func zin() -> some View { font(.ui(.body)).lineSpacing(3) }
}

extension Font.TextStyle {
    var uiKit: UIFont.TextStyle {
        switch self {
        case .largeTitle: .largeTitle
        case .title: .title1
        case .title2: .title2
        case .title3: .title3
        case .headline: .headline
        case .callout: .callout
        case .subheadline: .subheadline
        case .footnote: .footnote
        case .caption: .caption1
        case .caption2: .caption2
        default: .body
        }
    }
}

// UIKit (de titels in de navigatiebalk): dezelfde letters, meegroeiend via UIFontMetrics.
extension UIFont {
    static func hoot(_ name: String, _ style: UIFont.TextStyle, size: CGFloat, max: CGFloat = .greatestFiniteMagnitude) -> UIFont {
        let base = UIFont(name: name, size: size) ?? .preferredFont(forTextStyle: style)
        return UIFontMetrics(forTextStyle: style).scaledFont(for: base, maximumPointSize: max)
    }
}

// De eigen Tekstgrootte van Hoot (Instellingen D › Tekstgrootte): vijf standen bovenop Dynamic Type.
// Stand 1 is "Zoals je toestel" (× 1). Per toestel bewaard, zoals Weergave ("Weergave en lezen blijven
// per toestel"): hij gaat niet mee met je account. Gelijk aan het web (src/lib/tekstgrootte.js).
@Observable final class TekstSchaal: @unchecked Sendable {
    static let namen = ["Kleiner", "Zoals je toestel", "Groter", "Nog groter", "Grootst"]
    static let factoren: [CGFloat] = [0.9, 1, 1.15, 1.3, 1.45]
    static let standaard = 1
    static let key = "hoot.tekstgrootte"
    static let shared = TekstSchaal()

    var stand: Int {
        didSet {
            let geldig = Self.geldig(stand)
            if geldig != stand { stand = geldig; return }
            defaults.set(stand, forKey: Self.key)
        }
    }
    // De factor die geldt. Groter dan × 1 nooit voorbij de grootste maat van iOS zelf (body bij
    // AX5): bij de toegankelijkheidsmaten kreeg een woord als "Interesses" anders geen plek meer op een
    // regel en brak het midden in het woord. Zo groeit Grootst bij AX3 nog een stap, en is het bij AX5
    // gelijk aan Zoals je toestel; kleiner dan je toestel wordt het nooit.
    var factor: CGFloat {
        let f = Self.factoren[stand]
        guard f > 1 else { return f }
        return min(f, max(1, Self.plafond / systeemBody))
    }
    static let plafond: CGFloat = body(.accessibility5) // de grootste maat van iOS zelf
    // De tekstgrootte van het toestel (Dynamic Type), gezet door HootLetterMaat.
    var systeem: DynamicTypeSize = .large {
        didSet { if systeem != oldValue { systeemBody = Self.body(systeem) } }
    }
    private(set) var systeemBody: CGFloat = 17
    static func body(_ size: DynamicTypeSize) -> CGFloat {
        UIFontMetrics(forTextStyle: .body).scaledValue(for: 17, compatibleWith: UITraitCollection(preferredContentSizeCategory: UIContentSizeCategory(size)))
    }
    var naam: String { Self.namen[stand] }
    @ObservationIgnored private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        stand = Self.geldig(defaults.object(forKey: Self.key) as? Int ?? Self.standaard)
    }
    static func geldig(_ stand: Int) -> Int { min(max(stand, 0), factoren.count - 1) }
}

// De lettermaat van tekst zonder eigen rol, die meegroeit met de Tekstgrootte: een ViewModifier leest
// de schaal in zijn eigen body, dus alles eronder tekent opnieuw als je schuift.
struct HootLetterMaat: ViewModifier {
    @Environment(\.dynamicTypeSize) private var typeSize
    func body(content: Content) -> some View {
        content.font(.ui(.body))
            .onChange(of: typeSize, initial: true) { _, now in TekstSchaal.shared.systeem = now }
    }
}
