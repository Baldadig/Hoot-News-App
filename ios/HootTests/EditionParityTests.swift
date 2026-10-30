import JavaScriptCore
import XCTest
@testable import Hoot

// Pariteit web en iOS (bouwspec §9): de rekenkern in de app (EditionEngine, Resources/edition-core.js)
// maakt uit de vaste invoer van vier lezers byte voor byte dezelfde Editie als node
// (tests/editionGolden.test.mjs, uit tests/fixtures/edition-golden.json). Plus de rekentijd: op de
// simulator zonder JIT, als maat voor een iPhone (doel ≤ 1,5 s, indicatief).
final class EditionParityTests: XCTestCase {
    struct Golden {
        let name: String
        let input: String // JSON zoals JavaScript hem schrijft
        let output: String // idem; dit moet de rekenkern letterlijk teruggeven
        let basis: String
        let followed: [String], interests: [String], topics: [String], favorites: [String]
    }

    // ios/HootTests/EditionParityTests.swift → <repo>/tests/fixtures/edition-golden.json. De tests draaien
    // op de simulator, die de Mac-schijf ziet; op een toestel is deze test niet bedoeld.
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "tests/fixtures/edition-golden.json")

    // De fixture gesplitst met JSON.stringify van JavaScriptCore zelf: zo komt de verwachte tekst uit
    // dezelfde serialisatie als de uitkomst, en vergelijken we echt byte voor byte.
    nonisolated(unsafe) static var cached: [Golden]?
    static func golden() throws -> [Golden] {
        if let cached { return cached }
        let text = try String(contentsOf: fixtureURL, encoding: .utf8)
        guard let ctx = JSContext() else { throw XCTSkip("geen JSContext") }
        ctx.setObject(text, forKeyedSubscript: "__golden" as NSString)
        ctx.evaluateScript("var G = JSON.parse(__golden);")
        let count = Int(ctx.evaluateScript("G.length").toInt32())
        var out: [Golden] = []
        for i in 0 ..< count {
            let strings = { (k: String) in ctx.evaluateScript("JSON.stringify(G[\(i)].\(k))").toString()! }
            let list = { (k: String) in (ctx.evaluateScript("G[\(i)].input.\(k)").toArray() as? [String]) ?? [] }
            out.append(Golden(name: ctx.evaluateScript("G[\(i)].name").toString(), input: strings("input"), output: strings("output"), basis: ctx.evaluateScript("G[\(i)].output.basis").toString(), followed: list("followed"), interests: list("interests"), topics: list("topics"), favorites: list("favorites")))
        }
        cached = out
        return out
    }

    func testFixtureHasFourReaders() throws {
        let g = try Self.golden()
        XCTAssertEqual(g.map(\.name), ["nieuw", "klimaat", "vs", "vs-zonder-topics"])
        XCTAssertTrue(g.allSatisfy { $0.output.contains("\"why\":") }, "elke Editie draagt het waarom per plek")
    }

    // G1-achtig: dezelfde invoer, dezelfde bytes als node.
    func testComposeMatchesGoldenByteForByte() async throws {
        for g in try Self.golden() {
            let out = try await EditionEngine.shared.compose(inputJSON: g.input)
            XCTAssertEqual(out, g.output, "\(g.name): de app rekent anders dan de website")
            if out != g.output {
                // Wijs de eerste afwijkende plek aan; de hele tekst is te lang voor de uitslag.
                let a = Array(out.utf8), b = Array(g.output.utf8)
                let i = zip(a, b).enumerated().first { $0.element.0 != $0.element.1 }?.offset ?? min(a.count, b.count)
                let from = max(0, i - 120)
                XCTFail("\(g.name): verschil bij byte \(i) van \(a.count)/\(b.count)\napp: …\(String(decoding: a[from ..< min(a.count, i + 120)], as: UTF8.self))…\nweb: …\(String(decoding: b[from ..< min(b.count, i + 120)], as: UTF8.self))…")
            }
        }
    }

    // De uitkomst laat zich lezen als Edition, met alles wat P8-4 vraagt.
    func testOutputDecodesAsEdition() async throws {
        for g in try Self.golden() {
            let out = try await EditionEngine.shared.compose(inputJSON: g.input)
            let e = try JSONDecoder().decode(Edition.self, from: Data(out.utf8))
            XCTAssertEqual(e.entries.count, 10, g.name)
            XCTAssertEqual(e.basis, g.basis, g.name)
            XCTAssertEqual(e.owner, "anon", g.name)
            XCTAssertEqual(e.personal, true, g.name)
            XCTAssertNotNil(e.version, g.name)
            XCTAssertTrue(e.entries.allSatisfy { $0.why?.text != nil && $0.itemIds != nil }, "\(g.name): why en itemIds op elke plek")
        }
    }

    // G5: de afdruk uit de bundel is die van editionBasis op het web, ook met lege topics en favorites.
    func testBasisMatchesWeb() async throws {
        for g in try Self.golden() {
            let basis = try await EditionEngine.shared.basis(followed: g.followed, interests: g.interests, topics: g.topics, favorites: g.favorites)
            XCTAssertEqual(basis, g.basis, g.name)
            let shuffled = try await EditionEngine.shared.basis(followed: g.followed.reversed(), interests: g.interests, topics: g.topics, favorites: g.favorites)
            XCTAssertEqual(shuffled, g.basis, "\(g.name): volgorde van bronnen doet er niet toe")
        }
        let nieuw = try Self.golden()[0]
        XCTAssertEqual(nieuw.topics, [])
        XCTAssertEqual(nieuw.favorites, [])
    }

    // H5: de geschiedenis uit de bundel heeft de vorm van user_state.edition.history — precies de
    // sleutels die historyOf in netlify/lib/stories.mjs schrijft, in die volgorde.
    func testHistoryShape() async throws {
        let g = try Self.golden()[1]
        let out = try await EditionEngine.shared.compose(inputJSON: g.input)
        let row = try await EditionEngine.shared.history(of: out)
        let h = try JSONDecoder().decode(EditionHistory.self, from: Data(row.utf8))
        XCTAssertFalse(h.storyIds.isEmpty)
        XCTAssertGreaterThanOrEqual(h.itemIds.count, 10)
        XCTAssertEqual(h.titles?.isEmpty, false)
        XCTAssertNotNil(h.leadStoryId, "het hoofdverhaal gaat mee (wasLead)")
        XCTAssertEqual(h.shown?.isEmpty, false, "de getoonde berichten gaan mee (sameSubject)")
        // De sleutels in de volgorde van het web (JSON.stringify houdt de volgorde van historyOf).
        let keys = Self.keyOrder(of: row)
        XCTAssertEqual(keys, ["id", "builtAt", "storyIds", "itemIds", "leadIds", "leadStoryId", "titles", "shown", "keys"])
        let next = try await EditionEngine.shared.nextHistory(prior: "[]", edition: out)
        let rows = try JSONDecoder().decode([EditionHistory].self, from: Data(next.utf8))
        XCTAssertEqual(rows.count, 1)
        XCTAssertEqual(rows.first?.id, h.id)
    }

    // De sleutels van het buitenste JSON-object, in de volgorde waarin de tekst ze geeft.
    static func keyOrder(of json: String) -> [String] {
        guard let ctx = JSContext() else { return [] }
        ctx.setObject(json, forKeyedSubscript: "__row" as NSString)
        return (ctx.evaluateScript("Object.keys(JSON.parse(__row))").toArray() as? [String]) ?? []
    }

    // H3/H5: drie dagdelen achter elkaar op het toestel, met `prior` zoals loadPersonal hem bouwt (de
    // hele vorige Editie voorop, dan haar history, recentHistory ontdubbelt): de geschiedenis wordt
    // drie diep, en het `previous` van de Avond kent de Ochtend nog (atOf op haar builtAt).
    @MainActor func testHistoryThreeSlotsDeep() async throws { // recentHistory hoort bij de store (main actor)
        let g = try Self.golden()[1]
        let out = try await EditionEngine.shared.compose(inputJSON: g.input)
        guard let base = try JSONSerialization.jsonObject(with: Data(out.utf8)) as? [String: Any] else { return XCTFail("geen Editie") }
        let json = { (o: Any) in String(decoding: try! JSONSerialization.data(withJSONObject: o), as: UTF8.self) }
        let rows = { (s: String) in (try? JSONSerialization.jsonObject(with: Data(s.utf8))) as? [[String: Any]] ?? [] }
        func dagdeel(_ id: String, _ builtAt: String, prior: [[String: Any]]) async throws -> [String: Any] {
            var e = base
            e["id"] = id
            e["builtAt"] = builtAt
            e["history"] = rows(try await EditionEngine.shared.nextHistory(prior: json(prior), edition: json(e)))
            return e
        }
        // Ochtend, zonder iets van toen.
        let ochtend = try await dagdeel("d1-ochtend", "2026-10-31T05:00:00.000Z", prior: [])
        XCTAssertEqual((ochtend["history"] as? [[String: Any]])?.map { $0["id"] as? String }, ["d1-ochtend"])
        // Middag: de Ochtend voluit voorop, haar eigen regel erachter — de volle Editie wint.
        var prior = HootStore.recentHistory([ochtend] + (ochtend["history"] as? [[String: Any]] ?? []), except: "d1-middag")
        XCTAssertEqual(prior.count, 1)
        XCTAssertNotNil(prior.first?["entries"], "de volle Editie, niet haar regel")
        let middag = try await dagdeel("d1-middag", "2026-10-31T11:00:00.000Z", prior: prior)
        let middagIds = (middag["history"] as? [[String: Any]])?.map { $0["id"] as? String }
        XCTAssertEqual(middagIds, ["d1-middag", "d1-ochtend"], "de volle Editie wordt samengevat, niet weggegooid")
        XCTAssertTrue((middag["history"] as? [[String: Any]])?.allSatisfy { $0["entries"] == nil && $0["storyIds"] is [String] } == true, "alleen regels")
        // Avond: drie diep, en previous kent de Ochtend.
        prior = HootStore.recentHistory([middag] + (middag["history"] as? [[String: Any]] ?? []), except: "d1-avond")
        XCTAssertEqual(prior.map { $0["id"] as? String }, ["d1-middag", "d1-ochtend"])
        let avond = try await dagdeel("d1-avond", "2026-10-31T16:00:00.000Z", prior: prior)
        let history = try JSONDecoder().decode([EditionHistory].self, from: try JSONSerialization.data(withJSONObject: avond["history"] ?? []))
        XCTAssertEqual(history.count, 3)
        XCTAssertEqual(history.map(\.id), ["d1-avond", "d1-middag", "d1-ochtend"])
        XCTAssertTrue(history.allSatisfy { $0.leadStoryId != nil && !($0.shown ?? []).isEmpty }, "elke regel draagt leadStoryId en shown")
        let previous = try await EditionEngine.shared.previous(of: json(prior))
        guard let p = try JSONSerialization.jsonObject(with: Data(previous.utf8)) as? [String: Any], let atOf = p["atOf"] as? [String: Double] else { return XCTFail("geen previous") }
        let storyId = (base["entries"] as? [[String: Any]])?.first { $0["kind"] as? String == "story" }?["id"] as? String ?? ""
        let ms = { (s: String) in HootDate.parse(s)!.timeIntervalSince1970 * 1000 }
        XCTAssertEqual(atOf[storyId], ms("2026-10-31T11:00:00.000Z"), "at per verhaal: de laatste Editie waarin het stond")
        XCTAssertEqual(p["at"] as? Double, ms("2026-10-31T11:00:00.000Z"), "at en leadStoryId zijn van de nieuwste, ook al levert het toestel nieuw → oud")
        let alleenOchtend = try await EditionEngine.shared.previous(of: json(prior.filter { $0["id"] as? String == "d1-ochtend" }))
        let q = try JSONSerialization.jsonObject(with: Data(alleenOchtend.utf8)) as? [String: Any]
        XCTAssertEqual((q?["atOf"] as? [String: Double])?[storyId], ms("2026-10-31T05:00:00.000Z"), "de Ochtend staat er nog in")
    }

    // De rekentijd zonder JIT (de simulator draait JavaScriptCore net als een toestel zonder JIT voor
    // apps). Doel ≤ 1,5 s op de achtergrond; de uitslag staat in het testverslag.
    func testComposeTime() throws {
        let g = try Self.golden().first { $0.name == "vs" }!
        _ = try EditionEngine.shared.composeNow(inputJSON: g.input) // de bundel laden telt niet mee
        var times: [TimeInterval] = []
        measure {
            let t0 = Date()
            _ = try? EditionEngine.shared.composeNow(inputJSON: g.input)
            times.append(Date().timeIntervalSince(t0))
        }
        let avg = times.reduce(0, +) / Double(max(1, times.count))
        print("EditionParityTests: samenstellen gemiddeld \(Int(avg * 1000)) ms over \(times.count) keer (max \(Int((times.max() ?? 0) * 1000)) ms)")
        XCTAssertLessThan(avg, 5, "samenstellen duurt veel te lang")
    }
}
