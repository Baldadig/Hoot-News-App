import AuthenticationServices
import Security
import XCTest
@testable import Hoot

// Accounts voor iedereen (vangnet rpc/join) en eerlijk verwijderen met Apple. Echte Account-methoden;
// het netwerk en het Apple-blad zijn nep. Geen echte accounts, geen echte Apple-aanroep.
@MainActor
final class AccountOpenDeleteTests: XCTestCase {
    nonisolated(unsafe) private var defaults: [String: Any] = [:]
    nonisolated(unsafe) private var emptyKeychainAtStart = false

    override func setUp() {
        super.setUp()
        defaults = UserDefaults.standard.dictionaryRepresentation().filter { $0.key.hasPrefix("hoot.") }
        FakeAccountServer.reset()
    }
    override func tearDown() {
        for k in UserDefaults.standard.dictionaryRepresentation().keys where k.hasPrefix("hoot.") { UserDefaults.standard.removeObject(forKey: k) }
        for (k, v) in defaults { UserDefaults.standard.set(v, forKey: k) }
        if emptyKeychainAtStart {
            SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "nl.hootnews.Hoot", kSecAttrAccount as String: "session"] as CFDictionary)
        }
        FakeAccountServer.reset()
        super.tearDown()
    }

    private func account() throws -> Account {
        let a = Account()
        try XCTSkipIf(a.status != .out, "geen test over een echte Keychain-sessie")
        emptyKeychainAtStart = true
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [FakeAccountServer.self]
        a.stub(uid: "test-user", transport: URLSession(configuration: config))
        return a
    }

    // ---- Accounts voor iedereen ----

    func testProfileExistsMeansMemberWithoutJoin() async throws {
        let a = try account()
        FakeAccountServer.profileExists = true
        await a.start(HootStore())
        XCTAssertEqual(a.status, .member)
        XCTAssertFalse(FakeAccountServer.called("join"))
    }

    func testMissingProfileCallsJoinOnceThenMember() async throws {
        let a = try account()
        FakeAccountServer.profileExists = false
        FakeAccountServer.joinCreatesProfile = true
        await a.start(HootStore())
        XCTAssertEqual(FakeAccountServer.count("join"), 1)
        XCTAssertEqual(a.status, .member)
        XCTAssertEqual(a.uid, "test-user")
    }

    func testJoinFailingLeavesPendingWithoutSync() async throws {
        let a = try account()
        FakeAccountServer.profileExists = false
        FakeAccountServer.joinStatus = 404 // vangnet nog niet in de database
        await a.start(HootStore())
        XCTAssertEqual(FakeAccountServer.count("join"), 1)
        XCTAssertEqual(a.status, .pending)
        XCTAssertNil(a.uid, "zonder profiel geen eigen Editie")
        XCTAssertFalse(FakeAccountServer.called("user_state"), "zonder profiel synchroniseert er niets")
        // Opnieuw, nu met profiel.
        FakeAccountServer.joinStatus = 200
        FakeAccountServer.joinCreatesProfile = true
        await a.retry()
        XCTAssertEqual(a.status, .member)
    }

    // ---- Verwijderen met Apple ----

    func testCancelKeepsAccountAndSaysSo() async throws {
        let a = try account()
        FakeAccountServer.apple = true
        a.reauth = { throw ASAuthorizationError(.canceled) }
        let deleted = await a.deleteAccount()
        XCTAssertFalse(deleted)
        XCTAssertEqual(a.message, "Je account blijft bestaan.")
        XCTAssertFalse(a.appleFailed)
        XCTAssertNotNil(a.session)
        XCTAssertFalse(FakeAccountServer.called("delete_my_account"))
        XCTAssertFalse(FakeAccountServer.called("apple-revoke"))
    }

    func testAppleErrorAsksInsteadOfDeleting() async throws {
        for failure in [ASAuthorizationError(.failed), ASAuthorizationError(.unknown), URLError(.notConnectedToInternet)] as [Error] {
            FakeAccountServer.reset()
            let a = try account()
            FakeAccountServer.apple = true
            a.reauth = { throw failure }
            let deleted = await a.deleteAccount()
            XCTAssertFalse(deleted)
            XCTAssertTrue(a.appleFailed, "\(failure)")
            XCTAssertNotNil(a.session)
            XCTAssertFalse(FakeAccountServer.called("delete_my_account"), "\(failure)")
        }
    }

    func testNoCodeFromAppleAsksInsteadOfDeleting() async throws {
        let a = try account()
        FakeAccountServer.apple = true
        a.reauth = { nil }
        let deleted = await a.deleteAccount()
        XCTAssertFalse(deleted)
        XCTAssertTrue(a.appleFailed)
        XCTAssertFalse(FakeAccountServer.called("delete_my_account"))
    }

    func testServerRevokeErrorAsksInsteadOfDeleting() async throws {
        for code in [403, 500, 502, 503] {
            FakeAccountServer.reset()
            let a = try account()
            FakeAccountServer.apple = true
            FakeAccountServer.revokeStatus = code
            a.reauth = { "fresh-code" }
            let deleted = await a.deleteAccount()
            XCTAssertFalse(deleted, "\(code)")
            XCTAssertTrue(a.appleFailed, "\(code)")
            XCTAssertNotNil(a.session)
            XCTAssertEqual(FakeAccountServer.count("apple-revoke"), 1)
            XCTAssertFalse(FakeAccountServer.called("delete_my_account"), "\(code): niet stil wissen")
        }
    }

    func testRevokeOkThenDelete() async throws {
        let a = try account()
        FakeAccountServer.apple = true
        a.reauth = { "fresh-code" }
        let deleted = await a.deleteAccount()
        XCTAssertTrue(deleted)
        XCTAssertFalse(a.appleFailed)
        XCTAssertNil(a.session)
        XCTAssertEqual(a.status, .out)
        XCTAssertNil(a.message)
        XCTAssertEqual(FakeAccountServer.order.filter { ["apple-revoke", "delete_my_account"].contains($0) }, ["apple-revoke", "delete_my_account"], "eerst intrekken, dan wissen")
    }

    func testRetryAfterFailureCanSucceed() async throws {
        let a = try account()
        FakeAccountServer.apple = true
        FakeAccountServer.revokeStatus = 502
        a.reauth = { "fresh-code" }
        _ = await a.deleteAccount()
        XCTAssertTrue(a.appleFailed)
        FakeAccountServer.revokeStatus = 200
        let deleted = await a.deleteAccount() // Opnieuw: Apple vraagt weer, nieuwe code
        XCTAssertTrue(deleted)
        XCTAssertFalse(a.appleFailed)
        XCTAssertEqual(FakeAccountServer.count("apple-revoke"), 2)
    }

    func testDeleteAnywayWipesWithoutAppleAndSaysWhatIsLeft() async throws {
        let a = try account()
        FakeAccountServer.apple = true
        FakeAccountServer.revokeStatus = 503
        var asked = 0
        a.reauth = { asked += 1; return "fresh-code" }
        _ = await a.deleteAccount()
        XCTAssertTrue(a.appleFailed)
        let deleted = await a.deleteAccount(skipApple: true) // Toch verwijderen
        XCTAssertTrue(deleted)
        XCTAssertEqual(asked, 1, "Toch verwijderen vraagt Apple niet nog eens")
        XCTAssertFalse(a.appleFailed)
        XCTAssertNil(a.session)
        XCTAssertTrue(FakeAccountServer.called("delete_my_account"))
        XCTAssertEqual(a.message, "Je account is verwijderd. Haal Hoot nog weg in Instellingen › je naam › Inloggen met Apple.")
    }

    func testGoogleAccountDeletesWithoutApple() async throws {
        let a = try account()
        FakeAccountServer.apple = false
        a.reauth = { XCTFail("geen Apple-blad voor een Google-account"); return nil }
        let deleted = await a.deleteAccount()
        XCTAssertTrue(deleted)
        XCTAssertFalse(FakeAccountServer.called("apple-revoke"))
        XCTAssertTrue(FakeAccountServer.called("delete_my_account"))
    }

    func testDeleteRpcFailureKeepsSessionAndSaysSo() async throws {
        let a = try account()
        FakeAccountServer.apple = false
        FakeAccountServer.deleteStatus = 500
        let deleted = await a.deleteAccount()
        XCTAssertFalse(deleted)
        XCTAssertNotNil(a.session)
        XCTAssertEqual(a.message, "Verwijderen is niet gelukt. Probeer het opnieuw.")
    }
}

