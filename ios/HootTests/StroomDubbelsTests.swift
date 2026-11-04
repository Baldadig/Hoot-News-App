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
}
