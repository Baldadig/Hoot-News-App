import JavaScriptCore
import XCTest
@testable import Hoot

// Eén tabel voor de dagdelen (D1): Slots in de app is een spiegel van shared/slots.mjs op het web.
// Deze test leest dat bestand zelf en vergelijkt per slot de naam, de volgende en het dagdeel, zodat
// een woord dat op één platform verandert hier meteen opvalt.
final class SlotsTests: XCTestCase {
    // ios/HootTests/SlotsTests.swift → <repo>/shared/slots.mjs. Net als EditionParityTests: de tests
    // draaien op de simulator, die de Mac-schijf ziet; op een toestel is deze test niet bedoeld.
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "shared/slots.mjs")

    // De module als gewoon script: `export const SLOTS =` wordt `var SLOTS =`, dan leest
    // JavaScriptCore de tabel zoals het web hem ziet.
    static func web() throws -> [String: [String: String]] {
        let url = fixtureURL.deletingLastPathComponent().appending(path: "slots.json")
        return try JSONDecoder().decode([String: [String: String]].self, from: Data(contentsOf: url))
    }

    func testSameSlotsAsWeb() throws {
        let web = try Self.web()
        XCTAssertEqual(Set(web.keys), Set(Slots.all.keys), "andere dagdelen dan op het web")
        XCTAssertEqual(Set(web.keys), ["ochtend", "middag", "avond"])
    }

    func testSameWordsAsWeb() throws {
        for (slot, w) in try Self.web() {
            guard let app = Slots.all[slot] else { XCTFail("\(slot) ontbreekt in Slots"); continue }
            XCTAssertEqual(app.naam, w["naam"], "\(slot): naam")
            XCTAssertEqual(app.volgende, w["volgende"], "\(slot): volgende")
            XCTAssertEqual(app.dagdeel, w["dagdeel"], "\(slot): dagdeel")
            XCTAssertEqual(app.naMiddernacht, w["naMiddernacht"], "\(slot): naMiddernacht")
        }
    }

    // De eindkaart: voor middernacht "morgenochtend", daarna "De Ochtendeditie komt zo." (besluit Alex 16 november 2026),
    // zoals upNext op het web (tests/ochtend-zes.test.mjs). Geen kloktijden.
    func testUpNextVoorEnNaMiddernacht() {
        let iso = ISO8601DateFormatter()
        func at(_ s: String) -> Date { iso.date(from: s)! }
        XCTAssertEqual(Slots.upNext("avond", datum: "2026-11-30", nu: at("2026-11-30T22:59:00Z")), " De volgende staat morgenochtend klaar.") // 23:59
        XCTAssertEqual(Slots.upNext("avond", datum: "2026-11-30", nu: at("2026-11-30T23:01:00Z")), " De Ochtendeditie komt zo.") // 00:01
        XCTAssertEqual(Slots.upNext("avond", datum: "2026-11-30", nu: at("2026-12-01T04:59:59Z")), " De Ochtendeditie komt zo.") // 05:59
        XCTAssertEqual(Slots.upNext("avond", datum: "2026-06-30", nu: at("2026-06-30T21:59:00Z")), " De volgende staat morgenochtend klaar.") // zomer, 23:59
        XCTAssertEqual(Slots.upNext("avond", datum: "2026-06-30", nu: at("2026-06-30T22:01:00Z")), " De Ochtendeditie komt zo.") // zomer, 00:01
        XCTAssertEqual(Slots.upNext("ochtend", datum: "2026-11-30", nu: at("2026-12-01T10:00:00Z")), " De volgende staat in de middag klaar.")
        XCTAssertEqual(Slots.upNext("avond", datum: nil), " De volgende staat morgenochtend klaar.")
        XCTAssertEqual(Slots.upNext(nil, datum: "2026-11-30"), "")
    }

    // De seintjes noemen de Editie zoals de app zelf (EditionAlerts leest uit Slots).
    @MainActor
    func testAlertsUseTheTable() {
        for s in EditionAlerts.slots {
            XCTAssertEqual(s.name, Slots.all[s.id]?.naam, s.id)
            XCTAssertTrue(s.title.contains(s.name), s.id)
        }
    }
}
