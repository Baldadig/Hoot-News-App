import XCTest
@testable import Hoot

// Het inlogdagboek: alleen domein, naam, vervaldatum (of sessie) en HttpOnly, op een dagdeel nauwkeurig,
// en nooit de waarde van een cookie.
@MainActor
final class LoginDiaryTests: XCTestCase {
    private let geheim = "GEHEIM-token-8f2c1e"
    private var cal: Calendar { .current }

    private func date(_ day: Int, _ hour: Int, _ minute: Int = 0) -> Date {
        cal.date(from: DateComponents(year: 2026, month: 11, day: day, hour: hour, minute: minute))!
    }

    private func cookie(_ domain: String, _ name: String, expires: Date? = nil, httpOnly: Bool = false, value: String? = nil) -> HTTPCookie {
        var p: [HTTPCookiePropertyKey: Any] = [.domain: domain, .path: "/", .name: name, .value: value ?? geheim]
        if let expires { p[.expires] = expires }
        if httpOnly { p[HTTPCookiePropertyKey("HttpOnly")] = "TRUE" }
        return HTTPCookie(properties: p)!
    }

    private let publishers: [(domain: String, name: String)] = [("nrc.nl", "NRC"), ("theguardian.com", "The Guardian"), ("dpgmedia.nl", "DPG Media")]

