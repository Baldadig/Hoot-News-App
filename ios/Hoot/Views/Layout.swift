import SwiftUI

// Opmaak op breedte, niet op apparaat: dezelfde regels voor iPhone (ook mini), een opengevouwen
// iPhone Duo en iPad. Wisselt het venster van breedte (vouwen, Split View, Stage Manager), dan
// past de opmaak zich live aan zonder dat je je plek kwijtraakt.
enum Layout {
    static let readable: CGFloat = 680 // leesbreedte van iOS (norm v2.2: iOS 680, web --measure 720); de regellengte is op beide ± 58ch
    static let wide: CGFloat = 1000 // brede pagina (editie, digest) op iPad en opengevouwen
    // Miniatuur in de krant-indeling: 3:2 op een vaste breedte, 96 × 64; bij grotere tekst 108 × 72
    // (beide op de 4-pt-schaal). Op het web is dat --thumb-size.
    static let thumb: CGFloat = 96
    static let thumbLarge: CGFloat = 108
    static let endcap: CGFloat = 300 // einde van de Editie, ± 30ch zoals --measure-end
    static let hang: CGFloat = 36 // het nummer in de kantlijn: 24 (twee cijfers) + s3, zoals 2ch + s3 op het web
    // Lege staat (K6): de lijntekening 96 (--art) en de uitleg op ± 34ch, zoals .empty op het web.
    static let emptyIcon: CGFloat = 96 // de lijntekening van de lege bladzijde (K6, signatuurmoment 7)
    static let emptyText: CGFloat = 320
}

// Ruimte: één schaal van 4 pt, gelijk aan --s1…--s7 op de website. Elke padding en tussenruimte
// komt hiervandaan; `s0` (2) alleen tussen twee regels van één label (naam en tijd).
enum Space {
    static let s0: CGFloat = 2
    static let s1: CGFloat = 4
    static let s2: CGFloat = 8
    static let s3: CGFloat = 12
    static let s4: CGFloat = 16
    static let s5: CGFloat = 24
    static let s6: CGFloat = 32
    static let s7: CGFloat = 48
    static let tap: CGFloat = 44 // minimaal aanraakvlak
}

// Hoeken: sm knoppen, velden en miniaturen · md beeld, kaarten en meldingen · lg bladen.
enum Radius {
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
}

extension View {
    // Een kolom van hooguit `width` punten, gecentreerd.
    // Op een krantenpagina (de Duo open en staand, KrantIndeling.enkel) nooit breder dan die pagina.
    func column(_ width: CGFloat = Layout.readable) -> some View {
        modifier(Column(width: width))
    }
}

struct Column: ViewModifier {
    @Environment(\.paginaMaat) private var pagina
    let width: CGFloat
    func body(content: Content) -> some View {
        content.frame(maxWidth: min(width, pagina ?? .infinity)).frame(maxWidth: .infinity)
    }
}

// Een lijst (Zoeken, Bewaard) op leesbreedte: op een iPad staat de lijst in de leeskolom, gecentreerd, met
// de titel en de rijen op de lijn van de Stroom (kolomrand + s4); anders liepen kop en intro over de hele
// breedte (± 90 tekens per regel op een staande iPad mini). Een kader om de lijst en niet contentMargins:
// liggend schuift de zijbalk over de lijst, en dan telden die marges niet mee. Alleen als het venster ook
// hoog is (verticaal regulier): een iPhone, ook liggend, blijft zoals hij is.
struct ReadableList: ViewModifier {
    @Environment(\.verticalSizeClass) private var verticalClass
    @State private var width: CGFloat = 0
    func body(content: Content) -> some View {
        Group {
            if verticalClass == .regular && width > Layout.readable {
                content.contentMargins(.horizontal, Space.s4, for: .scrollContent).column()
            } else {
                content
            }
        }
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
    }
}
extension View {
    func readableList() -> some View { modifier(ReadableList()) }
}

// Breed genoeg voor twee kolommen? (Opengevouwen Duo, iPad, iPhone Pro Max in landschap.)
struct IsWide: EnvironmentKey { static let defaultValue = false }
extension EnvironmentValues {
    var isWide: Bool {
        get { self[IsWide.self] }
        set { self[IsWide.self] = newValue }
    }
}

// Echt veel ruimte (vanaf 1000 pt: een grote iPad liggend): pas dan staan beeld en tekst van het
// hoofdverhaal naast elkaar. Daaronder (iPad mini, Split View) krijgt de kop de hele breedte.
struct IsSpacious: EnvironmentKey { static let defaultValue = false }
extension EnvironmentValues {
    var isSpacious: Bool {
        get { self[IsSpacious.self] }
        set { self[IsSpacious.self] = newValue }
    }
}

// Meet de beschikbare breedte één keer bovenaan en geeft door hoeveel ruimte er is.
struct WidthReader<Content: View>: View {
    @ViewBuilder var content: () -> Content
    @State private var width: CGFloat = 0
    @Environment(\.displayScale) private var scale
    var body: some View {
        content()
            .environment(\.isWide, width >= 700)
            .environment(\.isSpacious, width >= 1000)
            .onGeometryChange(for: CGFloat.self) { $0.size.width } action: {
                width = $0
                ImageURL.screen = (width: Double($0), scale: Double(scale)) // voor ImageURL.sharpHere
            }
    }
}
