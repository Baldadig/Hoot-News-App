import XCTest
@testable import Hoot

// De dagdeelwissel (Editie sneller C3, DagdeelWissel.swift; gelijk aan shared/dagdeel-wissel.mjs en
// tests/dagdeel-wissel.test.mjs): bij een nieuw dagdeel blijft de vorige Editie staan tot de nieuwe er is.
final class DagdeelWisselTests: XCTestCase {
    private func editie(_ id: String, _ uur: Double, owner: String? = "anon", slot: String = "middag", plekken: Bool = true) -> Edition {
        let t = Date(timeIntervalSince1970: 1_794_582_000 + uur * 3600) // 13 november 2026, middag
        return Edition(id: id, slot: slot, date: "2026-11-13", entries: plekken ? [EditionEntry(kind: "story", id: "x")] : [],
                       builtAt: t.formatted(.iso8601), owner: owner)
    }

    func testMagBlijven() {
        let kern = editie("avond", 5, owner: nil, slot: "avond")
        XCTAssertTrue(DagdeelWissel.mayHold(editie("middag", 0), kern: kern, owner: "anon"))
        XCTAssertFalse(DagdeelWissel.mayHold(editie("middag", 0, owner: "u1"), kern: kern, owner: "anon"), "een ander")
        XCTAssertFalse(DagdeelWissel.mayHold(editie("avond", 0), kern: kern, owner: "anon"), "zelfde dagdeel")
        XCTAssertFalse(DagdeelWissel.mayHold(editie("later", 6), kern: kern, owner: "anon"), "later dan de kern")
        XCTAssertFalse(DagdeelWissel.mayHold(editie("oud", 5 - 27), kern: kern, owner: "anon"), "ouder dan een dag en een beetje")
        XCTAssertTrue(DagdeelWissel.mayHold(editie("gisteren", 5 - 12), kern: kern, owner: "anon"))
        XCTAssertFalse(DagdeelWissel.mayHold(editie("leeg", 0, plekken: false), kern: kern, owner: "anon"), "zonder plekken")
        XCTAssertFalse(DagdeelWissel.mayHold(nil, kern: kern, owner: "anon"))
    }

    func testWisselenEnWoorden() {
        XCTAssertTrue(DagdeelWissel.swapsNow(atTop: true, reading: false))
        XCTAssertFalse(DagdeelWissel.swapsNow(atTop: false, reading: false))
        XCTAssertFalse(DagdeelWissel.swapsNow(atTop: true, reading: true))
        XCTAssertEqual(DagdeelWissel.comingLine("avond"), "De Avondeditie komt eraan")
        XCTAssertEqual(DagdeelWissel.readyLine("ochtend"), "De Ochtendeditie staat klaar")
        XCTAssertEqual(DagdeelWissel.comingLine(nil), "De nieuwe Editie komt eraan")
    }
}
