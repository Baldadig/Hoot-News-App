import XCTest
@testable import Hoot

// Build 48 (1.1.0): de ongebruikte Inter-bestanden gaan niet meer mee in de app. Ze staan nog in
// Resources/Fonts, maar het Xcode-project zondert ze uit (PBXFileSystemSynchronizedBuildFileExceptionSet).
final class Build48Tests: XCTestCase {
    func testInterNietInDeBundel() {
        for (name, ext) in [("Inter-400", "ttf"), ("Inter-600", "ttf"), ("Inter-700", "ttf"), ("Inter-800", "ttf"),
                            ("Lezer-Inter-400", "woff"), ("Lezer-Inter-800", "woff"), ("OFL-Inter", "txt")] {
            XCTAssertNil(Bundle.main.url(forResource: name, withExtension: ext), "\(name).\(ext)")
        }
    }

    // Wat wel nodig is, blijft: de deelkaart (Schibsted 600, Newsreader 800) en de lezer (variant 4).
    func testWatGebruiktWordtBlijft() {
        for (name, ext) in [("SchibstedGrotesk-600", "ttf"), ("Newsreader-800", "ttf"), ("NewsreaderTekst-450", "ttf"), ("NewsreaderTekst-480", "ttf"),
                            ("Lezer-NewsreaderTekst-450", "woff"), ("Lezer-NewsreaderTekst-480", "woff"), ("OFL-SchibstedGrotesk", "txt"), ("OFL-Newsreader", "txt")] {
            XCTAssertNotNil(Bundle.main.url(forResource: name, withExtension: ext), "\(name).\(ext)")
        }
        XCTAssertFalse(ReaderFonts.css(night: false).isEmpty)
    }
}
