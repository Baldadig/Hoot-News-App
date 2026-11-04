import XCTest
@testable import Hoot

private final class Box<T>: @unchecked Sendable { var value: T; init(_ v: T) { value = v } }

// Build 47 (Bluesky, ronde 2): wie vroeger een vast server-account van Hoot volgde (Aaron Rupar, @atrupar.com)
// zag niets meer; een account dat in de laatste 36 uur niets plaatste zei niets; hoofdletters in een
// opgeslagen handle of een repost van een oud bericht aan het eind van een bladzijde liet posts wegvallen.
@MainActor
final class BlueskyLegacyTests: XCTestCase {
    nonisolated(unsafe) private var suite = ""
    nonisolated(unsafe) private var defaults: UserDefaults! = nil
    nonisolated(unsafe) private var savedFiles: [String: Data] = [:]
    nonisolated private static let files = ["saved.json", "read.json", "import.json", "edition.json"]
    nonisolated private var folder: URL { FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Hoot") }
    nonisolated(unsafe) private var transport: ((String, [String: String]) async throws -> [String: Any])!
    override func setUp() {
        suite = "hoot-bsky-legacy-" + UUID().uuidString
        defaults = UserDefaults(suiteName: suite)!
        transport = Bluesky.transport
        for name in Self.files { if let d = try? Data(contentsOf: folder.appendingPathComponent(name)) { savedFiles[name] = d }; try? FileManager.default.removeItem(at: folder.appendingPathComponent(name)) }
    }
    override func tearDown() {
        Bluesky.transport = transport
        defaults.removePersistentDomain(forName: suite)
        for name in Self.files {
            let url = folder.appendingPathComponent(name)
            if let data = savedFiles[name] { try? data.write(to: url, options: .atomic) } else { try? FileManager.default.removeItem(at: url) }
        }
        super.tearDown()
    }
    private func post(_ source: String, _ n: Int = 0) -> Item { Item(id: "p\(n)-" + source, source: source, kind: "post", title: "", summary: "Post \(n)", url: "https://bsky.app/profile/" + source + "/post/\(n)", publishedAt: ISO8601DateFormatter().string(from: .now)) }
    private func legacyStore(_ ids: [String], muted: [String] = []) -> HootStore {
        defaults.set("remote", forKey: HootStore.streamRepairKey)
        defaults.set(try! JSONEncoder().encode(true), forKey: "hoot.bluesky")
        defaults.set(try! JSONEncoder().encode(ids), forKey: "hoot.bskyInStream")
        defaults.set(try! JSONEncoder().encode(ids), forKey: "hoot.enabled")
        defaults.set(try! JSONEncoder().encode(muted), forKey: "hoot.muted")
        return HootStore(defaults: defaults)
    }

    // Alex: Rupar stond als oude server-bron in zijn gevolgde bronnen, niet in zijn eigen accounts.
    func testOldServerAccountBecomesOwnAccountAndShowsPosts() async throws {
        let store = legacyStore(["bsky:atrupar.com"]), p = post("bsky:atrupar.com")
        store.socialProfileLoader = { _ in BlueskyAccount(handle: "atrupar.com", name: "Aaron Rupar", avatar: nil) }
        store.socialPostsLoader = { _ in [p] }
        XCTAssertTrue(store.ownBluesky.isEmpty)
        await store.loadOwnPosts()
        XCTAssertEqual(store.ownBluesky.map(\.handle), ["atrupar.com"])
        XCTAssertEqual(store.posts.map(\.id), [p.id])
        XCTAssertEqual(store.stream.map(\.id), [p.id])
        XCTAssertEqual(store.syncedPrefs["bskyInStream"] as? [String], ["bsky:atrupar.com"])
        XCTAssertEqual((store.syncedPrefs["social"] as? [[String: Any]])?.first?["handle"] as? String, "atrupar.com")
    }

    func testRenamedAccountFollowsTheCurrentHandle() async throws {
        let store = legacyStore(["bsky:aaronrupar.bsky.social"]), p = post("bsky:atrupar.com")
        store.socialProfileLoader = { handle in
            if handle == "atrupar.com" { return BlueskyAccount(handle: "atrupar.com", name: "Aaron Rupar", avatar: nil) }
            throw Bluesky.Failure.notFound
        }
        store.socialPostsLoader = { _ in [p] }
        XCTAssertEqual(store.bskyInStream, ["bsky:atrupar.com"]) // het oude id volgt de nieuwe handle
        await store.loadOwnPosts()
        XCTAssertEqual(store.ownBluesky.map(\.handle), ["atrupar.com"])
        XCTAssertEqual(store.stream.map(\.id), [p.id])
        // En een opgeslagen account met de oude handle leest als de nieuwe.
        let old = try JSONDecoder().decode(BlueskyAccount.self, from: Data(#"{"handle":"AaronRupar.bsky.social","name":"Aaron"}"#.utf8))
        XCTAssertEqual(old.handle, "atrupar.com")
    }

    func testGoneAccountLeavesTheChoiceAndTemporaryErrorTriesAgain() async throws {
        let store = legacyStore(["bsky:weg.example", "bsky:traag.example"])
        let calls = Box(0)
        store.socialProfileLoader = { handle in
            if handle == "weg.example" { throw Bluesky.Failure.notFound }
            calls.value += 1
            if calls.value == 1 { throw Bluesky.Failure.status(503) }
            return BlueskyAccount(handle: "traag.example", name: "Traag", avatar: nil)
        }
        store.socialPostsLoader = { _ in [] }
        await store.loadOwnPosts()
        XCTAssertEqual(store.bskyInStream, ["bsky:traag.example"]) // weg.example is er niet meer
        XCTAssertTrue(store.ownBluesky.isEmpty)
        await store.loadOwnPosts()
        XCTAssertEqual(store.ownBluesky.map(\.handle), ["traag.example"])
    }

    // Overnemen -> weghalen -> opnieuw starten: het oude id komt niet terug (het stond ook in `enabled`).
    func testRemovedAdoptedAccountDoesNotComeBack() async throws {
        let store = legacyStore(["bsky:atrupar.com"])
        let calls = Box(0)
        store.socialProfileLoader = { _ in calls.value += 1; return BlueskyAccount(handle: "atrupar.com", name: "Aaron Rupar", avatar: nil) }
        store.socialPostsLoader = { _ in [] }
        await store.loadOwnPosts()
        XCTAssertEqual(store.ownBluesky.map(\.handle), ["atrupar.com"])
        XCTAssertFalse(store.enabled.contains("bsky:atrupar.com"))
        store.removeBluesky("bsky:atrupar.com")
        XCTAssertFalse(store.enabled.contains("bsky:atrupar.com"))
        XCTAssertFalse(store.bskyInStream.contains("bsky:atrupar.com"))
        let again = HootStore(defaults: defaults) // volgende start
        again.socialProfileLoader = { _ in calls.value += 1; return BlueskyAccount(handle: "atrupar.com", name: "Aaron Rupar", avatar: nil) }
        again.socialPostsLoader = { _ in [] }
        let before = calls.value
        await again.loadOwnPosts()
        XCTAssertEqual(calls.value, before, "er is niets meer om over te nemen")
        XCTAssertTrue(again.ownBluesky.isEmpty)
    }

    func testMutedOldAccountIsNotFollowedAgain() async throws {
        let store = legacyStore(["bsky:atrupar.com"], muted: ["bsky:atrupar.com"])
        store.socialProfileLoader = { _ in XCTFail("een uitgezet account haal je niet op"); throw Bluesky.Failure.notFound }
        store.socialPostsLoader = { _ in [] }
        await store.loadOwnPosts()
        XCTAssertTrue(store.ownBluesky.isEmpty)
    }

    // ---- Wat het account laat zien als er niets is ----
    func testQuietAccountSaysSoInsteadOfNothing() async throws {
        defaults.set("remote", forKey: HootStore.streamRepairKey)
        let store = HootStore(defaults: defaults)
        store.socialProfileLoader = { _ in BlueskyAccount(handle: "stil.example", name: "Stil", avatar: nil) }
        store.socialPostsLoader = { _ in [] }
        store.bluesky = true
        try await store.addBluesky("stil.example")
        XCTAssertEqual(store.ownState["bsky:stil.example"], .posts(0))
        let text = BlueskyFeed.emptyText(people: store.followedSocial, who: nil, state: store.ownState)
        XCTAssertEqual(text.title, "Stil plaatste niets in de afgelopen anderhalve dag")
        XCTAssertFalse(text.title.contains("uur"))
    }

    func testFailureIsHonestAndKeepsEarlierPosts() async throws {
        defaults.set("remote", forKey: HootStore.streamRepairKey)
        let store = HootStore(defaults: defaults), p = post("bsky:a.example")
        store.socialProfileLoader = { _ in BlueskyAccount(handle: "a.example", name: "A", avatar: nil) }
        let fail = Box(false)
        store.socialPostsLoader = { _ in if fail.value { throw Bluesky.Failure.status(429) }; return [p] }
        store.bluesky = true
        try await store.addBluesky("a.example")
        XCTAssertEqual(store.posts.count, 1)
        fail.value = true
        await store.loadOwnPosts()
        XCTAssertEqual(store.ownState["bsky:a.example"], .unreachable)
        XCTAssertEqual(store.posts.count, 1) // de vorige posts blijven staan
        XCTAssertEqual(BlueskyFeed.emptyText(people: store.followedSocial, who: nil, state: store.ownState).title, "Bluesky reageert niet")
        store.socialPostsLoader = { _ in throw Bluesky.Failure.notFound }
        await store.loadOwnPosts()
        XCTAssertEqual(store.ownState["bsky:a.example"], .gone)
        XCTAssertEqual(BlueskyFeed.emptyText(people: store.followedSocial, who: nil, state: store.ownState).title, "A bestaat niet meer")
    }

    // ---- De ophaalronde zelf ----
    private func entry(_ handle: String, _ n: Int, minutesAgo: Double, repost: Double? = nil) -> [String: Any] {
        let at = ISO8601DateFormatter().string(from: Date.now.addingTimeInterval(-minutesAgo * 60))
        var e: [String: Any] = ["post": ["uri": "at://did:plc:x/app.bsky.feed.post/\(handle)\(n)", "indexedAt": at, "author": ["handle": handle], "record": ["text": "t\(n)", "createdAt": at]]]
        if let repost { e["reason"] = ["$type": "app.bsky.feed.defs#reasonRepost", "indexedAt": ISO8601DateFormatter().string(from: Date.now.addingTimeInterval(-repost * 60))] }
        return e
    }
    func testHandleCaseDoesNotHideOwnPosts() async throws {
        Bluesky.transport = { _, _ in ["feed": [self.entry("atrupar.com", 1, minutesAgo: 5)]] }
        let account = BlueskyAccount(handle: "atrupar.com", name: "A", avatar: nil)
        let first = try await Bluesky.posts(of: account)
        XCTAssertEqual(first.count, 1)
        // een account zoals een ander toestel of import.json het bewaarde, met hoofdletters, zonder canonieke init
        let raw = try JSONDecoder().decode(BlueskyAccount.self, from: Data(#"{"handle":"ATrupar.com","name":"A"}"#.utf8))
        let second = try await Bluesky.posts(of: raw)
        XCTAssertEqual(second.count, 1)
    }
    func testPagingContinuesPastARepostOfAnOldPost() async throws {
        let page = Box(0)
        Bluesky.transport = { _, query in
            defer { page.value += 1 }
            if query["cursor"] == nil { return ["feed": [self.entry("a.example", 1, minutesAgo: 5), self.entry("old.example", 9, minutesAgo: 60 * 24 * 40, repost: 90)], "cursor": "c1"] }
            return ["feed": [self.entry("a.example", 3, minutesAgo: 180), self.entry("a.example", 4, minutesAgo: 600)]]
        }
        let posts = try await Bluesky.posts(of: BlueskyAccount(handle: "a.example", name: "A", avatar: nil))
        XCTAssertEqual(posts.compactMap(\.summary).sorted(), ["t1", "t3", "t4"])
        XCTAssertEqual(page.value, 2)
    }
}
