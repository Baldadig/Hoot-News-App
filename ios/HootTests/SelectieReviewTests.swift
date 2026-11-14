import XCTest
@testable import Hoot

// Selectie-review 14 november: wat de app van de nieuwe weekbundel laat zien, gelijk aan Vak.jsx
// (tests/selectie-betaald.test.mjs en verder).
final class SelectieReviewTests: XCTestCase {
    // Punt 9: een betaalde vakbron draagt `paid` mee; zonder het veld (een oude bundel) is het stuk gratis.
    func testDigestItemCarriesPaid() throws {
        let json = #"{"id":"2026-W45","fields":[{"id":"film","label":"Film & series","top":[{"id":"a","source":"vak:vk-films","title":"Recensie","url":"https://www.volkskrant.nl/a","paid":true},{"id":"b","source":"vak:filmkrant","title":"Essay","url":"https://filmkrant.nl/b"}],"more":[]}]}"#
        let digest = try JSONDecoder().decode(Digest.self, from: Data(json.utf8))
        let top = digest.fields[0].top
        XCTAssertEqual(top[0].paid, true)
        XCTAssertNil(top[1].paid)
    }
}

extension SelectieReviewTests {
    // Punt 6: het slot onder het laatste onderwerp, gelijk aan SLOT in src/lib/selection-index.js.
    func testSlotText() {
        XCTAssertEqual(SelectionOverview.slot, ["Je weet genoeg.", "Maandag een nieuwe."])
    }
}

extension SelectieReviewTests {
    // Punt 12: "drie stukken" in plaats van "het beste", gelijk aan CHOOSE in src/lib/selection-index.js.
    func testCopyPromisesThreePieces() {
        XCTAssertEqual(SelectionOverview.choose, "Elke maandag drie stukken over je werk of hobby. Kies waarover.")
        XCTAssertFalse(SelectionOverview.voorproef.contains("beste"))
    }
}
