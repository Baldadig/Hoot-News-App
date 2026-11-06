import SwiftUI

// De compacte voorpagina (iPhone Duo dicht, stap 2): het buitenscherm is breed en laag (466 × 678, verhouding
// ± 0,69), met de systeembalk opzij. Die balk geeft de hoogte van de tabbalk terug. Hoot gebruikt die zo:
// 01 groot en helemaal boven de vouw van het scherm (beeld, kop, intro, bronregel), daaronder 02 tot 10 als
// dichte rijen (rubriek, kop, bronregel, een klein beeld rechts), zodat er ± vijf verhalen in één scherm staan.
// De Stroom krijgt dezelfde dichte rijen.
//
// Herkend aan geometrie en traits, nooit aan de apparaatnaam: compacte breedte, de systeembalk opzij
// (`toolbarVerticalEdge`, iOS 27.1) en een venster dat niet smal en hoog is zoals een gewone iPhone (± 0,46).
// Op iPhone en iPad verandert er niets. In Debug kan `-HootVoorpagina compact` hem op elke iPhone tonen.
enum Voorpagina {
    /// Korte zijde / lange zijde vanaf waar een venster "breed en laag" is. iPhone 17 Pro Max: 440/956 = 0,46;
    /// iPhone Duo buiten: 466/678 = 0,69.
    static let minVerhouding: CGFloat = 0.6

    static func compact(venster: CGSize, horizontal: UserInterfaceSizeClass?, balkOpzij: Bool, geforceerd: Bool = false) -> Bool {
        guard horizontal == .compact, venster.width > 0, venster.height > 0 else { return false }
        if geforceerd { return true }
        guard balkOpzij else { return false }
        return min(venster.width, venster.height) / max(venster.width, venster.height) >= minVerhouding
    }
}

extension View {
    /// Meet of dit scherm de compacte voorpagina krijgt en meldt het. Moet binnen `hootKopScreen` staan
    /// (daar wordt `balkOpzij` gelezen).
    func compacteVoorpagina(_ melding: @escaping (Bool) -> Void) -> some View {
        modifier(VoorpaginaMeter(melding: melding))
    }
}

private struct VoorpaginaMeter: ViewModifier {
    var melding: (Bool) -> Void
    @Environment(\.balkOpzij) private var balkOpzij
    @Environment(\.horizontalSizeClass) private var horizontal
    @State private var venster: CGSize = .zero

    private var compact: Bool {
        Voorpagina.compact(venster: venster, horizontal: horizontal, balkOpzij: balkOpzij, geforceerd: DebugLaunch.voorpagina)
    }

    func body(content: Content) -> some View {
        content
            // Het venster: het vlak plus wat de systeembalken eromheen innemen.
            .onGeometryChange(for: CGSize.self) { g in
                let f = g.frame(in: .global)
                return CGSize(width: f.maxX + g.safeAreaInsets.trailing, height: f.maxY + g.safeAreaInsets.bottom)
            } action: { venster = $0 }
            .onChange(of: compact, initial: true) { _, nu in melding(nu) }
    }
}
