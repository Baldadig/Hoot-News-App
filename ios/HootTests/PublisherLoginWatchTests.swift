import XCTest
import WebKit
@testable import Hoot

// Inlogpaneel A: het vel zegt pas "Je bent ingelogd bij {bron}." na een echte inlog (L2).
final class LoginEvidenceTests: XCTestCase {
    func testCookiesTheSiteSetsOnItsOwnNeverCount() {
        var e = LoginEvidence()
        e.page(credentialVisible: true)
        e.observe(account: ["nrc.nl|session_id", "nrc.nl|user_tracking"], knownLogin: false)
        e.observe(account: ["nrc.nl|session_id", "nrc.nl|user_tracking", "nrc.nl|sso_probe"], knownLogin: false)
        XCTAssertFalse(e.confirmed, "zonder inlogpoging is een nieuwe cookie geen inlog")
        e.page(credentialVisible: false) // het formulier verdwijnt zonder dat je iets verstuurde
        e.observe(account: ["nrc.nl|session_id", "nrc.nl|user_tracking", "nrc.nl|sso_probe"], knownLogin: false)
        XCTAssertFalse(e.confirmed)
    }

    func testSinglePageLoginWithoutNavigation() {
        var e = LoginEvidence()
        e.page(credentialVisible: true)
        e.observe(account: ["voorbeeld.nl|session_id"], knownLogin: false)
        e.attempt()
        e.observe(account: ["voorbeeld.nl|session_id", "voorbeeld.nl|member_session"], knownLogin: false)
        XCTAssertFalse(e.confirmed, "het wachtwoordveld staat er nog: nog niet ingelogd")
        e.page(credentialVisible: false) // dezelfde pagina, het formulier is weg
        e.observe(account: ["voorbeeld.nl|session_id", "voorbeeld.nl|member_session"], knownLogin: false)
        XCTAssertTrue(e.confirmed)
    }

    func testFailedAttemptKeepsTheFormAndSaysNothing() {
        var e = LoginEvidence()
        e.page(credentialVisible: true)
        e.attempt()
        e.observe(account: ["voorbeeld.nl|login_attempt"], knownLogin: false)
        e.page(credentialVisible: true) // foutmelding, formulier blijft
        e.observe(account: ["voorbeeld.nl|login_attempt"], knownLogin: false)
        XCTAssertFalse(e.confirmed)
    }

    func testTwoStepEmailThenPassword() {
        var e = LoginEvidence()
        e.page(credentialVisible: false) // eerst alleen een e-mailadres: geen poging die telt
        e.attempt()
        XCTAssertFalse(e.attempted)
        e.observe(account: ["voorbeeld.nl|login_flow"], knownLogin: false) // hoort bij de beginstand
        e.page(credentialVisible: true) // stap twee: wachtwoord
        e.attempt()
        e.observe(account: ["voorbeeld.nl|login_flow"], knownLogin: false)
        e.page(credentialVisible: false)
        e.observe(account: ["voorbeeld.nl|login_flow"], knownLogin: false)
        XCTAssertFalse(e.confirmed, "niets nieuws sinds de poging")
        e.observe(account: ["voorbeeld.nl|login_flow", "voorbeeld.nl|auth_session"], knownLogin: false)
        XCTAssertTrue(e.confirmed)
    }

    func testKnownLoginCookieAndAlreadyLoggedIn() {
        var e = LoginEvidence()
        e.observe(account: [], knownLogin: true)
        XCTAssertTrue(e.confirmed)
        var f = LoginEvidence()
        f.alreadyLoggedIn()
        XCTAssertTrue(f.confirmed)
    }
}

