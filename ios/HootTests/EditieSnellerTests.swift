import XCTest
@testable import Hoot

// Editie sneller (Hoot-design/editie-sneller/METING.md, C1): de app vraagt jouw Editie aan de server zodra de kern
// er is, niet pas als alle bron-delen binnen zijn. De Editie van de server draagt haar eigen berichten mee; alleen
// het vangnet wacht op de delen. Bleef het antwoord uit, dan vraagt dezelfde laadronde niet nog eens (dan meteen
// het vangnet); een volgende ronde wel.
@MainActor
final class EditieSnellerTests: XCTestCase {
    private var src: String {
        get throws { try String(contentsOf: EditionServerTests.repo.appending(path: "ios/Hoot/HootStore.swift"), encoding: .utf8) }
    }

    func testVraagtDeServerVoordatDeDelenBinnenZijn() throws {
        let s = try src
        let ask = try XCTUnwrap(s.range(of: "Task { await self.loadPersonal() }"), "de vraag start los van de delen")
        let parts = try XCTUnwrap(s.range(of: "repeat { round = partsGeneration; await partsTask?.value }"))
        let reload = try XCTUnwrap(s.range(of: "            reloadParts()\n"))
        XCTAssertLessThan(reload.lowerBound, ask.lowerBound, "eerst de delen aanzetten (parallel)")
        XCTAssertLessThan(ask.lowerBound, parts.lowerBound, "dan meteen de server, vóór het wachten op de delen")
        XCTAssertTrue(s.contains("guard let basis, !itemsById.isEmpty, Self.itemsCurrent("), "het vangnet wacht wel op de delen van dit dagdeel")
    }

    func testEenVraagPerRondeDanHetVangnet() throws {
        XCTAssertTrue(HootStore.asksServer(force: false, uid: nil, pulled: false, failed: "", round: "a|anon|b#1"))
        XCTAssertFalse(HootStore.asksServer(force: false, uid: nil, pulled: false, failed: "a|anon|b#1", round: "a|anon|b#1"), "zelfde ronde zonder antwoord: niet nog eens")
        XCTAssertTrue(HootStore.asksServer(force: false, uid: nil, pulled: false, failed: "a|anon|b#1", round: "a|anon|b#2"), "volgende ronde: wel")
        XCTAssertTrue(HootStore.asksServer(force: false, uid: nil, pulled: false, failed: "a|anon|b#1", round: "a|anon|c#1"), "andere bronnen of interesses: wel")
        XCTAssertFalse(HootStore.asksServer(force: false, uid: "u", pulled: false, failed: "", round: "a|u|b#1"), "lid: pas na de eerste pull")
        XCTAssertTrue(HootStore.asksServer(force: false, uid: "u", pulled: true, failed: "", round: "a|u|b#1"))
        XCTAssertFalse(HootStore.asksServer(force: true, uid: nil, pulled: false, failed: "", round: "a|anon|b#1"), "-HootEngine rekent zelf")
        XCTAssertTrue(try src.contains("if mayAsk { serverFailed = round }"))
    }

    // De wachttijd blijft (C4: korter maakt het niet sneller, alleen eerder het vangnet).
    func testWachttijdOngewijzigd() {
        XCTAssertEqual(HootAPI.editionTimeout, 20)
        XCTAssertEqual(HootStore.retryTimeout, 12)
    }
}
