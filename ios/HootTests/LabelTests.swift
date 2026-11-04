import XCTest
@testable import Hoot

// Het label boven een verhaal (StoryLabel). De gevallen staan in tests/fixtures/label-cases.json, die het
// web (tests/label.test.mjs) ook leest: een nieuw geval of een andere regel zet je daar, voor beide.
final class LabelTests: XCTestCase {
    // ios/HootTests/LabelTests.swift → <repo>/tests/fixtures/label-cases.json (zoals EditionParityTests).
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "tests/fixtures/label-cases.json")

    // Elk geval uit de gedeelde fixture (`input` → `expect`): dezelfde invoer, dezelfde uitkomst als labelFor
    // op het web. Velden die ontbreken hebben hun standaard (lijsten leeg, followed true, de rest null).
    func testGedeeldeGevallen() throws {
        let data = try Data(contentsOf: Self.fixtureURL)
        let doc = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let cases = try XCTUnwrap(doc["cases"] as? [[String: Any]])
        XCTAssertGreaterThanOrEqual(cases.count, 25)
        XCTAssertTrue(cases.contains { ($0["name"] as? String)?.hasPrefix("Breskens") == true })
        for c in cases {
            let name = c["name"] as? String ?? "?"
            let i = c["input"] as? [String: Any] ?? [:]
            let o = try XCTUnwrap(c["expect"] as? [String: Any], name)
            let why = i["why"] as? [String: Any]
            let r = StoryLabel.label(
                topics: i["topics"] as? [String] ?? [], mainTopics: i["mainTopics"] as? [String] ?? [], follows: i["follows"] as? [String] ?? [],
                cat: i["cat"] as? String, desk: i["desk"] as? String, deskLabel: i["deskLabel"] as? String, section: i["section"] as? String,
                whyCode: why?["code"] as? String, whyText: why?["text"] as? String, whyDetail: why?["detail"] as? Bool ?? false, followed: i["followed"] as? Bool)
            XCTAssertEqual(r.kicker, o["kicker"] as? String, name)
            XCTAssertEqual(r.why, (o["why"] as? [String: Any])?["text"] as? String, name)
            XCTAssertEqual(r.outside, o["outside"] as? Bool, name)
        }
    }

    func testDeOnderwerpenUitDeKopKomenMeeUitDeAPI() throws {
        let json = #"{"id":"a","source":"nos","url":"https://nos.nl/a","title":"De stad krijgt meer groen","topics":["nederland","klimaat"],"mainTopics":["nederland"]}"#
        let item = try JSONDecoder().decode(Item.self, from: Data(json.utf8))
        XCTAssertEqual(item.mainTopics, ["nederland"])
        XCTAssertEqual(try JSONDecoder().decode(Item.self, from: JSONEncoder().encode(item)).mainTopics, ["nederland"])
    }

    // De plek van De Redacteur in de Editie (Desk.plek): Buiten je bubbel noemt waar het vandaan komt.
    func testDePlekZegtWaarHetVandaanKomt() {
        func entry(_ desk: String, count: Int? = nil, via: [String] = []) -> EditionEntry {
            EditionEntry(kind: "item", id: "a", desk: desk, sourceCount: count, terms: via.map { EntryTerm(term: "x", via: $0) })
        }
        XCTAssertEqual(Desk.plek(entry("bubbel", via: ["google", "bluesky", "google"])), "Buiten je bubbel · via Google Trends en Bluesky")
        XCTAssertEqual(Desk.plek(entry("bubbel")), "Buiten je bubbel")
        XCTAssertEqual(Desk.plek(entry("breed", count: 9)), "Waar iedereen over schrijft") // het aantal staat in de bronregel (E6)
        XCTAssertEqual(Desk.plek(entry("binnenland")), "Binnenland")
    }
}
