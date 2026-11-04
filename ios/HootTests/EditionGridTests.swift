import XCTest
@testable import Hoot

// Het brede Editie-raster (keuze 1.1.0): dezelfde regels als src/lib/pairs.js
// (tests/editie-stroom-110.test.mjs rekent dezelfde gevallen na).
final class EditionGridTests: XCTestCase {
    private func cell(_ key: String, _ h: CGFloat, image: Bool = true) -> EditionPairs.Cell { .init(key: key, height: h, image: image) }

    func testPairWithinTwoLinesStaysAsItIs() {
        XCTAssertEqual(EditionPairs.plan([cell("a", 200), cell("b", 240)], width: 460), [:])
    }

    func testShortStoryGetsItsImageAboveSizedToTheGap() {
        // 300 − 180 − 12 = 108, binnen een kwart (115) tot de helft (230) van 460: dus 115.
        XCTAssertEqual(EditionPairs.plan([cell("a", 180), cell("b", 300)], width: 460), ["a": 115])
        // Een groter verschil: het beeld wordt hoger, tot de helft van de kolom.
        XCTAssertEqual(EditionPairs.plan([cell("a", 400), cell("b", 180)], width: 460), ["b": 208])
    }

    func testWithoutImageOrWhenItWouldNotHelpNothingChanges() {
        XCTAssertEqual(EditionPairs.plan([cell("a", 180, image: false), cell("b", 300)], width: 460), [:])
        // Het verschil is 60: een beeld van minstens 115 maakt het erger.
        XCTAssertEqual(EditionPairs.plan([cell("a", 240), cell("b", 300)], width: 460), [:])
        // Een los laatste verhaal heeft geen paar.
        XCTAssertEqual(EditionPairs.plan([cell("a", 100)], width: 460), [:])
    }

    func testLeadImageMatchesTheSideColumnButNeverBelowTheMinimum() {
        XCTAssertEqual(EditionPairs.leadImage(side: 620, text: 300), 320)
        XCTAssertEqual(EditionPairs.leadImage(side: 400, text: 300), 240)
    }

    func testStandingIsOneColumnLyingIsPairs() {
        XCTAssertFalse(EditionPairs.paired(CGSize(width: 1032, height: 1376)))
        XCTAssertTrue(EditionPairs.paired(CGSize(width: 1376, height: 1032)))
        XCTAssertEqual(Layout.hang, 36)
    }
}
