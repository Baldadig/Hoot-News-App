import XCTest
@testable import Hoot

// Het welkom: niets scrolt (Wat precies? verdeelt zich over pagina's die passen), het voorstel voor je
// bronnen is neutraal (alleen gratis, Nederlands eerst) en uitloggen wist je keuzes op het toestel.
final class OnboardingTests: XCTestCase {
    // De winkel schrijft naar UserDefaults.standard van de app waarin de test draait. Zet vooraf alle
    // `hoot.*`-sleutels opzij en zet ze na elke test terug, zodat de simulator zijn data houdt en de
    // volgorde van de tests er niet toe doet.
    private var saved: [String: Any] = [:]
    private var hootKeys: [String] { UserDefaults.standard.dictionaryRepresentation().keys.filter { $0.hasPrefix("hoot.") } }

    // Uitloggen wist ook Bewaard en gelezen (saved.json, read.json in Application Support/Hoot): die
    // bestanden gaan net zo opzij en terug.
    private var files: [String: Data] = [:]
    private static let folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Hoot", isDirectory: true)
    private static let names = ["saved.json", "read.json"]

    override func setUp() {
        super.setUp()
        let d = UserDefaults.standard
        saved = Dictionary(uniqueKeysWithValues: hootKeys.compactMap { k in d.object(forKey: k).map { (k, $0) } })
        files = Dictionary(uniqueKeysWithValues: Self.names.compactMap { n in (try? Data(contentsOf: Self.folder.appendingPathComponent(n))).map { (n, $0) } })
    }

    override func tearDown() {
        let d = UserDefaults.standard
        for k in hootKeys { d.removeObject(forKey: k) }
        for (k, v) in saved { d.set(v, forKey: k) }
        for n in Self.names {
            let url = Self.folder.appendingPathComponent(n)
            if let data = files[n] { try? data.write(to: url, options: .atomic) } else { try? FileManager.default.removeItem(at: url) }
        }
        super.tearDown()
    }

    // ---- Volg je bronnen (FollowList, gelijk aan src/lib/follow-welcome.js) ----

    private static let catalog: [Source] = [
        Source(id: "nos", name: "NOS", cat: "nl", paid: false, lang: "nl", about: "Het publieke nieuws"),
        Source(id: "nu", name: "NU.nl", cat: "nl", paid: false, lang: "nl"),
        Source(id: "rtl", name: "RTL Nieuws", cat: "nl", paid: false, lang: "nl"),
        Source(id: "nrc", name: "NRC", cat: "nl", paid: true, lang: "nl"),
        Source(id: "tweakers", name: "Tweakers", cat: "tech", paid: false, lang: "nl", about: "Technieuws en reviews"),
        Source(id: "vi", name: "Voetbal International", cat: "sport", paid: false, lang: "nl"),
        Source(id: "nos-sport", name: "NOS Sport", cat: "sport", paid: false, lang: "nl"),
        Source(id: "raar", name: "Raar", cat: "iets", paid: false),
    ]

    @MainActor func testFreeStartIsNosNuRtlAndNeverPaid() {
        XCTAssertEqual(FollowList.freeStart(Self.catalog).map(\.id), ["nos", "nu", "rtl"])
        XCTAssertEqual(FollowList.freeStart([Source(id: "nos", name: "NOS", paid: true), Source(id: "nu", name: "NU.nl")]).map(\.id), ["nu"])
    }

    @MainActor func testLaterAndQuickStartHaveNoSport() {
        let ids = FollowList.startIds(Self.catalog)
        XCTAssertEqual(Array(ids.prefix(3)), ["nos", "nu", "rtl"])
        XCTAssertTrue(ids.allSatisfy { id in Self.catalog.first { $0.id == id }?.cat != "sport" })
    }

    @MainActor func testGroupsInCatalogOrderWithoutFreeStartAndSportApart() {
        let groups = FollowList.groups(Self.catalog)
        XCTAssertEqual(groups.map(\.cat), ["nl", "tech", "sport", "overig"])
        XCTAssertEqual(groups[0].sources.map(\.id), ["nrc"])
        XCTAssertEqual(groups.flatMap(\.sources).count + 3, Self.catalog.count)
    }

    @MainActor func testSearchFindsSportToo() {
        XCTAssertEqual(FollowList.find(Self.catalog, "voetbal").map(\.id), ["vi"])
        XCTAssertEqual(FollowList.find(Self.catalog, "reviews").map(\.id), ["tweakers"])
        XCTAssertEqual(FollowList.find(Self.catalog, "  "), [])
    }

    @MainActor func testLinesAreLikeTheWeb() {
        XCTAssertEqual(FollowList.line(0), "Nog niets gevolgd")
        XCTAssertEqual(FollowList.line(1), "1 bron gevolgd")
        XCTAssertEqual(FollowList.line(3), "3 bronnen gevolgd")
        XCTAssertEqual(FollowList.sourceLine(["NOS", "NU.nl", "RTL Nieuws", "BBC"]), "NOS, NU.nl en 2 meer")
        XCTAssertEqual(FollowList.followed(Self.catalog, ["tweakers", "nos", "weg"]).map(\.id), ["tweakers", "nos"])
    }

