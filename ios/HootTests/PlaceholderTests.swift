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
        // Doorschuiven vindt vanuit elk van de dertien een ander beeld in een andere set.
        XCTAssertEqual(Placeholder.count, 18)
        for k in PlaceholderBeelden.keuze {
            var j = k
            repeat { j = (j + Placeholder.shift) % Placeholder.count } while PlaceholderBeelden.uit.contains(j) || Placeholder.set(j) == Placeholder.set(k)
            XCTAssertNotEqual(j, k, "beeld \(k + 1)")
        }
    }

    // Twee beeldloze buren: nooit hetzelfde beeld, nooit dezelfde set.
    func buren(_ rows: [(id: String, bare: Bool)], _ plan: [String: Int], _ naam: String) {
        for i in rows.indices.dropFirst() where rows[i].bare && rows[i - 1].bare {
            let a = plan[rows[i - 1].id]!, b = plan[rows[i].id]!
            XCTAssertNotEqual(a, b, "\(naam): rij \(i) hetzelfde beeld")
            XCTAssertNotEqual(Placeholder.set(a), Placeholder.set(b), "\(naam): rij \(i) dezelfde set")
        }
    }

    // Een lange reeks: nooit twee gelijke beelden of sets naast elkaar, en alle dertien komen geregeld voor.
    func testLangeReeksNooitTweeGelijkeNaastElkaar() {
        let rows = (0 ..< 5000).map { (id: "https://www.nrc.nl/nieuws/2026/11/05/stuk-\($0)-a\(($0 * 7919) % 1000)", bare: true) }
        let plan = Placeholder.plan(ids: rows)
        buren(rows, plan, "lange reeks")
        var telling = [Int](repeating: 0, count: Placeholder.count)
        for k in plan.values { telling[k] += 1 }
        for (k, n) in telling.enumerated() {
            if PlaceholderBeelden.uit.contains(k) { XCTAssertEqual(n, 0, "beeld \(k + 1)") } // weg uit het product
            else { XCTAssertTrue(n > 200 && n < 575, "beeld \(k + 1): \(n)") } // gemiddeld 7,7 procent, zoals het web
        }
    }

    // 15 november, Alex: "16, 17 en 07 halen we helemaal uit het product." Eerder: 14 Eclips en 15 Walsen.
    // Dertien blijven, met hun oude nummers; elk stuk met een van de dertien houdt zijn beeld.
    func testDertienBeeldenZoalsHetWeb() throws {
        let uit = try XCTUnwrap(fixture()["uit"] as? [Int])
        XCTAssertEqual(uit, [7, 14, 15, 16, 17])
        XCTAssertEqual(PlaceholderBeelden.uit, [6, 13, 14, 15, 16])
        XCTAssertEqual(PlaceholderBeelden.familie, ["zon", "zon", "zon", "iris", "iris", "iris", nil, "raster", "raster", "stapel", "kop", "vouw", "baan", nil, nil, nil, nil, "koepels"])
        XCTAssertEqual(PlaceholderBeelden.keuze.map { $0 + 1 }, [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 18])
        var telling = [Int](repeating: 0, count: Placeholder.count)
        for i in 0 ..< 39000 {
            let id = "https://www.washingtonpost.com/world/2026/11/15/stuk-\(i)/"
            let oud = Int(Placeholder.fnv1a(id) % 18), nu = Placeholder.base(id)
            XCTAssertFalse(PlaceholderBeelden.uit.contains(nu), id)
            if !PlaceholderBeelden.uit.contains(oud) { XCTAssertEqual(nu, oud, id) } // de rest houdt zijn beeld
            telling[nu] += 1
        }
        // Elk van de dertien rond een dertiende (7,7 procent): tussen 7,0 en 8,4 procent.
        for k in PlaceholderBeelden.keuze { XCTAssertTrue(telling[k] > 2730 && telling[k] < 3276, "beeld \(k + 1): \(telling[k])") }
        for t in 0 ..< 300 {
            let rows = (0 ..< 40).map { (id: "wapo-\(t)-\($0)", bare: (t + $0 * 3) % 6 != 0) }
            XCTAssertTrue(Placeholder.plan(ids: rows).values.allSatisfy { !PlaceholderBeelden.uit.contains($0) }, "lijst \(t)")
        }
    }

    // De bitmaps staan in de bundel: per beeld en weergave groot (1600 x 800) en klein (360 x 240); van de beelden die
    // weg zijn niets.
    func testBitmapsInDeBundel() throws {
        for k in PlaceholderBeelden.keuze {
            for thema in ["licht", "donker", "nacht"] {
                for klein in [false, true] {
                    let naam = PlaceholderBeelden.bestand(k, thema: thema, klein: klein)
                    XCTAssertNotNil(PlaceholderBestand.url(naam), naam)
                    let image = try XCTUnwrap(PlaceholderBestand.beeld(k, thema: thema, klein: klein), naam)
                    XCTAssertEqual(image.width, klein ? 360 : 1600, naam)
                    XCTAssertEqual(image.height, klein ? 240 : 800, naam)
                }
            }
        }
        for k in PlaceholderBeelden.uit { XCTAssertNil(PlaceholderBestand.url(PlaceholderBeelden.bestand(k, thema: "licht", klein: false))) }
        // De widget rekent klein.
        XCTAssertEqual(PlaceholderBestand.beeld(0, thema: "donker", klein: false, maxPixel: 1000)?.width, 1000)
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
        var k = Placeholder.base("a")
        repeat { k = (k + Placeholder.shift) % Placeholder.count } while PlaceholderBeelden.uit.contains(k) || Placeholder.set(k) == Placeholder.set(Placeholder.base("a"))
        XCTAssertEqual(plan[id], k) // niet hetzelfde beeld en niet dezelfde set als de buur, voorbij lege plekken
        XCTAssertNotEqual(Placeholder.set(plan[id]!), Placeholder.set(plan["a"]!))
    }

    @MainActor
    func testTekentOpDeMaatVanHetVak() throws {
        for (i, size) in [(0, CGSize(width: 344, height: 172)), (4, CGSize(width: 96, height: 64)), (2, CGSize(width: 96, height: 64)), (7, CGSize(width: 344, height: 172)), (8, CGSize(width: 96, height: 64)), (9, CGSize(width: 344, height: 229)), (11, CGSize(width: 344, height: 172)), (11, CGSize(width: 96, height: 64)), (12, CGSize(width: 344, height: 229)), (17, CGSize(width: 344, height: 172)), (17, CGSize(width: 96, height: 64))] {
            let renderer = ImageRenderer(content: PlaceholderBeeld(index: i, klein: size.width < 100).frame(width: size.width, height: size.height))
            let image = try XCTUnwrap(renderer.uiImage)
            XCTAssertEqual(image.size, size)
        }
    }
}
