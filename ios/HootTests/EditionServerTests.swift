import XCTest
@testable import Hoot

// De Redacteur op de server (besluit Alex, 9 november 2026; Hoot-design/redacteur-server/PLAN.md): web en
// iPhone tonen voor hetzelfde account en dagdeel exact dezelfde Editie. Eén opgenomen antwoord van POST
// /api/edition v2 (<repo>/tests/fixtures/edition-server-golden.json, scripts/make-server-golden.mjs): het web
// bewaart het letterlijk (tests/edition-server-golden.test.mjs), en de app hier ook, in edition.json.
// Zonder netwerk: een URLProtocol in het geheugen geeft het antwoord.
final class ServerEditionStub: URLProtocol {
    nonisolated(unsafe) static var response = Data()
    nonisolated(unsafe) static var status = 200
    nonisolated(unsafe) static var requests: [URLRequest] = []
    nonisolated(unsafe) static var bodies: [[String: Any]] = []
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.requests.append(request)
        var data = request.httpBody
        if data == nil, let stream = request.httpBodyStream {
            stream.open()
            var buf = [UInt8](repeating: 0, count: 1 << 16), out = Data()
            while stream.hasBytesAvailable { let n = stream.read(&buf, maxLength: buf.count); if n <= 0 { break }; out.append(buf, count: n) }
            stream.close()
            data = out
        }
        Self.bodies.append(data.flatMap { (try? JSONSerialization.jsonObject(with: $0)) as? [String: Any] } ?? [:])
        let res = HTTPURLResponse(url: request.url!, statusCode: Self.status, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
        client?.urlProtocol(self, didReceive: res, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Self.status == 200 ? Self.response : Data("{}".utf8))
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

@MainActor
final class EditionServerTests: XCTestCase {
    static let repo = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    static func golden() throws -> [String: Any] {
        let data = try Data(contentsOf: repo.appending(path: "tests/fixtures/edition-server-golden.json"))
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }
    private var saved: Data?
    private var editionFile: URL {
        try! FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appending(path: "Hoot/edition.json")
    }

    override func setUp() async throws {
        let g = try Self.golden()
        ServerEditionStub.response = try JSONSerialization.data(withJSONObject: try XCTUnwrap(g["response"]))
        ServerEditionStub.status = 200
        ServerEditionStub.requests = []
        ServerEditionStub.bodies = []
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [ServerEditionStub.self]
        HootAPI.editionTransport = URLSession(configuration: config)
        saved = try? Data(contentsOf: editionFile)
    }

    override func tearDown() async throws {
        HootAPI.editionTransport = HootAPI.session
        if let saved { try? saved.write(to: editionFile, options: .atomic) } // wat de simulator al had, terug
    }

    // Zelfde account en dagdeel: één antwoord van de server, en de app bewaart het byte voor byte zoals het web.
    func testAppStoresServerEditionLiterally() async throws {
        let g = try Self.golden()
        let global = try XCTUnwrap(g["global"] as? [String: Any])
        let uid = try XCTUnwrap(g["uid"] as? String)
        let id = try XCTUnwrap(global["id"] as? String)
        let expected = try XCTUnwrap((g["response"] as? [String: Any])?["edition"] as? [String: Any])

        let r = await HootAPI.serverEdition(try JSONSerialization.data(withJSONObject: try XCTUnwrap(g["request"])), token: "test")
        XCTAssertEqual(r.status, 200)
        XCTAssertEqual(ServerEditionStub.requests.first?.value(forHTTPHeaderField: "Authorization"), "Bearer test")
        XCTAssertEqual(ServerEditionStub.requests.first?.url?.path, "/api/edition")
        let raw = try XCTUnwrap(HootStore.acceptServer(r.data, status: r.status, id: id, owner: uid))

        let store = HootStore(defaults: UserDefaults(suiteName: "EditionServerTests")!)
        store.keepServer(raw, task: "\(id)|\(uid)|\(expected["basis"] as? String ?? "")")
        let written = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: editionFile)) as? [String: Any])
        XCTAssertEqual(NSDictionary(dictionary: written), NSDictionary(dictionary: expected), "edition.json = het antwoord van de server")
        let canon = { (o: Any) in String(decoding: try! JSONSerialization.data(withJSONObject: o, options: [.sortedKeys]), as: UTF8.self) }
        XCTAssertEqual(canon(written), canon(expected))
        // En de schermen lezen dezelfde Editie: zelfde plekken, volgorde en koppen.
        let shown = try XCTUnwrap(store.personal)
        let entries = try XCTUnwrap(expected["entries"] as? [[String: Any]])
        XCTAssertEqual(shown.id, id)
        XCTAssertEqual(shown.owner, uid)
        XCTAssertEqual(shown.server, true)
        XCTAssertEqual(shown.entries.map(\.id), entries.map { $0["id"] as? String ?? "" })
        XCTAssertNil(store.personalProvisional)
    }

    // Alleen een antwoord van dit dagdeel en deze lezer telt; een fout of 429 is het vangnet.
    func testAcceptOnlyThisSlotAndReader() throws {
        let g = try Self.golden()
        let data = try JSONSerialization.data(withJSONObject: try XCTUnwrap(g["response"]))
        let uid = g["uid"] as? String ?? ""
        let id = (g["global"] as? [String: Any])?["id"] as? String ?? ""
        XCTAssertNotNil(HootStore.acceptServer(data, status: 200, id: id, owner: uid))
        XCTAssertNil(HootStore.acceptServer(data, status: 200, id: "2026-10-31-ochtend", owner: uid), "ander dagdeel")
        XCTAssertNil(HootStore.acceptServer(data, status: 200, id: id, owner: "anon"), "andere lezer")
        XCTAssertNil(HootStore.acceptServer(data, status: 429, id: id, owner: uid))
        XCTAssertNil(HootStore.acceptServer(nil, status: 0, id: id, owner: uid))
    }

    // Geen verbinding of een fout: status 0 of de code, nooit een Editie; zonder token geen Authorization.
    func testOfflineAndErrors() async throws {
        ServerEditionStub.status = 503
        let r = await HootAPI.serverEdition(Data(#"{"v":2}"#.utf8), token: nil)
        XCTAssertEqual(r.status, 503)
        XCTAssertNil(ServerEditionStub.requests.first?.value(forHTTPHeaderField: "Authorization"))
        XCTAssertEqual(ServerEditionStub.bodies.first?["v"] as? Int, 2)
    }

    // De app claimt niets meer en stuurt geen leesprofiel: alleen de server schrijft in je account.
    func testAppNoLongerClaimsOrSendsAffinity() throws {
        let src = try String(contentsOf: Self.repo.appending(path: "ios/Hoot/HootStore.swift"), encoding: .utf8)
        XCTAssertFalse(src.contains(".claimEdition("), "loadPersonal claimt niet meer")
        XCTAssertFalse(src.contains("fallbackPersonal"), "de oude terugval is weg")
        let ask = try XCTUnwrap(src.range(of: "private func askServer")).upperBound
        let end = try XCTUnwrap(src.range(of: "static func acceptServer")).lowerBound
        XCTAssertFalse(src[ask ..< end].contains("affinity"), "geen leesprofiel naar de server")
        XCTAssertTrue(src.contains("personalProvisional = Self.decodeEdition(raw)"), "het vangnet blijft in het geheugen")
    }
}
