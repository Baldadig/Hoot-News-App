import XCTest
@testable import Hoot

// De eindzin van de Editie: dezelfde zin als het web per datum + dagdeel (shared/eindzin.mjs),
// uit tests/fixtures/eindzin.json die tests/eindzin.test.mjs ook draait.
@MainActor final class EditionEndTests: XCTestCase {
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "tests/fixtures/eindzin.json")

    struct Case: Decodable { let date: String; let slot: String; let verwacht: String }
    struct Fixture: Decodable { let eindzinnen: [String]; let gevallen: [Case] }

    func testSameLinesAsWeb() throws {
        guard FileManager.default.fileExists(atPath: Self.fixtureURL.path) else { throw XCTSkip("tests/fixtures/eindzin.json ontbreekt") }
        let fx = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: Self.fixtureURL))
        XCTAssertEqual(fx.eindzinnen, EditionEnd.lines)
        XCTAssertGreaterThan(fx.gevallen.count, 90)
        for c in fx.gevallen { XCTAssertEqual(EditionEnd.line(date: c.date, slot: c.slot), c.verwacht, "\(c.date) \(c.slot)") }
        XCTAssertEqual(EditionEnd.line(date: nil, slot: nil), EditionEnd.line(date: "", slot: ""))
    }
}
