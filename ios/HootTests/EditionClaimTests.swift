import XCTest
@testable import Hoot

// De eerste schrijver wint (bouwspec-aanvulling P8-3, G6): twee toestellen met hetzelfde account leggen
// jouw Editie van hetzelfde dagdeel vast in user_state.edition. Alleen de eerste PATCH mag landen; het
// tweede toestel krijgt nul rijen terug, leest de rij en neemt die Editie over. Hier tegen een nep-
// PostgREST (FakePostgREST, een URLProtocol in het geheugen) die precies de filter van Supabase nadoet:
// `or=(edition.is.null,edition->>id.neq.<id>)` met `Prefer: return=representation`.
@MainActor
final class EditionClaimTests: XCTestCase {
    static let uid = "00000000-0000-4000-8000-000000000001"

    override func setUp() {
        super.setUp()
        FakePostgREST.reset()
    }

    private func device() -> Account {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [FakePostgREST.self]
        let a = Account()
        a.stub(uid: Self.uid, transport: URLSession(configuration: config))
        return a
    }

    private func edition(_ id: String, mark: String) -> [String: Any] {
        ["id": id, "slot": "middag", "personal": true, "owner": Self.uid, "basis": "b1", "version": "v", "entries": [["kind": "story", "id": "s-\(mark)", "why": ["code": "interest", "text": "Omdat je AI volgt"]]], "history": [["id": id, "builtAt": "2026-10-31T11:00:00.000Z", "storyIds": ["s-\(mark)"], "itemIds": ["i-\(mark)"], "leadIds": ["i-\(mark)"], "titles": ["Kop \(mark)"], "keys": ["s-\(mark)": ["ai"]]]], "mark": mark]
    }

    // G6/P8-3: toestel A schrijft, toestel B met hetzelfde dagdeel landt niet en krijgt A's Editie.
    func testFirstWriterWinsSecondAdopts() async throws {
        let a = device(), b = device()
        let mine = edition("2026-10-31-middag", mark: "A")
        let first = try await a.claimEdition(mine, id: "2026-10-31-middag")
        XCTAssertTrue(first.won)
        XCTAssertEqual(first.edition?["mark"] as? String, "A")

        let second = try await b.claimEdition(edition("2026-10-31-middag", mark: "B"), id: "2026-10-31-middag")
        XCTAssertFalse(second.won, "het tweede toestel mag niet overschrijven")
        XCTAssertEqual(second.edition?["mark"] as? String, "A", "het tweede toestel neemt de Editie van het eerste over")
        XCTAssertEqual(FakePostgREST.row["mark"] as? String, "A")
        XCTAssertEqual(FakePostgREST.patches, 2, "beide toestellen deden precies één PATCH")
        // Wat terugkomt is byte voor byte wat A schreef (dezelfde `history`, dus hetzelfde `previous` straks).
        XCTAssertEqual(NSDictionary(dictionary: second.edition ?? [:]), NSDictionary(dictionary: mine))
        XCTAssertEqual(NSDictionary(dictionary: b.remoteEdition ?? [:]), NSDictionary(dictionary: mine))
    }

    // Een nieuw dagdeel mag wél over een oud heen: `edition->>id.neq.<id>`.
    func testNextSlotReplacesOld() async throws {
        let a = device(), b = device()
        _ = try await a.claimEdition(edition("2026-10-31-middag", mark: "A"), id: "2026-10-31-middag")
        let avond = try await b.claimEdition(edition("2026-10-31-avond", mark: "B"), id: "2026-10-31-avond")
        XCTAssertTrue(avond.won)
        XCTAssertEqual(FakePostgREST.row["id"] as? String, "2026-10-31-avond")
        // En daarna is A weer de tweede.
        let late = try await a.claimEdition(edition("2026-10-31-avond", mark: "A2"), id: "2026-10-31-avond")
        XCTAssertFalse(late.won)
        XCTAssertEqual(late.edition?["mark"] as? String, "B")
    }

