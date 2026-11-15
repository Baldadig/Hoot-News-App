import SwiftUI

// Een verhaal zonder beeld krijgt in de widget het Hoot-placeholderbeeld, zoals in de app (BeeldloosView):
// dezelfde knipsel-beelden (PlaceholderBestand: de WebP's uit de bundel van de app), gekozen uit de id van het
// stuk (Placeholder.base). Licht en donker; Nacht kent de widget niet. Decoratie: verborgen voor VoiceOver.
struct WidgetBeeldloos: View {
    @Environment(\.colorScheme) private var scheme
    let id: String

    // FNV-1a over de id, zoals Placeholder.base (shared/placeholder.mjs); nooit een beeld dat weg is.
    static func index(_ id: String) -> Int {
        var h: UInt32 = 0x811c9dc5
        for b in id.utf8 { h ^= UInt32(b); h = h &* 0x01000193 }
        return PlaceholderOpslag.actief.index(hash: h) // dezelfde reeks als de app (PlaceholderReeks.swift)
    }

    var body: some View {
        // Hooguit 1000 pixels breed: genoeg voor de grootste widget op 3x, en ruim binnen het geheugen en de
        // beeldmaat die een widget mag gebruiken.
        let image = PlaceholderBestand.beeld(Self.index(id), thema: scheme == .dark ? "donker" : "licht", klein: false, maxPixel: 1000)
        Rectangle()
            .fill(scheme == .dark ? Color(red: 0x1E / 255, green: 0x1B / 255, blue: 0x18 / 255) : Color(red: 0xF1 / 255, green: 0xE9 / 255, blue: 0xDC / 255))
            .overlay {
                if let image {
                    Image(decorative: image, scale: 1).resizable().scaledToFill()
                }
            }
            .clipped()
            .accessibilityHidden(true)
    }
}
