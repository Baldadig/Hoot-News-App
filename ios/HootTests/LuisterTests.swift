import XCTest
@testable import Hoot

// Luister verder (build 56): gelijk aan shared/luister-weergave.mjs en tests/luister-zichtbaar.test.mjs op het web.
// Weergave alleen met het veld luister, de regel zonder kloktijd, wat een tik doet, de keuze onthouden, Niet tonen.
@MainActor final class LuisterTests: XCTestCase {
    static let json = """
    {"id":"s1","itemIds":["a"],"luister":{"show":"De Dag","showId":"nos-de-dag","bron":"nos","aflevering":"De VVD in (kabinets)crisis","duur":1740,"tijd":"2026-11-13T04:10:00.000Z","link":"https://www.nporadio1.nl/podcasts/de-dag/1","apple":"https://podcasts.apple.com/nl/podcast/x/id1339219119?i=1","spotify":"https://open.spotify.com/show/2Oeh3L5u0y9R54jEz8Mgty","cover":"https://podcast.npo.nl/data/thumb/de-dag.jpg","andere":[{"show":"Today in Focus","showId":"today-in-focus","bron":"guardian","alleenVolgers":true,"aflevering":"The crisis","tijd":"2026-11-12T04:10:00.000Z","link":"https://www.theguardian.com/x"},{"kapot":true},{"show":"NRC Vandaag","showId":"nrc-vandaag","bron":"nrc","aflevering":"Crisis","tijd":"2026-11-10T04:10:00.000Z","link":"https://www.nrc.nl/x"}]}}
    """
    static var story: Story { try! JSONDecoder().decode(Story.self, from: Data(json.utf8)) }
    static let now = HootDate.parse("2026-11-14T15:00:00.000Z")! // zaterdag

