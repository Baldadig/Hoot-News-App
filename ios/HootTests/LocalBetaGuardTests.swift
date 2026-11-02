import XCTest
@testable import Hoot

@MainActor final class LocalBetaGuardTests: XCTestCase {
    func testCompileFlagMatchesBuild() {
        #if HOOT_LOCAL_BETA
        XCTAssertTrue(Account.localBeta)
        XCTAssertNil(Account().session)
        XCTAssertEqual(Account().status,.out)
        #else
        XCTAssertFalse(Account.localBeta)
        #endif
    }
    #if HOOT_LOCAL_BETA
    func testLocalBetaCannotContactAccountServiceOrEraseChoices() async throws {
        let a = Account(), store = HootStore()
        let originalInterests = store.interests
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [BetaBlockedURLProtocol.self]
        BetaBlockedURLProtocol.reset()
        a.stub(uid:"synthetic-beta-user",transport:URLSession(configuration:config),expires:.distantPast)
        await a.start(store)
        await a.pull() // laagste transportguard, ook met een aanwezige (synthetische) sessie
        XCTAssertEqual(BetaBlockedURLProtocol.calls,0)
        let deleted = await a.deleteAccount()
        XCTAssertFalse(deleted)
        await a.signOut()
        XCTAssertEqual(store.interests,originalInterests)
        XCTAssertEqual(BetaBlockedURLProtocol.calls,0)
        XCTAssertNil(a.session)
    }
    #endif
}

#if HOOT_LOCAL_BETA
private final class BetaBlockedURLProtocol: URLProtocol {
    private static let lock = NSLock()
    nonisolated(unsafe) private static var count = 0
    static var calls: Int { lock.withLock { count } }
    static func reset() { lock.withLock { count = 0 } }
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.lock.withLock { Self.count += 1 }
        client?.urlProtocol(self,didFailWithError:URLError(.cancelled))
    }
    override func stopLoading() {}
}
#endif
