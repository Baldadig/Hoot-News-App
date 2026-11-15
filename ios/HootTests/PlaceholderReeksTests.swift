import XCTest
import CryptoKit
@testable import Hoot

// Placeholderbeelden van de server (build 61, "server side bouwen"): het manifest, de cache in de App Group en de
// terugval op de bundel. Leest landing/placeholders.json (het echte manifest) en tests/fixtures/placeholder-manifest.json
// (een andere reeks, die tests/placeholder-manifest.test.mjs op het web ook draait).
final class PlaceholderReeksTests: XCTestCase {
    static let repo = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    var map: URL!
    var defaults: UserDefaults!
    var suite: String!

    override func setUpWithError() throws {
        map = FileManager.default.temporaryDirectory.appending(path: "hoot-ph-\(UUID().uuidString)", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: map, withIntermediateDirectories: true)
        PlaceholderOpslag.mapOverride = map
        PlaceholderOpslag.vergeet()
        suite = "hoot-ph-\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)
    }

    override func tearDown() {
        PlaceholderOpslag.mapOverride = nil
        PlaceholderOpslag.vergeet()
        try? FileManager.default.removeItem(at: map)
        defaults.removePersistentDomain(forName: suite)
    }

    func lees(_ pad: String) throws -> Data {
        let url = Self.repo.appending(path: pad)
        guard FileManager.default.fileExists(atPath: url.path) else { throw XCTSkip("\(pad) ontbreekt") }
        return try Data(contentsOf: url)
    }
    func json(_ data: Data) throws -> [String: Any] { try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any]) }
    func versie(_ data: Data) -> String { String(SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined().prefix(12)) }
    func bundel(_ naam: String) throws -> Data {
        try Data(contentsOf: XCTUnwrap(Bundle.main.url(forResource: naam, withExtension: "webp") ?? Bundle.main.url(forResource: naam, withExtension: "webp", subdirectory: "Placeholder")))
    }
    func uitDeMap(_ url: URL?) -> Bool { url?.standardizedFileURL.path.hasPrefix(map.standardizedFileURL.path) == true }

    // Een nep-server: het manifest, en per ?v= de bytes van een beeld. Telt de verzoeken.
    final class Server: @unchecked Sendable {
        var manifest: Data
        var beelden: [String: Data] = [:]
        var verzoeken: [URL] = []
        var offline = false
        let slot = NSLock()
        init(_ manifest: Data) { self.manifest = manifest }
        var haal: PlaceholderOphalen.Haal {
            { url in
                try self.slot.withLock { () throws -> Data in
                    self.verzoeken.append(url)
                    if self.offline { throw URLError(.notConnectedToInternet) }
                    if url == PlaceholderOphalen.manifestURL { return self.manifest }
                    guard let v = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "v" })?.value,
                          let d = self.beelden[v] else { throw URLError(.fileDoesNotExist) }
                    return d
                }
            }
        }
    }

    // Het echte manifest met een ander beeld voor ph-1-licht (de bytes van ph-2-licht) en een nieuwe versie.
    func anderManifest() throws -> (Data, Data) {
        var m = try json(lees("landing/placeholders.json"))
        let nieuw = try bundel("ph-2-licht")
        var beelden = try XCTUnwrap(m["beelden"] as? [[String: Any]])
        var licht = try XCTUnwrap(beelden[0]["licht"] as? [String: Any])
        var groot = try XCTUnwrap(licht["groot"] as? [String: String])
        groot["2x"] = "https://gethoot.app/img/placeholder/beeld-1-licht-1600.webp?v=\(versie(nieuw))"
        licht["groot"] = groot
        beelden[0]["licht"] = licht
        m["beelden"] = beelden
        m["versie"] = "aaaaaaaaaaaa"
        return (try JSONSerialization.data(withJSONObject: m), nieuw)
    }

    // Met het echte manifest is de app precies zijn bundel: dezelfde reeks, niets op te halen.
    func testHetEchteManifestIsDeBundel() throws {
        let m = try XCTUnwrap(PlaceholderManifest.lees(lees("landing/placeholders.json")))
        XCTAssertNil(m.fout)
        XCTAssertEqual(m.versie, PlaceholderBeelden.versie)
        let (reeks, nodig) = m.doel(bundel: PlaceholderBeelden.versies)
        XCTAssertEqual(nodig, [])
        XCTAssertEqual(reeks, PlaceholderReeks.bundel)
        XCTAssertEqual(reeks.familie, PlaceholderBeelden.familie)
        XCTAssertEqual(reeks.uit, PlaceholderBeelden.uit)
        XCTAssertEqual(PlaceholderOpslag.actief, .bundel)
        // De versie van elk gebundeld bestand is het begin van zijn sha256 (zoals ?v= op de server).
        for (naam, v) in PlaceholderBeelden.versies { XCTAssertEqual(versie(try bundel(naam)), v, naam) }
    }

    // Een andere reeks (twintig plekken, De kop uit, twee nieuwe beelden): dezelfde keuze als het web.
    func testAndereReeksZoalsHetWeb() throws {
        let f = try json(lees("tests/fixtures/placeholder-manifest.json"))
        let m = try XCTUnwrap(PlaceholderManifest.lees(JSONSerialization.data(withJSONObject: f["manifest"]!)))
        XCTAssertNil(m.fout)
        let reeks = m.doel(bundel: PlaceholderBeelden.versies).reeks
        XCTAssertEqual(reeks.count, 20)
        XCTAssertEqual(reeks.uit.sorted().map { $0 + 1 }, try XCTUnwrap(f["uit"] as? [Int]))
        for b in try XCTUnwrap(f["base"] as? [[String: Any]]) {
            let id = try XCTUnwrap(b["id"] as? String)
            XCTAssertEqual(Placeholder.base(id, reeks: reeks) + 1, try XCTUnwrap(b["beeld"] as? Int), id)
        }
        for l in try XCTUnwrap(f["lijsten"] as? [[String: Any]]) {
            let rows = try XCTUnwrap(l["rows"] as? [[String: Any]]).map { (id: $0["id"] as! String, bare: $0["bare"] as! Bool) }
            XCTAssertEqual(Placeholder.plan(ids: rows, reeks: reeks).mapValues { $0 + 1 }, try XCTUnwrap(l["beelden"] as? [String: Int]), l["naam"] as? String ?? "")
        }
    }

    // Een fout manifest wordt geweigerd, met dezelfde reden als op het web (of het is al geen manifest).
    func testFoutManifestGeweigerd() throws {
        let f = try json(lees("tests/fixtures/placeholder-manifest.json"))
        let ongeldig = try XCTUnwrap(f["ongeldig"] as? [[String: Any]])
        XCTAssertGreaterThanOrEqual(ongeldig.count, 8)
        for o in ongeldig {
            let naam = o["naam"] as? String ?? ""
            let data = try JSONSerialization.data(withJSONObject: o["manifest"]!)
            if let m = PlaceholderManifest.lees(data) { XCTAssertEqual(m.fout, o["fout"] as? String, naam) }
        }
        XCTAssertNil(PlaceholderManifest.lees(Data("<html>".utf8)))
    }

    // Een nieuw beeld komt eerst volledig in de cache; de reeks wisselt pas bij activeer (een volgende weergave), en dan
    // komt alleen dat ene beeld uit de App Group. Eens per dag.
    func testNieuwBeeldPasNaVolledigBinnenEnBijVolgendeWeergave() async throws {
        let (manifest, nieuw) = try anderManifest()
        let server = Server(manifest)
        server.beelden[versie(nieuw)] = nieuw
        let nu = Date(timeIntervalSince1970: 1_800_000_000)
        let uitkomst = await PlaceholderOphalen.ververs(nu: nu, defaults: defaults, haal: server.haal)
        XCTAssertEqual(uitkomst, .klaargezet)
        XCTAssertEqual(server.verzoeken.count, 2) // het manifest en dat ene beeld
        XCTAssertTrue(server.verzoeken.allSatisfy { $0.host == "gethoot.app" })
        XCTAssertEqual(server.verzoeken.compactMap(\.query).filter { !$0.hasPrefix("v=") }, [])
        // Nog niet gewisseld: wie kijkt, ziet de bundel.
        XCTAssertEqual(PlaceholderOpslag.actief, .bundel)
        XCTAssertNotNil(PlaceholderBestand.url("ph-1-licht"))
        XCTAssertFalse(uitDeMap(PlaceholderBestand.url("ph-1-licht")))
        XCTAssertNotNil(PlaceholderOpslag.klaar())
        // Volgende weergave.
        XCTAssertTrue(PlaceholderOpslag.activeer())
        XCTAssertEqual(PlaceholderOpslag.actief.versie, "aaaaaaaaaaaa")
        let url = try XCTUnwrap(PlaceholderBestand.url("ph-1-licht"))
        XCTAssertTrue(uitDeMap(url))
        XCTAssertEqual(try Data(contentsOf: url), nieuw)
        XCTAssertNotNil(PlaceholderBestand.url("ph-1-donker"))
        XCTAssertFalse(uitDeMap(PlaceholderBestand.url("ph-1-donker")))
        XCTAssertEqual(PlaceholderBestand.beeld(0, thema: "licht", klein: false)?.width, 1600)
        XCTAssertFalse(PlaceholderOpslag.activeer()) // niets meer klaar
        // Dezelfde dag: geen verzoek. Een dag later: alleen het manifest, en er verandert niets.
        let a = await PlaceholderOphalen.ververs(nu: nu.addingTimeInterval(3600), defaults: defaults, haal: server.haal)
        XCTAssertEqual(a, .overgeslagen)
        XCTAssertEqual(server.verzoeken.count, 2)
        let b = await PlaceholderOphalen.ververs(nu: nu.addingTimeInterval(25 * 3600), defaults: defaults, haal: server.haal)
        XCTAssertEqual(b, .ongewijzigd)
        XCTAssertEqual(server.verzoeken.count, 3)
        // Na een herstart leest de app dezelfde reeks uit actief.json.
        PlaceholderOpslag.vergeet()
        XCTAssertEqual(PlaceholderOpslag.actief.versie, "aaaaaaaaaaaa")
    }

    // Offline, een kapot beeld of een fout manifest: er verandert niets en er staat niets half klaar.
    func testMisluktLaatAllesZoals() async throws {
        let (manifest, nieuw) = try anderManifest()
        let server = Server(manifest)
        server.offline = true
        let nu = Date(timeIntervalSince1970: 1_800_000_000)
        var u = await PlaceholderOphalen.ververs(nu: nu, defaults: defaults, haal: server.haal)
        XCTAssertEqual(u, .mislukt)
        XCTAssertNil(defaults.object(forKey: PlaceholderOphalen.sleutel)) // de volgende start probeert opnieuw
        // Het beeld klopt niet met zijn versie (half of ander bestand).
        server.offline = false
        server.beelden[versie(nieuw)] = nieuw.prefix(nieuw.count / 2)
        u = await PlaceholderOphalen.ververs(nu: nu, defaults: defaults, haal: server.haal)
        XCTAssertEqual(u, .mislukt)
        XCTAssertNil(PlaceholderOpslag.klaar())
        XCTAssertEqual(try FileManager.default.contentsOfDirectory(atPath: map.path).filter { $0.hasSuffix(".webp") }, [])
        XCTAssertFalse(PlaceholderOpslag.activeer())
        XCTAssertEqual(PlaceholderOpslag.actief, .bundel)
        // Een manifest dat niet deugt: genegeerd, en vandaag niet nog eens gevraagd.
        server.manifest = Data("{\"schema\":2}".utf8)
        u = await PlaceholderOphalen.ververs(nu: nu, defaults: defaults, haal: server.haal)
        XCTAssertEqual(u, .mislukt)
        XCTAssertNotNil(defaults.object(forKey: PlaceholderOphalen.sleutel))
        XCTAssertEqual(PlaceholderOpslag.actief, .bundel)
    }

    // Een nieuw beeldnummer (19) dat de bundel niet kent: alle zes bestanden komen binnen, daarna kiest de app het.
    func testNieuwBeeldnummerZonderAppUpdate() async throws {
        var m = try json(lees("landing/placeholders.json"))
        var beelden = try XCTUnwrap(m["beelden"] as? [[String: Any]])
        let server = Server(Data())
        var nieuw = beelden[0]
        nieuw["nummer"] = 19
        nieuw["set"] = "golf"
        for thema in ["licht", "donker", "nacht"] {
            var t = try XCTUnwrap(nieuw[thema] as? [String: Any])
            for (uitsnede, bron) in [("groot", "ph-4-\(thema)"), ("klein", "ph-4-\(thema)-klein")] {
                let d = try bundel(bron)
                server.beelden[versie(d)] = d
                var u = try XCTUnwrap(t[uitsnede] as? [String: String])
                u["2x"] = "https://gethoot.app/img/placeholder/beeld-19-\(thema)\(uitsnede == "klein" ? "-klein-360" : "-1600").webp?v=\(versie(d))"
                t[uitsnede] = u
            }
            nieuw[thema] = t
        }
        beelden.append(nieuw)
        m["beelden"] = beelden
        m["count"] = 19
        m["versie"] = "bbbbbbbbbbbb"
        server.manifest = try JSONSerialization.data(withJSONObject: m)
        let u = await PlaceholderOphalen.ververs(nu: .now, defaults: defaults, haal: server.haal)
        XCTAssertEqual(u, .klaargezet)
        XCTAssertEqual(server.verzoeken.count, 7)
        XCTAssertEqual(Placeholder.count, 18) // nog de bundel
        XCTAssertTrue(PlaceholderOpslag.activeer())
        XCTAssertEqual(Placeholder.count, 19)
        let id = try XCTUnwrap((0 ..< 2000).map { "stuk-\($0)" }.first { Placeholder.base($0) == 18 })
        XCTAssertEqual(WidgetBeeldloos.index(id), 18) // de widget kiest hetzelfde
        XCTAssertEqual(PlaceholderBestand.beeld(18, thema: "nacht", klein: true)?.width, 360)
        let rows = (0 ..< 400).map { (id: "lijst-\($0)", bare: true) }
        let plan = Placeholder.plan(ids: rows)
        XCTAssertTrue(plan.values.contains(18))
        for i in rows.indices.dropFirst() { XCTAssertNotEqual(Placeholder.set(plan[rows[i].id]!), Placeholder.set(plan[rows[i - 1].id]!)) }
    }

    // Een kapotte actief.json, of een bestand dat ontbreekt: de bundel.
    func testKapotteCacheValtTerugOpDeBundel() throws {
        let actief = map.appending(path: PlaceholderOpslag.actiefNaam)
        try Data("kapot".utf8).write(to: actief)
        PlaceholderOpslag.vergeet()
        XCTAssertEqual(PlaceholderOpslag.actief, .bundel)
        let zonder = PlaceholderReeks(versie: "cccccccccccc", familie: PlaceholderBeelden.familie, bestanden: ["ph-1-licht": "ph-1-licht-cccccccccccc.webp"])
        try JSONEncoder().encode(zonder).write(to: actief)
        PlaceholderOpslag.vergeet()
        XCTAssertEqual(PlaceholderOpslag.actief, .bundel)
        XCTAssertFalse(PlaceholderOpslag.zetKlaar(zonder) && PlaceholderOpslag.activeer()) // ook niet via klaar.json
        XCTAssertNil(PlaceholderOpslag.klaar())
        // Zonder map (toetsen zonder override): altijd de bundel.
        PlaceholderOpslag.mapOverride = nil
        PlaceholderOpslag.vergeet()
        XCTAssertEqual(PlaceholderOpslag.actief, .bundel)
        XCTAssertNil(PlaceholderOpslag.map)
    }
}
