import XCTest
import SwiftUI
@testable import Hoot

@MainActor
final class EditionNumberingTests: XCTestCase {
    private func row(_ id: String, desk: String? = nil) -> EditionRowModel {
        EditionRowModel(id: id, item: Item(id: id, source: "nos", title: "Een verhaal", url: "https://nos.nl/a"), story: nil, label: nil, desk: desk)
    }
    func testDisplayedOrderBubbleAndShortEdition() {
        let rows = EditionNumbering.rows([row("hero"), row("b", desk: "bubbel"), row("wide", desk: "breed"), row("last")])
        XCTAssertEqual(rows.map(\.number), [1, nil, 2, 3])
        XCTAssertEqual(EditionNumbering.count(rows), 3)
        XCTAssertEqual(rows.map(\.id), ["hero", "b", "wide", "last"])
        XCTAssertEqual(EditionNumbering.count([]), 0)
        XCTAssertEqual(EditionNumbering.count(EditionNumbering.rows([row("b", desk: "bubbel")])), 0)
        XCTAssertEqual(EditionNumbering.count(EditionNumbering.rows((1...10).map { row(String($0)) })), 10)
    }
    func testCountAndFloorIgnoreTheOptionalBubble() throws {
        let root = URL(fileURLWithPath:#filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        XCTAssertEqual(try Data(contentsOf:XCTUnwrap(EditionLimits.resourceURL)),try Data(contentsOf:root.appending(path:"shared/edition-limits.json")))
        XCTAssertEqual(EditionLimits.target,10)
        XCTAssertEqual(EditionLimits.auditBelow,6)
        XCTAssertEqual(EditionLimits.floor,4)
        let short = EditionNumbering.rows([row("a"),row("b"),row("c"),row("surprise",desk:"bubbel")])
        XCTAssertFalse(EditionLimits.hasMinimum(EditionNumbering.count(short)))
        XCTAssertTrue(EditionLimits.hasMinimum(4))
    }
    func testNativeNumberAndWaitingLayouts() {
        for size in [DynamicTypeSize.large, .xxxLarge] {
            let content = VStack(alignment: .leading, spacing: 16) {
                EditionHeader(title: "Ochtendeditie")
                StrongRule()
                Kicker(text: "Binnenland", number: 1)
                Text("Een verhaal dat je rustig kunt lezen").font(Theme.headline(.largeTitle))
                Kicker(text: "Buiten je bubbel")
            }.padding(16).frame(width: 390).background(Theme.paper)
                .environment(\.dynamicTypeSize, size).environment(\.colorScheme, .light)
            let renderer = ImageRenderer(content: content); renderer.scale = 2
            if let image = renderer.uiImage {
                let attachment = XCTAttachment(image: image)
                attachment.name = "editie-componenten-\(size == .large ? "normaal" : "xxxl")"
                attachment.lifetime = .keepAlways; add(attachment)
            } else { XCTFail("Kop met laadmelding en nummer moet renderen") }
        }
    }
}
