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
    static func bouw(id: String, datum: String, dagdeel: String, stenen: [Bouwsteen], gelezen: [String], vraag: Vraag, nu: Date = .now) -> WidgetEditie {
        var verhalen: [WidgetVerhaal] = []
        for s in stenen where s.desk != "bubbel" && !s.kop.isEmpty {
            guard verhalen.count < maxVerhalen else { break }
            verhalen.append(WidgetVerhaal(id: s.plek, itemId: s.itemId, oudeIds: s.oudeIds, nummer: verhalen.count + 1,
                                          kop: s.kop, kortKop: s.kortKop?.isEmpty == false ? s.kortKop! : KortKop.kort(s.kop), bron: s.bron))
        }
        return WidgetEditie(id: id, datum: datum, dagdeel: dagdeel, verhalen: verhalen, gelezen: Array(gelezen.suffix(600)), vraag: vraag, geschreven: nu)
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
    }
    let id: String
    var slot: String?
    var date: String?
    var owner: String?
    var entries: [Plek]
    var items: [Stuk]?

    var stenen: [WidgetEditie.Bouwsteen] {
        let stukken = Dictionary((items ?? []).map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        return entries.compactMap { e in
            let lead = e.kind == "story" ? (e.leadId ?? e.id) : e.id
            guard let s = stukken[lead], let kop = s.title ?? e.title else { return nil }
            return .init(plek: e.id, desk: e.desk, itemId: s.id, oudeIds: s.formerIds ?? [], kop: kop, kortKop: e.kortKop,
                         bron: s.sourceName ?? s.source ?? "", beeldURL: s.image.flatMap { URL(string: $0.replacingOccurrences(of: "http://", with: "https://")) })
        }
    }

    func widget(vraag: WidgetEditie.Vraag, gelezen: [String], nu: Date = .now) -> WidgetEditie? {
        let datum = date ?? String(id.prefix(10))
        guard let dagdeel = slot ?? id.split(separator: "-").last.map(String.init), WidgetDagdeel.start[dagdeel] != nil else { return nil }
        return WidgetEditie.bouw(id: id, datum: datum, dagdeel: dagdeel, stenen: stenen, gelezen: gelezen, vraag: vraag, nu: nu)
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
        switch oud.vraag {
        case .lid:
            return nil
        case .algemeen:
            var c = URLComponents(url: basis.appending(path: "api/feed"), resolvingAgainstBaseURL: false)!
            c.queryItems = [URLQueryItem(name: "deel", value: "start")]
            struct Start: Decodable { var edition: ServerEditie? }
            if let (data, r) = try? await sessie.data(from: c.url!), (r as? HTTPURLResponse)?.statusCode == 200 {
                server = (try? JSONDecoder().decode(Start.self, from: data))?.edition
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
        guard let server, server.id == verwacht, var nieuw = server.widget(vraag: oud.vraag, gelezen: oud.gelezen, nu: nu), !nieuw.verhalen.isEmpty else { return nil }
        if let eerste = server.stenen.first(where: { $0.itemId == nieuw.verhalen[0].itemId }) {
            nieuw.verhalen[0].beeld = await WidgetBeelden.haal(eerste.beeldURL, itemId: eerste.itemId, sessie: sessie)
        }
        return nieuw
    }
}
