import XCTest
@testable import Hoot

// Achterklap & showbizz (optIn): dezelfde tikken geven in de app byte-gelijk dezelfde prefs.topics als op het web.
// De gevallen staan in tests/fixtures/optin-cases.json, die het web (tests/optin.test.mjs) ook leest.
final class OptInTests: XCTestCase {
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "tests/fixtures/optin-cases.json")

    func testGedeeldeGevallen() throws {
        let data = try Data(contentsOf: Self.fixtureURL)
        let doc = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let cases = try XCTUnwrap(doc["cases"] as? [[String: Any]])
        XCTAssertGreaterThanOrEqual(cases.count, 5)
        for c in cases {
            let name = c["name"] as? String ?? "?"
            let interests = try XCTUnwrap(c["interests"] as? [String], name)
            let taps = try XCTUnwrap(c["taps"] as? [String], name)
            let expect = try XCTUnwrap(c["topics"] as? [String], name)
            // Instellingen › Interesses (InterestsList via setInterests): alle tikken in één lijst.
            XCTAssertEqual(Rubriek.resolve(interests, picked: taps), expect, "Instellingen: \(name)")
            // Het welkom: de gewone keuze en de optIn apart, zoals WelcomeView.finish.
            let welkom = Rubriek.withOptIn(Rubriek.resolve(interests, picked: taps.filter { !Rubriek.optIn.contains($0) }),
                                           interests: interests, on: taps.filter(Rubriek.optIn.contains))
            XCTAssertEqual(welkom, expect, "Welkom: \(name)")
            // Opnieuw openen en niets veranderen: dezelfde lijst.
            XCTAssertEqual(Rubriek.resolve(interests, picked: Rubriek.picked(from: expect, interests: interests)), expect, "Terug: \(name)")
        }
    }

    // Wie Cultuur alles volgt plus showbizz, ziet in Instellingen alleen showbizz aangetikt.
    func testPickedToontAllesPlusShowbizz() {
        let all = ["muziek", "film", "boeken", "kunst", "media", "games", "showbizz"]
        XCTAssertEqual(Rubriek.picked(from: all, interests: ["cultuur"]), ["showbizz"])
        XCTAssertEqual(Rubriek.picked(from: ["film", "showbizz"], interests: ["cultuur"]), ["film", "showbizz"])
    }
}
