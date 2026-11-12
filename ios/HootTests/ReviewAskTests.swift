import XCTest
@testable import Hoot

// Om een beoordeling vragen (1.3.1): na de derde uitgelezen Editie, hooguit één keer per appversie.
final class ReviewAskTests: XCTestCase {
    private func fresh() -> UserDefaults {
        let d = UserDefaults(suiteName: "ReviewAskTests")!
        d.removePersistentDomain(forName: "ReviewAskTests")
        return d
    }

    func testNotInTheFirstTwoEditions() {
        let d = fresh()
        XCTAssertFalse(ReviewAsk.shouldAsk(read: ReviewAsk.record(edition: "2026-11-12-ochtend", defaults: d), version: "1.3.1", defaults: d))
        XCTAssertFalse(ReviewAsk.shouldAsk(read: ReviewAsk.record(edition: "2026-11-12-middag", defaults: d), version: "1.3.1", defaults: d))
        XCTAssertTrue(ReviewAsk.shouldAsk(read: ReviewAsk.record(edition: "2026-11-12-avond", defaults: d), version: "1.3.1", defaults: d))
    }

    func testSameEditionCountsOnce() {
        let d = fresh()
        for _ in 0 ..< 5 { ReviewAsk.record(edition: "2026-11-12-ochtend", defaults: d) }
        XCTAssertEqual(ReviewAsk.record(edition: "2026-11-12-ochtend", defaults: d), 1)
        XCTAssertFalse(ReviewAsk.shouldAsk(read: 1, version: "1.3.1", defaults: d))
    }

    func testOncePerVersion() {
        let d = fresh()
        XCTAssertTrue(ReviewAsk.shouldAsk(read: 3, version: "1.3.1", defaults: d))
        ReviewAsk.markAsked(version: "1.3.1", defaults: d)
        XCTAssertFalse(ReviewAsk.shouldAsk(read: 3, version: "1.3.1", defaults: d))
        XCTAssertFalse(ReviewAsk.shouldAsk(read: 40, version: "1.3.1", defaults: d))
        XCTAssertTrue(ReviewAsk.shouldAsk(read: 40, version: "1.4", defaults: d), "een nieuwe versie mag weer")
    }

    func testNoVersionNoAsk() {
        XCTAssertFalse(ReviewAsk.shouldAsk(read: 9, version: nil, defaults: fresh()))
    }

    func testOnlyRemembersTheLastTwenty() {
        let d = fresh()
        for i in 0 ..< 30 { ReviewAsk.record(edition: "e\(i)", defaults: d) }
        XCTAssertEqual(d.stringArray(forKey: ReviewAsk.readKey)?.count, 20)
    }

    // Alleen op het einde, met het venster van Apple, geen eigen scherm, en niet over een seintje-vraag heen.
    func testWiredToTheEndOnly() throws {
        let repo = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let src = try String(contentsOf: repo.appending(path: "ios/Hoot/Views/EditionView.swift"), encoding: .utf8)
        XCTAssertTrue(src.contains("@Environment(\\.requestReview)"))
        XCTAssertTrue(src.contains("if visible { reviewMoment() }"), "alleen als het einde in beeld komt")
        let r = try XCTUnwrap(src.range(of: "private func reviewMoment")).upperBound
        let body = String(src[r...].prefix(900))
        XCTAssertTrue(body.contains("ReviewAsk.mayShowNow(endVisible: endVisible, alertAsk: alertAsk, alertYes: alertYes, pathEmpty: path.isEmpty"), "na de 1,5 s dezelfde beslisfunctie, met pad en tabblad")
        XCTAssertTrue(body.contains("scenePhase == .active"))
        XCTAssertEqual(src.components(separatedBy: "requestReview()").count - 1, 1, "één plek die het venster vraagt")
    }

    func testMayShowNowOnlyWhenNothingIsOpen() {
        func ok(end: Bool = true, ask: Bool = false, yes: Bool = false, path: Bool = true, story: Bool = false, tab: Bool = true, active: Bool = true) -> Bool {
            ReviewAsk.mayShowNow(endVisible: end, alertAsk: ask, alertYes: yes, pathEmpty: path, storyOpen: story, editionTab: tab, sceneActive: active)
        }
        XCTAssertTrue(ok())
        XCTAssertFalse(ok(end: false), "einde niet meer in beeld")
        XCTAssertFalse(ok(ask: true))
        XCTAssertFalse(ok(yes: true))
        XCTAssertFalse(ok(path: false), "een verhaal staat open in het navigatiepad")
        XCTAssertFalse(ok(story: true), "een verhaal naast de Editie (iPad) of in de lezer")
        XCTAssertFalse(ok(tab: false), "een ander tabblad")
        XCTAssertFalse(ok(active: false), "de app is niet actief")
    }
}
