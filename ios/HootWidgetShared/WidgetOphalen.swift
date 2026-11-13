import Foundation
import ImageIO
import UIKit
import UniformTypeIdentifiers

// Van een Editie (uit de app, of van de server) naar wat de widget toont, en het ophalen door de widget zelf
// bij een nieuw dagdeel. Geen nieuwe gegevens naar buiten: dezelfde vraag als de app, naar dezelfde server.

extension WidgetEditie {
    // Eén plek in de Editie, zoals de app of de server hem kent.
    struct Bouwsteen: Sendable {
        var plek: String
        var desk: String?
        var itemId: String
        var oudeIds: [String] = []
        var kop: String
        var kortKop: String?
        var bron: String
        var beeldURL: URL?
    }

    static let maxVerhalen = 10

    // De genummerde verhalen (zonder Buiten je bubbel), in de volgorde van de Editie. `gelezen`: de laatst
    // gelezen berichten van deze lezer (hooguit 600 bewaard).
    static func bouw(id: String, datum: String, dagdeel: String, stenen: [Bouwsteen], gelezen: [String], vraag: Vraag, eigenBronnen: [String]? = nil, nu: Date = .now) -> WidgetEditie {
        var verhalen: [WidgetVerhaal] = []
        for s in stenen where s.desk != "bubbel" && !s.kop.isEmpty {
            guard verhalen.count < maxVerhalen else { break }
            verhalen.append(WidgetVerhaal(id: s.plek, itemId: s.itemId, oudeIds: s.oudeIds, nummer: verhalen.count + 1,
                                          kop: s.kop, kortKop: KortKop.voorWidget(s.kop, kort: s.kortKop), bron: s.bron))
        }
        return WidgetEditie(id: id, datum: datum, dagdeel: dagdeel, verhalen: verhalen, gelezen: Array(gelezen.suffix(600)), vraag: vraag, geschreven: nu, eigenBronnen: eigenBronnen)
    }
}

// De Editie zoals de server hem geeft (GET /api/feed?deel=start → edition, of POST /api/edition → edition):
// alleen wat de widget nodig heeft.
struct ServerEditie: Decodable, Sendable {
    struct Plek: Decodable, Sendable {
        let kind: String
        let id: String
        var leadId: String?
        var desk: String?
        var kortKop: String?
        var title: String?
    }
    struct Stuk: Decodable, Sendable {
        let id: String
        var source: String?
        var sourceName: String?
        var title: String?
        var image: String?
        var formerIds: [String]?
        var lang: String? // alleen als het stuk een andere taal heeft dan zijn bron
    }
    // Een bron uit /api/feed?deel=start (sources): alleen de taal.
    struct Bron: Decodable, Sendable {
        let id: String
        var lang: String?
    }
    let id: String
    var slot: String?
    var date: String?
    var owner: String?
    var entries: [Plek]
    var items: [Stuk]?

    var stenen: [WidgetEditie.Bouwsteen] { stenen(leesbaar: { _ in true }) }

    // De taalregel voor de widget die de Editie voor iedereen haalt terwijl jij een eigen Editie hebt: een kop in
    // een andere taal dan het Nederlands alleen van een bron die je volgt. Strenger dan de regel per rubriek in de
    // app (languageRule in src/lib/personal.js), nooit ruimer: wie geen Engelse bron koos, ziet in de widget nooit
    // een Engelse kop. Net als daar: een stuk zonder bekende taal blijft staan.
    static func leesbaar(_ stuk: Stuk, bronTaal: [String: String], volgt: Set<String>) -> Bool {
        if let bron = stuk.source, volgt.contains(bron) { return true }
        let vanBron = stuk.source.flatMap { bronTaal[$0] }
        let ok = { (taal: String?) in taal == nil || taal == "nl" }
        return ok(stuk.lang ?? vanBron) && ok(vanBron)
    }