    // De filter is precies die van de aanvulling; `edition->>id=neq.<id>` alleen is onvoldoende (null ->> id is null).
    func testFilterShape() async throws {
        let a = device()
        _ = try await a.claimEdition(edition("2026-10-31-middag", mark: "A"), id: "2026-10-31-middag")
        let patch = FakePostgREST.requests.first { $0.method == "PATCH" }
        XCTAssertNotNil(patch)
        XCTAssertEqual(patch?.query, "user_id=eq.\(Self.uid)&or=(edition.is.null,edition->>id.neq.2026-10-31-middag)")
        XCTAssertEqual(patch?.prefer, "return=representation")
    }

    // Lezen zonder rij of zonder kolom: niets, geen fout (een ouder account).
    func testFetchWithoutEdition() async throws {
        let a = device()
        let none = try await a.fetchEdition()
        XCTAssertNil(none)
        XCTAssertNil(a.remoteEdition)
    }

    // P8-1: de toets op een vastgelegde Editie (id, eigenaar én afdruk), zoals `fits` op het web.
    func testFitsNeedsIdOwnerAndBasis() throws {
        let e = try JSONDecoder().decode(Edition.self, from: JSONSerialization.data(withJSONObject: edition("2026-10-31-middag", mark: "A")))
        XCTAssertTrue(HootStore.fits(e, id: "2026-10-31-middag", owner: Self.uid, basis: "b1"))
        XCTAssertFalse(HootStore.fits(e, id: "2026-10-31-avond", owner: Self.uid, basis: "b1"))
        XCTAssertFalse(HootStore.fits(e, id: "2026-10-31-middag", owner: "anon", basis: "b1"))
        XCTAssertFalse(HootStore.fits(e, id: "2026-10-31-middag", owner: Self.uid, basis: "b2"), "andere bronnen of interesses: opnieuw samenstellen")
        XCTAssertFalse(HootStore.fits(nil, id: "2026-10-31-middag", owner: Self.uid, basis: "b1"))
        // Oude velden decoderen mee, ook `keys` in de geschiedenis (H5).
        XCTAssertEqual(e.history?.first?.keys?["s-A"], ["ai"])
        XCTAssertEqual(e.entries.first?.why?.text, "Omdat je AI volgt")
    }

    // P8-2 (G7): als lid pas samenstellen na één geslaagde pull, of als die mislukte; anoniem meteen.
    func testMayComposeWaitsForPull() {
        XCTAssertFalse(HootStore.mayCompose(status: .loading, uid: nil, pulled: false, sync: .idle), "account laadt nog")
        XCTAssertFalse(HootStore.mayCompose(status: .member, uid: Self.uid, pulled: false, sync: .syncing), "eerste pull loopt")
        XCTAssertFalse(HootStore.mayCompose(status: .member, uid: Self.uid, pulled: false, sync: .idle), "nog geen pull")
        XCTAssertTrue(HootStore.mayCompose(status: .member, uid: Self.uid, pulled: true, sync: .ok))
        XCTAssertTrue(HootStore.mayCompose(status: .member, uid: Self.uid, pulled: false, sync: .failed), "zoals het web bij sync 'failed'")
        XCTAssertTrue(HootStore.mayCompose(status: .out, uid: nil, pulled: false, sync: .idle), "anoniem")
        XCTAssertTrue(HootStore.mayCompose(status: nil, uid: nil, pulled: false, sync: .idle))
    }

