import XCTest
import SwiftUI
@testable import Hoot

// De laadstapel: gelijk aan het web (tests/load-stack.test.mjs, src/lib/loadStack.js).
@MainActor
final class LoadStackTests: XCTestCase {
    typealias G = LoadStackGeometry
    private func row(_ s: G.Sheet) -> [Double] { [Double(s.x), Double(s.y), Double(s.width), s.opacity] }
    private func assertNear(_ a: [Double], _ b: [Double], _ msg: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertEqual(a.count, b.count, msg, file: file, line: line)
        for (x, y) in zip(a, b) { XCTAssertEqual(x, y, accuracy: 0.0002, msg, file: file, line: line) }
    }

    func testRestCascadesOnEightPointRhythm() {
        let rest = G.sheets(at: 0, still: true)
        XCTAssertEqual(rest.prefix(4).map(\.x), [8, 16, 24, 32])
        XCTAssertEqual(rest.prefix(4).map(\.y), [8, 16, 24, 32])
        for s in rest.prefix(4) {
            XCTAssertEqual(s.width, 40); XCTAssertEqual(s.height, 24)
            XCTAssertLessThanOrEqual(s.x + s.width, G.width - 8); XCTAssertLessThanOrEqual(s.y + s.height, G.box - 8)
        }
        XCTAssertEqual(rest[4].opacity, 0)
        XCTAssertEqual(G.kop, CGRect(x: 40, y: 40, width: 16, height: 2))
        XCTAssertEqual(G.done, 0.44, accuracy: 1e-9)
    }

    // Dezelfde frames als het web (node: stackCards(200 | 600 | 1000)).
    func testFramesMatchWeb() {
        let web: [Double: [[Double]]] = [
            0.2: [[0.4314, 0.4314, 40, 0.0539], [8.4314, 8.4314, 40, 1], [16.4314, 16.4314, 40, 1], [24.4314, 24.4314, 40, 1], [48, 32, 40, 0]],
            0.6: [[0, 0, 40, 0], [8, 8, 40, 1], [16, 16, 40, 1], [24, 24, 40, 1], [32.8627, 32, 40, 1]],
            1.0: [[0, 0, 40, 0], [8, 8, 40, 1], [16, 16, 40, 1], [24, 24, 40, 1], [32, 32, 40, 1]],
        ]
        for (t, rows) in web {
            for (i, sheet) in G.sheets(at: t).enumerated() { assertNear(row(sheet), rows[i], "t=\(t) vel \(i)") }
        }
    }

    func testOneMotionAtATimeAndSeamlessLoop() {
        XCTAssertEqual(G.sheets(at: 0.2)[4], G.sheets(at: 0)[4]) // eerst schuift alleen de stapel
        for i in 0..<4 { XCTAssertEqual(G.sheets(at: 0.6)[i], G.sheets(at: 0.4)[i]) } // dan alleen het nieuwe vel
        XCTAssertEqual(G.sheets(at: 0.8), G.sheets(at: 1.5)) // dan stil
        func visible(_ list: [G.Sheet]) -> [String] { list.filter { $0.opacity > 0.001 }.map { "\($0.x),\($0.y),\($0.width)" }.sorted() }
        XCTAssertEqual(visible(G.sheets(at: 1.599)), visible(G.sheets(at: 0, still: true)))
        XCTAssertEqual(visible(G.sheets(at: 1.6 * 9 + 1.2)), visible(G.sheets(at: 0, still: true))) // lang laden: kalm door
    }

    func testAccessibilityKeepsMeaning() {
        XCTAssertEqual(LoadStackView().label, "Even kijken bij je bronnen")
    }

    func testRendersInLightAndDark() {
        for (name, scheme) in [("licht", ColorScheme.light), ("donker", .dark)] {
            let view = VStack(spacing: 0) {
                LoadStackView(still: false).frame(height: 240)
                LoadStackArt(sheets: G.sheets(at: 0.2)).frame(height: 96)
                LoadStackArt(sheets: G.sheets(at: 0.6)).frame(height: 96)
                LoadStackArt(sheets: G.sheets(at: 0, still: true), kop: 1).frame(height: 96)
            }
            .frame(width: 390).background(Theme.paper).environment(\.colorScheme, scheme)
            let renderer = ImageRenderer(content: view); renderer.scale = 3
            guard let image = renderer.uiImage else { return XCTFail("laadstapel moet renderen (\(name))") }
            XCTAssertEqual(image.size.width, 390)
            let attachment = XCTAttachment(image: image); attachment.name = "laadstapel-\(name)"
            attachment.lifetime = .keepAlways; add(attachment)
        }
    }
}
