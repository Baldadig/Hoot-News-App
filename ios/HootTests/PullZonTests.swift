import XCTest
@testable import Hoot

// De trekstrook en de zon als voortgang vallen nooit over elkaar heen (build 55: trekken om te verversen en
// meteen verder lezen tekende de horizon over de meelopende kop met de zon). De strook hoort bij de inhoud:
// hij schuift mee omhoog en is uit beeld voordat de naam van de Editie onder de meelopende kop verdwijnt.
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

    func testNeverUnderTheFollowingHeader() {
        // De meelopende kop staat er pas als de onderkant van de naam onder de balk is geschoven. De naam ligt
        // in de inhoud, onder de strook (en onder het woordmerk); op dat moment is er van de strook niets te zien.
        let balk = LeesStand.balk
        for boven in [CGFloat(0), 44, 60] { // wat er tussen strook en naam staat (het woordmerk "hoot.")
            for naamHoogte in [CGFloat(34), 41, 80] {
                let kopOnder = laden + boven + naamHoogte // de onderkant van de naam, vanaf de bovenrand van de scroll
                let weg = max(0, kopOnder - balk) // vanaf hier staat de meelopende kop er
                for s in stride(from: weg, through: weg + 200, by: 2) {
                    XCTAssertEqual(RefreshStrip.zicht(gap: laden, scrolled: s, kop: true), 0, "boven \(boven), naam \(naamHoogte), scroll \(s)")
                }
            }
        }
    }

    func testFollowingHeaderAlwaysWins() {
        // Ook als de kop er staat terwijl de strook nog (deels) in beeld zou zijn: de strook wijkt helemaal.
        for s in [CGFloat(0), 10, 40] {
            XCTAssertEqual(RefreshStrip.zicht(gap: laden, scrolled: s, kop: true), 0)
            XCTAssertEqual(RefreshStrip.zicht(gap: laden + 30, scrolled: s, kop: true), 0)
        }
    }

    func testOnlyTheStripsOwnRoomIsVisible() {
        // Realistisch: met het woordmerk boven de naam is de strook al uit beeld voor de kop verschijnt.
        let kopOnder = laden + 60 + 41
        XCTAssertEqual(RefreshStrip.zicht(gap: laden, scrolled: kopOnder - LeesStand.balk), 0)
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
