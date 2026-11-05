import XCTest
@testable import Hoot

// De lezer sluit zijn letters als data-URL in elke pagina in. Met de volle TTF's was dat ± 1 MB per
// artikel (keuring tekstfont); nu kleine latin-WOFF's van alleen de gebruikte standen.
final class LezerLettersTests: XCTestCase {
    func testAlleStandenAanwezigEnKlein() {
        for night in [false, true] {
            let css = ReaderFonts.css(night: night)
            XCTAssertEqual(css.components(separatedBy: "@font-face").count - 1, 6, "zes standen: kop, tekst, vet, cursief, Schibsted Grotesk 400 en 800")
            XCTAssertFalse(css.contains("font/ttf"))
            XCTAssertTrue(css.contains("data:font/woff;base64,"))
            XCTAssertLessThan(ReaderFonts.bytes(night: night), 300_000, "letters per artikel")
        }
    }
}
