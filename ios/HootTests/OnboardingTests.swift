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

    override func setUp() {
        super.setUp()
        let d = UserDefaults.standard
        saved = Dictionary(uniqueKeysWithValues: hootKeys.compactMap { k in d.object(forKey: k).map { (k, $0) } })
    }

    override func tearDown() {
        let d = UserDefaults.standard
        for k in hootKeys { d.removeObject(forKey: k) }
        for (k, v) in saved { d.set(v, forKey: k) }
        super.tearDown()
    }

    // ---- Wat precies? over pagina's ----

    func testRowsWrapAtTheLineWidth() {
        XCTAssertEqual(WelcomePages.rows(chips: [], width: 300), 0)
        XCTAssertEqual(WelcomePages.rows(chips: [100, 100], width: 300), 1)
        // 100 + 8 + 100 + 8 + 100 = 316 > 300: de derde valt naar de volgende regel
        XCTAssertEqual(WelcomePages.rows(chips: [100, 100, 100], width: 300), 2)
        // een onderwerp breder dan de regel krijgt een regel voor zichzelf (en wordt niet breder geteld)
        XCTAssertEqual(WelcomePages.rows(chips: [500, 50], width: 300), 2)
    }

    func testGroupHeightGrowsByOneChipPerRow() {
        let one = WelcomePages.groupHeight(rows: 1)
        let two = WelcomePages.groupHeight(rows: 2)
        XCTAssertEqual(two - one, WelcomePages.chip + WelcomePages.gap)
    }

    func testSplitKeepsOrderAndFitsTheRoom() {
        // drie groepen van 100 met 24 ertussen op een pagina van 250: twee passen (224), de derde niet
        XCTAssertEqual(WelcomePages.split([100, 100, 100], room: 250, gap: 24), [[0, 1], [2]])
        XCTAssertEqual(WelcomePages.split([100, 100, 100], room: 1000, gap: 24), [[0, 1, 2]])
        // een groep die alleen al te hoog is, staat op een eigen pagina
        XCTAssertEqual(WelcomePages.split([400, 50], room: 300, gap: 24), [[0], [1]])
        XCTAssertEqual(WelcomePages.split([], room: 300, gap: 24), [[]])
    }

    func testEveryPageFitsWhenItCan() {
        let heights: [CGFloat] = [128, 178, 128, 178, 128]
        let room: CGFloat = 340
        for page in WelcomePages.split(heights, room: room, gap: 24) where page.count > 1 {
            let used = page.map { heights[$0] }.reduce(0, +) + 24 * CGFloat(page.count - 1)
            XCTAssertLessThanOrEqual(used, room)
        }
    }

    func testMetricsGrowWithTheTextSize() {
        let normal = WelcomePages.Metrics(.large)
        let big = WelcomePages.Metrics(.accessibility3)
        XCTAssertEqual(normal.chip, WelcomePages.chip) // bij normale tekst blijft 40
        XCTAssertGreaterThan(big.chip, normal.chip)
        XCTAssertGreaterThan(big.header, normal.header)
        XCTAssertGreaterThan(WelcomePages.groupHeight(rows: 2, metrics: big), WelcomePages.groupHeight(rows: 2, metrics: normal))
    }

    func testOversizedChipCountsItsExtraLine() {
        let m = WelcomePages.Metrics(.large)
        let plain = WelcomePages.groupHeight(chips: [100, 100], width: 300, metrics: m)
        XCTAssertEqual(plain, WelcomePages.groupHeight(rows: 1, metrics: m))
        XCTAssertGreaterThan(WelcomePages.groupHeight(chips: [500], width: 300, metrics: m), WelcomePages.groupHeight(rows: 1, metrics: m))
    }

    func testChunksSplitATallGroupIntoPagesOfMaxRows() {
        // drie onderwerpen per regel van 300 (3 x 90 + 2 x 8 = 286); twee regels per stuk
        let chips = [CGFloat](repeating: 90, count: 8)
        XCTAssertEqual(WelcomePages.chunks(chips: chips, width: 300, maxRows: 2), [[0, 1, 2, 3, 4, 5], [6, 7]])
        XCTAssertEqual(WelcomePages.chunks(chips: chips, width: 300, maxRows: 9), [[0, 1, 2, 3, 4, 5, 6, 7]])
        XCTAssertEqual(WelcomePages.chunks(chips: chips, width: 300, maxRows: 1), [[0, 1, 2], [3, 4, 5], [6, 7]])
        XCTAssertEqual(WelcomePages.chunks(chips: [], width: 300, maxRows: 2), [[]])
    }

    func testEveryChunkFitsItsRows() {
        let chips: [CGFloat] = [120, 80, 150, 60, 200, 90, 110, 70, 130]
        for maxRows in 1 ... 4 {
            for part in WelcomePages.chunks(chips: chips, width: 300, maxRows: maxRows) where !part.isEmpty {
                XCTAssertLessThanOrEqual(WelcomePages.rows(chips: part.map { chips[$0] }, width: 300), maxRows)
            }
        }
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
    }
}
