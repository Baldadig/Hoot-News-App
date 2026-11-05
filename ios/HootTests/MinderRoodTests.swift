import XCTest
@testable import Hoot

// Minder rood (keuze B, 1.1.0): cijfer in inkt, rubriek in ink3, één bronlabel "N bronnen ›",
// "Groot nieuws" één keer zonder aantal, en de bron in de lezer in de bronregel onder de kop.
@MainActor final class MinderRoodTests: XCTestCase {
    func testOneSourceLabelAlwaysTheTotal() {
        XCTAssertEqual(SourceLine.label(1), "1 bron")
        XCTAssertEqual(SourceLine.label(2), "2 bronnen")
        XCTAssertEqual(SourceLine.label(12), "12 bronnen")
    }

    func testBigNewsSaysItOnceWithoutTheCount() {
        XCTAssertEqual(WhyLine.plain("Groot nieuws · 12 bronnen"), "Groot nieuws")
        XCTAssertEqual(WhyLine.plain("Groot nieuws · 1 bron"), "Groot nieuws")
        XCTAssertEqual(WhyLine.plain("Naast je bubbel · grenst aan Sport"), "Naast je bubbel · grenst aan Sport")
        XCTAssertEqual(WhyLine.plain("Vervolg op wat je las"), "Vervolg op wat je las")
    }

    func testWideDeskLabelHasNoCount() throws {
        let entry = try JSONDecoder().decode(EditionEntry.self, from: Data(#"{"kind":"story","id":"s1","desk":"breed","sourceCount":9}"#.utf8))
        XCTAssertEqual(Desk.plek(entry), "Waar iedereen over schrijft")
    }

    func testReaderPutsTheSourceUnderTheHeadline() {
        var item = Item(id: "l3", source: "nos", title: "Een kop", url: "https://example.test/a")
        let article = Article(title: item.title, content: "<p>Tekst.</p>", length: 10)
        var html = ReaderHTML.page(article, item: item, sourceName: "NOS", size: 1)
        XCTAssertFalse(html.contains(#"<p class="kicker">NOS</p>"#), "de bron is geen kicker meer")
        XCTAssertTrue(html.contains(#"<p class="meta">NOS"#), "de bron opent de bronregel onder de kop")
        XCTAssertFalse(html.contains(".kicker { font-family: -apple-system, system-ui, sans-serif; font-size: .72em; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--accent)"))
        item.section = "Binnenland"
        html = ReaderHTML.page(article, item: item, sourceName: "NOS", size: 1)
        XCTAssertTrue(html.contains(#"<p class="kicker">Binnenland</p>"#), "de kicker is de rubriek")
    }
}
