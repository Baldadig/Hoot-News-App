import Foundation

// Wat de widgets van Hoot tonen: een klein bestand in de gedeelde App Group, geschreven door de app na elke
// nieuwe Editie en elk gelezen verhaal (WidgetSchrijver), en door de widget zelf als hij bij een nieuw
// dagdeel de nieuwe Editie ophaalt (WidgetOphalen). De widget rekent zelf niets uit wat de app niet ook zo
// zou tonen: de verhalen, hun volgorde en wat gelezen is komen uit de app (of van dezelfde server).
// Dit bestand hoort bij de app én de widgetextensie (ios/HootWidgetShared).

enum WidgetGroep {
    static let id = "group.nl.hootnews.Hoot"
    static let soort = "nl.hootnews.Hoot.editie" // de `kind` van de widget
    static let bestand = "widget-editie.json"
    static let vraagBestand = "widget-vraag.json" // de vraag van jouw Editie aan de server (zonder token)
    static let beelden = "widget-beelden"

    // De gedeelde map; in tests (zonder App Group) een tijdelijke map.
    static var map: URL {
        if let override = mapOverride { return override }
        if let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: id) { return url }
        let tmp = FileManager.default.temporaryDirectory.appending(path: "hoot-widget", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        return tmp
    }
    nonisolated(unsafe) static var mapOverride: URL? // alleen tests
}

struct WidgetVerhaal: Codable, Hashable, Identifiable, Sendable {
    var id: String // de plek in de Editie (verhaal of bericht)
    var itemId: String // het hoofdstuk: dat opent de widget, en dat telt als gelezen
    var oudeIds: [String] = [] // eerdere ids van hetzelfde stuk (formerIds)
    var nummer: Int // 1 tot 10
    var kop: String
    var kortKop: String
    var bron: String
    var beeld: String? = nil // bestandsnaam in WidgetGroep.beelden, verkleind tot widgetformaat

    func gelezen(in set: Set<String>) -> Bool { set.contains(itemId) || oudeIds.contains { set.contains($0) } }
}

struct WidgetEditie: Codable, Hashable, Sendable {
    // Hoe de widget bij een nieuw dagdeel zelf de nieuwe Editie kan halen: de Editie voor iedereen (GET),
    // jouw Editie zonder account (dezelfde POST als de app, uit WidgetGroep.vraagBestand), of niet (lid:
    // dan opent een tik Hoot, en Hoot haalt hem).
    enum Vraag: String, Codable, Sendable { case algemeen, eigen, lid }

    var id: String // "2026-11-11-middag"
    var datum: String // "2026-11-11"
    var dagdeel: String // ochtend | middag | avond
    var verhalen: [WidgetVerhaal] // genummerd, zonder Buiten je bubbel
    var gelezen: [String] // de laatst gelezen berichten (ids), voor de telling en voor een volgende Editie
    var vraag: Vraag
    var geschreven: Date

    var naam: String { WidgetDagdeel.naam(dagdeel) }
    var eindzin: String { WidgetDagdeel.eindzin(datum: datum, dagdeel: dagdeel) }
    var aantalGelezen: Int {
        let set = Set(gelezen)
        return verhalen.filter { $0.gelezen(in: set) }.count
    }
    // Het eerste ongelezen verhaal (daar opent "de Editie" vanuit de widget), of nil als alles gelezen is.
    var eersteOngelezen: WidgetVerhaal? {
        let set = Set(gelezen)
        return verhalen.first { !$0.gelezen(in: set) }
    }
}

// De stand van de widget op een moment.
enum WidgetStand: Hashable, Sendable {
    case ligtKlaar // nog niets gelezen
    case onderweg(gelezen: Int, van: Int)
    case klaar(eindzin: String) // alles gelezen: het rustige einde
    case oud(volgende: String) // er is een nieuw dagdeel, maar de widget heeft die Editie nog niet: "Tik voor de Avondeditie"

    static func van(_ editie: WidgetEditie, op moment: Date) -> WidgetStand {
        let nu = WidgetDagdeel.op(moment)
        if WidgetDagdeel.later(nu.id, dan: editie.id) { return .oud(volgende: WidgetDagdeel.naam(nu.dagdeel)) }
        let n = editie.verhalen.count, g = editie.aantalGelezen
        if n > 0, g >= n { return .klaar(eindzin: editie.eindzin) }
        return g == 0 ? .ligtKlaar : .onderweg(gelezen: g, van: n)
    }

    // De korte tekst rechtsboven (Middel · Top 3) en op het vergrendelscherm. Geen kloktijden.
    var label: String {
        switch self {
        case .ligtKlaar: "Ligt klaar"
        case let .onderweg(g, n): "\(g) van \(n)"
        case let .klaar(zin): zin
        case let .oud(volgende): "Tik voor de \(volgende)"
        }
    }
}

