import XCTest
import SwiftUI
@testable import Hoot

// Placeholderbeeld (build 46): dezelfde keuze als het web voor dezelfde id. Leest de gedeelde fixture
// (tests/fixtures/placeholder.json), die tests/placeholder.test.mjs op het web ook draait.
final class PlaceholderTests: XCTestCase {
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "tests/fixtures/placeholder.json")

    func fixture() throws -> [String: Any] {
        guard FileManager.default.fileExists(atPath: Self.fixtureURL.path) else { throw XCTSkip("tests/fixtures/placeholder.json ontbreekt") }
        return try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: Self.fixtureURL)) as? [String: Any])
    }

    func testZelfdeBeeldAlsHetWeb() throws {
        let base = try XCTUnwrap(fixture()["base"] as? [[String: Any]])
        XCTAssertGreaterThan(base.count, 40)
        for b in base {
            let id = try XCTUnwrap(b["id"] as? String)
            XCTAssertEqual(Placeholder.fnv1a(id), UInt32(try XCTUnwrap(b["fnv1a"] as? NSNumber).uint32Value), id)
            XCTAssertEqual(Placeholder.base(id) + 1, try XCTUnwrap(b["beeld"] as? Int), id)
        }
    }

    func testBuurRegelZoalsHetWeb() throws {
        let lijsten = try XCTUnwrap(fixture()["lijsten"] as? [[String: Any]])
        for l in lijsten {
            let rows = try XCTUnwrap(l["rows"] as? [[String: Any]]).map { (id: $0["id"] as! String, bare: $0["bare"] as! Bool) }
            let verwacht = try XCTUnwrap(l["beelden"] as? [String: Int])
            let plan = Placeholder.plan(ids: rows)
            XCTAssertEqual(plan.mapValues { $0 + 1 }, verwacht, l["naam"] as? String ?? "")
            buren(rows, plan, l["naam"] as? String ?? "")
        }
        // Drie verder valt altijd in een andere set.
        XCTAssertEqual(Placeholder.count, PlaceholderBeelden.beelden.count)
        for k in 0 ..< Placeholder.count { XCTAssertNotEqual(Placeholder.set((k + Placeholder.shift) % Placeholder.count), Placeholder.set(k), "beeld \(k + 1)") }
    }

    // Twee beeldloze buren: nooit hetzelfde beeld, nooit dezelfde set.
    func buren(_ rows: [(id: String, bare: Bool)], _ plan: [String: Int], _ naam: String) {
        for i in rows.indices.dropFirst() where rows[i].bare && rows[i - 1].bare {
            let a = plan[rows[i - 1].id]!, b = plan[rows[i].id]!
            XCTAssertNotEqual(a, b, "\(naam): rij \(i) hetzelfde beeld")
            XCTAssertNotEqual(Placeholder.set(a), Placeholder.set(b), "\(naam): rij \(i) dezelfde set")
        }
    }

    // Een lange reeks: nooit twee gelijke beelden of sets naast elkaar, en alle achttien komen geregeld voor.
    func testLangeReeksNooitTweeGelijkeNaastElkaar() {
        let rows = (0 ..< 5000).map { (id: "https://www.nrc.nl/nieuws/2026/11/05/stuk-\($0)-a\(($0 * 7919) % 1000)", bare: true) }
        let plan = Placeholder.plan(ids: rows)
        buren(rows, plan, "lange reeks")
        var telling = [Int](repeating: 0, count: Placeholder.count)
        for k in plan.values { telling[k] += 1 }
        for (k, n) in telling.enumerated() { XCTAssertTrue(n > 125 && n < 375, "beeld \(k + 1): \(n)") }
    }

    func testAchttienBeeldenElkMetKleineTekening() {
        XCTAssertEqual(PlaceholderBeelden.beelden.count, 18)
        XCTAssertEqual(PlaceholderBeelden.beelden.map(\.familie), ["zon", "zon", "zon", "iris", "iris", "iris", "lijn", "raster", "raster", "stapel", "kop", "vouw", "baan", "eclips", "walsen", "zetsel", "rij", "koepels"])
        for b in PlaceholderBeelden.beelden {
            XCTAssertNotNil(b.klein, b.familie)
            XCTAssertEqual(b.klein?.w, 96)
            XCTAssertEqual(b.klein?.h, 64)
        }
        // Zonnestand: de zon is altijd een vol vlak, ook in beeld 3.
        for b in PlaceholderBeelden.beelden.prefix(3) {
            XCTAssertEqual(b.groot.vormen.first?.fill, "sun")
            XCTAssertNil(b.groot.vormen.first?.stroke)
            XCTAssertEqual(b.klein?.vormen.first?.fill, "sun")
        }
        // Beeld 2: de zon klein (r 16), zodat het rood een accent blijft.
        XCTAssertEqual(PlaceholderBeelden.beelden[1].groot.vormen.first?.c, 16)
        for fam in ["zon", "iris", "lijn", "raster", "stapel", "kop", "vouw", "baan", "eclips", "walsen", "zetsel", "rij", "koepels"] { XCTAssertEqual(PlaceholderBeelden.palettes[fam]?.keys.sorted(), ["donker", "licht", "nacht"]) }
    }

    func testBeeldloosAlleenWaarGeenPassendBeeldIs() {
        ImageURL.screen = (390, 3) // een iPhone: andere toetsen kunnen een breder venster hebben gemeten
        let leeg = Item(id: "a", source: "nos", title: "Kop", url: "https://nos.nl/a")
        var klein = leeg
        klein.image = "https://www.bing.com/th?id=ONUT.k&pid=News&w=300&h=200"
        var groot = leeg
        groot.image = "https://www.bing.com/th?id=ONUT.g&pid=News&w=700&h=393"
        XCTAssertTrue(Placeholder.isBare(leeg, .krant))
        XCTAssertFalse(Placeholder.isBare(klein, .krant))
        XCTAssertFalse(Placeholder.isBare(klein, .tijdlijn)) // 1.1.1: een te klein beeld staat klein rechts, geen placeholder
        XCTAssertFalse(Placeholder.isBare(groot, .tijdlijn))
        XCTAssertFalse(Placeholder.isBare(groot, .lead))
    }

    // Een beeld dat pas bij het laden mislukt, toont ook het placeholderbeeld: dan geldt de buurregel ook.
    func testMisluktBeeldVolgtDeBuurregel() throws {
        let a = Item(id: "a", source: "nos", title: "Kop", url: "https://nos.nl/a")
        let id = try XCTUnwrap((0 ..< 200).map { "b\($0)" }.first { Placeholder.base($0) == Placeholder.base("a") })
        var b = Item(id: id, source: "nos", title: "Kop", url: "https://nos.nl/b")
        b.image = "https://images.nrc.nl/weg.jpg"
        XCTAssertNil(Placeholder.plan([(a, .krant), (b, .krant)])[id]) // met beeld: geen placeholder
        let plan = Placeholder.plan([(a, .krant), (b, .krant)], failed: [id])
        XCTAssertEqual(plan["a"], Placeholder.base("a"))
        XCTAssertEqual(plan[id], (Placeholder.base("a") + Placeholder.shift) % Placeholder.count) // niet hetzelfde beeld en niet dezelfde set als de buur
        XCTAssertNotEqual(Placeholder.set(plan[id]!), Placeholder.set(plan["a"]!))
    }

    @MainActor
    func testTekentOpDeMaatVanHetVak() throws {
        for (i, size) in [(0, CGSize(width: 344, height: 172)), (4, CGSize(width: 96, height: 64)), (2, CGSize(width: 96, height: 64)), (6, CGSize(width: 344, height: 172)), (8, CGSize(width: 96, height: 64)), (9, CGSize(width: 344, height: 229)), (11, CGSize(width: 344, height: 172)), (11, CGSize(width: 96, height: 64)), (12, CGSize(width: 344, height: 229)), (16, CGSize(width: 344, height: 172)), (17, CGSize(width: 96, height: 64))] {
            let renderer = ImageRenderer(content: PlaceholderBeeld(index: i, klein: size.width < 100).frame(width: size.width, height: size.height))
            let image = try XCTUnwrap(renderer.uiImage)
            XCTAssertEqual(image.size, size)
        }
    }
}
