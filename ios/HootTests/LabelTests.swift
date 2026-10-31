import XCTest
@testable import Hoot

// Het label boven een verhaal (StoryLabel). Elk geval hieronder is hetzelfde als in tests/label.test.mjs op
// het web, in dezelfde volgorde: verander je hier een regel of geval, dan daar ook. De laatste test is een
// aanvulling die het web nog moet overnemen (zie StoryLabel.label).
final class LabelTests: XCTestCase {
    private let follows = ["nederland", "film", "oekraine"]
    private func l(_ topics: [String] = [], follows: [String]? = nil, cat: String? = nil, desk: String? = nil, deskLabel: String? = nil, section: String? = nil, code: String? = nil, text: String? = nil, followed: Bool = true) -> StoryLabel.Result {
        StoryLabel.label(topics: topics, follows: follows ?? self.follows, cat: cat, desk: desk, deskLabel: deskLabel, section: section, whyCode: code, whyText: text, followed: followed)
    }

    func testVerhaalOverEenOnderwerpDatJeVolgt_InteresseOnderwerp() {
        XCTAssertEqual(l(["nederland"], deskLabel: "Binnenland").kicker, "Politiek · Den Haag")
        XCTAssertEqual(l(["film", "muziek"], deskLabel: "Cultuur").kicker, "Cultuur · Film & series")
        XCTAssertEqual(l(["oekraine"], deskLabel: "Oekraïne").kicker, "Wereld · Oekraïne & Rusland")
    }

    func testRaaktHetVerhaalNietsWatJeVolgt_DeRubriek() {
        XCTAssertEqual(l(["wonen"], deskLabel: "Binnenland").kicker, "Binnenland")
        XCTAssertEqual(l([], follows: [], section: "Economie").kicker, "Economie")
        XCTAssertNil(StoryLabel.label().kicker)
    }

    func testEenSportbronIsSport() {
        XCTAssertEqual(l(cat: "sport", deskLabel: "Binnenland").kicker, "Sport")
        XCTAssertEqual(l(["nederland"], cat: "sport").kicker, "Politiek · Den Haag") // je interesse gaat voor
    }

    func testHetWaaromAlleenAlsDieIetsToevoegt() {
        let omdat = "Omdat je Den Haag volgt"
        XCTAssertNil(l(["nederland"], code: "interest", text: omdat).why) // de kicker zegt het al
        XCTAssertEqual(l(["wonen"], code: "interest", text: omdat).why, omdat) // de kicker zegt het niet
        for (code, text) in [("followUp", "Vervolg op wat je las · 2 nieuwe stukken"), ("groot", "Groot nieuws · 11 bronnen"), ("favorite", "Uit je voorkeursbron NOS"), ("buur", "Naast je bubbel · grenst aan Sport")] {
            XCTAssertEqual(l(["nederland"], code: code, text: text).why, text)
        }
        for code in ["rubriek", "extern", "bubbel", "breed"] { XCTAssertNil(l(code: code, text: "x").why) }
        XCTAssertNil(l(code: "groot", text: "  ").why)
    }

    func testBuitenJeBronnenHoortBijDeBronregel_NietBijDeKicker() {
        let a = l(desk: "extern", deskLabel: "Buiten je bronnen", section: "Wereld", code: "extern", text: "Buiten je bronnen")
        XCTAssertTrue(a.outside)
        XCTAssertEqual(a.kicker, "Wereld")
        XCTAssertNil(a.why)
        let b = l(deskLabel: "Tech", followed: false)
        XCTAssertEqual(b.kicker, "Tech")
        XCTAssertTrue(b.outside)
        XCTAssertFalse(l(deskLabel: "Tech").outside)
    }

    func testBuitenJeBubbelEnWaarIedereenOverSchrijftBlijvenHunEigenKicker() {
        XCTAssertEqual(l(["nederland"], desk: "bubbel", deskLabel: "Buiten je bubbel · via Google Trends").kicker, "Buiten je bubbel · via Google Trends")
        XCTAssertEqual(l(["nederland"], desk: "breed", deskLabel: "Waar iedereen over schrijft · 9 bronnen").kicker, "Waar iedereen over schrijft · 9 bronnen")
    }

    // De plek van De Redacteur in de Editie (Desk.plek): Buiten je bubbel noemt waar het vandaan komt.
    func testDePlekZegtWaarHetVandaanKomt() {
        func entry(_ desk: String, count: Int? = nil, via: [String] = []) -> EditionEntry {
            EditionEntry(kind: "item", id: "a", desk: desk, sourceCount: count, terms: via.map { EntryTerm(term: "x", via: $0) })
        }
        XCTAssertEqual(Desk.plek(entry("bubbel", via: ["google", "bluesky", "google"])), "Buiten je bubbel · via Google Trends en Bluesky")
        XCTAssertEqual(Desk.plek(entry("bubbel")), "Buiten je bubbel")
        XCTAssertEqual(Desk.plek(entry("breed", count: 9)), "Waar iedereen over schrijft · 9 bronnen")
        XCTAssertEqual(Desk.plek(entry("binnenland")), "Binnenland")
    }

    // Aanvulling op het web: een los bijonderwerp maakt er geen interesse van (zie StoryLabel.label).
    func testEenLosBijonderwerpMaaktGeenCultuurVanHetNieuws() {
        XCTAssertEqual(l(["migratie", "film"], desk: "binnenland", deskLabel: "Binnenland").kicker, "Binnenland")
        XCTAssertEqual(l(["film", "migratie"], desk: "binnenland", deskLabel: "Binnenland").kicker, "Cultuur · Film & series")
    }
}