    func stenen(leesbaar: (Stuk) -> Bool) -> [WidgetEditie.Bouwsteen] {
        let stukken = Dictionary((items ?? []).map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        return entries.compactMap { e in
            let lead = e.kind == "story" ? (e.leadId ?? e.id) : e.id
            guard let s = stukken[lead], leesbaar(s), let kop = s.title ?? e.title else { return nil }
            return .init(plek: e.id, desk: e.desk, itemId: s.id, oudeIds: s.formerIds ?? [], kop: kop, kortKop: e.kortKop,
                         bron: s.sourceName ?? s.source ?? "", beeldURL: ImageURL.url(s.image, .large)) // zoals de app: het grote beeld
        }
    }

    // `eigenBronnen` (zie WidgetEditie.eigenBronnen): dan alleen leesbare koppen, met de talen van de bronnen.
    // Zonder die talen weet de widget het niet zeker: dan geen Editie, en blijft de vorige staan.
    func widget(vraag: WidgetEditie.Vraag, gelezen: [String], eigenBronnen: [String]? = nil, bronnen: [Bron]? = nil, nu: Date = .now) -> WidgetEditie? {
        let datum = date ?? String(id.prefix(10))
        guard let dagdeel = slot ?? id.split(separator: "-").last.map(String.init), WidgetDagdeel.start[dagdeel] != nil else { return nil }
        var lijst = stenen
        if let eigenBronnen {
            let bronTaal = Dictionary((bronnen ?? []).compactMap { b in b.lang.map { (b.id, $0) } }, uniquingKeysWith: { a, _ in a })
            guard !bronTaal.isEmpty else { return nil }
            let volgt = Set(eigenBronnen)
            lijst = stenen(leesbaar: { Self.leesbaar($0, bronTaal: bronTaal, volgt: volgt) })
        }
        return WidgetEditie.bouw(id: id, datum: datum, dagdeel: dagdeel, stenen: lijst, gelezen: gelezen, vraag: vraag, eigenBronnen: eigenBronnen, nu: nu)
    }
}

// Het beeld van 01, verkleind tot widgetformaat (hooguit 900 pixels breed) en als JPEG in de App Group.
enum WidgetBeelden {
    static let maxPixels: CGFloat = 900

    static func naam(_ itemId: String) -> String {
        let veilig = itemId.unicodeScalars.map { CharacterSet.alphanumerics.contains($0) ? String($0) : "_" }.joined()
        return "\(veilig.prefix(64)).jpg"
    }

    static func verklein(_ data: Data, max: CGFloat = maxPixels) -> Data? {
        guard let bron = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
        let opties: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: max,
        ]
        guard let cg = CGImageSourceCreateThumbnailAtIndex(bron, 0, opties as CFDictionary) else { return nil }
        return UIImage(cgImage: cg).jpegData(compressionQuality: 0.8)
    }

    // Haalt het beeld (als het er nog niet staat) en geeft de bestandsnaam, of nil.
    static func haal(_ url: URL?, itemId: String, sessie: URLSession = .shared) async -> String? {
        let naam = naam(itemId)
        let doel = WidgetBron.beeld(naam)
        if FileManager.default.fileExists(atPath: doel.path) { return naam }
        guard let url, ["http", "https"].contains(url.scheme ?? "") else { return nil }
        var request = URLRequest(url: url)
        request.timeoutInterval = 8
        guard let (data, response) = try? await sessie.data(for: request),
              (response as? HTTPURLResponse).map({ (200..<300).contains($0.statusCode) }) ?? true,
              let klein = verklein(data) else { return nil }
        do { try klein.write(to: doel, options: .atomic) } catch { return nil }
        return naam
    }
}

// De widget haalt bij een nieuw dagdeel zelf de nieuwe Editie, met de vraag die de app de vorige keer stelde.
// Lid (met account): niet, want dan is je token nodig; een tik opent Hoot, en Hoot haalt hem.
enum WidgetOphalen {
    static let basis = URL(string: "https://gethoot.app")!

    static func moetOphalen(_ editie: WidgetEditie?, nu: Date) -> Bool {
        guard let editie else { return false }
        return editie.vraag != .lid && WidgetDagdeel.later(WidgetDagdeel.op(nu).id, dan: editie.id)
    }

