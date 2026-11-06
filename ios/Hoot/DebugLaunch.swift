import SwiftUI

// Alleen in Debug, voor schermafbeeldingen en audits: de app opent meteen op een bepaald scherm,
// zonder te tikken (zie ios/AppStore/tools/device-screens.sh). Startargumenten:
//   -HootStartTab editie|stroom|digest|bewaard|zoek
//   -HootScreen verhaal|lezer|bronnen|stroom-bronnen|video|instellingen|instellingen-bronnen|instellingen-bluesky|instellingen-interesses|instellingen-vakken|instellingen-abonnementen|instellingen-wissen
//   -HootRubriek wereld|bubbel|…   -HootPicks nos,nrc   (de Stroom op een rubriek, met gekozen bronnen;
//                                             met -HootScreen stroom-bronnen staat de stapel open)
//   -HootScroll midden|onder|slot   -HootQuery <tekst>   -HootDark YES   -HootLargeText YES   -HootOffline YES
//   -HootLayout tijdlijn|krant   (de Stroom in die indeling, los van de instelling)
//   -HootSeenMinutes <n>   (de Stroom alsof je er n minuten geleden was)
//   -HootOnboarded YES   (zonder welkom, mét opstartscherm; met -HootStartTab stroom: de opstart naar de Stroom)
//   -HootSlowSplash <n>   (de overgang van het opstartscherm n keer zo langzaam, en de iris in het welkom)
//   -HootFresh YES   (het welkom als nieuwe gebruiker, met opstartscherm)
//   -HootWelcomeStep uitleg|bronnen|interesses   (het welkom op die
//                                             pagina; zonder -HootFresh ook als nieuwe gebruiker)
//   -HootInterests politiek,tech,cultuur   (in het welkom al gekozen)
//   -HootNotifyIn <s>   (één echt seintje "Editie ligt klaar" over s seconden; toestemming eerst geven)
//   -HootFeature verhaal-id:Rubriek,…   (App Store-opnamen: deze echte verhalen bovenaan Editie en Stroom)
//   -HootRefreshDelay <s>   (trek-om-te-verversen: houd het laden s seconden vast, om de lader te zien)
//   -HootLoadDelay <s>   (eerste laden: houd de laadstrepen s seconden in beeld, voor opnamen)
//   -HootTien YES   (speel "Tien en de bubbel" bij de start, alsof je net het welkom afrondde; met
//                   -HootLoadDelay zie je Traag)
//   -HootEngine YES   (jouw Editie altijd opnieuw samenstellen met de rekenkern, ook als er al een
//                     vastgelegde staat op het toestel of in je account; niets gaat naar je account)
//   -HootGrid paren|kolom   (de brede Editie in dat raster, los van staand of liggend: opnamen van A op een
//                           staande simulator)
//   -HootVenster <breedte>   (iPad: het venster zo smal als een deelvenster in Split View, links, met een
//                            compacte breedteklasse; de rest van het scherm blijft leeg)
// In Release doet dit allemaal niets.
enum DebugLaunch {
    #if DEBUG
    private static var defaults: UserDefaults { .standard }
    static var screen: String? { defaults.string(forKey: "HootScreen") }
    static var engine: Bool { defaults.bool(forKey: "HootEngine") }
    static var grid: String? { defaults.string(forKey: "HootGrid") }
    static var venster: CGFloat? { defaults.object(forKey: "HootVenster") != nil ? CGFloat(defaults.double(forKey: "HootVenster")) : nil }
    static var refreshDelay: Double { max(0, min(30, defaults.double(forKey: "HootRefreshDelay"))) }
    static var loadDelay: Double { max(0, min(60, defaults.double(forKey: "HootLoadDelay"))) }
    static var tien: Bool { defaults.bool(forKey: "HootTien") }
    static var query: String? { defaults.string(forKey: "HootQuery") }
    static var dark: Bool { defaults.bool(forKey: "HootDark") }
    static var largeText: Bool { defaults.bool(forKey: "HootLargeText") }
    static var offline: Bool { defaults.bool(forKey: "HootOffline") }
    static var rubriek: String? { defaults.string(forKey: "HootRubriek") }
    static var layout: String? { defaults.string(forKey: "HootLayout").flatMap { ["tijdlijn", "krant"].contains($0) ? $0 : nil } }
    static var picks: [String] { (defaults.string(forKey: "HootPicks") ?? "").split(separator: ",").map(String.init) }
    static var seenMinutes: Double? { defaults.object(forKey: "HootSeenMinutes") != nil ? defaults.double(forKey: "HootSeenMinutes") : nil }
    static var welcomeStep: String? { defaults.string(forKey: "HootWelcomeStep") }
    static var fresh: Bool { defaults.bool(forKey: "HootFresh") || defaults.string(forKey: "HootWelcomeStep") != nil }
    static var interests: [String]? { defaults.string(forKey: "HootInterests").map { $0.split(separator: ",").map(String.init) } }
    static var slow: Double { max(1, defaults.double(forKey: "HootSlowSplash")) }
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
    static let engine = false
    static let grid: String? = nil
    static let venster: CGFloat? = nil
    static let refreshDelay = 0.0
    static let loadDelay = 0.0
    static let tien = false
    static let query: String? = nil
    static let dark = false
    static let largeText = false
    static let offline = false
    static let rubriek: String? = nil
    static let layout: String? = nil
    static let picks: [String] = []
    static let seenMinutes: Double? = nil
    static let welcomeStep: String? = nil
    static let fresh = false
    static let interests: [String]? = nil
    static let slow = 1.0
    static let feature: [(id: String, label: String?)] = []
    static let anchor: UnitPoint? = nil
    #endif

    static func screen(_ name: String) -> Bool { screen == name }
    // De Stroom op deze rubriek; gaat vóór wat iOS van de vorige keer terugzet.
    static var startRubriek: String? { rubriek }
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

    // iPad-opnamen: een smal venster zoals Split View (alleen Debug). Draaien kan de app op de iPad niet zelf
    // (de venstermodus staat dat niet toe); dat doet een UI-test met XCUIDevice.
    func debugWindow() -> some View {
        task {
            #if DEBUG
            guard let w = DebugLaunch.venster else { return }
            try? await Task.sleep(for: .milliseconds(300))
            guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first,
                  let window = scene.windows.first(where: \.isKeyWindow) ?? scene.windows.first else { return }
            window.traitOverrides.horizontalSizeClass = w < 700 ? .compact : .regular
            window.frame = CGRect(x: 0, y: 0, width: w, height: scene.coordinateSpace.bounds.height)
            #endif
        }
    }

    // Donker en heel grote tekst, los van de instellingen van het toestel.
    func debugAppearance() -> some View {
        preferredColorScheme(DebugLaunch.dark ? .dark : nil)
            .transformEnvironment(\.dynamicTypeSize) { if DebugLaunch.largeText { $0 = .accessibility3 } }
    }
}
