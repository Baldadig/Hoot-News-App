import Foundation

// Meten zonder volgen (iOS): dezelfde zeven gebeurtenissen als het web (shared/tel.mjs, netlify/functions/tel.mjs;
// getoetst in TellingTests en tests/tel.test.mjs). Alleen totalen per dag, geen personen: de server krijgt een
// gebeurtenis, het dagdeel van de Editie, het platform, major.minor van de app en een aantal. Geen id, geen
// account, geen toestel-id, geen tijdstempel, geen cookie, geen derde partij.
// Wat de app onthoudt: alleen "al geteld voor dagdeel X" (UserDefaults), zodat editie-open en editie-einde één
// keer per dagdeel tellen: aantal lezers per dagdeel, zonder id. Alleen in Release; fire-and-forget.
enum Telling {
    enum Event: String, CaseIterable {
        case editieOpen = "editie-open"
        case editieEinde = "editie-einde"
        case artikelOpen = "artikel-open"
        case stroomOpen = "stroom-open"
        case selectieOpen = "selectie-open"
        case vergelijkOpen = "vergelijk-open"
        case delen = "delen"

        /// Eerste keer per dagdeel op dit toestel (de rest telt elke keer).
        var eenmalig: Bool { self == .editieOpen || self == .editieEinde }
    }

    static let nMax = 20
    static let key = "hoot.geteld" // [gebeurtenis: dagdeel-id]

    /// "2026-11-11-ochtend", het dagdeel van de Editie die je ziet. Nil zonder Editie: dan niets tellen.
    static func dagdeel(date: String?, slot: String?) -> String? {
        guard let date, let slot, !date.isEmpty, !slot.isEmpty else { return nil }
        return "\(date)-\(slot)"
    }

    /// "1.2.1" wordt "1.2": alleen major.minor.
    static func majorMinor(_ version: String?) -> String? {
        guard let version else { return nil }
        let parts = version.split(separator: ".")
        guard parts.count >= 2, parts[0].allSatisfy(\.isNumber), parts[1].allSatisfy(\.isNumber) else { return nil }
        return "\(parts[0]).\(parts[1])"
    }

    /// Mag er iets gestuurd worden? Alleen in Release.
    static var verzenden: Bool {
        #if DEBUG
        false
        #else
        true
        #endif
    }

    /// De body (JSON) van één gebeurtenis.
    static func body(_ event: Event, dagdeel: String, version: String?, n: Int = 1) -> Data {
        var d: [String: Any] = ["e": event.rawValue, "d": dagdeel, "p": "ios"]
        if let v = majorMinor(version) { d["v"] = v }
        if !event.eenmalig, n > 1 { d["n"] = min(n, nMax) }
        return (try? JSONSerialization.data(withJSONObject: d, options: [.sortedKeys])) ?? Data()
    }

    /// Eerste keer in dit dagdeel? Onthoudt dat in `defaults` (alleen het dagdeel-id per gebeurtenis).
    static func eerste(_ event: Event, dagdeel: String, defaults: UserDefaults = .standard) -> Bool {
        guard event.eenmalig else { return true }
        var done = defaults.dictionary(forKey: key) as? [String: String] ?? [:]
        if done[event.rawValue] == dagdeel { return false }
        done[event.rawValue] = dagdeel
        defaults.set(done, forKey: key)
        return true
    }

    /// Zonder cookies, cache of gedeelde opslag: een gewone, vluchtige sessie.
    static let session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.httpCookieStorage = nil
        config.httpShouldSetCookies = false
        config.urlCache = nil
        config.timeoutIntervalForRequest = 10
        config.waitsForConnectivity = false
        return URLSession(configuration: config)
    }()

    static func request(_ body: Data, base: URL = HootAPI.base) -> URLRequest {
        var r = URLRequest(url: base.appendingPathComponent("api/tel"))
        r.httpMethod = "POST"
        r.httpBody = body
        r.setValue("text/plain;charset=UTF-8", forHTTPHeaderField: "Content-Type")
        return r
    }

    /// Fire-and-forget: wacht nergens op en faalt nooit zichtbaar. Geeft true als er een verzoek is gedaan.
    @discardableResult
    static func stuur(_ event: Event, dagdeel: String?, n: Int = 1,
                      version: String? = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String,
                      defaults: UserDefaults = .standard, enabled: Bool = verzenden,
                      transport: (URLRequest) -> Void = { session.dataTask(with: $0).resume() }) -> Bool {
        guard enabled, let dagdeel, eerste(event, dagdeel: dagdeel, defaults: defaults) else { return false }
        transport(request(body(event, dagdeel: dagdeel, version: version, n: n)))
        return true
    }
}
