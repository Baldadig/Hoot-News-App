import XCTest
@testable import Hoot

// Selectie-review 14 november: wat de app van de nieuwe weekbundel laat zien, gelijk aan Vak.jsx
// (tests/selectie-betaald.test.mjs en verder).
final class SelectieReviewTests: XCTestCase {
    // Punt 9: een betaalde vakbron draagt `paid` mee; zonder het veld (een oude bundel) is het stuk gratis.
    func testDigestItemCarriesPaid() throws {
        let json = #"{"id":"2026-W45","fields":[{"id":"film","label":"Film & series","top":[{"id":"a","source":"vak:vk-films","title":"Recensie","url":"https://www.volkskrant.nl/a","paid":true},{"id":"b","source":"vak:filmkrant","title":"Essay","url":"https://filmkrant.nl/b"}],"more":[]}]}"#
        let digest = try JSONDecoder().decode(Digest.self, from: Data(json.utf8))
        let top = digest.fields[0].top
        XCTAssertEqual(top[0].paid, true)
        XCTAssertNil(top[1].paid)
    }
}

extension SelectieReviewTests {
    // Punt 6: het slot onder het laatste onderwerp, gelijk aan SLOT in src/lib/selection-index.js.
    func testSlotText() {
        XCTAssertEqual(SelectionOverview.slot, ["Je weet genoeg.", "Maandag een nieuwe."])
    }
}

extension SelectieReviewTests {
    // Punt 12: "drie stukken" in plaats van "het beste", gelijk aan CHOOSE in src/lib/selection-index.js.
    func testCopyPromisesThreePieces() {
        XCTAssertEqual(SelectionOverview.choose, "Elke maandag drie stukken over je werk of hobby. Kies waarover.")
        XCTAssertFalse(SelectionOverview.voorproef.contains("beste"))
    }
}

// Besluiten 15 november: de maat, de taal en Sport en Geschiedenis uit de keuze (tests/selectie-maat-taal.test.mjs).
extension SelectieReviewTests {
    func testHooguitAcht() {
        let acht = ["merk", "seo", "pr", "ux", "ai", "dev", "data", "hr"]
        XCTAssertEqual(SelectionOverview.max, 8)
        XCTAssertTrue(SelectionOverview.canChoose(Array(acht.prefix(7)), "film"))
        XCTAssertFalse(SelectionOverview.canChoose(acht, "film"))
        XCTAssertTrue(SelectionOverview.canChoose(acht, "ux"), "weghalen kan altijd")
        XCTAssertEqual(SelectionOverview.maxTekst, "Kies er hooguit acht. Dan lees je het ook uit.")
    }

    func testTaal() throws {
        XCTAssertTrue(SelectionOverview.englishOn(nil, followsEnglish: true))
        XCTAssertFalse(SelectionOverview.englishOn(nil, followsEnglish: false))
        XCTAssertFalse(SelectionOverview.englishOn(false, followsEnglish: true))
        let json = #"{"id":"2026-W45","fields":[{"id":"ux","label":"UI/UX","about":"Interfaces · Vooral Engelstalig","top":[{"id":"a","source":"vak:nngroup","title":"Usability 101","url":"https://nngroup.com/a","lang":"en"},{"id":"b","source":"vak:frankwatching","title":"Toegankelijk ontwerpen","url":"https://frankwatching.com/b","lang":"nl"},{"id":"c","source":"vak:x","title":"Zonder taal","url":"https://x.nl/c"}],"more":[]}]}"#
        let top = try JSONDecoder().decode(Digest.self, from: Data(json.utf8)).fields[0].top
        XCTAssertEqual(SelectionOverview.inLanguage(top, english: true).map(\.id), ["a", "b", "c"])
        XCTAssertEqual(SelectionOverview.inLanguage(top, english: false).map(\.id), ["b", "c"])
        XCTAssertEqual(SelectionOverview.engels, "Ook Engelstalige stukken")
    }

    func testSportEnGeschiedenisUitDeKeuze() {
        XCTAssertEqual(DigestFieldsList.uitKeuze, ["sport", "geschiedenis"])
        XCTAssertFalse(DigestFieldsList.inKeuze("sport", chosen: []))
        XCTAssertTrue(DigestFieldsList.inKeuze("sport", chosen: ["sport"]))
        XCTAssertTrue(DigestFieldsList.inKeuze("film", chosen: []))
    }
}
