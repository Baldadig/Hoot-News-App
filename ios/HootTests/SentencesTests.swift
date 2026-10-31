import XCTest
@testable import Hoot

// Hele zinnen (T2, D2): de knip van wholeSentences is gelijk aan die van het web. testFixture leest de
// gedeelde fixture (tests/fixtures/zinnen.json), die tests/zinnen.test.mjs op het web ook draait.
final class SentencesTests: XCTestCase {
    // ios/HootTests/SentencesTests.swift → <repo>/tests/fixtures/zinnen.json (zoals EditionParityTests).
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "tests/fixtures/zinnen.json")

    struct Case { let name: String, text: String, max: Int, rek: Int?, out: String }

    // De fixture: `{ "zinnen": [...] }` (zoals het web hem schrijft), of een lijst / `{ "cases": [...] }`.
    // Per geval de tekst (`invoer`), de maat (`max`, null = alles), `rek` (weg = max) en de uitkomst (`verwacht`).
    static func cases() throws -> [Case] {
        guard FileManager.default.fileExists(atPath: fixtureURL.path) else {
            throw XCTSkip("tests/fixtures/zinnen.json ontbreekt")
        }
        let json = try JSONSerialization.jsonObject(with: Data(contentsOf: fixtureURL))
        let dict = json as? [String: Any]
        let list = (json as? [[String: Any]]) ?? (dict?["zinnen"] as? [[String: Any]]) ?? (dict?["cases"] as? [[String: Any]]) ?? []
        return list.enumerated().compactMap { i, c in
            guard let text = (c["invoer"] ?? c["text"] ?? c["in"]) as? String,
                  let out = (c["verwacht"] ?? c["out"] ?? c["expected"]) as? String else { return nil }
            let name = (c["naam"] ?? c["name"]) as? String ?? "geval \(i + 1)"
            return Case(name: name, text: text, max: c["max"] as? Int ?? Int.max, rek: c["rek"] as? Int, out: out)
        }
    }

    func testFixture() throws {
        let all = try Self.cases()
        XCTAssertFalse(all.isEmpty, "geen gevallen gelezen uit zinnen.json")
        for c in all {
            let got = wholeSentences(c.text, max: c.max, rek: c.rek)
            XCTAssertEqual(got, c.out, c.name)
            XCTAssertFalse(got.hasSuffix("…") || got.hasSuffix("..."), "\(c.name): nooit een beletselteken")
        }
    }

    // introMax(lines:width:font:) gelijk aan introMax in shared/zinnen.mjs ('alles' = 0, null = alles).
    func testIntroMaxFixture() throws {
        let json = try JSONSerialization.jsonObject(with: Data(contentsOf: Self.fixtureURL)) as? [String: Any]
        let list = json?["introMax"] as? [[String: Any]] ?? []
        XCTAssertFalse(list.isEmpty, "geen introMax-gevallen in zinnen.json")
        for c in list {
            let lines = c["lines"] as? Int ?? 0
            let width = (c["width"] as? NSNumber)?.doubleValue ?? 0, font = (c["font"] as? NSNumber)?.doubleValue ?? 0
            let want = c["verwacht"] as? [String: Any] ?? [:]
            let got = introMax(lines: lines, width: width, font: font)
            XCTAssertEqual(got.max, want["max"] as? Int ?? Int.max, "max \(c)")
            XCTAssertEqual(got.rek, want["rek"] as? Int ?? Int.max, "rek \(c)")
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
}
