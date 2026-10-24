import SwiftUI

// Opmaak op breedte, niet op apparaat: dezelfde regels voor iPhone (ook mini), een opengevouwen
// iPhone Duo en iPad. Wisselt het venster van breedte (vouwen, Split View, Stage Manager), dan
// past de opmaak zich live aan zonder dat je je plek kwijtraakt.
enum Layout {
    static let readable: CGFloat = 680 // leesbreedte: comfortabele regellengte voor lopende tekst
    static let wide: CGFloat = 1080 // brede pagina (editie, digest) op iPad en opengevouwen
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

// Meet de beschikbare breedte één keer bovenaan en geeft door of er ruimte is voor twee kolommen.
struct WidthReader<Content: View>: View {
    @ViewBuilder var content: () -> Content
    @State private var wide = false
    var body: some View {
        content()
            .environment(\.isWide, wide)
            .onGeometryChange(for: Bool.self) { $0.size.width >= 700 } action: { wide = $0 }
    }
}
