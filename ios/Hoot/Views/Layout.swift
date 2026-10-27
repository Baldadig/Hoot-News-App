import SwiftUI

// Opmaak op breedte, niet op apparaat: dezelfde regels voor iPhone (ook mini), een opengevouwen
// iPhone Duo en iPad. Wisselt het venster van breedte (vouwen, Split View, Stage Manager), dan
// past de opmaak zich live aan zonder dat je je plek kwijtraakt.
enum Layout {
    static let readable: CGFloat = 680 // leesbreedte: comfortabele regellengte voor lopende tekst
    static let wide: CGFloat = 1000 // brede pagina (editie, digest) op iPad en opengevouwen
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
    func column(_ width: CGFloat = Layout.readable) -> some View {
        frame(maxWidth: width).frame(maxWidth: .infinity)
    }
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
    var body: some View {
        content()
            .environment(\.isWide, width >= 700)
            .environment(\.isSpacious, width >= 1000)
            .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
    }
}
