import SwiftUI

// Alleen in Debug, voor schermafbeeldingen en audits: de app opent meteen op een bepaald scherm,
// zonder te tikken (zie ios/AppStore/tools/device-screens.sh). Startargumenten:
//   -HootStartTab editie|stroom|digest|bewaard|zoek
//   -HootScreen verhaal|lezer|bronnen|bluesky|stroom-bronnen|video|instellingen|instellingen-bronnen|instellingen-vakken|instellingen-abonnementen|instellingen-wissen
//   -HootRubriek wereld|bubbel|bluesky|…   -HootPicks nos,nrc   (de Stroom op een rubriek, met gekozen bronnen;
//                                             met -HootScreen stroom-bronnen staat de stapel open)
//   -HootScroll midden|onder|slot   -HootQuery <tekst>   -HootDark YES   -HootLargeText YES   -HootOffline YES
//   -HootSeenMinutes <n>   (de Stroom alsof je er n minuten geleden was)
//   -HootFeature verhaal-id:Rubriek,…   (App Store-opnamen: deze echte verhalen bovenaan Editie en Stroom)
// In Release doet dit allemaal niets.
enum DebugLaunch {
    #if DEBUG
    private static var defaults: UserDefaults { .standard }
    static var screen: String? { defaults.string(forKey: "HootScreen") }
    static var query: String? { defaults.string(forKey: "HootQuery") }
    static var dark: Bool { defaults.bool(forKey: "HootDark") }
    static var largeText: Bool { defaults.bool(forKey: "HootLargeText") }
    static var offline: Bool { defaults.bool(forKey: "HootOffline") }
    static var rubriek: String? { defaults.string(forKey: "HootRubriek") }
    static var picks: [String] { (defaults.string(forKey: "HootPicks") ?? "").split(separator: ",").map(String.init) }
    static var seenMinutes: Double? { defaults.object(forKey: "HootSeenMinutes") != nil ? defaults.double(forKey: "HootSeenMinutes") : nil }
    static var feature: [(id: String, label: String?)] {
        (defaults.string(forKey: "HootFeature") ?? "").split(separator: ",").map { part in
            let bits = part.split(separator: ":", maxSplits: 1).map(String.init)
            return (bits[0], bits.count > 1 ? bits[1] : nil)
        }
    }
    static var anchor: UnitPoint? {
        switch defaults.string(forKey: "HootScroll") {
        case "midden": .center
        case "onder": .bottom
        case "slot": .top // de laatste twee verhalen en het einde, netjes onder de balk
        default: nil
        }
    }
    #else
    static let screen: String? = nil
    static let query: String? = nil
    static let dark = false
    static let largeText = false
    static let offline = false
    static let rubriek: String? = nil
    static let picks: [String] = []
    static let seenMinutes: Double? = nil
    static let feature: [(id: String, label: String?)] = []
    static let anchor: UnitPoint? = nil
    #endif

    static func screen(_ name: String) -> Bool { screen == name }
    // De Stroom op deze rubriek; gaat vóór wat iOS van de vorige keer terugzet.
    static var startRubriek: String? { rubriek ?? (screen("bluesky") ? "bluesky" : nil) }
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
