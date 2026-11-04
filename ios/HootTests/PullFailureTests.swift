import XCTest
@testable import Hoot

// Een mislukte verversing mag nergens als gelukt tonen (keuring b11-pull-horizon, blokker 2 en punt 1).
// Het netwerk is uit met de debugvlag HootOffline; de bewaarde kopie in Caches speelt de oude Selectie.
@MainActor final class PullFailureTests: XCTestCase {
    private let vak = Data(#"{"id":"2026-W44","fields":[]}"#.utf8)

    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: "HootOffline")
        try? FileManager.default.removeItem(at: HootAPI.Offline.file(for: HootAPI.url("api/vak")))
        super.tearDown()
    }

    func testSelectieMetBewaardeKopieBlijftStaanMaarIsMislukt() async throws {
        try vak.write(to: HootAPI.Offline.file(for: HootAPI.url("api/vak")), options: .atomic)
        UserDefaults.standard.set(true, forKey: "HootOffline")
        let store = HootStore()
        await store.loadDigest(force: true)
        XCTAssertNotNil(store.digest, "de bewaarde Selectie blijft staan")
        XCTAssertEqual(store.digestStatus, .ready)
        XCTAssertTrue(store.digestRefreshFailed, "maar de verversing is mislukt: fout-afloop en juist VoiceOver-label")
    }

    func testSelectieZonderKopieEnZonderNetwerkIsMislukt() async {
        try? FileManager.default.removeItem(at: HootAPI.Offline.file(for: HootAPI.url("api/vak")))
        UserDefaults.standard.set(true, forKey: "HootOffline")
        let store = HootStore()
        await store.loadDigest(force: true)
        XCTAssertNil(store.digest)
        XCTAssertEqual(store.digestStatus, .failed)
        XCTAssertTrue(store.digestRefreshFailed)
    }

    func testEditieEnStroomZijnMisluktAlsDeKernMislukt() async {
        let store = HootStore()
        XCTAssertFalse(store.coreFailed, "niets geladen is nog geen fout van het trekgebaar")
        UserDefaults.standard.set(true, forKey: "HootOffline")
        await store.load()
        XCTAssertTrue(store.coreFailed, "zonder verbinding (of uit de bewaarde kopie) lukte de kern niet")
        UserDefaults.standard.removeObject(forKey: "HootOffline")
    }
}
