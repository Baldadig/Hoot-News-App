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

    // r5-stroom-einde: de Stroom houdt op bij je vorige bezoek (of na een dag), gelijk aan src/lib/stroom-einde.js.
    func testStroomEindeGrens() {
        let now = Date(timeIntervalSince1970: 2_000_000_000)
        XCTAssertEqual(StroomEinde.grens(mark: nil, now: now), .init(at: now.addingTimeInterval(-86_400), eerder: false))
        let gisteren = now.addingTimeInterval(-3 * 3600)
        XCTAssertEqual(StroomEinde.grens(mark: gisteren, now: now), .init(at: gisteren, eerder: true))
        let oud = now.addingTimeInterval(-2 * 86_400)
        XCTAssertEqual(StroomEinde.grens(mark: oud, now: now), .init(at: now.addingTimeInterval(-86_400), eerder: false), "langer dan een dag: de laatste 24 uur")
    }

    func testStroomEindeIndexEnKnop() {
        let now = Date(timeIntervalSince1970: 2_000_000_000)
        let items = (0..<5).map { i -> Item in
            var it = Item(id: "\(i)", source: "nos", title: "t\(i)", url: "https://nos.nl/\(i)")
            it.publishedAt = ISO8601DateFormatter().string(from: now.addingTimeInterval(TimeInterval(-i * 3600)))
            return it
        }
        // Grens op het derde bericht: twee nieuwer, de rest niet.
        let at = now.addingTimeInterval(-2 * 3600)
        XCTAssertEqual(StroomEinde.index(items, at: at), 2, "het eerste bericht dat niet nieuwer is dan de grens")
        XCTAssertEqual(StroomEinde.cap(count: 5, grensIndex: 2, older: 0), 2)
        XCTAssertEqual(StroomEinde.cap(count: 5, grensIndex: 2, older: StroomEinde.page), 5, "Ouder nieuws tonen opent per keer zestig")
        XCTAssertEqual(StroomEinde.index(items, at: now.addingTimeInterval(-86_400)), 5, "alles van de laatste dag")
        XCTAssertEqual(StroomEinde.page, 60)
    }
}
