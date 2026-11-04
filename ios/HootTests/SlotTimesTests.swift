import JavaScriptCore
import XCTest
@testable import Hoot

// De start van elk dagdeel staat op één plek (shared/slot-times.mjs, ook gebruikt door de server die de
// Edities vastlegt). De seintjes van de app moeten op dezelfde minuut rekenen: deze test leest dat
// bestand zelf, zodat een verschoven tijd op één platform hier meteen opvalt.
final class SlotTimesTests: XCTestCase {
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "shared/slot-times.mjs")

    // Alleen de regel met SLOT_START, als gewoon script: `export const` wordt `var`.
    static func web() throws -> [String: Int] {
        let source = try String(contentsOf: fixtureURL, encoding: .utf8)
        guard let line = source.split(separator: "\n").first(where: { $0.hasPrefix("export const SLOT_START") }) else {
            XCTFail("SLOT_START ontbreekt"); return [:]
        }
        let ctx = JSContext()!
        ctx.evaluateScript(line.replacingOccurrences(of: "export const", with: "var"))
        return (ctx.objectForKeyedSubscript("SLOT_START").toDictionary() as? [String: Int]) ?? [:]
    }

    @MainActor
    func testAlertsStartWithTheServer() throws {
        let web = try Self.web()
        XCTAssertEqual(web, ["ochtend": 330, "middag": 720, "avond": 1020])
        for s in EditionAlerts.slots {
            XCTAssertEqual(s.hour * 60 + s.minute, web[s.id], s.id)
        }
    }

    // 05:30 Amsterdamse tijd het hele jaar; het seintje drie minuten later.
    @MainActor
    func testMorningAlertAllYear() throws {
        let ochtend = try XCTUnwrap(EditionAlerts.slots.first { $0.id == "ochtend" })
        let iso = ISO8601DateFormatter()
        let cases = [
            ("2026-12-01T12:00:00Z", "2026-12-01T04:33:00Z"), // wintertijd, UTC+1
            ("2026-07-01T12:00:00Z", "2026-07-01T03:33:00Z"), // zomertijd, UTC+2
            ("2026-10-25T12:00:00Z", "2026-10-25T04:33:00Z"), // nacht van de wintertijd
            ("2026-03-29T12:00:00Z", "2026-03-29T03:33:00Z"), // nacht van de zomertijd
        ]
        for (day, expected) in cases {
            let at = try XCTUnwrap(EditionAlerts.moment(ochtend, on: iso.date(from: day)!))
            XCTAssertEqual(iso.string(from: at), expected, day)
        }
    }

    // De seintjes zelf noemen geen kloktijd, alleen het dagdeel.
    @MainActor
    func testNoClockTimesInAlerts() {
        let clock = try! NSRegularExpression(pattern: "\\d{1,2}[:.]\\d{2}|\\buur\\b")
        for s in EditionAlerts.slots {
            for text in [s.title, s.body, s.name, s.short] {
                XCTAssertNil(clock.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)), "\(s.id): \(text)")
            }
        }
    }
}