// Een nepserver voor Supabase en api/apple-revoke, per laatste padstuk.
final class FakeAccountServer: URLProtocol {
    private static let lock = NSLock()
    nonisolated(unsafe) static var profileExists = true
    nonisolated(unsafe) static var joinCreatesProfile = false
    nonisolated(unsafe) static var joinStatus = 200
    nonisolated(unsafe) static var apple = false
    nonisolated(unsafe) static var revokeStatus = 200
    nonisolated(unsafe) static var deleteStatus = 200
    nonisolated(unsafe) private static var calls: [String] = []
    static var order: [String] { lock.withLock { calls } }
    static func count(_ path: String) -> Int { order.filter { $0 == path }.count }
    static func called(_ path: String) -> Bool { count(path) > 0 }
    static func reset() {
        lock.withLock {
            profileExists = true; joinCreatesProfile = false; joinStatus = 200
            apple = false; revokeStatus = 200; deleteStatus = 200; calls = []
        }
    }

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func stopLoading() {}
    override func startLoading() {
        let path = request.url!.lastPathComponent
        let isGet = request.httpMethod == "GET"
        Self.lock.lock()
        Self.calls.append(path)
        var status = 200
        var object: Any = [Any]()
        switch path {
        case "profiles":
            let rows: [[String: String]] = Self.profileExists ? [["id": "test-user"]] : []
            object = rows
        case "join":
            if Self.joinStatus == 200, Self.joinCreatesProfile { Self.profileExists = true }
            status = Self.joinStatus
            object = NSNull()
        case "user":
            let providers: [String] = Self.apple ? ["apple"] : ["google"]
            object = ["id": "test-user", "app_metadata": ["providers": providers], "identities": [[String: Any]]()] as [String: Any]
        case "apple-revoke":
            status = Self.revokeStatus
            object = ["ok": status == 200]
        case "delete_my_account":
            status = Self.deleteStatus
            object = NSNull()
        case "user_state" where isGet:
            object = [["prefs": [String: String](), "read_ids": [String](), "edition": NSNull()] as [String: Any]]
        default:
            break
        }
        Self.lock.unlock()
        let data = try! JSONSerialization.data(withJSONObject: object, options: .fragmentsAllowed)
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }
}
