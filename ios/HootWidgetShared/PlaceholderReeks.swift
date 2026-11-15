import Foundation

// Placeholderbeelden van de server (build 61, besluit Alex 15 november: "server side bouwen"). Welke beelden in de reeks
// zitten en hoe ze eruitzien, kan veranderen zonder app-update: de app haalt het manifest op
// (https://gethoot.app/placeholders.json, gemaakt door scripts/placeholders.mjs; PlaceholderOphalen, alleen in de app),
// zet de beelden die anders zijn dan in de bundel in de App Group, en pas als alles er heel staat, wordt de nieuwe reeks
// bij een volgende weergave actief (PlaceholderOpslag.activeer: bij de start en als de app naar de achtergrond gaat,
// nooit terwijl je kijkt). Tot die tijd, en offline, geldt de gebundelde reeks (PlaceholderBeelden). App en widget lezen
// dezelfde actieve reeks. De rekenregels zijn die van shared/placeholder.mjs (placeholderReeks); het web heeft de reeks
// gebouwd, in dezelfde deploy als het manifest, dus het is er altijd gelijk aan.

// Het manifest zoals het op de server staat.
struct PlaceholderManifest: Codable, Sendable {
    struct Paar: Codable, Sendable {
        let een: String
        let twee: String
        enum CodingKeys: String, CodingKey { case een = "1x", twee = "2x" }
    }
    struct Uitsneden: Codable, Sendable {
        let groot: Paar
        let klein: Paar
    }
    struct Beeld: Codable, Sendable {
        let nummer: Int
        let set: String
        let licht: Uitsneden
        let donker: Uitsneden
        let nacht: Uitsneden
        func uitsneden(_ thema: String) -> Uitsneden { thema == "nacht" ? nacht : thema == "donker" ? donker : licht }
    }
    let schema: Int
    let versie: String
    let count: Int
    let uit: [Int]
    let beelden: [Beeld]

    static let schemaNu = 1
    static let site = "https://gethoot.app"
    static let beeldPad = "/img/placeholder/"
    static let themas = ["licht", "donker", "nacht"]

    // nil als de bytes geen manifest zijn (dan wordt het genegeerd).
    static func lees(_ data: Data) -> PlaceholderManifest? { try? JSONDecoder().decode(PlaceholderManifest.self, from: data) }

    static func isVersie(_ s: String) -> Bool { s.count == 12 && s.allSatisfy { "0123456789abcdef".contains($0) } }
    // De versie (?v=) van een beeld-url, of nil als de url niet van de eigen site is of geen versie heeft.
    static func versie(van url: String) -> String? {
        guard url.hasPrefix(site + beeldPad), URL(string: url) != nil else { return nil }
        let delen = url.components(separatedBy: ".webp?v=")
        guard delen.count == 2, isVersie(delen[1]) else { return nil }
        return delen[1]
    }

    // De familie per plek (nil: uit), als het manifest bruikbaar is.
    private var familie: [String?] {
        let per = Dictionary(beelden.map { ($0.nummer, $0.set) }, uniquingKeysWith: { a, _ in a })
        return (0 ..< count).map { uit.contains($0 + 1) ? nil : per[$0 + 1] }
    }

    // nil als het manifest goed is, anders de reden: dezelfde regels en woorden als placeholderManifestFout in
    // shared/placeholder.mjs.
    var fout: String? {
        if schema != Self.schemaNu { return "schema" }
        if !Self.isVersie(versie) { return "versie" }
        if count < 2 || count > 64 { return "count" }
        if uit.contains(where: { $0 < 1 || $0 > count }) || Set(uit).count != uit.count { return "uit" }
        var gezien = Set<Int>()
        for b in beelden {
            if b.nummer < 1 || b.nummer > count || gezien.contains(b.nummer) { return "nummer" }
            if b.set.isEmpty || b.set.count > 24 || !b.set.allSatisfy({ $0.isASCII && $0.isLetter && $0.isLowercase }) { return "set" }
            for thema in Self.themas {
                let u = b.uitsneden(thema)
                for url in [u.groot.een, u.groot.twee, u.klein.een, u.klein.twee] where Self.versie(van: url) == nil { return "url" }
            }
            gezien.insert(b.nummer)
        }
        let per = Set(beelden.map(\.nummer))
        if (1 ... count).contains(where: { !uit.contains($0) && !per.contains($0) }) { return "beeld ontbreekt" }
        let reeks = PlaceholderReeks(versie: versie, familie: familie, bestanden: [:])
        if reeks.keuze.count < 2 { return "te weinig beelden" }
        for k in reeks.keuze where reeks.doorschuiven(k, weg: reeks.set(k)) == nil { return "doorschuiven" }
        return nil
    }

