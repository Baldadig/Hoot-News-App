import XCTest
@testable import Hoot

// Eén stuk, één plek in de Stroom (HootStore.withoutRepeats): dezelfde echte dubbelen uit de live feed
// van 4 november als tests/stroom-dubbels.test.mjs, uit tests/fixtures/stroom-dubbels.json.
@MainActor final class StroomDubbelsTests: XCTestCase {
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "tests/fixtures/stroom-dubbels.json")

    struct Expected: Decodable { let id: String; let formerIds: [String] }
    struct Fixture: Decodable { let items: [Item]; let verwacht: [Expected] }

    static func fixture() throws -> Fixture {
        guard FileManager.default.fileExists(atPath: fixtureURL.path) else { throw XCTSkip("tests/fixtures/stroom-dubbels.json ontbreekt") }
        return try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: fixtureURL))
    }

    func testSameOutcomeAsWeb() throws {
        let fx = try Self.fixture()
        let out = HootStore.withoutRepeats(fx.items)
        XCTAssertEqual(out.map(\.id), fx.verwacht.map(\.id))
        XCTAssertEqual(out.map { ($0.formerIds ?? []).sorted() }, fx.verwacht.map(\.formerIds))
    }

    func testMiguelKeepsLatestHeadline() throws {
        let out = HootStore.withoutRepeats(try Self.fixture().items)
        let miguel = try XCTUnwrap(out.first { $0.title.contains("Miguel") })
        XCTAssertEqual(miguel.id, "kuy74j")
        XCTAssertEqual(miguel.formerIds?.count, 4)
    }

    func testDifferentAtlanticPiecesStayApart() throws {
        let ids = HootStore.withoutRepeats(try Self.fixture().items).map(\.id)
        XCTAssertTrue(ids.contains("cv071w") && ids.contains("13nggrq"))
    }

    func testArticleId() {
        XCTAssertEqual(HootStore.articleId("https://www.volkskrant.nl/sport/slug~bf2ff83e/?utm=x"), "bf2ff83e")
        XCTAssertEqual(HootStore.articleId("https://www.volkskrant.nl/sport/slug~bf2ff83e"), "bf2ff83e")
        XCTAssertNil(HootStore.articleId("https://nos.nl/l/2637948"))
    }

    func testSameIntroDifferentPublisherIdStaysApart() throws {
        let out = HootStore.withoutRepeats(try Self.fixture().items)
        let ids = out.map(\.id)
        for id in ["o4tkoo", "1rthd7f", "1vj2tgs", "17zzbkt", "15b43ex", "107h2sb"] { XCTAssertTrue(ids.contains(id), id) }
        let regional = out.filter { $0.url.contains("limburger.nl") || $0.url.contains("lc.nl") }
        XCTAssertTrue(regional.allSatisfy { ($0.formerIds ?? []).isEmpty })
    }

    func testPublisherId() {
        XCTAssertEqual(HootStore.publisherId("https://www.volkskrant.nl/sport/slug~bf2ff83e/?utm=x"), "bf2ff83e")
        XCTAssertEqual(HootStore.publisherId("https://www.limburger.nl/regio/venray/slug/163699375.html"), "163699375")
        XCTAssertEqual(HootStore.publisherId("https://www.nu.nl/binnenland/6372345/slug.html"), "6372345")
        XCTAssertNil(HootStore.publisherId("https://nos.nl/l/2637948"))
    }
}
