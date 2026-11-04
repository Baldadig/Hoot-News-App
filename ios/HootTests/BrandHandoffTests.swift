import XCTest
@testable import Hoot

@MainActor final class BrandHandoffTests: XCTestCase {
    private let word = CGRect(x: 16, y: 65, width: 59.2, height: 19.6)
    private let dot = CGRect(x: 76, y: 81, width: 4.1, height: 4.1)

    func testLeavingOldTabCannotEraseTheNewVisibleTarget() {
        let handoff = BrandHandoff(), old = UUID(), visible = UUID()
        handoff.registerWord(word, owner: old)
        handoff.registerDot(dot, owner: old)
        let movedDot = dot.offsetBy(dx: 2, dy: 0)
        handoff.registerDot(movedDot, owner: visible)
        XCTAssertNil(handoff.word, "Geen woord van de oude tab combineren met de punt van de nieuwe")
        handoff.registerWord(word, owner: visible)
        handoff.clearTarget(owner: old)
        XCTAssertEqual(handoff.dot, movedDot)
        XCTAssertEqual(handoff.word, word)
        handoff.clearTarget(owner: visible)
        XCTAssertNil(handoff.word)
        XCTAssertNil(handoff.dot)
    }

    func testEitherGeometryCallbackOrderProducesOneCompleteTarget() {
        for dotFirst in [true, false] {
            let handoff = BrandHandoff(), owner = UUID()
            if dotFirst {
                handoff.registerDot(dot, owner: owner)
                handoff.registerWord(word, owner: owner)
            } else {
                handoff.registerWord(word, owner: owner)
                handoff.registerDot(dot, owner: owner)
            }
            XCTAssertEqual(handoff.word, word)
            XCTAssertEqual(handoff.dot, dot)
            XCTAssertEqual(handoff.targetOwner, owner)
        }
    }

    func testWelcomeCanStillReportItsOwnTargetWithoutTabOwnership() {
        let handoff = BrandHandoff()
        handoff.onRed = true
        handoff.registerDot(dot, owner: nil)
        handoff.registerWord(word, owner: nil)
        handoff.clearTarget(owner: UUID())
        XCTAssertEqual(handoff.dot, dot)
        XCTAssertEqual(handoff.word, word)
        XCTAssertTrue(handoff.onRed)
    }
}