// De dagdelen: wanneer ze beginnen (Amsterdamse tijd, alleen om te rekenen: in teksten staan geen
// kloktijden), hoe de Editie heet en de eindzin. Gelijk aan shared/slot-times.mjs, shared/slots.json,
// EditionAlerts.slots en shared/eindzin.mjs (getoetst in WidgetTests).
enum WidgetDagdeel {
    static let volgorde = ["ochtend", "middag", "avond"]
    static let start = ["ochtend": 6 * 60 + 30, "middag": 12 * 60, "avond": 17 * 60] // minuten na middernacht
    static let marge = 3 // minuten na de start: zoals het seintje (EditionAlerts.delay)
    static let namen = ["ochtend": "Ochtendeditie", "middag": "Middageditie", "avond": "Avondeditie"]
    static func naam(_ dagdeel: String) -> String { namen[dagdeel] ?? "Editie" }

    // Is Editie `a` ("2026-11-12-ochtend") later dan `b`? Op datum, en binnen een dag ochtend, middag, avond
    // (niet op de letters: "ochtend" komt alfabetisch na "avond").
    static func later(_ a: String, dan b: String) -> Bool {
        func sleutel(_ id: String) -> (String, Int) {
            (String(id.prefix(10)), volgorde.firstIndex(of: String(id.dropFirst(11))) ?? -1)
        }
        let x = sleutel(a), y = sleutel(b)
        return x.0 != y.0 ? x.0 > y.0 : x.1 > y.1
    }

    static var amsterdam: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "Europe/Amsterdam")!
        return c
    }

    // Het dagdeel op een moment: vóór de Ochtendeditie hoort de nacht bij de Avondeditie van gisteren.
    static func op(_ moment: Date) -> (id: String, datum: String, dagdeel: String) {
        let cal = amsterdam
        let c = cal.dateComponents([.year, .month, .day, .hour, .minute], from: moment)
        let minuut = (c.hour ?? 0) * 60 + (c.minute ?? 0)
        var dag = moment
        let dagdeel: String
        if minuut < start["ochtend"]! {
            dagdeel = "avond"
            dag = cal.date(byAdding: .day, value: -1, to: moment) ?? moment
        } else if minuut < start["middag"]! {
            dagdeel = "ochtend"
        } else if minuut < start["avond"]! {
            dagdeel = "middag"
        } else {
            dagdeel = "avond"
        }
        let d = cal.dateComponents([.year, .month, .day], from: dag)
        let datum = String(format: "%04d-%02d-%02d", d.year ?? 0, d.month ?? 0, d.day ?? 0)
        return ("\(datum)-\(dagdeel)", datum, dagdeel)
    }

    // De momenten waarop een nieuw dagdeel begint (plus de marge), na `na`, voor de komende `uren`.
    static func momenten(na: Date, uren: Double = 24) -> [Date] {
        let cal = amsterdam
        let eind = na.addingTimeInterval(uren * 3600)
        var uit: [Date] = []
        let vandaag = cal.startOfDay(for: na)
        for d in 0...2 {
            guard let dag = cal.date(byAdding: .day, value: d, to: vandaag) else { continue }
            for s in volgorde {
                let m = start[s]! + marge
                guard let t = cal.date(bySettingHour: m / 60, minute: m % 60, second: 0, of: dag), t > na, t <= eind else { continue }
                uit.append(t)
            }
        }
        return uit.sorted()
    }

    // De volgende Editie, voor "Straks de Avondeditie" en "Morgen de Ochtendeditie" (geen kloktijden).
    static func volgendeZin(na dagdeel: String) -> String {
        switch dagdeel {
        case "ochtend": "Straks de \(naam("middag"))"
        case "middag": "Straks de \(naam("avond"))"
        default: "Morgen de \(naam("ochtend"))"
        }
    }

    // De eindzin van de Editie (shared/eindzin.mjs, EditionEnd in de app): per datum en dagdeel vast.
    static let eindzinnen = ["Je weet genoeg.", "Je bent bij."]
    static func eindzin(datum: String?, dagdeel: String?) -> String {
        var h: UInt32 = 0x811c9dc5
        for b in "\(datum ?? "")|\(dagdeel ?? "")".utf8 { h ^= UInt32(b); h = h &* 0x01000193 }
        h = (h ^ (h >> 16)) &* 0x85ebca6b
        h = (h ^ (h >> 13)) &* 0xc2b2ae35
        h = h ^ (h >> 16)
        return eindzinnen[Int(h % UInt32(eindzinnen.count))]
    }
}

