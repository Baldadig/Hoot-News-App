import XCTest
import SwiftUI
@testable import Hoot

@MainActor
final class EditionDisplayTests: XCTestCase {
    private var root: URL { URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent() }
    func testSharedIntroAndHeadlineContract() throws {
        struct Case: Decodable { let name: String; let `in`: String; let out: String; let author: String? }
        struct Headline: Decodable { let length: Int; let tier: String }
        struct Fixture: Decodable { let intro: [Case]; let headline: [Headline] }
        let cases = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: root.appending(path: "tests/fixtures/edition-display.json")))
        XCTAssertEqual(try Data(contentsOf: XCTUnwrap(EditionDisplay.resourceURL)), try Data(contentsOf: root.appending(path: "shared/edition-display.json")))
        for c in cases.intro {
            let actual = EditionDisplay.cleanIntro(c.in, author: c.author)
            XCTAssertEqual(actual, c.out, c.name)
            XCTAssertEqual(EditionDisplay.cleanIntro(actual, author: c.author), actual, c.name)
        }
        for c in cases.headline { XCTAssertEqual(EditionDisplay.headlineTier(String(repeating: "a", count: c.length)), c.tier) }
        let data = Data(#"{"id":"a","source":"nrc","title":"Een verhaal","url":"https://nrc.nl/a","summary":"Updated at 6:16 p.m. Een echte intro."}"#.utf8)
        XCTAssertEqual(try JSONDecoder().decode(Item.self, from: data).summary, "Een echte intro.")
    }
    func testLongHeadlineUsesExistingSmallerTokenAndRemainsReadable() throws {
        let title = "500 Patriot-raketten van VS deze winter nog niet ingezet, waarschuwt Zelensky: ‘Leveringen beginnen pas over paar jaar’"
        XCTAssertEqual(EditionDisplay.headlineStyle(title), .title2)
        for (label, size) in [("Large", DynamicTypeSize.large), ("XXXL", .xxxLarge), ("AX5", .accessibility5)] {
            let view = VStack(alignment: .leading, spacing: 16) {
                Text(title).font(Theme.headline(EditionDisplay.headlineStyle(title))).fixedSize(horizontal: false, vertical: true)
                Text(EditionDisplay.cleanIntro("Updated at 6:16 p.m.\nBy Eva de Vries\nEen rustige intro zonder bronruis.")).font(.body)
            }.padding(16).frame(width: 390).background(Theme.paper).foregroundStyle(Theme.ink).environment(\.dynamicTypeSize, size)
            let renderer = ImageRenderer(content: view); renderer.scale = 2
            let picture = try XCTUnwrap(renderer.uiImage)
            XCTAssertGreaterThan(picture.size.height, 80)
            let attachment = XCTAttachment(image: picture); attachment.name = "editiekop-390-\(label)"; attachment.lifetime = .keepAlways; add(attachment)
        }
    }
}