// Echte web-weergave met het script van het inlogvel: een site die niet van pagina wisselt
// (het formulier verdwijnt in dezelfde pagina) en een mislukte poging.
@MainActor
final class LoginWatcherWebTests: XCTestCase {
    private let page = """
    <!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body>
    <script>document.cookie = 'session_id=anon; max-age=864000; path=/'</script>
    <form id="f"><input id="mail" type="email"><input id="pw" type="password"><button id="go" type="submit">Inloggen</button></form>
    <p id="msg"></p>
    <script>
    document.getElementById('f').addEventListener('submit', (e) => {
      e.preventDefault()
      if (document.getElementById('pw').value === 'goed') {
        document.cookie = 'member_session=ok; max-age=864000; path=/'
        document.getElementById('f').remove()
        document.getElementById('msg').textContent = 'Welkom terug'
      } else {
        document.cookie = 'login_attempt=1; max-age=864000; path=/'
        document.getElementById('msg').textContent = 'Wachtwoord klopt niet'
      }
    })
    </script></body></html>
    """

    private func run(password: String) async throws -> (confirmed: Bool, url: URL?) {
        let config = WKWebViewConfiguration()
        let store = WKWebsiteDataStore.nonPersistent()
        config.websiteDataStore = store
        let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 390, height: 800), configuration: config)
        let url = URL(string: "https://login.voorbeeld.nl/account")!
        let watcher = LoginWatcher(domain: try XCTUnwrap(PublisherLogin.domain(of: url)), store: store)
        watcher.attach(to: web)
        let window = UIWindow(frame: web.frame); window.addSubview(web); window.isHidden = false
        defer { window.isHidden = true }
        web.loadSimulatedRequest(URLRequest(url: url), responseHTML: page)
        let watching = Task { await watcher.watch(every: .milliseconds(200)) }
        let ready = await waitFor { watcher.evidence.credentialVisible }
        XCTAssertTrue(ready, "het script meldt het wachtwoordveld")
        try await Task.sleep(for: .milliseconds(600)) // de site zette zelf al een cookie: beginstand
        XCTAssertFalse(watcher.confirmed)
        _ = try await web.evaluateJavaScript("document.getElementById('mail').value='lezer@voorbeeld.nl'; document.getElementById('pw').value='\(password)'; document.getElementById('go').click(); true")
        _ = await waitFor(timeout: 3) { watcher.confirmed }
        watching.cancel()
        return (watcher.confirmed, web.url)
    }

    private func waitFor(timeout: Double = 5, _ condition: @MainActor () -> Bool) async -> Bool {
        let end = Date.now.addingTimeInterval(timeout)
        while !condition() {
            if Date.now > end { return false }
            try? await Task.sleep(for: .milliseconds(100))
        }
        return true
    }

    func testSinglePageSiteLoginIsRecognisedWithoutNavigation() async throws {
        let result = try await run(password: "goed")
        XCTAssertTrue(result.confirmed, "inlog zonder paginawissel wordt herkend")
        XCTAssertEqual(result.url?.absoluteString, "https://login.voorbeeld.nl/account", "de pagina wisselde niet")
    }

    func testFailedLoginStaysHonest() async throws {
        let result = try await run(password: "fout")
        XCTAssertFalse(result.confirmed, "een nieuwe cookie na een mislukte poging is geen inlog")
    }
}

// Nachttest 14 november (A23): VoiceOver zegt alleen "de inlogpagina" als de link er ook een is.
@MainActor final class PublisherLoginHintTests: XCTestCase {
    func testHintVolgtDeLink() {
        let groene = PublisherLogin.Publisher(source: Source(id: "groene", name: "De Groene"), url: URL(string: "https://www.groene.nl/")!, domain: "groene.nl")
        let vi = PublisherLogin.Publisher(source: Source(id: "vi", name: "VI"), url: URL(string: "https://www.vi.nl")!, domain: "vi.nl")
        let nrc = PublisherLogin.Publisher(source: Source(id: "nrc", name: "NRC"), url: URL(string: "https://www.nrc.nl/login/")!, domain: "nrc.nl")
        XCTAssertEqual(PublisherLogin.hint(groene, on: false), "Opent de site van De Groene, daar log je in")
        XCTAssertEqual(PublisherLogin.hint(vi, on: false), "Opent de site van VI, daar log je in")
        XCTAssertEqual(PublisherLogin.hint(nrc, on: false), "Opent de inlogpagina van NRC")
        XCTAssertEqual(PublisherLogin.hint(nrc, on: true), "Opent de site van NRC, waar je bent ingelogd")
    }
}
