import XCTest
@testable import Hoot

// 1.1.1, ronde 2: het voorstel bovenaan de bronnenstap komt uit dezelfde rekenkern als op het web
// (shared/voorstel.mjs → HootCore.voorstelJSON). Getoetst op een stuk van de echte catalogus
// (netlify/lib/sources.mjs); de profielen zelf staan in tests/voorstel.test.mjs.
final class VoorstelTests: XCTestCase {
    private let catalogus = #"""
    [{"id":"nos","name":"NOS","cat":"nl","lang":"nl","pick":true},
     {"id":"nu","name":"NU.nl","cat":"nl","lang":"nl","pick":true},
     {"id":"rtl","name":"RTL Nieuws","cat":"nl","lang":"nl"},
     {"id":"nrc","name":"NRC","cat":"nl","lang":"nl","paid":true,"pick":true},
     {"id":"nyt","name":"The New York Times","cat":"int","lang":"en","paid":true,"for":["politiek","wereld","economie"],"pick":true},
     {"id":"guardian","name":"The Guardian","cat":"int","lang":"en","for":["wereld"],"pick":true},
     {"id":"economist","name":"The Economist","cat":"int","lang":"en","paid":true,"for":["economie","wereld"],"pick":true},
     {"id":"nos-economie","name":"NOS Economie","cat":"economie","lang":"nl","for":["economie"],"pick":true},
     {"id":"fd","name":"FD","cat":"economie","lang":"nl","paid":true,"for":["economie"],"pick":true},
     {"id":"tweakers","name":"Tweakers","cat":"tech","lang":"nl","for":["tech"],"pick":true},
     {"id":"theverge","name":"The Verge","cat":"tech","lang":"en","for":["tech"],"pick":true},
     {"id":"quanta","name":"Quanta","cat":"wetenschap","lang":"en","for":["wetenschap"],"pick":true},
     {"id":"nos-sport","name":"NOS Sport","cat":"sport","lang":"nl","for":["sport"],"pick":true},
     {"id":"vi","name":"VI","cat":"sport","lang":"nl","forTopic":"voetbal","pick":true}]
    """#
    private var sources: [Source] { try! JSONDecoder().decode([Source].self, from: Data(catalogus.utf8)) }

    private func ids(_ interests: [String], _ topics: [String] = []) async throws -> [String]? {
        try await EditionEngine.shared.voorstel(sources: sources, interests: interests, topics: topics)?.map(\.id)
    }

    func testProfielen() async throws {
        let geen = try await ids([])
        XCTAssertNil(geen, "zonder interesses de vaste Basis")
        let sport = try await ids(["sport"])
        XCTAssertEqual(sport, ["nos", "nos-sport", "vi"])
        let techWetenschap = try await ids(["tech", "wetenschap"])
        XCTAssertEqual(techWetenschap, ["nos", "tweakers", "quanta"])
        let wereldEconomie = try await ids(["wereld", "economie"])
        XCTAssertEqual(wereldEconomie, ["nos", "guardian", "nos-economie", "nyt"])
        let nyt = try await EditionEngine.shared.voorstel(sources: sources, interests: ["wereld", "economie"], topics: [])?.first { $0.id == "nyt" }
        XCTAssertEqual(nyt?.why, "Past bij Wereld en Economie")
        XCTAssertEqual(nyt?.on, false, "betaald: in Voor jou, niet alvast aan (r5-voorstel-betaald)")
        // Alleen Economie: de gratis NOS Economie aan, FD erbij maar uit (r5-economiebron).
        let economie = try await EditionEngine.shared.voorstel(sources: sources, interests: ["economie"], topics: [])
        XCTAssertEqual(economie?.map(\.id), ["nos", "nos-economie", "fd"])
        XCTAssertEqual(FollowList.alvast(economie), ["nos", "nos-economie"])
        // Politiek: NU.nl erbij, RTL Nieuws alleen in het gratis begin (r5-politiek-rtl).
        let politiek = try await ids(["politiek"])
        XCTAssertEqual(politiek?.contains("nu"), true)
        XCTAssertEqual(politiek?.contains("rtl"), false)
    }

    func testAlvastRegel() {
        XCTAssertEqual(FollowList.alvastLine(withPaid: false), "Alvast gevolgd. Uitzetten kan met één tik.")
        XCTAssertEqual(FollowList.alvastLine(withPaid: true), "De gratis bronnen volg je alvast. Uitzetten kan met één tik.")
    }

    func testGroepenZonderDubbelen() {
        let voorstel = [EditionEngine.VoorstelBron(id: "nos", why: "Het nieuws van de dag"), EditionEngine.VoorstelBron(id: "tweakers", why: "Past bij Tech")]
        let g = FollowList.groups(sources, ["tech"], voorstel: voorstel)
        XCTAssertEqual(g.basis.map(\.id), ["nos", "tweakers"])
        XCTAssertFalse(g.kranten.contains { $0.id == "nos" })
        XCTAssertFalse(g.blocks.flatMap(\.sources).contains { $0.id == "tweakers" })
        XCTAssertEqual(FollowList.allWord(3), "drie")
        let zonder = FollowList.groups(sources, ["tech"], voorstel: nil)
        XCTAssertEqual(zonder.start.map(\.id), ["nos", "nu", "rtl"])
    }
}