    func testDecodeLeestNooitFout() throws {
        let s = Self.story
        XCTAssertEqual(s.luister?.show, "De Dag")
        XCTAssertEqual(s.luister?.andere?.count, 2, "een kapotte andere valt weg")
        let zonder = try JSONDecoder().decode(Story.self, from: Data(#"{"id":"s2","itemIds":["a"],"luister":{"show":1}}"#.utf8))
        XCTAssertNil(zonder.luister, "een kapot veld wordt nil, het verhaal blijft")
        // En terug: opgeslagen verhalen houden het veld.
        let terug = try JSONDecoder().decode(Story.self, from: JSONEncoder().encode(s))
        XCTAssertEqual(terug.luister, s.luister)
    }

    func testAfleveringenVolgenDeBronkeuze() {
        let l = Self.story.luister
        XCTAssertEqual(Luister.afleveringen(l, volgt: { _ in false }).map(\.id), ["nos-de-dag", "nrc-vandaag"])
        XCTAssertEqual(Luister.afleveringen(l, volgt: { $0 == "guardian" }).map(\.id), ["nos-de-dag", "today-in-focus", "nrc-vandaag"])
        XCTAssertEqual(Luister.afleveringen(nil, volgt: { _ in true }), [])
    }

    func testRegelZonderKloktijd() {
        let a = Self.story.luister!
        XCTAssertEqual(Luister.regel(a, now: Self.now), "De Dag · gisteren · 29 min")
        XCTAssertEqual(Luister.dag(StoryLuister(show: "x", aflevering: "y", tijd: "2026-11-13T23:30:00.000Z", link: "https://x.nl"), now: Self.now), "vandaag")
        XCTAssertEqual(Luister.dag(StoryLuister(show: "x", aflevering: "y", tijd: "2026-11-12T08:00:00.000Z", link: "https://x.nl"), now: Self.now), "donderdag")
        XCTAssertEqual(Luister.dag(StoryLuister(show: "x", aflevering: "y", verschenen: "2026-11-10", link: "https://x.nl"), now: Self.now), "dinsdag")
        XCTAssertNil(Luister.dag(StoryLuister(show: "x", aflevering: "y", tijd: "2026-11-01T08:00:00.000Z", link: "https://x.nl"), now: Self.now))
        XCTAssertEqual(Luister.duur(20), "1 min")
        XCTAssertNil(Luister.regel(a, now: Self.now).range(of: #"\d{1,2}[:.]\d{2}"#, options: .regularExpression), "geen kloktijd")
        XCTAssertEqual(Luister.label(a, app: "spotify", now: Self.now), "Luister verder, De Dag, gisteren, 29 minuten. Opent in Spotify.")
        XCTAssertEqual(Luister.label(a, app: "", now: Self.now), "Luister verder, De Dag, gisteren, 29 minuten.")
    }

    func testTikEnLink() {
        XCTAssertEqual(Luister.bijTik("uit", apps: ["apple"]), .niets)
        XCTAssertEqual(Luister.bijTik("spotify", apps: []), .open("spotify", onthoud: false))
        XCTAssertEqual(Luister.bijTik("", apps: ["apple", "spotify"]), .vraag(["apple", "spotify"]), "eerste tik: de vraag")
        XCTAssertEqual(Luister.bijTik("", apps: ["spotify"]), .open("spotify", onthoud: true), "één app: niets vragen")
        XCTAssertEqual(Luister.bijTik("", apps: []), .open(nil, onthoud: false), "geen app: de pagina van de uitgever")
        XCTAssertEqual(Luister.bijTik("vragen", apps: ["apple"]), .vraag(["apple"]))
        let a = Self.story.luister!
        XCTAssertEqual(Luister.link(a, app: "apple")?.absoluteString, a.apple)
        XCTAssertEqual(Luister.link(a, app: "spotify")?.absoluteString, a.spotify)
        XCTAssertEqual(Luister.link(a, app: nil)?.absoluteString, a.link)
        XCTAssertEqual(Luister.apps.map(\.naam), ["Apple Podcasts", "Spotify"], "Podimo nog niet")
        XCTAssertEqual(Luister.keuzes.map(\.naam), ["Apple Podcasts", "Spotify", "Altijd vragen", "Niet tonen"])
    }

    func testKeuzeOnthoudenEnNietTonen() {
        let suite = "luister-tests-\(UUID().uuidString)"
        let d = UserDefaults(suiteName: suite)!
        defer { d.removePersistentDomain(forName: suite) }
        let store = HootStore(defaults: d)
        XCTAssertEqual(store.podcastApp, "", "nog niet gekozen")
        store.podcastApp = "spotify"
        XCTAssertEqual(HootStore(defaults: d).podcastApp, "spotify", "onthouden op dit toestel")
        let s = Self.story
        XCTAssertEqual(store.luister(s).first?.show, "De Dag")
        store.podcastApp = "uit"
        XCTAssertTrue(store.luister(s).isEmpty, "Niet tonen: niets")
        var zonder = s
        zonder.luister = nil
        store.podcastApp = ""
        XCTAssertTrue(store.luister(zonder).isEmpty, "alleen met het veld luister")
    }

    func testLezerToontDeRijAlleenMetLuister() {
        let item = Item(id: "a", source: "nos", title: "Crisisoverleg", url: "https://nos.nl/")
        let article = Article(title: "Crisisoverleg", content: "<p>Tekst.</p>", length: 100)
        let zonder = ReaderHTML.page(article, item: item, sourceName: "NOS", size: 1)
        XCTAssertFalse(zonder.contains("class=\"luister\""))
        let a = Self.story.luister!
        let met = ReaderHTML.page(article, item: item, sourceName: "NOS", size: 1, luister: a, podcastApp: "spotify", now: Self.now)
        XCTAssertTrue(met.contains("href=\"hoot://luister\""))
        XCTAssertTrue(met.contains("De Dag · gisteren · 29 min"))
        XCTAssertTrue(met.contains("Spotify\u{00A0}↗"))
        XCTAssertTrue(met.contains("aria-label=\"Luister verder, De Dag, gisteren, 29 minuten. Opent in Spotify.\""), "VoiceOver: één link")
        XCTAssertTrue(met.contains("src=\"https://podcast.npo.nl/data/thumb/de-dag.jpg\""), "de cover van de uitgever")
        // De rij staat na de bronregel en vóór de tekst.
        let meta = met.range(of: "class=\"meta meta--luister\"")!, rij = met.range(of: "class=\"luister\"")!, tekst = met.range(of: "<p>Tekst.</p>")!
        XCTAssertTrue(meta.lowerBound < rij.lowerBound && rij.lowerBound < tekst.lowerBound)
        let vragen = ReaderHTML.luisterRij(a, app: "vragen", now: Self.now)
        XCTAssertTrue(vragen.contains(">↗</span>"), "nog niet gekozen of Altijd vragen: alleen de pijl")
        XCTAssertTrue(ReaderHTML.luisterRij(a, app: "apple", kleineApp: true, now: Self.now).contains(">↗</span>"), "grootste tekst: de naam valt weg")
    }
}
