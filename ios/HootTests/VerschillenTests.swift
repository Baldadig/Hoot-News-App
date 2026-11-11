import XCTest
import SwiftUI
@testable import Hoot

// Waar media verschillen in Vergelijken: de app leest `story.verschillen` zoals het web
// (shared/verschillen.mjs) en valt nooit om een kapot veld.
final class VerschillenTests: XCTestCase {
    private func story(_ json: String) throws -> Story {
        try JSONDecoder().decode(Story.self, from: Data(json.utf8))
    }

    func testBlokInVasteVolgordeMetTypografie() throws {
        let s = try story("""
        {"id":"s1","itemIds":["a"],"verschillen":{"versie":1,"delen":[
          {"soort":"onbekend","tekst":"Nog open is wat de VVD vindt."},
          {"soort":"verschil","tekst":"Het ND noemt 1 miljard euro, zo'n bedrag."},
          {"soort":"gedeeld","tekst":"Alle negen bronnen melden een deal."}]}}
        """)
        let delen = try XCTUnwrap(s.verschillen?.getoond)
        XCTAssertEqual(delen.map(\.soort), ["gedeeld", "verschil", "onbekend"])
        XCTAssertEqual(delen[1].tekst, "Het ND noemt 1\u{00A0}miljard euro, zo’n bedrag.")
        XCTAssertEqual(s.verschillen?.versie, 1)
    }

    // Gelijk aan zetTekst op het web: "e-mail" breekt niet na "e-", "Noord-Ierland" blijft gewoon.
    func testVastStreepjeNaKortVoorvoegsel() {
        XCTAssertEqual(StoryVerschillen.zet("noemt de e-mail anoniem"), "noemt de e\u{2011}mail anoniem")
        XCTAssertEqual(StoryVerschillen.zet("Noord-Ierland"), "Noord-Ierland")
    }

    func testZonderVerschilOfAlleenEenVerschilNiets() throws {
        XCTAssertNil(try story(#"{"id":"s","itemIds":[],"verschillen":{"delen":[{"soort":"gedeeld","tekst":"x"},{"soort":"onbekend","tekst":"y"}]}}"#).verschillen?.getoond)
        XCTAssertNil(try story(#"{"id":"s","itemIds":[],"verschillen":{"delen":[{"soort":"verschil","tekst":"x"}]}}"#).verschillen?.getoond)
        XCTAssertNil(try story(#"{"id":"s","itemIds":[]}"#).verschillen)
    }

    func testKapotVeldLaatHetVerhaalStaan() throws {
        let s = try story(#"{"id":"s","itemIds":["a"],"sourceCount":3,"verschillen":"kapot"}"#)
        XCTAssertEqual(s.sourceCount, 3)
        XCTAssertNil(s.verschillen?.getoond)
        let t = try story(#"{"id":"t","itemIds":[],"verschillen":{"delen":[{"soort":"gedeeld"},{"soort":"verschil","tekst":"Wel."},{"soort":"gedeeld","tekst":"Ook."}]}}"#)
        XCTAssertEqual(t.verschillen?.getoond?.map(\.tekst), ["Ook.", "Wel."])
    }

    // Bewaren en terugzetten (de app bewaart verhalen) houdt het blok.
    func testBewarenEnTerugzetten() throws {
        let s = Story(id: "s", itemIds: ["a"], verschillen: StoryVerschillen(delen: [.init(soort: "gedeeld", tekst: "A."), .init(soort: "verschil", tekst: "B.")], versie: 1))
        let terug = try JSONDecoder().decode(Story.self, from: JSONEncoder().encode(s))
        XCTAssertEqual(terug.verschillen, s.verschillen)
    }

    // Label en voetregel gelijk aan het web.
    func testGelijkAanWeb() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let js = try String(contentsOf: root.appendingPathComponent("shared/verschillen.mjs"), encoding: .utf8)
        XCTAssertTrue(js.contains("VERSCHILLEN_LABEL = '\(StoryVerschillen.label)'"))
        XCTAssertTrue(js.contains("VERSCHILLEN_VOET = '\(StoryVerschillen.voet)'"))
    }

    @MainActor
    func testSectieRendert() throws {
        let view = VerschillenSectie(delen: [.init(soort: "gedeeld", tekst: "Alle negen bronnen melden een deal."), .init(soort: "verschil", tekst: "Het woord verschilt.")])
            .frame(width: 358)
        let r = ImageRenderer(content: view)
        r.scale = 2
        XCTAssertNotNil(r.uiImage)
    }
}
