import XCTest
@testable import Hoot

// C2 (review 4 november 2026): de terugval zonder gecachte feed codeert stories opnieuw voor de rekenkern.
// `light` en `sport` van de server moeten daarbij heel blijven, en een oude feed zonder die velden ook.
final class StoryLightTests: XCTestCase {
    private func roundTrip(_ json: String) throws -> [String: Any] {
        let story = try JSONDecoder().decode(Story.self, from: Data(json.utf8))
        let data = try JSONEncoder().encode(story)
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    func testLightKindSurvives() throws {
        let out = try roundTrip(#"{"id":"s1","itemIds":["a"],"light":"games"}"#)
        XCTAssertEqual(out["light"] as? String, "games")
    }

    func testLightFalseAndSportSurvive() throws {
        let out = try roundTrip(#"{"id":"s2","itemIds":["a"],"light":false,"sport":true}"#)
        XCTAssertEqual(out["light"] as? Bool, false)
        XCTAssertEqual(out["sport"] as? Bool, true)
    }

    func testOldFeedWithoutFieldsStaysWithout() throws {
        let out = try roundTrip(#"{"id":"s3","itemIds":["a"]}"#)
        XCTAssertNil(out["light"])
        XCTAssertNil(out["sport"])
    }

    func testUnexpectedLightNeverBreaksTheStory() throws {
        let out = try roundTrip(#"{"id":"s4","itemIds":["a"],"light":7}"#)
        XCTAssertEqual(out["id"] as? String, "s4")
        XCTAssertEqual(out["light"] as? Bool, false)
    }
}
