import XCTest
@testable import Hoot

// De tab Opinie en de server-gestuurde Stroom-tabs (1.2.1): dezelfde gevallen als tests/stroom-tabs.test.mjs en
// tests/opinie-stroom.test.mjs op het web.
@MainActor
final class StroomTabsTests: XCTestCase {
    private func item(_ json: [String: Any]) throws -> Item {
        var o: [String: Any] = ["id": UUID().uuidString, "source": "telegraaf", "title": "Kop", "url": "https://example.com/a"]
        o.merge(json) { _, b in b }
        return try JSONDecoder().decode(Item.self, from: JSONSerialization.data(withJSONObject: o))
    }
    private func start(_ extra: String) throws -> FeedStart {
        try JSONDecoder().decode(FeedStart.self, from: Data(#"{"sources":[],"stories":[],"meta":{}\#(extra)}"#.utf8))
    }

    func testOpinieNaSportVoorBuitenJeBubbel() {
        let op = StreamView.tabs(interests: [], bubble: true, server: StroomTab.terugval, metBerichten: ["opinie"]).map(\.label)
        XCTAssertEqual(op, ["Alles", "Politiek", "Binnenland", "Wereld", "Economie", "Tech", "Wetenschap", "Cultuur", "Sport", "Opinie", "Buiten je bubbel"])
        XCTAssertEqual(StreamView.tabs(interests: ["politiek", "wereld"], bubble: true, server: StroomTab.terugval, metBerichten: ["opinie"]).map(\.label), ["Alles", "Politiek", "Wereld", "Opinie", "Buiten je bubbel"])
        XCTAssertEqual(StreamView.tabs(interests: ["tech"], bubble: false, server: StroomTab.terugval, metBerichten: ["opinie"]).map(\.id), ["", "tech", "opinie"])
    }

    func testGeenOpinieZonderOpiniestukken() throws {
        let stream = [try item(["title": "Kabinet valt"])]
        let met = StroomTab.metBerichten(stream, tabs: StroomTab.terugval)
        XCTAssertTrue(met.isEmpty)
        XCTAssertFalse(StreamView.tabs(interests: [], bubble: true, server: StroomTab.terugval, metBerichten: met).map(\.label).contains("Opinie"))
    }

    func testColumnInOpinieRubriekEnAlles() throws {
        let column = try item(["opinion": true, "tabs": ["opinie"], "topics": ["voetbal"]])
        XCTAssertTrue(StreamView.past(column, "opinie", cat: nil))
        XCTAssertTrue(StreamView.past(column, "sport", cat: nil))
        XCTAssertTrue(StreamView.past(column, "", cat: nil))
        let nieuws = try item(["topics": ["voetbal"]])
        XCTAssertFalse(StreamView.past(nieuws, "opinie", cat: nil))
        XCTAssertTrue(StreamView.past(nieuws, "sport", cat: nil))
    }

    func testTerugvalOpOpinionEnType() throws {
        XCTAssertTrue(try item(["opinion": true]).inTab("opinie")) // feed van 1.2.0: nog geen tabs
        XCTAssertTrue(try item(["type": "opinie"]).inTab("opinie")) // feed van vóór opinion
        XCTAssertFalse(try item(["tabs": ["podcasts"], "opinion": true]).inTab("opinie")) // met tabs telt alleen de lijst
        XCTAssertFalse(try item(["opinion": true]).inTab("podcasts"))
    }

    // Een bericht met opinie/tabs én de media-aanwijzingen van de Editiefilter moet in één keer decoderen.
    func testOpinieTabsEnMediaVeldenSamen() throws {
        let it = try item(["opinion": true, "tabs": ["opinie"], "mediaType": "audio/mpeg", "podcastEpisode": "12", "feedMark": "podcast"])
        XCTAssertEqual(it.opinion, true)
        XCTAssertEqual(it.tabs, ["opinie"])
        XCTAssertEqual(it.mediaType, "audio/mpeg")
        XCTAssertEqual(it.podcastEpisode, "12")
        XCTAssertEqual(it.feedMark, "podcast")
        XCTAssertTrue(it.inTab("opinie"))
    }

    func testNieuweServerTabZonderAppUpdate() throws {
        let tabs = StroomTab.uit(try start(#","stroomTabs":[{"id":"opinie","label":"Opinie"},{"id":"podcasts","label":"Podcasts"}]"#).stroomTabs)
        XCTAssertEqual(tabs.map(\.id), ["opinie", "podcasts"])
        let stream = [try item(["tabs": ["podcasts"]]), try item(["tabs": ["opinie"]])]
        let rij = StreamView.tabs(interests: ["sport"], bubble: true, server: tabs, metBerichten: StroomTab.metBerichten(stream, tabs: tabs))
        XCTAssertEqual(rij.map(\.label), ["Alles", "Sport", "Opinie", "Podcasts", "Buiten je bubbel"])
        XCTAssertTrue(StreamView.past(stream[0], "podcasts", cat: nil))
        XCTAssertFalse(StreamView.past(stream[1], "podcasts", cat: nil))
    }

    func testDeLijstUitDeFeedWordtGecontroleerd() throws {
        XCTAssertEqual(StroomTab.uit(try start("").stroomTabs), StroomTab.terugval) // feed zonder de lijst
        XCTAssertEqual(StroomTab.uit(try start(#","stroomTabs":[]"#).stroomTabs), []) // de server zet alles uit
        // Een vreemde waarde breekt de feed niet.
        XCTAssertEqual(StroomTab.uit(try start(#","stroomTabs":{"x":1}"#).stroomTabs), StroomTab.terugval)
        let raar = #","stroomTabs":[{"id":"opinie","label":"Opinie"},{"id":"opinie","label":"Dubbel"},{"id":"sport","label":"Sport"},{"id":"bubbel","label":"X"},{"id":"Hoofd","label":"X"},{"id":"podcasts","label":""},{"id":"podcasts","label":" Podcasts "},"los",null,{"label":"Zonder id"}]"#
        XCTAssertEqual(StroomTab.uit(try start(raar).stroomTabs), [StroomTab(id: "opinie", label: "Opinie"), StroomTab(id: "podcasts", label: "Podcasts")])
        let veel = #","stroomTabs":[{"id":"a","label":"A"},{"id":"b","label":"B"},{"id":"c","label":"C"},{"id":"d","label":"D"},{"id":"e","label":"E"}]"#
        XCTAssertEqual(StroomTab.uit(try start(veel).stroomTabs).count, 4)
    }

    func testLegeRegelGelijkAanHetWeb() {
        XCTAssertEqual(StreamView.legeRegel(rub: "opinie", label: "Opinie", tab: true, names: "NOS"), "Nog geen opinie van NOS vandaag.")
        XCTAssertEqual(StreamView.legeRegel(rub: "opinie", label: "Opinie", tab: true, names: nil), "Nog geen opinie vandaag.")
        XCTAssertEqual(StreamView.legeRegel(rub: "podcasts", label: "Podcasts", tab: true, names: nil), "Nog geen podcasts vandaag.")
        XCTAssertEqual(StreamView.legeRegel(rub: "sport", label: "Sport", tab: false, names: nil), "Nog niets in Sport.")
        XCTAssertEqual(StreamView.legeRegel(rub: "wereld", label: "Wereld", tab: false, names: "NOS en NRC"), "Nog niets van NOS en NRC in Wereld.")
        XCTAssertEqual(StreamView.legeRegel(rub: "", label: "Alles", tab: false, names: nil), "Nog niets vandaag.")
        XCTAssertEqual(StreamView.legeRegel(rub: "bubbel", label: "Buiten je bubbel", tab: false, names: nil), "Nog niets buiten je bubbel.")
    }
}
