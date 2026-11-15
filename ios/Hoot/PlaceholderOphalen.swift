import Foundation
import CryptoKit
import ImageIO

// Haalt het manifest van de placeholderbeelden op (build 61, "server side bouwen"; PlaceholderReeks.swift): bij de start,
// een paar seconden na de eerste weergave en hooguit eens per dag. Alleen beelden waarvan de versie anders is dan in de
// bundel worden opgehaald, elk gecontroleerd (de versie is het begin van de sha256, en het moet een beeld zijn) en
// heel weggeschreven. Pas als alles binnen is, zet hij de reeks klaar; actief wordt ze bij de volgende weergave
// (PlaceholderOpslag.activeer). Mislukt er iets (offline, een time-out, een kapot bestand), dan blijft alles zoals het
// was. Privacy: gewone GET's zonder cookies, zonder kenmerk van het toestel of de lezer; ?v= is de versie van het beeld.
enum PlaceholderOphalen {
    static let manifestURL = URL(string: PlaceholderManifest.site + "/placeholders.json")!
    static let interval: TimeInterval = 24 * 3600
    static let sleutel = "HootPlaceholderManifestOpgehaald"
    static let maxManifest = 512 * 1024
    static let maxBeeld = 2 * 1024 * 1024

    typealias Haal = @Sendable (URL) async throws -> Data

    static let sessie: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.timeoutIntervalForRequest = 10
        c.timeoutIntervalForResource = 60
        c.waitsForConnectivity = false
        c.httpShouldSetCookies = false
        c.httpCookieAcceptPolicy = .never
        c.httpCookieStorage = nil
        c.urlCache = nil
        c.requestCachePolicy = .reloadIgnoringLocalCacheData
        return URLSession(configuration: c)
    }()

    @Sendable static func haalVanServer(_ url: URL) async throws -> Data {
        let (data, antwoord) = try await sessie.data(from: url)
        guard (antwoord as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
        return data
    }

    enum Uitkomst: Equatable, Sendable {
        case overgeslagen // vandaag al gedaan, of geen map (toetsen)
        case mislukt // niets veranderd; de volgende start probeert het opnieuw
        case ongewijzigd // het manifest is wat er al is of al klaarstaat
        case klaargezet // een nieuwe reeks staat klaar voor de volgende weergave
    }

    // Na de start: wachten tot de eerste weergave staat, dan op de achtergrond. Ook terug in de app (een app die dagen
    // openstaat), dan zonder wachten; de dagregel in ververs houdt het bij eens per dag. Niet in toetsen of opnamen.
    static func naStart(wacht: Bool = true) async {
        if WidgetGroep.inToets { return }
        #if DEBUG
        if DebugLaunch.screen != nil { return }
        #endif
        if wacht { try? await Task.sleep(for: .seconds(8)) }
        _ = await Task.detached(priority: .utility) { await ververs() }.value
    }

    @discardableResult
    static func ververs(nu: Date = .now, defaults: UserDefaults = .standard, haal: Haal = haalVanServer) async -> Uitkomst {
        guard let map = PlaceholderOpslag.map else { return .overgeslagen }
        if let laatst = defaults.object(forKey: sleutel) as? Date, nu >= laatst, nu.timeIntervalSince(laatst) < interval { return .overgeslagen }
        guard let data = try? await haal(manifestURL), data.count <= maxManifest else { return .mislukt }
        // De server antwoordde: vandaag niet nog eens, ook niet als het manifest niet deugt.
        guard let manifest = PlaceholderManifest.lees(data), manifest.fout == nil else {
            defaults.set(nu, forKey: sleutel)
            return .mislukt
        }
        let (reeks, nodig) = manifest.doel(bundel: PlaceholderBeelden.versies)
        let klaar = PlaceholderOpslag.klaar()
        if klaar?.versie == reeks.versie || (klaar == nil && PlaceholderOpslag.actief.versie == reeks.versie) {
            defaults.set(nu, forKey: sleutel)
            return .ongewijzigd
        }
        let fm = FileManager.default
        try? fm.createDirectory(at: map, withIntermediateDirectories: true)
        for n in nodig {
            let doel = map.appending(path: n.bestand)
            if fm.fileExists(atPath: doel.path) { continue } // eerder heel binnengekomen (de naam draagt de versie)
            guard let beeld = try? await haal(n.url), beeld.count <= maxBeeld, klopt(beeld, versie: n.versie),
                  (try? beeld.write(to: doel, options: .atomic)) != nil else { return .mislukt }
        }
        guard reeks.compleet(map: map), PlaceholderOpslag.zetKlaar(reeks) else { return .mislukt }
        defaults.set(nu, forKey: sleutel)
        return .klaargezet
    }

    // Is dit het beeld van die versie: het begin van de sha256 klopt, en ImageIO kan het lezen.
    static func klopt(_ data: Data, versie: String) -> Bool {
        let hash = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        guard hash.hasPrefix(versie), let bron = CGImageSourceCreateWithData(data as CFData, nil),
              let eigen = CGImageSourceCopyPropertiesAtIndex(bron, 0, nil) as? [CFString: Any],
              let w = eigen[kCGImagePropertyPixelWidth] as? Int, let h = eigen[kCGImagePropertyPixelHeight] as? Int else { return false }
        return w > 0 && h > 0
    }
}
