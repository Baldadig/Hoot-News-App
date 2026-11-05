import XCTest
import SwiftUI
@testable import Hoot

// Hoot 1.1.1, ronde 3: de keuzes van Alex van 5 november ("Na de review"), de app gelijk aan web-nu.
@MainActor final class Ronde3Tests: XCTestCase {
    // r5-bewaard: een archief. Geen belofte over offline of over verdwijnen na lezen.
    func testBewaardIsEenArchief() {
        XCTAssertEqual(SavedView.emptyText, "Tik op de bladwijzer bij een verhaal. Het blijft hier staan.")
        XCTAssertFalse(SavedView.emptyText.contains("verbinding"))
        XCTAssertFalse(SavedView.emptyText.contains("gelezen"))
    }
}
