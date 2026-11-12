import XCTest
import SwiftUI
@testable import Hoot

// Placeholderbeelden zoals de app ze tekent, als PNG's om naast het web te leggen (keuring van een nieuwe
// ronde). Draait alleen met TEST_RUNNER_HOOT_PLACEHOLDER_UIT=<map> bij xcodebuild test; anders overgeslagen.
// Per beeld: Licht, Donker en Nacht, groot 2:1 (344 × 172) en 3:2 (344 × 229), en klein (96 × 64), op 3×.
final class PlaceholderRenderTests: XCTestCase {
    @MainActor
    func testSchrijfAlleBeelden() throws {
        guard let map = ProcessInfo.processInfo.environment["HOOT_PLACEHOLDER_UIT"], !map.isEmpty else {
            throw XCTSkip("zet TEST_RUNNER_HOOT_PLACEHOLDER_UIT om de beelden te schrijven")
        }
        let uit = URL(fileURLWithPath: map)
        try FileManager.default.createDirectory(at: uit, withIntermediateDirectories: true)
        let maten: [(String, CGSize)] = [("groot", CGSize(width: 344, height: 172)), ("groot32", CGSize(width: 344, height: 229)), ("klein", CGSize(width: 96, height: 64))]
        let themas: [(String, ColorScheme, Bool)] = [("licht", .light, false), ("donker", .dark, false), ("nacht", .dark, true)]
        for i in PlaceholderBeelden.beelden.indices {
            for (thema, scheme, nacht) in themas {
                for (naam, size) in maten {
                    let view = PlaceholderBeeld(index: i, klein: naam == "klein")
                        .frame(width: size.width, height: size.height)
                        .environment(\.colorScheme, scheme)
                        .environment(\.nachtActief, nacht)
                    let renderer = ImageRenderer(content: view)
                    renderer.scale = 3
                    let start = Date()
                    let image = try XCTUnwrap(renderer.uiImage)
                    // Snel genoeg voor een lijst: ruim onder een frame per beeld, ook in de simulator.
                    XCTAssertLessThan(Date().timeIntervalSince(start), 0.25, "beeld \(i + 1) \(thema) \(naam)")
                    XCTAssertEqual(image.size, size)
                    try XCTUnwrap(image.pngData()).write(to: uit.appending(path: "beeld-\(i + 1)-\(thema)-\(naam).png"))
                }
            }
        }
    }
}
