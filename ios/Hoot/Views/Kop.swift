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
    let size: CGFloat? // een eigen maat bij de standaardgrootte (hoofdverhaal van kaart A+: 30); groeit mee met `style`
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var width: CGFloat = 0

    init(_ text: String, _ style: Font.TextStyle, size: CGFloat? = nil) {
        self.text = text
        self.style = style
        self.size = size
    }

    var body: some View {
        let fit = KopZet.fit(text, style: style, typeSize: typeSize, width: width, size: size)
        // De breedte is die van de kolom (wat de ouder de kop aanbiedt), niet die van de gezette kop. Een
        // kop die door afbreken of verkleinen smaller wordt, meet zichzelf ook smaller; met die maat
        // opnieuw zetten gaf een eindeloze lus (eindkeuring 48, B1: lege Selectie bij AX5 op de SE).
        KolomBreedte(width: $width) {
            Text(fit.text)
                .font(fit.scale < 1 ? .custom(Letters.kop, fixedSize: KopZet.pointSize(style, typeSize: typeSize, size: size) * fit.scale) : size.map { .custom(Letters.kop, size: Letters.maat($0), relativeTo: style) } ?? .kop(style))
                .accessibilityLabel(text)
        }
    }
}

// Legt het kind precies zo neer als zonder deze laag (zelfde maat, zelfde basislijnen), en meldt de
// breedte die de ouder aanbiedt: de kolom. Die hangt niet af van hoe de kop gezet is, dus na één
// melding staat hij stil. Zonder aangeboden breedte (een horizontale scroll) blijft de kop ongezet.
struct KolomBreedte: SwiftUI.Layout { // SwiftUI.Layout: Hoot heeft zelf een enum Layout
    let width: Binding<CGFloat>

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        subviews.first?.sizeThatFits(proposal) ?? .zero
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        subviews.first?.place(at: bounds.origin, proposal: proposal)
        guard let offered = proposal.width, offered.isFinite, offered > 0 else { return }
        let column = (offered * 2).rounded(.down) / 2 // op een halve punt: geen nieuwe zet om een haar
        guard abs(column - width.wrappedValue) >= 0.5 else { return }
        let binding = width
        #if DEBUG
        Self.meldingen += 1 // KopTests: na rust komen er geen meldingen meer bij
        #endif
        Task { @MainActor in binding.wrappedValue = column } // niet tijdens de opmaak zelf
    }
    #if DEBUG
    nonisolated(unsafe) static var meldingen = 0
    #endif

    func explicitAlignment(of guide: VerticalAlignment, in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGFloat? {
        subviews.first.map { bounds.minY + $0.dimensions(in: proposal)[guide] }
    }

    func explicitAlignment(of guide: HorizontalAlignment, in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGFloat? {
        subviews.first.map { bounds.minX + $0.dimensions(in: proposal)[guide] }
    }
}

enum KopZet {
    static let shy: Character = "\u{00AD}"
    static let minScale: CGFloat = 0.7

    // De maat van de kop zoals iOS hem bij deze tekstgrootte zet (Font.custom(relativeTo:) schaalt zo).
    static func pointSize(_ style: Font.TextStyle, typeSize: DynamicTypeSize, size: CGFloat? = nil) -> CGFloat {
        let traits = UITraitCollection(preferredContentSizeCategory: UIContentSizeCategory(typeSize))
        return UIFontMetrics(forTextStyle: style.uiKit).scaledValue(for: size.map(Letters.maat) ?? Letters.size(style), compatibleWith: traits)
    }

    static func font(_ style: Font.TextStyle, typeSize: DynamicTypeSize, size own: CGFloat? = nil) -> UIFont {
        let size = pointSize(style, typeSize: typeSize, size: own)
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

    // De taal per kop maar één keer bepalen: een taalmodel laden bij elke opbouw kost te veel.
    nonisolated(unsafe) private static let locales = NSCache<NSString, NSLocale>()

    static func locale(for text: String) -> Locale {
        if let hit = locales.object(forKey: text as NSString) { return hit as Locale }
        let found = recognize(text)
        locales.setObject(found as NSLocale, forKey: text as NSString)
        return found
    }

    private static func recognize(_ text: String) -> Locale {
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
    static func fit(_ text: String, style: Font.TextStyle, typeSize: DynamicTypeSize, width: CGFloat, size: CGFloat? = nil) -> Fit {
        guard width > 0 else { return Fit(text: text, scale: 1) }
        return fit(text, font: font(style, typeSize: typeSize, size: size), width: width)
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
