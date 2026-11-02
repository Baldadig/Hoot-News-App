import XCTest
@testable import Hoot

@MainActor
final class StreamSelectionTests: XCTestCase {
    func testSharedSocialStreamCases() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appending(path: "tests/fixtures/social-stream-cases.json")
        let f = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [String: Any]
        let now = HootDate.parse(f["now"] as! String)!, source = f["source"] as! String
        for c in f["cases"] as! [[String: Any]] {
            var object: [String: Any] = ["id":"test", "kind":"post", "source":source, "title":"", "url":"https://bsky.app/profile/test/post/test"]
            if let hours = c["ageHours"] as? Double { object["publishedAt"] = ISO8601DateFormatter().string(from: now.addingTimeInterval(-hours * 3600)) }
            object["editionOnly"] = c["editionOnly"]; object["streamOnly"] = c["streamOnly"]
            let item = try JSONDecoder().decode(Item.self, from: JSONSerialization.data(withJSONObject: object))
            XCTAssertEqual(SocialStream.allows(item, enabled:c["enabled"] as! Bool, followed:c["followed"] as! Bool ? [source] : [], selected:c["selected"] as! Bool ? [source] : [], now:now), c["expected"] as! Bool, c["name"] as! String)
        }
    }
    func testFoldPersistsAcrossWeeksAndSeparatesOwners() {
        let name = "hoot-test-fold-" + UUID().uuidString
        let defaults = UserDefaults(suiteName: name)!
        defer { defaults.removePersistentDomain(forName:name) }
        let state = SelectionFoldState(defaults:defaults)
        state.set(["ai","removed"], for:"A", selected:["ai","design"])
        XCTAssertEqual(state.closed(for:"A",selected:["ai","design"]),["ai"])
        XCTAssertEqual(state.closed(for:"B",selected:["ai","design"]),[])
        XCTAssertEqual(state.closed(for:"anon",selected:["ai","design"]),[])
        state.set(["design"],for:"B",selected:["design"])
        state.activate("B",selected:["ai"],persist:false)
        XCTAssertEqual(try? JSONDecoder().decode([String].self,from:defaults.data(forKey:SelectionFoldState.key("B"))!),["design"],"oude onderwerpen mogen de nieuwe eigenaar niet overschrijven")
        state.activate("B",selected:["design"])
        XCTAssertEqual(state.closed(for:"B",selected:["design"]),["design"])
        let reopened = SelectionFoldState(defaults:defaults)
        XCTAssertEqual(reopened.closed(for:"A",selected:["ai","design","security"]),["ai"])
        reopened.activate("A",selected:["design"])
        XCTAssertEqual(reopened.closed(for:"A",selected:["ai","design"]),[], "opnieuw gekozen onderwerp begint open")
    }
}
