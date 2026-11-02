import XCTest
import SwiftUI
@testable import Hoot

@MainActor
final class ReaderLoginPanelTests: XCTestCase {
    func testOneLineMeasurements() {
        for category in [UIContentSizeCategory.large, .extraExtraExtraLarge] {
            let traits = UITraitCollection(preferredContentSizeCategory: category)
            let size = UIFont.preferredFont(forTextStyle: .headline, compatibleWith: traits).pointSize
            let font = UIFont.systemFont(ofSize: size, weight: .heavy)
            for source in ["The Atlantic", "Noordhollands Dagblad", "Dagblad van het Noorden"] {
                let width = ("Log in bij \(source)" as NSString).size(withAttributes: [.font: font]).width
                print("INLOGMAAT \(category.rawValue) \(source): \(width) beschikbaar 310")
            }
        }
    }
    func testFutureSourceWrapsWithoutANameList() {
        func height(_ name: String) -> CGFloat {
            let view = ReaderLoginPanel(sourceName: name, login: {}, close: {})
                .environment(\.dynamicTypeSize, .xxxLarge).frame(width: 390)
            return UIHostingController(rootView: view).sizeThatFits(in: CGSize(width: 390, height: 2000)).height
        }
        XCTAssertGreaterThan(height("Een nieuwe internationale onderzoeksredactie"), height("The Atlantic") + 15)
    }
    func testPanelLayoutsKeepFullSourceName() throws {
        for (name, size, dark) in [("normaal", DynamicTypeSize.large, false), ("xxxl", .xxxLarge, false), ("donker", .large, true), ("ax1", .accessibility1, false), ("xxxl-twee-regels", .xxxLarge, false), ("ax5", .accessibility5, false), ("ax5-lange-bron", .accessibility5, false)] {
            let view = ReaderLoginPanel(sourceName: (name == "xxxl-twee-regels" || name == "ax5-lange-bron") ? "Dagblad van het Noorden" : "The Atlantic", login: {}, close: {})
                .environment(\.dynamicTypeSize, size)
                .environment(\.colorScheme, dark ? .dark : .light)
                .frame(width: 390)
            let host = UIHostingController(rootView: view)
            let fit = host.sizeThatFits(in: CGSize(width: 390, height: 2000))
            XCTAssertGreaterThan(fit.height, 100)
            XCTAssertLessThan(fit.height, 600, "Paneel past zonder afgesneden inhoud")
            let renderer = ImageRenderer(content: view); renderer.scale = 2
            let image = try XCTUnwrap(renderer.uiImage)
            let attachment = XCTAttachment(image: image)
            attachment.name = "inlogpaneel-\(name)"; attachment.lifetime = .keepAlways; add(attachment)
        }
    }
}
