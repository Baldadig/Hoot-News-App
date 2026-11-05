import XCTest
@testable import Hoot

// Echte Bluesky-API, alleen op verzoek (TEST_RUNNER_HOOT_LIVE=1): een meetinstrument voor de diagnose,
// geen vast onderdeel van de suite (het hangt af van wie er vanavond post).
@MainActor
final class BlueskyLiveTests: XCTestCase {
    func testLiveAccounts() async throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["HOOT_LIVE"] == "1", "alleen op verzoek")
        let handles = ["nrc.nl", "jay.bsky.team", "pfrazee.com", "atrupar.com", "aaronrupar.bsky.social"]
        for h in handles {
            let account = BlueskyAccount(handle: h, name: h, avatar: nil)
            do {
                let posts = try await Bluesky.posts(of: account)
                print("LIVE \(h): \(posts.count) posts, nieuwste \(posts.first?.publishedAt ?? "-")")
            } catch { print("LIVE \(h): FOUT \(error.localizedDescription)") }
        }
        // De winkel zoals Alex hem kan hebben: oude server-bron als id, geen eigen account.
        let suite = "hoot-live-" + UUID().uuidString
        let d = UserDefaults(suiteName: suite)!
        defer { d.removePersistentDomain(forName: suite) }
        d.set(try JSONEncoder().encode(true), forKey: "hoot.bluesky")
        d.set(try JSONEncoder().encode(["bsky:aaronrupar.bsky.social", "bsky:atrupar.com"]), forKey: "hoot.bskyInStream")
        d.set(try JSONEncoder().encode(["bsky:atrupar.com"]), forKey: "hoot.enabled")
        let store = HootStore(defaults: d)
        await store.loadOwnPosts()
        print("LIVE winkel: ownBluesky=\(store.ownBluesky.map(\.handle)) posts=\(store.posts.count) stroom=\(store.stream.filter(\.isPost).count) gevolgd=\(store.followedSocial.map(\.id)) keuze=\(store.bskyInStream.sorted()) state=\(store.ownState)")
    }
}
