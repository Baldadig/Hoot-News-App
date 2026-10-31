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
        let text = try String(contentsOf: fixtureURL, encoding: .utf8)
        XCTAssertTrue(text.contains("export const SLOTS ="), "shared/slots.mjs exporteert SLOTS niet meer zoals verwacht")
        guard let ctx = JSContext() else { throw XCTSkip("geen JSContext") }
        var fout: String?
        ctx.exceptionHandler = { _, e in fout = e?.toString() }
        ctx.evaluateScript(text.replacingOccurrences(of: "export const SLOTS =", with: "var SLOTS ="))
        if let fout { XCTFail("shared/slots.mjs laat zich niet lezen: \(fout)") }
        let json = ctx.evaluateScript("JSON.stringify(SLOTS)").toString() ?? "{}"
        return try JSONDecoder().decode([String: [String: String]].self, from: Data(json.utf8))
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
        }
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
