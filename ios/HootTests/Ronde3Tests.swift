import XCTest
import SwiftUI
@testable import Hoot

// Hoot 1.1.1, ronde 3: de keuzes van Alex van 5 november ("Na de review"), de app gelijk aan web-nu.
@MainActor final class Ronde3Tests: XCTestCase {
    // r5-bewaard: een archief. Geen belofte over offline of over verdwijnen na lezen.
    func testBewaardIsEenArchief() {
        XCTAssertEqual(SavedView.emptyText, "Tik op de bladwijzer bij een verhaal. Het blijft hier staan.")
        XCTAssertFalse(SavedView.emptyText.contains("verbinding"))
        XCTAssertFalse(SavedView.emptyText.contains("gelezen"))
    }

    // r5-stroom-einde: de Stroom houdt op bij je vorige bezoek (of na een dag), gelijk aan src/lib/stroom-einde.js.
    func testStroomEindeGrens() {
        let now = Date(timeIntervalSince1970: 2_000_000_000)
        XCTAssertEqual(StroomEinde.grens(mark: nil, now: now), .init(at: now.addingTimeInterval(-86_400), eerder: false))
        let gisteren = now.addingTimeInterval(-3 * 3600)
        XCTAssertEqual(StroomEinde.grens(mark: gisteren, now: now), .init(at: gisteren, eerder: true))
        let oud = now.addingTimeInterval(-2 * 86_400)
        XCTAssertEqual(StroomEinde.grens(mark: oud, now: now), .init(at: now.addingTimeInterval(-86_400), eerder: false), "langer dan een dag: de laatste 24 uur")
    }

    func testStroomEindeIndexEnKnop() {
        let now = Date(timeIntervalSince1970: 2_000_000_000)
        let items = (0..<5).map { i -> Item in
            var it = Item(id: "\(i)", source: "nos", title: "t\(i)", url: "https://nos.nl/\(i)")
            it.publishedAt = ISO8601DateFormatter().string(from: now.addingTimeInterval(TimeInterval(-i * 3600)))
            return it
        }
        // Grens op het derde bericht: twee nieuwer, de rest niet.
        let at = now.addingTimeInterval(-2 * 3600)
        XCTAssertEqual(StroomEinde.index(items, at: at), 2, "het eerste bericht dat niet nieuwer is dan de grens")
        XCTAssertEqual(StroomEinde.cap(count: 5, grensIndex: 2, older: 0), 2)
        XCTAssertEqual(StroomEinde.cap(count: 5, grensIndex: 2, older: StroomEinde.page), 5, "Ouder nieuws tonen opent per keer zestig")
        XCTAssertEqual(StroomEinde.index(items, at: now.addingTimeInterval(-86_400)), 5, "alles van de laatste dag")
        XCTAssertEqual(StroomEinde.page, 60)
    }

    // r5-seintje: kiezen in de kaart, de ochtend voorgekozen; "Ja, graag" zet alleen dat dagdeel aan. Geen kloktijden.
    func testSeintjeKiezenInDeKaart() {
        XCTAssertEqual(AlertOffer.standaard, "ochtend")
        XCTAssertEqual(AlertOffer.keuzes.map(\.label), ["Ochtend", "Middag", "Vroege avond"])
        XCTAssertEqual(AlertOffer.slots(for: "middag"), ["middag"])
        XCTAssertEqual(AlertOffer.slots(for: "nacht"), ["ochtend"], "iets onbekends: de ochtend")
        XCTAssertEqual(AlertOffer.doneLine("ochtend"), "Je krijgt een seintje als de Ochtendeditie klaarligt.")
        for k in AlertOffer.keuzes { XCTAssertNil(k.label.range(of: #"\d"#, options: .regularExpression), "geen kloktijd in \(k.label)") }
    }

    // r5-selectie-onderwerpen: een lege Selectie toont een voorproefje (gelijk aan voorproefje() op het web).
    func testSelectieVoorproefje() throws {
        let json = #"""
        {"id":"w45","fields":[
          {"id":"merk","label":"Merk & reclame","top":[],"more":[]},
          {"id":"seo","label":"SEO & content","top":[{"id":"a","source":"x","title":"Stuk A","url":"https://x.nl/a"}],"more":[]},
          {"id":"ux","label":"UI/UX","top":[{"id":"b","source":"x","title":"Stuk B","url":"https://x.nl/b"},{"id":"c","source":"x","title":"Stuk C","url":"https://x.nl/c"}],"more":[]},
          {"id":"ai","label":"AI","top":[{"id":"d","source":"x","title":"Stuk D","url":"https://x.nl/d"}],"more":[]},
          {"id":"dev","label":"Development","top":[{"id":"e","source":"x","title":"Stuk E","url":"https://x.nl/e"}],"more":[]},
          {"id":"economie","label":"Economie","top":[{"id":"f","source":"x","title":"Stuk F","url":"https://x.nl/f"}],"more":[]}
        ]}
        """#
        let digest = try JSONDecoder().decode(Digest.self, from: Data(json.utf8))
        let p = SelectionOverview.voorproefje(digest)
        XCTAssertEqual(p.map(\.id), ["seo", "ux", "ai"], "per domein het eerste onderwerp met stukken, hooguit drie")
        XCTAssertEqual(p.map(\.item.id), ["a", "b", "d"], "elk met zijn beste stuk")
        XCTAssertTrue(SelectionOverview.voorproefje(nil).isEmpty)
        XCTAssertEqual(SelectionOverview.voorproef, "Zo ziet het eruit: per onderwerp de beste stukken van de week.")
    }

    // r5-kanten-welkom: één keer een tip bij het eerste verhaal met meer bronnen (gelijk aan kantenTip() op het web).
    func testKantenTip() throws {
        func story(_ id: String, _ n: Int) throws -> Story {
            try JSONDecoder().decode(Story.self, from: Data(#"{"id":"\#(id)","itemIds":["a"],"sourceCount":\#(n)}"#.utf8))
        }
        let a = Item(id: "a", source: "nos", title: "A", url: "https://nos.nl/a")
        let b = Item(id: "b", source: "nos", title: "B", url: "https://nos.nl/b")
        let rows: [(item: Item, story: Story?)] = [(a, try story("s1", 1)), (b, try story("s2", 7))]
        let tip = KantenTip.pick(rows, done: false)
        XCTAssertEqual(tip?.story.id, "s2")
        XCTAssertEqual(tip?.count, 7)
        XCTAssertNil(KantenTip.pick(rows, done: true), "daarna nooit meer")
        XCTAssertNil(KantenTip.pick([(a, nil)], done: false))
        XCTAssertEqual(KantenTip.line(7), "Meer kanten van één verhaal: bij ‘7 bronnen’ zie je hoe elke bron het brengt.")
    }

    // r5-opstart: het opstartscherm stopt zodra de Editie er is (cache of vers), niet pas als alle delen binnen zijn.
    func testOpstartWachtNietOpAlleDelen() {
        XCTAssertTrue(HootApp.splashMayEnd(status: .loading, hasEdition: true, waited: 1.7), "de Editie staat er: weg, ook als de delen nog laden")
        XCTAssertFalse(HootApp.splashMayEnd(status: .loading, hasEdition: false, waited: 2), "nog geen Editie: wachten")
        XCTAssertTrue(HootApp.splashMayEnd(status: .failed, hasEdition: false, waited: 2))
        XCTAssertTrue(HootApp.splashMayEnd(status: .ready, hasEdition: false, waited: 2))
        XCTAssertTrue(HootApp.splashMayEnd(status: .loading, hasEdition: false, waited: 5), "hooguit vijf seconden")
    }
}