    // H3: de laatste drie dagdelen uit toestel en account samen, elk één keer, zonder het huidige.
    func testRecentHistoryKeepsLastThree() {
        let row = { (id: String, at: String) -> [String: Any] in ["id": id, "builtAt": at, "storyIds": [id]] }
        let local = [row("d4", "2026-10-31T11:00:00Z"), row("d3", "2026-10-31T05:00:00Z"), row("d2", "2026-10-30T16:00:00Z")]
        let account = [row("d4", "2026-10-31T11:00:00Z"), row("d3", "2026-10-31T05:00:00Z"), row("d1", "2026-10-30T11:00:00Z")]
        let out = HootStore.recentHistory(local + account + [row("d5", "2026-10-31T16:00:00Z")], except: "d5")
        XCTAssertEqual(out.map { $0["id"] as? String }, ["d4", "d3", "d2"], "nieuw naar oud, d1 valt af, d5 (nu) niet meegeteld")
        XCTAssertEqual(HootStore.recentHistory([], except: "x").count, 0)
    }
}

// Een nep-PostgREST voor `user_state` en `saved_items` in het geheugen. Alleen wat de tests nodig hebben:
// GET geeft de ene rij (of een lege lijst), PATCH past de filter van de aanroep toe. De gegevens zijn
// statisch (één "server" voor alle toestellen in een test), achter een slot.
final class FakePostgREST: URLProtocol {
    struct Seen { let method: String; let query: String; let prefer: String? }
    private static let lock = NSLock()
    nonisolated(unsafe) private static var editionRow: [String: Any]? = nil
    nonisolated(unsafe) private static var seen: [Seen] = []

    static var row: [String: Any] { lock.withLock { editionRow ?? [:] } }
    // De kolom zoals PostgREST hem geeft: het object, of JSON null.
    private static var column: Any { lock.withLock { editionRow.map { $0 as Any } ?? NSNull() } }
    static var requests: [Seen] { lock.withLock { seen } }
    static var patches: Int { requests.filter { $0.method == "PATCH" }.count }
    static func reset() { lock.withLock { editionRow = nil; seen = [] } }

    override class func canInit(with request: URLRequest) -> Bool { request.url?.path.contains("/rest/v1/") == true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func stopLoading() {}

    override func startLoading() {
        let url = request.url!
        let query = url.query(percentEncoded: false) ?? ""
        let method = request.httpMethod ?? "GET"
        Self.lock.withLock { Self.seen.append(Seen(method: method, query: query, prefer: request.value(forHTTPHeaderField: "Prefer"))) }
        var status = 200
        var out: Any = []
        if url.path.hasSuffix("/user_state") {
            if method == "GET" {
                out = [["prefs": [String: Any](), "read_ids": [String](), "edition": Self.column]]
            } else if method == "PATCH" {
                let body = (Self.body(of: request).flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]) ?? [:]
                let edition = body["edition"] as? [String: Any]
                // De filter van de aanvulling: alleen als er nog niets staat of iets van een ander dagdeel.
                let wanted = query.range(of: "edition->>id.neq.").map { String(query[$0.upperBound...].prefix { $0 != ")" && $0 != "&" }) }
                let applied: Bool = Self.lock.withLock {
                    if let wanted {
                        let current = Self.editionRow?["id"] as? String
                        guard current == nil || current != wanted else { return false }
                    }
                    if let edition { Self.editionRow = edition }
                    return true
                }
                let represent = request.value(forHTTPHeaderField: "Prefer")?.contains("return=representation") == true
                out = applied && represent ? [["edition": Self.column]] : []
                if !represent { status = 204 }
            }
        }
        let data = (try? JSONSerialization.data(withJSONObject: out)) ?? Data("[]".utf8)
        let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "application/json"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }

    // URLSession geeft het verzoek aan een URLProtocol zonder `httpBody`: de inhoud zit in de stream.
    private static func body(of request: URLRequest) -> Data? {
        if let b = request.httpBody { return b }
        guard let stream = request.httpBodyStream else { return nil }
        stream.open()
        defer { stream.close() }
        var data = Data()
        var buffer = [UInt8](repeating: 0, count: 4096)
        while stream.hasBytesAvailable {
            let n = stream.read(&buffer, maxLength: buffer.count)
            if n <= 0 { break }
            data.append(buffer, count: n)
        }
        return data
    }
}
