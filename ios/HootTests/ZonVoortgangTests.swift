import XCTest
import SwiftUI
@testable import Hoot

// De zon als voortgang (zon-voortgang, variant B): dezelfde standen als het web (src/lib/sun.js kopSun), uit
// tests/fixtures/zon-voortgang.json die tests/zon-voortgang.test.mjs ook draait; de leeslijn gelijk aan
// src/lib/leesstand.js; en bij grote tekst valt de zon onder de naam in plaats van te verdwijnen.
@MainActor final class ZonVoortgangTests: XCTestCase {
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "tests/fixtures/zon-voortgang.json")

    struct Case: Decodable { let n: Int; let p: Double; let cy: Double; let gloed: Double }
    struct Kader: Decodable { let w, h, hz, r, cx, hoog, onder: Double }
    struct Fixture: Decodable { let kader: Kader; let gevallen: [Case] }

    func testSameStandAsWeb() throws {
        guard FileManager.default.fileExists(atPath: Self.fixtureURL.path) else { throw XCTSkip("tests/fixtures/zon-voortgang.json ontbreekt") }
        let fx = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: Self.fixtureURL))
        let k = EditionSun.kader
        XCTAssertEqual([fx.kader.w, fx.kader.h, fx.kader.hz, fx.kader.r, fx.kader.cx, fx.kader.hoog, fx.kader.onder], [k.w, k.h, k.hz, k.r, k.cx, k.hoog, k.onder])
        XCTAssertGreaterThanOrEqual(fx.gevallen.count, 20)
        for c in fx.gevallen {
            let v = EditionSun.stand(c.p, count: c.n)
            XCTAssertEqual(v.cy, c.cy, accuracy: 0.001, "p \(c.p) van \(c.n)")
            XCTAssertEqual(v.gloed, c.gloed, accuracy: 0.001, "p \(c.p) van \(c.n)")
        }
    }

    // Dezelfde gevallen als tests/zon-voortgang.test.mjs.
    func testLeeslijn() {
        let starts: [CGFloat?] = [100, 500, 900, 1300]
        func p(_ top: CGFloat) -> Double { LeesStand.stand(top: top, max: 1600, kop: 50, hoogte: 800, starts: starts, einde: 1900) }
        XCTAssertEqual(p(0), 0)
        XCTAssertGreaterThan(p(300), 0)
        XCTAssertLessThan(p(300), 2)
        XCTAssertEqual(p(1600), 4)
        var vorige = -1.0
        for top in stride(from: CGFloat(0), through: 1600, by: 20) { XCTAssertGreaterThanOrEqual(p(top), vorige); vorige = p(top) }
        XCTAssertEqual(LeesStand.stand(top: 0, max: 0, kop: 0, hoogte: 2000, starts: starts, einde: 1900), 4)
        // Een verhaal dat nog niet getekend is (lazy): de stand blijft op de stap, hij springt niet vooruit.
        XCTAssertEqual(LeesStand.stand(top: 1000, max: 1600, kop: 50, hoogte: 800, starts: [100, 500, nil, nil], einde: nil), 1)
        // Na een sprong naar onderen (de tussenliggende verhalen nooit getekend): de stand volgt wat er wél staat.
        let sprong = LeesStand.stand(top: 1200, max: 1600, kop: 50, hoogte: 800, starts: [100, nil, nil, 1300], einde: 1900)
        XCTAssertGreaterThan(sprong, 3)
        XCTAssertLessThan(sprong, 4)
    }

    func testStapEnWaarde() {
        XCTAssertEqual(LeesStand.stap(0, 10), 0)
        XCTAssertEqual(LeesStand.stap(3.96, 10), 4)
        XCTAssertEqual(LeesStand.stap(3.5, 10), 3)
        XCTAssertEqual(LeesStand.stap(12, 10), 10)
        XCTAssertEqual(LeesStand.waarde(stap: 4, count: 10, eind: "Je bent bij."), "4 van 10 gelezen")
        XCTAssertEqual(LeesStand.waarde(stap: 10, count: 10, eind: "Je bent bij."), "Je bent bij.")
    }

    // Bij grote tekst valt de zon onder de naam: de kop wordt hoger dan de naam alleen, de zon blijft.
    func testGroteTekstZonOnderDeNaam() {
        func hoogte(_ view: some View, _ size: DynamicTypeSize) -> CGFloat {
            let host = UIHostingController(rootView: view.frame(width: 390).environment(\.dynamicTypeSize, size))
            return host.sizeThatFits(in: CGSize(width: 390, height: 2000)).height
        }
        let groot = DynamicTypeSize.accessibility5
        let metZon = hoogte(EditionHeader(title: "Middageditie"), groot)
        let zonder = hoogte(EditionHeader(title: "Middageditie", sun: false), groot)
        XCTAssertGreaterThanOrEqual(metZon - zonder, 26, "de zon staat onder de naam")
        // Gewone tekst: naast de naam, de kop wordt er niet hoger van.
        XCTAssertEqual(hoogte(EditionHeader(title: "Middageditie"), .large), hoogte(EditionHeader(title: "Middageditie", sun: false), .large), accuracy: 0.5)
    }
}
