import SwiftUI

// Alleen in Debug, voor schermafbeeldingen en audits: de app opent meteen op een bepaald scherm,
// zonder te tikken (zie ios/AppStore/tools/device-screens.sh). Startargumenten:
//   -HootStartTab editie|stroom|digest|bewaard|zoek
//   -HootScreen verhaal|lezer|bronnen|bluesky|video|instellingen|instellingen-bronnen|instellingen-vakken|instellingen-wissen
//   -HootScroll midden|onder   -HootQuery <tekst>   -HootDark YES   -HootLargeText YES   -HootOffline YES
//   -HootSeenMinutes <n>   (de Stroom alsof je er n minuten geleden was)
// In Release doet dit allemaal niets.
enum DebugLaunch {
    #if DEBUG
    private static var defaults: UserDefaults { .standard }
    static var screen: String? { defaults.string(forKey: "HootScreen") }
    static var query: String? { defaults.string(forKey: "HootQuery") }
    static var dark: Bool { defaults.bool(forKey: "HootDark") }
    static var largeText: Bool { defaults.bool(forKey: "HootLargeText") }
    static var offline: Bool { defaults.bool(forKey: "HootOffline") }
    static var seenMinutes: Double? { defaults.object(forKey: "HootSeenMinutes") != nil ? defaults.double(forKey: "HootSeenMinutes") : nil }
    static var anchor: UnitPoint? {
        switch defaults.string(forKey: "HootScroll") {
        case "midden": .center
        case "onder": .bottom
        default: nil
        }
    }
    #else
    static let screen: String? = nil
    static let query: String? = nil
    static let dark = false
    static let largeText = false
    static let offline = false
    static let seenMinutes: Double? = nil
    static let anchor: UnitPoint? = nil
    #endif

    static func screen(_ name: String) -> Bool { screen == name }
}

extension View {
    // Begin halverwege of onderaan een lange pagina, ook als de inhoud nog binnenkomt.
    @ViewBuilder func debugScroll() -> some View {
        if let anchor = DebugLaunch.anchor {
            defaultScrollAnchor(anchor, for: .initialOffset).defaultScrollAnchor(anchor, for: .sizeChanges)
        } else {
            self
        }
    }

    // Lijsten, formulieren en de Digest negeren dat anker: daar springen we naar een vast punt.
    @ViewBuilder func debugJump<ID: Hashable, T: Equatable>(_ proxy: ScrollViewProxy, to id: ID?, when trigger: T) -> some View {
        if let anchor = DebugLaunch.anchor {
            task(id: trigger) {
                guard let id else { return }
                try? await Task.sleep(for: .seconds(1.5))
                proxy.scrollTo(id, anchor: anchor == .bottom ? .bottom : .top)
            }
        } else {
            self
        }
    }

    // Donker en heel grote tekst, los van de instellingen van het toestel.
    func debugAppearance() -> some View {
        preferredColorScheme(DebugLaunch.dark ? .dark : nil)
            .transformEnvironment(\.dynamicTypeSize) { if DebugLaunch.largeText { $0 = .accessibility3 } }
    }
}