    static var sessie: URLSession {
        let c = URLSessionConfiguration.ephemeral // niets bewaren in de extensie
        c.timeoutIntervalForRequest = 10
        c.timeoutIntervalForResource = 15
        let versie = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "onbekend"
        c.httpAdditionalHeaders = ["Accept": "application/json", "User-Agent": "Hoot-iOS/\(versie) (+https://gethoot.app)"]
        return URLSession(configuration: c)
    }

    // De nieuwe Editie, of nil (geen netwerk, nog niet klaar, of niet van dit dagdeel).
    static func haal(na oud: WidgetEditie, nu: Date = .now, sessie: URLSession = sessie) async -> WidgetEditie? {
        let verwacht = WidgetDagdeel.op(nu).id
        var server: ServerEditie?
        var bronnen: [ServerEditie.Bron]?
        switch oud.vraag {
        case .lid:
            return nil
        case .algemeen:
            var c = URLComponents(url: basis.appending(path: "api/feed"), resolvingAgainstBaseURL: false)!
            c.queryItems = [URLQueryItem(name: "deel", value: "start")]
            struct Start: Decodable { var edition: ServerEditie?; var sources: [ServerEditie.Bron]? }
            if let (data, r) = try? await sessie.data(from: c.url!), (r as? HTTPURLResponse)?.statusCode == 200 {
                let start = try? JSONDecoder().decode(Start.self, from: data)
                server = start?.edition
                bronnen = start?.sources
            }
        case .eigen:
            guard let vraag = try? Data(contentsOf: WidgetBron.vraagBestand) else { return nil }
            var request = URLRequest(url: basis.appending(path: "api/edition"))
            request.httpMethod = "POST"
            request.cachePolicy = .reloadIgnoringLocalCacheData
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = vraag
            struct Antwoord: Decodable { var edition: ServerEditie? }
            if let (data, r) = try? await sessie.data(for: request), (r as? HTTPURLResponse)?.statusCode == 200 {
                let e = (try? JSONDecoder().decode(Antwoord.self, from: data))?.edition
                server = e?.owner == "anon" ? e : nil
            }
        }
        guard let server, server.id == verwacht,
              var nieuw = server.widget(vraag: oud.vraag, gelezen: oud.gelezen, eigenBronnen: oud.eigenBronnen, bronnen: bronnen, nu: nu),
              !nieuw.verhalen.isEmpty else { return nil }
        if let eerste = server.stenen.first(where: { $0.itemId == nieuw.verhalen[0].itemId }) {
            nieuw.verhalen[0].beeld = await WidgetBeelden.haal(eerste.beeldURL, itemId: eerste.itemId, sessie: sessie)
        }
        return nieuw
    }
}

// Wat de widget toont als WidgetKit om een tijdlijn vraagt: de Editie uit de App Group, en bij een nieuw dagdeel
// eerst zelf proberen de nieuwe te halen. Lukt dat niet (geen netwerk, nog niet klaar), dan blijft de vorige
// Editie staan en wacht de widget (`wacht`: gauw opnieuw vragen, WidgetTijdlijn.volgende). `bewaard`: er staat
// een nieuwe Editie in de App Group. In de extensie (HootTijdlijn) en in de toetsen dezelfde route.
enum WidgetVernieuwen {
    static let laatstePoging = "widget.laatstePoging"

    // `suite`: de UserDefaults waarin de laatste poging staat (de App Group; in toetsen een eigen suite).
    static func editie(nu: Date, suite: String = WidgetGroep.id, sessie: URLSession = WidgetOphalen.sessie) async -> (editie: WidgetEditie?, wacht: Bool, bewaard: Bool) {
        let defaults = UserDefaults(suiteName: suite)
        let oud = WidgetBron.laad()
        guard WidgetOphalen.moetOphalen(oud, nu: nu), let oud else { return (oud, false, false) }
        guard WidgetTijdlijn.magProberen(laatste: defaults?.object(forKey: laatstePoging) as? Date, nu: nu) else { return (oud, true, false) }
        defaults?.set(nu, forKey: laatstePoging)
        guard let nieuw = await WidgetOphalen.haal(na: oud, nu: nu, sessie: sessie) else { return (oud, true, false) }
        return (nieuw, false, WidgetBron.bewaar(nieuw))
    }
}
