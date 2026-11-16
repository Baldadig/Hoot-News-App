import XCTest
@testable import Hoot

// Blok A, iOS Editie gelijk aan web (editiefix, 16 november 2026): een lid krijgt nooit een eigen samengestelde Editie.
// Server, anders de Editie van dit dagdeel uit je account, anders blijft de vorige staan met "komt eraan"; opnieuw vragen
// met oplopende pauzes; een 200 met een eerder dagdeel is nog geen antwoord. Gelijk aan serverFirst en retryDelay in
// src/lib/editionSync.js (tests/editiefix.test.mjs).
@MainActor
final class LidEditieTests: XCTestCase {
    private func global(_ id: String = "2026-11-16-middag", builtAt: String = "2026-11-16T10:00:00Z") throws -> Edition {
        let raw: [String: Any] = ["id": id, "slot": "middag", "date": "2026-11-16", "builtAt": builtAt, "entries": [], "personal": false]
        return try JSONDecoder().decode(Edition.self, from: JSONSerialization.data(withJSONObject: raw))
    }
    private func edition(_ id: String, builtAt: String, owner: String? = "u1") -> [String: Any] {
        var e: [String: Any] = ["id": id, "builtAt": builtAt, "entries": [["id": "x"]], "basis": "b"]
        if let owner { e["owner"] = owner }
        return e
    }

    // (1) Account: de Editie van dit dagdeel uit je account telt als antwoord van de server, ook zonder `owner`.
    func testAccountEditieVanDitDagdeel() throws {
        let g = try global()
        guard case .account(let raw) = HootStore.memberKeuze(theirs: edition(g.id, builtAt: "2026-11-16T10:00:05Z", owner: nil), ahead: nil, global: g, owner: "u1") else { return XCTFail("account") }
        XCTAssertEqual(raw["owner"] as? String, "u1")
        // Een Editie van een andere lezer is niet de jouwe.
        guard case .wait(let ahead, let previous) = HootStore.memberKeuze(theirs: edition(g.id, builtAt: "2026-11-16T10:00:05Z", owner: "u2"), ahead: nil, global: g, owner: "u1") else { return XCTFail("wait") }
        XCTAssertNil(ahead); XCTAssertNil(previous)
    }

    // (2) Geen Editie van dit dagdeel: een eerder dagdeel is `previous` (blijft staan), een later dagdeel is `ahead`.
    func testVorigeBlijftStaanEnLaterWordtBewaard() throws {
        let g = try global()
        guard case .wait(let a1, let p1) = HootStore.memberKeuze(theirs: edition("2026-11-16-ochtend", builtAt: "2026-11-16T04:00:00Z"), ahead: nil, global: g, owner: "u1") else { return XCTFail() }
        XCTAssertNil(a1)
        XCTAssertEqual(p1?["id"] as? String, "2026-11-16-ochtend")
        guard case .wait(let a2, let p2) = HootStore.memberKeuze(theirs: edition("2026-11-16-avond", builtAt: "2026-11-16T16:00:00Z"), ahead: nil, global: g, owner: "u1") else { return XCTFail() }
        XCTAssertEqual(a2?["id"] as? String, "2026-11-16-avond")
        XCTAssertNil(p2)
        guard case .wait(let a3, let p3) = HootStore.memberKeuze(theirs: nil, ahead: nil, global: g, owner: "u1") else { return XCTFail() }
        XCTAssertNil(a3); XCTAssertNil(p3)
    }

    // (3) Een 200 met een eerder dagdeel is geen antwoord; met een later dagdeel is hij `ahead`; alleen dit dagdeel telt als antwoord.
    func testEenTweehonderdMetEenAnderDagdeel() throws {
        let g = try global()
        let body = { (e: [String: Any]) in try JSONSerialization.data(withJSONObject: ["edition": e]) }
        let old = try body(edition("2026-11-16-ochtend", builtAt: "2026-11-16T04:00:00Z"))
        let new = try body(edition("2026-11-16-avond", builtAt: "2026-11-16T16:00:00Z"))
        XCTAssertNil(HootStore.acceptServer(old, status: 200, id: g.id, owner: "u1"))
        XCTAssertNil(HootStore.aheadServer(old, status: 200, global: g, owner: "u1"), "eerder dagdeel: nog geen antwoord")
        XCTAssertNil(HootStore.acceptServer(new, status: 200, id: g.id, owner: "u1"))
        XCTAssertEqual(HootStore.aheadServer(new, status: 200, global: g, owner: "u1")?["id"] as? String, "2026-11-16-avond")
        XCTAssertNil(HootStore.aheadServer(new, status: 200, global: g, owner: "u2"), "andere lezer")
        XCTAssertNil(HootStore.aheadServer(new, status: 503, global: g, owner: "u1"))
        // De server gaf wel een antwoord van dit dagdeel in `ahead`: dat gaat voor wat in je account staat.
        let ahead = edition("2026-11-16-avond", builtAt: "2026-11-16T16:00:00Z")
        guard case .wait(let a, _) = HootStore.memberKeuze(theirs: nil, ahead: ahead, global: g, owner: "u1") else { return XCTFail() }
        XCTAssertEqual(a?["id"] as? String, "2026-11-16-avond")
    }

