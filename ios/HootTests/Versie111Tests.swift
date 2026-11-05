import XCTest
@testable import Hoot

// Hoot 1.1.1: app gelijk aan de web-poetsbeurt van 5 november en de backlogpunten daarna.
final class Versie111Tests: XCTestCase {
    // 1. Geen "Jouw Editie" onder de Editie-titel: alleen de datum, en alleen wat afwijkt (gelijk aan Edition.jsx).
    func testMetaregelZonderJouwEditie() {
        XCTAssertEqual(EditionView.metaLine(date: "Donderdag 5 november", personalLabel: true, personal: true), "Donderdag 5 november")
        XCTAssertEqual(EditionView.metaLine(date: "Donderdag 5 november", personalLabel: false, personal: true), "Donderdag 5 november\u{00A0}· Om te beginnen")
        XCTAssertEqual(EditionView.metaLine(date: "Donderdag 5 november", personalLabel: false, personal: false), "Donderdag 5 november\u{00A0}· De Editie voor iedereen")
        XCTAssertEqual(EditionView.metaLine(date: "", personalLabel: false, personal: false), "De Editie voor iedereen")
    }
}