    // Wat de app moet ophalen om deze reeks te tonen: per bestand (ph-N-thema[-klein], de 2x-maat) de url en de versie.
    // Is de versie gelijk aan die van het gebundelde bestand (`bundel`, PlaceholderBeelden.versies), dan is dat hetzelfde
    // beeld en blijft het uit de bundel komen. Alleen voor een goed manifest (fout == nil).
    struct Nodig: Equatable, Sendable {
        let naam: String
        let url: URL
        let versie: String
        var bestand: String { "\(naam)-\(versie).webp" }
    }
    func doel(bundel: [String: String]) -> (reeks: PlaceholderReeks, nodig: [Nodig]) {
        let per = Dictionary(beelden.map { ($0.nummer, $0) }, uniquingKeysWith: { a, _ in a })
        var bestanden: [String: String] = [:]
        var nodig: [Nodig] = []
        let reeks = PlaceholderReeks(versie: versie, familie: familie, bestanden: [:])
        for k in reeks.keuze {
            guard let b = per[k + 1] else { continue }
            for thema in Self.themas {
                for klein in [false, true] {
                    let u = b.uitsneden(thema)
                    let url = klein ? u.klein.twee : u.groot.twee
                    let naam = PlaceholderBeelden.bestand(k, thema: thema, klein: klein)
                    guard let v = Self.versie(van: url), let adres = URL(string: url), bundel[naam] != v else { continue }
                    let n = Nodig(naam: naam, url: adres, versie: v)
                    bestanden[naam] = n.bestand
                    nodig.append(n)
                }
            }
        }
        return (PlaceholderReeks(versie: versie, familie: familie, bestanden: bestanden), nodig)
    }
}

// Een reeks: per plek in de hash de set van het beeld (nil: niet gekozen), en per bestand dat niet uit de bundel komt
// de naam van het bestand in de App Group.
struct PlaceholderReeks: Codable, Sendable, Equatable {
    let versie: String
    let familie: [String?]
    let bestanden: [String: String]
    let uit: Set<Int>
    let keuze: [Int]
    var count: Int { familie.count }

    static let shift = 3

    init(versie: String, familie: [String?], bestanden: [String: String]) {
        self.versie = versie
        self.familie = familie
        self.bestanden = bestanden
        uit = Set(familie.indices.filter { familie[$0] == nil })
        keuze = familie.indices.filter { familie[$0] != nil }
    }
    enum CodingKeys: String, CodingKey { case versie, familie, bestanden }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.init(versie: try c.decode(String.self, forKey: .versie), familie: try c.decode([String?].self, forKey: .familie),
                  bestanden: try c.decode([String: String].self, forKey: .bestanden))
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(versie, forKey: .versie)
        try c.encode(familie, forKey: .familie)
        try c.encode(bestanden, forKey: .bestanden)
    }

    // De reeks in de bundel (PlaceholderBeelden, gegenereerd uit shared/placeholder.mjs).
    static let bundel = PlaceholderReeks(versie: PlaceholderBeelden.versie, familie: PlaceholderBeelden.familie, bestanden: [:])

    func set(_ k: Int) -> String? { familie.indices.contains(k) ? familie[k] : nil }
    // Het beeld bij een hash: hash mod count, en valt dat op een lege plek, dan (hash / count) mod keuze uit de rest.
    func index(hash h: UInt32) -> Int {
        guard count > 0, !keuze.isEmpty else { return 0 }
        let k = Int(h % UInt32(count))
        return uit.contains(k) ? keuze[Int((h / UInt32(count)) % UInt32(keuze.count))] : k
    }
    // Drie verder (mod count), tot een beeld in de reeks dat niet in de set `weg` zit; hooguit count stappen.
    func doorschuiven(_ k: Int, weg: String?) -> Int? {
        var j = k
        for _ in 0 ..< count {
            j = (j + Self.shift) % count
            if !uit.contains(j) && set(j) != weg { return j }
        }
        return nil
    }
    // Kan deze reeks getoond worden met wat er is: elk bestand in de map of in de bundel.
    func compleet(map: URL?) -> Bool {
        guard count >= 2, count <= 64, keuze.count >= 2 else { return false }
        for k in keuze {
            for thema in PlaceholderManifest.themas {
                for klein in [false, true] {
                    let naam = PlaceholderBeelden.bestand(k, thema: thema, klein: klein)
                    if let f = bestanden[naam] {
                        guard let map, FileManager.default.fileExists(atPath: map.appending(path: f).path) else { return false }
                    } else if PlaceholderBeelden.versies[naam] == nil {
                        return false
                    }
                }
            }
        }
        return true
    }
}