// Deep links vanuit de widget. `hoot://editie` opent de Editie bij het eerste ongelezen verhaal,
// `hoot://verhaal/<id>` dat verhaal in de lezer (het telt dan als gelezen, net als in de Editie).
enum HootLink {
    static let schema = "hoot"
    static let editie = URL(string: "hoot://editie")!
    static func verhaal(_ itemId: String) -> URL {
        URL(string: "hoot://verhaal/\(itemId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? itemId)")!
    }

    enum Doel: Equatable { case editie, verhaal(String) }
    static func doel(_ url: URL) -> Doel? {
        guard url.scheme?.lowercased() == schema else { return nil }
        switch url.host()?.lowercased() {
        case "editie": return .editie
        case "verhaal":
            let id = url.pathComponents.filter { $0 != "/" }.first?.removingPercentEncoding ?? ""
            return id.isEmpty ? .editie : .verhaal(id)
        default: return nil
        }
    }
}

// Lezen en schrijven in de App Group.
enum WidgetBron {
    static var bestand: URL { WidgetGroep.map.appending(path: WidgetGroep.bestand) }
    static var vraagBestand: URL { WidgetGroep.map.appending(path: WidgetGroep.vraagBestand) }
    static var beeldMap: URL {
        let url = WidgetGroep.map.appending(path: WidgetGroep.beelden, directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }
    static func beeld(_ naam: String) -> URL { beeldMap.appending(path: naam) }

    static var encoder: JSONEncoder {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        e.outputFormatting = [.sortedKeys]
        return e
    }
    static var decoder: JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }

    static func laad() -> WidgetEditie? {
        guard let data = try? Data(contentsOf: bestand) else { return nil }
        return try? decoder.decode(WidgetEditie.self, from: data)
    }

    // Schrijft alleen als er iets veranderde (los van het moment van schrijven). Uitkomst: of het veranderde.
    @discardableResult
    static func bewaar(_ editie: WidgetEditie) -> Bool {
        if var oud = laad() {
            oud.geschreven = editie.geschreven
            if oud == editie { return false }
        }
        guard let data = try? encoder.encode(editie) else { return false }
        try? data.write(to: bestand, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        // Beelden die bij geen verhaal meer horen, weg.
        let houden = Set(editie.verhalen.compactMap(\.beeld))
        for url in (try? FileManager.default.contentsOfDirectory(at: beeldMap, includingPropertiesForKeys: nil)) ?? [] where !houden.contains(url.lastPathComponent) {
            try? FileManager.default.removeItem(at: url)
        }
        return true
    }
}

// De tijdlijn van de widget: nu, en een moment bij de start van elk volgend dagdeel (met de marge van het
// seintje). Op zo'n moment vraagt WidgetKit om een nieuwe tijdlijn; dan haalt de widget de nieuwe Editie
// (WidgetOphalen). Lukt dat niet, dan staan de momenten erna al klaar: de vorige Editie met "Tik voor de …".
enum WidgetTijdlijn {
    static func momenten(nu: Date) -> [Date] { [nu] + WidgetDagdeel.momenten(na: nu, uren: 24) }

    // Wanneer WidgetKit weer moet vragen: bij het eerstvolgende dagdeel.
    static func volgende(nu: Date) -> Date {
        WidgetDagdeel.momenten(na: nu, uren: 24).first ?? nu.addingTimeInterval(6 * 3600)
    }

    // Probeert de widget nu zelf de nieuwe Editie te halen? Niet vaker dan eens per vijf minuten, ook niet als
    // er meer Hoot-widgets staan die tegelijk vragen.
    static func magProberen(laatste: Date?, nu: Date) -> Bool {
        guard let laatste else { return true }
        return nu.timeIntervalSince(laatste) >= 5 * 60 || nu < laatste
    }
}

extension WidgetEditie {
    // In de widgetgalerij, zolang Hoot nog geen Editie op dit toestel heeft: geen echt nieuws, wel echt Hoot.
    static var voorbeeld: WidgetEditie {
        let koppen = [
            ("Drie keer per dag een Editie van tien verhalen, met een begin en een einde", "Hoot"),
            ("Ben je erdoorheen, dan ben je bij", "Hoot"),
            ("Hoe andere media hetzelfde verhaal brengen, naast elkaar", "Hoot"),
        ]
        let nu = WidgetDagdeel.op(.now)
        let stenen = koppen.enumerated().map { i, k in Bouwsteen(plek: "voorbeeld-\(i)", itemId: "voorbeeld-\(i)", kop: k.0, bron: k.1) }
        return bouw(id: nu.id, datum: nu.datum, dagdeel: nu.dagdeel, stenen: stenen, gelezen: [], vraag: .lid)
    }
}
