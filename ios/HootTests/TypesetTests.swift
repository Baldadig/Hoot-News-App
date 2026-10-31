import XCTest
@testable import Hoot

// Eén typografische hand (T6, D3): typeset() moet hetzelfde zetten als shared/typeset.mjs. testFixture
// leest de gedeelde fixture (tests/fixtures/typeset.json, die tests/typeset.test.mjs op het web ook draait);
// testRules toetst daarnaast de voorbeelden uit T6.
final class TypesetTests: XCTestCase {
    // ios/HootTests/TypesetTests.swift → <repo>/tests/fixtures/typeset.json (zoals SentencesTests).
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "tests/fixtures/typeset.json")

    struct Case { let name: String, text: String, lang: String?, out: String }

    // De fixture: `{ "typeset": [...] }` (zoals het web hem schrijft), of een lijst / `{ "cases": [...] }`.
    // Per geval de tekst (`invoer`), de taal (`lang`, weg of null = Nederlands) en de uitkomst (`verwacht`).
    static func cases() throws -> [Case] {
        guard FileManager.default.fileExists(atPath: fixtureURL.path) else {
            throw XCTSkip("tests/fixtures/typeset.json ontbreekt")
        }
        let json = try JSONSerialization.jsonObject(with: Data(contentsOf: fixtureURL))
        let dict = json as? [String: Any]
        let list = (json as? [[String: Any]]) ?? (dict?["typeset"] as? [[String: Any]]) ?? (dict?["cases"] as? [[String: Any]]) ?? []
        return list.enumerated().compactMap { i, c in
            guard let text = (c["invoer"] ?? c["text"] ?? c["in"]) as? String,
                  let out = (c["verwacht"] ?? c["out"] ?? c["expected"]) as? String else { return nil }
            let name = (c["naam"] ?? c["name"]) as? String ?? "geval \(i + 1)"
            return Case(name: name, text: text, lang: c["lang"] as? String, out: out)
        }
    }

    func testFixture() throws {
        let all = try Self.cases()
        XCTAssertFalse(all.isEmpty, "geen gevallen gelezen uit typeset.json")
        for c in all {
            XCTAssertEqual(typeset(c.text, lang: c.lang), c.out, c.name)
            // Idempotent: de uitkomst nog eens zetten verandert niets.
            XCTAssertEqual(typeset(c.out, lang: c.lang), c.out, "\(c.name) (twee keer)")
        }
    }

    // De huisregels zelf, los van de fixture.
    func testRules() {
        let nl = { (s: String) in typeset(s, lang: "nl") }
        // Aanhalingstekens uit de krant (de voorbeelden uit T6).
        XCTAssertEqual(nl("Christa Pike reageert na mislukte executie: 'Ik heb constant pijn'"), "Christa Pike reageert na mislukte executie: ‘Ik heb constant pijn’")
        XCTAssertEqual(nl("Minister: \"Dit is niet genoeg\""), "Minister: ‘Dit is niet genoeg’")
        XCTAssertEqual(nl("('Nee', zei ze)"), "(‘Nee’, zei ze)")
        // Jaartallen met een kastlijntje (alleen twee hele jaartallen, zoals het web); een datum niet.
        XCTAssertEqual(nl("acteur Patrick Stewart (1940-2026) overleden"), "acteur Patrick Stewart (1940–2026) overleden")
        XCTAssertEqual(nl("seizoen 2025-26"), "seizoen 2025-26")
        XCTAssertEqual(nl("op 2026-10-31 bekend"), "op 2026-10-31 bekend")
        XCTAssertEqual(nl("bel 0201-1234"), "bel 0201-1234")
        // Streepje tussen woorden, beletselteken, dubbele spaties.
        XCTAssertEqual(nl("Ajax wint - en hoe"), "Ajax wint – en hoe")
        XCTAssertEqual(nl("En toen..."), "En toen…")
        XCTAssertEqual(nl("Twee  spaties   te veel"), "Twee spaties te veel")
        // Apostrof: binnen een woord en vooraan.
        XCTAssertEqual(nl("Hij doet z'n best in 's-Hertogenbosch"), "Hij doet z’n best in ’s-Hertogenbosch")
        XCTAssertEqual(nl("de jaren '90 en 's avonds"), "de jaren ’90 en ’s avonds")
        XCTAssertEqual(typeset("Trump's plan for 'peace'", lang: "en"), "Trump’s plan for ‘peace’")
        // Vaste spatie tussen getal en eenheid; geen eenheid, geen vaste spatie.
        XCTAssertEqual(nl("file van 12 km bij 20 °C"), "file van 12\u{00A0}km bij 20\u{00A0}°C")
        XCTAssertEqual(nl("groei van 3 %"), "groei van 3\u{00A0}%")
        XCTAssertEqual(nl("3 miljoen mensen"), "3 miljoen mensen")
        XCTAssertEqual(nl("5 mensen"), "5 mensen")
        // Nooit in een URL.
        XCTAssertEqual(nl("Lees 'dit' op https://nos.nl/a-b-1940-2026...x"), "Lees ‘dit’ op https://nos.nl/a-b-1940-2026...x")
        XCTAssertEqual(nl("zie www.nu.nl/2025-26... - nu"), "zie www.nu.nl/2025-26... – nu")
        // Alleen Nederlands en Engels; geen taal of een andere taal blijft letterlijk (zoals het web).
        XCTAssertEqual(typeset("Il dit 'non' - 1940-2026", lang: "fr"), "Il dit 'non' - 1940-2026")
        XCTAssertEqual(typeset("Zij zegt 'ja'", lang: nil), "Zij zegt 'ja'")
        // Idempotent.
        for s in ["Pike: 'Ik heb constant pijn' (1940-2026) - 12 km...", "z'n 's-Hertogenbosch \"citaat\""] {
            XCTAssertEqual(nl(nl(s)), nl(s), s)
        }
    }
}