    @MainActor func testPreviewShowsNewestHeadlinePerFollowedSource() {
        let items = [
            Item(id: "a", source: "nos", kind: "article", title: "Oud", url: "https://example.org", publishedAt: "2026-11-04T06:00:00Z"),
            Item(id: "b", source: "nos", kind: "article", title: "Nieuw", url: "https://example.org", publishedAt: "2026-11-04T08:00:00Z"),
            Item(id: "c", source: "tweakers", kind: "article", title: "Tech", url: "https://example.org", publishedAt: "2026-11-04T07:00:00Z"),
            Item(id: "d", source: "vi", kind: "article", title: "Sport", url: "https://example.org", publishedAt: "2026-11-04T09:00:00Z"),
        ]
        XCTAssertEqual(FollowList.preview(items, Self.catalog, ["nos", "tweakers"]).map(\.title), ["Nieuw", "Tech"])
        XCTAssertEqual(FollowList.preview(items, Self.catalog, []).map(\.id), ["b"]) // nog niets: het gratis begin
        XCTAssertEqual(FollowList.preview(items, Self.catalog, ["nos"]).first?.source, "NOS")
    }

    // ---- Het voorstel ----

    @MainActor func testSuggestionStartsWithFreeDutchSources() {
        let store = HootStore()
        XCTAssertEqual(store.suggested(interests: []), ["nos", "nu", "rtl"])
    }

    @MainActor func testSuggestionFollowsInterestsWithoutDuplicates() {
        let store = HootStore()
        let ids = store.suggested(interests: ["cultuur", "sport", "tech", "wereld", "politiek"])
        XCTAssertEqual(Array(ids.prefix(3)), ["nos", "nu", "rtl"])
        XCTAssertEqual(Set(ids).count, ids.count)
        for id in ["nos-cultuur", "3voor12", "nos-sport", "vi", "tweakers", "bbc"] { XCTAssertTrue(ids.contains(id), id) }
    }

    @MainActor func testSuggestionNeverHasASubscription() {
        let paid: Set = ["nrc", "volkskrant", "trouw", "ftm", "ad", "parool", "nyt", "economist", "fd", "ft", "nature"]
        let all = Rubriek.alle.map(\.id)
        let store = HootStore()
        XCTAssertTrue(Set(store.suggested(interests: all)).isDisjoint(with: paid))
        // ... maar bij Aanpassen staan ze wel als aanbod (aan te zetten, niet vooraf aan)
        XCTAssertTrue(Set(HootStore.alsoFor.values.flatMap { $0 }).intersection(paid).isEmpty == false)
    }

    // "Liever meteen lezen" zette sportbronnen aan zonder dat je Sport koos (onboarding-rapport 4-11).
    @MainActor func testQuickStartHasNoSport() {
        XCTAssertFalse(HootStore.starter.contains("nos-sport"))
        XCTAssertFalse(HootStore.starter.contains("vi"))
        XCTAssertFalse(HootStore.starterGroups.contains { $0.label == "Sport" })
        XCTAssertEqual(Array(HootStore.starter.prefix(3)), ["nos", "nu", "rtl"])
    }

    @MainActor func testNoStartingProfession() {
        // De standaard is leeg: een nieuwe lezer kiest zijn vak zelf (of later), nooit dat van een ander.
        UserDefaults.standard.removeObject(forKey: "hoot.digestFields")
        XCTAssertEqual(HootStore().digestFields, [])
    }

    // ---- Uitloggen ----

    @MainActor func testForgetChoicesStartsNeutral() {
        let store = HootStore()
        store.interests = ["politiek", "tech"]
        store.topics = ["nederland"]
        store.digestFields = ["ai", "ux"]
        store.favorites = ["nos"]
        store.forgetChoices()
        XCTAssertEqual(store.interests, [])
        XCTAssertEqual(store.topics, [])
        XCTAssertEqual(store.digestFields, [])
        XCTAssertEqual(store.favorites, [])
        // Bewaard en wat je las zijn persoonlijk: ook weg van het toestel.
        XCTAssertEqual(store.saved.count, 0)
        XCTAssertEqual(store.readIds, [])
    }

    // ---- De Stroom ----

    // Alleen Alles en de hoofdrubrieken die je koos, in vaste volgorde, Buiten je bubbel als laatste.
    func testStreamTabsAreOnlyChosenRubriekenInFixedOrder() {
        XCTAssertEqual(StreamView.tabs(interests: ["sport", "politiek", "wereld"], bubble: true).map(\.id), ["", "politiek", "wereld", "sport", "bubbel"])
        XCTAssertEqual(StreamView.tabs(interests: ["cultuur", "binnenland"], bubble: false).map(\.label), ["Alles", "Binnenland", "Cultuur"])
        XCTAssertEqual(StreamView.tabs(interests: [], bubble: true).map(\.label), ["Alles", "Politiek", "Binnenland", "Wereld", "Economie", "Tech", "Wetenschap", "Cultuur", "Sport", "Buiten je bubbel"])
        let all = StreamView.tabs(interests: Rubriek.alle.map(\.id).reversed(), bubble: true).map(\.label)
        XCTAssertEqual(all, ["Alles", "Politiek", "Binnenland", "Wereld", "Economie", "Tech", "Wetenschap", "Cultuur", "Sport", "Buiten je bubbel"])
    }
}
