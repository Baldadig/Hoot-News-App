import XCTest
@testable import Hoot

// De trekstrook hoort bij de inhoud (build 55: trekken om te verversen en meteen verder lezen liet de horizon
// bovenaan staan): hij schuift met de Editie mee omhoog en uit beeld, zoals de verversknop van iOS. Sinds 1.4
// (build 58) is er geen meelopende kop meer; bovenaan staan alleen de bedieningselementen van iOS en de app.
@MainActor final class PullZonTests: XCTestCase {
    private let laden = RefreshStrip.gap(amount: 0, busy: true)

    func testStripStaysWholeAtRest() {
        XCTAssertEqual(RefreshStrip.zicht(gap: laden, scrolled: 0), laden)
        XCTAssertEqual(RefreshStrip.zicht(gap: 90, scrolled: 0), 90, "Trekken: de hele trek is te zien")
    }

    func testStripScrollsAwayWithTheContent() {
        for s in stride(from: CGFloat(0), through: 300, by: 4) {
            let zicht = RefreshStrip.zicht(gap: laden, scrolled: s)
            // De onderkant van de strook is de bovenkant van de inhoud: er valt nooit iets van de strook over de inhoud.
            XCTAssertEqual(zicht, max(0, laden - s), accuracy: 0.001)
            XCTAssertLessThanOrEqual(zicht, laden)
        }
        XCTAssertEqual(RefreshStrip.zicht(gap: laden, scrolled: laden), 0)
        XCTAssertEqual(RefreshStrip.zicht(gap: laden, scrolled: RefreshStrip.volgTot), 0)
    }

    func testFollowRangeCoversTheStrip() {
        XCTAssertGreaterThan(RefreshStrip.volgTot, laden + 120, "Ook met een extra trek tijdens laden")
    }

    func testInvalidValuesDrawNothingStrange() {
        XCTAssertEqual(RefreshStrip.zicht(gap: laden, scrolled: -40), laden, "Overtrekken bovenaan is geen scroll")
        XCTAssertEqual(RefreshStrip.zicht(gap: .nan, scrolled: 0), 0)
        XCTAssertEqual(RefreshStrip.zicht(gap: laden, scrolled: .infinity), laden)
        XCTAssertEqual(RefreshStrip.zicht(gap: -10, scrolled: 0), 0)
    }
}