    // Opnieuw vragen: 3, 10, 30, dan elke 60 s, hooguit 30 keer; Retry-After is een ondergrens.
    func testOpnieuwVragenMetOplopendePauzes() {
        let waits = (0..<6).map { HootStore.retryDelay(status: 502, attempt: $0) }
        XCTAssertEqual(waits, [3, 10, 30, 60, 60, 60])
        XCTAssertNotNil(HootStore.retryDelay(status: 0, attempt: 29))
        XCTAssertNil(HootStore.retryDelay(status: 0, attempt: 30), "hooguit 30 keer")
        XCTAssertNil(HootStore.retryDelay(status: 0, attempt: -1))
        for status in [0, 200, 429, 500, 502, 503, 504] { XCTAssertNotNil(HootStore.retryDelay(status: status, attempt: 0), "\(status)") }
        for status in [400, 401, 403, 413] { XCTAssertNil(HootStore.retryDelay(status: status, attempt: 0), "\(status)") }
        XCTAssertEqual(HootStore.retryDelay(status: 429, attempt: 0), 60, "429: niet eerder dan een minuut")
        XCTAssertEqual(HootStore.retryDelay(status: 503, attempt: 0, retryAfter: 45), 45, "Retry-After respecteren")
        XCTAssertEqual(HootStore.retryDelay(status: 503, attempt: 3, retryAfter: 20), 60, "nooit korter dan de gewone pauze")
    }

    func testRetriesBijVijfhonderdEnVerder() {
        for status in [0, 429, 500, 502, 503, 504] { XCTAssertTrue(HootStore.retriesServer(status), "\(status)") }
        for status in [200, 400, 401, 403, 413] { XCTAssertFalse(HootStore.retriesServer(status), "\(status)") }
    }

    // De snelle tweede poging volgt Retry-After tot tien seconden; vraagt de server meer, dan laat hij het aan het opnieuw vragen over.
    func testSnelleTweedePogingEnRetryAfter() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [ServerEditionStub.self]
        HootAPI.editionTransport = URLSession(configuration: config)
        defer { HootAPI.editionTransport = HootAPI.session }
        HootStore.retryPause = .milliseconds(10)
        let payload = Data(#"{"v":2}"#.utf8)
        for first in [500, 502, 504] {
            ServerEditionStub.requests = []; ServerEditionStub.queue = [first, 200]
            let r = await HootStore.requestServer(payload, token: nil, renew: { nil })
            XCTAssertEqual(ServerEditionStub.requests.count, 2, "één nieuwe poging bij \(first)")
            XCTAssertEqual(r.status, 200)
        }
        ServerEditionStub.requests = []; ServerEditionStub.queue = [503]; ServerEditionStub.retryAfter = "120"
        let long = await HootStore.requestServer(payload, token: nil, renew: { nil })
        XCTAssertEqual(ServerEditionStub.requests.count, 1, "Retry-After van twee minuten: niet afwachten")
        XCTAssertEqual(long.retryAfter, 120)
        ServerEditionStub.retryAfter = nil
    }

    // 401: één keer het token verversen en opnieuw, met het nieuwe token; lukt verversen niet, dan één antwoord en niets stuk.
    func testNaEen401EenKeerVerversen() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [ServerEditionStub.self]
        HootAPI.editionTransport = URLSession(configuration: config)
        defer { HootAPI.editionTransport = HootAPI.session }
        let payload = Data(#"{"v":2}"#.utf8)
        var renewed = 0
        ServerEditionStub.requests = []; ServerEditionStub.queue = [401, 200]
        let ok = await HootStore.requestServer(payload, token: "oud", renew: { renewed += 1; return "nieuw" })
        XCTAssertEqual(renewed, 1)
        XCTAssertEqual(ok.status, 200)
        XCTAssertEqual(ServerEditionStub.requests.map { $0.value(forHTTPHeaderField: "Authorization") }, ["Bearer oud", "Bearer nieuw"])
        ServerEditionStub.requests = []; ServerEditionStub.queue = [401, 401]
        let bad = await HootStore.requestServer(payload, token: "oud", renew: { renewed += 1; return "nieuw" })
        XCTAssertEqual(renewed, 2)
        XCTAssertEqual(ServerEditionStub.requests.count, 2, "na een tweede 401 geen derde poging")
        XCTAssertEqual(bad.status, 401)
        ServerEditionStub.requests = []; ServerEditionStub.queue = [401]
        let none = await HootStore.requestServer(payload, token: "oud", renew: { nil })
        XCTAssertEqual(ServerEditionStub.requests.count, 1, "verversen mislukt: geen tweede vraag")
        XCTAssertEqual(none.status, 401)
    }

    // De route van een lid kent geen vangnet meer: provisional() alleen zonder account.
    func testLidKrijgtGeenEigenVangnet() throws {
        let src = try String(contentsOf: EditionServerTests.repo.appending(path: "ios/Hoot/HootStore.swift"), encoding: .utf8)
        let a = try XCTUnwrap(src.range(of: "if owner != \"anon\", !force {")).lowerBound
        let b = try XCTUnwrap(src.range(of: "await provisional(global: global, owner: owner, basis: basis, force: force)")).lowerBound
        XCTAssertLessThan(a, b, "het lid keert terug vóór het vangnet")
        XCTAssertTrue(src[a ..< b].contains("return"))
        XCTAssertFalse(src[a ..< b].contains("provisional(global"))
    }
}
