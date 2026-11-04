import XCTest
@testable import Hoot

// "Trump" is geen eigen onderwerp meer maar Verenigde Staten (id vs-politiek). Opgeslagen voorkeuren met de
// oude sleutel gaan mee; het web doet hetzelfde (tests/vs-migratie.test.mjs).
@MainActor final class VerenigdeStatenTests: XCTestCase {
    func testKeuzelijstHeeftGeenTrumpMeer() {
        XCTAssertNil(Taste.labels["trump"])
        XCTAssertEqual(Taste.label("vs-politiek"), "Verenigde Staten")
        let politiek = Rubriek.alle.first { $0.id == "politiek" }
        XCTAssertEqual(politiek?.topics, ["nederland", "europa", "vs-politiek", "verkiezingen"])
        XCTAssertFalse(Rubriek.alle.contains { $0.topics.contains("trump") })
    }

    func testOudeSleutelsWordenOmgezet() {
        XCTAssertEqual(RetiredTopics.list(["nederland", "trump", "vs-politiek"]), ["nederland", "vs-politiek"])
        XCTAssertEqual(RetiredTopics.list(["trump"]), ["vs-politiek"])
        XCTAssertEqual(RetiredTopics.map(["trump": 4, "vs-politiek": 8, "ai": 4], cap: 12), ["vs-politiek": 12, "ai": 4])
        XCTAssertEqual(RetiredTopics.map(["trump": -4], cap: 12), ["vs-politiek": -4])
        XCTAssertEqual(Taste(topics: ["trump": -8], sources: ["nos": 1]).migrated, Taste(topics: ["vs-politiek": -8], sources: ["nos": 1]))
        XCTAssertEqual(Affinity(n: 20, topics: ["trump": 3, "vs-politiek": 2], sources: [:]).migrated.topics, ["vs-politiek": 5])
    }

    func testLabelZonderTrump() {
        let r = StoryLabel.label(topics: ["vs-politiek"], mainTopics: ["vs-politiek"], follows: ["vs-politiek"], cat: nil, desk: "vs", deskLabel: "VS", section: nil, whyCode: nil, whyText: nil, whyDetail: false, followed: true)
        XCTAssertEqual(r.kicker, "Politiek · Verenigde Staten")
    }

    // De opgeslagen voorkeuren van een bestaande lezer (de sleutels van HootStore) komen na het opstarten
    // onder de nieuwe sleutel terug, ook in de opslag zelf.
    func testOpgeslagenVoorkeurenGaanMee() throws {
        let d = UserDefaults.standard
        let keys = ["hoot.topics", "hoot.taste", "hoot.affinity", "hoot.less"]
        let before = keys.map { d.data(forKey: $0) }
        defer { for (k, v) in zip(keys, before) { if let v { d.set(v, forKey: k) } else { d.removeObject(forKey: k) } } }
        d.set(try JSONEncoder().encode(["trump", "nederland"]), forKey: "hoot.topics")
        d.set(try JSONEncoder().encode(Taste(topics: ["trump": -4, "muziek": 4], sources: [:])), forKey: "hoot.taste")
        d.set(try JSONEncoder().encode(Affinity(n: 12, topics: ["trump": 2, "ai": 1], sources: [:])), forKey: "hoot.affinity")
        d.set(try JSONEncoder().encode(["trump"]), forKey: "hoot.less")

        let store = HootStore()
        XCTAssertEqual(store.topics, ["vs-politiek", "nederland"])
        XCTAssertEqual(store.taste.topics, ["vs-politiek": -4, "muziek": 4])
        XCTAssertEqual(store.affinity.topics, ["vs-politiek": 2, "ai": 1])
        XCTAssertEqual(store.less, ["vs-politiek"])
        let saved = try JSONDecoder().decode([String].self, from: try XCTUnwrap(d.data(forKey: "hoot.topics")))
        XCTAssertEqual(saved, ["vs-politiek", "nederland"])
    }
}
