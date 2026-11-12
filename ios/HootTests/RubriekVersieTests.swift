import XCTest
@testable import Hoot

// Rubrieken, fase 2 (1.3): Games van Tech naar Cultuur, nieuwe namen. De id's blijven gelijk en niemand verliest een
// keuze: bewaarde keuzes van de oude indeling gaan één keer om (RubriekVersie), precies zoals op het web
// (src/lib/topics.js currentChoice; dezelfde gevallen in <repo>/tests/fixtures/rubrieken-migratie.json).
@MainActor final class RubriekVersieTests: XCTestCase {
    func testIndelingEnNamen() {
        XCTAssertEqual(Rubriek.byId["tech"]?.topics, ["ai", "tech", "gadgets", "privacy", "ev"])
        XCTAssertEqual(Rubriek.byId["tech"]?.cats, ["tech"])
        XCTAssertEqual(Rubriek.byId["cultuur"]?.topics, ["muziek", "film", "boeken", "kunst", "media", "games"])
        XCTAssertEqual(Rubriek.byId["cultuur"]?.cats, ["cultuur", "games"])
        XCTAssertEqual(Rubriek.alle.map(\.id), ["politiek", "binnenland", "wereld", "economie", "tech", "wetenschap", "cultuur", "sport"])
        XCTAssertEqual(Taste.label("tech"), "Techbedrijven")
        XCTAssertEqual(Taste.label("privacy"), "Hacks & privacy")
        XCTAssertEqual(Taste.label("games"), "Games")
        // Elk onderwerp hoort bij precies één rubriek en heeft een naam.
        let all = Rubriek.alle.flatMap(\.topics)
        XCTAssertEqual(Set(all).count, all.count)
        XCTAssertEqual(Set(all), Set(Taste.labels.keys))
        XCTAssertEqual(InterestsList.about["cultuur"], "Muziek, film, boeken, kunst, games")
        XCTAssertEqual(InterestsList.about["tech"], "AI, techbedrijven, gadgets, privacy")
        let vak = Dictionary(uniqueKeysWithValues: DigestFieldsList.fields.map { ($0.id, $0.label) })
        XCTAssertEqual(vak["gaming"], "Games")
        XCTAssertEqual(vak["security"], "Hacks & privacy")
        XCTAssertEqual(vak["gadgets"], "Gadgets")
        XCTAssertEqual(vak["zorg"], "Zorg & gezondheid")
    }

    // De gedeelde gevallen: elke oude keuze wordt in de app dezelfde nieuwe keuze als op het web.
    func testGedeeldeGevallenGelijkAanWeb() throws {
        let url = EditionServerTests.repo.appending(path: "tests/fixtures/rubrieken-migratie.json")
        let cases = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [[String: Any]])
        XCTAssertGreaterThanOrEqual(cases.count, 12)
        for c in cases {
            let name = c["name"] as? String ?? "?"
            let from = try XCTUnwrap(c["from"] as? [String: [String]], name)
            let to = try XCTUnwrap(c["to"] as? [String: [String]], name)
            let m = RubriekVersie.migrate(interests: from["interests"] ?? [], topics: from["topics"] ?? [])
            XCTAssertEqual(m.interests, to["interests"], name)
            XCTAssertEqual(m.topics, to["topics"], name)
        }
    }

    // Een bestaande lezer met Games, Hacks & privacy en Techbedrijven onder Tech: na het opstarten precies die
    // keuzes, Games nu onder Cultuur; één keer omgezet, ook in de opslag.
    func testOpgeslagenProfielHoudtZijnKeuzes() throws {
        let d = UserDefaults.standard
        let keys = ["hoot.interests", "hoot.topics", "hoot.rubrieken"]
        let before = keys.map { d.data(forKey: $0) }
        defer { for (k, v) in zip(keys, before) { if let v { d.set(v, forKey: k) } else { d.removeObject(forKey: k) } } }
        d.set(try JSONEncoder().encode(["tech"]), forKey: "hoot.interests")
        d.set(try JSONEncoder().encode(["tech", "privacy", "games"]), forKey: "hoot.topics")
        d.removeObject(forKey: "hoot.rubrieken")

        let store = HootStore()
        XCTAssertEqual(store.interests, ["tech", "cultuur"])
        XCTAssertEqual(store.topics, ["tech", "privacy", "games"])
        XCTAssertEqual(Rubriek.picked(from: store.topics, interests: store.interests), ["tech", "privacy", "games"])
        XCTAssertEqual(try JSONDecoder().decode(Int.self, from: XCTUnwrap(d.data(forKey: "hoot.rubrieken"))), 2)
        XCTAssertEqual(try JSONDecoder().decode([String].self, from: XCTUnwrap(d.data(forKey: "hoot.interests"))), ["tech", "cultuur"])

        // Al omgezet: een tweede start verandert niets meer (Cultuur zonder Games blijft zonder Games).
        d.set(try JSONEncoder().encode(["cultuur"]), forKey: "hoot.interests")
        d.set(try JSONEncoder().encode(["muziek", "film", "boeken", "kunst", "media"]), forKey: "hoot.topics")
        let again = HootStore()
        XCTAssertEqual(again.topics, ["muziek", "film", "boeken", "kunst", "media"])
    }

    // Tech zonder keuze blijft Tech zonder keuze; de Stroom-tab Tech blijft, Games valt erbuiten.
    func testTechAllesBlijftTech() {
        let m = RubriekVersie.migrate(interests: ["tech"], topics: ["ai", "tech", "gadgets", "privacy", "ev", "games"])
        XCTAssertEqual(m.interests, ["tech"])
        XCTAssertEqual(Rubriek.picked(from: m.topics, interests: m.interests), [])
        XCTAssertEqual(Rubriek.resolve(m.interests, picked: []), ["ai", "tech", "gadgets", "privacy", "ev"])
    }

    // Je account en de server: de versie gaat mee, zodat een keuze van nu nooit als oude wordt gelezen.
    func testVersieGaatMee() throws {
        let body = HootStore.serverBody(followed: ["nos"], interests: ["cultuur"], topics: [], favorites: [], taste: Taste(), readIds: [], reading: nil)
        XCTAssertEqual(body["rubrieken"] as? Int, 2)
        let src = try String(contentsOf: EditionServerTests.repo.appending(path: "ios/Hoot/HootStore.swift"), encoding: .utf8)
        XCTAssertTrue(src.contains("\"rubrieken\": RubriekVersie.current, \"favorites\": favorites, \"onboarded\": true"), "syncedPrefs draagt de versie")
        XCTAssertTrue(src.contains("p?.rubrieken != RubriekVersie.current"), "een account zonder versie gaat eerst om")
    }
}
