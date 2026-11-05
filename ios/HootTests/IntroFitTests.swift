import SwiftUI
import XCTest
@testable import Hoot

// Een intro wordt nooit afgekapt (huisregel: hele zinnen, nooit "…"): IntroText meet wat er in de echte
// breedte en tekstgrootte past en toont anders een zin minder, of geen intro.
@MainActor
final class IntroFitTests: XCTestCase {
    // Een lange NOS-intro: zinnen die de schatting in tekens wel laat passen, maar in de kolom te lang zijn.
    let nos = "Het kabinet trekt volgend jaar honderden miljoenen euro's extra uit voor de opvang van asielzoekers in gemeenten die structureel meer plekken beschikbaar stellen dan afgesproken. Minister Faber spreekt van een noodzakelijke stap. De Vereniging van Nederlandse Gemeenten is kritisch over de voorwaarden."

    func testKandidatenZijnHeleZinnenVanLangNaarKort() {
        let c = IntroText.candidates(nos)
        XCTAssertEqual(c.count, 3)
        XCTAssertEqual(c.first, nos)
        XCTAssertTrue(c.last!.hasSuffix("afgesproken."))
        XCTAssertTrue(c.allSatisfy { $0.hasSuffix(".") })
        XCTAssertEqual(IntroText.candidates("Eén zin."), ["Eén zin."])
    }

    private func height(_ text: String, lines: Int, width: CGFloat, size: DynamicTypeSize) -> CGFloat {
        let view = IntroText(text: text, style: .body, lines: lines).dynamicTypeSize(size)
        return UIHostingController(rootView: view).sizeThatFits(in: CGSize(width: width, height: .greatestFiniteMagnitude)).height
    }

    func testPastAltijdBinnenDeRegelsOpSEEnProMaxEnGroteTekst() {
        for width: CGFloat in [343 - 108, 343, 430 - 32] { // SE met miniatuur, SE, Pro Max
            for size: DynamicTypeSize in [.large, .xxxLarge, .accessibility2] {
                for lines in [1, 3, 4, 6] {
                    let h = height(nos, lines: lines, width: width, size: size)
                    // 1.1.1: breekt een lang woord bij AX op zijn lettergrepen (Afbreken), dan krijgt de intro één regel extra.
                    let extra = size.isAccessibilitySize && Afbreken.woorden(nos) != nos ? 1 : 0
                    let limit = IntroText.limit(lines: lines + extra, style: .body, typeSize: size)
                    XCTAssertLessThanOrEqual(h, limit, "breedte \(width), \(size), \(lines) regels")
                }
            }
        }
    }

    func testEenZinMinderInPlaatsVanAfkappen() {
        // Alles past in ruim genoeg regels; in minder regels staan minder hele zinnen (lager), maar wel iets.
        let alles = height(nos, lines: 20, width: 343, size: .large)
        let vijf = height(nos, lines: 5, width: 343, size: .large)
        XCTAssertGreaterThan(vijf, 0)
        XCTAssertLessThan(vijf, alles)
        // Past zelfs de eerste zin niet (1 regel), dan geen intro.
        XCTAssertEqual(height(nos, lines: 1, width: 235, size: .large), 0, accuracy: 0.5)
    }
}
