import XCTest
@testable import Hoot

// Het label boven een verhaal (StoryLabel). De gevallen staan in tests/fixtures/label-cases.json, die het
// web (tests/label.test.mjs) ook leest: een nieuw geval of een andere regel zet je daar, voor beide.
final class LabelTests: XCTestCase {
    // ios/HootTests/LabelTests.swift → <repo>/tests/fixtures/label-cases.json (zoals EditionParityTests).
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "tests/fixtures/label-cases.json")

    // Elk geval uit de gedeelde fixture: dezelfde invoer, dezelfde uitkomst als labelFor op het web.
    func testGedeeldeGevallen() throws {
        let data = try Data(contentsOf: Self.fixtureURL)
        let doc = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let cases = try XCTUnwrap(doc["cases"] as? [[String: Any]])
        XCTAssertGreaterThan(cases.count, 20)
        for c in cases {
            let name = c["name"] as? String ?? "?"
            let i = c["in"] as? [String: Any] ?? [:]
            let o = c["out"] as? [String: Any] ?? [:]
            let why = i["why"] as? [String: Any]
            let r = StoryLabel.label(
                topics: i["topics"] as? [String] ?? [], follows: i["follows"] as? [String] ?? [], interests: i["interests"] as? [String],
                cat: i["cat"] as? String, desk: i["desk"] as? String, deskLabel: i["deskLabel"] as? String, section: i["section"] as? String,
                whyCode: why?["code"] as? String, whyText: why?["text"] as? String, followed: i["followed"] as? Bool ?? true)
            if o.keys.contains("kicker") { XCTAssertEqual(r.kicker, o["kicker"] as? String, name) }
            if o.keys.contains("why") { XCTAssertEqual(r.why, o["why"] as? String, name) }
            if let out = o["outside"] as? Bool { XCTAssertEqual(r.outside, out, name) }
        }
    }

    // De plek van De Redacteur in de Editie (Desk.plek): Buiten je bubbel noemt waar het vandaan komt.
    func testDePlekZegtWaarHetVandaanKomt() {
        func entry(_ desk: String, count: Int? = nil, via: [String] = []) -> EditionEntry {
            EditionEntry(kind: "item", id: "a", desk: desk, sourceCount: count, terms: via.map { EntryTerm(term: "x", via: $0) })
        }
        XCTAssertEqual(Desk.plek(entry("bubbel", via: ["google", "bluesky", "google"])), "Buiten je bubbel · via Google Trends en Bluesky")
        XCTAssertEqual(Desk.plek(entry("bubbel")), "Buiten je bubbel")
        XCTAssertEqual(Desk.plek(entry("breed", count: 9)), "Waar iedereen over schrijft · 9 bronnen")
        XCTAssertEqual(Desk.plek(entry("binnenland")), "Binnenland")
    }
}
