import XCTest
@testable import Hoot

// Het welkom: niets scrolt (Wat precies? verdeelt zich over pagina's die passen), het voorstel voor je
// bronnen is neutraal (alleen gratis, Nederlands eerst) en uitloggen wist je keuzes op het toestel.
final class OnboardingTests: XCTestCase {
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
