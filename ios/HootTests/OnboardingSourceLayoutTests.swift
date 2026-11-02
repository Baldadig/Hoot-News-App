import XCTest
import SwiftUI
@testable import Hoot

@MainActor
final class OnboardingSourceLayoutTests: XCTestCase {
    func testLangeBronnamenHebbenDezelfdeGemetenHoogteBijDrieTekstgroottes() throws {
        for (label, size, width) in [("Large", DynamicTypeSize.large, 83.5), ("XXXL", .xxxLarge, 175.0), ("AX5", .accessibility5, 358.0)] {
            let height = WelcomePages.sourceCardHeight(size)
            let sources = [Source(id: "nos", name: "NOS", lang: "nl"), Source(id: "long", name: "Noordhollands Dagblad", paid: true, lang: "en"), Source(id: "wsj", name: "The Wall Street Journal", paid: true, lang: "en")]
            for source in sources {
                let tile = SourceTile(source: source, on: true, height: height, action: {})
                    .frame(width: width).environment(\.dynamicTypeSize, size)
                let host = UIHostingController(rootView: tile)
                let measured = host.sizeThatFits(in: CGSize(width: width, height: 1000))
                XCTAssertEqual(measured.height, height, accuracy: 0.5, "\(label), \(source.name)")
                XCTAssertEqual(measured.width, width, accuracy: 0.5)
            }
            let sheet = VStack(spacing: 8) {
                ForEach(sources) { source in
                    SourceTile(source: source, on: true, height: height, action: {})
                }
            }.frame(width: width).padding(16).background(Theme.paper).environment(\.dynamicTypeSize, size)
            let renderer = ImageRenderer(content: sheet)
            renderer.scale = 2
            let image = try XCTUnwrap(renderer.uiImage)
            let attachment = XCTAttachment(image: image)
            attachment.name = "onboarding-bronkaarten-\(label).png"
            attachment.lifetime = .keepAlways; add(attachment)
        }
    }
}
