import XCTest
import Security
@testable import Hoot

// Echte Account-methoden met tegengehouden URLProtocol-antwoorden; geen echte accounts/netwerk.
@MainActor
final class AccountSessionTests: XCTestCase {
    nonisolated(unsafe) private var defaults: [String: Any] = [:]
    nonisolated(unsafe) private var files: [String: Data] = [:]
    nonisolated(unsafe) private var emptyKeychainAtStart = false
    private let names = ["saved.json", "read.json"]
    nonisolated private var folder: URL { FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Hoot") }
    override func setUp() {
        super.setUp()
        defaults = UserDefaults.standard.dictionaryRepresentation().filter { $0.key.hasPrefix("hoot.") }
        for n in names { if let d = try? Data(contentsOf: folder.appendingPathComponent(n)) { files[n] = d } }
        SessionBoundaryURLProtocol.reset()
    }
    override func tearDown() {
        for k in UserDefaults.standard.dictionaryRepresentation().keys where k.hasPrefix("hoot.") { UserDefaults.standard.removeObject(forKey: k) }
        for (k,v) in defaults { UserDefaults.standard.set(v, forKey: k) }
        for n in names {
            let p = folder.appendingPathComponent(n)
            if let d = files[n] { try? d.write(to: p, options: .atomic) } else { try? FileManager.default.removeItem(at: p) }
        }
        // Alleen een door deze proef gemaakte nepsessie opruimen; met een echte sessie wordt overgeslagen.
        if emptyKeychainAtStart {
            SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "nl.hootnews.Hoot", kSecAttrAccount as String: "session"] as CFDictionary)
        }
        SessionBoundaryURLProtocol.reset()
        super.tearDown()
    }
    private func account(expired: Bool = false) throws -> Account {
        let a = Account()
        try XCTSkipIf(a.status != .out, "geen test over een echte Keychain-sessie")
        emptyKeychainAtStart = true
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [SessionBoundaryURLProtocol.self]
        a.stub(uid: "review-user-A", transport: URLSession(configuration: config), expires: expired ? .distantPast : .distantFuture)
        return a
    }
    func testLatePullCannotRestoreReadHistoryAfterLogout() async throws {
        let a = try account(), store = HootStore()
        store.clearRead()
        UserDefaults.standard.set("review-user-A", forKey: "hoot.owner")
        let pending = expectation(description: "saved_items antwoord uitgesteld")
        SessionBoundaryURLProtocol.hold("saved_items") { pending.fulfill() }
        let task = Task { await a.start(store) }
        await fulfillment(of: [pending], timeout: 3)
        await a.signOut()
        XCTAssertEqual(a.status, .out)
        XCTAssertNil(UserDefaults.standard.string(forKey: "hoot.owner"))
        SessionBoundaryURLProtocol.release("saved_items")
        await task.value
        XCTAssertFalse(store.readIds.contains("private-read-A"))
        XCTAssertNotEqual(UserDefaults.standard.string(forKey: "hoot.owner"), "review-user-A")
        XCTAssertFalse(a.pulled); XCTAssertNil(a.session); XCTAssertEqual(a.sync, .idle)
    }
    func testLatePullAndOld401CannotChangeNewAccount() async throws {
        for code in [200, 401] {
            let a = try account(), store = HootStore()
            store.clearRead()
            UserDefaults.standard.removeObject(forKey: "hoot.owner")
            let pending = expectation(description: "A wacht, B kan synchroniseren")
            SessionBoundaryURLProtocol.hold("saved_items") { pending.fulfill() }
            let task = Task { await a.start(store) }
            await fulfillment(of: [pending], timeout: 3)
            a.stub(uid: "review-user-B", transport: a.transport)
            await a.start(store)
            XCTAssertTrue(store.readIds.contains("private-read-B"))
            SessionBoundaryURLProtocol.release("saved_items", status: code)
            await task.value
            XCTAssertEqual(a.uid, "review-user-B"); XCTAssertEqual(a.status, .member)
            XCTAssertEqual(UserDefaults.standard.string(forKey: "hoot.owner"), "review-user-B")
            XCTAssertFalse(store.readIds.contains("private-read-A")); XCTAssertEqual(a.sync, .ok)
        }
    }
    func testNewSessionOfSameUserRejectsOldPull() async throws {
        let a = try account(), store = HootStore()
        store.clearRead()
        let pending = expectation(description: "oude sessie van A wacht")
        SessionBoundaryURLProtocol.hold("saved_items") { pending.fulfill() }
        let task = Task { await a.start(store) }
        await fulfillment(of: [pending], timeout: 3)
        await a.signOut()
        a.stub(uid: "review-user-A", transport: a.transport)
        SessionBoundaryURLProtocol.release("saved_items")
        await task.value
        XCTAssertEqual(a.uid, "review-user-A"); XCTAssertFalse(a.pulled)
        XCTAssertFalse(store.readIds.contains("private-read-A")); XCTAssertEqual(a.sync, .idle)
    }
    func testLateRefreshCannotRestoreSessionAfterLogout() async throws {
        let a = try account(expired: true), store = HootStore()
        let pending = expectation(description: "tokenverversing wacht")
        SessionBoundaryURLProtocol.hold("token") { pending.fulfill() }
        let task = Task { await a.start(store) }
        await fulfillment(of: [pending], timeout: 3)
        await a.signOut()
        SessionBoundaryURLProtocol.release("token")
        await task.value
        XCTAssertNil(a.session); XCTAssertEqual(a.status, .out)
        XCTAssertFalse(a.pulled); XCTAssertEqual(a.sync, .idle)
        XCTAssertEqual(Account().status, .out, "ook geen sessie terug in de Keychain")
    }
    func testOldRefreshErrorCannotLogOutNewAccount() async throws {
        let a = try account(expired: true), store = HootStore()
        let pending = expectation(description: "oude verversing wacht")
        SessionBoundaryURLProtocol.hold("token") { pending.fulfill() }
        let task = Task { await a.start(store) }
        await fulfillment(of: [pending], timeout: 3)
        a.stub(uid: "review-user-B", transport: a.transport)
        await a.start(store)
        SessionBoundaryURLProtocol.release("token", status: 401)
        await task.value
        XCTAssertEqual(a.uid, "review-user-B"); XCTAssertEqual(a.sync, .ok)
    }
    func testLogoutResponseCannotEraseNewLogin() async throws {
        let a = try account()
        let pending = expectation(description: "uitlogrespons wacht")
        SessionBoundaryURLProtocol.hold("logout") { pending.fulfill() }
        let task = Task { await a.signOut() }
        await fulfillment(of: [pending], timeout: 3)
        XCTAssertEqual(a.status, .out, "lokaal uitloggen wacht niet op netwerk")
        a.stub(uid: "review-user-B", transport: a.transport)
        SessionBoundaryURLProtocol.release("logout")
        await task.value
        XCTAssertEqual(a.uid, "review-user-B")
    }
}

