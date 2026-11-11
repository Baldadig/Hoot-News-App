import XCTest
@testable import Hoot

// Meten zonder volgen (Telling.swift): het vocabulaire is dat van shared/tel.mjs, "eerste keer per dagdeel" werkt
// zoals op het web, en er gaat nooit een id, tijd of toestel mee.
@MainActor
final class TellingTests: XCTestCase {
    private func defaults() -> UserDefaults {
        let name = "TellingTests-\(UUID().uuidString)"
        let d = UserDefaults(suiteName: name)!
        addTeardownBlock { d.removePersistentDomain(forName: name) }
        return d
    }
    static let sharedURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "shared/tel.mjs")

    func testVocabularyMatchesTheServer() throws {
        let source = try String(contentsOf: Self.sharedURL, encoding: .utf8)
        let line = try XCTUnwrap(source.split(separator: "\n").first { $0.hasPrefix("export const EVENTS") })
        let names = line.split(separator: "'").enumerated().filter { $0.offset % 2 == 1 }.map { String($0.element) }
        XCTAssertEqual(names, Telling.Event.allCases.map(\.rawValue))
        XCTAssertTrue(source.contains("N_MAX = \(Telling.nMax)"))
        let once = try XCTUnwrap(source.split(separator: "\n").first { $0.hasPrefix("export const ONCE") })
        for e in Telling.Event.allCases { XCTAssertEqual(once.contains("'\(e.rawValue)'"), e.eenmalig, e.rawValue) }
    }

    func testBodyIsTheMinimum() throws {
        let data = Telling.body(.artikelOpen, dagdeel: "2026-11-11-ochtend", version: "1.2.1", n: 3)
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(Set(json.keys), ["e", "d", "p", "v", "n"])
        XCTAssertEqual(json["e"] as? String, "artikel-open")
        XCTAssertEqual(json["d"] as? String, "2026-11-11-ochtend")
        XCTAssertEqual(json["p"] as? String, "ios")
        XCTAssertEqual(json["v"] as? String, "1.2")
        XCTAssertEqual(json["n"] as? Int, 3)
        let eenmalig = try XCTUnwrap(JSONSerialization.jsonObject(with: Telling.body(.editieOpen, dagdeel: "2026-11-11-ochtend", version: nil, n: 9)) as? [String: Any])
        XCTAssertEqual(Set(eenmalig.keys), ["e", "d", "p"])
        let groot = try XCTUnwrap(JSONSerialization.jsonObject(with: Telling.body(.delen, dagdeel: "2026-11-11-ochtend", version: "x", n: 500)) as? [String: Any])
        XCTAssertEqual(groot["n"] as? Int, Telling.nMax)
        XCTAssertNil(groot["v"])
    }

    func testMajorMinorAndDagdeel() {
        XCTAssertEqual(Telling.majorMinor("1.2.1"), "1.2")
        XCTAssertEqual(Telling.majorMinor("1.2"), "1.2")
        XCTAssertNil(Telling.majorMinor("12"))
        XCTAssertNil(Telling.majorMinor("a.b"))
        XCTAssertNil(Telling.majorMinor(nil))
        XCTAssertEqual(Telling.dagdeel(date: "2026-11-11", slot: "avond"), "2026-11-11-avond")
        XCTAssertNil(Telling.dagdeel(date: nil, slot: "avond"))
        XCTAssertNil(Telling.dagdeel(date: "2026-11-11", slot: ""))
    }

    func testFirstTimePerSlot() {
        let d = defaults()
        var sent: [URLRequest] = []
        func go(_ e: Telling.Event, _ slot: String) -> Bool { Telling.stuur(e, dagdeel: slot, version: "1.2.1", defaults: d, enabled: true) { sent.append($0) } }
        XCTAssertTrue(go(.editieOpen, "2026-11-11-ochtend"))
        XCTAssertFalse(go(.editieOpen, "2026-11-11-ochtend")) // al geteld
        XCTAssertTrue(go(.editieEinde, "2026-11-11-ochtend"))
        XCTAssertFalse(go(.editieEinde, "2026-11-11-ochtend"))
        XCTAssertTrue(go(.editieOpen, "2026-11-11-middag")) // nieuw dagdeel
        XCTAssertTrue(go(.artikelOpen, "2026-11-11-middag")) // de rest elke keer
        XCTAssertTrue(go(.artikelOpen, "2026-11-11-middag"))
        XCTAssertEqual(sent.count, 5)
        // Het toestel onthoudt alleen dagdeel-id's per gebeurtenis.
        XCTAssertEqual(d.dictionary(forKey: Telling.key) as? [String: String], ["editie-open": "2026-11-11-middag", "editie-einde": "2026-11-11-ochtend"])
    }

    func testNothingWithoutReleaseOrEditie() {
        let d = defaults()
        var sent = 0
        XCTAssertFalse(Telling.stuur(.stroomOpen, dagdeel: "2026-11-11-ochtend", defaults: d, enabled: false) { _ in sent += 1 })
        XCTAssertFalse(Telling.stuur(.stroomOpen, dagdeel: nil, defaults: d, enabled: true) { _ in sent += 1 })
        XCTAssertEqual(sent, 0)
        XCTAssertNil(d.dictionary(forKey: Telling.key)) // niet eens "geteld" onthouden
        #if DEBUG
        XCTAssertFalse(Telling.verzenden, "Debug stuurt nooit")
        #else
        XCTAssertTrue(Telling.verzenden)
        #endif
    }

    func testRequestCarriesNoIdentity() throws {
        let r = Telling.request(Telling.body(.delen, dagdeel: "2026-11-11-ochtend", version: "1.2"))
        XCTAssertEqual(r.url?.path, "/api/tel")
        XCTAssertEqual(r.httpMethod, "POST")
        XCTAssertEqual(Set((r.allHTTPHeaderFields ?? [:]).keys), ["Content-Type"]) // geen token, geen id
        let text = String(decoding: try XCTUnwrap(r.httpBody), as: UTF8.self)
        XCTAssertEqual(text, #"{"d":"2026-11-11-ochtend","e":"delen","p":"ios","v":"1.2"}"#)
        XCTAssertNil(Telling.session.configuration.httpCookieStorage)
        XCTAssertFalse(Telling.session.configuration.httpShouldSetCookies)
        XCTAssertNil(Telling.session.configuration.urlCache)
    }
}
