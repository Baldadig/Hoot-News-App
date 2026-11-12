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
    nonisolated(unsafe) static var queue: [Int] = []
    nonisolated(unsafe) static var requests: [URLRequest] = []
    nonisolated(unsafe) static var bodies: [[String: Any]] = []
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.requests.append(request)
        if !Self.queue.isEmpty { Self.status = Self.queue.removeFirst() } // een reeks antwoorden (1.3.1: opnieuw proberen)
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
        ServerEditionStub.queue = []
        HootStore.retryPause = .milliseconds(10)
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

    // De app claimt niets meer en stuurt het leesprofiel alleen samengevat: alleen de server schrijft in je account.
    func testAppNoLongerClaimsOrSendsRawAffinity() throws {
        let src = try String(contentsOf: Self.repo.appending(path: "ios/Hoot/HootStore.swift"), encoding: .utf8)
        XCTAssertFalse(src.contains(".claimEdition("), "loadPersonal claimt niet meer")
        XCTAssertFalse(src.contains("fallbackPersonal"), "de oude terugval is weg")
        let ask = try XCTUnwrap(src.range(of: "private func askServer")).upperBound
        let end = try XCTUnwrap(src.range(of: "static func acceptServer")).lowerBound
        let body = src[ask ..< end]
        XCTAssertFalse(body.contains("\"affinity\""), "geen ruw leesprofiel naar de server")
        XCTAssertTrue(body.contains("Self.readingSummary(of: affinity)"), "wel de samenvatting")
        XCTAssertTrue(src.contains("personalProvisional = Self.decodeEdition(raw)"), "het vangnet blijft in het geheugen")
        XCTAssertTrue(src.contains("previous: prior, reading: true)"), "het vangnet rekent met dezelfde samenvatting")
    }

    // 1.3.1: 20 s wachten in plaats van 8.
    func testServerWaitsTwentySeconds() async throws {
        XCTAssertEqual(HootAPI.editionTimeout, 20)
        _ = await HootAPI.serverEdition(Data(#"{"v":2}"#.utf8), token: nil)
        XCTAssertEqual(ServerEditionStub.requests.first?.timeoutInterval, 20)
    }

    // 1.3.1: bij een time-out, 429 of 503 één stille nieuwe poging; daarna wint de server als hij antwoordt.
    func testRetriesOnceOnBusyOrSlow() async throws {
        let payload = Data(#"{"v":2}"#.utf8)
        for first in [503, 429] {
            ServerEditionStub.requests = []
            ServerEditionStub.queue = [first, 200]
            let r = await HootStore.requestServer(payload, token: nil, renew: { nil })
            XCTAssertEqual(ServerEditionStub.requests.count, 2, "één nieuwe poging bij \(first)")
            XCTAssertEqual(r.status, 200, "het antwoord van de tweede poging telt")
            XCTAssertEqual(ServerEditionStub.requests.last?.timeoutInterval, HootStore.retryTimeout)
        }
        // Blijft het mislukken: precies twee pogingen, dan het vangnet (status blijft de fout).
        ServerEditionStub.requests = []
        ServerEditionStub.queue = [503, 503, 503]
        let bad = await HootStore.requestServer(payload, token: nil, renew: { nil })
        XCTAssertEqual(ServerEditionStub.requests.count, 2)
        XCTAssertEqual(bad.status, 503)
        // Een gewoon antwoord of een andere fout: niet opnieuw.
        ServerEditionStub.requests = []
        ServerEditionStub.queue = [200]
        _ = await HootStore.requestServer(payload, token: nil, renew: { nil })
        XCTAssertEqual(ServerEditionStub.requests.count, 1)
        ServerEditionStub.requests = []
        ServerEditionStub.queue = [400]
        _ = await HootStore.requestServer(payload, token: nil, renew: { nil })
        XCTAssertEqual(ServerEditionStub.requests.count, 1)
        XCTAssertTrue(HootStore.retriesServer(0))
        XCTAssertFalse(HootStore.retriesServer(401))
    }

    // 1.3.1: het vangnet neemt de Edities van het toestel mee als previous (de server-Editie én het bewaarde
    // vangnet van een eerder dagdeel) en bewaart zichzelf voor het volgende dagdeel; de server wint.
    func testFallbackKeepsEarlierEditionsOfTheDevice() async throws {
        let g = try Self.golden()
        var server = try XCTUnwrap((g["response"] as? [String: Any])?["edition"] as? [String: Any])
        let owner = try XCTUnwrap(server["owner"] as? String)
        server["id"] = "2026-11-12-ochtend"; server["builtAt"] = "2026-11-12T04:00:00Z"; server["history"] = []
        var kept = server
        kept["id"] = "2026-11-12-middag"; kept["builtAt"] = "2026-11-12T10:00:00Z"; kept["provisional"] = true
        let data = { (o: Any?) -> String in o.flatMap { try? JSONSerialization.data(withJSONObject: $0) }.map { String(decoding: $0, as: UTF8.self) } ?? "null" }
        let out = try await EditionEngine.shared.earlier(local: data(server), account: data(kept), id: "2026-11-12-avond", owner: owner)
        let ids = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(out.utf8)) as? [[String: Any]]).compactMap { $0["id"] as? String }
        XCTAssertEqual(ids, ["2026-11-12-middag", "2026-11-12-ochtend"], "nieuwste eerst, allebei erin")
        let src = try String(contentsOf: Self.repo.appending(path: "ios/Hoot/HootStore.swift"), encoding: .utf8)
        XCTAssertTrue(src.contains("Self.writeRaw(raw, to: Self.provisionalFile)"), "het vangnet wordt bewaard")
        XCTAssertTrue(src.contains("account: Self.json(provisionalKept(owner: owner))"), "en meegenomen als previous")
        let store = HootStore(defaults: UserDefaults(suiteName: "EditionServerTests")!)
        store.keepServer(server, task: "x|\(owner)|y")
        XCTAssertNil(store.personalProvisional, "de server wint")
        XCTAssertNil(store.provisionalKept(owner: "iemand-anders"), "een vangnet van een andere lezer telt niet")
    }

    // Leesprofiel meesturen (besluit Alex, 11 november 2026): voor elk profiel stuurt de app precies de samenvatting
    // die het web stuurt (<repo>/tests/fixtures/leesprofiel-golden.json, scripts/make-reading-golden.mjs; op het web
    // tests/leesprofiel.test.mjs). Via het Affinity-model van de app en de rekenkern, zoals askServer het doet.
    func testReadingSummaryEqualsWeb() async throws {
        let data = try Data(contentsOf: Self.repo.appending(path: "tests/fixtures/leesprofiel-golden.json"))
        let g = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let cases = try XCTUnwrap(g["cases"] as? [[String: Any]])
        XCTAssertEqual(cases.count, 17)
        var with = 0
        for c in cases {
            let name = c["name"] as? String ?? "?"
            let want = c["summary"] as? [String: Any]
            guard let raw = c["affinity"] as? [String: Any] else {
                XCTAssertNil(want, name)
                continue
            }
            let profile = try JSONDecoder().decode(Affinity.self, from: JSONSerialization.data(withJSONObject: raw))
            let got = await HootStore.readingSummary(of: profile)
            if let want {
                with += 1
                XCTAssertEqual(NSDictionary(dictionary: try XCTUnwrap(got, name)), NSDictionary(dictionary: want), name)
            } else {
                XCTAssertNil(got, name)
            }
        }
        XCTAssertEqual(with, 15)

        // De hele vraag: dezelfde samenvatting op dezelfde plek, en nooit het ruwe profiel.
        let request = try XCTUnwrap(g["request"] as? [String: Any])
        let profile = try XCTUnwrap(request["profile"] as? [String: Any])
        let webBody = try XCTUnwrap(request["body"] as? [String: Any])
        let affinity = try JSONDecoder().decode(Affinity.self, from: JSONSerialization.data(withJSONObject: try XCTUnwrap(request["affinity"])))
        let taste = try JSONDecoder().decode(Taste.self, from: JSONSerialization.data(withJSONObject: profile["taste"] ?? [:]))
        let body = HootStore.serverBody(followed: profile["followed"] as? [String] ?? [], interests: profile["interests"] as? [String] ?? [],
                                        topics: profile["topics"] as? [String] ?? [], favorites: profile["favorites"] as? [String] ?? [],
                                        taste: taste, readIds: [], reading: await HootStore.readingSummary(of: affinity))
        XCTAssertEqual(NSDictionary(dictionary: try XCTUnwrap(body["reading"] as? [String: Any])), NSDictionary(dictionary: try XCTUnwrap(webBody["reading"] as? [String: Any])))
        XCTAssertNil(body["affinity"])
        XCTAssertEqual(body["v"] as? Int, 2)
        XCTAssertEqual(body["followed"] as? [String], webBody["followed"] as? [String])
        // Zonder leesprofiel (nog te weinig gelezen): geen `reading`, zoals het web.
        let none = await HootStore.readingSummary(of: Affinity())
        XCTAssertNil(none)
        XCTAssertNil(HootStore.serverBody(followed: [], interests: [], topics: [], favorites: [], taste: Taste(), readIds: [], reading: none)["reading"])
    }
}