final class SessionBoundaryURLProtocol: URLProtocol {
    private static let lock = NSLock()
    nonisolated(unsafe) private static var pending: [String: SessionBoundaryURLProtocol] = [:]
    nonisolated(unsafe) private static var callbacks: [String: () -> Void] = [:]
    static func reset() { lock.withLock { pending = [:]; callbacks = [:] } }
    static func hold(_ path: String, callback: @escaping () -> Void) { lock.withLock { callbacks[path] = callback } }
    static func release(_ path: String, status: Int = 200) {
        let p = lock.withLock { let v = pending.removeValue(forKey: path); callbacks.removeValue(forKey: path); return v }
        p?.reply(status: status)
    }
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func stopLoading() {} // Een oud antwoord mag nog komen; de app moet het zelf afwijzen.
    override func startLoading() {
        let path = request.url!.lastPathComponent
        let isB = (request.url?.query ?? "").contains("review-user-B")
        let callback = Self.lock.withLock { () -> (() -> Void)? in
            guard !(path == "saved_items" && isB), let f = Self.callbacks[path] else { return nil }
            Self.pending[path] = self; return f
        }
        if let callback { callback(); return }
        reply()
    }
    private func reply(status: Int = 200) {
        let path = request.url!.lastPathComponent
        let isB = (request.url?.query ?? "").contains("review-user-B")
        let object: Any
        if path == "profiles" { object = [["id": isB ? "review-user-B" : "review-user-A"]] }
        else if path == "token" { object = ["access_token":"renewed-test", "refresh_token":"renewed-refresh", "expires_in":3600, "user":["id":"review-user-A"]] as [String: Any] }
        else if path == "user_state" && request.httpMethod != "PATCH" { object = [["prefs": [String: String](), "read_ids": [isB ? "private-read-B" : "private-read-A"], "edition": NSNull()]] }
        else { object = [Any]() }
        let data = try! JSONSerialization.data(withJSONObject: object)
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: ["Content-Type":"application/json"])!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }
}
