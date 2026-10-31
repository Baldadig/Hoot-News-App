import XCTest
@testable import Hoot

// Hele zinnen (T2, D2): de knip van wholeSentences moet gelijk worden aan die van het web. Dat is nog af
// te stemmen met het web: zodra er een gedeelde fixture (tests/fixtures/zinnen.json) is, leest testFixture
// die; tot dan slaat hij zichzelf over en toetst alleen testRules.
final class SentencesTests: XCTestCase {
    // ios/HootTests/SentencesTests.swift → <repo>/tests/fixtures/zinnen.json (zoals EditionParityTests).
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "tests/fixtures/zinnen.json")

    struct Case { let name: String, text: String, max: Int?, out: String }

    // De fixture: een lijst gevallen, of `{ "cases": [...] }`. Per geval de tekst (`text`/`in`), de maat
    // (`max`, weg of null = de standaard) en de uitkomst (`out`/`expected`).
    static func cases() throws -> [Case] {
        guard FileManager.default.fileExists(atPath: fixtureURL.path) else {
            throw XCTSkip("tests/fixtures/zinnen.json ontbreekt nog: de knip is nog af te stemmen met het web")
        }
        let json = try JSONSerialization.jsonObject(with: Data(contentsOf: fixtureURL))
        let list = (json as? [[String: Any]]) ?? ((json as? [String: Any])?["cases"] as? [[String: Any]]) ?? []
        return list.enumerated().compactMap { i, c in
            guard let text = (c["text"] ?? c["in"]) as? String, let out = (c["out"] ?? c["expected"]) as? String else { return nil }
            return Case(name: (c["name"] as? String) ?? "geval \(i + 1)", text: text, max: c["max"] as? Int, out: out)
        }
    }

    func testFixture() throws {
        let all = try Self.cases()
        XCTAssertFalse(all.isEmpty, "geen gevallen gelezen uit zinnen.json")
        for c in all {
            let got = c.max.map { wholeSentences(c.text, max: $0) } ?? wholeSentences(c.text)
            XCTAssertEqual(got, c.out, c.name)
        }
    }

    // De huisregels zelf, los van de fixture.
    func testRules() {
        let text = "De Tweede Kamer stemt vandaag over het plan. Het kabinet verwacht een meerderheid. Daarna volgt de Eerste Kamer."
        // Past alles: de tekst zelf.
        XCTAssertEqual(wholeSentences(text, max: 500), text)
        // Twee zinnen passen, de derde niet.
        XCTAssertEqual(wholeSentences(text, max: 90), "De Tweede Kamer stemt vandaag over het plan. Het kabinet verwacht een meerderheid.")
        // Geen hele zin: tot de laatste komma, anders niets.
        XCTAssertEqual(wholeSentences("Na een lange nacht onderhandelen, met veel koffie, kwam er toch een akkoord.", max: 50), "Na een lange nacht onderhandelen, met veel koffie")
        XCTAssertEqual(wholeSentences("Eén lange zin zonder enige komma die maar doorgaat tot ver na de maat.", max: 30), "")
        // Een decimale komma is geen zinsdeel: nooit "met 3" of "trekt 2".
        XCTAssertEqual(wholeSentences("De economie groeide in het derde kwartaal met 3,5 procent, meer dan verwacht door economen en het CPB.", max: 60), "De economie groeide in het derde kwartaal met 3,5 procent")
        XCTAssertEqual(wholeSentences("Het kabinet trekt 2,4 miljard euro uit voor de zorg in de regio's, vooral voor ouderen.", max: 48), "")
        XCTAssertEqual(wholeSentences("De economie groeide in het derde kwartaal met 3,5 procent en dat is meer dan verwacht.", max: 60), "")
        // Ook niet als de maat precies na de decimale komma valt.
        XCTAssertEqual(wholeSentences("Het kabinet trekt 2,4 miljard uit, zegt de minister vandaag in Den Haag.", max: 20), "")
        // Nooit een beletselteken aan het eind.
        XCTAssertEqual(wholeSentences("Het eerste is af. Het tweede wordt wereldni…", max: 240), "Het eerste is af.")
        XCTAssertEqual(wholeSentences("Het eerste is af. Het tweede wordt wereldni...", max: 240), "Het eerste is af.")
        // Afkortingen en initialen beëindigen geen zin.
        XCTAssertEqual(wholeSentences("Volgens dr. Jansen en o.a. J. Smit klopt het. De rest volgt later vandaag.", max: 50), "Volgens dr. Jansen en o.a. J. Smit klopt het.")
    }

    func testIntroMax() {
        XCTAssertEqual(introMax(lines: 1, thumb: false), 60)
        XCTAssertEqual(introMax(lines: 2, thumb: false), 130)
        XCTAssertEqual(introMax(lines: 3, thumb: false), 200)
        XCTAssertEqual(introMax(lines: 0, thumb: false), Int.max)
        XCTAssertEqual(introMax(lines: 0, thumb: true), Int.max)
        XCTAssertEqual(introMax(lines: 1, thumb: true), 48)
        XCTAssertEqual(introMax(lines: 2, thumb: true), 104)
        XCTAssertEqual(introMax(lines: 3, thumb: true), 160)
    }

    // De telling van de Editie: het hoofdverhaal is 01, Buiten je bubbel telt niet mee.
    func testEditionCount() {
        let item = { (id: String) in Item(id: id, source: "nos", title: id, url: "https://example.org/\(id)") }
        let rows = ["a", "b", "c", "d"].map { EditionRowModel(id: $0, item: item($0), story: nil, label: nil, desk: $0 == "c" ? "bubbel" : "binnenland") }
        XCTAssertEqual(EditionCount.numbers(rows), ["a": 1, "b": 2, "d": 3])
    }
}
