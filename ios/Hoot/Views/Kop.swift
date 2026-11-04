import SwiftUI
import UIKit
import NaturalLanguage

// Een kop in Newsreader 800 die nooit midden in een woord knapt zonder streepje.
//
// Newsreader 800 is breder dan New York 800. Bij de toegankelijkheidsmaten (AX1–AX5) past een lange
// Nederlandse samenstelling ("onbetrouwbaar", "verkiezingsuitslag") daardoor niet meer op één regel,
// en dan breekt SwiftUI met een eigen letter op een willekeurig teken ("onbetrouwbaa / r").
// Kop zet alleen in de woorden die breder zijn dan de kolom zachte afbreekstreepjes (U+00AD) op de
// lettergrepen van de taal van de kop (Nederlands, of Engels voor een Engelse kop); iOS breekt daar
// dan met een streepje, zoals bij de systeemletter: "onbetrouw- / baar". Woorden die wel passen,
// blijven heel: een kop wordt verder nooit afgebroken. Heeft een woord geen afbreekpunt (een naam,
// een getal), of blijft een lettergreep breder dan de kolom, dan wordt de kop zo veel kleiner dat
// het past (ten hoogste tot 70 %). VoiceOver leest de kop zonder streepjes.
//
// Het web doet hetzelfde met `hyphens: auto` op een element met lang="nl" (src/styles.css › .kop).
struct Kop: View {
    let text: String
    let style: Font.TextStyle
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var width: CGFloat = 0

    init(_ text: String, _ style: Font.TextStyle) {
        self.text = text
        self.style = style
    }

    var body: some View {
        let fit = KopZet.fit(text, style: style, typeSize: typeSize, width: width)
        Text(fit.text)
            .font(fit.scale < 1 ? .custom(Letters.kop, fixedSize: KopZet.pointSize(style, typeSize: typeSize) * fit.scale) : .kop(style))
            .accessibilityLabel(text)
            .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
    }
}

enum KopZet {
    static let shy: Character = "\u{00AD}"
    static let minScale: CGFloat = 0.7

    // De maat van de kop zoals iOS hem bij deze tekstgrootte zet (Font.custom(relativeTo:) schaalt zo).
    static func pointSize(_ style: Font.TextStyle, typeSize: DynamicTypeSize) -> CGFloat {
        let traits = UITraitCollection(preferredContentSizeCategory: UIContentSizeCategory(typeSize))
        return UIFontMetrics(forTextStyle: style.uiKit).scaledValue(for: Letters.size(style), compatibleWith: traits)
    }

    static func font(_ style: Font.TextStyle, typeSize: DynamicTypeSize) -> UIFont {
        let size = pointSize(style, typeSize: typeSize)
        return UIFont(name: Letters.kop, size: size) ?? .systemFont(ofSize: size, weight: .heavy)
    }

    static func measure(_ s: String, font: UIFont) -> CGFloat {
        (s as NSString).size(withAttributes: [.font: font]).width
    }

    // Het woord met de lettergrepen van de taal als zachte afbreekstreepjes.
    static func hyphenate(_ word: String, locale: Locale) -> String {
        let cf = word as CFString
        let length = CFStringGetLength(cf)
        guard length > 4 else { return word }
        var points: [Int] = []
        var index = length
        while index > 0 {
            let at = CFStringGetHyphenationLocationBeforeIndex(cf, index, CFRange(location: 0, length: length), 0, locale as CFLocale, nil)
            guard at != kCFNotFound, at < index else { break }
            if at >= 3, at <= length - 3 { points.append(at) } // minstens drie letters per kant: geen "ar- / beids"
            index = at
        }
        guard !points.isEmpty else { return word }
        let ns = NSMutableString(string: word)
        for at in points { ns.insert("\u{00AD}", at: at) } // van achter naar voren: de indexen blijven kloppen
        return ns as String
    }

    static func locale(for text: String) -> Locale {
        let r = NLLanguageRecognizer()
        r.languageConstraints = [.dutch, .english] // de koppen van Hoot: Nederlands, of Engels (NYT, The Verge, The Atlantic)
        r.languageHints = [.dutch: 0.7, .english: 0.3]
        r.processString(text)
        let lang = r.dominantLanguage ?? .dutch
        let locale = Locale(identifier: lang.rawValue)
        return CFStringIsHyphenationAvailableForLocale(locale as CFLocale) ? locale : Locale(identifier: "nl")
    }

    struct Fit: Equatable { var text: String; var scale: CGFloat }

    // Zet de kop voor een kolom van `width` punten. Zonder breedte (eerste opbouw) ongewijzigd.
    static func fit(_ text: String, style: Font.TextStyle, typeSize: DynamicTypeSize, width: CGFloat) -> Fit {
        guard width > 0 else { return Fit(text: text, scale: 1) }
        return fit(text, font: font(style, typeSize: typeSize), width: width)
    }

    // Idem voor een gegeven letter (de lezer zet zijn kop zelf in een webpagina, op eigen maat).
    // Alleen een woord dat breder is dan de kolom krijgt zachte afbreekstreepjes.
    static func fit(_ text: String, font: UIFont, width: CGFloat) -> Fit {
        guard width > 0 else { return Fit(text: text, scale: 1) }
        let room = width - 1 // een halve punt speling, zoals de regelval van Core Text
        let words = text.split(separator: " ", omittingEmptySubsequences: false).map(String.init)
        guard words.contains(where: { measure($0, font: font) > room }) else { return Fit(text: text, scale: 1) }
        let locale = locale(for: text)
        var widest: CGFloat = 0
        let set = words.map { word -> String in
            guard measure(word, font: font) > room else { return word }
            let split = hyphenate(word, locale: locale)
            // Het breedste stuk dat op een regel moet: elk stuk met zijn streepje, het laatste zonder.
            let parts = split.split(separator: shy)
            for (i, part) in parts.enumerated() {
                widest = max(widest, measure(String(part) + (i < parts.count - 1 ? "-" : ""), font: font))
            }
            return split
        }
        let scale = widest > room ? max(minScale, (room / widest * 1000).rounded(.down) / 1000) : 1
        return Fit(text: set.joined(separator: " "), scale: scale)
    }
}
