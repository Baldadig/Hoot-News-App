import SwiftUI
import UIKit

// Letters van Hoot, gelijk aan het web (src/styles.css › Type): lezen in serif, bedienen in sans.
//   Kop     Newsreader 800 (optische maat 16, zoals de statische Newsreader 800 van het web)
//   Lees    Newsreader op tekstmaat (17) voor lopende tekst: intro's, de tekst van een post, de lezer;
//           in Nacht op gewicht 430, zodat de dunne halen op zwart niet breken
//   UI      Schibsted Grotesk 400 · 600 · 700 · 800 voor bediening, labels, metadata en knoppen
//   Uitleg  een uitlegzin is lezen: Newsreader 17/24 (.uitleg()), zoals de landing en --uitleg op het web
// De letters staan in Resources/Fonts (scripts/build-fonts.py) en worden via UIAppFonts geladen.
// Alles met `relativeTo:`, zodat Dynamische tekst blijft werken; maten zijn die van de tekststijl
// bij de standaardgrootte (Large).
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

    // De standaardmaat van een tekststijl (Large), zoals iOS die zelf gebruikt.
    static func size(_ style: Font.TextStyle) -> CGFloat {
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
    static func leesSpacing(_ style: Font.TextStyle, typeSize: DynamicTypeSize) -> CGFloat {
        let traits = UITraitCollection(preferredContentSizeCategory: UIContentSizeCategory(typeSize))
        let size = UIFontMetrics(forTextStyle: style.uiKit).scaledValue(for: Letters.size(style), compatibleWith: traits)
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

// Lopende tekst: Newsreader, regelafstand 1,42 (toegankelijkheidsmaten 1,3), in Nacht gewicht 430.
struct Leestekst: ViewModifier {
    @Environment(\.nachtActief) private var nacht
    @Environment(\.dynamicTypeSize) private var typeSize
    let style: Font.TextStyle
    func body(content: Content) -> some View {
        content
            .font(.lees(style, nacht: nacht))
            .lineSpacing(Letters.leesSpacing(style, typeSize: typeSize))
    }
}

extension View {
    func leestekst(_ style: Font.TextStyle = .body) -> some View { modifier(Leestekst(style: style)) }
    // Een uitlegzin (de zin onder een kop in het welkom, de tekst van een lege bladzijde, de kaart
    // "Maak Hoot van jou"): lezen, dus Newsreader 17/24, zoals de landing en --uitleg op het web.
    func uitleg() -> some View { leestekst(.body) }
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
