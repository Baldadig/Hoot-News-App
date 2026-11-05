import XCTest
@testable import Hoot

// Stroom-kaart B (keuze 1.1.0): een post op het raster van het artikel, zonder kale link in de tekst.
// Dezelfde gevallen als withoutBareLinks in tests/editie-stroom-110.test.mjs.
final class StroomKaartTests: XCTestCase {
    func testBareLinksLeaveThePostText() {
        XCTAssertEqual(PostRow.withoutBareLinks("Valve brengt de Steam Machine uit. theverge.com/2026/11/03/valve…", domain: "www.theverge.com"), "Valve brengt de Steam Machine uit.")
        XCTAssertEqual(PostRow.withoutBareLinks("Lees dit: https://www.nrc.nl/nieuws/2026/11/04/a-b", domain: nil), "Lees dit:")
        XCTAssertEqual(PostRow.withoutBareLinks("Nieuw op theverge.com vandaag", domain: "theverge.com"), "Nieuw op vandaag")
    }

    func testOrdinaryWordsWithDotsStay() {
        XCTAssertEqual(PostRow.withoutBareLinks("Inflatie 3.7 procent, d.w.z. hoger.", domain: "nos.nl"), "Inflatie 3.7 procent, d.w.z. hoger.")
    }
}
