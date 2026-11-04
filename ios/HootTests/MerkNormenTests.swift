import XCTest
import SwiftUI
@testable import Hoot

// Pakket Merk en normen (1.1.0): web = app voor het logovlak, de leesbreedte en de pull-strook.
@MainActor final class MerkNormenTests: XCTestCase {
    private func hex(_ color: UIColor, _ traits: UITraitCollection) -> UInt32 {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        color.resolvedColor(with: traits).getRed(&r, green: &g, blue: &b, alpha: &a)
        return UInt32((r * 255).rounded()) << 16 | UInt32((g * 255).rounded()) << 8 | UInt32((b * 255).rounded())
    }
    // ds-toets 7 en 8: het vlak achter een uitgeverslogo is --mark-bg, geen wit in elk thema.
    func testLogovlakVolgtMarkBgVanHetWeb() {
        let licht = UITraitCollection(userInterfaceStyle: .light)
        let donker = UITraitCollection(userInterfaceStyle: .dark)
        let nacht = UITraitCollection { $0.userInterfaceStyle = .dark; $0[NachtTrait.self] = true }
        XCTAssertEqual(hex(NachtKleur.markBg, licht), 0xffffff)
        XCTAssertEqual(hex(NachtKleur.markBg, donker), 0xf1ece2)
        XCTAssertEqual(hex(NachtKleur.markBg, nacht), 0xd8d0c2)
    }
    // ds-toets 15 en de keuze voor de leesbreedte: iOS 680, de lijntekening 96 (web --readable/--art).
    func testVasteMatenGelijkAanHetWeb() {
        XCTAssertEqual(Layout.readable, 680)
        XCTAssertEqual(Layout.emptyIcon, 96)
    }
    // De strook sluit op de bewegingsschaal: de h. vervaagt in 140 ms, de strook glijdt dicht in 400 ms.
    func testPullStrookSluitOpDeSchaal() {
        XCTAssertEqual(RefreshStrip.fadeOut, 0.14)
        XCTAssertEqual(RefreshStrip.close, 0.4)
        XCTAssertTrue([0.14, 0.2, 0.4].contains(RefreshStrip.close))
    }
}
