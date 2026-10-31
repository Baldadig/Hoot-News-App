import XCTest
@testable import Hoot

// Het label boven een verhaal (StoryLabel). De gevallen zijn dezelfde als bij src/lib/label.js op het web:
// verander je hier een regel, dan daar ook.
final class LabelTests: XCTestCase {
    private func kicker(_ topics: [String], cat: String? = nil, desk: String? = nil, interests: [String] = [], picked: [String] = []) -> String? {
        StoryLabel.kicker(topics: topics, sourceCat: cat, desk: desk, interests: interests, picked: picked)
    }

    func testSubinteresseGaatVoorRubriek() {
        XCTAssertEqual(kicker(["nederland", "europa"], interests: ["politiek"], picked: ["nederland"]), "Politiek · Den Haag")
        XCTAssertEqual(kicker(["film"], interests: ["cultuur"], picked: ["film"]), "Cultuur · Film & series")
    }
    func testZonderAangetikteSubGeenSub() {
        XCTAssertEqual(kicker(["film"], interests: ["cultuur"], picked: []), "Cultuur")
        XCTAssertEqual(kicker(["film"], interests: ["cultuur"], picked: ["muziek"]), "Cultuur")
    }
    func testRaaktHetVerhaalDeInteresseNiet_DanDeRubriek() {
        XCTAssertEqual(kicker(["voetbal"], desk: "binnenland", interests: ["cultuur"], picked: ["film"]), "Binnenland")
        XCTAssertEqual(kicker(["klimaat"], interests: ["cultuur"]), "Wetenschap")
        XCTAssertNil(kicker([], interests: ["cultuur"]))
    }
    func testEenLosBijonderwerpMaaktGeenCultuurVanHetNieuws() {
        // Rubberboot met migranten, per ongeluk ook als "film" getagd: de plek zegt Binnenland.
        XCTAssertEqual(kicker(["migratie", "film"], desk: "binnenland", interests: ["cultuur"], picked: ["film"]), "Binnenland")
        XCTAssertEqual(kicker(["migratie", "film"], desk: "buitenland", interests: ["cultuur"], picked: ["film"]), "Buitenland")
        // Gaat het verhaal er wel over (hoofdonderwerp of dezelfde plek), dan telt je interesse.
        XCTAssertEqual(kicker(["film", "migratie"], desk: "binnenland", interests: ["cultuur"], picked: ["film"]), "Cultuur · Film & series")
        XCTAssertEqual(kicker(["migratie", "zorg"], desk: "binnenland", interests: ["binnenland"], picked: []), "Binnenland")
    }
    func testEenSportbronIsSport() {
        XCTAssertEqual(kicker(["nederland"], cat: "sport", desk: "binnenland", interests: ["politiek"]), "Sport")
        XCTAssertEqual(kicker(["voetbal"], cat: "sport", interests: ["sport"], picked: ["voetbal"]), "Sport · Voetbal")
    }
    func testBronrubriekAlsErNietsAnders() {
        XCTAssertEqual(kicker([], cat: "tech"), "Tech")
    }
    func testRubriekMetAangetikteSubWintVanEersteRubriek() {
        XCTAssertEqual(kicker(["nederland", "film"], interests: ["politiek", "cultuur"], picked: ["film"]), "Cultuur · Film & series")
        XCTAssertEqual(kicker(["nederland", "film"], interests: ["politiek", "cultuur"]), "Politiek")
    }

    func testWaaromAlleenAlsHetIetsToevoegt() {
        XCTAssertNil(StoryLabel.why(code: "rubriek", text: "Rubriek Binnenland", kicker: "Binnenland"))
        XCTAssertNil(StoryLabel.why(code: "extern", text: "Buiten je bronnen", kicker: nil))
        XCTAssertNil(StoryLabel.why(code: nil, text: "  ", kicker: nil))
        XCTAssertNil(StoryLabel.why(code: nil, text: nil, kicker: "Politiek"))
    }
    func testOmdatJeVolgtValtWegAlsDeKickerHetZegt() {
        XCTAssertNil(StoryLabel.why(code: "interest", text: "Omdat je Film & series volgt", kicker: "Cultuur · Film & series"))
        XCTAssertNil(StoryLabel.why(code: "interest", text: "Omdat je Den Haag volgt", kicker: "Politiek · Den Haag"))
        XCTAssertEqual(StoryLabel.why(code: "interest", text: "Omdat je Trump volgt", kicker: "Binnenland"), "Omdat je Trump volgt")
    }
    func testWatWelBlijft() {
        XCTAssertEqual(StoryLabel.why(code: "followUp", text: "Vervolg op wat je las · 2 nieuwe stukken", kicker: "Politiek"), "Vervolg op wat je las · 2 nieuwe stukken")
        XCTAssertEqual(StoryLabel.why(code: "groot", text: "Groot nieuws · 7 bronnen", kicker: "Wereld"), "Groot nieuws · 7 bronnen")
        XCTAssertEqual(StoryLabel.why(code: "favorite", text: "Uit je voorkeursbron NRC", kicker: nil), "Uit je voorkeursbron NRC")
        XCTAssertEqual(StoryLabel.why(code: "buur", text: "Naast je bubbel · grenst aan Tech", kicker: nil), "Naast je bubbel · grenst aan Tech")
    }

    func testBuitenJeBronnenHoortBijDeBronregel() {
        XCTAssertTrue(StoryLabel.outside(desk: "extern", followed: true))
        XCTAssertTrue(StoryLabel.outside(desk: "tech", followed: false))
        XCTAssertFalse(StoryLabel.outside(desk: "tech", followed: true))
        XCTAssertFalse(StoryLabel.outside(desk: "bubbel", followed: false))
        XCTAssertFalse(StoryLabel.outside(desk: "breed", followed: false))
    }
}