    func testOnlyLoginCookiesOfPublishersAndNeverTheValue() throws {
        let all = [
            cookie(".nrc.nl", "nrc_auth_token", expires: date(30, 10), httpOnly: true),
            cookie(".nrc.nl", "_ga", expires: date(30, 10)), // meten: niet
            cookie(".nrc.nl", "didomi_token", expires: date(30, 10)), // toestemming: niet
            cookie("profile.theguardian.com", "GU_U", expires: date(28, 9)),
            cookie("login.dpgmedia.nl", "sso_session"), // sessie
            cookie(".example.com", "access_token", expires: date(30, 10)), // geen uitgever van jou
        ]
        let picked = LoginDiaryBook.pick(all, publishers: publishers)
        XCTAssertEqual(Set(picked.map(\.name)), ["nrc_auth_token", "GU_U", "sso_session"])
        XCTAssertEqual(picked.first { $0.name == "GU_U" }?.publisher, "The Guardian")
        XCTAssertNil(picked.first { $0.name == "sso_session" }?.expires, "een sessiecookie heeft geen vervaldatum")
        XCTAssertEqual(picked.first { $0.name == "nrc_auth_token" }?.httpOnly, true)

        var diary = LoginDiary()
        diary.observe(picked, at: date(12, 19, 42))
        diary.observe([], at: date(13, 8))
        let file = FileManager.default.temporaryDirectory.appending(path: "inlogdagboek-\(UUID().uuidString).json")
        defer { LoginDiary.erase(at: file) }
        diary.save(to: file)
        let stored = try String(contentsOf: file, encoding: .utf8)
        XCTAssertFalse(stored.contains(geheim), "de waarde van een cookie komt nooit in het dagboek")
        XCTAssertFalse(diary.text(version: "1.3.1 (54)").contains(geheim))
        XCTAssertTrue(stored.contains("nrc_auth_token"))
        XCTAssertEqual(LoginDiary.load(from: file), diary)
        // Wat er bewaard wordt, is precies dit en niets meer.
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: file)) as? [String: Any])
        let first = try XCTUnwrap((json["events"] as? [[String: Any]])?.first?["cookie"] as? [String: Any])
        XCTAssertEqual(Set(first.keys).subtracting(["expires"]), ["publisher", "domain", "name", "httpOnly"])
    }

    func testAppearAndDisappearOnADagdeel() {
        let token = LoginDiary.Cookie(publisher: "NRC", domain: ".nrc.nl", name: "nrc_auth_token", expires: date(30, 10), httpOnly: true)
        let session = LoginDiary.Cookie(publisher: "DPG Media", domain: "login.dpgmedia.nl", name: "sso_session", expires: nil, httpOnly: false)
        let gone = LoginDiary.Cookie(publisher: "The Guardian", domain: ".theguardian.com", name: "GU_U", expires: date(13, 9), httpOnly: false)
        var diary = LoginDiary()
        diary.observe([token, session, gone], at: date(12, 7, 13))
        XCTAssertTrue(diary.events.isEmpty, "de eerste keer is de beginstand")
        XCTAssertEqual(diary.started, date(12, 7, 13), "de echte tijd blijft bewaard")
        XCTAssertEqual(LoginDiary.moment(diary.started!), "12 nov, ochtend", "afronden alleen bij het tonen")

        diary.observe([token], at: date(14, 20, 5))
        XCTAssertEqual(diary.events.count, 2)
        XCTAssertTrue(diary.events.allSatisfy { $0.kind == .gone && $0.at == date(14, 20, 5) })
        XCTAssertEqual(LoginDiary.moment(diary.events[0].at), "14 nov, avond", "avond, geen minuten")
        XCTAssertEqual(LoginDiary.reason(session, goneAt: date(14, 20, 5)), "sessie voorbij")
        XCTAssertEqual(LoginDiary.reason(gone, goneAt: date(14, 20, 5)), "verlopen")
        XCTAssertTrue(LoginDiary.reason(token, goneAt: date(14, 20, 5)).hasPrefix("weg vóór de vervaldatum"))

        diary.observe([token, session], at: date(15, 13))
        XCTAssertEqual(diary.events.last?.kind, .appeared)
        XCTAssertEqual(diary.events.last?.cookie.name, "sso_session")
        XCTAssertEqual(LoginDiary.moment(date(15, 13)), "15 nov, middag")
        XCTAssertEqual(LoginDiary.moment(date(15, 2)), "15 nov, nacht")
    }

    // De echte tijden blijven bewaard; alleen tonen rondt af. Dus "verlopen" tegenover "weg vóór de
    // vervaldatum" klopt ook binnen hetzelfde dagdeel.
    func testRealTimesDecideExpiredOrEarly() {
        let c = LoginDiary.Cookie(publisher: "NRC", domain: "nrc.nl", name: "x_token", expires: date(30, 10, 47), httpOnly: false)
        XCTAssertEqual(c.expires, date(30, 10, 47))
        XCTAssertEqual(LoginDiary.reason(c, goneAt: date(30, 10, 12)), "weg vóór de vervaldatum (30 nov)", "zelfde dagdeel, maar ervóór")
        XCTAssertEqual(LoginDiary.reason(c, goneAt: date(30, 10, 47)), "verlopen")
        XCTAssertEqual(LoginDiary.reason(c, goneAt: date(30, 11, 5)), "verlopen", "zelfde dagdeel, erna")
        XCTAssertEqual(LoginDiary.line(c), "nrc.nl · x_token · tot 30 nov")
    }

    func testEraseRemovesTheFileAndItIsKeptOutOfTheBackup() throws {
        let file = FileManager.default.temporaryDirectory.appending(path: "inlogdagboek-\(UUID().uuidString).json")
        defer { LoginDiary.erase(at: file) }
        var diary = LoginDiary()
        diary.observe([], at: date(1, 8))
        diary.save(to: file)
        let values = try file.resourceValues(forKeys: [.isExcludedFromBackupKey])
        XCTAssertEqual(values.isExcludedFromBackup, true)
        LoginDiary.erase(at: file)
        XCTAssertFalse(FileManager.default.fileExists(atPath: file.path()))
        XCTAssertEqual(LoginDiary.load(from: file), LoginDiary(), "zonder bestand begint het dagboek opnieuw")
    }

    func testTheDiaryStaysSmall() {
        var diary = LoginDiary()
        diary.observe([], at: date(1, 8))
        for i in 0..<(LoginDiary.maxEvents + 50) {
            let c = LoginDiary.Cookie(publisher: "NRC", domain: "nrc.nl", name: "token\(i)", expires: nil, httpOnly: false)
            diary.observe([c], at: date(2, 8))
        }
        XCTAssertLessThanOrEqual(diary.events.count, LoginDiary.maxEvents)
    }

    func testNamesThatMayBeALogin() {
        XCTAssertTrue(PublisherLogin.mayBeLogin(name: "GU_U", domain: "theguardian.com"))
        XCTAssertTrue(PublisherLogin.mayBeLogin(name: "__utp", domain: "telegraph.co.uk"))
        XCTAssertTrue(PublisherLogin.mayBeLogin(name: "wordpress_logged_in_abc", domain: "ftm.nl"))
        XCTAssertTrue(PublisherLogin.mayBeLogin(name: "authId", domain: "nrc.nl"))
        XCTAssertFalse(PublisherLogin.mayBeLogin(name: "_ga_ABC", domain: "nrc.nl"))
        XCTAssertFalse(PublisherLogin.mayBeLogin(name: "consentUUID", domain: "nrc.nl"))
        XCTAssertFalse(PublisherLogin.mayBeLogin(name: "theme", domain: "nrc.nl"))
    }
}
