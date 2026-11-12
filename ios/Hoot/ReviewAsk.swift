import Foundation

// Om een beoordeling vragen (1.3.1; audit 12 november, punt 4): met het eigen venster van Apple
// (requestReview), op het moment van "Je bent bij." / "Je weet genoeg.", na de derde uitgelezen Editie.
// Hooguit één keer per appversie, nooit tijdens het lezen, nooit bij de eerste twee Edities. Geen eigen
// tussenscherm. Wat de app onthoudt blijft op het toestel (UserDefaults): welke Edities je uitlas (alleen
// de dagdeel-id's, hooguit de laatste 20) en voor welke versie het venster al kwam. Niets gaat naar de server.
enum ReviewAsk {
    static let minimum = 3
    static let readKey = "hoot.review.edities" // [dagdeel-id] van Edities waarvan je het einde zag
    static let askedKey = "hoot.review.versie" // de appversie waarvoor het venster al werd gevraagd

    /// Je zag het einde van deze Editie. Eén keer per dagdeel geteld; geeft het aantal uitgelezen Edities.
    @discardableResult
    static func record(edition id: String, defaults: UserDefaults = .standard) -> Int {
        var ids = defaults.stringArray(forKey: readKey) ?? []
        if !ids.contains(id) { ids = Array((ids + [id]).suffix(20)) }
        defaults.set(ids, forKey: readKey)
        return ids.count
    }

    /// Mag het venster nu? Vanaf de derde uitgelezen Editie, en nog niet voor deze appversie.
    static func shouldAsk(read: Int, version: String?, defaults: UserDefaults = .standard) -> Bool {
        guard read >= minimum, let version, !version.isEmpty else { return false }
        return defaults.string(forKey: askedKey) != version
    }

    /// Vastleggen vóór het venster verschijnt: ook als Apple het niet toont, vragen we deze versie niet weer.
    static func markAsked(version: String?, defaults: UserDefaults = .standard) {
        if let version { defaults.set(version, forKey: askedKey) }
    }

    static var appVersion: String? { Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String }
}
