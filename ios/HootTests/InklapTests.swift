import XCTest
@testable import Hoot

// 1.1.1: de categorieën van de bronnenstap klappen in. Gelijk aan chosenIn, startsOpen en foldCount in
// src/lib/follow-welcome.js (tests/versie-111.test.mjs).
final class InklapTests: XCTestCase {
    private func source(_ id: String) -> Source {
        try! JSONDecoder().decode(Source.self, from: Data(#"{"id":"\#(id)","name":"\#(id)"}"#.utf8))
    }

    func testOpenMetGekozenBronnenEnDeBasisAltijd() {
        let list = ["nos", "nu", "rtl"].map(source)
        XCTAssertEqual(FollowList.chosenIn(list, ["nu", "nrc"]), 1)
        XCTAssertTrue(FollowList.startsOpen("basis", chosen: 0))
        XCTAssertFalse(FollowList.startsOpen("b-sport", chosen: 0))
        XCTAssertTrue(FollowList.startsOpen("b-sport", chosen: 2))
    }

    func testDeKopZegtHoeveelErGevolgdZijn() {
        XCTAssertEqual(FollowList.foldCount(0, 8), "8 bronnen")
        XCTAssertEqual(FollowList.foldCount(0, 1), "1 bron")
        XCTAssertEqual(FollowList.foldCount(2, 8), "2 van 8 gevolgd")
    }
}