// De actieve reeks en de bestanden in de App Group (map placeholder/): actief.json is wat app en widget tonen,
// klaar.json wat volledig binnen is en bij de volgende weergave actief wordt.
enum PlaceholderOpslag {
    static let actiefNaam = "actief.json"
    static let klaarNaam = "klaar.json"

    nonisolated(unsafe) static var mapOverride: URL? // alleen tests
    // In toetsen nooit de echte App Group (en zonder override geen map: dan geldt de bundel).
    static var map: URL? {
        if let mapOverride { return mapOverride }
        if WidgetGroep.inToets { return nil }
        return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: WidgetGroep.id)?
            .appending(path: "placeholder", directoryHint: .isDirectory)
    }
    // De app wisselt alleen in activeer(); de widget leest actief.json opnieuw als het bestand veranderde.
    private static let inApp = Bundle.main.bundleURL.pathExtension == "app"
    private static let slot = NSLock()
    nonisolated(unsafe) private static var huidig: PlaceholderReeks?
    nonisolated(unsafe) private static var gelezenOp: Date?

    static var actief: PlaceholderReeks {
        slot.lock()
        defer { slot.unlock() }
        if huidig == nil || (!inApp && datum(map?.appending(path: actiefNaam)) != gelezenOp) { laad() }
        return huidig ?? .bundel
    }

    // Vergeet wat in het geheugen staat (tests, of na een wissel van map).
    static func vergeet() {
        slot.lock()
        huidig = nil
        gelezenOp = nil
        slot.unlock()
    }

    private static func datum(_ url: URL?) -> Date? {
        guard let url else { return nil }
        return (try? FileManager.default.attributesOfItem(atPath: url.path))?[.modificationDate] as? Date
    }

    // Leest actief.json; kapot, of mist er een bestand: de bundel.
    private static func laad() {
        let map = map
        let url = map?.appending(path: actiefNaam)
        gelezenOp = datum(url)
        guard let url, let data = try? Data(contentsOf: url), let reeks = try? JSONDecoder().decode(PlaceholderReeks.self, from: data),
              reeks.compleet(map: map) else {
            huidig = .bundel
            return
        }
        huidig = reeks
    }

    // Het bestand voor een naam (ph-N-thema[-klein]) als het uit de App Group komt; nil: uit de bundel.
    static func url(_ naam: String) -> URL? {
        guard let f = actief.bestanden[naam], let map else { return nil }
        let u = map.appending(path: f)
        return FileManager.default.fileExists(atPath: u.path) ? u : nil
    }

    // Wat klaarstaat, als dat er is.
    static func klaar() -> PlaceholderReeks? {
        guard let url = map?.appending(path: klaarNaam), let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(PlaceholderReeks.self, from: data)
    }

    // Zet een reeks klaar (PlaceholderOphalen, als al zijn bestanden heel in de map staan).
    @discardableResult
    static func zetKlaar(_ reeks: PlaceholderReeks) -> Bool {
        guard let map, let data = try? JSONEncoder().encode(reeks) else { return false }
        return (try? data.write(to: map.appending(path: klaarNaam), options: .atomic)) != nil
    }

    // klaar.json wordt actief.json (alleen de app: bij de start en als hij naar de achtergrond gaat, nooit terwijl je
    // kijkt). Ruimt daarna de bestanden op die de nieuwe reeks niet gebruikt. Geeft true als de reeks wisselde.
    @discardableResult
    static func activeer() -> Bool {
        guard let map else { return false }
        let klaarURL = map.appending(path: klaarNaam), actiefURL = map.appending(path: actiefNaam)
        guard let data = try? Data(contentsOf: klaarURL) else { return false }
        let fm = FileManager.default
        guard let reeks = try? JSONDecoder().decode(PlaceholderReeks.self, from: data), reeks.compleet(map: map),
              (try? data.write(to: actiefURL, options: .atomic)) != nil else {
            try? fm.removeItem(at: klaarURL)
            return false
        }
        try? fm.removeItem(at: klaarURL)
        slot.lock()
        huidig = reeks
        gelezenOp = datum(actiefURL)
        slot.unlock()
        // Wat net is binnengekomen (een ophaalronde die nog loopt) blijft staan; dat ruimt een latere wissel op.
        let houd = Set(reeks.bestanden.values)
        for f in (try? fm.contentsOfDirectory(atPath: map.path)) ?? [] where f.hasSuffix(".webp") && !houd.contains(f) {
            let u = map.appending(path: f)
            if let d = datum(u), Date.now.timeIntervalSince(d) < 3600 { continue }
            try? fm.removeItem(at: u)
        }
        return true
    }
}
