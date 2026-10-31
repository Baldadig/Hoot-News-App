import XCTest
@testable import Hoot
final class EditionMotionTests: XCTestCase {
    struct Case: Decodable { let id, lastSeen: String; let ready, afterIris, expected: Bool }
    func testAlleenEenNieuweEditieNaDeIris() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appending(path: "tests/fixtures/edition-motion.json")
        for c in try JSONDecoder().decode([Case].self, from: Data(contentsOf: url)) {
            XCTAssertEqual(EditionPrint.shouldPlay(id: c.id, lastSeen: c.lastSeen, ready: c.ready, afterIris: c.afterIris), c.expected)
        }
    }
}
