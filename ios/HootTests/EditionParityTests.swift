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

    // H5: de geschiedenis uit de bundel heeft de vorm van user_state.edition.history.
    func testHistoryShape() async throws {
        let g = try Self.golden()[1]
        let out = try await EditionEngine.shared.compose(inputJSON: g.input)
        let row = try await EditionEngine.shared.history(of: out)
        let h = try JSONDecoder().decode(EditionHistory.self, from: Data(row.utf8))
        XCTAssertFalse(h.storyIds.isEmpty)
        XCTAssertGreaterThanOrEqual(h.itemIds.count, 10)
        XCTAssertEqual(h.titles?.isEmpty, false)
        let next = try await EditionEngine.shared.nextHistory(prior: "[]", edition: out)
        let rows = try JSONDecoder().decode([EditionHistory].self, from: Data(next.utf8))
        XCTAssertEqual(rows.count, 1)
        XCTAssertEqual(rows.first?.id, h.id)
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
