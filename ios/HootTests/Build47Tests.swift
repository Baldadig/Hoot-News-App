import XCTest
import SwiftUI
@testable import Hoot

// Build 47: Schibsted Grotesk vervangt Inter, breed zoeken, onboarding schreefloos.
@MainActor final class Build47Tests: XCTestCase {
    // De vier standen van de bediening zijn echt geladen (UIAppFonts); geen stilzwijgende systeemletter.
    func testSchibstedGroteskGeladen() {
        for name in ["SchibstedGrotesk-Regular", "SchibstedGrotesk-SemiBold", "SchibstedGrotesk-Bold", "SchibstedGrotesk-ExtraBold"] {
            XCTAssertNotNil(UIFont(name: name, size: 15), name)
        }
        XCTAssertEqual(Letters.ui(.heavy), "SchibstedGrotesk-ExtraBold")
        XCTAssertEqual(Letters.ui(.medium), "SchibstedGrotesk-Regular")
        // Inter staat niet meer in UIAppFonts: alleen de deelkaart registreert Inter 600 zelf.
        XCTAssertNil(UIFont(name: "Inter-Regular", size: 15))
    }

    func testBundelHeeftSchibstedInUIAppFonts() throws {
        let fonts = try XCTUnwrap(Bundle.main.object(forInfoDictionaryKey: "UIAppFonts") as? [String])
        XCTAssertTrue(fonts.contains("SchibstedGrotesk-800.ttf"))
        XCTAssertFalse(fonts.contains { $0.hasPrefix("Inter") })
    }

    private func item(_ id: String, source: String = "nos", title: String, summary: String? = nil, name: String? = nil, author: String? = nil, at: String = "2026-11-04T10:00:00Z") -> Item {
        Item(id: id, source: source, sourceName: name, title: title, summary: summary, url: "https://example.com/\(id)", publishedAt: at, author: author)
    }

    func testZoekenOpWoordBronEnAuteur() {
        let stream = [
            item("a", title: "Oekraïne praat over een bestand", name: "NOS"),
            item("b", source: "nrc", title: "Rente omhoog", summary: "De ECB verhoogt de rente.", name: "NRC", author: "Jan Janssen"),
        ]
        func ids(_ q: String, saved: [Item] = []) -> [String] { SearchHits.hits(query: q, stream: stream, saved: saved, muted: []).map(\.id) }
        XCTAssertEqual(ids("oekraine"), ["a"])          // accenten en hoofdletters
        XCTAssertEqual(ids("nrc"), ["b"])               // bron
        XCTAssertEqual(ids("janssen"), ["b"])           // auteur
        XCTAssertEqual(ids("ecb rente"), ["b"])         // alle woorden, in willekeurige volgorde
        XCTAssertEqual(ids("rente nos"), [])            // elk woord moet voorkomen
        XCTAssertEqual(ids("x"), [])                    // woorden van 1 teken tellen niet
    }

    func testZoekenVindtOokBewaardEnSlaatUitgezetteBronnenOver() {
        let saved = [item("s", source: "vk", title: "Een bewaard stuk over zeilen", at: "2026-10-01T10:00:00Z")]
        let stream = [item("n", title: "Zeilen op het IJsselmeer", at: "2026-11-04T09:00:00Z")]
        XCTAssertEqual(SearchHits.hits(query: "zeilen", stream: stream, saved: saved, muted: []).map(\.id), ["n", "s"], "nieuwste eerst")
        XCTAssertEqual(SearchHits.hits(query: "zeilen", stream: stream, saved: saved, muted: ["vk"]).map(\.id), ["n"])
        XCTAssertEqual(SearchHits.hits(query: "zeilen", stream: stream, saved: stream, muted: []).count, 1, "geen dubbelen als iets in Stroom én Bewaard staat")
    }
}
